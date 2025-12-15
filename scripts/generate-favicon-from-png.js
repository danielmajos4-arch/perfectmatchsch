/**
 * Generate Favicon and PWA Icons from PNG
 * 
 * This script converts a PNG logo to all required favicon and icon sizes.
 * 
 * Requirements:
 * npm install sharp --save-dev
 * 
 * Usage:
 * node scripts/generate-favicon-from-png.js
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import toIco from 'to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const iconSizes = [16, 32, 48, 72, 96, 144, 152, 180, 192, 512];
const sourceImagePath = join(__dirname, '../client/public/new-logo-source.png');
const outputDir = join(__dirname, '../client/public/icons');
const publicDir = join(__dirname, '../client/public');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  try {
    console.log('🎨 Generating favicon and PWA icons from PNG...\n');

    // Check if source image exists
    if (!existsSync(sourceImagePath)) {
      throw new Error(`Source image not found: ${sourceImagePath}`);
    }

    console.log(`✅ Found source image: ${sourceImagePath}\n`);

    // Generate all PNG sizes
    for (const size of iconSizes) {
      const outputPath = join(outputDir, `icon-${size}x${size}.png`);
      
      // Make icons bolder by using 90% of canvas size (less padding)
      // Use 95% for favicon sizes (16, 32) to make them extra bold
      const isFaviconSize = size === 16 || size === 32;
      const logoSize = Math.floor(size * (isFaviconSize ? 0.95 : 0.9));
      
      await sharp(sourceImagePath)
        .resize(logoSize, logoSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .sharpen(isFaviconSize ? { sigma: 1.5 } : undefined) // Extra sharpening for small favicon sizes
        .extend({
          top: Math.floor((size - logoSize) / 2),
          bottom: Math.ceil((size - logoSize) / 2),
          left: Math.floor((size - logoSize) / 2),
          right: Math.ceil((size - logoSize) / 2),
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated: icon-${size}x${size}.png`);
    }

    // Generate apple-touch-icon.png (180x180)
    const appleTouchPath = join(publicDir, 'apple-touch-icon.png');
    const appleSize = 180;
    const appleLogoSize = Math.floor(appleSize * 0.9);
    
    await sharp(sourceImagePath)
      .resize(appleLogoSize, appleLogoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .sharpen()
      .extend({
        top: Math.floor((appleSize - appleLogoSize) / 2),
        bottom: Math.ceil((appleSize - appleLogoSize) / 2),
        left: Math.floor((appleSize - appleLogoSize) / 2),
        right: Math.ceil((appleSize - appleLogoSize) / 2),
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(appleTouchPath);
    console.log(`✅ Generated: apple-touch-icon.png`);

    // Generate favicon.png (32x32) - make it extra bold for visibility
    const faviconPngPath = join(publicDir, 'favicon.png');
    const faviconSize = 32;
    const faviconLogoSize = Math.floor(faviconSize * 0.95); // 95% for favicon to be extra bold
    
    await sharp(sourceImagePath)
      .resize(faviconLogoSize, faviconLogoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .sharpen({ sigma: 1.5 }) // Extra sharpening for small favicon
      .extend({
        top: Math.floor((faviconSize - faviconLogoSize) / 2),
        bottom: Math.ceil((faviconSize - faviconLogoSize) / 2),
        left: Math.floor((faviconSize - faviconLogoSize) / 2),
        right: Math.ceil((faviconSize - faviconLogoSize) / 2),
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(faviconPngPath);
    console.log(`✅ Generated: favicon.png (32x32)`);

    // Generate favicon.ico using proper ICO format
    // Read the generated PNG files and convert to ICO using to-ico
    try {
      const icoSizes = [16, 32, 48];
      const icoBuffers = [];

      for (const size of icoSizes) {
        const iconPath = join(outputDir, `icon-${size}x${size}.png`);
        if (existsSync(iconPath)) {
          const buffer = readFileSync(iconPath);
          icoBuffers.push(buffer);
          console.log(`✅ Read icon-${size}x${size}.png for ICO generation`);
        } else {
          console.warn(`⚠️  Warning: icon-${size}x${size}.png not found, skipping for ICO`);
        }
      }

      if (icoBuffers.length === 0) {
        throw new Error('No icon files found to create favicon.ico');
      }

      // Convert PNG buffers to proper ICO format
      const ico = await toIco(icoBuffers);
      
      // Write favicon.ico
      const faviconIcoPath = join(publicDir, 'favicon.ico');
      writeFileSync(faviconIcoPath, ico);
      console.log(`✅ Generated: favicon.ico (proper ICO format with ${icoBuffers.length} sizes)`);
    } catch (icoError) {
      console.warn(`⚠️  Could not generate favicon.ico: ${icoError.message}`);
      if (icoError.message.includes('to-ico')) {
        console.warn('   Install to-ico: npm install to-ico --save-dev');
      }
      console.log('   You can run "node scripts/generate-favicon.js" separately to generate favicon.ico');
    }

    console.log('\n✨ All icons generated successfully!');
    console.log('\n📝 Files created:');
    console.log(`   - client/public/favicon.ico`);
    console.log(`   - client/public/favicon.png`);
    console.log(`   - client/public/apple-touch-icon.png`);
    console.log(`   - client/public/icons/icon-*.png (all sizes)\n`);

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
