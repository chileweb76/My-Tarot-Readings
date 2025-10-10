// MongoDB-based store for push subscriptions
import { connectToDatabase } from './mongoConnection.js'

const MONGODB_URI = process.env.MONGODB_URI
const DB_NAME = 'mytarotreadings'

class SubscriptionStore {
  constructor() {
    this.subscriptions = new Set() // Fallback for when DB is unavailable
  }

  async add(subscription) {
    try {
      // optional second argument may be passed: userId
      const args = Array.from(arguments)
      const userId = args[1] || null

      if (!MONGODB_URI) {
        // Fallback to in-memory for local dev without DB
        const subscriptionString = JSON.stringify(subscription)
        this.subscriptions.add(subscriptionString)
        return true
      }

      const { db } = await connectToDatabase(MONGODB_URI, DB_NAME)
      const collection = db.collection('pushSubscriptions')
      
      // Create a unique identifier for the subscription
      const subscriptionId = this._generateSubscriptionId(subscription)
      
      const doc = {
        subscriptionId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        subscription: subscription,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      }
      if (userId) doc.userId = String(userId)

      const result = await collection.replaceOne(
        { subscriptionId },
        doc,
        { upsert: true }
      )
      
      return result.acknowledged
    } catch (error) {
      console.error('Error saving subscription to database:', error)
      // Fallback to in-memory
      const subscriptionString = JSON.stringify(subscription)
      this.subscriptions.add(subscriptionString)
      return true
    }
  }

  async remove(subscription) {
    try {
      if (!MONGODB_URI) {
        const subscriptionString = JSON.stringify(subscription)
        return this.subscriptions.delete(subscriptionString)
      }

      const { db } = await connectToDatabase(MONGODB_URI, DB_NAME)
      const collection = db.collection('pushSubscriptions')
      
      const subscriptionId = this._generateSubscriptionId(subscription)
  const result = await collection.deleteOne({ subscriptionId })
      
      return result.deletedCount > 0
    } catch (error) {
      console.error('Error removing subscription from database:', error)
      // Fallback to in-memory
      const subscriptionString = JSON.stringify(subscription)
      return this.subscriptions.delete(subscriptionString)
    }
  }

  async getAll() {
    try {
      if (!MONGODB_URI) {
        return Array.from(this.subscriptions).map(sub => JSON.parse(sub))
      }

      const { db } = await connectToDatabase(MONGODB_URI, DB_NAME)
      const collection = db.collection('pushSubscriptions')
      
      const subscriptions = await collection
        .find({ isActive: true })
        .toArray()
      
      return subscriptions.map(doc => doc.subscription)
    } catch (error) {
      console.error('Error fetching subscriptions from database:', error)
      // Fallback to in-memory
      try {
        return Array.from(this.subscriptions).map(sub => JSON.parse(sub))
      } catch (parseError) {
        console.error('Error parsing in-memory subscriptions:', parseError)
        return []
      }
    }
  }

  async getCount() {
    try {
      if (!MONGODB_URI) {
        return this.subscriptions.size
      }

      const { db } = await connectToDatabase(MONGODB_URI, DB_NAME)
      const collection = db.collection('pushSubscriptions')
      
      return await collection.countDocuments({ isActive: true })
    } catch (error) {
      console.error('Error counting subscriptions in database:', error)
      return this.subscriptions.size
    }
  }

  async clear() {
    try {
      if (!MONGODB_URI) {
        this.subscriptions.clear()
        return
      }

      const { db } = await connectToDatabase(MONGODB_URI, DB_NAME)
      const collection = db.collection('pushSubscriptions')
      
      await collection.updateMany({}, { $set: { isActive: false } })
    } catch (error) {
      console.error('Error clearing subscriptions in database:', error)
      this.subscriptions.clear()
    }
  }

  async markInactive(subscription) {
    try {
      if (!MONGODB_URI) return

      const { db } = await connectToDatabase(MONGODB_URI, DB_NAME)
      const collection = db.collection('pushSubscriptions')
      
      const subscriptionId = this._generateSubscriptionId(subscription)
      await collection.updateOne(
        { subscriptionId },
        { $set: { isActive: false, deactivatedAt: new Date() } }
      )
    } catch (error) {
      console.error('Error marking subscription as inactive:', error)
    }
  }

  // Helper method to generate a unique ID for a subscription
  _generateSubscriptionId(subscription) {
    // Use endpoint as unique identifier since it's unique per device/browser
    return Buffer.from(subscription.endpoint).toString('base64').slice(0, 50)
  }
}

// Export a singleton instance
const subscriptionStore = new SubscriptionStore()
export default subscriptionStore