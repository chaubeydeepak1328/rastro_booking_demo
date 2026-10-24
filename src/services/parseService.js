import { KNOWN_LOCATIONS, SUBCATEGORY_ALIASES } from '../data/constants';
export { parseLocally } from './localParser';

// Build the LLM prompt for parsing a natural language staff request
export function buildParsePrompt(userInput) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const tomorrow = new Date(today.getTime() + 86400000).toISOString().split('T')[0];

  return {
    systemPrompt: `You are a staff request parser for a restaurant staffing app in Delhi, India.
Today is ${dayName}, ${dateStr}.

Parse the user's restaurant staff request into structured JSON. The user may write in English, Hindi, or Hinglish.

Return a JSON object with this exact structure:
{
  "items": [
    {
      "role": "Chef|Cook|Waiter|Cleaner|Helper",
      "subcategory": "Chinese Chef|Tandoor Chef|Pastry Chef|General Cook|Waiter|Cleaner|Helper",
      "count": <number or null if not mentioned>,
      "date": "YYYY-MM-DD or null",
      "endDate": "YYYY-MM-DD or null if single day",
      "startTime": "HH:MM or null",
      "endTime": "HH:MM or null",
      "location": "<Delhi area name or null>",
      "specialNotes": "<special requirements or null>",
      "budgetPerDay": <number or null>
    }
  ],
  "uncertainFields": [
    {
      "itemIndex": <0-based index>,
      "field": "role|subcategory|count|date|startTime|endTime|location",
      "reason": "<specific explanation of why it is uncertain or missing>",
      "suggestion": "<best guess or null>"
    }
  ],
  "followUpQuestions": [
    "<specific question to ask the user if crucial info like role, date, time or location is missing or ambiguous>"
  ],
  "isActionRequest": <true if cancelling, modifying or referring to previous request, else false>,
  "actionType": <"cancel" | "modify" | null>,
  "actionTarget": <"last_request" | null>,
  "originalText": "<original user input>"
}

Rules:
1. Today is ${dayName}, ${dateStr}.
2. "Saturday" refers to the upcoming or current Saturday. "Sunday" refers to the upcoming Sunday.
3. "tomorrow" means ${tomorrow}.
4. "next week" means the week starting next Monday.
5. If the user specifies multi-day shifts like "3 din ke liye, 28 se 30 October", set date to "YYYY-10-28", endDate to "YYYY-10-30", and count to 1 (or specified count).
6. Hinglish terms:
   - "shaam 6 baje se" -> startTime: "18:00", endTime: null (since no end time was given, flag endTime in uncertainFields!).
   - "din" = days, "subah" = morning (08:00), "dopahar" = afternoon (12:00), "raat" = night (20:00).
   - "CP" = Connaught Place.
7. If multiple distinct roles/days are requested (e.g., "2 chefs Saturday and 1 cleaner Sunday"), create separate items in the "items" array!
8. If the role or subcategory is completely vague (e.g., "someone"), set role: null, subcategory: null, flag in uncertainFields, and add a follow-up question asking what role they need.
9. If time window is vague (e.g., "evening", "morning" without specific hours), set approximate startTime (e.g. 18:00 for evening), set endTime to null, flag endTime as uncertain, and ask in followUpQuestions.
10. If the request says "Cancel my last request and book a pastry chef instead for Friday", set isActionRequest: true, actionType: "cancel", actionTarget: "last_request", and also create the new booking item for the pastry chef on Friday.
11. Flag any field that was inferred, guessed, or missing in uncertainFields so the owner can review and confirm it with zero surprises.
12. NEVER return markdown or explanation outside the JSON. Return only the raw JSON.`,
    userPrompt: userInput,
  };
}

// Validate and normalize parsed data from LLM
export function validateAndNormalizeParsedData(parsed, originalText) {
  const errors = [];
  const warnings = [];

  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      errors: ['Failed to parse response as JSON'],
      warnings: [],
      data: null,
    };
  }

  // Ensure items array exists
  if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
    return {
      isValid: false,
      errors: ['No staff requirements could be extracted from the request'],
      warnings: [],
      data: parsed,
    };
  }

  const normalizedItems = parsed.items.map((item, index) => {
    const normalized = { ...item };
    const itemWarnings = [];

    // Validate and normalize subcategory
    if (normalized.subcategory) {
      const lowerSub = normalized.subcategory.toLowerCase();
      if (SUBCATEGORY_ALIASES[lowerSub]) {
        normalized.subcategory = SUBCATEGORY_ALIASES[lowerSub];
      }
    } else if (normalized.role) {
      // Try to infer subcategory from role
      const lowerRole = normalized.role.toLowerCase();
      if (SUBCATEGORY_ALIASES[lowerRole]) {
        normalized.subcategory = SUBCATEGORY_ALIASES[lowerRole];
        itemWarnings.push({
          itemIndex: index,
          field: 'subcategory',
          reason: 'Inferred from role, may not be specific enough',
          suggestion: normalized.subcategory,
        });
      }
    }

    // Validate count
    if (!normalized.count || normalized.count < 1) {
      normalized.count = 1;
      itemWarnings.push({
        itemIndex: index,
        field: 'count',
        reason: 'Count not specified, defaulting to 1',
        suggestion: 1,
      });
    }

    // Validate date
    if (normalized.date) {
      const dateObj = new Date(normalized.date);
      if (isNaN(dateObj.getTime())) {
        normalized.date = null;
        itemWarnings.push({
          itemIndex: index,
          field: 'date',
          reason: 'Could not parse date',
          suggestion: null,
        });
      }
    } else {
      itemWarnings.push({
        itemIndex: index,
        field: 'date',
        reason: 'Date not specified',
        suggestion: null,
      });
    }

    // Validate time
    if (!normalized.startTime) {
      itemWarnings.push({
        itemIndex: index,
        field: 'startTime',
        reason: 'Start time not specified',
        suggestion: null,
      });
    }
    if (!normalized.endTime) {
      itemWarnings.push({
        itemIndex: index,
        field: 'endTime',
        reason: 'End time not specified',
        suggestion: null,
      });
    }

    // Validate location
    if (normalized.location) {
      const lowerLoc = normalized.location.toLowerCase();
      const knownLoc = KNOWN_LOCATIONS[lowerLoc];
      if (knownLoc) {
        normalized.locationData = knownLoc;
      } else {
        // Try partial match
        const matchKey = Object.keys(KNOWN_LOCATIONS).find(
          (k) => lowerLoc.includes(k) || k.includes(lowerLoc)
        );
        if (matchKey) {
          normalized.locationData = KNOWN_LOCATIONS[matchKey];
          normalized.location = KNOWN_LOCATIONS[matchKey].area;
        } else {
          itemWarnings.push({
            itemIndex: index,
            field: 'location',
            reason: 'Location not recognized, partner matching may be less accurate',
            suggestion: normalized.location,
          });
        }
      }
    } else {
      itemWarnings.push({
        itemIndex: index,
        field: 'location',
        reason: 'Location not specified',
        suggestion: null,
      });
    }

    return { normalized, warnings: itemWarnings };
  });

  // Merge all uncertainties
  const allUncertainFields = [
    ...(parsed.uncertainFields || []),
    ...normalizedItems.flatMap((item) => item.warnings),
  ];

  // De-duplicate uncertain fields
  const seen = new Set();
  const deduped = allUncertainFields.filter((uf) => {
    const key = `${uf.itemIndex}-${uf.field}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    isValid: true,
    errors,
    warnings,
    data: {
      items: normalizedItems.map((i) => i.normalized),
      uncertainFields: deduped,
      followUpQuestions: parsed.followUpQuestions || [],
      isActionRequest: parsed.isActionRequest || false,
      actionType: parsed.actionType || null,
      actionTarget: parsed.actionTarget || null,
      originalText: originalText,
    },
  };
}

// Determine confidence level for a field
export function getFieldConfidence(field, value, uncertainFields, itemIndex) {
  if (value === null || value === undefined || value === '') {
    return 'missing';
  }

  const isUncertain = uncertainFields?.some(
    (uf) => uf.itemIndex === itemIndex && uf.field === field
  );

  if (isUncertain) {
    return 'uncertain';
  }

  return 'confident';
}

// Format parsed data for display
export function formatParsedItemForDisplay(item) {
  const lines = [];
  if (item.subcategory) lines.push(`Role: ${item.subcategory}`);
  if (item.count) lines.push(`Count: ${item.count}`);
  if (item.date) lines.push(`Date: ${new Date(item.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  if (item.startTime && item.endTime) lines.push(`Time: ${item.startTime} - ${item.endTime}`);
  else if (item.startTime) lines.push(`From: ${item.startTime}`);
  if (item.location) lines.push(`Location: ${item.location}`);
  if (item.specialNotes) lines.push(`Notes: ${item.specialNotes}`);
  if (item.budgetPerDay) lines.push(`Budget: ₹${item.budgetPerDay}/day`);
  return lines;
}
