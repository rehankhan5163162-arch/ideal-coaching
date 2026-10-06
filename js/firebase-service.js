/**
 * Ideal Coaching Center - Firebase & Real-time Database Service
 * Provides full multi-device Firestore integration with live onSnapshot listeners,
 * atomic batch operations, and resilient offline-fallback storage.
 */

class FirebaseService {
  constructor() {
    this.isLive = false;
    this.db = null;
    this.auth = null;
    this.cloudStatus = 'connecting'; // 'online', 'error', 'offline', 'connecting'
    this.lastSyncError = null;
    this.statusListeners = new Set();
    this.listeners = new Map(); // collection -> Set of callback functions
    this.storageKey = 'IDEAL_COACHING_CENTER_DB_V1';
    this.mockData = null;
    this.init();
  }

  /**
   * Subscribe to cloud status changes (for UI badges and diagnostics)
   */
  onStatusChange(callback) {
    this.statusListeners.add(callback);
    try {
      callback(this.cloudStatus, this.lastSyncError);
    } catch (e) {}
    return () => this.statusListeners.delete(callback);
  }

  setStatus(status, error = null) {
    this.cloudStatus = status;
    this.lastSyncError = error;
    this.statusListeners.forEach(cb => {
      try { cb(status, error); } catch (e) {}
    });
  }

  async init() {
    // Always initialize local store so cache and seed baseline are guaranteed available
    this.initLocalStore();

    // Check if real Firebase config is provided
    if (typeof window.isFirebaseConfigured === 'function' && window.isFirebaseConfigured()) {
      try {
        if (window.firebase) {
          if (!window.firebase.apps || window.firebase.apps.length === 0) {
            window.firebase.initializeApp(window.IDEAL_FIREBASE_CONFIG);
          }
          this.db = window.firebase.firestore();
          this.auth = window.firebase.auth();
          this.isLive = true;

          // Attempt anonymous authentication as an extra compatibility layer
          if (this.auth && !this.auth.currentUser) {
            try {
              await this.auth.signInAnonymously();
              console.log('✅ Firebase Auth authenticated anonymously');
            } catch (authErr) {
              console.log('Firebase Auth note:', authErr.message);
            }
          }

          // Test real cloud connection & auto-seed cloud if brand new project
          await this.verifyCloudConnection();
        }
      } catch (err) {
        console.warn('⚠️ Firebase live connection initialization note:', err);
        this.setStatus('offline', err.message);
      }
    } else {
      this.setStatus('offline', 'Firebase config missing or incomplete');
    }
  }

  /**
   * Verify Firestore read/write capabilities and sync cloud database
   */
  async verifyCloudConnection() {
    if (!this.db) return;
    try {
      const ping = await this.db.collection('settings').doc('global_settings').get();
      this.setStatus('online');
      console.log('✅ Connected to live Firebase Firestore for project:', window.IDEAL_FIREBASE_CONFIG.projectId);

      // If Firestore has never been initialized, seed all initial tables from local data to cloud
      if (!ping.exists) {
        console.log('🌱 First-time cloud setup: syncing all local records to Cloud Firestore...');
        await this.syncAllLocalDataToCloud();
      } else {
        // Cloud exists! Cache settings locally and pull latest updates from Cloud into local cache
        if (!this.mockData.settings) this.mockData.settings = {};
        this.mockData.settings['global_settings'] = { id: ping.id, ...ping.data() };
        this.saveLocalStore();
        await this.pullAllCloudDataToLocal();
      }
    } catch (err) {
      console.error('⚠️ Firebase Firestore connection test failed:', err);
      this.setStatus('error', err.message);
    }
  }

  /**
   * Pull all collections from Cloud Firestore into local cache so mobile devices receive newly enrolled students
   */
  async pullAllCloudDataToLocal() {
    if (!this.db || !this.isLive) return;
    try {
      const collectionsToPull = [
        'settings',
        'admins',
        'students',
        'fees',
        'receipts',
        'attendance',
        'announcements',
        'diary',
        'books',
        'chapters'
      ];

      for (const col of collectionsToPull) {
        try {
          const snapshot = await this.db.collection(col).get();
          if (!snapshot.empty) {
            if (!this.mockData[col]) this.mockData[col] = {};
            snapshot.forEach(doc => {
              this.mockData[col][doc.id] = { id: doc.id, ...doc.data() };
            });
            this.notifySubscribers(col);
          }
        } catch (e) {
          console.warn(`Could not pull collection ${col} from cloud:`, e.message);
        }
      }
      this.saveLocalStore();
      this.setStatus('online');
    } catch (err) {
      console.warn('Pull cloud data general note:', err);
    }
  }

  /**
   * Upload all local records (students, fees, attendance, diary, syllabus, etc.) to Cloud Firestore
   * Ensures that students created on a computer are uploaded so mobile phones immediately see them.
   */
  async syncAllLocalDataToCloud() {
    if (!this.db) {
      return { success: false, message: 'Firebase Firestore is not initialized.' };
    }

    try {
      // 1. Verify Firestore write access first
      const pingTest = await this.testCloudConnection();
      if (!pingTest.success) {
        return { 
          success: false, 
          message: pingTest.message || 'Firestore rules are currently denying write access. Please enable rules in Firebase Console.', 
          code: pingTest.code 
        };
      }

      // 2. Gather all collections from current local store
      const collectionsToSync = [
        'settings',
        'admins',
        'students',
        'fees',
        'receipts',
        'attendance',
        'announcements',
        'diary',
        'books',
        'chapters',
        'audit_logs'
      ];

      let totalSynced = 0;
      let batch = this.db.batch();
      let batchCount = 0;

      for (const col of collectionsToSync) {
        const records = this.mockData[col];
        if (!records) continue;

        for (const [docId, docData] of Object.entries(records)) {
          if (!docData) continue;
          const ref = this.db.collection(col).doc(docId);
          batch.set(ref, docData, { merge: true });
          batchCount++;
          totalSynced++;

          // Firestore batches limit to 500 operations
          if (batchCount >= 400) {
            await batch.commit();
            batch = this.db.batch();
            batchCount = 0;
          }
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }

      this.setStatus('online');
      console.log(`✅ Multi-device cloud sync successful: ${totalSynced} records uploaded to Cloud Firestore!`);
      return { 
        success: true, 
        count: totalSynced, 
        message: `Successfully synchronized ${totalSynced} records to Cloud Firestore! All devices (mobiles & computers) can now access this data in real time.` 
      };
    } catch (err) {
      console.error('⚠️ Cloud sync failed:', err);
      this.setStatus('error', err.message);
      return { success: false, message: err.message, code: err.code };
    }
  }

  /**
   * Seed initial data directly into Cloud Firestore (legacy alias)
   */
  async seedCloudDatabase() {
    return this.syncAllLocalDataToCloud();
  }

  /**
   * Diagnostic tester: tests real read and write permissions to Firestore
   */
  async testCloudConnection() {
    if (!this.db) {
      return { success: false, message: 'Firebase SDK or Firestore not initialized.' };
    }
    try {
      const testId = `ping_${Date.now()}`;
      const testRef = this.db.collection('settings').doc(testId);
      await testRef.set({ test: true, timestamp: new Date().toISOString() });
      await testRef.delete();
      this.setStatus('online');
      return { success: true, message: 'Cloud Firestore is fully accessible and connected! All devices can read and write.' };
    } catch (err) {
      this.setStatus('error', err.message);
      return { success: false, message: err.message, code: err.code };
    }
  }

  /**
   * Helper to display user-friendly sync alerts when Firestore rejects saves
   */
  handleSyncError(operation, collectionName, error) {
    if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
      if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission'))) {
        window.UIUtils.showToast('error', 'Cloud Sync Failed (Permission Denied)', 'Firebase Firestore rejected the save. Update Firestore Rules in Firebase Console so all devices can sync.');
      } else {
        window.UIUtils.showToast('warning', 'Cloud Sync Issue', `Saved locally, but cloud sync failed: ${error.message}`);
      }
    }
  }

  /**
   * Initialize rich seed database for Ideal Coaching Center
   */
  initLocalStore() {
    const existing = localStorage.getItem(this.storageKey);
    if (existing) {
      try {
        this.mockData = JSON.parse(existing);
      } catch (e) {
        this.mockData = null;
      }
    }

    if (!this.mockData) {
      this.mockData = this.getSeedData();
      this.saveLocalStore();
    } else {
      // Auto-migrate existing fees, receipts, and settings to standard Rs. 3,000 baseline
      let migrated = false;
      if (this.mockData.fees) {
        Object.values(this.mockData.fees).forEach(fee => {
          if (fee.expectedAmount !== 3000) {
            fee.expectedAmount = 3000;
            if (fee.status === 'Paid') {
              fee.paidAmount = 3000;
            }
            migrated = true;
          }
        });
      }
      if (this.mockData.receipts) {
        Object.values(this.mockData.receipts).forEach(rcpt => {
          if (rcpt.expectedAmount !== 3000 || rcpt.paidAmount !== 3000) {
            rcpt.expectedAmount = 3000;
            rcpt.paidAmount = 3000;
            migrated = true;
          }
        });
      }
      if (this.mockData.settings && this.mockData.settings['global_settings']) {
        const s = this.mockData.settings['global_settings'];
        if (s.defaultFee9th !== 3000 || s.defaultFee10th !== 3000 || s.defaultFee11th !== 3000 || s.defaultFee12th !== 3000) {
          s.defaultFee9th = 3000;
          s.defaultFee10th = 3000;
          s.defaultFee11th = 3000;
          s.defaultFee12th = 3000;
          migrated = true;
        }
      }
      if (this.mockData.students) {
        Object.values(this.mockData.students).forEach(std => {
          if (!std.email) {
            const cleanName = (std.fullName || 'student').toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');
            std.email = `${cleanName}@ideal.edu`;
            migrated = true;
          }
          if (!std.password) {
            std.password = std.credentialPin || 'Student@123';
            migrated = true;
          }
        });
      }
      if (migrated) {
        this.saveLocalStore();
      }
    }

    // Attach cross-window / cross-tab reactive storage listener
    if (!this._storageListenerAttached && typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === this.storageKey && event.newValue) {
          try {
            this.mockData = JSON.parse(event.newValue);
            // Notify all active collection subscribers in this tab immediately
            for (const colName of this.listeners.keys()) {
              this.notifySubscribers(colName);
            }
          } catch (e) {
            console.warn('Cross-tab storage synchronization note:', e);
          }
        }
      });
      this._storageListenerAttached = true;
    }
  }

  saveLocalStore() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.mockData));
    } catch (e) {
      console.warn('Storage limit exceeded', e);
    }
  }

  /**
   * Broadcast real-time change to all active subscribers of a collection
   */
  notifySubscribers(collectionName) {
    if (this.listeners.has(collectionName)) {
      const docs = this.mockData[collectionName] ? Object.values(this.mockData[collectionName]) : [];
      this.listeners.get(collectionName).forEach(cb => {
        try { cb(docs); } catch (e) { console.error('Listener callback error:', e); }
      });
    }
  }

  /**
   * Subscribe to real-time updates for a collection (Multi-device Firestore onSnapshot + local fallback)
   */
  subscribe(collectionName, callback) {
    if (!this.listeners.has(collectionName)) {
      this.listeners.set(collectionName, new Set());
    }
    this.listeners.get(collectionName).add(callback);

    // Initial immediate invocation from cache
    const initialDocs = this.mockData && this.mockData[collectionName] 
      ? Object.values(this.mockData[collectionName]) 
      : [];
    callback(initialDocs);

    let unsubscribeFirestore = null;
    if (this.isLive && this.db) {
      try {
        unsubscribeFirestore = this.db.collection(collectionName).onSnapshot((snapshot) => {
          const docs = [];
          const collectionMap = {};
          snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            docs.push(data);
            collectionMap[doc.id] = data;
          });
          // Replace local cache with live Firestore snapshot data
          this.mockData[collectionName] = collectionMap;
          this.saveLocalStore();
          this.setStatus('online');
          callback(docs);
        }, (err) => {
          console.warn(`Firestore onSnapshot fallback for ${collectionName}:`, err.message);
          this.setStatus('error', err.message);
        });
      } catch (err) {
        console.warn(`Could not attach Firestore onSnapshot to ${collectionName}:`, err);
      }
    }

    // Return unsubscribe function
    return () => {
      if (this.listeners.has(collectionName)) {
        this.listeners.get(collectionName).delete(callback);
      }
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }

  /**
   * Generic Add Document (Syncs with Cloud Firestore)
   */
  async addDocument(collectionName, data) {
    const id = data.id || `${collectionName}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const docData = { ...data, id, createdAt: data.createdAt || new Date().toISOString() };

    // Update local cache
    if (!this.mockData[collectionName]) {
      this.mockData[collectionName] = {};
    }
    this.mockData[collectionName][id] = docData;
    this.saveLocalStore();
    this.notifySubscribers(collectionName);

    // Sync to Live Firestore
    if (this.isLive && this.db) {
      try {
        await this.db.collection(collectionName).doc(id).set(docData);
        this.setStatus('online');
      } catch (err) {
        console.error(`Firestore write error for ${collectionName}/${id}:`, err);
        this.setStatus('error', err.message);
        this.handleSyncError('Save', collectionName, err);
      }
    }

    return docData;
  }

  /**
   * Generic Get Collection Documents (Checks Firestore first with local fallback)
   */
  async getCollection(collectionName) {
    if (this.isLive && this.db) {
      try {
        const snapshot = await this.db.collection(collectionName).get();
        const docs = [];
        const collectionMap = {};
        snapshot.forEach(doc => {
          const d = { id: doc.id, ...doc.data() };
          docs.push(d);
          collectionMap[doc.id] = d;
        });

        // If Firestore had documents, cleanly merge into local cache and return them
        if (docs.length > 0) {
          if (!this.mockData[collectionName]) this.mockData[collectionName] = {};
          this.mockData[collectionName] = { ...this.mockData[collectionName], ...collectionMap };
          this.saveLocalStore();
          this.setStatus('online');
          return Object.values(this.mockData[collectionName]);
        }
        this.setStatus('online');
        return this.mockData[collectionName] ? Object.values(this.mockData[collectionName]) : [];
      } catch (err) {
        console.warn(`Firestore read fallback for ${collectionName}:`, err.message);
        this.setStatus('error', err.message);
      }
    }

    if (!this.mockData[collectionName]) return [];
    return Object.values(this.mockData[collectionName]);
  }

  /**
   * Generic Get Document by ID
   */
  async getDocument(collectionName, id) {
    if (this.isLive && this.db) {
      try {
        const docSnap = await this.db.collection(collectionName).doc(id).get();
        if (docSnap.exists) {
          const d = { id: docSnap.id, ...docSnap.data() };
          if (!this.mockData[collectionName]) this.mockData[collectionName] = {};
          this.mockData[collectionName][id] = d;
          this.setStatus('online');
          return d;
        }
      } catch (err) {
        console.warn(`Firestore getDoc fallback for ${collectionName}/${id}:`, err.message);
        this.setStatus('error', err.message);
      }
    }

    if (!this.mockData[collectionName]) return null;
    return this.mockData[collectionName][id] || null;
  }

  /**
   * Generic Update Document (Syncs with Cloud Firestore)
   */
  async updateDocument(collectionName, id, updates) {
    if (!this.mockData[collectionName] || !this.mockData[collectionName][id]) {
      // Create record if not already present
      if (!this.mockData[collectionName]) this.mockData[collectionName] = {};
      this.mockData[collectionName][id] = { id, ...updates };
    }
    const current = this.mockData[collectionName][id];
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    this.mockData[collectionName][id] = updated;
    this.saveLocalStore();
    this.notifySubscribers(collectionName);

    if (this.isLive && this.db) {
      try {
        await this.db.collection(collectionName).doc(id).set(updated, { merge: true });
        this.setStatus('online');
      } catch (err) {
        console.error(`Firestore update error for ${collectionName}/${id}:`, err);
        this.setStatus('error', err.message);
        this.handleSyncError('Update', collectionName, err);
      }
    }

    return updated;
  }

  /**
   * Generic Delete Document (Syncs with Cloud Firestore)
   */
  async deleteDocument(collectionName, id) {
    let deleted = false;
    if (this.mockData[collectionName] && this.mockData[collectionName][id]) {
      delete this.mockData[collectionName][id];
      this.saveLocalStore();
      this.notifySubscribers(collectionName);
      deleted = true;
    }

    if (this.isLive && this.db) {
      try {
        await this.db.collection(collectionName).doc(id).delete();
        this.setStatus('online');
        deleted = true;
      } catch (err) {
        console.error(`Firestore delete error for ${collectionName}/${id}:`, err);
        this.setStatus('error', err.message);
        this.handleSyncError('Delete', collectionName, err);
      }
    }

    return deleted;
  }

  // ==========================================
  // Specialized Methods for Coaching Center
  // ==========================================

  /**
   * Validate Roll Number uniqueness
   */
  async isRollNumberTaken(rollNumber, excludeStudentId = null) {
    const students = await this.getCollection('students');
    const targetRoll = String(rollNumber || '').trim().toLowerCase();
    return students.some(s => {
      const sRoll = String(s.rollNumber || '').trim().toLowerCase();
      return sRoll === targetRoll && s.id !== excludeStudentId;
    });
  }

  /**
   * Initialize 12-month fee schedule for a student (Atomic Batch Write)
   */
  async initStudentFeeSchedule(student) {
    const settings = await this.getSystemSettings();
    const academicYear = settings.activeAcademicYear || '2026-2027';
    const months = window.UIUtils.getMonthsList();

    // Default class amounts - Standardized to Rs. 3,000 for all classes
    let defaultAmount = 3000;
    if (settings && settings[`defaultFee${student.class}`]) {
      defaultAmount = Number(settings[`defaultFee${student.class}`]) || 3000;
    }

    if (!this.mockData['fees']) this.mockData['fees'] = {};

    const fees = [];
    const batch = (this.isLive && this.db) ? this.db.batch() : null;

    for (let i = 0; i < months.length; i++) {
      const monthName = months[i];
      const feeRecord = {
        id: `fee_${student.id}_${i + 1}`,
        studentId: student.id,
        rollNumber: student.rollNumber,
        studentName: student.fullName,
        fatherName: student.fatherName,
        class: student.class,
        group: student.group,
        contactNumber: student.contactNumber,
        month: monthName,
        monthOrder: i + 1,
        academicYear: academicYear,
        dueDate: `10 ${monthName} ${academicYear.split('-')[0]}`,
        expectedAmount: defaultAmount,
        paidAmount: 0,
        status: 'Pending', // Initially Pending
        paymentDate: null,
        receiptNumber: null,
        notes: '',
        receiptAvailableToStudent: false,
        createdAt: new Date().toISOString()
      };

      this.mockData['fees'][feeRecord.id] = feeRecord;
      fees.push(feeRecord);

      if (batch) {
        const ref = this.db.collection('fees').doc(feeRecord.id);
        batch.set(ref, feeRecord);
      }
    }

    this.saveLocalStore();
    this.notifySubscribers('fees');

    if (batch) {
      try {
        await batch.commit();
        this.setStatus('online');
      } catch (err) {
        console.error('Batch fee write error:', err);
        this.setStatus('error', err.message);
        this.handleSyncError('Fee Schedule Batch', 'fees', err);
      }
    }

    return fees;
  }

  /**
   * Mark a Fee as Paid and generate 10-digit receipt
   */
  async processFeePayment(feeId, paymentData) {
    const fee = await this.getDocument('fees', feeId);
    if (!fee) throw new Error('Fee record not found');

    const existingReceipts = await this.getCollection('receipts');
    const receiptNumber = window.UIUtils.generate10DigitReceiptNumber(existingReceipts);

    const paidDate = paymentData.paymentDate || new Date().toISOString().split('T')[0];
    const paidAmount = Number(paymentData.paidAmount) || fee.expectedAmount;

    // Update fee record
    const updatedFee = await this.updateDocument('fees', feeId, {
      status: 'Paid',
      paidAmount: paidAmount,
      paymentDate: paidDate,
      receiptNumber: receiptNumber,
      notes: paymentData.notes || 'Tuition Fee Paid'
    });

    // Create official receipt record
    const receiptRecord = {
      id: `rcpt_${receiptNumber}`,
      receiptNumber: receiptNumber,
      feeId: feeId,
      studentId: fee.studentId,
      studentName: fee.studentName,
      fatherName: fee.fatherName,
      rollNumber: fee.rollNumber,
      contactNumber: fee.contactNumber,
      class: fee.class,
      group: fee.group,
      month: fee.month,
      academicYear: fee.academicYear,
      expectedAmount: fee.expectedAmount,
      paidAmount: paidAmount,
      paymentDate: paidDate,
      receiptDate: new Date().toISOString(),
      notes: paymentData.notes || 'Tuition Fee Paid',
      availableToStudent: false, // Turned on when Admin clicks "Send Receipt to Student Account"
      createdAt: new Date().toISOString()
    };
    await this.addDocument('receipts', receiptRecord);

    // Audit log
    await window.AuditService.log({
      action: 'Fee Payment Processed',
      category: 'Finance',
      targetType: 'Fee',
      targetId: feeId,
      details: `Marked ${fee.month} fee as Paid (Rs. ${paidAmount}) with Receipt #${receiptNumber} for ${fee.studentName} (Roll #${fee.rollNumber})`
    });

    return { fee: updatedFee, receipt: receiptRecord };
  }

  /**
   * Send Receipt to Student Account & trigger real-time notification
   */
  async sendReceiptToStudent(feeId) {
    const fee = await this.getDocument('fees', feeId);
    if (!fee) throw new Error('Fee record not found');

    // Update fee availability
    await this.updateDocument('fees', feeId, {
      receiptAvailableToStudent: true
    });

    // Update receipt record
    const receipts = await this.getCollection('receipts');
    const matchedReceipt = receipts.find(r => r.receiptNumber === fee.receiptNumber || r.feeId === feeId);
    if (matchedReceipt) {
      await this.updateDocument('receipts', matchedReceipt.id, {
        availableToStudent: true
      });
    }

    // Create notification for the student
    const notification = {
      id: `notif_${Date.now()}`,
      studentId: fee.studentId,
      rollNumber: fee.rollNumber,
      title: 'Fee Paid & Receipt Available',
      message: `Your ${fee.month} fee has been paid successfully. Receipt #${fee.receiptNumber} is now available in Fee Details.`,
      type: 'fee_receipt',
      receiptNumber: fee.receiptNumber,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await this.addDocument('notifications', notification);

    // Audit log
    await window.AuditService.log({
      action: 'Receipt Sent to Student',
      category: 'Finance',
      targetType: 'Student',
      targetId: fee.studentId,
      details: `Receipt #${fee.receiptNumber} for ${fee.month} sent to student ${fee.studentName}`
    });

    return true;
  }

  /**
   * System Settings
   */
  async getSystemSettings() {
    const settings = await this.getDocument('settings', 'global_settings');
    if (settings) return settings;

    const defaultSettings = {
      id: 'global_settings',
      portalName: 'Ideal Coaching Center',
      tagline: 'Excellence in Education',
      activeAcademicYear: '2026-2027',
      address: 'Main Boulevard, Academic Block, Lahore, Pakistan',
      phone: '+92 300 1234567',
      email: 'info@idealcoaching.edu.pk',
      defaultFee9th: 3000,
      defaultFee10th: 3000,
      defaultFee11th: 3000,
      defaultFee12th: 3000
    };
    await this.addDocument('settings', defaultSettings);
    return defaultSettings;
  }

  // ==========================================
  // Rich Seed Data Initializer
  // ==========================================
  getSeedData() {
    const data = {
      users: {},
      admins: {},
      students: {},
      fees: {},
      receipts: {},
      attendance: {},
      announcements: {},
      diary: {},
      books: {},
      chapters: {},
      notifications: {},
      settings: {},
      audit_logs: {}
    };

    // 1. Settings
    data.settings['global_settings'] = {
      id: 'global_settings',
      portalName: 'Ideal Coaching Center',
      tagline: 'Excellence in Education',
      activeAcademicYear: '2026-2027',
      address: 'Main Boulevard, Education City, Lahore',
      phone: '+92 300 1234567',
      email: 'contact@idealcoaching.edu.pk',
      defaultFee9th: 3000,
      defaultFee10th: 3000,
      defaultFee11th: 3000,
      defaultFee12th: 3000
    };

    // 2. Super Admin & Admin Users
    data.users['usr_superadmin'] = {
      id: 'usr_superadmin',
      fullName: 'Super Administrator',
      email: 'superadmin@ideal.edu',
      role: 'super_admin',
      status: 'Active',
      contactNumber: '0300-1112233',
      createdAt: '2026-01-01T08:00:00Z',
      lastLogin: new Date().toISOString()
    };

    data.admins['adm_1'] = {
      id: 'adm_1',
      fullName: 'Muhammad Tariq',
      email: 'tariq@ideal.edu',
      contactNumber: '0312-3456789',
      status: 'Active',
      permissions: ['Manage Students', 'Manage Fees', 'Manage Attendance', 'Manage Announcements', 'Manage Diary & Syllabus'],
      createdAt: '2026-02-15T10:00:00Z',
      lastLogin: '2026-09-27T09:15:00Z'
    };

    data.admins['adm_2'] = {
      id: 'adm_2',
      fullName: 'Ayesha Khan',
      email: 'ayesha@ideal.edu',
      contactNumber: '0333-9876543',
      status: 'Active',
      permissions: ['Manage Students', 'Manage Attendance', 'Manage Diary & Syllabus'],
      createdAt: '2026-03-01T11:30:00Z',
      lastLogin: '2026-09-26T14:45:00Z'
    };

    // 3. Students
    const studentSeeds = [
      { id: 'std_1', rollNumber: '1201', fullName: 'Usman Farooq', fatherName: 'Farooq Ahmed', contactNumber: '0321-7654321', class: '12th', group: 'Computer Science', email: 'usman@ideal.edu', password: 'Student@123' },
      { id: 'std_2', rollNumber: '1202', fullName: 'Mariam Siddiqui', fatherName: 'Tahir Siddiqui', contactNumber: '0301-4455667', class: '12th', group: 'Pre-Medical', email: 'mariam@ideal.edu', password: 'Student@123' },
      { id: 'std_3', rollNumber: '1101', fullName: 'Fatima Zahra', fatherName: 'Muhammad Akram', contactNumber: '0345-1122334', class: '11th', group: 'Pre-Medical', email: 'fatima@ideal.edu', password: 'Student@123' },
      { id: 'std_4', rollNumber: '1102', fullName: 'Zaid Ali', fatherName: 'Ali Asghar', contactNumber: '0311-2233445', class: '11th', group: 'Pre-Engineering', email: 'zaid@ideal.edu', password: 'Student@123' },
      { id: 'std_5', rollNumber: '1001', fullName: 'Daniyal Raza', fatherName: 'Raza Hussain', contactNumber: '0334-9988776', class: '10th', group: 'Science', email: 'daniyal@ideal.edu', password: 'Student@123' },
      { id: 'std_6', rollNumber: '9001', fullName: 'Hamza Ahmed', fatherName: 'Ahmed Bilal', contactNumber: '0300-8877665', class: '9th', group: 'Science', email: 'hamza@ideal.edu', password: 'Student@123' },
      { id: 'std_7', rollNumber: '9002', fullName: 'Sara Bilal', fatherName: 'Bilal Mustafa', contactNumber: '0322-5544332', class: '9th', group: 'General', email: 'sara@ideal.edu', password: 'Student@123' }
    ];

    const months = window.UIUtils ? window.UIUtils.getMonthsList() : [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    studentSeeds.forEach((s, idx) => {
      data.students[s.id] = {
        ...s,
        status: 'Active',
        admissionDate: '2026-01-10',
        feeStatus: idx % 2 === 0 ? 'Up to Date' : 'Due',
        createdAt: '2026-01-10T08:00:00Z'
      };

      // 12-month Fee schedules (Standardized to Rs. 3,000 for all classes)
      const feeAmount = 3000;

      months.forEach((m, mIdx) => {
        const feeId = `fee_${s.id}_${mIdx + 1}`;
        const isPaid = mIdx < 8; // Jan to Aug paid
        const rcptNum = isPaid ? `260${mIdx + 1}001${s.rollNumber}`.slice(0, 10) : null;

        data.fees[feeId] = {
          id: feeId,
          studentId: s.id,
          rollNumber: s.rollNumber,
          studentName: s.fullName,
          fatherName: s.fatherName,
          class: s.class,
          group: s.group,
          contactNumber: s.contactNumber,
          month: m,
          monthOrder: mIdx + 1,
          academicYear: '2026-2027',
          dueDate: `10 ${m} 2026`,
          expectedAmount: feeAmount,
          paidAmount: isPaid ? feeAmount : 0,
          status: isPaid ? 'Paid' : 'Pending',
          paymentDate: isPaid ? `2026-0${mIdx + 1}-08` : null,
          receiptNumber: rcptNum,
          notes: isPaid ? 'Monthly tuition fee cleared' : '',
          receiptAvailableToStudent: isPaid,
          createdAt: '2026-01-01T00:00:00Z'
        };

        if (isPaid) {
          data.receipts[`rcpt_${rcptNum}`] = {
            id: `rcpt_${rcptNum}`,
            receiptNumber: rcptNum,
            feeId: feeId,
            studentId: s.id,
            studentName: s.fullName,
            fatherName: s.fatherName,
            rollNumber: s.rollNumber,
            contactNumber: s.contactNumber,
            class: s.class,
            group: s.group,
            month: m,
            academicYear: '2026-2027',
            expectedAmount: feeAmount,
            paidAmount: feeAmount,
            paymentDate: `2026-0${mIdx + 1}-08`,
            receiptDate: `2026-0${mIdx + 1}-08T10:00:00Z`,
            notes: 'Tuition Fee Paid via Cash Counter',
            availableToStudent: true,
            createdAt: `2026-0${mIdx + 1}-08T10:00:00Z`
          };
        }
      });
    });

    // 4. Sample Attendance records for September 2026
    const septWorkingDays = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'];
    septWorkingDays.forEach(day => {
      studentSeeds.forEach((st, i) => {
        const attId = `att_${st.id}_${day}`;
        const status = (i + day.charCodeAt(9)) % 7 === 0 ? 'Absent' : (i % 5 === 0 ? 'Leave' : 'Present');
        data.attendance[attId] = {
          id: attId,
          studentId: st.id,
          rollNumber: st.rollNumber,
          studentName: st.fullName,
          class: st.class,
          group: st.group,
          date: day,
          status: status,
          markedBy: 'Muhammad Tariq (Admin)',
          createdAt: `${day}T12:00:00Z`
        };
      });
    });

    // 5. Syllabus Books & Chapters
    const book1Id = 'book_12_cs_1';
    data.books[book1Id] = {
      id: book1Id,
      class: '12th',
      group: 'Computer Science',
      title: 'Computer Science - Part II',
      subject: 'Computer Science',
      code: 'CS-12',
      chaptersCount: 4,
      createdAt: '2026-01-05T00:00:00Z'
    };

    data.chapters['ch_1'] = { id: 'ch_1', bookId: book1Id, order: 1, title: 'Data Basics & Database Systems', status: 'Completed' };
    data.chapters['ch_2'] = { id: 'ch_2', bookId: book1Id, order: 2, title: 'Structured Query Language (SQL)', status: 'Currently Studying' };
    data.chapters['ch_3'] = { id: 'ch_3', bookId: book1Id, order: 3, title: 'C Programming Fundamentals', status: 'Not Started' };
    data.chapters['ch_4'] = { id: 'ch_4', bookId: book1Id, order: 4, title: 'Control Structures & Loops', status: 'Not Started' };

    const book2Id = 'book_12_med_1';
    data.books[book2Id] = {
      id: book2Id,
      class: '12th',
      group: 'Pre-Medical',
      title: 'Biology - Part II',
      subject: 'Biology',
      code: 'BIO-12',
      chaptersCount: 3,
      createdAt: '2026-01-05T00:00:00Z'
    };
    data.chapters['ch_5'] = { id: 'ch_5', bookId: book2Id, order: 1, title: 'Homeostasis & Osmoregulation', status: 'Completed' };
    data.chapters['ch_6'] = { id: 'ch_6', bookId: book2Id, order: 2, title: 'Support & Movement', status: 'Currently Studying' };
    data.chapters['ch_7'] = { id: 'ch_7', bookId: book2Id, order: 3, title: 'Coordination and Control', status: 'Not Started' };

    const book3Id = 'book_11_eng_1';
    data.books[book3Id] = {
      id: book3Id,
      class: '11th',
      group: 'Pre-Engineering',
      title: 'Mathematics - Part I',
      subject: 'Mathematics',
      code: 'MATH-11',
      chaptersCount: 3,
      createdAt: '2026-01-05T00:00:00Z'
    };
    data.chapters['ch_8'] = { id: 'ch_8', bookId: book3Id, order: 1, title: 'Number Systems & Complex Numbers', status: 'Completed' };
    data.chapters['ch_9'] = { id: 'ch_9', bookId: book3Id, order: 2, title: 'Matrices and Determinants', status: 'Currently Studying' };
    data.chapters['ch_10'] = { id: 'ch_10', bookId: book3Id, order: 3, title: 'Quadratic Equations', status: 'Not Started' };

    // 6. Announcements
    data.announcements['ann_1'] = {
      id: 'ann_1',
      title: 'Mid-Term Examination Schedule Announcement',
      content: 'The Mid-Term Examinations for classes 9th, 10th, 11th, and 12th will commence from Monday, 12th October 2026. The detailed date sheet and syllabus guidelines have been finalized.',
      targetClass: 'All',
      targetGroup: 'All',
      publishedBy: 'Ideal Coaching Center Administration',
      createdAt: '2026-09-25T10:00:00Z'
    };

    data.announcements['ann_2'] = {
      id: 'ann_2',
      title: '12th Pre-Medical Special Biology Workshop',
      content: 'A comprehensive 3-hour weekend masterclass on Genetic Engineering and Cell Biology will be conducted this Saturday from 10:00 AM to 1:00 PM. Attendance is mandatory.',
      targetClass: '12th',
      targetGroup: 'Pre-Medical',
      publishedBy: 'Prof. Dr. Tariq (Head of Science)',
      createdAt: '2026-09-27T08:30:00Z'
    };

    // 7. Today's Diary
    const todayStr = new Date().toISOString().split('T')[0];
    data.diary[`diary_12_cs_${todayStr}`] = {
      id: `diary_12_cs_${todayStr}`,
      class: '12th',
      group: 'Computer Science',
      date: todayStr,
      content: '• CS: Complete exercise 2.4 SQL joins and create database tables for library system.\n• English: Read essay on "My Ambition in Life" & memorize vocabulary list 4.\n• Physics: Solve numericals 14.1 to 14.5 on Electromagnetic Induction.',
      author: 'Muhammad Tariq (Admin)',
      createdAt: `${todayStr}T09:00:00Z`
    };

    data.diary[`diary_12_med_${todayStr}`] = {
      id: `diary_12_med_${todayStr}`,
      class: '12th',
      group: 'Pre-Medical',
      date: todayStr,
      content: '• Biology: Draw and label human skeletal diagram from Chapter 16.\n• Chemistry: Prepare reaction mechanisms for Aldehydes and Ketones.\n• Physics: Review Faraday laws and practice derivation on self-inductance.',
      author: 'Ayesha Khan (Admin)',
      createdAt: `${todayStr}T09:15:00Z`
    };

    // 8. Notifications
    data.notifications['notif_std_1'] = {
      id: 'notif_std_1',
      studentId: 'std_1',
      rollNumber: '1201',
      title: 'August Fee Paid & Receipt Available',
      message: 'Your August fee has been paid successfully. Receipt #2608001120 is now available in Fee Details.',
      type: 'fee_receipt',
      receiptNumber: '2608001120',
      isRead: false,
      createdAt: '2026-08-08T10:00:00Z'
    };

    // 9. Audit Logs
    data.audit_logs['aud_1'] = {
      id: 'aud_1',
      action: 'System Initialized',
      category: 'System',
      targetType: 'System',
      targetId: 'ideal-coaching-center',
      details: 'Ideal Coaching Center Management Portal initialized with active academic year 2026-2027.',
      performedBy: { name: 'Super Administrator', role: 'super_admin', email: 'superadmin@ideal.edu' },
      timestamp: '2026-01-01T08:00:00Z'
    };

    return data;
  }
}

window.FirebaseService = new FirebaseService();
