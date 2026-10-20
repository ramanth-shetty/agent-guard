import React, { useState } from 'react';
import {
  AuditRecord,
  SystemMetrics,
  Verdict,
} from '../shared/types.js';
import {
  ShieldCheck,
  Zap,
  Lock,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Cpu,
  UserCheck,
} from 'lucide-react';

interface LiveMonitorViewProps {
  metrics: SystemMetrics | null;
  auditRecords: AuditRecord[];
  onOpenApproval: (id: string) => void;
  onSelectAction: (record: AuditRecord) => void;
}

export const LiveMonitorView: React.FC<LiveMonitorViewProps> = ({
  metrics,
  auditRecords,
  onOpenApproval,
  onSelectAction,
}) => {
  const [filterVerdict, setFilterVerdict] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = auditRecords.filter((record) => {
    if (filterVerdict !== 'ALL' && record.verdict !== filterVerdict) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCmd = record.command_redacted?.toLowerCase().includes(q);
      const matchTarget = record.target?.toLowerCase().includes(q);
      const matchAgent = record.agent_id.toLowerCase().includes(q);
      const matchReason = record.reasons.some((r) => r.message.toLowerCase().includes(q));
      return matchCmd || matchTarget || matchAgent || matchReason;
    }
    return true;
  });

  const getVerdictBadge = (verdict: Verdict) => {
    switch (verdict) {
      case 'ALLOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[11px] font-mono font-bold bg-[#1C281F] text-[#86EFAC] border border-[#86EFAC]/30">
            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
            <span>ALLOW</span>
          </span>
        );
      case 'ASK_HUMAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[11px] font-mono font-bold bg-[#2C2115] text-[#F59E0B] border border-[#F59E0B]/30">
            <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
            <span>ASK HUMAN</span>
          </span>
        );
      case 'BLOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-[11px] font-mono font-bold bg-[#2B1717] text-[#EF4444] border border-[#EF4444]/30">
            <XCircle className="w-3 h-3 stroke-[2.5]" />
            <span>BLOCK</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Latency Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#282828]">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Security Telemetry & Interception Console
          </h1>
          <p className="text-xs text-[#A3A3A3] mt-1 font-sans">
            Real-time enforcement layer between autonomous agent tool executors and protected boundaries
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-[#A3A3A3]">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#181818] border border-[#282828] rounded-xs">
            <Activity className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="text-white font-medium">LATENCY TARGET: &lt;100MS</span>
          </div>
        </div>
      </div>

      {/* KPI Metric Strip with Solid Flat Surfaces */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-[#181818] border border-[#282828] p-4 rounded-sm">
          <div className="flex items-center justify-between text-[#737373] mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3A3A3]">Total Intercepted</span>
            <Zap className="w-3.5 h-3.5 text-[#A3A3A3]" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-white">
            {metrics?.total_actions || 0}
          </div>
          <div className="text-[11px] text-[#737373] mt-1.5 flex items-center gap-1.5 font-sans">
            <span className="text-[#A3A3A3]">100% routed</span>
            <span>·</span>
            <span>Zero bypass</span>
          </div>
        </div>

        <div className="bg-[#181818] border border-[#282828] p-4 rounded-sm">
          <div className="flex items-center justify-between text-[#737373] mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3A3A3]">Safe Allow Rate</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#86EFAC]" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-[#86EFAC]">
            {metrics?.auto_allow_rate || 0}%
          </div>
          <div className="text-[11px] text-[#737373] mt-1.5 flex items-center gap-1.5 font-sans">
            <span>{metrics?.verdicts.ALLOW || 0} in-scope actions</span>
            <span>·</span>
            <span>Automated</span>
          </div>
        </div>

        <div className="bg-[#181818] border border-[#282828] p-4 rounded-sm">
          <div className="flex items-center justify-between text-[#737373] mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3A3A3]">p95 Fast Latency</span>
            <Cpu className="w-3.5 h-3.5 text-[#F59E0B]" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-white">
            {metrics?.p95_latency_ms || 0} <span className="text-sm font-normal text-[#737373]">ms</span>
          </div>
          <div className="text-[11px] text-[#737373] mt-1.5 flex items-center gap-1.5 font-sans">
            <span className="text-[#86EFAC]">Fast AST parser</span>
            <span>·</span>
            <span>Under budget</span>
          </div>
        </div>

        <div className="bg-[#181818] border border-[#282828] p-4 rounded-sm">
          <div className="flex items-center justify-between text-[#737373] mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3A3A3]">Redacted Secrets</span>
            <Lock className="w-3.5 h-3.5 text-[#D4D4D4]" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-white">
            {metrics?.redactions_count || 0}
          </div>
          <div className="text-[11px] text-[#737373] mt-1.5 flex items-center gap-1.5 font-sans">
            <span>Luhn & Verhoeff</span>
            <span>·</span>
            <span className="text-[#A3A3A3]">Masked</span>
          </div>
        </div>

        <div className="bg-[#181818] border border-[#282828] p-4 rounded-sm">
          <div className="flex items-center justify-between text-[#737373] mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3A3A3]">Pending Operator</span>
            <UserCheck className="w-3.5 h-3.5 text-[#F59E0B]" />
          </div>
          <div className="text-3xl font-bold font-mono tabular-nums text-[#F59E0B]">
            {metrics?.approvals.pending || 0}
          </div>
          <div className="text-[11px] text-[#737373] mt-1.5 flex items-center gap-1.5 font-sans">
            <span>{metrics?.approvals.approved || 0} approved</span>
            <span>·</span>
            <span>{metrics?.approvals.expired || 0} timed out</span>
          </div>
        </div>
      </div>

      {/* Live Stream Panel */}
      <div className="bg-[#181818] border border-[#282828] rounded-sm overflow-hidden">
        {/* Stream Header & Controls */}
        <div className="px-5 py-3.5 border-b border-[#282828] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414]">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#86EFAC]" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <span>Live Interception Feed</span>
              <span className="text-xs text-[#737373] font-normal">({filteredRecords.length} records)</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
              <input
                type="text"
                placeholder="Search commands, targets, rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-[#1A1A1A] border border-[#2E2E2E] rounded-xs text-white placeholder-[#737373] focus:outline-none focus:border-[#F59E0B] w-64 transition-colors font-mono"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-0.5 bg-[#1A1A1A] border border-[#2E2E2E] rounded-xs">
              {['ALL', 'ALLOW', 'ASK_HUMAN', 'BLOCK'].map((v) => (
                <button
                  key={v}
                  onClick={() => setFilterVerdict(v)}
                  className={`px-3 py-1 text-xs font-mono font-medium rounded-xs transition-colors whitespace-nowrap cursor-pointer ${
                    filterVerdict === v
                      ? 'bg-[#282828] text-white font-bold'
                      : 'text-[#A3A3A3] hover:text-white'
                  }`}
                >
                  {v === 'ALL' ? 'ALL' : v.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#141414] text-[#737373] text-[11px] uppercase tracking-wider border-b border-[#282828]">
              <tr>
                <th className="py-2.5 px-4 whitespace-nowrap">Verdict</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Tool & Action</th>
                <th className="py-2.5 px-4">Evaluated Command / Resource</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Risk Score</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Engine & Latency</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242424] font-sans">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-[#737373] font-mono">
                    <p className="text-sm font-semibold text-white">No actions captured in ledger</p>
                    <p className="text-xs text-[#A3A3A3] mt-1">
                      Execute the 15-benchmark suite or invoke tools in the Simulator to inspect actions.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const displayContent =
                    record.command_redacted || record.target || record.payload_redacted || 'No payload';
                  const topReason = record.reasons[0]?.message || 'Evaluated normally';

                  return (
                    <tr
                      key={record.id}
                      onClick={() => onSelectAction(record)}
                      className="hover:bg-[#1E1E1E] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getVerdictBadge(record.verdict)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <div className="text-white uppercase font-bold text-[11px]">
                          {record.tool}
                        </div>
                        <div className="text-[10px] text-[#737373] uppercase">
                          {record.action}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-md font-mono">
                        <div className="text-[#D4D4D4] truncate group-hover:text-white transition-colors font-medium">
                          {displayContent}
                        </div>
                        <div className="text-[11px] text-[#737373] mt-0.5 truncate flex items-center gap-1.5 font-sans">
                          <span>{topReason}</span>
                          {record.sensitive_entities.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-[#F59E0B] font-mono font-medium">
                                [{record.sensitive_entities.length} secret(s) redacted]
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold tabular-nums text-xs ${
                              record.risk_score >= 70
                                ? 'text-[#EF4444]'
                                : record.risk_score >= 30
                                ? 'text-[#F59E0B]'
                                : 'text-[#86EFAC]'
                            }`}
                          >
                            {record.risk_score}
                          </span>
                          <div className="w-16 h-1.5 bg-[#242424] rounded-xs overflow-hidden">
                            <div
                              className={`h-full ${
                                record.risk_score >= 70
                                  ? 'bg-[#EF4444]'
                                  : record.risk_score >= 30
                                  ? 'bg-[#F59E0B]'
                                  : 'bg-[#86EFAC]'
                              }`}
                              style={{ width: `${record.risk_score}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <div className="text-white tabular-nums font-semibold flex items-center gap-1">
                          <span>{record.latency_ms} ms</span>
                        </div>
                        <div className="text-[10px] text-[#737373]">
                          {record.engine.llm ? 'Fast AST + Gemini Deep' : 'Fast Rules AST'}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-[#737373] font-mono text-[11px]">
                        {new Date(record.ts).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
