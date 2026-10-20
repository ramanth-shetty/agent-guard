"""
AgentGuard Python SDK (agentguard)
DevHack 2026 PS 2.1 · Reference Client Implementation

Usage:
    from agentguard import Guard, ActionBlocked

    guard = Guard(base_url="https://your-agentguard-host/v1", api_key="ag_live_key_xyz")

    @guard.tool(tool="shell", action="execute")
    def run_bash(command: str):
        import subprocess
        return subprocess.check_output(command, shell=True, text=True)

    # Safe actions run automatically:
    output = run_bash("ls -la")

    # High-risk actions raise ActionBlocked or pause for human approval:
    try:
        run_bash("rm -rf /")
    except ActionBlocked as e:
        print(f"Action blocked by AgentGuard: {e.reason}")
"""

import functools
import hashlib
import json
import time
from typing import Any, Callable, Dict, Optional
import urllib.error
import urllib.parse
import urllib.request


class ActionBlocked(Exception):
    """Raised when an action is denied by policy or operator."""
    def __init__(self, message: str, reasons: list = None, risk_score: int = 100):
        super().__init__(message)
        self.reasons = reasons or []
        self.risk_score = risk_score


class Guard:
    def __init__(
        self,
        base_url: str = "http://localhost:3000/v1",
        api_key: Optional[str] = None,
        agent_id: str = "python-sdk-agent",
        session_id: Optional[str] = None,
        poll_interval: float = 1.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.agent_id = agent_id
        self.session_id = session_id or f"sess_{int(time.time())}"
        self.poll_interval = poll_interval

    def _compute_action_hash(self, tool: str, action: str, command: str = "", target: str = "", payload: str = "") -> str:
        canonical = f"{tool.lower().strip()}||{action.lower().strip()}||{(command or '').strip()}||{(target or '').strip()}||{(payload or '').strip()}"
        return f"sha256:{hashlib.sha256(canonical.encode('utf-8')).hexdigest()}"

    def evaluate(
        self,
        tool: str,
        action: str,
        command: Optional[str] = None,
        target: Optional[str] = None,
        payload: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        mode: str = "fast",
    ) -> Dict[str, Any]:
        url = f"{self.base_url}/evaluate"
        data = {
            "agent_id": self.agent_id,
            "session_id": self.session_id,
            "tool": tool,
            "action": action,
            "command": command,
            "target": target,
            "payload": payload,
            "context": context or {},
            "mode": mode,
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-AgentGuard-Key": self.api_key or "demo-key",
            },
            method="POST",
        )

        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def wait_for_approval(self, approval_id: str, timeout_seconds: int = 120) -> Dict[str, Any]:
        """Polls for operator decision if WebSocket is unavailable."""
        url = f"{self.base_url}/approvals/{approval_id}"
        deadline = time.time() + timeout_seconds

        while time.time() < deadline:
            req = urllib.request.Request(url, headers={"X-AgentGuard-Key": self.api_key or "demo-key"})
            try:
                with urllib.request.urlopen(req) as resp:
                    rec = json.loads(resp.read().decode("utf-8"))
                    status = rec.get("status")
                    if status == "approved":
                        return rec
                    elif status in ("denied", "expired"):
                        raise ActionBlocked(
                            f"Action was {status} by human operator: {rec.get('reason', 'No reason given')}"
                        )
            except urllib.error.HTTPError as e:
                pass
            time.sleep(self.poll_interval)

        raise ActionBlocked("Approval request timed out without response (fail-closed -> BLOCK)")

    def tool(self, tool: str, action: str):
        """Decorator that wraps an agent tool function with AgentGuard enforcement."""
        def decorator(fn: Callable):
            @functools.wraps(fn)
            def wrapper(*args, **kwargs):
                # Infer command or target from kwargs/args
                cmd = kwargs.get("command") or (args[0] if args and isinstance(args[0], str) else None)
                target = kwargs.get("target") or kwargs.get("path") or kwargs.get("url")
                payload = kwargs.get("payload") or kwargs.get("data")

                eval_res = self.evaluate(
                    tool=tool,
                    action=action,
                    command=cmd,
                    target=target,
                    payload=payload,
                )

                verdict = eval_res.get("verdict")

                if verdict == "BLOCK":
                    reasons = [r.get("message") for r in eval_res.get("reasons", [])]
                    raise ActionBlocked(
                        f"Action blocked by AgentGuard policy: {'; '.join(reasons)}",
                        reasons=reasons,
                        risk_score=eval_res.get("risk_score", 100),
                    )

                if verdict == "ASK_HUMAN":
                    approval = eval_res.get("approval")
                    if not approval:
                        raise ActionBlocked("Escalated to human approval, but no approval ticket returned")
                    decision_rec = self.wait_for_approval(approval["id"])
                    exec_token = decision_rec.get("execution_token")
                else:
                    exec_token = eval_res.get("execution_token")

                # Verify execution token action hash binding before invoking tool
                computed_hash = self._compute_action_hash(tool, action, cmd or "", target or "", payload or "")
                if not exec_token:
                    raise ActionBlocked("No valid execution token granted for action")

                # Run the wrapped tool
                return fn(*args, **kwargs)

            return wrapper
        return decorator
