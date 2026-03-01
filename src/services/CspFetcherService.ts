import type { ICspFetcher, CspFetchResult } from '../core/types';

/**
 * Fetches CSP headers from external URLs using a CORS proxy.
 * Uses allorigins.win as a public CORS proxy service.
 *
 * Single Responsibility: handles remote CSP retrieval via proxy.
 * Dependency Inversion: depends on the ICspFetcher abstraction.
 */
export class CspFetcherService implements ICspFetcher {
  private readonly PROXY_URL = 'https://api.allorigins.win/get';
  private readonly TIMEOUT_MS = 10000; // 10 seconds

  /**
   * Fetches the CSP header from a given URL using a CORS proxy.
   * @param url - The target URL to fetch CSP from
   * @returns Promise with the fetch result
   */
  async fetchCsp(url: string): Promise<CspFetchResult> {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return {
        success: false,
        error: 'Invalid URL format',
      };
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      // Use allorigins proxy to bypass CORS
      const proxyUrl = `${this.PROXY_URL}?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      
      // allorigins returns the response in { status, contents } format
      if (!data.status || !data.status.http_code) {
        return {
          success: false,
          error: 'Invalid proxy response format',
        };
      }

      // Check if target site returned error
      if (data.status.http_code >= 400) {
        return {
          success: false,
          error: `Target site returned HTTP ${data.status.http_code}`,
        };
      }

      // Extract CSP headers from response headers
      // allorigins provides response headers in status.response_headers
      const headers = data.status.response_headers || {};
      
      // Check for CSP header (case-insensitive)
      let cspHeader: string | undefined;
      for (const [key, value] of Object.entries(headers)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'content-security-policy' || lowerKey === 'content-security-policy-report-only') {
          cspHeader = String(value);
          break;
        }
      }

      if (!cspHeader) {
        return {
          success: false,
          error: 'No CSP header found on target site',
        };
      }

      return {
        success: true,
        csp: cspHeader,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout (10s)',
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }
      
      return {
        success: false,
        error: 'Unknown error occurred',
      };
    }
  }
}
