/**
 * Ideal Coaching Center - Audit Log Service
 * Records administrative and operational changes to Firestore
 */

const AuditService = {
  /**
   * Log an administrative action to the audit_logs collection
   */
  async log({
    action,
    category = 'General',
    targetType = 'System',
    targetId = '',
    details = '',
    previousValue = null,
    newValue = null
  }) {
    try {
      const currentUser = window.AuthService?.getCurrentUser() || {
        name: 'System Admin',
        role: 'super_admin',
        email: 'superadmin@ideal.edu'
      };

      const auditRecord = {
        action,
        category,
        targetType,
        targetId,
        details,
        previousValue,
        newValue,
        performedBy: {
          name: currentUser.name || currentUser.fullName || 'Authorized Admin',
          role: currentUser.role,
          email: currentUser.email || currentUser.username || 'admin@ideal.edu'
        },
        timestamp: new Date().toISOString()
      };

      if (window.FirebaseService) {
        await window.FirebaseService.addDocument('audit_logs', auditRecord);
      }
      return auditRecord;
    } catch (err) {
      console.warn('Failed to record audit log:', err);
    }
  }
};

window.AuditService = AuditService;
