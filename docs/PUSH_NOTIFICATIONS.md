# Push Notifications Implementation

This document explains how web push notifications are implemented in My Tarot Readings PWA.

## Overview

The app now supports web push notifications using the Web Push Protocol and VAPID (Voluntary Application Server Identification) for secure delivery.

## Components

### Frontend Components

- **`components/PushNotifications.jsx`** - Main UI component for managing push notification subscriptions
- **`components/NotificationTester.jsx`** - Admin testing interface for sending test notifications
- **`components/ServiceWorkerRegister.jsx`** - Registers the service worker that handles notifications

### Service Worker

- **`public/service-worker.js`** - Enhanced service worker with push notification event handlers
  - Handles `push` events and displays notifications
  - Handles `notificationclick` events for user interaction

### Backend API Endpoints

- **`/api/push/subscribe`** - Subscribe a device to push notifications (POST)
- **`/api/push/unsubscribe`** - Unsubscribe a device (POST)
- **`/api/push/test`** - Send a test notification to all subscribers (POST)
- **`/api/push/send`** - Send typed notifications (daily reading, reminders, etc.) (POST)

### Utilities

- **`lib/subscriptionStore.js`** - In-memory storage for push subscriptions (replace with database in production)
- **`lib/pushService.js`** - Service class for sending different types of notifications

## Setup

### 1. Generate VAPID Keys

```bash
npm run generate-vapid
```

### 2. Add Environment Variables

Add these to your `.env.local`:

```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
```

### 3. Install Dependencies

The web-push package is already included in package.json:

```bash
npm install
```

## Usage

### For Users

1. Visit `/settings` page
2. Enable push notifications when prompted
3. Grant browser permission for notifications
4. Test notifications using the testing panel (admin feature)

### For Developers

#### Sending Custom Notifications

```javascript
import PushNotificationService from '../lib/pushService.js'

// Send custom notification
await PushNotificationService.sendToAll({
  title: 'Custom Title',
  body: 'Custom message',
  url: '/target-page',
  tag: 'custom-tag'
})

// Send predefined types
await PushNotificationService.sendDailyReading()
await PushNotificationService.sendReadingReminder('Reading Title', '/reading/123')
await PushNotificationService.sendNewInsight({ message: 'New insight available!' })
```

#### Via API Endpoints

```javascript
// Send daily reading notification
fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'daily-reading'
  })
})

// Send custom notification
fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'custom',
    data: {
      title: 'Custom Title',
      body: 'Custom message',
      url: '/target-page'
    }
  })
})
```

## Notification Types

- **`daily-reading`** - Daily tarot reading reminders
- **`new-insight`** - New insights or tips
- **`reading-reminder`** - Reminders about specific readings
- **`custom`** - Custom notifications with full control

## Browser Support

Web push notifications are supported in:
- **Chrome 50+** (Desktop & Android) - Full support
- **Firefox 44+** (Desktop & Android) - Full support  
- **Safari 16+** (macOS) - Full support
- **Safari 16.4+** (iOS) - ⚠️ **PWA installation required**
- **Edge 17+** - Full support

### iOS-Specific Requirements

**⚠️ Important for iOS users:**

1. **iOS 16.4+** required (released March 2023)
2. **PWA must be installed** to home screen via Safari
3. **Notifications only work in standalone mode** (not in Safari browser)
4. **User gesture required** for permission prompt

**iOS Installation Flow:**
1. Open site in Safari on iOS
2. Tap Share button (⬆️) 
3. Select "Add to Home Screen"
4. Open app from home screen
5. Enable notifications in app settings

**iOS Components Added:**
- `PushNotificationsIOS.jsx` - iOS-specific notification handling
- `PushNotificationsUniversal.jsx` - Auto-detects device type
- `IOSInstallPrompt.jsx` - Prompts iOS users to install PWA
- iOS-specific meta tags in layout for proper PWA behavior

## Security & Privacy

- Uses VAPID for authenticated delivery
- Subscriptions are stored locally (replace with database for production)
- No personal data is transmitted with notifications
- Users can unsubscribe at any time

## Production Setup

### 1. Generate VAPID Keys (if not done)

```bash
npm run generate-vapid
```

### 2. Set Up Vercel Environment Variables

```bash
npm run setup-production
```

This will display the environment variables you need to add to your Vercel project:

- `VAPID_PUBLIC_KEY` - Public VAPID key for client-side subscription
- `VAPID_PRIVATE_KEY` - Private VAPID key for server-side sending
- `VAPID_SUBJECT` - Contact email (replace with your actual email)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - Public key accessible to frontend
- `CRON_SECRET` - Secret for authenticating cron job requests
- `MONGODB_URI` - MongoDB connection string (should already be set)

### 3. Create Database Indexes

After deployment, run this to optimize database performance:

```bash
npm run create-indexes
```

### 4. Deploy and Test

1. Deploy to Vercel with new environment variables
2. Test push notification subscription in production
3. Verify daily notifications work (scheduled for 9 AM UTC)
4. Monitor Vercel Function logs for any errors

## Production Features

✅ **MongoDB Storage**: Subscriptions are stored in MongoDB with proper indexing
✅ **Automatic Cleanup**: Inactive subscriptions are automatically deleted after 30 days
✅ **Error Handling**: Invalid subscriptions are marked inactive and cleaned up
✅ **Scheduled Notifications**: Daily reading reminders via Vercel Cron
✅ **Integration Triggers**: Notifications sent when readings are created
✅ **Fallback Support**: In-memory fallback when database is unavailable

## Testing

1. Open `/settings` in your app
2. Enable notifications and grant permissions
3. Use the "Notification Testing" panel to send test notifications
4. Check browser DevTools → Application → Service Workers for registration status
5. Check browser DevTools → Application → Storage → IndexedDB for subscription storage

## Troubleshooting

- **No notifications received**: Check browser permissions and VAPID keys
- **Service worker not registering**: Check console for errors and HTTPS requirement
- **VAPID errors**: Ensure keys are correctly set in environment variables
- **Subscription failures**: Verify VAPID public key matches between client and server