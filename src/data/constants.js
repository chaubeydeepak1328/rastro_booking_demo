// Known locations in Delhi with lat/lng for distance calculation
const KNOWN_LOCATIONS = {
  'connaught place': { lat: 28.6315, lng: 77.2167, area: 'Connaught Place' },
  'cp': { lat: 28.6315, lng: 77.2167, area: 'Connaught Place' },
  'rajouri garden': { lat: 28.6491, lng: 77.1724, area: 'Rajouri Garden' },
  'pitampura': { lat: 28.6692, lng: 77.1485, area: 'Pitampura' },
  'karol bagh': { lat: 28.6508, lng: 77.1855, area: 'Karol Bagh' },
  'saket': { lat: 28.5672, lng: 77.2100, area: 'Saket' },
  'lajpat nagar': { lat: 28.5709, lng: 77.2416, area: 'Lajpat Nagar' },
  'kohat enclave': { lat: 28.6692, lng: 77.1485, area: 'Kohat Enclave' },
  'rohini': { lat: 28.7495, lng: 77.0565, area: 'Rohini' },
  'dwarka': { lat: 28.5921, lng: 77.0460, area: 'Dwarka' },
  'nehru place': { lat: 28.5494, lng: 77.2529, area: 'Nehru Place' },
  'green park': { lat: 28.5594, lng: 77.2069, area: 'Green Park' },
  'janakpuri': { lat: 28.6219, lng: 77.0817, area: 'Janakpuri' },
  'south extension': { lat: 28.5761, lng: 77.2227, area: 'South Extension' },
  'greater kailash': { lat: 28.5481, lng: 77.2340, area: 'Greater Kailash' },
  'defence colony': { lat: 28.5741, lng: 77.2315, area: 'Defence Colony' },
  'hauz khas': { lat: 28.5494, lng: 77.2001, area: 'Hauz Khas' },
  'vasant kunj': { lat: 28.5200, lng: 77.1599, area: 'Vasant Kunj' },
  'preet vihar': { lat: 28.6367, lng: 77.2952, area: 'Preet Vihar' },
  'khan market': { lat: 28.6005, lng: 77.2273, area: 'Khan Market' },
  'gurugram': { lat: 28.4595, lng: 77.0266, area: 'Gurugram' },
  'gurgaon': { lat: 28.4595, lng: 77.0266, area: 'Gurugram' },
  'dlf': { lat: 28.4900, lng: 77.0900, area: 'DLF, Gurugram' },
  'noida': { lat: 28.5355, lng: 77.3910, area: 'Noida' },
};

// Subcategory aliases for matching
const SUBCATEGORY_ALIASES = {
  'chinese chef': 'Chinese Chef',
  'chinese cook': 'Chinese Chef',
  'tandoor chef': 'Tandoor Chef',
  'tandoori chef': 'Tandoor Chef',
  'pastry chef': 'Pastry Chef',
  'baker': 'Pastry Chef',
  'general cook': 'General Cook',
  'cook': 'General Cook',
  'french chef': 'General Cook',
  'french cook': 'General Cook',
  'continental chef': 'General Cook',
  'waiter': 'Waiter',
  'server': 'Waiter',
  'cleaner': 'Cleaner',
  'cleaning': 'Cleaner',
  'deep cleaning': 'Cleaner',
  'helper': 'Helper',
  'assistant': 'Helper',
  'chef': 'General Cook', // generic fallback
};

export { KNOWN_LOCATIONS, SUBCATEGORY_ALIASES };
