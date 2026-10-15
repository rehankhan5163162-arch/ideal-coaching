/**
 * Ideal Coaching Center - Teacher Portal & Restricted Faculty Dashboard
 * Private view for authenticated teachers:
 * Dashboard, My Profile, My Timetable, My Classes, My Attendance, My Salary, and QR Badge.
 */

const TeacherPortalView = {
  currentTab: 'dashboard',

  async render(container, teacher) {
    if (!teacher) {
      container.innerHTML = `<div class="data-card" style="padding: 2rem; text-align: center;">Please sign in with a valid faculty account.</div>`;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

    const allTimetables = await window.FirebaseService.getCollection('timetables');
    const myTimetable = allTimetables.filter(t => t.teacherId === teacher.id && t.isPublished);

    const allAssignments = await window.FirebaseService.getCollection('teacher_assignments');
    const myAssignments = allAssignments.filter(a => a.teacherId === teacher.id);

    const allAttendance = await window.FirebaseService.getCollection('teacher_attendance');
    const myAttendance = allAttendance.filter(a => a.teacherId === teacher.id);

    const allPayroll = await window.FirebaseService.getCollection('payroll');
    const myPayroll = allPayroll.filter(p => p.teacherId === teacher.id);
    const myReceipts = await window.FirebaseService.getTeacherSalaryReceipts(teacher.id);

    const cards = await window.FirebaseService.getCollection('attendance_cards');
    const myCard = cards.find(c => c.personId === teacher.id && c.personType === 'teacher');

    const announcements = await window.FirebaseService.getCollection('announcements');

    // Today's scheduled periods
    const todayPeriods = myTimetable.filter(t => t.day === todayDayName).sort((a, b) => a.periodNumber - b.periodNumber);

    container.innerHTML = `
      <!-- Welcome Header Banner -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: var(--radius-xl); padding: 1.75rem 2rem; color: #ffffff; margin-bottom: 1.75rem; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: var(--shadow-lg);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.3); color: #7dd3fc; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.725rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">
              Faculty Portal • ${teacher.teacherId}
            </div>
            <h1 style="color: #ffffff; font-size: 1.75rem; margin: 0;">Welcome, ${teacher.fullName}</h1>
            <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.35rem;">
              Today is <strong>${todayDayName}, ${todayStr}</strong> • Ideal Coaching Center Management Portal
            </p>
          </div>
          <div style="display: flex; gap: 0.65rem;">
            <button type="button" class="btn btn-secondary" id="btn-tch-view-badge">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="9" cy="9" r="2"></circle>
              </svg>
              My QR Attendance Card
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="stats-grid" style="margin-bottom: 1.75rem;">
        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Today's Lectures</span>
            <span class="stat-value">${todayPeriods.length}</span>
            <span class="stat-subtext">${todayDayName} Schedule</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Assigned Classes</span>
            <span class="stat-value">${myAssignments.length}</span>
            <span class="stat-subtext">Teaching Streams</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Latest Salary Status</span>
            <span class="stat-value" style="font-size: 1.25rem; color: var(--success-600);">
              ${myPayroll.length > 0 ? myPayroll[myPayroll.length - 1].status : 'Current'}
            </span>
            <span class="stat-subtext">${myPayroll.length > 0 ? myPayroll[myPayroll.length - 1].salaryMonth : '2026'}</span>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-nav" style="margin-bottom: 1.5rem; display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; overflow-x: auto;">
        <button type="button" class="tab-btn ${this.currentTab === 'dashboard' ? 'active-tab' : ''}" id="tab-tch-dash" style="padding: 0.6rem 1.15rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.currentTab === 'dashboard' ? 'var(--primary-600)' : 'transparent'}; color: ${this.currentTab === 'dashboard' ? '#fff' : 'var(--slate-600)'}; white-space: nowrap;">
          My Dashboard
        </button>
        <button type="button" class="tab-btn ${this.currentTab === 'timetable' ? 'active-tab' : ''}" id="tab-tch-tt" style="padding: 0.6rem 1.15rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.currentTab === 'timetable' ? 'var(--primary-600)' : 'transparent'}; color: ${this.currentTab === 'timetable' ? '#fff' : 'var(--slate-600)'}; white-space: nowrap;">
          My Timetable (${myTimetable.length})
        </button>
        <button type="button" class="tab-btn ${this.currentTab === 'classes' ? 'active-tab' : ''}" id="tab-tch-cls" style="padding: 0.6rem 1.15rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.currentTab === 'classes' ? 'var(--primary-600)' : 'transparent'}; color: ${this.currentTab === 'classes' ? '#fff' : 'var(--slate-600)'}; white-space: nowrap;">
          My Classes (${myAssignments.length})
        </button>
        <button type="button" class="tab-btn ${this.currentTab === 'attendance' ? 'active-tab' : ''}" id="tab-tch-att" style="padding: 0.6rem 1.15rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.currentTab === 'attendance' ? 'var(--primary-600)' : 'transparent'}; color: ${this.currentTab === 'attendance' ? '#fff' : 'var(--slate-600)'}; white-space: nowrap;">
          My Attendance
        </button>
        <button type="button" class="tab-btn ${this.currentTab === 'salary' ? 'active-tab' : ''}" id="tab-tch-sal" style="padding: 0.6rem 1.15rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.currentTab === 'salary' ? 'var(--primary-600)' : 'transparent'}; color: ${this.currentTab === 'salary' ? '#fff' : 'var(--slate-600)'}; white-space: nowrap;">
          My Salary & Slips
        </button>
      </div>

      <!-- Tab Content Renderers -->
      ${this.renderActiveTab(teacher, todayPeriods, myTimetable, myAssignments, myAttendance, myPayroll, announcements, myCard, myReceipts)}
    `;

    this.attachEvents(container, teacher, myCard, myPayroll, myReceipts);
  },

  renderActiveTab(teacher, todayPeriods, myTimetable, myAssignments, myAttendance, myPayroll, announcements, myCard, myReceipts = []) {
    if (this.currentTab === 'dashboard') {
      return `
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; align-items: start;">
          <!-- Left Column: Today's Schedule -->
          <div class="data-card" style="margin-bottom: 0;">
            <div class="data-card-header">
              <h3 class="data-card-title">Today's Teaching Schedule</h3>
              <span class="badge badge-paid">Official Timetable</span>
            </div>
            <div style="padding: 1.25rem;">
              ${todayPeriods.length === 0 ? `
                <div style="text-align: center; color: var(--slate-500); padding: 2rem;">
                  No lectures scheduled for today.
                </div>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                  ${todayPeriods.map(p => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: var(--slate-50); border: 1px solid var(--border-color); border-left: 4px solid var(--primary-600); border-radius: var(--radius-md);">
                      <div>
                        <span style="font-size: 0.75rem; font-weight: 800; color: var(--primary-600); text-transform: uppercase;">
                          Period ${p.periodNumber} (${p.startTime} - ${p.endTime})
                        </span>
                        <div style="font-size: 1.05rem; font-weight: 800; color: var(--slate-900); margin: 0.2rem 0;">
                          ${p.subject}
                        </div>
                        <div style="font-size: 0.8rem; color: var(--slate-600);">
                          Class ${p.class} • ${p.group} • Room: <strong>${p.room || 'General'}</strong>
                        </div>
                      </div>
                      <span class="badge badge-studying">Scheduled</span>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>

          <!-- Right Column: Institutional Announcements -->
          <div class="data-card" style="margin-bottom: 0;">
            <div class="data-card-header">
              <h3 class="data-card-title">Faculty Announcements</h3>
            </div>
            <div style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
              ${announcements.slice(-3).reverse().map(a => `
                <div style="padding: 0.85rem; background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                  <strong style="font-size: 0.9rem; color: var(--slate-900); display: block;">${a.title}</strong>
                  <div style="font-size: 0.8rem; color: var(--slate-600); margin-top: 0.25rem; line-height: 1.35;">
                    ${a.content}
                  </div>
                  <div style="font-size: 0.7rem; color: var(--slate-400); margin-top: 0.4rem;">
                    ${a.publishedBy || 'Administration'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (this.currentTab === 'timetable') {
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `
        <div class="data-card">
          <div class="data-card-header">
            <h3 class="data-card-title">My Official Weekly Schedule</h3>
            <span class="badge badge-paid">Published Timetable</span>
          </div>

          <div style="padding: 1.25rem;">
            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              ${weekdays.map(day => {
                const dayP = myTimetable.filter(t => t.day === day).sort((a, b) => a.periodNumber - b.periodNumber);
                if (dayP.length === 0) return '';

                return `
                  <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden;">
                    <div style="background: var(--slate-50); padding: 0.65rem 1rem; font-weight: 800; color: var(--slate-900);">
                      ${day}
                    </div>
                    <div style="padding: 0.85rem 1rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem;">
                      ${dayP.map(p => `
                        <div style="background: #fff; border: 1px solid var(--border-color); border-left: 3px solid var(--primary-600); padding: 0.75rem; border-radius: var(--radius-sm);">
                          <div style="font-size: 0.75rem; font-weight: 700; color: var(--primary-600);">
                            Period ${p.periodNumber} (${p.startTime}-${p.endTime})
                          </div>
                          <strong style="font-size: 0.95rem; color: var(--slate-900); display: block; margin: 0.2rem 0;">
                            ${p.subject}
                          </strong>
                          <div style="font-size: 0.75rem; color: var(--slate-600);">
                            Class ${p.class} (${p.group}) • ${p.room}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (this.currentTab === 'classes') {
      return `
        <div class="data-card">
          <div class="data-card-header">
            <h3 class="data-card-title">My Assigned Classes & Subjects</h3>
            <span class="badge badge-studying">Current Academic Year</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Class</th>
                  <th>Group</th>
                  <th>Academic Cycle</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${myAssignments.map(a => `
                  <tr>
                    <td><strong>${a.subject}</strong></td>
                    <td>Class ${a.class}</td>
                    <td>${a.group}</td>
                    <td>${a.academicYear}</td>
                    <td><span class="badge badge-paid">${a.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (this.currentTab === 'attendance') {
      return `
        <div class="data-card">
          <div class="data-card-header">
            <h3 class="data-card-title">My Attendance Record</h3>
            <span class="badge badge-paid">QR Gate Scans</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Arrival Time</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                ${myAttendance.length === 0 ? `
                  <tr><td colspan="4" style="text-align: center; color: #334155; padding: 2.5rem; font-weight: 600;">No attendance scans logged yet.</td></tr>
                ` : myAttendance.map(a => `
                  <tr>
                    <td><strong style="color: #0f172a;">${a.date}</strong></td>
                    <td><span class="badge badge-paid" style="font-weight: 800;">${a.status}</span></td>
                    <td style="color: #0f172a; font-weight: 600;">${a.arrivalTime || 'On Time'}</td>
                    <td style="color: #334155; font-weight: 600;">${a.method || 'QR Scan'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (this.currentTab === 'salary') {
      return `
        <!-- Disbursed Salary Receipts Vouchers -->
        <div class="data-card" style="margin-bottom: 1.5rem;">
          <div class="data-card-header">
            <div>
              <h3 class="data-card-title">Official Disbursed Salary Receipts</h3>
              <span class="data-card-subtitle">Official payment receipts generated and delivered to your profile</span>
            </div>
            <span class="badge badge-paid">Delivered to Account</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Salary Month</th>
                  <th>Disbursed Amount</th>
                  <th>Payment Channel</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${myReceipts.length === 0 ? `
                  <tr><td colspan="7" style="text-align: center; color: #334155; padding: 2rem; font-weight: 600;">No disbursed salary receipts received yet.</td></tr>
                ` : myReceipts.map(r => `
                  <tr>
                    <td><strong style="color: #0369a1; font-family: monospace;">#${r.receiptNumber}</strong></td>
                    <td><strong style="color: #0f172a;">${r.salaryMonth}</strong></td>
                    <td><strong style="color: #047857; font-size: 0.95rem;">Rs. ${Number(r.amountPaid || r.actualPaid || r.netPayable || 0).toLocaleString()}</strong></td>
                    <td>${r.paymentMethod || 'Bank Transfer'}</td>
                    <td>${r.paymentDate || 'N/A'}</td>
                    <td><span class="badge badge-paid">Official Receipt</span></td>
                    <td style="text-align: right;">
                      <button type="button" class="btn btn-sm btn-primary btn-tch-print-sal-voucher" data-rcpt="${r.receiptNumber}" style="background: #0284c7; border-color: #0284c7;">
                        Print Receipt Voucher
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Monthly Payroll Statements Table -->
        <div class="data-card">
          <div class="data-card-header">
            <h3 class="data-card-title">Monthly Payroll Statements & Slips</h3>
            <span class="badge badge-paid">Official Disbursements</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Pay Period</th>
                  <th>Payroll Ref</th>
                  <th>Base Amount</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Net Disbursed</th>
                  <th>Status</th>
                  <th style="text-align: right;">Salary Slip</th>
                </tr>
              </thead>
              <tbody>
                ${myPayroll.length === 0 ? `
                  <tr><td colspan="8" style="text-align: center; color: #334155; padding: 2.5rem; font-weight: 600;">No salary statements released yet.</td></tr>
                ` : myPayroll.map(p => `
                  <tr>
                    <td><strong style="color: #0f172a;">${p.salaryMonth}</strong></td>
                    <td><strong style="color: #0369a1; font-family: monospace;">#${p.payrollRef}</strong></td>
                    <td style="color: #0f172a; font-weight: 600;">Rs. ${(p.baseSalary || 0).toLocaleString()}</td>
                    <td><span style="color: #047857; font-weight: 700;">+ Rs. ${(p.allowances || 0).toLocaleString()}</span></td>
                    <td><span style="color: #b91c1c; font-weight: 700;">- Rs. ${(p.deductions || 0).toLocaleString()}</span></td>
                    <td><strong style="color: #0f172a; font-size: 0.95rem;">Rs. ${(p.actualPaid || p.netPayable).toLocaleString()}</strong></td>
                    <td><span class="badge ${p.status === 'Paid' ? 'badge-paid' : 'badge-warning'}" style="font-weight: 700;">${p.status}</span></td>
                    <td style="text-align: right;">
                      <button type="button" class="btn btn-sm btn-secondary btn-tch-print-slip" data-id="${p.id}">
                        Print Slip
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    return '';
  },

  attachEvents(container, teacher, myCard, myPayroll, myReceipts = []) {
    // Tabs
    const tabDash = container.querySelector('#tab-tch-dash');
    const tabTT = container.querySelector('#tab-tch-tt');
    const tabCls = container.querySelector('#tab-tch-cls');
    const tabAtt = container.querySelector('#tab-tch-att');
    const tabSal = container.querySelector('#tab-tch-sal');

    if (tabDash) tabDash.onclick = () => { this.currentTab = 'dashboard'; this.render(container, teacher); };
    if (tabTT) tabTT.onclick = () => { this.currentTab = 'timetable'; this.render(container, teacher); };
    if (tabCls) tabCls.onclick = () => { this.currentTab = 'classes'; this.render(container, teacher); };
    if (tabAtt) tabAtt.onclick = () => { this.currentTab = 'attendance'; this.render(container, teacher); };
    if (tabSal) tabSal.onclick = () => { this.currentTab = 'salary'; this.render(container, teacher); };

    // View QR Attendance badge button
    const btnBadge = container.querySelector('#btn-tch-view-badge');
    if (btnBadge) {
      btnBadge.onclick = () => {
        if (window.AttendanceCardsView && myCard) {
          window.AttendanceCardsView.printSingleCard(teacher, myCard, 'teacher');
        } else {
          window.UIUtils.showToast('info', 'Badge Generating', 'Your attendance badge is active.');
        }
      };
    }

    // Print Salary Slip
    container.querySelectorAll('.btn-tch-print-slip').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const p = myPayroll.find(item => item.id === id);
        if (p && window.PayrollView) {
          window.PayrollView.printSalarySlip(p);
        }
      };
    });

    // View / Print Official Salary Receipt Voucher
    container.querySelectorAll('.btn-tch-print-sal-voucher').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const r = myReceipts.find(item => item.id === id || item.receiptNumber === id);
        if (r && window.PayrollView && window.PayrollView.openSalaryReceiptModal) {
          window.PayrollView.openSalaryReceiptModal(r);
        } else if (r && window.PayrollView && window.PayrollView.printSalarySlip) {
          window.PayrollView.printSalarySlip(r);
        } else {
          window.UIUtils.showToast('info', 'Salary Voucher', 'Voucher details loaded.');
        }
      };
    });
  },

  async getTeacherUser() {
    const user = window.AuthService.getCurrentUser();
    if (!user) return null;
    if (user.role === 'teacher') {
      const teachers = await window.FirebaseService.getCollection('teachers');
      return teachers.find(t => t.id === user.id || t.teacherId === user.teacherId) || user;
    }
    // If admin is previewing teacher portal, pick first active teacher
    const teachers = await window.FirebaseService.getCollection('teachers');
    return teachers[0] || null;
  },

  async renderDashboard(container) {
    this.currentTab = 'dashboard';
    const teacher = await this.getTeacherUser();
    await this.render(container, teacher);
  },

  async renderTimetable(container) {
    this.currentTab = 'timetable';
    const teacher = await this.getTeacherUser();
    await this.render(container, teacher);
  },

  async renderClasses(container) {
    this.currentTab = 'classes';
    const teacher = await this.getTeacherUser();
    await this.render(container, teacher);
  },

  async renderAttendance(container) {
    this.currentTab = 'attendance';
    const teacher = await this.getTeacherUser();
    await this.render(container, teacher);
  },

  async renderSalary(container) {
    this.currentTab = 'salary';
    const teacher = await this.getTeacherUser();
    await this.render(container, teacher);
  },

  async renderBadge(container) {
    const teacher = await this.getTeacherUser();
    if (!teacher) return;
    const cards = await window.FirebaseService.getCollection('attendance_cards');
    const myCard = cards.find(c => c.personId === teacher.id && c.personType === 'teacher') || {
      token: `ICC-TCH-${teacher.teacherId || teacher.id}`,
      status: 'Active'
    };
    if (window.AttendanceCardsView) {
      window.AttendanceCardsView.printSingleCard(teacher, myCard, 'teacher');
    }
  },

  async renderProfile(container) {
    const teacher = await this.getTeacherUser();
    if (!teacher) {
      container.innerHTML = `<div class="data-card" style="padding: 2rem; text-align: center;">Teacher profile not found.</div>`;
      return;
    }

    const [cards, receipts] = await Promise.all([
      window.FirebaseService.getCollection('attendance_cards'),
      window.FirebaseService.getTeacherSalaryReceipts ? window.FirebaseService.getTeacherSalaryReceipts(teacher.id) : window.FirebaseService.getCollection('salary_receipts')
    ]);

    const myCard = (cards || []).find(c => c.personId === teacher.id && c.personType === 'teacher') || {
      token: `ICC-TCH-${teacher.teacherId || teacher.id}`,
      status: 'Active'
    };

    const myReceipts = (receipts || []).filter(r => r.teacherId === teacher.id || r.teacherId === teacher.teacherId);
    myReceipts.sort((a, b) => new Date(b.createdAt || b.paymentDate || 0) - new Date(a.createdAt || a.paymentDate || 0));

    const qrSvg = window.QRCodeGenerator ? window.QRCodeGenerator.generateSVG(myCard.token, 130) : '';

    container.innerHTML = `
      <div style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.75rem;">
        
        <!-- Top Row: Faculty Record & Official Gate Pass Badge -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.5rem; align-items: start;">
          
          <!-- Faculty Record Details -->
          <div class="data-card" style="margin-bottom: 0;">
            <div class="data-card-header">
              <div class="data-card-title-group">
                <h2 class="data-card-title">My Faculty Profile</h2>
                <span class="data-card-subtitle">Official Appointment Record • Ideal Coaching Center</span>
              </div>
            </div>

            <div style="padding: 1.75rem;">
              <div style="display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-color);">
                <div class="user-avatar" style="width: 64px; height: 64px; font-size: 1.5rem; background: var(--primary-700); color: #fff;">
                  ${(teacher.fullName || 'T').charAt(0)}
                </div>
                <div>
                  <h2 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem 0;">${teacher.fullName}</h2>
                  <p style="color: var(--slate-600); font-size: 0.85rem; margin: 0;">
                    Faculty ID: <strong style="color: var(--primary-700); font-family: monospace;">#${teacher.teacherId}</strong> • <strong>${teacher.qualifications || 'N/A'}</strong>
                  </p>
                </div>
              </div>

              <div class="profile-info-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="profile-info-item">
                  <span class="profile-info-label" style="font-weight: 600; color: var(--slate-500); font-size: 0.75rem;">Specialization / Subjects</span>
                  <span class="profile-info-val" style="font-weight: 700; color: #0f172a; font-size: 0.9rem;">${(teacher.subjects || []).join(', ') || 'General Faculty'}</span>
                </div>
                <div class="profile-info-item">
                  <span class="profile-info-label" style="font-weight: 600; color: var(--slate-500); font-size: 0.75rem;">Contact Number</span>
                  <span class="profile-info-val" style="font-weight: 700; color: #0f172a; font-size: 0.9rem;">${teacher.contactNumber || 'N/A'}</span>
                </div>
                <div class="profile-info-item">
                  <span class="profile-info-label" style="font-weight: 600; color: var(--slate-500); font-size: 0.75rem;">Email Address</span>
                  <span class="profile-info-val" style="font-weight: 700; color: #0f172a; font-size: 0.9rem;">${teacher.email}</span>
                </div>
                <div class="profile-info-item">
                  <span class="profile-info-label" style="font-weight: 600; color: var(--slate-500); font-size: 0.75rem;">Joining Date</span>
                  <span class="profile-info-val" style="font-weight: 700; color: #0f172a; font-size: 0.9rem;">${teacher.joiningDate || 'Permanent'}</span>
                </div>
                <div class="profile-info-item">
                  <span class="profile-info-label" style="font-weight: 600; color: var(--slate-500); font-size: 0.75rem;">Base Monthly Salary</span>
                  <span class="profile-info-val" style="font-weight: 800; color: #047857; font-size: 0.95rem;">Rs. ${(Number(teacher.baseSalary || teacher.salaryAmount || 0)).toLocaleString()}</span>
                </div>
                <div class="profile-info-item">
                  <span class="profile-info-label" style="font-weight: 600; color: var(--slate-500); font-size: 0.75rem;">Faculty Status</span>
                  <span class="badge ${teacher.status === 'Active' || teacher.accountStatus === 'Active' ? 'badge-active' : 'badge-inactive'}" style="width: fit-content; font-weight: 700;">${teacher.accountStatus || teacher.status || 'Active'}</span>
                </div>
              </div>

              <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-secondary" id="btn-tch-update-profile">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Update Profile
                </button>
              </div>
            </div>
          </div>

          <!-- Official Faculty QR Attendance Gate Pass -->
          <div class="data-card" style="margin-bottom: 0; overflow: hidden; border: 2px solid #059669; box-shadow: var(--shadow-md);">
            <div style="background: linear-gradient(135deg, #059669 0%, #064e3b 100%); color: #ffffff; padding: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 32px; height: 32px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.85rem;">
                  ICC
                </div>
                <div>
                  <div style="font-size: 0.9rem; font-weight: 800; letter-spacing: 0.5px;">IDEAL COACHING CENTER</div>
                  <div style="font-size: 0.72rem; color: #a7f3d0; font-weight: 600;">FACULTY DIGITAL GATE PASS</div>
                </div>
              </div>
              <span class="badge" style="background: rgba(255,255,255,0.25); color: #fff; font-size: 0.72rem; font-weight: 700;">
                Verified Faculty
              </span>
            </div>

            <div style="padding: 1.5rem; text-align: center; background: #ffffff;">
              <div style="display: inline-block; background: #ffffff; padding: 0.75rem; border: 2px dashed #059669; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); margin-bottom: 1rem;">
                ${qrSvg || '<p>QR Code Ready</p>'}
              </div>

              <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin-bottom: 0.25rem;">
                ${teacher.fullName}
              </div>
              <div style="display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-weight: 700; font-size: 0.8rem; padding: 0.2rem 0.65rem; border-radius: var(--radius-full); margin-bottom: 1rem;">
                Faculty ID: #${teacher.teacherId}
              </div>

              <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.6rem 0.8rem; font-size: 0.75rem; color: var(--slate-600); margin-bottom: 1.25rem; text-align: left;">
                <div>Security Token: <code style="font-weight: 700; color: #0f172a;">${myCard.token}</code></div>
                <div style="margin-top: 0.25rem;">Authorized Area: <strong>Senior Academic Wing & Classrooms</strong></div>
              </div>

              <button type="button" class="btn btn-primary" id="btn-tch-prof-print-gatepass" style="width: 100%; justify-content: center; background: #059669; border-color: #059669; font-weight: 700;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                Print Official Gate Pass
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom Section: Official Disbursed Salary Receipts -->
        <div class="data-card">
          <div class="data-card-header">
            <div class="data-card-title-group">
              <h2 class="data-card-title">My Disbursed Salary Receipts</h2>
              <span class="data-card-subtitle">Official Institute Vouchers for Processed & Paid Compensation</span>
            </div>
          </div>

          <div class="table-responsive">
            <table class="data-table" style="color: #0f172a; width: 100%;">
              <thead>
                <tr style="background: var(--slate-100);">
                  <th style="color: #0f172a; font-weight: 800;">Receipt #</th>
                  <th style="color: #0f172a; font-weight: 800;">Salary Month</th>
                  <th style="color: #0f172a; font-weight: 800;">Amount Paid</th>
                  <th style="color: #0f172a; font-weight: 800;">Payment Mode</th>
                  <th style="color: #0f172a; font-weight: 800;">Disbursed On</th>
                  <th style="color: #0f172a; font-weight: 800; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${myReceipts.length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--slate-500);">
                      <div style="font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem;">No Disbursed Salary Receipts Yet</div>
                      <div>Once salary is disbursed by the institute administration, your official signed salary voucher will appear here.</div>
                    </td>
                  </tr>
                ` : myReceipts.map(r => `
                  <tr>
                    <td>
                      <span style="font-weight: 800; color: #047857; font-family: monospace;">${r.receiptNumber || r.id}</span>
                    </td>
                    <td>
                      <strong style="color: #0f172a;">${r.salaryMonth || 'Monthly Salary'}</strong>
                    </td>
                    <td>
                      <strong style="color: #047857; font-size: 0.95rem;">Rs. ${(Number(r.netSalary || r.amountPaid || 0)).toLocaleString()}</strong>
                    </td>
                    <td>
                      <span class="badge" style="background: var(--slate-100); color: #0f172a; font-weight: 700; border: 1px solid var(--slate-300);">
                        ${r.paymentMethod || 'Bank Transfer'}
                      </span>
                    </td>
                    <td>
                      <span style="color: #0f172a; font-weight: 600;">${window.UIUtils ? window.UIUtils.formatDate(r.paymentDate || r.createdAt) : (r.paymentDate || 'Recent')}</span>
                    </td>
                    <td style="text-align: right;">
                      <button type="button" class="btn btn-secondary btn-sm btn-tch-prof-sal-voucher" data-id="${r.id}" style="font-weight: 700; color: #047857; border-color: #059669;">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="6 9 6 2 18 2 18 9"></polyline>
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                          <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                        Print Voucher
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    const printPassBtn = container.querySelector('#btn-tch-prof-print-gatepass');
    if (printPassBtn) {
      printPassBtn.onclick = () => {
        if (window.AttendanceCardsView && myCard) {
          window.AttendanceCardsView.printSingleCard(teacher, myCard, 'teacher');
        } else {
          this.renderBadge(container);
        }
      };
    }

    const editBtn = container.querySelector('#btn-tch-update-profile');
    if (editBtn) {
      editBtn.onclick = () => this.openUpdateProfileModal(container, teacher);
    }

    container.querySelectorAll('.btn-tch-prof-sal-voucher').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const r = myReceipts.find(item => item.id === id || item.receiptNumber === id);
        if (r && window.PayrollView && window.PayrollView.openSalaryReceiptModal) {
          window.PayrollView.openSalaryReceiptModal(r);
        } else if (r && window.PayrollView && window.PayrollView.printSalarySlip) {
          window.PayrollView.printSalarySlip(r);
        } else {
          window.UIUtils.showToast('info', 'Salary Voucher', 'Voucher details loaded.');
        }
      };
    });
  },

  openUpdateProfileModal(container, teacher) {
    const content = `
      <form id="form-tch-update-profile" class="form-grid" style="padding: 0.5rem 0;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700; color: #0f172a;">Full Name (Official)</label>
          <input type="text" class="form-control" value="${teacher.fullName}" disabled style="background: var(--slate-100); color: #0f172a; font-weight: 700;" />
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700; color: #0f172a;">Faculty ID</label>
          <input type="text" class="form-control" value="${teacher.teacherId}" disabled style="background: var(--slate-100); color: #0f172a; font-weight: 700;" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label" style="font-weight: 700; color: #0f172a;">Official Email Address</label>
          <input type="email" class="form-control" value="${teacher.email}" disabled style="background: var(--slate-100); color: #0f172a; font-weight: 600;" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label" style="font-weight: 700; color: #0f172a;">Contact Phone Number <span class="req-star">*</span></label>
          <input type="text" id="tch-input-phone" class="form-control" value="${teacher.contactNumber || ''}" required style="color: #0f172a; font-weight: 600;" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label" style="font-weight: 700; color: #0f172a;">Academic Qualifications</label>
          <input type="text" id="tch-input-qual" class="form-control" value="${teacher.qualifications || ''}" placeholder="e.g. M.Sc. Physics, M.Phil" style="color: #0f172a; font-weight: 600;" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label" style="font-weight: 700; color: #0f172a;">Residential / Mailing Address</label>
          <input type="text" id="tch-input-addr" class="form-control" value="${teacher.address || ''}" placeholder="House/Street, Area, City" style="color: #0f172a; font-weight: 600;" />
        </div>

        <div class="form-col-full" style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
          <label class="form-label" style="font-weight: 700; color: #0f172a;">New Password (Optional)</label>
          <input type="password" id="tch-input-pwd" class="form-control" placeholder="Leave blank to keep existing password" style="color: #0f172a;" />
          <span class="form-help" style="color: #475569; font-weight: 500;">Minimum 4 characters if changing.</span>
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('tch-profile-edit-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-tch-profile">Save Profile Changes</button>
    `;

    window.UIUtils.showModal('Update My Faculty Profile', content, actions, 'modal-md', 'tch-profile-edit-modal');

    const modalEl = document.querySelector('#tch-profile-edit-modal');
    if (!modalEl) return;

    modalEl.querySelector('#btn-save-tch-profile').onclick = async () => {
      const phone = modalEl.querySelector('#tch-input-phone').value.trim();
      const qual = modalEl.querySelector('#tch-input-qual').value.trim();
      const addr = modalEl.querySelector('#tch-input-addr').value.trim();
      const pwd = modalEl.querySelector('#tch-input-pwd').value.trim();

      if (!phone) {
        window.UIUtils.showToast('error', 'Phone Required', 'Please enter your contact phone number.');
        return;
      }

      if (pwd && pwd.length < 4) {
        window.UIUtils.showToast('error', 'Short Password', 'New password must be at least 4 characters long.');
        return;
      }

      window.UIUtils.closeModal('tch-profile-edit-modal');

      await window.GlobalLoader.wrap(async () => {
        const updateData = {
          contactNumber: phone,
          qualifications: qual,
          address: addr,
          updatedAt: new Date().toISOString()
        };

        if (pwd) {
          updateData.password = pwd;
        }

        await window.FirebaseService.updateDocument('teachers', teacher.id, updateData);

        // Update local object
        Object.assign(teacher, updateData);

        await window.AuditService.log({
          action: 'Teacher Profile Self-Updated',
          category: 'Staff',
          targetType: 'Teacher',
          targetId: teacher.id,
          details: `Teacher ${teacher.fullName} (${teacher.teacherId}) updated contact/profile details.`
        });
      }, 'Saving profile updates in Cloud Firestore...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Profile Updated', 'Your profile details have been saved successfully.');
      this.renderProfile(container);
    };
  }
};

window.TeacherPortalView = TeacherPortalView;
