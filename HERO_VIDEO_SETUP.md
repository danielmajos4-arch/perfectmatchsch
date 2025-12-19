# 🎥 Hero Video Setup Guide

## Overview
The hero section now uses a continuous autoplay video (like Fiverr's landing page) instead of the image slideshow.

## ✅ What's Done
- Video component added to hero section
- Autoplay, loop, and muted attributes configured
- Error handling with fallback to image
- Responsive design maintained
- Dark overlay for text readability

## 📁 How to Add Your Video

### Step 1: Create Videos Directory
```bash
mkdir -p client/public/videos
```

### Step 2: Add Your Video File
Place your video file in: `client/public/videos/hero-video.mp4`

**Video Requirements:**
- **Format**: MP4 (H.264 codec) or WebM
- **Resolution**: 1920x1080 (Full HD) or 1280x720 (HD)
- **File Size**: Keep under 10MB for fast loading (5-8MB ideal)
- **Duration**: 10-30 seconds (will loop continuously)
- **Aspect Ratio**: 16:9 recommended

### Step 3: Optimize Your Video (Optional but Recommended)

**Using FFmpeg:**
```bash
# Compress video for web
ffmpeg -i your-video.mp4 -vcodec h264 -acodec aac -crf 23 -preset medium -vf "scale=1920:1080" client/public/videos/hero-video.mp4

# Or for smaller file size (720p)
ffmpeg -i your-video.mp4 -vcodec h264 -acodec aac -crf 28 -preset medium -vf "scale=1280:720" client/public/videos/hero-video.mp4
```

**Using Online Tools:**
- [CloudConvert](https://cloudconvert.com/mp4-converter)
- [HandBrake](https://handbrake.fr/) (desktop app)
- [FreeConvert](https://www.freeconvert.com/mp4-compressor)

### Step 4: Test
1. Start your dev server: `npm run dev`
2. Visit the home page
3. The video should autoplay, loop, and be muted

## 🎬 Video Content Ideas

**For PerfectMatchSchools:**
- Teachers in classrooms (diverse, engaging)
- Students learning and interacting
- School buildings and campuses
- Handshakes/interviews (connection theme)
- Graduation caps or education symbols
- Animated graphics showing matching/connection

**Style:**
- Professional but warm
- Fast-paced (2-3 second clips)
- Bright, inviting colors
- Smooth transitions
- No text overlays (text is in the hero section)

## 🔧 Customization

### Change Video Path
Edit `client/src/pages/Home.tsx`:
```typescript
const heroVideoUrl = '/videos/your-video-name.mp4';
```

### Change Fallback Image
Edit `client/src/pages/Home.tsx`:
```typescript
const heroVideoFallback = '/images/your-fallback-image.png';
```

### Add Multiple Video Formats (Better Browser Support)
```tsx
<video>
  <source src="/videos/hero-video.webm" type="video/webm" />
  <source src="/videos/hero-video.mp4" type="video/mp4" />
  <img src={heroVideoFallback} alt="Hero background" />
</video>
```

## ⚠️ Important Notes

1. **Autoplay Policy**: Videos must be muted to autoplay in most browsers
2. **Mobile Data**: Consider using a smaller video for mobile or lazy loading
3. **Performance**: Large videos (>10MB) will slow down page load
4. **Accessibility**: Video is decorative (no audio), so it's screen-reader friendly
5. **Fallback**: If video fails to load, it automatically shows the fallback image

## 🐛 Troubleshooting

**Video not playing?**
- Check file path: Should be `/videos/hero-video.mp4` in public folder
- Check browser console for errors
- Verify video format (MP4 H.264)
- Try refreshing with cache clear (Cmd/Ctrl + Shift + R)

**Video too large/slow?**
- Compress using FFmpeg or online tools
- Reduce resolution to 720p
- Reduce video duration
- Use WebM format for smaller file size

**Video not looping?**
- Check that `loop` attribute is present (it is)
- Some browsers may need the video to fully load first

## 📊 Performance Tips

1. **Preload**: Video uses `preload="auto"` for faster start
2. **Poster Image**: Shows immediately while video loads
3. **Optimization**: Compress video to balance quality and size
4. **CDN**: Consider hosting video on CDN for production

## ✅ Checklist

- [ ] Video file added to `client/public/videos/hero-video.mp4`
- [ ] Video is optimized (<10MB, H.264 codec)
- [ ] Video is 16:9 aspect ratio
- [ ] Video is 10-30 seconds long
- [ ] Tested on desktop browser
- [ ] Tested on mobile device
- [ ] Fallback image works if video fails

---

**Need help?** Check the video element in `client/src/pages/Home.tsx` for implementation details.
