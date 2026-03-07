import { deflate, inflate } from 'pako';
import type { EditorState, IUrlStateManager, StatePayload } from '../core/types';

/**
 * Manages editor state persistence via URL hash using compression.
 * Uses pako (zlib) for compression and URL-safe Base64 encoding.
 * Also persists state to localStorage for recovery when URL is lost.
 *
 * Single Responsibility: serialization/deserialization of state to URL and localStorage.
 * Dependency Inversion: depends on the IUrlStateManager abstraction.
 */
export class UrlStateManager implements IUrlStateManager {
  private readonly STORAGE_KEY = 'visual-csp-editor-state';

  /**
   * Compress and save the current editor state to the URL hash and localStorage.
   */
  save(state: EditorState): void {
    const cspText = this.buildCspText(state);

    if (!cspText && !state.projectName && !state.projectUrl) {
      window.history.replaceState(null, '', window.location.pathname);
      localStorage.removeItem(this.STORAGE_KEY);
      return;
    }

    const payload: StatePayload = {
      n: state.projectName,
      u: state.projectUrl,
      c: cspText,
    };

    const json = JSON.stringify(payload);
    const utf8Arr = new TextEncoder().encode(json);
    const compressed = deflate(utf8Arr);

    let binary = '';
    compressed.forEach((b) => (binary += String.fromCharCode(b)));

    const base64 = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    window.history.replaceState(null, '', '#' + base64);
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem(this.STORAGE_KEY, json);
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  /**
   * Load editor state from the URL hash (priority) or localStorage (fallback).
   * Returns null if no valid state is found.
   */
  load(): EditorState | null {
    const hash = window.location.hash.substring(1);
    
    // Priority 1: Load from URL hash if present
    if (hash) {
      const urlState = this.loadFromUrl(hash);
      if (urlState) {
        // Update localStorage with the URL state
        try {
          const payload: StatePayload = {
            n: urlState.projectName,
            u: urlState.projectUrl,
            c: urlState.rawCsp,
          };
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
          console.warn('Could not save to localStorage:', e);
        }
        return urlState;
      }
    }
    
    // Priority 2: Load from localStorage if no URL hash
    return this.loadFromStorage();
  }

  /**
   * Load editor state from URL hash.
   */
  private loadFromUrl(hash: string): EditorState | null {

    try {
      let str = hash.replace(/-/g, '+').replace(/_/g, '/');
      while (str.length % 4) str += '=';

      const binary = atob(str);
      const compressed = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        compressed[i] = binary.charCodeAt(i);
      }

      const utf8Arr = inflate(compressed);
      const decodedText = new TextDecoder().decode(utf8Arr);

      let rawCsp = '';
      let projectName = '';
      let projectUrl = '';

      try {
        // JSON format (v4+)
        const data: StatePayload = JSON.parse(decodedText);
        projectName = data.n || '';
        projectUrl = data.u || '';
        rawCsp = data.c || '';
      } catch {
        // Fallback: raw CSP string (v3 format)
        rawCsp = decodedText;
      }

      return {
        directives: {},
        projectName,
        projectUrl,
        rawCsp,
      };
    } catch (e) {
      console.error('Invalid compressed URL state.', e);
      window.history.replaceState(null, '', window.location.pathname);
      return null;
    }
  }

  /**
   * Load editor state from localStorage.
   */
  private loadFromStorage(): EditorState | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const data: StatePayload = JSON.parse(stored);
      
      return {
        directives: {},
        projectName: data.n || '',
        projectUrl: data.u || '',
        rawCsp: data.c || '',
      };
    } catch (e) {
      console.warn('Could not load from localStorage:', e);
      localStorage.removeItem(this.STORAGE_KEY);
      return null;
    }
  }

  /**
   * Build CSP text from state directives.
   * This is a simple helper to avoid circular deps.
   */
  private buildCspText(state: EditorState): string {
    const entries = Object.entries(state.directives);
    if (entries.length === 0) return '';

    const generated = entries
      .map(([name, values]) =>
        values.length > 0 ? `${name} ${values.join(' ')}` : name
      )
      .join('; ');

    return generated + ';';
  }
}
