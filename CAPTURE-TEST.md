# CAPTURE TEST — 8x assignment

Verified: **2026-09-24** (UTC). Capture is automatic and fires on its own — nothing
needs to be run manually for future sessions.

## Tool and model

- **Tool:** opencode CLI v1.18.32 (TUI). Opencode's native mechanism is its **plugin
  system** (`event` bus hooks), not a `hook`/`hook.` config key.
- **Model:** `opencode/big-pickle`. A single model both plans (plan mode) and executes
  (build); subagents (`explore`, `general`) inherit the same model. No model switching
  observed in this session.

## How opencode captures, and what I checked first

opencode 1.18.32 has **no `hook` key in `opencode.json`** — the config JSON Schema
(https://opencode.ai/config.json) rejects unknown top-level keys and has no hook
section. The real mechanism is the plugin system: plugins in `.opencode/plugins/`
auto-load at startup and subscribe to the internal event bus.

I verified this before writing anything:

- Fetched the published config schema — no `hook` field exists in this version.
- Confirmed plugin auto-discovery + event delivery empirically with throwaway probe
  plugins (marker files written on module load, factory call, and each event).
- Confirmed `event` types delivered to plugins include `message.updated`,
  `chat.message` (via the `chat.message` hook), `session.idle`, and
  `session.status` (status=idle).

## What works, and where it is wired

**Primary mechanism — plugin (covers every session started from this repo):**

- Config file changed: **`.opencode/plugins/agent-capture.js`** (auto-loaded).
  - `chat.message` hook → writes the `PROMPT` entry (verbatim user text).
  - `event` hook on `session.idle` / `session.status`(idle) → writes the `RESPONSE`
    entry (final completed assistant text; intermediate tool-call messages are
    deliberately excluded).
  - Reads the session store via `bun:sqlite` (opencode runs under Bun) because the
    SDK `client.session.messages()` projection came back empty in `opencode run`.
- Shared logic + format: **`scripts/agent-capture/capture-common.js`**.

**Fallback — store watcher (covers the one session that was already running when the
plugin was installed):**

- **`scripts/agent-capture/daemon.js`**, `node` + `sqlite3` polling the opencode SQLite
  session store every 2 s, scoped to the pre-existing session id
  `ses_f2dc48d78ffe0uTZSIQRAP2TmZ`. Running under `nohup` since 07:21 UTC.
- Needed because opencode loads plugins only at process startup; the session in which
  capture was built predates the plugin, so it cannot be covered by the plugin without
  a restart. Both paths produce identical files.

Logs land in **`.agent-logs/`** in the repo root, one file per session:
`YYYY-MM-DD_HH-MM-SS_<session-id>.md`.

- Current (setup/build) session log:
  `.agent-logs/2026-09-24_07-05-06_ses_f2dc48d78ffe0uTZSIQRAP2TmZ.md` (written by the
  watcher; the same file the plugin does not touch).
- Canary session 1 log:
  `.agent-logs/2026-09-24_07-31-27_ses_f2dac6e60ffelkUf2iW5K4tuYI.md`
- Canary session 2 log:
  `.agent-logs/2026-09-24_07-31-53_ses_f2dac0773ffeBdw0dYfvUFymEm.md`

Both canaries ran as **separate independent sessions** (`opencode run`), proving the
mechanism is installed for the repo, not just for the session that created it.

## Canary 3 (the live setup/build session)

A third canary — `CAPTURE TEST — 8x assignment, Awais Javed` — was sent **in the
session where capture was built** (the one that predates the plugin and is covered by
the store watcher). It landed in the same format:

- `.agent-logs/2026-09-24_07-05-06_ses_f2dc48d78ffe0uTZSIQRAP2TmZ.md`
  `[LOG_ENTRY type=PROMPT num=2]` timestamp `2026-09-24T07:37:11.209Z`
  followed by `[LOG_ENTRY type=RESPONSE num=2]` (final entry converges to the newest
  completed assistant message once the turn finishes).

This proves the watcher that covers the pre-existing session fires automatically too —
the prompt and response appear without any manual action.

## Canary 1 (raw)

Session `ses_f2dac6e60ffelkUf2iW5K4tuYI`, file `2026-09-24_07-31-27_ses_f2dac6e60ffelkUf2iW5K4tuYI.md`:

```markdown
---
session_id: ses_f2dac6e60ffelkUf2iW5K4tuYI
date: 2026-09-24
author: vampire
model: opencode/big-pickle
tool: opencode
project: amzonClone
total_exchanges: 1
first_prompt_time: 2026-09-24T07:31:27.466Z
last_prompt_time: 2026-09-24T07:31:27.466Z
---

# Session Log - 2026-09-24

Session: `ses_f2da` | Project: `amzonClone` | Author: `vampire`

---

[LOG_ENTRY type=PROMPT num=1 session=ses_f2da]
timestamp: 2026-09-24T07:31:27.466Z
model: opencode/big-pickle

"CAPTURE TEST — 8x assignment, vampire (canary session 1)"

[LOG_ENTRY type=RESPONSE num=1 session=ses_f2da]
timestamp: 2026-09-24T07:31:51.076Z
model: opencode/big-pickle

Test received. What do you need?
```

Note: the literal quotation marks are how `opencode run` itself stores the message
(confirmed in the SQLite store) — capture is verbatim and does not add or remove them.

## Canary 2 (raw)

Session `ses_f2dac0773ffeBdw0dYfvUFymEm`, file `2026-09-24_07-31-53_ses_f2dac0773ffeBdw0dYfvUFymEm.md`:

```markdown
---
session_id: ses_f2dac0773ffeBdw0dYfvUFymEm
date: 2026-09-24
author: vampire
model: opencode/big-pickle
tool: opencode
project: amzonClone
total_exchanges: 1
first_prompt_time: 2026-09-24T07:31:53.800Z
last_prompt_time: 2026-09-24T07:31:53.800Z
---

# Session Log - 2026-09-24

Session: `ses_f2da` | Project: `amzonClone` | Author: `vampire`

---

[LOG_ENTRY type=PROMPT num=1 session=ses_f2da]
timestamp: 2026-09-24T07:31:53.800Z
model: opencode/big-pickle

"CAPTURE TEST — 8x assignment, vampire (canary session 2)"

[LOG_ENTRY type=RESPONSE num=1 session=ses_f2da]
timestamp: 2026-09-24T07:32:05.630Z
model: opencode/big-pickle

Looks like a test ping. No actual task attached. What would you like me to do?
```

## Things I tried first that did not work

1. **Looked for a `hook` key in `opencode.json`.** Not present in this version — the
   config schema has no hook section and rejects unknown keys. The first wrong move
   would have been forcing "hooks" that this tool does not have; the real mechanism is
   the plugin event bus, so that is what is used.
2. **First plugin version used the SDK client**: `client.session.messages()` /
   `client.session.get()`. Two failures discovered under `opencode run`:
   - the client returns a wrapped `{ data, request, response }` object, not a bare
     array, so the naive `Array.isArray` guard silently got `[]`;
   - and the message projection itself returned **0 messages** at `chat.message` time
     and even at `session.idle` (race/persistence gap).
     Fixed by reading the session store directly with `bun:sqlite` inside the plugin.
3. **`chat.message` hook input carries `messageID: undefined`** in this version, which
   made the first plugin drop every prompt (early-return). Fixed by falling back to
   `output.message.id`.
4. **First watcher version finalised the first completed assistant message** as the
   turn's response, so intermediate agent-loop text could be logged as the "final"
   response. Fixed with supersession: a turn's `RESPONSE` always converges to the
   newest *completed* assistant message with text (intermediate tool-loop text is
   overwritten, never kept).
5. **First `opencode run` canary produced no log** because the plugin's prompt path
   died on bug (2)/(3). The canary pair above is from a fresh fix and both sessions
   land prompt + response.

## Author

`Awais Javed` (given via canary 3). Falls back to `AGENT_CAPTURE_AUTHOR` env, then the
name above, and is stored per-session in the log frontmatter only.