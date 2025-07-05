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
      groups[code].lines.push(formatLine(f.path, commit));
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
}

run();
