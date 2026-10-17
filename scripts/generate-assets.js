require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('canvas');
const { config, resolveConfigPath } = require('../utils/config');
const { generateWelcomeBanner } = require('../utils/canvasGenerator');

async function main() {
  const assetsDirectory = path.dirname(resolveConfigPath(config.assets.logo));
  const sourcePath = path.join(assetsDirectory, 'zyre_logo_source.jpg');
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Put the supplied logo image at ${sourcePath} before generating assets.`);
  }

  fs.mkdirSync(assetsDirectory, { recursive: true });
  const image = await loadImage(sourcePath);
  const logo = createCanvas(image.width, image.height);
  logo.getContext('2d').drawImage(image, 0, 0);
  fs.writeFileSync(resolveConfigPath(config.assets.logo), logo.toBuffer('image/png'));
  fs.writeFileSync(
    resolveConfigPath(config.assets.welcomeBanner),
    await generateWelcomeBanner(),
  );
  console.info('Created the ZYRE MC logo PNG and 1024×400 welcome banner.');
}

main().catch((error) => {
  console.error('Could not generate the ZYRE MC image assets:', error);
  process.exitCode = 1;
});
