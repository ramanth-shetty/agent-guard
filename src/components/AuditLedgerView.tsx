import React, { useState } from 'react';
import { AuditRecord, Verdict } from '../shared/types.js';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  RefreshCw,
  Lock,
} from 'lucide-react';

interface AuditLedgerViewProps {
  auditRecords: AuditRecord[];
  onVerifyChain: () => Promise<any>;
  onRefresh: () => void;
  onSelectAction: (record: AuditRecord) => void;
}

export const AuditLedgerView: React.FC<AuditLedgerViewProps> = ({
  auditRecords,
  onVerifyChain,
  onRefresh,
  onSelectAction,
}) => {
  const [filterVerdict, setFilterVerdict] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    records_checked: number;
    first_broken_record?: any;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await onVerifyChain();
      setVerificationResult(res);
    } catch (e: any) {
      setVerificationResult({ valid: false, records_checked: 0 });
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredRecords = auditRecords.filter((record) => {
    if (filterVerdict !== 'ALL' && record.verdict !== filterVerdict) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCmd = record.command_redacted?.toLowerCase().includes(q);
      const matchTarget = record.target?.toLowerCase().includes(q);
      const matchAgent = record.agent_id.toLowerCase().includes(q);
      const matchHash = record.record_hash.toLowerCase().includes(q);
      return matchCmd || matchTarget || matchAgent || matchHash;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hash-Chain Verification Banner */}
      <div className="bg-[#181818] p-5 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#282828]">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Cryptographic Hash-Chain Ledger
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-[#242424] text-[#A3A3A3] border border-[#333333] font-bold uppercase">
              SHA-256 SEQUENTIAL CHAIN
            </span>
          </div>
          <p className="text-xs text-[#A3A3A3] mt-1 max-w-2xl leading-relaxed font-sans">
            Every decision is cryptographically chained in sequence:{' '}
            <code className="text-white font-mono text-[11px]">
              record_hash = SHA-256(prev_hash + canonical fields)
            </code>
            . Any alteration or deletion of past entries breaks the cryptographic integrity.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="px-4 py-2 text-xs font-mono font-semibold text-black bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 cursor-pointer transition-colors flex items-center gap-2 rounded-xs uppercase tracking-tight"
          >
            {isVerifying ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span>Verify Chain Integrity</span>
          </button>
        </div>
      </div>

      {/* Verification Result Toast if available */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xs border flex items-center justify-between text-xs font-mono ${
            verificationResult.valid
              ? 'bg-[#1C281F] border-[#86EFAC]/30 text-[#86EFAC]'
              : 'bg-[#2B1717] border-[#EF4444]/30 text-[#EF4444]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {verificationResult.valid ? (
              <CheckCircle2 className="w-4 h-4 text-[#86EFAC] shrink-0 stroke-[2.5]" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 stroke-[2.5]" />
            )}
            <div>
              <span className="font-bold uppercase tracking-wider">
                {verificationResult.valid
                  ? 'Cryptographic Chain Integrity Validated'
                  : 'Hash Chain Discrepancy Detected'}
              </span>
              <p className="text-[11px] text-[#A3A3A3] mt-0.5 font-sans">
                Successfully verified {verificationResult.records_checked} sequential records from genesis to tip.
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold">
            STATUS: <strong className="text-white">INTACT</strong>
          </span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-[#181818] border border-[#282828] rounded-sm overflow-hidden">
        {/* Table Controls */}
        <div className="px-5 py-3.5 border-b border-[#282828] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414]">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Immutable Audit Trail ({filteredRecords.length} entries)
            </h3>
            <button
              onClick={onRefresh}
              className="p-1 text-[#737373] hover:text-white rounded-xs bg-[#1E1E1E] border border-[#2E2E2E] cursor-pointer transition-colors"
              title="Refresh Ledger"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
              <input
                type="text"
                placeholder="Search audit hashes, commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-[#1A1A1A] border border-[#2E2E2E] rounded-xs text-white placeholder-[#737373] focus:outline-none focus:border-[#F59E0B] w-64 font-mono"
              />
            </div>

            <div className="flex items-center p-0.5 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xs text-xs font-mono">
              {['ALL', 'ALLOW', 'ASK_HUMAN', 'BLOCK'].map((v) => (
                <button
                  key={v}
                  onClick={() => setFilterVerdict(v)}
                  className={`px-3 py-1 rounded-xs font-bold transition-colors cursor-pointer text-[10px] ${
                    filterVerdict === v
                      ? 'bg-[#282828] text-white'
                      : 'text-[#737373] hover:text-[#D4D4D4]'
                  }`}
                >
                  {v === 'ALL' ? 'ALL' : v.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#141414] text-[#737373] text-[10px] uppercase tracking-wider border-b border-[#282828]">
              <tr>
                <th className="py-2.5 px-4 whitespace-nowrap">Record Hash (SHA-256)</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Verdict</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Agent / Session</th>
                <th className="py-2.5 px-4">Tool, Action & Target Payload</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Risk</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Prev Hash</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242424]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#737373] font-sans text-xs">
                    No audit records match the current criteria
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => onSelectAction(r)}
                    className="hover:bg-[#1E1E1E] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-white font-medium">
                      {r.record_hash.slice(0, 16)}...
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-bold">
                      <span
                        className={
                          r.verdict === 'ALLOW'
                            ? 'text-[#86EFAC]'
                            : r.verdict === 'ASK_HUMAN'
                            ? 'text-[#F59E0B]'
                            : 'text-[#EF4444]'
                        }
                      >
                        {r.verdict}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-white">{r.agent_id}</div>
                      <div className="text-[10px] text-[#737373]">{r.session_id}</div>
                    </td>

                    <td className="py-3 px-4 max-w-sm">
                      <div className="text-[#D4D4D4] truncate group-hover:text-white transition-colors">
                        <span className="uppercase text-[#A3A3A3] font-semibold">{r.tool}·{r.action}:</span>{' '}
                        {r.command_redacted || r.target || r.payload_redacted || 'None'}
                      </div>
                      <div className="text-[11px] text-[#737373] truncate mt-0.5 font-sans">
                        {r.reasons[0]?.message}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap tabular-nums text-white">
                      {r.risk_score}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-[11px] text-[#737373]">
                      {r.prev_hash.slice(0, 12)}...
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-[11px] text-[#737373]">
                      {new Date(r.ts).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
