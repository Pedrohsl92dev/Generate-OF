const fs = require('node:fs');
const path = require('node:path');
const {
  findGitRepos,
  getCommits,
  getFilesForCommit,
  formatLine
} = require('./lib/gitUtils');
const { loadMap, getCodeForFile } = require('./lib/ustibb');

function loadConfig() {
  const configPath = path.join(__dirname, 'config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const cfg = JSON.parse(raw);
  if (typeof cfg.allowDuplicates !== 'boolean') {
    cfg.allowDuplicates = true;
  }
  if (typeof cfg.card !== 'string') {
    if (typeof cfg.task === 'string') {
      cfg.card = cfg.task;
    } else {
      cfg.card = '';
    }
  }
  return cfg;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function processRepo(repoPath, config, ustibbMap) {
  console.log(`Processing ${repoPath}`);
  const commits = getCommits(repoPath, config.author, config.since, config.until);
  const groups = {};

  for (const commit of commits) {
    const files = getFilesForCommit(repoPath, commit.hash);
    for (const f of files) {
      const code = getCodeForFile(ustibbMap, f.path, f.status);
      if (!code) continue;
      if (!groups[code]) {
        groups[code] = {
          descricao: ustibbMap[code].descricao,
          ustibb: ustibbMap[code].ustibb,
          lines: [],
          seen: new Set()
        };
      }
      if (!config.allowDuplicates && groups[code].seen.has(f.path)) {
        continue;
      }
      groups[code].seen.add(f.path);
      const fullPath = path.join(path.basename(repoPath), f.path);
      groups[code].lines.push(formatLine(fullPath, commit));
    }
  }

  const repoName = path.basename(repoPath);
  const outputDir = path.join(config.outputDir, repoName);
  ensureDir(outputDir);

  let output = [];
  let repoTotal = 0;
  for (const code of Object.keys(groups).sort()) {
    const g = groups[code];
    const subtotal = g.lines.length * g.ustibb;
    repoTotal += subtotal;
    output.push(`${code} - ${g.descricao}`);
    output.push(...g.lines);
    output.push(`Total USTIBB: ${g.lines.length} x ${g.ustibb} = ${subtotal}`);
    output.push('');
  }
  output.push(`Total geral do projeto: ${repoTotal}`);
  fs.writeFileSync(path.join(outputDir, 'commits.txt'), output.join('\n'), 'utf8');
  return repoTotal;
}

function gerarRelatorioFinal(outputDir, card) {
  const categories = {};
  const projects = fs.readdirSync(outputDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const project of projects) {
    const filePath = path.join(outputDir, project, 'commits.txt');
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    let currentCat = null;
    for (const line of lines) {
      if (/^5\.\d+\.\d+ -/.test(line)) {
        currentCat = line.trim();
        if (!categories[currentCat]) {
          categories[currentCat] = {};
        }
      } else if (/Total USTIBB|Total geral do projeto/.test(line) || !line.trim()) {
        continue;
      } else if (currentCat) {
        if (!categories[currentCat][project]) {
          categories[currentCat][project] = [];
        }
        categories[currentCat][project].push(line.trim());
      }
    }
  }

  const categoryNames = Object.keys(categories);
  let outLines = [];
  categoryNames.forEach((cat, idx) => {
    outLines.push(cat);
    outLines.push('');
    const projects = categories[cat];
    for (const [proj, lines] of Object.entries(projects)) {
      outLines.push(`[${proj}]`);
      outLines.push(...lines);
      outLines.push('');
    }
    if (idx < categoryNames.length - 1) {
      outLines.push('---');
      outLines.push('');
    }
  });

  const ustibb = loadMap();
  const extras = ['5.32.1', '5.32.2', '5.32.3'];
  if (categoryNames.length && extras.length) {
    outLines.push('---');
    outLines.push('');
  }
  extras.forEach((code, idx) => {
    if (!ustibb[code]) return;
    outLines.push(`${code} - ${ustibb[code].descricao}`);
    if (card) {
      outLines.push(`card ${card}`);
    }
    if (idx < extras.length - 1) {
      outLines.push('---');
    }
    outLines.push('');
  });

  fs.writeFileSync(path.join(outputDir, 'final-commit-report.txt'), outLines.join('\n'), 'utf8');
}

function run() {
  const config = loadConfig();
  const ustibbMap = loadMap();
  ensureDir(config.outputDir);
  const repos = findGitRepos(path.resolve(config.baseDir));
  let total = 0;
  for (const repo of repos) {
    try {
      total += processRepo(repo, config, ustibbMap);
    } catch (err) {
      console.error(`Failed to process ${repo}:`, err.message);
    }
  }
  console.log(`Total geral de USTIBB: ${total}`);
  gerarRelatorioFinal(config.outputDir, config.card);
}

run();
