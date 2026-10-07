/**
 * Ideal Coaching Center - Global High-Performance Loading System
 * Fast, streamlined 2-second maximum duration with an extreme-level
 * professional multi-layer orbital gyroscope animation and progress telemetry.
 * Official Organization: Ideal Coaching Center
 */

class GlobalLoadingManager {
  constructor() {
    this.overlay = null;
    this.titleEl = null;
    this.messageEl = null;
    this.progressFillEl = null;
    this.percentEl = null;
    this.cardEl = null;
    this.activeCount = 0;
    this.startTime = null;
    this.progressInterval = null;
    this.defaultDuration = 1600; // Fast & snappy (Strictly capped under 2000ms)
    this.init();
  }

  init() {
    if (document.getElementById('global-loader-overlay')) {
      this.overlay = document.getElementById('global-loader-overlay');
      this.titleEl = document.getElementById('loader-title');
      this.messageEl = document.getElementById('loader-message');
      this.progressFillEl = document.getElementById('loader-progress-fill');
      this.percentEl = document.getElementById('loader-percent');
      this.cardEl = document.getElementById('loader-card');
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'global-loader-overlay';
    overlay.className = 'global-loader-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-live', 'assertive');

    overlay.innerHTML = `
      <div class="loader-card" id="loader-card">
        <!-- Ambient Radial Glow Halo -->
        <div class="loader-ambient-glow"></div>

        <!-- Extreme-Level Multi-Ring Holographic Gyroscope -->
        <div class="loader-spinner-wrapper" id="loader-spinner-wrapper">
          <div class="loader-orbit-outer"></div>
          <div class="loader-orbit-middle"></div>
          <div class="loader-orbit-inner"></div>
          <div class="loader-satellite-orbit">
            <div class="loader-satellite-dot"></div>
          </div>
          <div class="loader-core-shield">
            <img src="assets/logo.svg" alt="Ideal Coaching Center" class="loader-center-icon" />
          </div>
        </div>

        <h3 class="loader-title" id="loader-title">Ideal Coaching Center</h3>
        <p class="loader-message" id="loader-message">Processing request...</p>

        <!-- Precision Telemetry Progress Bar -->
        <div class="loader-progress-track">
          <div class="loader-progress-fill" id="loader-progress-fill">
            <div class="loader-progress-spark"></div>
          </div>
        </div>

        <div class="loader-meta-row">
          <span class="loader-subtext" id="loader-subtext">Securing portal connection...</span>
          <span class="loader-percent" id="loader-percent">0%</span>
        </div>

        <div id="loader-action-container" style="display: none; margin-top: 1.25rem; gap: 0.5rem; width: 100%;"></div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.titleEl = overlay.querySelector('#loader-title');
    this.messageEl = overlay.querySelector('#loader-message');
    this.progressFillEl = overlay.querySelector('#loader-progress-fill');
    this.percentEl = overlay.querySelector('#loader-percent');
    this.cardEl = overlay.querySelector('#loader-card');
  }

  /**
   * Reset loader visual state back to normal spinning state
   */
  resetVisuals() {
    const actionContainer = this.overlay.querySelector('#loader-action-container');
    if (actionContainer) {
      actionContainer.style.display = 'none';
      actionContainer.innerHTML = '';
    }
    const spinner = this.overlay.querySelector('#loader-spinner-wrapper');
    if (spinner) spinner.style.display = 'flex';
    const subtext = this.overlay.querySelector('#loader-subtext');
    if (subtext) subtext.innerText = 'Securing portal connection...';
    if (this.percentEl) this.percentEl.innerText = '0%';
  }

  /**
   * Show loader with specific message, title, and target duration (strictly capped at 2 seconds)
   */
  show(message = 'Please wait...', title = 'Ideal Coaching Center', targetDuration = 1600) {
    this.init();
    this.resetVisuals();
    this.activeCount++;

    // Clamp duration to max 2000ms (2 seconds)
    const clampedDuration = Math.min(2000, Math.max(200, targetDuration));

    if (this.titleEl) this.titleEl.textContent = title;
    if (this.messageEl) this.messageEl.textContent = message;

    if (!this.overlay.classList.contains('active')) {
      this.overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      this.startTime = Date.now();
      this.startProgressBar(clampedDuration);
    }
  }

  /**
   * Smoothly animates progress bar and telemetry counter up to 2000ms max
   */
  startProgressBar(duration = 1600) {
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (!this.progressFillEl) return;

    this.progressFillEl.style.width = '0%';
    if (this.percentEl) this.percentEl.textContent = '0%';
    const start = Date.now();

    this.progressInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min((elapsed / duration) * 96, 96); // Smooth ramp to 96%
      const rounded = Math.floor(progress);

      this.progressFillEl.style.width = `${progress}%`;
      if (this.percentEl) this.percentEl.textContent = `${rounded}%`;

      if (elapsed >= duration && this.activeCount <= 0) {
        this.progressFillEl.style.width = '100%';
        if (this.percentEl) this.percentEl.textContent = '100%';
        clearInterval(this.progressInterval);
      }
    }, 25);
  }

  /**
   * Direct hide with smooth completion snap
   */
  async hide(force = false) {
    this.activeCount = Math.max(0, this.activeCount - 1);

    if (this.activeCount > 0 && !force) {
      return;
    }

    if (this.progressFillEl) {
      this.progressFillEl.style.width = '100%';
    }
    if (this.percentEl) {
      this.percentEl.textContent = '100%';
    }

    // Brief instant micro-delay so user sees 100% completion before smooth fade
    await new Promise(resolve => setTimeout(resolve, 80));

    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    if (this.overlay) {
      this.overlay.classList.remove('active');
    }
    document.body.style.overflow = '';
    this.startTime = null;
    this.activeCount = 0;
  }

  /**
   * Wraps an async operation with the loader.
   * Total wait is capped strictly at 2.0 seconds maximum.
   * If the operation takes time naturally (e.g. heavy cloud write), it will only take the natural time.
   * If the operation is fast, it resolves smoothly within 1.2s - 1.8s without annoying 5-second stalls.
   */
  async wrap(asyncFn, message = 'Processing request...', title = 'Ideal Coaching Center', targetDuration = 1600) {
    // If loader is already actively running (nested call), execute directly without stacking extra delay
    if (this.overlay && this.overlay.classList.contains('active') && this.startTime) {
      return await (typeof asyncFn === 'function' ? asyncFn() : asyncFn);
    }

    // Capped strictly at 2000ms max
    const duration = Math.min(2000, Math.max(200, targetDuration));
    this.show(message, title, duration);
    const startOpTime = Date.now();

    try {
      // Execute the actual asynchronous operation
      const result = await (typeof asyncFn === 'function' ? asyncFn() : asyncFn);

      // Fast display pacing (strictly capped at 2000ms max)
      const elapsed = Date.now() - startOpTime;
      const waitRemaining = Math.max(0, duration - elapsed);

      if (waitRemaining > 0) {
        await new Promise(resolve => setTimeout(resolve, waitRemaining));
      }

      await this.hide(true);
      return result;
    } catch (error) {
      console.error('Operation error during loader:', error);
      const elapsed = Date.now() - startOpTime;
      const waitRemaining = Math.max(0, duration - elapsed);
      if (waitRemaining > 0) {
        await new Promise(resolve => setTimeout(resolve, waitRemaining));
      }

      // Convert loader to friendly error state with Try Again button
      this.showErrorState(error, asyncFn, message, title);
      throw error;
    }
  }

  /**
   * Displays a professional error state within the loader card with Try Again option
   */
  showErrorState(error, retryFn, message, title) {
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.progressFillEl) this.progressFillEl.style.width = '100%';
    if (this.percentEl) this.percentEl.textContent = 'Failed';

    const spinner = this.overlay.querySelector('#loader-spinner-wrapper');
    if (spinner) spinner.style.display = 'none';

    if (this.titleEl) this.titleEl.textContent = 'Operation Incomplete';
    
    // Friendly non-raw message
    let friendlyMessage = 'We could not complete this operation at the moment. Please check your connection and try again.';
    if (error && error.message) {
      if (error.message.includes('permission-denied')) {
        friendlyMessage = 'Access restricted or session expired. Please verify your permissions.';
      } else if (error.message.includes('not-found')) {
        friendlyMessage = 'The requested record could not be found.';
      } else if (error.message.includes('network')) {
        friendlyMessage = 'Network connection problem. Please verify your internet connection.';
      } else if (error.friendlyMessage) {
        friendlyMessage = error.friendlyMessage;
      }
    }

    if (this.messageEl) this.messageEl.textContent = friendlyMessage;

    const actionContainer = this.overlay.querySelector('#loader-action-container');
    if (actionContainer) {
      actionContainer.style.display = 'flex';
      actionContainer.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" id="btn-loader-dismiss" style="flex: 1;">Dismiss</button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-loader-retry" style="flex: 1;">Try Again</button>
      `;

      actionContainer.querySelector('#btn-loader-dismiss').onclick = () => {
        this.hide(true);
      };

      actionContainer.querySelector('#btn-loader-retry').onclick = async () => {
        this.resetVisuals();
        try {
          await this.wrap(retryFn, message, title);
        } catch (e) {
          // Handled inside wrap
        }
      };
    }
  }
}

// Global Singleton Instance
window.GlobalLoader = new GlobalLoadingManager();
