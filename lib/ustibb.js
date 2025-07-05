const fs = require('node:fs');
const path = require('node:path');

function loadMap() {
  const mapPath = path.join(__dirname, '..', 'ustibb_map.json');
  const raw = fs.readFileSync(mapPath, 'utf8');
  return JSON.parse(raw);
}

function getCodeForFile(map, filePath, status) {
  const ext = path.extname(filePath).toLowerCase();
  const isCreation = /^A/.test(status);
  for (const [code, info] of Object.entries(map)) {
    if (info.extensoes.includes(ext)) {
      const isCria = info.descricao.toLowerCase().includes('cria');
      const isAltera = info.descricao.toLowerCase().includes('altera');
      if ((isCreation && isCria) || (!isCreation && isAltera)) {
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
