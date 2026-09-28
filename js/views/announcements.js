/**
 * Ideal Coaching Center - Announcement System
 * Targeted Announcements by Class/Group, Real-time Listeners, Admin CRUD
 */

const AnnouncementsView = {
  /**
   * Render Announcements Management View for Admin / Super Admin
   */
  async render(container) {
    const announcements = await window.FirebaseService.getCollection('announcements');
    announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    container.innerHTML = `
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">Announcements & Notices</h2>
            <span class="data-card-subtitle">Publish targeted academic updates and circulars • Ideal Coaching Center</span>
          </div>
          <div class="data-card-actions">
            <button type="button" class="btn btn-primary" id="btn-create-announcement">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              Create Announcement
            </button>
          </div>
        </div>

        <div style="padding: 1.5rem;" id="announcements-list-container">
          ${announcements.length === 0 ? `
            <div class="table-empty-state">
              <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <h4 class="empty-state-title">No announcements available</h4>
              <p class="empty-state-text">Click "Create Announcement" to post the first notice for students.</p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              ${announcements.map(ann => `
                <div class="announcement-card" data-ann-id="${ann.id}">
                  <div class="announcement-header">
                    <div>
                      <h3 class="announcement-title">${ann.title}</h3>
                      <div class="announcement-meta" style="margin-top: 0.35rem;">
                        <span>Target: <strong style="color: var(--primary-700);">${ann.targetClass === 'All' ? 'All Classes' : `Class ${ann.targetClass}`} (${ann.targetGroup || 'All Groups'})</strong></span>
                        <span>•</span>
                        <span>Published by: <strong>${ann.publishedBy || 'Administration'}</strong></span>
                        <span>•</span>
                        <span>${window.UIUtils.formatDate(ann.createdAt)}</span>
                      </div>
                    </div>

                    <div style="display: flex; gap: 0.4rem;">
                      <button type="button" class="btn btn-secondary btn-sm btn-edit-ann" data-ann-id="${ann.id}">
                        Edit
                      </button>
                      <button type="button" class="btn btn-danger btn-sm btn-delete-ann" data-ann-id="${ann.id}">
                        Delete
                      </button>
                    </div>
                  </div>

                  <div class="announcement-body">
                    ${ann.content}
                  </div>

                  ${ann.attachmentUrl ? `
                    <div style="margin-top: 0.5rem;">
                      <a href="${ann.attachmentUrl}" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex;">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                        </svg>
                        View Attachment / Link
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

    // Bind create button
    const createBtn = container.querySelector('#btn-create-announcement');
    if (createBtn) {
      createBtn.onclick = () => this.openAnnouncementModal(container);
    }

    // Bind edit and delete buttons
    this.bindCardActions(container);
  },

  bindCardActions(container) {
    container.querySelectorAll('.btn-edit-ann').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-ann-id');
        const ann = await window.FirebaseService.getDocument('announcements', id);
        if (ann) this.openAnnouncementModal(container, ann);
      };
    });

    container.querySelectorAll('.btn-delete-ann').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-ann-id');
        const confirmed = await window.UIUtils.confirm({
          title: 'Delete Announcement',
          message: 'Are you sure you want to permanently delete this announcement? Students will no longer see it.',
          confirmText: 'Yes, Delete',
          cancelText: 'Cancel',
          type: 'danger'
        });

        if (confirmed) {
          await window.GlobalLoader.wrap(async () => {
            await window.FirebaseService.deleteDocument('announcements', id);
            await window.AuditService.log({
              action: 'Announcement Deleted',
              category: 'Notice',
              targetType: 'Announcement',
              targetId: id,
              details: 'Deleted announcement circular'
            });
          }, 'Deleting announcement circular...', 'Ideal Coaching Center');

          window.UIUtils.showToast('info', 'Deleted', 'Announcement removed successfully.');
          this.render(container);
        }
      };
    });
  },

  /**
   * Modal form for Create / Edit Announcement
   */
  openAnnouncementModal(container, existingAnn = null) {
    let modal = document.getElementById('announcement-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'announcement-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const isEdit = !!existingAnn;

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <div class="modal-title-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <div>
              <h3 class="modal-title">${isEdit ? 'Edit Announcement' : 'Publish Announcement'}</h3>
              <p style="font-size: 0.75rem; color: var(--slate-500);">Ideal Coaching Center • Notice Board</p>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="btn-close-ann-modal">&times;</button>
        </div>

        <div class="modal-body">
          <form id="announcement-form" class="form-grid">
            <div class="form-group form-col-full">
              <label class="form-label">Announcement Title <span class="req-star">*</span></label>
              <input type="text" id="ann-input-title" class="form-control" value="${existingAnn ? existingAnn.title : ''}" placeholder="e.g. Mid-Term Examination Date Sheet Released" required />
            </div>

            <div class="form-group">
              <label class="form-label">Target Class <span class="req-star">*</span></label>
              <select id="ann-input-class" class="form-control" required>
                <option value="All" ${existingAnn && existingAnn.targetClass === 'All' ? 'selected' : ''}>All Classes (General Notice)</option>
                <option value="9th" ${existingAnn && existingAnn.targetClass === '9th' ? 'selected' : ''}>9th</option>
                <option value="10th" ${existingAnn && existingAnn.targetClass === '10th' ? 'selected' : ''}>10th</option>
                <option value="11th" ${existingAnn && existingAnn.targetClass === '11th' ? 'selected' : ''}>11th</option>
                <option value="12th" ${existingAnn && existingAnn.targetClass === '12th' ? 'selected' : ''}>12th</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Target Group</label>
              <select id="ann-input-group" class="form-control">
                <option value="All" ${existingAnn && existingAnn.targetGroup === 'All' ? 'selected' : ''}>All Groups</option>
                <option value="Science" ${existingAnn && existingAnn.targetGroup === 'Science' ? 'selected' : ''}>Science</option>
                <option value="General" ${existingAnn && existingAnn.targetGroup === 'General' ? 'selected' : ''}>General</option>
                <option value="Pre-Medical" ${existingAnn && existingAnn.targetGroup === 'Pre-Medical' ? 'selected' : ''}>Pre-Medical</option>
                <option value="Pre-Engineering" ${existingAnn && existingAnn.targetGroup === 'Pre-Engineering' ? 'selected' : ''}>Pre-Engineering</option>
                <option value="Computer Science" ${existingAnn && existingAnn.targetGroup === 'Computer Science' ? 'selected' : ''}>Computer Science</option>
              </select>
            </div>

            <div class="form-group form-col-full">
              <label class="form-label">Message / Circular Content <span class="req-star">*</span></label>
              <textarea id="ann-input-content" class="form-control" style="min-height: 120px;" placeholder="Write detailed announcement content here..." required>${existingAnn ? existingAnn.content : ''}</textarea>
            </div>

            <div class="form-group form-col-full">
              <label class="form-label">Optional Attachment or Web Link</label>
              <input type="url" id="ann-input-link" class="form-control" value="${existingAnn ? (existingAnn.attachmentUrl || '') : ''}" placeholder="https://..." />
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-cancel-ann">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-submit-ann">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13"></path>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            ${isEdit ? 'Update Announcement' : 'Publish Announcement'}
          </button>
        </div>
      </div>
    `;

    window.UIUtils.openModal('announcement-modal');

    modal.querySelector('#btn-close-ann-modal').onclick = () => window.UIUtils.closeModal('announcement-modal');
    modal.querySelector('#btn-cancel-ann').onclick = () => window.UIUtils.closeModal('announcement-modal');

    modal.querySelector('#btn-submit-ann').onclick = async () => {
      const title = modal.querySelector('#ann-input-title').value.trim();
      const targetClass = modal.querySelector('#ann-input-class').value;
      const targetGroup = modal.querySelector('#ann-input-group').value;
      const content = modal.querySelector('#ann-input-content').value.trim();
      const attachmentUrl = modal.querySelector('#ann-input-link').value.trim();

      if (!title || !content) {
        window.UIUtils.showToast('error', 'Required Fields Missing', 'Please enter both announcement title and message content.');
        return;
      }

      window.UIUtils.closeModal('announcement-modal');

      await window.GlobalLoader.wrap(async () => {
        const user = window.AuthService.getCurrentUser() || { fullName: 'Administration' };
        const data = {
          title,
          targetClass,
          targetGroup,
          content,
          attachmentUrl: attachmentUrl || null,
          publishedBy: user.fullName || 'Ideal Coaching Administration',
          updatedAt: new Date().toISOString()
        };

        if (isEdit) {
          await window.FirebaseService.updateDocument('announcements', existingAnn.id, data);
          await window.AuditService.log({
            action: 'Announcement Updated',
            category: 'Notice',
            targetType: 'Announcement',
            targetId: existingAnn.id,
            details: `Updated announcement "${title}"`
          });
        } else {
          data.id = `ann_${Date.now()}`;
          data.createdAt = new Date().toISOString();
          await window.FirebaseService.addDocument('announcements', data);
          await window.AuditService.log({
            action: 'Announcement Created',
            category: 'Notice',
            targetType: 'Announcement',
            targetId: data.id,
            details: `Published announcement "${title}" for ${targetClass} (${targetGroup})`
          });
        }
      }, isEdit ? 'Updating announcement in Firebase...' : 'Publishing announcement to student portal...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', isEdit ? 'Announcement Updated' : 'Announcement Published', 'Announcement published successfully.');
      this.render(container);
    };
  }
};

window.AnnouncementsView = AnnouncementsView;
