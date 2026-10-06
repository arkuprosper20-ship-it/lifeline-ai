// LIFELINE AI — After-action report generation
// Generates structured incident reports in multiple formats (JSON, text, markdown)

import { createIncidentId, formatDate, formatTimestamp } from "./types.js";
import { buildIncidentPackage } from "./contacts.js";
import { formatElapsed } from "./sla.js";

export function generateAfterActionReport(incident, options = {}) {
  const { includeAIAnalysis = true, includeAuditLog = true, format = "json" } = options;

  const pkg = buildIncidentPackage(incident);
  const timeline = buildTimeline(incident);
  const summary = buildSummary(incident);
  const lessons = identifyLessons(incident);

  const report = {
    reportId: `AAR-${createIncidentId()}`,
    generatedAt: Date.now(),
    incidentId: incident.id,
    type: incident.type,
    typeLabel: incident.typeLabel,
    urgency: incident.urgency,
    status: incident.status,
    timeline,
    summary,
    lessons,
    recommendations: lessons.map((l) => l.recommendation).filter(Boolean),
    metadata: {
      reporter: "community",
      source: incident.source,
      provider: incident.provider,
      confidence: incident.confidence,
      ...(includeAIAnalysis ? { aiAnalysis: incident.aiClassification } : {}),
      ...(includeAuditLog ? { auditLog: incident.auditLog || [] } : {}),
    },
  };

  switch (format) {
    case "text": return formatAsText(report, pkg);
    case "markdown": return formatAsMarkdown(report, pkg);
    case "json":
    default: return report;
  }
}

function buildTimeline(incident) {
  const timeline = [];
  if (incident.timestamp) {
    timeline.push({
      at: incident.timestamp,
      label: "Incident reported",
      icon: "📝",
      details: `Reported via ${incident.source || "app"}`,
    });
  }
  if (incident.location?.timestamp) {
    timeline.push({
      at: incident.location.timestamp,
      label: "Location captured",
      icon: "📍",
      details: `${incident.location.sourceLabel || incident.location.source}`,
    });
  }
  if (incident.lastEscalation?.at) {
    timeline.push({
      at: incident.lastEscalation.at,
      label: "Escalation sent",
      icon: "📤",
      details: `${incident.lastEscalation.method} to ${incident.lastEscalation.contactName}`,
    });
    if (incident.lastEscalation.status === "DELIVERED") {
      timeline.push({
        at: incident.lastEscalation.at + 10000,
        label: "Response delivered",
        icon: "✓",
        details: `Delivered via ${incident.lastEscalation.method}`,
      });
    }
  }
  if (incident.verifiedAt) {
    timeline.push({
      at: incident.verifiedAt,
      label: "Incident verified",
      icon: "✅",
      details: "Incident confirmed by coordinator",
    });
  }
  if (incident.resolvedAt) {
    timeline.push({
      at: incident.resolvedAt,
      label: "Incident resolved",
      icon: "✅",
      details: "Marked as resolved",
    });
  }

  // Add audit log entries as timeline events
  const auditEntries = incident.auditLog || [];
  auditEntries.forEach((entry) => {
    timeline.push({
      at: entry.at || entry.timestamp,
      label: entry.action,
      icon: "📋",
      details: entry.details || entry.note || "",
    });
  });

  return timeline
    .filter((t) => t.at && !isNaN(t.at))
    .sort((a, b) => a.at - b.at)
    .map((t) => ({
      ...t,
      formattedTime: formatTimestamp(t.at),
      formattedDate: formatDate(t.at),
    }));
}

function buildSummary(incident) {
  return {
    id: incident.id,
    type: incident.typeLabel,
    urgency: incident.urgency,
    status: incident.status,
    reported: incident.timestamp ? formatDate(incident.timestamp) : "Unknown",
    duration: incident.resolvedAt
      ? formatElapsed(incident.resolvedAt - incident.timestamp)
      : incident.timestamp
      ? `Ongoing (${formatElapsed(Date.now() - incident.timestamp)})`
      : "Unknown",
    responseTime: incident.lastEscalation?.at && incident.timestamp
      ? formatElapsed(incident.lastEscalation.at - incident.timestamp)
      : "Unknown",
    location: incident.location
      ? incident.location.latitude
        ? `${incident.location.latitude.toFixed(6)}, ${incident.location.longitude.toFixed(6)}`
        : incident.location.description
      : "Not captured",
    observations: incident.observations || [],
    missingInfo: incident.missingInfo || [],
    confidence: incident.confidence,
    provider: incident.provider,
    safetyOverride: incident.safetyOverrideApplied,
  };
}

function identifyLessons(incident) {
  const lessons = [];

  if (incident.missingInfo && incident.missingInfo.length > 0) {
    lessons.push({
      category: "incomplete_information",
      finding: `Report was missing: ${incident.missingInfo.join(", ")}`,
      impact: "Delayed response due to missing context",
      recommendation: "Add required fields to report template for this incident type",
    });
  }

  if (incident.confidence && incident.confidence < 0.5) {
    lessons.push({
      category: "low_confidence",
      finding: `AI classification confidence was low (${Math.round(incident.confidence * 100)}%)`,
      impact: "May require human triage",
      recommendation: "Consider adding more training data or requesting additional details from reporter",
    });
  }

  if (incident.safetyOverrideApplied) {
    lessons.push({
      category: "safety_override",
      finding: "Safety rules escalated urgency above AI classification",
      impact: "Correct classification ensured faster response",
      recommendation: "Review safety rules regularly for this incident type",
    });
  }

  if (incident.lastEscalation?.status && !["DELIVERED", "SENT"].includes(incident.lastEscalation.status)) {
    lessons.push({
      category: "delivery_failure",
      finding: "Notification may not have been delivered successfully",
      impact: "Potential missed response window",
      recommendation: "Implement retry logic and verify contact details",
    });
  }

  if (incident.urgency === "immediate" && incident.lastEscalation?.at && incident.lastEscalation.at - incident.timestamp > 300000) {
    lessons.push({
      category: "response_time",
      finding: "Immediate incident had delayed escalation (>5 minutes)",
      impact: "Potential escalation of severity",
      recommendation: "Implement auto-escalation for immediate incidents",
    });
  }

  if (incident.type === "unknown") {
    lessons.push({
      category: "misclassification",
      finding: "Incident was classified as unknown",
      impact: "May result in incorrect routing",
      recommendation: "Review keyword matching for similar incidents or add new patterns",
    });
  }

  if (lessons.length === 0) {
    lessons.push({
      category: "positive",
      finding: "Incident was handled efficiently",
      impact: "Minimal wasted effort",
      recommendation: "Continue current processes",
    });
  }

  return lessons;
}

function formatAsText(report, pkg) {
  let output = `LIFELINE AI — AFTER-ACTION REPORT
=====================================

Report ID: ${report.reportId}
Generated: ${formatDate(report.generatedAt)} ${formatTimestamp(report.generatedAt)}
Incident ID: ${report.incidentId}
Type: ${report.type}
Urgency: ${report.urgency?.toUpperCase()}
Status: ${report.status}

TIMELINE
--------
`;
  report.timeline.forEach((event) => {
    output += `${event.formattedTime} - ${event.label}: ${event.details}\n`;
  });

  output += `\nSUMMARY
-------
`;
  output += `Reported: ${report.summary.reported}\n`;
  output += `Duration: ${report.summary.duration}\n`;
  output += `Response Time: ${report.summary.responseTime}\n`;
  output += `Location: ${report.summary.location}\n`;
  output += `Confidence: ${Math.round(report.summary.confidence * 100)}%\n`;
  output += `Provider: ${report.summary.provider}\n`;
  output += `Safety Override Applied: ${report.summary.safetyOverride ? "Yes" : "No"}\n`;

  if (report.summary.observations.length) {
    output += `\nObservations:\n`;
    report.summary.observations.forEach((o) => { output += `- ${o}\n`; });
  }

  output += `\nLESSONS LEARNED\n---------------\n`;
  report.lessons.forEach((l, i) => {
    output += `${i + 1}. [${l.category}] ${l.finding}\n`;
    output += `   Impact: ${l.impact}\n`;
    output += `   Recommendation: ${l.recommendation}\n\n`;
  });

  output += `\nRECOMMENDATIONS\n---------------\n`;
  report.recommendations.forEach((r, i) => {
    output += `${i + 1}. ${r}\n`;
  });

  output += `\nMESSAGE PREPARED FOR RECIPIENT\n--------------------------------\n`;
  output += pkg.textMessage || pkg.smsMessage || "";

  return output;
}

function formatAsMarkdown(report, pkg) {
  let output = `# LIFELINE AI — After-Action Report

**Report ID:** ${report.reportId}
**Generated:** ${formatDate(report.generatedAt)} ${formatTimestamp(report.generatedAt)}

## Incident Details

| Field | Value |
|-------|-------|
| Incident ID | ${report.incidentId} |
| Type | ${report.type} |
| Urgency | ${report.urgency?.toUpperCase()} |
| Status | ${report.status} |
| Confidence | ${Math.round(report.summary.confidence * 100)}% |
| Safety Override | ${report.summary.safetyOverride ? "✅ Applied" : "No"} |

## Timeline

`;
  report.timeline.forEach((event) => {
    output += `- **${event.formattedTime}** — ${event.label}: ${event.details}\n`;
  });

  output += `
## Summary

- **Reported:** ${report.summary.reported}
- **Duration:** ${report.summary.duration}
- **Response Time:** ${report.summary.responseTime}
- **Location:** ${report.summary.location}

### Observations
`;
  report.summary.observations.forEach((o) => {
    output += `- ${o}\n`;
  });

  if (report.summary.missingInfo.length) {
    output += `\n### Missing Information\n`;
    report.summary.missingInfo.forEach((m) => {
      output += `- ${m}\n`;
    });
  }

  output += `
## Lessons Learned
`;
  report.lessons.forEach((l, i) => {
    output += `${i + 1}. **[${l.category}]** ${l.finding}\n`;
    output += `   - **Impact:** ${l.impact}\n`;
    output += `   - **Recommendation:** ${l.recommendation}\n\n`;
  });

  output += `
## Recommendations
`;
  report.recommendations.forEach((r, i) => {
    output += `${i + 1}. ${r}\n`;
  });

  output += `
## Message Prepared
\`\`\`
${pkg.textMessage || pkg.smsMessage || ""}
\`\`\`
`;

  return output;
}

export function generateCsvReport(incidents) {
  const headers = ["ID", "Type", "Urgency", "Status", "Reported", "Duration", "Location", "Observations", "Delivered"];
  const rows = incidents.map((inc) => [
    inc.id,
    inc.typeLabel || inc.type,
    inc.urgency,
    inc.status,
    inc.timestamp ? formatDate(inc.timestamp) : "",
    inc.resolvedAt && inc.timestamp ? formatElapsed(inc.resolvedAt - inc.timestamp) : "",
    inc.location ? (inc.location.latitude ? `${inc.location.latitude},${inc.location.longitude}` : inc.location.description) : "",
    inc.observations?.join("; ") || "",
    inc.lastEscalation?.delivered ? "Yes" : "No",
  ]);

  let csv = headers.join(",") + "\n";
  for (const row of rows) {
    csv += row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
  }
  return csv;
}

export function generateBatchReport(incidents, options = {}) {
  return {
    reportId: `BATCH-${createIncidentId()}`,
    generatedAt: Date.now(),
    totalIncidents: incidents.length,
    byType: incidents.reduce((acc, inc) => {
      const key = inc.type || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    byUrgency: incidents.reduce((acc, inc) => {
      const key = inc.urgency || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    byStatus: incidents.reduce((acc, inc) => {
      const key = inc.status || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    averageResponseTime: calculateAverageResponseTime(incidents),
    resolutionRate: calculateResolutionRate(incidents),
    incidents: incidents.map((inc) => generateAfterActionReport(inc, { ...options, format: "json" })),
  };
}

function calculateAverageResponseTime(incidents) {
  const withEscalation = incidents.filter(
    (i) => i.timestamp && i.lastEscalation?.at
  );
  if (!withEscalation.length) return null;
  const total = withEscalation.reduce(
    (sum, i) => sum + (i.lastEscalation.at - i.timestamp),
    0
  );
  return Math.round(total / withEscalation.length);
}

function calculateResolutionRate(incidents) {
  const resolved = incidents.filter((i) =>
    ["resolved", "verified"].includes(i.status)
  );
  return incidents.length ? Math.round((resolved.length / incidents.length) * 100) : 0;
}

export function downloadReport(content, filename, mimeType = "text/plain") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}