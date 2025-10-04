const webpush = require('web-push')

// VAPID key generation (console output suppressed for production)
const vapidKeys = webpush.generateVAPIDKeys()

// Keys would be output here in development
// Add to .env.local:
// VAPID_PUBLIC_KEY + vapidKeys.publicKey
// VAPID_PRIVATE_KEY + vapidKeys.privateKey 
// VAPID_SUBJECT=mailto:your-email@example.com
// NEXT_PUBLIC_VAPID_PUBLIC_KEY + vapidKeys.publicKey