import { describe, it, expect } from 'vitest';
import { CspSecurityEvaluator } from '../src/core/CspSecurityEvaluator';

describe('CspSecurityEvaluator', () => {
  const evaluator = new CspSecurityEvaluator();

  it('should return empty findings for empty CSP', () => {
    const findings = evaluator.evaluate('');
    expect(findings).toEqual([]);
  });

  it('should return empty findings for whitespace-only CSP', () => {
    const findings = evaluator.evaluate('   ');
    expect(findings).toEqual([]);
  });

  it('should detect unsafe-inline in script-src', () => {
    const findings = evaluator.evaluate("script-src 'unsafe-inline';");
    const unsafeInline = findings.find((f) =>
      f.description.toLowerCase().includes('unsafe-inline')
    );
    expect(unsafeInline).toBeDefined();
  });

  it('should detect unsafe-eval in script-src', () => {
    const findings = evaluator.evaluate("script-src 'unsafe-eval';");
    const unsafeEval = findings.find((f) =>
      f.description.toLowerCase().includes('unsafe-eval')
    );
    expect(unsafeEval).toBeDefined();
  });

  it('should detect wildcard usage', () => {
    const findings = evaluator.evaluate('script-src *;');
    const wildcard = findings.find(
      (f) =>
        f.description.toLowerCase().includes('wildcard') ||
        f.description.toLowerCase().includes('*')
    );
    expect(wildcard).toBeDefined();
  });

  it('should detect missing directives', () => {
    const findings = evaluator.evaluate("script-src 'self';");
    const missingDirective = findings.find((f) =>
      f.description.toLowerCase().includes('missing')
    );
    expect(missingDirective).toBeDefined();
  });

  it('should produce findings with severity labels', () => {
    const findings = evaluator.evaluate("script-src 'unsafe-inline' 'unsafe-eval' *;");
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.severityLabel).toBeDefined();
      expect(typeof finding.severityLabel).toBe('string');
      expect(finding.severityLabel.length).toBeGreaterThan(0);
    }
  });

  it('should produce fewer findings for a strict CSP', () => {
    const looseFindings = evaluator.evaluate("script-src 'unsafe-inline' 'unsafe-eval' *;");
    const strictFindings = evaluator.evaluate(
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
    );
    expect(strictFindings.length).toBeLessThan(looseFindings.length);
  });
});
