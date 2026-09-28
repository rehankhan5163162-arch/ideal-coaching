/**
 * Ideal Coaching Center - Fee Management System
 * 12-Month Fee Schedule, Payment Modal, Exactly 10-Digit Receipts, Send Receipt, and Print
 */

const FeesView = {
  currentStudent: null,
  currentFeeRecord: null,

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
              <select id="fee-student-selector" class="filter-select" style="min-width: 250px;">
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

    // Bind change listener
    const selector = container.querySelector('#fee-student-selector');
    if (selector) {
      selector.onchange = async (e) => {
        const studentId = e.target.value;
        await window.GlobalLoader.wrap(async () => {
          const st = students.find(s => s.id === studentId);
          this.currentStudent = st;
          const detailsContainer = container.querySelector('#fee-student-details-container');
          detailsContainer.innerHTML = this.renderStudentFeeSchedule(st);
          this.bindScheduleEvents(container);
        }, 'Loading student 12-month fee schedule...', 'Ideal Coaching Center');
      };
    }

    this.bindScheduleEvents(container);
  },

  /**
   * HTML markup for 12-month schedule
   */
  renderStudentFeeSchedule(student) {
    const allFees = window.FirebaseService.mockData.fees ? Object.values(window.FirebaseService.mockData.fees) : [];
    const studentFees = allFees
      .filter(f => f.studentId === student.id)
      .sort((a, b) => a.monthOrder - b.monthOrder);

    // Summary calculations
    const totalExpected = studentFees.reduce((acc, f) => acc + (Number(f.expectedAmount) || 0), 0);
    const totalPaid = studentFees.reduce((acc, f) => acc + (Number(f.paidAmount) || 0), 0);
    const totalPending = totalExpected - totalPaid;
    const paidMonthsCount = studentFees.filter(f => f.status === 'Paid').length;

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

      <div style="margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
        <h3 style="font-size: 1.1rem; font-weight: 700;">12-Month Academic Fee Schedule</h3>
        <span style="font-size: 0.8rem; color: var(--slate-500);">Chronological 12 Months</span>
      </div>

      <!-- 12 Months Cards Grid -->
      <div class="fee-schedule-grid">
        ${studentFees.map(fee => `
          <div class="fee-month-card ${fee.status === 'Paid' ? 'is-paid' : 'is-pending'}" data-fee-id="${fee.id}">
            <div class="fee-month-header">
              <span class="fee-month-title">${fee.month}</span>
              <span class="badge ${fee.status === 'Paid' ? 'badge-paid' : 'badge-pending'}">
                <span class="badge-dot"></span>
                ${fee.status}
              </span>
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
                  Mark as Paid
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
        `).join('')}
      </div>
    `;
  },

  /**
   * Bind Mark as Paid, Send Receipt, and View Receipt buttons
   */
  bindScheduleEvents(container) {
    // Mark as Paid button
    container.querySelectorAll('.btn-mark-paid').forEach(btn => {
      btn.onclick = () => {
        const feeId = btn.getAttribute('data-fee-id');
        this.openPaymentModal(feeId);
      };
    });

    // View Receipt button
    container.querySelectorAll('.btn-view-receipt').forEach(btn => {
      btn.onclick = () => {
        const rcptNum = btn.getAttribute('data-receipt-num');
        const feeId = btn.getAttribute('data-fee-id');
        this.openReceiptModal(rcptNum, feeId);
      };
    });

    // Send Receipt to Student Account button
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
   * Open Payment Modal to input exact paid amount, payment date, notes
   */
  async openPaymentModal(feeId) {
    const fee = await window.FirebaseService.getDocument('fees', feeId);
    if (!fee) return;
    this.currentFeeRecord = fee;

    let modal = document.getElementById('payment-entry-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'payment-entry-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const todayDate = new Date().toISOString().split('T')[0];

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <div class="modal-title-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
            </div>
            <div>
              <h3 class="modal-title">Record Fee Payment</h3>
              <p style="font-size: 0.75rem; color: var(--slate-500);">Ideal Coaching Center • Fee Collection</p>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="btn-close-payment-modal">&times;</button>
        </div>

        <div class="modal-body">
          <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.85rem;">
              <div>Student: <strong>${fee.studentName}</strong></div>
              <div>Roll Number: <strong>${fee.rollNumber}</strong></div>
              <div>Class & Group: <strong>${fee.class} (${fee.group})</strong></div>
              <div>Fee Month: <strong style="color: var(--primary-700);">${fee.month}</strong></div>
            </div>
          </div>

          <form id="payment-process-form" class="form-grid">
            <div class="form-group">
              <label class="form-label">Expected Amount</label>
              <input type="text" class="form-control" value="${window.UIUtils.formatCurrency(fee.expectedAmount)}" disabled />
            </div>

            <div class="form-group">
              <label class="form-label">Paid Amount (PKR) <span class="req-star">*</span></label>
              <input type="number" id="pay-input-amount" class="form-control" value="${fee.expectedAmount}" min="1" step="100" required />
              <span class="form-help">Enter exact amount actually received.</span>
            </div>

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
              <label class="form-label">Payment Notes (Optional)</label>
              <textarea id="pay-input-notes" class="form-control" placeholder="Optional remarks, slip number, or cashier note">Tuition fee paid in full</textarea>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-cancel-payment">Cancel</button>
          <button type="button" class="btn btn-success" id="btn-confirm-payment">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Confirm & Generate 10-Digit Receipt
          </button>
        </div>
      </div>
    `;

    window.UIUtils.openModal('payment-entry-modal');

    modal.querySelector('#btn-close-payment-modal').onclick = () => window.UIUtils.closeModal('payment-entry-modal');
    modal.querySelector('#btn-cancel-payment').onclick = () => window.UIUtils.closeModal('payment-entry-modal');

    modal.querySelector('#btn-confirm-payment').onclick = async () => {
      const amountInput = modal.querySelector('#pay-input-amount');
      const dateInput = modal.querySelector('#pay-input-date');
      const modeInput = modal.querySelector('#pay-input-mode');
      const notesInput = modal.querySelector('#pay-input-notes');

      const paidAmount = Number(amountInput.value);
      if (!paidAmount || paidAmount <= 0) {
        window.UIUtils.showToast('error', 'Invalid Amount', 'Please enter a valid payment amount.');
        amountInput.focus();
        return;
      }

      window.UIUtils.closeModal('payment-entry-modal');

      // Process payment with strict 5-second minimum loader
      await window.GlobalLoader.wrap(async () => {
        const paymentData = {
          paidAmount: paidAmount,
          paymentDate: dateInput.value || todayDate,
          notes: `${modeInput.value} - ${notesInput.value.trim()}`
        };
        const result = await window.FirebaseService.processFeePayment(feeId, paymentData);
        return result;
      }, `Processing payment & generating unique 10-digit receipt for ${fee.month}...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Fee Paid Successfully', `${fee.month} fee marked as paid successfully.`);

      // Re-render schedule
      const container = document.getElementById('view-container');
      if (container) {
        this.render(container, fee.studentId);
      }
    };
  },

  /**
   * Open high-fidelity official Ideal Coaching Center Receipt
   */
  async openReceiptModal(receiptNumber, feeId = null) {
    let receipt = null;
    const receipts = await window.FirebaseService.getCollection('receipts');
    if (receiptNumber) {
      receipt = receipts.find(r => r.receiptNumber === String(receiptNumber));
    }
    if (!receipt && feeId) {
      receipt = receipts.find(r => r.feeId === feeId);
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
                <tr>
                  <td>Monthly Coaching & Tuition Fee</td>
                  <td><strong>${receipt.month}</strong></td>
                  <td>10th ${receipt.month}</td>
                  <td class="text-right">${window.UIUtils.formatCurrency(receipt.expectedAmount)}</td>
                  <td class="text-right" style="font-weight: 700; color: #059669;">${window.UIUtils.formatCurrency(receipt.paidAmount)}</td>
                </tr>
                <tr class="receipt-total-row">
                  <td colspan="4" class="text-right">TOTAL AMOUNT PAID:</td>
                  <td class="text-right">${window.UIUtils.formatCurrency(receipt.paidAmount)}</td>
                </tr>
              </tbody>
            </table>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
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
