/**
 * Copia os ficheiros WASM do MediaPipe para a pasta public
 * para serem servidos localmente (sem necessidade de CDN)
 */
const fs = require('fs');
const path = require('path');

const clientRoot = path.join(__dirname, '..', '..');
const src  = path.join(clientRoot, 'node_modules', '@mediapipe', 'hands');
const dest = path.join(clientRoot, 'public', 'mediapipe', 'hands');

if (!fs.existsSync(src)) {
  console.log('⚠️  @mediapipe/hands não encontrado, a saltar cópia.');
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });

const extensions = ['.js', '.wasm', '.data', '.binarypb', '.tflite'];
const files = fs.readdirSync(src).filter(f => extensions.some(ext => f.endsWith(ext)));

files.forEach(file => {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
});

console.log(`✅ MediaPipe: ${files.length} ficheiros copiados para public/mediapipe/hands/`);
