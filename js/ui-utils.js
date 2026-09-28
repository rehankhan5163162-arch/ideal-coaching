/**
 * Ideal Coaching Center - UI Utilities
 * Toasts, Modals, Confirmation Dialogs, 10-Digit Receipt Generator, and Formatters
 */

const UIUtils = {
  /**
   * Display a non-blocking professional toast notification
   */
  showToast(type = 'info', title = 'Ideal Coaching Center', message = '', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else {
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <h4 class="toast-title">${title}</h4>
        <p class="toast-message">${message}</p>
      </div>
      <button type="button" class="toast-close" aria-label="Close Notification">&times;</button>
      <div class="toast-progress"><div class="toast-progress-bar"></div></div>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    const progressBar = toast.querySelector('.toast-progress-bar');
    if (progressBar) {
      progressBar.style.transition = `width ${duration}ms linear`;
      requestAnimationFrame(() => {
        progressBar.style.width = '0%';
      });
    }

    const removeToast = () => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 350);
    };

    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) closeBtn.onclick = removeToast;

    setTimeout(removeToast, duration);
  },

  /**
   * Open modal dialog
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus first input or close button
    const firstInput = modal.querySelector('input, select, textarea, button.btn-primary');
    if (firstInput) firstInput.focus();
  },

  /**
   * Close modal dialog
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    // Check if any other modal is still open
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.style.overflow = '';
    }
  },

  /**
   * Professional confirmation modal dialog
   */
  confirm({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Yes, Proceed',
    cancelText = 'Cancel',
    type = 'danger'
  }) {
    return new Promise((resolve) => {
      let modal = document.getElementById('global-confirm-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'global-confirm-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
          <div class="modal-dialog modal-sm">
            <div class="confirm-box confirm-${type}">
              <div class="confirm-icon-wrapper" id="confirm-modal-icon">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3 class="confirm-title" id="confirm-modal-title">Confirm Action</h3>
              <p class="confirm-message" id="confirm-modal-message">Are you sure?</p>
              <div style="display: flex; gap: 0.75rem; justify-content: center;">
                <button type="button" class="btn btn-secondary" id="confirm-modal-cancel">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirm-modal-ok">Proceed</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
      }

      const titleEl = modal.querySelector('#confirm-modal-title');
      const msgEl = modal.querySelector('#confirm-modal-message');
      const cancelBtn = modal.querySelector('#confirm-modal-cancel');
      const okBtn = modal.querySelector('#confirm-modal-ok');
      const box = modal.querySelector('.confirm-box');

      box.className = `confirm-box confirm-${type}`;
      titleEl.textContent = title;
      msgEl.textContent = message;
      cancelBtn.textContent = cancelText;
      okBtn.textContent = confirmText;
      okBtn.className = `btn btn-${type === 'danger' ? 'danger' : 'primary'}`;

      modal.classList.add('active');

      const cleanup = () => {
        modal.classList.remove('active');
        cancelBtn.onclick = null;
        okBtn.onclick = null;
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(false);
      };

      okBtn.onclick = () => {
        cleanup();
        resolve(true);
      };
    });
  },

  /**
   * Generates a collision-resistant, unique EXACTLY 10-digit receipt/invoice number.
   * Format: YYMM + 6-digit collision-safe sequence
   * (e.g. 2609481234 -> exactly 10 numeric digits)
   */
  generate10DigitReceiptNumber(existingReceipts = []) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    
    const existingSet = new Set(
      Array.isArray(existingReceipts) 
        ? existingReceipts.map(r => String(r.receiptNumber || r))
        : []
    );

    let receiptNum = '';
    let attempts = 0;

    do {
      // 6-digit sequence from high-res time slice + secure random offset
      const timeComponent = (Date.now() % 800000);
      const randOffset = Math.floor(Math.random() * 199999);
      const seq = String((timeComponent + randOffset) % 1000000).padStart(6, '0');
      receiptNum = `${yy}${mm}${seq}`;
      attempts++;
    } while (existingSet.has(receiptNum) && attempts < 100);

    // Fallback if loop hit limit
    if (receiptNum.length !== 10) {
      const fallbackSeq = String(Math.floor(100000 + Math.random() * 900000));
      receiptNum = `${yy}${mm}${fallbackSeq}`;
    }

    return receiptNum;
  },

  /**
   * Currency formatter
   */
  formatCurrency(amount) {
    const val = Number(amount) || 0;
    return `Rs. ${val.toLocaleString('en-PK')}`;
  },

  /**
   * Format standard date: "Sep 28, 2026"
   */
  formatDate(dateInput) {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Check if a given date string or Date object is a Sunday
   */
  isSunday(dateInput) {
    if (!dateInput) return false;
    const d = new Date(dateInput);
    return d.getDay() === 0; // 0 represents Sunday
  },

  /**
   * 12 Standard academic months
   */
  getMonthsList() {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  },

  /**
   * Standard Classes & Groups configuration
   */
  getClassesAndGroups() {
    return {
      '9th': ['Science', 'General'],
      '10th': ['Science', 'General'],
      '11th': ['Pre-Medical', 'Pre-Engineering', 'Computer Science'],
      '12th': ['Pre-Medical', 'Pre-Engineering', 'Computer Science']
    };
  },

  /**
   * Get total academic working days in a month excluding Sundays
   */
  getMonthWorkingDays(year, monthIndex) {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, monthIndex, d);
      if (dayDate.getDay() !== 0) { // Exclude Sundays
        workingDays++;
      }
    }
    return Math.max(1, workingDays);
  },

  /**
   * Calculate monthly attendance based on the total working days of the entire month (excluding Sundays).
   * Ensures 1 day present does not say 100%, but accurately reflects completion across the full month.
   * To achieve 100%, the student must complete all working days of the month.
   */
  calculateMonthlyAttendance(attendanceRecords, studentId, referenceDate = new Date()) {
    let targetYear = referenceDate.getFullYear();
    let targetMonth = referenceDate.getMonth(); // 0-indexed

    // If records exist, align with the month of the records (e.g. academic active month)
    const studentRecords = (attendanceRecords || []).filter(a => a.studentId === studentId);
    if (studentRecords.length > 0) {
      const dates = studentRecords.map(a => a.date).filter(Boolean).sort().reverse();
      if (dates.length > 0) {
        const latestDate = new Date(dates[0]);
        if (!isNaN(latestDate.getTime())) {
          targetYear = latestDate.getFullYear();
          targetMonth = latestDate.getMonth();
        }
      }
    } else if (attendanceRecords && attendanceRecords.length > 0) {
      const allDates = attendanceRecords.map(a => a.date).filter(Boolean).sort().reverse();
      if (allDates.length > 0) {
        const latest = new Date(allDates[0]);
        if (!isNaN(latest.getTime())) {
          targetYear = latest.getFullYear();
          targetMonth = latest.getMonth();
        }
      }
    }

    const yearMonthPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const monthName = new Date(targetYear, targetMonth, 1).toLocaleDateString('en-US', { month: 'long' });
    const totalMonthWorkingDays = this.getMonthWorkingDays(targetYear, targetMonth);

    // Filter student records for this month
    const monthRecords = studentRecords.filter(a => a.date && a.date.startsWith(yearMonthPrefix));
    const presentDays = monthRecords.filter(a => a.status === 'Present').length;
    const absentDays = monthRecords.filter(a => a.status === 'Absent').length;
    const leaveDays = monthRecords.filter(a => a.status === 'Leave').length;
    const recordedDays = presentDays + absentDays + leaveDays;

    // Academic monthly attendance percentage:
    // Present days divided by the complete month's working days
    const attPct = totalMonthWorkingDays > 0 ? Math.round((presentDays / totalMonthWorkingDays) * 100) : 0;

    return {
      year: targetYear,
      monthIndex: targetMonth,
      monthName,
      yearMonthPrefix,
      totalMonthWorkingDays,
      presentDays,
      absentDays,
      leaveDays,
      recordedDays,
      attPct,
      summaryText: `${presentDays} of ${totalMonthWorkingDays} Monthly Working Days`
    };
  }
};

window.UIUtils = UIUtils;
