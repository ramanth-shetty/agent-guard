/**
 * AgentGuard Core Action Evaluator
 * Orchestrates request normalization, privacy scanning, risk evaluation,
 * hash signing, audit logging, and human approval dispatch.
 */

import crypto from 'node:crypto';
import {
  EvaluateRequest,
  EvaluateResponse,
} from '../../shared/types.js';
import { computeActionHash, generateExecutionToken } from './crypto.js';
import { getActivePolicy } from './policyEngine.js';
import { inspectPrivacy } from './privacyShield.js';
import { classifyAction } from './riskClassifier.js';
import { createApproval } from '../store/approvalStore.js';
import { recordAudit } from '../store/auditStore.js';

export async function evaluateAction(req: EvaluateRequest): Promise<EvaluateResponse> {
  const startTime = performance.now();
  const policy = getActivePolicy();

  const requestId = req.request_id || `req_${crypto.randomBytes(8).toString('hex')}`;
  const agentId = req.agent_id || 'default-agent';
  const sessionId = req.session_id || `sess_${Date.now()}`;
  const mode = req.mode || 'fast';

  // 1. Privacy Shield: scan command, target, payload
  const privacyResult = inspectPrivacy(req.command, req.target, req.payload);

  // 2. Risk Classifier: fast rules + optional deep LLM check
  const classification = await classifyAction(
    req.tool,
    req.action,
    req.command,
    req.target,
    privacyResult.redactedPayload || req.payload,
    req.context,
    mode,
    privacyResult.entities,
    privacyResult.hasHighRiskSecrets
  );

  // 3. Compute deterministic Action Hash over canonical components
  const actionHash = computeActionHash(
    req.tool,
    req.action,
    req.command,
    req.target,
    privacyResult.redactedPayload || req.payload
  );

  let approvalSummary = null;
  let executionToken: string | null = null;

  // 4. Handle Verdict semantics
  if (classification.verdict === 'ALLOW') {
    // Generate HMAC execution token valid for 60 seconds
    executionToken = generateExecutionToken(actionHash, 60);
  } else if (classification.verdict === 'ASK_HUMAN') {
    // Dispatch to Pending Approval Queue
    const approval = createApproval({
      requestId,
      actionHash,
      agentId,
      sessionId,
      tool: req.tool,
      action: req.action,
      command: req.command,
      target: req.target,
      payload: req.payload,
      redacted: {
        command: privacyResult.redactedCommand,
        target: privacyResult.redactedTarget,
        payload: privacyResult.redactedPayload,
      },
      riskScore: classification.riskScore,
      riskCategories: classification.riskCategories,
      reasons: classification.reasons,
    });

    approvalSummary = {
      id: approval.id,
      status: approval.status,
      expires_at: approval.expires_at,
      poll_url: `/v1/approvals/${approval.id}`,
    };
  }

  const endTime = performance.now();
  const latencyMs = Math.round(endTime - startTime);

  // 5. Append to Cryptographic Audit Ledger
  recordAudit({
    request_id: requestId,
    agent_id: agentId,
    session_id: sessionId,
    tool: req.tool,
    action: req.action,
    command_redacted: privacyResult.redactedCommand,
    target: privacyResult.redactedTarget,
    payload_redacted: privacyResult.redactedPayload,
    action_hash: actionHash,
    verdict: classification.verdict,
    risk_score: classification.riskScore,
    risk_categories: classification.riskCategories,
    reasons: classification.reasons,
    sensitive_entities: privacyResult.entities,
    engine: classification.engineUsed,
    latency_ms: latencyMs,
    policy_version: policy.version,
  });

  return {
    request_id: requestId,
    action_hash: actionHash,
    verdict: classification.verdict,
    risk_score: classification.riskScore,
    risk_categories: classification.riskCategories,
    reasons: classification.reasons,
    redacted: {
      command: privacyResult.redactedCommand,
      target: privacyResult.redactedTarget,
      payload: privacyResult.redactedPayload,
    },
    sensitive_entities: privacyResult.entities,
    approval: approvalSummary,
    execution_token: executionToken,
    engine: classification.engineUsed,
    latency_ms: latencyMs,
  };
}
