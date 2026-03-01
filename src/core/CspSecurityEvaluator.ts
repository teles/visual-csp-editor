import { CspEvaluator as GoogleCspEvaluator, DEFAULT_CHECKS } from 'csp_evaluator/dist/evaluator';
import { CspParser as GoogleCspParser } from 'csp_evaluator/dist/parser';
import { Severity } from 'csp_evaluator/dist/finding';
import type { EvaluationFinding, ICspEvaluator } from './types';

/**
 * Wraps Google's CSP Evaluator library to provide security analysis.
 *
 * Single Responsibility: only handles security evaluation of CSP strings.
 * Open/Closed: new check categories can be added without modifying this class.
 */
export class CspSecurityEvaluator implements ICspEvaluator {
  /**
   * Evaluate a CSP string for known security issues.
   *
   * @param cspText - A valid CSP string to analyze.
   * @returns An array of findings with severity and description.
   */
  evaluate(cspText: string): EvaluationFinding[] {
    if (!cspText.trim()) return [];

    try {
      const parsed = new GoogleCspParser(cspText).csp;
      const evaluator = new GoogleCspEvaluator(parsed);
      const findings = evaluator.evaluate(undefined, DEFAULT_CHECKS);

      return findings.map((f) => ({
        directive: f.directive,
        description: f.description,
        severity: f.severity,
        severityLabel: this.getSeverityLabel(f.severity),
        value: f.value,
      }));
    } catch {
      return [];
    }
  }

  private getSeverityLabel(severity: Severity): string {
    switch (severity) {
      case Severity.HIGH:
        return 'High';
      case Severity.MEDIUM:
        return 'Medium';
      case Severity.HIGH_MAYBE:
        return 'High (Possible)';
      case Severity.MEDIUM_MAYBE:
        return 'Medium (Possible)';
      case Severity.INFO:
        return 'Info';
      case Severity.SYNTAX:
        return 'Syntax';
      case Severity.STRICT_CSP:
        return 'Strict CSP';
      case Severity.NONE:
        return 'None';
      default:
        return 'Unknown';
    }
  }
}
