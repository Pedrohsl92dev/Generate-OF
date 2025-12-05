const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function findGitRepos(dir, repos = [], debug = false) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  if (entries.some(e => e.isDirectory() && e.name === '.git')) {
    repos.push(dir);
    if (debug) {
      console.log(`Detected git repository: ${dir}`);
    }
    return repos;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
      try {
        findGitRepos(path.join(dir, entry.name), repos, debug);
      } catch (_) {
        // ignore permission errors
      }
    }
  }
  return repos;
}

function buildGitLogArgs(repoPath, author, since, until) {
  const args = ['-C', repoPath, 'log'];
  if (author) {
    args.push(`--author=${author}`);
  }
  if (since) {
    args.push(`--since=${since}`);
  }
  if (until) {
    args.push(`--until=${until}`);
  }
  args.push('--date=iso-strict', '--pretty=format:%H|%an|%ae|%ad|%s');
  return args;
}

function parseCommitLine(line) {
  const parts = line.split('|');
  const [hash, authorName, authorEmail, authorDate, ...subjectParts] = parts;
  const subject = subjectParts.join('|') || '';
  const match = subject.match(/card (\d+)/i) || subject.match(/task (\d+)/i);
  return {
    hash,
    authorName,
    authorEmail,
    authorDate,
    subject,
    card: match ? match[1] : null
  };
}

function getCommits(repoPath, author, since, until, debug = false) {
  const args = buildGitLogArgs(repoPath, author, since, until);
  if (debug) {
    console.log(`    git log command: git ${args.join(' ')}`);
  }
  let output = '';
  try {
    output = execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    const detail = err.stderr?.toString().trim() || err.message;
    console.error(`    git log failed in ${repoPath}: ${detail}`);
    return [];
  }
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map(parseCommitLine);
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
  let output = '';
  try {
    output = execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    const detail = err.stderr?.toString().trim() || err.message;
    console.error(`    git diff-tree failed for ${commitHash} in ${repoPath}: ${detail}`);
    return [];
  }
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
