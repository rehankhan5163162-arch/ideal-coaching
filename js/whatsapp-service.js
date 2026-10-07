/**
 * Ideal Coaching Center - WhatsApp Communication & Notification Service
 * Provider-Independent Architecture (Meta Cloud API / Twilio / Infobip / Serverless Webhook)
 * Handles configuration, dynamic placeholder replacement, phone normalization,
 * deduplication safeguards, automated event hooks, manual/bulk dispatch, and logging.
 */

class WhatsAppService {
  constructor() {
    this.COLLECTION_SETTINGS = 'settings';
    this.DOC_SETTINGS = 'whatsapp_settings';
    this.COLLECTION_TEMPLATES = 'whatsapp_templates';
    this.COLLECTION_LOGS = 'whatsapp_logs';

    this.defaultSettings = {
      id: 'whatsapp_settings',
      schoolNumber: '03001234567',
      countryCode: '+92',
      businessAccountName: 'Ideal Coaching Center Official',
      apiProvider: 'meta_cloud', // 'meta_cloud' | 'twilio' | 'infobip' | 'custom_webhook'
      apiBaseUrl: 'https://graph.facebook.com/v19.0',
      endpointUrl: '', // Secure serverless function URL (e.g., https://api.idealcoaching.edu.pk/whatsapp/send)
      accessTokenPlaceholder: '••••••••••••••••••••••••••••••••',
      businessAccountId: 'waba_acc_ideal_9921',
      phoneNumberId: 'phone_id_9921001',
      enabled: true, // Master WhatsApp Notification Toggle
      automationMasterSwitch: true, // Master Switch for Automated Triggers
      allowMarketing: false, // Promotional messages toggle (disabled by default)
      duplicateCooldownMinutes: 60, // 60-minute anti-spam cooldown per student/event
      lastConnectionCheck: null,
      connectionStatus: 'configured' // 'configured' | 'connected' | 'unconfigured' | 'paused'
    };

    this.defaultAutomations = {
      student_absent: { enabled: true, rule: 'immediate', title: 'Student Absent Notification' },
      student_late: { enabled: true, rule: 'immediate', title: 'Student Late Arrival Notification' },
      fee_due: { enabled: true, rule: 'scheduled', daysBefore: 3, title: 'Fee Due Upcoming Alert' },
      fee_overdue: { enabled: true, rule: 'scheduled', daysAfter: 2, title: 'Fee Overdue Alert' },
      fee_payment_received: { enabled: true, rule: 'immediate', title: 'Fee Payment Received Confirmation' },
      fee_reminder: { enabled: true, rule: 'scheduled', title: 'General Monthly Fee Reminder' },
      exam_result_published: { enabled: true, rule: 'immediate', title: 'Exam Result Announcement' },
      student_report_available: { enabled: true, rule: 'manual', title: 'Student Progress Report Available' },
      attendance_report_available: { enabled: true, rule: 'manual', title: 'Monthly Attendance Report Summary' },
      new_announcement: { enabled: true, rule: 'immediate', title: 'General Coaching Announcement' },
      important_announcement: { enabled: true, rule: 'immediate', title: 'Urgent Circular / Alert' },
      homework_assignment: { enabled: false, rule: 'manual', title: 'Daily Diary / Homework Notice' },
      exam_schedule: { enabled: true, rule: 'manual', title: 'Exam Date Sheet / Schedule' },
      admission_confirmation: { enabled: true, rule: 'immediate', title: 'Admission / Enrollment Welcome' },
      student_account_created: { enabled: true, rule: 'immediate', title: 'Student Portal Credentials' },
      password_account_info: { enabled: false, rule: 'manual', title: 'Account Security Notice' },
      custom_admin_message: { enabled: true, rule: 'manual', title: 'Custom Direct Admin Message' }
    };

    this.defaultTemplates = {
      student_absent: {
        id: 'student_absent',
        title: 'Student Absence Notice',
        category: 'Attendance',
        enabled: true,
        text: 'Dear Parent/Guardian, this is to inform you that {{student_name}} (Roll #{{student_roll}}, Class {{class}} - {{group}}) was marked ABSENT today on {{date}} from Ideal Coaching Center. Regular attendance is critical for board exam preparation. Please contact {{school_name}} if this absence requires clarification.\n\nRegards,\nIdeal Coaching Center\nHelpline: +92 300 1234567'
      },
      student_late: {
        id: 'student_late',
        title: 'Student Late Arrival Notice',
        category: 'Attendance',
        enabled: true,
        text: 'Dear Parent/Guardian, {{student_name}} (Roll #{{student_roll}}, Class {{class}}) arrived late to Ideal Coaching Center today on {{date}} at {{time}}. Kindly ensure timely arrival to avoid missing core lectures.\n\nRegards,\nIdeal Coaching Center'
      },
      fee_payment_received: {
        id: 'fee_payment_received',
        title: 'Fee Payment Confirmation & Receipt',
        category: 'Finance',
        enabled: true,
        text: 'Dear Parent/Guardian, fee payment of PKR {{paid_amount}} for {{student_name}} (Roll #{{student_roll}}, Class {{class}}) has been successfully received at Ideal Coaching Center. Official 10-Digit Receipt #{{receipt_number}} has been issued for {{fee_month}}. Remaining balance: PKR {{remaining_amount}}. Verified receipt is viewable in your Student Portal.\n\nThank you,\nIdeal Coaching Center'
      },
      fee_due: {
        id: 'fee_due',
        title: 'Fee Due Upcoming Notice',
        category: 'Finance',
        enabled: true,
        text: 'Dear Parent/Guardian, coaching tuition fee for {{student_name}} (Class {{class}}, Roll #{{student_roll}}) for {{fee_month}} is due on {{due_date}}. Payable amount: PKR {{fee_amount}}. Please deposit dues at the cash counter or bank transfer before the due date. Thank you.\n\nIdeal Coaching Center Accounts'
      },
      fee_overdue: {
        id: 'fee_overdue',
        title: 'Fee Overdue Alert',
        category: 'Finance',
        enabled: true,
        text: 'URGENT NOTICE: Dear Parent/Guardian, tuition fee for {{student_name}} (Roll #{{student_roll}}, Class {{class}}) is currently OVERDUE. Outstanding amount: PKR {{fee_amount}}. Kindly visit the accounts office immediately to clear pending dues and avoid late fine.\n\nIdeal Coaching Center Accounts Office'
      },
      fee_reminder: {
        id: 'fee_reminder',
        title: 'Monthly Fee Gentle Reminder',
        category: 'Finance',
        enabled: true,
        text: 'Dear Parent/Guardian, this is a gentle reminder that monthly coaching fees for {{student_name}} (Roll #{{student_roll}}, Class {{class}}) for {{fee_month}} are due on 10th {{fee_month}}. Fee amount: PKR {{fee_amount}}. Thank you for your continued cooperation.\n\nIdeal Coaching Center'
      },
      exam_result_published: {
        id: 'exam_result_published',
        title: 'Exam Result Announcement',
        category: 'Academics',
        enabled: true,
        text: 'Dear Parent/Guardian, official results for {{exam_name}} have been published. {{student_name}} (Roll #{{student_roll}}, Class {{class}}) secured {{percentage}}% (Result: {{result}}). Detailed subject-wise breakdown is available in the Student Portal: {{report_link}}.\n\nCongratulations,\nIdeal Coaching Center'
      },
      student_report_available: {
        id: 'student_report_available',
        title: 'Student Progress Report Available',
        category: 'Academics',
        enabled: true,
        text: 'Dear Parent/Guardian, the comprehensive academic and behavioral progress report for {{student_name}} (Class {{class}}) is now compiled. You can review detailed performance insights directly on the Student Portal.\n\nIdeal Coaching Center'
      },
      attendance_report_available: {
        id: 'attendance_report_available',
        title: 'Monthly Attendance Summary',
        category: 'Attendance',
        enabled: true,
        text: 'Dear Parent/Guardian, attendance summary for {{student_name}} (Class {{class}}) shows {{percentage}}% overall monthly attendance ({{attendance_status}}). Please ensure regular attendance for optimal academic performance.\n\nIdeal Coaching Center'
      },
      new_announcement: {
        id: 'new_announcement',
        title: 'General Coaching Circular',
        category: 'Announcements',
        enabled: true,
        text: 'Announcement from Ideal Coaching Center:\n{{announcement}}\n\nDate: {{date}}\nFor questions or further details, please contact administration or check your Student Portal.'
      },
      important_announcement: {
        id: 'important_announcement',
        title: 'Urgent Circular / Alert',
        category: 'Announcements',
        enabled: true,
        text: 'URGENT NOTIFICATION - Ideal Coaching Center:\n{{announcement}}\n\nEffective Date: {{date}}\nAll students and parents are requested to note this update carefully.'
      },
      admission_confirmation: {
        id: 'admission_confirmation',
        title: 'Admission / Enrollment Welcome',
        category: 'Admissions',
        enabled: true,
        text: 'Heartiest congratulations! {{student_name}} has been officially enrolled at Ideal Coaching Center in Class {{class}} ({{group}}), Roll #{{student_roll}}. Academic Session: {{academic_year}}. We are committed to excellence in board exam preparation!\n\nWelcome to Ideal Coaching Center'
      },
      student_account_created: {
        id: 'student_account_created',
        title: 'Student Portal Credentials',
        category: 'Admissions',
        enabled: true,
        text: 'Dear {{student_name}}, your Ideal Coaching Center Student Portal account is active! Roll No: #{{student_roll}}, Class: {{class}}, Login Email: {{student_email}}. Access your daily diary, syllabus, fee receipts & attendance at {{portal_url}}.'
      },
      homework_assignment: {
        id: 'homework_assignment',
        title: 'Daily Diary / Homework Notice',
        category: 'Academics',
        enabled: true,
        text: 'Dear Student/Parent, daily diary and homework assignments for Class {{class}} ({{group}}) have been updated for {{date}}. Please check your portal diary section to complete tasks on time.\n\nIdeal Coaching Center'
      },
      exam_schedule: {
        id: 'exam_schedule',
        title: 'Exam Date Sheet Notification',
        category: 'Academics',
        enabled: true,
        text: 'Dear Parent/Guardian, the date sheet for {{exam_name}} (Class {{class}}) has been released. Please guide {{student_name}} to follow the revision schedule strictly. Best wishes for upcoming exams!\n\nIdeal Coaching Center'
      },
      password_account_info: {
        id: 'password_account_info',
        title: 'Account Security Notice',
        category: 'System',
        enabled: true,
        text: 'Security Alert: Login credentials for {{student_name}} (Roll #{{student_roll}}) were updated on {{date}} at {{time}}. If you did not request this change, please contact administration immediately.'
      },
      custom_admin_message: {
        id: 'custom_admin_message',
        title: 'Direct Admin Communication',
        category: 'Custom',
        enabled: true,
        text: 'Dear Parent/Guardian of {{student_name}} (Class {{class}}, Roll #{{student_roll}}):\n\n{{custom_message}}\n\nSent by: {{admin_name}}\nIdeal Coaching Center'
      }
    };
  }

  /**
   * Get WhatsApp Settings (from Firestore with fallback)
   */
  async getSettings() {
    try {
      const stored = await window.FirebaseService.getDocument(this.COLLECTION_SETTINGS, this.DOC_SETTINGS);
      if (stored) {
        return {
          ...this.defaultSettings,
          ...stored,
          automations: {
            ...this.defaultAutomations,
            ...(stored.automations || {})
          }
        };
      }
    } catch (e) {
      console.warn('WhatsAppService: Could not load stored settings, using defaults.', e.message);
    }
    return {
      ...this.defaultSettings,
      automations: { ...this.defaultAutomations }
    };
  }

  /**
   * Save WhatsApp Settings to Firestore
   */
  async saveSettings(newSettings) {
    const current = await this.getSettings();
    const merged = {
      ...current,
      ...newSettings,
      id: this.DOC_SETTINGS,
      updatedAt: new Date().toISOString()
    };

    await window.FirebaseService.updateDocument(this.COLLECTION_SETTINGS, this.DOC_SETTINGS, merged);

    await window.AuditService.log({
      action: 'WhatsApp Settings Updated',
      category: 'System',
      targetType: 'WhatsAppSettings',
      targetId: this.DOC_SETTINGS,
      details: `Updated WhatsApp configuration (Provider: ${merged.apiProvider}, Enabled: ${merged.enabled}, Automation: ${merged.automationMasterSwitch})`
    });

    return merged;
  }

  /**
   * Get all message templates
   */
  async getTemplates() {
    try {
      const storedList = await window.FirebaseService.getCollection(this.COLLECTION_TEMPLATES);
      if (storedList && storedList.length > 0) {
        const templatesMap = { ...this.defaultTemplates };
        storedList.forEach(t => {
          if (t && t.id) templatesMap[t.id] = { ...this.defaultTemplates[t.id], ...t };
        });
        return templatesMap;
      }
    } catch (e) {
      console.warn('WhatsAppService: Error loading templates, using defaults.', e.message);
    }
    return { ...this.defaultTemplates };
  }

  /**
   * Save or Update a Message Template
   */
  async saveTemplate(templateId, templateData) {
    const templates = await this.getTemplates();
    const current = templates[templateId] || this.defaultTemplates[templateId] || { id: templateId };
    const updated = {
      ...current,
      ...templateData,
      id: templateId,
      updatedAt: new Date().toISOString()
    };

    await window.FirebaseService.addDocument(this.COLLECTION_TEMPLATES, updated);

    await window.AuditService.log({
      action: 'WhatsApp Template Updated',
      category: 'Communication',
      targetType: 'Template',
      targetId: templateId,
      details: `Updated WhatsApp message template "${updated.title}"`
    });

    return updated;
  }

  /**
   * Reset template to institutional default
   */
  async resetTemplate(templateId) {
    if (!this.defaultTemplates[templateId]) return null;
    const defaultTpl = { ...this.defaultTemplates[templateId] };
    await window.FirebaseService.addDocument(this.COLLECTION_TEMPLATES, defaultTpl);
    return defaultTpl;
  }

  /**
   * Normalize Phone Number to international E.164 format (Default +92 Pakistan)
   */
  normalizePhoneNumber(rawNumber, defaultCountryCode = '+92') {
    if (!rawNumber) return '';
    let cleaned = String(rawNumber).replace(/[\s\-\(\)]/g, '').trim();

    // Remove leading zeros or handle +92
    if (cleaned.startsWith('+')) {
      return cleaned;
    } else if (cleaned.startsWith('00')) {
      return '+' + cleaned.substring(2);
    } else if (cleaned.startsWith('0')) {
      const cc = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;
      return `${cc}${cleaned.substring(1)}`;
    } else if (cleaned.startsWith('92')) {
      return `+${cleaned}`;
    }

    const cc = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;
    return `${cc}${cleaned}`;
  }

  /**
   * Validate Phone Number format
   */
  validatePhoneNumber(number) {
    if (!number) return false;
    const normalized = this.normalizePhoneNumber(number);
    // Standard international E.164 format validation (+ followed by 10 to 15 digits)
    return /^\+[1-9]\d{9,14}$/.test(normalized);
  }

  /**
   * Mask Phone Number for privacy in logs & UI: "+92 300 ***4567"
   */
  maskPhoneNumber(phone) {
    if (!phone) return 'N/A';
    const normalized = this.normalizePhoneNumber(phone);
    if (normalized.length <= 6) return normalized;
    const start = normalized.substring(0, 7);
    const end = normalized.substring(normalized.length - 4);
    return `${start} ***${end}`;
  }

  /**
   * Extract Parent/Guardian WhatsApp number for a student
   */
  getStudentWhatsAppNumber(student) {
    if (!student) return '';
    // Priority: parentWhatsApp > contactNumber
    const candidate = student.parentWhatsApp || student.contactNumber || '';
    return this.normalizePhoneNumber(candidate);
  }

  /**
   * Replace Dynamic Placeholders in Template Text
   */
  replacePlaceholders(templateText, context = {}) {
    if (!templateText) return '';

    const defaultContext = {
      school_name: 'Ideal Coaching Center',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      portal_url: window.location.origin + window.location.pathname,
      admin_name: (window.AuthService && window.AuthService.getCurrentUser()?.fullName) || 'Administration'
    };

    const merged = { ...defaultContext, ...context };

    let output = templateText;
    for (const [key, value] of Object.entries(merged)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      output = output.replace(regex, value !== undefined && value !== null ? String(value) : '');
    }

    return output;
  }

  /**
   * Generate realistic sample context for live template preview
   */
  getSampleContext(sampleStudent = null) {
    const s = sampleStudent || {
      fullName: 'Muhammad Usman Farooq',
      fatherName: 'Farooq Ahmed',
      rollNumber: '1201',
      class: '12th',
      group: 'Computer Science',
      contactNumber: '0321-7654321',
      email: 'usman.farooq@ideal.edu'
    };

    return {
      student_name: s.fullName,
      father_name: s.fatherName,
      student_roll: s.rollNumber,
      class: s.class,
      group: s.group,
      section: 'A',
      school_name: 'Ideal Coaching Center',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      attendance_status: 'Absent',
      fee_month: 'June 2026',
      fee_amount: '3,000',
      paid_amount: '3,000',
      remaining_amount: '0',
      due_date: '10 June 2026',
      receipt_number: '9921004812',
      exam_name: 'First Term Pre-Board Examination',
      result: 'A+ Grade (Passed)',
      percentage: '92.4',
      report_link: window.location.origin + window.location.pathname + '#student-dashboard',
      announcement: 'Coaching classes will observe regular schedule during upcoming board practical examinations.',
      academic_year: '2026-2027',
      student_email: s.email || 'student@ideal.edu',
      portal_url: window.location.origin + window.location.pathname,
      custom_message: 'Please attend the parent-teacher review session this Saturday at 11:00 AM.',
      admin_name: 'Principal Office'
    };
  }

  /**
   * Check for duplicate message within anti-spam cooldown window
   */
  async isDuplicate(studentId, type, uniqueKey = null, cooldownMinutes = 60) {
    try {
      const logs = await window.FirebaseService.getCollection(this.COLLECTION_LOGS);
      if (!logs || logs.length === 0) return false;

      const cutoff = Date.now() - (cooldownMinutes * 60 * 1000);
      return logs.some(l => {
        if (l.studentId !== studentId || l.type !== type) return false;
        if (uniqueKey && l.uniqueKey !== uniqueKey) return false;
        const logTime = new Date(l.timestamp).getTime();
        return logTime > cutoff && (l.status === 'Sent' || l.status === 'Delivered' || l.status === 'Queued');
      });
    } catch (e) {
      console.warn('WhatsAppService: Duplicate check error:', e);
      return false;
    }
  }

  /**
   * Dispatch WhatsApp Message (Provider-Independent Interface)
   * Honest architectural layer: Calls serverless endpoint if configured; otherwise logs as
   * "Pending (Provider Unconfigured)" with transparent explanation. Never fakes delivery.
   */
  async sendMessage({ studentId, studentName, fatherName, recipientPhone, type, templateId, messageText, uniqueKey = null, isTest = false }) {
    const settings = await this.getSettings();

    // Check master switches
    if (!settings.enabled && !isTest) {
      return {
        success: false,
        status: 'Disabled',
        message: 'WhatsApp notifications are currently disabled in settings.'
      };
    }

    if (!isTest && !settings.automationMasterSwitch && type !== 'custom_admin_message') {
      return {
        success: false,
        status: 'Paused',
        message: 'Automated WhatsApp notifications are temporarily paused by master switch.'
      };
    }

    // Validate phone number
    const normalizedPhone = this.normalizePhoneNumber(recipientPhone, settings.countryCode);
    if (!this.validatePhoneNumber(normalizedPhone)) {
      const failureRecord = {
        id: `walog_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        studentId: studentId || 'N/A',
        studentName: studentName || 'N/A',
        fatherName: fatherName || 'N/A',
        recipientPhone: recipientPhone || 'N/A',
        maskedPhone: this.maskPhoneNumber(recipientPhone),
        type: type || 'custom',
        templateId: templateId || 'custom',
        messageText: messageText || '',
        status: 'Failed',
        deliveryStatus: 'Invalid Phone Number',
        errorInfo: 'WhatsApp number is missing or does not conform to international E.164 format.',
        markedBy: window.AuthService.getCurrentUser()?.fullName || 'System Automation',
        createdAt: new Date().toISOString()
      };
      await window.FirebaseService.addDocument(this.COLLECTION_LOGS, failureRecord);
      return {
        success: false,
        status: 'Failed',
        log: failureRecord,
        message: 'Invalid recipient phone number.'
      };
    }

    // Check duplicate
    if (!isTest && uniqueKey) {
      const isDup = await this.isDuplicate(studentId, type, uniqueKey, settings.duplicateCooldownMinutes);
      if (isDup) {
        return {
          success: false,
          status: 'Duplicate Protected',
          message: `Duplicate message blocked. A ${type} notification was already dispatched within the ${settings.duplicateCooldownMinutes}-minute cooldown window.`
        };
      }
    }

    let dispatchResult = {
      status: 'Pending',
      deliveryStatus: 'Provider Not Configured',
      errorInfo: 'Secure backend/serverless endpoint not yet configured. Message queued in LMS database.'
    };

    // If an actual serverless / backend endpoint is configured, invoke it
    if (settings.endpointUrl && settings.endpointUrl.trim().startsWith('http')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(settings.endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            provider: settings.apiProvider,
            schoolNumber: settings.schoolNumber,
            to: normalizedPhone,
            message: messageText,
            type: type,
            studentId: studentId,
            studentName: studentName,
            phoneNumberId: settings.phoneNumberId,
            businessAccountId: settings.businessAccountId,
            timestamp: new Date().toISOString()
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const resData = await response.json().catch(() => ({}));
          dispatchResult = {
            status: 'Sent',
            deliveryStatus: resData.deliveryStatus || 'Sent to Provider',
            errorInfo: null
          };
        } else {
          const errText = await response.text().catch(() => 'Endpoint error');
          dispatchResult = {
            status: 'Failed',
            deliveryStatus: 'Provider Error',
            errorInfo: `Server response: ${response.status} - ${errText.substring(0, 100)}`
          };
        }
      } catch (err) {
        dispatchResult = {
          status: 'Failed',
          deliveryStatus: 'Network/Timeout Error',
          errorInfo: err.name === 'AbortError' ? 'Serverless endpoint request timed out.' : err.message
        };
      }
    } else {
      // Backend not yet configured — honest status
      dispatchResult = {
        status: 'Queued',
        deliveryStatus: 'Awaiting Provider Integration',
        errorInfo: 'WhatsApp Business API provider endpoint is not yet connected. Configure a serverless endpoint to activate live WhatsApp messaging.'
      };
    }

    // Record official notification log in Firestore / local store
    const logRecord = {
      id: `walog_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      studentId: studentId || 'N/A',
      studentName: studentName || 'N/A',
      fatherName: fatherName || 'N/A',
      recipientPhone: normalizedPhone,
      maskedPhone: this.maskPhoneNumber(normalizedPhone),
      type: type || 'custom',
      templateId: templateId || 'custom',
      messageText: messageText,
      status: dispatchResult.status,
      deliveryStatus: dispatchResult.deliveryStatus,
      errorInfo: dispatchResult.errorInfo,
      uniqueKey: uniqueKey || null,
      provider: settings.apiProvider,
      isTest: !!isTest,
      markedBy: window.AuthService.getCurrentUser()?.fullName || 'System Automation',
      createdAt: new Date().toISOString()
    };

    await window.FirebaseService.addDocument(this.COLLECTION_LOGS, logRecord);

    return {
      success: dispatchResult.status === 'Sent' || dispatchResult.status === 'Queued',
      status: dispatchResult.status,
      log: logRecord,
      message: dispatchResult.errorInfo || 'Message queued successfully.'
    };
  }

  /**
   * Test WhatsApp API Connection
   */
  async testConnection() {
    const settings = await this.getSettings();

    if (!settings.endpointUrl || !settings.endpointUrl.trim().startsWith('http')) {
      return {
        success: false,
        status: 'Unconfigured',
        provider: settings.apiProvider,
        message: 'No backend API endpoint URL configured. A secure serverless function or webhook proxy is required to communicate with WhatsApp Business Cloud API.'
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${settings.endpointUrl}?action=health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        await this.saveSettings({
          lastConnectionCheck: new Date().toISOString(),
          connectionStatus: 'connected'
        });
        return {
          success: true,
          status: 'Connected',
          provider: settings.apiProvider,
          message: 'Successfully connected to WhatsApp API serverless integration endpoint!'
        };
      } else {
        await this.saveSettings({
          lastConnectionCheck: new Date().toISOString(),
          connectionStatus: 'disconnected'
        });
        return {
          success: false,
          status: 'Disconnected',
          provider: settings.apiProvider,
          message: `Endpoint returned HTTP status ${response.status}. Please check provider credentials.`
        };
      }
    } catch (e) {
      await this.saveSettings({
        lastConnectionCheck: new Date().toISOString(),
        connectionStatus: 'disconnected'
      });
      return {
        success: false,
        status: 'Unreachable',
        provider: settings.apiProvider,
        message: `Endpoint is unreachable: ${e.name === 'AbortError' ? 'Connection timed out' : e.message}. Verify network and URL.`
      };
    }
  }

  /**
   * Retry a failed message from log history
   */
  async retryMessage(logId) {
    const logs = await window.FirebaseService.getCollection(this.COLLECTION_LOGS);
    const targetLog = logs.find(l => l.id === logId);
    if (!targetLog) throw new Error('Notification record not found');

    const result = await this.sendMessage({
      studentId: targetLog.studentId,
      studentName: targetLog.studentName,
      fatherName: targetLog.fatherName,
      recipientPhone: targetLog.recipientPhone,
      type: targetLog.type,
      templateId: targetLog.templateId,
      messageText: targetLog.messageText,
      isTest: true // Bypass duplicate check on retry
    });

    if (result.success) {
      await window.FirebaseService.updateDocument(this.COLLECTION_LOGS, logId, {
        status: result.status,
        deliveryStatus: 'Retried & ' + result.status,
        errorInfo: result.log.errorInfo,
        retriedAt: new Date().toISOString()
      });
    }

    return result;
  }

  /**
   * Get WhatsApp logs with optional filtering & search
   */
  async getLogs(filters = {}) {
    try {
      let logs = await window.FirebaseService.getCollection(this.COLLECTION_LOGS);
      if (!logs) return [];

      // Sort newest first
      logs.sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt));

      if (filters.status && filters.status !== 'all') {
        logs = logs.filter(l => l.status && l.status.toLowerCase() === filters.status.toLowerCase());
      }
      if (filters.type && filters.type !== 'all') {
        logs = logs.filter(l => l.type === filters.type);
      }
      if (filters.date) {
        logs = logs.filter(l => (l.timestamp || '').startsWith(filters.date));
      }
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        logs = logs.filter(l =>
          (l.studentName && l.studentName.toLowerCase().includes(q)) ||
          (l.fatherName && l.fatherName.toLowerCase().includes(q)) ||
          (l.recipientPhone && l.recipientPhone.includes(q)) ||
          (l.messageText && l.messageText.toLowerCase().includes(q)) ||
          (l.type && l.type.toLowerCase().includes(q))
        );
      }

      return logs;
    } catch (e) {
      console.warn('WhatsAppService: Error loading logs:', e);
      return [];
    }
  }

  /**
   * Calculate Dashboard Metrics & Statistics
   */
  async getStatistics() {
    const logs = await this.getLogs();
    const settings = await this.getSettings();

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    let sent = 0;
    let delivered = 0;
    let failed = 0;
    let pending = 0;
    let todayCount = 0;
    let monthCount = 0;
    const byType = {};

    logs.forEach(l => {
      if (l.status === 'Sent') sent++;
      else if (l.status === 'Delivered') delivered++;
      else if (l.status === 'Failed') failed++;
      else pending++;

      const logDate = (l.timestamp || '').split('T')[0];
      if (logDate === todayStr) todayCount++;
      if (logDate && logDate.startsWith(currentMonthStr)) monthCount++;

      const t = l.type || 'other';
      byType[t] = (byType[t] || 0) + 1;
    });

    return {
      total: logs.length,
      sent: sent,
      delivered: delivered,
      failed: failed,
      pending: pending,
      today: todayCount,
      thisMonth: monthCount,
      byType: byType,
      connectionStatus: settings.connectionStatus || 'configured',
      enabled: settings.enabled,
      automationActive: settings.automationMasterSwitch
    };
  }

  // =========================================================================
  // Automated Event Hooks (Safe, Non-Blocking, Event-Driven)
  // =========================================================================

  /**
   * Hook 1: Trigger Attendance Notification (Absent / Late)
   */
  async notifyAttendance({ student, status, date, time = null }) {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled || !settings.automationMasterSwitch) return;

      const triggerKey = status === 'Absent' ? 'student_absent' : (status === 'Late' ? 'student_late' : null);
      if (!triggerKey) return;

      const autoSetting = settings.automations && settings.automations[triggerKey];
      if (!autoSetting || !autoSetting.enabled) return;

      const templates = await this.getTemplates();
      const template = templates[triggerKey];
      if (!template || !template.enabled) return;

      const recipientPhone = this.getStudentWhatsAppNumber(student);
      if (!recipientPhone) return;

      const context = {
        student_name: student.fullName,
        father_name: student.fatherName,
        student_roll: student.rollNumber,
        class: student.class,
        group: student.group,
        date: date || new Date().toISOString().split('T')[0],
        time: time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        school_name: 'Ideal Coaching Center'
      };

      const messageText = this.replacePlaceholders(template.text, context);
      const uniqueKey = `att_${student.id}_${context.date}_${status}`;

      await this.sendMessage({
        studentId: student.id,
        studentName: student.fullName,
        fatherName: student.fatherName,
        recipientPhone: recipientPhone,
        type: triggerKey,
        templateId: template.id,
        messageText: messageText,
        uniqueKey: uniqueKey
      });
    } catch (err) {
      console.warn('WhatsAppService: notifyAttendance non-blocking error:', err);
    }
  }

  /**
   * Hook 2: Trigger Fee Payment Received Confirmation
   */
  async notifyFeePayment(receipt) {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled || !settings.automationMasterSwitch) return;

      const autoSetting = settings.automations && settings.automations['fee_payment_received'];
      if (!autoSetting || !autoSetting.enabled) return;

      const templates = await this.getTemplates();
      const template = templates['fee_payment_received'];
      if (!template || !template.enabled) return;

      const student = await window.FirebaseService.getDocument('students', receipt.studentId);
      const recipientPhone = student ? this.getStudentWhatsAppNumber(student) : this.normalizePhoneNumber(receipt.contactNumber);
      if (!recipientPhone) return;

      const context = {
        student_name: receipt.studentName,
        father_name: receipt.fatherName,
        student_roll: receipt.rollNumber,
        class: receipt.class,
        group: receipt.group,
        paid_amount: window.UIUtils.formatCurrency(receipt.paidAmount).replace('PKR ', ''),
        fee_month: receipt.month,
        receipt_number: receipt.receiptNumber,
        remaining_amount: '0',
        date: window.UIUtils.formatDate(receipt.receiptDate || receipt.paymentDate),
        school_name: 'Ideal Coaching Center'
      };

      const messageText = this.replacePlaceholders(template.text, context);
      const uniqueKey = `fee_${receipt.receiptNumber}`;

      await this.sendMessage({
        studentId: receipt.studentId,
        studentName: receipt.studentName,
        fatherName: receipt.fatherName,
        recipientPhone: recipientPhone,
        type: 'fee_payment_received',
        templateId: template.id,
        messageText: messageText,
        uniqueKey: uniqueKey
      });
    } catch (err) {
      console.warn('WhatsAppService: notifyFeePayment non-blocking error:', err);
    }
  }

  /**
   * Hook 3: Trigger Admission / Enrollment Confirmation
   */
  async notifyAdmission(student) {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled || !settings.automationMasterSwitch) return;

      const autoSetting = settings.automations && settings.automations['admission_confirmation'];
      if (!autoSetting || !autoSetting.enabled) return;

      const templates = await this.getTemplates();
      const template = templates['admission_confirmation'];
      if (!template || !template.enabled) return;

      const recipientPhone = this.getStudentWhatsAppNumber(student);
      if (!recipientPhone) return;

      const context = {
        student_name: student.fullName,
        father_name: student.fatherName,
        student_roll: student.rollNumber,
        class: student.class,
        group: student.group,
        academic_year: '2026-2027',
        school_name: 'Ideal Coaching Center'
      };

      const messageText = this.replacePlaceholders(template.text, context);
      const uniqueKey = `adm_${student.id}`;

      await this.sendMessage({
        studentId: student.id,
        studentName: student.fullName,
        fatherName: student.fatherName,
        recipientPhone: recipientPhone,
        type: 'admission_confirmation',
        templateId: template.id,
        messageText: messageText,
        uniqueKey: uniqueKey
      });
    } catch (err) {
      console.warn('WhatsAppService: notifyAdmission non-blocking error:', err);
    }
  }
}

// Global Singleton Instance
window.WhatsAppService = new WhatsAppService();
