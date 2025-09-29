// ES Module compatible MongoDB connection for push notifications
import { MongoClient } from 'mongodb'

let cachedClient = null
let cachedDb = null

export async function connectToDatabase(uri, dbName = 'mytarotreadings') {
  if (!uri) throw new Error('MONGODB_URI is not set')
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)
  cachedClient = client
  cachedDb = db
  return { client, db }
}