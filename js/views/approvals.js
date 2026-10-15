/**
 * Ideal Coaching Center - Approval Workflows & Financial Adjustments Module
 * Handles Super Admin review, side-by-side comparison, atomic approval and rejection of:
 * 1. Fee Refund Requests
 * 2. Payment Correction Requests
 * 3. Protected Attendance Correction Requests
 */

const ApprovalsView = {
  activeTab: 'financial', // 'financial' or 'attendance'
  financialSubTab: 'pending', // 'pending', 'approved', 'rejected'

  async render(container) {
    const adjustments = await window.FirebaseService.getCollection('financial_adjustments');
    const corrections = await window.FirebaseService.getCollection('attendance_corrections');

    const pendingFin = adjustments.filter(a => a.status === 'Pending Approval');
    const approvedFin = adjustments.filter(a => a.status === 'Approved');
    const rejectedFin = adjustments.filter(a => a.status === 'Rejected');

    const pendingAtt = corrections.filter(c => c.status === 'Pending Approval');
    const resolvedAtt = corrections.filter(c => c.status !== 'Pending Approval');

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 0.25rem;">
            <span>Administrative Governance</span> <span style="margin: 0 0.4rem;">/</span> <span style="color: var(--primary-600); font-weight: 600;">Approval Workflows</span>
          </div>
          <h1 style="font-size: 1.6rem; color: var(--slate-900); font-weight: 800; margin: 0;">Institutional Approval Workflows</h1>
          <p style="color: var(--slate-500); font-size: 0.85rem; margin-top: 0.25rem;">
            Super Admin oversight for sensitive transactions: fee refunds, payment amount corrections, and attendance adjustments.
          </p>
        </div>
        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary" id="btn-submit-new-adjustment">
            + Request Financial Adjustment
          </button>
        </div>
      </div>

      <!-- Live Counters -->
      <div class="stats-grid" style="margin-bottom: 1.75rem;">
        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Pending Financial Requests</span>
            <span class="stat-value" style="color: var(--warning-600);">${pendingFin.length}</span>
            <span class="stat-subtext">Refunds & Payment Corrections</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Pending Attendance Corrections</span>
            <span class="stat-value" style="color: var(--primary-600);">${pendingAtt.length}</span>
            <span class="stat-subtext">Student & Faculty Records</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Approved Adjustments</span>
            <span class="stat-value" style="color: var(--success-600);">${approvedFin.length}</span>
            <span class="stat-subtext">Executed into Cloud Ledger</span>
          </div>
        </div>
      </div>

      <!-- Main Navigation Tabs -->
      <div class="tabs-nav" style="margin-bottom: 1.5rem; display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">
        <button type="button" class="tab-btn ${this.activeTab === 'financial' ? 'active-tab' : ''}" id="tab-fin-adjustments" style="padding: 0.6rem 1.25rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.activeTab === 'financial' ? 'var(--primary-600)' : 'transparent'}; color: ${this.activeTab === 'financial' ? '#fff' : 'var(--slate-600)'};">
          Fee Refunds & Payment Corrections (${adjustments.length})
        </button>
        <button type="button" class="tab-btn ${this.activeTab === 'attendance' ? 'active-tab' : ''}" id="tab-att-corrections" style="padding: 0.6rem 1.25rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.activeTab === 'attendance' ? 'var(--primary-600)' : 'transparent'}; color: ${this.activeTab === 'attendance' ? '#fff' : 'var(--slate-600)'};">
          Attendance Corrections (${corrections.length})
        </button>
      </div>

      ${this.activeTab === 'financial' 
        ? this.renderFinancialView(pendingFin, approvedFin, rejectedFin, adjustments)
        : this.renderAttendanceView(pendingAtt, resolvedAtt)}
    `;

    this.attachEvents(container, adjustments, corrections);
  },

  renderFinancialView(pending, approved, rejected, allAdjustments) {
    let displayList = pending;
    if (this.financialSubTab === 'approved') displayList = approved;
    else if (this.financialSubTab === 'rejected') displayList = rejected;

    return `
      <div class="data-card">
        <div class="data-card-header" style="flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 0.5rem;">
            <button type="button" class="btn btn-sm ${this.financialSubTab === 'pending' ? 'btn-primary' : 'btn-secondary'}" id="subtab-fin-pending">
              Pending Approval (${pending.length})
            </button>
            <button type="button" class="btn btn-sm ${this.financialSubTab === 'approved' ? 'btn-primary' : 'btn-secondary'}" id="subtab-fin-approved">
              Approved Adjustments (${approved.length})
            </button>
            <button type="button" class="btn btn-sm ${this.financialSubTab === 'rejected' ? 'btn-primary' : 'btn-secondary'}" id="subtab-fin-rejected">
              Rejected Requests (${rejected.length})
            </button>
          </div>
          <span class="badge badge-paid">Super Admin Role Protected</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Candidate Name</th>
                <th>Receipt #</th>
                <th>Original Amount</th>
                <th>Proposed / Refund</th>
                <th>Justification Reason</th>
                <th>Requested By</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${displayList.length === 0 ? `
                <tr><td colspan="9" style="text-align: center; color: #334155; padding: 2.5rem; font-weight: 600;">No ${this.financialSubTab} financial adjustment records found.</td></tr>
              ` : displayList.map(a => {
                const isRefund = a.adjustmentType === 'refund';
                const statusBadge = a.status === 'Approved' ? 'badge-paid' : (a.status === 'Rejected' ? 'badge-cancelled' : 'badge-warning');

                return `
                  <tr>
                    <td>
                      <span class="badge ${isRefund ? 'badge-cancelled' : 'badge-studying'}">
                        ${isRefund ? 'Fee Refund' : 'Payment Correction'}
                      </span>
                    </td>
                    <td>
                      <strong style="color: #0f172a;">${a.studentName}</strong><br />
                      <span style="font-size: 0.75rem; color: #334155; font-weight: 600;">Roll #${a.rollNumber}</span>
                    </td>
                    <td><strong style="color: #0369a1;">#${a.receiptNumber}</strong></td>
                    <td><strong style="color: #0f172a;">Rs. ${(a.originalAmount || 0).toLocaleString()}</strong></td>
                    <td>
                      <strong style="color: ${isRefund ? 'var(--danger-600)' : 'var(--primary-700)'};">
                        Rs. ${(isRefund ? a.requestedAmount : a.proposedAmount).toLocaleString()}
                      </strong>
                    </td>
                    <td><span style="font-size: 0.8rem; color: var(--slate-700);">${a.reason}</span></td>
                    <td><span style="font-size: 0.75rem;">${a.requestedBy || 'Admin'}</span></td>
                    <td><span class="badge ${statusBadge}">${a.status}</span></td>
                    <td style="text-align: right;">
                      <div style="display: inline-flex; gap: 0.35rem;">
                        <button type="button" class="btn btn-sm btn-secondary btn-review-fin-adj" data-id="${a.id}">
                          ${a.status === 'Pending Approval' ? 'Review & Decision' : 'View Details'}
                        </button>
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
  },

  renderAttendanceView(pending, resolved) {
    return `
      <div class="data-card">
        <div class="data-card-header">
          <h3 class="data-card-title">Attendance Correction Requests</h3>
          <span class="badge badge-paid">${pending.length} Pending Super Admin Approval</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Role / Class</th>
                <th>Date</th>
                <th>Recorded Status</th>
                <th>Proposed Status</th>
                <th>Correction Reason</th>
                <th>Requested By</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${pending.length === 0 ? `
                <tr><td colspan="9" style="text-align: center; color: var(--slate-500); padding: 2.5rem;">No pending attendance correction requests.</td></tr>
              ` : pending.map(c => `
                <tr>
                  <td><strong>${c.personName}</strong></td>
                  <td>${c.class ? 'Class ' + c.class : 'Faculty'}</td>
                  <td>${c.date}</td>
                  <td><span class="badge badge-unpaid">${c.originalStatus}</span></td>
                  <td><span class="badge badge-paid">${c.requestedStatus}</span></td>
                  <td><span style="font-size: 0.8rem; color: var(--slate-700);">${c.reason}</span></td>
                  <td><span style="font-size: 0.75rem;">${c.requestedBy || 'Admin'}</span></td>
                  <td><span class="badge badge-warning">${c.status}</span></td>
                  <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 0.35rem;">
                      <button type="button" class="btn btn-sm btn-primary btn-review-att-corr" data-id="${c.id}">
                        Review Request
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  attachEvents(container, adjustments, corrections) {
    // Top Tabs
    const tabFin = container.querySelector('#tab-fin-adjustments');
    const tabAtt = container.querySelector('#tab-att-corrections');

    if (tabFin) tabFin.onclick = () => { this.activeTab = 'financial'; this.render(container); };
    if (tabAtt) tabAtt.onclick = () => { this.activeTab = 'attendance'; this.render(container); };

    // Financial Subtabs
    const subPending = container.querySelector('#subtab-fin-pending');
    const subApproved = container.querySelector('#subtab-fin-approved');
    const subRejected = container.querySelector('#subtab-fin-rejected');

    if (subPending) subPending.onclick = () => { this.financialSubTab = 'pending'; this.render(container); };
    if (subApproved) subApproved.onclick = () => { this.financialSubTab = 'approved'; this.render(container); };
    if (subRejected) subRejected.onclick = () => { this.financialSubTab = 'rejected'; this.render(container); };

    // Review Financial Adjustment Modal
    container.querySelectorAll('.btn-review-fin-adj').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const adj = adjustments.find(a => a.id === id);
        if (adj) this.openReviewFinancialModal(container, adj);
      };
    });

    // Review Attendance Correction Modal
    container.querySelectorAll('.btn-review-att-corr').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const corr = corrections.find(c => c.id === id);
        if (corr) this.openReviewAttendanceModal(container, corr);
      };
    });

    // Request new adjustment button
    const btnNewAdj = container.querySelector('#btn-submit-new-adjustment');
    if (btnNewAdj) {
      btnNewAdj.onclick = () => this.openRequestAdjustmentModal(container);
    }
  },

  /**
   * Modal: Review Financial Adjustment (Approve / Reject)
   */
  openReviewFinancialModal(container, adj) {
    const isPending = adj.status === 'Pending Approval';
    const isRefund = adj.adjustmentType === 'refund';

    const content = `
      <div style="padding: 0.5rem 0;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
          <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem;">
            <div style="font-size: 0.75rem; color: var(--slate-500); font-weight: 700; text-transform: uppercase;">Original Transaction</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--slate-900); margin: 0.35rem 0;">
              ${adj.studentName} (Roll #${adj.rollNumber})
            </div>
            <div style="font-size: 0.85rem; color: var(--slate-600);">
              Receipt: <strong>#${adj.receiptNumber}</strong> • Month: <strong>${adj.feeMonth || 'Tuition'}</strong><br />
              Original Deposited Amount: <strong style="font-size: 1.1rem; color: var(--slate-900);">Rs. ${(adj.originalAmount || 0).toLocaleString()}</strong>
            </div>
          </div>

          <div style="background: ${isRefund ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${isRefund ? '#fecaca' : '#bbf7d0'}; border-radius: var(--radius-md); padding: 1rem;">
            <div style="font-size: 0.75rem; color: ${isRefund ? '#b91c1c' : '#15803d'}; font-weight: 700; text-transform: uppercase;">
              ${isRefund ? 'Requested Refund' : 'Proposed Corrected Amount'}
            </div>
            <div style="font-size: 1.5rem; font-weight: 900; color: ${isRefund ? '#b91c1c' : '#15803d'}; margin: 0.35rem 0;">
              Rs. ${(isRefund ? adj.requestedAmount : adj.proposedAmount).toLocaleString()}
            </div>
            <div style="font-size: 0.85rem; color: var(--slate-600);">
              Reason: <em>"${adj.reason}"</em><br />
              Requested by: <strong>${adj.requestedBy || 'Admin'}</strong>
            </div>
          </div>
        </div>

        ${isPending ? `
          <div class="form-group form-col-full">
            <label class="form-label">Super Administrator Decision Reason / Audit Notes</label>
            <input type="text" id="adm-decision-notes" class="form-control" placeholder="Optional approval or rejection remarks..." />
          </div>
        ` : `
          <div style="padding: 0.75rem 1rem; background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.85rem;">
            Decision: <strong>${adj.status}</strong> by <strong>${adj.approvedBy || adj.rejectedBy || 'Super Admin'}</strong> on ${adj.decidedAt ? new Date(adj.decidedAt).toLocaleString() : 'N/A'}<br />
            Remarks: <em>${adj.approvalReason || adj.rejectionReason || 'None'}</em>
          </div>
        `}
      </div>
    `;

    const actions = isPending ? `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('review-fin-modal')">Cancel</button>
      <button type="button" class="btn btn-danger-outline" id="btn-reject-fin-adj">Reject Request</button>
      <button type="button" class="btn btn-primary" id="btn-approve-fin-adj">Approve & Execute Ledger Adjustment</button>
    ` : `
      <button type="button" class="btn btn-primary" onclick="window.UIUtils.closeModal('review-fin-modal')">Close</button>
    `;

    window.UIUtils.showModal(`Review Financial Request: ${isRefund ? 'Fee Refund' : 'Payment Correction'}`, content, actions, 'modal-md', 'review-fin-modal');

    const modalEl = document.querySelector('#review-fin-modal');
    if (!modalEl || !isPending) return;

    modalEl.querySelector('#btn-approve-fin-adj').onclick = async () => {
      const reason = modalEl.querySelector('#adm-decision-notes').value.trim();
      if (!confirm(`Are you sure you want to APPROVE this ${adj.adjustmentType}? An official ${adj.adjustmentType} receipt will be generated and financial records updated.`)) return;

      window.UIUtils.closeModal('review-fin-modal');

      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.approveFinancialAdjustment(adj.id, reason, 'Super Administrator');
      }, `Executing atomic ledger adjustment and issuing official receipt in Cloud Firestore...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Adjustment Approved', `Financial adjustment executed successfully.`);
      this.render(container);
    };

    modalEl.querySelector('#btn-reject-fin-adj').onclick = async () => {
      const reason = modalEl.querySelector('#adm-decision-notes').value.trim() || 'Declined by Super Administrator';
      if (!confirm(`Are you sure you want to REJECT this request? Original transaction will remain unchanged.`)) return;

      window.UIUtils.closeModal('review-fin-modal');

      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.rejectFinancialAdjustment(adj.id, reason, 'Super Administrator');
      }, `Recording rejection decision in audit trail...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('warning', 'Request Rejected', `Adjustment request declined.`);
      this.render(container);
    };
  },

  /**
   * Modal: Review Attendance Correction (Approve / Reject)
   */
  openReviewAttendanceModal(container, corr) {
    const content = `
      <div style="padding: 0.5rem 0;">
        <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
          <div style="font-size: 1.1rem; font-weight: 800; color: var(--slate-900);">${corr.personName}</div>
          <div style="font-size: 0.85rem; color: var(--slate-600); margin-top: 0.2rem;">
            Date: <strong>${corr.date}</strong> • Affected: <strong>${corr.class ? 'Class ' + corr.class : 'Faculty'}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 1rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-color);">
            <div>Recorded Status: <span class="badge badge-unpaid">${corr.originalStatus}</span></div>
            <div style="font-size: 1.25rem;">➔</div>
            <div>Proposed Status: <span class="badge badge-paid">${corr.requestedStatus}</span></div>
          </div>
          <div style="font-size: 0.85rem; color: var(--slate-700); margin-top: 0.5rem;">
            Justification: <em>"${corr.reason}"</em>
          </div>
        </div>

        <div class="form-group form-col-full">
          <label class="form-label">Reviewer Notes</label>
          <input type="text" id="att-decision-notes" class="form-control" placeholder="Approval or rejection remarks..." />
        </div>
      </div>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('review-att-modal')">Cancel</button>
      <button type="button" class="btn btn-danger-outline" id="btn-reject-att-corr">Reject Correction</button>
      <button type="button" class="btn btn-primary" id="btn-approve-att-corr">Approve & Correct Attendance</button>
    `;

    window.UIUtils.showModal('Review Attendance Correction', content, actions, 'modal-md', 'review-att-modal');

    const modalEl = document.querySelector('#review-att-modal');
    if (!modalEl) return;

    modalEl.querySelector('#btn-approve-att-corr').onclick = async () => {
      const notes = modalEl.querySelector('#att-decision-notes').value.trim();
      window.UIUtils.closeModal('review-att-modal');

      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.approveAttendanceCorrection(corr.id, notes, 'Super Administrator');
      }, `Updating attendance record and creating audit trail in Cloud Firestore...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Correction Approved', `Attendance status updated to '${corr.requestedStatus}'.`);
      this.render(container);
    };

    modalEl.querySelector('#btn-reject-att-corr').onclick = async () => {
      const notes = modalEl.querySelector('#att-decision-notes').value.trim() || 'Denied by Super Admin';
      window.UIUtils.closeModal('review-att-modal');

      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.rejectAttendanceCorrection(corr.id, notes, 'Super Administrator');
      }, `Recording rejection in audit log...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('warning', 'Correction Rejected', `Correction request rejected.`);
      this.render(container);
    };
  },

  /**
   * Modal: Submit New Financial Adjustment Request
   */
  async openRequestAdjustmentModal(container) {
    const receipts = await window.FirebaseService.getCollection('receipts');
    const students = await window.FirebaseService.getCollection('students');

    const content = `
      <form id="req-adj-form" class="form-grid" style="padding: 0.5rem 0;">
        <div class="form-group form-col-full">
          <label class="form-label">Adjustment Type <span class="req-star">*</span></label>
          <select id="adj-type-select" class="form-control" required>
            <option value="refund">Fee Refund (Excess / Duplicate Payment Return)</option>
            <option value="correction">Payment Amount Correction (Clerical Concession Error)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Select Paid Receipt <span class="req-star">*</span></label>
          <select id="adj-rcpt-select" class="form-control" required>
            ${receipts.map(r => `
              <option value="${r.receiptNumber}" data-name="${r.studentName}" data-roll="${r.rollNumber}" data-amt="${r.paidAmount}">
                #${r.receiptNumber} - ${r.studentName} (Rs. ${(r.paidAmount || 0).toLocaleString()})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" id="lbl-adj-amount">Requested Refund Amount (PKR) <span class="req-star">*</span></label>
          <input type="number" id="adj-amt-input" class="form-control" placeholder="Amount in PKR..." required min="1" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label">Audit Justification Reason <span class="req-star">*</span></label>
          <textarea id="adj-reason-input" class="form-control" rows="2" placeholder="Detailed explanation for why refund or correction is required..." required></textarea>
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('req-adj-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-submit-adj-req">Submit for Super Admin Approval</button>
    `;

    window.UIUtils.showModal('Submit Financial Adjustment Request', content, actions, 'modal-md', 'req-adj-modal');

    const modalEl = document.querySelector('#req-adj-modal');
    if (!modalEl) return;

    modalEl.querySelector('#btn-submit-adj-req').onclick = async () => {
      const type = modalEl.querySelector('#adj-type-select').value;
      const rcptSelect = modalEl.querySelector('#adj-rcpt-select');
      const rcptNum = rcptSelect.value;
      const selectedOpt = rcptSelect.options[rcptSelect.selectedIndex];
      const name = selectedOpt.getAttribute('data-name');
      const roll = selectedOpt.getAttribute('data-roll');
      const originalAmt = Number(selectedOpt.getAttribute('data-amt')) || 3000;
      const amt = Number(modalEl.querySelector('#adj-amt-input').value);
      const reason = modalEl.querySelector('#adj-reason-input').value.trim();

      if (!amt || !reason) {
        window.UIUtils.showToast('error', 'Missing Information', 'Please fill in amount and reason.');
        return;
      }

      window.UIUtils.closeModal('req-adj-modal');

      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.submitFinancialAdjustment({
          adjustmentType: type,
          studentName: name,
          rollNumber: roll,
          receiptNumber: rcptNum,
          originalAmount: originalAmt,
          requestedAmount: type === 'refund' ? amt : 0,
          proposedAmount: type === 'correction' ? amt : 0,
          reason,
          requestedBy: 'Admin Counter'
        });
      }, `Submitting adjustment request for Super Admin authorization...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Request Submitted', 'Financial adjustment submitted for Super Admin approval.');
      this.render(container);
    };
  }
};

window.ApprovalsView = ApprovalsView;
