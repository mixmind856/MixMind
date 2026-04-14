/**
 * Beatsource Flow
 * Handles the actual BeatSource API integration and music processing
 * 
 * This is the core business logic for uploading to BeatSource
 * Separated from the worker to allow testing and reuse
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Load BeatSource credentials
const BEATSOURCE_CONFIG = require("./beatsourceConfig");

/**
 * Upload music to BeatSource and return track information
 * @param {Object} request - Request document with song details
 * @returns {Promise<Object>} - { trackId, url, metadata }
 */
async function runBeatsourceFlow(request) {
  try {
    console.log(`🎵 Processing song: ${request.songTitle} by ${request.artist}`);

    // Step 1: Validate request data
    validateRequestData(request);

    // Step 2: Prepare music metadata
    const metadata = prepareMetadata(request);

    // Step 3: Call BeatSource API
    const result = await uploadToBeatsource(metadata);

    // Step 4: Validate result
    validateBeatsourceResult(result);

    console.log(`✅ Successfully uploaded to BeatSource: ${result.trackId}`);

    return {
      trackId: result.trackId,
      url: result.trackUrl,
      metadata: result.metadata,
      uploadedAt: new Date()
    };

  } catch (error) {
    console.error(`❌ BeatSource flow failed: ${error.message}`);
    throw error;
  }
}

/**
 * Validate request has all required fields
 * @param {Object} request - Request to validate
 */
function validateRequestData(request) {
  const required = ["songTitle", "artist", "genre", "price"];

  for (const field of required) {
    if (!request[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

/**
 * Prepare metadata for BeatSource upload
 * @param {Object} request - Request with song details
 * @returns {Object} - Formatted metadata
 */
function prepareMetadata(request) {
  return {
    title: request.songTitle,
    artist: request.artist,
    genre: request.genre,
    duration: request.duration || 0,
    price: request.price,
    description: request.description || `${request.artist} - ${request.songTitle}`,
    tags: (request.tags || []).join(","),
    requestId: request._id.toString()
  };
}

/**
 * Call BeatSource API to upload music
 * This is a placeholder - integrate with real BeatSource API
 * @param {Object} metadata - Metadata to send
 * @returns {Promise<Object>} - API response
 */
async function uploadToBeatsource(metadata) {
  // Demo mode: Return mock data
  if (process.env.DEMO_MODE === "true" || !BEATSOURCE_CONFIG.API_KEY) {
    console.log(`🎪 Demo Mode: Simulating BeatSource upload for ${metadata.title}`);
    return {
      success: true,
      trackId: `demo_track_${Date.now()}`,
      trackUrl: `https://beatsource.com/track/demo_${Date.now()}`,
      metadata: metadata
    };
  }

  // Real mode: Call actual BeatSource API
  try {
    const response = await axios.post(
      `${BEATSOURCE_CONFIG.API_ENDPOINT}/tracks/upload`,
      metadata,
      {
        headers: {
          Authorization: `Bearer ${BEATSOURCE_CONFIG.API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`BeatSource API error: ${error.response.status} - ${error.response.data?.message}`);
    }
    throw new Error(`BeatSource API request failed: ${error.message}`);
  }
}

/**
 * Validate BeatSource API response
 * @param {Object} result - API response
 */
function validateBeatsourceResult(result) {
  if (!result.trackId) {
    throw new Error("No track ID returned from BeatSource");
  }

  if (!result.trackUrl) {
    throw new Error("No track URL returned from BeatSource");
  }
}

/**
 * Retry logic for failed uploads
 * @param {Object} request - Request to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Object>} - Upload result
 */
async function uploadWithRetry(request, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Attempt ${attempt}/${maxRetries}: Uploading ${request.songTitle}`);
      return await runBeatsourceFlow(request);
    } catch (error) {
      lastError = error;
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError.message}`);
}

module.exports = {
  runBeatsourceFlow,
  uploadWithRetry,
  validateRequestData,
  prepareMetadata,
  uploadToBeatsource,
  validateBeatsourceResult
};
