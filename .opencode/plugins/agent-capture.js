import { Database } from "bun:sqlite";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  loadState,
  newState,
  saveState,
  addTurn,
  addResponse,
  lastUnansweredTurn,
  textOf,
  modelStr,
  writeLog,
} from "../../scripts/agent-capture/capture-common.js";

const DB_PATH = process.env.OPENCODE_DB || join(homedir(), ".local/share/opencode/opencode.db");

const qsafe = (v) => String(v).replace(/'/g, "''");

const getDb = () => new Database(DB_PATH, { readonly: true });

const promptText = (db, messageID) => {
  const rows = db
    .query(
      `SELECT json_extract(data,'$.text') AS t FROM part WHERE message_id='${qsafe(messageID)}' AND json_extract(data,'$.type')='text' ORDER BY time_created, id;`,
    )
    .all();
  return rows.map((r) => r.t || "").join("");
};

const sessionCreated = (db, sessionID) => {
  const rows = db
    .query(`SELECT time_created, model FROM session WHERE id='${qsafe(sessionID)}';`)
    .all();
  if (!rows.length) return { createdMs: Date.now(), model: null };
  let model = null;
  try {
    if (rows[0].model) model = modelStr(JSON.parse(rows[0].model));
  } catch {}
  return { createdMs: Number(rows[0].time_created), model };
};

export const AgentCapture = async ({ directory }) => {
  const rootDir = directory;
  const sessions = new Map();
  let chain = Promise.resolve();
  const serial = (fn) => {
    chain = chain.then(fn, fn);
    return chain;
  };

  const author = process.env.AGENT_CAPTURE_AUTHOR || process.env.USER || "unknown";
  const project = () => rootDir.split("/").filter(Boolean).pop() || "";

  const ensureState = async (sessionID, fallbackModel) => {
    let st = sessions.get(sessionID);
    if (st) return st;
    st = loadState(sessionID);
    if (!st) {
      let createdMs = Date.now();
      let model = modelStr(fallbackModel) || null;
      try {
        const db = getDb();
        const meta = sessionCreated(db, sessionID);
        db.close();
        createdMs = meta.createdMs;
        if (!model) model = meta.model;
      } catch {}
      st = newState(sessionID, { createdMs, author, project: project(), model });
    }
    sessions.set(sessionID, st);
    return st;
  };

  const persist = (st) => {
    saveState(st);
    writeLog(rootDir, st);
  };

  const capturePrompt = async ({ sessionID, messageID, text, ts, model }) => {
    await serial(async () => {
      try {
        const st = await ensureState(sessionID, model);
        if (!messageID || st.loggedPromptIDs.includes(messageID)) return;
        addTurn(st, {
          messageID,
          text: text || "",
          ts: ts || new Date().toISOString(),
          model: modelStr(model) || st.model,
        });
        persist(st);
      } catch {}
    });
  };

  const capturePromptFromDb = async (sessionID, messageID) => {
    await serial(async () => {
      try {
        const st = sessions.get(sessionID) || (await ensureState(sessionID));
        if (!messageID || st.loggedPromptIDs.includes(messageID)) return;
        const db = getDb();
        const text = promptText(db, messageID);
        db.close();
        if (text.trim() === "") return;
        let ts = null;
        try {
          const db2 = getDb();
          const rows = db2
            .query(`SELECT time_created FROM message WHERE id='${qsafe(messageID)}';`)
            .all();
          db2.close();
          if (rows.length) ts = new Date(Number(rows[0].time_created)).toISOString();
        } catch {}
        addTurn(st, {
          messageID,
          text,
          ts: ts || new Date().toISOString(),
          model: st.model,
        });
        persist(st);
      } catch {}
    });
  };

  const captureResponse = async (sessionID) => {
    await serial(async () => {
      try {
        const st = sessions.get(sessionID);
        if (!st) return;
        const turn = lastUnansweredTurn(st);
        if (!turn) return;
        const parentID = turn.prompt.messageID;
        const db = getDb();
        const assistants = db
          .query(
            `SELECT id, data, time_created FROM message WHERE session_id='${qsafe(sessionID)}' AND json_extract(data,'$.role')='assistant' AND json_extract(data,'$.parentID')='${qsafe(parentID)}' ORDER BY time_created, id;`,
          )
          .all();
        const parsed = assistants.map((r) => ({ r, d: JSON.parse(r.data) }));
        let best = null;
        for (let i = parsed.length - 1; i >= 0; i--) {
          const d = parsed[i].d;
          if (
            d.time &&
            d.time.completed &&
            promptText(db, parsed[i].r.id).trim() !== ""
          ) {
            best = parsed[i];
            break;
          }
        }
        if (!best) {
          db.close();
          return;
        }
        const d = best.d;
        const res = {
          messageID: best.r.id,
          text: promptText(db, best.r.id),
          ts: new Date(d.time.completed ? d.time.completed : best.r.time_created).toISOString(),
          model: modelStr({ providerID: d.providerID, modelID: d.modelID }),
        };
        db.close();
        addResponse(st, res);
        persist(st);
      } catch {}
    });
  };

  return {
    "chat.message": async (input, output) => {
      await capturePrompt({
        sessionID: input.sessionID,
        messageID: input.messageID || (output.message && output.message.id),
        text: textOf(output.parts),
        ts:
          output.message && output.message.time && output.message.time.created
            ? new Date(output.message.time.created).toISOString()
            : null,
        model: input.model || (output.message && output.message.model),
      });
    },
    event: async ({ event }) => {
      if (event.type === "session.idle") {
        await captureResponse(event.properties.sessionID);
        return;
      }
      if (event.type === "session.status") {
        if (event.properties.status && event.properties.status.type === "idle") {
          await captureResponse(event.properties.sessionID);
        }
        return;
      }
      if (event.type === "message.updated") {
        const info = event.properties && event.properties.info;
        if (info && info.role === "user" && info.id) {
          await capturePromptFromDb(info.sessionID, info.id);
        }
      }
    },
  };
};