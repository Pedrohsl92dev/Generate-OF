const fs = require('node:fs');
const path = require('node:path');

const CODE_BY_KIND = {
  screen: {
    create: '5.10.1',
    update: '5.10.2'
  },
  style: {
    create: '5.10.3',
    update: '5.10.4'
  },
  script: {
    create: '5.10.5',
    update: '5.10.6'
  },
  config: {
    create: '5.10.7',
    update: '5.10.8'
  },
  java: {
    create: '5.10.9',
    update: '5.10.10'
  }
};

const IGNORED_FILE_NAMES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock'
]);

const IGNORED_DIR_NAMES = new Set([
  '.angular',
  '.git',
  'build',
  'dist',
  'node_modules',
  'output',
  'target',
  'temp',
  'tmp'
]);

const IGNORED_EXTENSIONS = new Set([
  '.bak',
  '.cache',
  '.log',
  '.map',
  '.swp',
  '.tmp'
]);

const XML_SCREEN_SEGMENTS = ['layout', 'layouts', 'page', 'pages', 'screen', 'screens', 'template', 'templates', 'ui', 'view', 'views', 'webapp'];
const XML_SCREEN_SUFFIXES = ['.layout.xml', '.page.xml', '.screen.xml', '.template.xml', '.view.xml'];

function loadMap() {
  const mapPath = path.join(__dirname, '..', 'ustibb_map.json');
  const raw = fs.readFileSync(mapPath, 'utf8');
  return JSON.parse(raw);
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/').toLowerCase();
}

function shouldIgnoreFile(filePath, status) {
  if (!filePath || /^D/.test(status)) {
    return true;
  }

  const normalizedPath = normalizePath(filePath);
  const segments = normalizedPath.split('/').filter(Boolean);
  const fileName = path.basename(normalizedPath);
  const extension = path.extname(fileName);

  if (IGNORED_FILE_NAMES.has(fileName) || IGNORED_EXTENSIONS.has(extension)) {
    return true;
  }

  return segments.some(segment => IGNORED_DIR_NAMES.has(segment));
}

function isXmlScreen(filePath) {
  const normalizedPath = normalizePath(filePath);
  const fileName = path.basename(normalizedPath);
  const segments = normalizedPath.split('/').filter(Boolean);

  if (XML_SCREEN_SUFFIXES.some(suffix => fileName.endsWith(suffix))) {
    return true;
  }

  return segments.some(segment => XML_SCREEN_SEGMENTS.includes(segment));
}

function getKindForFile(filePath) {
  const normalizedPath = normalizePath(filePath);
  const extension = path.extname(normalizedPath);

  if (extension === '.java') {
    return 'java';
  }

  if (extension === '.css' || extension === '.scss') {
    return 'style';
  }

  if (extension === '.js' || extension === '.ts') {
    return 'script';
  }

  if (['.html', '.xhtml', '.jsp', '.vtl', '.xsl', '.php'].includes(extension)) {
    return 'screen';
  }

  if (extension === '.xml') {
    return isXmlScreen(filePath) ? 'screen' : 'config';
  }

  return null;
}

function getOperationFromInfo(info) {
  if (info.operacao === 'create' || info.operacao === 'update') {
    return info.operacao;
  }

  const description = String(info.descricao || '').toLowerCase();
  if (description.includes('cria')) {
    return 'create';
  }
  if (description.includes('altera')) {
    return 'update';
  }
  return null;
}

function getCodeForFile(map, filePath, status) {
  if (shouldIgnoreFile(filePath, status)) {
    return null;
  }

  const kind = getKindForFile(filePath);
  const operation = /^A/.test(status) ? 'create' : 'update';

  if (kind && CODE_BY_KIND[kind] && map[CODE_BY_KIND[kind][operation]]) {
    return CODE_BY_KIND[kind][operation];
  }

  const ext = path.extname(filePath).toLowerCase();
  for (const [code, info] of Object.entries(map)) {
    if (Array.isArray(info.extensoes) && info.extensoes.includes(ext)) {
      const infoOperation = getOperationFromInfo(info);
      if (infoOperation === operation) {
        return code;
      }
    }
  }
  return null;
}

module.exports = {
  loadMap,
  getCodeForFile
};
