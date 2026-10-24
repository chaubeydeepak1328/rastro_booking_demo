import { KNOWN_LOCATIONS, SUBCATEGORY_ALIASES } from '../data/constants';
import { localDate } from './requestValidation';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function extractDate(text) {
  const today = new Date();
  const explicit = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (explicit) return explicit[0];
  if (/\b(tomorrow|kal)\b/.test(text)) { today.setDate(today.getDate() + 1); return localDate(today); }
  if (/\b(today|aaj)\b/.test(text)) return localDate(today);
  const day = DAYS.findIndex((name) => new RegExp('\\b(' + name + '|' + name.slice(0, 3) + ')\\b').test(text));
  if (day >= 0) { today.setDate(today.getDate() + ((day - today.getDay() + 7) % 7 || 7)); return localDate(today); }
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const named = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s+(\d{4}))?\b/);
  if (named) {
    const month = months.findIndex((name) => name === named[2] || name.slice(0, 3) === named[2]);
    if (month >= 0) return [named[3] || today.getFullYear(), String(month + 1).padStart(2, '0'), named[1].padStart(2, '0')].join('-');
  }
  return null;
}

function extractTimes(text) {
  const toTime = (hour, minute, meridiem) => {
    let h = Number(hour);
    if (meridiem) { if (h < 1 || h > 12) return null; h = h % 12 + (meridiem === 'pm' ? 12 : 0); }
    if (h > 23 || Number(minute || 0) > 59) return null;
    return String(h).padStart(2, '0') + ':' + (minute || '00');
  };
  const range = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|[-–]|se)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  // Bare numeric ranges may be dates or quantities; don't turn them into shifts.
  if (range && (range[2] || range[3] || range[5] || range[6])) return [toTime(range[1], range[2], range[3] || range[6]), toTime(range[4], range[5], range[6] || range[3])];
  const start = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (start) return [toTime(start[1], start[2], start[3]), null];
  return [null, null];
}

/** Extract user-supplied details. Unknown or ambiguous fields remain editable. */
export function parseLocally(userInput) {
  const text = userInput.trim();
  const lower = text.toLowerCase();
  const roles = /\b(?:(\d+)\s+)?(?:([a-z]+)\s+)?(chinese chefs?|chinese cooks?|tandoori? chefs?|pastry chefs?|french chefs?|french cooks?|continental chefs?|general cooks?|deep cleaning(?: crew)?|cleaners?|cleaning|helpers?|assistants?|waiters?|servers?|bakers?|cooks?|chefs?)\b/g;
  const matches = [...lower.matchAll(roles)];
  const locationKey = Object.keys(KNOWN_LOCATIONS).sort((a, b) => b.length - a.length).find((key) => new RegExp('\\b' + key + '\\b').test(lower));
  let sharedLocation = locationKey ? KNOWN_LOCATIONS[locationKey].area : null;
  if (!sharedLocation) {
    const locMatch = lower.match(/\b(?:at|in|near)\s+([a-z0-9\s]+?)\s+(?:area|outlet|branch)\b/);
    if (locMatch && locMatch[1]) {
      sharedLocation = locMatch[1].trim().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  const sharedDate = extractDate(lower);
  const sharedTimes = extractTimes(lower);
  const budget = lower.match(/\b(?:budget(?:\s+max)?|max|under)\s*(?:₹|rs\.?\s*)?(\d+)\b/);
  const uncertainFields = [];
  const items = (matches.length ? matches : [null]).map((match, index) => {
    const segment = match ? lower.slice(match.index, matches[index + 1]?.index ?? lower.length) : lower;
    const modifier = match?.[2];
    const rawRole = match?.[3] || match?.[2] || '';
    const fullRole = modifier && rawRole && modifier !== rawRole ? `${modifier} ${rawRole}` : rawRole;
    const alias = fullRole.replace(/s$/, '').replace('deep cleaning crew', 'deep cleaning');
    const subcategory = SUBCATEGORY_ALIASES[alias] || SUBCATEGORY_ALIASES[rawRole.replace(/s$/, '')] || null;
    const countMatch = segment.match(/\b(?:of|crew of)\s+(\d+)\b/);
    const count = Number(match?.[1] || countMatch?.[1] || 1);
    const ownDate = extractDate(segment);
    const ownTimes = extractTimes(segment);
    // A single shared date/time can apply to all roles. Multiple dates require review.
    const multipleDays = DAYS.filter((day) => new RegExp('\\b' + day + '\\b').test(lower)).length > 1;
    const specialNotes = modifier && !alias.includes(modifier) ? `${modifier.charAt(0).toUpperCase() + modifier.slice(1)} cuisine` : null;
    const item = { role: subcategory, subcategory, count, date: ownDate || (multipleDays ? null : sharedDate), startTime: ownTimes[0] || sharedTimes[0], endTime: ownTimes[1] || sharedTimes[1], location: sharedLocation, budgetPerDay: budget ? Number(budget[1]) : null, specialNotes };
    for (const field of ['subcategory', 'date', 'startTime', 'endTime', 'location']) {
      if (!item[field]) uncertainFields.push({ itemIndex: index, field, reason: 'Please add this detail.', suggestion: null });
    }
    if (!match?.[1] && !countMatch) uncertainFields.push({ itemIndex: index, field: 'count', reason: 'Please confirm the number of people.', suggestion: 1 });
    return item;
  });
  return { items, uncertainFields, followUpQuestions: [], isActionRequest: /\b(cancel|modify)\b/.test(lower), actionType: /\bcancel\b/.test(lower) ? 'cancel' : null, originalText: text };
}
