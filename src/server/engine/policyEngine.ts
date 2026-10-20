/**
 * AgentGuard Policy Engine
 * Manages active YAML/JSON policies, versioning, and validation.
 */

import YAML from 'yaml';
import { PolicyConfig } from '../../shared/types.js';

export const DEFAULT_POLICY: PolicyConfig = {
  version: 3,
  thresholds: {
    allow_below: 30,
    block_from: 70,
  },
  approval: {
    timeout_seconds: 120,
    on_timeout: 'BLOCK',
  },
  workspace_root: '/sandbox/workspace',
  allowlist: {
    commands: ['ls', 'cat', 'git status', 'pytest', 'pwd', 'echo', 'node -v', 'python --version'],
    domains: ['api.github.com', 'huggingface.co', 'registry.npmjs.org', 'pypi.org'],
  },
  hard_block: {
    command_patterns: [
      'rm\\s+(?:-[a-zA-Z]*f?[a-zA-Z]*\\s+)?(?:/|~|/root|/etc|/bin|/usr|/var)(?:$|\\s|/\\*)',
      'mkfs(?:\\.[a-z0-9]+)?',
      'dd\\s+.*of=/dev/(?:sd[a-z]|nvme[0-9]n[0-9]|null|zero)',
      ':\\(\\)\\s*\\{\\s*:\\|:&\\s*\\};:',
      'chmod\\s+-[a-zA-Z]*R[a-zA-Z]*\\s+777\\s+(?:/|/etc|/usr)',
      'curl\\s+.*\\|\\s*(?:sh|bash|zsh|dash)',
      'wget\\s+.*\\|\\s*(?:sh|bash|zsh|dash)',
      '(?:DROP\\s+DATABASE|DROP\\s+TABLE|DELETE\\s+FROM\\s+[a-zA-Z0-9_]+\\s*;)',
    ],
    protected_paths: [
      '/etc/shadow',
      '/etc/passwd',
      '/etc/sudoers',
      '~/.ssh/*',
      '~/.aws/*',
      '**/.env',
      '**/.env.*',
      '~/.gnupg/*',
    ],
  },
  privacy: {
    mask: ['EMAIL', 'PHONE', 'PERSON'],
    block: ['API_KEY', 'PRIVATE_KEY', 'AADHAAR', 'CREDIT_CARD', 'GOV_ID'],
  },
  llm: {
    enabled: true,
    timeout_seconds: 3,
  },
};

let activePolicy: PolicyConfig = { ...DEFAULT_POLICY };

export function getActivePolicy(): PolicyConfig {
  return activePolicy;
}

export function getActivePolicyYaml(): string {
  return YAML.stringify(activePolicy);
}

export function validatePolicy(yamlOrJsonString: string): {
  valid: boolean;
  policy?: PolicyConfig;
  error?: string;
} {
  try {
    let parsed: any;
    if (yamlOrJsonString.trim().startsWith('{')) {
      parsed = JSON.parse(yamlOrJsonString);
    } else {
      parsed = YAML.parse(yamlOrJsonString);
    }

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Policy must be a valid JSON or YAML object' };
    }

    // Validate essential sections
    if (!parsed.thresholds || typeof parsed.thresholds.allow_below !== 'number' || typeof parsed.thresholds.block_from !== 'number') {
      return { valid: false, error: 'Policy requires valid "thresholds" with allow_below and block_from numbers' };
    }

    if (!parsed.approval || typeof parsed.approval.timeout_seconds !== 'number' || !['BLOCK', 'ASK_HUMAN'].includes(parsed.approval.on_timeout)) {
      return { valid: false, error: 'Policy requires "approval" with timeout_seconds and on_timeout ("BLOCK" or "ASK_HUMAN")' };
    }

    if (!parsed.workspace_root || typeof parsed.workspace_root !== 'string') {
      return { valid: false, error: 'Policy requires "workspace_root" path string' };
    }

    if (!parsed.allowlist || !Array.isArray(parsed.allowlist.commands)) {
      return { valid: false, error: 'Policy requires "allowlist" with commands list' };
    }

    if (!parsed.hard_block || !Array.isArray(parsed.hard_block.command_patterns)) {
      return { valid: false, error: 'Policy requires "hard_block" with command_patterns list' };
    }

    return { valid: true, policy: parsed as PolicyConfig };
  } catch (err: any) {
    return { valid: false, error: `Parsing error: ${err.message}` };
  }
}

export function updateActivePolicy(yamlOrJsonString: string): {
  success: boolean;
  version: number;
  policy?: PolicyConfig;
  error?: string;
} {
  const check = validatePolicy(yamlOrJsonString);
  if (!check.valid || !check.policy) {
    return { success: false, version: activePolicy.version, error: check.error };
  }

  const nextVersion = (activePolicy.version || 3) + 1;
  activePolicy = {
    ...check.policy,
    version: nextVersion,
  };

  return {
    success: true,
    version: nextVersion,
    policy: activePolicy,
  };
}

export function resetToDefaultPolicy(): PolicyConfig {
  activePolicy = { ...DEFAULT_POLICY, version: activePolicy.version + 1 };
  return activePolicy;
}
