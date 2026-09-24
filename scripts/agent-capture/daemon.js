import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join, basename } from "node:path";
import {
  loadState,
  newState,
  saveState,
  addTurn,
  renewResponse,
  modelStr,
  writeLog,
} from "./capture-common.js";

const DB = process.env.OPENCODE_DB || join(homedir(), ".local/share/opencode/opencode.db");
const POLL_MS = Number(process.env.AGENT_CAPTURE_POLL_MS || 2000);
const author = process.env.AGENT_CAPTURE_AUTHOR || process.env.USER || "unknown";

function query(sql) {
  try {
    const out = execFileSync("sqlite3", ["-readonly", "-json", DB, sql], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const trimmed = out.trim();
    if (!trimmed) return [];
    return JSON.parse(trimmed);
  } catch (e) {
    return [];
  }
}

const q = (v) => String(v).replace(/'/g, "''");

function promptText(messageID) {
  const rows = query(
    `SELECT json_extract(data,'$.text') AS t FROM part WHERE message_id='${q(messageID)}' AND json_extract(data,'$.type')='text' ORDER BY time_created, id;`,
  );
  return rows.map((r) => r.t || "").join("");
}

function partStamp(messageID) {
  const rows = query(
    `SELECT COALESCE(MAX(time_updated),0) AS s FROM part WHERE message_id='${q(messageID)}';`,
  );
  return rows.length ? Number(rows[0].s || 0) : 0;
}

const stable = {};

function markStable(key, stamp) {
  const prev = stable[key];
  stable[key] = stamp;
  return prev === stamp;
}

function resolveCandidate(turn, nextPromptTs, sessionID) {
  const parentID = turn.prompt.messageID;
  const promptTs = new Date(turn.prompt.ts).getTime();
  const rows = query(
    `SELECT id, data, time_created FROM message WHERE session_id='${q(sessionID)}' AND json_extract(data,'$.role')='assistant' AND json_extract(data,'$.parentID')='${q(parentID)}' ORDER BY time_created, id;`,
  );
  if (!rows.length) return { candidate: null, ready: false };
  const parsed = rows.map((r) => ({ r, d: JSON.parse(r.data) }));
  const valid = (p) =>
    p.d.time &&
    p.d.time.completed &&
    promptText(p.r.id).trim() !== "" &&
    Number(p.r.time_created) >= promptTs &&
    (nextPromptTs === null ||
      nextPromptTs === undefined ||
      Number(p.r.time_created) < nextPromptTs);
  let candidate = null;
  for (let i = parsed.length - 1; i >= 0; i--) {
    if (valid(parsed[i])) {
      candidate = parsed[i];
      break;
    }
  }
  if (!candidate) return { candidate: null, ready: false };
  const newest = parsed[parsed.length - 1];
  if (newest !== candidate && nextPromptTs === null) {
    const newestCompleted = newest.d.time && newest.d.time.completed;
    if (!newestCompleted && Date.now() - Number(newest.r.time_created) < 15000) {
      return { candidate: null, ready: false };
    }
  }
  return { candidate, ready: true };
}

function tick(rootDir, sessionID) {
  if (!existsSync(DB)) return;
  const sessRows = query(`SELECT time_created, model FROM session WHERE id='${q(sessionID)}';`);
  if (!sessRows.length) return;
  let st = loadState(sessionID);
  if (!st) {
    let model = null;
    try {
      const m = sessRows[0].model;
      if (m) {
        const parsed = JSON.parse(m);
        model = modelStr(parsed);
      }
    } catch {}
    st = newState(sessionID, {
      createdMs: Number(sessRows[0].time_created),
      author,
      project: basename(rootDir),
      model,
    });
    saveState(st);
    writeLog(rootDir, st);
  }

  let changed = false;
  const prompts = query(
    `SELECT id, data, time_created FROM message WHERE session_id='${q(sessionID)}' AND json_extract(data,'$.role')='user' ORDER BY time_created, id;`,
  );
  const promptTimes = prompts.map((r) => Number(r.time_created));
  const nextPromptTs = (idx) =>
    idx >= 0 && idx + 1 < promptTimes.length ? promptTimes[idx + 1] : null;

  for (const row of prompts) {
    if (st.loggedPromptIDs.includes(row.id)) continue;
    const d = JSON.parse(row.data);
    const text = promptText(row.id);
    if (text.trim() === "") continue;
    addTurn(st, {
      messageID: row.id,
      text,
      ts: new Date(Number(row.time_created)).toISOString(),
      model: d.model ? modelStr(d.model) : st.model,
      sessionID,
    });
    changed = true;
  }

  st.turns.forEach((turn, idx) => {
    const nextTs = nextPromptTs(prompts.findIndex((r) => r.id === turn.prompt.messageID));
    const { candidate, ready } = resolveCandidate(turn, nextTs, st.sessionID);
    if (!candidate || !ready) return;
    if (!turn.response) {
      const key = `${st.sessionID}:${candidate.r.id}`;
      if (!markStable(key, partStamp(candidate.r.id))) return;
    }
    if (turn.response && turn.response.messageID === candidate.r.id) return;
    const d = candidate.d;
    const res = {
      messageID: candidate.r.id,
      text: promptText(candidate.r.id),
      ts: new Date(
        d.time.completed ? d.time.completed : Number(candidate.r.time_created),
      ).toISOString(),
      model: modelStr({ providerID: d.providerID, modelID: d.modelID }),
    };
    renewResponse(st, turn, res);
    changed = true;
  });

  if (changed) {
    saveState(st);
    writeLog(rootDir, st);
  }
}

export function startWatch(rootDir, sessionIDs) {
  const run = () => {
    for (const id of sessionIDs) tick(rootDir, id);
  };
  run();
  return setInterval(run, POLL_MS);
}

if (process.argv[2]) {
  const rootDir = process.argv[3] || process.cwd();
  startWatch(rootDir, [process.argv[2]]);
  setInterval(() => {}, 1 << 30);
}