const VENUE_GENRE_TAG_MAP = {
  COMMERCIAL_POP: ["pop", "dance pop", "electropop", "commercial"],
  POP: ["pop", "indie pop", "synth-pop", "dance pop"],
  RNB: ["rnb", "r&b", "rhythm and blues", "soul", "neo soul"],
  US_HIPHOP: ["hip hop", "hip-hop", "rap", "trap", "us hip hop"],
  UK_HIPHOP: ["uk hip hop", "grime", "drill", "rap"],
  AFROBEATS: ["afrobeats", "afrobeat", "afropop"],
  DRILL: ["drill", "uk drill", "brooklyn drill"],
  ROCK: ["rock", "alternative rock", "indie rock", "classic rock"],
  INDIE: ["indie", "indie pop", "indie rock", "lo-fi"],
  HOUSE: ["house", "deep house", "tech house", "progressive house"],
  DANCEHALL: ["dancehall", "reggae", "reggaeton"],
  DISCO: ["disco", "nu disco", "dance"],
  REGGAETON: ["reggaeton", "latin", "urbano latino"],
  EDM: ["edm", "electronic", "dance", "electro", "festival"],
  TECHHOUSE: ["tech house", "house"],
  TECHNO: ["techno", "electronic"],
  FUNK: ["funk", "soul"],
  "70S": ["70s", "1970s", "classic"],
  "80S": ["80s", "1980s", "new wave"],
  "90S": ["90s", "1990s"],
  "2000S": ["2000s", "00s"],
  HIP_HOP: ["hip hop", "hip-hop", "rap", "trap"],
  "HIP HOP": ["hip hop", "hip-hop", "rap", "trap"],
  CHEESE: ["pop", "disco", "dance"],
  GIRLS: ["pop", "dance pop", "rnb"],
  SINGALONG: ["pop", "anthem", "classic"],
  COMMERCIAL: ["pop", "commercial", "dance"],
  SOUL: ["soul", "r&b", "funk"],
};

function normalizeTag(s) {
  return String(s || "")
    .trim()
    .toLowerCase();
}

function mapVenueGenresToTags(venueGenres = []) {
  const tagSet = new Set();
  venueGenres.forEach((g) => {
    const key = String(g || "").trim();
    const aliases = VENUE_GENRE_TAG_MAP[key] || [normalizeTag(key)];
    aliases.forEach((a) => tagSet.add(normalizeTag(a)));
  });
  return tagSet;
}

module.exports = { mapVenueGenresToTags, normalizeTag };
