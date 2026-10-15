/**
 * Ideal Coaching Center - Teacher Salary Settings & Monthly Payroll Module
 * Complete payroll system supporting fixed monthly and per-period compensation models,
 * monthly batch generation, disbursement recording, and branded salary slip printing.
 */

const PayrollView = {
  activeTab: 'monthly_payroll', // 'monthly_payroll', 'configs', 'history'
  selectedMonth: 'August 2026',

  async render(container) {
    const teachers = await window.FirebaseService.getCollection('teachers');
    const configs = await window.FirebaseService.getCollection('salary_configs');
    const payrollRecords = await window.FirebaseService.getCollection('payroll');

    // Months available
    const months = ['August 2026', 'September 2026', 'October 2026', 'November 2026'];
    const currentPayroll = payrollRecords.filter(p => p.salaryMonth === this.selectedMonth);

    // Summary calculations
    const totalDisbursed = currentPayroll.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (Number(p.actualPaid) || 0), 0);
    const totalPayable = currentPayroll.reduce((sum, p) => sum + (Number(p.netPayable) || 0), 0);
    const pendingDisbursement = Math.max(0, totalPayable - totalDisbursed);
    const paidStaffCount = currentPayroll.filter(p => p.status === 'Paid').length;

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 0.25rem;">
            <span>Financial Oversight</span> <span style="margin: 0 0.4rem;">/</span> <span style="color: var(--primary-600); font-weight: 600;">Faculty Payroll</span>
          </div>
          <h1 style="font-size: 1.6rem; color: var(--slate-900); font-weight: 800; margin: 0;">Teacher Salary & Monthly Payroll</h1>
          <p style="color: var(--slate-500); font-size: 0.85rem; margin-top: 0.25rem;">
            Compensation structures, automated monthly payroll generation, salary disbursement, and official pay slips.
          </p>
        </div>
        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-success" id="btn-quick-pay-salary" style="background: #059669; color: #fff; font-weight: 700;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            Pay Teacher Salary
          </button>
          <button type="button" class="btn btn-secondary" id="btn-export-payroll-sheet">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Print Payroll Sheet
          </button>
          <button type="button" class="btn btn-primary" id="btn-generate-monthly-payroll">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
            Generate ${this.selectedMonth} Payroll
          </button>
        </div>
      </div>

      <!-- Financial Metrics Grid -->
      <div class="stats-grid" style="margin-bottom: 1.75rem;">
        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Monthly Payroll</span>
            <span class="stat-value" style="font-size: 1.35rem;">Rs. ${totalPayable.toLocaleString()}</span>
            <span class="stat-subtext">${currentPayroll.length} Active Staff Statements</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Disbursed Salaries</span>
            <span class="stat-value" style="font-size: 1.35rem; color: var(--success-600);">Rs. ${totalDisbursed.toLocaleString()}</span>
            <span class="stat-subtext">${paidStaffCount} of ${currentPayroll.length} Paid</span>
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
            <span class="stat-label">Pending Clearance</span>
            <span class="stat-value" style="font-size: 1.35rem; color: var(--warning-600);">Rs. ${pendingDisbursement.toLocaleString()}</span>
            <span class="stat-subtext">${currentPayroll.length - paidStaffCount} Unpaid Faculty</span>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-nav" style="margin-bottom: 1.5rem; display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">
        <button type="button" class="tab-btn ${this.activeTab === 'monthly_payroll' ? 'active-tab' : ''}" id="tab-monthly-payroll" style="padding: 0.6rem 1.25rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.activeTab === 'monthly_payroll' ? 'var(--primary-600)' : 'transparent'}; color: ${this.activeTab === 'monthly_payroll' ? '#fff' : 'var(--slate-600)'};">
          Monthly Payroll Statements
        </button>
        <button type="button" class="tab-btn ${this.activeTab === 'configs' ? 'active-tab' : ''}" id="tab-salary-configs" style="padding: 0.6rem 1.25rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.activeTab === 'configs' ? 'var(--primary-600)' : 'transparent'}; color: ${this.activeTab === 'configs' ? '#fff' : 'var(--slate-600)'};">
          Salary Configurations (${teachers.length})
        </button>
      </div>

      ${this.activeTab === 'monthly_payroll' ? this.renderMonthlyPayrollView(currentPayroll, months) : this.renderSalaryConfigsView(teachers, configs)}
    `;

    this.attachEvents(container, teachers, configs, currentPayroll, payrollRecords);
  },

  renderMonthlyPayrollView(payroll, months) {
    return `
      <div class="data-card">
        <div class="data-card-header" style="flex-wrap: wrap; gap: 1rem;">
          <div class="data-card-title-group">
            <h3 class="data-card-title">Payroll Statements: ${this.selectedMonth}</h3>
            <span class="data-card-subtitle">Official staff salary register • Ideal Coaching Center</span>
          </div>
          <div style="display: flex; gap: 0.65rem; align-items: center;">
            <label style="font-size: 0.85rem; font-weight: 600;">Salary Month:</label>
            <select id="payroll-month-select" class="form-control" style="width: auto;">
              ${months.map(m => `<option value="${m}" ${this.selectedMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Payroll Ref</th>
                <th>Teacher Name</th>
                <th>Salary Type</th>
                <th>Base Salary</th>
                <th>Allowances</th>
                <th>Deductions</th>
                <th>Net Payable</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${payroll.length === 0 ? `
                <tr><td colspan="9" style="text-align: center; color: #334155; padding: 2.5rem; font-weight: 600;">
                  No payroll generated for ${this.selectedMonth} yet. Click "Generate ${this.selectedMonth} Payroll" above.
                </td></tr>
              ` : payroll.map(p => `
                <tr>
                  <td><strong style="color: #0369a1; font-family: monospace; font-size: 0.85rem;">${p.payrollRef}</strong></td>
                  <td>
                    <strong style="color: #0f172a;">${p.teacherName}</strong><br />
                    <span style="font-size: 0.75rem; color: #334155; font-weight: 600;">${p.teacherCode}</span>
                  </td>
                  <td><span style="font-size: 0.85rem; text-transform: capitalize; color: #0f172a; font-weight: 600;">${p.salaryType}</span></td>
                  <td><strong style="color: #0f172a;">Rs. ${(p.baseSalary || 0).toLocaleString()}</strong></td>
                  <td><span style="color: #047857; font-weight: 700;">+ Rs. ${(p.allowances || 0).toLocaleString()}</span></td>
                  <td><span style="color: #b91c1c; font-weight: 700;">- Rs. ${(p.deductions || 0).toLocaleString()}</span></td>
                  <td><strong style="font-size: 0.95rem; color: #0f172a;">Rs. ${(p.netPayable || 0).toLocaleString()}</strong></td>
                  <td><span class="badge ${p.status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}" style="font-weight: 700;">${p.status}</span></td>
                  <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 0.35rem;">
                      ${p.status !== 'Paid' ? `
                        <button type="button" class="btn btn-sm btn-primary btn-disburse-salary" data-id="${p.id}">
                          Mark Paid
                        </button>
                      ` : `
                        <button type="button" class="btn btn-sm btn-primary btn-view-salary-receipt" data-id="${p.id}" style="background: #0284c7; border-color: #0284c7;">
                          Receipt
                        </button>
                        <button type="button" class="btn btn-sm btn-secondary btn-print-salary-slip" data-id="${p.id}">
                          Salary Slip
                        </button>
                      `}
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

  renderSalaryConfigsView(teachers, configs) {
    return `
      <div class="data-card">
        <div class="data-card-header">
          <h3 class="data-card-title">Faculty Compensation Configurations</h3>
          <span class="data-card-subtitle">Base wages, allowances, and deduction policies • Ideal Coaching Center</span>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Teacher ID</th>
                <th>Full Name</th>
                <th>Salary Model</th>
                <th>Base Wage / Rate</th>
                <th>Active Allowances</th>
                <th>Active Deductions</th>
                <th>Effective Cycle</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${teachers.map(t => {
                const cfg = configs.find(c => c.teacherId === t.id) || {
                  salaryType: t.salaryType || 'fixed',
                  baseAmount: t.salaryAmount || 50000,
                  allowances: 0,
                  deductions: 0,
                  paymentCycle: 'Monthly'
                };

                return `
                  <tr>
                    <td><strong style="color: var(--primary-600); font-family: monospace;">${t.teacherId}</strong></td>
                    <td><strong>${t.fullName}</strong></td>
                    <td><span style="text-transform: capitalize;">${cfg.salaryType}</span></td>
                    <td><strong>Rs. ${(cfg.baseAmount || 0).toLocaleString()}</strong></td>
                    <td><span style="color: var(--success-600);">+ Rs. ${(cfg.allowances || 0).toLocaleString()}</span></td>
                    <td><span style="color: var(--danger-600);">- Rs. ${(cfg.deductions || 0).toLocaleString()}</span></td>
                    <td>${cfg.paymentCycle || 'Monthly'}</td>
                    <td style="text-align: right;">
                      <button type="button" class="btn btn-sm btn-secondary btn-edit-salary-config" data-id="${t.id}">
                        Configure Salary
                      </button>
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

  attachEvents(container, teachers, configs, currentPayroll, allPayroll) {
    // Tabs
    const tabPay = container.querySelector('#tab-monthly-payroll');
    const tabCfg = container.querySelector('#tab-salary-configs');

    if (tabPay) tabPay.onclick = () => { this.activeTab = 'monthly_payroll'; this.render(container); };
    if (tabCfg) tabCfg.onclick = () => { this.activeTab = 'configs'; this.render(container); };

    // Month Selector
    const monthSelect = container.querySelector('#payroll-month-select');
    if (monthSelect) {
      monthSelect.onchange = () => {
        this.selectedMonth = monthSelect.value;
        this.render(container);
      };
    }

    // Generate Payroll Batch
    const btnGen = container.querySelector('#btn-generate-monthly-payroll');
    if (btnGen) {
      btnGen.onclick = async () => {
        if (!confirm(`Generate official payroll statements for all active faculty members for ${this.selectedMonth}?`)) return;

        await window.GlobalLoader.wrap(async () => {
          await window.FirebaseService.generateMonthlyPayroll(this.selectedMonth, '2026-2027');
        }, `Compiling attendance logs, allowances, and generating ${this.selectedMonth} payroll in Cloud Firestore...`, 'Ideal Coaching Center');

        window.UIUtils.showToast('success', 'Payroll Generated', `Payroll statements created for ${this.selectedMonth}.`);
        this.render(container);
      };
    }

    // Quick Pay Teacher Salary button
    const btnQuickPay = container.querySelector('#btn-quick-pay-salary');
    if (btnQuickPay) {
      btnQuickPay.onclick = () => this.openQuickPayModal(container, teachers, configs);
    }

    // Mark Paid / Disburse Salary
    container.querySelectorAll('.btn-disburse-salary').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const p = currentPayroll.find(item => item.id === id);
        if (p) this.openDisburseModal(container, p);
      };
    });

    // View Official Salary Receipt
    container.querySelectorAll('.btn-view-salary-receipt').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const p = allPayroll.find(item => item.id === id);
        if (p) {
          const receipts = await window.FirebaseService.getTeacherSalaryReceipts(p.teacherId);
          const r = receipts.find(item => item.payrollId === p.id || item.salaryMonth === p.salaryMonth) || p;
          this.openSalaryReceiptModal(r);
        }
      };
    });

    // Print Salary Slip
    container.querySelectorAll('.btn-print-salary-slip').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const p = allPayroll.find(item => item.id === id);
        if (p) this.printSalarySlip(p);
      };
    });

    // Edit Salary Config
    container.querySelectorAll('.btn-edit-salary-config').forEach(btn => {
      btn.onclick = () => {
        const teacherId = btn.getAttribute('data-id');
        const teacher = teachers.find(t => t.id === teacherId);
        const cfg = configs.find(c => c.teacherId === teacherId) || {
          teacherId,
          salaryType: teacher.salaryType || 'fixed',
          baseAmount: teacher.salaryAmount || 50000,
          allowances: 0,
          deductions: 0
        };
        if (teacher) this.openEditSalaryConfigModal(container, teacher, cfg);
      };
    });

    // Export Payroll Sheet
    const btnExport = container.querySelector('#btn-export-payroll-sheet');
    if (btnExport) {
      btnExport.onclick = () => this.exportPayrollSheet(currentPayroll);
    }
  },

  /**
   * Modal: Mark Salary as Paid & Generate Official Receipt
   */
  openDisburseModal(container, payroll) {
    const content = `
      <form id="disburse-salary-form" class="form-grid" style="padding: 0.5rem 0;">
        <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem; grid-column: 1/-1;">
          <div style="font-size: 1.1rem; font-weight: 800; color: var(--slate-900);">${payroll.teacherName}</div>
          <div style="font-size: 0.8rem; color: var(--slate-600); margin-top: 0.2rem;">
            Payroll Ref: <strong>${payroll.payrollRef}</strong> • Month: <strong>${payroll.salaryMonth}</strong>
          </div>
          <div style="font-size: 1.25rem; font-weight: 800; color: var(--success-700); margin-top: 0.5rem;">
            Net Payable: Rs. ${Number(payroll.netPayable).toLocaleString()}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Actual Amount Paid (PKR) <span class="req-star">*</span></label>
          <input type="number" id="pay-actual-amount" class="form-control" value="${payroll.netPayable}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Disbursement Date <span class="req-star">*</span></label>
          <input type="date" id="pay-actual-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Payment Channel</label>
          <select id="pay-channel-select" class="form-control">
            <option value="Bank Transfer (HBL)">Bank Transfer (HBL)</option>
            <option value="Bank Transfer (Meezan)">Bank Transfer (Meezan)</option>
            <option value="Bank Transfer (UBL)">Bank Transfer (UBL)</option>
            <option value="Bank Transfer (Allied)">Bank Transfer (Allied)</option>
            <option value="Cash Counter">Cash Counter</option>
            <option value="Crossed Cheque">Crossed Cheque</option>
            <option value="EasyPaisa">EasyPaisa</option>
            <option value="JazzCash">JazzCash</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Transaction Ref / Cheque #</label>
          <input type="text" id="pay-actual-ref" class="form-control" placeholder="e.g. HBL-9923812" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label">Accounting Notes</label>
          <input type="text" id="pay-actual-notes" class="form-control" placeholder="Comments..." />
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('disburse-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-confirm-disbursement">Disburse & Generate Official Receipt</button>
    `;

    window.UIUtils.showModal(`Disburse Salary: ${payroll.teacherName}`, content, actions, 'modal-md', 'disburse-modal');

    const modalEl = document.querySelector('#disburse-modal');
    if (!modalEl) return;

    modalEl.querySelector('#btn-confirm-disbursement').onclick = async () => {
      const amt = Number(modalEl.querySelector('#pay-actual-amount').value);
      const date = modalEl.querySelector('#pay-actual-date').value;
      const channel = modalEl.querySelector('#pay-channel-select').value;
      const ref = modalEl.querySelector('#pay-actual-ref').value.trim();
      const notes = modalEl.querySelector('#pay-actual-notes').value.trim();

      if (!amt || amt <= 0) {
        window.UIUtils.showToast('error', 'Amount Required', 'Please enter a valid disbursement amount.');
        return;
      }

      window.UIUtils.closeModal('disburse-modal');

      let disResult = null;
      await window.GlobalLoader.wrap(async () => {
        disResult = await window.FirebaseService.recordTeacherSalaryPayment({
          teacherId: payroll.teacherId,
          teacherName: payroll.teacherName,
          teacherCode: payroll.teacherCode,
          salaryMonth: payroll.salaryMonth,
          academicYear: payroll.academicYear,
          salaryType: payroll.salaryType,
          baseSalary: payroll.baseSalary,
          allowances: payroll.allowances,
          deductions: payroll.deductions,
          netPayable: payroll.netPayable,
          amount: amt,
          paymentDate: date,
          paymentMethod: channel,
          transactionRef: ref,
          notes,
          disbursedBy: 'Super Administrator'
        });
      }, `Processing salary payment for ${payroll.teacherName} and generating official receipt...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Salary Disbursed', `Disbursed Rs. ${amt.toLocaleString()} to ${payroll.teacherName}. Receipt #${disResult.receipt.receiptNumber}`);
      this.render(container);

      if (disResult && disResult.receipt) {
        this.openSalaryReceiptModal(disResult.receipt);
      }
    };
  },

  /**
   * Modal: Configure Teacher Salary
   */
  openEditSalaryConfigModal(container, teacher, cfg) {
    const content = `
      <form id="edit-salcfg-form" class="form-grid" style="padding: 0.5rem 0;">
        <div class="form-group form-col-full">
          <label class="form-label">Faculty Member</label>
          <input type="text" class="form-control" value="${teacher.fullName} (${teacher.teacherId})" disabled style="background: var(--slate-100);" />
        </div>

        <div class="form-group">
          <label class="form-label">Salary Type</label>
          <select id="cfg-saltype" class="form-control">
            <option value="fixed" ${cfg.salaryType === 'fixed' ? 'selected' : ''}>Fixed Monthly Salary</option>
            <option value="per_period" ${cfg.salaryType === 'per_period' ? 'selected' : ''}>Per-Period Rate</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Base Salary or Rate (PKR) <span class="req-star">*</span></label>
          <input type="number" id="cfg-baseamt" class="form-control" value="${cfg.baseAmount || 50000}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Monthly Allowances (PKR)</label>
          <input type="number" id="cfg-allowances" class="form-control" value="${cfg.allowances || 0}" />
        </div>

        <div class="form-group">
          <label class="form-label">Monthly Deductions (PKR)</label>
          <input type="number" id="cfg-deductions" class="form-control" value="${cfg.deductions || 0}" />
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('salcfg-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-salcfg">Save Salary Structure</button>
    `;

    window.UIUtils.showModal(`Salary Settings: ${teacher.fullName}`, content, actions, 'modal-md', 'salcfg-modal');

    const modalEl = document.querySelector('#salcfg-modal');
    if (!modalEl) return;

    modalEl.querySelector('#btn-save-salcfg').onclick = async () => {
      const salType = modalEl.querySelector('#cfg-saltype').value;
      const baseAmt = Number(modalEl.querySelector('#cfg-baseamt').value);
      const allow = Number(modalEl.querySelector('#cfg-allowances').value) || 0;
      const ded = Number(modalEl.querySelector('#cfg-deductions').value) || 0;

      window.UIUtils.closeModal('salcfg-modal');

      await window.GlobalLoader.wrap(async () => {
        const id = `salcfg_${teacher.id}`;
        await window.FirebaseService.updateDocument('salary_configs', id, {
          teacherId: teacher.id,
          teacherName: teacher.fullName,
          salaryType: salType,
          baseAmount: baseAmt,
          allowances: allow,
          deductions: ded,
          updatedAt: new Date().toISOString()
        });

        // Also update teacher document
        await window.FirebaseService.updateDocument('teachers', teacher.id, {
          salaryType: salType,
          salaryAmount: baseAmt
        });

        await window.AuditService.log({
          action: 'Teacher Salary Config Updated',
          category: 'Payroll',
          targetType: 'SalaryConfig',
          targetId: id,
          details: `Updated salary settings for ${teacher.fullName}: Base Rs. ${baseAmt}, Allowances: Rs. ${allow}, Deductions: Rs. ${ded}`
        });
      }, `Updating faculty salary configuration in Cloud Firestore...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Settings Saved', `Salary structure updated for ${teacher.fullName}.`);
      this.render(container);
    };
  },

  /**
   * Modal: Quick Pay Any Teacher Salary (Direct Disbursal with Live Net Calculation)
   */
  openQuickPayModal(container, teachers, configs) {
    const months = window.UIUtils.getMonthsList();
    const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
    const currentYear = new Date().getFullYear();
    const defaultTeacher = teachers[0] || null;

    const content = `
      <form id="quick-pay-salary-form" class="form-grid" style="padding: 0.5rem 0;">
        <div class="form-group form-col-full">
          <label class="form-label">Select Faculty Member <span class="req-star">*</span></label>
          <select id="quick-sal-teacher-select" class="form-control" required>
            ${teachers.map((t, idx) => `
              <option value="${t.id}" ${idx === 0 ? 'selected' : ''}>
                ${t.fullName} (${t.teacherId}) - ${(t.subjects || []).join(', ') || 'Academics'}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Salary Month <span class="req-star">*</span></label>
          <select id="quick-sal-month" class="form-control" required>
            ${months.map(m => `
              <option value="${m} ${currentYear}" ${m === currentMonthName ? 'selected' : ''}>
                ${m} ${currentYear}
              </option>
            `).join('')}
            ${months.map(m => `
              <option value="${m} ${currentYear - 1}">
                ${m} ${currentYear - 1}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Payment Date <span class="req-star">*</span></label>
          <input type="date" id="quick-sal-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Base Salary (PKR) <span class="req-star">*</span></label>
          <input type="number" id="quick-sal-base" class="form-control" value="${defaultTeacher?.salaryAmount || 50000}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Allowances / Bonus (PKR)</label>
          <input type="number" id="quick-sal-allowances" class="form-control" value="0" />
        </div>

        <div class="form-group">
          <label class="form-label">Deductions / Advances (PKR)</label>
          <input type="number" id="quick-sal-deductions" class="form-control" value="0" />
        </div>

        <div class="form-group">
          <label class="form-label">Net Payable Amount (PKR)</label>
          <div style="padding: 0.65rem 0.85rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); font-weight: 800; font-size: 1.15rem; color: #15803d;" id="quick-sal-net-display">
            Rs. ${(defaultTeacher?.salaryAmount || 50000).toLocaleString()}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Payment Channel <span class="req-star">*</span></label>
          <select id="quick-sal-channel" class="form-control" required>
            <option value="Bank Transfer (HBL)">Bank Transfer (HBL)</option>
            <option value="Bank Transfer (Meezan)">Bank Transfer (Meezan)</option>
            <option value="Bank Transfer (UBL)">Bank Transfer (UBL)</option>
            <option value="Bank Transfer (Allied)">Bank Transfer (Allied)</option>
            <option value="Cash Counter">Cash Counter</option>
            <option value="Crossed Cheque">Crossed Cheque</option>
            <option value="EasyPaisa">EasyPaisa</option>
            <option value="JazzCash">JazzCash</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Transaction Ref / Cheque #</label>
          <input type="text" id="quick-sal-ref" class="form-control" placeholder="e.g. HBL-FT-991823" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label">Accounting Notes & Remarks</label>
          <input type="text" id="quick-sal-notes" class="form-control" placeholder="Monthly salary disbursed with official receipt." />
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('quick-pay-modal')">Cancel</button>
      <button type="button" class="btn btn-success" id="btn-submit-quick-pay" style="background: #059669; color: #fff; font-weight: 700;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Disburse Salary & Issue Official Receipt
      </button>
    `;

    window.UIUtils.showModal('Direct Teacher Salary Disbursal', content, actions, 'modal-lg', 'quick-pay-modal');

    const modalEl = document.querySelector('#quick-pay-modal');
    if (!modalEl) return;

    const teacherSelect = modalEl.querySelector('#quick-sal-teacher-select');
    const baseInput = modalEl.querySelector('#quick-sal-base');
    const allowInput = modalEl.querySelector('#quick-sal-allowances');
    const dedInput = modalEl.querySelector('#quick-sal-deductions');
    const netDisplay = modalEl.querySelector('#quick-sal-net-display');

    const recalc = () => {
      const b = Number(baseInput.value) || 0;
      const a = Number(allowInput.value) || 0;
      const d = Number(dedInput.value) || 0;
      const net = Math.max(0, b + a - d);
      netDisplay.textContent = `Rs. ${net.toLocaleString()}`;
      return net;
    };

    baseInput.oninput = recalc;
    allowInput.oninput = recalc;
    dedInput.oninput = recalc;

    teacherSelect.onchange = () => {
      const t = teachers.find(item => item.id === teacherSelect.value);
      if (t) {
        const c = configs.find(item => item.teacherId === t.id);
        const b = Number(c?.baseAmount) || Number(t.salaryAmount) || 50000;
        const a = Number(c?.allowances) || 0;
        const d = Number(c?.deductions) || 0;
        baseInput.value = b;
        allowInput.value = a;
        dedInput.value = d;
        recalc();
      }
    };

    modalEl.querySelector('#btn-submit-quick-pay').onclick = async () => {
      const tId = teacherSelect.value;
      const teacher = teachers.find(item => item.id === tId);
      if (!teacher) return;

      const salaryMonth = modalEl.querySelector('#quick-sal-month').value;
      const paymentDate = modalEl.querySelector('#quick-sal-date').value;
      const b = Number(baseInput.value) || 0;
      const a = Number(allowInput.value) || 0;
      const d = Number(dedInput.value) || 0;
      const net = recalc();
      const paymentMethod = modalEl.querySelector('#quick-sal-channel').value;
      const transactionRef = modalEl.querySelector('#quick-sal-ref').value.trim();
      const notes = modalEl.querySelector('#quick-sal-notes').value.trim();

      if (b <= 0) {
        window.UIUtils.showToast('error', 'Base Salary Required', 'Please enter a valid base salary.');
        return;
      }

      window.UIUtils.closeModal('quick-pay-modal');

      let payResult = null;
      await window.GlobalLoader.wrap(async () => {
        payResult = await window.FirebaseService.recordTeacherSalaryPayment({
          teacherId: teacher.id,
          teacherName: teacher.fullName,
          teacherCode: teacher.teacherId,
          salaryMonth,
          baseSalary: b,
          allowances: a,
          deductions: d,
          netPayable: net,
          amount: net,
          paymentDate,
          paymentMethod,
          transactionRef,
          notes,
          disbursedBy: 'Super Administrator'
        });
      }, `Processing salary payment for ${teacher.fullName} and issuing official receipt...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Salary Disbursed', `Paid Rs. ${net.toLocaleString()} to ${teacher.fullName}. Receipt #${payResult.receipt.receiptNumber}`);
      this.render(container);

      if (payResult && payResult.receipt) {
        this.openSalaryReceiptModal(payResult.receipt);
      }
    };
  },

  /**
   * Modal: Official Teacher Salary Payment Receipt Voucher
   */
  openSalaryReceiptModal(receipt) {
    const rcptNum = receipt.receiptNumber || receipt.payrollRef || 'SAL-OFFICIAL';
    const content = `
      <div style="padding: 0.5rem 0;" id="salary-voucher-print-area">
        <div style="background: #ffffff; border: 2px solid #0f172a; border-radius: 8px; padding: 24px; color: #0f172a; max-width: 600px; margin: 0 auto; box-shadow: var(--shadow-md);">
          <!-- Voucher Header -->
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 1.25rem; font-weight: 800; color: #0f172a; letter-spacing: 0.5px;">IDEAL COACHING CENTER</div>
              <div style="font-size: 0.75rem; color: #d97706; font-weight: 800; text-transform: uppercase;">Faculty Official Salary Payment Receipt</div>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; padding: 3px 8px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-weight: 800; font-size: 0.75rem; border-radius: 4px;">PAID VOUCHER</span>
              <div style="font-size: 0.75rem; font-family: monospace; font-weight: 700; color: #0369a1; margin-top: 4px;">#${rcptNum}</div>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 0.85rem; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <div>Employee Name: <strong style="color: #0f172a;">${receipt.teacherName}</strong></div>
            <div>Employee ID: <strong style="color: #0f172a; font-family: monospace;">#${receipt.teacherCode || receipt.teacherId}</strong></div>
            <div>Salary Period: <strong style="color: #0f172a;">${receipt.salaryMonth}</strong></div>
            <div>Payment Date: <strong style="color: #0f172a;">${receipt.paymentDate || new Date().toISOString().split('T')[0]}</strong></div>
            <div>Payment Channel: <strong style="color: #0f172a;">${receipt.paymentMethod || 'Bank Transfer'}</strong></div>
            <div>Reference / Cheque #: <strong style="color: #0f172a;">${receipt.transactionRef || 'N/A'}</strong></div>
          </div>

          <!-- Earnings Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 0.85rem;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; color: #0f172a;">Salary Breakdown Component</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: right; color: #0f172a;">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #0f172a;">Base Salary / Wage Rate</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: right; font-weight: 700; color: #0f172a;">Rs. ${Number(receipt.baseSalary || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #0f172a;">Allowances & Performance Bonuses</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: right; font-weight: 700; color: #059669;">+ Rs. ${Number(receipt.allowances || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #cbd5e1; padding: 8px 12px; color: #0f172a;">Statutory & Advance Deductions</td>
                <td style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: right; font-weight: 700; color: #dc2626;">- Rs. ${Number(receipt.deductions || 0).toLocaleString()}</td>
              </tr>
              <tr style="background: #ecfdf5; font-weight: 800; font-size: 0.95rem;">
                <td style="border: 1px solid #cbd5e1; padding: 10px 12px; color: #065f46;">Net Disbursed Amount</td>
                <td style="border: 1px solid #cbd5e1; padding: 10px 12px; text-align: right; color: #065f46;">Rs. ${Number(receipt.amountPaid || receipt.actualPaid || receipt.netPayable || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 24px; font-style: italic;">
            Remarks: ${receipt.notes || 'Official Institute faculty salary payment voucher. Validated by Finance Office.'}
          </div>

          <!-- Signatures -->
          <div style="display: flex; justify-content: space-between; margin-top: 36px; font-size: 0.75rem; color: #475569;">
            <div style="border-top: 1px solid #94a3b8; width: 42%; text-align: center; padding-top: 6px;">
              Teacher Signature / Acknowledgment
            </div>
            <div style="border-top: 1px solid #94a3b8; width: 42%; text-align: center; padding-top: 6px;">
              Authorized Accountant / Director
            </div>
          </div>
        </div>
      </div>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('salary-receipt-modal')">Close</button>
      <button type="button" class="btn btn-primary" id="btn-print-salary-voucher">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Print Official Voucher
      </button>
    `;

    window.UIUtils.showModal(`Official Salary Receipt: ${receipt.teacherName}`, content, actions, 'modal-lg', 'salary-receipt-modal');

    const modalEl = document.querySelector('#salary-receipt-modal');
    if (modalEl) {
      modalEl.querySelector('#btn-print-salary-voucher').onclick = () => {
        this.printSalarySlip(receipt);
      };
    }
  },

  /**
   * Print Official Salary Slip
   */
  printSalarySlip(p) {
    const rcptNum = p.receiptNumber || p.payrollRef || 'SAL-OFFICIAL';
    const empId = p.teacherCode || p.teacherId || 'N/A';
    const netDisbursed = Number(p.amountPaid || p.actualPaid || p.netPayable || 0);

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Receipt Voucher - ${p.teacherName} (${p.salaryMonth})</title>
        <style>
          body { font-family: sans-serif; margin: 20px; color: #0f172a; background: #fff; }
          .slip-box { max-width: 650px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 8px; padding: 25px; }
          .hdr { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f8fafc; font-weight: 700; color: #0f172a; }
          @media print { @page { size: A4; margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="slip-box">
          <div class="hdr">
            <div>
              <h2 style="margin: 0; color: #0f172a;">Ideal Coaching Center</h2>
              <div style="font-size: 12px; color: #d97706; font-weight: 700; text-transform: uppercase;">Official Faculty Salary Payment Voucher</div>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; padding: 3px 8px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-weight: 800; font-size: 11px; border-radius: 4px;">PAID VOUCHER</span>
              <div style="font-size: 11px; font-family: monospace; font-weight: 700; color: #0369a1; margin-top: 4px;">#${rcptNum}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px; margin-bottom: 15px;">
            <div>Employee Name: <strong>${p.teacherName}</strong></div>
            <div>Employee ID: <strong>#${empId}</strong></div>
            <div>Pay Period: <strong>${p.salaryMonth}</strong></div>
            <div>Payment Date: <strong>${p.paymentDate || 'N/A'}</strong></div>
            <div>Payment Mode: <strong>${p.paymentMethod || 'Bank Transfer'}</strong></div>
            <div>Transaction Ref: <strong>${p.transactionRef || 'N/A'}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Earnings Component</th>
                <th style="text-align: right;">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary (${p.salaryType === 'per_period' ? 'Per-Period' : 'Monthly Fixed'})</td>
                <td style="text-align: right; font-weight: 600;">Rs. ${(p.baseSalary || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Allowances & Honorariums</td>
                <td style="text-align: right; color: #059669; font-weight: 700;">+ Rs. ${(p.allowances || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td>Deductions & Adjustments</td>
                <td style="text-align: right; color: #dc2626; font-weight: 700;">- Rs. ${(p.deductions || 0).toLocaleString()}</td>
              </tr>
              <tr style="background: #ecfdf5; font-weight: 800; font-size: 14px;">
                <td style="color: #065f46;">Net Disbursed Amount</td>
                <td style="text-align: right; color: #065f46;">Rs. ${netDisbursed.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; margin-top: 50px; font-size: 12px;">
            <div style="border-top: 1px solid #64748b; width: 40%; text-align: center; padding-top: 5px;">
              Teacher Signature / Acknowledgment
            </div>
            <div style="border-top: 1px solid #64748b; width: 40%; text-align: center; padding-top: 5px;">
              Authorized Accountant / Director
            </div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(printHtml);
      w.document.close();
    } else {
      window.print();
    }
  },

  /**
   * Export Payroll Register Sheet
   */
  exportPayrollSheet(payroll) {
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Faculty Payroll Register - ${this.selectedMonth}</title>
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
          <h3>Official Faculty Payroll Register - ${this.selectedMonth}</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Payroll Ref</th>
              <th>Teacher Name</th>
              <th>Code</th>
              <th>Base Salary</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Net Amount</th>
              <th>Status</th>
              <th>Payment Date</th>
            </tr>
          </thead>
          <tbody>
            ${payroll.map(p => `
              <tr>
                <td>${p.payrollRef}</td>
                <td><strong>${p.teacherName}</strong></td>
                <td>${p.teacherCode}</td>
                <td>Rs. ${(p.baseSalary || 0).toLocaleString()}</td>
                <td>Rs. ${(p.allowances || 0).toLocaleString()}</td>
                <td>Rs. ${(p.deductions || 0).toLocaleString()}</td>
                <td><strong>Rs. ${(p.netPayable || 0).toLocaleString()}</strong></td>
                <td>${p.status}</td>
                <td>${p.paymentDate || 'Pending'}</td>
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
  }
};

window.PayrollView = PayrollView;
