import type { IClipboardService } from '../core/types';

/**
 * Handles clipboard operations using the Clipboard API.
 *
 * Single Responsibility: only manages clipboard interactions.
 */
export class ClipboardService implements IClipboardService {
  /**
   * Copy text to the clipboard.
   *
   * @param text - The text to copy.
   * @returns true if the copy succeeded, false otherwise.
   */
  async copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
}
