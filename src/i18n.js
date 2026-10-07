// LIFELINE AI - Multi-language support
// Uses a JSON-based translation system with runtime language switching

const DEFAULT_LANGUAGE = "en";
const FALLBACK_LANGUAGE = "en";

const TRANSLATIONS = {
  en: {
    app_name: "LIFELINE AI",
    system_ready: "SYSTEM READY",
    analyzing: "ANALYZING",
    offline: "OFFLINE",
    what_happening: "What's happening?",
    describe_situation: "Describe the situation or upload what you are seeing. Your report helps coordinate a response.",
    report_placeholder: "Describe what you saw: smoke, injuries, road blockage, location, time...",
    voice_btn: "Voice",
    image_btn: "Image",
    location_btn: "Location",
    analyze_report: "ANALYZE REPORT",
    analyzing_report: "Analyzing report",
    observations: "Observations",
    missing_info: "Unknown",
    location: "Location",
    share_current_location: "SHARE CURRENT LOCATION?",
    use_current_location: "Use current location",
    continue_without_location: "Continue without location",
    smart_escalation: "Smart Escalation",
    recommended_response: "Recommended response contact",
    information_to_share: "Information to share",
    review_confirm: "REVIEW & CONFIRM",
    ready_to_send: "Ready to send",
    confirm_send: "CONFIRM & SEND",
    delivery_status: "Delivery status",
    copy_message: "COPY INCIDENT MESSAGE",
    copy_location_link: "COPY LOCATION LINK",
    open_map: "OPEN MAP",
    view_incident: "VIEW INCIDENT",
    incident_brief: "INCIDENT BRIEF",
    emergency_services: "Emergency services",
    call_now: "CALL NOW",
    sms: "SMS",
    not_verified: "NOT VERIFIED",
    recent_incidents: "Recent incidents",
    view_all: "View all incidents",
    no_location_captured: "No location captured.",
    capture_location: "CAPTURE LOCATION",
    settings: "Settings",
    history: "History",
    map: "Map",
    report: "Report",
    coordination_center: "COORDINATION CENTER",
    filters: "Filters",
    search: "Search by ID, type, or keyword...",
    locate_me: "Locate me",
    reset_view: "Reset view",
    demo_mode: "DEMO MODE",
    online: "Online",
    current_location: "Current location",
    accuracy: "Accuracy",
    captured: "Captured",
    latitude: "Latitude",
    longitude: "Longitude",
    timestamp: "Timestamp",
    incident_id: "Incident ID",
    reported: "Reported",
    type: "Type",
    urgency: "Urgency",
    status: "Status",
    source: "Source",
    ai_classification: "AI Classification",
    response: "Response",
    verification: "Verification",
    mark_verified: "Mark as Verified",
    mark_resolved: "Mark as Resolved",
    mark_false_alarm: "Mark as False Alarm",
    copy_brief: "COPY BRIEF",
    edit_report: "Edit report",
    cancel: "CANCEL",
    retry: "Retry",
    no_incident_found: "No incident found.",
    save: "Save",
    language: "Language",
    select_language: "Select language",
    demo_notification: "Demo notification",
    no_real_message: "No real message will be sent.",
    privacy_focused: "Privacy-Focused",
    no_data_sold: "No data sold",
  },
  es: {
    app_name: "LIFELINE AI",
    system_ready: "SISTEMA LISTO",
    analyzing: "ANALIZANDO",
    offline: "SIN CONEXION",
    what_happening: "?Que sucede?",
    describe_situation: "Describe la situacion o carga lo que ves. Tu informe ayuda a coordinar una respuesta.",
    report_placeholder: "Describe lo que viste: humo, lesiones, obstruccion de carretera, ubicacion, hora...",
    voice_btn: "Voz",
    image_btn: "Imagen",
    location_btn: "Ubicacion",
    analyze_report: "ANALIZAR INFORME",
    analyzing_report: "Analizando informe",
    observations: "Observaciones",
    missing_info: "Desconocido",
    location: "Ubicacion",
    share_current_location: "?COMPARTIR UBICACION ACTUAL?",
    use_current_location: "Usar ubicacion actual",
    continue_without_location: "Continuar sin ubicacion",
    smart_escalation: "Escalada Inteligente",
    recommended_response: "Contacto de respuesta recomendado",
    information_to_share: "Informacion para compartir",
    review_confirm: "REPASAR Y CONFIRMAR",
    ready_to_send: "Listo para enviar",
    confirm_send: "CONFIRMAR Y ENVIAR",
    delivery_status: "Estado de entrega",
    copy_message: "COPIAR MENSAJE",
    copy_location_link: "COPIAR ENLACE DE UBICACION",
    open_map: "ABRIR MAPA",
    view_incident: "VER INCIDENTE",
    incident_brief: "RESUMEN DEL INCIDENT",
    emergency_services: "Servicios de emergencia",
    call_now: "LLAMAR AHORA",
    sms: "SMS",
    not_verified: "NO VERIFICADO",
    recent_incidents: "Incidentes recientes",
    view_all: "Ver todos los incidentes",
    no_location_captured: "No se capturo ubicacion.",
    capture_location: "CAPTURAR UBICACION",
    settings: "Configuracion",
    history: "Historial",
    map: "Mapa",
    report: "Informe",
    coordination_center: "CENTRO DE COORDINACION",
    filters: "Filtros",
    search: "Buscar por ID, tipo o palabra clave...",
    locate_me: "Localiceme",
    reset_view: "Restablecer vista",
    demo_mode: "MODO DEMO",
    online: "En linea",
    current_location: "Ubicacion actual",
    accuracy: "Precision",
    captured: "Capturado",
    latitude: "Latitud",
    longitude: "Longitud",
    timestamp: "Marca de tiempo",
    incident_id: "ID del incidente",
    reported: "Informado",
    type: "Tipo",
    urgency: "Urgencia",
    status: "Estado",
    source: "Fuente",
    ai_classification: "Clasificacion de IA",
    response: "Respuesta",
    verification: "Verificacion",
    mark_verified: "Marcar como verificado",
    mark_resolved: "Marcar como resuelto",
    mark_false_alarm: "Marcar como falso alarmao",
    copy_brief: "COPIAR RESUMEN",
    edit_report: "Editar informe",
    cancel: "CANCELAR",
    retry: "Reintentar",
    no_incident_found: "No se encontro incidente.",
    save: "Guardar",
    language: "Idioma",
    select_language: "Seleccionar idioma",
    demo_notification: "Notificacion de demostracion",
    no_real_message: "No se enviara ningun mensaje real.",
    privacy_focused: "Privacidad Centrada",
    no_data_sold: "Sin venta de datos",
  },
  fr: {
    app_name: "LIFELINE AI",
    system_ready: "SYSTEME PRET",
    analyzing: "ANALYSE",
    offline: "HORS LIGNE",
    what_happening: "Qu'arrive-t-il ?",
    describe_situation: "Decrivez la situation ou telechargez ce que vous voyez. Votre rapport aide a coordonner une reponse.",
    report_placeholder: "Decrivez ce que vous avez vu : fumee, blessures, obstruction de route, localisation, heure...",
    voice_btn: "Voix",
    image_btn: "Image",
    location_btn: "Emplacement",
    analyze_report: "ANALYSER LE RAPPORT",
    analyzing_report: "Analyse du rapport",
    observations: "Observations",
    missing_info: "Inconnu",
    location: "Emplacement",
    share_current_location: "PARTAGER LA LOCALISATION ACTUELLE ?",
    use_current_location: "Utiliser la localisation actuelle",
    continue_without_location: "Continuer sans localisation",
    smart_escalation: "Escalade Intelligente",
    recommended_response: "Contact de reponse recommande",
    information_to_share: "Informations a partager",
    review_confirm: "REVISER ET CONFIRMER",
    ready_to_send: "Pret a envoyer",
    confirm_send: "CONFIRMER ET ENVOYER",
    delivery_status: "Statut de livraison",
    copy_message: "COPIER LE MESSAGE",
    copy_location_link: "COPIER LE LIEN DE LOCALISATION",
    open_map: "OUVRIR LA CARTE",
    view_incident: "VOIR L'INCIDENT",
    incident_brief: "RESUME DE L'INCIDENT",
    emergency_services: "Services d'urgence",
    call_now: "APPELER MAINTENANT",
    sms: "SMS",
    not_verified: "NON VERIFIE",
    recent_incidents: "Incidents recents",
    view_all: "Voir tous les incidents",
    no_location_captured: "Aucune localisation capturee.",
    capture_location: "CAPTURER LA LOCALISATION",
    settings: "Parametres",
    history: "Historique",
    map: "Carte",
    report: "Rapport",
    coordination_center: "CENTRE DE COORDINATION",
    filters: "Filtres",
    search: "Rechercher par ID, type ou mot-cle...",
    locate_me: "Localiser moi",
    reset_view: "Reinitialiser la vue",
    demo_mode: "MODE DEMO",
    online: "En ligne",
    current_location: "Localisation actuelle",
    accuracy: "Precision",
    captured: "Capture",
    latitude: "Latitude",
    longitude: "Longitude",
    timestamp: "Horodatage",
    incident_id: "ID de l'incident",
    reported: "Signale",
    type: "Type",
    urgency: "Urgence",
    status: "Statut",
    source: "Source",
    ai_classification: "Classification par IA",
    response: "Reponse",
    verification: "Verification",
    mark_verified: "Marquer comme verifie",
    mark_resolved: "Marquer comme resolu",
    mark_false_alarm: "Marquer comme fausse alarme",
    copy_brief: "COPIER LE RESUME",
    edit_report: "Modifier le rapport",
    cancel: "ANNULER",
    retry: "Reessayer",
    no_incident_found: "Aucun incident trouve.",
    save: "Sauvegarder",
    language: "Langue",
    select_language: "Selectionner la langue",
    demo_notification: "Notification de demonstration",
    no_real_message: "Aucun message reel ne sera envoye.",
    privacy_focused: "Confidentialite",
    no_data_sold: "Pas de vente de donnees",
  },
};

let currentLanguage = DEFAULT_LANGUAGE;
let translations = TRANSLATIONS[DEFAULT_LANGUAGE] || {};

export function setLanguage(lang) {
  currentLanguage = lang;
  translations = TRANSLATIONS[lang] || TRANSLATIONS[FALLBACK_LANGUAGE] || {};
  if (typeof window !== "undefined") {
    localStorage.setItem("lifeline.language", lang);
  }
}

export function getLanguage() {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("lifeline.language");
    if (saved && TRANSLATIONS[saved]) {
      currentLanguage = saved;
      translations = TRANSLATIONS[saved];
    }
  }
  return currentLanguage;
}

export function t(key, params = {}) {
  let result = translations[key] || TRANSLATIONS[FALLBACK_LANGUAGE]?.[key] || key;
  for (const [param, value] of Object.entries(params)) {
    result = result.replace(`{${param}}`, String(value));
  }
  return result;
}

export function getAvailableLanguages() {
  return Object.keys(TRANSLATIONS).map((code) => ({
    code,
    name: {
      en: "English",
      es: "Espanol",
      fr: "Francais",
    }[code] || code,
    flag: {
      en: "[FLAG]",
      es: "[FLAG]",
      fr: "[FLAG]",
    }[code] || "",
  }));
}

export function initLanguage() {
  const saved = getLanguage();
  setLanguage(saved);
  return saved;
}

export function translateObject(obj, lang = currentLanguage) {
  if (typeof obj === "string") {
    return TRANSLATIONS[lang]?.[obj] || TRANSLATIONS[FALLBACK_LANGUAGE]?.[obj] || obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => translateObject(item, lang));
  }
  if (obj && typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = translateObject(value, lang);
    }
    return result;
  }
  return obj;
}