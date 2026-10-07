// LIFELINE AI - Auth screen
import { getProviderMode, localAuth } from "../auth.js";
import { esc } from "../ui.js";

export function initAuthScreen() {
  const mode = getProviderMode();
  return `
    <div class="auth-screen" style="max-width:420px; margin:40px auto;">
      <div class="card text-center" style="padding:32px 20px;">
        <div style="font-size:48px; margin-bottom:12px;"></div>
        <h1 style="font-size:24px;">LIFELINE AI</h1>
        <p class="mu">Community incident intelligence</p>
        <p class="text-small text-muted">${mode === "firebase" ? "Firebase authentication" : "Local authentication"}</p>
      </div>

      <div class="card">
        <div class="tabs" style="display:flex; border-bottom:1px solid var(--border); margin-bottom:16px;">
          <button class="tab-btn active" data-tab="login" style="flex:1; padding:10px; background:none; border:none; color:inherit; border-bottom:2px solid var(--accent); font-weight:600;">
            Log in
          </button>
          <button class="tab-btn" data-tab="register" style="flex:1; padding:10px; background:none; border:none; color:inherit; border-bottom:2px solid transparent; font-weight:600;">
            Create account
          </button>
        </div>

        <form id="auth-form" data-form="login" novalidate>
          <div id="auth-register-fields" style="display:none;">
            <div class="formgroup">
              <label for="auth-name">Name</label>
              <input type="text" id="auth-name" name="name" class="form-input" autocomplete="name" />
            </div>
          </div>

          <div class="formgroup">
            <label for="auth-email">Email</label>
            <input type="email" id="auth-email" name="email" class="form-input" autocomplete="email" />
          </div>

          <div class="formgroup">
            <label for="auth-password">Password</label>
            <input type="password" id="auth-password" name="password" class="form-input" autocomplete="current-password" />
          </div>

          ${mode === "local" ? `
          <p class="note text-small" style="margin-top:8px;">
            Prototype mode: accounts are stored only in this browser.
          </p>` : ''}

          <p class="err" role="alert" style="margin:8px 0; color:var(--status-immediate);"></p>

          <div class="btn-row">
            <button type="submit" class="btn btn-primary" style="flex:1;">Continue</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function setupAuthHandlers() {
  const tabBtns = document.querySelectorAll("[data-tab]");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.style.borderBottom = "2px solid transparent";
      });
      btn.classList.add("active");
      btn.style.borderBottom = "2px solid var(--accent)";
      const form = document.getElementById("auth-form");
      form.dataset.form = tab;
      document.getElementById("auth-register-fields").style.display = tab === "register" ? "block" : "none";
      document.querySelector(".err").textContent = "";
    });
  });

  document.getElementById("auth-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    const isRegister = form.dataset.form === "register";
    const errEl = form.querySelector(".err");

    try {
      if (isRegister) {
        if (!data.name || !data.email || !data.password) {
          errEl.textContent = "Please complete all fields.";
          return;
        }
        if (data.password.length < 8) {
          errEl.textContent = "Password must be at least 8 characters.";
          return;
        }
        await localAuth(data.name, data.email, data.password);
      } else {
        await localAuth("", data.email, data.password);
      }
      window.location.href = "#/report";
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      errEl.textContent = error.message;
    }
  });
}
