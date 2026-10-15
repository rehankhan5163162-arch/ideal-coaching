/**
 * Ideal Coaching Center - Teacher Management & Class Assignments Module
 * Complete teacher directory, Add/Edit teacher profiles, account enable/disable,
 * subject & class assignments, qualifications, and detailed profiles.
 */

const TeacherManagementView = {
  currentFilter: 'All',

  async render(container) {
    const teachers = await window.FirebaseService.getCollection('teachers');
    const assignments = await window.FirebaseService.getCollection('teacher_assignments');

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 0.25rem;">
            <span>Staff Administration</span> <span style="margin: 0 0.4rem;">/</span> <span style="color: var(--primary-600); font-weight: 600;">Teacher Management</span>
          </div>
          <h1 style="font-size: 1.6rem; color: var(--slate-900); font-weight: 800; margin: 0;">Faculty & Teacher Management</h1>
          <p style="color: var(--slate-500); font-size: 0.85rem; margin-top: 0.25rem;">
            Manage teaching faculty, credentials, subject assignments, timetables, and teacher compensation profiles.
          </p>
        </div>
        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="btn-view-assignments">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            Class & Subject Assignments
          </button>
          <button type="button" class="btn btn-primary" id="btn-add-teacher">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add New Teacher
          </button>
        </div>
      </div>

      <!-- Quick Summary Stats -->
      <div class="stats-grid" style="margin-bottom: 1.75rem;">
        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Faculty</span>
            <span class="stat-value">${teachers.length}</span>
            <span class="stat-subtext">${teachers.filter(t => t.accountStatus === 'Active').length} Active Accounts</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Subject Allocations</span>
            <span class="stat-value">${assignments.length}</span>
            <span class="stat-subtext">Active Class Schedules</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Permanent Staff</span>
            <span class="stat-value">${teachers.filter(t => t.employmentStatus === 'Permanent').length}</span>
            <span class="stat-subtext">Full-time Faculty</span>
          </div>
        </div>
      </div>

      <!-- Teacher Directory Table Card -->
      <div class="data-card">
        <div class="data-card-header" style="flex-wrap: wrap; gap: 1rem;">
          <div class="data-card-title-group">
            <h3 class="data-card-title">Teacher Directory</h3>
            <span class="data-card-subtitle">Verified Teaching Staff • Ideal Coaching Center</span>
          </div>
          <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
            <input type="text" id="teacher-search-input" class="form-control" placeholder="Search Teacher ID, Name, Subject..." style="width: 250px;" />
            <select id="teacher-status-filter" class="form-control" style="width: auto;">
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Teacher ID</th>
                <th>Full Name</th>
                <th>Contact & Email</th>
                <th>Subjects</th>
                <th>Assigned Classes</th>
                <th>Salary Type</th>
                <th>Account Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody id="teachers-table-body">
              ${this.buildTeacherRows(teachers)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.attachEvents(container, teachers, assignments);
  },

  buildTeacherRows(teachers) {
    if (teachers.length === 0) {
      return `<tr><td colspan="8" style="text-align: center; color: var(--slate-500); padding: 2.5rem;">No teacher profiles found in system records.</td></tr>`;
    }

    return teachers.map(t => {
      const statusBadge = t.accountStatus === 'Active' ? 'badge-paid' : (t.accountStatus === 'Disabled' ? 'badge-warning' : 'badge-cancelled');
      const subjectsList = Array.isArray(t.subjects) ? t.subjects.join(', ') : (t.subjects || 'None');
      const classesList = Array.isArray(t.assignedClasses) ? t.assignedClasses.join(', ') : (t.assignedClasses || 'None');

      return `
        <tr>
          <td><strong style="color: #0369a1; font-family: monospace; font-size: 0.85rem;">${t.teacherId}</strong></td>
          <td>
            <strong style="color: #0f172a; font-size: 0.95rem;">${t.fullName}</strong><br />
            <span style="font-size: 0.75rem; color: #334155; font-weight: 600;">${t.qualifications || 'Faculty Member'}</span>
          </td>
          <td>
            <span style="font-size: 0.85rem; color: #0f172a; font-weight: 600;">${t.contactNumber || 'N/A'}</span><br />
            <span style="font-size: 0.75rem; color: #334155; font-weight: 500;">${t.email}</span>
          </td>
          <td><span style="font-size: 0.85rem; font-weight: 700; color: #0f172a;">${subjectsList}</span></td>
          <td><span class="badge badge-studying" style="font-size: 0.75rem; font-weight: 700;">${classesList}</span></td>
          <td>
            <span style="font-size: 0.85rem; text-transform: capitalize; color: #0f172a; font-weight: 700;">
              ${t.salaryType === 'per_period' ? 'Per Period (Rs. ' + (t.salaryAmount || 1200) + ')' : 'Fixed (Rs. ' + Number(t.salaryAmount || 50000).toLocaleString() + ')'}
            </span>
          </td>
          <td><span class="badge ${statusBadge}">${t.accountStatus}</span></td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 0.35rem; align-items: center; justify-content: flex-end;">
              <button type="button" class="btn btn-sm btn-success btn-pay-salary" data-id="${t.id}" title="Disburse Salary & Issue Official Receipt" style="background: #059669; color: #ffffff; font-weight: 700; border: none; padding: 0.35rem 0.65rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                Pay Salary
              </button>
              <button type="button" class="btn btn-sm btn-secondary btn-tch-qr-card" data-id="${t.id}" title="View & Print Official Attendance QR Card">
                QR Card
              </button>
              <button type="button" class="btn btn-sm btn-secondary btn-view-profile" data-id="${t.id}" title="View Complete Profile & Disbursed Receipts">
                Profile
              </button>
              <button type="button" class="btn btn-sm btn-secondary btn-edit-teacher" data-id="${t.id}" title="Edit Teacher">
                Edit
              </button>
              <button type="button" class="btn btn-sm ${t.accountStatus === 'Active' ? 'btn-danger-outline' : 'btn-primary'}" data-id="${t.id}" id="btn-toggle-status-${t.id}">
                ${t.accountStatus === 'Active' ? 'Disable' : 'Enable'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  attachEvents(container, teachers, assignments) {
    // Search & Status filters
    const searchInput = container.querySelector('#teacher-search-input');
    const statusFilter = container.querySelector('#teacher-status-filter');
    const tbody = container.querySelector('#teachers-table-body');

    const runFilter = () => {
      const q = searchInput.value.trim().toLowerCase();
      const st = statusFilter.value;
      const filtered = teachers.filter(t => {
        const matchesQ = !q ||
          (t.fullName && t.fullName.toLowerCase().includes(q)) ||
          (t.teacherId && t.teacherId.toLowerCase().includes(q)) ||
          (Array.isArray(t.subjects) && t.subjects.some(s => s.toLowerCase().includes(q))) ||
          (t.email && t.email.toLowerCase().includes(q));
        const matchesSt = st === 'All' || t.accountStatus === st;
        return matchesQ && matchesSt;
      });
      tbody.innerHTML = this.buildTeacherRows(filtered);
      this.attachRowEvents(container, filtered);
    };

    if (searchInput) searchInput.oninput = runFilter;
    if (statusFilter) statusFilter.onchange = runFilter;

    this.attachRowEvents(container, teachers);

    // Add Teacher button
    const btnAdd = container.querySelector('#btn-add-teacher');
    if (btnAdd) {
      btnAdd.onclick = () => this.openAddTeacherModal(container);
    }

    // View Class & Subject Assignments button
    const btnAsgn = container.querySelector('#btn-view-assignments');
    if (btnAsgn) {
      btnAsgn.onclick = () => this.openAssignmentsModal(container);
    }
  },

  attachRowEvents(container, teachers) {
    // Pay Salary
    container.querySelectorAll('.btn-pay-salary').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const teacher = teachers.find(t => t.id === id);
        if (teacher) this.openPaySalaryModal(container, teacher);
      };
    });

    // QR Attendance Card
    container.querySelectorAll('.btn-tch-qr-card').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const teacher = teachers.find(t => t.id === id);
        if (teacher) this.openQRCardModal(container, teacher);
      };
    });

    // View Profile
    container.querySelectorAll('.btn-view-profile').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const teacher = teachers.find(t => t.id === id);
        if (teacher) this.openProfileModal(container, teacher);
      };
    });

    // Edit Teacher
    container.querySelectorAll('.btn-edit-teacher').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const teacher = teachers.find(t => t.id === id);
        if (teacher) this.openEditTeacherModal(container, teacher);
      };
    });

    // Toggle Active / Disabled
    teachers.forEach(t => {
      const toggleBtn = container.querySelector(`#btn-toggle-status-${t.id}`);
      if (toggleBtn) {
        toggleBtn.onclick = async () => {
          const newStatus = t.accountStatus === 'Active' ? 'Disabled' : 'Active';
          if (!confirm(`Are you sure you want to change account status for ${t.fullName} to '${newStatus}'?`)) return;

          await window.GlobalLoader.wrap(async () => {
            await window.FirebaseService.updateDocument('teachers', t.id, { accountStatus: newStatus });
            await window.AuditService.log({
              action: `Teacher Account ${newStatus}`,
              category: 'Security',
              targetType: 'Teacher',
              targetId: t.id,
              details: `Set status to ${newStatus} for teacher ${t.fullName} (${t.teacherId})`
            });
          }, `Updating teacher account status to ${newStatus}...`, 'Ideal Coaching Center');

          window.UIUtils.showToast('success', 'Status Updated', `${t.fullName} is now ${newStatus}.`);
          this.render(container);
        };
      }
    });
  },

  /**
   * Modal: Add New Teacher
   */
  openAddTeacherModal(container) {
    const content = `
      <form id="add-teacher-form" class="form-grid" style="padding: 0.5rem 0;">
        <div class="form-group">
          <label class="form-label">Full Name <span class="req-star">*</span></label>
          <input type="text" id="tch-name-input" class="form-control" placeholder="e.g. Prof. Dr. Tariq Mahmood" required />
        </div>

        <div class="form-group">
          <label class="form-label">Teacher ID <span class="req-star">*</span></label>
          <input type="text" id="tch-id-input" class="form-control" placeholder="e.g. TCH-104" required />
          <span class="form-help">Unique institutional identifier.</span>
        </div>

        <div class="form-group">
          <label class="form-label">Email Address <span class="req-star">*</span></label>
          <input type="email" id="tch-email-input" class="form-control" placeholder="e.g. tariq@ideal.edu" required />
        </div>

        <div class="form-group">
          <label class="form-label">Temporary Password <span class="req-star">*</span></label>
          <input type="text" id="tch-pwd-input" class="form-control" value="Teacher@123" required />
        </div>

        <div class="form-group">
          <label class="form-label">Contact Number <span class="req-star">*</span></label>
          <input type="text" id="tch-phone-input" class="form-control" placeholder="e.g. 0300-1234567" required />
        </div>

        <div class="form-group">
          <label class="form-label">Academic Qualifications</label>
          <input type="text" id="tch-qual-input" class="form-control" placeholder="e.g. M.Phil in Mathematics (GCU)" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label">Residential Address</label>
          <input type="text" id="tch-addr-input" class="form-control" placeholder="Residential street & town..." />
        </div>

        <div class="form-group">
          <label class="form-label">Teaching Subjects (Comma Separated) <span class="req-star">*</span></label>
          <input type="text" id="tch-subjects-input" class="form-control" placeholder="Biology, Chemistry" required />
        </div>

        <div class="form-group">
          <label class="form-label">Assigned Classes (Comma Separated)</label>
          <input type="text" id="tch-classes-input" class="form-control" placeholder="12th, 11th" value="12th" />
        </div>

        <div class="form-group">
          <label class="form-label">Salary Arrangement</label>
          <select id="tch-saltype-input" class="form-control">
            <option value="fixed">Fixed Monthly Salary</option>
            <option value="per_period">Per-Period Compensation</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Base Salary or Rate (PKR) <span class="req-star">*</span></label>
          <input type="number" id="tch-salamt-input" class="form-control" value="60000" min="0" step="500" required />
        </div>

        <div class="form-group">
          <label class="form-label">Employment Status</label>
          <select id="tch-emp-status" class="form-control">
            <option value="Permanent">Permanent</option>
            <option value="Visiting">Visiting / Contract</option>
            <option value="Probationary">Probationary</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Joining Date</label>
          <input type="date" id="tch-joining-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" />
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('add-teacher-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-new-teacher">Create Teacher Account</button>
    `;

    window.UIUtils.showModal('Add New Teacher Account', content, actions, 'modal-md', 'add-teacher-modal');

    const modalEl = document.querySelector('#add-teacher-modal');
    if (!modalEl) return;

    modalEl.querySelector('#btn-save-new-teacher').onclick = async () => {
      const name = modalEl.querySelector('#tch-name-input').value.trim();
      const teacherId = modalEl.querySelector('#tch-id-input').value.trim();
      const email = modalEl.querySelector('#tch-email-input').value.trim();
      const password = modalEl.querySelector('#tch-pwd-input').value.trim();
      const phone = modalEl.querySelector('#tch-phone-input').value.trim();
      const qual = modalEl.querySelector('#tch-qual-input').value.trim();
      const address = modalEl.querySelector('#tch-addr-input').value.trim();
      const subjectsStr = modalEl.querySelector('#tch-subjects-input').value.trim();
      const classesStr = modalEl.querySelector('#tch-classes-input').value.trim();
      const salaryType = modalEl.querySelector('#tch-saltype-input').value;
      const salaryAmount = Number(modalEl.querySelector('#tch-salamt-input').value);
      const empStatus = modalEl.querySelector('#tch-emp-status').value;
      const joiningDate = modalEl.querySelector('#tch-joining-date').value;

      if (!name || !teacherId || !email || !password || !phone || !subjectsStr) {
        window.UIUtils.showToast('error', 'Missing Information', 'Please complete all required fields.');
        return;
      }

      // Check unique Teacher ID
      const existing = await window.FirebaseService.getCollection('teachers');
      if (existing.some(t => t.teacherId.toLowerCase() === teacherId.toLowerCase())) {
        window.UIUtils.showToast('error', 'Duplicate ID', `Teacher ID ${teacherId} is already in use.`);
        return;
      }

      window.UIUtils.closeModal('add-teacher-modal');

      const newId = `tch_${Date.now()}`;
      const subjectsArr = subjectsStr.split(',').map(s => s.trim()).filter(Boolean);
      const classesArr = classesStr.split(',').map(c => c.trim()).filter(Boolean);

      await window.GlobalLoader.wrap(async () => {
        // Create teacher profile
        await window.FirebaseService.addDocument('teachers', {
          id: newId,
          teacherId,
          fullName: name,
          email,
          password,
          contactNumber: phone,
          qualifications: qual,
          address,
          subjects: subjectsArr,
          assignedClasses: classesArr,
          salaryType,
          salaryAmount,
          employmentStatus: empStatus,
          joiningDate,
          accountStatus: 'Active',
          role: 'teacher',
          createdAt: new Date().toISOString()
        });

        // Initialize default salary config
        await window.FirebaseService.addDocument('salary_configs', {
          id: `salcfg_${newId}`,
          teacherId: newId,
          teacherName: name,
          salaryType,
          baseAmount: salaryAmount,
          paymentCycle: 'Monthly',
          allowances: 0,
          deductions: 0,
          effectiveDate: joiningDate,
          status: 'Active',
          updatedAt: new Date().toISOString()
        });

        // Generate Attendance Card token
        await window.FirebaseService.generateOrRegenerateAttendanceCard(newId, 'teacher');

        await window.AuditService.log({
          action: 'Teacher Account Created',
          category: 'Security',
          targetType: 'Teacher',
          targetId: newId,
          details: `Created account for ${name} (${teacherId}) with salary Rs. ${salaryAmount}`
        });
      }, `Creating Teacher profile & authentication credentials in Cloud Firestore...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Teacher Created', `Teacher ${name} registered successfully.`);
      this.render(container);
    };
  },

  /**
   * Modal: Edit Teacher Profile
   */
  openEditTeacherModal(container, teacher) {
    const subjectsStr = Array.isArray(teacher.subjects) ? teacher.subjects.join(', ') : (teacher.subjects || '');
    const classesStr = Array.isArray(teacher.assignedClasses) ? teacher.assignedClasses.join(', ') : (teacher.assignedClasses || '');

    const content = `
      <form id="edit-teacher-form" class="form-grid" style="padding: 0.5rem 0;">
        <div class="form-group">
          <label class="form-label">Full Name <span class="req-star">*</span></label>
          <input type="text" id="edit-tch-name" class="form-control" value="${teacher.fullName}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Teacher ID (Locked)</label>
          <input type="text" class="form-control" value="${teacher.teacherId}" disabled style="background: var(--slate-100);" />
        </div>

        <div class="form-group">
          <label class="form-label">Email Address <span class="req-star">*</span></label>
          <input type="email" id="edit-tch-email" class="form-control" value="${teacher.email}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Contact Number <span class="req-star">*</span></label>
          <input type="text" id="edit-tch-phone" class="form-control" value="${teacher.contactNumber}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Academic Qualifications</label>
          <input type="text" id="edit-tch-qual" class="form-control" value="${teacher.qualifications || ''}" />
        </div>

        <div class="form-group">
          <label class="form-label">Employment Status</label>
          <select id="edit-tch-empstatus" class="form-control">
            <option value="Permanent" ${teacher.employmentStatus === 'Permanent' ? 'selected' : ''}>Permanent</option>
            <option value="Visiting" ${teacher.employmentStatus === 'Visiting' ? 'selected' : ''}>Visiting</option>
            <option value="Probationary" ${teacher.employmentStatus === 'Probationary' ? 'selected' : ''}>Probationary</option>
          </select>
        </div>

        <div class="form-group form-col-full">
          <label class="form-label">Residential Address</label>
          <input type="text" id="edit-tch-addr" class="form-control" value="${teacher.address || ''}" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label">Teaching Subjects (Comma Separated)</label>
          <input type="text" id="edit-tch-subjects" class="form-control" value="${subjectsStr}" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label">Assigned Classes (Comma Separated)</label>
          <input type="text" id="edit-tch-classes" class="form-control" value="${classesStr}" />
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('edit-teacher-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-edit-teacher">Save Changes</button>
    `;

    window.UIUtils.showModal(`Edit Teacher: ${teacher.fullName}`, content, actions, 'modal-md', 'edit-teacher-modal');

    const modalEl = document.querySelector('#edit-teacher-modal');
    if (!modalEl) return;

    modalEl.querySelector('#btn-save-edit-teacher').onclick = async () => {
      const name = modalEl.querySelector('#edit-tch-name').value.trim();
      const email = modalEl.querySelector('#edit-tch-email').value.trim();
      const phone = modalEl.querySelector('#edit-tch-phone').value.trim();
      const qual = modalEl.querySelector('#edit-tch-qual').value.trim();
      const empStatus = modalEl.querySelector('#edit-tch-empstatus').value;
      const addr = modalEl.querySelector('#edit-tch-addr').value.trim();
      const subStr = modalEl.querySelector('#edit-tch-subjects').value.trim();
      const clsStr = modalEl.querySelector('#edit-tch-classes').value.trim();

      if (!name || !email || !phone) {
        window.UIUtils.showToast('error', 'Missing Information', 'Please fill in required fields.');
        return;
      }

      window.UIUtils.closeModal('edit-teacher-modal');

      const subjectsArr = subStr.split(',').map(s => s.trim()).filter(Boolean);
      const classesArr = clsStr.split(',').map(c => c.trim()).filter(Boolean);

      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.updateDocument('teachers', teacher.id, {
          fullName: name,
          email,
          contactNumber: phone,
          qualifications: qual,
          employmentStatus: empStatus,
          address: addr,
          subjects: subjectsArr,
          assignedClasses: classesArr
        });

        await window.AuditService.log({
          action: 'Teacher Profile Updated',
          category: 'Staff',
          targetType: 'Teacher',
          targetId: teacher.id,
          details: `Updated details for teacher ${name} (${teacher.teacherId})`
        });
      }, `Updating teacher records in Cloud Firestore...`, 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Profile Saved', `Updated ${name}'s profile.`);
      this.render(container);
    };
  },

  /**
   * Modal: Full Detailed Teacher Profile with QR Gate Pass and Salary Receipts
   */
  async openProfileModal(container, teacher) {
    const allAssignments = await window.FirebaseService.getCollection('teacher_assignments');
    const myAssignments = allAssignments.filter(a => a.teacherId === teacher.id);
    const allTAtt = await window.FirebaseService.getCollection('teacher_attendance');
    const myAtt = allTAtt.filter(a => a.teacherId === teacher.id);
    const allPayroll = await window.FirebaseService.getCollection('payroll');
    const myPayroll = allPayroll.filter(p => p.teacherId === teacher.id);
    const receipts = await window.FirebaseService.getTeacherSalaryReceipts(teacher.id);
    const cards = await window.FirebaseService.getCollection('attendance_cards');
    const myCard = cards.find(c => c.personId === teacher.id && c.personType === 'teacher') || {
      token: `ICC-TCH-${teacher.teacherId || teacher.id}`,
      status: 'Active'
    };
    const qrSvg = window.QRCodeGenerator ? window.QRCodeGenerator.generateSVG(myCard.token, 130) : '';

    const content = `
      <div style="padding: 0.5rem 0;">
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: var(--radius-md); padding: 1.5rem; color: #fff; margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="font-size: 0.75rem; color: #38bdf8; font-weight: 700; text-transform: uppercase;">
                ${teacher.teacherId} • ${teacher.employmentStatus} Faculty
              </div>
              <h2 style="font-size: 1.5rem; margin: 0.25rem 0 0 0; color: #fff;">${teacher.fullName}</h2>
              <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">
                ${teacher.qualifications || 'Teaching Faculty'} • Joined ${teacher.joiningDate || '2025'}
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <span class="badge ${teacher.accountStatus === 'Active' ? 'badge-paid' : 'badge-warning'}" style="font-size: 0.85rem; padding: 0.4rem 0.85rem;">
                Account: ${teacher.accountStatus}
              </span>
              <button type="button" class="btn btn-sm btn-success" id="btn-prof-direct-pay-salary" style="background: #059669; color: #fff; font-weight: 700;">
                Pay Salary
              </button>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 1.5rem;">
          <!-- Personal & Contact Info -->
          <div style="background: var(--slate-50); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.75rem;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin: 0 0 0.5rem 0;">Employment Details</h4>
            <div>
              <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Official Email</span>
              <strong style="font-size: 0.85rem; color: #0f172a;">${teacher.email}</strong>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Contact Helpline</span>
              <strong style="font-size: 0.85rem; color: #0f172a;">${teacher.contactNumber}</strong>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: var(--slate-500); display: block;">Designated Salary Structure</span>
              <strong style="font-size: 0.95rem; color: #047857; text-transform: capitalize;">
                ${teacher.salaryType === 'per_period' ? `Per Period (Rs. ${(teacher.salaryAmount || 1200).toLocaleString()})` : `Monthly Fixed (Rs. ${Number(teacher.salaryAmount || 50000).toLocaleString()})`}
              </strong>
            </div>
          </div>

          <!-- Official QR Gate Pass Mini-Card -->
          <div style="background: #ffffff; border: 2px solid #0f172a; border-radius: var(--radius-md); padding: 1.25rem; text-align: center; box-shadow: var(--shadow-sm);">
            <div style="font-size: 0.75rem; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 0.5rem;">
              Official Attendance Gate Pass
            </div>
            <div style="display: inline-block; background: #fff; padding: 0.5rem; border: 1px dashed #cbd5e1; border-radius: 8px; margin-bottom: 0.5rem;">
              ${qrSvg}
            </div>
            <div style="font-size: 0.75rem; font-family: monospace; font-weight: 700; color: #0f172a; margin-bottom: 0.75rem;">
              Token: ${myCard.token}
            </div>
            <button type="button" class="btn btn-sm btn-primary" id="btn-prof-print-qr-card">
              Print Official QR Card
            </button>
          </div>
        </div>

        <!-- Official Disbursed Salary Receipts History -->
        <div style="margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--slate-800); margin: 0;">
              Disbursed Salary Receipts & Vouchers (${receipts.length})
            </h4>
            <span style="font-size: 0.75rem; color: #059669; font-weight: 700;">Official Institute Records</span>
          </div>
          <div class="table-responsive">
            <table class="data-table" style="font-size: 0.8rem;">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Salary Month</th>
                  <th>Disbursed Amount</th>
                  <th>Payment Channel</th>
                  <th>Date Paid</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${receipts.length === 0 ? `
                  <tr><td colspan="6" style="text-align: center; color: var(--slate-500); padding: 1.25rem;">No disbursed salary receipts generated yet for this teacher.</td></tr>
                ` : receipts.map(r => `
                  <tr>
                    <td><strong style="color: #0369a1; font-family: monospace;">#${r.receiptNumber}</strong></td>
                    <td><strong style="color: #0f172a;">${r.salaryMonth}</strong></td>
                    <td><strong style="color: #047857; font-size: 0.9rem;">Rs. ${Number(r.amountPaid || r.actualPaid || r.netPayable || 0).toLocaleString()}</strong></td>
                    <td>${r.paymentMethod || 'Bank Transfer'}</td>
                    <td>${r.paymentDate || 'N/A'}</td>
                    <td style="text-align: right;">
                      <button type="button" class="btn btn-sm btn-secondary btn-prof-print-sal-rcpt" data-rcpt="${r.receiptNumber}">
                        Print Voucher
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Assigned Classes & Subjects -->
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.5rem;">
            Current Class & Subject Allocations
          </h4>
          <table class="data-table" style="font-size: 0.8rem;">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Class</th>
                <th>Group</th>
                <th>Academic Year</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${myAssignments.length === 0 ? `
                <tr><td colspan="5" style="text-align: center; color: var(--slate-500); padding: 1rem;">No specific class assignments recorded.</td></tr>
              ` : myAssignments.map(a => `
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

        <!-- Recent Attendance Log -->
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.5rem;">
            Recent Attendance Log
          </h4>
          <table class="data-table" style="font-size: 0.8rem;">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Arrival Time</th>
                <th>Recording Method</th>
              </tr>
            </thead>
            <tbody>
              ${myAtt.length === 0 ? `
                <tr><td colspan="4" style="text-align: center; color: var(--slate-500); padding: 1rem;">No attendance scans recorded for this teacher.</td></tr>
              ` : myAtt.slice(-5).reverse().map(at => `
                <tr>
                  <td>${at.date}</td>
                  <td><span class="badge badge-paid">${at.status}</span></td>
                  <td>${at.arrivalTime || 'On Time'}</td>
                  <td>${at.method || 'QR Scan'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const modalActions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('teacher-profile-modal')">Close</button>
      <button type="button" class="btn btn-primary" id="btn-modal-edit-prof">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Edit Profile Details
      </button>
    `;

    window.UIUtils.showModal(`Teacher Profile: ${teacher.fullName}`, content, modalActions, 'modal-lg', 'teacher-profile-modal');

    const modalEl = document.querySelector('#teacher-profile-modal');
    if (modalEl) {
      const editBtn = modalEl.querySelector('#btn-modal-edit-prof');
      if (editBtn) {
        editBtn.onclick = () => {
          window.UIUtils.closeModal('teacher-profile-modal');
          this.openEditTeacherModal(container, teacher);
        };
      }

      const payBtn = modalEl.querySelector('#btn-prof-direct-pay-salary');
      if (payBtn) {
        payBtn.onclick = () => {
          window.UIUtils.closeModal('teacher-profile-modal');
          this.openPaySalaryModal(container, teacher);
        };
      }

      const printCardBtn = modalEl.querySelector('#btn-prof-print-qr-card');
      if (printCardBtn) {
        printCardBtn.onclick = () => {
          if (window.AttendanceCardsView) {
            window.AttendanceCardsView.printSingleCard(teacher, myCard, 'teacher');
          } else {
            window.print();
          }
        };
      }

      modalEl.querySelectorAll('.btn-prof-print-sal-rcpt').forEach(btn => {
        btn.onclick = () => {
          const rcptNum = btn.getAttribute('data-rcpt');
          const r = receipts.find(item => item.receiptNumber === rcptNum);
          if (r && window.PayrollView) {
            window.PayrollView.printSalarySlip(r);
          }
        };
      });
    }
  },

  /**
   * Modal: Pay Teacher Salary & Issue Official Receipt (Direct Disbursal like Student Fees)
   */
  async openPaySalaryModal(container, teacher) {
    const months = window.UIUtils.getMonthsList();
    const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const configs = await window.FirebaseService.getCollection('salary_configs');
    const cfg = configs.find(c => c.teacherId === teacher.id) || {
      salaryType: teacher.salaryType || 'fixed',
      baseAmount: teacher.salaryAmount || 50000,
      allowances: 0,
      deductions: 0
    };

    const baseSalary = Number(cfg.baseAmount) || Number(teacher.salaryAmount) || 50000;
    const initialAllowances = Number(cfg.allowances) || 0;
    const initialDeductions = Number(cfg.deductions) || 0;
    const initialNet = baseSalary + initialAllowances - initialDeductions;

    const content = `
      <form id="pay-teacher-salary-form" class="form-grid" style="padding: 0.5rem 0;">
        <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; grid-column: 1/-1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="user-avatar" style="width: 48px; height: 48px; font-size: 1.25rem; background: var(--primary-700); color: #fff;">
              ${(teacher.fullName || 'T').charAt(0)}
            </div>
            <div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">${teacher.fullName}</div>
              <div style="font-size: 0.8rem; color: #334155; font-weight: 600; margin-top: 0.2rem;">
                Faculty ID: <strong style="color: #0369a1; font-family: monospace;">#${teacher.teacherId}</strong> • Subjects: <strong>${(teacher.subjects || []).join(', ') || 'General'}</strong>
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.725rem; font-weight: 700; color: #475569; text-transform: uppercase;">Standard Base</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">
              ${teacher.salaryType === 'per_period' ? `Rs. ${baseSalary.toLocaleString()} / Period` : `Rs. ${baseSalary.toLocaleString()} / Month`}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Salary Month <span class="req-star">*</span></label>
          <select id="pay-sal-month" class="form-control" required>
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
          <label class="form-label">Disbursement Date <span class="req-star">*</span></label>
          <input type="date" id="pay-sal-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Base Salary (PKR) <span class="req-star">*</span></label>
          <input type="number" id="pay-sal-base" class="form-control" value="${baseSalary}" required />
        </div>

        <div class="form-group">
          <label class="form-label">Allowances / Bonus (PKR)</label>
          <input type="number" id="pay-sal-allowances" class="form-control" value="${initialAllowances}" />
        </div>

        <div class="form-group">
          <label class="form-label">Deductions / Advances (PKR)</label>
          <input type="number" id="pay-sal-deductions" class="form-control" value="${initialDeductions}" />
        </div>

        <div class="form-group">
          <label class="form-label">Net Payable Amount (PKR)</label>
          <div style="padding: 0.65rem 0.85rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); font-weight: 800; font-size: 1.15rem; color: #15803d;" id="pay-sal-net-display">
            Rs. ${initialNet.toLocaleString()}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Payment Channel <span class="req-star">*</span></label>
          <select id="pay-sal-method" class="form-control" required>
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
          <input type="text" id="pay-sal-ref" class="form-control" placeholder="e.g. HBL-FT-991204 / CHQ-48210" />
        </div>

        <div class="form-group form-col-full">
          <label class="form-label">Accounting Notes & Remarks</label>
          <input type="text" id="pay-sal-notes" class="form-control" placeholder="Monthly salary disbursed with official receipt voucher." />
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('pay-teacher-modal')">Cancel</button>
      <button type="button" class="btn btn-success" id="btn-confirm-pay-salary" style="background: #059669; color: #fff; font-weight: 700;">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Disburse Salary & Issue Official Receipt
      </button>
    `;

    window.UIUtils.showModal(`Disburse Salary: ${teacher.fullName}`, content, actions, 'modal-lg', 'pay-teacher-modal');

    const modalEl = document.querySelector('#pay-teacher-modal');
    if (!modalEl) return;

    const baseInput = modalEl.querySelector('#pay-sal-base');
    const allowInput = modalEl.querySelector('#pay-sal-allowances');
    const dedInput = modalEl.querySelector('#pay-sal-deductions');
    const netDisplay = modalEl.querySelector('#pay-sal-net-display');

    const recalculate = () => {
      const b = Number(baseInput.value) || 0;
      const a = Number(allowInput.value) || 0;
      const d = Number(dedInput.value) || 0;
      const net = Math.max(0, b + a - d);
      netDisplay.textContent = `Rs. ${net.toLocaleString()}`;
      return net;
    };

    baseInput.oninput = recalculate;
    allowInput.oninput = recalculate;
    dedInput.oninput = recalculate;

    modalEl.querySelector('#btn-confirm-pay-salary').onclick = async () => {
      const salaryMonth = modalEl.querySelector('#pay-sal-month').value;
      const paymentDate = modalEl.querySelector('#pay-sal-date').value;
      const b = Number(baseInput.value) || 0;
      const a = Number(allowInput.value) || 0;
      const d = Number(dedInput.value) || 0;
      const net = recalculate();
      const paymentMethod = modalEl.querySelector('#pay-sal-method').value;
      const transactionRef = modalEl.querySelector('#pay-sal-ref').value.trim();
      const notes = modalEl.querySelector('#pay-sal-notes').value.trim();

      if (b <= 0) {
        window.UIUtils.showToast('error', 'Salary Required', 'Please provide a valid base salary amount.');
        return;
      }

      window.UIUtils.closeModal('pay-teacher-modal');

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

      window.UIUtils.showToast('success', 'Salary Disbursed', `Paid Rs. ${net.toLocaleString()} for ${salaryMonth}. Receipt #${payResult.receipt.receiptNumber}`);
      this.render(container);

      if (payResult && payResult.receipt && window.PayrollView) {
        window.PayrollView.openSalaryReceiptModal(payResult.receipt);
      }
    };
  },

  /**
   * Modal: Official Teacher QR Attendance Card & Gate Pass
   */
  async openQRCardModal(container, teacher) {
    const cards = await window.FirebaseService.getCollection('attendance_cards');
    const card = cards.find(c => c.personId === teacher.id && c.personType === 'teacher') || {
      token: `ICC-TCH-${teacher.teacherId || teacher.id}`,
      status: 'Active',
      issuedAt: new Date().toISOString()
    };

    const qrSvg = window.QRCodeGenerator ? window.QRCodeGenerator.generateSVG(card.token, 150) : '<p>Generating QR...</p>';

    const content = `
      <div style="padding: 1rem 0; text-align: center;">
        <div style="max-width: 380px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-md); background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 1.25rem 1rem;">
            <div style="font-size: 0.95rem; font-weight: 800; letter-spacing: 0.5px;">IDEAL COACHING CENTER</div>
            <div style="font-size: 0.75rem; color: #38bdf8; font-weight: 700; text-transform: uppercase; margin-top: 2px;">Faculty Attendance Gate Pass</div>
          </div>

          <div style="padding: 1.5rem; background: #ffffff;">
            <div style="display: inline-block; background: #ffffff; padding: 0.75rem; border: 2px dashed #cbd5e1; border-radius: 8px; margin-bottom: 1rem;">
              ${qrSvg}
            </div>

            <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 0.25rem 0;">${teacher.fullName}</h3>
            <div style="display: inline-block; background: #e0f2fe; color: #0369a1; font-weight: 800; font-family: monospace; font-size: 0.85rem; padding: 0.2rem 0.65rem; border-radius: 999px; margin-bottom: 1rem;">
              #${teacher.teacherId}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; text-align: left; background: #f8fafc; padding: 0.75rem; border-radius: 6px; font-size: 0.8rem; border: 1px solid #e2e8f0;">
              <div>
                <span style="color: #64748b; font-size: 0.7rem; display: block;">Designation</span>
                <strong style="color: #0f172a;">${teacher.employmentStatus || 'Senior Faculty'}</strong>
              </div>
              <div>
                <span style="color: #64748b; font-size: 0.7rem; display: block;">Department</span>
                <strong style="color: #0f172a;">${(teacher.subjects || [])[0] || 'Academics'}</strong>
              </div>
              <div>
                <span style="color: #64748b; font-size: 0.7rem; display: block;">Status</span>
                <strong style="color: #059669;">Active Gate Pass</strong>
              </div>
              <div>
                <span style="color: #64748b; font-size: 0.7rem; display: block;">Issued By</span>
                <strong style="color: #0f172a;">Ideal Admin</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('tch-qr-modal')">Close</button>
      <button type="button" class="btn btn-primary" id="btn-print-tch-qr-card">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Print Official Faculty Card
      </button>
    `;

    window.UIUtils.showModal(`Official QR Pass: ${teacher.fullName}`, content, actions, 'modal-md', 'tch-qr-modal');

    const modalEl = document.querySelector('#tch-qr-modal');
    if (modalEl) {
      modalEl.querySelector('#btn-print-tch-qr-card').onclick = () => {
        if (window.AttendanceCardsView) {
          window.AttendanceCardsView.printSingleCard(teacher, card, 'teacher');
        } else {
          window.print();
        }
      };
    }
  },

  /**
   * Modal: Class & Subject Assignments Management
   */
  async openAssignmentsModal(container) {
    const assignments = await window.FirebaseService.getCollection('teacher_assignments');
    const teachers = await window.FirebaseService.getCollection('teachers');

    const content = `
      <div style="padding: 0.5rem 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <p style="color: var(--slate-600); font-size: 0.85rem; margin: 0;">
            Active class and subject assignments across all faculty members.
          </p>
          <button type="button" class="btn btn-sm btn-primary" id="btn-create-assignment-item">
            + New Assignment
          </button>
        </div>

        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
          <table class="data-table" style="font-size: 0.8rem;">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Subject</th>
                <th>Class</th>
                <th>Group</th>
                <th>Academic Year</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="assignments-table-body">
              ${assignments.map(a => `
                <tr>
                  <td><strong>${a.teacherName}</strong></td>
                  <td>${a.subject}</td>
                  <td>${a.class}</td>
                  <td>${a.group}</td>
                  <td>${a.academicYear}</td>
                  <td style="text-align: right;">
                    <button type="button" class="btn btn-sm btn-danger-outline btn-del-asgn" data-id="${a.id}">
                      Remove
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    window.UIUtils.showModal('Class & Subject Assignments', content, `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('asgn-list-modal')">Close</button>
    `, 'modal-lg', 'asgn-list-modal');

    const modalEl = document.querySelector('#asgn-list-modal');
    if (!modalEl) return;

    // Remove assignment
    modalEl.querySelectorAll('.btn-del-asgn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Remove this class & subject assignment?')) return;

        await window.GlobalLoader.wrap(async () => {
          await window.FirebaseService.deleteDocument('teacher_assignments', id);
          await window.AuditService.log({
            action: 'Teacher Assignment Removed',
            category: 'Academic',
            targetType: 'Assignment',
            targetId: id,
            details: `Removed assignment record ${id}`
          });
        }, 'Removing assignment from Cloud Firestore...', 'Ideal Coaching Center');

        window.UIUtils.closeModal('asgn-list-modal');
        this.openAssignmentsModal(container);
      };
    });

    // Create assignment item
    modalEl.querySelector('#btn-create-assignment-item').onclick = () => {
      window.UIUtils.closeModal('asgn-list-modal');
      this.openCreateAssignmentModal(container, teachers);
    };
  },

  /**
   * Modal: Create Single Class Assignment
   */
  openCreateAssignmentModal(container, teachers) {
    const content = `
      <form id="create-asgn-form" class="form-grid" style="padding: 0.5rem 0;">
        <div class="form-group form-col-full">
          <label class="form-label">Select Teacher <span class="req-star">*</span></label>
          <select id="asgn-teacher-select" class="form-control" required>
            ${teachers.map(t => `<option value="${t.id}">${t.fullName} (${t.teacherId})</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Subject <span class="req-star">*</span></label>
          <input type="text" id="asgn-subject-input" class="form-control" placeholder="e.g. Biology, Physics..." required />
        </div>

        <div class="form-group">
          <label class="form-label">Class <span class="req-star">*</span></label>
          <select id="asgn-class-select" class="form-control" required>
            <option value="12th">Class 12th</option>
            <option value="11th">Class 11th</option>
            <option value="10th">Class 10th</option>
            <option value="9th">Class 9th</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Group / Stream <span class="req-star">*</span></label>
          <select id="asgn-group-select" class="form-control" required>
            <option value="Computer Science">Computer Science</option>
            <option value="Pre-Medical">Pre-Medical</option>
            <option value="Pre-Engineering">Pre-Engineering</option>
            <option value="Science">Science</option>
            <option value="General">General</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Academic Year</label>
          <input type="text" id="asgn-year-input" class="form-control" value="2026-2027" />
        </div>
      </form>
    `;

    const actions = `
      <button type="button" class="btn btn-secondary" onclick="window.UIUtils.closeModal('create-asgn-modal')">Cancel</button>
      <button type="button" class="btn btn-primary" id="btn-save-asgn-item">Save Assignment</button>
    `;

    window.UIUtils.showModal('Assign Teacher to Class & Subject', content, actions, 'modal-md', 'create-asgn-modal');

    const modalEl = document.querySelector('#create-asgn-modal');
    if (!modalEl) return;

    modalEl.querySelector('#btn-save-asgn-item').onclick = async () => {
      const tId = modalEl.querySelector('#asgn-teacher-select').value;
      const teacher = teachers.find(t => t.id === tId);
      const subject = modalEl.querySelector('#asgn-subject-input').value.trim();
      const cls = modalEl.querySelector('#asgn-class-select').value;
      const grp = modalEl.querySelector('#asgn-group-select').value;
      const year = modalEl.querySelector('#asgn-year-input').value.trim();

      if (!subject) {
        window.UIUtils.showToast('error', 'Subject Required', 'Please enter a subject name.');
        return;
      }

      window.UIUtils.closeModal('create-asgn-modal');

      const newId = `asgn_${Date.now()}`;
      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.addDocument('teacher_assignments', {
          id: newId,
          teacherId: tId,
          teacherName: teacher ? teacher.fullName : 'Teacher',
          subject,
          class: cls,
          group: grp,
          academicYear: year,
          startDate: '2026-08-01',
          endDate: '2027-05-31',
          status: 'Active',
          createdAt: new Date().toISOString()
        });

        await window.AuditService.log({
          action: 'Teacher Assigned to Class',
          category: 'Academic',
          targetType: 'Assignment',
          targetId: newId,
          details: `Assigned ${teacher ? teacher.fullName : 'Teacher'} to ${subject} for Class ${cls} (${grp})`
        });
      }, 'Saving class assignment to Cloud Firestore...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Assignment Saved', `Assignment recorded successfully.`);
      this.render(container);
    };
  }
};

window.TeacherManagementView = TeacherManagementView;
