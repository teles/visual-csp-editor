import { describe, it, expect } from 'vitest';
import { CspGenerator } from '../src/core/CspGenerator';

describe('CspGenerator', () => {
  const generator = new CspGenerator();

  it('should generate a CSP string from directives', () => {
    const result = generator.generate({
      'default-src': ["'self'"],
      'script-src': ["'self'", 'https://google.com'],
    });
    expect(result).toBe("default-src 'self'; script-src 'self' https://google.com;");
  });

  it('should handle directives with no values', () => {
    const result = generator.generate({
      'upgrade-insecure-requests': [],
      'block-all-mixed-content': [],
    });
    expect(result).toBe('upgrade-insecure-requests; block-all-mixed-content;');
  });

  it('should return empty string for empty directives', () => {
    const result = generator.generate({});
    expect(result).toBe('');
  });

  it('should handle a single directive with multiple values', () => {
    const result = generator.generate({
      'img-src': ["'self'", 'data:', 'https://images.example.com', '*.cdn.com'],
    });
    expect(result).toBe("img-src 'self' data: https://images.example.com *.cdn.com;");
  });

  it('should handle mixed directives (with and without values)', () => {
    const result = generator.generate({
      'default-src': ["'self'"],
      'upgrade-insecure-requests': [],
      'script-src': ['https://cdn.example.com'],
    });
    expect(result).toBe(
      "default-src 'self'; upgrade-insecure-requests; script-src https://cdn.example.com;"
    );
  });

  it('should generate valid CSP with a trailing semicolon', () => {
    const result = generator.generate({ 'default-src': ["'none'"] });
    expect(result.endsWith(';')).toBe(true);
  });
});
