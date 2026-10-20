/**
 * AgentGuard Normalizer
 * Canonicalizes filesystem paths and analyzes shell AST / command patterns.
 */

export interface NormalizedAction {
  command?: string;
  target?: string;
  isObfuscated: boolean;
  obfuscationReasons: string[];
}

/**
 * Resolves path quirks like .., ~, multiple slashes, and relative traversals
 */
export function canonicalizePath(targetPath?: string, cwd: string = '/sandbox/workspace'): string {
  if (!targetPath) return '';
  let path = targetPath.trim();

  // Handle home directory expansion
  if (path === '~' || path.startsWith('~/')) {
    path = path.replace(/^~(?=$|\/)/, '/home/user');
  }

  // Handle relative paths
  if (!path.startsWith('/')) {
    path = `${cwd.replace(/\/+$/, '')}/${path}`;
  }

  // Normalize multiple slashes and . / .. components
  const parts = path.split('/');
  const resolvedParts: string[] = [];

  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (resolvedParts.length > 0) {
        resolvedParts.pop();
      }
    } else {
      resolvedParts.push(part);
    }
  }

  return '/' + resolvedParts.join('/');
}

/**
 * Normalizes shell commands and identifies obfuscation tricks
 */
export function normalizeCommand(rawCommand?: string): NormalizedAction {
  if (!rawCommand) {
    return { isObfuscated: false, obfuscationReasons: [] };
  }

  let command = rawCommand.trim();
  const obfuscationReasons: string[] = [];

  // Check for Base64 execution tricks e.g. echo ... | base64 -d | sh
  if (/(?:base64\s+(?:-d|--decode)|openssl\s+enc\s+-d|xxd\s+-r)\s*\|\s*(?:ba|z|da|k)?sh/i.test(command)) {
    obfuscationReasons.push('Detected Base64/encoded payload piping into a shell interpreter');
  }

  // Check for inline python/perl/ruby base64 or eval
  if (/(?:eval\s*\(|exec\s*\(|subprocess\.Popen|decode\(['"]base64['"]\))/i.test(command)) {
    obfuscationReasons.push('Detected eval/exec or dynamic code evaluation in command');
  }

  // Check for shell quote-splitting tricks e.g. r'm' -'r'f or \r\m -\r\f
  if (/\b(?:r'm'|r"m"|c'a't|c"a"t|s'h'|s"h"|b'a'sh|b"a"sh)\b/.test(command) || /\\[a-zA-Z]\\[a-zA-Z]/.test(command)) {
    obfuscationReasons.push('Detected quote-split shell token evasion attempt');
  }

  // Check for hex or octal escape sequences in shell strings e.g. $'\x72\x6d'
  if (/\$'(?:\\x[0-9a-fA-F]{2}|\\[0-7]{3})+'/.test(command) || /printf\s+["']\\x[0-9a-fA-F]{2}/.test(command)) {
    obfuscationReasons.push('Detected hex or octal escape encoded shell execution');
  }

  // Check for hidden environment variable indirection e.g. $0 or ${IFS} or $PATH slicing
  if (/\$\{IFS\}|\$\{PATH:[0-9]+:[0-9]+\}/.test(command)) {
    obfuscationReasons.push('Detected shell variable slicing or delimiter evasion ($IFS)');
  }

  // Check for backticks or nested subshells with high risk
  if (/`[^`]+`|\$\([^)]+\)/.test(command)) {
    // subshell present
  }

  // Normalize duplicate whitespace
  const cleanedCommand = command.replace(/\s+/g, ' ');

  return {
    command: cleanedCommand,
    isObfuscated: obfuscationReasons.length > 0,
    obfuscationReasons,
  };
}
