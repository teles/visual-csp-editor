import type { CspDirectives, ICspParser } from './types';

/**
 * Parses raw CSP strings into structured directive data.
 * Handles common edge cases like HTTP header prefixes.
 *
 * Single Responsibility: only converts CSP text to CspDirectives.
 */
export class CspParser implements ICspParser {
  /**
   * Parse a raw CSP string into a record of directives and their values.
   *
   * @param raw - The raw CSP string, possibly with HTTP header prefix.
   * @returns A record mapping directive names to arrays of values.
   */
  parse(raw: string): CspDirectives {
    const directives: CspDirectives = {};

    // Strip HTTP header prefix if present (e.g., from curl/devtools copy)
    const cleaned = raw.replace(
      /^content-security-policy(-report-only)?:\s*/i,
      ''
    );

    const policies = cleaned
      .split(';')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    for (const policy of policies) {
      const parts = policy.split(/\s+/).filter((p) => p.length > 0);
      if (parts.length > 0) {
        const name = parts.shift()!.toLowerCase();
        directives[name] = parts;
      }
    }

    return directives;
  }
}
