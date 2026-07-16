const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outputDir = 'public/icons';

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate SVG icon for a given size
function generateSVG(size, letter = 'R') {
  return Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#D4A359"/>
      <text x="50%" y="50%" font-size="${Math.round(size * 0.4)}" text-anchor="middle" dy="0.35em" fill="white" font-family="Arial, sans-serif" font-weight="bold">${letter}</text>
    </svg>
  `);
}

// Generate all required icons
async function generateIcons() {
  console.log('🔄 Generating icons...');
  
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  
  for (const size of sizes) {
    try {
      await sharp(generateSVG(size))
        .png()
        .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
      console.log(`✅ Created icon-${size}x${size}.png (${size}x${size})`);
    } catch (err) {
      console.error(`❌ Failed to create icon-${size}x${size}.png:`, err.message);
    }
  }
  
  // Generate new-order.png (96x96)
  try {
    await sharp(generateSVG(96, 'N'))
      .png()
      .toFile(path.join(outputDir, 'new-order.png'));
    console.log('✅ Created new-order.png (96x96)');
  } catch (err) {
    console.error('❌ Failed to create new-order.png:', err.message);
  }
  
  // Generate dashboard.png (96x96)
  try {
    await sharp(generateSVG(96, 'D'))
      .png()
      .toFile(path.join(outputDir, 'dashboard.png'));
    console.log('✅ Created dashboard.png (96x96)');
  } catch (err) {
    console.error('❌ Failed to create dashboard.png:', err.message);
  }
  
  // Generate apple-touch-icon.png (180x180)
  try {
    await sharp(generateSVG(180))
      .png()
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    console.log('✅ Created apple-touch-icon.png (180x180)');
  } catch (err) {
    console.error('❌ Failed to create apple-touch-icon.png:', err.message);
  }
  
  console.log('✅ All icons generated!');
}

generateIcons();
