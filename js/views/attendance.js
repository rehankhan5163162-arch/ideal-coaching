/**
 * Ideal Coaching Center - Attendance System
 * Present, Absent, Leave, Automatic Sunday Exclusion, Current Month %, Historical Months
 */

const AttendanceView = {
  selectedDate: new Date().toISOString().split('T')[0],
  selectedClass: '12th',
  selectedGroup: 'Computer Science',

  /**
   * Render Attendance Management view for Admin / Super Admin
   */
  async render(container) {
    const classGroups = window.UIUtils.getClassesAndGroups();
    const isSunday = window.UIUtils.isSunday(this.selectedDate);

    container.innerHTML = `
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">Attendance Management</h2>
            <span class="data-card-subtitle">Mark and review daily attendance records • Ideal Coaching Center</span>
          </div>
          <div class="data-card-actions">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-mark-all-present" ${isSunday ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Mark All Present
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-save-attendance" ${isSunday ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Save Attendance
            </button>
          </div>
        </div>

        <div style="padding: 1.5rem;">
          <!-- Filter Controls -->
          <div class="attendance-filter-bar">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Attendance Date:</label>
                <input type="date" id="att-filter-date" class="form-control" value="${this.selectedDate}" style="width: 170px;" />
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label">Class:</label>
                <select id="att-filter-class" class="form-control" style="width: 120px;">
                  <option value="9th" ${this.selectedClass === '9th' ? 'selected' : ''}>9th</option>
                  <option value="10th" ${this.selectedClass === '10th' ? 'selected' : ''}>10th</option>
                  <option value="11th" ${this.selectedClass === '11th' ? 'selected' : ''}>11th</option>
                  <option value="12th" ${this.selectedClass === '12th' ? 'selected' : ''}>12th</option>
                </select>
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label">Group:</label>
                <select id="att-filter-group" class="form-control" style="min-width: 180px;">
                  <!-- Dynamic groups -->
                </select>
              </div>
            </div>

            <div style="font-size: 0.825rem; color: var(--slate-600);">
              Day: <strong style="color: ${isSunday ? 'var(--danger-600)' : 'var(--slate-900)'};">${new Date(this.selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}</strong>
            </div>
          </div>

          <!-- Sunday Notice Banner -->
          ${isSunday ? `
            <div class="sunday-notice-banner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <strong>Sunday - Weekly Off Day:</strong>
                Attendance is not required for Sundays and is automatically excluded from academic working days and percentage calculations.
              </div>
            </div>
          ` : ''}

          <!-- Students List for Attendance -->
          <div id="attendance-students-list-wrapper">
            <!-- Rendered below -->
          </div>
        </div>
      </div>
    `;

    this.populateGroupOptions(container);
    this.renderStudentsList(container);
    this.bindEvents(container);
  },

  populateGroupOptions(container) {
    const classGroups = window.UIUtils.getClassesAndGroups();
    const groups = classGroups[this.selectedClass] || [];
    const groupSelect = container.querySelector('#att-filter-group');
    if (!groupSelect) return;

    groupSelect.innerHTML = groups.map(g => `
      <option value="${g}" ${this.selectedGroup === g ? 'selected' : ''}>${g}</option>
    `).join('');

    if (!groups.includes(this.selectedGroup) && groups.length > 0) {
      this.selectedGroup = groups[0];
    }
  },

  async renderStudentsList(container) {
    const listWrapper = container.querySelector('#attendance-students-list-wrapper');
    if (!listWrapper) return;

    const allStudents = await window.FirebaseService.getCollection('students');
    const filteredStudents = allStudents.filter(s => s.class === this.selectedClass && s.group === this.selectedGroup);

    if (filteredStudents.length === 0) {
      listWrapper.innerHTML = `
        <div class="table-empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <h4 class="empty-state-title">No Students Found</h4>
          <p class="empty-state-text">No active students are currently registered in Class ${this.selectedClass} (${this.selectedGroup}).</p>
        </div>
      `;
      return;
    }

    const allAttendance = await window.FirebaseService.getCollection('attendance');
    const existingForDate = allAttendance.filter(a => a.date === this.selectedDate);

    const isSunday = window.UIUtils.isSunday(this.selectedDate);

    listWrapper.innerHTML = `
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden;">
        <div style="background: var(--slate-50); padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: var(--slate-500); text-transform: uppercase;">
          <span>Student Particulars (${filteredStudents.length} Enrolled)</span>
          <span>Attendance Status</span>
        </div>

        ${filteredStudents.map(student => {
          const rec = existingForDate.find(a => a.studentId === student.id);
          const currentStatus = rec ? rec.status : 'Present';

          return `
            <div class="attendance-student-row" data-student-id="${student.id}" data-roll="${student.rollNumber}" data-name="${student.fullName}">
              <div class="attendance-student-info">
                <span class="student-roll-tag">Roll #${student.rollNumber}</span>
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem; color: var(--slate-900);">${student.fullName}</div>
                  <div style="font-size: 0.75rem; color: var(--slate-500);">Father: ${student.fatherName}</div>
                </div>
              </div>

              <div class="attendance-toggle-group">
                <button type="button" class="attendance-btn-pill ${currentStatus === 'Present' ? 'active-present' : ''}" data-status="Present" ${isSunday ? 'disabled' : ''}>
                  Present
                </button>
                <button type="button" class="attendance-btn-pill ${currentStatus === 'Absent' ? 'active-absent' : ''}" data-status="Absent" ${isSunday ? 'disabled' : ''}>
                  Absent
                </button>
                <button type="button" class="attendance-btn-pill ${currentStatus === 'Leave' ? 'active-leave' : ''}" data-status="Leave" ${isSunday ? 'disabled' : ''}>
                  Leave
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Bind individual pill clicks
    listWrapper.querySelectorAll('.attendance-btn-pill').forEach(btn => {
      btn.onclick = () => {
        if (isSunday) return;
        const row = btn.closest('.attendance-student-row');
        row.querySelectorAll('.attendance-btn-pill').forEach(b => {
          b.className = 'attendance-btn-pill';
        });
        const status = btn.getAttribute('data-status');
        btn.classList.add(`active-${status.toLowerCase()}`);
      };
    });
  },

  bindEvents(container) {
    const dateInput = container.querySelector('#att-filter-date');
    const classSelect = container.querySelector('#att-filter-class');
    const groupSelect = container.querySelector('#att-filter-group');

    if (dateInput) {
      dateInput.onchange = async () => {
        this.selectedDate = dateInput.value;
        await window.GlobalLoader.wrap(async () => {
          this.render(container);
        }, 'Loading attendance data for selected date...', 'Ideal Coaching Center');
      };
    }

    if (classSelect) {
      classSelect.onchange = async () => {
        this.selectedClass = classSelect.value;
        const classGroups = window.UIUtils.getClassesAndGroups();
        this.selectedGroup = classGroups[this.selectedClass][0];
        await window.GlobalLoader.wrap(async () => {
          this.render(container);
        }, 'Filtering students by class...', 'Ideal Coaching Center');
      };
    }

    if (groupSelect) {
      groupSelect.onchange = async () => {
        this.selectedGroup = groupSelect.value;
        await window.GlobalLoader.wrap(async () => {
          this.renderStudentsList(container);
        }, 'Filtering students by group...', 'Ideal Coaching Center');
      };
    }

    // Mark All Present
    const markAllBtn = container.querySelector('#btn-mark-all-present');
    if (markAllBtn) {
      markAllBtn.onclick = () => {
        container.querySelectorAll('.attendance-student-row').forEach(row => {
          row.querySelectorAll('.attendance-btn-pill').forEach(b => {
            b.className = 'attendance-btn-pill';
          });
          const presentBtn = row.querySelector('[data-status="Present"]');
          if (presentBtn) presentBtn.classList.add('active-present');
        });
        window.UIUtils.showToast('info', 'Status Set', 'All students marked as Present. Click "Save Attendance" to confirm.');
      };
    }

    // Save Attendance
    const saveBtn = container.querySelector('#btn-save-attendance');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        if (window.UIUtils.isSunday(this.selectedDate)) {
          window.UIUtils.showToast('warning', 'Sunday Excluded', 'Attendance cannot be marked on Sunday.');
          return;
        }

        const rows = container.querySelectorAll('.attendance-student-row');
        if (rows.length === 0) return;

        await window.GlobalLoader.wrap(async () => {
          const user = window.AuthService.getCurrentUser() || { fullName: 'Admin' };
          const absentStudents = [];

          for (const row of rows) {
            const studentId = row.getAttribute('data-student-id');
            const roll = row.getAttribute('data-roll');
            const name = row.getAttribute('data-name');
            const activePill = row.querySelector('.active-present, .active-absent, .active-leave');
            const status = activePill ? activePill.getAttribute('data-status') : 'Present';

            const attId = `att_${studentId}_${this.selectedDate}`;
            await window.FirebaseService.addDocument('attendance', {
              id: attId,
              studentId: studentId,
              rollNumber: roll,
              studentName: name,
              class: this.selectedClass,
              group: this.selectedGroup,
              date: this.selectedDate,
              status: status,
              markedBy: user.fullName || 'Admin',
              createdAt: new Date().toISOString()
            });

            if (status === 'Absent') {
              absentStudents.push({ studentId, roll, name, status });
            }
          }

          await window.AuditService.log({
            action: 'Attendance Saved',
            category: 'Academic',
            targetType: 'Class Attendance',
            targetId: `${this.selectedClass}-${this.selectedGroup}-${this.selectedDate}`,
            details: `Saved attendance for ${this.selectedClass} (${this.selectedGroup}) on ${this.selectedDate} (${rows.length} students)`
          });

          // Non-blocking asynchronous WhatsApp Attendance triggers (Absent students)
          if (window.WhatsAppService && absentStudents.length > 0) {
            (async () => {
              try {
                const students = await window.FirebaseService.getCollection('students');
                for (const item of absentStudents) {
                  const student = students.find(s => s.id === item.studentId);
                  if (student) {
                    await window.WhatsAppService.notifyAttendance({
                      student: student,
                      status: item.status,
                      date: this.selectedDate
                    });
                  }
                }
              } catch (waErr) {
                console.warn('⚠️ WhatsApp attendance notification note:', waErr);
              }
            })();
          }
        }, 'Saving attendance records to Firebase...', 'Ideal Coaching Center');

        window.UIUtils.showToast('success', 'Attendance Saved', `Attendance for ${this.selectedDate} has been successfully recorded.`);
      };
    }
  }
};

window.AttendanceView = AttendanceView;
