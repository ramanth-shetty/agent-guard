/**
 * AgentGuard Cryptographic Engine
 * Action hashing, HMAC execution tokens, and audit hash-chain verification.
 */

import crypto from 'node:crypto';
import { ActionType, ToolType } from '../../shared/types.js';

// Internal secret used to sign execution tokens
const HMAC_SECRET = process.env.AGENTGUARD_HMAC_SECRET || 'agentguard-secret-signing-key-devhack-2026';

/**
 * Computes canonical action hash: sha256(tool:action:command:target:payload)
 */
export function computeActionHash(
  tool: ToolType,
  action: ActionType,
  command?: string,
  target?: string,
  payload?: string
): string {
  const canonical = [
    tool.toLowerCase().trim(),
    action.toLowerCase().trim(),
    (command || '').trim(),
    (target || '').trim(),
    (payload || '').trim(),
  ].join('||');

  const hash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  return `sha256:${hash}`;
}

/**
 * Issues an HMAC execution token valid for 60 seconds
 */
export function generateExecutionToken(actionHash: string, validitySeconds: number = 60): string {
  const expiresAt = Math.floor(Date.now() / 1000) + validitySeconds;
  const message = `${actionHash}::${expiresAt}`;
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(message).digest('hex');
  return `agt_v1_${Buffer.from(JSON.stringify({ h: actionHash, exp: expiresAt, sig: signature })).toString('base64url')}`;
}

/**
 * Verifies an execution token against the action about to run
 */
export function verifyExecutionToken(token: string, currentActionHash: string): {
  valid: boolean;
  reason?: string;
} {
  try {
    if (!token.startsWith('agt_v1_')) {
      return { valid: false, reason: 'Malformed execution token format' };
    }
    const raw = Buffer.from(token.replace('agt_v1_', ''), 'base64url').toString('utf8');
    const { h: tokenHash, exp, sig } = JSON.parse(raw);

    const now = Math.floor(Date.now() / 1000);
    if (now > exp) {
      return { valid: false, reason: 'Execution token has expired (TTL 60s)' };
    }

    const expectedSig = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(`${tokenHash}::${exp}`)
      .digest('hex');

    if (expectedSig !== sig) {
      return { valid: false, reason: 'Invalid token signature' };
    }

    if (tokenHash !== currentActionHash) {
      return {
        valid: false,
        reason: `Action hash mismatch! Token authorized [${tokenHash.slice(0, 16)}...] but current action is [${currentActionHash.slice(0, 16)}...]`,
      };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `Token parsing failed: ${err.message}` };
  }
}

/**
 * Computes hash chain record hash: SHA-256(prev_hash + canonical record fields)
 */
export function computeRecordHash(
  prevHash: string,
  record: {
    id: string;
    request_id: string;
    ts: string;
    agent_id: string;
    session_id: string;
    tool: string;
    action: string;
    action_hash: string;
    verdict: string;
    risk_score: number;
    policy_version: number;
  }
): string {
  const canonical = [
    prevHash,
    record.id,
    record.request_id,
    record.ts,
    record.agent_id,
    record.session_id,
    record.tool,
    record.action,
    record.action_hash,
    record.verdict,
    record.risk_score.toString(),
    record.policy_version.toString(),
  ].join('||');

  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
