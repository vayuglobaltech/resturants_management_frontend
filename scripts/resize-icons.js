const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFile = 'public/icons/icon-192x192.png';
const outputDir = 'public/icons';

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error('❌ Source icon not found at:', inputFile);
  console.log('Looking for available icons...');
  
  // Try to find any icon
  const files = fs.readdirSync('public/icons');
  const pngFiles = files.filter(f => f.endsWith('.png'));
  if (pngFiles.length > 0) {
    console.log('Found available icons:', pngFiles);
    console.log('Using first icon as source...');
    inputFile = path.join('public/icons', pngFiles[0]);
  } else {
    process.exit(1);
  }
}

const sizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// Resize each icon
async function resizeIcons() {
  console.log('🔄 Resizing icons from:', inputFile);
  
  for (const { size, name } of sizes) {
    try {
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(outputDir, name));
      console.log(`✅ Created ${name} (${size}x${size})`);
    } catch (err) {
      console.error(`❌ Failed to create ${name}:`, err.message);
    }
  }
  
  // Create shortcut icons
  try {
    await sharp(inputFile)
      .resize(96, 96)
      .png()
      .toFile(path.join(outputDir, 'new-order.png'));
    console.log(`✅ Created new-order.png (96x96)`);
  } catch (err) {
    console.error('Failed to create new-order.png:', err.message);
  }
  
  try {
    await sharp(inputFile)
      .resize(96, 96)
      .png()
      .toFile(path.join(outputDir, 'dashboard.png'));
    console.log(`✅ Created dashboard.png (96x96)`);
  } catch (err) {
    console.error('Failed to create dashboard.png:', err.message);
  }
  
  // Create apple-touch-icon
  try {
    await sharp(inputFile)
      .resize(180, 180)
      .png()
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    console.log(`✅ Created apple-touch-icon.png (180x180)`);
  } catch (err) {
    console.error('Failed to create apple-touch-icon.png:', err.message);
  }
}

resizeIcons();
