import React, { useState, useEffect } from 'react';
import { ApprovalRecord } from '../shared/types.js';
import {
  Clock,
  Key,
  Copy,
  Check,
  UserCheck,
} from 'lucide-react';

interface ApprovalQueueViewProps {
  approvals: ApprovalRecord[];
  onDecide: (id: string, decision: 'approve' | 'deny', reason?: string) => Promise<void>;
  onRefresh: () => void;
}

export const ApprovalQueueView: React.FC<ApprovalQueueViewProps> = ({
  approvals,
  onDecide,
  onRefresh,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRecord | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [isDenying, setIsDenying] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredApprovals = approvals.filter((app) => {
    if (filterStatus === 'all') return true;
    return app.status === filterStatus;
  });

  const getRemainingSeconds = (expiresAt: string) => {
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
    return diff;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Fail-Closed Security Banner */}
      <div className="bg-[#181818] border border-[#2E2415] rounded-sm p-4 flex items-start gap-3.5">
        <Clock className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-mono font-bold uppercase tracking-wider text-[#F59E0B] flex items-center gap-2">
            <span>Fail-Closed Human Approval Security Contract</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-[#2C2115] text-[#F59E0B] border border-[#F59E0B]/30 rounded-xs">
              MANDATORY
            </span>
          </p>
          <p className="text-[#A3A3A3] mt-1 leading-relaxed font-sans">
            Actions scored in the medium risk threshold (30–69) or modifying sensitive system boundaries require manual human authorization.
            If an approval request is left unanswered before the timer expires, AgentGuard automatically defaults to{' '}
            <strong className="text-[#EF4444] font-mono font-bold">[BLOCK]</strong> and logs the timeout in the tamper-evident SHA-256 ledger.
          </p>
        </div>
      </div>

      {/* Main Grid: List + Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Approvals List (5 Cols) */}
        <div className="lg:col-span-5 bg-[#181818] border border-[#282828] rounded-sm overflow-hidden flex flex-col h-[650px]">
          {/* Header */}
          <div className="p-3.5 border-b border-[#282828] bg-[#141414] flex items-center justify-between">
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span>Approval Tickets</span>
                <span className="text-[#F59E0B]">
                  ({approvals.filter((a) => a.status === 'pending').length} pending)
                </span>
              </h2>
              <p className="text-[11px] text-[#737373] font-sans mt-0.5">
                Operator authorization desk
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-0.5 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xs text-xs font-mono">
              {['pending', 'approved', 'denied', 'expired', 'all'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2 py-0.5 rounded-xs uppercase tracking-tight transition-colors cursor-pointer text-[10px] ${
                    filterStatus === st
                      ? 'bg-[#282828] text-white font-bold'
                      : 'text-[#737373] hover:text-[#D4D4D4]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#242424]">
            {filteredApprovals.length === 0 ? (
              <div className="p-12 text-center text-[#737373] text-xs font-mono">
                No tickets matching filter "{filterStatus.toUpperCase()}"
              </div>
            ) : (
              filteredApprovals.map((app) => {
                const isSelected = selectedApproval?.id === app.id;
                const remaining = getRemainingSeconds(app.expires_at);

                return (
                  <div
                    key={app.id}
                    onClick={() => {
                      setSelectedApproval(app);
                      setIsDenying(false);
                    }}
                    className={`p-3.5 hover:bg-[#202020] transition-colors cursor-pointer text-xs font-sans ${
                      isSelected ? 'bg-[#222222] border-l-2 border-[#F59E0B]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white uppercase text-[11px]">
                          {app.tool} · {app.action}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded-xs text-[10px] font-bold uppercase ${
                            app.status === 'pending'
                              ? 'bg-[#2C2115] text-[#F59E0B] border border-[#F59E0B]/30'
                              : app.status === 'approved'
                              ? 'bg-[#1C281F] text-[#86EFAC] border border-[#86EFAC]/30'
                              : 'bg-[#2B1717] text-[#EF4444] border border-[#EF4444]/30'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>

                      {app.status === 'pending' && (
                        <div className="flex items-center gap-1 tabular-nums text-[11px] text-[#F59E0B] font-bold">
                          <Clock className="w-3 h-3" />
                          <span>{remaining}s</span>
                        </div>
                      )}
                    </div>

                    <p className="font-mono text-[#D4D4D4] truncate text-[11px]">
                      {app.redacted?.command || app.redacted?.target || 'Action payload'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[#737373] mt-2 font-mono">
                      <span>Score: <strong className="text-white">{app.risk_score}</strong></span>
                      <span>{new Date(app.created_at).toLocaleTimeString()}</span>
                    </div>

                    {/* Progress Bar for Pending */}
                    {app.status === 'pending' && (
                      <div className="w-full h-1 bg-[#282828] rounded-xs mt-2 overflow-hidden">
                        <div
                          className="h-full bg-[#F59E0B] transition-all duration-1000"
                          style={{ width: `${Math.min(100, (remaining / 120) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Ticket Inspector & Decision Desk (7 Cols) */}
        <div className="lg:col-span-7 bg-[#181818] border border-[#282828] rounded-sm overflow-hidden flex flex-col h-[650px]">
          {selectedApproval ? (
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* Header */}
              <div className="p-4 border-b border-[#282828] bg-[#141414] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      Action Verification Inspector
                    </h3>
                    <span className="text-xs font-mono text-[#737373]">[{selectedApproval.id}]</span>
                  </div>
                  <p className="text-[11px] text-[#A3A3A3] mt-0.5 font-sans">
                    Agent: <span className="text-white font-mono">{selectedApproval.agent_id}</span> · Session:{' '}
                    <span className="text-white font-mono">{selectedApproval.session_id}</span>
                  </p>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[10px] text-[#737373] uppercase">Risk Level</div>
                  <div className="text-xl font-bold text-[#F59E0B] tabular-nums">
                    {selectedApproval.risk_score} / 100
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 flex-1 font-mono text-xs">
                {/* Proposed Tool & Action */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#141414] border border-[#282828] rounded-xs">
                    <span className="text-[10px] text-[#737373] uppercase tracking-wider">Tool Provider</span>
                    <p className="text-xs font-bold text-white mt-0.5 uppercase">{selectedApproval.tool}</p>
                  </div>
                  <div className="p-3 bg-[#141414] border border-[#282828] rounded-xs">
                    <span className="text-[10px] text-[#737373] uppercase tracking-wider">Action Verb</span>
                    <p className="text-xs font-bold text-white mt-0.5 uppercase">{selectedApproval.action}</p>
                  </div>
                </div>

                {/* Command or Target */}
                <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white uppercase tracking-wide">
                      Proposed Command / Target Payload
                    </span>
                    <span className="text-[10px] text-[#A3A3A3]">PRIVACY SHIELD REDACTED</span>
                  </div>
                  <pre className="text-xs text-[#D4D4D4] bg-[#0E0E0E] p-3 rounded-xs border border-[#242424] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {selectedApproval.redacted?.command ||
                      selectedApproval.redacted?.target ||
                      selectedApproval.redacted?.payload ||
                      'No text payload provided'}
                  </pre>
                </div>

                {/* Risk Reasons */}
                <div className="p-3.5 bg-[#141414] border border-[#282828] rounded-xs space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wide">
                    Policy Trigger Rationale
                  </span>
                  {selectedApproval.reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#D4D4D4]">
                      <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-bold bg-[#2C2115] text-[#F59E0B] border border-[#F59E0B]/30 uppercase shrink-0">
                        {r.rule_id}
                      </span>
                      <span className="text-xs font-sans text-[#A3A3A3]">{r.message}</span>
                    </div>
                  ))}
                </div>

                {/* Execution Token Banner if Approved */}
                {selectedApproval.execution_token && (
                  <div className="p-3.5 bg-[#1C281F] border border-[#86EFAC]/30 rounded-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#86EFAC] uppercase">
                        <Key className="w-3.5 h-3.5" />
                        <span>HMAC Execution Token (Valid 60s)</span>
                      </div>
                      <button
                        onClick={() => handleCopy(selectedApproval.execution_token!)}
                        className="text-xs text-[#86EFAC] hover:text-white flex items-center gap-1 cursor-pointer font-bold"
                      >
                        {copiedToken === selectedApproval.execution_token ? (
                          <>
                            <Check className="w-3 h-3 text-[#86EFAC]" />
                            <span>COPIED</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>COPY TOKEN</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#86EFAC] break-all bg-[#0E0E0E] p-2 rounded-xs border border-[#86EFAC]/20">
                      {selectedApproval.execution_token}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Decision Footer */}
              {selectedApproval.status === 'pending' && (
                <div className="p-4 border-t border-[#282828] bg-[#141414] flex flex-col gap-3 font-mono">
                  {isDenying ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Operator reason for denial (recorded in audit ledger)..."
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[#1E1E1E] border border-[#EF4444]/50 rounded-xs text-white focus:outline-none focus:border-[#EF4444]"
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          onClick={() => setIsDenying(false)}
                          className="px-3 py-1.5 text-[#A3A3A3] hover:text-white cursor-pointer"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={async () => {
                            await onDecide(selectedApproval.id, 'deny', denyReason);
                            setIsDenying(false);
                            setDenyReason('');
                          }}
                          className="px-4 py-1.5 font-bold text-white bg-[#EF4444] hover:bg-[#DC2626] rounded-xs cursor-pointer uppercase tracking-tight"
                        >
                          CONFIRM BLOCK
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-xs text-[#A3A3A3] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>
                          TIMEOUT IN{' '}
                          <strong className="text-white">
                            {getRemainingSeconds(selectedApproval.expires_at)}S
                          </strong>{' '}
                          (FAILS CLOSED)
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setIsDenying(true)}
                          className="px-4 py-2 text-xs font-bold text-[#EF4444] bg-[#2B1717] border border-[#EF4444]/40 rounded-xs hover:bg-[#381B1B] cursor-pointer transition-colors uppercase tracking-tight"
                        >
                          DENY (BLOCK)
                        </button>
                        <button
                          onClick={() => onDecide(selectedApproval.id, 'approve')}
                          className="px-5 py-2 text-xs font-bold text-black bg-[#86EFAC] hover:bg-[#6EE7B7] cursor-pointer transition-colors rounded-xs uppercase tracking-tight"
                        >
                          APPROVE & ISSUE TOKEN
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#737373]">
              <UserCheck className="w-8 h-8 text-[#525252] mb-2" />
              <p className="text-sm font-bold text-white uppercase font-mono">No Ticket Selected</p>
              <p className="text-xs text-[#A3A3A3] mt-1 max-w-sm font-sans">
                Select an approval ticket from the left column to inspect parameters and issue signed human authorization.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
