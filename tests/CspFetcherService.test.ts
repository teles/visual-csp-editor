import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CspFetcherService } from '../src/services/CspFetcherService';

describe('CspFetcherService', () => {
  let service: CspFetcherService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new CspFetcherService();
    fetchMock = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.fetch = fetchMock as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error for invalid URL format', async () => {
    const result = await service.fetchCsp('not-a-valid-url');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid URL format');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should successfully fetch CSP from valid URL', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        status: {
          http_code: 200,
          response_headers: {
            'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'",
          },
        },
        contents: 'page content',
      }),
    };
    fetchMock.mockResolvedValue(mockResponse);

    const result = await service.fetchCsp('https://example.com');

    expect(result.success).toBe(true);
    expect(result.csp).toBe("default-src 'self'; script-src 'unsafe-inline'");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://api.allorigins.win/get?url='),
      expect.any(Object)
    );
  });

  it('should handle Content-Security-Policy-Report-Only header', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        status: {
          http_code: 200,
          response_headers: {
            'Content-Security-Policy-Report-Only': "default-src 'none'",
          },
        },
        contents: 'page content',
      }),
    };
    fetchMock.mockResolvedValue(mockResponse);

    const result = await service.fetchCsp('https://example.com');

    expect(result.success).toBe(true);
    expect(result.csp).toBe("default-src 'none'");
  });

  it('should return error when no CSP header found', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        status: {
          http_code: 200,
          response_headers: {
            'Content-Type': 'text/html',
          },
        },
        contents: 'page content',
      }),
    };
    fetchMock.mockResolvedValue(mockResponse);

    const result = await service.fetchCsp('https://example.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('No CSP header found on target site');
  });

  it('should handle HTTP error from proxy', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    };
    fetchMock.mockResolvedValue(mockResponse);

    const result = await service.fetchCsp('https://example.com');

    expect(result.success).toBe(false);
    expect(result.error).toContain('HTTP 500');
  });

  it('should handle target site returning 404', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        status: {
          http_code: 404,
        },
        contents: '',
      }),
    };
    fetchMock.mockResolvedValue(mockResponse);

    const result = await service.fetchCsp('https://example.com/notfound');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Target site returned HTTP 404');
  });

  it('should handle network errors', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    const result = await service.fetchCsp('https://example.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should handle timeout errors', async () => {
    fetchMock.mockImplementation(() => {
      return new Promise((_, reject) => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        setTimeout(() => reject(error), 100);
      });
    });

    const result = await service.fetchCsp('https://example.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Request timeout (10s)');
  });

  it('should be case-insensitive for CSP header names', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        status: {
          http_code: 200,
          response_headers: {
            'content-security-policy': "default-src 'self'",
          },
        },
        contents: 'page content',
      }),
    };
    fetchMock.mockResolvedValue(mockResponse);

    const result = await service.fetchCsp('https://example.com');

    expect(result.success).toBe(true);
    expect(result.csp).toBe("default-src 'self'");
  });

  it('should handle invalid proxy response format', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        // Missing status field
        contents: 'page content',
      }),
    };
    fetchMock.mockResolvedValue(mockResponse);

    const result = await service.fetchCsp('https://example.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid proxy response format');
  });
});
