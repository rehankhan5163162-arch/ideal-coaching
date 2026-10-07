/**
 * Ideal Coaching Center - Core Application Router & Shell Controller
 * Official Name: Ideal Coaching Center
 */

class AppRouter {
  constructor() {
    this.currentView = null;
    this.sidebarEl = null;
    this.sidebarOverlay = null;
    this.contentEl = null;
    this.init();
  }

  async init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bootstrap());
    } else {
      this.bootstrap();
    }
  }

  async bootstrap() {
    this.sidebarEl = document.getElementById('app-sidebar');
    this.sidebarOverlay = document.getElementById('sidebar-overlay');
    this.contentEl = document.getElementById('app-content-viewport');

    this.bindGlobalEvents();

    // Initial check of authentication & hash route with fast 1.5s - 2.0s loader
    await window.GlobalLoader.wrap(async () => {
      await window.FirebaseService.init();
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      await this.navigate(hash, false);
    }, 'Connecting to Ideal Coaching Center database...', 'Ideal Coaching Center', 1600);
  }

  bindGlobalEvents() {
    // Mobile Hamburger Toggle
    const hamburgerBtn = document.getElementById('btn-hamburger');
    if (hamburgerBtn) {
      hamburgerBtn.onclick = () => this.toggleMobileSidebar(true);
    }

    if (this.sidebarOverlay) {
      this.sidebarOverlay.onclick = () => this.toggleMobileSidebar(false);
    }

    // Global Hash Change Listener
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      this.navigate(hash);
    });

    // Header Logout Button
    const headerLogout = document.getElementById('btn-header-logout');
    if (headerLogout) {
      headerLogout.onclick = () => window.AuthService.logout();
    }
  }

  toggleMobileSidebar(open) {
    if (!this.sidebarEl) return;
    if (open) {
      this.sidebarEl.classList.add('open');
      if (this.sidebarOverlay) this.sidebarOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      this.sidebarEl.classList.remove('open');
      if (this.sidebarOverlay) this.sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  /**
   * Main View Navigator & Access Guard
   */
  async navigate(routeKey, showLoader = true) {
    this.toggleMobileSidebar(false);

    // Teardown any active student real-time subscriptions before rendering new route
    if (window.StudentPortalView && typeof window.StudentPortalView.cleanupSubscriptions === 'function') {
      window.StudentPortalView.cleanupSubscriptions();
    }

    // 1. Check Authentication
    if (!window.AuthService.isAuthenticated()) {
      this.renderLoginPage();
      return;
    }

    // Hide Login Page Container if active
    const loginContainer = document.getElementById('login-view-container');
    const portalContainer = document.getElementById('app-portal-layout');
    if (loginContainer) loginContainer.style.display = 'none';
    if (portalContainer) portalContainer.style.display = 'flex';

    const currentUser = window.AuthService.getCurrentUser();
    this.updateShellUserInfo(currentUser);
    this.renderRoleSidebar(currentUser.role);

    // 2. Normalize Route by Role
    let route = routeKey;
    if (route === 'dashboard') {
      if (currentUser.role === 'super_admin') route = 'super-admin-dashboard';
      else if (currentUser.role === 'admin') route = 'admin-dashboard';
      else if (currentUser.role === 'student') route = 'student-dashboard';
    }

    // 3. Security Route Protection
    if (currentUser.role === 'student' || route.startsWith('student-')) {
      const adminOnlyRoutes = ['super-admin-dashboard', 'admin-dashboard', 'admin-management', 'add-student', 'students', 'reports', 'system-settings', 'audit-logs', 'whatsapp-settings'];
      if (adminOnlyRoutes.includes(route)) {
        window.UIUtils.showToast('error', 'Access Denied', 'Students are restricted to their student portal.');
        route = 'student-dashboard';
      }
      document.body.classList.add('role-student');
      document.body.classList.remove('role-admin');
      const cBtn = document.getElementById('btn-cloud-sync');
      if (cBtn) {
        cBtn.style.setProperty('display', 'none', 'important');
        cBtn.setAttribute('aria-hidden', 'true');
      }
      const cBanner = document.getElementById('cloud-warning-banner');
      if (cBanner) {
        cBanner.style.setProperty('display', 'none', 'important');
      }
    } else if (currentUser.role === 'admin') {
      const superAdminOnlyRoutes = ['admin-management', 'system-settings', 'audit-logs'];
      if (superAdminOnlyRoutes.includes(route)) {
        window.UIUtils.showToast('error', 'Restricted Function', 'This section requires Super Admin authorization.');
        route = 'admin-dashboard';
      }
    }

    this.updateBreadcrumbs(route);
    this.highlightActiveNavItem(route);

    const execRoute = async () => {
      const container = document.getElementById('view-container');
      if (!container) return;

      switch (route) {
        // Super Admin
        case 'super-admin-dashboard':
          await window.SuperAdminView.renderDashboard(container);
          break;
        case 'admin-management':
          await window.SuperAdminView.renderAdminManagement(container);
          break;
        case 'system-settings':
          await window.SuperAdminView.renderSystemSettings(container);
          break;
        case 'audit-logs':
          await window.SuperAdminView.renderAuditLogs(container);
          break;

        // WhatsApp Communication & Settings (Super Admin & Admin)
        case 'whatsapp-settings':
          if (window.WhatsAppView && typeof window.WhatsAppView.render === 'function') {
            await window.WhatsAppView.render(container);
          } else {
            window.UIUtils.showToast('error', 'Module Not Loaded', 'WhatsApp module is currently initializing.');
          }
          break;

        // Admin
        case 'admin-dashboard':
          await window.AdminView.renderDashboard(container);
          break;
        case 'add-student':
          await window.AdminView.renderAddStudent(container);
          break;
        case 'students':
          await window.AdminView.renderAllStudents(container);
          break;

        // Shared Admin / Super Admin modules
        case 'fees':
          await window.FeesView.render(container);
          break;
        case 'attendance':
          await window.AttendanceView.render(container);
          break;
        case 'announcements':
          await window.AnnouncementsView.render(container);
          break;
        case 'diary':
          await window.DiaryView.render(container);
          break;
        case 'syllabus':
          await window.SyllabusView.render(container);
          break;
        case 'reports':
          await window.ReportsView.render(container);
          break;

        // Student Portal
        case 'student-dashboard':
          await window.StudentPortalView.renderDashboard(container);
          break;
        case 'student-profile':
          await window.StudentPortalView.renderProfile(container);
          break;
        case 'student-fees':
          await window.StudentPortalView.renderFees(container);
          break;
        case 'student-attendance':
          await window.StudentPortalView.renderAttendance(container);
          break;
        case 'student-announcements':
          await window.StudentPortalView.renderAnnouncements(container);
          break;
        case 'student-diary':
          await window.StudentPortalView.renderDiary(container);
          break;
        case 'student-syllabus':
          await window.StudentPortalView.renderSyllabus(container);
          break;
        case 'student-notifications':
          await window.StudentPortalView.renderNotifications(container);
          break;

        // Account Settings
        case 'account-settings':
          this.renderAccountSettings(container, currentUser);
          break;

        default:
          if (currentUser.role === 'student') {
            await window.StudentPortalView.renderDashboard(container);
          } else {
            await window.AdminView.renderDashboard(container);
          }
          break;
      }
    };

    if (showLoader) {
      await window.GlobalLoader.wrap(execRoute, `Loading ${route.replace(/-/g, ' ')}...`, 'Ideal Coaching Center', 400);
    } else {
      await execRoute();
    }
  }

  /**
   * Update header user name, role badge, and active academic year
   */
  updateShellUserInfo(user) {
    const avatarEl = document.getElementById('user-header-avatar');
    const nameEl = document.getElementById('user-header-name');
    const roleEl = document.getElementById('user-header-role');
    const notifDot = document.querySelector('.header-badge-dot');

    const displayName = user.fullName || user.name || `Student (${user.rollNumber})`;
    if (avatarEl) avatarEl.textContent = displayName.charAt(0);
    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) {
      roleEl.textContent = user.role.replace('_', ' ');
      roleEl.className = `user-role-badge role-${user.role.replace('_', '-')}`;
    }

    // Live update notification dot for students
    if (user.role === 'student' && notifDot && window.FirebaseService) {
      const updateNotifDot = (notifs) => {
        const studentId = user.studentId || user.id;
        const unread = notifs.some(n => (n.studentId === studentId || n.rollNumber === user.rollNumber) && !n.isRead);
        notifDot.style.display = unread ? 'block' : 'none';
      };
      if (!this._notifUnsub && typeof window.FirebaseService.subscribe === 'function') {
        this._notifUnsub = window.FirebaseService.subscribe('notifications', updateNotifDot);
      }
    }

    // Role Guard: Cloud Sync button & warning banner are strictly for Admin / Super Admin only!
    // Students must NEVER see Cloud Sync in any form in their portal or dashboard.
    const cloudBtn = document.getElementById('btn-cloud-sync');
    const cloudBanner = document.getElementById('cloud-warning-banner');
    const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

    if (cloudBtn) {
      if (isAdmin) {
        cloudBtn.style.setProperty('display', 'inline-flex', 'important');
        cloudBtn.removeAttribute('aria-hidden');
      } else {
        cloudBtn.style.setProperty('display', 'none', 'important');
        cloudBtn.setAttribute('aria-hidden', 'true');
      }
    }

    if (cloudBanner) {
      if (!isAdmin) {
        cloudBanner.style.setProperty('display', 'none', 'important');
      }
    }

    if (user && user.role === 'student') {
      document.body.classList.add('role-student');
      document.body.classList.remove('role-admin');
    } else {
      document.body.classList.remove('role-student');
      document.body.classList.add('role-admin');
    }
  }

  /**
   * Render Role Specific Sidebar
   */
  renderRoleSidebar(role) {
    const nav = document.getElementById('sidebar-nav-items');
    if (!nav) return;

    if (role === 'super_admin') {
      nav.innerHTML = `
        <span class="nav-section-title">Control Center</span>
        <a class="nav-item" href="#super-admin-dashboard" data-route="super-admin-dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Dashboard
        </a>
        <a class="nav-item" href="#students" data-route="students">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Students
        </a>
        <a class="nav-item" href="#admin-management" data-route="admin-management">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          Admin Management
        </a>
        <a class="nav-item" href="#fees" data-route="fees">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          Fee Management
        </a>
        <a class="nav-item" href="#attendance" data-route="attendance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Attendance
        </a>
        <a class="nav-item" href="#announcements" data-route="announcements">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Announcements
        </a>
        <a class="nav-item" href="#diary" data-route="diary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          Diary
        </a>
        <a class="nav-item" href="#syllabus" data-route="syllabus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          Syllabus & Books
        </a>
        <a class="nav-item" href="#reports" data-route="reports">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          Reports
        </a>
        <span class="nav-section-title">Administration</span>
        <a class="nav-item" href="#whatsapp-settings" data-route="whatsapp-settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          WhatsApp Communication
        </a>
        <a class="nav-item" href="#system-settings" data-route="system-settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          System Settings
        </a>
        <a class="nav-item" href="#audit-logs" data-route="audit-logs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          Audit Logs
        </a>
        <a class="nav-item" href="#account-settings" data-route="account-settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Account Settings
        </a>
        <a class="nav-item" href="javascript:void(0)" id="sidebar-logout-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout
        </a>
      `;
    } else if (role === 'admin') {
      nav.innerHTML = `
        <span class="nav-section-title">Coaching Operations</span>
        <a class="nav-item" href="#admin-dashboard" data-route="admin-dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Dashboard
        </a>
        <a class="nav-item" href="#add-student" data-route="add-student">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Student
        </a>
        <a class="nav-item" href="#students" data-route="students">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          All Students
        </a>
        <a class="nav-item" href="#fees" data-route="fees">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          Fee Management
        </a>
        <a class="nav-item" href="#attendance" data-route="attendance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Attendance
        </a>
        <a class="nav-item" href="#announcements" data-route="announcements">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Announcements
        </a>
        <a class="nav-item" href="#diary" data-route="diary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          Diary
        </a>
        <a class="nav-item" href="#syllabus" data-route="syllabus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          Syllabus & Books
        </a>
        <a class="nav-item" href="#reports" data-route="reports">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          Reports
        </a>
        <a class="nav-item" href="#whatsapp-settings" data-route="whatsapp-settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          WhatsApp Messages
        </a>
        <span class="nav-section-title">Personal</span>
        <a class="nav-item" href="#account-settings" data-route="account-settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Account Settings
        </a>
        <a class="nav-item" href="javascript:void(0)" id="sidebar-logout-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout
        </a>
      `;
    } else {
      // Student Sidebar
      nav.innerHTML = `
        <span class="nav-section-title">Student Portal</span>
        <a class="nav-item" href="#student-dashboard" data-route="student-dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Dashboard
        </a>
        <a class="nav-item" href="#student-profile" data-route="student-profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          My Profile
        </a>
        <a class="nav-item" href="#student-fees" data-route="student-fees">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          Fee Details
        </a>
        <a class="nav-item" href="#student-attendance" data-route="student-attendance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Attendance
        </a>
        <a class="nav-item" href="#student-announcements" data-route="student-announcements">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Announcements
        </a>
        <a class="nav-item" href="#student-diary" data-route="student-diary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          Today's Diary
        </a>
        <a class="nav-item" href="#student-syllabus" data-route="student-syllabus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          Syllabus & Books
        </a>
        <a class="nav-item" href="#student-notifications" data-route="student-notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Notifications
        </a>
        <a class="nav-item" href="javascript:void(0)" id="sidebar-logout-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Logout
        </a>
      `;
    }

    const logoutBtn = nav.querySelector('#sidebar-logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => window.AuthService.logout();
    }
  }

  highlightActiveNavItem(route) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      const itemRoute = item.getAttribute('data-route');
      if (itemRoute === route) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  updateBreadcrumbs(route) {
    const titleEl = document.getElementById('breadcrumb-title');
    const pathEl = document.getElementById('breadcrumb-path');
    if (!titleEl) return;

    const titles = {
      'super-admin-dashboard': 'Super Admin Dashboard',
      'admin-dashboard': 'Administrator Dashboard',
      'student-dashboard': 'Student Portal Dashboard',
      'students': 'Students Directory',
      'add-student': 'Enroll New Student',
      'admin-management': 'Admin Management',
      'fees': '12-Month Fee Management',
      'attendance': 'Daily Attendance System',
      'announcements': 'Circulars & Announcements',
      'diary': 'Daily Homework Diary',
      'syllabus': 'Syllabus & Curriculum',
      'reports': 'Analytics & Reports',
      'system-settings': 'System Settings',
      'whatsapp-settings': 'WhatsApp Communication & Settings',
      'audit-logs': 'Audit Trails & Security Logs',
      'account-settings': 'Account Settings',
      'student-profile': 'My Student Profile',
      'student-fees': 'My Fee Schedule & Receipts',
      'student-attendance': 'My Attendance Record',
      'student-announcements': 'Class Announcements',
      'student-diary': "Today's Homework Diary",
      'student-syllabus': 'My Books & Syllabus Progress',
      'student-notifications': 'My Notifications'
    };

    const title = titles[route] || 'Ideal Coaching Center';
    titleEl.textContent = title;
    if (pathEl) {
      pathEl.textContent = `Ideal Coaching Center / ${title}`;
    }
  }

  /**
   * Render Account Settings
   */
  async renderAccountSettings(container, user) {
    container.innerHTML = `
      <div class="data-card" style="max-width: 640px; margin: 0 auto;">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">Account Settings</h2>
            <span class="data-card-subtitle">Manage your credentials securely • Ideal Coaching Center</span>
          </div>
        </div>

        <div style="padding: 2rem;">
          <form id="account-settings-form" class="form-grid">
            <div class="form-group form-col-full">
              <label class="form-label">Name / Display Title</label>
              <input type="text" class="form-control" value="${user.fullName || user.name || ''}" disabled style="background: var(--slate-100);" />
            </div>

            <div class="form-group form-col-full">
              <label class="form-label">Email / Identifier</label>
              <input type="text" class="form-control" value="${user.email || user.rollNumber || ''}" disabled style="background: var(--slate-100);" />
            </div>

            <div class="form-col-full" style="border-top: 1px solid var(--border-color); padding-top: 1.25rem; margin-top: 0.5rem;">
              <h3 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem;">Update Password / Access Key</h3>
              <p style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 1rem;">Changes are securely authenticated through Firebase.</p>
            </div>

            <div class="form-group form-col-full">
              <label class="form-label">New Password / PIN <span class="req-star">*</span></label>
              <input type="password" id="input-new-password" class="form-control" placeholder="••••••••" required />
            </div>

            <div class="form-group form-col-full">
              <label class="form-label">Confirm New Password <span class="req-star">*</span></label>
              <input type="password" id="input-confirm-password" class="form-control" placeholder="••••••••" required />
            </div>

            <div class="form-col-full" style="display: flex; justify-content: flex-end; margin-top: 1rem;">
              <button type="button" class="btn btn-primary" id="btn-save-pwd">
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    container.querySelector('#btn-save-pwd').onclick = async () => {
      const p1 = container.querySelector('#input-new-password').value.trim();
      const p2 = container.querySelector('#input-confirm-password').value.trim();

      if (!p1 || p1.length < 4) {
        window.UIUtils.showToast('error', 'Weak Password', 'Password must be at least 4 characters.');
        return;
      }

      if (p1 !== p2) {
        window.UIUtils.showToast('error', 'Mismatch', 'Passwords do not match.');
        return;
      }

      await window.GlobalLoader.wrap(async () => {
        if (user.role === 'admin') {
          await window.FirebaseService.updateDocument('admins', user.id, { password: p1 });
        } else if (user.role === 'student') {
          await window.FirebaseService.updateDocument('students', user.id, { password: p1, credentialPin: p1 });
        }
        await window.AuditService.log({
          action: 'Password Changed',
          category: 'Security',
          details: `Password changed for ${user.fullName || user.rollNumber}`
        });
      }, 'Updating credentials securely in Firebase Auth...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Password Updated', 'Your credentials have been securely updated.');
      container.querySelector('#input-new-password').value = '';
      container.querySelector('#input-confirm-password').value = '';
    };
  }

  /**
   * Render Universal Login Page
   * Single clean login form for Ideal Coaching Center
   * Requires Email and Password for all roles (Super Admin, Admin, and Student)
   */
  renderLoginPage() {
    const loginContainer = document.getElementById('login-view-container');
    const portalContainer = document.getElementById('app-portal-layout');
    if (portalContainer) portalContainer.style.display = 'none';
    if (!loginContainer) return;

    loginContainer.style.display = 'flex';
    loginContainer.innerHTML = `
      <div class="login-card">
        <div class="login-header">
          <img src="assets/logo.svg" alt="Ideal Coaching Center" class="login-logo" />
          <h1 class="login-title">Ideal Coaching Center</h1>
          <p class="login-subtitle">Academic Management Portal</p>
        </div>

        <div class="login-form-wrapper">
          <form id="portal-login-form">
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label" for="login-email">Email Address <span class="req-star">*</span></label>
              <input type="email" id="login-email" class="form-control" placeholder="name@ideal.edu" required autocomplete="username" />
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" for="login-password">Password <span class="req-star">*</span></label>
              <input type="password" id="login-password" class="form-control" placeholder="••••••••" required autocomplete="current-password" />
            </div>

            <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;" id="btn-login-submit">
              Sign In to Portal
            </button>
          </form>
        </div>

        <div style="padding: 0.85rem 1.75rem; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--slate-500); background: var(--slate-50); border-bottom-left-radius: var(--radius-lg); border-bottom-right-radius: var(--radius-lg);">
          <span>Ideal Coaching Center • Official Student & Administration Portal</span>
        </div>
      </div>
    `;

    const loginForm = loginContainer.querySelector('#portal-login-form');
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = loginContainer.querySelector('#login-email').value;
      const pwd = loginContainer.querySelector('#login-password').value;

      try {
        const user = await window.AuthService.login(email, pwd);
        window.UIUtils.showToast('success', 'Welcome', `Welcome, ${user.fullName || 'User'}!`);
        if (user.role === 'student') {
          this.navigate('student-dashboard');
        } else if (user.role === 'super_admin') {
          this.navigate('super-admin-dashboard');
        } else {
          this.navigate('admin-dashboard');
        }
      } catch (err) {
        window.UIUtils.showToast('error', 'Authentication Failed', err.friendlyMessage || 'Invalid email or password. Please check your credentials and try again.');
      }
    };
  }
}

window.AppRouter = new AppRouter();
