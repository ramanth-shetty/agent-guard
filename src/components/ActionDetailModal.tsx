import React from 'react';
import { AuditRecord } from '../shared/types.js';
import {
  X,
  Lock,
} from 'lucide-react';

interface ActionDetailModalProps {
  record: AuditRecord | null;
  onClose: () => void;
}

export const ActionDetailModal: React.FC<ActionDetailModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#181818] border border-[#282828] rounded-sm max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#282828] bg-[#141414] flex items-center justify-between">
          <div className="flex items-center gap-3 font-mono">
            <span
              className={`px-2.5 py-0.5 rounded-xs text-xs font-bold uppercase tracking-tight ${
                record.verdict === 'ALLOW'
                  ? 'bg-[#1C281F] text-[#86EFAC] border border-[#86EFAC]/30'
                  : record.verdict === 'ASK_HUMAN'
                  ? 'bg-[#2C2115] text-[#F59E0B] border border-[#F59E0B]/30'
                  : 'bg-[#2B1717] text-[#EF4444] border border-[#EF4444]/30'
              }`}
            >
              VERDICT: {record.verdict}
            </span>
            <span className="text-xs text-[#737373]">[{record.id}]</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xs text-[#737373] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          {/* Key metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 bg-[#141414] border border-[#282828] rounded-xs">
              <span className="text-[10px] text-[#737373] uppercase tracking-wider">Risk Score</span>
              <p className="text-sm font-bold text-white mt-0.5">
                {record.risk_score} / 100
              </p>
            </div>
            <div className="p-2.5 bg-[#141414] border border-[#282828] rounded-xs">
              <span className="text-[10px] text-[#737373] uppercase tracking-wider">Tool & Action</span>
              <p className="text-sm font-bold text-white mt-0.5 uppercase">
                {record.tool} · {record.action}
              </p>
            </div>
            <div className="p-2.5 bg-[#141414] border border-[#282828] rounded-xs">
              <span className="text-[10px] text-[#737373] uppercase tracking-wider">Latency</span>
              <p className="text-sm font-bold text-[#86EFAC] mt-0.5">
                {record.latency_ms} ms
              </p>
            </div>
            <div className="p-2.5 bg-[#141414] border border-[#282828] rounded-xs">
              <span className="text-[10px] text-[#737373] uppercase tracking-wider">Policy Version</span>
              <p className="text-sm font-bold text-white mt-0.5">
                v{record.policy_version}
              </p>
            </div>
          </div>

          {/* Action Payloads */}
          <div className="p-3 bg-[#141414] border border-[#282828] rounded-xs space-y-2">
            <span className="text-xs font-bold text-white block uppercase tracking-wide">
              Evaluated & Redacted Payload
            </span>
            <pre className="text-xs text-[#D4D4D4] bg-[#0E0E0E] p-3 rounded-xs border border-[#242424] overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {record.command_redacted || record.target || record.payload_redacted || 'No text payload'}
            </pre>
          </div>

          {/* Sensitive Entities Detected */}
          {record.sensitive_entities.length > 0 && (
            <div className="p-3 bg-[#1C1814] border border-[#F59E0B]/30 rounded-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#F59E0B] uppercase">
                <Lock className="w-3.5 h-3.5" />
                <span>Sensitive Entities Intercepted (Privacy Shield)</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {record.sensitive_entities.map((ent, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-xs text-[10px] bg-[#242424] text-[#D4D4D4] border border-[#333333]"
                  >
                    {ent.type} (field: {ent.field}, detector: {ent.detector}, score: {ent.score})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Policy Rationale & Rules */}
          <div className="p-3 bg-[#141414] border border-[#282828] rounded-xs space-y-2">
            <span className="text-xs font-bold text-white block uppercase tracking-wide">
              Triggered Rules & Rationale
            </span>
            {record.reasons.map((r, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[#D4D4D4]">
                <span className="px-1.5 py-0.2 rounded-xs font-bold text-[10px] bg-[#222222] text-[#A3A3A3] border border-[#333333] shrink-0">
                  {r.rule_id}
                </span>
                <span className="text-xs font-sans text-[#A3A3A3]">{r.message}</span>
              </div>
            ))}
          </div>

          {/* Cryptographic Hashes */}
          <div className="p-3 bg-[#141414] border border-[#282828] rounded-xs space-y-1.5 text-[11px]">
            <span className="text-xs font-bold text-white block mb-1 uppercase tracking-wide">
              Cryptographic Integrity Signatures
            </span>
            <div className="text-[#737373] truncate">
              Action Hash: <span className="text-white">{record.action_hash}</span>
            </div>
            <div className="text-[#737373] truncate">
              Record Hash: <span className="text-[#86EFAC]">{record.record_hash}</span>
            </div>
            <div className="text-[#737373] truncate">
              Prev Hash: <span className="text-[#525252]">{record.prev_hash}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#282828] bg-[#141414] flex justify-end font-mono">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#242424] hover:bg-[#303030] border border-[#333333] rounded-xs cursor-pointer transition-colors uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
