import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const posters = JSON.parse(fs.readFileSync('src/data/posters.json', 'utf8'));
const refs = new Set();

for (const p of posters) {
  if (p.image) refs.add(p.image);
  for (const img of p.images || []) refs.add(img);
}
refs.add('/hero.png');

for (const ref of refs) {
  const pngPath = path.join('public', ref.replace(/^\//, ''));
  const webpPath = pngPath.replace(/\.(png|jpe?g)$/i, '.webp');
  if (!fs.existsSync(pngPath)) {
    console.log('missing', ref);
    continue;
  }
  if (!fs.existsSync(webpPath)) {
    const buf = await sharp(pngPath)
      .rotate()
      .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    fs.writeFileSync(webpPath, buf);
    console.log('created', webpPath);
  }
}

let json = fs.readFileSync('src/data/posters.json', 'utf8');
json = json.replace(/\.png"/g, '.webp"');
fs.writeFileSync('src/data/posters.json', json);
console.log('posters.json updated to webp');
