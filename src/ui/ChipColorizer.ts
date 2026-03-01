import type { ChipColor, IChipColorizer } from '../core/types';

/**
 * Known URI scheme sources in CSP.
 */
const SCHEME_SOURCES = [
  'data:',
  'blob:',
  'filesystem:',
  'mediastream:',
  'ws:',
  'wss:',
  'http:',
  'https:',
];

/**
 * Determines the visual color/category for CSP value chips.
 *
 * Single Responsibility: only classifies CSP values into visual categories.
 */
export class ChipColorizer implements IChipColorizer {
  /**
   * Get the chip color classification for a CSP value.
   *
   * @param value - The CSP value string (e.g., "'self'", "data:", "*.google.com").
   * @returns ChipColor with CSS classes and category.
   */
  getColor(value: string): ChipColor {
    // Keywords wrapped in single quotes -> Purple
    if (value.startsWith("'") && value.endsWith("'")) {
      return {
        classes:
          'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
        category: 'keyword',
      };
    }

    // Scheme sources -> Amber
    if (
      SCHEME_SOURCES.some((schema) => value === schema) ||
      value.startsWith('data:') ||
      value.startsWith('blob:')
    ) {
      return {
        classes:
          'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
        category: 'scheme',
      };
    }

    // URLs, domains, wildcards -> Blue
    return {
      classes:
        'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
      category: 'domain',
    };
  }
}
