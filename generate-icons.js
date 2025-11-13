/**
 * Icon Generation Script for PerfectMatchSchools PWA
 * 
 * This script generates all required PWA icons from the source logo.
 * 
 * Prerequisites:
 *   npm install sharp
 * 
 * Usage:
 *   node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ Sharp is not installed.');
  console.error('📦 Install it with: npm install sharp');
  console.error('');
  console.error('Alternatively, use an online tool:');
  console.error('   https://realfavicongenerator.net/');
  console.error('   https://www.pwabuilder.com/imageGenerator');
  process.exit(1);
}

const SOURCE_LOGO = path.join(__dirname, 'attached_assets', 'New logo-15_1762774603259.png');
const ICONS_DIR = path.join(__dirname, 'client', 'public', 'icons');
const PUBLIC_DIR = path.join(__dirname, 'client', 'public');

// Icon sizes for PWA manifest
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  // Check if source logo exists
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error(`❌ Source logo not found: ${SOURCE_LOGO}`);
    process.exit(1);
  }

  // Create icons directory if it doesn't exist
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  console.log('🎨 Generating PWA icons from logo...');
  console.log(`📁 Source: ${SOURCE_LOGO}`);
  console.log(`📁 Output: ${ICONS_DIR}`);
  console.log('');

  try {
    // Generate PWA manifest icons
    for (const size of iconSizes) {
      const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
      console.log(`  ✓ Generating icon-${size}x${size}.png`);
      
      await sharp(SOURCE_LOGO)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);
    }

    // Generate favicon (32x32)
    console.log('  ✓ Generating favicon.png (32x32)');
    await sharp(SOURCE_LOGO)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(PUBLIC_DIR, 'favicon.png'));

    // Generate Apple touch icon (180x180)
    console.log('  ✓ Generating apple-touch-icon.png (180x180)');
    await sharp(SOURCE_LOGO)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));

    console.log('');
    console.log('✅ All icons generated successfully!');
    console.log('');
    console.log('📋 Generated files:');
    const files = fs.readdirSync(ICONS_DIR);
    files.forEach(file => {
      const filePath = path.join(ICONS_DIR, file);
      const stats = fs.statSync(filePath);
      console.log(`   ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Verify icons look good');
    console.log('   2. Test PWA install prompt');
    console.log('   3. Move to Task 1.3: Service Worker Setup');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

