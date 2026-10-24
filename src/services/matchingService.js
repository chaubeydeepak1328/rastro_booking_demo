import partners from '../data/partners';
import { KNOWN_LOCATIONS } from '../data/constants';

/**
 * Matching & scoring engine.
 *
 * Score formula (weights sum to 1.0):
 *   - Subcategory match:  0.35  (exact=1.0, same-role=0.4, none=0.0)
 *   - Distance:           0.25  (1.0 at 0 km, 0.0 at ≥20 km, linear)
 *   - Availability:       0.25  (1.0 if available on requested day, 0.0 otherwise)
 *   - Reliability:        0.15  (score / 5.0)
 *
 * Justification: subcategory is most critical (a tandoor chef can't do pastry),
 * distance and availability are equally important operational constraints,
 * reliability is a tiebreaker among otherwise equal candidates.
 */

const WEIGHTS = {
  subcategory: 0.35,
  distance: 0.25,
  availability: 0.25,
  reliability: 0.15,
};

// Haversine distance in km
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Score subcategory match
function scoreSubcategory(partnerSubcategory, requestedSubcategory) {
  if (!requestedSubcategory) return { score: 0.5, detail: 'no subcategory specified' };
  
  const pSub = partnerSubcategory.toLowerCase();
  const rSub = requestedSubcategory.toLowerCase();

  if (pSub === rSub) return { score: 1.0, detail: 'exact match' };

  // Same broad role (e.g., both are chefs)
  const pRole = partnerSubcategory.split(' ').pop().toLowerCase();
  const rRole = requestedSubcategory.split(' ').pop().toLowerCase();
  if (pRole === rRole) return { score: 0.4, detail: `same role (${pRole}) but different specialty` };

  return { score: 0.0, detail: 'different role' };
}

// Score distance
function scoreDistance(partnerLocation, requestLocation) {
  if (!requestLocation || !requestLocation.lat) {
    return { score: 0.5, detail: 'location unknown', distanceKm: null };
  }
  
  const dist = haversineDistance(
    partnerLocation.lat,
    partnerLocation.lng,
    requestLocation.lat,
    requestLocation.lng
  );

  const score = Math.max(0, 1 - dist / 20);
  return {
    score,
    detail: `${dist.toFixed(1)} km away`,
    distanceKm: parseFloat(dist.toFixed(1)),
  };
}

// Score availability
function scoreAvailability(partnerAvailability, requestDate) {
  if (!requestDate) return { score: 0.5, detail: 'date not specified' };

  const date = new Date(requestDate);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

  if (partnerAvailability.includes(dayName)) {
    return { score: 1.0, detail: `available on ${dayName}` };
  }
  return { score: 0.0, detail: `not available on ${dayName}` };
}

// Score reliability
function scoreReliability(reliabilityScore) {
  return {
    score: reliabilityScore / 5.0,
    detail: `${reliabilityScore}/5 rating`,
  };
}

/**
 * Rank partners for a single request item.
 * Returns top N partners with scores and explanations.
 */
export function rankPartners(requestItem, topN = 5, directory = partners) {
  // Resolve location
  let requestLocation = requestItem.locationData;
  if (!requestLocation && requestItem.location) {
    const lowerLoc = requestItem.location.toLowerCase();
    requestLocation = KNOWN_LOCATIONS[lowerLoc];
    if (!requestLocation) {
      const matchKey = Object.keys(KNOWN_LOCATIONS).find(
        (k) => lowerLoc.includes(k) || k.includes(lowerLoc)
      );
      if (matchKey) requestLocation = KNOWN_LOCATIONS[matchKey];
    }
  }

  const scored = directory.map((partner) => {
    const subcategoryResult = scoreSubcategory(partner.subcategory, requestItem.subcategory);
    const distanceResult = scoreDistance(partner.location, requestLocation);
    const availabilityResult = scoreAvailability(partner.availability, requestItem.date);
    const reliabilityResult = scoreReliability(partner.reliabilityScore);

    const totalScore =
      WEIGHTS.subcategory * subcategoryResult.score +
      WEIGHTS.distance * distanceResult.score +
      WEIGHTS.availability * availabilityResult.score +
      WEIGHTS.reliability * reliabilityResult.score;

    // Build explanation from actual score components
    const explanation = buildExplanation(
      subcategoryResult,
      distanceResult,
      availabilityResult,
      reliabilityResult,
      totalScore
    );

    return {
      partner,
      totalScore: parseFloat(totalScore.toFixed(3)),
      components: {
        subcategory: { ...subcategoryResult, weight: WEIGHTS.subcategory },
        distance: { ...distanceResult, weight: WEIGHTS.distance },
        availability: { ...availabilityResult, weight: WEIGHTS.availability },
        reliability: { ...reliabilityResult, weight: WEIGHTS.reliability },
      },
      explanation,
    };
  });

  // Sort by total score descending
  scored.sort((a, b) => b.totalScore - a.totalScore);

  // Handle ties - check both previous and next to flag all tied partners
  const results = scored.slice(0, topN).map((item, idx, arr) => {
    const isTiedWithPrev = idx > 0 && item.totalScore === arr[idx - 1].totalScore;
    const isTiedWithNext = idx < arr.length - 1 && item.totalScore === arr[idx + 1].totalScore;
    const isTied = isTiedWithPrev || isTiedWithNext;
    const tieBreakerInfo = isTied
      ? `Tied on ${Math.round(item.totalScore * 100)}% score; broken by reliability (${item.partner.reliabilityScore}★)`
      : null;

    return { ...item, rank: idx + 1, isTied, tieBreakerInfo };
  });

  // Handle no-match scenario (must have both acceptable total score AND compatible role)
  const hasGoodMatch = results.some(
    (r) => r.totalScore >= 0.5 && r.components.subcategory.score > 0
  );

  return {
    results,
    hasGoodMatch,
    noMatchReason: hasGoodMatch
      ? null
      : 'No partners closely match this request. Consider broadening your requirements.',
  };
}

/**
 * Build a human-readable explanation from score components.
 * REQUIRED: explanation must come from actual score numbers, NOT from LLM.
 */
function buildExplanation(subcategory, distance, availability, reliability, totalScore) {
  const parts = [];

  // Lead with the strongest positive factor
  const factors = [
    { name: 'subcategory', ...subcategory },
    { name: 'distance', ...distance },
    { name: 'availability', ...availability },
    { name: 'reliability', ...reliability },
  ];

  // Sort by score descending to lead with strengths
  const sorted = [...factors].sort((a, b) => b.score - a.score);

  for (const factor of sorted) {
    if (factor.score >= 0.8) {
      if (factor.name === 'subcategory') parts.push(`${factor.detail}`);
      else if (factor.name === 'distance') parts.push(`${factor.detail}`);
      else if (factor.name === 'availability') parts.push(`${factor.detail}`);
      else if (factor.name === 'reliability') parts.push(`${factor.detail}`);
    } else if (factor.name === 'subcategory' && factor.score === 0.4) {
      // Different specialty but same role
      parts.push(`⚠️ ${factor.detail}`);
    } else if (factor.score <= 0.25 && factor.score !== 0.5) {
      // Flag as weakness
      if (factor.name === 'availability') parts.push(`⚠️ ${factor.detail}`);
      else if (factor.name === 'subcategory') parts.push(`⚠️ ${factor.detail}`);
      else if (factor.name === 'distance' && factor.distanceKm !== null) parts.push(`⚠️ ${factor.detail}`);
    }
  }

  if (parts.length === 0) {
    parts.push('Moderate match across all criteria');
  }

  return parts.join(' · ');
}

export { WEIGHTS, haversineDistance, scoreSubcategory, scoreDistance, scoreAvailability, scoreReliability };
