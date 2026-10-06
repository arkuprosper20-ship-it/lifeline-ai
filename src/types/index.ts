// LIFELINE AI — TypeScript type definitions

export interface IncidentType {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface UrgencyLevel {
  label: string;
  color: string;
  description: string;
}

export interface IncidentStatusLabel {
  label: string;
  color: string;
}

export interface LocationSource {
  label: string;
  type: string;
}

export interface Location {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp: number;
  source: string;
  sourceLabel: string;
  description?: string;
}

export interface Observation {
  label: string;
  present: boolean;
  evidence?: string;
}

export interface MissingInfo {
  label: string;
}

export interface AIAnalysis {
  isIncident: boolean;
  type: string;
  typeLabel: string;
  urgency: string;
  observations: Observation[];
  missingInfo: string[];
  locationDescription: string | null;
  confidence: number;
  summary: string;
  provider?: "groq" | "rules";
  model?: string;
  fallbackFrom?: string;
}

export interface Incident {
  id: string;
  type: string;
  typeLabel: string;
  urgency: "information" | "monitor" | "verify" | "urgent" | "immediate";
  status: "reported" | "active" | "verify" | "verified" | "resolved" | "false_alarm";
  observations: string[];
  missingInfo: string[];
  summary: string;
  location: Location | null;
  timestamp: number;
  provider: "groq" | "rules";
  model: string | null;
  confidence: number;
  aiClassification: string;
  source: "ai" | "local";
  safetyOverrideApplied: boolean;
  hasImage: boolean;
  enhanced: boolean;
  synced: boolean;
  isDemo: boolean;
  lastEscalation?: Escalation;
}

export interface Escalation {
  at: number;
  contact: string;
  contactName: string;
  provider: string;
  method: string;
  status: string;
  delivered: boolean;
  note: string;
  messageId: string | null;
  error: string | null;
  channels: Record<string, Channel>;
  notification: NotificationObject;
}

export interface Channel {
  provider: string;
  method: string;
  status: string;
  delivered: boolean;
  note: string;
  messageId: string | null;
  error: string | null;
  deviceLink?: string;
}

export interface NotificationObject {
  incidentId: string;
  category: string;
  categoryLabel: string;
  urgency: string | null;
  summary: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationUrl: string | null;
  recipient: string;
  provider: string;
  status: string;
}

export interface Contact {
  id: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  webhook: string;
  sms: boolean;
  call: boolean;
  enabled: boolean;
  priority: number;
  coverage: string;
  description: string;
}

export interface Settings {
  mode: "automatic" | "groq" | "local";
  allowGroqFallback: boolean;
  locationDefault: "ask" | "gps" | "manual";
  notifications: boolean;
  autoSync: boolean;
  demoMode: boolean;
  countryCode: string;
}

export interface UIState {
  currentView: string;
  selectedIncident: Incident | null;
  reportText: string;
  imagePreview: string | null;
  imageFile: File | null;
  voiceText: string | null;
  locationText: string | null;
  location: Location | null;
  currentLocation: Location | null;
  isAnalyzing: boolean;
  analysisResult: AIAnalysis | null;
  showLocationModal: boolean;
  selectedContact: string | null;
  needsRender: boolean;
  params: Record<string, string>;
}

export interface SyncQueueItem {
  id: string;
  queuedAt: number;
  attempts: number;
  completed?: boolean;
  lastError?: string;
  [key: string]: unknown;
}

export interface NotificationQueueItem {
  id: string;
  incidentId: string;
  contactId: string;
  type: string;
  pkg: IncidentPackage;
  queuedAt: number;
  attempts: number;
  lastError?: string;
}

export interface IncidentPackage {
  incidentId: string;
  type: string;
  typeLabel: string;
  urgency: string;
  status: string;
  time: string;
  observations: string[];
  missingInfo: string[];
  location: Location | null;
  locationType: string;
  locationSection: string;
  mapLink: string | null;
  summary: string;
  textMessage: string;
  smsMessage: string;
  emailSubject: string;
  emailBody: string;
  webhookPayload: WebhookPayload;
}

export interface WebhookPayload {
  incidentId: string;
  type: string;
  typeLabel: string;
  urgency: string;
  status: string;
  reportedAt: string;
  observations: string[];
  missingInfo: string[];
  location: Location | null;
  locationUrl: string | null;
  summary: string;
  source: string;
}

export interface NotificationConfig {
  smsProvider: string;
  twilioConfigured: boolean;
  emailConfigured: boolean;
  webhookConfigured: boolean;
  configured: boolean;
}

export interface ProviderSelection {
  provider: string;
  status: string;
  label: string;
}

export interface MapIncident {
  id: string;
  type: string;
  urgency: string;
  status: string;
  timestamp: number;
  location: Location;
  observations: string[];
  summary: string;
}

export interface MapFilter {
  category: string;
  urgency: string;
  status: string;
  search: string;
}

export interface RelatedIncidentsResult {
  incidents: Incident[];
  confidence: number;
  reason: string;
}

export interface GeoLocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: number;
}

export interface PermissionState {
  state: "granted" | "denied" | "prompt";
  granted: boolean;
  reason: string;
}

export interface LocationState {
  state: string;
  message: string;
}

export interface ToastMessage {
  message: string;
  type?: "error" | "info" | "success" | "warning";
}

export interface DemoIncident {
  id: string;
  type: string;
  title: string;
  urgency: string;
  status: string;
  observations: string[];
  timestamp: number;
  location: Location;
  synced: boolean;
  isDemo: boolean;
}

export const INCIDENT_TYPES: IncidentType[] = [
  { id: "fire_smoke", label: "Fire / Smoke", icon: "🔥", color: "type-fire" },
  { id: "medical", label: "Medical concern", icon: "🏥", color: "type-medical" },
  { id: "flooding", label: "Flooding", icon: "🌊", color: "type-flooding" },
  { id: "road_hazard", label: "Road obstruction", icon: "🚧", color: "type-road" },
  { id: "power_hazard", label: "Power/Electrical", icon: "⚡", color: "type-power" },
  { id: "environmental", label: "Building/Environmental", icon: "🏗️", color: "type-environmental" },
  { id: "security", label: "Security concern", icon: "⚠️", color: "type-security" },
  { id: "missing_person", label: "Missing person/pet", icon: "🔍", color: "type-missing" },
  { id: "community_assistance", label: "Community assistance", icon: "🤝", color: "type-community" },
  { id: "unknown", label: "Other/unknown", icon: "❓", color: "type-other" },
];

export const URGENCY_LEVELS = ["information", "monitor", "verify", "urgent", "immediate"] as const;

export const URGENCY_LABELS: Record<string, UrgencyLevel> = {
  information: { label: "No escalation", color: "badge-ready", description: "No escalation recommended." },
  monitor: { label: "Monitor", color: "badge-monitor", description: "Situation may need observation." },
  verify: { label: "Verify", color: "badge-verify", description: "Additional information or human verification required." },
  urgent: { label: "Urgent", color: "badge-urgent", description: "Prompt contact with appropriate response may be appropriate." },
  immediate: { label: "Immediate", color: "badge-immediate", description: "Report may indicate an immediate threat." },
};

export const INCIDENT_STATUS = ["reported", "active", "verify", "verified", "resolved", "false_alarm"] as const;

export const INCIDENT_STATUS_LABELS: Record<string, IncidentStatusLabel> = {
  reported: { label: "Reported", color: "badge-monitor" },
  active: { label: "Active", color: "badge-urgent" },
  verify: { label: "Needs Verification", color: "badge-verify" },
  verified: { label: "Verified", color: "badge-ready" },
  resolved: { label: "Resolved", color: "badge-resolved" },
  false_alarm: { label: "False Alarm", color: "badge-gray" },
};

export const RESPONSE_CATEGORIES = [
  "fire_response", "medical_response", "flooding_response", "road_hazard_response",
  "power_response", "environmental_response", "security_response",
  "missing_person_response", "community_coordinator", "general"
] as const;

export const LOCATION_SOURCES: Record<string, LocationSource> = {
  gps: { label: "EXACT GPS", type: "gps" },
  manual: { label: "MANUALLY ENTERED", type: "manual" },
  map_pin: { label: "MAP PIN", type: "map_pin" },
  text_derived: { label: "TEXT-DESCRIBED", type: "text" },
  unknown: { label: "UNKNOWN", type: "unknown" },
};

export const STORAGE_KEYS = {
  incidents: "lifeline.incidents.v1",
  contacts: "lifeline.contacts.v1",
  settings: "lifeline.settings.v1",
  syncQueue: "lifeline.syncqueue.v1",
  ui: "lifeline.ui.v1",
  auth: "lifeline.auth.v1",
  notifications: "lifeline.notifications.v1",
};

export const MAX_REPORT_LENGTH = 2000;

export function createIncidentId(): string {
  const now = Date.now();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LF-${now.toString(36).toUpperCase()}-${suffix}`;
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { dateStyle: "medium" });
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}