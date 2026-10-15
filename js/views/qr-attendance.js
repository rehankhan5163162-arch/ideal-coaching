/**
 * Ideal Coaching Center - High-Speed Touchless QR Code Gate Attendance Terminal
 * Pure vanilla JavaScript with real-time continuous video stream decoding.
 * Features:
 * - Dual-Engine Scanning: ZXing HybridBinarizer + Multi-Pass 1:1 Sensor Resolution jsQR
 * - Auto-detect Gate Kiosk: Touchlessly detects both Student & Faculty QR badges
 * - Multi-camera selection (Integrated webcam, External USB cameras)
 * - Clear 3-Step visual instructions on screen
 * - Real-time audio chime (turnstile dual-tone) & emerald visual confirmation
 * - Live auto-updating scan feed & stats counters without video interruption
 * - Secondary offline simulator drawer for debugging without physical cards
 */

const QRAttendanceView = {
  currentMode: 'all', // 'all' (Auto-Detect Gate Kiosk), 'student', or 'teacher'
  selectedSession: 'Morning',
  selectedClass: 'All',
  selectedGroup: 'All',
  selectedDeviceId: localStorage.getItem('ideal_preferred_camera') || '',
  cameraStream: null,
  scanActive: false,
  scanLoopId: null,
  audioCtx: null,
  zxingReader: null,
  barcodeDetector: null,
  canvas: null,
  ctx: null,
  cropCanvas: null,
  cropCtx: null,
  lastScannedToken: null,
  lastScannedTimestamp: 0,
  isProcessingToken: false,
  availableDevices: [],
  frameCount: 0,
  fps: 0,
  lastFpsCheck: 0,

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
      <!-- Page Header -->
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: #475569; margin-bottom: 0.25rem;">
            <span>Attendance Center</span> <span style="margin: 0 0.4rem;">/</span> <span style="color: var(--primary-700); font-weight: 700;">Live Gate Terminal</span>
          </div>
          <h1 style="font-size: 1.6rem; color: #0f172a; font-weight: 800; margin: 0;">Touchless QR Gate Attendance Terminal</h1>
          <p style="color: #334155; font-size: 0.875rem; margin-top: 0.25rem; font-weight: 500;">
            Continuous camera detection. Hold any student or faculty badge in front of the lens to automatically record attendance.
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

      <!-- 3-Step Visual Instruction Guide Card -->
      <div class="attendance-steps-grid">
        <div class="attendance-step-card">
          <div class="attendance-step-number">1</div>
          <div class="attendance-step-content">
            <h4>Hold Card to Camera</h4>
            <p>Position the student or faculty QR badge 15–30 cm (6–12 inches) in front of the camera lens.</p>
          </div>
        </div>

        <div class="attendance-step-card">
          <div class="attendance-step-number">2</div>
          <div class="attendance-step-content">
            <h4>Touchless Auto-Scan</h4>
            <p>The terminal decodes the badge automatically in real-time. <strong>No clicking or buttons needed!</strong></p>
          </div>
        </div>

        <div class="attendance-step-card">
          <div class="attendance-step-number">3</div>
          <div class="attendance-step-content">
            <h4>Instant Confirmation</h4>
            <p>Camera flashes green with an audio chime 🔔, saving arrival time and marking the person Present.</p>
          </div>
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

      <!-- Main Terminal Layout: Left Camera / Right Feed -->
      <div style="display: grid; grid-template-columns: 1.35fr 1fr; gap: 1.75rem; align-items: start;">
        
        <!-- Left Column: Video Scanner Camera Viewport & Controls -->
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
            <!-- Camera & Filter Options Bar -->
            <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;">
              
              <!-- Camera Device Selector -->
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <label for="camera-device-select" style="font-size: 0.75rem; font-weight: 700; color: #475569; white-space: nowrap;">Camera:</label>
                <select id="camera-device-select" class="form-control" style="width: auto; max-width: 210px; font-size: 0.8rem; font-weight: 600; color: #0f172a; padding: 0.4rem 0.65rem;">
                  <option value="">Default / Auto Camera</option>
                </select>
              </div>

              <!-- Session Filter -->
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <label for="scan-session-select" style="font-size: 0.75rem; font-weight: 700; color: #475569;">Session:</label>
                <select id="scan-session-select" class="form-control" style="width: auto; font-size: 0.8rem; font-weight: 600; color: #0f172a; padding: 0.4rem 0.65rem;">
                  <option value="Morning" ${this.selectedSession === 'Morning' ? 'selected' : ''}>Morning</option>
                  <option value="Evening" ${this.selectedSession === 'Evening' ? 'selected' : ''}>Evening</option>
                </select>
              </div>

              ${this.currentMode === 'student' ? `
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  <label for="scan-class-select" style="font-size: 0.75rem; font-weight: 700; color: #475569;">Class:</label>
                  <select id="scan-class-select" class="form-control" style="width: auto; font-size: 0.8rem; font-weight: 600; color: #0f172a; padding: 0.4rem 0.65rem;">
                    <option value="All" ${this.selectedClass === 'All' ? 'selected' : ''}>All Classes</option>
                    <option value="12th" ${this.selectedClass === '12th' ? 'selected' : ''}>Class 12th</option>
                    <option value="11th" ${this.selectedClass === '11th' ? 'selected' : ''}>Class 11th</option>
                    <option value="10th" ${this.selectedClass === '10th' ? 'selected' : ''}>Class 10th</option>
                    <option value="9th" ${this.selectedClass === '9th' ? 'selected' : ''}>Class 9th</option>
                  </select>
                </div>
              ` : ''}

              <!-- Live Performance Diagnostics -->
              <div style="margin-left: auto; display: flex; align-items: center; gap: 0.4rem;">
                <span class="scanner-diag-pill" id="scanner-fps-pill">Dual Engine Active</span>
              </div>
            </div>

            <!-- Video Camera Box: Active Viewport -->
            <div id="camera-viewport-box" class="scanner-viewport-box">
              <video id="qr-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
              
              <!-- Full Viewport Perimeter Corner Guides -->
              <div class="scanner-viewport-corner scanner-viewport-corner-tl"></div>
              <div class="scanner-viewport-corner scanner-viewport-corner-tr"></div>
              <div class="scanner-viewport-corner scanner-viewport-corner-bl"></div>
              <div class="scanner-viewport-corner scanner-viewport-corner-br"></div>

              <!-- High-Contrast Central Target Reticle -->
              <div id="scanner-reticle" class="scanner-target-reticle" style="display: none;">
                <div class="reticle-corner reticle-corner-tl"></div>
                <div class="reticle-corner reticle-corner-tr"></div>
                <div class="reticle-corner reticle-corner-bl"></div>
                <div class="reticle-corner reticle-corner-br"></div>
              </div>

              <!-- Full-Width Sweeping Laser Scan Line -->
              <div id="scanner-full-laser" class="full-scanner-scan-line" style="display: none;"></div>

              <!-- Ambient Status Pill at Viewport Bottom -->
              <div id="scanner-active-pill" style="display: none; position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(8px); padding: 6px 18px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; font-size: 0.8rem; font-weight: 700; align-items: center; gap: 8px; white-space: nowrap; pointer-events: none; z-index: 5;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981;"></span>
                <span>Touchless Terminal Active • Hold any student or faculty badge in view</span>
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
                <p style="font-size: 0.85rem; color: #94a3b8; max-width: 360px; margin: 0 auto 1.25rem auto;">
                  Touchless high-speed QR recognition. Badges held to the camera are marked immediately without clicking.
                </p>
                <button type="button" class="btn btn-primary" id="btn-start-camera" style="font-size: 0.95rem; padding: 0.75rem 1.75rem; font-weight: 700;">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Start Live Camera
                </button>
              </div>

              <!-- Instant Touchless Scan Feedback Alert Overlay -->
              <div id="scan-feedback-alert" style="display: none; position: absolute; inset: 0; background: rgba(6, 78, 59, 0.96); color: #fff; align-items: center; justify-content: center; flex-direction: column; text-align: center; padding: 1.5rem; z-index: 10; backdrop-filter: blur(8px); animation: fadeIn 0.2s ease;">
                <div id="feedback-icon" style="width: 68px; height: 68px; border-radius: 50%; background: #ffffff; color: #047857; display: flex; align-items: center; justify-content: center; font-size: 2.4rem; font-weight: 900; margin-bottom: 0.65rem; box-shadow: 0 6px 18px rgba(0,0,0,0.3);">✓</div>
                <div id="feedback-title" style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: #a7f3d0; margin-bottom: 0.2rem;">ATTENDANCE RECORDED</div>
                <h2 id="feedback-name" style="font-size: 1.65rem; font-weight: 900; margin: 0; color: #ffffff;"></h2>
                <div id="feedback-badge" style="display: none; background: rgba(255,255,255,0.22); padding: 0.25rem 0.85rem; border-radius: 999px; font-weight: 700; font-size: 0.85rem; margin-top: 0.45rem; color: #ffffff;"></div>
                <p id="feedback-msg" style="font-size: 1rem; margin-top: 0.5rem; color: #f0fdf4; font-weight: 700;"></p>
                <div style="margin-top: 0.65rem; font-size: 0.775rem; color: rgba(255,255,255,0.8);">Ready for next card in 1 second...</div>
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
                  Tip: Hold ID card 15–30 cm away with good room lighting. No button clicks needed.
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Real-time Live Scanned Activity Feed -->
        <div class="data-card" style="margin-bottom: 0;">
          <div class="data-card-header" style="padding: 0.85rem 1.25rem;">
            <div>
              <h3 class="data-card-title" style="font-size: 1.05rem; color: #0f172a; font-weight: 800;">Recent Live Scans</h3>
              <span style="font-size: 0.75rem; color: #334155; font-weight: 600;">Real-time check-in stream updates touchlessly</span>
            </div>
            <span class="badge badge-paid" style="font-weight: 700;">Live Feed</span>
          </div>

          <div style="padding: 1.25rem;">
            <div id="recent-scans-list" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 470px; overflow-y: auto;">
              ${this.buildRecentScansHTML(todayStudentAtt, todayTeacherAtt)}
            </div>
          </div>
        </div>

      </div>

      <!-- Collapsible Admin Simulation / Testing Drawer (Separated from normal camera workflow) -->
      <div style="margin-top: 1.5rem;">
        <details class="data-card" style="padding: 0.75rem 1.25rem; background: #f8fafc; border: 1px dashed #cbd5e1;">
          <summary style="cursor: pointer; font-weight: 700; color: #475569; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
            Administrator Testing Simulator (For testing without a physical webcam)
          </summary>
          <div style="margin-top: 0.85rem; padding-top: 0.85rem; border-top: 1px solid #e2e8f0; display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
            <p style="font-size: 0.775rem; color: #64748b; margin: 0; width: 100%;">
              This dropdown is an offline testing simulator only. In normal operations, attendance is automatically marked by holding the QR badge in front of the camera.
            </p>
            <select id="quick-test-select" class="form-control" style="font-size: 0.8rem; width: 260px; color: #0f172a; font-weight: 600;">
              <option value="">-- Select Person to Simulate --</option>
              ${(this.currentMode === 'all' || this.currentMode === 'student') ?
                students.map(s => `<option value="ICC-STD-${s.rollNumber}-${s.id}">Student: ${s.fullName} (${s.rollNumber})</option>`).join('') : ''
              }
              ${(this.currentMode === 'all' || this.currentMode === 'teacher') ?
                teachers.map(t => `<option value="ICC-TCH-${t.teacherId}-${t.id}">Faculty: ${t.fullName} (${t.teacherId})</option>`).join('') : ''
              }
            </select>
            <button type="button" class="btn btn-sm btn-secondary" id="btn-quick-test-scan">Simulate Scan</button>
          </div>
        </details>
      </div>
    `;

    this.attachEvents(container, students, teachers);

    // Populate camera devices list and auto-start terminal camera
    this.refreshCameraDeviceList(container);

    setTimeout(() => {
      if (!this.scanActive && document.body.contains(container)) {
        this.startCamera(container, true);
      }
    }, 250);
  },

  buildRecentScansHTML(studentAtt, teacherAtt) {
    if (this.currentMode === 'student') {
      if (studentAtt.length === 0) {
        return `<div style="text-align: center; color: #475569; padding: 2.5rem; font-weight: 600;">No student attendance recorded for this session yet.</div>`;
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
        return `<div style="text-align: center; color: #475569; padding: 2.5rem; font-weight: 600;">No faculty check-ins recorded for today.</div>`;
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
        return `<div style="text-align: center; color: #475569; padding: 2.5rem; font-weight: 600;">No attendance scans recorded today yet. Hold any student or faculty card to the camera.</div>`;
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

  async refreshCameraDeviceList(container) {
    const select = container.querySelector('#camera-device-select');
    if (!select || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      this.availableDevices = videoInputs;

      if (videoInputs.length > 0) {
        select.innerHTML = videoInputs.map((d, idx) => {
          const label = d.label || `Camera ${idx + 1}`;
          const isSelected = d.deviceId === this.selectedDeviceId;
          return `<option value="${d.deviceId}" ${isSelected ? 'selected' : ''}>${label}</option>`;
        }).join('');
      } else {
        select.innerHTML = `<option value="">Default Camera</option>`;
      }
    } catch (e) {
      console.warn('Could not enumerate video devices:', e);
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

    // Camera device selector change
    const devSelect = container.querySelector('#camera-device-select');
    if (devSelect) {
      devSelect.onchange = () => {
        this.selectedDeviceId = devSelect.value;
        if (this.selectedDeviceId) {
          localStorage.setItem('ideal_preferred_camera', this.selectedDeviceId);
        }
        if (this.scanActive) {
          this.stopCamera(container);
          this.startCamera(container);
        }
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

    // Offline Testing Simulator
    const btnQuickTest = container.querySelector('#btn-quick-test-scan');
    const quickSelect = container.querySelector('#quick-test-select');
    if (btnQuickTest && quickSelect) {
      btnQuickTest.onclick = () => {
        const token = quickSelect.value;
        if (!token) {
          window.UIUtils.showToast('info', 'Select Person', 'Please select a student or faculty to simulate scan.');
          return;
        }
        this.onQRCodeFound(container, token);
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
   * Start Device Camera Stream & Initialize Dual Continuous Scanning Engines
   */
  async startCamera(container, silent = false) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!silent) throw new Error('Camera access API is not supported on this browser/environment.');
        return;
      }

      // Reset any active loops
      this.stopCamera(container);

      // Create primary analysis canvas
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      }
      // Create secondary center-crop analysis canvas
      if (!this.cropCanvas) {
        this.cropCanvas = document.createElement('canvas');
        this.cropCtx = this.cropCanvas.getContext('2d', { willReadFrequently: true });
      }

      // Build video stream constraints
      const constraints = {
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      };

      if (this.selectedDeviceId) {
        constraints.video.deviceId = { exact: this.selectedDeviceId };
      } else {
        constraints.video.facingMode = { ideal: 'environment' };
      }

      try {
        this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        // Fallback to generic video
        this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      const video = container.querySelector('#qr-video');
      const placeholder = container.querySelector('#camera-placeholder');
      const fullLaser = container.querySelector('#scanner-full-laser');
      const reticle = container.querySelector('#scanner-reticle');
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
      if (reticle) reticle.style.display = 'flex';
      if (activePill) activePill.style.display = 'flex';
      if (btnStop) btnStop.style.display = 'inline-flex';
      if (statusBadge) {
        statusBadge.textContent = 'Gate Terminal Active';
        statusBadge.className = 'badge badge-paid';
      }

      this.scanActive = true;
      this.frameCount = 0;
      this.lastFpsCheck = performance.now();

      // Update Camera Selector with active device labels once permission is granted
      this.refreshCameraDeviceList(container);

      // 1. Initialize ZXing Browser Multi-Format / QR Reader if available
      if (window.ZXing && (window.ZXing.BrowserMultiFormatReader || window.ZXing.BrowserQRCodeReader)) {
        try {
          const ReaderClass = window.ZXing.BrowserQRCodeReader || window.ZXing.BrowserMultiFormatReader;
          this.zxingReader = new ReaderClass();
        } catch (e) {
          console.warn('ZXing initialization note:', e);
        }
      }

      // 2. Initialize native hardware BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        try {
          this.barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
        } catch (e) {
          this.barcodeDetector = null;
        }
      }

      if (!silent) {
        window.UIUtils.showToast('success', 'Camera Active', 'Hold any student or faculty card to the camera.');
      }

      // Launch continuous frame scanning loop
      this.scanLoop(container);

    } catch (err) {
      if (!silent) {
        console.warn('Camera stream error:', err);
        window.UIUtils.showToast('error', 'Camera Error', err.message || 'Could not access device camera. Please check camera permissions or use Manual ID Entry.');
      }
    }
  },

  /**
   * Continuous High-Speed Real-Time Frame Scanning Loop
   * Implements Dual-Engine Decoding (ZXing + Multi-Pass 1:1 Sensor Resolution jsQR)
   */
  async scanLoop(container) {
    if (!this.scanActive) return;

    const video = container.querySelector('#qr-video');

    if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && !this.isProcessingToken) {
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      let detectedRaw = null;

      // Update live diagnostics every 30 frames
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsCheck >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsCheck));
        this.frameCount = 0;
        this.lastFpsCheck = now;
        const fpsPill = container.querySelector('#scanner-fps-pill');
        if (fpsPill) {
          fpsPill.textContent = `${vWidth}x${vHeight} • ${this.fps} FPS`;
        }
      }

      // -------------------------------------------------------------
      // ENGINE A: ZXing Browser Multi-Format / QR Reader (Direct Canvas/Video)
      // -------------------------------------------------------------
      if (this.zxingReader && !detectedRaw) {
        try {
          // Pass video frame directly to ZXing's HybridBinarizer
          if (typeof this.zxingReader.decodeFromVideoElement === 'function') {
            const zxResult = await this.zxingReader.decodeFromVideoElement(video).catch(() => null);
            if (zxResult && zxResult.getText()) {
              detectedRaw = zxResult.getText();
            }
          }
        } catch (e) {
          // ZXing throws on frames with no QR - expected
        }
      }

      // -------------------------------------------------------------
      // ENGINE B: Multi-Pass 1:1 Sensor Resolution jsQR
      // -------------------------------------------------------------
      if (!detectedRaw && typeof window.jsQR === 'function' && this.ctx) {
        try {
          // PASS 1: Native 1:1 Center Focus Crop (60% width x 60% height)
          // Eliminates room background clutter, ceiling glare, and keeps badge at 100% sharp sensor pixels!
          const cropW = Math.round(vWidth * 0.65);
          const cropH = Math.round(vHeight * 0.65);
          const cropX = Math.round((vWidth - cropW) / 2);
          const cropY = Math.round((vHeight - cropH) / 2);

          this.cropCanvas.width = cropW;
          this.cropCanvas.height = cropH;
          this.cropCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          const cropImgData = this.cropCtx.getImageData(0, 0, cropW, cropH);
          const cropCode = window.jsQR(cropImgData.data, cropW, cropH, {
            inversionAttempts: 'attemptBoth'
          });

          if (cropCode && cropCode.data) {
            detectedRaw = cropCode.data;
          }

          // PASS 2: Full-frame native scan (capped at 1280 wide to prevent CPU stall)
          if (!detectedRaw) {
            const maxW = 1280;
            const scale = vWidth > maxW ? (maxW / vWidth) : 1;
            const fullW = Math.round(vWidth * scale);
            const fullH = Math.round(vHeight * scale);

            this.canvas.width = fullW;
            this.canvas.height = fullH;
            this.ctx.drawImage(video, 0, 0, fullW, fullH);

            const fullImgData = this.ctx.getImageData(0, 0, fullW, fullH);
            const fullCode = window.jsQR(fullImgData.data, fullW, fullH, {
              inversionAttempts: 'attemptBoth'
            });

            if (fullCode && fullCode.data) {
              detectedRaw = fullCode.data;
            }
          }

          // PASS 3: Contrast Normalization on Center Crop (For shiny laminate / phone screen glare)
          if (!detectedRaw && cropImgData) {
            const d = cropImgData.data;
            let minL = 255;
            let maxL = 0;
            // Sample step of 8 for extreme speed
            for (let i = 0; i < d.length; i += 32) {
              const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
              if (lum < minL) minL = lum;
              if (lum > maxL) maxL = lum;
            }
            if (maxL - minL > 30 && maxL - minL < 190) {
              // Stretch contrast
              const range = maxL - minL;
              for (let i = 0; i < d.length; i += 4) {
                const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
                const stretched = Math.min(255, Math.max(0, ((lum - minL) / range) * 255));
                d[i] = stretched;
                d[i + 1] = stretched;
                d[i + 2] = stretched;
              }
              const stretchedCode = window.jsQR(d, cropW, cropH, { inversionAttempts: 'attemptBoth' });
              if (stretchedCode && stretchedCode.data) {
                detectedRaw = stretchedCode.data;
              }
            }
          }

        } catch (e) {
          // Ignored for performance
        }
      }

      // -------------------------------------------------------------
      // ENGINE C: Native Hardware BarcodeDetector (if supported)
      // -------------------------------------------------------------
      if (!detectedRaw && this.barcodeDetector) {
        try {
          const barcodes = await this.barcodeDetector.detect(video).catch(() => []);
          if (barcodes && barcodes.length > 0) {
            detectedRaw = barcodes[0].rawValue;
          }
        } catch (e) {}
      }

      // If a valid QR code was detected by ANY of the active engines!
      if (detectedRaw) {
        this.onQRCodeFound(container, detectedRaw);
      }
    }

    // Keep scanning continuously at next animation frame
    if (this.scanActive) {
      this.scanLoopId = requestAnimationFrame(() => this.scanLoop(container));
    }
  },

  /**
   * Handle Detected QR Code
   */
  async onQRCodeFound(container, rawToken) {
    const token = String(rawToken || '').trim();
    if (!token) return;

    const now = Date.now();
    // Prevent repeated scans of the exact same token within 2.5 seconds
    if (token === this.lastScannedToken && (now - this.lastScannedTimestamp < 2500)) {
      return;
    }

    this.lastScannedToken = token;
    this.lastScannedTimestamp = now;

    // Visual & audio hit feedback on full camera viewport
    this.flashCameraSuccess(container);
    this.playBeep();

    // Immediately process token touchlessly
    await this.processToken(container, token);
  },

  flashCameraSuccess(container) {
    const box = container.querySelector('#camera-viewport-box');
    if (box) {
      box.classList.remove('scanner-warning-flash');
      box.classList.add('scanner-success-flash');
      setTimeout(() => {
        if (box) box.classList.remove('scanner-success-flash');
      }, 1000);
    }
  },

  flashCameraWarning(container) {
    const box = container.querySelector('#camera-viewport-box');
    if (box) {
      box.classList.remove('scanner-success-flash');
      box.classList.add('scanner-warning-flash');
      setTimeout(() => {
        if (box) box.classList.remove('scanner-warning-flash');
      }, 1000);
    }
  },

  /**
   * Stop Camera Stream
   */
  stopCamera(container = null) {
    this.scanActive = false;
    if (this.scanLoopId) {
      cancelAnimationFrame(this.scanLoopId);
      this.scanLoopId = null;
    }

    if (this.zxingReader && typeof this.zxingReader.reset === 'function') {
      try { this.zxingReader.reset(); } catch (e) {}
    }

    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }

    if (container) {
      const video = container.querySelector('#qr-video');
      const placeholder = container.querySelector('#camera-placeholder');
      const fullLaser = container.querySelector('#scanner-full-laser');
      const reticle = container.querySelector('#scanner-reticle');
      const activePill = container.querySelector('#scanner-active-pill');
      const btnStop = container.querySelector('#btn-stop-camera');
      const statusBadge = container.querySelector('#scanner-status-badge');

      if (video) video.style.display = 'none';
      if (placeholder) placeholder.style.display = 'block';
      if (fullLaser) fullLaser.style.display = 'none';
      if (reticle) reticle.style.display = 'none';
      if (activePill) activePill.style.display = 'none';
      if (btnStop) btnStop.style.display = 'none';
      if (statusBadge) {
        statusBadge.textContent = 'Camera Offline';
        statusBadge.className = 'badge badge-warning';
      }
    }
  },

  /**
   * High-Frequency Pleasant Turnstile Chime via Web Audio API
   */
  playBeep() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const t = this.audioCtx.currentTime;
      // Tone 1: 880Hz (A5)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, t);
      gain1.gain.setValueAtTime(0.25, t);
      gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(t);
      osc1.stop(t + 0.12);

      // Tone 2: 1320Hz (E6) Harmonious ascending turnstile confirmation
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, t + 0.08);
      gain2.gain.setValueAtTime(0.25, t + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(t + 0.08);
      osc2.stop(t + 0.25);
    } catch (e) {}
  },

  /**
   * Process Scanned Token (Direct touchless execution without interrupting camera)
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
        this.flashCameraWarning(container);
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
      this.flashCameraWarning(container);
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

    if (listEl.innerHTML.includes('No student attendance') || listEl.innerHTML.includes('No faculty check-ins') || listEl.innerHTML.includes('No attendance scans')) {
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
    const iconEl = container.querySelector('#feedback-icon');
    const titleEl = container.querySelector('#feedback-title');

    if (alertBox && nameEl && msgEl) {
      nameEl.textContent = name;
      msgEl.textContent = message;
      if (badgeEl) {
        badgeEl.textContent = badgeText || (personType === 'student' ? 'Student Verified' : 'Faculty Verified');
        badgeEl.style.display = 'inline-block';
      }

      if (isSuccess) {
        if (iconEl) {
          iconEl.textContent = '✓';
          iconEl.style.color = '#047857';
        }
        if (titleEl) titleEl.textContent = 'ATTENDANCE RECORDED';
        alertBox.style.background = personType === 'student' ? 'rgba(6, 78, 59, 0.96)' : 'rgba(30, 58, 138, 0.96)';
      } else {
        if (iconEl) {
          iconEl.textContent = '!';
          iconEl.style.color = '#c2410c';
        }
        if (titleEl) titleEl.textContent = 'ATTENDANCE ALREADY RECORDED';
        alertBox.style.background = 'rgba(154, 52, 18, 0.96)';
      }

      alertBox.style.display = 'flex';
      setTimeout(() => {
        alertBox.style.display = 'none';
      }, 1800);
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
          const qr = window.jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (qr && qr.data) decoded = qr.data;
        }

        if (decoded) {
          window.UIUtils.showToast('info', 'QR Detected', `Decoded: ${decoded}`);
          this.onQRCodeFound(container, decoded);
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

          this.prependToLiveFeed(container, { person: student, record: rec, personType: 'student' });
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

          this.prependToLiveFeed(container, { person: teacher, record: trec, personType: 'teacher' });
          const cntEl = container.querySelector('#stat-val-present-teachers');
          if (cntEl && statusVal === 'Present') cntEl.textContent = parseInt(cntEl.textContent || '0', 10) + 1;
        }
      }, 'Verifying and recording attendance entry...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Attendance Recorded', `Successfully recorded for ${idVal}.`);
    };
  }
};

window.QRAttendanceView = QRAttendanceView;
