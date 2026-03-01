import type { ICspValidator, ValidationResult } from './types';
import { CSP_DIRECTIVE_NAMES, CSP_KEYWORDS } from './types';

/**
 * Known sandbox flags per the CSP specification.
 */
const SANDBOX_FLAGS = [
  'allow-downloads',
  'allow-forms',
  'allow-modals',
  'allow-orientation-lock',
  'allow-pointer-lock',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-same-origin',
  'allow-scripts',
  'allow-storage-access-by-user-activation',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-top-navigation-to-custom-protocols',
];

/**
 * Regex patterns for valid CSP value types.
 */
const QUOTED_KEYWORD_PATTERN = /^'[a-z][a-z0-9-]*'$/;
const NONCE_PATTERN = /^'nonce-[A-Za-z0-9+/=_-]+'$/;
const HASH_PATTERN = /^'sha(256|384|512)-[A-Za-z0-9+/=_-]+'$/;
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:$/;
const HOST_PATTERN =
  /^(\*|[a-z][a-z0-9+.-]*:\/\/)?(\*\.)?[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d+|:\*)?(\/[^\s]*)?$/i;

/**
 * Validates CSP directive names and values against the specification.
 *
 * Single Responsibility: only handles validation logic.
 * Returns warnings (not errors) — values are always allowed through.
 */
export class CspValidator implements ICspValidator {
  private readonly knownDirectives: ReadonlySet<string>;
  private readonly knownKeywords: ReadonlySet<string>;
  private readonly sandboxFlags: ReadonlySet<string>;

  constructor() {
    this.knownDirectives = new Set(CSP_DIRECTIVE_NAMES);
    this.knownKeywords = new Set(
      CSP_KEYWORDS.map((k) => `'${k}'`)
    );
    this.sandboxFlags = new Set(SANDBOX_FLAGS);
  }

  /**
   * Validate a directive name.
   */
  validateDirective(name: string): ValidationResult {
    const normalized = name.trim().toLowerCase();

    if (!normalized) {
      return { valid: false, warning: 'Directive name cannot be empty.' };
    }

    if (!/^[a-z][a-z0-9-]*$/.test(normalized)) {
      return {
        valid: false,
        warning: `"${name}" contains invalid characters. Directive names should use lowercase letters, numbers, and hyphens.`,
      };
    }

    if (!this.knownDirectives.has(normalized)) {
      return {
        valid: true,
        warning: `"${normalized}" is not a standard CSP directive. Known directives: ${[...this.knownDirectives].slice(0, 5).join(', ')}, ...`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate a CSP value for a given directive.
   */
  validateValue(value: string, directive: string): ValidationResult {
    const val = value.trim();

    if (!val) {
      return { valid: false, warning: 'Value cannot be empty.' };
    }

    // Spaces indicate multiple values were typed at once
    if (/\s/.test(val)) {
      return {
        valid: false,
        warning: 'Values should be added one at a time. Spaces are not valid within a single CSP value.',
      };
    }

    // Sandbox directive has its own set of valid values
    if (directive === 'sandbox') {
      return this.validateSandboxValue(val);
    }

    // Boolean directives like upgrade-insecure-requests take no values
    if (
      directive === 'upgrade-insecure-requests' ||
      directive === 'block-all-mixed-content'
    ) {
      return {
        valid: true,
        warning: `"${directive}" is a boolean directive and typically has no values.`,
      };
    }

    // Wildcard
    if (val === '*') {
      return { valid: true };
    }

    // Quoted values: keywords, nonces, hashes
    if (val.startsWith("'") && val.endsWith("'")) {
      return this.validateQuotedValue(val);
    }

    // Unquoted keyword attempt (common mistake)
    if (this.looksLikeUnquotedKeyword(val)) {
      return {
        valid: false,
        warning: `"${val}" looks like a CSP keyword but is missing quotes. It will be treated as a host. Did you mean '${val}'?`,
      };
    }

    // Scheme source (e.g., data:, https:)
    if (SCHEME_PATTERN.test(val)) {
      return { valid: true };
    }

    // Host source (domains, URLs, wildcards)
    if (HOST_PATTERN.test(val)) {
      // Reject single words without dots (except localhost)
      if (!val.includes('.') && !val.includes(':') && !val.includes('/') && val !== 'localhost') {
        return {
          valid: false,
          warning: `"${val}" is not a valid CSP value. Hosts should be domains (example.com), URLs (https://example.com), or use quotes for keywords ('self', 'none', etc.).`,
        };
      }
      return { valid: true };
    }

    // If nothing matched, block it
    return {
      valid: false,
      warning: `"${val}" is not a valid CSP value. Expected: keyword ('self'), nonce ('nonce-...'), hash ('sha256-...'), scheme (https:), or host (example.com).`,
    };
  }

  /**
   * Validate a quoted CSP value ('keyword', 'nonce-...', 'sha...-...').
   */
  private validateQuotedValue(val: string): ValidationResult {
    // Nonce
    if (val.startsWith("'nonce-")) {
      if (NONCE_PATTERN.test(val)) {
        return { valid: true };
      }
      return {
        valid: true,
        warning: `"${val}" looks like a nonce but has invalid characters. Expected format: 'nonce-<base64>'.`,
      };
    }

    // Hash
    if (/^'sha(256|384|512)-/.test(val)) {
      if (HASH_PATTERN.test(val)) {
        return { valid: true };
      }
      return {
        valid: true,
        warning: `"${val}" looks like a hash but has invalid characters. Expected format: 'sha(256|384|512)-<base64>'.`,
      };
    }

    // Known keyword
    if (this.knownKeywords.has(val)) {
      return { valid: true };
    }

    // Valid-looking but unknown keyword
    if (QUOTED_KEYWORD_PATTERN.test(val)) {
      return {
        valid: true,
        warning: `"${val}" is not a recognized CSP keyword. Known keywords: 'self', 'unsafe-inline', 'none', 'strict-dynamic', ...`,
      };
    }

    return {
      valid: true,
      warning: `"${val}" is a quoted value but doesn't match any known CSP pattern.`,
    };
  }

  /**
   * Validate a sandbox directive flag.
   */
  private validateSandboxValue(val: string): ValidationResult {
    if (this.sandboxFlags.has(val)) {
      return { valid: true };
    }
    return {
      valid: true,
      warning: `"${val}" is not a recognized sandbox flag. Known flags: ${[...this.sandboxFlags].slice(0, 4).join(', ')}, ...`,
    };
  }

  /**
   * Check if a value looks like a common CSP keyword without quotes.
   */
  private looksLikeUnquotedKeyword(val: string): boolean {
    const unquotedKeywords = [
      'self',
      'none',
      'unsafe-inline',
      'unsafe-eval',
      'strict-dynamic',
      'report-sample',
      'unsafe-hashes',
      'wasm-eval',
      'wasm-unsafe-eval',
    ];
    return unquotedKeywords.includes(val.toLowerCase());
  }
}
