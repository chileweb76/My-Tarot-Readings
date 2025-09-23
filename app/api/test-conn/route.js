import { NextResponse } from 'next/server'
import { connectToDatabase } from '../../../lib/mongo'

const ALLOWED_ORIGINS = [process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : undefined, process.env.NEXT_PUBLIC_API_URL].filter(Boolean)

function getCorsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  }
}

export async function OPTIONS(request) {
  const origin = request.headers.get('origin') || ''
  const headers = getCorsHeaders(origin)
  return new NextResponse(null, { status: 204, headers })
}

export async function GET(request) {
  const origin = request.headers.get('origin') || ''
  const headers = getCorsHeaders(origin)

  try {
    const mongoUri = process.env.MONGODB_URI
    const dbName = process.env.MONGODB_DB || undefined
    const { client, db } = await connectToDatabase(mongoUri, dbName)
    // Simple ping: list collections count (doesn't require auth beyond connection)
    const collections = await db.listCollections().toArray()
    return NextResponse.json({ ok: true, collections: collections.map(c => c.name) }, { headers })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500, headers })
  }
}
