import { validateAndNormalizeParsedData, getFieldConfidence } from '../src/services/parseService';

describe('Deliverable 4 - Test 1: Parse Output Validator', () => {
  /**
   * Benchmark Test Set — Request #1 (Clear Request):
   * "Need 2 Chinese chefs and 1 helper for Saturday 6 PM to 11 PM, Connaught Place area."
   */
  test('validates clear benchmark request producing accurate multi-item structure without false uncertainties', () => {
    const rawParsedFromLLM = {
      items: [
        {
          role: 'Chef',
          subcategory: 'Chinese Chef',
          count: 2,
          date: '2026-10-24',
          startTime: '18:00',
          endTime: '23:00',
          location: 'Connaught Place',
          specialNotes: null,
          budgetPerDay: null,
        },
        {
          role: 'Helper',
          subcategory: 'Helper',
          count: 1,
          date: '2026-10-24',
          startTime: '18:00',
          endTime: '23:00',
          location: 'Connaught Place',
          specialNotes: null,
          budgetPerDay: null,
        },
      ],
      uncertainFields: [],
      followUpQuestions: [],
      isActionRequest: false,
      actionType: null,
    };

    const validation = validateAndNormalizeParsedData(
      rawParsedFromLLM,
      'Need 2 Chinese chefs and 1 helper for Saturday 6 PM to 11 PM, Connaught Place area.'
    );

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Structure validation: 2 distinct requirement items
    expect(validation.data.items).toHaveLength(2);

    // Item 1: 2 Chinese Chefs
    const chefs = validation.data.items[0];
    expect(chefs.subcategory).toBe('Chinese Chef');
    expect(chefs.count).toBe(2);
    expect(chefs.startTime).toBe('18:00');
    expect(chefs.endTime).toBe('23:00');
    expect(chefs.location).toBe('Connaught Place');
    expect(chefs.locationData).toBeDefined();
    expect(chefs.locationData.area).toBe('Connaught Place');

    // Item 2: 1 Helper
    const helpers = validation.data.items[1];
    expect(helpers.subcategory).toBe('Helper');
    expect(helpers.count).toBe(1);
    expect(helpers.startTime).toBe('18:00');
    expect(helpers.endTime).toBe('23:00');

    // Clear request should have NO uncertain fields
    expect(validation.data.uncertainFields).toHaveLength(0);
    expect(validation.data.isActionRequest).toBe(false);
  });

  /**
   * Benchmark Test Set — Request #5 (Ambiguous Request):
   * "Need someone for tomorrow evening."
   */
  test('validates ambiguous benchmark request and correctly flags uncertain fields with reasons & follow-up questions', () => {
    const rawParsedFromLLM = {
      items: [
        {
          role: null,
          subcategory: null,
          count: 1,
          date: '2026-10-25',
          startTime: '18:00',
          endTime: null,
          location: null,
          specialNotes: null,
          budgetPerDay: null,
        },
      ],
      uncertainFields: [
        {
          itemIndex: 0,
          field: 'subcategory',
          reason: 'User specified "someone" without a specific role or subcategory.',
          suggestion: 'Waiter',
        },
        {
          itemIndex: 0,
          field: 'endTime',
          reason: '"Evening" implies 18:00 start but no end time was provided.',
          suggestion: '23:00',
        },
        {
          itemIndex: 0,
          field: 'location',
          reason: 'No restaurant outlet or location in Delhi was specified.',
          suggestion: null,
        },
      ],
      followUpQuestions: [
        'What role do you need (e.g. Chef, Waiter, Helper)?',
        'What time will the shift end?',
        'Which outlet/location in Delhi will the shift take place?',
      ],
      isActionRequest: false,
      actionType: null,
    };

    const validation = validateAndNormalizeParsedData(
      rawParsedFromLLM,
      'Need someone for tomorrow evening.'
    );

    expect(validation.isValid).toBe(true);
    expect(validation.data.items).toHaveLength(1);

    // Structural checks
    const item = validation.data.items[0];
    expect(item.date).toBe('2026-10-25');
    expect(item.startTime).toBe('18:00');
    expect(item.endTime).toBeNull();
    expect(item.location).toBeNull();

    // Critical check: uncertain fields flagged with reasons
    const uncertainNames = validation.data.uncertainFields.map((uf) => uf.field);
    expect(uncertainNames).toContain('subcategory');
    expect(uncertainNames).toContain('endTime');
    expect(uncertainNames).toContain('location');

    // Ensure reasons are present
    const roleUncertainty = validation.data.uncertainFields.find(
      (uf) => uf.field === 'subcategory'
    );
    expect(roleUncertainty.reason).toBeTruthy();
    expect(roleUncertainty.suggestion).toBe('Waiter');

    // Follow-up questions must be preserved
    expect(validation.data.followUpQuestions.length).toBeGreaterThanOrEqual(2);

    // Field confidence helper checks
    expect(
      getFieldConfidence('subcategory', item.subcategory, validation.data.uncertainFields, 0)
    ).toBe('missing');
    expect(
      getFieldConfidence('endTime', item.endTime, validation.data.uncertainFields, 0)
    ).toBe('missing');
  });

  /**
   * Additional structural safety checks:
   * Null handling, count defaulting, alias normalization
   */
  test('handles malformed inputs and normalizes subcategory aliases safely', () => {
    // Rejects null
    expect(validateAndNormalizeParsedData(null, 'test').isValid).toBe(false);

    // Rejects empty items
    expect(
      validateAndNormalizeParsedData({ items: [] }, 'test').isValid
    ).toBe(false);

    // Normalizes "tandoori chef" alias to "Tandoor Chef"
    const aliasResult = validateAndNormalizeParsedData(
      {
        items: [
          {
            role: 'Chef',
            subcategory: 'tandoori chef',
            count: 0,
            date: '2026-10-25',
            startTime: '11:00',
            endTime: '16:00',
            location: 'Rajouri Garden',
          },
        ],
      },
      'test'
    );
    expect(aliasResult.isValid).toBe(true);
    expect(aliasResult.data.items[0].subcategory).toBe('Tandoor Chef');
    expect(aliasResult.data.items[0].count).toBe(1); // Auto defaults count from 0 to 1
  });
});
