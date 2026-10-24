import partnerFixtures from '../test-fixtures/partners';
import {
  rankPartners,
  scoreSubcategory,
  scoreDistance,
  scoreAvailability,
  scoreReliability,
  WEIGHTS,
  haversineDistance,
} from '../src/services/matchingService';

describe('Deliverable 4 - Test 2: Matching Scorer', () => {
  /**
   * Exercise matching/scoring with a parsed request and mock partners
   */
  test('ranks partners correctly with formula-derived explanations and component breakdowns', () => {
    const parsedRequest = {
      subcategory: 'Chinese Chef',
      count: 2,
      date: '2026-10-24', // Saturday
      startTime: '18:00',
      endTime: '23:00',
      location: 'Connaught Place',
      locationData: { lat: 28.6315, lng: 77.2167, area: 'Connaught Place' },
    };

    const { results, hasGoodMatch } = rankPartners(parsedRequest, 5, partnerFixtures);

    expect(results).toHaveLength(5);
    expect(hasGoodMatch).toBe(true);

    // Verify sorted descending by totalScore
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].totalScore).toBeGreaterThanOrEqual(results[i].totalScore);
    }

    // Top match should be Rajesh Kumar (Chinese Chef, CP, Saturday available, 4.8 rating)
    const topMatch = results[0];
    expect(topMatch.partner.subcategory).toBe('Chinese Chef');
    expect(topMatch.partner.name).toBe('Rajesh Kumar');
    expect(topMatch.totalScore).toBeGreaterThan(0.9);

    // Verify explanation is strictly mathematical and derived from score components (never LLM)
    expect(topMatch.explanation).toContain('exact match');
    expect(topMatch.explanation).toContain('km away');
    expect(topMatch.explanation).toContain('available on Saturday');

    // Verify each score component is present and properly weighted
    results.forEach((res) => {
      expect(res.components.subcategory.weight).toBe(WEIGHTS.subcategory);
      expect(res.components.distance.weight).toBe(WEIGHTS.distance);
      expect(res.components.availability.weight).toBe(WEIGHTS.availability);
      expect(res.components.reliability.weight).toBe(WEIGHTS.reliability);

      // Verify reconstructed score equals totalScore within float precision
      const reconstructed =
        res.components.subcategory.weight * res.components.subcategory.score +
        res.components.distance.weight * res.components.distance.score +
        res.components.availability.weight * res.components.availability.score +
        res.components.reliability.weight * res.components.reliability.score;
      expect(res.totalScore).toBeCloseTo(reconstructed, 2);
    });
  });

  /**
   * Edge Case 1: Tie-breaking
   * Two partners with identical role, distance, and availability, broken by reliability score
   */
  test('handles score ties and breaks them by reliability score', () => {
    const mockTiedPartners = [
      {
        id: 'tie-1',
        name: 'Chef Arjun',
        subcategory: 'Tandoor Chef',
        role: 'Chef',
        location: { lat: 28.6315, lng: 77.2167, area: 'Connaught Place' },
        availability: ['Saturday'],
        reliabilityScore: 4.8,
        experienceYears: 5,
        hourlyRate: 500,
      },
      {
        id: 'tie-2',
        name: 'Chef Balwant',
        subcategory: 'Tandoor Chef',
        role: 'Chef',
        location: { lat: 28.6315, lng: 77.2167, area: 'Connaught Place' },
        availability: ['Saturday'],
        reliabilityScore: 4.4,
        experienceYears: 4,
        hourlyRate: 480,
      },
    ];

    const request = {
      subcategory: 'Tandoor Chef',
      count: 1,
      date: '2026-10-24', // Saturday
      location: 'Connaught Place',
      locationData: { lat: 28.6315, lng: 77.2167, area: 'Connaught Place' },
    };

    const { results } = rankPartners(request, 2, mockTiedPartners);

    expect(results).toHaveLength(2);
    // Chef Arjun has higher reliability (4.8 vs 4.4), so he must rank #1
    expect(results[0].partner.id).toBe('tie-1');
    expect(results[0].totalScore).toBeGreaterThan(results[1].totalScore);

    // If identical score occurs across candidates:
    const identicalScorePartners = [
      {
        id: 'id-1',
        name: 'Candidate A',
        subcategory: 'Cleaner',
        location: { lat: 28.6315, lng: 77.2167 },
        availability: ['Saturday'],
        reliabilityScore: 4.0,
      },
      {
        id: 'id-2',
        name: 'Candidate B',
        subcategory: 'Cleaner',
        location: { lat: 28.6315, lng: 77.2167 },
        availability: ['Saturday'],
        reliabilityScore: 4.0,
      },
    ];

    const tieCheck = rankPartners(
      { subcategory: 'Cleaner', date: '2026-10-24', location: 'Connaught Place', locationData: { lat: 28.6315, lng: 77.2167 } },
      2,
      identicalScorePartners
    );
    expect(tieCheck.results[0].totalScore).toBe(tieCheck.results[1].totalScore);
    expect(tieCheck.results[0].isTied).toBe(true);
    expect(tieCheck.results[0].tieBreakerInfo).toBeTruthy();
  });

  /**
   * Edge Case 2: No good match scenario
   * When requested role has zero match in the partner directory
   */
  test('handles no-match scenario gracefully without crashing and provides helpful notice', () => {
    const obscureRequest = {
      subcategory: 'Sommelier', // Completely unsupported specialty
      count: 1,
      date: '2026-10-24',
      location: 'Connaught Place',
    };

    const { results, hasGoodMatch, noMatchReason } = rankPartners(
      obscureRequest,
      5,
      partnerFixtures
    );

    expect(results).toHaveLength(5);
    expect(hasGoodMatch).toBe(false);
    expect(noMatchReason).toContain('No partners closely match this request');
    // Subcategory scores should all be 0.0
    results.forEach((r) => {
      expect(r.components.subcategory.score).toBe(0.0);
    });
  });

  /**
   * Mathematical and Weight Invariants
   */
  test('ensures weights sum to exactly 1.0 and distance scores fall between 0 and 1', () => {
    const sum = Object.values(WEIGHTS).reduce((acc, w) => acc + w, 0);
    expect(sum).toBeCloseTo(1.0, 5);

    // Distance at 0 km
    expect(scoreDistance({ lat: 28.6, lng: 77.2 }, { lat: 28.6, lng: 77.2 }).score).toBe(1.0);
    // Distance beyond 20 km clamped to 0
    expect(scoreDistance({ lat: 28.6, lng: 77.2 }, { lat: 28.2, lng: 77.2 }).score).toBe(0.0);
  });
});
