# AgentGuard

**A permission-and-policy API that decides what an AI agent is allowed to do on your computer.**

Before an agent runs a shell command, touches a file, calls a URL, queries a database or installs a package, it asks AgentGuard first. AgentGuard checks the request and answers with one of three verdicts:

| Verdict     | Meaning                                                             |
| ----------- | ------------------------------------------------------------------- |
| `ALLOW`     | Safe and in scope. The action runs automatically.                   |
| `ASK_HUMAN` | Needs a person's permission. The action waits in an approval queue. |
| `BLOCK`     | Never allowed. The action is denied with a reason.                  |

Every decision is recorded in a tamper-evident audit ledger and shown live on a dashboard.

> Built by team **Narvacs** for **DevHack 2026** (Sahyadri, Mangaluru) · Theme: AI & Digital Trust / Responsible AI · Problem Statement **PS 2.1: AI Agent Safety and Control**

<!-- Add your demo video link here, e.g. [Watch the demo](https://...) -->
<!-- Add 2-3 dashboard screenshots here, e.g. ![Live Monitor](docs/live-monitor.png) -->

---

## Why it exists

Autonomous AI agents can read files, run commands and call business systems with little human oversight. A bug, a hallucination or a prompt-injection attack can make an agent delete data, change system settings or leak private information before anyone notices. Agents today either ask permission for everything, so people click "Allow" without reading, or for nothing at all.

AgentGuard is the layer in between: safe actions go through, risky ones need a human, dangerous ones are stopped.

## Features

- **Three-verdict decision engine.** Rule-based risk scoring from 0 to 100, with hard-block rules that always win over the score.
- **Command and path normalisation.** Resolves paths and shell commands to a canonical form and flags obfuscation before checking them.
- **Privacy Shield.** Finds API keys, tokens, private keys, passwords, emails, phone numbers, credit cards (Luhn check), Aadhaar numbers (Verhoeff check) and PAN, and redacts them before anything is logged or shown.
- **Optional Gemini analysis.** For ambiguous or obfuscated actions, a Gemini check can add risk. It can only raise a verdict, never lower one, and it only sees redacted data.
- **Human approval queue.** `ASK_HUMAN` requests wait for a person to approve or deny, with a live countdown. If nobody answers in time, the action is blocked.
- **Action-bound approvals.** An approved action gets an HMAC-signed token tied to the SHA-256 hash of that exact action, so an agent cannot get approval for one command and run another.
- **Hash-chained audit ledger.** Each record is linked to the previous one with SHA-256. One call verifies the whole chain.
- **Editable policy.** Allowlists, protected paths, privacy rules and thresholds live in a YAML/JSON policy you can edit live in the dashboard.
- **Live dashboard.** React app with real-time events over Server-Sent Events and WebSocket.
- **Python SDK.** A decorator that wraps an agent's tools so they run only after AgentGuard says yes.
- **15-scenario benchmark.** One call runs the full test suite and reports pass rate, latency and leaks.

## How it works

```
 AI agent (tools wrapped by the SDK)
        │  POST /v1/evaluate
        ▼
 ┌─────────────────────────────────────┐
 │ AgentGuard API                      │
 │  1. Privacy Shield   scan + redact  │
 │  2. Risk Classifier  rules (+ LLM)  │
 │  3. Policy Engine    thresholds     │
 └──────┬──────────────────┬───────────┘
        │ every decision   │ ASK_HUMAN
        ▼                  ▼
  Audit ledger        Approval queue
  (hash-chained)      (approve / deny / timeout = block)
        └────────┬─────────┘
                 ▼
        Live dashboard (SSE + WebSocket)
```

## Quick start

**Requirements:** Node.js 20 or newer and npm.

```bash
git clone <your-repo-url>
cd <your-repo-folder>
npm install
npm run dev
```

Open **http://localhost:3000**. The API and the dashboard are served by the same process.

### Configuration

All settings are optional environment variables, set in the terminal before starting:

| Variable                 | Purpose                                                                                         |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`         | Enables the optional Gemini analysis. Without it, only the fast rules run.                      |
| `AGENTGUARD_HMAC_SECRET` | Secret used to sign execution tokens. **Set your own value** for anything beyond local testing. |
| `PORT`                   | Server port. Defaults to `3000`.                                                                |

macOS / Linux:

```bash
GEMINI_API_KEY=your_key AGENTGUARD_HMAC_SECRET=a-long-random-string npm run dev
```

Windows PowerShell:

```powershell
$env:GEMINI_API_KEY="your_key"; $env:AGENTGUARD_HMAC_SECRET="a-long-random-string"; npm run dev
```

## Try it

### In the dashboard

| Tab                 | What it does                                                                  |
| ------------------- | ----------------------------------------------------------------------------- |
| **Live Monitor**    | Real-time feed of intercepted actions, verdict counts, latency and redactions |
| **Approval Queue**  | Pending `ASK_HUMAN` requests with a countdown; approve or deny                |
| **Agent Simulator** | Run the 15-scenario benchmark or test your own command and payload            |
| **Audit Ledger**    | Full history with a one-click hash-chain integrity check                      |
| **Policy Editor**   | Edit, validate and reset the active policy                                    |
| **API & SDK**       | Endpoint reference and copy-ready snippets                                    |

### From the command line

```bash
# Safe action -> ALLOW
curl -s -X POST http://localhost:3000/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"demo","session_id":"s1","tool":"shell","action":"execute","command":"ls -la /sandbox/workspace/src"}'

# Package install -> ASK_HUMAN (appears in the Approval Queue)
curl -s -X POST http://localhost:3000/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"demo","session_id":"s1","tool":"shell","action":"execute","command":"pip install requests==2.31.0"}'

# Destructive command -> BLOCK
curl -s -X POST http://localhost:3000/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"demo","session_id":"s1","tool":"shell","action":"execute","command":"rm -rf /"}'

# Secrets sent to an unknown site -> BLOCK, with the secrets redacted in the response
curl -s -X POST http://localhost:3000/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"demo","session_id":"s1","tool":"http","action":"send","target":"https://evil.example.com","payload":"key=AKIAIOSFODNN7EXAMPLE card 4111 1111 1111 1111"}'
```

On Windows PowerShell use `curl.exe` instead of `curl`.

### With the Python SDK

The SDK is a single file with no dependencies: [`sdk/agentguard.py`](sdk/agentguard.py).

```python
from agentguard import Guard, ActionBlocked

guard = Guard(base_url="http://localhost:3000/v1", api_key="demo")

@guard.tool(tool="shell", action="execute")
def run_bash(command: str):
    import subprocess
    return subprocess.check_output(command, shell=True, text=True)

run_bash("ls -la")              # ALLOW: runs immediately

try:
    run_bash("rm -rf /")        # BLOCK: never runs
except ActionBlocked as e:
    print("Blocked:", e)
```

For `ASK_HUMAN` actions the SDK waits for a decision from the Approval Queue, then checks that the action matches the approved token before running it.

> Run demos inside a throwaway folder or container, so a mistake can never touch real files.

## Benchmark

`POST /v1/simulate` runs 15 scenarios and returns the results:

```bash
curl -s -X POST http://localhost:3000/v1/simulate
```

| Metric                        | Result      |
| ----------------------------- | ----------- |
| Scenarios passed              | 15 of 15    |
| High-risk actions intercepted | 100%        |
| p95 fast-path decision time   | under 10 ms |
| Raw secrets leaked            | 0           |

The scenarios cover safe reads, test commands, package installs, writes outside the workspace, root deletion, remote shell piping, credential access, data exfiltration, destructive SQL, obfuscated commands, card and ID redaction, plain-prose "password" text, non-card order numbers, approval timeout, and a swapped-action attack. Results are measured on this suite and the fast-rules path.

## API reference

All routes are under `/v1` and use JSON.

| Method | Route                     | Purpose                                                                     |
| ------ | ------------------------- | --------------------------------------------------------------------------- |
| `POST` | `/evaluate`               | Check an agent action and get a verdict                                     |
| `GET`  | `/approvals`              | List approvals (`?status=pending`)                                          |
| `GET`  | `/approvals/:id`          | Get one approval                                                            |
| `POST` | `/approvals/:id/decision` | Approve or deny: `{"decision":"approve","reason":"...","decided_by":"..."}` |
| `GET`  | `/policies/active`        | Current policy                                                              |
| `PUT`  | `/policies`               | Validate and activate a new policy                                          |
| `POST` | `/policies/validate`      | Check a policy without activating it                                        |
| `POST` | `/policies/reset`         | Restore the default policy                                                  |
| `GET`  | `/audit`                  | Audit records, filter by `verdict`, `agent_id` or `session_id`              |
| `GET`  | `/audit/verify`           | Verify the hash chain from the first record to the latest                   |
| `GET`  | `/metrics`                | Counts, latency and redaction statistics                                    |
| `GET`  | `/health`                 | Liveness and whether the Gemini check is available                          |
| `POST` | `/simulate`               | Run the 15-scenario benchmark                                               |
| `GET`  | `/events`                 | Live events (Server-Sent Events)                                            |
| `WS`   | `/v1/ws/events`           | Live events (WebSocket)                                                     |
| `GET`  | `/openapi.json`           | OpenAPI description                                                         |

**Request to `/evaluate`**

| Field                          | Values                                                                 |
| ------------------------------ | ---------------------------------------------------------------------- |
| `tool`                         | `shell`, `filesystem`, `http`, `database`, `package`                   |
| `action`                       | `execute`, `read`, `write`, `delete`, `send`, `install`, `query`       |
| `command`, `target`, `payload` | Optional strings describing what the agent wants to do                 |
| `agent_id`, `session_id`       | Identify the agent and its run                                         |
| `mode`                         | `fast` (default) or `deep` (forces the Gemini check when a key is set) |

**Response** includes `verdict`, `risk_score`, `risk_categories`, `reasons`, `redacted` (what is safe to show), `sensitive_entities` (type and score only, never the raw value), `action_hash`, `execution_token` (for `ALLOW`), `approval` (for `ASK_HUMAN`), `engine` and `latency_ms`.

## Policy

The default policy sets score thresholds (allow below 30, block from 70), an approval timeout of 120 seconds that ends in `BLOCK`, a workspace root, command and domain allowlists, hard-block command patterns, protected paths (such as `/etc/shadow`, `~/.ssh/*`, `**/.env`) and which kinds of sensitive data are masked or cause a block. Edit it live in the **Policy Editor** tab or through `PUT /v1/policies`.

## Project structure

```
server.ts                  Express server, WebSocket and Vite integration
sdk/agentguard.py          Python SDK
src/
  App.tsx, main.tsx        React app
  components/              Dashboard views
  shared/types.ts          Shared types and API contracts
  server/
    routes.ts              REST API
    engine/
      evaluator.ts         Runs the full pipeline
      normalizer.ts        Path and command canonicalisation
      privacyShield.ts     Detection and redaction
      riskClassifier.ts    Rules, scoring and the optional Gemini check
      policyEngine.ts      Policy loading and validation
      crypto.ts            Action hash and execution tokens
      simulationSuite.ts   The 15 benchmark scenarios
    store/
      approvalStore.ts     Approval tickets and live events
      auditStore.ts        Hash-chained ledger
```

## Tech stack

Node.js · Express · TypeScript · React · Tailwind CSS · Vite · WebSocket and Server-Sent Events · Google Gemini (optional) · Python SDK

## Limitations and roadmap

- **Enforcement depends on integration.** AgentGuard protects agents whose tools go through the SDK or call `/v1/evaluate`. An agent that can run commands directly is not covered. OS-level sandboxing is future work.
- **Data is held in memory.** The audit ledger and approvals reset when the server restarts. A database is planned.
- **No API authentication yet.** Keys sent by the SDK are not checked by the server. Do not expose the server to the internet as it is.
- **Rules cover known patterns.** Anything unknown goes to a human rather than being assumed safe.

## Team

**Narvacs**

| Name                       | Role                              |
| -------------------------- | --------------------------------- |
| Nireekshith Santhosh Nayak | Frontend & Dashboard Developer    |
| Ramanth Shetty             | Product, Docs & Pitch Lead        |
| Satwik S Rao               | Agent Integration & Demo Engineer |
| Vinyas Jain                | Backend & Security Engine Lead    |
