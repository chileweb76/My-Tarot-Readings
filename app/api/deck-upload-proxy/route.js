// Deck-specific proxy API route to handle blob uploads without CORS issues
// This runs on the same domain as the frontend, eliminating CORS problems
// Uses hierarchical folder structure: decks/{deckId}/{ownerUsername}/{cover|cards}/filename

import { put } from '@vercel/blob'

export async function POST(request) {
  try {
    // Set CORS headers for any preflight requests
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-deck-id, x-card-name, x-owner-username',
    }

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers })
    }
    
    // Get deck info from query params or headers
    const url = new URL(request.url)
    const deckId = url.searchParams.get('deckId') || request.headers.get('x-deck-id')
    const cardName = url.searchParams.get('cardName') || request.headers.get('x-card-name')
    const ownerUsername = url.searchParams.get('ownerUsername') || request.headers.get('x-owner-username')
    
    if (!deckId) {
      return new Response(JSON.stringify({ error: 'Deck ID required' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' }
      })
    }

    if (!ownerUsername) {
      return new Response(JSON.stringify({ error: 'Owner username required for hierarchical storage' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' }
      })
    }

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' }
      })
    }

    // Check if we have the required token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: Missing blob storage token' 
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' }
      })
    }

    // Build hierarchical path: decks/{deckId}/{ownerUsername}/{cover|cards}/filename
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const sanitizedOwner = ownerUsername.replace(/[^a-zA-Z0-9_-]/g, '_')
    const folderType = cardName ? 'cards' : 'cover'
    
    let filename
    if (cardName) {
      // Card image: decks/{deckId}/{owner}/cards/{cardName}-{timestamp}.ext
      const sanitizedCardName = cardName.replace(/[^a-zA-Z0-9_-]/g, '_')
      filename = `decks/${deckId}/${sanitizedOwner}/cards/${sanitizedCardName}-${Date.now()}.${fileExtension}`
    } else {
      // Deck cover: decks/{deckId}/{owner}/cover/cover-{timestamp}.ext
      filename = `decks/${deckId}/${sanitizedOwner}/cover/cover-${Date.now()}.${fileExtension}`
    }
    
    // Upload to Vercel Blob with hierarchical folder structure
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
      addRandomSuffix: false // We're adding timestamp manually
    })

    // Return the blob URL
    return new Response(JSON.stringify({
      success: true,
      url: blob.url,
      imageUrl: blob.url,
      image: blob.url, // For backward compatibility
      deckId: deckId,
      cardName: cardName || null,
      path: filename,
      message: 'Deck image uploaded successfully to Vercel Blob'
    }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[Deck Upload Proxy] Error:', error.message)

    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Upload failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

// Export OPTIONS handler for CORS preflight
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-deck-id, x-card-name, x-owner-username',
    }
  })
}
