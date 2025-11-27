/**
 * Generate PWA Icons from SVG
 * 
 * This script converts the SVG icon to all required PNG sizes for PWA.
 * 
 * Requirements:
 * npm install sharp --save-dev
 * 
 * Usage:
 * node scripts/generate-icons.js
 */

import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const iconSizes = [16, 32, 72, 96, 144, 152, 180, 192, 512];
const svgPath = join(__dirname, '../client/public/icons/concept-1-modern.svg');
const outputDir = join(__dirname, '../client/public/icons');
const publicDir = join(__dirname, '../client/public');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  try {
    console.log('🎨 Generating PWA icons from SVG...\n');

    // Read SVG file
    if (!existsSync(svgPath)) {
      throw new Error(`SVG file not found: ${svgPath}`);
    }

    const svgBuffer = readFileSync(svgPath);
    console.log(`✅ Read SVG: ${svgPath}\n`);

    // Generate all PNG sizes
    for (const size of iconSizes) {
      const outputPath = join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated: icon-${size}x${size}.png`);
    }

    // Generate apple-touch-icon.png (180x180)
    const appleTouchPath = join(publicDir, 'apple-touch-icon.png');
    await sharp(svgBuffer)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(appleTouchPath);
    console.log(`✅ Generated: apple-touch-icon.png`);

    // Generate favicon.ico (multi-resolution)
    // Note: sharp can't create .ico files directly, so we'll create a 32x32 PNG as favicon
    // For a proper .ico file, you may need to use a tool like imagemagick or online converter
    const faviconPngPath = join(publicDir, 'favicon.png');
    await sharp(svgBuffer)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(faviconPngPath);
    console.log(`✅ Generated: favicon.png (32x32)`);

    console.log('\n✨ All icons generated successfully!');
    console.log('\n📝 Note: For favicon.ico, you may need to:');
    console.log('   1. Use an online converter (e.g., https://favicon.io/favicon-converter/)');
    console.log('   2. Upload icon-32x32.png and download favicon.ico');
    console.log('   3. Place it in client/public/favicon.ico\n');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    
    if (error.message.includes('sharp')) {
      console.error('\n💡 Solution: Install sharp first:');
      console.error('   npm install sharp --save-dev\n');
    }
    
    process.exit(1);
  }
}

generateIcons();

