import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioDocument, designFromDocument, layoutFitsCanvas, readStudioDocument } from '../src/features/designStudio/document/migrations.js';
import { STUDIO_SCHEMA_VERSION } from '../src/features/designStudio/document/types.js';
import { preflightDesign } from '../src/features/designStudio/export/preflight.js';
import type { FixedElementLayout, QrTemplateDefinition, StudioDesign } from '../src/features/qrStudio/types.js';
import { resolveDesignBindings } from '../src/features/qrStudio/dynamicFields.js';
import { createZip } from '../src/utils/zip.js';
import { inlineSvgImages, normaliseCorelGeometry } from '../src/features/qrStudio/corelSvg.js';
import { circleCurvePath, roundedRectCurvePath } from '../src/features/qrStudio/vectorGeometry.js';

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

test('CorelDRAW export expands embedded QR SVGs into editable vector groups', () => {
  const qr = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="Peshkash branded QR code"><rect x="10" y="10" width="20" height="20"/></svg>';
  const source = `<image href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}" x="40" y="50" width="200" height="200"/>`;
  const output = inlineSvgImages(source);
  assert.equal(output.includes('<image'), false);
  assert.equal(output.includes('data:image'), false);
  assert.equal(output.includes('data-object-type="qr-code"'), true);
  assert.equal(output.includes('data-object-name="Editable QR vector curves"'), true);
  assert.equal(output.includes('translate(40.000 50.000)'), true);
  assert.equal(output.includes('scale(2.00000000 2.00000000)'), true);
  assert.equal(output.includes('<rect x="10" y="10" width="20" height="20"/>'), true);
});

test('QR artwork uses Corel-safe closed curves for rounded geometry', () => {
  const module = roundedRectCurvePath(10, 20, 30, 5);
  const knockout = roundedRectCurvePath(15, 25, 20, 3, true);
  const finderCore = circleCurvePath(50, 50, 12);
  assert.match(module, /^M.+C.+Z$/);
  assert.match(knockout, /^M.+C.+Z$/);
  assert.equal((finderCore.match(/C/g) || []).length, 4);
  assert.match(finderCore, /^M.+Z$/);
  assert.notEqual(module, knockout);
});

test('CorelDRAW export converts rounded card edges and circles to explicit curves', () => {
  const output = normaliseCorelGeometry('<rect id="card" x="2" y="3" width="800" height="1200" rx="32" fill="#fff"/><circle id="seal" cx="50" cy="60" r="12" fill="#000"/>');
  assert.equal(output.includes('<rect'), false);
  assert.equal(output.includes('<circle'), false);
  assert.match(output, /<path d="M34 3.+" id="card" fill="#fff"\/>/);
  assert.match(output, /<path d="M50 48.+" id="seal" fill="#000"\/>/);
});

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
    fieldBindings: undefined,
    merchantName: design.merchantName,
    eyebrow: design.eyebrow,
    headline: design.headline,
    descriptor: design.descriptor,
    cta: design.cta,
    destination: design.destination,
  });
});

test('dynamic text bindings resolve fixed and freeform text independently for every QR target', () => {
  const bound: StudioDesign = {
    ...design,
    fieldBindings: { headline: 'item.name', descriptor: 'item.description', merchantName: 'vendor.name' },
    canvasElements: [{ id: 'price', kind: 'text', x: 0, y: 0, w: 100, h: 30, text: 'Price on request', color: '#111111', fontFamily: 'Arial', fontSize: 18, fontWeight: '700', align: 'left', dynamicField: 'item.price' }],
  };
  const first = resolveDesignBindings(bound, { 'item.name': 'Paneer Tikka', 'item.description': 'Smoked paneer', 'item.price': '₹450', 'vendor.name': 'Acme Caterers' });
  const second = resolveDesignBindings(bound, { 'item.name': 'Gulab Jamun', 'item.price': '₹250', 'vendor.name': 'Acme Caterers' });
  assert.equal(first.headline, 'Paneer Tikka');
  assert.equal(first.descriptor, 'Smoked paneer');
  assert.equal(first.merchantName, 'Acme Caterers');
  assert.equal(first.canvasElements?.[0].kind === 'text' && first.canvasElements[0].text, '₹450');
  assert.equal(second.headline, 'Gulab Jamun');
  assert.equal(second.descriptor, '');
});

test('batch export creates one ZIP container with every named QR asset', async () => {
  const blob = createZip([
    { name: '01-paneer.png', data: new Uint8Array([1, 2, 3]) },
    { name: '02-dessert.png', data: new Uint8Array([4, 5]) },
  ]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'PK\u0003\u0004');
  assert.match(text, /01-paneer\.png/);
  assert.match(text, /02-dessert\.png/);
  assert.equal(String.fromCharCode(...bytes.slice(-22, -18)), 'PK\u0005\u0006');
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
