#!/bin/bash

# OAuth Flow Test Script
# Run this to test your OAuth configuration

echo "🔍 Testing My Tarot Readings OAuth Flow"
echo "======================================="
echo ""

echo "1. Testing backend auth endpoints..."
echo "   Backend URL: https://mytarotreadingsserver.vercel.app"
echo ""

echo "2. OAuth URLs to test:"
echo "   Google OAuth Start: https://mytarotreadingsserver.vercel.app/api/auth/google"
echo "   OAuth Callback: https://mytarotreadingsserver.vercel.app/api/auth/google/callback"
echo ""

echo "3. Expected flow:"
echo "   a) Visit Google OAuth Start URL"
echo "   b) Authorize with Google"
echo "   c) Should redirect to: https://mytarotreadings.vercel.app/auth/success?provider=google&token=..."
echo ""

echo "4. If you see errors, check:"
echo "   - Vercel environment variables (CLIENT_URL, GOOGLE_CLIENT_ID, etc.)"
echo "   - Google Cloud Console OAuth configuration"
echo "   - Browser network tab for failed requests"
echo ""

echo "🚀 Ready to test? Visit this URL:"
echo "   https://mytarotreadingsserver.vercel.app/api/auth/google"