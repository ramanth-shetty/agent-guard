/**
 * Shared Type Definitions for AgentGuard
 * Specification: DevHack 2026 PS 2.1
 */

export type ToolType = 'shell' | 'filesystem' | 'http' | 'database' | 'package';

export type ActionType = 'execute' | 'read' | 'write' | 'delete' | 'send' | 'install' | 'query';

export type Verdict = 'ALLOW' | 'ASK_HUMAN' | 'BLOCK';

export type EvaluationMode = 'fast' | 'deep';

export type RiskCategory = 
  | 'destructive'
  | 'system_modification'
  | 'data_exfiltration'
  | 'privacy'
  | 'network_egress'
  | 'privilege_escalation'
  | 'unknown';

export interface SensitiveEntity {
  type: string;
  detector: 'pattern' | 'luhn' | 'verhoeff' | 'entropy' | 'context_llm';
  score: number;
  field: 'command' | 'target' | 'payload';
}

export interface RuleReason {
  rule_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface RedactedFields {
  command?: string;
  target?: string;
  payload?: string;
}

export interface ApprovalSummary {
  id: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  expires_at: string;
  poll_url: string;
}

export interface EngineDetails {
  fast: boolean;
  llm: boolean;
  policy_version: number;
}

export interface EvaluateRequest {
  request_id?: string;
  agent_id: string;
  session_id: string;
  tool: ToolType;
  action: ActionType;
  command?: string;
  target?: string;
  payload?: string;
  context?: {
    task?: string;
    cwd?: string;
    user_prompt?: string;
    [key: string]: any;
  };
  mode?: EvaluationMode;
}

export interface EvaluateResponse {
  request_id: string;
  action_hash: string;
  verdict: Verdict;
  risk_score: number;
  risk_categories: RiskCategory[];
  reasons: RuleReason[];
  redacted: RedactedFields;
  sensitive_entities: SensitiveEntity[];
  approval: ApprovalSummary | null;
  execution_token: string | null;
  engine: EngineDetails;
  latency_ms: number;
}

export interface ApprovalRecord {
  id: string;
  request_id: string;
  action_hash: string;
  agent_id: string;
  session_id: string;
  tool: ToolType;
  action: ActionType;
  command?: string;
  target?: string;
  payload?: string;
  redacted: RedactedFields;
  risk_score: number;
  risk_categories: RiskCategory[];
  reasons: RuleReason[];
  status: 'pending' | 'approved' | 'denied' | 'expired';
  created_at: string;
  expires_at: string;
  decided_at?: string;
  decided_by?: string;
  reason?: string;
  execution_token?: string;
}

export interface AuditRecord {
  id: string;
  request_id: string;
  ts: string;
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
  risk_categories: RiskCategory[];
  reasons: RuleReason[];
  sensitive_entities: SensitiveEntity[];
  engine: EngineDetails;
  latency_ms: number;
  policy_version: number;
  prev_hash: string;
  record_hash: string;
}

export interface PolicyThresholds {
  allow_below: number;
  block_from: number;
}

export interface ApprovalPolicy {
  timeout_seconds: number;
  on_timeout: Verdict;
}

export interface AllowlistPolicy {
  commands: string[];
  domains: string[];
}

export interface HardBlockPolicy {
  command_patterns: string[];
  protected_paths: string[];
}

export interface PrivacyPolicy {
  mask: string[];
  block: string[];
}

export interface LlmPolicy {
  enabled: boolean;
  timeout_seconds: number;
}

export interface PolicyConfig {
  version: number;
  thresholds: PolicyThresholds;
  approval: ApprovalPolicy;
  workspace_root: string;
  allowlist: AllowlistPolicy;
  hard_block: HardBlockPolicy;
  privacy: PrivacyPolicy;
  llm: LlmPolicy;
}

export interface SystemMetrics {
  total_actions: number;
  verdicts: {
    ALLOW: number;
    ASK_HUMAN: number;
    BLOCK: number;
  };
  auto_allow_rate: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  redactions_count: number;
  approvals: {
    pending: number;
    approved: number;
    denied: number;
    expired: number;
  };
}

export interface ScenarioTestResult {
  id: number;
  name: string;
  description: string;
  expected_verdict: Verdict;
  actual_verdict: Verdict;
  passed: boolean;
  risk_score: number;
  latency_ms: number;
  redacted_preview?: string;
  sensitive_count: number;
  reason?: string;
}

export interface SimulationReport {
  suite: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
  high_risk_intercept_rate: number;
  p95_fast_path_latency_ms: number;
  unredacted_raw_secrets_leaked: number;
  scenarios: ScenarioTestResult[];
}
