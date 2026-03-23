const sharp = require('sharp');
const path = require('path');

// SVG designed at 1024x1024
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <!-- Background -->
  <rect width="1024" height="1024" fill="#4A3728"/>

  <!-- Cup body -->
  <path d="M 320 420 L 360 720 Q 364 760 400 760 L 624 760 Q 660 760 664 720 L 704 420 Z"
    fill="#F5EFE6"/>

  <!-- Cup handle -->
  <path d="M 704 500 Q 800 500 800 590 Q 800 680 704 680"
    fill="none" stroke="#F5EFE6" stroke-width="52" stroke-linecap="round"/>

  <!-- Coffee liquid inside cup -->
  <path d="M 336 500 L 364 720 Q 366 744 400 744 L 624 744 Q 658 744 660 720 L 688 500 Z"
    fill="#8B5A2B"/>

  <!-- Rim highlight -->
  <rect x="310" y="400" width="404" height="48" rx="24" fill="#F5EFE6"/>

  <!-- Steam lines -->
  <path d="M 440 340 Q 420 300 440 260 Q 460 220 440 180"
    fill="none" stroke="#F5EFE6" stroke-width="28" stroke-linecap="round" opacity="0.7"/>
  <path d="M 512 320 Q 492 280 512 240 Q 532 200 512 160"
    fill="none" stroke="#F5EFE6" stroke-width="28" stroke-linecap="round" opacity="0.5"/>
  <path d="M 584 340 Q 564 300 584 260 Q 604 220 584 180"
    fill="none" stroke="#F5EFE6" stroke-width="28" stroke-linecap="round" opacity="0.7"/>
</svg>
`;

const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" fill="#4A3728"/>
  <path d="M 18 26 L 21 48 Q 21.5 51 24 51 L 40 51 Q 42.5 51 43 48 L 46 26 Z" fill="#F5EFE6"/>
  <path d="M 46 32 Q 52 32 52 38 Q 52 44 46 44" fill="none" stroke="#F5EFE6" stroke-width="4" stroke-linecap="round"/>
  <rect x="16" y="23" width="32" height="5" rx="2.5" fill="#F5EFE6"/>
  <path d="M 26 18 Q 24 14 26 10" fill="none" stroke="#F5EFE6" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
  <path d="M 32 16 Q 30 12 32 8" fill="none" stroke="#F5EFE6" stroke-width="2.5" stroke-linecap="round" opacity="0.6"/>
  <path d="M 38 18 Q 36 14 38 10" fill="none" stroke="#F5EFE6" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
</svg>
`;

async function generate() {
  const assetsDir = path.join(__dirname, '..', 'assets');

  await sharp(Buffer.from(iconSvg)).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon.png'));
  console.log('✓ icon.png');

  await sharp(Buffer.from(iconSvg)).resize(1024, 1024).png().toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('✓ splash-icon.png');

  await sharp(Buffer.from(faviconSvg)).resize(64, 64).png().toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✓ favicon.png');
}

generate().catch(console.error);
