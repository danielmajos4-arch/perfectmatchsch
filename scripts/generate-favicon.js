/**
 * Generate favicon.ico from PNG files
 * 
 * Usage:
 * node scripts/generate-favicon.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import toIco from 'to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const iconsDir = join(__dirname, '../client/public/icons');
const publicDir = join(__dirname, '../client/public');

async function generateFavicon() {
  try {
    console.log('🎨 Generating favicon.ico...\n');

    // Read PNG files for different sizes
    const sizes = [16, 32, 48];
    const buffers = [];

    for (const size of sizes) {
      const filePath = join(iconsDir, `icon-${size}x${size}.png`);
      try {
        const buffer = readFileSync(filePath);
        buffers.push(buffer);
        console.log(`✅ Read: icon-${size}x${size}.png`);
      } catch (error) {
        console.warn(`⚠️  Warning: Could not read icon-${size}x${size}.png`);
      }
    }

    if (buffers.length === 0) {
      throw new Error('No icon files found to create favicon.ico');
    }

    // Convert to ICO
    const ico = await toIco(buffers);
    
    // Write favicon.ico
    const outputPath = join(publicDir, 'favicon.ico');
    writeFileSync(outputPath, ico);
    
    console.log(`\n✅ Generated: favicon.ico`);
    console.log(`   Location: ${outputPath}\n`);

  } catch (error) {
    console.error('❌ Error generating favicon.ico:', error.message);
    
    if (error.message.includes('to-ico')) {
      console.error('\n💡 Solution: Install to-ico first:');
      console.error('   npm install to-ico --save-dev\n');
    }
    
    console.error('\n📝 Alternative: Use an online converter:');
    console.error('   1. Go to https://favicon.io/favicon-converter/');
    console.error('   2. Upload client/public/icons/icon-32x32.png');
    console.error('   3. Download favicon.ico');
    console.error('   4. Place it in client/public/favicon.ico\n');
    
    process.exit(1);
  }
}

generateFavicon();

