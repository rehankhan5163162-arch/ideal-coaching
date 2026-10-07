/**
 * Ideal Coaching Center - WhatsApp Communication & Notification Settings View
 * Complete Administration Hub: Overview, Configuration, Automations, Templates,
 * Manual Direct Messaging, Bulk Broadcasting, Logs History, and Integration Guide.
 */

const WhatsAppView = {
  currentTab: 'overview',
  activeStudent: null,
  activeTemplateId: 'student_absent',
  logFilters: {
    status: 'all',
    type: 'all',
    date: '',
    search: ''
  },

  /**
   * Main Render Entrypoint
   */
  async render(container, initialTab = 'overview') {
    this.currentTab = initialTab;
    const settings = await window.WhatsAppService.getSettings();
    const stats = await window.WhatsAppService.getStatistics();

    container.innerHTML = `
      <div class="data-card" style="min-width: 0; overflow: hidden;">
        <!-- Module Header -->
        <div class="data-card-header" style="padding: clamp(1rem, 2vw, 1.25rem); min-width: 0;">
          <div class="wa-header-wrapper">
            <div class="wa-header-title-block">
              <div class="wa-header-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8 2.53 1.09 2.53.73 2.98.68.46-.04 1.47-.6 1.68-1.18.21-.59.21-1.09.15-1.18-.06-.1-.23-.17-.48-.29z"/>
                </svg>
              </div>
              <div class="wa-header-text">
                <h2 class="wa-header-title">WhatsApp Communication & Notifications</h2>
                <span class="wa-header-subtitle">Automated event triggers, parent messaging, templates & log history • Ideal Coaching Center</span>
              </div>
            </div>

            <!-- Master Status Indicator & Top Switches -->
            <div class="wa-header-status-group">
              <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.85rem; background: var(--slate-100); border-radius: var(--radius-full); border: 1px solid var(--border-color); font-size: 0.8rem; min-width: 0;">
                <span style="width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: ${settings.enabled ? (settings.endpointUrl ? '#10b981' : '#f59e0b') : '#94a3b8'}; box-shadow: 0 0 6px ${settings.enabled ? (settings.endpointUrl ? '#10b981' : '#f59e0b') : 'transparent'};"></span>
                <span style="font-weight: 700; color: var(--slate-800); white-space: nowrap;">
                  ${!settings.enabled ? 'Module Disabled' : (settings.endpointUrl ? 'Live Provider Connected' : 'Configured (Queued Mode)')}
                </span>
              </div>

              <button type="button" class="btn btn-secondary btn-sm" id="btn-quick-test-conn" title="Test serverless API connection" style="white-space: nowrap;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Ping Endpoint
              </button>
            </div>
          </div>
        </div>

        <div style="padding: clamp(0.85rem, 2vw, 1.5rem); min-width: 0;">
          <!-- Navigation Tabs Bar -->
          <div class="wa-nav-tabs">
            <button type="button" class="wa-tab-btn profile-tab-btn ${this.currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
              Overview & Dashboard
            </button>
            <button type="button" class="wa-tab-btn profile-tab-btn ${this.currentTab === 'configuration' ? 'active' : ''}" data-tab="configuration">
              WhatsApp Configuration
            </button>
            <button type="button" class="wa-tab-btn profile-tab-btn ${this.currentTab === 'automations' ? 'active' : ''}" data-tab="automations">
              Notification Automations
            </button>
            <button type="button" class="wa-tab-btn profile-tab-btn ${this.currentTab === 'templates' ? 'active' : ''}" data-tab="templates">
              Message Templates
            </button>
            <button type="button" class="wa-tab-btn profile-tab-btn ${this.currentTab === 'manual' ? 'active' : ''}" data-tab="manual">
              Manual Message
            </button>
            <button type="button" class="wa-tab-btn profile-tab-btn ${this.currentTab === 'bulk' ? 'active' : ''}" data-tab="bulk">
              Bulk Broadcast
            </button>
            <button type="button" class="wa-tab-btn profile-tab-btn ${this.currentTab === 'logs' ? 'active' : ''}" data-tab="logs">
              Notification History / Logs
            </button>
            <button type="button" class="wa-tab-btn profile-tab-btn ${this.currentTab === 'guide' ? 'active' : ''}" data-tab="guide">
              Integration Guide
            </button>
          </div>

          <!-- Active Tab Viewport -->
          <div id="wa-tab-content-viewport">
            <!-- Dynamic Content Injected Here -->
          </div>
        </div>
      </div>
    `;

    // Bind tab clicks
    container.querySelectorAll('.wa-tab-btn').forEach(btn => {
      btn.onclick = () => {
        const tab = btn.getAttribute('data-tab');
        this.currentTab = tab;
        container.querySelectorAll('.wa-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderTabContent(container);
      };
    });

    // Bind Quick Test Connection
    const quickTestBtn = container.querySelector('#btn-quick-test-conn');
    if (quickTestBtn) {
      quickTestBtn.onclick = async () => {
        await window.GlobalLoader.wrap(async () => {
          const res = await window.WhatsAppService.testConnection();
          if (res.success) {
            window.UIUtils.showToast('success', 'Endpoint Connected', res.message);
          } else {
            window.UIUtils.showToast('warning', 'Endpoint Notice', res.message);
          }
        }, 'Testing WhatsApp API endpoint connection...', 'Ideal Coaching Center');
        this.renderTabContent(container);
      };
    }

    // Render active tab content
    await this.renderTabContent(container);
  },

  /**
   * Router for inner tabs
   */
  async renderTabContent(container) {
    const viewport = container.querySelector('#wa-tab-content-viewport');
    if (!viewport) return;

    switch (this.currentTab) {
      case 'overview':
        await this.renderOverviewTab(viewport, container);
        break;
      case 'configuration':
        await this.renderConfigurationTab(viewport, container);
        break;
      case 'automations':
        await this.renderAutomationsTab(viewport, container);
        break;
      case 'templates':
        await this.renderTemplatesTab(viewport, container);
        break;
      case 'manual':
        await this.renderManualMessageTab(viewport, container);
        break;
      case 'bulk':
        await this.renderBulkMessageTab(viewport, container);
        break;
      case 'logs':
        await this.renderLogsTab(viewport, container);
        break;
      case 'guide':
        this.renderGuideTab(viewport);
        break;
      default:
        await this.renderOverviewTab(viewport, container);
        break;
    }
  },

  // =========================================================================
  // 1. OVERVIEW & METRICS DASHBOARD TAB
  // =========================================================================
  async renderOverviewTab(viewport, rootContainer) {
    const settings = await window.WhatsAppService.getSettings();
    const stats = await window.WhatsAppService.getStatistics();

    viewport.innerHTML = `
      <!-- Integration Status Banner -->
      <div class="wa-gateway-banner">
        <div class="wa-gateway-info">
          <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.4rem; flex-wrap: wrap;">
            <span class="badge" style="background: rgba(255,255,255,0.2); color: #ffffff; font-weight: 700; white-space: nowrap;">
              ${settings.apiProvider === 'meta_cloud' ? 'Meta WhatsApp Cloud API' : settings.apiProvider.toUpperCase()}
            </span>
            <span class="badge" style="background: ${settings.enabled ? '#10b981' : '#ef4444'}; color: #ffffff; font-weight: 700; white-space: nowrap;">
              ${settings.enabled ? 'ACTIVE & ENABLED' : 'PAUSED'}
            </span>
          </div>
          <h3 style="font-size: clamp(1.15rem, 2vw, 1.35rem); font-weight: 800; color: #ffffff; margin-bottom: 0.35rem; line-height: 1.3; word-break: break-word;">
            Ideal Coaching Center WhatsApp Gateway
          </h3>
          <p style="font-size: 0.85rem; color: #a7f3d0; max-width: 680px; line-height: 1.45; margin: 0;">
            Registered WhatsApp Number: <strong>${settings.schoolNumber}</strong> • Sender: <strong>${settings.businessAccountName}</strong>
            <br>
            ${settings.endpointUrl ? '✓ Connected to custom serverless gateway. Automated parent messages dispatch live.' : '⚙ Serverless endpoint not configured yet. Messages are safely queued and recorded in LMS logs.'}
          </p>
        </div>

        <div class="wa-gateway-actions">
          <button type="button" class="btn btn-secondary btn-sm" id="btn-ov-goto-config" style="background: rgba(255,255,255,0.15); color: #ffffff; border-color: rgba(255,255,255,0.3); white-space: nowrap;">
            Configure API
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-ov-manual-msg" style="background: #25d366; border-color: #25d366; color: #ffffff; white-space: nowrap;">
            + Direct Message
          </button>
        </div>
      </div>

      <!-- Master Switches Controls Card -->
      <div class="wa-master-switches-card">
        <div class="wa-switch-box">
          <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer;">
            <input type="checkbox" id="sw-master-automation" ${settings.automationMasterSwitch ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--primary-600); margin-top: 0.15rem; flex-shrink: 0;" />
            <div>
              <strong style="color: var(--slate-900); font-size: 0.925rem;">Automation Master Switch</strong>
              <p style="font-size: 0.775rem; color: var(--slate-600); margin-top: 0.2rem; line-height: 1.4;">
                Toggle to instantly pause/resume all automated event notifications (absences, fees, reminders) without clearing configurations or templates.
              </p>
            </div>
          </label>
        </div>

        <div class="wa-switch-box-divider">
          <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer;">
            <input type="checkbox" id="sw-allow-marketing" ${settings.allowMarketing ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--primary-600); margin-top: 0.15rem; flex-shrink: 0;" />
            <div>
              <strong style="color: var(--slate-900); font-size: 0.925rem;">Marketing / Promotional Messages</strong>
              <p style="font-size: 0.775rem; color: var(--slate-600); margin-top: 0.2rem; line-height: 1.4;">
                Disabled by default. Keeps essential transactional school notices (attendance & fees) completely isolated from marketing broadcasts.
              </p>
            </div>
          </label>
        </div>
      </div>

      <!-- Statistics Metrics Grid: Standard 4-Card System matching Admin Dashboard -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13"></path>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Dispatched</span>
            <span class="stat-value">${stats.total}</span>
            <span class="stat-subtext">All-Time Message Volume</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Delivered Successfully</span>
            <span class="stat-value" style="color: var(--success-600);">${stats.sent + stats.delivered}</span>
            <span class="stat-subtext">Live Provider Accepted</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Queued / In Transit</span>
            <span class="stat-value" style="color: var(--warning-600);">${stats.pending}</span>
            <span class="stat-subtext">Logged & Scheduled</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Today's Volume</span>
            <span class="stat-value">${stats.today}</span>
            <span class="stat-subtext">Active Today • ${stats.failed} Failed</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Shortcuts -->
      <div class="wa-card-box">
        <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 1rem; color: var(--slate-900);">Quick Workflow Shortcuts</h4>
        <div class="wa-shortcuts-grid">
          <button type="button" class="wa-shortcut-btn" id="btn-quick-manual">
            <strong>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Direct Student Message
            </strong>
            <span>Send personalized notice to parent of a specific student</span>
          </button>
          <button type="button" class="wa-shortcut-btn" id="btn-quick-bulk">
            <strong>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Broadcast Class Notice
            </strong>
            <span>Broadcast to 9th, 10th, 11th, or 12th class batches</span>
          </button>
          <button type="button" class="wa-shortcut-btn" id="btn-quick-templates">
            <strong>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Edit Message Templates
            </strong>
            <span>Customize fee reminders, absence alerts, and results</span>
          </button>
          <button type="button" class="wa-shortcut-btn" id="btn-quick-logs">
            <strong>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Review WhatsApp Logs
            </strong>
            <span>Inspect delivery reports, timestamps, and retry failed</span>
          </button>
        </div>
      </div>
    `;

    // Bind Overview listeners
    const swAuto = viewport.querySelector('#sw-master-automation');
    if (swAuto) {
      swAuto.onchange = async () => {
        await window.WhatsAppService.saveSettings({ automationMasterSwitch: swAuto.checked });
        window.UIUtils.showToast('info', 'Automation Switch', `Automated WhatsApp notifications ${swAuto.checked ? 'ENABLED' : 'PAUSED'}.`);
      };
    }

    const swMkt = viewport.querySelector('#sw-allow-marketing');
    if (swMkt) {
      swMkt.onchange = async () => {
        await window.WhatsAppService.saveSettings({ allowMarketing: swMkt.checked });
        window.UIUtils.showToast('info', 'Marketing Policy', `Promotional messaging ${swMkt.checked ? 'ENABLED' : 'DISABLED'}.`);
      };
    }

    viewport.querySelector('#btn-ov-goto-config').onclick = () => {
      this.switchTab(rootContainer, 'configuration');
    };
    viewport.querySelector('#btn-ov-manual-msg').onclick = () => {
      this.switchTab(rootContainer, 'manual');
    };
    viewport.querySelector('#btn-quick-manual').onclick = () => {
      this.switchTab(rootContainer, 'manual');
    };
    viewport.querySelector('#btn-quick-bulk').onclick = () => {
      this.switchTab(rootContainer, 'bulk');
    };
    viewport.querySelector('#btn-quick-templates').onclick = () => {
      this.switchTab(rootContainer, 'templates');
    };
    viewport.querySelector('#btn-quick-logs').onclick = () => {
      this.switchTab(rootContainer, 'logs');
    };
  },

  // =========================================================================
  // 2. CONFIGURATION TAB
  // =========================================================================
  async renderConfigurationTab(viewport, rootContainer) {
    const settings = await window.WhatsAppService.getSettings();

    viewport.innerHTML = `
      <div class="wa-card-box">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid var(--slate-200); padding-bottom: 1rem;">
          <div style="min-width: 0; flex: 1 1 280px;">
            <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--slate-900); margin: 0; word-break: break-word;">Official WhatsApp Business Configuration</h3>
            <p style="font-size: 0.8rem; color: var(--slate-500); margin: 0.2rem 0 0 0; word-break: break-word;">Provider parameters, phone numbers, and secure integration endpoint</p>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-config-test-modal" style="white-space: nowrap;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Send Test WhatsApp Message
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-save-wa-config" style="white-space: nowrap;">
              Save Configuration
            </button>
          </div>
        </div>

        <form id="wa-config-form" class="form-grid" style="width: 100%; min-width: 0;">
          <div class="form-group" style="min-width: 0;">
            <label class="form-label">School WhatsApp Business Number <span class="req-star">*</span></label>
            <input type="text" id="wa-input-school-number" class="form-control" value="${settings.schoolNumber || '03001234567'}" placeholder="0300-1234567" required />
            <span class="form-help" style="word-break: break-word;">Official registered coaching center number displayed to parents.</span>
          </div>

          <div class="form-group" style="min-width: 0;">
            <label class="form-label">Default Country Code <span class="req-star">*</span></label>
            <input type="text" id="wa-input-country-code" class="form-control" value="${settings.countryCode || '+92'}" placeholder="+92" required />
            <span class="form-help" style="word-break: break-word;">Default country code for local mobile numbers (e.g. +92 for Pakistan).</span>
          </div>

          <div class="form-group" style="min-width: 0;">
            <label class="form-label">Sender Display Name / Business Name</label>
            <input type="text" id="wa-input-account-name" class="form-control" value="${settings.businessAccountName || 'Ideal Coaching Center Official'}" />
            <span class="form-help" style="word-break: break-word;">Name verified on Meta Business Manager profile.</span>
          </div>

          <div class="form-group" style="min-width: 0;">
            <label class="form-label">API Provider Architecture <span class="req-star">*</span></label>
            <select id="wa-input-provider" class="form-control">
              <option value="meta_cloud" ${settings.apiProvider === 'meta_cloud' ? 'selected' : ''}>Meta WhatsApp Business Cloud API (Official)</option>
              <option value="twilio" ${settings.apiProvider === 'twilio' ? 'selected' : ''}>Twilio for WhatsApp</option>
              <option value="infobip" ${settings.apiProvider === 'infobip' ? 'selected' : ''}>Infobip WhatsApp Gateway</option>
              <option value="custom_webhook" ${settings.apiProvider === 'custom_webhook' ? 'selected' : ''}>Custom Webhook / Serverless Microservice</option>
            </select>
            <span class="form-help" style="word-break: break-word;">Provider-independent modular architecture.</span>
          </div>

          <div class="form-group form-col-full" style="min-width: 0;">
            <label class="form-label">Secure Serverless Endpoint URL (Proxy Relay)</label>
            <input type="url" id="wa-input-endpoint-url" class="form-control" value="${settings.endpointUrl || ''}" placeholder="https://api.idealcoaching.edu.pk/whatsapp/send (or Cloudflare/Firebase serverless URL)" />
            <span class="form-help" style="word-break: break-word;">
              <strong>Frontend Security Principle:</strong> Browser JavaScript must never expose Meta private access tokens or permanent credentials. Configure a lightweight serverless function URL (Firebase Functions, Cloudflare Worker, or AWS Lambda) that safely attaches your private secret server-side.
            </span>
          </div>

          <div class="form-group" style="min-width: 0;">
            <label class="form-label">Access Token / API Credential</label>
            <input type="password" id="wa-input-access-token" class="form-control" value="${settings.accessTokenPlaceholder || ''}" placeholder="••••••••••••••••" />
            <span class="form-help" style="word-break: break-word;">Masked security field. Never exposed in public client bundles or GitHub.</span>
          </div>

          <div class="form-group" style="min-width: 0;">
            <label class="form-label">WhatsApp Business Account ID (WABA ID)</label>
            <input type="text" id="wa-input-business-id" class="form-control" value="${settings.businessAccountId || ''}" placeholder="e.g. 104829104829104" />
            <span class="form-help" style="word-break: break-word;">Meta Cloud API Business Account Identifier.</span>
          </div>

          <div class="form-group" style="min-width: 0;">
            <label class="form-label">Phone Number ID</label>
            <input type="text" id="wa-input-phone-id" class="form-control" value="${settings.phoneNumberId || ''}" placeholder="e.g. 102948201948201" />
            <span class="form-help" style="word-break: break-word;">Meta Cloud API Phone Number Node ID.</span>
          </div>

          <div class="form-group" style="min-width: 0;">
            <label class="form-label">Anti-Spam Duplicate Cooldown (Minutes)</label>
            <input type="number" id="wa-input-cooldown" class="form-control" value="${settings.duplicateCooldownMinutes || 60}" min="5" max="1440" />
            <span class="form-help" style="word-break: break-word;">Blocks repeating the same automated message to a student within this time.</span>
          </div>

          <div class="form-group form-col-full" style="min-width: 0;">
            <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; padding: 1rem; background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-sizing: border-box; min-width: 0;">
              <input type="checkbox" id="wa-input-master-enabled" ${settings.enabled ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #25d366; margin-top: 0.15rem; flex-shrink: 0;" />
              <div style="min-width: 0;">
                <strong style="color: var(--slate-900);">Enable WhatsApp Notifications Module</strong>
                <p style="font-size: 0.775rem; color: var(--slate-500); margin-top: 0.2rem; word-break: break-word;">
                  Master toggle for all coaching center WhatsApp features. When unchecked, all automated triggers and dispatches are halted.
                </p>
              </div>
            </label>
          </div>
        </form>
      </div>
    `;

    // Save Configuration Handler
    viewport.querySelector('#btn-save-wa-config').onclick = async () => {
      const schoolNumber = viewport.querySelector('#wa-input-school-number').value.trim();
      const countryCode = viewport.querySelector('#wa-input-country-code').value.trim();
      const accountName = viewport.querySelector('#wa-input-account-name').value.trim();
      const provider = viewport.querySelector('#wa-input-provider').value;
      const endpointUrl = viewport.querySelector('#wa-input-endpoint-url').value.trim();
      const businessId = viewport.querySelector('#wa-input-business-id').value.trim();
      const phoneId = viewport.querySelector('#wa-input-phone-id').value.trim();
      const cooldown = Number(viewport.querySelector('#wa-input-cooldown').value) || 60;
      const enabled = viewport.querySelector('#wa-input-master-enabled').checked;

      await window.GlobalLoader.wrap(async () => {
        await window.WhatsAppService.saveSettings({
          schoolNumber,
          countryCode,
          businessAccountName: accountName,
          apiProvider: provider,
          endpointUrl,
          businessAccountId: businessId,
          phoneNumberId: phoneId,
          duplicateCooldownMinutes: cooldown,
          enabled
        });
      }, 'Writing WhatsApp parameters to Firebase...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Configuration Saved', 'WhatsApp Business configuration updated successfully.');
    };

    // Open Test Message Modal
    viewport.querySelector('#btn-config-test-modal').onclick = () => {
      this.openTestMessageModal();
    };
  },

  /**
   * Test Message Dialog
   */
  openTestMessageModal() {
    let modal = document.getElementById('wa-test-message-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'wa-test-message-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <div class="modal-title-icon" style="color: #25d366;">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13"></path>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </div>
            <div>
              <h3 class="modal-title">Send Test WhatsApp Message</h3>
              <p style="font-size: 0.75rem; color: var(--slate-500);">Validate gateway formatting & recipient delivery</p>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="btn-close-test-modal">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Recipient Mobile Number <span class="req-star">*</span></label>
            <input type="text" id="wa-test-recipient-number" class="form-control" placeholder="03001234567 or +923001234567" value="03001234567" required />
            <span class="form-help">Enter a personal WhatsApp number to verify real message receipt.</span>
          </div>

          <div class="form-group form-col-full">
            <label class="form-label">Test Message Text</label>
            <textarea id="wa-test-message-body" class="form-control" rows="4">Test notification from Ideal Coaching Center. Your WhatsApp communication gateway is configured and operating correctly.</textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-cancel-test-modal">Cancel</button>
          <button type="button" class="btn btn-success" id="btn-dispatch-test-message">
            Send Test Message
          </button>
        </div>
      </div>
    `;

    window.UIUtils.openModal('wa-test-message-modal');

    modal.querySelector('#btn-close-test-modal').onclick = () => window.UIUtils.closeModal('wa-test-message-modal');
    modal.querySelector('#btn-cancel-test-modal').onclick = () => window.UIUtils.closeModal('wa-test-message-modal');

    modal.querySelector('#btn-dispatch-test-message').onclick = async () => {
      const phoneInput = modal.querySelector('#wa-test-recipient-number');
      const bodyInput = modal.querySelector('#wa-test-message-body');
      const phone = phoneInput.value.trim();
      const body = bodyInput.value.trim();

      if (!phone || !body) {
        window.UIUtils.showToast('error', 'Fields Missing', 'Please enter both phone number and message text.');
        return;
      }

      window.UIUtils.closeModal('wa-test-message-modal');

      await window.GlobalLoader.wrap(async () => {
        const result = await window.WhatsAppService.sendMessage({
          studentId: 'test_admin',
          studentName: 'Test Recipient',
          fatherName: 'Administration',
          recipientPhone: phone,
          type: 'custom_admin_message',
          templateId: 'test_dispatch',
          messageText: body,
          isTest: true
        });

        if (result.success) {
          window.UIUtils.showToast('success', 'Message Logged', result.message || 'Test message queued/dispatched successfully!');
        } else {
          window.UIUtils.showToast('warning', 'Dispatch Notice', result.message || 'Could not dispatch message.');
        }
      }, 'Processing test WhatsApp message dispatch...', 'Ideal Coaching Center');
    };
  },

  // =========================================================================
  // 3. NOTIFICATION AUTOMATION SETTINGS TAB
  // =========================================================================
  async renderAutomationsTab(viewport, rootContainer) {
    const settings = await window.WhatsAppService.getSettings();
    const automations = settings.automations || window.WhatsAppService.defaultAutomations;

    const eventList = [
      { key: 'student_absent', group: 'Attendance Events', title: 'Student Marked Absent', desc: 'Dispatched immediately when teacher/admin marks student Absent in daily attendance' },
      { key: 'student_late', group: 'Attendance Events', title: 'Student Marked Late', desc: 'Dispatched when student arrives late to coaching session' },
      { key: 'attendance_report_available', group: 'Attendance Events', title: 'Monthly Attendance Summary', desc: 'Dispatched when monthly attendance report is compiled' },

      { key: 'fee_payment_received', group: 'Fee & Financial Events', title: 'Fee Payment Received', desc: 'Dispatched immediately when payment is recorded and 10-digit receipt is generated' },
      { key: 'fee_due', group: 'Fee & Financial Events', title: 'Upcoming Fee Due Notice', desc: 'Dispatched 3 days prior to the 10th monthly tuition fee due date' },
      { key: 'fee_overdue', group: 'Fee & Financial Events', title: 'Fee Overdue Alert', desc: 'Dispatched when payment is delayed past the 10th of the month' },
      { key: 'fee_reminder', group: 'Fee & Financial Events', title: 'General Fee Reminder', desc: 'Dispatched as a courteous mid-month reminder' },

      { key: 'exam_result_published', group: 'Academic Events', title: 'Exam Result Published', desc: 'Dispatched when terminal or test marks are published in student portal' },
      { key: 'student_report_available', group: 'Academic Events', title: 'Student Progress Report', desc: 'Dispatched when comprehensive teacher assessment report is ready' },
      { key: 'homework_assignment', group: 'Academic Events', title: 'Daily Diary / Homework Update', desc: 'Dispatched when daily class tasks are entered in class diary' },
      { key: 'exam_schedule', group: 'Academic Events', title: 'Exam Date Sheet Notification', desc: 'Dispatched when date sheet for board or pre-board exams is released' },

      { key: 'new_announcement', group: 'Institution Announcements', title: 'General Coaching Circular', desc: 'Dispatched when a standard circular is added to announcements' },
      { key: 'important_announcement', group: 'Institution Announcements', title: 'Urgent Circular / Alert', desc: 'Dispatched for critical emergency notices or holiday circulars' },

      { key: 'admission_confirmation', group: 'Admissions & Portal Accounts', title: 'Admission / Enrollment Welcome', desc: 'Dispatched upon successful student registration & roll number issuance' },
      { key: 'student_account_created', group: 'Admissions & Portal Accounts', title: 'Student Portal Credentials', desc: 'Sends login instructions and portal link to parents' },
      { key: 'password_account_info', group: 'Admissions & Portal Accounts', title: 'Account Security Notice', desc: 'Sends alert when student PIN / password credentials are modified' },
      { key: 'custom_admin_message', group: 'Admissions & Portal Accounts', title: 'Custom Direct Admin Notice', desc: 'Master permission for one-on-one direct message dispatches' }
    ];

    // Grouping
    const grouped = {};
    eventList.forEach(item => {
      if (!grouped[item.group]) grouped[item.group] = [];
      grouped[item.group].push(item);
    });

    viewport.innerHTML = `
      <div class="wa-card-box">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid var(--slate-200); padding-bottom: 1rem;">
          <div style="min-width: 0; flex: 1 1 280px;">
            <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--slate-900); margin: 0; word-break: break-word;">Notification Automation Rules</h3>
            <p style="font-size: 0.8rem; color: var(--slate-500); margin: 0.2rem 0 0 0; word-break: break-word;">Configure individual automated event triggers, scheduling, and rules</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="btn-save-automations" style="white-space: nowrap;">
            Save Automation Rules
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 2rem; width: 100%; min-width: 0;">
          ${Object.entries(grouped).map(([groupTitle, items]) => `
            <div style="min-width: 0;">
              <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--primary-800); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.85rem; padding-bottom: 0.4rem; border-bottom: 2px solid var(--primary-200); word-break: break-word;">
                ${groupTitle}
              </h4>
              <div style="display: flex; flex-direction: column; gap: 0.75rem; min-width: 0;">
                ${items.map(ev => {
                  const conf = automations[ev.key] || { enabled: false, rule: 'immediate' };
                  return `
                    <div class="wa-auto-card">
                      <div class="wa-auto-info">
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                          <strong style="color: var(--slate-900); font-size: 0.95rem;">${ev.title}</strong>
                          <span class="badge ${conf.rule === 'immediate' ? 'badge-primary' : conf.rule === 'scheduled' ? 'badge-paid' : 'badge-notstarted'}" style="font-size: 0.7rem; white-space: nowrap;">
                            ${conf.rule.toUpperCase()}
                          </span>
                        </div>
                        <p style="font-size: 0.775rem; color: var(--slate-600); margin-top: 0.2rem;">${ev.desc}</p>
                      </div>

                      <div class="wa-auto-controls">
                        <select class="form-control form-control-sm auto-rule-select" data-key="${ev.key}" style="width: 140px; font-size: 0.775rem;">
                          <option value="immediate" ${conf.rule === 'immediate' ? 'selected' : ''}>Send Immediately</option>
                          <option value="scheduled" ${conf.rule === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                          <option value="manual" ${conf.rule === 'manual' ? 'selected' : ''}>Manual Only</option>
                        </select>

                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 600; font-size: 0.85rem; white-space: nowrap;">
                          <input type="checkbox" class="auto-enable-chk" data-key="${ev.key}" ${conf.enabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #25d366; cursor: pointer; flex-shrink: 0;" />
                          <span>${conf.enabled ? 'Enabled' : 'Disabled'}</span>
                        </label>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Dynamic label update on checkbox toggle
    viewport.querySelectorAll('.auto-enable-chk').forEach(chk => {
      chk.onchange = () => {
        const span = chk.nextElementSibling;
        if (span) span.textContent = chk.checked ? 'Enabled' : 'Disabled';
      };
    });

    // Save Automations
    viewport.querySelector('#btn-save-automations').onclick = async () => {
      const updatedAutomations = { ...automations };

      viewport.querySelectorAll('.auto-enable-chk').forEach(chk => {
        const key = chk.getAttribute('data-key');
        const ruleSelect = viewport.querySelector(`.auto-rule-select[data-key="${key}"]`);
        const isEnabled = chk.checked;
        const rule = ruleSelect ? ruleSelect.value : 'immediate';

        updatedAutomations[key] = {
          ...(updatedAutomations[key] || {}),
          enabled: isEnabled,
          rule: rule
        };
      });

      await window.GlobalLoader.wrap(async () => {
        await window.WhatsAppService.saveSettings({ automations: updatedAutomations });
      }, 'Saving notification automation rules to Firebase...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Automations Saved', 'Automated event triggers saved successfully.');
    };
  },

  // =========================================================================
  // 4. MESSAGE TEMPLATES & LIVE PREVIEW TAB
  // =========================================================================
  async renderTemplatesTab(viewport, rootContainer) {
    const templates = await window.WhatsAppService.getTemplates();
    const currentTemplate = templates[this.activeTemplateId] || templates['student_absent'];
    const sampleContext = window.WhatsAppService.getSampleContext();

    const placeholderChips = [
      'student_name', 'father_name', 'student_roll', 'class', 'group',
      'school_name', 'date', 'time', 'attendance_status',
      'fee_amount', 'paid_amount', 'remaining_amount', 'due_date', 'receipt_number',
      'exam_name', 'result', 'percentage', 'report_link', 'announcement', 'admin_name'
    ];

    viewport.innerHTML = `
      <div class="wa-two-col-grid">
        <!-- Left: Template Editor -->
        <div class="wa-card-box">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <div style="min-width: 0; flex: 1 1 200px;">
              <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--slate-900); margin: 0; word-break: break-word;">Message Template Editor</h3>
              <p style="font-size: 0.8rem; color: var(--slate-500); margin: 0.2rem 0 0 0; word-break: break-word;">Select a notification type and customize message content</p>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-tpl-reset" style="white-space: nowrap;">
                Reset to Default
              </button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-tpl-save" style="white-space: nowrap;">
                Save Template
              </button>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1rem; min-width: 0;">
            <label class="form-label">Template Type</label>
            <select id="wa-tpl-selector" class="form-control" style="width: 100%;">
              ${Object.values(templates).map(t => `
                <option value="${t.id}" ${t.id === this.activeTemplateId ? 'selected' : ''}>
                  ${t.title} (${t.category})
                </option>
              `).join('')}
            </select>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <label class="form-label" style="margin: 0;">Template Text</label>
            <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; white-space: nowrap;">
              <input type="checkbox" id="chk-tpl-enabled" ${currentTemplate.enabled ? 'checked' : ''} style="accent-color: #25d366;" />
              <span>Enable this template</span>
            </label>
          </div>

          <textarea id="wa-tpl-textarea" class="form-control" rows="8" style="font-family: var(--font-body); font-size: 0.875rem; line-height: 1.5; margin-bottom: 1rem; width: 100%; box-sizing: border-box;">${currentTemplate.text}</textarea>

          <!-- Dynamic Placeholder Chips -->
          <div style="min-width: 0;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--slate-500); text-transform: uppercase;">
              Click to Insert Dynamic Placeholder:
            </span>
            <div class="wa-chip-grid">
              ${placeholderChips.map(p => `
                <button type="button" class="wa-chip-btn btn-chip-insert" data-placeholder="{{${p}}}">
                  + {{${p}}}
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Right: Live WhatsApp Smartphone Chat Bubble Preview -->
        <div class="wa-card-box">
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem; color: var(--slate-900); word-break: break-word;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #25d366; flex-shrink: 0;"></span>
            Live WhatsApp Smartphone Screen Preview
          </h4>

          <!-- Smartphone Frame -->
          <div class="wa-smartphone-wrapper">
            <!-- Phone Screen Top Bar -->
            <div class="wa-smartphone-topbar">
              <div style="width: 34px; height: 34px; border-radius: 50%; background: #ffffff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                <img src="assets/logo.svg" alt="Ideal Coaching Center" style="width: 24px; height: 24px;" />
              </div>
              <div style="flex: 1; overflow: hidden; min-width: 0;">
                <div style="font-weight: 700; font-size: 0.85rem; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; display: flex; align-items: center; gap: 0.35rem;">
                  Ideal Coaching Center
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="#25d366" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10" fill="none" stroke="#fff" stroke-width="2.5"/></svg>
                </div>
                <div style="font-size: 0.675rem; color: #a7f3d0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Official Account • Online</div>
              </div>
            </div>

            <!-- Phone Screen Wallpaper & Chat Area -->
            <div class="wa-smartphone-screen">
              <!-- Outgoing Message Bubble -->
              <div class="wa-chat-bubble">
                <div id="wa-preview-text" style="white-space: pre-wrap; line-height: 1.45; word-break: break-word; overflow-wrap: anywhere;">
                  ${window.WhatsAppService.replacePlaceholders(currentTemplate.text, sampleContext)}
                </div>
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.25rem; margin-top: 0.4rem; font-size: 0.65rem; color: #64748b;">
                  <span>${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span style="color: #38bdf8; font-weight: 700;">✓✓</span>
                </div>
              </div>
            </div>
          </div>

          <div style="font-size: 0.725rem; color: var(--slate-500); text-align: center; margin-top: 0.85rem; word-break: break-word;">
            Preview grounded with realistic sample student: <strong>Muhammad Usman Farooq (Roll #1201, Class 12th)</strong>
          </div>
        </div>
      </div>
    `;

    // Real-time live preview update
    const textarea = viewport.querySelector('#wa-tpl-textarea');
    const previewText = viewport.querySelector('#wa-preview-text');

    const updatePreview = () => {
      const rawText = textarea.value;
      previewText.textContent = window.WhatsAppService.replacePlaceholders(rawText, sampleContext);
    };

    textarea.oninput = updatePreview;

    // Insert placeholder chips
    viewport.querySelectorAll('.btn-chip-insert').forEach(btn => {
      btn.onclick = () => {
        const ph = btn.getAttribute('data-placeholder');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        textarea.value = text.substring(0, start) + ph + text.substring(end);
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + ph.length;
        updatePreview();
      };
    });

    // Template Dropdown Switcher
    viewport.querySelector('#wa-tpl-selector').onchange = (e) => {
      this.activeTemplateId = e.target.value;
      this.renderTemplatesTab(viewport, rootContainer);
    };

    // Save Template
    viewport.querySelector('#btn-tpl-save').onclick = async () => {
      const text = textarea.value.trim();
      const enabled = viewport.querySelector('#chk-tpl-enabled').checked;

      await window.GlobalLoader.wrap(async () => {
        await window.WhatsAppService.saveTemplate(this.activeTemplateId, { text, enabled });
      }, 'Saving message template to Firebase...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Template Saved', `Template "${currentTemplate.title}" updated successfully.`);
    };

    // Reset Template
    viewport.querySelector('#btn-tpl-reset').onclick = async () => {
      await window.GlobalLoader.wrap(async () => {
        const resetTpl = await window.WhatsAppService.resetTemplate(this.activeTemplateId);
        if (resetTpl) {
          textarea.value = resetTpl.text;
          updatePreview();
        }
      }, 'Resetting template to default...', 'Ideal Coaching Center');

      window.UIUtils.showToast('info', 'Template Reset', `Template "${currentTemplate.title}" reset to institutional default.`);
    };
  },

  // =========================================================================
  // 5. MANUAL DIRECT STUDENT MESSAGE TAB
  // =========================================================================
  async renderManualMessageTab(viewport, rootContainer) {
    const students = await window.FirebaseService.getCollection('students');
    const templates = await window.WhatsAppService.getTemplates();
    const settings = await window.WhatsAppService.getSettings();

    let selectedStudent = this.activeStudent || (students.length > 0 ? students[0] : null);
    this.activeStudent = selectedStudent;

    let phone = selectedStudent ? window.WhatsAppService.getStudentWhatsAppNumber(selectedStudent) : '';
    let isValidPhone = window.WhatsAppService.validatePhoneNumber(phone);

    viewport.innerHTML = `
      <div class="wa-card-box">
        <div style="border-bottom: 1px solid var(--slate-200); padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--slate-900); margin: 0; word-break: break-word;">Direct Manual WhatsApp Message</h3>
          <p style="font-size: 0.8rem; color: var(--slate-500); margin: 0.2rem 0 0 0; word-break: break-word;">Select a student, preview real data substitution, and dispatch parent notice</p>
        </div>

        <div class="wa-two-col-grid">
          <div style="min-width: 0;">
            <div class="form-group" style="min-width: 0;">
              <label class="form-label">Select Student <span class="req-star">*</span></label>
              <select id="manual-student-select" class="form-control" style="width: 100%;">
                ${students.map(s => `
                  <option value="${s.id}" ${selectedStudent && selectedStudent.id === s.id ? 'selected' : ''}>
                    Roll #${s.rollNumber} - ${s.fullName} (${s.class} ${s.group})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Student Card Preview -->
            ${selectedStudent ? `
              <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem; min-width: 0; box-sizing: border-box;">
                <div class="wa-student-meta-grid">
                  <div>Student: <strong>${selectedStudent.fullName}</strong></div>
                  <div>Roll Number: <strong>#${selectedStudent.rollNumber}</strong></div>
                  <div>Father Name: <strong>${selectedStudent.fatherName}</strong></div>
                  <div>Class: <strong>${selectedStudent.class} (${selectedStudent.group})</strong></div>
                </div>

                <div class="wa-student-phone-row">
                  <span style="font-size: 0.8rem; color: var(--slate-600);">Parent WhatsApp Number:</span>
                  <span class="badge ${isValidPhone ? 'badge-paid' : 'badge-absent'}" style="font-size: 0.8rem; word-break: break-all; white-space: normal;">
                    ${isValidPhone ? `✓ ${phone}` : '⚠ Missing or Invalid Number'}
                  </span>
                </div>
              </div>
            ` : ''}

            <div class="form-group" style="min-width: 0;">
              <label class="form-label">Choose Message Template or Custom</label>
              <select id="manual-template-select" class="form-control" style="width: 100%;">
                <option value="custom">-- Custom Message --</option>
                ${Object.values(templates).map(t => `
                  <option value="${t.id}">${t.title}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group form-col-full" style="min-width: 0;">
              <label class="form-label">Message Text (Customizable) <span class="req-star">*</span></label>
              <textarea id="manual-message-body" class="form-control" rows="6" placeholder="Enter message text..." style="width: 100%; box-sizing: border-box;"></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-success" id="btn-manual-send-wa" ${!isValidPhone ? 'disabled' : ''} style="white-space: nowrap;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8 2.53 1.09 2.53.73 2.98.68.46-.04 1.47-.6 1.68-1.18.21-.59.21-1.09.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
                Send via WhatsApp
              </button>
            </div>
          </div>

          <!-- Right Live Preview -->
          <div class="wa-card-box" style="padding: 1.25rem;">
            <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem; text-transform: uppercase; color: var(--slate-600); word-break: break-word;">Message Preview</h4>
            <div style="background: #efeae2; padding: 1rem; border-radius: var(--radius-md); min-height: 200px; display: flex; flex-direction: column; justify-content: flex-end; box-sizing: border-box;">
              <div style="background: #dcf8c6; border-radius: 8px; padding: 0.75rem; font-size: 0.825rem; color: #0f172a; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;" id="manual-live-preview-box">
                Select a template or type a message to see live preview.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const studentSelect = viewport.querySelector('#manual-student-select');
    const templateSelect = viewport.querySelector('#manual-template-select');
    const messageBody = viewport.querySelector('#manual-message-body');
    const previewBox = viewport.querySelector('#manual-live-preview-box');

    const refreshTemplateText = () => {
      const tplId = templateSelect.value;
      if (tplId === 'custom') {
        messageBody.value = `Dear Parent/Guardian of ${selectedStudent ? selectedStudent.fullName : 'Student'}, please be informed that...`;
      } else if (templates[tplId]) {
        const raw = templates[tplId].text;
        const ctx = window.WhatsAppService.getSampleContext(selectedStudent);
        messageBody.value = window.WhatsAppService.replacePlaceholders(raw, ctx);
      }
      previewBox.textContent = messageBody.value;
    };

    refreshTemplateText();

    messageBody.oninput = () => {
      previewBox.textContent = messageBody.value;
    };

    studentSelect.onchange = (e) => {
      this.activeStudent = students.find(s => s.id === e.target.value);
      this.renderManualMessageTab(viewport, rootContainer);
    };

    templateSelect.onchange = refreshTemplateText;

    // Send Button with Safeguard Confirmation Dialog
    const sendBtn = viewport.querySelector('#btn-manual-send-wa');
    if (sendBtn) {
      sendBtn.onclick = async () => {
        const msg = messageBody.value.trim();
        if (!msg) {
          window.UIUtils.showToast('error', 'Message Empty', 'Please enter message content.');
          return;
        }

        const confirmed = await window.UIUtils.confirm({
          title: 'Confirm WhatsApp Dispatch',
          message: `Are you sure you want to send this message to ${selectedStudent.fullName}'s parent at ${phone}?`,
          confirmText: 'Dispatch WhatsApp Message',
          cancelText: 'Cancel',
          type: 'info'
        });

        if (!confirmed) return;

        await window.GlobalLoader.wrap(async () => {
          const res = await window.WhatsAppService.sendMessage({
            studentId: selectedStudent.id,
            studentName: selectedStudent.fullName,
            fatherName: selectedStudent.fatherName,
            recipientPhone: phone,
            type: templateSelect.value === 'custom' ? 'custom_admin_message' : templateSelect.value,
            templateId: templateSelect.value,
            messageText: msg
          });

          if (res.success) {
            window.UIUtils.showToast('success', 'Message Logged', res.message || 'WhatsApp message queued/sent successfully!');
          } else {
            window.UIUtils.showToast('warning', 'Notice', res.message);
          }
        }, 'Dispatching message to WhatsApp gateway...', 'Ideal Coaching Center');
      };
    }
  },

  // =========================================================================
  // 6. BULK BROADCAST TAB
  // =========================================================================
  async renderBulkMessageTab(viewport, rootContainer) {
    const students = await window.FirebaseService.getCollection('students');
    const templates = await window.WhatsAppService.getTemplates();

    viewport.innerHTML = `
      <div class="wa-card-box">
        <div style="border-bottom: 1px solid var(--slate-200); padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--slate-900); margin: 0; word-break: break-word;">Bulk WhatsApp Notification Broadcast</h3>
          <p style="font-size: 0.8rem; color: var(--slate-500); margin: 0.2rem 0 0 0; word-break: break-word;">Send circulars, reminders, or exam schedules to entire batches</p>
        </div>

        <div class="form-grid" style="margin-bottom: 1.5rem; width: 100%; min-width: 0;">
          <div class="form-group" style="min-width: 0;">
            <label class="form-label">Target Class</label>
            <select id="bulk-target-class" class="form-control" style="width: 100%;">
              <option value="All">All Classes (9th, 10th, 11th, 12th)</option>
              <option value="9th">Class 9th</option>
              <option value="10th">Class 10th</option>
              <option value="11th">Class 11th</option>
              <option value="12th">Class 12th</option>
            </select>
          </div>

          <div class="form-group" style="min-width: 0;">
            <label class="form-label">Target Group</label>
            <select id="bulk-target-group" class="form-control" style="width: 100%;">
              <option value="All">All Groups / Sections</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Pre-Medical">Pre-Medical</option>
              <option value="Pre-Engineering">Pre-Engineering</option>
              <option value="Science">Science</option>
              <option value="General">General</option>
            </select>
          </div>

          <div class="form-group form-col-full" style="min-width: 0;">
            <label class="form-label">Message Template</label>
            <select id="bulk-template-select" class="form-control" style="width: 100%;">
              <option value="new_announcement">General Coaching Circular</option>
              <option value="important_announcement">Urgent Notice / Alert</option>
              <option value="exam_schedule">Exam Date Sheet Notification</option>
              <option value="fee_reminder">Monthly Fee Gentle Reminder</option>
              <option value="custom">-- Custom Broadcast Message --</option>
            </select>
          </div>

          <div class="form-group form-col-full" style="min-width: 0;">
            <label class="form-label">Broadcast Text Content <span class="req-star">*</span></label>
            <textarea id="bulk-message-text" class="form-control" rows="5" style="width: 100%; box-sizing: border-box;"></textarea>
          </div>
        </div>

        <!-- Recipient Counter Card & Safeguards -->
        <div class="wa-audience-card">
          <div style="min-width: 0;">
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--slate-500); text-transform: uppercase;">
              Recipient Audience Summary
            </span>
            <div class="wa-audience-stats">
              <div>Total Eligible: <strong id="bulk-count-total">0</strong></div>
              <div style="color: var(--success-600);">Valid WhatsApp: <strong id="bulk-count-valid">0</strong></div>
              <div style="color: var(--danger-600);">Missing Number: <strong id="bulk-count-invalid">0</strong></div>
            </div>
          </div>

          <button type="button" class="btn btn-success" id="btn-start-bulk-dispatch" style="white-space: nowrap;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8 2.53 1.09 2.53.73 2.98.68.46-.04 1.47-.6 1.68-1.18.21-.59.21-1.09.15-1.18-.06-.1-.23-.17-.48-.29z"/></svg>
            Review & Send Broadcast
          </button>
        </div>
      </div>
    `;

    const classSelect = viewport.querySelector('#bulk-target-class');
    const groupSelect = viewport.querySelector('#bulk-target-group');
    const tplSelect = viewport.querySelector('#bulk-template-select');
    const textArea = viewport.querySelector('#bulk-message-text');

    const updateRecipients = () => {
      const cls = classSelect.value;
      const grp = groupSelect.value;

      let filtered = students;
      if (cls !== 'All') filtered = filtered.filter(s => s.class === cls);
      if (grp !== 'All') filtered = filtered.filter(s => s.group === grp);

      let validCount = 0;
      let invalidCount = 0;

      filtered.forEach(s => {
        const ph = window.WhatsAppService.getStudentWhatsAppNumber(s);
        if (window.WhatsAppService.validatePhoneNumber(ph)) validCount++;
        else invalidCount++;
      });

      viewport.querySelector('#bulk-count-total').textContent = filtered.length;
      viewport.querySelector('#bulk-count-valid').textContent = validCount;
      viewport.querySelector('#bulk-count-invalid').textContent = invalidCount;
      return { filtered, validCount, invalidCount };
    };

    updateRecipients();

    classSelect.onchange = updateRecipients;
    groupSelect.onchange = updateRecipients;

    const setTemplateText = () => {
      const tid = tplSelect.value;
      if (tid === 'custom') {
        textArea.value = 'Important notification from Ideal Coaching Center:\n\nAll students and parents are requested to...';
      } else if (templates[tid]) {
        textArea.value = templates[tid].text;
      }
    };
    setTemplateText();
    tplSelect.onchange = setTemplateText;

    // Start Bulk Dispatch with Confirmation Modal
    viewport.querySelector('#btn-start-bulk-dispatch').onclick = async () => {
      const { filtered, validCount } = updateRecipients();
      const rawText = textArea.value.trim();

      if (!rawText) {
        window.UIUtils.showToast('error', 'Message Empty', 'Please provide broadcast message text.');
        return;
      }

      if (validCount === 0) {
        window.UIUtils.showToast('warning', 'No Recipients', 'No students with valid WhatsApp numbers match this filter.');
        return;
      }

      const confirmed = await window.UIUtils.confirm({
        title: 'Confirm Bulk WhatsApp Broadcast',
        message: `You are about to broadcast this WhatsApp message to ${validCount} student parents. Automatic deduplication will safeguard against repeating sends within 60 minutes. Proceed?`,
        confirmText: `Broadcast to ${validCount} Parents`,
        cancelText: 'Cancel',
        type: 'warning'
      });

      if (!confirmed) return;

      await window.GlobalLoader.wrap(async () => {
        let successCount = 0;
        let failCount = 0;

        for (const st of filtered) {
          const ph = window.WhatsAppService.getStudentWhatsAppNumber(st);
          if (!window.WhatsAppService.validatePhoneNumber(ph)) {
            failCount++;
            continue;
          }

          const ctx = window.WhatsAppService.getSampleContext(st);
          const finalMsg = window.WhatsAppService.replacePlaceholders(rawText, ctx);

          const res = await window.WhatsAppService.sendMessage({
            studentId: st.id,
            studentName: st.fullName,
            fatherName: st.fatherName,
            recipientPhone: ph,
            type: tplSelect.value === 'custom' ? 'custom_admin_message' : tplSelect.value,
            templateId: tplSelect.value,
            messageText: finalMsg,
            uniqueKey: `bulk_${tplSelect.value}_${st.id}_${new Date().toISOString().split('T')[0]}`
          });

          if (res.success) successCount++;
          else failCount++;
        }

        window.UIUtils.showToast('success', 'Broadcast Completed', `Processed ${filtered.length} students: ${successCount} queued/dispatched, ${failCount} skipped/failed.`);
      }, 'Processing bulk WhatsApp notification broadcast...', 'Ideal Coaching Center');
    };
  },

  // =========================================================================
  // 7. NOTIFICATION HISTORY / WHATSAPP LOGS TAB
  // =========================================================================
  async renderLogsTab(viewport, rootContainer) {
    const logs = await window.WhatsAppService.getLogs(this.logFilters);

    viewport.innerHTML = `
      <div class="wa-card-box">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; border-bottom: 1px solid var(--slate-200); padding-bottom: 1rem;">
          <div style="min-width: 0; flex: 1 1 280px;">
            <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--slate-900); margin: 0; word-break: break-word;">WhatsApp Notification History & Delivery Logs</h3>
            <p style="font-size: 0.8rem; color: var(--slate-500); margin: 0.2rem 0 0 0; word-break: break-word;">Complete audit trail of all automated and manual WhatsApp dispatches</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-wa-logs" style="white-space: nowrap;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Refresh Logs
          </button>
        </div>

        <!-- Filters Bar -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 1.25rem; width: 100%; min-width: 0;">
          <div style="min-width: 0;">
            <input type="text" id="log-filter-search" class="form-control" placeholder="Search student, phone, or text..." value="${this.logFilters.search || ''}" style="width: 100%;" />
          </div>

          <div style="min-width: 0;">
            <select id="log-filter-status" class="form-control" style="width: 100%;">
              <option value="all" ${this.logFilters.status === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="sent" ${this.logFilters.status === 'sent' ? 'selected' : ''}>Sent</option>
              <option value="delivered" ${this.logFilters.status === 'delivered' ? 'selected' : ''}>Delivered</option>
              <option value="pending" ${this.logFilters.status === 'pending' ? 'selected' : ''}>Pending / Queued</option>
              <option value="failed" ${this.logFilters.status === 'failed' ? 'selected' : ''}>Failed</option>
            </select>
          </div>

          <div style="min-width: 0;">
            <input type="date" id="log-filter-date" class="form-control" value="${this.logFilters.date || ''}" style="width: 100%;" />
          </div>

          <div style="min-width: 0;">
            <button type="button" class="btn btn-secondary" id="btn-clear-log-filters" style="width: 100%; white-space: nowrap;">
              Clear Filters
            </button>
          </div>
        </div>

        <!-- Logs Table (Horizontal Scroll Protected on Laptops & Mobile) -->
        <div class="table-responsive" style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
          <table class="app-table" style="min-width: 720px; width: 100%;">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Student / Recipient</th>
                <th>Phone (Masked)</th>
                <th>Notification Event</th>
                <th>Message Content</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--slate-500);">
                    No WhatsApp notification records found matching criteria.
                  </td>
                </tr>
              ` : logs.map(l => {
                const isFailed = l.status === 'Failed';
                return `
                  <tr>
                    <td style="font-size: 0.8rem; white-space: nowrap;">
                      ${window.UIUtils.formatDate(l.timestamp)}
                      <br><small style="color: var(--slate-500);">${new Date(l.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</small>
                    </td>
                    <td>
                      <strong>${l.studentName || 'N/A'}</strong>
                      ${l.fatherName ? `<br><small style="color: var(--slate-500);">${l.fatherName}</small>` : ''}
                    </td>
                    <td style="font-family: var(--font-mono); font-size: 0.825rem; white-space: nowrap;">
                      ${l.maskedPhone || window.WhatsAppService.maskPhoneNumber(l.recipientPhone)}
                    </td>
                    <td>
                      <span class="badge badge-primary" style="font-size: 0.725rem; white-space: nowrap;">
                        ${(l.type || 'Custom').replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style="max-width: 260px; min-width: 140px; font-size: 0.8rem; color: var(--slate-700);">
                      <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${l.messageText}">
                        ${l.messageText}
                      </div>
                    </td>
                    <td>
                      <span class="badge ${l.status === 'Sent' || l.status === 'Delivered' ? 'badge-paid' : l.status === 'Failed' ? 'badge-absent' : 'badge-pending'}" style="white-space: nowrap;">
                        ${l.status}
                      </span>
                      ${l.deliveryStatus ? `<br><small style="font-size: 0.675rem; color: var(--slate-500); white-space: nowrap;">${l.deliveryStatus}</small>` : ''}
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                        <button type="button" class="btn btn-secondary btn-sm btn-view-log-details" data-id="${l.id}" title="View Details">
                          Details
                        </button>
                        ${isFailed ? `
                          <button type="button" class="btn btn-outline-primary btn-sm btn-retry-log" data-id="${l.id}" title="Retry Message">
                            Retry
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Filter bindings
    const searchInput = viewport.querySelector('#log-filter-search');
    const statusSelect = viewport.querySelector('#log-filter-status');
    const dateInput = viewport.querySelector('#log-filter-date');

    const triggerFilterUpdate = () => {
      this.logFilters.search = searchInput.value;
      this.logFilters.status = statusSelect.value;
      this.logFilters.date = dateInput.value;
      this.renderLogsTab(viewport, rootContainer);
    };

    searchInput.onchange = triggerFilterUpdate;
    statusSelect.onchange = triggerFilterUpdate;
    dateInput.onchange = triggerFilterUpdate;

    viewport.querySelector('#btn-clear-log-filters').onclick = () => {
      this.logFilters = { status: 'all', type: 'all', date: '', search: '' };
      this.renderLogsTab(viewport, rootContainer);
    };

    viewport.querySelector('#btn-refresh-wa-logs').onclick = () => {
      this.renderLogsTab(viewport, rootContainer);
    };

    // View Details Modal
    viewport.querySelectorAll('.btn-view-log-details').forEach(btn => {
      btn.onclick = () => {
        const logId = btn.getAttribute('data-id');
        const item = logs.find(l => l.id === logId);
        if (item) this.openLogDetailsModal(item);
      };
    });

    // Retry Failed Message
    viewport.querySelectorAll('.btn-retry-log').forEach(btn => {
      btn.onclick = async () => {
        const logId = btn.getAttribute('data-id');
        await window.GlobalLoader.wrap(async () => {
          const res = await window.WhatsAppService.retryMessage(logId);
          window.UIUtils.showToast(res.success ? 'success' : 'warning', 'Retry Status', res.message);
        }, 'Retrying WhatsApp notification...', 'Ideal Coaching Center');
        this.renderLogsTab(viewport, rootContainer);
      };
    });
  },

  /**
   * Log Details Modal
   */
  openLogDetailsModal(log) {
    let modal = document.getElementById('wa-log-details-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'wa-log-details-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <h3 class="modal-title">WhatsApp Notification Record</h3>
            <p style="font-size: 0.75rem; color: var(--slate-500);">Log ID: ${log.id}</p>
          </div>
          <button type="button" class="modal-close-btn" id="btn-close-log-details">&times;</button>
        </div>

        <div class="modal-body">
          <div class="wa-student-meta-grid" style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; box-sizing: border-box;">
            <div>Student: <strong>${log.studentName || 'N/A'}</strong></div>
            <div>Father Name: <strong>${log.fatherName || 'N/A'}</strong></div>
            <div>Recipient Phone: <strong style="font-family: var(--font-mono); word-break: break-all;">${log.recipientPhone}</strong></div>
            <div>Event Type: <strong>${(log.type || '').toUpperCase()}</strong></div>
            <div>Timestamp: <strong>${new Date(log.timestamp).toLocaleString()}</strong></div>
            <div>Status: <span class="badge ${log.status === 'Sent' || log.status === 'Delivered' ? 'badge-paid' : 'badge-absent'}" style="white-space: nowrap;">${log.status}</span></div>
          </div>

          <div class="form-group" style="min-width: 0;">
            <label class="form-label">Full Message Text</label>
            <div style="background: #efeae2; padding: 1rem; border-radius: var(--radius-md); font-size: 0.85rem; white-space: pre-wrap; line-height: 1.5; color: #111827; word-break: break-word; overflow-wrap: anywhere; box-sizing: border-box;">
              ${log.messageText}
            </div>
          </div>

          ${log.errorInfo ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.8rem; margin-top: 0.75rem; word-break: break-word; overflow-wrap: anywhere; box-sizing: border-box;">
              <strong>Provider Status Detail:</strong> ${log.errorInfo}
            </div>
          ` : ''}
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-close-log-details-footer">Close</button>
        </div>
      </div>
    `;

    window.UIUtils.openModal('wa-log-details-modal');

    modal.querySelector('#btn-close-log-details').onclick = () => window.UIUtils.closeModal('wa-log-details-modal');
    modal.querySelector('#btn-close-log-details-footer').onclick = () => window.UIUtils.closeModal('wa-log-details-modal');
  },

  // =========================================================================
  // 8. HELP & INTEGRATION GUIDE TAB
  // =========================================================================
  renderGuideTab(viewport) {
    viewport.innerHTML = `
      <div class="wa-card-box">
        <div style="border-bottom: 1px solid var(--slate-200); padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--slate-900); margin: 0; word-break: break-word;">Official WhatsApp Integration Guide</h3>
          <p style="font-size: 0.8rem; color: var(--slate-500); margin: 0.2rem 0 0 0; word-break: break-word;">Production deployment principles & Meta WhatsApp Cloud API connection</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.5rem; line-height: 1.6; font-size: 0.875rem; color: var(--slate-700); min-width: 0;">
          <div style="background: var(--primary-50); border-left: 4px solid var(--primary-600); padding: 1rem 1.25rem; border-radius: var(--radius-md); box-sizing: border-box; min-width: 0;">
            <strong style="color: var(--primary-900); font-size: 0.95rem; display: block;">Frontend Architecture Principle</strong>
            <p style="margin-top: 0.35rem; color: var(--primary-800); word-break: break-word; overflow-wrap: break-word; line-height: 1.5;">
              In accordance with secure web standards, browser JavaScript must never contain private Meta API tokens or credentials. This portal is engineered with a clean, decoupled service architecture. When ready, connect your lightweight backend endpoint (Firebase Cloud Function, Cloudflare Worker, or AWS Lambda) that safely injects your secret token server-side and forwards requests to Meta's WhatsApp Cloud API.
            </p>
          </div>

          <div style="min-width: 0;">
            <h4 style="font-size: 1rem; font-weight: 700; color: var(--slate-900); margin-bottom: 0.5rem; word-break: break-word;">
              Step-by-Step Meta Cloud API Setup:
            </h4>
            <ol style="margin-left: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; word-break: break-word;">
              <li>Visit the <strong>Meta for Developers Portal</strong> (developers.facebook.com) and create a Business App.</li>
              <li>Add the <strong>WhatsApp product</strong> to your application to generate a Phone Number ID and WhatsApp Business Account (WABA) ID.</li>
              <li>Verify your coaching center's official business phone number (e.g. <code>+92 300 1234567</code>).</li>
              <li>Deploy a simple serverless proxy or endpoint that accepts <code>POST { to, message }</code> and calls Meta endpoint <code>https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages</code>.</li>
              <li>Paste your serverless endpoint URL into the <strong>WhatsApp Configuration</strong> tab and click <em>Ping Endpoint</em> to verify connectivity!</li>
            </ol>
          </div>

          <div style="background: var(--slate-900); color: #e2e8f0; padding: 1.25rem; border-radius: var(--radius-md); font-family: var(--font-mono); font-size: 0.775rem; box-sizing: border-box; max-width: 100%; overflow-x: auto;">
            <div style="color: #94a3b8; margin-bottom: 0.5rem; word-break: break-all;">// Sample Serverless Endpoint (Node.js / Express / Cloud Function)</div>
            <pre style="margin: 0; white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word;">
app.post('/whatsapp/send', async (req, res) => {
  const { to, message, phoneNumberId } = req.body;
  const META_TOKEN = process.env.META_WHATSAPP_TOKEN; // Kept secure in server env

  const response = await fetch(\`https://graph.facebook.com/v19.0/\${phoneNumberId}/messages\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${META_TOKEN}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: message }
    })
  });

  const data = await response.json();
  res.json({ success: response.ok, deliveryStatus: 'Delivered to Meta' });
});</pre>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Helper to switch tabs
   */
  switchTab(rootContainer, tabName) {
    this.currentTab = tabName;
    rootContainer.querySelectorAll('.profile-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    this.renderTabContent(rootContainer);
  }
};

window.WhatsAppView = WhatsAppView;
