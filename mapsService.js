const { calculateDistanceKm } = require('../utils/helpers');

class MapsService {
  static getApiKey() {
    return process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';
  }

  // Calculate ETA (in minutes) and Distance (in km) between origin and destination
  static async calculateEtaAndDistance(originLat, originLng, destLat, destLng) {
    const distanceKm = calculateDistanceKm(originLat, originLng, destLat, destLng);
    // Assume average city travel speed of 25 km/h
    const etaMinutes = Math.max(5, Math.round((distanceKm / 25) * 60));

    return {
      distanceKm: distanceKm,
      distanceText: `${distanceKm} km`,
      durationMinutes: etaMinutes,
      durationText: `${etaMinutes} mins`
    };
  }
}

module.exports = MapsService;
