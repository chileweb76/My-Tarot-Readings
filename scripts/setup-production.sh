#!/bin/bash

# Production Setup Script for Push Notifications
# This script helps set up environment variables for Vercel deployment

echo "🔔 Push Notifications Production Setup"
echo "======================================"

# Check if VAPID keys exist in .env.local
if [ -f .env.local ]; then
  echo "✓ Found .env.local file"
  
  # Extract VAPID keys
  PUBLIC_KEY=$(grep VAPID_PUBLIC_KEY .env.local | cut -d '=' -f2)
  PRIVATE_KEY=$(grep VAPID_PRIVATE_KEY .env.local | cut -d '=' -f2)
  
  if [ -n "$PUBLIC_KEY" ] && [ -n "$PRIVATE_KEY" ]; then
    echo "✓ VAPID keys found in .env.local"
    
    echo ""
    echo "📋 Environment Variables for Vercel Production:"
    echo "=============================================="
    echo ""
    echo "Set these in your Vercel dashboard (Settings > Environment Variables):"
    echo ""
    echo "VAPID_PUBLIC_KEY=$PUBLIC_KEY"
    echo "VAPID_PRIVATE_KEY=$PRIVATE_KEY"
    echo "VAPID_SUBJECT=mailto:your-email@example.com"
    echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=$PUBLIC_KEY"
    echo "CRON_SECRET=$(openssl rand -base64 32)"
    echo ""
    echo "📖 Instructions:"
    echo "1. Go to your Vercel project dashboard"
    echo "2. Navigate to Settings > Environment Variables"
    echo "3. Add each variable above (replace your-email@example.com with your actual email)"
    echo "4. Set Environment to 'Production' for each variable"
    echo "5. Redeploy your application"
    echo ""
    
    # Generate deployment checklist
    echo "✅ Production Deployment Checklist:"
    echo "=================================="
    echo "□ VAPID keys added to Vercel environment variables"
    echo "□ MongoDB connection string (MONGODB_URI) is set"
    echo "□ CRON_SECRET is set for scheduled notifications"
    echo "□ Email address updated in VAPID_SUBJECT"
    echo "□ Application redeployed after adding environment variables"
    echo "□ Push notifications tested in production"
    echo "□ Daily notification cron job verified (runs at 9 AM UTC)"
    echo ""
    
  else
    echo "❌ VAPID keys not found in .env.local"
    echo "Run: npm run generate-vapid"
    exit 1
  fi
else
  echo "❌ .env.local file not found"
  echo "Run: npm run generate-vapid"
  exit 1
fi

echo "🚀 Ready for production deployment!"
echo ""
echo "💡 Additional Setup:"
echo "- Test notifications work in production after deployment"
echo "- Monitor MongoDB collection 'pushSubscriptions' for subscriber data"
echo "- Check Vercel Functions logs for notification delivery status"
echo "- Consider adding rate limiting for notification endpoints"