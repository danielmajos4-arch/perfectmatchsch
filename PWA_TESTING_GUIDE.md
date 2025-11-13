# PWA Testing Guide - Task 1.5

## 🎯 Testing Checklist

Complete all tests to verify PWA functionality is working correctly.

---

## ✅ **Test 1: Install Prompt**

### Chrome/Edge (Desktop)
1. Open app in Chrome/Edge
2. Look for install icon in address bar (or menu)
3. Click install
4. Verify:
   - [ ] Install prompt appears
   - [ ] App installs successfully
   - [ ] App appears in applications/apps list
   - [ ] App opens in standalone window
   - [ ] App icon displays correctly
   - [ ] App name is correct ("PerfectMatch")

### Chrome (Android)
1. Open app in Chrome on Android
2. Look for "Add to Home Screen" banner
3. Or use menu → "Add to Home Screen"
4. Verify:
   - [ ] Install prompt appears
   - [ ] App installs to home screen
   - [ ] App icon displays correctly
   - [ ] App opens in standalone mode (no browser UI)

### Safari (iOS)
1. Open app in Safari on iOS
2. Tap Share button
3. Select "Add to Home Screen"
4. Verify:
   - [ ] App installs to home screen
   - [ ] App icon displays correctly
   - [ ] App opens in standalone mode
   - [ ] Status bar styling is correct

### Firefox
1. Open app in Firefox
2. Look for install prompt in address bar
3. Click install
4. Verify:
   - [ ] Install prompt appears
   - [ ] App installs successfully
   - [ ] App opens in standalone window

---

## ✅ **Test 2: Offline Mode**

### Test Offline Functionality
1. Open app in browser
2. Open DevTools → Application → Service Workers
3. Verify service worker is registered
4. Go offline:
   - DevTools → Network → Check "Offline"
   - Or disconnect internet
5. Test offline behavior:
   - [ ] Offline indicator appears
   - [ ] Previously visited pages load from cache
   - [ ] Static assets (JS, CSS) load from cache
   - [ ] Images load from cache
   - [ ] Offline page shows for new pages
   - [ ] App doesn't crash

### Test Coming Back Online
1. While offline, navigate app
2. Go back online
3. Verify:
   - [ ] "Back online" message appears
   - [ ] Message auto-dismisses after 2 seconds
   - [ ] App syncs with server
   - [ ] Fresh data loads

### Test API Calls Offline
1. Go offline
2. Try to:
   - [ ] View dashboard (should show cached data)
   - [ ] Browse jobs (should show cached jobs)
   - [ ] View profile (should show cached profile)
3. Verify:
   - [ ] Cached data displays
   - [ ] No errors in console
   - [ ] Graceful degradation

---

## ✅ **Test 3: Cache Strategies**

### Static Assets (Cache First)
1. Open DevTools → Network tab
2. Reload page
3. Check static assets:
   - [ ] JS files load from cache (disk cache or service worker)
   - [ ] CSS files load from cache
   - [ ] Fonts load from cache
   - [ ] Icons load from cache
4. Verify:
   - [ ] Fast load times
   - [ ] "from ServiceWorker" or "from disk cache" in Network tab

### API Calls (Network First)
1. Open DevTools → Network tab
2. Make API calls (load dashboard, jobs, etc.)
3. Verify:
   - [ ] API calls go to network first
   - [ ] Responses are cached
   - [ ] Offline: cached responses used
   - [ ] Cache expires after 5 minutes

### Images (Cache First with Expiry)
1. Load page with images
2. Reload page
3. Verify:
   - [ ] Images load from cache
   - [ ] Fast load times
   - [ ] Images refresh after 7 days

### HTML (Network First)
1. Navigate to different pages
2. Go offline
3. Navigate to previously visited pages
4. Verify:
   - [ ] Previously visited pages load from cache
   - [ ] New pages show offline page
   - [ ] No errors

---

## ✅ **Test 4: Service Worker Updates**

### Test Update Detection
1. Make a change to service worker (increment version)
2. Reload page
3. Verify:
   - [ ] Update prompt appears
   - [ ] "Update Now" button works
   - [ ] Page reloads after update
   - [ ] New service worker activates

### Test Update Installation
1. When update prompt appears
2. Click "Update Now"
3. Verify:
   - [ ] Loading state shows
   - [ ] Update installs
   - [ ] Page reloads automatically
   - [ ] New version is active

### Test "Later" Button
1. When update prompt appears
2. Click "Later"
3. Verify:
   - [ ] Prompt dismisses
   - [ ] Prompt shows again on next page load
   - [ ] Update still available

---

## ✅ **Test 5: Mobile Devices**

### iOS Safari
1. Open app on iPhone/iPad
2. Test:
   - [ ] Install to home screen
   - [ ] App opens in standalone mode
   - [ ] Offline mode works
   - [ ] Touch targets are adequate (44px+)
   - [ ] Layout is responsive
   - [ ] Icons display correctly

### Android Chrome
1. Open app on Android device
2. Test:
   - [ ] Install prompt appears
   - [ ] App installs to home screen
   - [ ] App opens in standalone mode
   - [ ] Offline mode works
   - [ ] Touch targets are adequate
   - [ ] Layout is responsive
   - [ ] Icons display correctly

### Tablet Testing
1. Test on iPad/Android tablet
2. Verify:
   - [ ] Layout adapts to tablet size
   - [ ] Touch interactions work
   - [ ] PWA install works
   - [ ] Offline mode works

---

## ✅ **Test 6: Icons Display**

### Verify Icons Exist
1. Check `client/public/icons/` directory
2. Verify all icon files exist:
   - [ ] icon-72x72.png
   - [ ] icon-96x96.png
   - [ ] icon-128x128.png
   - [ ] icon-144x144.png
   - [ ] icon-152x152.png
   - [ ] icon-192x192.png
   - [ ] icon-384x384.png
   - [ ] icon-512x512.png
   - [ ] apple-touch-icon.png (180x180)
   - [ ] favicon.png (32x32)

### Verify Icons in Browser
1. Open DevTools → Application → Manifest
2. Verify:
   - [ ] All icons listed
   - [ ] No 404 errors
   - [ ] Icons display in preview

### Verify Icons in Installed App
1. Install PWA
2. Verify:
   - [ ] App icon displays correctly
   - [ ] Icon matches brand
   - [ ] Icon is clear and readable
   - [ ] No pixelation or distortion

---

## 🛠️ **Testing Tools**

### Chrome DevTools
- **Application Tab**:
  - Service Workers: Check registration
  - Cache Storage: View cached resources
  - Manifest: Verify manifest and icons
- **Network Tab**:
  - Offline checkbox: Test offline mode
  - Disable cache: Test cache strategies
  - Throttling: Test slow networks

### Lighthouse
1. Open DevTools → Lighthouse
2. Run PWA audit
3. Verify:
   - [ ] PWA score: 90+
   - [ ] Installable: Yes
   - [ ] Service Worker: Registered
   - [ ] Manifest: Valid
   - [ ] Icons: All sizes present

### PWA Builder
1. Go to: https://www.pwabuilder.com/
2. Enter your app URL
3. Run tests
4. Verify all checks pass

---

## 📊 **Test Results Template**

```
Date: ___________
Tester: ___________
Browser: ___________
Device: ___________

Install Prompt:
- Chrome: [ ] Pass [ ] Fail
- Safari: [ ] Pass [ ] Fail
- Firefox: [ ] Pass [ ] Fail
- Android: [ ] Pass [ ] Fail
- iOS: [ ] Pass [ ] Fail

Offline Mode:
- Offline indicator: [ ] Pass [ ] Fail
- Cached pages load: [ ] Pass [ ] Fail
- Offline page shows: [ ] Pass [ ] Fail
- Back online works: [ ] Pass [ ] Fail

Cache Strategies:
- Static assets: [ ] Pass [ ] Fail
- API calls: [ ] Pass [ ] Fail
- Images: [ ] Pass [ ] Fail
- HTML: [ ] Pass [ ] Fail

Service Worker Updates:
- Update detection: [ ] Pass [ ] Fail
- Update installation: [ ] Pass [ ] Fail
- Update prompt: [ ] Pass [ ] Fail

Mobile Devices:
- iOS: [ ] Pass [ ] Fail
- Android: [ ] Pass [ ] Fail
- Tablet: [ ] Pass [ ] Fail

Icons:
- All icons exist: [ ] Pass [ ] Fail
- Icons display: [ ] Pass [ ] Fail
- App icon correct: [ ] Pass [ ] Fail

Issues Found:
_______________________________________
_______________________________________
_______________________________________
```

---

## 🐛 **Common Issues & Solutions**

### Issue: Service Worker Not Registering
**Solution**:
- Check if running in production mode
- Verify service-worker.js is accessible
- Check browser console for errors
- Ensure HTTPS (or localhost)

### Issue: Icons Not Displaying
**Solution**:
- Verify icons exist in `/icons/` directory
- Check manifest.json icon paths
- Clear browser cache
- Verify file permissions

### Issue: Update Prompt Not Showing
**Solution**:
- Check service worker version changed
- Verify update detection in hook
- Check browser console for errors
- Ensure service worker is registered

### Issue: Offline Mode Not Working
**Solution**:
- Verify service worker is registered
- Check cache strategies in service worker
- Verify resources are being cached
- Check browser console for errors

---

## ✅ **Success Criteria**

All tests should pass:
- [x] Install prompt works on all browsers
- [x] Offline mode functions correctly
- [x] Cache strategies work as expected
- [x] Service worker updates work
- [x] Mobile devices supported
- [x] Icons display correctly
- [x] Lighthouse PWA score: 90+

---

## 🚀 **Next Steps After Testing**

Once all tests pass:
- ✅ Task 1.5 Complete
- ⏭️ Move to Phase 1.2: Email Notifications Integration
- ⏭️ Or continue with Phase 2: Engagement & Gamification

---

**Happy Testing! 🧪**

