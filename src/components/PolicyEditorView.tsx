import React, { useState, useEffect } from 'react';
import { PolicyConfig } from '../shared/types.js';
import {
  FileCode,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Check,
  Sliders,
} from 'lucide-react';

interface PolicyEditorViewProps {
  policyYaml: string;
  policy: PolicyConfig | null;
  onSavePolicy: (yamlStr: string) => Promise<{ success: boolean; version?: number; error?: string }>;
  onValidatePolicy: (yamlStr: string) => Promise<{ valid: boolean; error?: string }>;
  onResetPolicy: () => Promise<void>;
}

export const PolicyEditorView: React.FC<PolicyEditorViewProps> = ({
  policyYaml,
  policy,
  onSavePolicy,
  onValidatePolicy,
  onResetPolicy,
}) => {
  const [editorContent, setEditorContent] = useState(policyYaml);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    setEditorContent(policyYaml);
  }, [policyYaml]);

  const handleValidate = async () => {
    setIsValidating(true);
    setStatusMessage(null);
    try {
      const res = await onValidatePolicy(editorContent);
      if (res.valid) {
        setStatusMessage({ type: 'success', text: 'Policy schema validated successfully. Ready to activate.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Validation error' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await onSavePolicy(editorContent);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Policy successfully updated and activated as Version ${res.version}! All new evaluations will use this policy.`,
        });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to update policy' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-[#181818] p-5 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#282828]">
        <div>
          <div className="flex items-center gap-2 font-mono">
            <Sliders className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Declarative Security Policy Rulebook
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-xs bg-[#242424] text-[#A3A3A3] border border-[#333333] font-bold uppercase">
              ACTIVE VERSION: v{policy?.version || 3}
            </span>
          </div>
          <p className="text-xs text-[#A3A3A3] mt-1 max-w-2xl leading-relaxed font-sans">
            Configure risk score threshold bands, approval timeout semantics, command allowlists, hard-block regular expressions, and privacy mask rules.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <button
            onClick={onResetPolicy}
            className="px-3 py-1.5 text-[#A3A3A3] hover:text-white bg-[#222222] border border-[#333333] rounded-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>

          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="px-3 py-1.5 text-[#D4D4D4] hover:text-white bg-[#222222] border border-[#333333] rounded-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Check className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>VALIDATE</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 font-semibold text-black bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition-colors rounded-xs uppercase tracking-tight"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'ACTIVATING...' : 'SAVE & ACTIVATE'}</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xs border flex items-center gap-2.5 text-xs font-mono ${
            statusMessage.type === 'success'
              ? 'bg-[#1C281F] border-[#86EFAC]/30 text-[#86EFAC]'
              : 'bg-[#2B1717] border-[#EF4444]/30 text-[#EF4444]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#86EFAC] shrink-0 stroke-[2.5]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 stroke-[2.5]" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Editor & Reference Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Editor Area (7 Cols) */}
        <div className="lg:col-span-7 bg-[#181818] border border-[#282828] rounded-sm overflow-hidden flex flex-col h-[600px]">
          <div className="px-4 py-3 border-b border-[#282828] bg-[#141414] flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">policy.yaml</span>
            </div>
            <span className="text-[10px] text-[#737373]">YAML / JSON SUPPORTED</span>
          </div>

          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            className="w-full flex-1 p-4 bg-[#141414] text-white font-mono text-xs focus:outline-none resize-none leading-relaxed selection:bg-[#F59E0B]/20"
            spellCheck={false}
          />
        </div>

        {/* Live Schema & Rules Reference (5 Cols) */}
        <div className="lg:col-span-5 bg-[#181818] border border-[#282828] rounded-sm p-5 overflow-y-auto h-[600px] space-y-4 text-xs font-mono">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Rule Reference & Guardrails</h4>

          <div className="space-y-3 font-sans">
            <div className="p-3 bg-[#141414] border border-[#282828] rounded-xs">
              <span className="text-white font-mono font-bold block mb-1">thresholds:</span>
              <p className="text-[#A3A3A3] text-[11px] leading-relaxed">
                <code className="text-white font-mono font-bold">allow_below: 30</code> → Scores &lt;30 run automatically.<br />
                <code className="text-white font-mono font-bold">block_from: 70</code> → Scores &ge;70 are strictly blocked. Intermediate scores (30–69) require human approval.
              </p>
            </div>

            <div className="p-3 bg-[#141414] border border-[#282828] rounded-xs">
              <span className="text-white font-mono font-bold block mb-1">approval:</span>
              <p className="text-[#A3A3A3] text-[11px] leading-relaxed">
                <code className="text-white font-mono font-bold">timeout_seconds: 120</code> → Countdown window.<br />
                <code className="text-[#EF4444] font-mono font-bold">on_timeout: BLOCK</code> → Fail-closed security contract.
              </p>
            </div>

            <div className="p-3 bg-[#141414] border border-[#282828] rounded-xs">
              <span className="text-white font-mono font-bold block mb-1">hard_block:</span>
              <p className="text-[#A3A3A3] text-[11px] leading-relaxed">
                Immediate hard block rules that override numerical risk scores (e.g. <code>rm -rf /</code>, <code>mkfs</code>, <code>DROP TABLE</code>, reading <code>/etc/shadow</code>).
              </p>
            </div>

            <div className="p-3 bg-[#141414] border border-[#282828] rounded-xs">
              <span className="text-white font-mono font-bold block mb-1">privacy:</span>
              <p className="text-[#A3A3A3] text-[11px] leading-relaxed">
                <code className="text-white font-mono font-bold">mask</code>: Low-risk PII masked with typed placeholders.<br />
                <code className="text-white font-mono font-bold">block</code>: High-risk secrets (API_KEY, PRIVATE_KEY, CREDIT_CARD, AADHAAR) blocked if sent externally.
              </p>
            </div>

            <div className="p-3 bg-[#141414] border border-[#282828] rounded-xs">
              <span className="text-white font-mono font-bold block mb-1">llm:</span>
              <p className="text-[#A3A3A3] text-[11px] leading-relaxed">
                Enables Gemini contextual security evaluation for ambiguous prompts or obfuscated commands. Can only escalate risk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
