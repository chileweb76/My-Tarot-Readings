# Server Actions Implementation for My Tarot Readings PWA

This document outlines the comprehensive Server Actions implementation that enhances the Progressive Web App (PWA) functionality of My Tarot Readings.

## Overview

Server Actions have been implemented throughout the application to provide:
- **Progressive Enhancement**: Forms work without JavaScript
- **Better Performance**: Reduced client-side JavaScript bundle
- **Improved Security**: Server-side validation and processing
- **PWA Integration**: Enhanced offline capabilities and background sync

## Core Server Actions (`lib/actions.js`)

### Authentication Actions

#### `signInAction(formData)`
- **Purpose**: Handles user sign-in with email/password
- **Features**: 
  - JWT token generation
  - HTTP-only cookie authentication
  - Input validation
- **Form fields**: `email`, `password`
- **Returns**: Success with user data or error message

#### `signUpAction(formData)`
- **Purpose**: User registration with validation
- **Features**:
  - Password hashing with bcrypt
  - Duplicate user checking
  - Automatic JWT token creation
- **Form fields**: `username`, `email`, `password`
- **Returns**: Success with user data or validation errors

#### `signOutAction()`
- **Purpose**: Secure logout with cookie cleanup
- **Features**: Clears HTTP-only auth cookie and redirects

#### `resetPasswordAction(formData)`
- **Purpose**: Password reset request handling
- **Features**: Token generation for reset links
- **Form fields**: `email`
- **Returns**: Success message (security-conscious response)

### User Management Actions

#### `changeUsernameAction(formData)`
- **Purpose**: Updates user's username
- **Features**: 
  - Duplicate username validation
  - Database update with revalidation
- **Form fields**: `username`
- **Returns**: Success or error message

#### `changePasswordAction(formData)`
- **Purpose**: Secure password changes
- **Features**:
  - Current password verification
  - New password validation and confirmation
  - Secure hashing
- **Form fields**: `currentPassword`, `newPassword`, `verifyPassword`
- **Returns**: Success or validation error

#### `uploadProfilePictureAction(formData)`
- **Purpose**: Profile picture upload to Vercel Blob storage
- **Features**:
  - File type validation
  - Automatic filename generation
  - Database profile update
- **Form fields**: `picture` (file)
- **Returns**: Success with image URL or error

#### `removeProfilePictureAction()`
- **Purpose**: Removes user's profile picture
- **Features**: Database cleanup and revalidation
- **Returns**: Success confirmation

### Reading Management Actions

#### `saveReadingAction(formData)`
- **Purpose**: Creates or updates tarot readings
- **Features**:
  - Complex form data handling (cards, tags, images)
  - File upload support for reading images
  - JSON parsing for structured data
  - Create/update logic with ID detection
- **Form fields**: 
  - `querent`, `question`, `interpretation`, `spread`, `deck`
  - `cards` (JSON), `tags` (JSON), `image` (file)
  - `readingId` (for updates)
- **Returns**: Success with reading ID or error

#### `createTagAction(formData)`
- **Purpose**: Creates new tags for organizing readings
- **Features**:
  - Duplicate tag prevention
  - User-scoped tag creation
- **Form fields**: `tagName`
- **Returns**: Success with tag data or error

### Push Notification Actions

#### `subscribeToPushAction(formData)`
- **Purpose**: Manages push notification subscriptions
- **Features**:
  - Subscription data storage in MongoDB
  - Automatic cleanup and updates
- **Form fields**: `subscription` (JSON)
- **Returns**: Success or error message

#### `unsubscribeFromPushAction(formData)`
- **Purpose**: Removes push notification subscriptions
- **Form fields**: `endpoint`
- **Returns**: Confirmation message

### Deck Management Actions

#### `createDeckAction(formData)`
- **Purpose**: Creates custom tarot decks
- **Features**:
  - Deck image upload to Vercel Blob
  - User ownership tracking
- **Form fields**: `deckName`, `description`, `deckImage` (file)
- **Returns**: Success with deck ID or error

## PWA-Specific Server Actions (`lib/pwaActions.js`)

### PWA Installation Tracking

#### `savePwaInstallDataAction(formData)`
- **Purpose**: Tracks PWA installation events
- **Features**: User agent and platform tracking
- **Form fields**: `userAgent`, `platform`, `source`
- **Returns**: Installation tracking confirmation

#### `updatePwaPreferencesAction(formData)`
- **Purpose**: Manages PWA user preferences
- **Features**: Auto-sync, offline mode, caching preferences
- **Form fields**: `autoSync`, `offlineMode`, `cacheReadings`
- **Returns**: Preferences update confirmation

### Offline Data Management

#### `syncOfflineDataAction(formData)`
- **Purpose**: Syncs offline-created content to server
- **Features**:
  - Bulk sync for readings and tags
  - Temporary ID handling
  - Sync count reporting
- **Form fields**: `offlineReadings` (JSON), `offlineTags` (JSON)
- **Returns**: Sync summary with count

#### `scheduleBackgroundSyncAction(formData)`
- **Purpose**: Queues background sync jobs
- **Features**: Priority-based sync scheduling
- **Form fields**: `syncType`, `priority`
- **Returns**: Schedule confirmation

## Enhanced Service Worker Integration

### Server Action Support
- **Offline Queueing**: Failed Server Actions are queued for retry when online
- **Background Sync**: Automatic retry of failed actions
- **Cache Integration**: Optimized caching for Server Action responses

### PWA Enhancements
- **Installation Tracking**: Automatic PWA install event capture
- **Offline Detection**: Smart offline/online status management  
- **Background Sync**: Seamless sync when connectivity returns

## Client-Side Integration

### Form Enhancement Pattern
```jsx
// Example: Username change with Server Action
const [usernameState, usernameFormAction, usernamePending] = useActionState(async (prevState, formData) => {
  const result = await changeUsernameAction(formData)
  if (result.success) {
    // Handle success
    notify({ type: 'success', text: result.message })
    return { success: true }
  } else {
    // Handle error
    notify({ type: 'error', text: result.error })
    return { error: result.error }
  }
}, { success: false, error: null })

// Progressive enhancement - works without JS
<form action={usernameFormAction}>
  <input name="username" required />
  <button type="submit" disabled={usernamePending}>
    {usernamePending ? 'Saving...' : 'Save'}
  </button>
</form>
```

### PWA Components
- **PWAEnhancements.jsx**: Main PWA management interface
- **PushNotificationsServerActions.jsx**: Push notification management
- **IOSInstallPrompt.jsx**: iOS-specific installation guidance

## Security Features

### Authentication
- **HTTP-Only Cookies**: Secure token storage
- **JWT Verification**: Server-side token validation
- **CSRF Protection**: Automatic CSRF protection with Server Actions

### Data Validation
- **Server-Side Validation**: All inputs validated on server
- **File Type Checking**: Secure file upload validation
- **SQL Injection Prevention**: MongoDB parameterized queries

### Privacy
- **User Data Isolation**: All queries scoped to authenticated user
- **Secure File Handling**: Controlled file upload and storage

## Deployment Configuration

### Environment Variables Required
```env
# Core
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_connection_string

# File Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=your_email@domain.com

# Production
CRON_SECRET=your_cron_secret
```

### Vercel Configuration (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

## Performance Benefits

### Client-Side Bundle Reduction
- **Reduced JavaScript**: Form handling moved to server
- **Faster Initial Load**: Less client-side code to download
- **Better Caching**: Server Actions benefit from HTTP caching

### Server-Side Benefits
- **Edge Optimization**: Server Actions run at edge locations
- **Database Connection Pooling**: Efficient database usage
- **Automatic Retries**: Built-in error handling and retries

### PWA Performance
- **Offline Functionality**: Core features work without network
- **Background Sync**: Seamless data synchronization
- **Reduced Data Usage**: Smart caching and offline storage

## Testing and Validation

### Form Validation Testing
1. **Client-Side Disabled**: Test with JavaScript disabled
2. **Network Failures**: Test offline form submissions
3. **Invalid Data**: Verify server-side validation
4. **Large Files**: Test file upload limits

### PWA Testing
1. **Installation**: Test PWA installation flow
2. **Offline Mode**: Verify offline functionality
3. **Background Sync**: Test sync after reconnection
4. **Push Notifications**: Validate notification delivery

This implementation provides a robust, secure, and progressive web application that works seamlessly across all devices and network conditions while maintaining excellent performance and user experience.