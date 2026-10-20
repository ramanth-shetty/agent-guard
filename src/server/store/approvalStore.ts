/**
 * AgentGuard Approval Store & Real-time Event Broadcaster
 * Handles pending approval workflows, countdown timers, and fail-closed expiration.
 */

import crypto from 'node:crypto';
import {
  ActionType,
  ApprovalRecord,
  RedactedFields,
  RiskCategory,
  RuleReason,
  ToolType,
} from '../../shared/types.js';
import { generateExecutionToken } from '../engine/crypto.js';
import { getActivePolicy } from '../engine/policyEngine.js';

// In-memory approvals map
const approvals = new Map<string, ApprovalRecord>();

// Event listeners for SSE & WebSockets
type EventListener = (event: { type: string; data: any }) => void;
const listeners = new Set<EventListener>();

export function subscribeEvents(listener: EventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function broadcastEvent(type: string, data: any) {
  for (const listener of listeners) {
    try {
      listener({ type, data });
    } catch (e) {
      // ignore dropped listener
    }
  }
}

/**
 * Creates a new pending approval record
 */
export function createApproval(params: {
  requestId: string;
  actionHash: string;
  agentId: string;
  sessionId: string;
  tool: ToolType;
  action: ActionType;
  command?: string;
  target?: string;
  payload?: string;
  redacted: RedactedFields;
  riskScore: number;
  riskCategories: RiskCategory[];
  reasons: RuleReason[];
}): ApprovalRecord {
  const policy = getActivePolicy();
  const id = `appr_${crypto.randomBytes(8).toString('hex')}`;
  const now = new Date();
  const timeoutMs = (policy.approval.timeout_seconds || 120) * 1000;
  const expiresAt = new Date(now.getTime() + timeoutMs);

  const record: ApprovalRecord = {
    id,
    request_id: params.requestId,
    action_hash: params.actionHash,
    agent_id: params.agentId,
    session_id: params.sessionId,
    tool: params.tool,
    action: params.action,
    command: params.command,
    target: params.target,
    payload: params.payload,
    redacted: params.redacted,
    risk_score: params.riskScore,
    risk_categories: params.riskCategories,
    reasons: params.reasons,
    status: 'pending',
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  approvals.set(id, record);

  // Broadcast event
  broadcastEvent('approval.requested', {
    id: record.id,
    request_id: record.request_id,
    tool: record.tool,
    action: record.action,
    redacted: record.redacted,
    risk_score: record.risk_score,
    expires_at: record.expires_at,
  });

  return record;
}

/**
 * Retrieve approval by ID and check expiration
 */
export function getApproval(id: string): ApprovalRecord | null {
  const record = approvals.get(id);
  if (!record) return null;

  // Check if expired
  if (record.status === 'pending' && new Date(record.expires_at).getTime() <= Date.now()) {
    record.status = 'expired';
    record.decided_at = new Date().toISOString();
    record.decided_by = 'system:timeout';
    record.reason = 'Approval expired without human intervention (fail-closed timeout -> BLOCK)';
    broadcastEvent('approval.expired', { id: record.id, status: 'expired' });
  }

  return record;
}

/**
 * List approvals with optional status filter
 */
export function listApprovals(statusFilter?: string): ApprovalRecord[] {
  const now = Date.now();
  const list: ApprovalRecord[] = [];

  for (const record of approvals.values()) {
    // Check expiry dynamically
    if (record.status === 'pending' && new Date(record.expires_at).getTime() <= now) {
      record.status = 'expired';
      record.decided_at = new Date().toISOString();
      record.decided_by = 'system:timeout';
      record.reason = 'Approval expired without human intervention (fail-closed timeout -> BLOCK)';
      broadcastEvent('approval.expired', { id: record.id, status: 'expired' });
    }

    if (!statusFilter || record.status === statusFilter) {
      list.push(record);
    }
  }

  // Sort descending by created_at
  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Decide an approval (approve or deny)
 */
export function decideApproval(
  id: string,
  decision: 'approve' | 'deny',
  reason?: string,
  decidedBy: string = 'admin'
): { success: boolean; record?: ApprovalRecord; error?: string; status?: number } {
  const record = approvals.get(id);
  if (!record) {
    return { success: false, error: 'Approval record not found', status: 404 };
  }

  // Check expiry first
  if (record.status === 'pending' && new Date(record.expires_at).getTime() <= Date.now()) {
    record.status = 'expired';
    record.decided_at = new Date().toISOString();
    record.decided_by = 'system:timeout';
    record.reason = 'Approval expired without human intervention (fail-closed timeout -> BLOCK)';
    return { success: false, error: 'Approval has already expired and timed out to BLOCK', status: 409 };
  }

  if (record.status !== 'pending') {
    return {
      success: false,
      error: `Approval was already decided (${record.status}) by ${record.decided_by}`,
      status: 409,
    };
  }

  record.status = decision === 'approve' ? 'approved' : 'denied';
  record.decided_at = new Date().toISOString();
  record.decided_by = decidedBy;
  record.reason = reason || (decision === 'approve' ? 'Approved by operator' : 'Denied by operator');

  if (decision === 'approve') {
    record.execution_token = generateExecutionToken(record.action_hash, 60);
  }

  broadcastEvent('approval.decided', {
    id: record.id,
    status: record.status,
    decided_by: record.decided_by,
    reason: record.reason,
    execution_token: record.execution_token,
  });

  return { success: true, record };
}
