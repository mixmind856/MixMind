const Request = require("../models/Request");

/**
 * Stack Service for managing LIFO queues per venue
 * Uses MongoDB instead of Redis - queries Request collection directly
 * Status "queued" = items in queue (sorted by createdAt DESC for LIFO)
 */

/**
 * Push a song request onto the venue's stack (LIFO)
 * Note: Request is already created in DB, just needs to be "queued"
 * @param {string} venueId - Venue ID
 * @param {object} requestData - Request data (for logging only, actual data is in DB)
 */
async function pushToStack(venueId, requestData) {
  try {
    // Find the request in DB and ensure it's marked as queued
    const request = await Request.findById(requestData._id);
    
    if (!request) {
      return { success: false, error: "Request not found in database" };
    }
    
    // Ensure status is "queued"
    if (request.status !== "queued") {
      request.status = "queued";
      request.flowStatus = "queued";
      await request.save();
    }
    
    console.log(`📥 Added to queue: ${venueId}`);
    console.log(`   Song: ${requestData.title} by ${requestData.artist}`);
    console.log(`   Request ID: ${requestData._id}`);
    
    return { success: true, message: "Request added to queue" };
  } catch (err) {
    console.error(`❌ Error pushing to queue:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Pop from the venue's queue (LIFO - gets most recent/last added)
 * @param {string} venueId - Venue ID
 */
async function popFromStack(venueId) {
  try {
    // Find the MOST RECENT queued request (LIFO: sort by createdAt DESC, take first)
    const request = await Request.findOne({ 
      venueId: venueId, 
      status: "queued" 
    }).sort({ createdAt: -1 });
    
    if (!request) {
      console.log(`📭 Queue is empty for venue: ${venueId}`);
      return { success: true, data: null, message: "Queue is empty" };
    }
    
    // Convert to plain object matching the old Redis format
    const requestData = {
      _id: request._id.toString(),
      title: request.title || request.songTitle,
      artist: request.artist || request.artistName,
      price: request.price,
      userId: request.userId.toString(),
      userName: request.userName,
      createdAt: request.createdAt,
      checkoutSessionId: request.checkoutSessionId || null,
      paymentStatus: request.paymentStatus || null
    };
    
    console.log(`📤 Popped from queue: ${venueId}`);
    console.log(`   Song: ${requestData.title} by ${requestData.artist}`);
    console.log(`   Request ID: ${requestData._id}`);
    
    return { success: true, data: requestData };
  } catch (err) {
    console.error(`❌ Error popping from queue:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Remove a specific request from the queue
 * @param {string} venueId - Venue ID
 * @param {string} requestId - Request ID to remove
 */
async function removeFromStack(venueId, requestId) {
  try {
    const request = await Request.findOne({ 
      _id: requestId, 
      venueId: venueId, 
      status: "queued" 
    });
    
    if (!request) {
      console.log(`⚠️  Request not found in queue: ${requestId}`);
      return { success: true, message: "Request not found in queue" };
    }
    
    // Update status to something other than "queued"
    request.status = "rejected";
    request.flowStatus = "removed";
    await request.save();
    
    console.log(`🗑️  Removed request from queue: ${requestId}`);
    return { success: true, message: "Request removed from queue" };
  } catch (err) {
    console.error(`❌ Error removing from queue:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get queue size (number of queued requests)
 * @param {string} venueId - Venue ID
 */
async function getStackSize(venueId) {
  try {
    const size = await Request.countDocuments({ 
      venueId: venueId, 
      status: "queued" 
    });
    
    console.log(`📊 Queue size for venue ${venueId}: ${size}`);
    return { success: true, data: size };
  } catch (err) {
    console.error(`❌ Error getting queue size:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Peek at the queue (see what's next without removing)
 * @param {string} venueId - Venue ID
 * @param {number} count - Number of items to peek (default 5)
 */
async function peekStack(venueId, count = 5) {
  try {
    // Get the next N queued requests (LIFO: most recent first)
    const requests = await Request.find({ 
      venueId: venueId, 
      status: "queued" 
    })
      .sort({ createdAt: -1 })
      .limit(count)
      .lean();
    
    const items = requests.map(r => ({
      _id: r._id.toString(),
      title: r.title || r.songTitle,
      artist: r.artist || r.artistName,
      price: r.price,
      createdAt: r.createdAt
    }));
    
    console.log(`👁️  Peeking at queue for venue ${venueId}: ${items.length} items`);
    
    return { success: true, data: items };
  } catch (err) {
    console.error(`❌ Error peeking queue:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Clear entire queue for a venue
 * @param {string} venueId - Venue ID
 */
async function clearStack(venueId) {
  try {
    // Update all queued requests to rejected
    await Request.updateMany(
      { venueId: venueId, status: "queued" },
      { status: "rejected", flowStatus: "cleared" }
    );
    
    console.log(`🔄 Cleared queue for venue ${venueId}`);
    return { success: true, message: "Queue cleared" };
  } catch (err) {
    console.error(`❌ Error clearing queue:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  pushToStack,
  popFromStack,
  removeFromStack,
  getStackSize,
  peekStack,
  clearStack
};
