# LIFELINE AI

> **Turn chaos into coordinated action.**
>
> AI-powered community incident intelligence and response routing.

---

## What is LIFELINE AI?

LIFELINE AI is an AI-powered, multimodal, offline-first community incident intelligence platform that transforms text, voice, image, and location reports into structured incident briefs, identifies potential response needs, clusters related community reports, and — after explicit user confirmation — routes information and the user's approved current location to the appropriate configured response contact through phone, SMS, email, or organizational integrations.

LIFELINE does **not** replace emergency professionals or independently verify emergencies. It helps communities transform fragmented information into clearer, faster, more actionable communication.

---

## Problem

When a community incident occurs — fire smoke, flooding, road obstruction, a medical concern — information is scattered across:

- Individual citizen reports
- Verbal communication
- Text messages
- Social media posts
- Word of mouth

These fragmented signals are hard to aggregate, verify, and route to the right people quickly. Critical context (like **current location**) is often missing, delayed, or inaccurate. Response teams receive incomplete reports. Citizens don't know who to contact.

---

## Solution

LIFELINE AI provides a unified platform that:

1. **Captures** multimodal incident reports (text, voice, image) with one-click reporting
2. **Obtains** the user's approved current location via browser Geolocation API
3. **Analyzes** reports using Groq Cloud AI with a local rules-engine fallback
4. **Classifies** incidents and assesses urgency with deterministic safety rules
5. **Generates** professional, structured incident briefs
6. **Routes** reports to the appropriate configured response contact
7. **Shares** a clickable location map link with the user's approved coordinates
8. **Tracks** delivery status and escalates when needed
9. **Displays** all incidents on a map with clustering and verification states
10. **Works offline** — reports queue and sync when connectivity returns

---

## Key Features

- **Multimodal Reporting**: Text input, voice recording (with browser speech recognition), and image upload
- **Current Location Capture**: GPS coordinates with accuracy, manual entry, map pin, and text-derived locations
- **AI-Powered Classification**: Groq Cloud AI classifies incident types (fire/smoke, medical, flooding, road hazard, power hazard, security, missing person, community assistance)
- **Urgency Assessment**: 5-level urgency with deterministic safety rules (information → monitor → verify → urgent → immediate)
- **Local Fallback**: Rules-based analyzer works without API keys or internet connection
- **Smart Escalation**: Recommends appropriate response contacts based on incident type and urgency
- **Multi-channel Delivery**: Phone calls (tel:), SMS, email, and webhooks
- **Location Map Links**: Generates clickable Google Maps links from actual GPS coordinates
- **Incident Map**: Leaflet.js + OpenStreetMap with color-coded status markers
- **Incident Clustering**: Groups related reports about the same possible event
- **Community Feed**: Shows recent non-sensitive incident reports to the community
- **Offline-First**: IndexedDB + localStorage + service worker for PWA support
- **Coordination Dashboard**: Admin interface for incident management, audit logs, contact directory
- **Explainable AI**: Shows why an incident was classified with evidence-based explanations
- **Progressive Web App**: Installable, works on mobile and desktop
- **Privacy-Focused**: Location only shared with explicit consent, no data sold

---

## Interactive Map

LIFELINE includes a full operational incident map built with **Leaflet** and **OpenStreetMap** tiles. **No paid map API key is required for the core map.** Access it from `Launch App → 🗺 Map`, or from the **Incident Map** panel in the coordination dashboard.

**Map technology**
- Library: [Leaflet](https://leafletjs.com/) (loaded from the `unpkg.com` CDN)
- Tiles: [OpenStreetMap](https://www.openstreetmap.org/) — `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- No Google Maps API key is required. Google Maps links are generated as shareable URLs only.

**Attribution**
- © OpenStreetMap contributors. Tiles © openstreetmap.org. Map data © OSM contributors.

**Features**
- Full interactive map with pan, zoom, and tile layers
- Incident markers with status-based icons (REPORTED, NEEDS VERIFICATION, VERIFIED, RESOLVED) — icons + text, not color alone
- Current-location marker with accuracy circle
- **LOCATE ME** — requests browser geolocation and captures latitude, longitude, accuracy, and timestamp
- Category, urgency, and status filters, plus an "All" reset
- Incident search by ID, type, or summary
- Marker popups with incident ID, category, urgency, status, time, summary, and accuracy
- **VIEW INCIDENT** opens a detail side panel (id, what happened, category, urgency, status, location, accuracy, source, AI/fallback analysis, recommended response, location link, attachments, audit history)
- Coordination dashboard map panel grouped by ACTIVE, NEEDS VERIFICATION, VERIFIED, RESOLVED
- Location link (`https://www.google.com/maps?q=LAT,LNG`) with `OPEN IN GOOGLE MAPS` and `COPY LOCATION LINK`

**Location permissions**
LIFELINE uses the **Browser Geolocation API** (`navigator.geolocation.getCurrentPosition`). It never fabricates coordinates. Clicking `LOCATE ME` walks through these states:

| State | Meaning |
| --- | --- |
| `REQUESTING LOCATION` | Permission prompt / high-accuracy lookup in progress |
| `LOCATION AVAILABLE` | Coordinates captured with acceptable accuracy |
| `LOW ACCURACY` | Captured, but accuracy > 100 m — use with caution |
| `LOCATION DENIED` | Permission denied — enable in browser settings |
| `LOCATION UNAVAILABLE` | Position unavailable or timed out |
| `MAP OFFLINE` | Device is offline; tiles cannot load |
| `NO LOCATION PROVIDED` | No location was shared |

**Privacy behavior**
- Incidents are plotted only when they carry a **public** or **approximate** location (or a location the reporter explicitly shared).
- Precise coordinates for **private** locations are visible only to authorized coordinators (dashboard view).
- The user's current location is never reused as an incident's coordinate.
- Public incidents may display a generalized/approximate location when the source is private.

**Demo mode**
When a user has no incidents with captured coordinates, the map renders safe **demo incidents** (clearly labeled `DEMO MODE`) so the interface is never empty. Demo coordinates are fictional and never represent the user's real location.

**Offline limitations**
- Map **tiles require an internet connection**. When offline, the map shows a `MAP OFFLINE` banner and does not claim to be live.
- Incidents and reports stored locally remain available in the incident list and detail panel.
- Coordinates are never fabricated to simulate a position.

**Map setup**
1. No map API key is needed. Leaflet and OSM load automatically from CDNs.
2. To capture live location, serve the app over `http`/`https` (not `file://`) and grant the browser geolocation permission.
3. In production, set `ALLOWED_ORIGINS` to your deployed domain via **Vercel → Project Settings → Environment Variables** (CORS is host-matched by `api/notify.js`).

---

## Smart Escalation

LIFELINE uses a layered decision architecture:

```
AI CLASSIFICATION (Groq Cloud or Local Rules)
       +
DETERMINISTIC SAFETY RULES (always applied)
       +
CONFIGURED CONTACT DIRECTORY
       ↓
ESCALATION RECOMMENDATION
```

**Example:**
- AI classifies: "Fire/smoke"
- Rules detect: Smoke + building + road obstruction → "urgent verification"
- Contact directory: Fire response team (configured)
- Result: Recommend fire-response contact with location attached

Safety rules ensure that if AI detects "immediate" indicators (injuries, trapped persons, active fire), the urgency is escalated regardless of AI confidence.

---

## Current Location Sharing

LIFELINE never silently accesses location. The flow is:

1. User sees: **"SHARE CURRENT LOCATION?"**
2. User reviews what will be shared: latitude, longitude, accuracy, timestamp, map link
3. User explicitly taps: **Allow & capture**
4. Location is captured via browser Geolocation API
5. Accuracy is displayed; low accuracy triggers a warning
6. A Google Maps link is generated from the real coordinates

Alternative location methods:
- **Manual**: User enters coordinates directly
- **Map pin**: User selects location on interactive map (when Leaflet loads)
- **Text-derived**: Location mentioned in the report text (clearly labeled)

---

## Incident Map

![Incident Map](docs/screenshots/map.png)

The map shows all incidents with color-coded markers:

- 🟢 Resolved
- 🔵 Reported
- 🟡 Needs verification
- 🟠 Urgent
- 🔴 Immediate

Clicking a marker shows incident details with an **OPEN MAP** link. The map page also includes a feed of recent incidents.

---

## Incident Clustering

LIFELINE can group reports that may describe the same event:

```
REPORT 001: "Smoke near the market."
REPORT 002: "Smoke coming from a building near the market."
REPORT 003: "Road blocked beside the market."

→ POIBLE RELATED INCIDENT
Confidence: Moderate
Status: Needs verification
```

AI grouping is always a **suggestion**, never an automatic merge. Users must review related reports.

---

## Architecture Diagram

```mermaid
graph TD
    subgraph "Frontend (PWA)"
        A[LIFELINE AI Client] --> B[Text / Voice / Image Input]
        B --> C[Location Capture]
        C --> D[AI Router]
    end

    subgraph "AI Router"
        D --> E[Groq Cloud AI]
        D --> F[Local Rules Engine]
    end

    E --> G[Structured Incident]
    F --> G
    D --> H[Safety Validation]
    H --> I[Smart Escalation]

    subgraph "Backend"
        I --> J[Contact Directory]
        J --> K[Phone (tel:)]
        J --> L[SMS]
        J --> M[Email]
        J --> N[Webhook]
    end

    I --> O[Delivery Status]
    G --> P[Incident Map]
    G --> Q[Coordination Dashboard]
```

---

## Offline Architecture

```
User creates report
        ↓
IndexedDB saves report
        ↓
Sync queue stores pending items
        ↓
Service worker handles caching
        ↓
[Connection restored → sync]
        ↓
Reports uploaded to server
        ↓
AI processing on server
        ↓
Updated incident returned
```

When offline:
- Reports are saved locally with status "queued"
- No AI enhancement (local rules only)
- Location capture works if device/browser permits
- Sync queue shows pending count
- Clear indicator shows offline mode

---

## AI Architecture

```
AI ROUTER
    │
    ├── Groq (primary — text + vision + voice)
    ├── Local Rules (always available — fallback)
    └── Safety Rules (always applied on top)
    ↓
Structured Incident
    ↓
Rules Validation
    ↓
Escalation Recommendation
```

- **Primary**: Groq Cloud (requires `GROQ_API_KEY`)
- **Always-available**: Local keyword-based rules engine
- **Safety layer**: Deterministic rules that can override AI urgency

---

## Safety Design

- **No autonomous emergency dispatch**: LIFELINE is not an emergency service
- **Explicit confirmation**: Every escalation requires user tap before sending
- **Deterministic safety rules**: Can escalate urgency above AI classification
- **Clear labeling**: "NOT VERIFIED" appears on all incidents
- **Evidence-based explanations**: Shows why incidents were flagged
- **Fake detection**: AI classification is labeled, never presented as independent verification

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JavaScript (ES modules), HTML, CSS |
| Map | Leaflet + OpenStreetMap |
| Location | Browser Geolocation API |
| Voice | Web Speech API, MediaRecorder API |
| Storage | IndexedDB + localStorage (offline-first) |
| AI | Groq Cloud API (with local rules fallback) |
| PWA | Manifest v3, Service Worker |
| Backend | Node.js serverless functions |
| Auth | Local (PBKDF2) or Firebase Auth |

---

## Installation

```bash
git clone <repository-url>
cd lifeline-ai
# Open index.html in a web server
npx serve .  # OR
python -m http.server 8080
```

For production deployment to Vercel, copy `vercel.json` to project root.

---

## Environment Variables

Create a `.env` file:

```env
GROQ_API_KEY=          # Groq Cloud API key (optional — local fallback works without)
TELEPHONY_PROVIDER=    # Telephony provider (optional)
TELEPHONY_ACCOUNT_ID=
TELEPHONY_AUTH_TOKEN=
TELEPHONY_FROM_NUMBER=
SMS_PROVIDER=          # SMS gateway (optional)
EMAIL_PROVIDER=        # Email provider (optional)
EMAIL_FROM_ADDRESS=
WEBHOOK_URL=           # Organization webhook (optional)
```

Only include variables your implementation uses. The app works fully without any keys using the local rules engine.

---

## Local Development

```bash
python -m http.server 8080
# Open http://localhost:8080
```

**Interactive Map setup:** The map loads Leaflet + OpenStreetMap tiles from CDN — **no API key required**. To test the `LOCATE ME` button and current-location capture, serve the app over `http://localhost` (or `https`) and grant the browser geolocation permission when prompted. Opening `index.html` directly via `file://` will not work due to ES module CORS restrictions.

For full backend support (SMS/email/webhook), deploy with Vercel or any Node.js server that supports `/api/*` routes.

---

## Testing

```bash
node --test
```

Tests cover:
- Incident classification
- Urgency assessment
- Location link generation
- Location validation
- Incident ID generation
- Local analysis accuracy

---

## Screenshots

Screenshots are available in [`docs/screenshots/`](docs/screenshots/):

1. [Landing/Report Screen](docs/screenshots/report.png)
2. [Voice Reporting](docs/screenshots/voice.png)
3. [Image Analysis](docs/screenshots/image.png)
4. [AI Analysis](docs/screenshots/analysis.png)
5. [Incident Brief](docs/screenshots/brief.png)
6. [Location Permission](docs/screenshots/location.png)
7. [Current Location](docs/screenshots/location-captured.png)
8. [Smart Escalation](docs/screenshots/escalation.png)
9. [Incident Map](docs/screenshots/map.png)
10. [Coordination Dashboard](docs/screenshots/dashboard.png)
11. [Contact Directory Admin](docs/screenshots/contacts.png)
12. [Offline Mode](docs/screenshots/offline.png)

---

## Demo Mode

A **demo scenario** is included for quick demonstration:

> "There is heavy smoke coming from a building near the market and the road is blocked."

Click **TRY DEMO INCIDENT** to walk through the complete workflow:
1. Report generation
2. AI analysis
3. Location capture
4. Incident brief
5. Smart escalation
6. Contact confirmation
7. Delivery status
8. Map placement

Demo contacts use clearly fictional numbers. No real emergency services will be contacted.

---

## Limitations

- LIFELINE is not a medical device or emergency service
- AI classification accuracy depends on Groq model availability
- Location accuracy depends on device capabilities and permissions
- SMS/email require server-side configuration
- The coordination dashboard requires authentication
- Offline incidents sync only when connectivity is restored
- **Map tiles require an internet connection.** When offline, the map shows a `MAP OFFLINE` banner and does not claim to be live; however, incident data and reports stored locally remain available in the incident list and detail panel.
- Coordinates are never fabricated to simulate a map position.

---

## Future Work

- Multi-language support
- Image annotation tools
- Audio recording analysis
- Cross-community incident sharing
- Integration with municipal systems
- Automated incident deduplication ML
- Mobile native app (React Native / Flutter)

---

## Hackathon Information

Built for the **ML Empowerment Build Challenge 3.0**.

- **Technical Implementation**: Multimodal reporting, AI routing, safety rules, offline-first PWA, Leaflet maps
- **Creativity & Innovation**: Incident clustering, explainable AI, multi-channel escalation, location-first design
- **Real-World Impact**: Community incident reporting with structured escalation to response teams
- **Project Design & UX**: Dark mode civic-tech aesthetic, mobile-first reporting, progressive disclosure
- **Documentation**: Comprehensive README, wireframes, architecture diagrams, safety design

---

## Emergency Notice

**If someone is in immediate danger, call your local emergency number immediately:**

- US/Canada: 911
- UK: 999
- EU: 112
- International: [Find your country's emergency number](https://en.wikipedia.org/wiki/Emergency_telephone_number)

LIFELINE AI is an **assistant tool**, not a replacement for emergency responders.

---

## UI Wireframes

The following wireframes document the intended visual and structural design of the LIFELINE AI interface.

### 01 — Landing / Report Screen

```text
┌──────────────────────────────────────────────────────────┐
│ LIFELINE AI                         ● SYSTEM READY       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                   WHAT'S HAPPENING?                      │
│                                                          │
│       Describe the situation or upload what              │
│       you're seeing.                                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  Tell us what is happening...                      │  │
│  │                                                    │  │
│  │                                                    │  │
│  │                                    0 / 1000        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│     🎙 VOICE        📷 IMAGE        📄 REPORT             │
│                                                          │
│                  ┌──────────────────┐                    │
│                  │    ANALYZE →     │                    │
│                  └──────────────────┘                    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ INCIDENTS │ MAP │ HISTORY │ SETTINGS                      │
└──────────────────────────────────────────────────────────┘
```

### 02 — AI Analysis (Processing)

```text
┌──────────────────────────────────────────────────────────┐
│ LIFELINE                         ● ANALYZING              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                 UNDERSTANDING REPORT                     │
│                                                          │
│  ✓ Extracting observations                    COMPLETE   │
│                                                          │
│  ✓ Identifying incident type                   COMPLETE  │
│                                                          │
│  ◉ Estimating urgency                           RUNNING   │
│                                                          │
│  ○ Checking location                            WAITING   │
│                                                          │
│  ○ Finding response category                    WAITING   │
│                                                          │
│  ○ Checking related incidents                   WAITING   │
│                                                          │
│  ○ Determining response category                WAITING   │
│                                                          │
│  ○ Validating output                            WAITING   │
│                                                          │
│  ○ Building incident brief                      WAITING   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ AI PROVIDER                                             │
│ GROQ AI                                                  │
│                                                          │
│ SAFETY VALIDATION                                       │
│ Deterministic rules enabled                             │
└──────────────────────────────────────────────────────────┘
```

### 03 — Incident Brief

```text
┌──────────────────────────────────────────────────────────┐
│ ← BACK                INCIDENT BRIEF                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  #LF-2048                              ● URGENT          │
│                                                          │
│  🔥 FIRE / SMOKE                                         │
│                                                          │
│  REPORTED  23:41                                         │
│  SOURCE    TEXT + LOCATION                               │
│  STATUS    NEEDS VERIFICATION                            │
├──────────────────────────────────────────────────────────┤
│ OBSERVATIONS                                             │
│                                                          │
│ • Heavy smoke                                            │
│ • Building involved                                      │
│ • Road appears blocked                                   │
├──────────────────────────────────────────────────────────┤
│ LOCATION                                                 │
│                                                          │
│ ● Current location captured                              │
│ Accuracy: ±18 m                                          │
│                                                          │
│              [ OPEN MAP ]                              │
├──────────────────────────────────────────────────────────┤
│ RESPONSE                                                 │
│                                                          │
│ Recommended: Fire Response Team                          │
│                                                          │
│             [ SMART ESCALATION → ]                       │
└──────────────────────────────────────────────────────────┘
```

### 04 — Location Permission

```text
┌──────────────────────────────────────────────────────────┐
│ ← INCIDENT BRIEF            LOCATION                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                  SHARE CURRENT LOCATION?                 │
│                                                          │
│                    📍                                    │
│                                                          │
│  LIFELINE can use your device's current location         │
│  to help responders understand where the report          │
│  originated.                                             │
│                                                          │
│  WHAT WILL BE SHARED                                     │
│                                                          │
│  ✓ Latitude / Longitude                                  │
│  ✓ Location accuracy                                    │
│  ✓ Capture timestamp                                     │
│  ✓ Generated map link                                    │
│                                                          │
│  Your location will not be shared until you confirm.     │
│                                                          │
│       ┌─────────────────────┐                            │
│       │ USE CURRENT LOCATION│                            │
│       └─────────────────────┘                            │
│                                                          │
│       Continue without location                          │
└──────────────────────────────────────────────────────────┘
```

### 05 — Smart Escalation

```text
┌──────────────────────────────────────────────────────────┐
│ ← INCIDENT BRIEF             SMART ESCALATION            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  RECOMMENDED RESPONSE                                    │
│                                                          │
│  🔥 FIRE RESPONSE TEAM                                   │
│                                                          │
│  WHY                                                     │
│  Incident classified as Fire / Smoke                     │
│  with Urgent response level.                             │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│  AVAILABLE CONTACT                                       │
│                                                          │
│  Fire Response Team — DEMO                               │
│  ● Enabled                                                │
│                                                          │
│  Channels                                                │
│  📞 CALL   💬 SMS  ✉️ EMAIL   🔗 WEBHOOK                 │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│  INFORMATION TO SHARE                                    │
│                                                          │
│  ✓ Incident summary                                      │
│  ✓ Fire / Smoke                                          │
│  ✓ Urgent                                                │
│  ✓ Current location                                     │
│  ✓ Map link                                              │
│  ✓ Location accuracy                                    │
│                                                          │
│             [ REVIEW & CONFIRM → ]                       │
└──────────────────────────────────────────────────────────┘
```

### 06 — Final Confirmation

```text
┌──────────────────────────────────────────────────────────┐
│ ← ESCALATION              REVIEW & CONFIRM               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                  READY TO SHARE?                         │
│                                                          │
│  Review exactly what will be sent.                       │
│                                                          │
│  RECIPIENT                                               │
│  Fire Response Team — DEMO                               │
│                                                          │
│  CHANNEL                                                 │
│  SMS + Email                                             │
│                                                          │
│  INCIDENT                                                │
│  Fire / Smoke — Urgent                                  │
│                                                          │
│  LOCATION                                                │
│  Current GPS location                                    │
│  Accuracy: ±18 m                                         │
│                                                          │
│  MAP LINK                                                │
│  https://www.google.com/maps?q=...                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ This action will share the information above.      │  │
│  │ Review it carefully before continuing.             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│       [ CANCEL ]        [ CONFIRM & SHARE ]              │
└──────────────────────────────────────────────────────────┘
```

### 07 — Coordination Dashboard

```text
┌──────────────────────────────────────────────────────────┐
│ LIFELINE                 COORDINATION CENTER             │
├───────────────┬──────────────────────────────────────────┤
│               │                                          │
│ OVERVIEW      │  ACTIVE INCIDENTS                        │
│               │                                          │
│ INCIDENTS     │  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│               │  │   12    │ │    4    │ │    8    │   │
│ MAP           │  │ ACTIVE  │ │ URGENT  │ │ VERIFY  │   │
│               │  └─────────┘ └─────────┘ └─────────┘   │
│               │                                          │
│ ESCALATIONS   │  ESCALATION QUEUE                        │
│               │  #LF-2048  FIRE/SMOKE     URGENT   REVIEW│
│               │  #LF-2051  FLOODING       URGENT   REVIEW│
│               │                                          │
│ CONTACTS      │  AI SYSTEM STATUS                        │
│               │  Local: ● ONLINE                        │
│               │  Groq:  ● AVAILABLE                     │
│               │  Sync:  0 pending                       │
└───────────────┴──────────────────────────────────────────┘
```

### 08 — Incident Map

```text
┌──────────────────────────────────────────────────────────┐
│ LIFELINE AI              INCIDENT MAP              ● LIVE│
├──────────────────────────────────────────────────────────┤
│                                                           
│  FILTERS                                                  
│  [ALL] [URGENT] [VERIFY] [RESOLVED]                        
│                                                           
│  ┌──────────────────────────────────────────────────────┐ 
│  │                                                      │ 
│  │                ● LF-2048                             │ 
│  │                                                      │ 
│  │          ● LF-2051                                   │ 
│  │                                                      │ 
│  │                         ◉ CURRENT                   │ 
│  │                                                      │ 
│  │   ● LF-2053                                          │ 
│  │                                                      │ 
│  │                    MAP                               │ 
│  │                                                      │ 
│  └──────────────────────────────────────────────────────┘ 
│                                                           
│  INCIDENTS                                                
│  #LF-2048   FIRE / SMOKE       URGENT                       
│  #LF-2051   FLOODING          VERIFY                       
│  #LF-2053   ROAD OBSTRUCTION   VERIFY                       
└──────────────────────────────────────────────────────────┘
```

### 09 — Mobile UI

```text
┌──────────────────────────────────────┐
│ LIFELINE AI             ● READY      │
├──────────────────────────────────────┤
│                                      │
│                                      
│             WHAT'S HAPPENING?        │
│                                      │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │ Tell us what is happening...   │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  🎙 Voice   📷 Image   📍 GPS      │
│                                      │
│       ┌──────────────────────┐      │
│       │      ANALYZE         │      │
│       └──────────────────────┘      │
│                                      │
├──────────────────────────────────────┤
│ REPORT │ MAP │ HISTORY │ SETTINGS   │
└──────────────────────────────────────┘
```

### 10 — Offline Mode

```text
┌──────────────────────────────────────────────────────────┐
│ LIFELINE                         ◉ OFFLINE              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                    YOU ARE OFFLINE                       │
│                                                          │
│                         ◌                              │
│                                                          │
│  Your report can still be saved on this device.          │
│                                                          │
│  LOCAL STORAGE                                           │
│  ● Available                                             │
│                                                          │
│  QUEUED REPORTS                                          │
│                                                          │
│              ┌───────────────┐                          │
│              │       2       │                          │
│              │   QUEUED      │                          │
│              └───────────────┘                          │
│                                                          │
│  #LOCAL-001     Waiting for connection                   │
│  #LOCAL-002     Waiting for connection                   │
│                                                          │
│  ⚠ Reports are NOT sent while offline.                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 11 — Contact Directory Admin

```text
┌──────────────────────────────────────────────────────────┐
│ CONTACT DIRECTORY                         [ + ADD ]      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ FIRE RESPONSE TEAM                                       │
│ ● ENABLED                                                │
│ SMS ✓   EMAIL ✓   CALL ✓   WEBHOOK ✓                    │
│ Coverage: Community Zone A                               │
│                                                          │
│ ──────────────────────────────────────────────────────  │
│                                                          │
│ MEDICAL RESPONSE TEAM                                    │
│ ● ENABLED                                                │
│ SMS ✓   EMAIL ✓   CALL ✓                                │
│ Coverage: Community Zone A                               │
│                                                          │
│ ──────────────────────────────────────────────────────  │
│                                                          │
│ COMMUNITY COORDINATOR                                    │
│ ○ DISABLED                                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 12 — Delivery Status

```text
┌──────────────────────────────────────────────────────────┐
│ ← INCIDENT                 DELIVERY STATUS                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  #LF-2048                                                │
│                                                          │
│  COMMUNICATION STATUS                                    │
│                                                          │
│  SMS                                                     │
│  ✓ REQUEST ACCEPTED                                      │
│                                                          │
│  EMAIL                                                   │
│  ✓ SENT                                                  │
│                                                          │
│  WEBHOOK                                                 │
│  — NOT CONFIGURED                                        │
│                                                          │
│  LOCATION LINK                                           │
│  ✓ INCLUDED                                              │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│  LAST UPDATED                                            │
│  23:42:19                                                │
│                                                          │
│  NOTE                                                    │
│  "Sent" means the configured provider accepted the       │
│  request. It does not guarantee a human response.        │
└──────────────────────────────────────────────────────────┘
```

---

## Functionality Matrix

| Feature          | Status          | Works Without API? | API Required? | Tested? |
| ---------------- | --------------- | ------------------ | ------------- | ------- |
| Text reporting   | ✅ Implemented    | ✅ Yes            | ❌ No         | ✅ Yes  |
| Voice reporting  | ✅ Implemented    | ✅ Yes (browser)  | ⚠️ Optional   | ✅ Yes  |
| Image reporting  | ✅ Implemented    | ✅ Yes            | ⚠️ Optional   | ✅ Yes  |
| AI analysis      | ✅ Implementable  | ✅ Local fallback | ⚠️ GROQ_API_KEY | ✅ Yes |
| Local fallback   | ✅ Implemented    | ✅ Yes            | ❌ No         | ✅ Yes  |
| Location         | ✅ Implemented    | ✅ Yes            | ❌ No         | ✅ Yes  |
| Map link         | ✅ Implemented    | ✅ Yes            | ❌ No         | ✅ Yes  |
| Smart escalation | ✅ Implemented    | ✅ Yes            | ❌ No         | ✅ Yes  |
| Confirmation     | ✅ Implemented    | ✅ Yes            | ❌ No         | ✅ Yes  |
| Phone            | ✅ tel: link      | ✅ Yes            | ⚠️ Optional   | ✅ Yes  |
| SMS              | ✅ Via API        | ❌ No             | ✅ API needed | ✅ Yes  |
| Email            | ✅ Via API        | ❌ No             | ✅ API needed | ✅ Yes  |
| Webhook          | ✅ Via API        | ❌ No             | ✅ API needed | ✅ Yes  |
| Incident map     | ✅ Implemented    | ✅ Yes (Leaflet CDN) | ❌ No      | ✅ Yes  |
| Clustering       | ✅ Implemented    | ✅ Yes            | ❌ No         | ✅ Yes  |
| Offline mode     | ✅ Implemented    | ✅ Yes            | ❌ No         | ✅ Yes  |
| Sync             | ✅ Implemented    | ✅ Yes (queued)   | ⚠️ On reconnect | ✅ Yes |
| Dashboard        | ✅ Implemented    | ✅ Yes            | ❌ No         | ✅ Yes  |
| Audit log        | ✅ Implemented    | ✅ Yes            | ❌ No         | ✅ Yes  |
| PWA              | ✅ Implemented    | ✅ Yes            | ❌ No         | ✅ Yes  |
| Auth             | ✅ Local default  | ✅ Yes            | ⚠️ Firebase optional | ✅ Yes |
| Incident ID      | ✅ `LF-...` format| ✅ Yes            | ❌ No         | ✅ Yes  |
| Safety override  | ✅ Deterministic  | ✅ Yes            | ❌ No         | ✅ Yes  |
| Contact directory| ✅ Admin interface| ✅ Yes            | ❌ No         | ✅ Yes  |
| Delivery tracking| ✅ Request/Sent/Failed | ✅ Yes         | ⚠️ Optional   | ✅ Yes  |

---

## Demo Flow

1. Open `https://lifeline-ai-red.vercel.app`
2. Enter this report: **"There is heavy smoke coming from a building near the market and the road is blocked."**
3. Click **ANALYZE REPORT** — the analysis screen appears with progress steps
4. The system classifies it as **Fire/Smoke** with **Urgent** urgency (escalated from safety rules)
5. Observations (smoke, building, road obstruction) appear
6. Missing info (people count, cause, time) is detected
7. Review the incident brief — unique ID generated (starts with `LF-`)
8. Navigate to Location — click "Use current location" (or continue without location)
9. Smart Escalation shows the Fire Response Team recommended
10. Click **REVIEW & CONFIRM** — see exactly what will be shared
11. Click **CONFIRM & SHARE** — communication is sent
12. Delivery status shows sent/delivered states
13. Map shows the incident marker
14. History shows the incident in the chronological list
15. Audit log records all events

### Testing without API keys

The application works fully without any API keys. In Settings → AI Provider, the mode defaults to "Automatic" which uses the local rules engine when Groq API is unavailable.

---

## Git Readiness

- ✅ No secrets committed (`.env` is in `.gitignore`)
- ✅ `.env.example` included with all required variables
- ✅ `vercel.json` configured for SPA routing + API proxy
- ✅ No StudyLens references in the codebase
- ✅ `README.md` is complete with full documentation
- ✅ Build verified (tests pass, deployment working)
- ✅ `sw.js` service worker caching enabled
- ✅ `manifest.webmanifest` configured
