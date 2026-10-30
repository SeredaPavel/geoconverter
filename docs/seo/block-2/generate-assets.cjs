// Rebuild the social preview and favicon from the SVG sources using installed sharp.
const fs = require('node:fs');
const path = require('node:path');
const frontend = path.resolve(__dirname, '../../../frontend');
const sharp = require(require.resolve('sharp', { paths: [frontend] }));

(async () => {
  await sharp(path.join(frontend, 'public/assets/og-geoconverter.svg'))
    .png().toFile(path.join(frontend, 'public/assets/og-geoconverter.png'));
  const png = await sharp(path.join(frontend, 'src/app/icon.svg'))
    .resize(32, 32).png().toBuffer();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 32;
  header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(frontend, 'src/app/favicon.ico'), Buffer.concat([header, png]));
  console.log('Generated OG PNG (1200x630) and favicon ICO (32x32).');
})().catch(error => { console.error(error); process.exitCode = 1; });
