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

    // Stop active camera hardware stream if leaving QR attendance terminal
    if (routeKey !== 'qr-attendance' && window.QRAttendanceView && typeof window.QRAttendanceView.stopCamera === 'function') {
      window.QRAttendanceView.stopCamera();
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
      else if (currentUser.role === 'teacher') route = 'teacher-dashboard';
      else if (currentUser.role === 'student') route = 'student-dashboard';
    }

    // 3. Security Route Protection
    if (currentUser.role === 'teacher') {
      const teacherAllowedRoutes = [
        'teacher-dashboard', 'teacher-timetable', 'teacher-classes',
        'teacher-attendance', 'teacher-salary', 'teacher-badge',
        'teacher-profile', 'notifications-center', 'account-settings'
      ];
      if (!teacherAllowedRoutes.includes(route)) {
        window.UIUtils.showToast('error', 'Access Denied', 'Teacher portal is restricted to teacher academic tools.');
        route = 'teacher-dashboard';
      }
      document.body.classList.add('role-teacher');
      document.body.classList.remove('role-admin', 'role-student');
      const cBtn = document.getElementById('btn-cloud-sync');
      if (cBtn) {
        cBtn.style.setProperty('display', 'none', 'important');
        cBtn.setAttribute('aria-hidden', 'true');
      }
      const cBanner = document.getElementById('cloud-warning-banner');
      if (cBanner) {
        cBanner.style.setProperty('display', 'none', 'important');
      }
    } else if (currentUser.role === 'student' || route.startsWith('student-')) {
      const studentAllowedRoutes = [
        'student-dashboard', 'student-profile', 'student-fees', 'student-exam-fees',
        'student-attendance', 'student-attendance-card', 'student-announcements',
        'student-diary', 'student-syllabus', 'student-notifications', 'account-settings'
      ];
      if (!studentAllowedRoutes.includes(route)) {
        window.UIUtils.showToast('error', 'Access Denied', 'Students are restricted to their student portal.');
        route = 'student-dashboard';
      }
      document.body.classList.add('role-student');
      document.body.classList.remove('role-admin', 'role-teacher');
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
      const superAdminOnlyRoutes = ['admin-management', 'system-settings', 'audit-logs', 'promotions', 'approvals', 'receipt-customizer'];
      if (superAdminOnlyRoutes.includes(route)) {
        window.UIUtils.showToast('error', 'Restricted Function', 'This section requires Super Admin authorization.');
        route = 'admin-dashboard';
      }
      document.body.classList.add('role-admin');
      document.body.classList.remove('role-student', 'role-teacher');
    } else {
      document.body.classList.add('role-admin');
      document.body.classList.remove('role-student', 'role-teacher');
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

        // Core Academic & Operational Modules
        case 'fees':
          await window.FeesView.render(container);
          break;
        case 'examination-fees':
          await window.ExaminationFeesView.render(container);
          break;
        case 'teacher-management':
          await window.TeacherManagementView.render(container);
          break;
        case 'timetables':
          await window.TimetablesView.render(container);
          break;
        case 'attendance':
          await window.AttendanceView.render(container);
          break;
        case 'attendance-cards':
          await window.AttendanceCardsView.render(container);
          break;
        case 'qr-attendance':
          await window.QRAttendanceView.render(container);
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

        // Institutional Governance & Advanced Administration
        case 'payroll':
          await window.PayrollView.render(container);
          break;
        case 'promotions':
          await window.PromotionsView.render(container);
          break;
        case 'approvals':
          await window.ApprovalsView.render(container);
          break;
        case 'receipt-customizer':
          await window.ReceiptCustomizerView.render(container);
          break;
        case 'notifications-center':
          await window.NotificationsCenterView.render(container);
          break;

        // Teacher Portal
        case 'teacher-dashboard':
          await window.TeacherPortalView.renderDashboard(container);
          break;
        case 'teacher-timetable':
          await window.TeacherPortalView.renderTimetable(container);
          break;
        case 'teacher-classes':
          await window.TeacherPortalView.renderClasses(container);
          break;
        case 'teacher-attendance':
          await window.TeacherPortalView.renderAttendance(container);
          break;
        case 'teacher-salary':
          await window.TeacherPortalView.renderSalary(container);
          break;
        case 'teacher-badge':
          await window.TeacherPortalView.renderBadge(container);
          break;
        case 'teacher-profile':
          await window.TeacherPortalView.renderProfile(container);
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
        case 'student-exam-fees':
          await window.ExaminationFeesView.renderStudentExamFees(container, currentUser);
          break;
        case 'student-attendance':
          await window.StudentPortalView.renderAttendance(container);
          break;
        case 'student-attendance-card':
          await window.StudentPortalView.renderAttendanceCard(container);
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
          } else if (currentUser.role === 'teacher') {
            await window.TeacherPortalView.renderDashboard(container);
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
          Students Directory
        </a>
        <a class="nav-item" href="#add-student" data-route="add-student">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Enroll Student
        </a>
        <a class="nav-item" href="#teacher-management" data-route="teacher-management">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Teachers Directory
        </a>
        <a class="nav-item" href="#timetables" data-route="timetables">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Master Timetables
        </a>
        <a class="nav-item" href="#admin-management" data-route="admin-management">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          Admin Management
        </a>

        <span class="nav-section-title">Academic Operations</span>
        <a class="nav-item" href="#fees" data-route="fees">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          Fee Management
        </a>
        <a class="nav-item" href="#examination-fees" data-route="examination-fees">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          Examination Fees
        </a>
        <a class="nav-item" href="#qr-attendance" data-route="qr-attendance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          Live QR Scanner
        </a>
        <a class="nav-item" href="#attendance-cards" data-route="attendance-cards">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="13" y2="12"></line></svg>
          Attendance Badges
        </a>
        <a class="nav-item" href="#attendance" data-route="attendance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Attendance Sheets
        </a>
        <a class="nav-item" href="#announcements" data-route="announcements">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Announcements
        </a>
        <a class="nav-item" href="#diary" data-route="diary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          Daily Diary
        </a>
        <a class="nav-item" href="#syllabus" data-route="syllabus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          Syllabus & Books
        </a>

        <span class="nav-section-title">Finance & Governance</span>
        <a class="nav-item" href="#payroll" data-route="payroll">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          Faculty Payroll
        </a>
        <a class="nav-item" href="#approvals" data-route="approvals">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          Approval Workflows
        </a>
        <a class="nav-item" href="#promotions" data-route="promotions">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          Student Promotions
        </a>
        <a class="nav-item" href="#reports" data-route="reports">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          Reports & Analytics
        </a>

        <span class="nav-section-title">Administration</span>
        <a class="nav-item" href="#receipt-customizer" data-route="receipt-customizer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Receipt Customizer
        </a>
        <a class="nav-item" href="#notifications-center" data-route="notifications-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Notifications Center
        </a>
        <a class="nav-item" href="#system-settings" data-route="system-settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          System Settings Hub
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
          Enroll Student
        </a>
        <a class="nav-item" href="#students" data-route="students">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
          All Students
        </a>
        <a class="nav-item" href="#teacher-management" data-route="teacher-management">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Teachers Directory
        </a>
        <a class="nav-item" href="#timetables" data-route="timetables">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          Class Timetables
        </a>
        <a class="nav-item" href="#fees" data-route="fees">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          Fee Management
        </a>
        <a class="nav-item" href="#examination-fees" data-route="examination-fees">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          Examination Fees
        </a>
        <a class="nav-item" href="#qr-attendance" data-route="qr-attendance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          Live QR Scanner
        </a>
        <a class="nav-item" href="#attendance-cards" data-route="attendance-cards">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="13" y2="12"></line></svg>
          Attendance Badges
        </a>
        <a class="nav-item" href="#attendance" data-route="attendance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Attendance Sheets
        </a>
        <a class="nav-item" href="#announcements" data-route="announcements">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Announcements
        </a>
        <a class="nav-item" href="#diary" data-route="diary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          Daily Diary
        </a>
        <a class="nav-item" href="#syllabus" data-route="syllabus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          Syllabus & Books
        </a>
        <a class="nav-item" href="#reports" data-route="reports">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          Reports & Analytics
        </a>

        <span class="nav-section-title">Personal</span>
        <a class="nav-item" href="#notifications-center" data-route="notifications-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Notifications Center
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
    } else if (role === 'teacher') {
      nav.innerHTML = `
        <span class="nav-section-title">Faculty Portal</span>
        <a class="nav-item" href="#teacher-dashboard" data-route="teacher-dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Dashboard
        </a>
        <a class="nav-item" href="#teacher-profile" data-route="teacher-profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          My Profile
        </a>
        <a class="nav-item" href="#teacher-timetable" data-route="teacher-timetable">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          My Timetable
        </a>
        <a class="nav-item" href="#teacher-classes" data-route="teacher-classes">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          My Classes
        </a>
        <a class="nav-item" href="#teacher-attendance" data-route="teacher-attendance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          My Attendance
        </a>
        <a class="nav-item" href="#teacher-salary" data-route="teacher-salary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          Salary Statements
        </a>
        <a class="nav-item" href="#teacher-badge" data-route="teacher-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="13" y2="12"></line></svg>
          My QR Gate Pass
        </a>
        <a class="nav-item" href="#notifications-center" data-route="notifications-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          Notifications
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
        <a class="nav-item" href="#student-exam-fees" data-route="student-exam-fees">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          Examination Fees
        </a>
        <a class="nav-item" href="#student-attendance" data-route="student-attendance">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Attendance Record
        </a>
        <a class="nav-item" href="#student-attendance-card" data-route="student-attendance-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="16" rx="2"></rect><line x1="7" y1="8" x2="17" y2="8"></line><line x1="7" y1="12" x2="13" y2="12"></line></svg>
          My QR Gate Pass
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
      'teacher-dashboard': 'Faculty Portal Dashboard',
      'teacher-timetable': 'My Teaching Timetable',
      'teacher-classes': 'My Assigned Classes & Subjects',
      'teacher-attendance': 'My Attendance Record',
      'teacher-salary': 'My Salary Slips & Statements',
      'teacher-badge': 'My Digital QR Attendance Badge',
      'teacher-profile': 'My Faculty Profile',
      'student-dashboard': 'Student Portal Dashboard',
      'student-profile': 'My Student Profile',
      'student-fees': 'My Fee Schedule & Receipts',
      'student-exam-fees': 'My Examination Fees & Slips',
      'student-attendance': 'My Attendance Record',
      'student-attendance-card': 'My Digital Attendance Gate Pass',
      'student-announcements': 'Class Announcements & Circulars',
      'student-diary': "Today's Homework Diary",
      'student-syllabus': 'My Books & Syllabus Progress',
      'student-notifications': 'My Notifications',
      'students': 'Students Directory',
      'add-student': 'Enroll New Student',
      'admin-management': 'Admin Management',
      'teacher-management': 'Teacher Directory & Faculty Management',
      'timetables': 'Timetable Management & Conflict Resolution',
      'fees': '12-Month Fee Management',
      'examination-fees': 'Examination Fee Management',
      'attendance': 'Daily Attendance Register',
      'attendance-cards': 'QR Attendance Identity Cards',
      'qr-attendance': 'Live Camera QR Gate Scanner',
      'announcements': 'Circulars & Announcements',
      'diary': 'Daily Homework Diary',
      'syllabus': 'Syllabus & Curriculum Tracker',
      'reports': 'Analytics, Financial & Academic Reports',
      'payroll': 'Faculty Payroll & Salary Disbursement',
      'promotions': 'Student Academic Progression & Promotion',
      'approvals': 'Approval Workflows & Audit Center',
      'receipt-customizer': 'Official Receipt Template Customizer',
      'notifications-center': 'Unified Notifications Hub',
      'system-settings': 'System Configuration & Settings Hub',
      'audit-logs': 'Audit Trails & Security Logs',
      'account-settings': 'Account Security & Settings'
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
              <input type="text" class="form-control" value="${user.email || user.rollNumber || user.teacherId || ''}" disabled style="background: var(--slate-100);" />
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
        } else if (user.role === 'teacher') {
          await window.FirebaseService.updateDocument('teachers', user.id, { password: p1 });
        } else if (user.role === 'student') {
          await window.FirebaseService.updateDocument('students', user.id, { password: p1, credentialPin: p1 });
        }
        await window.AuditService.log({
          action: 'Password Changed',
          category: 'Security',
          details: `Password changed for ${user.fullName || user.rollNumber || user.teacherId}`
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
   * Requires Email and Password for all roles (Super Admin, Admin, Teacher, and Student)
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
              <label class="form-label" for="login-email">Email Address / ID <span class="req-star">*</span></label>
              <input type="text" id="login-email" class="form-control" placeholder="name@ideal.edu or ID" required autocomplete="username" />
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
          <span>Ideal Coaching Center • Official Academic & Administration Portal</span>
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
        } else if (user.role === 'teacher') {
          this.navigate('teacher-dashboard');
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
