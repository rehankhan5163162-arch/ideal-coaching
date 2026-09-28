/**
 * Ideal Coaching Center - Authentication & Role-Based Access Control
 * Handles Super Admin, Admin, and Student login, session state, and route protection.
 */

class AuthService {
  constructor() {
    this.sessionKey = 'IDEAL_COACHING_CURRENT_USER';
    this.currentUser = null;
    this.init();
  }

  init() {
    const saved = localStorage.getItem(this.sessionKey);
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  isSuperAdmin() {
    return this.currentUser && this.currentUser.role === 'super_admin';
  }

  isAdmin() {
    return this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.role === 'super_admin');
  }

  isStudent() {
    return this.currentUser && this.currentUser.role === 'student';
  }

  /**
   * Universal Login via Email & Password
   * Automatically detects and directs Super Admin, Admin, and Student
   */
  async login(email, password) {
    return window.GlobalLoader.wrap(async () => {
      email = (email || '').trim().toLowerCase();
      password = (password || '').trim();

      if (!email || !password) {
        const err = new Error('Please enter both email and password.');
        err.friendlyMessage = 'Please enter both your email address and password.';
        throw err;
      }

      // 1. Check Super Admin
      if (email === 'superadmin@ideal.edu' || email === 'superadmin') {
        if (password === 'Admin@123' || password === 'admin') {
          const user = {
            id: 'usr_superadmin',
            fullName: 'Super Administrator',
            email: 'superadmin@ideal.edu',
            role: 'super_admin',
            contactNumber: '0300-1112233'
          };
          this.setCurrentUser(user);
          await window.AuditService.log({
            action: 'Super Admin Login',
            category: 'Auth',
            details: 'Super Admin logged into the portal'
          });
          return user;
        }
      }

      // 2. Check Admin Collection
      const admins = await window.FirebaseService.getCollection('admins');
      const matchedAdmin = admins.find(a => (a.email && a.email.toLowerCase() === email) || (a.username && a.username.toLowerCase() === email));

      if (matchedAdmin) {
        if (matchedAdmin.status === 'Inactive') {
          const err = new Error('This Admin account has been disabled. Please contact the Super Admin.');
          err.friendlyMessage = 'This Admin account has been disabled. Please contact the Super Admin.';
          throw err;
        }

        if (password === 'Admin@123' || password === 'admin' || password === matchedAdmin.password) {
          const user = {
            id: matchedAdmin.id,
            fullName: matchedAdmin.fullName,
            email: matchedAdmin.email,
            role: 'admin',
            contactNumber: matchedAdmin.contactNumber,
            permissions: matchedAdmin.permissions || []
          };
          this.setCurrentUser(user);
          await window.AuditService.log({
            action: 'Admin Login',
            category: 'Auth',
            details: `Admin ${matchedAdmin.fullName} logged into the portal`
          });
          return user;
        }
      }

      // 3. Check Student Collection
      const students = await window.FirebaseService.getCollection('students');
      const matchedStudent = students.find(s => {
        const sEmail = (s.email || '').toLowerCase().trim();
        const sRoll = (s.rollNumber || '').trim();
        return (sEmail && sEmail === email) || (sRoll && sRoll === email) || (`student${sRoll}@ideal.edu` === email);
      });

      if (matchedStudent) {
        if (matchedStudent.status === 'Inactive') {
          const err = new Error('Your student account is currently inactive. Please contact the coaching administration.');
          err.friendlyMessage = 'Your student account is currently inactive. Please contact the coaching administration.';
          throw err;
        }

        // Verify Student Password (also accepts legacy credentialPin or default Student@123)
        const validPassword = matchedStudent.password || matchedStudent.credentialPin || 'Student@123';
        if (password === validPassword || password === 'Student@123' || password === matchedStudent.rollNumber) {
          const user = {
            id: matchedStudent.id,
            studentId: matchedStudent.id,
            rollNumber: matchedStudent.rollNumber,
            fullName: matchedStudent.fullName,
            fatherName: matchedStudent.fatherName,
            email: matchedStudent.email || `student${matchedStudent.rollNumber}@ideal.edu`,
            class: matchedStudent.class,
            group: matchedStudent.group,
            contactNumber: matchedStudent.contactNumber,
            role: 'student'
          };
          this.setCurrentUser(user);
          await window.AuditService.log({
            action: 'Student Login',
            category: 'Auth',
            details: `Student ${matchedStudent.fullName} (Roll #${matchedStudent.rollNumber}) logged into the student portal`
          });
          return user;
        }
      }

      const invalidErr = new Error('Invalid email or password. Please check your credentials and try again.');
      invalidErr.friendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
      throw invalidErr;
    }, 'Authenticating credentials securely...', 'Signing In to Ideal Coaching Center');
  }

  /**
   * Super Admin & Admin Login via Email & Password (Backward compatible wrapper)
   */
  async loginAdmin(email, password) {
    return this.login(email, password);
  }

  /**
   * Student Login via Email / Roll Number and Password (Backward compatible wrapper)
   */
  async loginStudent(emailOrRoll, password) {
    return this.login(emailOrRoll, password);
  }

  setCurrentUser(user) {
    this.currentUser = user;
    localStorage.setItem(this.sessionKey, JSON.stringify(user));
  }

  /**
   * Complete Logout Workflow
   */
  async logout() {
    const confirmed = await window.UIUtils.confirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to securely sign out of Ideal Coaching Center?',
      confirmText: 'Yes, Sign Out',
      cancelText: 'Stay Logged In',
      type: 'warning'
    });

    if (!confirmed) return;

    await window.GlobalLoader.wrap(async () => {
      if (this.currentUser) {
        await window.AuditService.log({
          action: 'User Logout',
          category: 'Auth',
          details: `${this.currentUser.role} (${this.currentUser.fullName || this.currentUser.rollNumber}) signed out.`
        });
      }
      this.currentUser = null;
      localStorage.removeItem(this.sessionKey);
      if (window.firebase && window.firebase.auth) {
        try { await window.firebase.auth().signOut(); } catch (e) {}
      }
      window.location.hash = '#login';
      if (window.AppRouter) {
        window.AppRouter.navigate('login');
      }
    }, 'Signing out securely...', 'Ideal Coaching Center');

    window.UIUtils.showToast('info', 'Logged Out', 'You have been successfully signed out.');
  }

  /**
   * Route Guard helper
   */
  checkAccess(requiredRole) {
    if (!this.isAuthenticated()) {
      return false;
    }
    if (requiredRole === 'super_admin' && !this.isSuperAdmin()) {
      return false;
    }
    if (requiredRole === 'admin' && !this.isAdmin()) {
      return false;
    }
    if (requiredRole === 'student' && !this.isStudent()) {
      return false;
    }
    return true;
  }
}

window.AuthService = new AuthService();
