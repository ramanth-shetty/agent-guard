/**
 * AgentGuard Audit Store & Hash-Chained Ledger
 * Implements tamper-evident cryptographic hash chaining: record_hash = SHA256(prev_hash + canonical fields)
 */

import crypto from 'node:crypto';
import {
  ActionType,
  AuditRecord,
  EngineDetails,
  RuleReason,
  SensitiveEntity,
  SystemMetrics,
  ToolType,
  Verdict,
} from '../../shared/types.js';
import { computeRecordHash } from '../engine/crypto.js';
import { broadcastEvent, listApprovals } from './approvalStore.js';

const GENESIS_HASH = '0'.repeat(64);

// In-memory append-only audit trail
const auditLedger: AuditRecord[] = [];

/**
 * Appends a new evaluation result to the audit ledger
 */
export function recordAudit(entry: {
  request_id: string;
  agent_id: string;
  session_id: string;
  tool: ToolType;
  action: ActionType;
  command_redacted?: string;
  target?: string;
  payload_redacted?: string;
  action_hash: string;
  verdict: Verdict;
  risk_score: number;
  risk_categories: any[];
  reasons: RuleReason[];
  sensitive_entities: SensitiveEntity[];
  engine: EngineDetails;
  latency_ms: number;
  policy_version: number;
}): AuditRecord {
  const id = `aud_${crypto.randomBytes(8).toString('hex')}`;
  const ts = new Date().toISOString();

  // Get previous hash or genesis
  const prev_hash = auditLedger.length > 0 ? auditLedger[auditLedger.length - 1].record_hash : GENESIS_HASH;

  const partialRecord = {
    id,
    request_id: entry.request_id,
    ts,
    agent_id: entry.agent_id,
    session_id: entry.session_id,
    tool: entry.tool,
    action: entry.action,
    action_hash: entry.action_hash,
    verdict: entry.verdict,
    risk_score: entry.risk_score,
    policy_version: entry.policy_version,
  };

  const record_hash = computeRecordHash(prev_hash, partialRecord);

  const fullRecord: AuditRecord = {
    ...entry,
    id,
    ts,
    prev_hash,
    record_hash,
  };

  auditLedger.push(fullRecord);

  // Broadcast real-time update
  broadcastEvent('action.evaluated', {
    id: fullRecord.id,
    verdict: fullRecord.verdict,
    tool: fullRecord.tool,
    action: fullRecord.action,
    risk_score: fullRecord.risk_score,
    latency_ms: fullRecord.latency_ms,
    ts: fullRecord.ts,
  });

  return fullRecord;
}

/**
 * Filter audit records
 */
export function queryAudit(params: {
  verdict?: Verdict;
  agent_id?: string;
  session_id?: string;
  limit?: number;
}): AuditRecord[] {
  let list = [...auditLedger];

  if (params.verdict) {
    list = list.filter((r) => r.verdict === params.verdict);
  }
  if (params.agent_id) {
    list = list.filter((r) => r.agent_id === params.agent_id);
  }
  if (params.session_id) {
    list = list.filter((r) => r.session_id === params.session_id);
  }

  // Descending order (newest first)
  list.reverse();

  if (params.limit && params.limit > 0) {
    list = list.slice(0, params.limit);
  }

  return list;
}

/**
 * Cryptographically verifies hash chain integrity
 */
export function verifyHashChain(): {
  valid: boolean;
  records_checked: number;
  first_broken_record?: {
    index: number;
    id: string;
    expected_hash: string;
    actual_hash: string;
  };
} {
  let prevHash = GENESIS_HASH;

  for (let i = 0; i < auditLedger.length; i++) {
    const record = auditLedger[i];

    // Check if recorded prev_hash matches prior block
    if (record.prev_hash !== prevHash) {
      return {
        valid: false,
        records_checked: i,
        first_broken_record: {
          index: i,
          id: record.id,
          expected_hash: prevHash,
          actual_hash: record.prev_hash,
        },
      };
    }

    const computed = computeRecordHash(prevHash, {
      id: record.id,
      request_id: record.request_id,
      ts: record.ts,
      agent_id: record.agent_id,
      session_id: record.session_id,
      tool: record.tool,
      action: record.action,
      action_hash: record.action_hash,
      verdict: record.verdict,
      risk_score: record.risk_score,
      policy_version: record.policy_version,
    });

    if (computed !== record.record_hash) {
      return {
        valid: false,
        records_checked: i,
        first_broken_record: {
          index: i,
          id: record.id,
          expected_hash: computed,
          actual_hash: record.record_hash,
        },
      };
    }

    prevHash = record.record_hash;
  }

  return {
    valid: true,
    records_checked: auditLedger.length,
  };
}

/**
 * Calculates live system metrics
 */
export function getSystemMetrics(): SystemMetrics {
  const total = auditLedger.length;
  const verdicts = {
    ALLOW: 0,
    ASK_HUMAN: 0,
    BLOCK: 0,
  };

  let redactionsCount = 0;
  const fastLatencies: number[] = [];

  for (const record of auditLedger) {
    verdicts[record.verdict] = (verdicts[record.verdict] || 0) + 1;
    redactionsCount += record.sensitive_entities.length;
    if (record.engine.fast && !record.engine.llm) {
      fastLatencies.push(record.latency_ms);
    }
  }

  // Calculate p50 and p95 latency
  fastLatencies.sort((a, b) => a - b);
  const p50 = fastLatencies.length > 0 ? fastLatencies[Math.floor(fastLatencies.length * 0.5)] : 0;
  const p95 = fastLatencies.length > 0 ? fastLatencies[Math.floor(fastLatencies.length * 0.95)] : 0;

  const autoAllowRate = total > 0 ? Math.round((verdicts.ALLOW / total) * 100) : 0;

  const allApprovals = listApprovals();
  const approvalsStats = {
    pending: 0,
    approved: 0,
    denied: 0,
    expired: 0,
  };

  for (const app of allApprovals) {
    approvalsStats[app.status] = (approvalsStats[app.status] || 0) + 1;
  }

  return {
    total_actions: total,
    verdicts,
    auto_allow_rate: autoAllowRate,
    p50_latency_ms: p50,
    p95_latency_ms: p95,
    redactions_count: redactionsCount,
    approvals: approvalsStats,
  };
}
