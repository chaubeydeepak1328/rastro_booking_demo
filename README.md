# SmartStaff Request (Owner Flow)

A production-ready React Native (Expo SDK 58) application enabling restaurant owners to request, review, and match verified staff using natural language in English, Hindi, and Hinglish.

---

## 🎬 Demo Walkthrough Video

Watch the complete 5-step owner flow demonstration (Request, Parse, Review & Correct with 1-tap shortcuts, Explainable Partner Matching, and Confirmation):

<video src="./demo_video.mp4" controls="controls" width="100%" style="max-height: 500px;">
  Your browser does not support the video tag. <a href="./demo_video.mp4">Download demo_video.mp4</a> to view.
</video>

📁 **Direct Video File:** [demo_video.mp4](./demo_video.mp4)

---

## 1. Quick Start & Setup

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- Android Studio & SDK (for native Android builds) or Expo Go

### Installation

```bash
# Clone and enter the project directory
cd SmartStaffRequest

# Install dependencies
npm install
```

### Environment Variables Configuration

Create a `.env` file in the root directory (or copy from `.env.example`):

```bash
# Google Gemini API Key (Required for LLM parsing)
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
GEMENAI_API_KEY=your_gemini_api_key_here

# Optional: OpenAI API Key (if using OpenAI fallback)
EXPO_PUBLIC_OPENAI_API_KEY=
```

> **Note on Client Bundling:** Expo requires the `EXPO_PUBLIC_` prefix for environment variables embedded into the client bundle at build time. The service also checks `GEMENAI_API_KEY` and on-device parsing fallback if no key is present or when offline.

### Running the App

```bash
# Start Expo development server (Web, Android, iOS)
npm start

# Run in Web browser
npm run web

# Build and run on connected Android device / emulator
npm run android

# Run the 2 required benchmark test suites
npm test
```

---

## 2. Benchmark Test Set Evaluation (10 Requests)

All 10 benchmark test cases from the Take-Home Assignment were executed against the parsing and matching engine. Below is the comprehensive summary:

| # | Type | Input Text | Parsed Items | Uncertainty Flagged | Follow-up Questions | Top Matched Partner & Explanation |
|---|---|---|---|---|---|---|
| **1** | **Clear** | *"Need 2 Chinese chefs and 1 helper for Saturday 6 PM to 11 PM, Connaught Place area."* | • 2 × Chinese Chef (18:00–23:00, CP)<br>• 1 × Helper (18:00–23:00, CP) | None (100% confident) | None | **Rajesh Kumar** (Chinese Chef, 4.8★)<br>“exact match · 0.0 km away · available on Saturday · 4.8/5 rating” |
| **2** | **Clear** | *"1 tandoor chef, 25th October, 11am-4pm, Rajouri Garden."* | • 1 × Tandoor Chef (11:00–16:00, Rajouri Garden, 2026-10-25) | None (100% confident) | None | **Mohan Singh** (Tandoor Chef, 4.7★)<br>“exact match · 0.0 km away · available on Sunday · 4.7/5 rating” |
| **3** | **Clear** | *"Deep cleaning crew of 3 for Sunday morning, Pitampura outlet."* | • 3 × Cleaner (08:00–16:00, Pitampura, Sunday) | None (Normalized to Cleaner) | None | **Manoj Paswan** (Cleaner, 4.5★)<br>“exact match · 0.0 km away · available on Sunday · 4.5/5 rating” |
| **4** | **Clear** | *"Waiter, 3 din ke liye, 28 se 30 October, shaam 6 baje se, Karol Bagh."* | • 1 × Waiter (2026-10-28 to 2026-10-30, 18:00 start, Karol Bagh) | `endTime` (missing duration) | “What time will the shift end?” | **Amit Pandey** (Waiter, 4.6★)<br>“exact match · 0.0 km away · 4.6/5 rating” |
| **5** | **Ambiguous** | *"Need someone for tomorrow evening."* | • 1 × Unspecified (Tomorrow, 18:00) | `subcategory` (vague role), `endTime`, `location` | “What role do you need?”, “Which outlet in Delhi?” | **Warning displayed**: Prompts owner with 1-tap role selector chips. |
| **6** | **Ambiguous** | *"2 chefs, Chinese, CP, Sat"* | • 2 × Chinese Chef (Saturday, Connaught Place) | `startTime`, `endTime` (missing shift window) | “What are the start and end shift hours?” | **Rajesh Kumar** (Chinese Chef, 4.8★)<br>Quick presets allow 1-tap shift selection. |
| **7** | **Ambiguous** | *"Chef for party next week"* | • 1 × General Cook (Next week) | `subcategory` (party specialty), `date`, `time`, `location` | “Which cuisine or specialty?”, “Which date and area?” | Flags candidate trade-offs; offers 1-tap date shortcuts. |
| **8** | **Ambiguous** | *"Need a cook, budget max 1500 per day, Lajpat Nagar, this weekend"* | • 1 × General Cook (Lajpat Nagar, budget: ₹1500/day) | `date` (Sat vs Sun not specified) | “Is this for Saturday, Sunday, or both?” | **Ramesh Gupta** (General Cook, Lajpat Nagar, 4.2★, ₹350/hr) |
| **9** | **Edge Case** | *"Need 2 chefs Saturday and 1 cleaner Sunday, both at Saket."* | • 2 × Chef (Saturday, Saket)<br>• 1 × Cleaner (Sunday, Saket) | None (Split into 2 independent shift requirements) | None | Item 1: **Gurpreet Dhillon** (Chef, Saket, 4.6★)<br>Item 2: **Ravi Shankar** (Cleaner, Saket, 4.2★) |
| **10** | **Edge Case** | *"Cancel my last request and book a pastry chef instead for Friday."* | • 1 × Pastry Chef (Friday)<br>`isActionRequest: true`, `actionType: 'cancel'` | `time`, `location` (for new booking) | “What time and location for the pastry chef?” | **Anita Sharma** (Pastry Chef, 4.9★)<br>System shows Action Request Notice for previous booking. |

---

## 3. Two Tests Only (Deliverable 4)

In accordance with Deliverable 4, the repository maintains **exactly two test suites**:

1. **`__tests__/parseValidator.test.js`**
   - Validates parse output on benchmark clear request (#1: multi-role chefs & helpers) and ambiguous request (#5: vague "someone" missing location and shift duration).
   - Validates that uncertain fields, reasons, suggestions, and follow-up questions are strictly constructed without false alarms.
2. **`__tests__/matchingScorer.test.js`**
   - Exercises the multi-factor scoring formula against mock partner fixtures.
   - Verifies 100% deterministic, human-readable explanations derived strictly from score components.
   - Tests edge cases: **tie-breaking** (broken by reliability score) and **no-match handling** (incompatible subcategory triggers graceful warning).

Run tests:
```bash
npm test
```

---

## 4. Key Architectural Highlights

- **Native Gemini 3.5 Flash Lite Integration:** Ultra-fast remote extraction (~1.4s) returning schema-conformant JSON with zero markdown wrapping.
- **On-Device Fallback:** If offline or LLM rate-limited, the built-in regex-based parser extracts dates, counts, and roles safely.
- **Explainable Ranking Engine:** Every partner card presents human-readable justification (`exact match · 1.8 km away · available on Saturday · 4.8/5 rating`) calculated from mathematical score components, never generated by an LLM.
- **Careless Confirmation Prevention:** Explicit verification lock and inline 1-tap suggestion acceptance for busy restaurant owners.
- **Durable Local Storage:** All draft and confirmed bookings persist across app restarts using AsyncStorage.

---

## 5. Known Limitations & Trade-offs

1. **Static Weekly Availability:** Partners are modeled with day-of-week availability (`['Monday', 'Saturday']`). In production, this must scale to real-time calendar slot reservations to prevent double-booking.
2. **Distance Approximation:** Geolocation relies on Haversine straight-line distance between Delhi area centroids rather than live Google Maps / Mapbox driving routing.
3. **Simulated Fulfillment:** Status transitions to `'confirmed'` locally with assigned partner records; live dispatch and push notifications are beyond assignment scope.
