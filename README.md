# AgentGuard — Autonomous AI Agent Permission & Policy Guardrails API

> **DevHack 2026 Problem Statement PS 2.1 — Final Project Delivery**  
> **Production-Grade Policy Enforcement, Interception Engine, and Human-in-the-Loop Oversight for Autonomous AI Agents**

---

## 1. Executive Summary

Autonomous AI agents equipped with tool-calling capabilities (Bash execution, file read/write, HTTP networking, database queries, package managers) introduce critical operational and security risks:
- Unintended destructive actions (e.g., `rm -rf /`, `DROP TABLE`, rogue `git push`)
- Sensitive credential leaks and data exfiltration (e.g., `.env` harvesting, credit card exposure, token forwarding)
- Boundary escapes (e.g., writing outside sandbox boundaries, reading `/etc/shadow`)
- Unbounded operational autonomy without human sign-off for critical production tasks

**AgentGuard** is an ultra-low-latency, fail-closed interception proxy and policy harness that validates, sanitizes, and evaluates every tool call proposed by an agent before execution. It returns one of three decisive verdicts:
- **`ALLOW`**: The action is benign, within policy bounds, and safe to proceed automatically.
- **`ASK_HUMAN`**: The action carries elevated risk or touches protected resources; execution pauses, a time-limited approval ticket is created with an HMAC-signed token, and an authorized human operator must approve it before a cryptographically bound execution token is issued.
- **`BLOCK`**: The action violates security policy, attempts boundary evasion, or threatens system integrity; it is rejected immediately with an immutable audit entry.

---

## 2. Key Accomplishments & Architectural Components

### 2.1. Dual-Path Evaluation Engine
- **Fast Deterministic Path (<10ms p95 latency):** Zero-regex-catastrophe, high-speed AST and token matching against system boundary rules, forbidden shell commands, destructive database statements, and boundary-escape traversals.
- **Deep Reasoning Path (Gemini Integration):** When ambiguous multi-step intent or complex contextual prompts arise, the engine can invoke Google Gemini to evaluate contextual safety, semantic intent, and risk propensity without stalling standard deterministic policies.

### 2.2. Zero-Leak Privacy Shield
- **Strict Regular & Algorithmic Expression Filtering:** Identifies and redacts sensitive credentials prior to storage or audit display:
  - AWS Access Keys (`AKIA...`), GitHub Tokens (`ghp_...`, `gho_...`), JWT Tokens (`eyJ...`), Generic Bearer Tokens, Database URIs, Private Keys (`-----BEGIN ... KEY-----`), Passwords, and Email addresses.
- **Luhn Algorithm Credit Card Validation:**
  - Employs strict Luhn checksum validation on 13–19 digit sequences.
  - Distinguishes actual credit cards from harmless 16-digit order numbers or shipment tracking IDs, eliminating false-positive blocks.
- **Contextual Prose Disambiguation:**
  - Prevents false-positive redaction on English phrases such as `"Please enter your password"` while cleanly trapping and redacting actual assignments like `password=SuperSecret123`.

### 2.3. Fail-Closed Dynamic Policy Engine
- **Declarative YAML & JSON Configuration:** Supports defining allowed, ask-human, and blocked tools, commands, and target path globs.
- **Live Validation & Hot-Reloading:** The web console allows editing the active policy in real-time with syntax validation, schema linting, and instant reset to safe defaults.
- **Strict Default-Deny:** Any unlisted tool or unrecognized action defaults to `ASK_HUMAN` or `BLOCK` rather than silently passing through.

### 2.4. Human-in-the-Loop (HITL) Approval Queue
- **Time-to-Live (TTL) Auto-Expiration:** Pending approval requests have a configurable countdown timer (default 120 seconds).
- **Strict Fail-Closed Expiration:** If an operator does not respond before TTL expiry, the request automatically transitions to `expired` (verdict: `BLOCK`).
- **HMAC-SHA256 Execution Token Binding:**
  - When an action is approved, AgentGuard issues a single-use execution token cryptographically bound to `SHA-256(tool + action + command + target + payload)`.
  - If a compromised agent attempts an **Action-Swap Attack** (substituting `rm -rf /` using a token issued for `ls`), the SDK and engine immediately detect the hash mismatch and abort.

### 2.5. Cryptographic Hash-Chain Audit Ledger
- **Tamper-Evident Ledger:** Every intercepted action, verdict, latency metric, and redaction is recorded in a cryptographically linked ledger.
- **Genesis Block & SHA-256 Hashing:** Each record computes `current_hash = SHA-256(prev_hash + id + timestamp + action_hash + verdict)`.
- **One-Click Real-Time Chain Verification:** The system verifies the mathematical integrity of the entire chain on demand via `/v1/audit/verify`.

### 2.6. Canonical 15-Scenario Benchmark Suite & Custom Sandbox
- **100% Pass Rate** across all 15 benchmark scenarios:
  1. Safe Directory Listing (`ALLOW`)
  2. Developer Testing Commands (`ALLOW`)
  3. Package Installation (`ASK_HUMAN`)
  4. Write Outside Workspace Boundary (`ASK_HUMAN`)
  5. Destructive Root Deletion (`BLOCK`)
  6. Remote Shell Piping (`BLOCK`)
  7. Protected Credentials Access (`BLOCK`)
  8. Data Exfiltration over HTTP (`BLOCK`)
  9. Destructive Database DDL (`BLOCK`)
  10. Obfuscated Command Evasion (`BLOCK`)
  11. Sensitive Identity & Card Redaction (`BLOCK` + Luhn Masking)
  12. Contextual Prose Disambiguation (`ALLOW`)
  13. 16-Digit Non-Card Order ID (`ALLOW` via Luhn check)
  14. Approval Timeout Expiration (`BLOCK` via fail-closed)
  15. Action Hash Binding / Mismatch Refusal (`BLOCK` on swapped payload)
- **Custom Interactive Sandbox:** Live UI playground allowing operators to test arbitrary agent commands, tools, payload text, and execution modes (`fast` vs `deep`).

### 2.7. Reference Python SDK (`sdk/agentguard.py`)
- Pythonic `@guard.tool(tool="shell", action="execute")` decorator.
- Automatically calculates canonical action hashes, polls for human approval upon `ASK_HUMAN`, verifies cryptographically bound execution tokens, and raises `ActionBlocked` exceptions upon rejection.

### 2.8. User Interface & Design System
- **Deep Monochromatic (Premium Dark `#121212`):**
  - Ultra-deep, warm charcoal background (`#121212`).
  - Solid, flat panels (`#181818`) with crisp structural borders (`#282828`).
  - Razor-sharp typography pairing `Syne` for display headers, `DM Sans` for body, and `JetBrains Mono` for cryptographic hashes, code, and latency metrics.
  - Distinct amber (`#F59E0B`) pigments for primary interactive triggers and sage green (`#86EFAC`) for approvals.
  - Zero-clipping layout with full viewport presence, real-time live event streaming, and dedicated attribution/telemetry footer.

---

## 3. Project Architecture & File Tree

```
├── .env.example                     # Environment configuration template
├── index.html                       # Web entry point with typography & meta headers
├── package.json                     # Node.js dependencies and run scripts
├── server.ts                        # Express server + WebSocket + Vite middleware
├── tsconfig.json                    # TypeScript compiler configuration
├── vite.config.ts                   # Vite bundler configuration
│
├── sdk/
│   └── agentguard.py                # Reference Python SDK with tool decorators & hash verification
│
└── src/
    ├── App.tsx                      # Root component with tab navigation, footer & telemetry
    ├── index.css                    # Tailwind CSS + Deep Monochromatic design tokens
    ├── main.tsx                     # React client bootstrap entry point
    │
    ├── components/
    │   ├── ActionDetailModal.tsx    # Modal inspector for full audit payload & redaction diff
    │   ├── ApiDocsView.tsx          # Interactive API documentation, schemas & curl snippets
    │   ├── ApprovalQueueView.tsx    # Real-time human review queue with live TTL countdown
    │   ├── AuditLedgerView.tsx      # Cryptographic audit log with hash-chain integrity verifier
    │   ├── LiveMonitorView.tsx      # Real-time intercepted tool feed, telemetry stats & search
    │   ├── Navbar.tsx               # Header with brand mark, tab navigation & fast simulation button
    │   ├── PolicyEditorView.tsx     # Live YAML policy editor with schema validation & reset
    │   └── SimulatorView.tsx        # 15-scenario benchmark runner + interactive testing sandbox
    │
    ├── server/
    │   ├── routes.ts                # Express REST API endpoints & SSE event broadcaster
    │   ├── engine/
    │   │   ├── crypto.ts            # SHA-256 hash calculator & HMAC execution token generator
    │   │   ├── evaluator.ts         # Dual-path evaluation pipeline orchestrator
    │   │   ├── normalizer.ts        # Path traversal & shell command canonicalization
    │   │   ├── policyEngine.ts      # Policy loader, YAML validator, and rule evaluator
    │   │   ├── privacyShield.ts     # PII, credential, API key & Luhn credit card redactor
    │   │   ├── riskClassifier.ts    # Heuristic threat analyzer & risk score calculator
    │   │   └── simulationSuite.ts   # 15 canonical benchmark scenarios & metric aggregator
    │   └── store/
    │       ├── approvalStore.ts     # In-memory approval ticket manager & SSE/WS event bus
    │       └── auditStore.ts        # Cryptographic ledger store & hash-chain verifier
    │
    └── shared/
        └── types.ts                 # Shared TypeScript interfaces, enums, and API contracts
```

---

## 4. REST API Reference

All API routes are served under `/v1/*` with `Content-Type: application/json`.

### 4.1. `POST /v1/evaluate`
Intercepts an agent action and returns an enforcement verdict.

**Request Body:**
```json
{
  "agent_id": "coder_agent_01",
  "session_id": "sess_89f0a",
  "tool": "shell",
  "action": "execute",
  "command": "pytest tests/ --verbose",
  "target": "/sandbox/workspace",
  "mode": "fast"
}
```

**Response (`ALLOW`):**
```json
{
  "verdict": "ALLOW",
  "risk_score": 10,
  "risk_categories": ["safe_read"],
  "reasons": [
    { "rule_id": "ALLOW_TEST_SUITE", "severity": "low", "message": "Standard automated test execution allowed." }
  ],
  "redacted": { "command": "pytest tests/ --verbose" },
  "sensitive_entities": [],
  "action_hash": "sha256:7f9a8b...",
  "execution_token": "ag_tok_...",
  "latency_ms": 3,
  "engine": { "path": "fast", "llm": false }
}
```

**Response (`ASK_HUMAN`):**
```json
{
  "verdict": "ASK_HUMAN",
  "risk_score": 60,
  "risk_categories": ["system_modification"],
  "reasons": [
    { "rule_id": "EXTERNAL_FILE_WRITE", "severity": "medium", "message": "Attempt to write outside sandbox." }
  ],
  "approval_id": "appr_1713000000_abcd",
  "expires_at": "2026-10-19T10:02:00.000Z",
  "action_hash": "sha256:4d2e1f...",
  "latency_ms": 5,
  "engine": { "path": "fast", "llm": false }
}
```

**Response (`BLOCK`):**
```json
{
  "verdict": "BLOCK",
  "risk_score": 100,
  "risk_categories": ["destructive_shell", "system_integrity"],
  "reasons": [
    { "rule_id": "BLOCK_ROOT_DELETION", "severity": "critical", "message": "Destructive root deletion command detected." }
  ],
  "action_hash": "sha256:9c1a3b...",
  "latency_ms": 2,
  "engine": { "path": "fast", "llm": false }
}
```

---

### 4.2. `GET /v1/approvals` & `POST /v1/approvals/:id/decision`
Manage pending human approvals.

- **`GET /v1/approvals?status=pending`**: Returns list of all pending approval requests.
- **`POST /v1/approvals/:id/decision`**:
  ```json
  {
    "decision": "approve",
    "reason": "Verified maintenance script",
    "decided_by": "security_engineer"
  }
  ```
  Returns the approved record containing the HMAC-signed `execution_token`.

---

### 4.3. `GET /v1/policies/active` & `PUT /v1/policies`
Retrieve or modify the active security policy.

**Example YAML Policy:**
```yaml
version: "3.0.0"
mode: "fail_closed"
timeout_seconds: 120
rules:
  - id: "BLOCK_RM_RF"
    tool: "shell"
    pattern: "rm\\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\\s+/"
    verdict: "BLOCK"
  - id: "ALLOW_SAFE_COMMANDS"
    tool: "shell"
    pattern: "^(ls|git|pytest|cat|echo)"
    verdict: "ALLOW"
```

---

### 4.4. `GET /v1/audit` & `GET /v1/audit/verify`
- **`GET /v1/audit`**: Query historical audit records by `verdict`, `agent_id`, or `session_id`.
- **`GET /v1/audit/verify`**: Computes SHA-256 genesis-to-tip hash verification.
  ```json
  {
    "valid": true,
    "total_records": 150,
    "genesis_hash": "0000000000000000000000000000000000000000000000000000000000000000",
    "tip_hash": "8f39a7b1...",
    "broken_index": -1
  }
  ```

---

### 4.5. `POST /v1/simulate`
Executes the full 15-scenario canonical benchmark suite and returns summary statistics:
- `pass_rate`: `100%`
- `high_risk_intercept_rate`: `100%`
- `p95_fast_path_latency_ms`: `< 10ms` (exceeds the 100ms threshold)
- `unredacted_raw_secrets_leaked`: `0`

---

### 4.6. `GET /v1/events` & `WS /v1/ws/events`
- Real-time Server-Sent Events (SSE) and WebSocket feeds for instant updates to connected dashboards when actions are intercepted or approved.

---

## 5. Security & Verification Guarantees

| Security Property | Implementation Mechanism | Validation Status |
| :--- | :--- | :--- |
| **Fail-Closed Default** | Unrecognized commands or expired approvals default to `BLOCK` | Tested & Verified |
| **Tamper-Evident Logs** | Continuous SHA-256 cryptographic hash-chain across all verdicts | Tested & Verified |
| **Anti-Token Hijacking** | Execution tokens bound to `SHA-256(canonical action data)` | Tested & Verified |
| **Zero-Leak Redaction** | Luhn algorithm + multi-class entity masking before persistence | Tested & Verified |
| **Sub-100ms Overhead** | Fast-path deterministic evaluation averages <5ms (p95 < 10ms) | Tested & Verified |

---

## 6. How to Run & Verify

### Starting the Server
```bash
npm run dev
```
The server runs unified Express REST endpoints, WebSocket streams, and the React frontend on `http://localhost:3000`.

### Running Verification via CLI
```bash
# 1. Check health
curl -s http://localhost:3000/v1/health

# 2. Run the 15-scenario benchmark suite
curl -s -X POST http://localhost:3000/v1/simulate | jq .

# 3. Verify cryptographic audit chain integrity
curl -s http://localhost:3000/v1/audit/verify | jq .

# 4. Read system telemetry metrics
curl -s http://localhost:3000/v1/metrics | jq .
```

---

## 7. Submission Details
- **Project Name:** AgentGuard
- **Event:** DevHack 2026
- **Problem Statement:** PS 2.1 — Autonomous AI Agent Permission and Policy API
- **Design System:** Deep Monochromatic (Premium Dark `#121212`)
- **License:** MIT License — © 2026 AgentGuard
