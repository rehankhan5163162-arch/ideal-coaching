/**
 * Ideal Coaching Center - Super Admin Systems
 * Highest-level control center, Admin Management, System Settings, and Audit Logs
 */

const SuperAdminView = {
  /**
   * Render Super Admin Dashboard Homepage
   */
  async renderDashboard(container) {
    const students = await window.FirebaseService.getCollection('students');
    const admins = await window.FirebaseService.getCollection('admins');
    const fees = await window.FirebaseService.getCollection('fees');
    const attendance = await window.FirebaseService.getCollection('attendance');
    const announcements = await window.FirebaseService.getCollection('announcements');
    const settings = await window.FirebaseService.getSystemSettings();

    // Stats calculations
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'Active').length;
    const activeAdmins = admins.filter(a => a.status === 'Active').length;

    const totalFeesCollected = fees.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
    const totalFeesExpected = fees.reduce((sum, f) => sum + (Number(f.expectedAmount) || 0), 0);
    const totalPendingFees = Math.max(0, totalFeesExpected - totalFeesCollected);

    // Today's attendance
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAtt = attendance.filter(a => a.date === todayStr);
    const presentToday = todayAtt.filter(a => a.status === 'Present').length;
    const absentToday = todayAtt.filter(a => a.status === 'Absent').length;
    const leaveToday = todayAtt.filter(a => a.status === 'Leave').length;

    // Students by Class
    const class9 = students.filter(s => s.class === '9th').length;
    const class10 = students.filter(s => s.class === '10th').length;
    const class11 = students.filter(s => s.class === '11th').length;
    const class12 = students.filter(s => s.class === '12th').length;

    container.innerHTML = `
      <!-- Super Admin Header Banner -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: var(--radius-xl); padding: 1.75rem 2rem; color: #ffffff; margin-bottom: 1.75rem; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: var(--shadow-lg);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 0.25rem 0.75rem; border-radius: var(--radius-full); font-size: 0.725rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">
              Super Admin Executive Control
            </div>
            <h1 style="color: #ffffff; font-size: 1.75rem;">Ideal Coaching Center Command Center</h1>
            <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 0.25rem;">
              Academic Year: <strong style="color: var(--accent-gold);">${settings.activeAcademicYear}</strong> • Full Unrestricted Master Control
            </p>
          </div>
          <div style="display: flex; gap: 0.65rem;">
            <button type="button" class="btn btn-primary" id="btn-quick-create-admin">
              + Add New Admin
            </button>
            <button type="button" class="btn btn-secondary" id="btn-quick-system-settings">
              System Settings
            </button>
          </div>
        </div>
      </div>

      <!-- Live Statistics Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Total Students</span>
            <span class="stat-value">${totalStudents}</span>
            <span class="stat-subtext">${activeStudents} Active Profiles</span>
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
            <span class="stat-label">Fees Collected</span>
            <span class="stat-value" style="font-size: 1.4rem;">${window.UIUtils.formatCurrency(totalFeesCollected)}</span>
            <span class="stat-subtext" style="color: var(--success-600); font-weight: 600;">Deposited into Ideal Portal</span>
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
            <span class="stat-label">Pending Fees</span>
            <span class="stat-value" style="font-size: 1.4rem; color: var(--warning-600);">${window.UIUtils.formatCurrency(totalPendingFees)}</span>
            <span class="stat-subtext">Outstanding Balance</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper stat-icon-purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <polyline points="17 11 19 13 23 9"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-label">Active Admins</span>
            <span class="stat-value">${activeAdmins}</span>
            <span class="stat-subtext">Managing Portal Operations</span>
          </div>
        </div>
      </div>

      <!-- Class Distribution & Attendance Summary Grid -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.75rem;">
        <div class="data-card" style="margin-bottom: 0;">
          <div class="data-card-header">
            <h3 class="data-card-title">Enrolled Students by Class</h3>
            <span style="font-size: 0.8rem; color: var(--slate-500);">Current Academic Cycle</span>
          </div>
          <div style="padding: 1.5rem; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
            <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
              <span class="badge badge-studying">Class 9th</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--slate-900); margin-top: 0.5rem;">${class9}</div>
              <span style="font-size: 0.725rem; color: var(--slate-500);">Science & General</span>
            </div>
            <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
              <span class="badge badge-studying">Class 10th</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--slate-900); margin-top: 0.5rem;">${class10}</div>
              <span style="font-size: 0.725rem; color: var(--slate-500);">Board Matric</span>
            </div>
            <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
              <span class="badge badge-studying">Class 11th</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--slate-900); margin-top: 0.5rem;">${class11}</div>
              <span style="font-size: 0.725rem; color: var(--slate-500);">F.Sc / ICS</span>
            </div>
            <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
              <span class="badge badge-studying">Class 12th</span>
              <div style="font-family: var(--font-heading); font-size: 1.75rem; font-weight: 800; color: var(--slate-900); margin-top: 0.5rem;">${class12}</div>
              <span style="font-size: 0.725rem; color: var(--slate-500);">Board Intermediate</span>
            </div>
          </div>
        </div>

        <div class="data-card" style="margin-bottom: 0;">
          <div class="data-card-header">
            <h3 class="data-card-title">Attendance Today</h3>
            <span style="font-size: 0.8rem; color: var(--slate-500);">${window.UIUtils.formatDate(todayStr)}</span>
          </div>
          <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--success-50); border-radius: var(--radius-md); border: 1px solid #a7f3d0;">
              <span style="font-weight: 600; color: #065f46; font-size: 0.85rem;">Present Today</span>
              <span style="font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem; color: #059669;">${presentToday}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--danger-50); border-radius: var(--radius-md); border: 1px solid #fecaca;">
              <span style="font-weight: 600; color: #991b1b; font-size: 0.85rem;">Absent Today</span>
              <span style="font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem; color: #dc2626;">${absentToday}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--info-50); border-radius: var(--radius-md); border: 1px solid #bae6fd;">
              <span style="font-weight: 600; color: #0369a1; font-size: 0.85rem;">On Leave</span>
              <span style="font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem; color: #0284c7;">${leaveToday}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Circulars and Quick Admin Access -->
      <div class="data-card">
        <div class="data-card-header">
          <h3 class="data-card-title">Recent Announcements & Circulars</h3>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-view-all-ann">View All</button>
        </div>
        <div style="padding: 1.25rem 1.5rem;">
          ${announcements.slice(0, 3).map(a => `
            <div style="padding: 0.85rem 0; border-bottom: 1px solid var(--border-color-subtle); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 0.95rem; margin-bottom: 0.2rem;">${a.title}</h4>
                <span style="font-size: 0.75rem; color: var(--slate-500);">Target: <strong>${a.targetClass} (${a.targetGroup || 'All'})</strong> • ${window.UIUtils.formatDate(a.createdAt)}</span>
              </div>
              <span class="badge badge-paid">Published</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Button links
    container.querySelector('#btn-quick-create-admin').onclick = () => {
      window.location.hash = '#admin-management';
      window.AppRouter.navigate('admin-management');
    };
    container.querySelector('#btn-quick-system-settings').onclick = () => {
      window.location.hash = '#system-settings';
      window.AppRouter.navigate('system-settings');
    };
    container.querySelector('#btn-view-all-ann').onclick = () => {
      window.location.hash = '#announcements';
      window.AppRouter.navigate('announcements');
    };
  },

  /**
   * Admin Management: List, Create, Edit, Disable, Reset Password, Delete
   */
  async renderAdminManagement(container) {
    const admins = await window.FirebaseService.getCollection('admins');

    container.innerHTML = `
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">Admin Account Management</h2>
            <span class="data-card-subtitle">Create and oversee coaching center operational administrators • Ideal Coaching Center</span>
          </div>
          <div class="data-card-actions">
            <button type="button" class="btn btn-primary" id="btn-open-create-admin-modal">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create New Admin
            </button>
          </div>
        </div>

        <div style="padding: 1.5rem;">
          <div class="table-responsive">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Admin Name</th>
                  <th>Email / Username</th>
                  <th>Contact Number</th>
                  <th>Permissions</th>
                  <th>Account Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${admins.map(adm => `
                  <tr data-admin-id="${adm.id}">
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">
                          ${adm.fullName.charAt(0)}
                        </div>
                        <span style="font-weight: 700;">${adm.fullName}</span>
                      </div>
                    </td>
                    <td>${adm.email}</td>
                    <td>${adm.contactNumber}</td>
                    <td>
                      <span style="font-size: 0.75rem; color: var(--slate-600);">
                        ${(adm.permissions || []).length} Granted Modules
                      </span>
                    </td>
                    <td>
                      <span class="badge ${adm.status === 'Active' ? 'badge-active' : 'badge-inactive'}">
                        ${adm.status}
                      </span>
                    </td>
                    <td>${window.UIUtils.formatDate(adm.createdAt)}</td>
                    <td>
                      <div style="display: flex; gap: 0.35rem;">
                        <button type="button" class="btn btn-secondary btn-sm btn-edit-admin" data-admin-id="${adm.id}" title="Edit Profile">
                          Edit
                        </button>
                        <button type="button" class="btn ${adm.status === 'Active' ? 'btn-secondary' : 'btn-success'} btn-sm btn-toggle-admin-status" data-admin-id="${adm.id}" title="${adm.status === 'Active' ? 'Disable Account' : 'Enable Account'}">
                          ${adm.status === 'Active' ? 'Disable' : 'Enable'}
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm btn-reset-admin-pwd" data-admin-id="${adm.id}" title="Reset Password">
                          Reset Key
                        </button>
                        <button type="button" class="btn btn-danger btn-sm btn-delete-admin" data-admin-id="${adm.id}" title="Delete Admin">
                          &times;
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#btn-open-create-admin-modal').onclick = () => this.openAdminModal(container);

    // Bind Edit Admin
    container.querySelectorAll('.btn-edit-admin').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-admin-id');
        const adm = await window.FirebaseService.getDocument('admins', id);
        if (adm) this.openAdminModal(container, adm);
      };
    });

    // Toggle Status
    container.querySelectorAll('.btn-toggle-admin-status').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-admin-id');
        const adm = await window.FirebaseService.getDocument('admins', id);
        if (!adm) return;
        const newStatus = adm.status === 'Active' ? 'Inactive' : 'Active';

        await window.GlobalLoader.wrap(async () => {
          await window.FirebaseService.updateDocument('admins', id, { status: newStatus });
          await window.AuditService.log({
            action: 'Admin Account Status Changed',
            category: 'Security',
            targetType: 'Admin',
            targetId: id,
            details: `Changed status of Admin ${adm.fullName} to ${newStatus}`
          });
        }, 'Updating admin account status in Firebase...', 'Ideal Coaching Center');

        window.UIUtils.showToast('info', 'Status Updated', `Admin account is now ${newStatus}.`);
        this.renderAdminManagement(container);
      };
    });

    // Reset Password
    container.querySelectorAll('.btn-reset-admin-pwd').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-admin-id');
        const adm = await window.FirebaseService.getDocument('admins', id);
        if (!adm) return;

        const confirmed = await window.UIUtils.confirm({
          title: 'Reset Admin Password',
          message: `Are you sure you want to trigger a password reset for ${adm.fullName} (${adm.email})?`,
          confirmText: 'Yes, Send Reset Instructions',
          cancelText: 'Cancel',
          type: 'warning'
        });

        if (confirmed) {
          await window.GlobalLoader.wrap(async () => {
            // Emulate or trigger Firebase auth password reset email
            await window.FirebaseService.updateDocument('admins', id, {
              passwordResetRequested: new Date().toISOString()
            });
            await window.AuditService.log({
              action: 'Admin Password Reset',
              category: 'Security',
              targetType: 'Admin',
              targetId: id,
              details: `Password reset triggered for ${adm.fullName}`
            });
          }, 'Processing secure password reset request via Firebase Auth...', 'Ideal Coaching Center');

          window.UIUtils.showToast('success', 'Reset Completed', `Password reset instructions dispatched for ${adm.email}.`);
        }
      };
    });

    // Delete Admin
    container.querySelectorAll('.btn-delete-admin').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-admin-id');
        const adm = await window.FirebaseService.getDocument('admins', id);
        if (!adm) return;

        const confirmed = await window.UIUtils.confirm({
          title: 'Delete Admin Account',
          message: `Are you sure you want to permanently delete Admin "${adm.fullName}"? This action cannot be undone.`,
          confirmText: 'Yes, Delete Admin',
          cancelText: 'Cancel',
          type: 'danger'
        });

        if (confirmed) {
          await window.GlobalLoader.wrap(async () => {
            await window.FirebaseService.deleteDocument('admins', id);
            await window.AuditService.log({
              action: 'Admin Deleted',
              category: 'Security',
              targetType: 'Admin',
              targetId: id,
              details: `Permanently deleted Admin ${adm.fullName} (${adm.email})`
            });
          }, 'Deleting admin credentials from Firebase...', 'Ideal Coaching Center');

          window.UIUtils.showToast('info', 'Admin Deleted', 'The admin account has been removed.');
          this.renderAdminManagement(container);
        }
      };
    });
  },

  /**
   * Modal form for Create / Edit Admin
   */
  openAdminModal(container, existingAdmin = null) {
    let modal = document.getElementById('admin-form-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'admin-form-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const isEdit = !!existingAdmin;

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <h3 class="modal-title">${isEdit ? 'Edit Admin Profile' : 'Create New Administrator'}</h3>
          </div>
          <button type="button" class="modal-close-btn" id="btn-close-admin-modal">&times;</button>
        </div>

        <div class="modal-body">
          <form id="admin-create-form" class="form-grid">
            <div class="form-group form-col-full">
              <label class="form-label">Full Name <span class="req-star">*</span></label>
              <input type="text" id="adm-input-name" class="form-control" value="${existingAdmin ? existingAdmin.fullName : ''}" placeholder="e.g. Prof. Muhammad Tariq" required />
            </div>

            <div class="form-group">
              <label class="form-label">Email Address <span class="req-star">*</span></label>
              <input type="email" id="adm-input-email" class="form-control" value="${existingAdmin ? existingAdmin.email : ''}" placeholder="admin@ideal.edu" required />
            </div>

            <div class="form-group">
              <label class="form-label">Contact Number <span class="req-star">*</span></label>
              <input type="text" id="adm-input-contact" class="form-control" value="${existingAdmin ? existingAdmin.contactNumber : ''}" placeholder="0300-1234567" required />
            </div>

            ${!isEdit ? `
              <div class="form-group">
                <label class="form-label">Initial Password <span class="req-star">*</span></label>
                <input type="password" id="adm-input-pwd" class="form-control" placeholder="••••••••" required />
              </div>
            ` : ''}

            <div class="form-group">
              <label class="form-label">Account Status <span class="req-star">*</span></label>
              <select id="adm-input-status" class="form-control">
                <option value="Active" ${existingAdmin && existingAdmin.status === 'Active' ? 'selected' : ''}>Active</option>
                <option value="Inactive" ${existingAdmin && existingAdmin.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>

            <div class="form-group form-col-full">
              <label class="form-label">Assigned Permissions</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.35rem; font-size: 0.825rem;">
                <label style="display: flex; align-items: center; gap: 0.4rem;">
                  <input type="checkbox" class="adm-perm" value="Manage Students" checked /> Manage Students
                </label>
                <label style="display: flex; align-items: center; gap: 0.4rem;">
                  <input type="checkbox" class="adm-perm" value="Manage Fees" checked /> Manage Fees & Receipts
                </label>
                <label style="display: flex; align-items: center; gap: 0.4rem;">
                  <input type="checkbox" class="adm-perm" value="Manage Attendance" checked /> Manage Attendance
                </label>
                <label style="display: flex; align-items: center; gap: 0.4rem;">
                  <input type="checkbox" class="adm-perm" value="Manage Announcements" checked /> Manage Announcements
                </label>
                <label style="display: flex; align-items: center; gap: 0.4rem;">
                  <input type="checkbox" class="adm-perm" value="Manage Diary & Syllabus" checked /> Manage Diary & Syllabus
                </label>
              </div>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-cancel-admin-modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-save-admin-modal">
            ${isEdit ? 'Save Changes' : 'Create Admin Account'}
          </button>
        </div>
      </div>
    `;

    window.UIUtils.openModal('admin-form-modal');

    modal.querySelector('#btn-close-admin-modal').onclick = () => window.UIUtils.closeModal('admin-form-modal');
    modal.querySelector('#btn-cancel-admin-modal').onclick = () => window.UIUtils.closeModal('admin-form-modal');

    modal.querySelector('#btn-save-admin-modal').onclick = async () => {
      const name = modal.querySelector('#adm-input-name').value.trim();
      const email = modal.querySelector('#adm-input-email').value.trim().toLowerCase();
      const contact = modal.querySelector('#adm-input-contact').value.trim();
      const status = modal.querySelector('#adm-input-status').value;
      const pwdInput = modal.querySelector('#adm-input-pwd');
      const password = pwdInput ? pwdInput.value.trim() : null;

      if (!name || !email || !contact || (!isEdit && !password)) {
        window.UIUtils.showToast('error', 'Missing Information', 'Please fill in all required fields.');
        return;
      }

      const permissions = Array.from(modal.querySelectorAll('.adm-perm:checked')).map(cb => cb.value);

      window.UIUtils.closeModal('admin-form-modal');

      await window.GlobalLoader.wrap(async () => {
        if (isEdit) {
          await window.FirebaseService.updateDocument('admins', existingAdmin.id, {
            fullName: name,
            email: email,
            contactNumber: contact,
            status: status,
            permissions: permissions
          });
          await window.AuditService.log({
            action: 'Admin Profile Updated',
            category: 'Security',
            targetType: 'Admin',
            targetId: existingAdmin.id,
            details: `Updated profile details for Admin ${name}`
          });
        } else {
          const newId = `adm_${Date.now()}`;
          await window.FirebaseService.addDocument('admins', {
            id: newId,
            fullName: name,
            email: email,
            contactNumber: contact,
            password: password,
            status: status,
            permissions: permissions,
            createdAt: new Date().toISOString()
          });
          await window.AuditService.log({
            action: 'Admin Account Created',
            category: 'Security',
            targetType: 'Admin',
            targetId: newId,
            details: `Created new Admin ${name} (${email})`
          });
        }
      }, isEdit ? 'Updating Admin in Firebase...' : 'Creating Firebase Authentication account & admin profile...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', isEdit ? 'Admin Updated' : 'Admin Created', 'Admin account created successfully.');
      this.renderAdminManagement(container);
    };
  },

  /**
   * System Settings View
   */
  async renderSystemSettings(container) {
    const settings = await window.FirebaseService.getSystemSettings();

    container.innerHTML = `
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">System Settings & Academic Configuration</h2>
            <span class="data-card-subtitle">Global academic year, fee defaults, and coaching center parameters • Ideal Coaching Center</span>
          </div>
          <div class="data-card-actions">
            <button type="button" class="btn btn-primary" id="btn-save-settings">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Save Configuration
            </button>
          </div>
        </div>

        <div style="padding: 1.5rem;">
          <form id="system-settings-form" class="form-grid">
            <div class="form-group">
              <label class="form-label">Official Organization Name</label>
              <input type="text" class="form-control" value="Ideal Coaching Center" disabled style="background-color: var(--slate-100);" />
              <span class="form-help">Locked to official entity name.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Active Academic / Coaching Year <span class="req-star">*</span></label>
              <select id="set-academic-year" class="form-control">
                <option value="2025-2026" ${settings.activeAcademicYear === '2025-2026' ? 'selected' : ''}>2025-2026</option>
                <option value="2026-2027" ${settings.activeAcademicYear === '2026-2027' ? 'selected' : ''}>2026-2027 (Active Current)</option>
                <option value="2027-2028" ${settings.activeAcademicYear === '2027-2028' ? 'selected' : ''}>2027-2028 (Upcoming)</option>
              </select>
              <span class="form-help">Historical records remain permanently preserved across academic years.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Coaching Tagline</label>
              <input type="text" id="set-tagline" class="form-control" value="${settings.tagline || 'Excellence in Education'}" />
            </div>

            <div class="form-group">
              <label class="form-label">Official Helpline Phone</label>
              <input type="text" id="set-phone" class="form-control" value="${settings.phone || '+92 300 1234567'}" />
            </div>

            <div class="form-group form-col-full">
              <label class="form-label">Coaching Center Address (Appears on Receipts)</label>
              <input type="text" id="set-address" class="form-control" value="${settings.address || ''}" />
            </div>

            <div class="form-col-full" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
              <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem;">Default Monthly Tuition Fees by Class</h3>
              <p style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 1rem;">Used when initializing new 12-month student fee schedules.</p>
            </div>

            <div class="form-group">
              <label class="form-label">Class 9th Default Fee (PKR)</label>
              <input type="number" id="set-fee-9" class="form-control" value="${settings.defaultFee9th || 3000}" />
            </div>

            <div class="form-group">
              <label class="form-label">Class 10th Default Fee (PKR)</label>
              <input type="number" id="set-fee-10" class="form-control" value="${settings.defaultFee10th || 3000}" />
            </div>

            <div class="form-group">
              <label class="form-label">Class 11th Default Fee (PKR)</label>
              <input type="number" id="set-fee-11" class="form-control" value="${settings.defaultFee11th || 3000}" />
            </div>

            <div class="form-group">
              <label class="form-label">Class 12th Default Fee (PKR)</label>
              <input type="number" id="set-fee-12" class="form-control" value="${settings.defaultFee12th || 3000}" />
            </div>
          </form>
        </div>
      </div>
    `;

    container.querySelector('#btn-save-settings').onclick = async () => {
      const year = container.querySelector('#set-academic-year').value;
      const tagline = container.querySelector('#set-tagline').value.trim();
      const phone = container.querySelector('#set-phone').value.trim();
      const address = container.querySelector('#set-address').value.trim();
      const f9 = Number(container.querySelector('#set-fee-9').value) || 3000;
      const f10 = Number(container.querySelector('#set-fee-10').value) || 3000;
      const f11 = Number(container.querySelector('#set-fee-11').value) || 3000;
      const f12 = Number(container.querySelector('#set-fee-12').value) || 3000;

      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.updateDocument('settings', 'global_settings', {
          activeAcademicYear: year,
          tagline,
          phone,
          address,
          defaultFee9th: f9,
          defaultFee10th: f10,
          defaultFee11th: f11,
          defaultFee12th: f12
        });

        await window.AuditService.log({
          action: 'System Settings Updated',
          category: 'System',
          targetType: 'Settings',
          targetId: 'global_settings',
          details: `Updated active academic year to ${year} and adjusted class fee defaults`
        });
      }, 'Writing configuration updates to Firebase...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Settings Saved', 'System settings updated successfully.');
    };
  },

  /**
   * Audit Logs View
   */
  async renderAuditLogs(container) {
    const logs = await window.FirebaseService.getCollection('audit_logs');
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    container.innerHTML = `
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">System Audit Trails & Security Logs</h2>
            <span class="data-card-subtitle">Chronological ledger of administrative and system operations • Ideal Coaching Center</span>
          </div>
        </div>

        <div style="padding: 1.5rem;">
          <div class="table-responsive">
            <table class="app-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Category</th>
                  <th>Target Type</th>
                  <th>Details</th>
                  <th>Performed By</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(log => `
                  <tr>
                    <td style="white-space: nowrap; font-size: 0.775rem; color: var(--slate-500); font-family: var(--font-mono);">
                      ${new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td><strong>${log.action}</strong></td>
                    <td><span class="badge badge-studying">${log.category || 'General'}</span></td>
                    <td>${log.targetType || 'System'}</td>
                    <td style="font-size: 0.8rem; color: var(--slate-700); max-width: 320px;">${log.details}</td>
                    <td>
                      <div style="font-size: 0.8rem; font-weight: 700;">${log.performedBy ? log.performedBy.name : 'Authorized Admin'}</div>
                      <span style="font-size: 0.7rem; color: var(--slate-500);">${log.performedBy ? log.performedBy.role : ''}</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }
};

window.SuperAdminView = SuperAdminView;
