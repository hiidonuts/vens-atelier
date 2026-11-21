import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Optional WebP export for deployment. Does NOT rewrite projects.json.
 * Prefer originals (PNG/JPG) in the app for sharpness.
 * Usage: node scripts/optimize-images.mjs
 */
const projects = JSON.parse(fs.readFileSync('src/data/projects.json', 'utf8'));
const refs = new Set();

for (const p of projects) {
  if (p.image) refs.add(p.image);
  for (const img of p.images || []) refs.add(img);
}
refs.add('/hero.jpg');

for (const ref of refs) {
  const srcPath = path.join('public', ref.replace(/^\//, ''));
  if (!fs.existsSync(srcPath)) {
    console.log('missing', ref);
    continue;
  }

  const webpPath = srcPath.replace(/\.(png|jpe?g)$/i, '.webp');
  const buf = await sharp(srcPath)
    .rotate()
    .webp({ quality: 92, effort: 4 })
    .toBuffer();
  fs.writeFileSync(webpPath, buf);
  console.log('wrote', webpPath);
}

console.log('done — projects.json left pointing at originals');
