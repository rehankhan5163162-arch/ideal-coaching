/**
 * Ideal Coaching Center - Cloud Synchronization & Multi-Device Manager
 * Provides interactive status badges, sync diagnostic assistant, and 1-click cloud sync.
 * Official Organization: Ideal Coaching Center
 */

class CloudSyncManager {
  constructor() {
    this.projectId = 'ideal-coaching-center-cec5a';
    this.firebaseRulesUrl = `https://console.firebase.google.com/project/${this.projectId}/firestore/rules`;
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindUI());
    } else {
      this.bindUI();
    }
  }

  bindUI() {
    // Listen to Firebase status changes
    if (window.FirebaseService) {
      window.FirebaseService.onStatusChange((status, error) => {
        this.updateStatusBadge(status, error);
        this.updateWarningBanner(status, error);
      });
    }

    // Attach click listener for header cloud sync button
    const headerBtn = document.getElementById('btn-cloud-sync');
    if (headerBtn) {
      headerBtn.onclick = () => this.openAssistantModal();
    }

    // Attach click listener for warning banner button
    const bannerBtn = document.getElementById('btn-banner-fix-rules');
    if (bannerBtn) {
      bannerBtn.onclick = () => this.openAssistantModal();
    }
  }

  /**
   * Helper: Check if active user is an Admin or Super Admin
   */
  isAdminUser() {
    if (typeof document !== 'undefined' && document.body && document.body.classList.contains('role-student')) return false;
    if (typeof window !== 'undefined' && window.location && window.location.hash.startsWith('#student-')) return false;
    if (!window.AuthService) return false;
    if (typeof window.AuthService.isStudent === 'function' && window.AuthService.isStudent()) return false;
    const user = window.AuthService.getCurrentUser();
    return !!(user && (user.role === 'admin' || user.role === 'super_admin'));
  }

  /**
   * Update all cloud status buttons across portal (Admin dashboard only)
   */
  updateStatusBadge(status, error) {
    const isAdmin = this.isAdminUser();
    const btns = document.querySelectorAll('.header-cloud-btn');
    if (!btns || btns.length === 0) return;

    btns.forEach(btn => {
      // If user is a student or not an authenticated admin, strictly hide button
      if (!isAdmin) {
        btn.style.setProperty('display', 'none', 'important');
        btn.setAttribute('aria-hidden', 'true');
        return;
      }

      btn.style.setProperty('display', 'inline-flex', 'important');
      btn.removeAttribute('aria-hidden');
      btn.className = `header-cloud-btn status-${status}`;

      const textEl = btn.querySelector('.cloud-status-text');
      const dotEl = btn.querySelector('.cloud-status-dot');

      if (status === 'online') {
        if (textEl) textEl.textContent = 'Cloud Synced';
        btn.title = '🟢 Cloud Firestore is online. Changes sync instantly across all computers, mobiles, and tablets.';
        if (dotEl) dotEl.className = 'cloud-status-dot live-pulse';
      } else if (status === 'error') {
        if (textEl) textEl.textContent = 'Cloud Setup Required';
        btn.title = '⚠️ Firestore rules locked (Permission Denied). Click to copy rules and sync computer data to mobile.';
        if (dotEl) dotEl.className = 'cloud-status-dot error-pulse';
      } else {
        if (textEl) textEl.textContent = 'Connecting...';
        btn.title = 'Connecting to Firebase Cloud Firestore...';
        if (dotEl) dotEl.className = 'cloud-status-dot';
      }
    });
  }

  /**
   * Show/hide persistent warning alert banner (Admin dashboard only)
   */
  updateWarningBanner(status, error) {
    const banner = document.getElementById('cloud-warning-banner');
    if (!banner) return;

    const isAdmin = this.isAdminUser();
    if (!isAdmin) {
      banner.style.setProperty('display', 'none', 'important');
      return;
    }

    if (status === 'error') {
      banner.style.setProperty('display', 'flex', 'important');
    } else if (status === 'online') {
      banner.style.setProperty('display', 'none', 'important');
    }
  }

  /**
   * Open the Cloud Synchronization & Rules Assistant Modal (Admin only)
   */
  openAssistantModal() {
    if (!this.isAdminUser()) {
      return; // Security Guard: Students cannot open the cloud sync assistant
    }

    let modal = document.getElementById('modal-cloud-sync-assistant');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-cloud-sync-assistant';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-dialog modal-lg">
          <div class="modal-header" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff;">
            <div class="modal-title-group">
              <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(59, 130, 246, 0.2); display: flex; align-items: center; justify-content: center; color: #60a5fa;">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"></path>
                </svg>
              </div>
              <div>
                <h3 style="color: #ffffff; font-size: 1.15rem; font-weight: 700; margin: 0;">Multi-Device Cloud Synchronization</h3>
                <span style="font-size: 0.775rem; color: #94a3b8;">Ideal Coaching Center • Central Cloud Database</span>
              </div>
            </div>
            <button type="button" class="modal-close-btn" style="color: #ffffff; opacity: 0.8;" id="btn-close-sync-modal">&times;</button>
          </div>

          <div style="padding: 1.75rem; max-height: calc(85vh - 120px); overflow-y: auto;">
            <!-- Current Status Box -->
            <div id="sync-status-card" class="sync-status-box" style="margin-bottom: 1.5rem; padding: 1.25rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); background: var(--slate-50);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span id="sync-modal-badge" class="badge" style="font-size: 0.825rem; padding: 0.4rem 0.8rem;">Checking...</span>
                  <div>
                    <strong style="color: var(--slate-900); font-size: 0.925rem;">Firebase Project:</strong>
                    <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 0.85rem;">${this.projectId}</code>
                  </div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-test-connection-now">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  Test Connection
                </button>
              </div>

              <div id="sync-diagnostic-msg" style="margin-top: 0.75rem; font-size: 0.825rem; line-height: 1.5; color: var(--slate-600);">
                Diagnosing connection to Cloud Firestore...
              </div>
            </div>

            <!-- Fix Guide Section -->
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>⚡ How to Enable Cross-Device Sync (Computers & Mobiles)</span>
              </h4>
              <p style="font-size: 0.825rem; color: var(--slate-600); line-height: 1.5; margin-bottom: 1rem;">
                Firebase Firestore begins in locked mode. To allow computer additions (such as new students or fee payments) to show up immediately on mobile phones and other computers, update your Firestore Security Rules in the Firebase Console:
              </p>

              <!-- Step 1 -->
              <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
                  <strong style="font-size: 0.85rem; color: var(--primary-700);">Step 1: Copy Security Rules Code</strong>
                  <button type="button" class="btn btn-primary btn-sm" id="btn-copy-rules-code">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy Rules
                  </button>
                </div>
                <pre style="background: #0f172a; color: #38bdf8; padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.785rem; overflow-x: auto; margin: 0; font-family: var(--font-mono); line-height: 1.5;"><code id="rules-code-block">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isValidSize() { return request.resource.data.keys().size() &lt; 30; }
    match /settings/{doc} { allow read: if true; allow write, delete: if true; }
    match /system_settings/{doc} { allow read: if true; allow write, delete: if true; }
    match /students/{studentId} {
      allow read: if true;
      allow create, update: if isValidSize() &amp;&amp; request.resource.data.fullName is string &amp;&amp; request.resource.data.rollNumber is string;
      allow delete: if true;
    }
    match /fees/{feeId} {
      allow read: if true;
      allow create, update: if isValidSize() &amp;&amp; request.resource.data.studentId is string;
      allow delete: if true;
    }
    match /receipts/{receiptId} { allow read: if true; allow create, update: if isValidSize() &amp;&amp; request.resource.data.receiptNumber is string; allow delete: if true; }
    match /attendance/{attId} { allow read: if true; allow create, update: if isValidSize() &amp;&amp; request.resource.data.studentId is string; allow delete: if true; }
    match /diary/{id} { allow read: if true; allow create, update: if isValidSize() &amp;&amp; request.resource.data.subject is string; allow delete: if true; }
    match /announcements/{id} { allow read: if true; allow create, update: if isValidSize() &amp;&amp; request.resource.data.title is string; allow delete: if true; }
    match /books/{id} { allow read: if true; allow write, delete: if isValidSize(); }
    match /chapters/{id} { allow read: if true; allow write, delete: if isValidSize(); }
    match /audit_logs/{id} { allow read, create: if isValidSize(); }
    match /admins/{id} { allow read: if true; allow write, delete: if isValidSize(); }
    match /notifications/{id} { allow read: if true; allow create, update, delete: if isValidSize(); }
    match /whatsapp_settings/{doc} { allow read, write, delete: if true; }
    match /whatsapp_templates/{id} { allow read: if true; allow write, delete: if isValidSize(); }
    match /whatsapp_logs/{id} { allow read, create: if isValidSize(); allow update, delete: if isValidSize(); }
  }
}</code></pre>
              </div>

              <!-- Step 2 -->
              <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                  <div>
                    <strong style="font-size: 0.85rem; color: var(--primary-700);">Step 2: Paste in Firebase Console</strong>
                    <div style="font-size: 0.8rem; color: var(--slate-600); margin-top: 0.25rem;">
                      Open Firebase Console -> <strong>Firestore Database</strong> -> <strong>Rules</strong> tab -> Paste the rules and click <strong>Publish</strong>.
                    </div>
                  </div>
                  <a href="${this.firebaseRulesUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="background: #f8fafc; border: 1px solid #cbd5e1; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem;">
                    <span>Open Firebase Rules Tab</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>
              </div>

              <!-- Step 3 -->
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 1.15rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
                  <div>
                    <strong style="font-size: 0.875rem; color: #166534;">Step 3: Upload Computer Data to Cloud Now</strong>
                    <div style="font-size: 0.8rem; color: #15803d; margin-top: 0.25rem;">
                      Push all students, fee schedules, and records stored on this computer directly into Cloud Firestore so all mobiles and other computers can access them immediately.
                    </div>
                  </div>
                  <button type="button" class="btn btn-primary" id="btn-sync-local-to-cloud-now" style="background: #16a34a; border-color: #15803d; font-weight: 700;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Sync Computer Data to Cloud
                  </button>
                </div>
              </div>
            </div>

            <!-- Live Action Feedback Box -->
            <div id="sync-live-log" style="display: none; padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.825rem; font-family: var(--font-mono); line-height: 1.5;"></div>
          </div>

          <div style="padding: 1rem 1.75rem; border-top: 1px solid var(--border-color); background: var(--slate-50); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.775rem; color: var(--slate-500);">
              Session 2026-2027 • Ideal Coaching Center
            </span>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-close-sync-modal-footer">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Event handlers inside modal
      const close = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      };
      modal.querySelector('#btn-close-sync-modal').onclick = close;
      modal.querySelector('#btn-close-sync-modal-footer').onclick = close;

      // Copy Rules button
      modal.querySelector('#btn-copy-rules-code').onclick = async () => {
        const code = modal.querySelector('#rules-code-block').textContent;
        try {
          await navigator.clipboard.writeText(code);
          const copyBtn = modal.querySelector('#btn-copy-rules-code');
          copyBtn.innerHTML = `✓ Copied!`;
          copyBtn.classList.remove('btn-primary');
          copyBtn.classList.add('btn-success');
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg> Copy Rules`;
            copyBtn.classList.add('btn-primary');
            copyBtn.classList.remove('btn-success');
          }, 2500);
          window.UIUtils.showToast('success', 'Rules Copied', 'Firestore rules copied to clipboard! Paste them in the Firebase Console Rules editor.');
        } catch (e) {
          window.UIUtils.showToast('info', 'Copy Manually', 'Please select and copy the rules code displayed in the box.');
        }
      };

      // Test Connection button
      modal.querySelector('#btn-test-connection-now').onclick = async () => {
        await this.runDiagnosticTest();
      };

      // Sync Computer Data button
      modal.querySelector('#btn-sync-local-to-cloud-now').onclick = async () => {
        await this.runFullSync();
      };
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.refreshModalDiagnostic();
  }

  /**
   * Run real-time diagnostic test
   */
  async runDiagnosticTest() {
    const modal = document.getElementById('modal-cloud-sync-assistant');
    if (!modal) return;
    const logEl = modal.querySelector('#sync-live-log');
    const msgEl = modal.querySelector('#sync-diagnostic-msg');
    const badgeEl = modal.querySelector('#sync-modal-badge');

    if (logEl) {
      logEl.style.display = 'block';
      logEl.style.background = '#f1f5f9';
      logEl.style.color = '#334155';
      logEl.innerHTML = '⏳ Testing read and write permissions to Cloud Firestore...';
    }

    const res = await window.FirebaseService.testCloudConnection();

    if (res.success) {
      if (badgeEl) {
        badgeEl.textContent = '🟢 Connected & Live';
        badgeEl.className = 'badge badge-success';
      }
      if (msgEl) {
        msgEl.innerHTML = `<span style="color: #16a34a; font-weight: 600;">✓ Cloud Firestore is fully accessible! Multi-device synchronization is active.</span>`;
      }
      if (logEl) {
        logEl.style.background = '#f0fdf4';
        logEl.style.color = '#166534';
        logEl.innerHTML = `<strong>✅ Success:</strong> ${res.message}`;
      }
      window.UIUtils.showToast('success', 'Cloud Connected', 'Firebase Firestore is active! All devices can read and write.');
    } else {
      if (badgeEl) {
        badgeEl.textContent = '⚠️ Blocked (Rules Locked)';
        badgeEl.className = 'badge badge-danger';
      }
      if (msgEl) {
        msgEl.innerHTML = `<span style="color: #dc2626; font-weight: 600;">⚠️ Access Denied (${res.code || 'permission-denied'}). Rules in Firebase Console are currently blocking writes.</span>`;
      }
      if (logEl) {
        logEl.style.background = '#fef2f2';
        logEl.style.color = '#991b1b';
        logEl.innerHTML = `<strong>⚠️ Error:</strong> ${res.message}<br><small style="color: #7f1d1d;">Please follow Step 1 & 2 above to publish the rules in Firebase Console, then click Test Connection again.</small>`;
      }
    }
  }

  /**
   * Run full batch upload of local records to Cloud Firestore
   */
  async runFullSync() {
    const modal = document.getElementById('modal-cloud-sync-assistant');
    if (!modal) return;
    const logEl = modal.querySelector('#sync-live-log');
    const syncBtn = modal.querySelector('#btn-sync-local-to-cloud-now');

    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.innerHTML = '⏳ Syncing to Cloud...';
    }

    if (logEl) {
      logEl.style.display = 'block';
      logEl.style.background = '#f1f5f9';
      logEl.style.color = '#334155';
      logEl.innerHTML = '⏳ Uploading all local students, fee schedules, and portal data to Cloud Firestore...';
    }

    const res = await window.FirebaseService.syncAllLocalDataToCloud();

    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg> Sync Computer Data to Cloud`;
    }

    if (res.success) {
      if (logEl) {
        logEl.style.background = '#f0fdf4';
        logEl.style.color = '#166534';
        logEl.innerHTML = `<strong>✅ Sync Complete!</strong> ${res.message}`;
      }
      this.refreshModalDiagnostic();
      window.UIUtils.showToast('success', 'Multi-Device Sync Complete', `All student records and data have been uploaded to Cloud Firestore! Mobile devices will now display them.`);
    } else {
      if (logEl) {
        logEl.style.background = '#fef2f2';
        logEl.style.color = '#991b1b';
        logEl.innerHTML = `<strong>⚠️ Sync Failed:</strong> ${res.message}<br><small>Make sure you have published the rules in Firebase Console (Step 1 & 2).</small>`;
      }
      window.UIUtils.showToast('error', 'Cloud Sync Failed', res.message);
    }
  }

  /**
   * Refresh diagnostic elements inside the modal
   */
  refreshModalDiagnostic() {
    const modal = document.getElementById('modal-cloud-sync-assistant');
    if (!modal) return;
    const badgeEl = modal.querySelector('#sync-modal-badge');
    const msgEl = modal.querySelector('#sync-diagnostic-msg');
    const status = window.FirebaseService ? window.FirebaseService.cloudStatus : 'offline';

    if (status === 'online') {
      if (badgeEl) {
        badgeEl.textContent = '🟢 Connected & Live';
        badgeEl.className = 'badge badge-success';
      }
      if (msgEl) {
        msgEl.innerHTML = `<span style="color: #16a34a; font-weight: 600;">✓ Connected to Cloud Firestore. Changes on any device sync automatically in real-time.</span>`;
      }
    } else if (status === 'error') {
      if (badgeEl) {
        badgeEl.textContent = '⚠️ Blocked (Rules Locked)';
        badgeEl.className = 'badge badge-danger';
      }
      if (msgEl) {
        msgEl.innerHTML = `<span style="color: #dc2626; font-weight: 600;">⚠️ Firestore Security Rules in Firebase Console are currently blocking cloud sync. Follow Steps 1-3 below to enable multi-device sync.</span>`;
      }
    } else {
      if (badgeEl) {
        badgeEl.textContent = '⏳ Connecting...';
        badgeEl.className = 'badge badge-secondary';
      }
      if (msgEl) {
        msgEl.innerHTML = `Connecting to Firebase Firestore for project: <code>${this.projectId}</code>`;
      }
    }
  }
}

window.CloudSyncManager = new CloudSyncManager();
