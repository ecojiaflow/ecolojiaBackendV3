// PATH: backend/src/scripts/fixRoutesTypes.js
const fs = require('fs');
const path = require('path');

// Lire le fichier des routes
const filePath = path.join(__dirname, '../routes/analyze.routes.cached.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Remplacements à effectuer
const replacements = [
  // Remplacer AuthRequest par CacheAuthRequest
  { from: /interface AuthRequest extends Request[\s\S]*?}\n}/g, to: '' },
  { from: /authReq = req as AuthRequest/g, to: 'authReq = req as CacheAuthRequest' },
  { from: /authReq\.user\?/g, to: 'authReq.cacheUser?' },
  { from: /authReq\.session\?/g, to: 'authReq.cacheSession?' },
  { from: /req\.user\?/g, to: '(req as CacheAuthRequest).cacheUser?' },
  { from: /AuthRequest/g, to: 'CacheAuthRequest' }
];

// Appliquer les remplacements
replacements.forEach(({ from, to }) => {
  content = content.replace(from, to);
});

// Écrire le fichier modifié
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Types corrigés dans analyze.routes.cached.ts');
console.log('Changements effectués :');
console.log('- AuthRequest → CacheAuthRequest');
console.log('- req.user → req.cacheUser');
console.log('- req.session → req.cacheSession');