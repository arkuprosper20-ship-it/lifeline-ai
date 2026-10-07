// LIFELINE AI - Incident Analysis Engine (local fallback + AI router)
import { INCIDENT_TYPES, URGENCY_LEVELS } from "./types.js";

const INCIDENT_KEYWORDS = {
  fire_smoke: ["fire", "smoke", "flames", "burning", "embers", "blaze", "ash", "soot", "structure fire", "house fire", "wildfire", "brush fire", "electrical fire", "grease fire"],
  medical: ["medical", "injured", "injury", "bleed", "bleeding", "unconscious", "dizzy", "pain", "hospital", "sick", "illness", "ache", "emergency", "hurt", "wound", "heart attack", "stroke", "seizure", "choking", "overdose", "allergic", "difficulty breathing", "chest pain", "fall", "broken", "fracture", "trauma"],
  flooding: ["flood", "flooding", "water", "storm", "rain", "drain", "sewer", "overflow", "drown", "inundation", "puddle", "standing water", "flash flood", "water rising", "basement flooded", "river overflow", "dam break"],
  road_hazard: ["road", "street", "blocked", "obstruction", "pothole", "debris", "accident", "collision", "traffic", "closure", "barrier", "construction", "crash", "wreck", "pileup", "hit and run", "vehicle", "car", "truck", "motorcycle", "pedestrian", "lane closed", "downed tree", "landslide"],
  power_hazard: ["power", "electric", "outage", "blackout", "down", "pole", "wire", "sparking", "generator", "electrical", "shock", "power line", "transformer", "arcing", "downed wire", "live wire", "no power", "lights out"],
  environmental: ["building", "structural", "collapse", "wall", "damage", "tree down", "landslide", "erosion", "hazard", "toxic", "chemical", "spill", "gas leak", "hazmat", "contamination", "sinkhole", "crack", "foundation"],
  security: ["security", "threat", "unsafe", "attack", "break-in", "break", "intrusion", "trespassing", "weapon", "violence", "assault", "crime", "theft", "stolen", "robbery", "burglary", "suspicious", "shots fired", "gun", "knife", "domestic", "fight"],
  missing_person: ["missing", "lost", "vanish", "disappear", "search", "found", "reunite", "separated", "alone", "child", "pet", "runaway", "abducted", "wandered", "elderly", "dementia", "autism", "last seen"],
  community_assistance: ["help", "assist", "need", "request", "support", "volunteer", "community", "resource", "supply", "food", "water", "shelter", "evacuation", "transport", "medical supplies", "blankets", "donations"],
  unknown: [],
};

const URGENT_KEYWORDS = ["urgent", "emergency", "asap", "danger", "life threatening", "life-threatening", "heavy smoke", "heavy fire", "911", "9-1-1", "code red", "mayday"];
const IMMEDIATE_KEYWORDS = ["immediate", "right now", "trapped", "stuck", "fallen", "collapse", "now", "asap", "dying", "critical", "unresponsive"];
const VERIFY_KEYWORDS = ["maybe", "possibly", "might", "could", "possible", "sounds like", "report of", "appears", "looks like", "seems like", "heard", "think", "might be"];
const MONITOR_KEYWORDS = ["concerned", "worried", "keep an eye", "watch", "monitor", "check", "reported earlier", "saw earlier", "noticed"];

// Common emergency shorthand and abbreviations
const SHORTHAND_MAP = {
  "mvcrash": "motor vehicle crash",
  "mva": "motor vehicle accident",
  "mvc": "motor vehicle collision",
  "ped": "pedestrian",
  "gsw": "gunshot wound",
  "sob": "shortness of breath",
  "cp": "chest pain",
  "loc": "loss of consciousness",
  "ambi": "ambulance",
  "ems": "emergency medical services",
  "fd": "fire department",
  "pd": "police department",
  "le": "law enforcement",
  "rp": "reporting party",
  "vic": "victim",
  "subj": "subject",
  "veh": "vehicle",
  "entrap": "entrapment",
  "extr": "extrication",
  "hazmat": "hazardous materials",
  "gas": "gas leak",
  "elec": "electrical",
  "struct": "structure",
  "wild": "wildfire",
  "brush": "brush fire",
  "svc": "service",
  "req": "request",
  "resp": "response",
  "enrt": "en route",
  "os": "on scene",
  "clr": "clear",
  "uc": "under control",
};

const LOCATION_PATTERNS = [
  /\bnear\b\s+(.+?)(?:[.,;]|$)/i,
  /\bat\b\s+(.+?)(?:[.,;]|$)/i,
  /\bby\b\s+(.+?)(?:[.,;]|$)/i,
  /\babove\b\s+(.+?)(?:[.,;]|$)/i,
  /\bbelow\b\s+(.+?)(?:[.,;]|$)/i,
  /\bon\b\s+(.+?\b(?:st|ave|rd|blvd|dr|ln|ct|pl|pkwy|hwy|rd|cir|way|ter|sq|byp|expy|fwy|turnpike)\b)(?:[.,;]|$)/i,
  /\b(?:at|near|by|on)\s+(?:the\s+)?(?:corner\s+of\s+)?(.+?\s+(?:and|&)\s+.+?)(?:[.,;]|$)/i,
  /\b(?:btwn|between)\s+(.+?)\s+(?:and|&)\s+(.+?)(?:[.,;]|$)/i,
  /\b\d+\s+(?:st|ave|rd|blvd|dr|ln|ct|pl|pkwy|hwy|rd|cir|way|ter|sq|byp|expy|fwy|turnpike)\b/i,
  /\b(?:mile\s+marker|mm|exit)\s+\d+/i,
];

const TYPE_PRIORITY = {
  fire_smoke: 1,
  medical: 1,
  flooding: 2,
  road_hazard: 3,
  power_hazard: 3,
  environmental: 4,
  security: 2,
  missing_person: 3,
  community_assistance: 4,
  unknown: 5,
};

function expandShorthand(text) {
  let expanded = text;
  for (const [abbrev, full] of Object.entries(SHORTHAND_MAP)) {
    const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
    expanded = expanded.replace(regex, full);
  }
  return expanded;
}

function preprocessText(text) {
  if (!text) return "";
  let processed = text.toLowerCase().trim();
  processed = expandShorthand(processed);
  // Normalize common separators
  processed = processed.replace(/[/\\|]/g, ' ');
  processed = processed.replace(/\s+/g, ' ');
  return processed;
}

const KEYWORDS_WITH_WEIGHT = {
  fire_smoke: { "heavy smoke": 2, smoke: 1, "smoke coming": 2, fire: 2, flames: 2, "on fire": 2, burning: 1, blaze: 2 },
  medical: { injured: 2, unconscious: 2, bleeding: 2, "heart attack": 2, stroke: 2, "medical emergency": 3 },
  flooding: { flood: 2, flooding: 2, "flash flood": 3, "standing water": 2, "water level": 1, "sewer backup": 2, underwater: 2, "deep water": 2 },
  road_hazard: { "road blocked": 2, "blocked road": 2, "road closure": 2, "traffic jam": 1, pileup: 2, collision: 2, pothole: 1, debris: 1, obstruction: 1, "obstruction on": 2 },
  power_hazard: { "power outage": 2, blackout: 2, "downed wire": 2, "live wire": 2, "electrical hazard": 2 },
  environmental: { "building collapse": 3, "structural damage": 3, collapse: 2, "tree down": 2, landslide: 3, "toxic spill": 3, "chemical spill": 3 },
  security: { "active threat": 3, robbery: 2, "hostile person": 2, assault: 2, "weapon seen": 2, weapon: 2, threat: 1, theft: 1, stolen: 1 },
  missing_person: { "missing person": 3, "lost child": 3, "elderly missing": 3, "pet missing": 2, "person reported missing": 3 },
  community_assistance: { "need help": 1, "require assistance": 1, "looking for": 1, "volunteer needed": 1 },
};

function scoreType(text, keywords) {
  let score = 0;
  for (const [kw, weight] of Object.entries(keywords)) {
    if (text.includes(kw)) score += weight;
  }
  return score;
}

export function classifyIncidentType(text) {
  const processed = preprocessText(text);
  const scores = {};
  for (const type of Object.keys(KEYWORDS_WITH_WEIGHT)) {
    scores[type] = scoreType(processed, KEYWORDS_WITH_WEIGHT[type]);
  }
  scores["unknown"] = 0;
  const best = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return TYPE_PRIORITY[a[0]] - TYPE_PRIORITY[b[0]];
    })[0];
  if (!best) return "unknown";
  return best[0];
}

export function assessUrgency(text) {
  const processed = preprocessText(text);
  if (IMMEDIATE_KEYWORDS.some(kw => processed.includes(kw)) || ["fire", "flames", "burning", "unconscious", "bleed", "injured", "collapse", "trapped", "dying", "critical", "unresponsive"].some(kw => processed.includes(kw))) return "immediate";
  if (URGENT_KEYWORDS.some(kw => processed.includes(kw))) return "urgent";
  if (VERIFY_KEYWORDS.some(kw => processed.includes(kw))) return "verify";
  if (MONITOR_KEYWORDS.some(kw => processed.includes(kw))) return "monitor";
  return "information";
}

export function extractObservations(text) {
  const processed = preprocessText(text);
  const observations = [];
  const obsPatterns = [
    { keywords: ["smoke", "smoke"], label: "Smoke visible" },
    { keywords: ["fire", "flames", "burning", "blaze"], label: "Fire/flames visible" },
    { keywords: ["building", "structure", "house", "home"], label: "Building visible" },
    { keywords: ["road", "street", "highway", "ave", "blvd", "drive"], label: "Road referenced" },
    { keywords: ["water", "flood", "flooding"], label: "Water/flooding visible" },
    { keywords: ["injured", "hurt", "bleeding", "unconscious", "hurt", "wound"], label: "Injury reported" },
    { keywords: ["power", "electrical", "wire", "transformer", "pole"], label: "Electrical hazard mentioned" },
    { keywords: ["tree", "branch", "limb"], label: "Tree/vegetation hazard mentioned" },
    { keywords: ["block", "obstruction", "blocked", "debris", "pileup", "wreck"], label: "Obstruction mentioned" },
    { keywords: ["gas", "leak", "hazmat", "chemical", "toxic", "spill"], label: "Hazmat/Chemical mentioned" },
    { keywords: ["weapon", "gun", "knife", "shots", "shooting"], label: "Weapon mentioned" },
  ];
  for (const pattern of obsPatterns) {
    if (pattern.keywords.some(kw => processed.includes(kw))) {
      observations.push({ label: pattern.label, present: true });
    } else {
      observations.push({ label: pattern.label, present: false });
    }
  }
  return observations;
}

export function extractLocationFromText(text) {
  if (!text) return null;
  const processed = preprocessText(text);
  for (const pattern of LOCATION_PATTERNS) {
    const match = processed.match(pattern);
    if (match && match[1]) {
      let desc = match[1].trim().replace(/^(?:the|a|an)\s+/i, "");
      return { description: desc, source: "text" };
    }
  }
  return null;
}

export function detectMissingInfo(text, observations) {
  const missing = [];
  const processed = preprocessText(text);
  if (!processed.includes("where") && !processed.includes("at ") && !processed.includes("near ") && !processed.includes("location") && !processed.includes("address")) {
    missing.push("Exact location or address");
  }
  if (!processed.includes("people") && !processed.includes("person") && !processed.includes("injured") && !processed.includes("anyone") && !processed.includes("victim") && !processed.includes("patient")) {
    missing.push("Number of people affected");
  }
  if (!/cause|because|due to|reason/i.test(processed)) {
    missing.push("Known cause or origin");
  }
  if (!/time|when|at \d|current|now|ago/i.test(processed)) {
    missing.push("Time of occurrence");
  }
  return missing;
}

export async function getAIAnalysis(text, imageDataUrl, options = {}) {
  const { apiKey, fetchImpl = fetch, signal, observations, incidentType, urgency } = options;

  // Route through server-side endpoint which uses the server's API key
  // This prevents exposing the API key to the client
  try {
    const response = await fetchImpl("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text || "",
        imageDataUrl,
        observations,
        incidentType,
        urgency
      }),
      signal,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (data.fallback) {
        return { analysis: localAnalysis(text), provider: "rules", model: null, fallbackFrom: "ai" };
      }
      throw Object.assign(new Error(data.error || "AI request failed."), { code: data.code || "provider_error" });
    }

    const data = await response.json();

    if (!data.success || data.fallback) {
      return { analysis: localAnalysis(text), provider: "rules", model: null, fallbackFrom: "ai" };
    }

    return {
      analysis: data.result,
      provider: "groq",
      model: data.model || "llama-3.3-70b-versatile",
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw Object.assign(new Error("AI request timed out."), { code: "timeout" });
    }
    console.warn("[LIFELINE] AI analysis failed, falling back to rules:", error?.message || error);
    throw error;
  }
}

export function localAnalysis(text) {
  const processed = preprocessText(text);
  const type = classifyIncidentType(processed);
  const urgency = assessUrgency(processed);
  const observations = extractObservations(processed).filter(o => o.present);
  const missing = detectMissingInfo(processed);
  const location = extractLocationFromText(processed);
  const typeLabel = INCIDENT_TYPES.find(t => t.id === type)?.label || "Unknown incident";
  return {
    isIncident: type !== "unknown" || observations.length > 0,
    type,
    typeLabel,
    urgency,
    observations: observations.map(o => ({ label: o.label, present: o.present, evidence: o.evidence })),
    missingInfo: missing,
    locationDescription: location ? location.description : null,
    confidence: type !== "unknown" ? 0.6 : 0.3,
    summary: `${typeLabel}. ${observations.length > 0 ? observations.map(o => o.label).join(", ") + "." : "No specific observations detected."}`,
  };
}

export function detectSafetyOverride(urgency, type, observations) {
  const obsStr = observations?.map(o => typeof o === "string" ? o : o.label || "").join(" ") || "";
  if (type === "fire_smoke" && /smoke|fire|flames|burning/i.test(obsStr)) return "immediate";
  if (type === "medical" && /injured|unconscious|bleeding|injury|hurt|wound/i.test(obsStr)) return "immediate";
  if (type === "power_hazard" && /spark|down|exposed/i.test(obsStr)) return "urgent";
  if (type === "security" && /weapon|threat|violent/i.test(obsStr)) return "urgent";
  return urgency;
}

export function findRelatedIncidents(incidents, thresholdMinutes = 120, proximityMeters = 500) {
  const results = [];
  for (let i = 0; i < incidents.length; i++) {
    for (let j = i + 1; j < incidents.length; j++) {
      const a = incidents[i];
      const b = incidents[j];
      const timeDiff = Math.abs((b.timestamp || 0) - (a.timestamp || 0)) / 60000;
      if (timeDiff > thresholdMinutes) continue;
      let locationMatch = false;
      let confidence = 0;
      const commonType = a.type === b.type;
      const commonObs = (a.observations || []).filter(o => (b.observations || []).some(b => b.toLowerCase().includes(o.toLowerCase())));
      if (commonType) {
        locationMatch = true;
        confidence += 0.4;
      }
      if (commonObs.length > 0) {
        locationMatch = true;
        confidence += 0.3;
      }
      if (a.location?.source === "text" && b.location?.source === "text") {
        if (a.location?.description && b.location?.description &&
            a.location.description.toLowerCase().includes(b.location.description.toLowerCase().split(/\s+/)[0])) {
          locationMatch = true;
          confidence += 0.3;
        }
      }
      if (a.location?.latitude && b.location?.latitude) {
        const dist = getDistance(a.location, b.location);
        if (dist <= proximityMeters) {
          locationMatch = true;
          confidence += 0.5 - Math.min(dist / proximityMeters, 0.5);
        }
      }
      if (locationMatch && confidence >= 0.4) {
        results.push({
          incidents: [a, b],
          confidence: Math.min(confidence, 0.95),
          reason: ["same type", "shared observations", "nearby location", "same area"].filter((_, i) => [commonType, commonObs.length > 0, a.location?.source === "text" && b.location?.source === "text", a.location?.latitude && b.location?.latitude].includes(Boolean) || (i === 3 && a.location?.latitude && b.location?.latitude)).join(", "),
        });
      }
    }
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}

function getDistance(locA, locB) {
  if (!locA?.latitude || !locB?.latitude) return Infinity;
  const R = 6371000;
  const dLat = (locB.latitude - locA.latitude) * Math.PI / 180;
  const dLon = (locB.longitude - locA.longitude) * Math.PI / 180;
  const lat1 = locA.latitude * Math.PI / 180;
  const lat2 = locB.latitude * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}
