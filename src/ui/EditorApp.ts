import type {
  CspDirectives,
  EvaluationFinding,
  IChipColorizer,
  IClipboardService,
  ICspEvaluator,
  ICspGenerator,
  ICspParser,
  IUrlStateManager,
} from '../core/types';
import { CSP_KEYWORDS } from '../core/types';

/**
 * Main Alpine.js component for the Visual CSP Editor.
 *
 * Dependency Inversion: all dependencies are injected via constructor,
 * making this component testable and decoupled from implementations.
 *
 * Single Responsibility: orchestrates the UI state and user interactions.
 * All heavy logic is delegated to injected services.
 */
export class EditorApp {
  constructor(
    private parser: ICspParser,
    private generator: ICspGenerator,
    private evaluator: ICspEvaluator,
    private urlState: IUrlStateManager,
    private clipboard: IClipboardService,
    private colorizer: IChipColorizer
  ) {}

  /**
   * Creates the Alpine.js data object for x-data binding.
   */
  createAlpineData() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const app = this;

    return {
      // State
      rawCsp: '',
      directives: {} as CspDirectives,
      newDirectiveName: '',
      copyText: 'Copy CSP Text',
      shareText: 'Copy Shareable Link',
      projectName: '',
      projectUrl: '',
      findings: [] as EvaluationFinding[],
      darkMode: false,

      // Alpine lifecycle
      init() {
        // Dark mode: check localStorage, then system preference
        const stored = localStorage.getItem('darkMode');
        if (stored !== null) {
          this.darkMode = stored === 'true';
        } else if (typeof window.matchMedia === 'function') {
          this.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        this.applyDarkMode();

        const state = app.urlState.load();
        if (state) {
          this.projectName = state.projectName;
          this.projectUrl = state.projectUrl;
          this.rawCsp = state.rawCsp;
          if (this.rawCsp) {
            this.parseCsp();
          }
        }
      },

      toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', String(this.darkMode));
        this.applyDarkMode();
      },

      applyDarkMode() {
        document.documentElement.classList.toggle('dark', this.darkMode);
      },

      // --- URL State ---
      updateUrl() {
        app.urlState.save({
          directives: this.directives,
          projectName: this.projectName,
          projectUrl: this.projectUrl,
          rawCsp: this.rawCsp,
        });
        this.evaluateFindings();
      },

      // --- CSP Logic ---
      parseCsp() {
        this.directives = app.parser.parse(this.rawCsp);
        this.updateUrl();
      },

      generateCsp(): string {
        return app.generator.generate(this.directives);
      },

      addValue(directive: string, event: KeyboardEvent) {
        event.preventDefault();
        const input = event.target as HTMLInputElement;
        let val = input.value.trim();

        // Auto-quote known keywords
        if (CSP_KEYWORDS.includes(val.toLowerCase() as typeof CSP_KEYWORDS[number])) {
          val = `'${val.toLowerCase()}'`;
        }

        if (val && !this.directives[directive].includes(val)) {
          this.directives[directive].push(val);
          this.updateUrl();
        }
        input.value = '';
      },

      removeValue(directive: string, index: number) {
        this.directives[directive].splice(index, 1);
        this.updateUrl();
      },

      addDirective() {
        const name = this.newDirectiveName.trim().toLowerCase();
        if (name && !this.directives[name]) {
          this.directives[name] = [];
          this.updateUrl();
        }
        this.newDirectiveName = '';
      },

      removeDirective(directive: string) {
        delete this.directives[directive];
        this.updateUrl();
      },

      resetEditor() {
        this.directives = {};
        this.rawCsp = '';
        this.projectName = '';
        this.projectUrl = '';
        this.findings = [];
        this.updateUrl();
      },

      // --- Clipboard ---
      async copyToClipboard() {
        const success = await app.clipboard.copyText(this.generateCsp());
        if (success) {
          this.copyText = 'Copied! ✓';
          setTimeout(() => (this.copyText = 'Copy CSP Text'), 2000);
        }
      },

      async copyShareLink() {
        const success = await app.clipboard.copyText(window.location.href);
        if (success) {
          this.shareText = 'Link Copied! 🔗';
          setTimeout(() => (this.shareText = 'Copy Shareable Link'), 2000);
        }
      },

      // --- Visual ---
      getChipColor(val: string): string {
        return app.colorizer.getColor(val).classes;
      },

      // --- Security Evaluation ---
      evaluateFindings() {
        const csp = this.generateCsp();
        this.findings = app.evaluator.evaluate(csp);
      },

      getSeverityColor(finding: EvaluationFinding): string {
        switch (finding.severityLabel) {
          case 'High':
            return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
          case 'Medium':
            return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
          case 'High (Possible)':
            return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
          case 'Medium (Possible)':
            return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
          case 'Syntax':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
          case 'Info':
            return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
          default:
            return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
        }
      },
    };
  }
}
