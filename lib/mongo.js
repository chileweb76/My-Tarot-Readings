// MongoDB helper for serverless Vercel functions.
// Expects MONGODB_URI in process.env to be a full connection string.
import { MongoClient } from 'mongodb'

let cachedClient = null
let cachedDb = null

export async function connectToDatabase(uri = process.env.MONGODB_URI, dbName = 'mytarotreadings') {
  if (!uri) throw new Error('MONGODB_URI is not set in environment variables')
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb }

  try {
    const client = new MongoClient(uri)
    await client.connect()
    const db = client.db(dbName)
    cachedClient = client
    cachedDb = db
    console.log('Successfully connected to MongoDB')
    return { client, db }
  } catch (error) {
    console.error('MongoDB connection failed:', error)
    throw new Error(`MongoDB connection failed: ${error.message}`)
  }
}

export default connectToDatabase
