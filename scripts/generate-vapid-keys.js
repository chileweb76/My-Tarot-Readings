const webpush = require('web-push')

console.log('Generating VAPID keys for push notifications...\n')

const vapidKeys = webpush.generateVAPIDKeys()

console.log('VAPID Keys Generated:')
console.log('==========================================')
console.log('Public Key:', vapidKeys.publicKey)
console.log('Private Key:', vapidKeys.privateKey)
console.log('==========================================\n')

console.log('Add these to your .env.local file:')
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey)
console.log('VAPID_SUBJECT=mailto:your-email@example.com')
console.log('\nAnd add this to your .env.local for the frontend:')
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey)
console.log('\n✨ Keys generated successfully!')