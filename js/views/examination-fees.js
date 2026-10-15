/**
 * Ideal Coaching Center - Examination Fees Management Module
 * Comprehensive management of examination sessions, exam fee schedules, student assignments,
 * partial/full payment recording with unique official receipts, filters, and reports.
 */

const ExaminationFeesView = {
  activeSessionId: null,

  async render(container) {
    const sessions = await window.FirebaseService.getCollection('examination_sessions');
    const examFees = await window.FirebaseService.getCollection('examination_fees');
    const settings = await window.FirebaseService.getSystemSettings();

    // Default to first active session if none selected
    if (!this.activeSessionId && sessions.length > 0) {
      this.activeSessionId = sessions[0].id;
    }

    const currentSession = sessions.find(s => s.id === this.activeSessionId) || sessions[0] || null;

    // Filter fees for the selected session
    const currentSessionFees = currentSession ? examFees.filter(f => f.sessionId === currentSession.id) : [];

    // Summary calculations
    const totalAssigned = currentSessionFees.length;
    const totalExpected = currentSessionFees.reduce((sum, f) => sum + (Number(f.totalFee) || 0), 0);
    const totalCollected = currentSessionFees.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
    const totalOutstanding = Math.max(0, totalExpected - totalCollected);
    const paidCount = currentSessionFees.filter(f => f.status === 'Paid').length;
    const partialCount = currentSessionFees.filter(f => f.status === 'Partial').length;
    const pendingCount = currentSessionFees.filter(f => f.status === 'Pending').length;

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 0.25rem;">
            <span>Academic Control</span> <span style="margin: 0 0.4rem;">/</span> <span style="color: var(--primary-600); font-weight: 600;">Examination Fees</span>
          </div>
          <h1 style="font-size: 1.6rem; color: var(--slate-900); font-weight: 800; margin: 0;">Examination Fee Management</h1>
          <p style="color: var(--slate-500); font-size: 0.85rem; margin-top: 0.25rem;">
            Manage board simulation examinations, mid-term testing fees, student fee ledgers, and official examination receipts.
          </p>
        </div>
        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="btn-export-exam-report">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export Report
          </button>
          <button type="button" class="btn btn-secondary" id="btn-assign-exam-students">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            Assign Students
          </button>
          <button type="button" class="btn btn-primary" id="btn-create-exam-session">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Examination
          </button>
        </div>
      </div>

      <!-- Live Session Selector & Key Stats -->
      <div style="display: grid; grid-template-columns: 1fr 3fr; gap: 1.5rem; margin-bottom: 1.75rem;">
        
        <!-- Session Switcher Card -->
        <div class="data-card" style="margin-bottom: 0;">
          <div class="data-card-header" style="padding: 0.85rem 1.25rem;">
            <h3 class="data-card-title" style="font-size: 0.95rem;">Select Examination Session</h3>
          </div>
          <div style="padding: 1.25rem;">
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${sessions.map(s => `
                <div class="session-tab-card ${s.id === this.activeSessionId ? 'active-session-card' : ''}" data-id="${s.id}" style="padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid ${s.id === this.activeSessionId ? 'var(--primary-600)' : 'var(--border-color)'}; background: ${s.id === this.activeSessionId ? 'var(--primary-50)' : 'var(--slate-50)'}; cursor: pointer; transition: all 0.2s;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <strong style="color: ${s.id === this.activeSessionId ? 'var(--primary-900)' : 'var(--slate-800)'}; font-size: 0.9rem;">
                      ${s.name}
                    </strong>
                    <span class="badge ${s.status === 'Active' ? 'badge-paid' : 'badge-studying'}" style="font-size: 0.65rem;">
                      ${s.status}
                    </span>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--slate-500); margin-top: 0.35rem;">
                    Class ${s.class} • Fee: Rs. ${(Number(s.feeAmount) || 0).toLocaleString()}
                  </div>
                </div>
              `).join('')}
            </div>

            ${currentSession ? `
              <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); display: flex; gap: 0.5rem;">
                <button type="button" class="btn btn-sm btn-secondary" id="btn-edit-active-exam" style="flex: 1;">
                  Edit Exam
                </button>
                <button type="button" class="btn btn-sm btn-danger-outline" id="btn-archive-active-exam" style="flex: 1;">
                  Archive
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Financial Overview for Active Exam -->
        <div class="stats-grid" style="margin-bottom: 0;">
          <div class="stat-card">
            <div class="stat-icon-wrapper stat-icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-label">Assigned Candidates</span>
              <span class="stat-value">${totalAssigned}</span>
              <span class="stat-subtext">${paidCount} Paid • ${partialCount} Partial • ${pendingCount} Due</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper stat-icon-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-label">Total Fee Revenue</span>
              <span class="stat-value" style="font-size: 1.35rem; color: var(--success-600);">Rs. ${totalCollected.toLocaleString()}</span>
              <span class="stat-subtext">Collected via Counter</span>
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
              <span class="stat-label">Outstanding Balance</span>
              <span class="stat-value" style="font-size: 1.35rem; color: var(--warning-600);">Rs. ${totalOutstanding.toLocaleString()}</span>
              <span class="stat-subtext">Deadline: ${currentSession ? currentSession.paymentDeadline : 'N/A'}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Examination Candidates & Fee Ledger Table -->
      <div class="data-card">
        <div class="data-card-header" style="flex-wrap: wrap; gap: 1rem;">
          <div class="data-card-title-group">
            <h3 class="data-card-title">Student Examination Fee Ledger</h3>
            <span class="data-card-subtitle">${currentSession ? currentSession.name : 'All Sessions'} • Ideal Coaching Center</span>
          </div>

          <!-- Table Filters -->
          <div style="display: flex; gap: 0.65rem; flex-wrap: wrap; align-items: center;">
            <input type="text" id="exam-search-input" class="form-control" placeholder="Search Roll # or Name..." style="width: 220px;" />
            <select id="exam-filter-status" class="form-control" style="width: auto;">
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending / Unpaid</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Roll #</th>
                <th>Candidate Name</th>
                <th>Class / Group</th>
                <th>Total Fee</th>
                <th>Paid Amount</th>
                <th>Remaining</th>
                <th>Payment Status</th>
                <th>Receipt #</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="exam-fees-table-body">
              ${this.buildFeeRows(currentSessionFees)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.attachEvents(container, sessions, currentSession, currentSessionFees);
  },

  buildFeeRows(fees) {
    if (fees.length === 0) {
      return `<tr><td colspan="9" style="text-align: center; color: var(--slate-500); padding: 2.5rem;">No students assigned to this examination session yet. Click "Assign Students" above.</td></tr>`;
    }

    return fees.map(f => {
      const badgeClass = f.status === 'Paid' ? 'badge-paid' : (f.status === 'Partial' ? 'badge-warning' : 'badge-unpaid');
      return `
        <tr>
          <td><strong style="color: var(--primary-600);">${f.rollNumber}</strong></td>
          <td>
            <strong>${f.studentName}</strong>
          </td>
          <td>${f.class} <span style="font-size: 0.725rem; color: var(--slate-500);">(${f.group})</span></td>
          <td><strong>Rs. ${(f.totalFee || 0).toLocaleString()}</strong></td>
          <td><strong style="color: var(--success-600);">Rs. ${(f.paidAmount || 0).toLocaleString()}</strong></td>
          <td><strong style="color: ${f.remainingBalance > 0 ? 'var(--danger-600)' : 'var(--slate-700)'};">Rs. ${(f.remainingBalance || 0).toLocaleString()}</strong></td>
          <td>
            <span class="badge ${badgeClass}" style="cursor: pointer;" title="Click to view details">
              ${f.status}
            </span>
          </td>
          <td>
            ${f.receiptNumber ? `<strong style="font-size: 0.8rem; color: var(--primary-700);">#${f.receiptNumber}</strong>` : '<span style="color: var(--slate-400); font-size: 0.75rem;">None</span>'}
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 0.35rem;">
              <button type="button" class="btn btn-sm btn-primary btn-record-exam-pay" data-id="${f.id}">
                ${f.status === 'Paid' ? 'View Payment' : 'Record Payment'}
              </button>
              ${f.receiptNumber ? `
                <button type="button" class="btn btn-sm btn-secondary btn-print-exam-rcpt" data-id="${f.id}" title="Print Official Examination Receipt">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  attachEvents(container, sessions, currentSession, fees) {
    // Session tab selector
    container.querySelectorAll('.session-tab-card').forEach(card => {
      card.onclick = () => {
        this.activeSessionId = card.getAttribute('data-id');
        this.render(container);
      };
    });

    // Search and Status filter
    const searchInput = container.querySelector('#exam-search-input');
    const statusFilter = container.querySelector('#exam-filter-status');
    const tbody = container.querySelector('#exam-fees-table-body');

    const runFilter = () => {
      const q = searchInput.value.trim().toLowerCase();
      const st = statusFilter.value;
      const filtered = fees.filter(f => {
        const matchesQ = !q || (f.studentName && f.studentName.toLowerCase().includes(q)) || (String(f.rollNumber).toLowerCase().includes(q));
        const matchesSt = st === 'All' || f.status === st;
        return matchesQ && matchesSt;
      });
      tbody.innerHTML = this.buildFeeRows(filtered);
      this.attachRowActionEvents(container, filtered);
    };

    if (searchInput) searchInput.oninput = runFilter;
    if (statusFilter) statusFilter.onchange = runFilter;

    // Attach row events
    this.attachRowActionEvents(container, fees);

    // Create Examination Session button
    const btnCreate = container.querySelector('#btn-create-exam-session');
    if (btnCreate) {
      btnCreate.onclick = () => this.openCreateExaminationModal(container);
    }

    // Edit active exam
    const btnEdit = container.querySelector('#btn-edit-active-exam');
    if (btnEdit && currentSession) {
      btnEdit.onclick = () => this.openEditExaminationModal(container, currentSession);
    }

    // Assign Students button
    const btnAssign = container.querySelector('#btn-assign-exam-students');
    if (btnAssign && currentSession) {
      btnAssign.onclick = () => this.openAssignStudentsModal(container, currentSession);
    }

    // Export report
    const btnExport = container.querySelector('#btn-export-exam-report');
    if (btnExport && currentSession) {
      btnExport.onclick = () => this.exportExaminationReport(currentSession, fees);
    }
  },

  attachRowActionEvents(container, fees) {
    container.querySelectorAll('.btn-record-exam-pay').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const fee = fees.find(f => f.id === id);
        if (fee) this.openPaymentModal(container, fee);
      };
    });

    container.querySelectorAll('.btn-print-exam-rcpt').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const fee = fees.find(f => f.id === id);
        if (!fee) return;
        const tpl = await window.FirebaseService.getReceiptTemplate();
        const receipts = await window.FirebaseService.getCollection('receipts');
        const rcpt = receipts.find(r => r.receiptNumber === fee.receiptNumber) || {
          receiptNumber: fee.receiptNumber,
          feeType: 'Examination Fee',
          studentName: fee.studentName,
          rollNumber: fee.rollNumber,
          class: fee.class,
          group: fee.group,
          expectedAmount: fee.totalFee,
          paidAmount: fee.paidAmount,
          remainingBalance: fee.remainingBalance,
          paymentDate: fee.paymentDate,
          paymentMode: 'Cash Counter'
        };

        const printHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Exam Receipt #${fee.receiptNumber} - Ideal Coaching Center</title>
            <style>
              body { margin: 20px; font-family: sans-serif; background: #fff; }
              @media print { body { margin: 0; } @page { size: A4; margin: 10mm; } }
            </style>
          </head>
          <body>
            ${window.ReceiptCustomizerView ? window.ReceiptCustomizerView.buildPreviewHTML(tpl, rcpt) : ''}
            <script>window.onload = function() { window.print(); };</script>
          </body>
          </html>
        `;
        const w = window.open('', '_blank');
        w.document.write(printHtml);
        w.document.close();
      };
    });
  },

  /**
   * Modal: Record Payment or View Payment Details (Supports partial payments)
   */
  openPaymentModal(container, fee) {
    const remaining = (Number(fee.totalFee) || 0) - (Number(fee.paidAmount) || 0);
    const isFullyPaid = remaining === 0;

    const content = `
      <div style="padding: 0.5rem 0;">
        <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <strong style="font-size: 1.1rem; color: var(--slate-900);">${fee.studentName}</strong>
            <span class="badge ${fee.status === 'Paid' ? 'badge-paid' : 'badge-warning'}">${fee.status}</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.8rem; color: var(--slate-600);">
            <div>Roll #: <strong style="color: var(--primary-600);">${fee.rollNumber}</strong></div>
            <div>Class: <strong>${fee.class} (${fee.group})</strong></div>
            <div>Exam: <strong>${fee.sessionName}</strong></div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.85rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color);">
            <div>Total Fee: <strong>Rs. ${(Number(fee.totalFee) || 0).toLocaleString()}</strong></div>
            <div>Already Paid: <strong style="color: var(--success-600);">Rs. ${(Number(fee.paidAmount) || 0).toLocaleString()}</strong></div>
            <div>Remaining: <strong style="color: ${remaining > 0 ? 'var(--danger-600)' : 'var(--slate-700)'};">Rs. ${remaining.toLocaleString()}</strong></div>
          </div>
        </div>

        ${!isFullyPaid ? `
          <form id="record-exam-payment-form" class="form-grid">
            <div class="form-group">
              <label class="form-label">Payment Amount (PKR) <span class="req-star">*</span></label>
              <input type="number" id="pay-exam-amount" class="form-control" value="${remaining}" min="1" max="${remaining}" required />
              <span class="form-help">Enter full balance or partial installment.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Payment Date <span class="req-star">*</span></label>
              <input type="date" id="pay-exam-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required />
            </div>

            <div class="form-group">
              <label class="form-label">Payment Mode</label>
              <select id="pay-exam-mode" class="form-control">
                <option value="Cash Counter">Cash Counter</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Online / EasyPaisa / JazzCash">EasyPaisa / JazzCash</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Transaction Ref (Optional)</label>
              <input type="text" id="pay-exam-ref" class="form-control" placeholder="e.g. TXN-998812" />
            </div>

            <div class="form-group form-col-full">
              <label class="form-label">Cashier Notes</label>
              <input type="text" id="pay-exam-notes" class="form-control" placeholder="Optional comments or payment installment remarks..." />
            </div>
          </form>
        ` : `
          <div style="padding: 1rem; text-align: center; background: #ecfdf5; border-radius: var(--radius-md); border: 1px solid #a7f3d0; color: #065f46; font-size: 0.9rem;">
            ✓ <strong>Examination Fee Cleared in Full!</strong> All dues have been collected for this session.
          </div>
        `}

        <!-- Transaction History -->
        ${fee.paymentHistory && fee.paymentHistory.length > 0 ? `
          <div style="margin-top: 1.25rem;">
            <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.5rem;">Payment History</h4>
            <table class="data-table" style="font-size: 0.775rem;">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Receipt #</th>
                </tr>
              </thead>
              <tbody>
                ${fee.paymentHistory.map(h => `
                  <tr>
                    <td>${h.date}</td>
                    <td><strong style="color: var(--success-600);">Rs. ${Number(h.amount).toLocaleString()}</strong></td>
                    <td>${h.method}</td>
                    <td><strong>#${h.receiptNumber}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;

    const actions = !isFullyPaid ? `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('exam-pay-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-submit-exam-payment">Record Payment & Generate Receipt</button>
    ` : `
      <button type="button" class="btn btn-primary" onclick="window.UIUtils.closeModal('exam-pay-modal')">Close</button>
    `;

    window.UIUtils.showModal(`Examination Payment: ${fee.studentName}`, content, actions, 'modal-md', 'exam-pay-modal');

    const modalEl = document.querySelector('#exam-pay-modal');
    if (!modalEl || isFullyPaid) return;

    modalEl.querySelector('#btn-submit-exam-payment').onclick = async () => {
      const amt = Number(modalEl.querySelector('#pay-exam-amount').value);
      const date = modalEl.querySelector('#pay-exam-date').value;
      const mode = modalEl.querySelector('#pay-exam-mode').value;
      const ref = modalEl.querySelector('#pay-exam-ref').value.trim();
      const notes = modalEl.querySelector('#pay-exam-notes').value.trim();

      if (!amt || amt <= 0 || amt > remaining) {
        window.UIUtils.showToast('error', 'Invalid Amount', `Please enter an amount between 1 and Rs. ${remaining}.`);
        return;
      }

      window.UIUtils.closeModal('exam-pay-modal');

      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.processExaminationFeePayment(fee.id, {
          amount: amt,
          paymentDate: date,
          paymentMethod: mode,
          transactionRef: ref,
          notes,
          recordedBy: 'Admin Counter'
        });
      }, 'Processing Examination Fee payment and generating official receipt...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Payment Recorded', `Payment of Rs. ${amt} recorded successfully.`);
      this.render(container);
    };
  },

  /**
   * Modal: Create Examination Session
   */
  openCreateExaminationModal(container) {
    const content = `
      <form id="create-exam-session-form" class="form-grid" style="padding: 0.5rem 0;">
        <div class="form-group form-col-full">
          <label class="form-label">Examination Title <span class="req-star">*</span></label>
          <input type="text" id="exam-title-input" class="form-control" placeholder="e.g. Mid-Term Examination 2026" required />
        </div>

        <div class="form-group">
          <label class="form-label">Target Class <span class="req-star">*</span></label>
          <select id="exam-class-input" class="form-control" required>
            <option value="12th">Class 12th</option>
            <option value="11th">Class 11th</option>
            <option value="10th">Class 10th</option>
            <option value="9th">Class 9th</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Target Group</label>
          <select id="exam-group-input" class="form-control">
            <option value="All">All Groups</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Pre-Medical">Pre-Medical</option>
            <option value="Pre-Engineering">Pre-Engineering</option>
            <option value="Science">Science</option>
            <option value="General">General</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Exam Category Type</label>
          <select id="exam-type-input" class="form-control">
            <option value="Mid-Term">Mid-Term Assessment</option>
            <option value="Final Term">Final Term Examination</option>
            <option value="Mock Board">Mock Board Simulation</option>
            <option value="Monthly Test">Monthly Grand Test</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Examination Fee (PKR) <span class="req-star">*</span></label>
          <input type="number" id="exam-fee-input" class="form-control" value="1500" min="0" step="100" required />
        </div>

        <div class="form-group">
          <label class="form-label">Exam Start Date</label>
          <input type="date" id="exam-start-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" />
        </div>

        <div class="form-group">
          <label class="form-label">Exam End Date</label>
          <input type="date" id="exam-end-date" class="form-control" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label">Fee Payment Deadline <span class="req-star">*</span></label>
          <input type="date" id="exam-deadline-input" class="form-control" required />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label">Description & Syllabus Coverage Notes</label>
          <textarea id="exam-desc-input" class="form-control" rows="2" placeholder="Topics covered, room allocation rules, test requirements..."></textarea>
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('create-exam-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-new-exam">Create Examination</button>
    `;

    window.UIUtils.showModal('Create Examination Session', content, actions, 'modal-md', 'create-exam-modal');

    const modalEl = document.querySelector('#create-exam-modal');
    if (!modalEl) return;

    modalEl.querySelector('#btn-save-new-exam').onclick = async () => {
      const name = modalEl.querySelector('#exam-title-input').value.trim();
      const targetClass = modalEl.querySelector('#exam-class-input').value;
      const targetGroup = modalEl.querySelector('#exam-group-input').value;
      const examType = modalEl.querySelector('#exam-type-input').value;
      const feeAmount = Number(modalEl.querySelector('#exam-fee-input').value);
      const startDate = modalEl.querySelector('#exam-start-date').value;
      const endDate = modalEl.querySelector('#exam-end-date').value;
      const deadline = modalEl.querySelector('#exam-deadline-input').value;
      const desc = modalEl.querySelector('#exam-desc-input').value.trim();

      if (!name || !deadline || feeAmount === undefined) {
        window.UIUtils.showToast('error', 'Missing Information', 'Please complete all required fields.');
        return;
      }

      window.UIUtils.closeModal('create-exam-modal');

      const newId = `exam_${Date.now()}`;
      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.addDocument('examination_sessions', {
          id: newId,
          name,
          academicYear: '2026-2027',
          class: targetClass,
          group: targetGroup,
          examType,
          startDate,
          endDate,
          feeAmount,
          paymentDeadline: deadline,
          description: desc,
          status: 'Active',
          createdAt: new Date().toISOString()
        });

        await window.AuditService.log({
          action: 'Examination Session Created',
          category: 'Examination',
          targetType: 'ExamSession',
          targetId: newId,
          details: `Created Examination '${name}' for Class ${targetClass} with fee Rs. ${feeAmount}`
        });
      }, 'Creating examination session in Cloud Firestore...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Examination Created', `Session '${name}' created.`);
      this.activeSessionId = newId;
      this.render(container);
    };
  },

  /**
   * Modal: Assign Students to Active Examination Session
   */
  async openAssignStudentsModal(container, session) {
    const allStudents = await window.FirebaseService.getCollection('students');
    const existingFees = await window.FirebaseService.getCollection('examination_fees');

    // Filter students matching the session class
    const eligibleStudents = allStudents.filter(s => {
      const matchesClass = s.class === session.class;
      const matchesGroup = session.group === 'All' || s.group === session.group;
      const alreadyAssigned = existingFees.some(f => f.sessionId === session.id && f.studentId === s.id);
      return matchesClass && matchesGroup && !alreadyAssigned && s.status === 'Active';
    });

    const content = `
      <div style="padding: 0.5rem 0;">
        <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 1rem;">
          Assigning eligible candidates of <strong>Class ${session.class} (${session.group})</strong> to <strong>${session.name}</strong>. Fee: <strong>Rs. ${Number(session.feeAmount).toLocaleString()}</strong>
        </div>

        ${eligibleStudents.length === 0 ? `
          <div style="padding: 2rem; text-align: center; color: var(--slate-500);">
            All eligible students from Class ${session.class} are already assigned to this examination.
          </div>
        ` : `
          <div style="margin-bottom: 0.75rem;">
            <label class="checkbox-label" style="font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
              <input type="checkbox" id="chk-select-all-candidates" checked /> Select All Eligible Students (${eligibleStudents.length})
            </label>
          </div>

          <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <table class="data-table" style="font-size: 0.8rem;">
              <thead>
                <tr>
                  <th style="width: 40px;"></th>
                  <th>Roll #</th>
                  <th>Student Name</th>
                  <th>Group</th>
                </tr>
              </thead>
              <tbody>
                ${eligibleStudents.map(s => `
                  <tr>
                    <td><input type="checkbox" class="chk-candidate-item" value="${s.id}" checked /></td>
                    <td><strong>${s.rollNumber}</strong></td>
                    <td>${s.fullName}</td>
                    <td>${s.group}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    const actions = eligibleStudents.length > 0 ? `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('assign-exam-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-confirm-assign-students">Assign Selected Candidates</button>
    ` : `
      <button type="button" class="btn btn-primary" onclick="window.UIUtils.closeModal('assign-exam-modal')">Close</button>
    `;

    window.UIUtils.showModal('Assign Candidates to Examination', content, actions, 'modal-md', 'assign-exam-modal');

    const modalEl = document.querySelector('#assign-exam-modal');
    if (!modalEl || eligibleStudents.length === 0) return;

    const selectAll = modalEl.querySelector('#chk-select-all-candidates');
    const items = modalEl.querySelectorAll('.chk-candidate-item');

    selectAll.onchange = () => {
      items.forEach(cb => cb.checked = selectAll.checked);
    };

    modalEl.querySelector('#btn-confirm-assign-students').onclick = async () => {
      const selectedIds = Array.from(modalEl.querySelectorAll('.chk-candidate-item:checked')).map(cb => cb.value);
      if (selectedIds.length === 0) {
        window.UIUtils.showToast('error', 'None Selected', 'Please select at least one student.');
        return;
      }

      window.UIUtils.closeModal('assign-exam-modal');

      await window.GlobalLoader.wrap(async () => {
        for (const sId of selectedIds) {
          const student = eligibleStudents.find(s => s.id === sId);
          if (!student) continue;

          const feeId = `efee_${student.id}_${session.id}`;
          await window.FirebaseService.addDocument('examination_fees', {
            id: feeId,
            sessionId: session.id,
            sessionName: session.name,
            academicYear: session.academicYear || '2026-2027',
            studentId: student.id,
            studentName: student.fullName,
            rollNumber: student.rollNumber,
            class: student.class,
            group: student.group,
            totalFee: Number(session.feeAmount) || 1500,
            paidAmount: 0,
            remainingBalance: Number(session.feeAmount) || 1500,
            status: 'Pending',
            dueDate: session.paymentDeadline,
            paymentDate: null,
            receiptNumber: null,
            paymentHistory: [],
            createdAt: new Date().toISOString()
          });
        }

        await window.AuditService.log({
          action: 'Students Assigned to Examination',
          category: 'Examination',
          targetType: 'ExamSession',
          targetId: session.id,
          details: `Assigned ${selectedIds.length} students to ${session.name}`
        });
      }, `Assigning ${selectedIds.length} candidates to examination fee schedule...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Candidates Assigned', `${selectedIds.length} students successfully assigned.`);
      this.render(container);
    };
  },

  /**
   * Export Examination Report to Printable View
   */
  exportExaminationReport(session, fees) {
    const totalCollected = fees.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
    const totalExpected = fees.reduce((sum, f) => sum + (Number(f.totalFee) || 0), 0);

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Examination Financial Report - ${session.name}</title>
        <style>
          body { font-family: sans-serif; margin: 20px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #f1f5f9; }
          @media print { @page { size: A4 landscape; margin: 10mm; } }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <h2>Ideal Coaching Center</h2>
          <h3>${session.name} - Official Fee Ledger</h3>
          <p>Class ${session.class} (${session.group}) • Deadline: ${session.paymentDeadline} • Generated: ${new Date().toLocaleDateString()}</p>
          <p><strong>Total Expected: Rs. ${totalExpected.toLocaleString()} | Total Collected: Rs. ${totalCollected.toLocaleString()}</strong></p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Roll #</th>
              <th>Student Name</th>
              <th>Class</th>
              <th>Group</th>
              <th>Total Fee</th>
              <th>Paid Amount</th>
              <th>Remaining</th>
              <th>Status</th>
              <th>Receipt #</th>
            </tr>
          </thead>
          <tbody>
            ${fees.map(f => `
              <tr>
                <td>${f.rollNumber}</td>
                <td>${f.studentName}</td>
                <td>${f.class}</td>
                <td>${f.group}</td>
                <td>Rs. ${(f.totalFee || 0).toLocaleString()}</td>
                <td>Rs. ${(f.paidAmount || 0).toLocaleString()}</td>
                <td>Rs. ${(f.remainingBalance || 0).toLocaleString()}</td>
                <td>${f.status}</td>
                <td>${f.receiptNumber || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    w.document.write(printHtml);
    w.document.close();
  },

  /**
   * Student Portal: Render Student's Assigned Examination Fees
   */
  async renderStudentExamFees(container, student) {
    const allExamFees = await window.FirebaseService.getCollection('examination_fees');
    const myFees = allExamFees.filter(f => f.studentId === student.id || f.rollNumber === student.rollNumber);

    container.innerHTML = `
      <div class="page-header" style="margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.6rem; color: var(--slate-900); font-weight: 800; margin: 0;">My Examination Fees</h1>
        <p style="color: var(--slate-500); font-size: 0.85rem; margin-top: 0.25rem;">
          Official board simulation and mid-term examination schedules, fee clearances, and receipts • Ideal Coaching Center
        </p>
      </div>

      <div class="data-card">
        <div class="data-card-header">
          <h3 class="data-card-title">Assigned Examination Schedule</h3>
          <span class="badge badge-studying">${student.class} (${student.group})</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Examination Name</th>
                <th>Fee Amount</th>
                <th>Paid Amount</th>
                <th>Remaining</th>
                <th>Payment Deadline</th>
                <th>Status</th>
                <th style="text-align: right;">Receipt</th>
              </tr>
            </thead>
            <tbody>
              ${myFees.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: var(--slate-500); padding: 2rem;">No upcoming examination fees currently assigned to your account.</td></tr>
              ` : myFees.map(f => {
                const badgeClass = f.status === 'Paid' ? 'badge-paid' : (f.status === 'Partial' ? 'badge-warning' : 'badge-unpaid');
                return `
                  <tr>
                    <td><strong>${f.sessionName}</strong></td>
                    <td>Rs. ${(f.totalFee || 0).toLocaleString()}</td>
                    <td><strong style="color: var(--success-600);">Rs. ${(f.paidAmount || 0).toLocaleString()}</strong></td>
                    <td><strong style="color: ${f.remainingBalance > 0 ? 'var(--danger-600)' : 'var(--slate-700)'};">Rs. ${(f.remainingBalance || 0).toLocaleString()}</strong></td>
                    <td>${f.dueDate || 'N/A'}</td>
                    <td><span class="badge ${badgeClass}">${f.status}</span></td>
                    <td style="text-align: right;">
                      ${f.receiptNumber ? `
                        <button type="button" class="btn btn-sm btn-secondary btn-std-print-rcpt" data-rcpt="${f.receiptNumber}">
                          View Receipt
                        </button>
                      ` : '<span style="font-size: 0.75rem; color: var(--slate-400);">Pending Payment</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Attach student print receipt event
    container.querySelectorAll('.btn-std-print-rcpt').forEach(btn => {
      btn.onclick = async () => {
        const rcptNum = btn.getAttribute('data-rcpt');
        const receipts = await window.FirebaseService.getCollection('receipts');
        const rcpt = receipts.find(r => r.receiptNumber === rcptNum);
        const tpl = await window.FirebaseService.getReceiptTemplate();
        if (!rcpt) return;

        const printHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Official Exam Receipt - #${rcptNum}</title>
            <style>body { margin: 20px; font-family: sans-serif; background: #fff; } @media print { body { margin: 0; } @page { size: A4; margin: 10mm; } }</style>
          </head>
          <body>
            ${window.ReceiptCustomizerView ? window.ReceiptCustomizerView.buildPreviewHTML(tpl, rcpt) : ''}
            <script>window.onload = function() { window.print(); };</script>
          </body>
          </html>
        `;
        const w = window.open('', '_blank');
        w.document.write(printHtml);
        w.document.close();
      };
    });
  }
};

window.ExaminationFeesView = ExaminationFeesView;
