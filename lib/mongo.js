// MongoDB helper for serverless Vercel functions.
// Expects MONGODB_URI in process.env to be a full connection string.
const { MongoClient } = require('mongodb')

let cachedClient = null
let cachedDb = null

async function connectToDatabase(uri, dbName) {
  if (!uri) throw new Error('MONGODB_URI is not set')
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)
  cachedClient = client
  cachedDb = db
  return { client, db }
}

module.exports = { connectToDatabase }
