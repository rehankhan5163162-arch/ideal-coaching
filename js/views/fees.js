/**
 * Ideal Coaching Center - Fee Management System
 * Multi-Month Fee Collection, Admin-Controlled Late Fee Fine System,
 * Exactly 10-Digit Receipts, Send Receipt to Student, and Print
 */

const FeesView = {
  currentStudent: null,
  currentFeeRecord: null,
  selectedFeeIds: new Set(),

  /**
   * Render Fee Management view for an Admin or Super Admin
   */
  async render(container, selectedStudentId = null) {
    const students = await window.FirebaseService.getCollection('students');
    const settings = await window.FirebaseService.getSystemSettings();
    const activeYear = settings.activeAcademicYear || '2026-2027';

    let activeStudent = null;
    if (selectedStudentId) {
      activeStudent = students.find(s => s.id === selectedStudentId);
    }
    if (!activeStudent && students.length > 0) {
      activeStudent = students[0];
    }
    this.currentStudent = activeStudent;
    this.selectedFeeIds.clear();

    container.innerHTML = `
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">Fee Management System</h2>
            <span class="data-card-subtitle">Active Academic Year: <strong>${activeYear}</strong> • Ideal Coaching Center</span>
          </div>
          <div class="data-card-actions">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <label for="fee-student-selector" style="font-size: 0.825rem; font-weight: 600; color: var(--slate-700);">Select Student:</label>
              <select id="fee-student-selector" class="filter-select" style="min-width: 260px;">
                ${students.map(s => `
                  <option value="${s.id}" ${activeStudent && activeStudent.id === s.id ? 'selected' : ''}>
                    Roll ${s.rollNumber} - ${s.fullName} (${s.class} ${s.group})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <div style="padding: 1.5rem;" id="fee-student-details-container">
          ${activeStudent ? this.renderStudentFeeSchedule(activeStudent) : '<div class="table-empty-state"><p>No students available.</p></div>'}
        </div>
      </div>
    `;

    // Bind student dropdown change listener
    const selector = container.querySelector('#fee-student-selector');
    if (selector) {
      selector.onchange = async (e) => {
        const studentId = e.target.value;
        await window.GlobalLoader.wrap(async () => {
          const st = students.find(s => s.id === studentId);
          this.currentStudent = st;
          this.selectedFeeIds.clear();
          const detailsContainer = container.querySelector('#fee-student-details-container');
          detailsContainer.innerHTML = this.renderStudentFeeSchedule(st);
          this.bindScheduleEvents(container);
        }, 'Loading student 12-month fee schedule...', 'Ideal Coaching Center');
      };
    }

    this.bindScheduleEvents(container);
  },

  /**
   * HTML markup for 12-month schedule with Multi-Month Selection & Action Toolbar
   */
  renderStudentFeeSchedule(student) {
    const allFees = window.FirebaseService.mockData.fees ? Object.values(window.FirebaseService.mockData.fees) : [];
    const studentFees = allFees
      .filter(f => f.studentId === student.id)
      .sort((a, b) => (Number(a.monthOrder) || 0) - (Number(b.monthOrder) || 0));

    // Summary calculations
    const totalExpected = studentFees.reduce((acc, f) => acc + (Number(f.expectedAmount) || 0), 0);
    const totalPaid = studentFees.reduce((acc, f) => acc + (Number(f.paidAmount) || 0), 0);
    const totalPending = totalExpected - totalPaid;
    const paidMonthsCount = studentFees.filter(f => f.status === 'Paid').length;
    const pendingFees = studentFees.filter(f => f.status === 'Pending');

    // Keep selected IDs valid for this student
    const validPendingIds = new Set(pendingFees.map(f => f.id));
    for (const id of this.selectedFeeIds) {
      if (!validPendingIds.has(id)) this.selectedFeeIds.delete(id);
    }

    const selectedCount = this.selectedFeeIds.size;
    const selectedBaseTotal = Array.from(this.selectedFeeIds).reduce((acc, id) => {
      const f = studentFees.find(item => item.id === id);
      return acc + (Number(f?.expectedAmount) || 3000);
    }, 0);

    return `
      <!-- Student Summary Banner -->
      <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div class="user-avatar" style="width: 48px; height: 48px; font-size: 1.25rem;">
            ${student.fullName.charAt(0)}
          </div>
          <div>
            <h3 style="font-size: 1.2rem; margin-bottom: 0.15rem;">${student.fullName}</h3>
            <p style="font-size: 0.8rem; color: var(--slate-600);">
              Father: <strong>${student.fatherName}</strong> • Roll No: <strong>${student.rollNumber}</strong> • Class: <strong>${student.class} (${student.group})</strong>
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <div style="text-align: right;">
            <div style="font-size: 0.725rem; font-weight: 700; color: var(--slate-500); text-transform: uppercase;">Total Collected</div>
            <div style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--success-600);">${window.UIUtils.formatCurrency(totalPaid)}</div>
          </div>
          <div style="text-align: right; padding-left: 1rem; border-left: 1px solid var(--border-color);">
            <div style="font-size: 0.725rem; font-weight: 700; color: var(--slate-500); text-transform: uppercase;">Pending Balance</div>
            <div style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 800; color: var(--warning-600);">${window.UIUtils.formatCurrency(totalPending)}</div>
          </div>
          <div style="text-align: right; padding-left: 1rem; border-left: 1px solid var(--border-color);">
            <div style="font-size: 0.725rem; font-weight: 700; color: var(--slate-500); text-transform: uppercase;">Status</div>
            <span class="badge ${paidMonthsCount >= 9 ? 'badge-paid' : 'badge-pending'}" style="margin-top: 0.2rem;">
              ${paidMonthsCount} of 12 Months Cleared
            </span>
          </div>
        </div>
      </div>

      <!-- Multi-Month Payment Action Toolbar -->
      ${pendingFees.length > 0 ? `
        <div class="multi-month-toolbar" id="multi-month-action-toolbar">
          <div class="multi-month-toolbar-left">
            <span style="font-size: 0.825rem; font-weight: 700; color: var(--slate-700); text-transform: uppercase; letter-spacing: 0.03em;">
              Multi-Month Collection:
            </span>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-select-all-pending">
              Select All Pending (${pendingFees.length})
            </button>
            ${pendingFees.length >= 3 ? `
              <button type="button" class="btn btn-secondary btn-sm" id="btn-select-next-3">
                Select Next 3 Months
              </button>
            ` : ''}
            ${pendingFees.length >= 6 ? `
              <button type="button" class="btn btn-secondary btn-sm" id="btn-select-next-6">
                Select Next 6 Months
              </button>
            ` : ''}
            <button type="button" class="btn btn-outline-danger btn-sm" id="btn-clear-selection" style="${selectedCount > 0 ? '' : 'display: none;'}">
              Clear Selection
            </button>
          </div>

          <div class="multi-month-toolbar-right">
            <div class="multi-month-counter-badge">
              <span>Selected:</span>
              <strong id="multi-month-count-text">${selectedCount} Month${selectedCount !== 1 ? 's' : ''}</strong>
            </div>
            <div class="multi-month-total-pill">
              Base Tuition: <span id="multi-month-total-text" style="color: var(--primary-700); font-weight: 800;">${window.UIUtils.formatCurrency(selectedBaseTotal)}</span>
            </div>
            <button type="button" class="btn btn-success" id="btn-pay-selected-months" ${selectedCount > 0 ? '' : 'disabled'}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              Pay Selected (${selectedCount})
            </button>
          </div>
        </div>
      ` : ''}

      <div style="margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
        <h3 style="font-size: 1.1rem; font-weight: 700;">12-Month Academic Fee Schedule</h3>
        <span style="font-size: 0.8rem; color: var(--slate-500);">Chronological 12 Months • Ideal Coaching Center</span>
      </div>

      <!-- 12 Months Cards Grid -->
      <div class="fee-schedule-grid">
        ${studentFees.map(fee => {
          const isSelected = this.selectedFeeIds.has(fee.id);
          return `
            <div class="fee-month-card ${fee.status === 'Paid' ? 'is-paid' : 'is-pending'} ${isSelected ? 'is-selected' : ''}" data-fee-id="${fee.id}">
              <div class="fee-month-header">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="fee-month-title">${fee.month}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  ${fee.status === 'Pending' ? `
                    <label class="fee-select-box" style="display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; font-size: 0.775rem; font-weight: 700; color: var(--primary-700); background: #ffffff; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--primary-200);">
                      <input type="checkbox" class="chk-fee-select" data-fee-id="${fee.id}" ${isSelected ? 'checked' : ''} style="accent-color: var(--primary-600); width: 15px; height: 15px; cursor: pointer;" />
                      <span>Select</span>
                    </label>
                  ` : ''}
                  <span class="badge ${fee.status === 'Paid' ? 'badge-paid' : 'badge-pending'}">
                    <span class="badge-dot"></span>
                    ${fee.status}
                  </span>
                </div>
              </div>

              <div class="fee-amount-row">
                <span class="fee-expected-label">Expected: ${window.UIUtils.formatCurrency(fee.expectedAmount)}</span>
                <span class="fee-amount-value" style="color: ${fee.status === 'Paid' ? 'var(--success-600)' : 'var(--slate-800)'}">
                  ${fee.status === 'Paid' ? window.UIUtils.formatCurrency(fee.paidAmount) : window.UIUtils.formatCurrency(fee.expectedAmount)}
                </span>
              </div>

              <div class="fee-meta-list">
                <div>Due Date: <strong>${fee.dueDate}</strong></div>
                ${fee.status === 'Paid' ? `
                  <div>Paid Date: <strong>${window.UIUtils.formatDate(fee.paymentDate)}</strong></div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.2rem;">
                    <span>Receipt No:</span>
                    <span class="fee-receipt-badge">#${fee.receiptNumber}</span>
                  </div>
                ` : `
                  <div style="color: var(--warning-600); font-weight: 600;">Payment Pending</div>
                `}
              </div>

              <div class="fee-actions-row">
                ${fee.status === 'Pending' ? `
                  <button type="button" class="btn btn-primary btn-sm btn-mark-paid" data-fee-id="${fee.id}" style="flex: 1;">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Pay This Month
                  </button>
                ` : `
                  <button type="button" class="btn btn-secondary btn-sm btn-view-receipt" data-receipt-num="${fee.receiptNumber}" data-fee-id="${fee.id}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    View Receipt
                  </button>
                  <button type="button" class="btn ${fee.receiptAvailableToStudent ? 'btn-success' : 'btn-outline-primary'} btn-sm btn-send-receipt" data-fee-id="${fee.id}" title="${fee.receiptAvailableToStudent ? 'Receipt is already visible to student' : 'Send receipt reference to student portal'}">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    ${fee.receiptAvailableToStudent ? 'Receipt Sent ✓' : 'Send to Student'}
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /**
   * Bind event listeners for schedule checkboxes, toolbar actions, and buttons
   */
  bindScheduleEvents(container) {
    const student = this.currentStudent;
    if (!student) return;

    const allFees = window.FirebaseService.mockData.fees ? Object.values(window.FirebaseService.mockData.fees) : [];
    const studentFees = allFees
      .filter(f => f.studentId === student.id)
      .sort((a, b) => (Number(a.monthOrder) || 0) - (Number(b.monthOrder) || 0));
    const pendingFees = studentFees.filter(f => f.status === 'Pending');

    const updateToolbarUI = () => {
      const count = this.selectedFeeIds.size;
      const countText = container.querySelector('#multi-month-count-text');
      const totalText = container.querySelector('#multi-month-total-text');
      const payBtn = container.querySelector('#btn-pay-selected-months');
      const clearBtn = container.querySelector('#btn-clear-selection');

      const selectedBaseTotal = Array.from(this.selectedFeeIds).reduce((acc, id) => {
        const f = studentFees.find(item => item.id === id);
        return acc + (Number(f?.expectedAmount) || 3000);
      }, 0);

      if (countText) countText.textContent = `${count} Month${count !== 1 ? 's' : ''}`;
      if (totalText) totalText.textContent = window.UIUtils.formatCurrency(selectedBaseTotal);
      if (payBtn) {
        payBtn.disabled = count === 0;
        payBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
          Pay Selected (${count})
        `;
      }
      if (clearBtn) {
        clearBtn.style.display = count > 0 ? 'inline-flex' : 'none';
      }
    };

    // Checkbox change handlers
    container.querySelectorAll('.chk-fee-select').forEach(chk => {
      chk.onchange = (e) => {
        const feeId = chk.getAttribute('data-fee-id');
        const card = container.querySelector(`.fee-month-card[data-fee-id="${feeId}"]`);
        if (chk.checked) {
          this.selectedFeeIds.add(feeId);
          if (card) card.classList.add('is-selected');
        } else {
          this.selectedFeeIds.delete(feeId);
          if (card) card.classList.remove('is-selected');
        }
        updateToolbarUI();
      };
    });

    // "Select All Pending" button
    const btnSelectAll = container.querySelector('#btn-select-all-pending');
    if (btnSelectAll) {
      btnSelectAll.onclick = () => {
        pendingFees.forEach(f => this.selectedFeeIds.add(f.id));
        container.querySelectorAll('.chk-fee-select').forEach(chk => chk.checked = true);
        container.querySelectorAll('.fee-month-card.is-pending').forEach(c => c.classList.add('is-selected'));
        updateToolbarUI();
      };
    }

    // "Select Next 3 Months" button
    const btnSelect3 = container.querySelector('#btn-select-next-3');
    if (btnSelect3) {
      btnSelect3.onclick = () => {
        this.selectedFeeIds.clear();
        container.querySelectorAll('.chk-fee-select').forEach(chk => chk.checked = false);
        container.querySelectorAll('.fee-month-card.is-pending').forEach(c => c.classList.remove('is-selected'));

        pendingFees.slice(0, 3).forEach(f => {
          this.selectedFeeIds.add(f.id);
          const chk = container.querySelector(`.chk-fee-select[data-fee-id="${f.id}"]`);
          if (chk) chk.checked = true;
          const card = container.querySelector(`.fee-month-card[data-fee-id="${f.id}"]`);
          if (card) card.classList.add('is-selected');
        });
        updateToolbarUI();
      };
    }

    // "Select Next 6 Months" button
    const btnSelect6 = container.querySelector('#btn-select-next-6');
    if (btnSelect6) {
      btnSelect6.onclick = () => {
        this.selectedFeeIds.clear();
        container.querySelectorAll('.chk-fee-select').forEach(chk => chk.checked = false);
        container.querySelectorAll('.fee-month-card.is-pending').forEach(c => c.classList.remove('is-selected'));

        pendingFees.slice(0, 6).forEach(f => {
          this.selectedFeeIds.add(f.id);
          const chk = container.querySelector(`.chk-fee-select[data-fee-id="${f.id}"]`);
          if (chk) chk.checked = true;
          const card = container.querySelector(`.fee-month-card[data-fee-id="${f.id}"]`);
          if (card) card.classList.add('is-selected');
        });
        updateToolbarUI();
      };
    }

    // "Clear Selection" button
    const btnClear = container.querySelector('#btn-clear-selection');
    if (btnClear) {
      btnClear.onclick = () => {
        this.selectedFeeIds.clear();
        container.querySelectorAll('.chk-fee-select').forEach(chk => chk.checked = false);
        container.querySelectorAll('.fee-month-card.is-pending').forEach(c => c.classList.remove('is-selected'));
        updateToolbarUI();
      };
    }

    // "Pay Selected Months" button
    const btnPaySelected = container.querySelector('#btn-pay-selected-months');
    if (btnPaySelected) {
      btnPaySelected.onclick = () => {
        if (this.selectedFeeIds.size > 0) {
          this.openPaymentModal(Array.from(this.selectedFeeIds));
        }
      };
    }

    // Single "Pay This Month" buttons
    container.querySelectorAll('.btn-mark-paid').forEach(btn => {
      btn.onclick = () => {
        const feeId = btn.getAttribute('data-fee-id');
        this.openPaymentModal([feeId]);
      };
    });

    // "View Receipt" button
    container.querySelectorAll('.btn-view-receipt').forEach(btn => {
      btn.onclick = () => {
        const rcptNum = btn.getAttribute('data-receipt-num');
        const feeId = btn.getAttribute('data-fee-id');
        this.openReceiptModal(rcptNum, feeId);
      };
    });

    // "Send Receipt to Student Account" button
    container.querySelectorAll('.btn-send-receipt').forEach(btn => {
      btn.onclick = async () => {
        const feeId = btn.getAttribute('data-fee-id');
        await window.GlobalLoader.wrap(async () => {
          await window.FirebaseService.sendReceiptToStudent(feeId);
        }, 'Sending official receipt to student account...', 'Ideal Coaching Center');

        window.UIUtils.showToast('success', 'Receipt Delivered', "Receipt sent to the student's account successfully.");
        // Refresh schedule view
        if (this.currentStudent) {
          const detailsContainer = container.querySelector('#fee-student-details-container');
          if (detailsContainer) {
            detailsContainer.innerHTML = this.renderStudentFeeSchedule(this.currentStudent);
            this.bindScheduleEvents(container);
          }
        }
      };
    });
  },

  /**
   * Open Payment Modal for Single or Multi-Month Tuition Collection with Admin-Controlled Late Fee
   */
  async openPaymentModal(feeIds) {
    const targetIds = Array.isArray(feeIds) ? feeIds : [feeIds];
    if (targetIds.length === 0) return;

    const allFees = await window.FirebaseService.getCollection('fees');
    const fees = targetIds.map(id => allFees.find(f => f.id === id)).filter(Boolean);
    if (fees.length === 0) return;

    // Chronological order
    fees.sort((a, b) => (Number(a.monthOrder) || 0) - (Number(b.monthOrder) || 0));
    const primaryFee = fees[0];

    // System Settings for late fee fine
    const settings = await window.FirebaseService.getSystemSettings();
    const lateFeeEnabled = settings.lateFeeEnabled !== false;
    const defaultLateFee = Number(settings.defaultLateFee !== undefined ? settings.defaultLateFee : 200);
    const feeDueDay = Number(settings.feeDueDay || 10);

    const baseTuition = fees.reduce((sum, f) => sum + (Number(f.expectedAmount) || 3000), 0);
    const todayDate = new Date().toISOString().split('T')[0];

    // Determine overdue status
    // If today is past the due day or month is in the past
    const now = new Date();
    const currentMonthIndex = now.getMonth(); // 0-indexed
    const currentDay = now.getDate();
    const monthsList = window.UIUtils.getMonthsList();

    const isAnyOverdue = fees.some(f => {
      const mIdx = monthsList.indexOf(f.month);
      if (mIdx < 0) return false;
      if (mIdx < currentMonthIndex) return true;
      if (mIdx === currentMonthIndex && currentDay > feeDueDay) return true;
      return false;
    });

    const shouldInitialApplyLateFee = isAnyOverdue && lateFeeEnabled && defaultLateFee > 0;
    const initialFineAmount = shouldInitialApplyLateFee ? defaultLateFee : 0;
    const initialGrandTotal = baseTuition + initialFineAmount;

    let modal = document.getElementById('payment-entry-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'payment-entry-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const monthsSummary = fees.map(f => f.month).join(', ');

    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <div class="modal-title-group">
            <div class="modal-title-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
            </div>
            <div>
              <h3 class="modal-title">
                ${fees.length > 1 ? `Record Multi-Month Payment (${fees.length} Months)` : `Record Fee Payment - ${primaryFee.month}`}
              </h3>
              <p style="font-size: 0.75rem; color: var(--slate-500);">Ideal Coaching Center • Official Fee Collection</p>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="btn-close-payment-modal">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Student & Months Breakdown Card -->
          <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; font-size: 0.85rem; margin-bottom: 0.85rem;">
              <div>Student: <strong>${primaryFee.studentName}</strong></div>
              <div>Roll Number: <strong>#${primaryFee.rollNumber}</strong></div>
              <div>Father Name: <strong>${primaryFee.fatherName}</strong></div>
              <div>Class & Group: <strong>${primaryFee.class} (${primaryFee.group})</strong></div>
            </div>

            <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--slate-500); text-transform: uppercase;">
                Months Covered (${fees.length} Month${fees.length > 1 ? 's' : ''}):
              </span>
              <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.4rem;">
                ${fees.map(f => `
                  <span class="badge badge-primary" style="font-size: 0.8rem; padding: 0.3rem 0.65rem;">
                    ${f.month} (${window.UIUtils.formatCurrency(f.expectedAmount)})
                  </span>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Financial Calculation & Late Fee Control -->
          <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 0.95rem; font-weight: 600; padding-bottom: 0.75rem; border-bottom: 1px solid var(--slate-200);">
              <span>Base Tuition Fee (${fees.length} Month${fees.length > 1 ? 's' : ''}):</span>
              <span style="font-family: var(--font-heading); font-size: 1.2rem; color: var(--slate-900); font-weight: 800;">
                ${window.UIUtils.formatCurrency(baseTuition)}
              </span>
            </div>

            <!-- Admin-Controlled Late Fee Fine Panel -->
            <div style="margin-top: 1rem; padding: 1rem; border-radius: var(--radius-md); background: #fffbeb; border: 1px solid #fde68a;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #92400e; cursor: pointer; font-size: 0.925rem;">
                  <input type="checkbox" id="pay-toggle-late-fee" ${shouldInitialApplyLateFee ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #d97706; cursor: pointer;" />
                  <span>Apply Late Fee Fine / Penalty</span>
                </label>
                <span class="badge" style="background: #fef3c7; color: #b45309; font-weight: 600; font-size: 0.75rem;">
                  Admin Discretion (Waive or Apply)
                </span>
              </div>

              <div id="late-fee-details-row" style="display: ${shouldInitialApplyLateFee ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.75rem;">
                <div>
                  <label style="font-size: 0.75rem; font-weight: 700; color: #78350f; display: block; margin-bottom: 0.25rem;">
                    Late Fine Amount (PKR)
                  </label>
                  <input type="number" id="pay-late-fee-amount" class="form-control" value="${defaultLateFee}" min="0" step="50" style="background: #ffffff; border-color: #fcd34d;" />
                  <small style="color: #92400e; font-size: 0.7rem;">Admin can adjust fine up/down or uncheck to waive</small>
                </div>
                <div>
                  <label style="font-size: 0.75rem; font-weight: 700; color: #78350f; display: block; margin-bottom: 0.25rem;">
                    Fine Remarks / Reason
                  </label>
                  <input type="text" id="pay-late-fee-reason" class="form-control" value="Overdue Payment Fine" placeholder="e.g. Delayed past 10th" style="background: #ffffff; border-color: #fcd34d;" />
                </div>
              </div>

              <div id="late-fee-waived-alert" style="display: ${!shouldInitialApplyLateFee ? 'flex' : 'none'}; align-items: center; gap: 0.4rem; color: #059669; font-weight: 600; font-size: 0.8rem; margin-top: 0.5rem;">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Late fee fine is WAIVED by Admin (PKR 0).
              </div>
            </div>

            <!-- Grand Total Breakdown Banner -->
            <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1.15rem; margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <span style="font-size: 0.725rem; text-transform: uppercase; font-weight: 700; color: var(--slate-500);">
                  Grand Total Payable
                </span>
                <div style="font-size: 0.8rem; color: var(--slate-600);" id="pay-formula-text">
                  Base Tuition (${window.UIUtils.formatCurrency(baseTuition)}) ${shouldInitialApplyLateFee ? `+ Late Fine (${window.UIUtils.formatCurrency(defaultLateFee)})` : '+ Late Fine: Waived (PKR 0)'}
                </div>
              </div>
              <div style="font-family: var(--font-heading); font-size: 1.6rem; font-weight: 800; color: var(--primary-700);" id="pay-grand-total-display">
                ${window.UIUtils.formatCurrency(initialGrandTotal)}
              </div>
            </div>
          </div>

          <!-- Payment Metadata Form -->
          <form id="payment-process-form" class="form-grid">
            <div class="form-group">
              <label class="form-label">Payment Date <span class="req-star">*</span></label>
              <input type="date" id="pay-input-date" class="form-control" value="${todayDate}" required />
            </div>

            <div class="form-group">
              <label class="form-label">Payment Mode</label>
              <select id="pay-input-mode" class="form-control">
                <option value="Cash Counter">Cash Counter</option>
                <option value="Online Bank Transfer">Online Bank Transfer</option>
                <option value="EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div class="form-group form-col-full">
              <label class="form-label">Payment Remarks / Cashier Notes</label>
              <textarea id="pay-input-notes" class="form-control" placeholder="Optional cashier note or bank slip reference">Tuition fee paid for ${monthsSummary}</textarea>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-cancel-payment">Cancel</button>
          <button type="button" class="btn btn-success" id="btn-confirm-payment">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span id="btn-confirm-text">Confirm & Generate 10-Digit Receipt (${window.UIUtils.formatCurrency(initialGrandTotal)})</span>
          </button>
        </div>
      </div>
    `;

    window.UIUtils.openModal('payment-entry-modal');

    // Live reactive calculation
    const lateFeeToggle = modal.querySelector('#pay-toggle-late-fee');
    const lateFeeDetailsRow = modal.querySelector('#late-fee-details-row');
    const lateFeeWaivedAlert = modal.querySelector('#late-fee-waived-alert');
    const lateFeeAmountInput = modal.querySelector('#pay-late-fee-amount');
    const grandTotalDisplay = modal.querySelector('#pay-grand-total-display');
    const formulaText = modal.querySelector('#pay-formula-text');
    const confirmBtnText = modal.querySelector('#btn-confirm-text');

    const recalculateTotal = () => {
      const isLateApplied = lateFeeToggle.checked;
      const lateAmount = isLateApplied ? Math.max(0, Number(lateFeeAmountInput.value) || 0) : 0;
      const grandTotal = baseTuition + lateAmount;

      lateFeeDetailsRow.style.display = isLateApplied ? 'grid' : 'none';
      lateFeeWaivedAlert.style.display = isLateApplied ? 'none' : 'flex';

      grandTotalDisplay.textContent = window.UIUtils.formatCurrency(grandTotal);
      formulaText.textContent = `Base Tuition (${window.UIUtils.formatCurrency(baseTuition)}) ${isLateApplied && lateAmount > 0 ? `+ Late Fine (${window.UIUtils.formatCurrency(lateAmount)})` : '+ Late Fine: Waived (PKR 0)'}`;
      confirmBtnText.textContent = `Confirm & Generate 10-Digit Receipt (${window.UIUtils.formatCurrency(grandTotal)})`;
    };

    lateFeeToggle.onchange = recalculateTotal;
    lateFeeAmountInput.oninput = recalculateTotal;

    modal.querySelector('#btn-close-payment-modal').onclick = () => window.UIUtils.closeModal('payment-entry-modal');
    modal.querySelector('#btn-cancel-payment').onclick = () => window.UIUtils.closeModal('payment-entry-modal');

    modal.querySelector('#btn-confirm-payment').onclick = async () => {
      const dateInput = modal.querySelector('#pay-input-date');
      const modeInput = modal.querySelector('#pay-input-mode');
      const notesInput = modal.querySelector('#pay-input-notes');
      const reasonInput = modal.querySelector('#pay-late-fee-reason');

      const applyLate = lateFeeToggle.checked;
      const lateAmt = applyLate ? Math.max(0, Number(lateFeeAmountInput.value) || 0) : 0;

      window.UIUtils.closeModal('payment-entry-modal');

      let receiptResult = null;
      await window.GlobalLoader.wrap(async () => {
        const paymentData = {
          applyLateFee: applyLate,
          lateFeeAmount: lateAmt,
          lateFeeReason: reasonInput ? reasonInput.value.trim() : '',
          paymentDate: dateInput.value || todayDate,
          paymentMode: modeInput.value,
          notes: `${modeInput.value} - ${notesInput.value.trim()}`
        };

        receiptResult = await window.FirebaseService.processMultiMonthFeePayment(targetIds, paymentData);
      }, `Processing payment & generating unique 10-digit receipt for ${monthsSummary}...`, 'Ideal Coaching Center');

      window.UIUtils.showToast(
        'success',
        'Fee Payment Successful',
        `Successfully generated official 10-digit receipt #${receiptResult.receipt.receiptNumber} covering ${fees.length} month(s).`
      );

      this.selectedFeeIds.clear();

      // Re-render schedule view
      const container = document.getElementById('view-container');
      if (container) {
        await this.render(container, primaryFee.studentId);
      }

      // Automatically open the official 10-digit receipt for review/printing
      if (receiptResult && receiptResult.receipt) {
        this.openReceiptModal(receiptResult.receipt.receiptNumber);
      }
    };
  },

  /**
   * Open high-fidelity official Ideal Coaching Center Receipt (Single or Multi-Month)
   */
  async openReceiptModal(receiptNumber, feeId = null) {
    let receipt = null;
    const receipts = await window.FirebaseService.getCollection('receipts');
    if (receiptNumber) {
      receipt = receipts.find(r => r.receiptNumber === String(receiptNumber));
    }
    if (!receipt && feeId) {
      receipt = receipts.find(r => r.feeId === feeId || (Array.isArray(r.feeIds) && r.feeIds.includes(feeId)));
    }
    if (!receipt) {
      window.UIUtils.showToast('error', 'Receipt Not Found', 'Could not locate the requested receipt record.');
      return;
    }

    let modal = document.getElementById('receipt-view-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'receipt-view-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const settings = await window.FirebaseService.getSystemSettings();
    const monthsCovered = Array.isArray(receipt.months) && receipt.months.length > 0 
      ? receipt.months 
      : [receipt.month];
    const isMultiMonth = monthsCovered.length > 1;
    const perMonthBase = Math.round((Number(receipt.baseTuitionAmount) || Number(receipt.expectedAmount) || 3000) / monthsCovered.length);

    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <div class="modal-title-group">
            <img src="assets/logo.svg" alt="Ideal Coaching Center" style="width: 28px; height: 28px;" />
            <h3 class="modal-title">Official Fee Receipt - Ideal Coaching Center</h3>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-print-receipt">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print Receipt
            </button>
            <button type="button" class="modal-close-btn" id="btn-close-receipt-modal">&times;</button>
          </div>
        </div>

        <div class="modal-body" style="background: #f1f5f9; padding: 1.5rem;">
          <div class="printable-receipt-wrapper" id="printable-receipt-card">
            <div class="receipt-watermark">IDEAL COACHING</div>

            <div class="receipt-header">
              <div class="receipt-brand-group">
                <img src="assets/logo.svg" alt="Ideal Coaching Center" class="receipt-logo" />
                <div>
                  <div class="receipt-org-name">Ideal Coaching Center</div>
                  <div class="receipt-org-sub">Excellence in Coaching & Board Exam Preparation</div>
                  <div style="font-size: 0.725rem; color: #64748b; margin-top: 0.15rem;">
                    ${settings.address} • Ph: ${settings.phone}
                  </div>
                </div>
              </div>

              <div class="receipt-title-badge">
                <span class="receipt-badge-title">OFFICIAL FEE RECEIPT</span>
                <span class="receipt-number-tag">Receipt #: ${receipt.receiptNumber}</span>
                <span class="receipt-date-tag">Date: ${window.UIUtils.formatDate(receipt.receiptDate || receipt.paymentDate)}</span>
              </div>
            </div>

            <div class="receipt-grid">
              <div class="receipt-field">
                <span class="receipt-label">Student Full Name</span>
                <span class="receipt-val">${receipt.studentName}</span>
              </div>
              <div class="receipt-field">
                <span class="receipt-label">Father's Name</span>
                <span class="receipt-val">${receipt.fatherName}</span>
              </div>
              <div class="receipt-field">
                <span class="receipt-label">Roll Number</span>
                <span class="receipt-val" style="font-family: var(--font-mono); color: #1e3a8a;">#${receipt.rollNumber}</span>
              </div>
              <div class="receipt-field">
                <span class="receipt-label">Class & Group</span>
                <span class="receipt-val">${receipt.class} - ${receipt.group}</span>
              </div>
              <div class="receipt-field">
                <span class="receipt-label">Contact Number</span>
                <span class="receipt-val">${receipt.contactNumber}</span>
              </div>
              <div class="receipt-field">
                <span class="receipt-label">Academic Year</span>
                <span class="receipt-val">${receipt.academicYear}</span>
              </div>
            </div>

            <table class="receipt-table">
              <thead>
                <tr>
                  <th>Description / Fee Head</th>
                  <th>Fee Month</th>
                  <th>Due Date</th>
                  <th class="text-right">Expected</th>
                  <th class="text-right">Paid Amount</th>
                </tr>
              </thead>
              <tbody>
                ${monthsCovered.map(m => `
                  <tr>
                    <td>Monthly Coaching & Tuition Fee</td>
                    <td><strong>${m}</strong></td>
                    <td>10th ${m}</td>
                    <td class="text-right">${window.UIUtils.formatCurrency(perMonthBase)}</td>
                    <td class="text-right" style="font-weight: 700; color: #059669;">${window.UIUtils.formatCurrency(perMonthBase)}</td>
                  </tr>
                `).join('')}

                ${receipt.lateFeeAmount > 0 && !receipt.lateFeeWaived ? `
                  <tr style="background: #fffbeb;">
                    <td>
                      <strong>Late Fee Fine / Penalty</strong>
                      <div style="font-size: 0.725rem; color: #78350f;">Reason: ${receipt.lateFeeReason || 'Overdue Payment Fine'}</div>
                    </td>
                    <td>${receipt.month}</td>
                    <td>Overdue</td>
                    <td class="text-right">${window.UIUtils.formatCurrency(receipt.lateFeeAmount)}</td>
                    <td class="text-right" style="font-weight: 700; color: #b45309;">${window.UIUtils.formatCurrency(receipt.lateFeeAmount)}</td>
                  </tr>
                ` : `
                  <tr style="background: #f0fdf4;">
                    <td>
                      <em>Late Fee Fine (Waived by Administration)</em>
                      <div style="font-size: 0.725rem; color: #059669;">Fine waived by cashier / administration authority</div>
                    </td>
                    <td>${receipt.month}</td>
                    <td>Waived</td>
                    <td class="text-right">PKR 0</td>
                    <td class="text-right" style="font-weight: 700; color: #059669;">PKR 0</td>
                  </tr>
                `}

                ${isMultiMonth ? `
                  <tr style="background: #f8fafc; font-weight: 600;">
                    <td colspan="4" class="text-right" style="color: #64748b;">Subtotal (Base Tuition - ${monthsCovered.length} Months):</td>
                    <td class="text-right" style="color: #0f172a;">${window.UIUtils.formatCurrency(receipt.baseTuitionAmount || (perMonthBase * monthsCovered.length))}</td>
                  </tr>
                ` : ''}

                <tr class="receipt-total-row">
                  <td colspan="4" class="text-right">TOTAL AMOUNT PAID:</td>
                  <td class="text-right">${window.UIUtils.formatCurrency(receipt.paidAmount)}</td>
                </tr>
              </tbody>
            </table>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
              <div>
                <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Payment Mode & Remarks:</span>
                <p style="font-size: 0.85rem; color: #0f172a; font-weight: 500;">${receipt.notes || 'Tuition Fee Paid'}</p>
              </div>
              <div class="receipt-status-stamp">PAID</div>
            </div>

            <div class="receipt-footer-signatures">
              <div class="signature-line">
                <div class="signature-space"></div>
                <span class="signature-label">Student / Parent Signature</span>
              </div>
              <div class="signature-line">
                <div class="signature-space"></div>
                <span class="signature-label">Authorized Signatory / Seal</span>
                <span style="font-size: 0.675rem; color: #64748b; margin-top: 0.2rem;">Ideal Coaching Center</span>
              </div>
            </div>

            <div class="receipt-notice">
              This is an official computer-generated receipt issued by Ideal Coaching Center. Valid without alterations.
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-close-receipt-bottom">Close</button>
          <button type="button" class="btn btn-primary" id="btn-print-receipt-bottom">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print / Save as PDF
          </button>
        </div>
      </div>
    `;

    window.UIUtils.openModal('receipt-view-modal');

    const handlePrint = () => {
      window.print();
    };

    modal.querySelector('#btn-close-receipt-modal').onclick = () => window.UIUtils.closeModal('receipt-view-modal');
    modal.querySelector('#btn-close-receipt-bottom').onclick = () => window.UIUtils.closeModal('receipt-view-modal');
    modal.querySelector('#btn-print-receipt').onclick = handlePrint;
    modal.querySelector('#btn-print-receipt-bottom').onclick = handlePrint;
  }
};

window.FeesView = FeesView;
