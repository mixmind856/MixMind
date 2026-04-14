const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Last.fm API configuration
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || "2589618cdc49455672c3480cf7c3ce4c";
const LASTFM_BASE_URL = "http://ws.audioscrobbler.com/2.0/";

// Load song database from JSON
let songDatabase = [];
try {
  const songDatabasePath = path.join(__dirname, "../data/songs.json");
  if (fs.existsSync(songDatabasePath)) {
    const rawData = fs.readFileSync(songDatabasePath, "utf8");
    songDatabase = JSON.parse(rawData);
    console.log(`✅ Loaded ${songDatabase.length} songs from database`);
  }
} catch (err) {
  console.warn(`⚠️  Failed to load song database:`, err.message);
  songDatabase = [];
}

/**
 * Check if song exists in local database
 * @param {string} trackName - Song name
 * @param {string} artistName - Artist name
 * @returns {Object|null} Song object or null
 */
function findSongInDatabase(trackName, artistName) {
  const cleanTrack = (trackName || "").trim().toLowerCase();
  const cleanArtist = (artistName || "").trim().toLowerCase();

  return songDatabase.find(song => 
    song.name.toLowerCase() === cleanTrack && 
    song.artist.toLowerCase() === cleanArtist
  );
}

/**
 * Check if a genre is compatible with venue genres
 * @param {string} songGenre - Genre from database
 * @param {string[]} secondaryGenres - Secondary genres from database
 * @param {string[]} venueGenres - Venue's preferred genres
 * @returns {Object} { isMatch: boolean, matchedGenres: string[] }
 */
function checkGenreCompatibility(songGenre, secondaryGenres = [], venueGenres = []) {
  if (!venueGenres || venueGenres.length === 0) {
    return {
      isMatch: true,
      matchedGenres: [],
      reason: "No genre restrictions"
    };
  }

  const allSongGenres = [songGenre, ...secondaryGenres].filter(Boolean);
  const matchedGenres = allSongGenres.filter(g => 
    venueGenres.includes(g)
  );

  return {
    isMatch: matchedGenres.length > 0,
    matchedGenres: matchedGenres,
    reason: matchedGenres.length > 0 
      ? `Matched genres: ${matchedGenres.join(", ")}`
      : `Song genres (${allSongGenres.join(", ")}) don't match venue selection (${venueGenres.join(", ")})`
  };
}

/**
 * Fetch track information from Last.fm and extract genre tags
 * @param {string} trackName - Song/track name
 * @param {string} artistName - Artist name
 * @returns {Promise<{success: boolean, tags: string[], error?: string}>}
 */
async function getTrackGenreTags(trackName, artistName) {
  try {
    // Trim whitespace from inputs
    const cleanTrackName = (trackName || "").trim();
    const cleanArtistName = (artistName || "").trim();
    
    console.log(`\n🔍 Fetching Last.fm info for: "${cleanTrackName}" by "${cleanArtistName}"`);

    const response = await axios.get(LASTFM_BASE_URL, {
      params: {
        method: "track.getInfo",
        api_key: LASTFM_API_KEY,
        artist: cleanArtistName,
        track: cleanTrackName,
        format: "json"
      },
      timeout: 5000
    });

    if (!response.data.track) {
      console.log(`⚠️  Track not found on Last.fm`);
      return { success: false, tags: [], error: "Track not found on Last.fm" };
    }

    const track = response.data.track;
    const toptags = track.toptags?.tag || [];

    // Extract tag names and filter out empty values
    const tags = Array.isArray(toptags)
      ? toptags.map(tag => tag.name?.toLowerCase()).filter(t => t)
      : (toptags.name ? [toptags.name.toLowerCase()] : []);

    if (tags.length === 0) {
      console.log(`⚠️  No tags found for this track on Last.fm`);
      return { success: true, tags: [], message: "Track found but no tags available" };
    }

    console.log(`✅ Found ${tags.length} genre tags on Last.fm: ${tags.join(", ")}`);

    return {
      success: true,
      tags: tags,
      trackInfo: {
        name: track.name,
        artist: track.artist?.name,
        album: track.album?.title,
        duration: track.duration,
        listeners: track.listeners,
        playcount: track.playcount
      }
    };
  } catch (err) {
    console.error(`❌ Last.fm API error:`, err.message);
    return { success: false, tags: [], error: err.message };
  }
}

/**
 * Check if song genre/tags match venue's preferred genres
 * @param {string[]} songTags - Tags from Last.fm for the song
 * @param {string[]} venueGenres - Preferred genres selected by venue
 * @returns {Promise<{isMatch: boolean, matchedTag: string, songTags: string[], venueGenres: string[]}>}
 */
function checkGenreMatch(songTags, venueGenres) {
  if (!venueGenres || venueGenres.length === 0) {
    console.log(`⚠️  No venue genres configured - accepting all songs`);
    return {
      isMatch: true,
      matchedTag: null,
      songTags,
      venueGenres,
      reason: "No genre restrictions"
    };
  }

  // Normalize venue genres to lowercase
  const normalizedVenueGenres = venueGenres.map(g => g?.toLowerCase());

  // Check if any song tag matches any venue genre
  for (const tag of songTags) {
    if (normalizedVenueGenres.includes(tag)) {
      console.log(`✅ Genre match found: "${tag}"`);
      return {
        isMatch: true,
        matchedTag: tag,
        songTags,
        venueGenres
      };
    }
  }

  console.log(`❌ No genre match found`);
  console.log(`   Song tags: ${songTags.join(", ")}`);
  console.log(`   Venue genres: ${normalizedVenueGenres.join(", ")}`);

  return {
    isMatch: false,
    matchedTag: null,
    songTags,
    venueGenres,
    reason: `Song genres (${songTags.join(", ")}) don't match venue genres (${normalizedVenueGenres.join(", ")})`
  };
}

/**
 * Complete genre validation: fetch from Last.fm and check match
 * @param {string} trackName - Song name
 * @param {string} artistName - Artist name
 * @param {string[]} venueGenres - Venue's preferred genres
 * @returns {Promise<{isValid: boolean, tags: string[], matchedTag: string, error: string}>}
 */
async function validateSongGenre(trackName, artistName, venueGenres) {
  try {
    // Step 1: Fetch from Last.fm
    const lastfmResult = await getTrackGenreTags(trackName, artistName);

    if (!lastfmResult.success) {
      return {
        isValid: false,
        tags: [],
        matchedTag: null,
        error: lastfmResult.error || "Failed to fetch track info"
      };
    }

    // Step 2: Check genre match
    const matchResult = checkGenreMatch(lastfmResult.tags, venueGenres);

    return {
      isValid: matchResult.isMatch,
      tags: lastfmResult.tags,
      matchedTag: matchResult.matchedTag,
      trackInfo: lastfmResult.trackInfo,
      reason: matchResult.reason,
      error: null
    };
  } catch (err) {
    console.error(`❌ Genre validation error:`, err.message);
    return {
      isValid: false,
      tags: [],
      matchedTag: null,
      error: err.message
    };
  }
}

/**
 * ENHANCED genre validation: Database → Last.fm → Auto-pass
 * @param {string} trackName - Song name
 * @param {string} artistName - Artist name
 * @param {string[]} venueGenres - Venue's preferred genres
 * @param {boolean} genreCheckBypass - "All Genres" mode - bypass all checks
 * @returns {Promise<{isValid: boolean, source: string, reason: string, venueGenres: string[], availableGenres?: string[]}>}
 */
async function validateSongGenreWithDatabase(trackName, artistName, venueGenres, genreCheckBypass = false) {
  try {
    console.log(`\n🎵 ENHANCED GENRE VALIDATION`);
    console.log(`   Song: "${trackName}" by "${artistName}"`);
    console.log(`   Venue genres: ${venueGenres.length > 0 ? venueGenres.join(", ") : "None selected"}`);
    console.log(`   Bypass mode: ${genreCheckBypass ? "ON (pass all)" : "OFF"}`);

    // ===== STEP 1: Check if "All Genres" mode is enabled =====
    if (genreCheckBypass === true) {
      console.log(`   ✅ Genre check bypassed - accepting all songs`);
      return {
        isValid: true,
        source: "bypass",
        reason: "All Genres mode enabled - all songs accepted",
        venueGenres: venueGenres || []
      };
    }

    // ===== STEP 2: Check if song is in local database =====
    const databaseSong = findSongInDatabase(trackName, artistName);
    
    if (databaseSong) {
      console.log(`   📚 Found in database`);
      
      // Check if essential song (always pass)
      if (databaseSong.essential === true) {
        console.log(`   ✅ Essential song - auto-passing (${databaseSong.moment || "special"})`);
        return {
          isValid: true,
          source: "database_essential",
          reason: `Essential song "${databaseSong.moment || "moment"}" - always accepted`,
          venueGenres: venueGenres || [],
          matchedGenres: [databaseSong.genre]
        };
      }

      // Check genre compatibility
      const compatibility = checkGenreCompatibility(
        databaseSong.genre,
        databaseSong.secondary,
        venueGenres
      );

      if (compatibility.isMatch) {
        console.log(`   ✅ Genre match in database: ${compatibility.matchedGenres.join(", ")}`);
        return {
          isValid: true,
          source: "database_match",
          reason: compatibility.reason,
          venueGenres: venueGenres || [],
          matchedGenres: compatibility.matchedGenres,
          songGenres: [databaseSong.genre, ...((databaseSong.secondary || []))]
        };
      } else {
        console.log(`   ❌ Genre mismatch in database`);
        return {
          isValid: false,
          source: "database_mismatch",
          reason: compatibility.reason,
          venueGenres: venueGenres || [],
          availableGenres: songDatabase.reduce((acc, song) => {
            const genres = [song.genre, ...(song.secondary || [])];
            return [...new Set([...acc, ...genres])];
          }, []).sort()
        };
      }
    }

    console.log(`   ℹ️  Not in database - checking Last.fm`);

    // ===== STEP 3: Check Last.fm if not in database =====
    const lastfmResult = await getTrackGenreTags(trackName, artistName);

    if (!lastfmResult.success || lastfmResult.tags.length === 0) {
      console.log(`   ⚠️  Last.fm: No tags found or track not found`);
      console.log(`   ✅ Auto-passing (no genre data available)`);
      return {
        isValid: true,
        source: "auto_pass_no_data",
        reason: "No genre data available - auto-passing",
        venueGenres: venueGenres || []
      };
    }

    // Check Last.fm tags against venue genres
    const matchResult = checkGenreMatch(lastfmResult.tags, venueGenres);

    if (matchResult.isMatch) {
      console.log(`   ✅ Last.fm match: ${matchResult.matchedTag}`);
      return {
        isValid: true,
        source: "lastfm_match",
        reason: `Last.fm tags match venue selection: ${matchResult.matchedTag}`,
        venueGenres: venueGenres || [],
        lastfmTags: lastfmResult.tags,
        matchedGenres: [matchResult.matchedTag]
      };
    } else {
      console.log(`   ❌ Last.fm mismatch`);
      return {
        isValid: false,
        source: "lastfm_mismatch",
        reason: matchResult.reason,
        venueGenres: venueGenres || [],
        lastfmTags: lastfmResult.tags,
        availableGenres: songDatabase.reduce((acc, song) => {
          const genres = [song.genre, ...(song.secondary || [])];
          return [...new Set([...acc, ...genres])];
        }, []).sort()
      };
    }
  } catch (err) {
    console.error(`❌ Enhanced genre validation error:`, err.message);
    return {
      isValid: false,
      source: "error",
      reason: `Validation error: ${err.message}`,
      venueGenres: venueGenres || []
    };
  }
}

module.exports = {
  getTrackGenreTags,
  checkGenreMatch,
  validateSongGenre,
  findSongInDatabase,
  checkGenreCompatibility,
  validateSongGenreWithDatabase,
  songDatabase
};
