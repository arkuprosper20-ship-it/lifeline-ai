// LIFELINE AI - SLA tracking and escalation timers
// Tracks response times per urgency level and provides alerts

const SLA_THRESHOLDS = {
  immediate: { warning: 1 * 60 * 1000, escalation: 2 * 60 * 1000, max: 5 * 60 * 1000 },
  urgent: { warning: 5 * 60 * 1000, escalation: 10 * 60 * 1000, max: 30 * 60 * 1000 },
  verify: { warning: 30 * 60 * 1000, escalation: 1 * 60 * 60 * 1000, max: 4 * 60 * 60 * 1000 },
  monitor: { warning: 2 * 60 * 60 * 1000, escalation: 6 * 60 * 60 * 1000, max: 12 * 60 * 60 * 1000 },
  information: { warning: 8 * 60 * 60 * 1000, escalation: 24 * 60 * 60 * 1000, max: 48 * 60 * 60 * 1000 },
};

export function checkSLA(incident) {
  if (!incident || !incident.timestamp || !incident.urgency) return null;
  const threshold = SLA_THRESHOLDS[incident.urgency] || SLA_THRESHOLDS.monitor;
  const elapsed = Date.now() - incident.timestamp;

  let status = "ok";
  let level = "normal";

  if (elapsed >= threshold.max) {
    status = "breached";
    level = "critical";
  } else if (elapsed >= threshold.escalation) {
    status = "escalated";
    level = "warning";
  } else if (elapsed >= threshold.warning) {
    status = "warning";
    level = "caution";
  }

  return {
    incidentId: incident.id,
    urgency: incident.urgency,
    status,
    level,
    elapsed: elapsed,
    timeRemaining: Math.max(0, threshold.max - elapsed),
    warningThreshold: threshold.warning,
    escalationThreshold: threshold.escalation,
    maxThreshold: threshold.max,
    formattedElapsed: formatElapsed(elapsed),
    formattedRemaining: formatRemaining(threshold.max - elapsed),
  };
}

export function formatElapsed(ms) {
  if (ms < 60 * 1000) {
    return `${Math.floor(ms / 1000)}s`;
  }
  if (ms < 60 * 60 * 1000) {
    const m = Math.floor(ms / (60 * 1000));
    return `${m}m ${Math.floor((ms % (60 * 1000)) / 1000)}s`;
  }
  const h = Math.floor(ms / (60 * 60 * 1000));
  return `${h}h ${Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))}m`;
}

export function formatRemaining(ms) {
  if (ms <= 0) return "0s";
  if (ms < 60 * 1000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 60 * 60 * 1000) {
    const m = Math.floor(ms / (60 * 1000));
    return `${m}m ${Math.floor((ms % (60 * 1000)) / 1000)}s`;
  }
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${h}h ${m}m`;
}

export function getSLAThresholds() {
  return SLA_THRESHOLDS;
}

export function setSLAThresholds(thresholds) {
  Object.assign(SLA_THRESHOLDS, thresholds);
}

export function checkAllIncidentsSLA(incidents) {
  return incidents
    .filter((i) => i.timestamp && i.urgency && (i.status === "reported" || i.status === "active" || i.status === "verify"))
    .map((i) => checkSLA(i))
    .filter(Boolean)
    .sort((a, b) => b.elapsed - a.elapsed);
}

export function getSLAStats(incidents) {
  const all = checkAllIncidentsSLA(incidents);
  return {
    total: all.length,
    ok: all.filter((s) => s.status === "ok").length,
    warning: all.filter((s) => s.status === "warning" || s.status === "escalated").length,
    breached: all.filter((s) => s.status === "breached").length,
    byUrgency: {
      immediate: all.filter((s) => s.urgency === "immediate").length,
      urgent: all.filter((s) => s.urgency === "urgent").length,
      verify: all.filter((s) => s.urgency === "verify").length,
      monitor: all.filter((s) => s.urgency === "monitor").length,
      information: all.filter((s) => s.urgency === "information").length,
    },
  };
}

export function createSLATimer(incident, callbacks = {}) {
  let timer = null;
  let active = true;

  function check() {
    if (!active) return;
    const sla = checkSLA(incident);
    if (!sla) return;

    if (sla.status === "warning" && callbacks.onWarning) {
      callbacks.onWarning(sla);
    }
    if (sla.status === "escalated" && callbacks.onEscalation) {
      callbacks.onEscalation(sla);
    }
    if (sla.status === "breached" && callbacks.onBreach) {
      callbacks.onBreach(sla);
      active = false;
      clearInterval(timer);
      return;
    }

    if (callbacks.onUpdate) {
      callbacks.onUpdate(sla);
    }
  }

  check();
  timer = setInterval(check, 30000);

  return {
    stop: () => {
      active = false;
      if (timer) clearInterval(timer);
    },
    check: () => {
      check();
      return checkSLA(incident);
    },
  };
}

export function getEscalationRecommendations(incident, currentTime = Date.now()) {
  if (!incident || !incident.timestamp || !incident.urgency) return [];
  const sla = checkSLA(incident);
  if (!sla || sla.status === "breached") {
    return [{
      action: "notify_coordinator",
      reason: "Time limit exceeded without update",
      priority: "high",
    }];
  }
  if (sla.status === "escalated") {
    return [{
      action: "notify_supervisor",
      reason: `Escalation threshold (${sla.formattedElapsed}) exceeded`,
      priority: "medium",
    }];
  }
  if (sla.status === "warning") {
    return [{
      action: "remind_responder",
      reason: `Approaching ${sla.urgency} SLA (${sla.formattedElapsed} elapsed)`,
      priority: "low",
    }];
  }
  return [];
}

export function getSLAColor(incident) {
  const sla = checkSLA(incident);
  if (!sla) return "badge-gray";
  switch (sla.level) {
    case "critical": return "badge-immediate";
    case "warning": return "badge-urgent";
    case "caution": return "badge-verify";
    default: return "badge-ready";
  }
}

export function getSLAProgress(incident) {
  const sla = checkSLA(incident);
  if (!sla) return { percent: 0, color: "var(--status-monitor)" };
  const elapsed = sla.elapsed;
  const max = sla.maxThreshold;
  const percent = Math.min(100, (elapsed / max) * 100);
  let color = "var(--status-ready)";
  if (percent > 50) color = "var(--status-monitor)";
  if (percent > 75) color = "var(--status-urgent)";
  if (percent > 90) color = "var(--status-immediate)";
  return { percent, color };
}

export function generateSlaReport(incidents) {
  const all = checkAllIncidentsSLA(incidents);
  const stats = getSLAStats(incidents);
  return {
    generatedAt: Date.now(),
    stats,
    incidents: all.map((s) => ({
      id: s.incidentId,
      urgency: s.urgency,
      status: s.status,
      elapsed: s.formattedElapsed,
      timeRemaining: s.formattedRemaining,
      level: s.level,
    })),
    recommendations: all.reduce((acc, s) => {
      const recs = getEscalationRecommendations(
        incidents.find((i) => i.id === s.incidentId)
      );
      return acc.concat(recs);
    }, []),
  };
}