import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CspReportExporter } from '../src/services/CspReportExporter';
import type { ReportData } from '../src/core/types';
import { Severity } from 'csp_evaluator/dist/finding';

describe('CspReportExporter', () => {
  let exporter: CspReportExporter;
  let mockReportData: ReportData;

  beforeEach(() => {
    exporter = new CspReportExporter();

    mockReportData = {
      projectName: 'My App',
      projectUrl: 'https://myapp.com',
      generatedAt: '2026-02-28T12:00:00Z',
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://cdn.example.com'],
        'style-src': ["'self'", "'unsafe-inline'"],
      },
      findings: [
        {
          directive: 'script-src',
          description: "'unsafe-inline' allows execution of unsafe in-page scripts",
          severity: Severity.HIGH,
          severityLabel: 'High',
        },
        {
          directive: 'style-src',
          description: "'unsafe-inline' allows execution of unsafe styles",
          severity: Severity.MEDIUM,
          severityLabel: 'Medium',
        },
      ],
      rawCsp: "default-src 'self'; script-src 'self' https://cdn.example.com; style-src 'self' 'unsafe-inline';",
    };
  });

  describe('exportAsMarkdown', () => {
    it('should generate a markdown report with all sections', () => {
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).toContain('# CSP Report: My App');
      expect(markdown).toContain('**URL:** https://myapp.com');
      expect(markdown).toContain('**Generated:** February 28, 2026');
      expect(markdown).toContain('## Directives (3)');
      expect(markdown).toContain('## Security Findings (2)');
      expect(markdown).toContain('## Raw CSP');
    });

    it('should format directives as a table', () => {
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).toContain('| Directive | Values |');
      expect(markdown).toContain('|-----------|--------|');
      expect(markdown).toContain("| default-src | 'self' |");
      expect(markdown).toContain("| script-src | 'self' https://cdn.example.com |");
      expect(markdown).toContain("| style-src | 'self' 'unsafe-inline' |");
    });

    it('should format security findings as a table with severity icons', () => {
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).toContain('| Severity | Directive | Description |');
      expect(markdown).toContain('| 🔴 High | script-src |');
      expect(markdown).toContain('| 🟡 Medium | style-src |');
      expect(markdown).toContain("'unsafe-inline' allows execution of unsafe in-page scripts");
    });

    it('should include raw CSP in a code block', () => {
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).toContain('## Raw CSP');
      expect(markdown).toContain('```');
      expect(markdown).toContain(mockReportData.rawCsp);
    });

    it('should handle empty project name', () => {
      mockReportData.projectName = '';
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).toContain('# CSP Report');
      expect(markdown).not.toContain('# CSP Report:');
    });

    it('should handle missing project URL', () => {
      mockReportData.projectUrl = '';
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).not.toContain('**URL:**');
    });

    it('should handle empty directives', () => {
      mockReportData.directives = {};
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).toContain('## Directives (0)');
      expect(markdown).toContain('_No directives defined._');
    });

    it('should handle directives with no values', () => {
      mockReportData.directives = {
        'upgrade-insecure-requests': [],
      };
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).toContain('| upgrade-insecure-requests | (no values) |');
    });

    it('should handle empty findings', () => {
      mockReportData.findings = [];
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).toContain('## Security Findings (0)');
      expect(markdown).toContain('✅ _No security issues detected._');
    });

    it('should handle empty raw CSP', () => {
      mockReportData.rawCsp = '';
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).toContain('## Raw CSP');
      expect(markdown).toContain('(empty)');
    });

    it('should escape pipe characters in directive values', () => {
      mockReportData.directives = {
        'script-src': ['value|with|pipes'],
      };
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).toContain('value\\|with\\|pipes');
    });

    it('should escape pipe characters in finding descriptions', () => {
      mockReportData.findings = [
        {
          directive: 'test',
          description: 'Description | with | pipes',
          severity: Severity.HIGH,
          severityLabel: 'High',
        },
      ];
      const markdown = exporter.exportAsMarkdown(mockReportData);

      expect(markdown).toContain('Description \\| with \\| pipes');
    });
  });

  describe('exportAsJson', () => {
    it('should generate valid JSON', () => {
      const json = exporter.exportAsJson(mockReportData);
      const parsed = JSON.parse(json);

      expect(parsed).toBeDefined();
      expect(parsed.project).toBeDefined();
      expect(parsed.directives).toBeDefined();
      expect(parsed.findings).toBeDefined();
      expect(parsed.rawCsp).toBeDefined();
    });

    it('should include project details', () => {
      const json = exporter.exportAsJson(mockReportData);
      const parsed = JSON.parse(json);

      expect(parsed.project.name).toBe('My App');
      expect(parsed.project.url).toBe('https://myapp.com');
      expect(parsed.generatedAt).toBe('2026-02-28T12:00:00Z');
    });

    it('should include directives object', () => {
      const json = exporter.exportAsJson(mockReportData);
      const parsed = JSON.parse(json);

      expect(parsed.directives['default-src']).toEqual(["'self'"]);
      expect(parsed.directives['script-src']).toEqual(["'self'", 'https://cdn.example.com']);
      expect(parsed.directives['style-src']).toEqual(["'self'", "'unsafe-inline'"]);
    });

    it('should include findings with cleaned structure', () => {
      const json = exporter.exportAsJson(mockReportData);
      const parsed = JSON.parse(json);

      expect(parsed.findings).toHaveLength(2);
      expect(parsed.findings[0]).toEqual({
        severity: 'High',
        directive: 'script-src',
        description: "'unsafe-inline' allows execution of unsafe in-page scripts",
        value: undefined,
      });
    });

    it('should include raw CSP', () => {
      const json = exporter.exportAsJson(mockReportData);
      const parsed = JSON.parse(json);

      expect(parsed.rawCsp).toBe(mockReportData.rawCsp);
    });

    it('should handle empty project name', () => {
      mockReportData.projectName = '';
      const json = exporter.exportAsJson(mockReportData);
      const parsed = JSON.parse(json);

      expect(parsed.project.name).toBe('');
    });

    it('should handle empty directives', () => {
      mockReportData.directives = {};
      const json = exporter.exportAsJson(mockReportData);
      const parsed = JSON.parse(json);

      expect(parsed.directives).toEqual({});
    });

    it('should handle empty findings', () => {
      mockReportData.findings = [];
      const json = exporter.exportAsJson(mockReportData);
      const parsed = JSON.parse(json);

      expect(parsed.findings).toEqual([]);
    });

    it('should be pretty-printed with 2-space indentation', () => {
      const json = exporter.exportAsJson(mockReportData);
      
      // Check for pretty-printing by looking for newlines and indentation
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('downloadMarkdown', () => {
    it('should trigger download with correct filename and content', () => {
      // Mock DOM methods
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      let clickCalled = false;
      createElementSpy.mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          element.click = () => {
            clickCalled = true;
          };
        }
        return element;
      });

      exporter.downloadMarkdown(mockReportData);

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickCalled).toBe(true);
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

      // Cleanup
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('downloadJson', () => {
    it('should trigger download with correct filename and content', () => {
      // Mock DOM methods
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      let clickCalled = false;
      createElementSpy.mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          element.click = () => {
            clickCalled = true;
          };
        }
        return element;
      });

      exporter.downloadJson(mockReportData);

      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickCalled).toBe(true);
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

      // Cleanup
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('filename generation', () => {
    it('should generate filename with project name and date', () => {
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement');
      const _appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const _removeChildSpy = vi.spyOn(document.body, 'removeChild');
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL');

      let downloadFilename = '';
      createElementSpy.mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          Object.defineProperty(element, 'download', {
            set: (value: string) => {
              downloadFilename = value;
            },
            get: () => downloadFilename,
          });
          element.click = vi.fn();
        }
        return element;
      });

      exporter.downloadMarkdown(mockReportData);

      expect(downloadFilename).toMatch(/^my-app-\d{4}-\d{2}-\d{2}\.md$/);

      // Cleanup
      vi.restoreAllMocks();
    });

    it('should sanitize project name in filename', () => {
      mockReportData.projectName = 'My Cool App! @2024';

      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement');
      vi.spyOn(document.body, 'appendChild');
      vi.spyOn(document.body, 'removeChild');
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL');

      let downloadFilename = '';
      createElementSpy.mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          Object.defineProperty(element, 'download', {
            set: (value: string) => {
              downloadFilename = value;
            },
            get: () => downloadFilename,
          });
          element.click = vi.fn();
        }
        return element;
      });

      exporter.downloadJson(mockReportData);

      expect(downloadFilename).toMatch(/^my-cool-app-2024-\d{4}-\d{2}-\d{2}\.json$/);

      // Cleanup
      vi.restoreAllMocks();
    });

    it('should use default filename when project name is empty', () => {
      mockReportData.projectName = '';

      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement');
      vi.spyOn(document.body, 'appendChild');
      vi.spyOn(document.body, 'removeChild');
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL');

      let downloadFilename = '';
      createElementSpy.mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          Object.defineProperty(element, 'download', {
            set: (value: string) => {
              downloadFilename = value;
            },
            get: () => downloadFilename,
          });
          element.click = vi.fn();
        }
        return element;
      });

      exporter.downloadMarkdown(mockReportData);

      expect(downloadFilename).toMatch(/^csp-report-\d{4}-\d{2}-\d{2}\.md$/);

      // Cleanup
      vi.restoreAllMocks();
    });
  });
});
