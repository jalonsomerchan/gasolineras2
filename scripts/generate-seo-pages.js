#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dataFile = path.join(root, 'data', 'seo-pages.json');
const indexFile = path.join(root, 'index.html');

if (!fs.existsSync(dataFile)) {
  console.log('No existe data/seo-pages.json. Copia data/seo-pages.example.json y añade las páginas a generar.');
  process.exit(0);
}

const baseHtml = fs.readFileSync(indexFile, 'utf8');
const pages = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

function safePath(urlPath) {
  return String(urlPath || '').replace(/^\/+/, '').replace(/\.\./g, '').replace(/\/+$/, '');
}

function htmlFor(page) {
  const title = page.title || 'Gasolina al día';
  const description = page.description || 'Consulta precios de gasolina y diésel.';
  const route = page.hashRoute || '/';
  const canonical = page.canonical || page.path || '/';
  return baseHtml
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace('</head>', `<link rel="canonical" href="${escapeHtml(canonical)}" />\n    <script>location.hash = ${JSON.stringify(route)};</script>\n  </head>`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

for (const page of pages) {
  const targetDir = path.join(root, safePath(page.path));
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), htmlFor(page));
  console.log(`Generada ${page.path}`);
}
