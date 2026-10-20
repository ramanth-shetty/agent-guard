/**
 * AgentGuard Privacy Shield
 * Context-aware sensitive data and credentials detection and redaction engine.
 * Includes real Luhn algorithm for Credit Cards and Verhoeff algorithm for Aadhaar.
 */

import { SensitiveEntity } from '../../shared/types.js';

// Verhoeff algorithm tables for Aadhaar 12-digit number verification
const VERHOEFF_D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function validateVerhoeff(numStr: string): boolean {
  if (!/^\d{12}$/.test(numStr)) return false;
  let c = 0;
  const digits = numStr.split('').map(Number);
  const reversed = [...digits].reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][reversed[i]]];
  }
  return c === 0;
}

/**
 * Standard Luhn check for Credit Card numbers
 */
export function validateLuhn(candidate: string): boolean {
  const sanitized = candidate.replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(sanitized)) return false;

  let sum = 0;
  let alternate = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let n = parseInt(sanitized.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Calculate Shannon Entropy of a string
 */
export function calculateEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const len = str.length;
  const frequencies = new Map<string, number>();

  for (let i = 0; i < len; i++) {
    const char = str[i];
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

export interface PrivacyScanResult {
  redactedText: string;
  entities: SensitiveEntity[];
  hasHighRiskSecrets: boolean;
}

/**
 * Scans a single text field and redacts sensitive entities
 */
export function scanAndRedact(
  text: string | undefined,
  field: 'command' | 'target' | 'payload',
  counterState: { [type: string]: number } = {}
): PrivacyScanResult {
  if (!text || typeof text !== 'string') {
    return { redactedText: text || '', entities: [], hasHighRiskSecrets: false };
  }

  let result = text;
  const entities: SensitiveEntity[] = [];
  let hasHighRiskSecrets = false;

  const getPlaceholder = (type: string): string => {
    counterState[type] = (counterState[type] || 0) + 1;
    return `<${type}_${counterState[type]}>`;
  };

  // 1. Private Key Blocks (SSH, RSA, PGP, EC)
  const privateKeyRegex = /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/g;
  result = result.replace(privateKeyRegex, () => {
    entities.push({ type: 'PRIVATE_KEY', detector: 'pattern', score: 1.0, field });
    hasHighRiskSecrets = true;
    return getPlaceholder('PRIVATE_KEY');
  });

  // 2. Specific Cloud / Provider API Keys
  // AWS Access Key ID
  const awsKeyRegex = /\b(AKIA[0-9A-Z]{16})\b/g;
  result = result.replace(awsKeyRegex, () => {
    entities.push({ type: 'API_KEY', detector: 'pattern', score: 0.98, field });
    hasHighRiskSecrets = true;
    return getPlaceholder('API_KEY');
  });

  // Google / Gemini API Key
  const googleKeyRegex = /\b(AIzaSy[0-9A-Za-z_-]{33})\b/g;
  result = result.replace(googleKeyRegex, () => {
    entities.push({ type: 'API_KEY', detector: 'pattern', score: 0.99, field });
    hasHighRiskSecrets = true;
    return getPlaceholder('API_KEY');
  });

  // GitHub Personal Access Token
  const githubTokenRegex = /\b(gh[pousr]_[A-Za-z0-9_]{36,255})\b/g;
  result = result.replace(githubTokenRegex, () => {
    entities.push({ type: 'API_KEY', detector: 'pattern', score: 0.99, field });
    hasHighRiskSecrets = true;
    return getPlaceholder('API_KEY');
  });

  // Stripe Secret/Publishable Key
  const stripeKeyRegex = /\b((?:sk|pk)_(?:test|live)_[0-9a-zA-Z]{24,99})\b/g;
  result = result.replace(stripeKeyRegex, () => {
    entities.push({ type: 'API_KEY', detector: 'pattern', score: 0.99, field });
    hasHighRiskSecrets = true;
    return getPlaceholder('API_KEY');
  });

  // JWT Tokens (3 base64url segments separated by dots)
  const jwtRegex = /\beyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/g;
  result = result.replace(jwtRegex, () => {
    entities.push({ type: 'JWT_TOKEN', detector: 'pattern', score: 0.95, field });
    hasHighRiskSecrets = true;
    return getPlaceholder('JWT_TOKEN');
  });

  // Generic Bearer Token / API Key in headers or assignment
  const keyAssignmentRegex = /(?:api[_-]?key|secret|token|auth[_-]?token|bearer)\s*[:=]\s*["']?([A-Za-z0-9_\-.~+/=]{20,})["']?/gi;
  result = result.replace(keyAssignmentRegex, (match, tokenVal) => {
    if (calculateEntropy(tokenVal) >= 3.2) {
      entities.push({ type: 'API_KEY', detector: 'entropy', score: 0.92, field });
      hasHighRiskSecrets = true;
      const placeholder = getPlaceholder('API_KEY');
      return match.replace(tokenVal, placeholder);
    }
    return match;
  });

  // 3. Password detection with contextual assignment (NOT plain prose word "password")
  // e.g. "password = superSecret123!" or "password: 'abc'" -> REDACT
  // But "Please change your password every month" -> NOT REDACTED (Scenario 12)
  const passwordAssignmentRegex = /(?:password|passwd|pwd)\s*[:=]\s*["']?([^\s"';,]{6,})["']?/gi;
  result = result.replace(passwordAssignmentRegex, (match, pwdVal) => {
    // Exclude common prompt words or help texts
    if (/^(?:is|was|should|must|here|there|field|string|text|regularly)$/i.test(pwdVal)) {
      return match;
    }
    entities.push({ type: 'PASSWORD', detector: 'pattern', score: 0.95, field });
    hasHighRiskSecrets = true;
    const placeholder = getPlaceholder('PASSWORD');
    return match.replace(pwdVal, placeholder);
  });

  // 4. Credit Cards with Luhn Check
  // Matches 13-19 digit numbers separated by spaces or dashes
  const cardRegex = /\b(?:\d{4}[ -]?){3,4}\d{1,4}\b/g;
  result = result.replace(cardRegex, (match) => {
    const digitsOnly = match.replace(/[\s-]/g, '');
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19 && validateLuhn(digitsOnly)) {
      entities.push({ type: 'CREDIT_CARD', detector: 'luhn', score: 0.98, field });
      hasHighRiskSecrets = true;
      return getPlaceholder('CREDIT_CARD');
    }
    // Fails Luhn (e.g. 16 digit order number / tracking code) -> Do NOT flag (Scenario 13)
    return match;
  });

  // 5. Aadhaar Numbers with Verhoeff Check (12 digits e.g. XXXX XXXX XXXX or 12 continuous digits)
  const aadhaarRegex = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
  result = result.replace(aadhaarRegex, (match) => {
    const rawAadhaar = match.replace(/\s/g, '');
    if (validateVerhoeff(rawAadhaar)) {
      entities.push({ type: 'AADHAAR', detector: 'verhoeff', score: 0.99, field });
      hasHighRiskSecrets = true;
      return getPlaceholder('AADHAAR');
    }
    return match;
  });

  // 6. Indian PAN Card format (5 uppercase letters, 4 digits, 1 uppercase letter)
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;
  result = result.replace(panRegex, () => {
    entities.push({ type: 'GOV_ID_PAN', detector: 'pattern', score: 0.95, field });
    hasHighRiskSecrets = true;
    return getPlaceholder('GOV_ID');
  });

  // 7. Emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  result = result.replace(emailRegex, () => {
    entities.push({ type: 'EMAIL', detector: 'pattern', score: 0.95, field });
    return getPlaceholder('EMAIL');
  });

  // 8. Phone Numbers (International and regional formats)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  result = result.replace(phoneRegex, (match) => {
    // Ensure sufficient digits
    const digitsCount = (match.match(/\d/g) || []).length;
    if (digitsCount >= 10 && digitsCount <= 15) {
      entities.push({ type: 'PHONE', detector: 'pattern', score: 0.88, field });
      return getPlaceholder('PHONE');
    }
    return match;
  });

  return {
    redactedText: result,
    entities,
    hasHighRiskSecrets,
  };
}

/**
 * Runs privacy inspection across command, target, and payload
 */
export function inspectPrivacy(
  command?: string,
  target?: string,
  payload?: string
): {
  redactedCommand?: string;
  redactedTarget?: string;
  redactedPayload?: string;
  entities: SensitiveEntity[];
  hasHighRiskSecrets: boolean;
} {
  const counterState: { [type: string]: number } = {};
  const allEntities: SensitiveEntity[] = [];
  let highRisk = false;

  const cmdRes = scanAndRedact(command, 'command', counterState);
  if (cmdRes.entities.length > 0) {
    allEntities.push(...cmdRes.entities);
    if (cmdRes.hasHighRiskSecrets) highRisk = true;
  }

  const tgtRes = scanAndRedact(target, 'target', counterState);
  if (tgtRes.entities.length > 0) {
    allEntities.push(...tgtRes.entities);
    if (tgtRes.hasHighRiskSecrets) highRisk = true;
  }

  const pldRes = scanAndRedact(payload, 'payload', counterState);
  if (pldRes.entities.length > 0) {
    allEntities.push(...pldRes.entities);
    if (pldRes.hasHighRiskSecrets) highRisk = true;
  }

  return {
    redactedCommand: cmdRes.redactedText || undefined,
    redactedTarget: tgtRes.redactedText || undefined,
    redactedPayload: pldRes.redactedText || undefined,
    entities: allEntities,
    hasHighRiskSecrets: highRisk,
  };
}
