// MongoDB index creation for push subscriptions
import { connectToDatabase } from '../lib/mongoConnection.js'

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = 'mytarotreadings'

async function createIndexes() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set')
    process.exit(1)
  }

  try {
    console.log('Connecting to MongoDB...')
    const { db } = await connectToDatabase(MONGODB_URI, DB_NAME)
    const collection = db.collection('pushSubscriptions')

    console.log('Creating indexes for push subscriptions...')

    // Index on subscriptionId for fast lookups
    await collection.createIndex({ subscriptionId: 1 }, { unique: true })
    console.log('✓ Created index: subscriptionId')

    // Index on endpoint for fast lookups and deduplication
    await collection.createIndex({ endpoint: 1 })
    console.log('✓ Created index: endpoint')

    // Index on isActive for fast filtering of active subscriptions
    await collection.createIndex({ isActive: 1 })
    console.log('✓ Created index: isActive')

    // Compound index for active subscriptions by creation date
    await collection.createIndex({ isActive: 1, createdAt: -1 })
    console.log('✓ Created index: isActive + createdAt')

    // TTL index to automatically clean up old inactive subscriptions after 30 days
    await collection.createIndex(
      { deactivatedAt: 1 }, 
      { 
        expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days in seconds
        partialFilterExpression: { isActive: false }
      }
    )
    console.log('✓ Created TTL index: deactivatedAt (30 day cleanup)')

    console.log('🎉 All indexes created successfully!')
    
    // Display current subscription stats
    const stats = await collection.aggregate([
      {
        $facet: {
          active: [{ $match: { isActive: true } }, { $count: 'count' }],
          inactive: [{ $match: { isActive: false } }, { $count: 'count' }],
          total: [{ $count: 'count' }]
        }
      }
    ]).toArray()

    const activeCount = stats[0]?.active[0]?.count || 0
    const inactiveCount = stats[0]?.inactive[0]?.count || 0
    const totalCount = stats[0]?.total[0]?.count || 0

    console.log('\n📊 Subscription Statistics:')
    console.log(`Active subscriptions: ${activeCount}`)
    console.log(`Inactive subscriptions: ${inactiveCount}`)
    console.log(`Total subscriptions: ${totalCount}`)

    process.exit(0)
  } catch (error) {
    console.error('Error creating indexes:', error)
    process.exit(1)
  }
}

createIndexes()