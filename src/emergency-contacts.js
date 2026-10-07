// LIFELINE AI - Emergency contact utilities
export const EMERGENCY_CONTACTS_BY_COUNTRY = {
  US: {
    police: { name: "Police", phone: "911", sms: false, call: true, category: "security_response", description: "Emergency police services" },
    fire: { name: "Fire Department", phone: "911", sms: false, call: true, category: "fire_response", description: "Fire, smoke, and rescue" },
    medical: { name: "Ambulance / Medical Emergency", phone: "911", sms: false, call: true, category: "medical_response", description: "Medical emergencies and ambulance" },
    general: { name: "Non-emergency Police", phone: "311", sms: false, call: true, category: "security_response", description: "Non-emergency police and city services" },
  },
  CA: {
    police: { name: "Police", phone: "911", sms: false, call: true, category: "security_response", description: "Emergency police services" },
    fire: { name: "Fire Department", phone: "911", sms: false, call: true, category: "fire_response", description: "Fire, smoke, and rescue" },
    medical: { name: "Ambulance / Medical Emergency", phone: "911", sms: false, call: true, category: "medical_response", description: "Medical emergencies and ambulance" },
    general: { name: "Non-emergency Police", phone: "311", sms: false, call: true, category: "security_response", description: "Non-emergency police and city services" },
  },
  GB: {
    police: { name: "Police (non-emergency)", phone: "101", sms: false, call: true, category: "security_response", description: "Police non-emergency" },
    fire: { name: "Fire and Rescue", phone: "999", sms: false, call: true, category: "fire_response", description: "Fire, smoke, and rescue" },
    medical: { name: "Ambulance / NHS", phone: "999", sms: false, call: true, category: "medical_response", description: "Medical emergencies and ambulance" },
    general: { name: "Police (emergency)", phone: "999", sms: false, call: true, category: "security_response", description: "Emergency police services" },
  },
  DE: {
    police: { name: "Police", phone: "110", sms: false, call: true, category: "security_response", description: "Emergency police services" },
    fire: { name: "Fire Department", phone: "112", sms: false, call: true, category: "fire_response", description: "Fire, smoke, and rescue" },
    medical: { name: "Ambulance / Medical Emergency", phone: "112", sms: false, call: true, category: "medical_response", description: "Medical emergencies and ambulance" },
    general: { name: "Police (non-emergency)", phone: "110", sms: false, call: true, category: "security_response", description: "Non-emergency police" },
  },
  FR: {
    police: { name: "Police", phone: "112", sms: false, call: true, category: "security_response", description: "Emergency police services" },
    fire: { name: "Fire Department", phone: "118", sms: false, call: true, category: "fire_response", description: "Fire, smoke, and rescue" },
    medical: { name: "Ambulance / Medical Emergency", phone: "112", sms: false, call: true, category: "medical_response", description: "Medical emergencies and ambulance" },
    general: { name: "SAMU Medical Emergency", phone: "15", sms: false, call: true, category: "medical_response", description: "Medical emergencies" },
  },
  IN: {
    police: { name: "Police", phone: "100", sms: false, call: true, category: "security_response", description: "Emergency police services" },
    fire: { name: "Fire Department", phone: "101", sms: false, call: true, category: "fire_response", description: "Fire, smoke, and rescue" },
    medical: { name: "Ambulance / Medical Emergency", phone: "102", sms: false, call: true, category: "medical_response", description: "Medical emergencies and ambulance" },
    general: { name: "Women Helpline", phone: "103", sms: false, call: true, category: "security_response", description: "Women helpline" },
  },
  AU: {
    police: { name: "Police", phone: "000", sms: false, call: true, category: "security_response", description: "Emergency police services" },
    fire: { name: "Fire Department", phone: "000", sms: false, call: true, category: "fire_response", description: "Fire, smoke, and rescue" },
    medical: { name: "Ambulance / Medical Emergency", phone: "000", sms: false, call: true, category: "medical_response", description: "Medical emergencies and ambulance" },
    general: { name: "Police (non-emergency)", phone: "131 444", sms: false, call: true, category: "security_response", description: "Non-emergency police" },
  },
  // Default fallback
  default: {
    police: { name: "Police Emergency", phone: "112", sms: false, call: true, category: "security_response", description: "Emergency police services" },
    fire: { name: "Fire Department", phone: "112", sms: false, call: true, category: "fire_response", description: "Fire, smoke, and rescue" },
    medical: { name: "Ambulance", phone: "112", sms: false, call: true, category: "medical_response", description: "Medical emergencies and ambulance" },
    general: { name: "General Emergency", phone: "112", sms: false, call: true, category: "general", description: "General emergency services" },
  }
};

export function getEmergencyContactsForCountry(countryCode) {
  const code = (countryCode || "US").toUpperCase();
  return EMERGENCY_CONTACTS_BY_COUNTRY[code] || EMERGENCY_CONTACTS_BY_COUNTRY.default;
}

export function getEmergencyContact(category, countryCode = "US") {
  const contacts = getEmergencyContactsForCountry(countryCode);
  const map = {
    fire_response: "fire",
    medical_response: "medical",
    security_response: "police",
    road_hazard_response: "police", // Police handles road hazards
    power_response: "general", // Utility, fallback to general
    environmental_response: "fire", // Environmental hazards, fire handles
    missing_person_response: "police",
    community_coordinator: "general",
    general: "general",
  };
  const key = map[category] || "general";
  return contacts[key];
}

// Returns incident-type-specific emergency contact
export function getRecommendedEmergencyContact(incidentType, countryCode = "US") {
  const typeToCategory = {
    fire_smoke: "fire_response",
    medical: "medical_response",
    flooding: "fire_response",
    road_hazard: "security_response",
    power_hazard: "general",
    environmental: "fire_response",
    security: "security_response",
    missing_person: "missing_person_response",
    community_assistance: "community_coordinator",
    unknown: "general",
  };
  const category = typeToCategory[incidentType] || "general";
  return getEmergencyContact(category, countryCode);
}

// AI-powered discovery of emergency contacts for countries not in static DB
export async function discoverEmergencyContacts(countryCode, apiKey, fetchImpl = fetch) {
  if (!apiKey) return null;
  try {
    const response = await fetchImpl("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an emergency services directory assistant. Return ONLY valid JSON with emergency contact numbers for the specified country."
          },
          {
            role: "user",
            content: `Return JSON with emergency numbers for ${countryCode || "US"}. Format: {"police": {"name": "...", "phone": "...", "sms": true/false, "call": true, "category": "security_response", "description": "..."}, "fire": {...}, "medical": {...}, "general": {...}}`
          }
        ],
        temperature: 0,
        max_tokens: 300,
        response_format: { type: "json_object" }
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch (error) {
    console.warn("[LIFELINE] AI contact discovery failed:", error?.message);
    return null;
  }
}

// Main function to get emergency contacts, with AI fallback for unknown countries
export async function getEmergencyContactsWithAIFallback(countryCode, apiKey, fetchImpl = fetch) {
  // Try static database first
  const staticContacts = getEmergencyContactsForCountry(countryCode);
  if (staticContacts !== EMERGENCY_CONTACTS_BY_COUNTRY.default) {
    return staticContacts;
  }
  
  // If we're using defaults, try AI discovery for better local numbers
  if (apiKey && navigator.onLine) {
    const aiContacts = await discoverEmergencyContacts(countryCode, apiKey, fetchImpl);
    if (aiContacts && Object.keys(aiContacts).length >= 3) {
      // Cache the discovered contacts
      try {
        localStorage.setItem(`lifeline.emergency.${countryCode}`, JSON.stringify(aiContacts));
      } catch {}
      return normalizeAIContacts(aiContacts);
    }
  }
  
  return staticContacts;
}

function normalizeAIContacts(aiContacts) {
  const normalized = {};
  const categoryMap = {
    police: "security_response",
    fire: "fire_response",
    medical: "medical_response",
    ambulance: "medical_response",
    general: "general"
  };
  
  for (const [key, contact] of Object.entries(aiContacts)) {
    const category = categoryMap[key.toLowerCase()] || categoryMap[contact.category?.toLowerCase()] || "general";
    normalized[key] = {
      name: contact.name || `${key.charAt(0).toUpperCase() + key.slice(1)} Services`,
      phone: contact.phone || "112",
      sms: contact.sms !== undefined ? contact.sms : false,
      call: contact.call !== undefined ? contact.call : true,
      category: category,
      description: contact.description || `${category} emergency services`
    };
  }
  return normalized;
}