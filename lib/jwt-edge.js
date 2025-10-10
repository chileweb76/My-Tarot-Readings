/**
 * Web Crypto API compatible JWT utilities for Edge Runtime
 * Replaces jsonwebtoken for middleware usage
 */

// Convert string to ArrayBuffer


// Convert ArrayBuffer to base64url
function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Convert base64url to ArrayBuffer
function base64UrlToArrayBuffer(base64url) {
  // Add padding if needed
  const padding = '='.repeat((4 - base64url.length % 4) % 4)
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding
  
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  // Return the Uint8Array itself (a TypedArray) which is widely accepted by
  // SubtleCrypto implementations as the signature/data parameter. Some
  // runtimes are picky about raw ArrayBuffer vs TypedArray; returning the
  // Uint8Array ensures compatibility.
  return bytes
}

/**
 * Verify JWT token using Web Crypto API
 * @param {string} token - JWT token to verify
 * @param {string} secret - JWT secret
 * @returns {Promise<object>} - Decoded payload
 */
export async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }

    const [headerB64, payloadB64, signatureB64] = parts
    
    // Import the secret key
    const secretBuffer = new TextEncoder().encode(secret)
    const key = await crypto.subtle.importKey(
      'raw',
      secretBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Prepare data for verification
    const dataToVerify = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    
  // Convert signature from base64url to a TypedArray (Uint8Array)
  const signatureBytes = base64UrlToArrayBuffer(signatureB64)
    
  // Ensure data is a TypedArray as well
  const dataBytes = (dataToVerify instanceof Uint8Array) ? dataToVerify : new Uint8Array(dataToVerify)

  const isValid = await crypto.subtle.verify({ name: 'HMAC' }, key, signatureBytes, dataBytes)
    
    if (!isValid) {
      throw new Error('Invalid signature')
    }

    // Decode payload
    const payloadJson = new TextDecoder().decode(base64UrlToArrayBuffer(payloadB64))
    const payload = JSON.parse(payloadJson)

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('Token expired')
    }

    return payload
  } catch (error) {
    throw new Error(`JWT verification failed: ${error.message}`)
  }
}

/**
 * Decode JWT token without verification (for inspection)
 * @param {string} token - JWT token to decode
 * @returns {object} - Decoded payload
 */
export function decodeJWT(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }

    const payloadB64 = parts[1]
    const payloadJson = new TextDecoder().decode(base64UrlToArrayBuffer(payloadB64))
    return JSON.parse(payloadJson)
  } catch (error) {
    throw new Error(`JWT decode failed: ${error.message}`)
  }
}