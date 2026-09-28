/**
 * Ideal Coaching Center - Reports System
 * Student Lists, Class/Group Analytics, Fee Collection, Attendance %, and Print
 */

const ReportsView = {
  activeReportType: 'fee-collection',

  /**
   * Render Reports Hub for Admin / Super Admin
   */
  async render(container) {
    const settings = await window.FirebaseService.getSystemSettings();
    const students = await window.FirebaseService.getCollection('students');
    const fees = await window.FirebaseService.getCollection('fees');
    const receipts = await window.FirebaseService.getCollection('receipts');
    const attendance = await window.FirebaseService.getCollection('attendance');

    container.innerHTML = `
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">Reports & Analytics Hub</h2>
            <span class="data-card-subtitle">Official statistics, financial sheets, and attendance analytics • Ideal Coaching Center</span>
          </div>
          <div class="data-card-actions">
            <button type="button" class="btn btn-primary btn-sm" id="btn-print-report">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print Current Report
            </button>
          </div>
        </div>

        <div style="padding: 1.5rem;">
          <!-- Report Type Switcher Tabs -->
          <div class="profile-nav-tabs">
            <button type="button" class="profile-tab-btn ${this.activeReportType === 'fee-collection' ? 'active' : ''}" data-report="fee-collection">
              Fee Collection Report
            </button>
            <button type="button" class="profile-tab-btn ${this.activeReportType === 'students-list' ? 'active' : ''}" data-report="students-list">
              Complete Student List
            </button>
            <button type="button" class="profile-tab-btn ${this.activeReportType === 'class-counts' ? 'active' : ''}" data-report="class-counts">
              Class & Group Counts
            </button>
            <button type="button" class="profile-tab-btn ${this.activeReportType === 'attendance-summary' ? 'active' : ''}" data-report="attendance-summary">
              Attendance Percentage Report
            </button>
            <button type="button" class="profile-tab-btn ${this.activeReportType === 'payment-history' ? 'active' : ''}" data-report="payment-history">
              Payment Receipts History
            </button>
          </div>

          <!-- Printable Container with Official Branding -->
          <div id="report-content-viewport" class="printable-receipt-wrapper" style="box-shadow: none; border-color: var(--border-color); max-width: 100%;">
            <!-- Header for Print -->
            <div class="receipt-header" style="border-bottom: 2px solid var(--primary-800); margin-bottom: 1.25rem;">
              <div class="receipt-brand-group">
                <img src="assets/logo.svg" alt="Ideal Coaching Center" class="receipt-logo" />
                <div>
                  <div class="receipt-org-name" style="font-size: 1.35rem;">Ideal Coaching Center</div>
                  <div class="receipt-org-sub">Official Academic & Financial Report</div>
                  <div style="font-size: 0.725rem; color: #64748b; margin-top: 0.15rem;">
                    Academic Year: ${settings.activeAcademicYear} • Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>
              <div class="receipt-title-badge">
                <span class="receipt-badge-title" id="report-badge-heading">REPORT</span>
                <span class="receipt-date-tag">Ideal Coaching Center Portal</span>
              </div>
            </div>

            <!-- Dynamic Report Content -->
            <div id="report-data-tables">
              <!-- Rendered below -->
            </div>
          </div>
        </div>
      </div>
    `;

    this.renderActiveReport(container, { settings, students, fees, receipts, attendance });
    this.bindEvents(container);
  },

  renderActiveReport(container, data) {
    const tableViewport = container.querySelector('#report-data-tables');
    const badgeHeading = container.querySelector('#report-badge-heading');
    if (!tableViewport) return;

    if (this.activeReportType === 'fee-collection') {
      badgeHeading.textContent = 'FEE COLLECTION & DUES REPORT';
      const totalExpected = data.fees.reduce((acc, f) => acc + (Number(f.expectedAmount) || 0), 0);
      const totalPaid = data.fees.reduce((acc, f) => acc + (Number(f.paidAmount) || 0), 0);
      const totalPending = totalExpected - totalPaid;

      tableViewport.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: var(--slate-50); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); text-align: center;">
            <div style="font-size: 0.725rem; font-weight: 700; color: var(--slate-500); text-transform: uppercase;">Total Expected Fees</div>
            <div style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; color: var(--slate-900);">${window.UIUtils.formatCurrency(totalExpected)}</div>
          </div>
          <div style="background: #f0fdf4; padding: 1rem; border-radius: var(--radius-md); border: 1px solid #bbf7d0; text-align: center;">
            <div style="font-size: 0.725rem; font-weight: 700; color: #166534; text-transform: uppercase;">Total Fees Collected</div>
            <div style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; color: var(--success-600);">${window.UIUtils.formatCurrency(totalPaid)}</div>
          </div>
          <div style="background: #fffbeb; padding: 1rem; border-radius: var(--radius-md); border: 1px solid #fde68a; text-align: center;">
            <div style="font-size: 0.725rem; font-weight: 700; color: #92400e; text-transform: uppercase;">Total Outstanding Pending</div>
            <div style="font-family: var(--font-heading); font-size: 1.5rem; font-weight: 800; color: var(--warning-600);">${window.UIUtils.formatCurrency(totalPending)}</div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="app-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Class & Group</th>
                <th>Months Cleared</th>
                <th>Total Expected</th>
                <th>Paid Amount</th>
                <th>Balance Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.students.map(s => {
                const sFees = data.fees.filter(f => f.studentId === s.id);
                const sExp = sFees.reduce((a, b) => a + (Number(b.expectedAmount) || 0), 0);
                const sPaid = sFees.reduce((a, b) => a + (Number(b.paidAmount) || 0), 0);
                const sBal = sExp - sPaid;
                const paidCount = sFees.filter(f => f.status === 'Paid').length;

                return `
                  <tr>
                    <td style="font-family: var(--font-mono); font-weight: 700;">#${s.rollNumber}</td>
                    <td><strong>${s.fullName}</strong></td>
                    <td>${s.class} (${s.group})</td>
                    <td>${paidCount} / 12 Months</td>
                    <td>${window.UIUtils.formatCurrency(sExp)}</td>
                    <td style="color: var(--success-600); font-weight: 700;">${window.UIUtils.formatCurrency(sPaid)}</td>
                    <td style="color: ${sBal > 0 ? 'var(--warning-600)' : 'var(--slate-500)'}; font-weight: 700;">${window.UIUtils.formatCurrency(sBal)}</td>
                    <td>
                      <span class="badge ${sBal === 0 ? 'badge-paid' : 'badge-pending'}">
                        ${sBal === 0 ? 'Fully Cleared' : 'Pending Dues'}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (this.activeReportType === 'students-list') {
      badgeHeading.textContent = 'COMPLETE ENROLLED STUDENTS DIRECTORY';
      tableViewport.innerHTML = `
        <div class="table-responsive">
          <table class="app-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student Full Name</th>
                <th>Father's Name</th>
                <th>Class</th>
                <th>Group</th>
                <th>Contact</th>
                <th>Admission Date</th>
                <th>Account Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.students.map(s => `
                <tr>
                  <td style="font-family: var(--font-mono); font-weight: 700;">#${s.rollNumber}</td>
                  <td><strong>${s.fullName}</strong></td>
                  <td>${s.fatherName}</td>
                  <td><span class="badge badge-studying">${s.class}</span></td>
                  <td>${s.group}</td>
                  <td>${s.contactNumber}</td>
                  <td>${window.UIUtils.formatDate(s.admissionDate || s.createdAt)}</td>
                  <td><span class="badge ${s.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${s.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (this.activeReportType === 'class-counts') {
      badgeHeading.textContent = 'CLASS & GROUP WISE STUDENT DISTRIBUTION';
      const classMap = { '9th': 0, '10th': 0, '11th': 0, '12th': 0 };
      const groupMap = {};

      data.students.forEach(s => {
        if (classMap[s.class] !== undefined) classMap[s.class]++;
        const grpKey = `${s.class} - ${s.group}`;
        groupMap[grpKey] = (groupMap[grpKey] || 0) + 1;
      });

      tableViewport.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <div>
            <h4 style="margin-bottom: 0.75rem; font-size: 1rem;">Students by Class</h4>
            <table class="app-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th class="text-right">Enrolled Students</th>
                  <th class="text-right">Share (%)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(classMap).map(([cls, count]) => `
                  <tr>
                    <td><strong>Class ${cls}</strong></td>
                    <td class="text-right font-bold">${count}</td>
                    <td class="text-right">${data.students.length > 0 ? ((count / data.students.length) * 100).toFixed(1) : 0}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div>
            <h4 style="margin-bottom: 0.75rem; font-size: 1rem;">Students by Academic Stream</h4>
            <table class="app-table">
              <thead>
                <tr>
                  <th>Class & Group</th>
                  <th class="text-right">Student Count</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(groupMap).map(([grp, count]) => `
                  <tr>
                    <td><strong>${grp}</strong></td>
                    <td class="text-right font-bold">${count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (this.activeReportType === 'attendance-summary') {
      badgeHeading.textContent = 'ATTENDANCE PERCENTAGE REPORT';
      tableViewport.innerHTML = `
        <div class="table-responsive">
          <table class="app-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student Name</th>
                <th>Class & Group</th>
                <th>Present Days</th>
                <th>Absent Days</th>
                <th>Leave Days</th>
                <th>Working Days</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              ${data.students.map(s => {
                const attData = window.UIUtils.calculateMonthlyAttendance(data.attendance, s.id);
                const pCount = attData.presentDays;
                const aCount = attData.absentDays;
                const lCount = attData.leaveDays;
                const totalWorking = attData.totalMonthWorkingDays;
                const pct = attData.attPct;

                return `
                  <tr>
                    <td style="font-family: var(--font-mono); font-weight: 700;">#${s.rollNumber}</td>
                    <td><strong>${s.fullName}</strong></td>
                    <td>${s.class} (${s.group})</td>
                    <td style="color: var(--success-600); font-weight: 700;">${pCount}</td>
                    <td style="color: var(--danger-600); font-weight: 700;">${aCount}</td>
                    <td style="color: var(--info-600); font-weight: 700;">${lCount}</td>
                    <td>${pCount} / ${totalWorking} Days</td>
                    <td>
                      <span class="badge ${pct >= 75 ? 'badge-paid' : pct >= 50 ? 'badge-pending' : 'badge-absent'}">
                        ${pct}%
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else if (this.activeReportType === 'payment-history') {
      badgeHeading.textContent = 'ISSUED 10-DIGIT PAYMENT RECEIPTS';
      tableViewport.innerHTML = `
        <div class="table-responsive">
          <table class="app-table">
            <thead>
              <tr>
                <th>10-Digit Receipt #</th>
                <th>Student Name</th>
                <th>Roll No</th>
                <th>Class</th>
                <th>Fee Month</th>
                <th>Amount Paid</th>
                <th>Payment Date</th>
                <th>Delivered to Student</th>
              </tr>
            </thead>
            <tbody>
              ${data.receipts.length === 0 ? `
                <tr><td colspan="8" style="text-align: center; color: var(--slate-500);">No receipts issued yet.</td></tr>
              ` : data.receipts.map(r => `
                <tr>
                  <td style="font-family: var(--font-mono); font-weight: 800; color: var(--primary-700);">#${r.receiptNumber}</td>
                  <td><strong>${r.studentName}</strong></td>
                  <td>#${r.rollNumber}</td>
                  <td>${r.class} (${r.group})</td>
                  <td><strong>${r.month}</strong></td>
                  <td style="color: var(--success-600); font-weight: 700;">${window.UIUtils.formatCurrency(r.paidAmount)}</td>
                  <td>${window.UIUtils.formatDate(r.paymentDate)}</td>
                  <td>
                    <span class="badge ${r.availableToStudent ? 'badge-paid' : 'badge-notstarted'}">
                      ${r.availableToStudent ? 'Delivered ✓' : 'Admin Only'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  },

  bindEvents(container) {
    container.querySelectorAll('.profile-tab-btn').forEach(btn => {
      btn.onclick = async () => {
        const reportKey = btn.getAttribute('data-report');
        this.activeReportType = reportKey;
        await window.GlobalLoader.wrap(async () => {
          this.render(container);
        }, 'Compiling report analytics...', 'Ideal Coaching Center');
      };
    });

    const printBtn = container.querySelector('#btn-print-report');
    if (printBtn) {
      printBtn.onclick = () => window.print();
    }
  }
};

window.ReportsView = ReportsView;
