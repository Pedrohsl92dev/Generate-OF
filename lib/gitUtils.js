const { execSync, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function findGitRepos(dir, repos = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  if (entries.some(e => e.isDirectory() && e.name === '.git')) {
    repos.push(dir);
    return repos;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
      try {
        findGitRepos(path.join(dir, entry.name), repos);
      } catch (_) {
        // ignore permission errors
      }
    }
  }
  return repos;
}

function getCommits(repoPath, author, since, until) {
  const args = [
    '-C', repoPath,
    'log',
    `--author=${author}`,
    `--since=${since}`,
    `--until=${until}`,
    '--pretty=format:%H|%s'
  ];
  const output = execFileSync('git', args, { encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      const [hash, subject = ''] = line.split('|');
      // extract card numbers of any length
      const match = subject.match(/card (\d+)/i) || subject.match(/task (\d+)/i);
      return { hash, card: match ? match[1] : null };
    });
}

function getFilesForCommit(repoPath, commitHash) {
  const args = [
    '-C', repoPath,
    'diff-tree',
    '--no-commit-id',
    '--name-status',
    '-r',
    commitHash
  ];
  const output = execFileSync('git', args, { encoding: 'utf8' });
  return parseGitShow(output);
}

function parseGitShow(output) {
  return output.split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => /^[A-Z]/.test(line))
    .map(line => {
      const [status, ...fileParts] = line.split(/\s+/);
      return { status, path: fileParts.join(' ') };
    });
}

function formatLine(filePath, commit) {
  const base = `${filePath}#${commit.hash.substring(0, 10)};`;
  if (commit.card) {
    return `${base} card ${commit.card}`;
  }
  if (commit.task) {
    return `${base} task ${commit.task}`;
  }
  return base;
}

module.exports = {
  findGitRepos,
  getCommits,
  getFilesForCommit,
  parseGitShow,
  formatLine
};
