/**
 * Ideal Coaching Center - Unified Notification Center
 * Provides role-specific notifications (Super Admin, Admin, Teacher, Student),
 * unread badges, filter by category/read state, Mark as Read, Mark All as Read,
 * and direct safe navigation links to target records.
 */

const NotificationsCenterView = {
  currentFilter: 'all', // 'all', 'unread', 'read'

  async render(container) {
    const user = window.AuthService.getCurrentUser();
    const role = window.AuthService.getCurrentRole();
    const allNotifications = await window.FirebaseService.getCollection('notifications');

    // Filter notifications relevant to current user role and identity
    let myNotifications = allNotifications.filter(n => {
      if (role === 'super_admin') {
        // Super Admin sees everything or items targeted to super_admin/admin
        return true;
      } else if (role === 'admin') {
        return n.targetRole === 'admin' || !n.targetRole || n.targetRole === 'all';
      } else if (role === 'teacher') {
        return n.teacherId === user.id || n.teacherId === user.teacherId || n.targetRole === 'teacher' || n.targetRole === 'all';
      } else if (role === 'student') {
        return n.studentId === user.id || n.rollNumber === user.rollNumber || n.targetRole === 'student' || n.targetRole === 'all';
      }
      return false;
    });

    // Sort newest first
    myNotifications.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const unreadCount = myNotifications.filter(n => !n.isRead).length;

    let displayList = myNotifications;
    if (this.currentFilter === 'unread') {
      displayList = myNotifications.filter(n => !n.isRead);
    } else if (this.currentFilter === 'read') {
      displayList = myNotifications.filter(n => n.isRead);
    }

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 0.25rem;">
            <span>System Hub</span> <span style="margin: 0 0.4rem;">/</span> <span style="color: var(--primary-600); font-weight: 600;">Notification Center</span>
          </div>
          <h1 style="font-size: 1.6rem; color: var(--slate-900); font-weight: 800; margin: 0;">Institutional Notification Center</h1>
          <p style="color: var(--slate-500); font-size: 0.85rem; margin-top: 0.25rem;">
            Real-time administrative alerts, financial approval notices, examination releases, and timetable updates.
          </p>
        </div>
        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="btn-mark-all-read" ${unreadCount === 0 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Mark All as Read (${unreadCount})
          </button>
        </div>
      </div>

      <!-- Filter Controls & Notification Feed Card -->
      <div class="data-card">
        <div class="data-card-header" style="flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; gap: 0.5rem;">
            <button type="button" class="btn btn-sm ${this.currentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" id="filter-notif-all">
              All Notifications (${myNotifications.length})
            </button>
            <button type="button" class="btn btn-sm ${this.currentFilter === 'unread' ? 'btn-primary' : 'btn-secondary'}" id="filter-notif-unread">
              Unread (${unreadCount})
            </button>
            <button type="button" class="btn btn-sm ${this.currentFilter === 'read' ? 'btn-primary' : 'btn-secondary'}" id="filter-notif-read">
              Archived / Read (${myNotifications.length - unreadCount})
            </button>
          </div>
          <span class="badge ${unreadCount > 0 ? 'badge-warning' : 'badge-paid'}">
            ${unreadCount > 0 ? `${unreadCount} Action Items Pending` : 'All Caught Up'}
          </span>
        </div>

        <div style="padding: 1.25rem;">
          ${displayList.length === 0 ? `
            <div style="text-align: center; color: var(--slate-500); padding: 3rem;">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 0.75rem; color: var(--slate-400);">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <h3 style="color: var(--slate-800); font-size: 1.1rem; margin-bottom: 0.25rem;">No Notifications Found</h3>
              <p style="font-size: 0.85rem;">You do not have any ${this.currentFilter} notifications at this time.</p>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${displayList.map(n => {
                const isUnread = !n.isRead;
                const timeAgo = n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent';

                return `
                  <div class="notification-item-card" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.15rem 1.25rem; border: 1px solid ${isUnread ? 'var(--primary-300)' : 'var(--border-color)'}; background: ${isUnread ? 'var(--primary-50)' : '#ffffff'}; border-left: 4px solid ${isUnread ? 'var(--primary-600)' : 'var(--slate-300)'}; border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; gap: 1rem; align-items: flex-start;">
                      <div style="width: 36px; height: 36px; border-radius: 50%; background: ${isUnread ? 'var(--primary-100)' : 'var(--slate-100)'}; color: ${isUnread ? 'var(--primary-700)' : 'var(--slate-600)'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                      </div>
                      <div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                          <strong style="font-size: 1rem; color: var(--slate-900);">${n.title}</strong>
                          ${isUnread ? '<span class="badge badge-warning" style="font-size: 0.65rem;">New</span>' : ''}
                        </div>
                        <p style="font-size: 0.85rem; color: var(--slate-700); margin: 0.35rem 0 0.5rem 0; line-height: 1.4;">
                          ${n.message}
                        </p>
                        <div style="font-size: 0.725rem; color: var(--slate-400);">
                          ${timeAgo} • Ideal Coaching Center Dispatch
                        </div>
                      </div>
                    </div>

                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0;">
                      ${isUnread ? `
                        <button type="button" class="btn btn-sm btn-secondary btn-mark-read" data-id="${n.id}" title="Mark as Read">
                          Mark Read
                        </button>
                      ` : ''}
                      ${this.buildActionLink(n)}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    this.attachEvents(container, myNotifications);
  },

  buildActionLink(n) {
    if (n.type === 'fee_receipt' || n.receiptNumber) {
      return `
        <button type="button" class="btn btn-sm btn-primary" onclick="window.location.hash='#fees'">
          View Receipt
        </button>
      `;
    }
    if (n.type === 'exam_receipt' || n.type === 'examination') {
      return `
        <button type="button" class="btn btn-sm btn-primary" onclick="window.location.hash='#examination-fees'">
          Open Exam Fees
        </button>
      `;
    }
    if (n.type && n.type.includes('adjustment')) {
      return `
        <button type="button" class="btn btn-sm btn-primary" onclick="window.location.hash='#approvals'">
          Review Request
        </button>
      `;
    }
    if (n.type && n.type.includes('attendance')) {
      return `
        <button type="button" class="btn btn-sm btn-primary" onclick="window.location.hash='#attendance'">
          View Attendance
        </button>
      `;
    }
    return '';
  },

  attachEvents(container, myNotifications) {
    // Filter buttons
    const btnAll = container.querySelector('#filter-notif-all');
    const btnUnread = container.querySelector('#filter-notif-unread');
    const btnRead = container.querySelector('#filter-notif-read');

    if (btnAll) btnAll.onclick = () => { this.currentFilter = 'all'; this.render(container); };
    if (btnUnread) btnUnread.onclick = () => { this.currentFilter = 'unread'; this.render(container); };
    if (btnRead) btnRead.onclick = () => { this.currentFilter = 'read'; this.render(container); };

    // Mark single notification read
    container.querySelectorAll('.btn-mark-read').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        await window.FirebaseService.updateDocument('notifications', id, { isRead: true });
        this.render(container);
      };
    });

    // Mark all read
    const btnMarkAll = container.querySelector('#btn-mark-all-read');
    if (btnMarkAll) {
      btnMarkAll.onclick = async () => {
        const unreadItems = myNotifications.filter(n => !n.isRead);
        for (const item of unreadItems) {
          await window.FirebaseService.updateDocument('notifications', item.id, { isRead: true });
        }
        window.UIUtils.showToast('success', 'Marked as Read', 'All notifications marked as read.');
        this.render(container);
      };
    }
  }
};

window.NotificationsCenterView = NotificationsCenterView;
