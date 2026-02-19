import sharp from 'sharp';
import { join } from 'path';
import { existsSync } from 'fs';

const publicDir = join(process.cwd(), 'public');
const files = [
  { name: 'logo-full.png', maxDim: 512 },
  { name: 'logo-header.png', maxDim: 400 },
  { name: 'icon-512.png', maxDim: 512 },
];

for (const { name, maxDim } of files) {
  const input = join(publicDir, name);
  if (!existsSync(input)) continue;
  const temp = input + '.tmp';
  try {
    await sharp(input)
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toFile(temp);
    await import('fs').then(fs => fs.promises.rename(temp, input));
    const stat = await import('fs').then(fs => fs.promises.stat(input));
    console.log(`${name}: ${(stat.size / 1024).toFixed(0)}KB`);
  } catch (e) {
    if (existsSync(temp)) await import('fs').then(fs => fs.promises.unlink(temp));
    console.warn(name, e.message);
  }
}
