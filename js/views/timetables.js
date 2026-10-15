/**
 * Ideal Coaching Center - Timetable & Class Scheduling Module
 * Weekly schedules, class timetables, teacher timetables, room management,
 * intelligent schedule conflict detection (overlapping teachers & rooms), and publishing.
 */

const TimetablesView = {
  activeTab: 'class', // 'class', 'teacher', 'room'
  selectedClass: '12th',
  selectedGroup: 'Computer Science',
  selectedTeacherId: null,
  selectedDay: 'All',

  async render(container) {
    const allTimetables = await window.FirebaseService.getCollection('timetables');
    const teachers = await window.FirebaseService.getCollection('teachers');
    const assignments = await window.FirebaseService.getCollection('teacher_assignments');

    if (!this.selectedTeacherId && teachers.length > 0) {
      this.selectedTeacherId = teachers[0].id;
    }

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 0.25rem;">
            <span>Academic Control</span> <span style="margin: 0 0.4rem;">/</span> <span style="color: var(--primary-600); font-weight: 600;">Timetable Scheduling</span>
          </div>
          <h1 style="font-size: 1.6rem; color: var(--slate-900); font-weight: 800; margin: 0;">Timetable & Class Schedules</h1>
          <p style="color: var(--slate-500); font-size: 0.85rem; margin-top: 0.25rem;">
            Manage daily lecture periods, teacher allocations, room occupancy, and official schedule publishing.
          </p>
        </div>
        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="btn-print-timetable">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print Timetable
          </button>
          <button type="button" class="btn btn-secondary" id="btn-toggle-publish-all">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Toggle Published Status
          </button>
          <button type="button" class="btn btn-primary" id="btn-add-period">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            + Add Scheduled Period
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tabs-nav" style="margin-bottom: 1.5rem; display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">
        <button type="button" class="tab-btn ${this.activeTab === 'class' ? 'active-tab' : ''}" id="tab-class-tt" style="padding: 0.6rem 1.25rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.activeTab === 'class' ? 'var(--primary-600)' : 'transparent'}; color: ${this.activeTab === 'class' ? '#fff' : 'var(--slate-600)'};">
          Class Timetable
        </button>
        <button type="button" class="tab-btn ${this.activeTab === 'teacher' ? 'active-tab' : ''}" id="tab-teacher-tt" style="padding: 0.6rem 1.25rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.activeTab === 'teacher' ? 'var(--primary-600)' : 'transparent'}; color: ${this.activeTab === 'teacher' ? '#fff' : 'var(--slate-600)'};">
          Teacher Timetable
        </button>
      </div>

      <!-- Filters Bar -->
      <div class="data-card" style="padding: 1rem 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          ${this.activeTab === 'class' ? `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--slate-700);">Class:</label>
              <select id="filter-tt-class" class="form-control" style="width: auto;">
                <option value="12th" ${this.selectedClass === '12th' ? 'selected' : ''}>Class 12th</option>
                <option value="11th" ${this.selectedClass === '11th' ? 'selected' : ''}>Class 11th</option>
                <option value="10th" ${this.selectedClass === '10th' ? 'selected' : ''}>Class 10th</option>
                <option value="9th" ${this.selectedClass === '9th' ? 'selected' : ''}>Class 9th</option>
              </select>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--slate-700);">Group:</label>
              <select id="filter-tt-group" class="form-control" style="width: auto;">
                <option value="Computer Science" ${this.selectedGroup === 'Computer Science' ? 'selected' : ''}>Computer Science</option>
                <option value="Pre-Medical" ${this.selectedGroup === 'Pre-Medical' ? 'selected' : ''}>Pre-Medical</option>
                <option value="Pre-Engineering" ${this.selectedGroup === 'Pre-Engineering' ? 'selected' : ''}>Pre-Engineering</option>
                <option value="Science" ${this.selectedGroup === 'Science' ? 'selected' : ''}>Science</option>
                <option value="General" ${this.selectedGroup === 'General' ? 'selected' : ''}>General</option>
              </select>
            </div>
          ` : `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label style="font-size: 0.85rem; font-weight: 600; color: var(--slate-700);">Select Faculty:</label>
              <select id="filter-tt-teacher" class="form-control" style="width: auto;">
                ${teachers.map(t => `<option value="${t.id}" ${this.selectedTeacherId === t.id ? 'selected' : ''}>${t.fullName} (${t.teacherId})</option>`).join('')}
              </select>
            </div>
          `}
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <label style="font-size: 0.85rem; font-weight: 600; color: var(--slate-700);">Day:</label>
            <select id="filter-tt-day" class="form-control" style="width: auto;">
              <option value="All" ${this.selectedDay === 'All' ? 'selected' : ''}>All Weekdays</option>
              <option value="Monday" ${this.selectedDay === 'Monday' ? 'selected' : ''}>Monday</option>
              <option value="Tuesday" ${this.selectedDay === 'Tuesday' ? 'selected' : ''}>Tuesday</option>
              <option value="Wednesday" ${this.selectedDay === 'Wednesday' ? 'selected' : ''}>Wednesday</option>
              <option value="Thursday" ${this.selectedDay === 'Thursday' ? 'selected' : ''}>Thursday</option>
              <option value="Friday" ${this.selectedDay === 'Friday' ? 'selected' : ''}>Friday</option>
              <option value="Saturday" ${this.selectedDay === 'Saturday' ? 'selected' : ''}>Saturday</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Timetable Weekly Grid / List -->
      <div id="timetable-display-area">
        ${this.buildTimetableGrid(allTimetables, teachers)}
      </div>
    `;

    this.attachEvents(container, allTimetables, teachers);
  },

  buildTimetableGrid(allTimetables, teachers) {
    const weekdays = this.selectedDay === 'All' 
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      : [this.selectedDay];

    let relevantPeriods = allTimetables;
    if (this.activeTab === 'class') {
      relevantPeriods = allTimetables.filter(t => t.class === this.selectedClass && t.group === this.selectedGroup);
    } else {
      relevantPeriods = allTimetables.filter(t => t.teacherId === this.selectedTeacherId);
    }

    if (relevantPeriods.length === 0) {
      return `
        <div class="data-card" style="padding: 3rem; text-align: center; color: var(--slate-500);">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.75rem; color: var(--slate-400);">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <h3 style="color: var(--slate-800); font-size: 1.1rem; margin-bottom: 0.25rem;">No Schedule Periods Configured</h3>
          <p style="font-size: 0.85rem;">Click "+ Add Scheduled Period" above to assign lectures to this schedule.</p>
        </div>
      `;
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        ${weekdays.map(day => {
          const dayPeriods = relevantPeriods.filter(p => p.day === day).sort((a, b) => a.periodNumber - b.periodNumber);
          if (dayPeriods.length === 0) return '';

          return `
            <div class="data-card" style="margin-bottom: 0;">
              <div class="data-card-header" style="background: var(--slate-50); padding: 0.75rem 1.25rem;">
                <strong style="color: var(--slate-900); font-size: 1rem;">${day}</strong>
                <span class="badge ${dayPeriods.every(p => p.isPublished) ? 'badge-paid' : 'badge-warning'}">
                  ${dayPeriods.every(p => p.isPublished) ? 'Published Official' : 'Draft / Unpublished'}
                </span>
              </div>
              <div style="padding: 1rem 1.25rem;">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem;">
                  ${dayPeriods.map(p => `
                    <div class="period-card" style="border: 1px solid var(--border-color); border-left: 4px solid var(--primary-600); border-radius: var(--radius-md); padding: 1rem; background: #ffffff; box-shadow: var(--shadow-sm); position: relative;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
                        <span style="font-size: 0.75rem; font-weight: 800; color: var(--primary-600); text-transform: uppercase;">
                          Period ${p.periodNumber} (${p.startTime} - ${p.endTime})
                        </span>
                        <button type="button" class="btn-del-period" data-id="${p.id}" style="border: none; background: transparent; color: var(--danger-500); cursor: pointer; font-size: 1rem; padding: 0 0.25rem;" title="Delete Period">×</button>
                      </div>
                      <div style="font-size: 1rem; font-weight: 800; color: var(--slate-900);">
                        ${p.subject}
                      </div>
                      <div style="font-size: 0.8rem; color: var(--slate-600); margin-top: 0.25rem;">
                        Teacher: <strong>${p.teacherName}</strong>
                      </div>
                      <div style="font-size: 0.75rem; color: var(--slate-500); margin-top: 0.2rem;">
                        Class: ${p.class} (${p.group}) • Room: <strong>${p.room || 'General'}</strong>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  attachEvents(container, allTimetables, teachers) {
    // Tabs
    const tabClass = container.querySelector('#tab-class-tt');
    const tabTeacher = container.querySelector('#tab-teacher-tt');

    if (tabClass) tabClass.onclick = () => { this.activeTab = 'class'; this.render(container); };
    if (tabTeacher) tabTeacher.onclick = () => { this.activeTab = 'teacher'; this.render(container); };

    // Filters
    const classFilter = container.querySelector('#filter-tt-class');
    const groupFilter = container.querySelector('#filter-tt-group');
    const teacherFilter = container.querySelector('#filter-tt-teacher');
    const dayFilter = container.querySelector('#filter-tt-day');

    if (classFilter) classFilter.onchange = () => { this.selectedClass = classFilter.value; this.render(container); };
    if (groupFilter) groupFilter.onchange = () => { this.selectedGroup = groupFilter.value; this.render(container); };
    if (teacherFilter) teacherFilter.onchange = () => { this.selectedTeacherId = teacherFilter.value; this.render(container); };
    if (dayFilter) dayFilter.onchange = () => { this.selectedDay = dayFilter.value; this.render(container); };

    // Delete period
    container.querySelectorAll('.btn-del-period').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Remove this scheduled period?')) return;
        await window.GlobalLoader.wrap(async () => {
          await window.FirebaseService.deleteDocument('timetables', id);
        }, 'Removing period from timetable...', 'Ideal Coaching Center');
        this.render(container);
      };
    });

    // Add period modal
    const btnAdd = container.querySelector('#btn-add-period');
    if (btnAdd) {
      btnAdd.onclick = () => this.openAddPeriodModal(container, teachers);
    }

    // Toggle publish all
    const btnPublish = container.querySelector('#btn-toggle-publish-all');
    if (btnPublish) {
      btnPublish.onclick = async () => {
        await window.GlobalLoader.wrap(async () => {
          for (const tt of allTimetables) {
            await window.FirebaseService.updateDocument('timetables', tt.id, { isPublished: !tt.isPublished });
          }
        }, 'Toggling publication state across all student and teacher dashboards...', 'Ideal Coaching Center');
        window.UIUtils.showToast('success', 'Timetable Updated', 'Publication state updated for all schedules.');
        this.render(container);
      };
    }

    // Print timetable
    const btnPrint = container.querySelector('#btn-print-timetable');
    if (btnPrint) {
      btnPrint.onclick = () => this.printCurrentTimetable(allTimetables);
    }
  },

  /**
   * Modal: Add Scheduled Period with Conflict Detection
   */
  openAddPeriodModal(container, teachers) {
    const content = `
      <form id="add-period-form" class="form-grid" style="padding: 0.5rem 0;">
        <div class="form-group">
          <label class="form-label">Day of Week <span class="req-star">*</span></label>
          <select id="tt-day-input" class="form-control" required>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Period Number <span class="req-star">*</span></label>
          <select id="tt-num-input" class="form-control" required>
            <option value="1">Period 1</option>
            <option value="2">Period 2</option>
            <option value="3">Period 3</option>
            <option value="4">Period 4</option>
            <option value="5">Period 5</option>
            <option value="6">Period 6</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Start Time <span class="req-star">*</span></label>
          <input type="time" id="tt-start-input" class="form-control" value="08:30" required />
        </div>

        <div class="form-group">
          <label class="form-label">End Time <span class="req-star">*</span></label>
          <input type="time" id="tt-end-input" class="form-control" value="09:20" required />
        </div>

        <div class="form-group">
          <label class="form-label">Class <span class="req-star">*</span></label>
          <select id="tt-class-input" class="form-control" required>
            <option value="12th">Class 12th</option>
            <option value="11th">Class 11th</option>
            <option value="10th">Class 10th</option>
            <option value="9th">Class 9th</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Group / Stream <span class="req-star">*</span></label>
          <select id="tt-group-input" class="form-control" required>
            <option value="Computer Science">Computer Science</option>
            <option value="Pre-Medical">Pre-Medical</option>
            <option value="Pre-Engineering">Pre-Engineering</option>
            <option value="Science">Science</option>
            <option value="General">General</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Subject <span class="req-star">*</span></label>
          <input type="text" id="tt-subject-input" class="form-control" placeholder="e.g. Computer Science" required />
        </div>

        <div class="form-group">
          <label class="form-label">Assigned Teacher <span class="req-star">*</span></label>
          <select id="tt-teacher-input" class="form-control" required>
            ${teachers.map(t => `<option value="${t.id}">${t.fullName} (${t.teacherId})</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Classroom / Laboratory</label>
          <input type="text" id="tt-room-input" class="form-control" placeholder="e.g. Room 201 or Lab 1" value="Room 201" />
        </div>

        <div class="form-group">
          <label class="form-label">Academic Year</label>
          <input type="text" id="tt-year-input" class="form-control" value="2026-2027" />
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('add-period-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-period-item">Validate & Schedule Period</button>
    `;

    window.UIUtils.showModal('Add Timetable Period (Conflict Protected)', content, actions, 'modal-md', 'add-period-modal');

    const modalEl = document.querySelector('#add-period-modal');
    if (!modalEl) return;

    modalEl.querySelector('#btn-save-period-item').onclick = async () => {
      const day = modalEl.querySelector('#tt-day-input').value;
      const num = Number(modalEl.querySelector('#tt-num-input').value);
      const start = modalEl.querySelector('#tt-start-input').value;
      const end = modalEl.querySelector('#tt-end-input').value;
      const cls = modalEl.querySelector('#tt-class-input').value;
      const grp = modalEl.querySelector('#tt-group-input').value;
      const sub = modalEl.querySelector('#tt-subject-input').value.trim();
      const tId = modalEl.querySelector('#tt-teacher-input').value;
      const teacher = teachers.find(t => t.id === tId);
      const room = modalEl.querySelector('#tt-room-input').value.trim();
      const year = modalEl.querySelector('#tt-year-input').value.trim();

      if (!sub) {
        window.UIUtils.showToast('error', 'Subject Required', 'Please enter a lecture subject.');
        return;
      }

      const periodData = {
        day,
        periodNumber: num,
        startTime: start,
        endTime: end,
        class: cls,
        group: grp,
        subject: sub,
        teacherId: tId,
        teacherName: teacher ? teacher.fullName : 'Teacher',
        room,
        academicYear: year,
        isPublished: true
      };

      // Check conflict before saving
      const conflictCheck = await window.FirebaseService.checkTimetableConflict(periodData);
      if (conflictCheck.hasConflict) {
        window.UIUtils.showToast('error', 'Schedule Conflict Detected', conflictCheck.message);
        return;
      }

      window.UIUtils.closeModal('add-period-modal');

      const id = `tt_${Date.now()}`;
      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.addDocument('timetables', { id, ...periodData, createdAt: new Date().toISOString() });
        await window.AuditService.log({
          action: 'Timetable Period Added',
          category: 'Timetable',
          targetType: 'Period',
          targetId: id,
          details: `Scheduled ${sub} on ${day} Period ${num} (${start}-${end}) for Class ${cls} (${grp})`
        });
      }, 'Verifying timetable constraints and saving period...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Period Scheduled', `Lecture added without conflicts.`);
      this.render(container);
    };
  },

  /**
   * Print Current Timetable
   */
  printCurrentTimetable(allTimetables) {
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Official Timetable - Ideal Coaching Center</title>
        <style>
          body { font-family: sans-serif; margin: 20px; color: #1e293b; }
          h2, h3 { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; }
          @media print { @page { size: A4 landscape; margin: 10mm; } }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <h2>Ideal Coaching Center</h2>
          <h3>Official Published Timetable - Academic Year 2026-2027</h3>
          <p>Schedule View: ${this.activeTab === 'class' ? `Class ${this.selectedClass} (${this.selectedGroup})` : 'Faculty Schedule'}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Period</th>
              <th>Time</th>
              <th>Subject</th>
              <th>Class & Group</th>
              <th>Teacher</th>
              <th>Room</th>
            </tr>
          </thead>
          <tbody>
            ${allTimetables.filter(t => this.activeTab === 'class' ? (t.class === this.selectedClass && t.group === this.selectedGroup) : (t.teacherId === this.selectedTeacherId)).map(p => `
              <tr>
                <td><strong>${p.day}</strong></td>
                <td>Period ${p.periodNumber}</td>
                <td>${p.startTime} - ${p.endTime}</td>
                <td><strong>${p.subject}</strong></td>
                <td>${p.class} (${p.group})</td>
                <td>${p.teacherName}</td>
                <td>${p.room || 'General'}</td>
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

window.TimetablesView = TimetablesView;
