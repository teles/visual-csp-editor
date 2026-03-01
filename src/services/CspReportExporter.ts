import type { ICspReportExporter, ReportData } from '../core/types';

/**
 * Service for exporting CSP reports as Markdown or JSON documents.
 *
 * Single Responsibility: handles report formatting and file download creation.
 */
export class CspReportExporter implements ICspReportExporter {
  /**
   * Exports report data as a formatted Markdown document.
   *
   * @param data - The report data to export.
   * @returns The formatted Markdown string.
   */
  exportAsMarkdown(data: ReportData): string {
    const sections: string[] = [];

    // Header
    sections.push(`# CSP Report${data.projectName ? `: ${data.projectName}` : ''}`);
    sections.push('');

    // Project details
    if (data.projectUrl || data.generatedAt) {
      if (data.projectUrl) {
        sections.push(`**URL:** ${data.projectUrl}`);
      }
      if (data.generatedAt) {
        const date = new Date(data.generatedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        sections.push(`**Generated:** ${date}`);
      }
      sections.push('');
    }

    // Directives table
    const directiveCount = Object.keys(data.directives).length;
    sections.push(`## Directives (${directiveCount})`);
    sections.push('');

    if (directiveCount > 0) {
      sections.push('| Directive | Values |');
      sections.push('|-----------|--------|');

      for (const [directive, values] of Object.entries(data.directives)) {
        const valueStr = values.length > 0 ? values.join(' ') : '(no values)';
        // Escape pipe characters in values
        const escapedValues = valueStr.replace(/\|/g, '\\|');
        sections.push(`| ${directive} | ${escapedValues} |`);
      }
      sections.push('');
    } else {
      sections.push('_No directives defined._');
      sections.push('');
    }

    // Security findings
    const findingsCount = data.findings.length;
    sections.push(`## Security Findings (${findingsCount})`);
    sections.push('');

    if (findingsCount > 0) {
      sections.push('| Severity | Directive | Description |');
      sections.push('|----------|-----------|-------------|');

      for (const finding of data.findings) {
        const severityIcon = this.getSeverityIcon(finding.severityLabel);
        const severity = `${severityIcon} ${finding.severityLabel}`;
        // Escape pipe characters in description
        const escapedDesc = finding.description.replace(/\|/g, '\\|');
        sections.push(`| ${severity} | ${finding.directive} | ${escapedDesc} |`);
      }
      sections.push('');
    } else {
      sections.push('✅ _No security issues detected._');
      sections.push('');
    }

    // Raw CSP
    sections.push('## Raw CSP');
    sections.push('');
    sections.push('```');
    sections.push(data.rawCsp || '(empty)');
    sections.push('```');

    return sections.join('\n');
  }

  /**
   * Exports report data as a JSON document.
   *
   * @param data - The report data to export.
   * @returns The formatted JSON string.
   */
  exportAsJson(data: ReportData): string {
    const jsonData = {
      project: {
        name: data.projectName || '',
        url: data.projectUrl || '',
      },
      generatedAt: data.generatedAt,
      directives: data.directives,
      findings: data.findings.map((f) => ({
        severity: f.severityLabel,
        directive: f.directive,
        description: f.description,
        value: f.value,
      })),
      rawCsp: data.rawCsp,
    };

    return JSON.stringify(jsonData, null, 2);
  }

  /**
   * Triggers a download of the report as a Markdown file.
   *
   * @param data - The report data to export.
   */
  downloadMarkdown(data: ReportData): void {
    const content = this.exportAsMarkdown(data);
    const filename = this.generateFilename(data.projectName, 'md');
    this.triggerDownload(content, filename, 'text/markdown');
  }

  /**
   * Triggers a download of the report as a JSON file.
   *
   * @param data - The report data to export.
   */
  downloadJson(data: ReportData): void {
    const content = this.exportAsJson(data);
    const filename = this.generateFilename(data.projectName, 'json');
    this.triggerDownload(content, filename, 'application/json');
  }

  /**
   * Generates a filename based on project name and current date.
   *
   * @param projectName - Optional project name.
   * @param extension - File extension (without dot).
   * @returns A formatted filename.
   */
  private generateFilename(projectName: string, extension: string): string {
    const sanitizedName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const name = sanitizedName || 'csp-report';
    const date = new Date().toISOString().split('T')[0];
    return `${name}-${date}.${extension}`;
  }

  /**
   * Triggers a file download using Blob and URL.createObjectURL.
   *
   * @param content - The file content.
   * @param filename - The filename for the download.
   * @param mimeType - The MIME type of the file.
   */
  private triggerDownload(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Returns an icon for the severity level.
   *
   * @param severityLabel - The severity label string.
   * @returns An emoji icon representing the severity.
   */
  private getSeverityIcon(severityLabel: string): string {
    switch (severityLabel) {
      case 'High':
      case 'High (Possible)':
        return '🔴';
      case 'Medium':
      case 'Medium (Possible)':
        return '🟡';
      case 'Syntax':
        return '⚠️';
      case 'Info':
        return '🔵';
      default:
        return '⚪';
    }
  }
}
