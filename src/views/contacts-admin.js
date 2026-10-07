// LIFELINE AI - Contacts admin screen
import { getState, store } from "../store.js";
import { saveContacts, resetToDefaultContacts } from "../contacts.js";
import { esc, showToast } from "../ui.js";

export function initContactsAdmin() {
  const contacts = getState().contacts;
  return `
    <div class="contacts-admin">
      <div class="card">
        <div class="flex-between">
          <h2>Response contacts</h2>
          <button class="btn btn-secondary" data-action="navigate" data-to="settings" style="font-size:12px; padding:6px 12px;">
            ← Back
          </button>
        </div>
        <p class="mu">Configure response teams for each incident category.</p>
      </div>

      ${contacts.map(contact => `
        <div class="card">
          <div class="flex-between">
            <h3>${esc(contact.name)}</h3>
            <label style="display:flex; align-items:center; gap:6px;">
              <input type="checkbox" data-contact-toggle="${contact.id}" ${contact.enabled ? "checked" : ""} />
              Enabled
            </label>
          </div>

          <div class="formgroup">
            <label>Phone (for calls/SMS)</label>
            <input type="tel" data-contact-phone="${contact.id}" class="form-input" value="${esc(contact.phone)}" placeholder="tel:+1-555-0100" />
            <div class="text-small text-muted">Use tel:+ prefix for direct dial.</div>
          </div>

          <div class="formgroup">
            <label>Email</label>
            <input type="email" data-contact-email="${contact.id}" class="form-input" value="${esc(contact.email)}" placeholder="team@example.com" />
          </div>

          <div class="formgroup">
            <label>Webhook URL</label>
            <input type="url" data-contact-webhook="${contact.id}" class="form-input" value="${esc(contact.webhook || "")}" placeholder="https://your-org.com/api/incidents" />
            <div class="text-small text-muted">Incidents will be POSTed to this URL.</div>
          </div>

          <div class="formgroup">
            <label>Available channels</label>
            <div style="display:flex; gap:16px; margin-top:6px;">
              <label style="display:flex; align-items:center; gap:6px;">
                <input type="checkbox" data-contact-call="${contact.id}" ${contact.call ? "checked" : ""} />
                Call
              </label>
              <label style="display:flex; align-items:center; gap:6px;">
                <input type="checkbox" data-contact-sms="${contact.id}" ${contact.sms ? "checked" : ""} />
                SMS
              </label>
              <label style="display:flex; align-items:center; gap:6px;">
                <input type="checkbox" data-contact-email-toggle="${contact.id}" ${contact.email ? "checked" : ""} />
                Email
              </label>
              <label style="display:flex; align-items:center; gap:6px;">
                <input type="checkbox" data-contact-webhook-toggle="${contact.id}" ${contact.webhook ? "checked" : ""} />
                Webhook
              </label>
            </div>
          </div>

          <div class="formgroup">
            <label>Coverage area</label>
            <input type="text" data-contact-coverage="${contact.id}" class="form-input" value="${esc(contact.coverage)}" placeholder="All zones" />
          </div>

          <div class="formgroup">
            <label>Priority</label>
            <input type="number" data-contact-priority="${contact.id}" class="form-input" value="${contact.priority}" min="1" max="100" />
          </div>
        </div>
      `).join('')}

      <div class="card">
        <div class="btn-row">
          <button class="btn btn-secondary" id="reset-contacts">Reset to defaults</button>
          <button class="btn btn-primary" id="save-contacts">Save all contacts</button>
        </div>
      </div>
    </div>
  `;
}

export function setupContactsHandlers() {
  document.getElementById("save-contacts")?.addEventListener("click", () => {
    const contacts = getState().contacts;
    contacts.forEach(contact => {
      contact.phone = document.querySelector(`[data-contact-phone="${contact.id}"]`)?.value || "";
      contact.email = document.querySelector(`[data-contact-email="${contact.id}"]`)?.value || "";
      contact.webhook = document.querySelector(`[data-contact-webhook="${contact.id}"]`)?.value || "";
      contact.coverage = document.querySelector(`[data-contact-coverage="${contact.id}"]`)?.value || "";
      contact.priority = parseInt(document.querySelector(`[data-contact-priority="${contact.id}"]`)?.value || "99");
      contact.call = document.querySelector(`[data-contact-call="${contact.id}"]`)?.checked || false;
      contact.sms = document.querySelector(`[data-contact-sms="${contact.id}"]`)?.checked || false;
      contact.email = document.querySelector(`[data-contact-email-toggle="${contact.id}"]`)?.checked && contact.email
        ? contact.email : "";
      contact.webhook = document.querySelector(`[data-contact-webhook-toggle="${contact.id}"]`)?.checked && contact.webhook
        ? contact.webhook : "";
    });
    saveContacts(contacts);
    showToast("Contacts saved.");
  });

  document.getElementById("reset-contacts")?.addEventListener("click", () => {
    if (confirm("Reset to default contacts?")) {
      resetToDefaultContacts();
      showToast("Contacts reset to defaults.");
      setTimeout(() => location.reload(), 500);
    }
  });

  document.querySelectorAll("[data-contact-toggle]").forEach(el => {
    el.addEventListener("change", () => {
      const id = el.dataset.contactToggle;
      const contacts = getState().contacts;
      const contact = contacts.find(c => c.id === id);
      if (contact) {
        contact.enabled = el.checked;
        saveContacts(contacts);
      }
    });
  });
}
