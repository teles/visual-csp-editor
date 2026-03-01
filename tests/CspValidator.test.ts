import { describe, it, expect } from 'vitest';
import { CspValidator } from '../src/core/CspValidator';

describe('CspValidator', () => {
  const validator = new CspValidator();

  describe('validateDirective', () => {
    it('should accept known CSP directives', () => {
      const result = validator.validateDirective('default-src');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should accept script-src', () => {
      expect(validator.validateDirective('script-src').warning).toBeUndefined();
    });

    it('should accept sandbox', () => {
      expect(validator.validateDirective('sandbox').warning).toBeUndefined();
    });

    it('should warn on unknown directive names', () => {
      const result = validator.validateDirective('batatinha');
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('not a standard CSP directive');
    });

    it('should reject empty directive names', () => {
      const result = validator.validateDirective('');
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('empty');
    });

    it('should reject directives with invalid characters', () => {
      const result = validator.validateDirective('my directive!');
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('invalid characters');
    });

    it('should reject directives starting with numbers', () => {
      const result = validator.validateDirective('123-src');
      expect(result.valid).toBe(false);
    });

    it('should normalize to lowercase', () => {
      const result = validator.validateDirective('Default-Src');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('validateValue - keywords', () => {
    it("should accept 'self'", () => {
      const result = validator.validateValue("'self'", 'default-src');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it("should accept 'unsafe-inline'", () => {
      const result = validator.validateValue("'unsafe-inline'", 'script-src');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it("should accept 'none'", () => {
      const result = validator.validateValue("'none'", 'default-src');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it("should accept 'strict-dynamic'", () => {
      const result = validator.validateValue("'strict-dynamic'", 'script-src');
      expect(result.valid).toBe(true);
    });

    it("should warn on unknown quoted keyword", () => {
      const result = validator.validateValue("'banana'", 'script-src');
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('not a recognized CSP keyword');
    });
  });

  describe('validateValue - nonces', () => {
    it("should accept valid nonces", () => {
      const result = validator.validateValue("'nonce-abc123def456'", 'script-src');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it("should accept nonce with base64 padding", () => {
      const result = validator.validateValue("'nonce-abc123=='", 'script-src');
      expect(result.valid).toBe(true);
    });

    it("should reject nonce with spaces (spaces not allowed in values)", () => {
      const result = validator.validateValue("'nonce-abc 123'", 'script-src');
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('one at a time');
    });
  });

  describe('validateValue - hashes', () => {
    it("should accept sha256 hashes", () => {
      const result = validator.validateValue("'sha256-abcdef1234567890'", 'script-src');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it("should accept sha384 hashes", () => {
      const result = validator.validateValue("'sha384-xyz123'", 'script-src');
      expect(result.valid).toBe(true);
    });

    it("should accept sha512 hashes", () => {
      const result = validator.validateValue("'sha512-longHash+/base64='", 'script-src');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateValue - scheme sources', () => {
    it('should accept data:', () => {
      const result = validator.validateValue('data:', 'img-src');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should accept https:', () => {
      const result = validator.validateValue('https:', 'default-src');
      expect(result.valid).toBe(true);
    });

    it('should accept blob:', () => {
      const result = validator.validateValue('blob:', 'worker-src');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateValue - host sources', () => {
    it('should accept bare domains', () => {
      const result = validator.validateValue('example.com', 'script-src');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should accept wildcard subdomains', () => {
      const result = validator.validateValue('*.example.com', 'script-src');
      expect(result.valid).toBe(true);
    });

    it('should accept URLs with scheme', () => {
      const result = validator.validateValue('https://cdn.example.com', 'script-src');
      expect(result.valid).toBe(true);
    });

    it('should accept URLs with path', () => {
      const result = validator.validateValue('https://cdn.example.com/js/', 'script-src');
      expect(result.valid).toBe(true);
    });

    it('should accept domains with ports', () => {
      const result = validator.validateValue('example.com:8080', 'connect-src');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateValue - wildcard', () => {
    it('should accept standalone wildcard *', () => {
      const result = validator.validateValue('*', 'default-src');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('validateValue - invalid values', () => {
    it('should reject empty values', () => {
      const result = validator.validateValue('', 'script-src');
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('empty');
    });

    it('should reject values with spaces', () => {
      const result = validator.validateValue('quando nasce', 'script-src');
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('one at a time');
    });

    it('should reject unquoted keywords', () => {
      const result = validator.validateValue('unsafe-inline', 'script-src');
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('missing quotes');
    });

    it('should reject single-word gibberish values', () => {
      const result = validator.validateValue('asd', 'script-src');
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('not a valid CSP value');
    });

    it('should reject gibberish values with special chars', () => {
      const result = validator.validateValue('chão', 'script-src');
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('not a valid CSP value');
    });

    it('should accept localhost as special case', () => {
      const result = validator.validateValue('localhost', 'connect-src');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('validateValue - sandbox flags', () => {
    it('should accept known sandbox flags', () => {
      const result = validator.validateValue('allow-scripts', 'sandbox');
      expect(result.valid).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should accept allow-forms', () => {
      const result = validator.validateValue('allow-forms', 'sandbox');
      expect(result.valid).toBe(true);
    });

    it('should warn on unknown sandbox flag', () => {
      const result = validator.validateValue('allow-banana', 'sandbox');
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('not a recognized sandbox flag');
    });
  });

  describe('validateValue - boolean directives', () => {
    it('should warn when adding values to upgrade-insecure-requests', () => {
      const result = validator.validateValue("'self'", 'upgrade-insecure-requests');
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('boolean directive');
    });

    it('should warn when adding values to block-all-mixed-content', () => {
      const result = validator.validateValue('*', 'block-all-mixed-content');
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('boolean directive');
    });
  });
});
