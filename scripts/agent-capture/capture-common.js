import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const pad = (n) => String(n).padStart(2, "0");

const fmtDate = (iso) => `${iso.slice(0, 4)}-${iso.slice(5, 7)}-${iso.slice(8, 10)}`;

const stateDir = process.env.AGENT_CAPTURE_STATE_DIR || join(tmpdir(), "opencode-agent-capture");

export function statePath(sessionID) {
  return join(stateDir, `${sessionID}.json`);
}

export function shortID(id) {
  return id && id.length > 8 ? id.slice(0, 8) : id;
}

export function loadState(sessionID) {
  const p = statePath(sessionID);
  try {
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8"));
  } catch {}
  return null;
}

export function saveState(state) {
  try {
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(statePath(state.sessionID), JSON.stringify(state, null, 2));
  } catch {}
}

export function newState(sessionID, { createdMs, author, project, model }) {
  const createdIso = new Date(createdMs || Date.now()).toISOString();
  return {
    sessionID,
    model: model || null,
    author: author || "",
    project: project || "",
    createdIso,
    turns: [],
    loggedPromptIDs: [],
    loggedResponseIDs: [],
  };
}

export function textOf(parts) {
  return (parts || [])
    .filter((p) => p && p.type === "text")
    .map((p) => p.text || "")
    .join("");
}

export function modelStr(m) {
  if (!m) return "";
  const p = m.providerID || m.provider || "";
  const id = m.modelID || m.id || "";
  if (!p && !id) return "";
  return `${p}/${id}`.replace(/\/+$/, "");
}

export function lastUnansweredTurn(state) {
  for (let i = state.turns.length - 1; i >= 0; i--) {
    const t = state.turns[i];
    if (t.prompt && !t.response) return t;
  }
  return null;
}

export function addTurn(state, { messageID, text, ts, model }) {
  const turn = {
    num: state.turns.length + 1,
    prompt: { messageID, text, ts, model: model || state.model || "" },
    response: null,
  };
  state.turns.push(turn);
  state.loggedPromptIDs.push(messageID);
  return turn;
}

export function addResponse(state, { messageID, text, ts, model }) {
  const turn = lastUnansweredTurn(state);
  if (!turn) return null;
  return renewResponse(state, turn, { messageID, text, ts, model });
}

export function renewResponse(state, turn, { messageID, text, ts, model }) {
  if (messageID && !state.loggedResponseIDs.includes(messageID)) state.loggedResponseIDs.push(messageID);
  turn.response = {
    messageID: messageID || null,
    text: text || "",
    ts: ts || new Date().toISOString(),
    model: model && model !== "/" ? model : turn.prompt.model,
  };
  return turn;
}

export function render(state) {
  const prompts = state.turns.map((t) => t.prompt).filter(Boolean);
  const firstP = prompts[0];
  const lastP = prompts[prompts.length - 1];
  const model = state.model || (firstP && firstP.model) || "";
  const date = firstP
    ? fmtDate(firstP.ts)
    : state.createdIso
      ? fmtDate(state.createdIso)
      : fmtDate(new Date().toISOString());
  const short = shortID(state.sessionID);
  const lines = [
    "---",
    `session_id: ${state.sessionID}`,
    `date: ${date}`,
    `author: ${state.author || ""}`,
    `model: ${model}`,
    "tool: opencode",
    `project: ${state.project || ""}`,
    `total_exchanges: ${prompts.length}`,
    `first_prompt_time: ${firstP ? firstP.ts : ""}`,
    `last_prompt_time: ${lastP ? lastP.ts : ""}`,
    "---",
    "",
    `# Session Log - ${date}`,
    "",
    `Session: \`${short}\` | Project: \`${state.project || ""}\` | Author: \`${state.author || ""}\``,
    "",
    "---",
  ];
  const body = [];
  for (const t of state.turns) {
    if (!t.prompt) continue;
    body.push(`[LOG_ENTRY type=PROMPT num=${t.num} session=${short}]`);
    body.push(`timestamp: ${t.prompt.ts}`);
    body.push(`model: ${t.prompt.model || ""}`);
    body.push("");
    body.push(t.prompt.text);
    if (t.response) {
      body.push("");
      body.push(`[LOG_ENTRY type=RESPONSE num=${t.num} session=${short}]`);
      body.push(`timestamp: ${t.response.ts}`);
      body.push(`model: ${t.response.model || ""}`);
      body.push("");
      body.push(t.response.text);
    }
    body.push("");
  }
  return lines.join("\n") + "\n\n" + body.join("\n").replace(/\n$/, "") + "\n";
}

export function logFilePath(rootDir, state) {
  const base = (state.createdIso || new Date().toISOString())
    .slice(0, 19)
    .replace("T", "_")
    .replace(/:/g, "-");
  return join(rootDir, ".agent-logs", `${base}_${state.sessionID}.md`);
}

export function writeLog(rootDir, state) {
  try {
    mkdirSync(join(rootDir, ".agent-logs"), { recursive: true });
    writeFileSync(logFilePath(rootDir, state), render(state));
  } catch {}
}