/**
 * Ideal Coaching Center - Student Dedicated Portal
 * Student Dashboard, My Profile, Paid Fees & Receipts, Attendance, Diary, Syllabus, Notifications
 * Features full real-time synchronization with Firebase/reactive store (no manual refresh needed)
 */

const StudentPortalView = {
  activeSubscriptions: [],

  cleanupSubscriptions() {
    if (this.activeSubscriptions && this.activeSubscriptions.length > 0) {
      this.activeSubscriptions.forEach(unsub => {
        try { if (typeof unsub === 'function') unsub(); } catch (e) {}
      });
      this.activeSubscriptions = [];
    }
  },

  addSubscription(collectionName, callback) {
    if (window.FirebaseService && typeof window.FirebaseService.subscribe === 'function') {
      const unsub = window.FirebaseService.subscribe(collectionName, callback);
      this.activeSubscriptions.push(unsub);
      return unsub;
    }
    return () => {};
  },

  /**
   * Render Student Dashboard Homepage with Live Updates
   */
  async renderDashboard(container) {
    this.cleanupSubscriptions();
    const studentUser = window.AuthService.getCurrentUser();
    if (!studentUser) return;

    const updateView = async () => {
      const student = await window.FirebaseService.getDocument('students', studentUser.studentId || studentUser.id);
      if (!student) return;
      const fees = await window.FirebaseService.getCollection('fees');
      const attendance = await window.FirebaseService.getCollection('attendance');
      const announcements = await window.FirebaseService.getCollection('announcements');
      const diaries = await window.FirebaseService.getCollection('diary');
      const books = await window.FirebaseService.getCollection('books');
      const chapters = await window.FirebaseService.getCollection('chapters');

      // 1. Fee status
      const studentFees = fees.filter(f => f.studentId === student.id);
      const nowMonth = new Date().toLocaleString('en-US', { month: 'long' });
      const currentMonthFee = studentFees.find(f => f.month === nowMonth) || studentFees[0];
      const isCurrentFeePaid = currentMonthFee && currentMonthFee.status === 'Paid';

      // 2. Attendance % calculated over the complete monthly working days (excluding Sundays)
      const attData = window.UIUtils.calculateMonthlyAttendance(attendance, student.id);
      const attPct = attData.attPct;
      const presentDays = attData.presentDays;
      const totalWorking = attData.totalMonthWorkingDays;

      // 3. Latest Announcement
      const matchingAnnouncements = announcements
        .filter(a => a.targetClass === 'All' || (a.targetClass === student.class && (a.targetGroup === 'All' || a.targetGroup === student.group)))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const latestAnn = matchingAnnouncements[0];

      // 4. Today's Diary
      const todayStr = new Date().toISOString().split('T')[0];
      const todayDiary = diaries.find(d => d.class === student.class && d.group === student.group && d.date === todayStr);

      // 5. Current Studying Chapters
      const studentBooks = books.filter(b => b.class === student.class && b.group === student.group);
      const currentChapters = [];
      studentBooks.forEach(b => {
        const activeCh = chapters.find(c => c.bookId === b.id && c.status === 'Currently Studying');
        if (activeCh) {
          currentChapters.push({ bookTitle: b.title, chapterTitle: activeCh.title, order: activeCh.order });
        }
      });

      container.innerHTML = `
        <!-- Personalized Hero Banner -->
        <div class="student-hero-banner">
          <div class="student-hero-content">
            <span class="student-hero-badge">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              Ideal Coaching Center Student Portal
            </span>
            <h1 class="student-hero-title">Welcome back, ${student.fullName}!</h1>
            <div class="student-hero-meta">
              <span>Roll Number: <strong>#${student.rollNumber}</strong></span>
              <span>•</span>
              <span>Class: <strong>${student.class} (${student.group})</strong></span>
              <span>•</span>
              <span>Father: <strong>${student.fatherName}</strong></span>
            </div>
          </div>
        </div>

        <!-- Quick Metrics Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon-wrapper stat-icon-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-label">Attendance Rate (${attData.monthName})</span>
              <span class="stat-value" style="color: var(--success-600);">${attPct}%</span>
              <span class="stat-subtext">${presentDays} of ${totalWorking} Monthly Working Days</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper ${isCurrentFeePaid ? 'stat-icon-blue' : 'stat-icon-amber'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-label">${nowMonth} Fee</span>
              <span class="stat-value" style="font-size: 1.35rem; color: ${isCurrentFeePaid ? 'var(--success-600)' : 'var(--warning-600)'};">
                ${isCurrentFeePaid ? 'Paid' : 'Pending'}
              </span>
              <span class="stat-subtext">${currentMonthFee ? window.UIUtils.formatCurrency(currentMonthFee.expectedAmount || 3000) : 'Rs. 3,000'}</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper stat-icon-purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-label">Subjects</span>
              <span class="stat-value">${studentBooks.length} Books</span>
              <span class="stat-subtext">${currentChapters.length} Chapters In Progress</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-wrapper stat-icon-cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <div class="stat-info">
              <span class="stat-label">Notices</span>
              <span class="stat-value">${matchingAnnouncements.length}</span>
              <span class="stat-subtext">Class & Institute Notices</span>
            </div>
          </div>
        </div>

        <!-- 2-Column Section: Today's Homework Diary & Latest Circular -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
          <!-- Homework Card -->
          <div class="data-card" style="margin-bottom: 0;">
            <div class="data-card-header">
              <div class="data-card-title-group">
                <h3 class="data-card-title">Today's Daily Diary</h3>
                <span class="data-card-subtitle">${window.UIUtils.formatDate(todayStr)}</span>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-std-view-all-diary">View All</button>
            </div>
            <div style="padding: 1.5rem;">
              ${todayDiary ? `
                <div class="diary-card" style="border-left-color: var(--primary-600); background: var(--primary-50);">
                  <div class="diary-content-text" style="font-size: 0.95rem;">
                    ${todayDiary.content}
                  </div>
                  <span style="font-size: 0.725rem; color: var(--slate-500); margin-top: 0.75rem; display: block;">
                    Assigned for Class ${student.class} (${student.group})
                  </span>
                </div>
              ` : `
                <div class="table-empty-state" style="padding: 2rem 0;">
                  <p>No homework posted yet for today.</p>
                </div>
              `}
            </div>
          </div>

          <!-- Circular Card -->
          <div class="data-card" style="margin-bottom: 0;">
            <div class="data-card-header">
              <div class="data-card-title-group">
                <h3 class="data-card-title">Latest Announcement</h3>
                <span class="data-card-subtitle">Official Circulars</span>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-std-view-all-ann">View All</button>
            </div>
            <div style="padding: 1.5rem;">
              ${latestAnn ? `
                <div class="announcement-card" style="margin-bottom: 0;">
                  <h4 class="announcement-title">${latestAnn.title}</h4>
                  <div class="announcement-meta" style="margin: 0.35rem 0;">
                    <span>${window.UIUtils.formatDate(latestAnn.createdAt)}</span>
                  </div>
                  <p class="announcement-body" style="line-height: 1.5;">${latestAnn.content}</p>
                </div>
              ` : `
                <div class="table-empty-state" style="padding: 2rem 0;">
                  <p>No new announcements at this time.</p>
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- Current Syllabus Status Card -->
        <div class="data-card">
          <div class="data-card-header">
            <div class="data-card-title-group">
              <h3 class="data-card-title">Current Syllabus Progress</h3>
              <span class="data-card-subtitle">Active subject syllabus for Class ${student.class} (${student.group})</span>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-std-view-syllabus">Full Syllabus</button>
          </div>
          <div style="padding: 1.5rem;">
            ${currentChapters.length === 0 ? `
              <p style="font-size: 0.85rem; color: var(--slate-500); text-align: center; padding: 1rem 0;">
                No active chapters marked for current study.
              </p>
            ` : `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
                ${currentChapters.map(c => `
                  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); padding: 1rem;">
                    <span style="font-size: 0.725rem; font-weight: 700; color: #166534; text-transform: uppercase;">${c.bookTitle}</span>
                    <div style="font-weight: 700; font-size: 0.95rem; color: var(--slate-900); margin: 0.25rem 0;">Chapter ${c.order}: ${c.chapterTitle}</div>
                    <span class="badge badge-studying" style="margin-top: 0.25rem;">
                      Currently Studying
                    </span>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      `;

      // Navigation links
      const btnDiary = container.querySelector('#btn-std-view-all-diary');
      if (btnDiary) {
        btnDiary.onclick = () => {
          window.location.hash = '#student-diary';
          window.AppRouter.navigate('student-diary');
        };
      }
      const btnAnn = container.querySelector('#btn-std-view-all-ann');
      if (btnAnn) {
        btnAnn.onclick = () => {
          window.location.hash = '#student-announcements';
          window.AppRouter.navigate('student-announcements');
        };
      }
      const btnSyl = container.querySelector('#btn-std-view-syllabus');
      if (btnSyl) {
        btnSyl.onclick = () => {
          window.location.hash = '#student-syllabus';
          window.AppRouter.navigate('student-syllabus');
        };
      }
    };

    await updateView();

    // Subscribe to all relevant collections for real-time dashboard updates without manual refresh
    const collectionsToWatch = ['students', 'fees', 'attendance', 'announcements', 'diary', 'books', 'chapters'];
    collectionsToWatch.forEach(col => {
      this.addSubscription(col, () => {
        if (document.body.contains(container)) updateView();
      });
    });
  },

  /**
   * Student Paid Fee Details & Downloadable Receipts
   * Only paid months and their receipts are listed in the student's account
   */
  async renderFees(container) {
    this.cleanupSubscriptions();
    const studentUser = window.AuthService.getCurrentUser();
    if (!studentUser) return;

    const updateView = async () => {
      const student = await window.FirebaseService.getDocument('students', studentUser.studentId || studentUser.id);
      if (!student) return;
      const fees = await window.FirebaseService.getCollection('fees');
      const studentFees = fees.filter(f => f.studentId === student.id).sort((a, b) => a.monthOrder - b.monthOrder);

      // Student Fee Filtering: The student must ONLY see the paid month fee box and receipt in their account
      const paidFees = studentFees.filter(f => f.status === 'Paid');

      container.innerHTML = `
        <div class="data-card">
          <div class="data-card-header">
            <div class="data-card-title-group">
              <h2 class="data-card-title">My Paid Fees & Official Receipts</h2>
              <span class="data-card-subtitle">Verified monthly fee deposits & downloadable 10-digit receipts • Ideal Coaching Center</span>
            </div>
            <div class="data-card-actions">
              <span class="badge badge-paid" style="font-size: 0.825rem; padding: 0.4rem 0.85rem;">
                <span class="badge-dot"></span>
                ${paidFees.length} Paid Month${paidFees.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div style="padding: 1.5rem;">
            ${paidFees.length === 0 ? `
              <div class="table-empty-state" style="padding: 3rem 1.5rem;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #f0fdf4; border: 1px solid #bbf7d0; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem auto; color: var(--success-600);">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                  </svg>
                </div>
                <h4 class="empty-state-title" style="margin-bottom: 0.5rem; font-size: 1.1rem;">No Paid Fees Recorded Yet</h4>
                <p class="empty-state-text" style="max-width: 480px; margin: 0 auto; line-height: 1.5;">
                  Only cleared monthly tuition fees with official Ideal Coaching Center receipts appear here. When your fee is received at the office, your receipt will be available here immediately.
                </p>
              </div>
            ` : `
              <div class="fee-schedule-grid">
                ${paidFees.map(fee => `
                  <div class="fee-month-card is-paid">
                    <div class="fee-month-header">
                      <span class="fee-month-title">${fee.month}</span>
                      <span class="badge badge-paid">
                        <span class="badge-dot"></span>
                        Paid
                      </span>
                    </div>

                    <div class="fee-amount-row">
                      <span class="fee-expected-label">Amount Paid:</span>
                      <span class="fee-amount-value" style="color: var(--success-600);">
                        ${window.UIUtils.formatCurrency(fee.paidAmount || fee.expectedAmount || 3000)}
                      </span>
                    </div>

                    <div class="fee-meta-list">
                      <div>Paid On: <strong>${window.UIUtils.formatDate(fee.paymentDate || fee.createdAt)}</strong></div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem;">
                        <span>Receipt:</span>
                        <span class="fee-receipt-badge">#${fee.receiptNumber}</span>
                      </div>
                    </div>

                    <div class="fee-actions-row">
                      ${fee.receiptAvailableToStudent ? `
                        <button type="button" class="btn btn-primary btn-sm btn-std-open-rcpt" data-rcpt="${fee.receiptNumber}" style="width: 100%;">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          View & Download Receipt
                        </button>
                      ` : `
                        <span style="font-size: 0.75rem; color: var(--slate-500); text-align: center; width: 100%;">
                          Receipt verification in progress by office
                        </span>
                      `}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      `;

      container.querySelectorAll('.btn-std-open-rcpt').forEach(btn => {
        btn.onclick = () => {
          const rcptNum = btn.getAttribute('data-rcpt');
          window.FeesView.openReceiptModal(rcptNum);
        };
      });
    };

    await updateView();

    // Subscribe to fees and receipts for real-time updates
    this.addSubscription('fees', () => {
      if (document.body.contains(container)) updateView();
    });
    this.addSubscription('receipts', () => {
      if (document.body.contains(container)) updateView();
    });
  },

  /**
   * Student Attendance Breakdown with Live Updates
   */
  async renderAttendance(container) {
    this.cleanupSubscriptions();
    const studentUser = window.AuthService.getCurrentUser();
    if (!studentUser) return;

    const updateView = async () => {
      const student = await window.FirebaseService.getDocument('students', studentUser.studentId || studentUser.id);
      if (!student) return;
      const allAttendance = await window.FirebaseService.getCollection('attendance');
      const studentAttendance = allAttendance.filter(a => a.studentId === student.id);

      // Monthly attendance calculated across all working days of the month (excluding Sundays)
      const attData = window.UIUtils.calculateMonthlyAttendance(allAttendance, student.id);
      const pDays = attData.presentDays;
      const aDays = attData.absentDays;
      const lDays = attData.leaveDays;
      const totalMonthWorking = attData.totalMonthWorkingDays;
      const attPct = attData.attPct;

      container.innerHTML = `
        <div class="attendance-progress-card">
          <div class="attendance-progress-header">
            <div>
              <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--slate-900);">Monthly Academic Attendance (${attData.monthName} ${attData.year})</h2>
              <p style="font-size: 0.825rem; color: var(--slate-600);">Calculated over full month (${totalMonthWorking} working days, Sundays excluded)</p>
            </div>
            <div class="attendance-pct-display">${attPct}%</div>
          </div>

          <div class="attendance-bar-track">
            <div class="attendance-bar-fill" style="width: ${attPct}%;"></div>
          </div>

          <div class="attendance-breakdown-chips">
            <div class="attendance-chip">
              <span class="attendance-chip-label">Present Days</span>
              <span class="attendance-chip-value" style="color: var(--success-600);">${pDays}</span>
            </div>
            <div class="attendance-chip">
              <span class="attendance-chip-label">Absent Days</span>
              <span class="attendance-chip-value" style="color: var(--danger-600);">${aDays}</span>
            </div>
            <div class="attendance-chip">
              <span class="attendance-chip-label">Approved Leave</span>
              <span class="attendance-chip-value" style="color: var(--info-600);">${lDays}</span>
            </div>
            <div class="attendance-chip">
              <span class="attendance-chip-label">Total Month Working Days</span>
              <span class="attendance-chip-value">${totalMonthWorking}</span>
            </div>
          </div>
        </div>

        <!-- Historical Attendance Records Table -->
        <div class="data-card">
          <div class="data-card-header">
            <h3 class="data-card-title">Daily Attendance Log</h3>
            <span style="font-size: 0.8rem; color: var(--slate-500);">Chronological Log (Sundays Excluded)</span>
          </div>
          <div style="padding: 1.5rem;">
            ${studentAttendance.length === 0 ? `
              <div class="table-empty-state">
                <p>No attendance records found yet.</p>
              </div>
            ` : `
              <div class="table-responsive">
                <table class="app-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Day of Week</th>
                      <th>Attendance Status</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${studentAttendance.sort((a, b) => new Date(b.date) - new Date(a.date)).map(att => `
                      <tr>
                        <td><strong>${window.UIUtils.formatDate(att.date)}</strong></td>
                        <td>${new Date(att.date).toLocaleDateString('en-US', { weekday: 'long' })}</td>
                        <td>
                          <span class="badge ${att.status === 'Present' ? 'badge-present' : att.status === 'Absent' ? 'badge-absent' : 'badge-leave'}">
                            <span class="badge-dot"></span>
                            ${att.status}
                          </span>
                        </td>
                        <td style="font-size: 0.8rem; color: var(--slate-600);">${att.markedBy || 'Office Admin'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      `;
    };

    await updateView();

    // Subscribe to attendance collection for live updates
    this.addSubscription('attendance', () => {
      if (document.body.contains(container)) updateView();
    });
  },

  /**
   * Student Announcements with Live Updates
   */
  async renderAnnouncements(container) {
    this.cleanupSubscriptions();
    const studentUser = window.AuthService.getCurrentUser();
    if (!studentUser) return;

    const updateView = async () => {
      const student = await window.FirebaseService.getDocument('students', studentUser.studentId || studentUser.id);
      if (!student) return;
      const announcements = await window.FirebaseService.getCollection('announcements');

      const matching = announcements
        .filter(a => a.targetClass === 'All' || (a.targetClass === student.class && (a.targetGroup === 'All' || a.targetGroup === student.group)))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      container.innerHTML = `
        <div class="data-card">
          <div class="data-card-header">
            <div class="data-card-title-group">
              <h2 class="data-card-title">Class Announcements & Circulars</h2>
              <span class="data-card-subtitle">Official notifications for Class ${student.class} (${student.group}) • Ideal Coaching Center</span>
            </div>
          </div>

          <div style="padding: 1.5rem;">
            ${matching.length === 0 ? `
              <div class="table-empty-state">
                <p>No announcements currently available for your class.</p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                ${matching.map(a => `
                  <div class="announcement-card">
                    <div class="announcement-header">
                      <div>
                        <h3 class="announcement-title">${a.title}</h3>
                        <div class="announcement-meta" style="margin-top: 0.35rem;">
                          <span>Target: <strong>Class ${a.targetClass} (${a.targetGroup || 'All'})</strong></span>
                          <span>•</span>
                          <span>Published on ${window.UIUtils.formatDate(a.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div class="announcement-body">${a.content}</div>
                    ${a.attachmentUrl ? `
                      <div style="margin-top: 0.75rem;">
                        <a href="${a.attachmentUrl}" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex;">
                          View Attached Document
                        </a>
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      `;
    };

    await updateView();

    // Subscribe to announcements collection for live updates
    this.addSubscription('announcements', () => {
      if (document.body.contains(container)) updateView();
    });
  },

  /**
   * Student Today's Diary with Live Updates
   */
  async renderDiary(container) {
    this.cleanupSubscriptions();
    const studentUser = window.AuthService.getCurrentUser();
    if (!studentUser) return;

    const updateView = async () => {
      const student = await window.FirebaseService.getDocument('students', studentUser.studentId || studentUser.id);
      if (!student) return;
      const allDiaries = await window.FirebaseService.getCollection('diary');
      const classDiaries = allDiaries
        .filter(d => d.class === student.class && d.group === student.group)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      const todayStr = new Date().toISOString().split('T')[0];
      const todayEntry = classDiaries.find(d => d.date === todayStr);

      container.innerHTML = `
        <div class="data-card">
          <div class="data-card-header">
            <div class="data-card-title-group">
              <h2 class="data-card-title">Daily Diary & Homework Portal</h2>
              <span class="data-card-subtitle">Class ${student.class} (${student.group}) • Ideal Coaching Center</span>
            </div>
          </div>

          <div style="padding: 1.5rem;">
            <!-- Today's Primary Diary Highlight -->
            <div style="background: var(--slate-50); border: 2px solid var(--primary-200); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 2rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                <span class="badge badge-studying">Today's Homework (${window.UIUtils.formatDate(todayStr)})</span>
                <span style="font-size: 0.75rem; color: var(--slate-500);">Ideal Coaching Faculty</span>
              </div>
              ${todayEntry ? `
                <div class="diary-content-text" style="font-size: 0.95rem;">
                  ${todayEntry.content}
                </div>
              ` : `
                <div class="table-empty-state" style="padding: 1.5rem 0;">
                  <h4 class="empty-state-title">No diary has been posted for today</h4>
                  <p class="empty-state-text">Please check back after your daily lectures.</p>
                </div>
              `}
            </div>

            <!-- Past Diary Entries -->
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem;">Previous Homework & Diary Entries</h3>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${classDiaries.filter(d => d.date !== todayStr).map(d => `
                <div class="diary-card">
                  <span class="diary-date-badge">${window.UIUtils.formatDate(d.date)}</span>
                  <div class="diary-content-text">${d.content}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    };

    await updateView();

    // Subscribe to diary collection for live updates
    this.addSubscription('diary', () => {
      if (document.body.contains(container)) updateView();
    });
  },

  /**
   * Student Syllabus & Books View with "Currently Studying" Indicator and Live Updates
   */
  async renderSyllabus(container) {
    this.cleanupSubscriptions();
    const studentUser = window.AuthService.getCurrentUser();
    if (!studentUser) return;

    const updateView = async () => {
      const student = await window.FirebaseService.getDocument('students', studentUser.studentId || studentUser.id);
      if (!student) return;
      const books = await window.FirebaseService.getCollection('books');
      const chapters = await window.FirebaseService.getCollection('chapters');

      const studentBooks = books.filter(b => b.class === student.class && b.group === student.group);

      container.innerHTML = `
        <div class="data-card">
          <div class="data-card-header">
            <div class="data-card-title-group">
              <h2 class="data-card-title">Syllabus & Books Curriculum</h2>
              <span class="data-card-subtitle">Books and Chapter progress for Class ${student.class} (${student.group}) • Ideal Coaching Center</span>
            </div>
          </div>

          <div style="padding: 1.5rem;">
            ${studentBooks.length === 0 ? `
              <div class="table-empty-state">
                <h4 class="empty-state-title">Syllabus has not been configured yet</h4>
                <p class="empty-state-text">Your class syllabus is being configured by the academic coordinators.</p>
              </div>
            ` : `
              <div class="syllabus-books-grid">
                ${studentBooks.map(book => {
                  const bookChapters = chapters.filter(c => c.bookId === book.id).sort((a, b) => a.order - b.order);

                  return `
                    <div class="book-card">
                      <div class="book-card-header">
                        <div>
                          <h4 class="book-card-title">${book.title}</h4>
                          <span style="font-size: 0.725rem; color: #93c5fd;">Code: ${book.code || 'N/A'}</span>
                        </div>
                      </div>

                      <div class="book-card-body">
                        ${bookChapters.map(ch => `
                          <div class="chapter-item ${ch.status === 'Currently Studying' ? 'chapter-status-active' : ''}">
                            <div class="chapter-title-group">
                              <span class="chapter-order-badge">${ch.order}</span>
                              <span class="chapter-title">${ch.title}</span>
                            </div>

                            <div>
                              ${ch.status === 'Currently Studying' ? `
                                <span class="badge badge-studying">Currently Studying</span>
                              ` : ch.status === 'Completed' ? `
                                <span class="badge badge-completed">Completed ✓</span>
                              ` : `
                                <span class="badge badge-notstarted">Not Started</span>
                              `}
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
      `;
    };

    await updateView();

    // Subscribe to books and chapters collections for live syllabus updates
    this.addSubscription('books', () => {
      if (document.body.contains(container)) updateView();
    });
    this.addSubscription('chapters', () => {
      if (document.body.contains(container)) updateView();
    });
  },

  /**
   * Student Notifications View with Live Updates
   */
  async renderNotifications(container) {
    this.cleanupSubscriptions();
    const studentUser = window.AuthService.getCurrentUser();
    if (!studentUser) return;

    const updateView = async () => {
      const student = await window.FirebaseService.getDocument('students', studentUser.studentId || studentUser.id);
      if (!student) return;
      const notifications = await window.FirebaseService.getCollection('notifications');
      const myNotifs = notifications
        .filter(n => n.studentId === student.id || n.rollNumber === student.rollNumber)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      container.innerHTML = `
        <div class="data-card">
          <div class="data-card-header">
            <div class="data-card-title-group">
              <h2 class="data-card-title">My Notifications</h2>
              <span class="data-card-subtitle">Real-time alerts, payment confirmations, and circular notices • Ideal Coaching Center</span>
            </div>
            <div class="data-card-actions">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-mark-all-read">Mark All as Read</button>
            </div>
          </div>

          <div style="padding: 1.5rem;">
            ${myNotifs.length === 0 ? `
              <div class="table-empty-state">
                <p>No notifications at this time.</p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${myNotifs.map(n => `
                  <div style="padding: 1rem 1.25rem; border-radius: var(--radius-md); border: 1px solid ${n.isRead ? 'var(--border-color-subtle)' : 'var(--primary-300)'}; background: ${n.isRead ? 'var(--slate-50)' : '#eff6ff'}; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                        ${!n.isRead ? '<span class="badge-dot" style="background-color: var(--primary-600);"></span>' : ''}
                        <h4 style="font-size: 0.95rem; color: var(--slate-900); font-weight: 700;">${n.title}</h4>
                      </div>
                      <p style="font-size: 0.85rem; color: var(--slate-700); line-height: 1.45;">${n.message}</p>
                      <span style="font-size: 0.725rem; color: var(--slate-400); margin-top: 0.35rem; display: inline-block;">${new Date(n.createdAt).toLocaleString()}</span>
                    </div>

                    ${n.receiptNumber ? `
                      <button type="button" class="btn btn-primary btn-sm btn-open-notif-rcpt" data-rcpt="${n.receiptNumber}">
                        View Receipt
                      </button>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      `;

      container.querySelectorAll('.btn-open-notif-rcpt').forEach(btn => {
        btn.onclick = () => {
          const rcpt = btn.getAttribute('data-rcpt');
          window.FeesView.openReceiptModal(rcpt);
        };
      });

      const markAllBtn = container.querySelector('#btn-mark-all-read');
      if (markAllBtn) {
        markAllBtn.onclick = async () => {
          await window.GlobalLoader.wrap(async () => {
            for (const n of myNotifs) {
              await window.FirebaseService.updateDocument('notifications', n.id, { isRead: true });
            }
          }, 'Marking notifications as read...', 'Ideal Coaching Center', 600);
          window.UIUtils.showToast('info', 'Notifications', 'All notifications marked as read.');
          updateView();
        };
      }
    };

    await updateView();

    // Subscribe to notifications collection for real-time delivery
    this.addSubscription('notifications', () => {
      if (document.body.contains(container)) updateView();
    });
  },

  /**
   * Student My Profile View with Live Updates
   */
  async renderProfile(container) {
    this.cleanupSubscriptions();
    const studentUser = window.AuthService.getCurrentUser();
    if (!studentUser) return;

    const updateView = async () => {
      const student = await window.FirebaseService.getDocument('students', studentUser.studentId || studentUser.id);
      if (!student) return;

      container.innerHTML = `
        <div class="data-card" style="max-width: 720px; margin: 0 auto;">
          <div class="data-card-header">
            <div class="data-card-title-group">
              <h2 class="data-card-title">My Student Profile</h2>
              <span class="data-card-subtitle">Ideal Coaching Center Official Academic Record</span>
            </div>
          </div>

          <div style="padding: 2rem;">
            <div style="display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color);">
              <div class="user-avatar" style="width: 64px; height: 64px; font-size: 1.5rem;">
                ${student.fullName.charAt(0)}
              </div>
              <div>
                <h2 style="font-size: 1.4rem;">${student.fullName}</h2>
                <p style="color: var(--slate-600); font-size: 0.85rem;">Roll Number: <strong style="color: var(--primary-700);">#${student.rollNumber}</strong> • Class ${student.class} (${student.group})</p>
              </div>
            </div>

            <div class="profile-info-grid">
              <div class="profile-info-item">
                <span class="profile-info-label">Father's Name</span>
                <span class="profile-info-val">${student.fatherName}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Contact Phone</span>
                <span class="profile-info-val">${student.contactNumber}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Enrolled Class</span>
                <span class="profile-info-val">Class ${student.class}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Stream / Group</span>
                <span class="profile-info-val">${student.group}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Enrollment Date</span>
                <span class="profile-info-val">${window.UIUtils.formatDate(student.admissionDate || student.createdAt)}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Portal Login Email</span>
                <span class="profile-info-val">${student.email || ('student' + student.rollNumber + '@ideal.edu')}</span>
              </div>
              <div class="profile-info-item">
                <span class="profile-info-label">Account Status</span>
                <span class="badge ${student.status === 'Active' ? 'badge-active' : 'badge-inactive'}" style="width: fit-content;">${student.status}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    };

    await updateView();

    // Subscribe to students collection for live updates
    this.addSubscription('students', () => {
      if (document.body.contains(container)) updateView();
    });
  }
};

window.StudentPortalView = StudentPortalView;
