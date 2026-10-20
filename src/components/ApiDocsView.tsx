import React, { useState } from 'react';
import {
  Code,
  Terminal,
  Copy,
  Check,
  Download,
  BookOpen,
} from 'lucide-react';

export const ApiDocsView: React.FC = () => {
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const pythonSdkCode = `from agentguard import Guard, ActionBlocked

# Initialize AgentGuard SDK wrapper
guard = Guard(
    base_url="http://localhost:3000/v1",
    api_key="ag_live_key_production"
)

# Protect agent tool execution with @guard.tool
@guard.tool(tool="shell", action="execute")
def run_bash(command: str):
    import subprocess
    return subprocess.check_output(command, shell=True, text=True)

# 1. Safe actions run automatically:
output = run_bash("git status")
print(output)

# 2. Dangerous or unauthorized actions raise ActionBlocked:
try:
    run_bash("rm -rf /")
except ActionBlocked as e:
    print(f"Action blocked by AgentGuard: {e}")`;

  const curlEvaluateCode = `curl -X POST http://localhost:3000/v1/evaluate \\
  -H "Content-Type: application/json" \\
  -H "X-AgentGuard-Key: ag_live_key_xyz" \\
  -d '{
    "agent_id": "swe_agent_01",
    "session_id": "session_881",
    "tool": "shell",
    "action": "execute",
    "command": "cat /etc/shadow",
    "target": "/etc/shadow"
  }'`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#181818] p-5 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#282828]">
        <div>
          <div className="flex items-center gap-2 font-mono">
            <BookOpen className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Developer API & Python SDK Specification
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#242424] text-[#A3A3A3] border border-[#333333] font-bold uppercase">
              REST / OPENAPI 3.1
            </span>
          </div>
          <p className="text-xs text-[#A3A3A3] mt-1 max-w-2xl leading-relaxed font-sans">
            Integrate AgentGuard into Python LangChain, AutoGen, CrewAI, or raw agent harnesses. Every action proposed by the agent is cryptographically verified before execution.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 text-xs font-mono font-bold text-[#D4D4D4] hover:text-white bg-[#222222] border border-[#333333] rounded-xs flex items-center gap-1.5 cursor-pointer transition-colors uppercase tracking-tight"
          >
            <Download className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>OpenAPI Schema JSON</span>
          </a>
        </div>
      </div>

      {/* Grid: Python SDK + REST Endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Python SDK Column (6 Cols) */}
        <div className="lg:col-span-6 bg-[#181818] border border-[#282828] rounded-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#86EFAC]" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Python SDK (`agentguard`)
              </h4>
            </div>

            <button
              onClick={() => handleCopy(pythonSdkCode, 'python')}
              className="text-xs text-[#A3A3A3] hover:text-white flex items-center gap-1 font-mono cursor-pointer font-bold"
            >
              {copiedSnippet === 'python' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#86EFAC]" />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY CODE</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-[#A3A3A3] font-sans">
            Wrap agent tool methods with the <code className="text-white font-mono font-bold">@guard.tool</code> decorator. The SDK automatically verifies HMAC action tokens and enforces fail-closed policies.
          </p>

          <pre className="text-xs font-mono text-[#D4D4D4] bg-[#141414] p-4 rounded-xs border border-[#282828] overflow-x-auto whitespace-pre leading-relaxed">
            {pythonSdkCode}
          </pre>
        </div>

        {/* REST API & Endpoints Column (6 Cols) */}
        <div className="lg:col-span-6 bg-[#181818] border border-[#282828] rounded-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-[#F59E0B]" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                REST API Quickstart (cURL)
              </h4>
            </div>

            <button
              onClick={() => handleCopy(curlEvaluateCode, 'curl')}
              className="text-xs text-[#A3A3A3] hover:text-white flex items-center gap-1 font-mono cursor-pointer font-bold"
            >
              {copiedSnippet === 'curl' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#86EFAC]" />
                  <span>COPIED</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY CURL</span>
                </>
              )}
            </button>
          </div>

          <pre className="text-xs font-mono text-[#D4D4D4] bg-[#141414] p-4 rounded-xs border border-[#282828] overflow-x-auto whitespace-pre leading-relaxed">
            {curlEvaluateCode}
          </pre>

          {/* Endpoints Table */}
          <div className="border border-[#282828] rounded-xs overflow-hidden">
            <div className="bg-[#141414] px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white border-b border-[#282828]">
              Key Endpoints (Base: /v1)
            </div>
            <div className="divide-y divide-[#242424] text-xs font-mono">
              <div className="p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-[#242424] text-white border border-[#333333]">
                    POST
                  </span>
                  <span className="text-white font-bold">/v1/evaluate</span>
                </div>
                <span className="text-[11px] text-[#A3A3A3] font-sans">Evaluate proposed agent tool action</span>
              </div>

              <div className="p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-[#242424] text-[#86EFAC] border border-[#333333]">
                    GET
                  </span>
                  <span className="text-white font-bold">/v1/approvals</span>
                </div>
                <span className="text-[11px] text-[#A3A3A3] font-sans">List pending human approval tickets</span>
              </div>

              <div className="p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-[#242424] text-white border border-[#333333]">
                    POST
                  </span>
                  <span className="text-white font-bold">/v1/approvals/:id/decision</span>
                </div>
                <span className="text-[11px] text-[#A3A3A3] font-sans">Submit approve/deny operator verdict</span>
              </div>

              <div className="p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-[#242424] text-[#86EFAC] border border-[#333333]">
                    GET
                  </span>
                  <span className="text-white font-bold">/v1/audit/verify</span>
                </div>
                <span className="text-[11px] text-[#A3A3A3] font-sans">Cryptographic hash chain verification</span>
              </div>

              <div className="p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-[#242424] text-white border border-[#333333]">
                    POST
                  </span>
                  <span className="text-white font-bold">/v1/simulate</span>
                </div>
                <span className="text-[11px] text-[#A3A3A3] font-sans">Execute 15-scenario benchmark suite</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
