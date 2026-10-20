/**
 * AgentGuard - Permission & Policy API for AI Agents
 * DevHack 2026 PS 2.1
 * Design System: Deep Monochromatic (Premium Dark #121212)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ActionType,
  ApprovalRecord,
  AuditRecord,
  EvaluationMode,
  PolicyConfig,
  SimulationReport,
  SystemMetrics,
  ToolType,
} from './shared/types.js';
import { Navbar } from './components/Navbar.js';
import { LiveMonitorView } from './components/LiveMonitorView.js';
import { ApprovalQueueView } from './components/ApprovalQueueView.js';
import { SimulatorView } from './components/SimulatorView.js';
import { AuditLedgerView } from './components/AuditLedgerView.js';
import { PolicyEditorView } from './components/PolicyEditorView.js';
import { ApiDocsView } from './components/ApiDocsView.js';
import { ActionDetailModal } from './components/ActionDetailModal.js';
import { ArrowUp, Shield } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('monitor');
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [policy, setPolicy] = useState<PolicyConfig | null>(null);
  const [policyYaml, setPolicyYaml] = useState<string>('');
  const [simulationReport, setSimulationReport] = useState<SimulationReport | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const [systemTime, setSystemTime] = useState<string>(new Date().toISOString());

  // Clock
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setSystemTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/v1/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error('Failed to fetch metrics:', e);
    }
  }, []);

  // Fetch approvals
  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch('/v1/approvals');
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch (e) {
      console.error('Failed to fetch approvals:', e);
    }
  }, []);

  // Fetch audit records
  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch('/v1/audit?limit=100');
      if (res.ok) {
        const data = await res.json();
        setAuditRecords(data.records || []);
      }
    } catch (e) {
      console.error('Failed to fetch audit records:', e);
    }
  }, []);

  // Fetch active policy
  const fetchPolicy = useCallback(async () => {
    try {
      const res = await fetch('/v1/policies/active');
      if (res.ok) {
        const data = await res.json();
        setPolicy(data.policy);
        setPolicyYaml(data.yaml);
      }
    } catch (e) {
      console.error('Failed to fetch policy:', e);
    }
  }, []);

  // Run 15-Scenario Simulation Suite
  const handleRunSimulation = useCallback(async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/v1/simulate', { method: 'POST' });
      if (res.ok) {
        const data: SimulationReport = await res.json();
        setSimulationReport(data);
        await Promise.all([fetchMetrics(), fetchApprovals(), fetchAudit()]);
      }
    } catch (e) {
      console.error('Simulation failed:', e);
    } finally {
      setIsSimulating(false);
    }
  }, [fetchMetrics, fetchApprovals, fetchAudit]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchMetrics(), fetchApprovals(), fetchAudit(), fetchPolicy()]);
      handleRunSimulation();
    };
    init();
  }, []);

  // SSE real-time stream
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/v1/events');
      es.addEventListener('action.evaluated', () => {
        fetchMetrics();
        fetchAudit();
      });
      es.addEventListener('approval.requested', () => {
        fetchApprovals();
        fetchMetrics();
      });
      es.addEventListener('approval.decided', () => {
        fetchApprovals();
        fetchMetrics();
      });
      es.addEventListener('approval.expired', () => {
        fetchApprovals();
        fetchMetrics();
        fetchAudit();
      });
    } catch (err) {
      console.warn('SSE subscription failed, falling back to polling:', err);
    }

    const interval = setInterval(() => {
      fetchMetrics();
      fetchApprovals();
    }, 4000);

    return () => {
      es?.close();
      clearInterval(interval);
    };
  }, [fetchMetrics, fetchApprovals, fetchAudit]);

  // Handle human approval decision
  const handleDecideApproval = async (id: string, decision: 'approve' | 'deny', reason?: string) => {
    try {
      const res = await fetch(`/v1/approvals/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason, decided_by: 'operator_ui' }),
      });
      if (res.ok) {
        await Promise.all([fetchApprovals(), fetchMetrics(), fetchAudit()]);
      }
    } catch (e) {
      console.error('Decision submission error:', e);
    }
  };

  // Handle custom evaluation in simulator
  const handleEvaluateCustom = async (payload: {
    tool: ToolType;
    action: ActionType;
    command?: string;
    target?: string;
    payload?: string;
    mode: EvaluationMode;
  }) => {
    const res = await fetch('/v1/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: 'custom_simulator_agent',
        session_id: `sim_${Date.now()}`,
        ...payload,
      }),
    });
    const data = await res.json();
    await Promise.all([fetchMetrics(), fetchApprovals(), fetchAudit()]);
    return data;
  };

  // Verify Hash Chain
  const handleVerifyChain = async () => {
    const res = await fetch('/v1/audit/verify');
    return res.json();
  };

  // Save Policy
  const handleSavePolicy = async (yamlStr: string) => {
    const res = await fetch('/v1/policies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml: yamlStr }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchPolicy();
    }
    return data;
  };

  // Validate Policy
  const handleValidatePolicy = async (yamlStr: string) => {
    const res = await fetch('/v1/policies/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml: yamlStr }),
    });
    return res.json();
  };

  // Reset Policy
  const handleResetPolicy = async () => {
    const res = await fetch('/v1/policies/reset', { method: 'POST' });
    if (res.ok) {
      await fetchPolicy();
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#121212] text-[#A3A3A3] flex flex-col font-sans selection:bg-[#F59E0B]/20 selection:text-[#F59E0B]">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={pendingApprovalsCount}
        onRunSimulation={handleRunSimulation}
        isSimulating={isSimulating}
      />

      {/* Main Viewport Container with ample padding to guarantee no cut-off */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 pb-28">
        {activeTab === 'monitor' && (
          <LiveMonitorView
            metrics={metrics}
            auditRecords={auditRecords}
            onOpenApproval={() => setActiveTab('approvals')}
            onSelectAction={(rec) => setSelectedRecord(rec)}
          />
        )}

        {activeTab === 'approvals' && (
          <ApprovalQueueView
            approvals={approvals}
            onDecide={handleDecideApproval}
            onRefresh={fetchApprovals}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorView
            simulationReport={simulationReport}
            onRunSimulation={handleRunSimulation}
            isSimulating={isSimulating}
            onEvaluateCustom={handleEvaluateCustom}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLedgerView
            auditRecords={auditRecords}
            onVerifyChain={handleVerifyChain}
            onRefresh={fetchAudit}
            onSelectAction={(rec) => setSelectedRecord(rec)}
          />
        )}

        {activeTab === 'policy' && (
          <PolicyEditorView
            policyYaml={policyYaml}
            policy={policy}
            onSavePolicy={handleSavePolicy}
            onValidatePolicy={handleValidatePolicy}
            onResetPolicy={handleResetPolicy}
          />
        )}

        {activeTab === 'api-docs' && <ApiDocsView />}
      </main>

      {/* Project-Level Minimalist Deep Monochromatic Footer */}
      <footer className="mt-auto border-t border-[#282828] bg-[#181818] py-8 px-6 text-xs text-[#737373] z-20">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Row: System Identity & Status Indicators */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-[#242424]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-[#222222] border border-[#333333] flex items-center justify-center text-[#F59E0B]">
                <Shield className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <span className="font-display font-bold text-white text-sm tracking-tight flex items-center gap-2">
                  <span>AgentGuard</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-[#222222] text-[#A3A3A3] border border-[#333333] rounded-xs font-medium">
                    STATUS: ARMED
                  </span>
                </span>
                <p className="text-[12px] text-[#A3A3A3] mt-0.5">
                  Autonomous AI Agent Permission & Policy Enforcement Layer
                </p>
              </div>
            </div>

            {/* Solid Status Badges */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 bg-[#222222] border border-[#333333] text-[#86EFAC] rounded-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#86EFAC]" />
                <span>p95 LATENCY &lt; 100MS</span>
              </span>
              <span className="px-2.5 py-1 bg-[#222222] border border-[#333333] text-[#D4D4D4] rounded-xs">
                SHA-256 LEDGER VERIFIED
              </span>
              <span className="px-2.5 py-1 bg-[#222222] border border-[#F59E0B]/40 text-[#F59E0B] rounded-xs">
                FAIL-CLOSED POLICY
              </span>
            </div>
          </div>

          {/* Bottom Row: Official Copyright, System Time, and Navigation Jump */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px]">
            <div className="text-center sm:text-left text-[#A3A3A3]">
              <span className="text-white font-medium">
                © {new Date().getFullYear()} AgentGuard. All rights reserved.
              </span>
              <span className="mx-2 text-[#333333]">·</span>
              <span>DevHack 2026 Problem Statement PS 2.1 Final Submission</span>
              <span className="mx-2 text-[#333333]">·</span>
              <span className="text-[#A3A3A3]">Deterministic AST Core</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[#737373] text-[11px] font-mono hidden md:inline">
                SYS_UTC: {systemTime}
              </span>
              <button
                onClick={scrollToTop}
                className="px-3 py-1.5 bg-[#222222] hover:bg-[#2A2A2A] border border-[#333333] hover:border-[#444444] text-[#A3A3A3] hover:text-white rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                title="Scroll back to top"
              >
                <span>Top</span>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Action Forensic Details Modal */}
      <ActionDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}
