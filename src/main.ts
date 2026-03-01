import Alpine from 'alpinejs';
import { CspParser, CspGenerator, CspSecurityEvaluator, CspValidator } from './core';
import { CspTemplateService } from './core/CspTemplates';
import { UrlStateManager, ClipboardService, CspFetcherService } from './services';
import { EditorApp, ChipColorizer } from './ui';

import './style.css';

// Wire up dependencies (Dependency Inversion Principle)
const parser = new CspParser();
const generator = new CspGenerator();
const evaluator = new CspSecurityEvaluator();
const urlState = new UrlStateManager();
const clipboard = new ClipboardService();
const colorizer = new ChipColorizer();
const validator = new CspValidator();
const templateService = new CspTemplateService();
const fetcher = new CspFetcherService();

const editorApp = new EditorApp(
  parser,
  generator,
  evaluator,
  urlState,
  clipboard,
  colorizer,
  validator,
  templateService,
  fetcher
);

// Register Alpine.js component
Alpine.data('cspEditor', () => editorApp.createAlpineData());

// Start Alpine
Alpine.start();
