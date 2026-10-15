/**
 * Ideal Coaching Center - High-Speed Continuous QR Code Attendance Terminal
 * Pure vanilla JavaScript with real-time continuous video frame decoding.
 * Supports hardware BarcodeDetector + jsQR fallback, instant audio chime,
 * duplicate scan protection, live activity stream without camera interruption,
 * image file decoding, and manual entry fallback.
 */

const QRAttendanceView = {
  currentMode: 'all', // 'all' (Auto-Detect Gate Kiosk), 'student', or 'teacher'
  selectedSession: 'Morning',
  selectedClass: 'All',
  selectedGroup: 'All',
  cameraStream: null,
  scanActive: false,
  audioCtx: null,
  barcodeDetector: null,
  canvas: null,
  ctx: null,
  lastScannedToken: null,
  lastScannedTimestamp: 0,
  isProcessingToken: false,

  async render(container) {
    const todayStr = new Date().toISOString().split('T')[0];
    const attendance = await window.FirebaseService.getCollection('attendance');
    const teacherAttendance = await window.FirebaseService.getCollection('teacher_attendance');
    const students = await window.FirebaseService.getCollection('students');
    const teachers = await window.FirebaseService.getCollection('teachers');

    // Counts for today's selected session
    const todayStudentAtt = attendance.filter(a => a.date === todayStr && (!a.session || a.session === this.selectedSession));
    const presentStudents = todayStudentAtt.filter(a => a.status === 'Present').length;
    const todayTeacherAtt = teacherAttendance.filter(a => a.date === todayStr);
    const presentTeachers = todayTeacherAtt.filter(a => a.status === 'Present').length;

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: #475569; margin-bottom: 0.25rem;">
            <span>Attendance Center</span> <span style="margin: 0 0.4rem;">/</span> <span style="color: var(--primary-700); font-weight: 700;">Instant QR Gate Scanner</span>
          </div>
          <h1 style="font-size: 1.6rem; color: #0f172a; font-weight: 800; margin: 0;">Automated Touchless QR Gate Terminal</h1>
          <p style="color: #334155; font-size: 0.875rem; margin-top: 0.25rem; font-weight: 500;">
            Full-camera detection active. Any student or faculty badge held anywhere in front of the camera is automatically recorded.
          </p>
        </div>
        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
          <input type="file" id="qr-file-input" accept="image/*" style="display: none;" />
          <button type="button" class="btn btn-secondary" id="btn-upload-qr-img" title="Scan QR Code from a photo or screenshot">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            Scan from Image File
          </button>
          <button type="button" class="btn btn-secondary" id="btn-manual-id-entry">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <line x1="6" y1="8" x2="6" y2="8"></line>
              <line x1="10" y1="8" x2="18" y2="8"></line>
            </svg>
            Manual Roll / ID Entry
          </button>
        </div>
      </div>

      <!-- Live Attendance Banner Counters -->
      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Active Date & Session</span>
            <span class="stat-value" style="font-size: 1.25rem; color: #0f172a; font-weight: 800;">${todayStr}</span>
            <span class="stat-subtext" style="color: #334155; font-weight: 600;">${this.selectedSession} Session</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Students Present Today</span>
            <span class="stat-value" id="stat-val-present-students" style="color: #047857; font-weight: 800;">${presentStudents}</span>
            <span class="stat-subtext" style="color: #334155; font-weight: 600;">Total Registered: ${students.length}</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Faculty Arrived</span>
            <span class="stat-value" id="stat-val-present-teachers" style="color: var(--primary-700); font-weight: 800;">${presentTeachers}</span>
            <span class="stat-subtext" style="color: #334155; font-weight: 600;">Total Faculty: ${teachers.length}</span>
          </div>
        </div>
      </div>

      <!-- Mode Selector & Terminal Layout -->
      <div style="display: grid; grid-template-columns: 1.35fr 1fr; gap: 1.75rem; align-items: start;">
        
        <!-- Left: Video Scanner Camera Viewport -->
        <div class="data-card" style="margin-bottom: 0;">
          <div class="data-card-header" style="padding: 0.85rem 1.25rem;">
            <div style="display: flex; gap: 0.45rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-sm ${this.currentMode === 'all' ? 'btn-primary' : 'btn-secondary'}" id="btn-mode-all" style="font-weight: 700;">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 3px;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                Auto-Detect Gate Kiosk (All)
              </button>
              <button type="button" class="btn btn-sm ${this.currentMode === 'student' ? 'btn-primary' : 'btn-secondary'}" id="btn-mode-student" style="font-weight: 700;">
                Students Only
              </button>
              <button type="button" class="btn btn-sm ${this.currentMode === 'teacher' ? 'btn-primary' : 'btn-secondary'}" id="btn-mode-teacher" style="font-weight: 700;">
                Faculty Only
              </button>
            </div>
            <span class="badge badge-paid" id="scanner-status-badge">Ready for Scan</span>
          </div>

          <div style="padding: 1.25rem;">
            <!-- Target filters -->
            <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;">
              <select id="scan-session-select" class="form-control" style="width: auto; font-weight: 600; color: #0f172a;">
                <option value="Morning" ${this.selectedSession === 'Morning' ? 'selected' : ''}>Morning Session</option>
                <option value="Evening" ${this.selectedSession === 'Evening' ? 'selected' : ''}>Evening Session</option>
              </select>

              ${this.currentMode === 'student' ? `
                <select id="scan-class-select" class="form-control" style="width: auto; font-weight: 600; color: #0f172a;">
                  <option value="All" ${this.selectedClass === 'All' ? 'selected' : ''}>All Classes</option>
                  <option value="12th" ${this.selectedClass === '12th' ? 'selected' : ''}>Class 12th</option>
                  <option value="11th" ${this.selectedClass === '11th' ? 'selected' : ''}>Class 11th</option>
                  <option value="10th" ${this.selectedClass === '10th' ? 'selected' : ''}>Class 10th</option>
                  <option value="9th" ${this.selectedClass === '9th' ? 'selected' : ''}>Class 9th</option>
                </select>
              ` : ''}

              <!-- Direct Simulation Tester -->
              <div style="margin-left: auto; display: flex; align-items: center; gap: 0.4rem;">
                <select id="quick-test-select" class="form-control" style="font-size: 0.775rem; width: 175px;">
                  <option value="">-- Quick Test Scan --</option>
                  ${(this.currentMode === 'all' || this.currentMode === 'student') ?
                    students.map(s => `<option value="ICC-STD-${s.rollNumber}-${s.id}">Student: ${s.fullName} (${s.rollNumber})</option>`).join('') : ''
                  }
                  ${(this.currentMode === 'all' || this.currentMode === 'teacher') ?
                    teachers.map(t => `<option value="ICC-TCH-${t.teacherId}-${t.id}">Faculty: ${t.fullName} (${t.teacherId})</option>`).join('') : ''
                  }
                </select>
                <button type="button" class="btn btn-sm btn-secondary" id="btn-quick-test-scan">Test</button>
              </div>
            </div>

            <!-- Video Camera Box: Entire Viewport Active Scanner (No center restriction) -->
            <div id="camera-viewport-box" style="position: relative; width: 100%; height: 400px; background: #0f172a; border-radius: var(--radius-lg); overflow: hidden; display: flex; align-items: center; justify-content: center; border: 3px solid #334155; box-shadow: 0 8px 30px rgba(0,0,0,0.35); transition: border-color 0.25s, box-shadow 0.25s;">
              <video id="qr-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
              
              <!-- Full Viewport Perimeter Corner Guides -->
              <div class="scanner-viewport-corner scanner-viewport-corner-tl"></div>
              <div class="scanner-viewport-corner scanner-viewport-corner-tr"></div>
              <div class="scanner-viewport-corner scanner-viewport-corner-bl"></div>
              <div class="scanner-viewport-corner scanner-viewport-corner-br"></div>

              <!-- Full-Width Sweeping Laser Scan Line -->
              <div id="scanner-full-laser" class="full-scanner-scan-line" style="display: none;"></div>

              <!-- Ambient Status Pill at Viewport Bottom -->
              <div id="scanner-active-pill" style="display: none; position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); padding: 6px 18px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; font-size: 0.8rem; font-weight: 700; align-items: center; gap: 8px; white-space: nowrap; pointer-events: none; z-index: 5;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
                Full-Camera Active • Hold any student or faculty badge anywhere on screen
              </div>

              <!-- Camera Placeholder / Start Trigger -->
              <div id="camera-placeholder" style="text-align: center; color: #fff; padding: 2rem 1.5rem; z-index: 2;">
                <div style="width: 68px; height: 68px; background: rgba(56, 189, 248, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                  <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#38bdf8" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </div>
                <div style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.35rem; color: #f8fafc;">Live Camera Terminal</div>
                <p style="font-size: 0.85rem; color: #94a3b8; max-width: 340px; margin: 0 auto 1.25rem auto;">
                  Full-frame automatic scanning. Cards held anywhere in front of the camera are recorded immediately without manual input.
                </p>
                <button type="button" class="btn btn-primary" id="btn-start-camera" style="font-size: 0.95rem; padding: 0.75rem 1.75rem; font-weight: 700;">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Start Camera Scanner
                </button>
              </div>

              <!-- Instant Touchless Scan Feedback Alert Overlay -->
              <div id="scan-feedback-alert" style="display: none; position: absolute; inset: 0; background: rgba(6, 78, 59, 0.96); color: #fff; align-items: center; justify-content: center; flex-direction: column; text-align: center; padding: 1.5rem; z-index: 10; backdrop-filter: blur(6px); animation: fadeIn 0.2s ease;">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: #ffffff; color: #047857; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 900; margin-bottom: 0.65rem; box-shadow: 0 6px 18px rgba(0,0,0,0.25);">✓</div>
                <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: #a7f3d0; margin-bottom: 0.2rem;">ATTENDANCE RECORDED</div>
                <h2 id="feedback-name" style="font-size: 1.55rem; font-weight: 900; margin: 0; color: #ffffff;"></h2>
                <div id="feedback-badge" style="display: none; background: rgba(255,255,255,0.22); padding: 0.25rem 0.85rem; border-radius: 999px; font-weight: 700; font-size: 0.85rem; margin-top: 0.45rem; color: #ffffff;"></div>
                <p id="feedback-msg" style="font-size: 1rem; margin-top: 0.5rem; color: #f0fdf4; font-weight: 700;"></p>
                <div style="margin-top: 0.65rem; font-size: 0.775rem; color: rgba(255,255,255,0.75);">Ready for next card in 1 second...</div>
              </div>
            </div>

            <!-- Controls Below Camera Box -->
            <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <button type="button" class="btn btn-sm btn-danger" id="btn-stop-camera" style="display: none;">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  </svg>
                  Stop Camera
                </button>
                <span id="camera-tip-text" style="font-size: 0.775rem; color: #334155; font-weight: 600;">
                  Full-camera active. Show any student or faculty badge anywhere in view to mark attendance immediately.
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Real-time Live Scanned Activity Feed -->
        <div class="data-card" style="margin-bottom: 0;">
          <div class="data-card-header" style="padding: 0.85rem 1.25rem;">
            <div>
              <h3 class="data-card-title" style="font-size: 1.05rem; color: #0f172a; font-weight: 800;">Recent Live Scans</h3>
              <span style="font-size: 0.75rem; color: #334155; font-weight: 600;">Stream updates touchlessly in real time</span>
            </div>
            <span class="badge badge-paid" style="font-weight: 700;">Live Feed</span>
          </div>

          <div style="padding: 1.25rem;">
            <div id="recent-scans-list" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 440px; overflow-y: auto;">
              ${this.buildRecentScansHTML(todayStudentAtt, todayTeacherAtt)}
            </div>
          </div>
        </div>

      </div>
    `;

    this.attachEvents(container, students, teachers);

    // Autonomous gate terminal auto-starts camera immediately
    setTimeout(() => {
      if (!this.scanActive && document.body.contains(container)) {
        this.startCamera(container, true);
      }
    }, 250);
  },

  buildRecentScansHTML(studentAtt, teacherAtt) {
    if (this.currentMode === 'student') {
      if (studentAtt.length === 0) {
        return `<div style="text-align: center; color: #334155; padding: 2.5rem; font-weight: 600;">No student attendance recorded for this session yet.</div>`;
      }
      return studentAtt.slice(-12).reverse().map(a => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #10b981; border-radius: var(--radius-md); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div>
            <strong style="color: #0f172a; font-size: 0.95rem; font-weight: 800;">${a.studentName}</strong>
            <div style="font-size: 0.8rem; color: #334155; font-weight: 600; margin-top: 0.15rem;">
              Roll #${a.rollNumber} • Class ${a.class} (${a.group || 'General'})
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-paid" style="font-size: 0.75rem; font-weight: 800;">${a.status}</span>
            <div style="font-size: 0.725rem; color: #475569; font-weight: 600; margin-top: 0.25rem;">${a.scanTime || 'Recorded'}</div>
          </div>
        </div>
      `).join('');
    } else if (this.currentMode === 'teacher') {
      if (teacherAtt.length === 0) {
        return `<div style="text-align: center; color: #334155; padding: 2.5rem; font-weight: 600;">No teacher check-ins recorded for today.</div>`;
      }
      return teacherAtt.slice(-12).reverse().map(t => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; border-radius: var(--radius-md); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div>
            <strong style="color: #0f172a; font-size: 0.95rem; font-weight: 800;">${t.teacherName}</strong>
            <div style="font-size: 0.8rem; color: #334155; font-weight: 600; margin-top: 0.15rem;">
              Faculty ID: <span style="font-family: monospace; font-weight: 700; color: #1e40af;">#${t.teacherCode}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-paid" style="font-size: 0.75rem; font-weight: 800;">Present</span>
            <div style="font-size: 0.725rem; color: #475569; font-weight: 600; margin-top: 0.25rem;">${t.arrivalTime || 'On Time'}</div>
          </div>
        </div>
      `).join('');
    } else {
      // Auto-Detect All Mode: Blended Chronological Gate Scans
      const combined = [
        ...studentAtt.map(s => ({ ...s, _isStudent: true, _rawTime: s.scanTime || s.createdAt || '' })),
        ...teacherAtt.map(t => ({ ...t, _isStudent: false, _rawTime: t.arrivalTime || t.createdAt || '' }))
      ];
      if (combined.length === 0) {
        return `<div style="text-align: center; color: #334155; padding: 2.5rem; font-weight: 600;">No attendance scans recorded today yet. Hold any student or faculty card to the camera.</div>`;
      }
      return combined.slice(-15).reverse().map(item => {
        if (item._isStudent) {
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #10b981; border-radius: var(--radius-md); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
              <div>
                <strong style="color: #0f172a; font-size: 0.95rem; font-weight: 800;">${item.studentName}</strong>
                <div style="font-size: 0.8rem; color: #334155; font-weight: 600; margin-top: 0.15rem;">
                  <span class="badge" style="background: #ecfdf5; color: #047857; font-size: 0.7rem; font-weight: 700; margin-right: 4px;">Student</span>
                  Roll #${item.rollNumber} • Class ${item.class} (${item.group || 'General'})
                </div>
              </div>
              <div style="text-align: right;">
                <span class="badge badge-paid" style="font-size: 0.75rem; font-weight: 800;">Present</span>
                <div style="font-size: 0.725rem; color: #475569; font-weight: 600; margin-top: 0.25rem;">${item.scanTime || 'Recorded'}</div>
              </div>
            </div>
          `;
        } else {
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; border-radius: var(--radius-md); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
              <div>
                <strong style="color: #0f172a; font-size: 0.95rem; font-weight: 800;">${item.teacherName}</strong>
                <div style="font-size: 0.8rem; color: #334155; font-weight: 600; margin-top: 0.15rem;">
                  <span class="badge" style="background: #eff6ff; color: #1d4ed8; font-size: 0.7rem; font-weight: 700; margin-right: 4px;">Faculty</span>
                  ID: <span style="font-family: monospace; font-weight: 700; color: #1e40af;">#${item.teacherCode}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <span class="badge badge-paid" style="font-size: 0.75rem; font-weight: 800;">Present</span>
                <div style="font-size: 0.725rem; color: #475569; font-weight: 600; margin-top: 0.25rem;">${item.arrivalTime || 'On Time'}</div>
              </div>
            </div>
          `;
        }
      }).join('');
    }
  },

  attachEvents(container, students, teachers) {
    // Mode switches
    const btnAll = container.querySelector('#btn-mode-all');
    const btnStd = container.querySelector('#btn-mode-student');
    const btnTch = container.querySelector('#btn-mode-teacher');

    if (btnAll) {
      btnAll.onclick = () => {
        if (this.currentMode === 'all') return;
        this.currentMode = 'all';
        const wasScanning = this.scanActive;
        this.stopCamera(container);
        this.render(container);
        if (wasScanning) this.startCamera(container);
      };
    }
    if (btnStd) {
      btnStd.onclick = () => {
        if (this.currentMode === 'student') return;
        this.currentMode = 'student';
        const wasScanning = this.scanActive;
        this.stopCamera(container);
        this.render(container);
        if (wasScanning) this.startCamera(container);
      };
    }
    if (btnTch) {
      btnTch.onclick = () => {
        if (this.currentMode === 'teacher') return;
        this.currentMode = 'teacher';
        const wasScanning = this.scanActive;
        this.stopCamera(container);
        this.render(container);
        if (wasScanning) this.startCamera(container);
      };
    }

    // Session / class filters
    const sessionSelect = container.querySelector('#scan-session-select');
    if (sessionSelect) {
      sessionSelect.onchange = () => {
        this.selectedSession = sessionSelect.value;
        const wasScanning = this.scanActive;
        this.stopCamera(container);
        this.render(container);
        if (wasScanning) this.startCamera(container);
      };
    }

    const classSelect = container.querySelector('#scan-class-select');
    if (classSelect) {
      classSelect.onchange = () => {
        this.selectedClass = classSelect.value;
      };
    }

    // Camera triggers
    const btnStart = container.querySelector('#btn-start-camera');
    const btnStop = container.querySelector('#btn-stop-camera');

    if (btnStart) btnStart.onclick = () => this.startCamera(container);
    if (btnStop) btnStop.onclick = () => this.stopCamera(container);

    // Manual ID Entry
    const btnManual = container.querySelector('#btn-manual-id-entry');
    if (btnManual) btnManual.onclick = () => this.openManualEntryModal(container, students, teachers);

    // Quick Test Scan Simulator
    const btnQuickTest = container.querySelector('#btn-quick-test-scan');
    const quickSelect = container.querySelector('#quick-test-select');
    if (btnQuickTest && quickSelect) {
      btnQuickTest.onclick = () => {
        const token = quickSelect.value;
        if (!token) {
          window.UIUtils.showToast('info', 'Select Person', 'Please select a student or faculty from the list to test.');
          return;
        }
        this.processToken(container, token);
      };
    }

    // Upload & Scan QR Image file
    const fileInput = container.querySelector('#qr-file-input');
    const btnUpload = container.querySelector('#btn-upload-qr-img');
    if (btnUpload && fileInput) {
      btnUpload.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          this.decodeFromImageFile(container, file);
        }
      };
    }
  },

  /**
   * Start Device Camera Stream & Launch Continuous Frame Loop
   */
  async startCamera(container, silent = false) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!silent) throw new Error('Camera access API is not supported on this browser/environment.');
        return;
      }

      // Initialize native BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        try {
          this.barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
        } catch (e) {
          this.barcodeDetector = null;
        }
      }

      // Create internal canvas for jsQR analysis
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      }

      // Try environment rear camera first, fall back to default
      try {
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (e) {
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }

      const video = container.querySelector('#qr-video');
      const placeholder = container.querySelector('#camera-placeholder');
      const fullLaser = container.querySelector('#scanner-full-laser');
      const activePill = container.querySelector('#scanner-active-pill');
      const btnStop = container.querySelector('#btn-stop-camera');
      const statusBadge = container.querySelector('#scanner-status-badge');

      if (video) {
        video.srcObject = this.cameraStream;
        video.style.display = 'block';
        await video.play().catch(() => {});
      }
      if (placeholder) placeholder.style.display = 'none';
      if (fullLaser) fullLaser.style.display = 'block';
      if (activePill) activePill.style.display = 'flex';
      if (btnStop) btnStop.style.display = 'inline-flex';
      if (statusBadge) {
        statusBadge.textContent = 'Gate Terminal Active';
        statusBadge.className = 'badge badge-paid';
      }

      this.scanActive = true;
      if (!silent) {
        window.UIUtils.showToast('success', 'Camera Active', 'Hold any student or faculty card to camera. Scanning directly.');
      }

      // Launch continuous frame scanning loop
      this.scanLoop(container);

    } catch (err) {
      if (!silent) {
        console.warn('Camera stream error:', err);
        window.UIUtils.showToast('error', 'Camera Error', err.message || 'Could not access device camera. Please check browser permissions or use Manual ID Entry.');
      }
    }
  },

  /**
   * Continuous Real-Time Frame Scanning Loop (Full Frame Area)
   */
  async scanLoop(container) {
    if (!this.scanActive) return;

    const video = container.querySelector('#qr-video');
    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && !this.isProcessingToken) {
      let detectedRaw = null;

      // 1. Hardware-accelerated BarcodeDetector (scans the entire video element)
      if (this.barcodeDetector) {
        try {
          const barcodes = await this.barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0) {
            detectedRaw = barcodes[0].rawValue;
          }
        } catch (e) {
          // Fallback to jsQR
        }
      }

      // 2. High-performance jsQR fallback (full frame width x height)
      if (!detectedRaw && typeof window.jsQR === 'function' && this.ctx) {
        try {
          // Downsample to max 720p width while preserving full field of view for 60fps
          const scale = Math.min(1, 720 / video.videoWidth);
          const w = Math.round(video.videoWidth * scale);
          const h = Math.round(video.videoHeight * scale);
          this.canvas.width = w;
          this.canvas.height = h;
          this.ctx.drawImage(video, 0, 0, w, h);
          const imgData = this.ctx.getImageData(0, 0, w, h);
          const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (code && code.data) {
            detectedRaw = code.data;
          }
        } catch (e) {}
      }

      // If token detected anywhere in the entire video frame!
      if (detectedRaw) {
        const now = Date.now();
        // Prevent repeated scans of the exact same token within 2.5 seconds
        if (detectedRaw !== this.lastScannedToken || (now - this.lastScannedTimestamp > 2500)) {
          this.lastScannedToken = detectedRaw;
          this.lastScannedTimestamp = now;

          // Visual & audio hit feedback on full camera viewport
          this.flashCameraSuccess(container);
          this.playBeep();

          // Immediately process token
          await this.processToken(container, detectedRaw);
        }
      }
    }

    // Keep scanning continuously
    if (this.scanActive) {
      requestAnimationFrame(() => this.scanLoop(container));
    }
  },

  flashCameraSuccess(container) {
    const box = container.querySelector('#camera-viewport-box');
    if (box) {
      box.style.borderColor = '#10b981';
      box.style.boxShadow = '0 0 35px rgba(16, 185, 129, 0.75), inset 0 0 25px rgba(16, 185, 129, 0.35)';
      setTimeout(() => {
        if (box) {
          box.style.borderColor = '#334155';
          box.style.boxShadow = '0 8px 30px rgba(0,0,0,0.35)';
        }
      }, 900);
    }
  },

  /**
   * Stop Camera Stream
   */
  stopCamera(container = null) {
    this.scanActive = false;
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }

    if (container) {
      const video = container.querySelector('#qr-video');
      const placeholder = container.querySelector('#camera-placeholder');
      const fullLaser = container.querySelector('#scanner-full-laser');
      const activePill = container.querySelector('#scanner-active-pill');
      const btnStop = container.querySelector('#btn-stop-camera');
      const statusBadge = container.querySelector('#scanner-status-badge');

      if (video) video.style.display = 'none';
      if (placeholder) placeholder.style.display = 'block';
      if (fullLaser) fullLaser.style.display = 'none';
      if (activePill) activePill.style.display = 'none';
      if (btnStop) btnStop.style.display = 'none';
      if (statusBadge) {
        statusBadge.textContent = 'Camera Offline';
        statusBadge.className = 'badge badge-warning';
      }
    }
  },

  /**
   * Audio Chime via Web Audio API
   */
  playBeep() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // High pleasant A5 chime
      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.2);
    } catch (e) {}
  },

  /**
   * Process Scanned Token (Direct touchless execution without camera restart)
   */
  async processToken(container, token) {
    if (this.isProcessingToken) return;
    this.isProcessingToken = true;

    try {
      const scanResult = await window.FirebaseService.recordQRScanAttendance({
        token,
        mode: this.currentMode,
        selectedDate: new Date().toISOString().split('T')[0],
        selectedClass: this.selectedClass,
        selectedGroup: this.selectedGroup,
        selectedSession: this.selectedSession,
        recordedBy: 'Touchless QR Gate Terminal'
      });

      const isStudent = scanResult.personType === 'student' || (!scanResult.personType && scanResult.record?.studentId);
      const subInfo = isStudent 
        ? `Roll #${scanResult.person.rollNumber} • Class ${scanResult.person.class}`
        : `Faculty ID: #${scanResult.person.teacherId} • ${scanResult.person.employmentStatus || 'Staff'}`;

      if (scanResult.duplicate) {
        window.UIUtils.showToast('warning', 'Already Recorded', scanResult.message);
        this.showScanFeedback(container, scanResult.person.fullName, scanResult.message, false, isStudent ? 'student' : 'teacher', subInfo);
        return;
      }

      // Success! Instant confirmation
      this.playBeep();
      this.showScanFeedback(container, scanResult.person.fullName, scanResult.message, true, isStudent ? 'student' : 'teacher', subInfo);

      // Dynamically add to live list without interrupting video camera
      this.prependToLiveFeed(container, scanResult);

      // Increment stats counter
      if (isStudent) {
        const cntEl = container.querySelector('#stat-val-present-students');
        if (cntEl) cntEl.textContent = parseInt(cntEl.textContent || '0', 10) + 1;
      } else {
        const cntEl = container.querySelector('#stat-val-present-teachers');
        if (cntEl) cntEl.textContent = parseInt(cntEl.textContent || '0', 10) + 1;
      }

    } catch (err) {
      console.warn('QR Verification Error:', err);
      window.UIUtils.showToast('error', 'Badge Scan Error', err.message);
    } finally {
      setTimeout(() => {
        this.isProcessingToken = false;
      }, 700);
    }
  },

  prependToLiveFeed(container, scanResult) {
    const listEl = container.querySelector('#recent-scans-list');
    if (!listEl) return;

    const r = scanResult.record;
    const p = scanResult.person;
    const isStudent = scanResult.personType === 'student' || (!scanResult.personType && r.studentId);
    let cardHtml = '';

    if (isStudent) {
      cardHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; background: #ffffff; border: 1px solid #10b981; border-left: 4px solid #10b981; border-radius: var(--radius-md); box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15); animation: fadeIn 0.3s ease;">
          <div>
            <strong style="color: #0f172a; font-size: 0.95rem; font-weight: 800;">${p.fullName}</strong>
            <div style="font-size: 0.8rem; color: #334155; font-weight: 600; margin-top: 0.15rem;">
              <span class="badge" style="background: #ecfdf5; color: #047857; font-size: 0.7rem; font-weight: 700; margin-right: 4px;">Student</span>
              Roll #${p.rollNumber} • Class ${p.class} (${p.group || 'General'})
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-paid" style="font-size: 0.75rem; font-weight: 800;">Present</span>
            <div style="font-size: 0.725rem; color: #475569; font-weight: 600; margin-top: 0.25rem;">${r.scanTime || 'Just Now'}</div>
          </div>
        </div>
      `;
    } else {
      cardHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem; background: #ffffff; border: 1px solid #2563eb; border-left: 4px solid #2563eb; border-radius: var(--radius-md); box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15); animation: fadeIn 0.3s ease;">
          <div>
            <strong style="color: #0f172a; font-size: 0.95rem; font-weight: 800;">${p.fullName}</strong>
            <div style="font-size: 0.8rem; color: #334155; font-weight: 600; margin-top: 0.15rem;">
              <span class="badge" style="background: #eff6ff; color: #1d4ed8; font-size: 0.7rem; font-weight: 700; margin-right: 4px;">Faculty</span>
              ID: <span style="font-family: monospace; font-weight: 700; color: #1e40af;">#${p.teacherId}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-paid" style="font-size: 0.75rem; font-weight: 800;">Present</span>
            <div style="font-size: 0.725rem; color: #475569; font-weight: 600; margin-top: 0.25rem;">${r.arrivalTime || 'Just Now'}</div>
          </div>
        </div>
      `;
    }

    // If placeholder is present, replace it; otherwise prepend
    if (listEl.innerHTML.includes('No student attendance') || listEl.innerHTML.includes('No teacher check-ins') || listEl.innerHTML.includes('No attendance scans')) {
      listEl.innerHTML = cardHtml;
    } else {
      listEl.insertAdjacentHTML('afterbegin', cardHtml);
    }
  },

  showScanFeedback(container, name, message, isSuccess = true, personType = 'student', badgeText = '') {
    const alertBox = container.querySelector('#scan-feedback-alert');
    const nameEl = container.querySelector('#feedback-name');
    const msgEl = container.querySelector('#feedback-msg');
    const badgeEl = container.querySelector('#feedback-badge');

    if (alertBox && nameEl && msgEl) {
      nameEl.textContent = name;
      msgEl.textContent = message;
      if (badgeEl) {
        badgeEl.textContent = badgeText || (personType === 'student' ? 'Student Verified' : 'Faculty Verified');
        badgeEl.style.display = 'inline-block';
      }
      alertBox.style.background = isSuccess 
        ? (personType === 'student' ? 'rgba(6, 78, 59, 0.96)' : 'rgba(30, 58, 138, 0.96)')
        : 'rgba(154, 52, 18, 0.96)';
      alertBox.style.display = 'flex';
      setTimeout(() => {
        alertBox.style.display = 'none';
      }, 1600);
    }
  },

  /**
   * Decode QR from an uploaded image file
   */
  decodeFromImageFile(container, file) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (!this.canvas) {
          this.canvas = document.createElement('canvas');
          this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);

        let decoded = null;
        if (typeof window.jsQR === 'function') {
          const imgData = this.ctx.getImageData(0, 0, img.width, img.height);
          const qr = window.jsQR(imgData.data, imgData.width, imgData.height);
          if (qr && qr.data) decoded = qr.data;
        }

        if (decoded) {
          window.UIUtils.showToast('info', 'QR Detected', `Decoded: ${decoded}`);
          this.processToken(container, decoded);
        } else {
          window.UIUtils.showToast('error', 'Decode Failed', 'Could not find a valid QR code in the selected image.');
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  },

  /**
   * Modal: Manual Roll Number / Teacher ID Entry Fallback
   */
  openManualEntryModal(container, students, teachers) {
    const isStudent = this.currentMode === 'student';
    const content = `
      <form id="manual-att-form" class="form-grid" style="padding: 0.5rem 0;">
        <div class="form-group form-col-full">
          <label class="form-label" style="font-weight: 700; color: #0f172a;">${isStudent ? 'Student Roll Number' : 'Teacher ID'} <span class="req-star">*</span></label>
          <input type="text" id="manual-id-input" class="form-control" placeholder="${isStudent ? 'e.g. 1201' : 'e.g. TCH-101'}" required autofocus style="color: #0f172a; font-weight: 600;" />
          <span class="form-help" style="color: #475569; font-weight: 500;">Type official identifier and click Confirm.</span>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700; color: #0f172a;">Attendance Status</label>
          <select id="manual-status-select" class="form-control" style="color: #0f172a; font-weight: 600;">
            <option value="Present">Present</option>
            <option value="Leave">Leave</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-weight: 700; color: #0f172a;">Session</label>
          <input type="text" class="form-control" value="${this.selectedSession}" disabled style="background: var(--slate-100); color: #0f172a; font-weight: 700;" />
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('manual-entry-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-submit-manual-att">Confirm Attendance</button>
    `;

    window.UIUtils.showModal(`Manual Attendance: ${isStudent ? 'Student' : 'Faculty'} Mode`, content, actions, 'modal-sm', 'manual-entry-modal');

    const modalEl = document.querySelector('#manual-entry-modal');
    if (!modalEl) return;

    modalEl.querySelector('#btn-submit-manual-att').onclick = async () => {
      const idVal = modalEl.querySelector('#manual-id-input').value.trim();
      const statusVal = modalEl.querySelector('#manual-status-select').value;
      const todayStr = new Date().toISOString().split('T')[0];

      if (!idVal) {
        window.UIUtils.showToast('error', 'Identifier Required', 'Please enter a valid Roll # or Teacher ID.');
        return;
      }

      window.UIUtils.closeModal('manual-entry-modal');

      await window.GlobalLoader.wrap(async () => {
        if (isStudent) {
          const student = students.find(s => String(s.rollNumber).toLowerCase() === idVal.toLowerCase());
          if (!student) throw new Error(`Student with Roll Number '${idVal}' not found.`);

          // Check duplicate
          const existingAtt = await window.FirebaseService.getCollection('attendance');
          const dup = existingAtt.find(a => a.studentId === student.id && a.date === todayStr && (!a.session || a.session === this.selectedSession));
          if (dup) throw new Error(`Attendance already recorded as '${dup.status}' for ${student.fullName} on ${todayStr}.`);

          const rec = {
            id: `att_${student.id}_${todayStr}_${Date.now()}`,
            studentId: student.id,
            rollNumber: student.rollNumber,
            studentName: student.fullName,
            class: student.class,
            group: student.group,
            date: todayStr,
            session: this.selectedSession,
            status: statusVal,
            method: 'Manual Entry',
            scanTime: new Date().toLocaleTimeString(),
            markedBy: 'Admin Counter',
            createdAt: new Date().toISOString()
          };

          await window.FirebaseService.addDocument('attendance', rec);

          await window.AuditService.log({
            action: 'Manual Student Attendance Recorded',
            category: 'Attendance',
            targetType: 'Student',
            targetId: student.id,
            details: `Manually marked ${statusVal} for ${student.fullName} (Roll #${student.rollNumber})`
          });

          this.prependToLiveFeed(container, { person: student, record: rec });
          const cntEl = container.querySelector('#stat-val-present-students');
          if (cntEl && statusVal === 'Present') cntEl.textContent = parseInt(cntEl.textContent || '0', 10) + 1;

        } else {
          // Teacher mode
          const teacher = teachers.find(t => t.teacherId.toLowerCase() === idVal.toLowerCase());
          if (!teacher) throw new Error(`Teacher with ID '${idVal}' not found.`);

          const existingTAtt = await window.FirebaseService.getCollection('teacher_attendance');
          const dup = existingTAtt.find(a => a.teacherId === teacher.id && a.date === todayStr);
          if (dup) throw new Error(`Teacher attendance already recorded for ${teacher.fullName} on ${todayStr}.`);

          const trec = {
            id: `tatt_${teacher.id}_${todayStr}`,
            teacherId: teacher.id,
            teacherCode: teacher.teacherId,
            teacherName: teacher.fullName,
            date: todayStr,
            status: statusVal,
            arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            method: 'Manual Entry',
            recordedBy: 'Admin Counter',
            createdAt: new Date().toISOString()
          };

          await window.FirebaseService.addDocument('teacher_attendance', trec);

          await window.AuditService.log({
            action: 'Manual Teacher Attendance Recorded',
            category: 'Attendance',
            targetType: 'Teacher',
            targetId: teacher.id,
            details: `Manually recorded ${statusVal} for teacher ${teacher.fullName} (${teacher.teacherId})`
          });

          this.prependToLiveFeed(container, { person: teacher, record: trec });
          const cntEl = container.querySelector('#stat-val-present-teachers');
          if (cntEl && statusVal === 'Present') cntEl.textContent = parseInt(cntEl.textContent || '0', 10) + 1;
        }
      }, 'Verifying and recording attendance entry...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Attendance Recorded', `Successfully recorded for ${idVal}.`);
    };
  }
};

window.QRAttendanceView = QRAttendanceView;
