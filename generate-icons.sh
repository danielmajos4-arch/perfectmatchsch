#!/bin/bash

# Icon Generation Script for PerfectMatchSchools PWA
# This script generates all required PWA icons from the source logo

SOURCE_LOGO="../attached_assets/New logo-15_1762774603259.png"
ICONS_DIR="client/public/icons"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick (convert) is not installed."
    echo "📦 Install it with:"
    echo "   macOS: brew install imagemagick"
    echo "   Linux: sudo apt-get install imagemagick"
    echo "   Windows: Download from https://imagemagick.org/"
    echo ""
    echo "Alternatively, use an online tool:"
    echo "   https://realfavicongenerator.net/"
    echo "   https://www.pwabuilder.com/imageGenerator"
    exit 1
fi

# Check if source logo exists
if [ ! -f "$SOURCE_LOGO" ]; then
    echo "❌ Source logo not found: $SOURCE_LOGO"
    exit 1
fi

# Create icons directory if it doesn't exist
mkdir -p "$ICONS_DIR"

echo "🎨 Generating PWA icons from logo..."
echo "📁 Source: $SOURCE_LOGO"
echo "📁 Output: $ICONS_DIR"
echo ""

# Generate icons in all required sizes
sizes=(72 96 128 144 152 192 384 512)

for size in "${sizes[@]}"; do
    echo "  ✓ Generating icon-${size}x${size}.png"
    convert "$SOURCE_LOGO" \
        -resize "${size}x${size}" \
        -background transparent \
        -gravity center \
        -extent "${size}x${size}" \
        "$ICONS_DIR/icon-${size}x${size}.png"
done

# Generate favicon (32x32)
echo "  ✓ Generating favicon.png (32x32)"
convert "$SOURCE_LOGO" \
    -resize "32x32" \
    -background transparent \
    -gravity center \
    -extent "32x32" \
    "client/public/favicon.png"

# Generate Apple touch icon (180x180) - standard iOS size
echo "  ✓ Generating apple-touch-icon.png (180x180)"
convert "$SOURCE_LOGO" \
    -resize "180x180" \
    -background transparent \
    -gravity center \
    -extent "180x180" \
    "$ICONS_DIR/apple-touch-icon.png"

# Also copy 192x192 as apple-touch-icon (fallback)
cp "$ICONS_DIR/icon-192x192.png" "$ICONS_DIR/apple-touch-icon-192x192.png"

echo ""
echo "✅ All icons generated successfully!"
echo ""
echo "📋 Generated files:"
ls -lh "$ICONS_DIR"
echo ""
echo "🎯 Next steps:"
echo "   1. Verify icons look good"
echo "   2. Test PWA install prompt"
echo "   3. Move to Task 1.3: Service Worker Setup"

