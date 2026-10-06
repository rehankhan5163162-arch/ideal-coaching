/**
 * Ideal Coaching Center - Admin Dashboard & Student Operations
 * Add Student (dynamic groups & unique roll validation), All Students, and Student Profile
 */

const AdminView = {
  /**
   * Render Admin Dashboard Homepage
   */
  async renderDashboard(container) {
    const students = await window.FirebaseService.getCollection('students');
    const fees = await window.FirebaseService.getCollection('fees');
    const attendance = await window.FirebaseService.getCollection('attendance');
    const announcements = await window.FirebaseService.getCollection('announcements');
    const settings = await window.FirebaseService.getSystemSettings();

    const totalStudents = students.length;
    const paidFees = fees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
    const expectedFees = fees.reduce((sum, f) => sum + (Number(f.expectedAmount) || 0), 0);
    const pendingFees = Math.max(0, expectedFees - paidFees);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayAtt = attendance.filter(a => a.date === todayStr);
    const presentToday = todayAtt.filter(a => a.status === 'Present').length;

    container.innerHTML = `
      <!-- Admin Welcome Banner -->
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); border-radius: var(--radius-xl); padding: 1.75rem 2rem; color: #ffffff; margin-bottom: 1.75rem; box-shadow: var(--shadow-lg);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span class="student-hero-badge" style="margin-bottom: 0.5rem;">Coaching Administration Portal</span>
            <h1 style="color: #ffffff; font-size: 1.75rem;">Ideal Coaching Center Operations</h1>
            <p style="color: #cbd5e1; font-size: 0.85rem; margin-top: 0.25rem;">
              Managing active student batches for Academic Year <strong>${settings.activeAcademicYear}</strong>
            </p>
          </div>
          <div style="display: flex; gap: 0.65rem;">
            <button type="button" class="btn btn-primary" id="btn-quick-add-student">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Enroll New Student
            </button>
            <button type="button" class="btn btn-secondary" id="btn-quick-mark-attendance">
              Mark Attendance
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Students</span>
            <span class="stat-value">${totalStudents}</span>
            <span class="stat-subtext">Across All Classes</span>
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
            <span class="stat-label">Paid Fees</span>
            <span class="stat-value" style="font-size: 1.4rem;">${window.UIUtils.formatCurrency(paidFees)}</span>
            <span class="stat-subtext">Total Verified Receipts</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-amber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Pending Fees</span>
            <span class="stat-value" style="font-size: 1.4rem; color: var(--warning-600);">${window.UIUtils.formatCurrency(pendingFees)}</span>
            <span class="stat-subtext">To Be Collected</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-cyan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Today's Attendance</span>
            <span class="stat-value">${presentToday} Present</span>
            <span class="stat-subtext">${window.UIUtils.formatDate(todayStr)}</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Cards Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
        <div class="data-card" style="margin-bottom: 0;">
          <div class="data-card-header">
            <h3 class="data-card-title">Enrolled Batches Breakdown</h3>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-view-all-students-quick">View All Students</button>
          </div>
          <div style="padding: 1.5rem;">
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.65rem; border-bottom: 1px solid var(--border-color-subtle);">
                <div>
                  <strong>Class 9th & 10th (Matric)</strong>
                  <div style="font-size: 0.75rem; color: var(--slate-500);">Science & General Streams</div>
                </div>
                <span class="badge badge-studying">${students.filter(s => s.class === '9th' || s.class === '10th').length} Students</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.65rem; border-bottom: 1px solid var(--border-color-subtle);">
                <div>
                  <strong>Class 11th & 12th (Intermediate)</strong>
                  <div style="font-size: 0.75rem; color: var(--slate-500);">Pre-Medical, Pre-Engineering, Computer Science</div>
                </div>
                <span class="badge badge-paid">${students.filter(s => s.class === '11th' || s.class === '12th').length} Students</span>
              </div>
            </div>
          </div>
        </div>

        <div class="data-card" style="margin-bottom: 0;">
          <div class="data-card-header">
            <h3 class="data-card-title">Latest Announcements</h3>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-create-ann-quick">+ Post Notice</button>
          </div>
          <div style="padding: 1.25rem 1.5rem;">
            ${announcements.slice(0, 3).map(a => `
              <div style="padding: 0.6rem 0; border-bottom: 1px solid var(--border-color-subtle);">
                <div style="font-weight: 700; font-size: 0.85rem;">${a.title}</div>
                <div style="font-size: 0.725rem; color: var(--slate-500); margin-top: 0.15rem;">Target: ${a.targetClass} (${a.targetGroup || 'All'})</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Button event bindings
    container.querySelector('#btn-quick-add-student').onclick = () => {
      window.location.hash = '#add-student';
      window.AppRouter.navigate('add-student');
    };
    container.querySelector('#btn-quick-mark-attendance').onclick = () => {
      window.location.hash = '#attendance';
      window.AppRouter.navigate('attendance');
    };
    container.querySelector('#btn-view-all-students-quick').onclick = () => {
      window.location.hash = '#students';
      window.AppRouter.navigate('students');
    };
    container.querySelector('#btn-create-ann-quick').onclick = () => {
      window.location.hash = '#announcements';
      window.AppRouter.navigate('announcements');
    };
  },

  /**
   * Render Add Student View with strict dynamic group dropdown and unique roll validation
   */
  async renderAddStudent(container) {
    const classGroups = window.UIUtils.getClassesAndGroups();

    container.innerHTML = `
      <div class="data-card" style="max-width: 820px; margin: 0 auto;">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">Enroll New Student</h2>
            <span class="data-card-subtitle">Register student profile, validate unique roll number, and initialize 12-month fee schedule • Ideal Coaching Center</span>
          </div>
        </div>

        <div style="padding: 2rem;">
          <form id="add-student-form" class="form-grid">
            <div class="form-group">
              <label class="form-label" for="std-input-name">Student Full Name <span class="req-star">*</span></label>
              <input type="text" id="std-input-name" class="form-control" placeholder="e.g. Daniyal Raza" required />
              <span class="form-error-msg">Student full name is required.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="std-input-father">Father's Name <span class="req-star">*</span></label>
              <input type="text" id="std-input-father" class="form-control" placeholder="e.g. Raza Hussain" required />
              <span class="form-error-msg">Father's name is required.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="std-input-roll">Roll Number (Unique ID) <span class="req-star">*</span></label>
              <input type="text" id="std-input-roll" class="form-control" placeholder="e.g. 1205" required />
              <span class="form-help">Must be unique across all enrolled students in Firebase.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="std-input-contact">Contact Number <span class="req-star">*</span></label>
              <input type="tel" id="std-input-contact" class="form-control" placeholder="0300-1234567" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="std-input-class">Class <span class="req-star">*</span></label>
              <select id="std-input-class" class="form-control" required>
                <option value="9th">9th</option>
                <option value="10th">10th</option>
                <option value="11th">11th</option>
                <option value="12th" selected>12th</option>
              </select>
              <span class="form-help">Group options will update dynamically based on class.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="std-input-group">Academic Stream / Group <span class="req-star">*</span></label>
              <select id="std-input-group" class="form-control" required>
                <!-- Populated dynamically -->
              </select>
              <span class="form-help" id="group-validation-hint">11th & 12th: Pre-Medical, Pre-Engineering, Computer Science only.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="std-input-status">Account Status <span class="req-star">*</span></label>
              <select id="std-input-status" class="form-control">
                <option value="Active" selected>Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="std-input-email">Student Login Email <span class="req-star">*</span></label>
              <input type="email" id="std-input-email" class="form-control" placeholder="e.g. daniyal@ideal.edu" required />
              <span class="form-help">Used by the student to sign in to their coaching portal.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="std-input-password">Student Password <span class="req-star">*</span></label>
              <input type="password" id="std-input-password" class="form-control" placeholder="Create password (e.g. Student@123)" required />
              <span class="form-help">Student portal access password.</span>
            </div>

            <div class="form-col-full" style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-add-student">Cancel</button>
              <button type="button" class="btn btn-primary btn-lg" id="btn-submit-save-student">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Student & Initialize Schedule
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    const classSelect = container.querySelector('#std-input-class');
    const groupSelect = container.querySelector('#std-input-group');
    const groupHint = container.querySelector('#group-validation-hint');

    // Dynamic Group dropdown update logic
    const updateGroups = () => {
      const selectedClass = classSelect.value;
      const allowedGroups = classGroups[selectedClass] || [];

      groupSelect.innerHTML = allowedGroups.map(g => `
        <option value="${g}">${g}</option>
      `).join('');

      if (selectedClass === '9th' || selectedClass === '10th') {
        groupHint.textContent = 'For 9th and 10th: Science and General streams only.';
      } else {
        groupHint.textContent = 'For 11th and 12th: Pre-Medical, Pre-Engineering, and Computer Science only.';
      }
    };

    updateGroups();
    classSelect.onchange = updateGroups;

    // Save Student button handler
    const saveBtn = container.querySelector('#btn-submit-save-student');
    saveBtn.onclick = async () => {
      const name = container.querySelector('#std-input-name').value.trim();
      const father = container.querySelector('#std-input-father').value.trim();
      const roll = container.querySelector('#std-input-roll').value.trim();
      const contact = container.querySelector('#std-input-contact').value.trim();
      const email = container.querySelector('#std-input-email').value.trim();
      const password = container.querySelector('#std-input-password').value.trim();
      const studentClass = classSelect.value;
      const group = groupSelect.value;
      const status = container.querySelector('#std-input-status').value;

      // Required fields validation
      if (!name || !father || !roll || !contact || !email || !password) {
        window.UIUtils.showToast('error', 'Required Fields Missing', 'Please fill in all required fields marked with *.');
        return;
      }

      // Rejection of invalid class & group combinations
      const validGroupsForClass = classGroups[studentClass] || [];
      if (!validGroupsForClass.includes(group)) {
        window.UIUtils.showToast('error', 'Invalid Class & Group', `Class ${studentClass} cannot be assigned to group "${group}".`);
        return;
      }

      // Check unique roll number in Firebase
      const isTaken = await window.FirebaseService.isRollNumberTaken(roll);
      if (isTaken) {
        await window.UIUtils.confirm({
          title: 'Duplicate Roll Number',
          message: 'This roll number is already registered. Please enter a different roll number.',
          confirmText: 'Understood',
          cancelText: 'Back',
          type: 'warning'
        });
        const rollInput = container.querySelector('#std-input-roll');
        rollInput.focus();
        rollInput.classList.add('is-invalid');
        return;
      }

      // Check unique email in Firebase
      const existingStudents = await window.FirebaseService.getCollection('students');
      const isEmailTaken = existingStudents.some(s => s.email && s.email.toLowerCase() === email.toLowerCase());
      if (isEmailTaken) {
        window.UIUtils.showToast('error', 'Duplicate Email', 'A student with this email address is already registered.');
        container.querySelector('#std-input-email').focus();
        return;
      }

      // Process creation under the strict 5-second minimum loader
      await window.GlobalLoader.wrap(async () => {
        const studentId = `std_${Date.now()}`;
        const newStudent = {
          id: studentId,
          rollNumber: roll,
          fullName: name,
          fatherName: father,
          contactNumber: contact,
          email: email,
          password: password,
          credentialPin: password,
          class: studentClass,
          group: group,
          status: status,
          admissionDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        };

        // Save student in Firestore
        await window.FirebaseService.addDocument('students', newStudent);

        // Initialize 12-month fee schedule
        await window.FirebaseService.initStudentFeeSchedule(newStudent);

        // Log audit
        await window.AuditService.log({
          action: 'Student Enrolled',
          category: 'Students',
          targetType: 'Student',
          targetId: studentId,
          details: `Enrolled student ${name} (Roll #${roll}) into ${studentClass} (${group}) and initialized 12-month schedule.`
        });
      }, 'Saving student & initializing 12-month academic fee schedule...', 'Ideal Coaching Center');

      if (window.FirebaseService.cloudStatus === 'online') {
        window.UIUtils.showToast('success', 'Student Enrolled & Synced Live', 'Student account is live in Cloud Firestore. Student can log in from mobile or any device right away!');
      } else {
        window.UIUtils.showToast('warning', 'Student Saved Locally', 'Student saved on this computer. Click "Cloud Setup Required" in top bar to publish Firebase rules so mobile devices can sync.');
      }

      // Automatically navigate to All Students view
      window.location.hash = '#students';
      window.AppRouter.navigate('students');
    };

    container.querySelector('#btn-cancel-add-student').onclick = () => {
      window.location.hash = '#students';
      window.AppRouter.navigate('students');
    };
  },

  /**
   * Render All Students Table with search, class/group filter, pagination, actions
   */
  async renderAllStudents(container) {
    const students = await window.FirebaseService.getCollection('students');
    const fees = await window.FirebaseService.getCollection('fees');
    const attendance = await window.FirebaseService.getCollection('attendance');

    container.innerHTML = `
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">All Students Directory</h2>
            <span class="data-card-subtitle">Real-time centralized student database (${students.length} Total Enrolled) • Ideal Coaching Center</span>
          </div>

          <div class="data-card-actions">
            <div class="search-box">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" id="student-search-input" class="search-input" placeholder="Search by name or roll number..." />
            </div>

            <select id="student-filter-class" class="filter-select">
              <option value="All">All Classes</option>
              <option value="9th">Class 9th</option>
              <option value="10th">Class 10th</option>
              <option value="11th">Class 11th</option>
              <option value="12th">Class 12th</option>
            </select>

            <select id="student-filter-status" class="filter-select">
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <button type="button" class="btn btn-primary btn-sm" id="btn-add-student-from-list">
              + Add Student
            </button>
          </div>
        </div>

        <div style="padding: 1.5rem;">
          <div class="table-responsive">
            <table class="app-table" id="students-data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Father's Name</th>
                  <th>Class & Group</th>
                  <th>Contact</th>
                  <th>Account Status</th>
                  <th>Fee Status</th>
                  <th>Attendance %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="students-table-body">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const searchInput = container.querySelector('#student-search-input');
    const filterClass = container.querySelector('#student-filter-class');
    const filterStatus = container.querySelector('#student-filter-status');
    const tbody = container.querySelector('#students-table-body');

    const renderRows = () => {
      const q = searchInput.value.toLowerCase().trim();
      const cls = filterClass.value;
      const stat = filterStatus.value;

      const filtered = students.filter(s => {
        const matchesQuery = !q || s.fullName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q);
        const matchesClass = cls === 'All' || s.class === cls;
        const matchesStatus = stat === 'All' || s.status === stat;
        return matchesQuery && matchesClass && matchesStatus;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9">
              <div class="table-empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h4 class="empty-state-title">No students found</h4>
                <p class="empty-state-text">No student profiles match your search and filter criteria.</p>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map(s => {
        // Fee calculations
        const sFees = fees.filter(f => f.studentId === s.id);
        const pendingCount = sFees.filter(f => f.status === 'Pending').length;
        const feeStatus = pendingCount === 0 ? 'Paid' : 'Pending';

        // Monthly Attendance % (Calculated across full month's working days, Sundays excluded)
        const attData = window.UIUtils.calculateMonthlyAttendance(attendance, s.id);
        const attPct = attData.attPct;

        return `
          <tr data-student-id="${s.id}">
            <td style="font-family: var(--font-mono); font-weight: 800; color: var(--primary-700);">#${s.rollNumber}</td>
            <td>
              <strong style="color: var(--slate-900); cursor: pointer;" class="student-name-link" data-student-id="${s.id}">
                ${s.fullName}
              </strong>
            </td>
            <td>${s.fatherName}</td>
            <td>
              <span class="badge badge-studying">${s.class}</span>
              <span style="font-size: 0.75rem; color: var(--slate-600); margin-left: 0.25rem;">${s.group}</span>
            </td>
            <td>${s.contactNumber}</td>
            <td>
              <span class="badge ${s.status === 'Active' ? 'badge-active' : 'badge-inactive'}">
                ${s.status}
              </span>
            </td>
            <td>
              <span class="badge ${feeStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}">
                ${feeStatus === 'Paid' ? 'Cleared' : `${pendingCount} Mos Due`}
              </span>
            </td>
            <td>
              <span class="badge ${attPct >= 80 ? 'badge-paid' : 'badge-pending'}">
                ${attPct}%
              </span>
            </td>
            <td>
              <div style="display: flex; gap: 0.35rem;">
                <button type="button" class="btn btn-secondary btn-sm btn-view-profile" data-student-id="${s.id}" title="View Complete Profile">
                  Profile
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-edit-student" data-student-id="${s.id}" title="Edit Student">
                  Edit
                </button>
                <button type="button" class="btn ${s.status === 'Active' ? 'btn-secondary' : 'btn-success'} btn-sm btn-toggle-std-status" data-student-id="${s.id}" title="Toggle Active/Inactive">
                  ${s.status === 'Active' ? 'Disable' : 'Enable'}
                </button>
                <button type="button" class="btn btn-danger btn-sm btn-delete-student" data-student-id="${s.id}" title="Delete Student">
                  &times;
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      this.bindTableEvents(container);
    };

    renderRows();

    searchInput.oninput = renderRows;
    filterClass.onchange = renderRows;
    filterStatus.onchange = renderRows;

    container.querySelector('#btn-add-student-from-list').onclick = () => {
      window.location.hash = '#add-student';
      window.AppRouter.navigate('add-student');
    };
  },

  bindTableEvents(container) {
    // View Profile
    container.querySelectorAll('.btn-view-profile, .student-name-link').forEach(el => {
      el.onclick = () => {
        const studentId = el.getAttribute('data-student-id');
        this.openStudentProfile(studentId);
      };
    });

    // Edit Student
    container.querySelectorAll('.btn-edit-student').forEach(btn => {
      btn.onclick = async () => {
        const studentId = btn.getAttribute('data-student-id');
        const student = await window.FirebaseService.getDocument('students', studentId);
        if (student) this.openEditStudentModal(container, student);
      };
    });

    // Toggle Active / Inactive
    container.querySelectorAll('.btn-toggle-std-status').forEach(btn => {
      btn.onclick = async () => {
        const studentId = btn.getAttribute('data-student-id');
        const student = await window.FirebaseService.getDocument('students', studentId);
        if (!student) return;
        const newStatus = student.status === 'Active' ? 'Inactive' : 'Active';

        await window.GlobalLoader.wrap(async () => {
          await window.FirebaseService.updateDocument('students', studentId, { status: newStatus });
          await window.AuditService.log({
            action: 'Student Status Toggled',
            category: 'Students',
            targetType: 'Student',
            targetId: studentId,
            details: `Changed status of ${student.fullName} (Roll #${student.rollNumber}) to ${newStatus}`
          });
        }, 'Updating student status in Firebase...', 'Ideal Coaching Center');

        window.UIUtils.showToast('info', 'Status Updated', `Student status changed to ${newStatus}.`);
        this.renderAllStudents(container);
      };
    });

    // Delete Student
    container.querySelectorAll('.btn-delete-student').forEach(btn => {
      btn.onclick = async () => {
        const studentId = btn.getAttribute('data-student-id');
        const student = await window.FirebaseService.getDocument('students', studentId);
        if (!student) return;

        const confirmed = await window.UIUtils.confirm({
          title: 'Delete Student Profile',
          message: `Are you sure you want to delete ${student.fullName} (Roll #${student.rollNumber})? This action cannot be undone.`,
          confirmText: 'Yes, Delete Student',
          cancelText: 'Cancel',
          type: 'danger'
        });

        if (confirmed) {
          await window.GlobalLoader.wrap(async () => {
            await window.FirebaseService.deleteDocument('students', studentId);
            // Delete associated fees
            const fees = await window.FirebaseService.getCollection('fees');
            for (const f of fees) {
              if (f.studentId === studentId) {
                await window.FirebaseService.deleteDocument('fees', f.id);
              }
            }
            await window.AuditService.log({
              action: 'Student Deleted',
              category: 'Students',
              targetType: 'Student',
              targetId: studentId,
              details: `Deleted student ${student.fullName} (Roll #${student.rollNumber}) and associated fee schedule`
            });
          }, 'Deleting student records from Firebase...', 'Ideal Coaching Center');

          window.UIUtils.showToast('info', 'Student Deleted', 'Student record has been permanently removed.');
          this.renderAllStudents(container);
        }
      };
    });
  },

  /**
   * Edit Student Modal
   */
  openEditStudentModal(container, student) {
    let modal = document.getElementById('edit-student-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'edit-student-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const classGroups = window.UIUtils.getClassesAndGroups();

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">Edit Student Profile</h3>
          <button type="button" class="modal-close-btn" id="btn-close-edit-std-modal">&times;</button>
        </div>

        <div class="modal-body">
          <form id="edit-student-form" class="form-grid">
            <div class="form-group">
              <label class="form-label">Student Full Name</label>
              <input type="text" id="edit-std-name" class="form-control" value="${student.fullName}" required />
            </div>

            <div class="form-group">
              <label class="form-label">Father's Name</label>
              <input type="text" id="edit-std-father" class="form-control" value="${student.fatherName}" required />
            </div>

            <div class="form-group">
              <label class="form-label">Roll Number</label>
              <input type="text" id="edit-std-roll" class="form-control" value="${student.rollNumber}" required />
            </div>

            <div class="form-group">
              <label class="form-label">Contact Number</label>
              <input type="tel" id="edit-std-contact" class="form-control" value="${student.contactNumber}" required />
            </div>

            <div class="form-group">
              <label class="form-label">Class</label>
              <select id="edit-std-class" class="form-control">
                <option value="9th" ${student.class === '9th' ? 'selected' : ''}>9th</option>
                <option value="10th" ${student.class === '10th' ? 'selected' : ''}>10th</option>
                <option value="11th" ${student.class === '11th' ? 'selected' : ''}>11th</option>
                <option value="12th" ${student.class === '12th' ? 'selected' : ''}>12th</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Group</label>
              <select id="edit-std-group" class="form-control">
                <!-- Populated dynamically -->
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Account Status</label>
              <select id="edit-std-status" class="form-control">
                <option value="Active" ${student.status === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Inactive" ${student.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Student Login Email</label>
              <input type="email" id="edit-std-email" class="form-control" value="${student.email || ('student' + student.rollNumber + '@ideal.edu')}" required />
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="edit-std-password" class="form-control" value="${student.password || student.credentialPin || 'Student@123'}" required />
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-cancel-edit-std">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-save-edit-std">Save Changes</button>
        </div>
      </div>
    `;

    const editClassSelect = modal.querySelector('#edit-std-class');
    const editGroupSelect = modal.querySelector('#edit-std-group');

    const refreshGroups = () => {
      const cls = editClassSelect.value;
      const groups = classGroups[cls] || [];
      editGroupSelect.innerHTML = groups.map(g => `
        <option value="${g}" ${student.group === g ? 'selected' : ''}>${g}</option>
      `).join('');
    };

    refreshGroups();
    editClassSelect.onchange = refreshGroups;

    window.UIUtils.openModal('edit-student-modal');

    modal.querySelector('#btn-close-edit-std-modal').onclick = () => window.UIUtils.closeModal('edit-student-modal');
    modal.querySelector('#btn-cancel-edit-std').onclick = () => window.UIUtils.closeModal('edit-student-modal');

    modal.querySelector('#btn-save-edit-std').onclick = async () => {
      const name = modal.querySelector('#edit-std-name').value.trim();
      const father = modal.querySelector('#edit-std-father').value.trim();
      const roll = modal.querySelector('#edit-std-roll').value.trim();
      const contact = modal.querySelector('#edit-std-contact').value.trim();
      const sEmail = modal.querySelector('#edit-std-email').value.trim();
      const sPassword = modal.querySelector('#edit-std-password').value.trim();
      const sClass = editClassSelect.value;
      const sGroup = editGroupSelect.value;
      const sStatus = modal.querySelector('#edit-std-status').value;

      if (!name || !father || !roll || !contact || !sEmail || !sPassword) {
        window.UIUtils.showToast('error', 'Required Fields Missing', 'Please fill in all required fields.');
        return;
      }

      // Check unique roll if changed
      if (roll !== student.rollNumber) {
        const isTaken = await window.FirebaseService.isRollNumberTaken(roll, student.id);
        if (isTaken) {
          window.UIUtils.showToast('error', 'Duplicate Roll', 'This roll number is already registered.');
          return;
        }
      }

      window.UIUtils.closeModal('edit-student-modal');

      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.updateDocument('students', student.id, {
          fullName: name,
          fatherName: father,
          rollNumber: roll,
          contactNumber: contact,
          email: sEmail,
          password: sPassword,
          credentialPin: sPassword,
          class: sClass,
          group: sGroup,
          status: sStatus
        });

        await window.AuditService.log({
          action: 'Student Profile Updated',
          category: 'Students',
          targetType: 'Student',
          targetId: student.id,
          details: `Updated profile of student ${name} (Roll #${roll})`
        });
      }, 'Updating student profile in Firebase...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Profile Updated', 'Student information updated successfully.');
      this.renderAllStudents(container);
    };
  },

  /**
   * Complete Student Profile View: Personal Info, 12-Month Fees, Receipts, Attendance, Announcements, Diary, Syllabus
   */
  async openStudentProfile(studentId) {
    const student = await window.FirebaseService.getDocument('students', studentId);
    if (!student) return;

    let modal = document.getElementById('student-profile-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'student-profile-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const allFees = await window.FirebaseService.getCollection('fees');
    const studentFees = allFees.filter(f => f.studentId === student.id).sort((a, b) => a.monthOrder - b.monthOrder);

    const allReceipts = await window.FirebaseService.getCollection('receipts');
    const studentReceipts = allReceipts.filter(r => r.studentId === student.id);

    const allAttendance = await window.FirebaseService.getCollection('attendance');
    const attData = window.UIUtils.calculateMonthlyAttendance(allAttendance, student.id);
    const pDays = attData.presentDays;
    const totalWorking = attData.totalMonthWorkingDays;
    const attPct = attData.attPct;

    modal.innerHTML = `
      <div class="modal-dialog modal-xl">
        <div class="modal-header">
          <div class="modal-title-group">
            <div class="user-avatar" style="width: 38px; height: 38px;">${student.fullName.charAt(0)}</div>
            <div>
              <h3 class="modal-title">${student.fullName} (Roll #${student.rollNumber})</h3>
              <p style="font-size: 0.75rem; color: var(--slate-500);">Class ${student.class} • ${student.group} • Ideal Coaching Center</p>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="btn-close-profile-modal">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.5rem;">
          <div class="profile-info-grid" style="margin-bottom: 1.5rem;">
            <div class="profile-info-item">
              <span class="profile-info-label">Father's Name</span>
              <span class="profile-info-val">${student.fatherName}</span>
            </div>
            <div class="profile-info-item">
              <span class="profile-info-label">Portal Login Email</span>
              <span class="profile-info-val">${student.email || ('student' + student.rollNumber + '@ideal.edu')}</span>
            </div>
            <div class="profile-info-item">
              <span class="profile-info-label">Emergency Contact</span>
              <span class="profile-info-val">${student.contactNumber}</span>
            </div>
            <div class="profile-info-item">
              <span class="profile-info-label">Account Status</span>
              <span class="badge ${student.status === 'Active' ? 'badge-active' : 'badge-inactive'}" style="width: fit-content;">${student.status}</span>
            </div>
            <div class="profile-info-item">
              <span class="profile-info-label">Attendance Percentage (${attData.monthName})</span>
              <span class="profile-info-val" style="color: var(--success-600);">${attPct}% (${pDays} of ${totalWorking} Month Days)</span>
            </div>
          </div>

          <!-- Section: 12-Month Fees & Receipts -->
          <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.75rem;">12-Month Fee Schedule & Receipts</h4>
          <div class="table-responsive" style="margin-bottom: 1.5rem;">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Expected</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Payment Date</th>
                  <th>Receipt Number</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${studentFees.map(f => `
                  <tr>
                    <td><strong>${f.month}</strong></td>
                    <td>${window.UIUtils.formatCurrency(f.expectedAmount)}</td>
                    <td style="color: ${f.status === 'Paid' ? 'var(--success-600)' : 'var(--slate-800)'}; font-weight: 700;">
                      ${window.UIUtils.formatCurrency(f.paidAmount)}
                    </td>
                    <td><span class="badge ${f.status === 'Paid' ? 'badge-paid' : 'badge-pending'}">${f.status}</span></td>
                    <td>${window.UIUtils.formatDate(f.paymentDate)}</td>
                    <td style="font-family: var(--font-mono);">${f.receiptNumber ? `#${f.receiptNumber}` : '-'}</td>
                    <td>
                      ${f.status === 'Paid' ? `
                        <button type="button" class="btn btn-secondary btn-sm btn-profile-view-rcpt" data-rcpt="${f.receiptNumber}">
                          View Receipt
                        </button>
                      ` : `
                        <span style="font-size: 0.75rem; color: var(--warning-600);">Pending Payment</span>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-close-profile-bottom">Close Profile</button>
        </div>
      </div>
    `;

    window.UIUtils.openModal('student-profile-modal');

    modal.querySelector('#btn-close-profile-modal').onclick = () => window.UIUtils.closeModal('student-profile-modal');
    modal.querySelector('#btn-close-profile-bottom').onclick = () => window.UIUtils.closeModal('student-profile-modal');

    modal.querySelectorAll('.btn-profile-view-rcpt').forEach(btn => {
      btn.onclick = () => {
        const rcpt = btn.getAttribute('data-rcpt');
        window.FeesView.openReceiptModal(rcpt);
      };
    });
  }
};

window.AdminView = AdminView;
