import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioDocument, designFromDocument, layoutFitsCanvas, readStudioDocument } from '../src/features/designStudio/document/migrations.js';
import { STUDIO_SCHEMA_VERSION } from '../src/features/designStudio/document/types.js';
import { preflightDesign } from '../src/features/designStudio/export/preflight.js';
import type { FixedElementLayout, QrTemplateDefinition, StudioDesign } from '../src/features/qrStudio/types.js';

const template: QrTemplateDefinition = {
  id: 'test-card', index: 1, label: 'Test card', category: 'contact', categoryLabel: 'Contact',
  tags: ['test'], format: 'landscape', file: 'test.svg', canvas: { width: 1200, height: 700 },
  ratio: '12:7', defaultTheme: 'light', merchantType: 'Maker',
  defaultCopy: { eyebrow: 'HELLO', headline: 'Meet the maker', descriptor: 'Work and process', cta: 'EXPLORE' },
  sampleDestination: 'https://pksh.in/test', qr: { x: 0.72, y: 0.18, size: 0.34 },
};

const layout: FixedElementLayout = {
  qr: { x: 780, y: 145, w: 410, h: 410 },
  copy: { x: 72, y: 110, w: 620, h: 330 },
  merchant: { x: 72, y: 615, w: 240, h: 32 },
  brandmark: { x: 1020, y: 620, w: 120, h: 24 },
};

const design: StudioDesign = {
  name: 'Maker contact card', libraryTemplateId: 'test-card', manifestVersion: '3.1.0',
  qrStyle: 'obsidian-ring', theme: 'light', widthMm: 120, heightMm: 70,
  merchantName: 'Noor Ceramics', eyebrow: 'CREATIVE CONTACT', headline: 'Take my work with you.',
  descriptor: 'Portfolio · commissions · studio visits', cta: 'SCAN MY PORTFOLIO',
  destination: 'https://pksh.in/noor', revision: 3, variables: { collection: 'Monsoon' },
};

test('preflight accepts an approved HTTPS destination and print-safe QR', () => {
  const report = preflightDesign(design, template, layout);
  assert.equal(report.canExport, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.qrSizeMm, 41);
  assert.equal(report.warnings.some((check) => check.id === 'decode'), true);
});

test('preflight blocks unowned hosts, undersized QR fields, and clipping', () => {
  const unsafe = { ...design, destination: 'https://example.com/menu', widthMm: 40 };
  const clipped = { ...layout, qr: { x: 1160, y: 145, w: 100, h: 100 } };
  const report = preflightDesign(unsafe, template, clipped);
  assert.equal(report.canExport, false);
  assert.deepEqual(report.errors.map((check) => check.id), ['host', 'physical-size', 'bounds']);
});

test('preflight blocks placeholder mappings and unsafe QR color contrast', () => {
  const placeholder = { ...design, destination: 'https://pksh.in/your-link' };
  assert.equal(preflightDesign(placeholder, template, layout).errors.some((check) => check.id === 'mapping'), true);

  const lowContrast = { ...design, qrColors: { foreground: '#777777', background: '#888888', accent: '#BB9057', transparent: false } };
  assert.equal(preflightDesign(lowContrast, template, layout).errors.some((check) => check.id === 'contrast'), true);
});

test('the versioned document round-trips copy, layout, variables, and revision', () => {
  const document = createStudioDocument(design, layout);
  assert.equal(document.schemaVersion, STUDIO_SCHEMA_VERSION);
  assert.equal(document.revision, 3);
  assert.deepEqual(document.pages[0].safeArea, { top: 4, right: 4, bottom: 4, left: 4 });
  assert.deepEqual(document.pages[0].bleed, { top: 3, right: 3, bottom: 3, left: 3 });
  assert.deepEqual(designFromDocument(document), {
    name: design.name,
    libraryTemplateId: design.libraryTemplateId,
    manifestVersion: design.manifestVersion,
    schemaVersion: STUDIO_SCHEMA_VERSION,
    revision: design.revision,
    qrStyle: design.qrStyle,
    theme: design.theme,
    widthMm: design.widthMm,
    heightMm: design.heightMm,
    displayUnit: 'mm',
    grid: undefined,
    qrColors: undefined,
    background: undefined,
    typography: undefined,
    visibility: undefined,
    customTemplate: undefined,
    layout,
    canvasElements: [],
    variables: design.variables,
    merchantName: design.merchantName,
    eyebrow: design.eyebrow,
    headline: design.headline,
    descriptor: design.descriptor,
    cta: design.cta,
    destination: design.destination,
  });
});

test('unknown or incomplete document schemas are rejected', () => {
  assert.equal(readStudioDocument(null), null);
  assert.equal(readStudioDocument({ schemaVersion: '9.0.0', pages: [{}] }), null);
  assert.equal(readStudioDocument({ schemaVersion: STUDIO_SCHEMA_VERSION, pages: [] }), null);
});

test('fixed layouts from another canvas coordinate system are rejected', () => {
  assert.equal(layoutFitsCanvas(layout, 1200, 700), true);
  assert.equal(layoutFitsCanvas(layout, 1200, 500), false);
  assert.equal(layoutFitsCanvas({ ...layout, qr: { ...layout.qr, w: -10 } }, 1200, 700), false);
});
