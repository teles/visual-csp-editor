import type { CspDirectives, ICspGenerator } from './types';

/**
 * Generates CSP strings from structured directive data.
 *
 * Single Responsibility: only converts CspDirectives to CSP text.
 */
export class CspGenerator implements ICspGenerator {
  /**
   * Generate a CSP string from a directives record.
   *
   * @param directives - The structured directives data.
   * @returns A valid CSP string with a trailing semicolon,
   *          or empty string if no directives exist.
   */
  generate(directives: CspDirectives): string {
    const entries = Object.entries(directives);
    if (entries.length === 0) return '';

    const generated = entries
      .map(([name, values]) =>
        values.length > 0 ? `${name} ${values.join(' ')}` : name
      )
      .join('; ');

    return generated + ';';
  }
}
