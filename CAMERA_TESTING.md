## Camera Upload Testing Instructions

The camera functionality in web applications has specific requirements:

### Browser Requirements:
1. **Modern Browser**: Chrome, Firefox, Safari, Edge (latest versions)
2. **HTTPS**: Most browsers require HTTPS for camera access (localhost is usually exempt)
3. **Permissions**: User must grant camera permissions when prompted

### Testing Steps:
1. Open the application in a real browser (not VS Code Simple Browser)
2. Navigate to: `http://localhost:3001/decks`
3. Select a deck that has cards
4. Click the "📷 Camera" button on any card
5. Browser should prompt for camera permissions
6. After granting permissions, camera interface should appear

### Troubleshooting:
- If no camera prompt appears, check browser console for errors
- Ensure camera permissions are not blocked for localhost
- Try different browsers if one doesn't work
- On mobile devices, the camera should activate automatically

### Alternative Testing:
You can test by opening Chrome/Firefox directly to:
`http://localhost:3001/decks`

### What Should Happen:
- Click "📷 Camera" button
- Browser requests camera permission (first time)
- Camera interface opens (photo/video mode)
- Take photo
- Photo should upload automatically
- Card image should update

The VS Code Simple Browser doesn't support camera access, so you'll need to test in a regular browser.