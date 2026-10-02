// LIFELINE AI — Emergency contacts database (static defaults by country)
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