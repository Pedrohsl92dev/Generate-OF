const fs = require('node:fs');
const path = require('node:path');

function loadAuthorMap() {
  const mapPath = path.join(__dirname, '..', 'author_map.json');
  if (!fs.existsSync(mapPath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(mapPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Could not read author map: ${err.message}`);
    return {};
  }
}

function resolveAuthorMatchers(authorId, authorMap = {}) {
  const entry = authorMap[authorId] || {};
  const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
  const names = Array.isArray(entry.names) ? entry.names : [];
  const emails = Array.isArray(entry.emails) ? entry.emails : [];
  const logins = Array.isArray(entry.logins) ? entry.logins : [];
  const parts = [authorId, ...aliases, ...names, ...emails, ...logins]
    .filter(Boolean)
    .map(v => v.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(parts));
  if (!unique.length) {
    console.warn(`No author matchers resolved for ${authorId}, using raw value.`);
    return [authorId];
  }
  return unique;
}

module.exports = {
  loadAuthorMap,
  resolveAuthorMatchers
};
