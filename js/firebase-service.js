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
        'system_settings',
        'admins',
        'students',
        'fees',
        'receipts',
        'attendance',
        'announcements',
        'diary',
        'books',
        'chapters',
        'notifications',
        'audit_logs',
        'receipt_templates',
        'examination_sessions',
        'examination_fees',
        'teachers',
        'teacher_assignments',
        'timetables',
        'attendance_cards',
        'teacher_attendance',
        'attendance_corrections',
        'salary_configs',
        'payroll',
        'promotions',
        'financial_adjustments',
        'salary_receipts'
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
        'system_settings',
        'admins',
        'students',
        'fees',
        'receipts',
        'attendance',
        'announcements',
        'diary',
        'books',
        'chapters',
        'audit_logs',
        'notifications',
        'receipt_templates',
        'examination_sessions',
        'examination_fees',
        'teachers',
        'teacher_assignments',
        'timetables',
        'attendance_cards',
        'teacher_attendance',
        'attendance_corrections',
        'salary_configs',
        'payroll',
        'promotions',
        'financial_adjustments'
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
    // Security & UI Guard: Students must never see cloud sync error toasts or messages
    if (window.AuthService && typeof window.AuthService.isStudent === 'function' && window.AuthService.isStudent()) {
      return;
    }
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
      // Auto-backfill new collections for upgraded modules if missing in cached storage
      const seed = this.getSeedData();
      const newCols = [
        'receipt_templates', 'examination_sessions', 'examination_fees',
        'teachers', 'teacher_assignments', 'timetables', 'attendance_cards',
        'teacher_attendance', 'attendance_corrections', 'salary_configs',
        'payroll', 'promotions', 'financial_adjustments'
      ];
      newCols.forEach(col => {
        if (!this.mockData[col] || Object.keys(this.mockData[col]).length === 0) {
          this.mockData[col] = seed[col] || {};
          migrated = true;
        }
      });

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
          // Do not falsely degrade healthy connection to 'error' on single listener fallback
          if (this.cloudStatus !== 'online') {
            this.setStatus('offline', err.message);
          }
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

        // Cleanly update local cache to match Cloud Firestore state
        this.mockData[collectionName] = collectionMap;
        this.saveLocalStore();
        this.setStatus('online');
        return docs;
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
    const strId = String(id);
    if (this.mockData[collectionName]) {
      if (this.mockData[collectionName][id]) {
        delete this.mockData[collectionName][id];
        deleted = true;
      }
      if (this.mockData[collectionName][strId]) {
        delete this.mockData[collectionName][strId];
        deleted = true;
      }
      if (deleted) {
        this.saveLocalStore();
        this.notifySubscribers(collectionName);
      }
    }

    if (this.isLive && this.db) {
      try {
        await this.db.collection(collectionName).doc(strId).delete();
        this.setStatus('online');
        deleted = true;
      } catch (err) {
        console.error(`Firestore delete error for ${collectionName}/${id}:`, err);
        this.setStatus('error', err.message);
        this.handleSyncError('Delete', collectionName, err);
        throw err;
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
   * Process Fee Payment for Single or Multiple Months (Atomic Batch Write)
   * Generates a single official 10-digit receipt, updates all selected fee records,
   * supports Admin-controlled Late Fee Fine (applied or waived), and records audit log.
   */
  async processMultiMonthFeePayment(feeIds, paymentData) {
    if (!Array.isArray(feeIds) || feeIds.length === 0) {
      throw new Error('Please select at least one fee month for payment.');
    }

    const allFees = await this.getCollection('fees');
    const targetFees = feeIds.map(id => allFees.find(f => f.id === id)).filter(Boolean);

    if (targetFees.length === 0) {
      throw new Error('Selected fee records not found.');
    }

    // Sort chronologically by monthOrder
    targetFees.sort((a, b) => (Number(a.monthOrder) || 0) - (Number(b.monthOrder) || 0));

    const primaryFee = targetFees[0];
    const existingReceipts = await this.getCollection('receipts');
    const receiptNumber = window.UIUtils.generate10DigitReceiptNumber(existingReceipts);

    const paidDate = paymentData.paymentDate || new Date().toISOString().split('T')[0];
    const baseTuitionAmount = targetFees.reduce((sum, f) => sum + (Number(f.expectedAmount) || 3000), 0);

    // Admin-controlled Late Fee Fine calculation
    const applyLateFee = Boolean(paymentData.applyLateFee);
    const lateFeeAmount = applyLateFee ? Math.max(0, Number(paymentData.lateFeeAmount) || 0) : 0;
    const lateFeeWaived = !applyLateFee || lateFeeAmount === 0;
    const lateFeeReason = paymentData.lateFeeReason || (lateFeeWaived ? 'Waived by Administration' : 'Overdue Payment Fine');

    const totalPaidAmount = baseTuitionAmount + lateFeeAmount;
    const monthsList = targetFees.map(f => f.month);
    const monthsSummary = monthsList.join(', ');

    // Atomic batch write (Firestore batch when live, or synchronized local store)
    const batch = (this.isLive && this.db) ? this.db.batch() : null;

    for (const fee of targetFees) {
      const feeUpdateData = {
        status: 'Paid',
        paidAmount: Number(fee.expectedAmount) || 3000,
        paymentDate: paidDate,
        receiptNumber: receiptNumber,
        notes: paymentData.notes || `Tuition fee paid (${targetFees.length > 1 ? 'Multi-month: ' + monthsSummary : fee.month})`,
        lateFeeApplied: !lateFeeWaived,
        updatedAt: new Date().toISOString()
      };

      if (batch) {
        const feeRef = this.db.collection('fees').doc(fee.id);
        batch.update(feeRef, feeUpdateData);
      }
      if (this.mockData['fees'] && this.mockData['fees'][fee.id]) {
        Object.assign(this.mockData['fees'][fee.id], feeUpdateData);
      }
    }

    // Build consolidated receipt record
    const receiptRecord = {
      id: `rcpt_${receiptNumber}`,
      receiptNumber: receiptNumber,
      feeId: targetFees.length === 1 ? primaryFee.id : null,
      feeIds: targetFees.map(f => f.id),
      isMultiMonth: targetFees.length > 1,
      monthsCount: targetFees.length,
      months: monthsList,
      month: monthsSummary,
      studentId: primaryFee.studentId,
      studentName: primaryFee.studentName,
      fatherName: primaryFee.fatherName,
      rollNumber: primaryFee.rollNumber,
      contactNumber: primaryFee.contactNumber,
      class: primaryFee.class,
      group: primaryFee.group,
      academicYear: primaryFee.academicYear,
      baseTuitionAmount: baseTuitionAmount,
      lateFeeAmount: lateFeeAmount,
      lateFeeWaived: lateFeeWaived,
      lateFeeReason: lateFeeReason,
      expectedAmount: baseTuitionAmount,
      paidAmount: totalPaidAmount,
      paymentDate: paidDate,
      receiptDate: new Date().toISOString(),
      paymentMode: paymentData.paymentMode || 'Cash Counter',
      notes: paymentData.notes || `Tuition Fee Paid (${monthsSummary})`,
      availableToStudent: false, // Office sends to student when ready
      createdAt: new Date().toISOString()
    };

    if (batch) {
      const rcptRef = this.db.collection('receipts').doc(receiptRecord.id);
      batch.set(rcptRef, receiptRecord);
      await batch.commit();
    } else {
      if (!this.mockData['receipts']) this.mockData['receipts'] = {};
      this.mockData['receipts'][receiptRecord.id] = receiptRecord;
    }

    // Audit log
    const auditDetail = targetFees.length > 1
      ? `Processed Multi-Month Payment (${targetFees.length} months: ${monthsSummary}) totaling Rs. ${totalPaidAmount} (Base Tuition: Rs. ${baseTuitionAmount}${lateFeeAmount > 0 ? `, Late Fine: Rs. ${lateFeeAmount}` : ', Late Fine Waived'}) with Receipt #${receiptNumber} for ${primaryFee.studentName} (Roll #${primaryFee.rollNumber})`
      : `Marked ${primaryFee.month} fee as Paid (Rs. ${totalPaidAmount}${lateFeeAmount > 0 ? ` incl. Late Fine Rs. ${lateFeeAmount}` : ''}) with Receipt #${receiptNumber} for ${primaryFee.studentName} (Roll #${primaryFee.rollNumber})`;

    await window.AuditService.log({
      action: 'Fee Payment Processed',
      category: 'Finance',
      targetType: 'Fee',
      targetId: receiptRecord.id,
      details: auditDetail
    });

    return { receipt: receiptRecord, fees: targetFees };
  }

  /**
   * Mark a Fee as Paid and generate 10-digit receipt (Delegates to processMultiMonthFeePayment)
   */
  async processFeePayment(feeId, paymentData) {
    const result = await this.processMultiMonthFeePayment([feeId], paymentData);
    return { fee: result.fees[0], receipt: result.receipt };
  }

  /**
   * Send Receipt to Student Account & trigger real-time notification
   * Handles both single-month and consolidated multi-month receipts
   */
  async sendReceiptToStudent(feeId, receiptNum = null) {
    const receipts = await this.getCollection('receipts');
    const allFees = await this.getCollection('fees');

    let matchedReceipt = null;
    if (receiptNum) {
      matchedReceipt = receipts.find(r => r.receiptNumber === String(receiptNum));
    }

    let fee = null;
    if (feeId) {
      fee = allFees.find(f => f.id === feeId);
    }

    if (!matchedReceipt && fee) {
      matchedReceipt = receipts.find(r => 
        r.receiptNumber === fee.receiptNumber || 
        r.feeId === feeId || 
        (Array.isArray(r.feeIds) && r.feeIds.includes(feeId))
      );
    }

    if (!fee && matchedReceipt) {
      fee = allFees.find(f => 
        f.receiptNumber === matchedReceipt.receiptNumber || 
        (Array.isArray(matchedReceipt.feeIds) && matchedReceipt.feeIds.includes(f.id))
      );
    }

    if (!matchedReceipt && !fee) throw new Error('Receipt or Fee record not found');

    const targetReceiptNum = matchedReceipt ? matchedReceipt.receiptNumber : fee.receiptNumber;

    // Find ALL related fees for this receipt (single or multi-month)
    const relatedFees = allFees.filter(f => 
      f.receiptNumber === targetReceiptNum || 
      (matchedReceipt && Array.isArray(matchedReceipt.feeIds) && matchedReceipt.feeIds.includes(f.id)) ||
      (fee && f.id === fee.id)
    );

    // Update all fee records to make receipt available to student
    for (const f of relatedFees) {
      await this.updateDocument('fees', f.id, {
        receiptAvailableToStudent: true
      });
    }

    // Update receipt record
    if (matchedReceipt) {
      await this.updateDocument('receipts', matchedReceipt.id, {
        availableToStudent: true
      });
    }

    const studentId = matchedReceipt ? matchedReceipt.studentId : fee.studentId;
    const rollNumber = matchedReceipt ? matchedReceipt.rollNumber : fee.rollNumber;
    const studentName = matchedReceipt ? matchedReceipt.studentName : fee.studentName;
    const monthLabel = matchedReceipt ? matchedReceipt.month : fee.month;

    // Create notification for student
    const notification = {
      id: `notif_${Date.now()}`,
      studentId: studentId,
      rollNumber: rollNumber,
      title: 'Fee Paid & Receipt Available',
      message: `Your fee payment receipt #${targetReceiptNum} for ${monthLabel} is now officially available in your Student Portal.`,
      type: 'fee_receipt',
      receiptNumber: targetReceiptNum,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await this.addDocument('notifications', notification);

    // Audit log
    await window.AuditService.log({
      action: 'Receipt Sent to Student',
      category: 'Finance',
      targetType: 'Student',
      targetId: studentId,
      details: `Official Receipt #${targetReceiptNum} (${monthLabel}) sent to student ${studentName} (Roll #${rollNumber})`
    });

    return true;
  }

  /**
   * System Settings with Late Fee Fine Configuration
   */
  async getSystemSettings() {
    const settings = await this.getDocument('settings', 'global_settings');
    if (settings) {
      if (settings.lateFeeEnabled === undefined) settings.lateFeeEnabled = true;
      if (settings.defaultLateFee === undefined) settings.defaultLateFee = 200;
      if (settings.feeDueDay === undefined) settings.feeDueDay = 10;
      return settings;
    }

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
      defaultFee12th: 3000,
      lateFeeEnabled: true,
      defaultLateFee: 200,
      feeDueDay: 10
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
      audit_logs: {},
      receipt_templates: {},
      examination_sessions: {},
      examination_fees: {},
      teachers: {},
      teacher_assignments: {},
      timetables: {},
      attendance_cards: {},
      teacher_attendance: {},
      attendance_corrections: {},
      salary_configs: {},
      payroll: {},
      promotions: {},
      financial_adjustments: {}
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
      defaultFee12th: 3000,
      lateFeeEnabled: true,
      defaultLateFee: 200,
      feeDueDay: 10
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

    // 10. Receipt Customization Template
    data.receipt_templates['default_template'] = {
      id: 'default_template',
      institutionName: 'Ideal Coaching Center',
      tagline: 'Excellence in Education',
      logoUrl: '',
      address: 'Main Boulevard, Academic Block, Lahore, Pakistan',
      phone: '+92 300 1234567',
      email: 'info@idealcoaching.edu.pk',
      receiptHeading: 'OFFICIAL FEE RECEIPT',
      footerText: 'This is an official computer-generated receipt from Ideal Coaching Center. Fees once deposited are non-refundable and non-transferable.',
      signatureLabelLeft: 'Depositor / Student Signature',
      signatureLabelRight: 'Authorized Cashier / Principal',
      receiptSize: 'A4',
      printLayout: '2-copy', // 2-copy (Office Copy + Student Copy), single, thermal
      currency: 'Rs.',
      dateFormat: 'DD/MM/YYYY',
      showStudentName: true,
      showFatherName: true,
      showRollNumber: true,
      showContactNumber: true,
      showClass: true,
      showGroup: true,
      showAcademicYear: true,
      showFeeMonth: true,
      showFeeType: true,
      showExpectedAmount: true,
      showPaidAmount: true,
      showRemainingBalance: true,
      showPaymentMethod: true,
      showPaymentDate: true,
      showTransactionRef: true,
      showReceiptNumber: true,
      showStaffMember: true,
      updatedAt: '2026-09-01T08:00:00Z'
    };

    // 11. Teachers
    data.teachers['tch_101'] = {
      id: 'tch_101',
      teacherId: 'TCH-101',
      fullName: 'Prof. Dr. Tariq Mahmood',
      email: 'tariq.teacher@ideal.edu',
      password: 'Teacher@123',
      contactNumber: '0300-4567891',
      address: 'Model Town, Lahore',
      qualifications: 'Ph.D. in Biological Sciences (PU)',
      subjects: ['Biology', 'General Science'],
      assignedClasses: ['12th', '11th', '10th'],
      assignedGroups: ['Pre-Medical', 'Science'],
      joiningDate: '2024-08-15',
      employmentStatus: 'Permanent',
      salaryType: 'fixed',
      salaryAmount: 65000,
      accountStatus: 'Active',
      role: 'teacher',
      createdAt: '2024-08-15T08:00:00Z'
    };

    data.teachers['tch_102'] = {
      id: 'tch_102',
      teacherId: 'TCH-102',
      fullName: 'Engr. Hamza Bilal',
      email: 'hamza.teacher@ideal.edu',
      password: 'Teacher@123',
      contactNumber: '0321-9876543',
      address: 'Johar Town, Lahore',
      qualifications: 'M.Sc. Computer Engineering (UET)',
      subjects: ['Computer Science', 'Physics'],
      assignedClasses: ['12th', '11th'],
      assignedGroups: ['Computer Science', 'Pre-Engineering'],
      joiningDate: '2025-01-10',
      employmentStatus: 'Permanent',
      salaryType: 'fixed',
      salaryAmount: 60000,
      accountStatus: 'Active',
      role: 'teacher',
      createdAt: '2025-01-10T08:00:00Z'
    };

    data.teachers['tch_103'] = {
      id: 'tch_103',
      teacherId: 'TCH-103',
      fullName: 'Dr. Ayesha Siddiqua',
      email: 'ayesha.teacher@ideal.edu',
      password: 'Teacher@123',
      contactNumber: '0333-5551234',
      address: 'DHA Phase 5, Lahore',
      qualifications: 'M.Phil Chemistry (GCU)',
      subjects: ['Chemistry'],
      assignedClasses: ['12th', '11th', '10th', '9th'],
      assignedGroups: ['Pre-Medical', 'Pre-Engineering', 'Science'],
      joiningDate: '2025-03-01',
      employmentStatus: 'Permanent',
      salaryType: 'per_period',
      salaryAmount: 1200,
      accountStatus: 'Active',
      role: 'teacher',
      createdAt: '2025-03-01T08:00:00Z'
    };

    // 12. Teacher Class & Subject Assignments
    data.teacher_assignments['asgn_1'] = {
      id: 'asgn_1',
      teacherId: 'tch_101',
      teacherName: 'Prof. Dr. Tariq Mahmood',
      subject: 'Biology',
      class: '12th',
      group: 'Pre-Medical',
      academicYear: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-05-31',
      status: 'Active',
      createdAt: '2026-08-01T08:00:00Z'
    };
    data.teacher_assignments['asgn_2'] = {
      id: 'asgn_2',
      teacherId: 'tch_101',
      teacherName: 'Prof. Dr. Tariq Mahmood',
      subject: 'Biology',
      class: '11th',
      group: 'Pre-Medical',
      academicYear: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-05-31',
      status: 'Active',
      createdAt: '2026-08-01T08:00:00Z'
    };
    data.teacher_assignments['asgn_3'] = {
      id: 'asgn_3',
      teacherId: 'tch_102',
      teacherName: 'Engr. Hamza Bilal',
      subject: 'Computer Science',
      class: '12th',
      group: 'Computer Science',
      academicYear: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-05-31',
      status: 'Active',
      createdAt: '2026-08-01T08:00:00Z'
    };
    data.teacher_assignments['asgn_4'] = {
      id: 'asgn_4',
      teacherId: 'tch_102',
      teacherName: 'Engr. Hamza Bilal',
      subject: 'Physics',
      class: '12th',
      group: 'Pre-Engineering',
      academicYear: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-05-31',
      status: 'Active',
      createdAt: '2026-08-01T08:00:00Z'
    };
    data.teacher_assignments['asgn_5'] = {
      id: 'asgn_5',
      teacherId: 'tch_103',
      teacherName: 'Dr. Ayesha Siddiqua',
      subject: 'Chemistry',
      class: '12th',
      group: 'Pre-Medical',
      academicYear: '2026-2027',
      startDate: '2026-08-01',
      endDate: '2027-05-31',
      status: 'Active',
      createdAt: '2026-08-01T08:00:00Z'
    };

    // 13. Timetables (Weekly Schedule)
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periodsTemplate = [
      { num: 1, start: '08:30', end: '09:20', subject: 'Computer Science', teacherId: 'tch_102', teacherName: 'Engr. Hamza Bilal', room: 'Lab 1', class: '12th', group: 'Computer Science' },
      { num: 2, start: '09:25', end: '10:15', subject: 'Physics', teacherId: 'tch_102', teacherName: 'Engr. Hamza Bilal', room: 'Room 201', class: '12th', group: 'Computer Science' },
      { num: 3, start: '10:20', end: '11:10', subject: 'Mathematics', teacherId: 'tch_102', teacherName: 'Engr. Hamza Bilal', room: 'Room 201', class: '12th', group: 'Computer Science' },
      { num: 4, start: '11:40', end: '12:30', subject: 'English', teacherId: 'tch_101', teacherName: 'Prof. Dr. Tariq Mahmood', room: 'Room 201', class: '12th', group: 'Computer Science' },
      { num: 1, start: '08:30', end: '09:20', subject: 'Biology', teacherId: 'tch_101', teacherName: 'Prof. Dr. Tariq Mahmood', room: 'Bio Lab', class: '12th', group: 'Pre-Medical' },
      { num: 2, start: '09:25', end: '10:15', subject: 'Chemistry', teacherId: 'tch_103', teacherName: 'Dr. Ayesha Siddiqua', room: 'Chem Lab', class: '12th', group: 'Pre-Medical' },
      { num: 3, start: '10:20', end: '11:10', subject: 'Physics', teacherId: 'tch_102', teacherName: 'Engr. Hamza Bilal', room: 'Room 202', class: '12th', group: 'Pre-Medical' }
    ];

    weekdays.forEach(day => {
      periodsTemplate.forEach((p) => {
        const id = `tt_${day.toLowerCase()}_${p.class.toLowerCase()}_${p.group.replace(/\s+/g, '_').toLowerCase()}_p${p.num}`;
        data.timetables[id] = {
          id,
          academicYear: '2026-2027',
          day,
          periodNumber: p.num,
          startTime: p.start,
          endTime: p.end,
          subject: p.subject,
          teacherId: p.teacherId,
          teacherName: p.teacherName,
          class: p.class,
          group: p.group,
          room: p.room,
          isPublished: true,
          publishedAt: '2026-08-15T09:00:00Z',
          updatedAt: '2026-08-15T09:00:00Z'
        };
      });
    });

    // 14. Examination Sessions & Examination Fees
    data.examination_sessions['exam_mid_2026'] = {
      id: 'exam_mid_2026',
      name: 'Mid-Term Examination 2026',
      academicYear: '2026-2027',
      class: '12th',
      group: 'All',
      examType: 'Mid-Term',
      startDate: '2026-10-12',
      endDate: '2026-10-24',
      feeAmount: 1500,
      paymentDeadline: '2026-10-10',
      description: 'Comprehensive mid-term evaluation covering first half syllabus of 12th class.',
      status: 'Active',
      createdAt: '2026-09-15T10:00:00Z'
    };

    data.examination_sessions['exam_mock_2027'] = {
      id: 'exam_mock_2027',
      name: 'Mock Board Examination 2027',
      academicYear: '2026-2027',
      class: '12th',
      group: 'All',
      examType: 'Mock Board',
      startDate: '2027-02-15',
      endDate: '2027-02-28',
      feeAmount: 2000,
      paymentDeadline: '2027-02-10',
      description: 'Full length board paper simulation with external exam center layout.',
      status: 'Upcoming',
      createdAt: '2026-09-15T10:00:00Z'
    };

    // Examination fees for 12th class students
    data.examination_fees['efee_std_1_mid'] = {
      id: 'efee_std_1_mid',
      sessionId: 'exam_mid_2026',
      sessionName: 'Mid-Term Examination 2026',
      academicYear: '2026-2027',
      studentId: 'std_1',
      studentName: 'Usman Farooq',
      rollNumber: '1201',
      class: '12th',
      group: 'Computer Science',
      totalFee: 1500,
      paidAmount: 1500,
      remainingBalance: 0,
      status: 'Paid',
      dueDate: '2026-10-10',
      paymentDate: '2026-09-28',
      receiptNumber: 'EXM-2026-00101',
      paymentHistory: [
        { amount: 1500, date: '2026-09-28', method: 'Cash Counter', receiptNumber: 'EXM-2026-00101', notes: 'Full fee paid' }
      ],
      createdAt: '2026-09-15T10:00:00Z'
    };

    data.examination_fees['efee_std_2_mid'] = {
      id: 'efee_std_2_mid',
      sessionId: 'exam_mid_2026',
      sessionName: 'Mid-Term Examination 2026',
      academicYear: '2026-2027',
      studentId: 'std_2',
      studentName: 'Mariam Siddiqui',
      rollNumber: '1202',
      class: '12th',
      group: 'Pre-Medical',
      totalFee: 1500,
      paidAmount: 750,
      remainingBalance: 750,
      status: 'Partial',
      dueDate: '2026-10-10',
      paymentDate: '2026-09-29',
      receiptNumber: 'EXM-2026-00102',
      paymentHistory: [
        { amount: 750, date: '2026-09-29', method: 'Cash Counter', receiptNumber: 'EXM-2026-00102', notes: 'First installment paid' }
      ],
      createdAt: '2026-09-15T10:00:00Z'
    };

    // 15. Attendance Cards & Scannable QR Tokens
    data.attendance_cards['card_std_1'] = {
      id: 'card_std_1',
      personId: 'std_1',
      personType: 'student',
      name: 'Usman Farooq',
      rollNumber: '1201',
      class: '12th',
      group: 'Computer Science',
      token: 'ICC-STD-1201-9821-V1',
      status: 'Active',
      generatedAt: '2026-08-01T08:00:00Z'
    };

    data.attendance_cards['card_std_2'] = {
      id: 'card_std_2',
      personId: 'std_2',
      personType: 'student',
      name: 'Mariam Siddiqui',
      rollNumber: '1202',
      class: '12th',
      group: 'Pre-Medical',
      token: 'ICC-STD-1202-9822-V1',
      status: 'Active',
      generatedAt: '2026-08-01T08:00:00Z'
    };

    data.attendance_cards['card_tch_101'] = {
      id: 'card_tch_101',
      personId: 'tch_101',
      personType: 'teacher',
      name: 'Prof. Dr. Tariq Mahmood',
      teacherId: 'TCH-101',
      token: 'ICC-TCH-101-7711-V1',
      status: 'Active',
      generatedAt: '2026-08-01T08:00:00Z'
    };

    data.attendance_cards['card_tch_102'] = {
      id: 'card_tch_102',
      personId: 'tch_102',
      personType: 'teacher',
      name: 'Engr. Hamza Bilal',
      teacherId: 'TCH-102',
      token: 'ICC-TCH-102-7712-V1',
      status: 'Active',
      generatedAt: '2026-08-01T08:00:00Z'
    };

    // 16. Teacher Attendance
    septWorkingDays.forEach(day => {
      data.teacher_attendance[`tatt_101_${day}`] = {
        id: `tatt_101_${day}`,
        teacherId: 'tch_101',
        teacherCode: 'TCH-101',
        teacherName: 'Prof. Dr. Tariq Mahmood',
        date: day,
        status: 'Present',
        arrivalTime: '08:15 AM',
        method: 'QR Scan',
        recordedBy: 'QR Gate Scanner',
        createdAt: `${day}T08:15:00Z`
      };
      data.teacher_attendance[`tatt_102_${day}`] = {
        id: `tatt_102_${day}`,
        teacherId: 'tch_102',
        teacherCode: 'TCH-102',
        teacherName: 'Engr. Hamza Bilal',
        date: day,
        status: 'Present',
        arrivalTime: '08:20 AM',
        method: 'QR Scan',
        recordedBy: 'QR Gate Scanner',
        createdAt: `${day}T08:20:00Z`
      };
      data.teacher_attendance[`tatt_103_${day}`] = {
        id: `tatt_103_${day}`,
        teacherId: 'tch_103',
        teacherCode: 'TCH-103',
        teacherName: 'Dr. Ayesha Siddiqua',
        date: day,
        status: 'Present',
        arrivalTime: '09:10 AM',
        method: 'QR Scan',
        recordedBy: 'QR Gate Scanner',
        createdAt: `${day}T09:10:00Z`
      };
    });

    // 17. Attendance Corrections
    data.attendance_corrections['corr_1'] = {
      id: 'corr_1',
      requestType: 'student_attendance',
      personId: 'std_2',
      personName: 'Mariam Siddiqui',
      rollNumber: '1202',
      class: '12th',
      group: 'Pre-Medical',
      date: '2026-09-24',
      originalStatus: 'Absent',
      requestedStatus: 'Present',
      reason: 'Student was present in Chemistry practical; scanner station was occupied during registration.',
      requestedBy: 'Muhammad Tariq (Admin)',
      status: 'Pending Approval',
      createdAt: '2026-09-25T11:00:00Z'
    };

    // 18. Teacher Salary Configurations
    data.salary_configs['salcfg_tch_101'] = {
      id: 'salcfg_tch_101',
      teacherId: 'tch_101',
      teacherName: 'Prof. Dr. Tariq Mahmood',
      salaryType: 'fixed',
      baseAmount: 65000,
      paymentCycle: 'Monthly',
      allowances: 5000,
      allowanceReason: 'Head of Science Allowance',
      deductions: 2000,
      deductionReason: 'Tax Deduction',
      effectiveDate: '2026-01-01',
      status: 'Active',
      updatedAt: '2026-01-01T08:00:00Z'
    };

    data.salary_configs['salcfg_tch_102'] = {
      id: 'salcfg_tch_102',
      teacherId: 'tch_102',
      teacherName: 'Engr. Hamza Bilal',
      salaryType: 'fixed',
      baseAmount: 60000,
      paymentCycle: 'Monthly',
      allowances: 3000,
      allowanceReason: 'Computer Lab Incharge',
      deductions: 0,
      deductionReason: '',
      effectiveDate: '2026-01-01',
      status: 'Active',
      updatedAt: '2026-01-01T08:00:00Z'
    };

    data.salary_configs['salcfg_tch_103'] = {
      id: 'salcfg_tch_103',
      teacherId: 'tch_103',
      teacherName: 'Dr. Ayesha Siddiqua',
      salaryType: 'per_period',
      ratePerPeriod: 1200,
      paymentCycle: 'Monthly',
      allowances: 0,
      deductions: 0,
      effectiveDate: '2026-03-01',
      status: 'Active',
      updatedAt: '2026-03-01T08:00:00Z'
    };

    // 19. Payroll Records
    data.payroll['pay_101_aug26'] = {
      id: 'pay_101_aug26',
      payrollRef: 'PAY-2026-08-101',
      teacherId: 'tch_101',
      teacherName: 'Prof. Dr. Tariq Mahmood',
      teacherCode: 'TCH-101',
      salaryMonth: 'August 2026',
      academicYear: '2026-2027',
      salaryType: 'fixed',
      baseSalary: 65000,
      allowances: 5000,
      deductions: 2000,
      advances: 0,
      netPayable: 68000,
      actualPaid: 68000,
      status: 'Paid',
      paymentDate: '2026-09-01',
      paymentMethod: 'Bank Transfer (HBL)',
      transactionRef: 'HBL-9988112',
      disbursedBy: 'Super Administrator',
      notes: 'Cleared on schedule for August 2026.',
      createdAt: '2026-09-01T09:00:00Z'
    };

    data.payroll['pay_102_aug26'] = {
      id: 'pay_102_aug26',
      payrollRef: 'PAY-2026-08-102',
      teacherId: 'tch_102',
      teacherName: 'Engr. Hamza Bilal',
      teacherCode: 'TCH-102',
      salaryMonth: 'August 2026',
      academicYear: '2026-2027',
      salaryType: 'fixed',
      baseSalary: 60000,
      allowances: 3000,
      deductions: 0,
      advances: 0,
      netPayable: 63000,
      actualPaid: 63000,
      status: 'Paid',
      paymentDate: '2026-09-01',
      paymentMethod: 'Bank Transfer (Meezan)',
      transactionRef: 'MZN-7711223',
      disbursedBy: 'Super Administrator',
      notes: 'Cleared on schedule for August 2026.',
      createdAt: '2026-09-01T09:15:00Z'
    };

    // 20. Promotions History
    data.promotions['prom_2026_01'] = {
      id: 'prom_2026_01',
      sourceYear: '2025-2026',
      destYear: '2026-2027',
      sourceClass: '11th',
      destClass: '12th',
      sourceGroup: 'Computer Science',
      destGroup: 'Computer Science',
      studentCount: 14,
      rollNumberPolicy: 'retain',
      executedBy: 'Super Administrator',
      date: '2026-01-08',
      createdAt: '2026-01-08T10:00:00Z'
    };

    // 21. Financial Adjustments (Refunds & Payment Corrections)
    data.financial_adjustments['adj_ref_1'] = {
      id: 'adj_ref_1',
      adjustmentType: 'refund',
      studentId: 'std_1',
      studentName: 'Usman Farooq',
      rollNumber: '1201',
      receiptNumber: '2608001120',
      feeMonth: 'August 2026',
      originalAmount: 3000,
      requestedAmount: 500,
      reason: 'Duplicate lab registration deposit collected by mistake.',
      requestedBy: 'Muhammad Tariq (Admin)',
      status: 'Pending Approval',
      createdAt: '2026-09-26T14:00:00Z'
    };

    data.financial_adjustments['adj_corr_1'] = {
      id: 'adj_corr_1',
      adjustmentType: 'correction',
      studentId: 'std_4',
      studentName: 'Zaid Ali',
      rollNumber: '1102',
      receiptNumber: '2608001102',
      feeMonth: 'August 2026',
      originalAmount: 3000,
      proposedAmount: 2500,
      reason: 'Sibling discount of Rs. 500 was not recorded at cash counter.',
      requestedBy: 'Ayesha Khan (Admin)',
      status: 'Pending Approval',
      createdAt: '2026-09-27T10:30:00Z'
    };

    return data;
  }

  // ==========================================
  // Specialized Methods for Upgraded Modules
  // ==========================================

  /**
   * Get Active Receipt Template
   */
  async getReceiptTemplate() {
    let tpl = await this.getDocument('receipt_templates', 'default_template');
    if (!tpl) {
      const seed = this.getSeedData();
      tpl = seed.receipt_templates['default_template'];
      await this.addDocument('receipt_templates', tpl);
    }
    return tpl;
  }

  /**
   * Save Receipt Template
   */
  async saveReceiptTemplate(templateData) {
    const updated = await this.updateDocument('receipt_templates', 'default_template', templateData);
    await window.AuditService.log({
      action: 'Receipt Template Updated',
      category: 'Settings',
      targetType: 'Template',
      targetId: 'default_template',
      details: `Custom receipt template layout and display toggles updated by Super Admin.`
    });
    return updated;
  }

  /**
   * Process Examination Fee Payment (Supports partial and full payments with unique receipt)
   */
  async processExaminationFeePayment(examFeeId, paymentData) {
    const fee = await this.getDocument('examination_fees', examFeeId);
    if (!fee) throw new Error('Examination fee record not found.');

    const payAmount = Number(paymentData.amount);
    if (!payAmount || payAmount <= 0) throw new Error('Please enter a valid payment amount.');

    const remaining = (Number(fee.totalFee) || 0) - (Number(fee.paidAmount) || 0);
    if (payAmount > remaining) {
      throw new Error(`Amount cannot exceed remaining balance of Rs. ${remaining}.`);
    }

    const newPaidAmount = (Number(fee.paidAmount) || 0) + payAmount;
    const newRemaining = (Number(fee.totalFee) || 0) - newPaidAmount;
    const newStatus = newRemaining === 0 ? 'Paid' : 'Partial';

    const receipts = await this.getCollection('receipts');
    const receiptNumber = 'EXM-' + window.UIUtils.generate10DigitReceiptNumber(receipts).slice(3);

    const paymentEntry = {
      amount: payAmount,
      date: paymentData.paymentDate || new Date().toISOString().split('T')[0],
      method: paymentData.paymentMethod || 'Cash Counter',
      receiptNumber: receiptNumber,
      transactionRef: paymentData.transactionRef || '',
      notes: paymentData.notes || '',
      recordedBy: paymentData.recordedBy || 'Admin'
    };

    const updatedHistory = Array.isArray(fee.paymentHistory) ? [...fee.paymentHistory, paymentEntry] : [paymentEntry];

    // Update examination fee record
    await this.updateDocument('examination_fees', fee.id, {
      paidAmount: newPaidAmount,
      remainingBalance: newRemaining,
      status: newStatus,
      paymentDate: paymentEntry.date,
      receiptNumber: receiptNumber,
      paymentHistory: updatedHistory
    });

    // Generate unique official examination receipt
    const receiptRecord = {
      id: `rcpt_${receiptNumber}`,
      receiptNumber: receiptNumber,
      feeType: 'Examination Fee',
      examSessionId: fee.sessionId,
      examSessionName: fee.sessionName,
      studentId: fee.studentId,
      studentName: fee.studentName,
      rollNumber: fee.rollNumber,
      class: fee.class,
      group: fee.group,
      academicYear: fee.academicYear,
      expectedAmount: fee.totalFee,
      paidAmount: payAmount,
      totalPaidToDate: newPaidAmount,
      remainingBalance: newRemaining,
      paymentDate: paymentEntry.date,
      paymentMode: paymentEntry.method,
      transactionRef: paymentEntry.transactionRef,
      receiptDate: new Date().toISOString(),
      notes: `Examination Fee (${fee.sessionName}) - ${newStatus}`,
      availableToStudent: true,
      createdAt: new Date().toISOString()
    };
    await this.addDocument('receipts', receiptRecord);

    // Create notification for student
    await this.addDocument('notifications', {
      studentId: fee.studentId,
      rollNumber: fee.rollNumber,
      title: 'Examination Fee Paid',
      message: `Payment of Rs. ${payAmount} recorded for ${fee.sessionName}. Receipt #${receiptNumber} is now ready.`,
      type: 'exam_receipt',
      receiptNumber: receiptNumber,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    // Audit log
    await window.AuditService.log({
      action: 'Examination Fee Payment Processed',
      category: 'Finance',
      targetType: 'ExamFee',
      targetId: fee.id,
      details: `Processed Rs. ${payAmount} for ${fee.studentName} (Roll #${fee.rollNumber}) for ${fee.sessionName}. Receipt #${receiptNumber}. Balance: Rs. ${newRemaining}`
    });

    return { fee: { ...fee, paidAmount: newPaidAmount, remainingBalance: newRemaining, status: newStatus }, receipt: receiptRecord };
  }

  /**
   * Check Timetable Conflict
   * Prevents assigning the same teacher to two overlapping periods or booking the same classroom
   */
  async checkTimetableConflict(periodData, excludePeriodId = null) {
    const allTimetables = await this.getCollection('timetables');
    const day = periodData.day;
    const start = periodData.startTime;
    const end = periodData.endTime;

    // Helper to test time overlap between two intervals [s1, e1] and [s2, e2]
    const overlaps = (s1, e1, s2, e2) => {
      return (s1 < e2 && s2 < e1);
    };

    for (const tt of allTimetables) {
      if (excludePeriodId && tt.id === excludePeriodId) continue;
      if (tt.day !== day) continue;
      if (tt.academicYear !== (periodData.academicYear || '2026-2027')) continue;

      const timeConflict = overlaps(start, end, tt.startTime, tt.endTime) || (tt.periodNumber === Number(periodData.periodNumber));

      if (timeConflict) {
        // Teacher conflict check
        if (tt.teacherId && periodData.teacherId && tt.teacherId === periodData.teacherId) {
          return {
            hasConflict: true,
            type: 'teacher',
            message: `Conflict: ${tt.teacherName} is already assigned to ${tt.class} (${tt.subject}) during Period ${tt.periodNumber} (${tt.startTime} - ${tt.endTime}) on ${day}.`
          };
        }
        // Room conflict check
        if (tt.room && periodData.room && tt.room.toLowerCase().trim() === periodData.room.toLowerCase().trim()) {
          return {
            hasConflict: true,
            type: 'room',
            message: `Room Conflict: ${tt.room} is already booked by ${tt.teacherName} for ${tt.class} during Period ${tt.periodNumber} (${tt.startTime} - ${tt.endTime}) on ${day}.`
          };
        }
        // Same class/group duplicate period
        if (tt.class === periodData.class && tt.group === periodData.group && tt.periodNumber === Number(periodData.periodNumber)) {
          return {
            hasConflict: true,
            type: 'class_period',
            message: `Class Conflict: Class ${tt.class} (${tt.group}) already has Period ${tt.periodNumber} assigned to ${tt.subject}.`
          };
        }
      }
    }

    return { hasConflict: false };
  }

  /**
   * Record QR Scan Attendance (Validates Token, prevents duplicates, handles students & teachers)
   */
  async recordQRScanAttendance(scanData) {
    const { token, mode, selectedDate, selectedClass, selectedGroup, selectedSession, recordedBy } = scanData;
    const date = selectedDate || new Date().toISOString().split('T')[0];

    // Find attendance card matching token
    const cards = await this.getCollection('attendance_cards');
    let matchedCard = cards.find(c => c.token === token && c.status === 'Active');

    if (!matchedCard) {
      // Intelligent Dynamic Matching: Check if token directly identifies student or teacher
      const students = await this.getCollection('students');
      const teachers = await this.getCollection('teachers');
      const rawToken = String(token || '').trim();

      // Check student matches
      const studentMatch = students.find(s => 
        rawToken === `ICC-STD-${s.rollNumber}-${s.id}` ||
        rawToken === s.id ||
        rawToken === String(s.rollNumber) ||
        (rawToken.startsWith('ICC-STD-') && (rawToken.includes(s.id) || rawToken.split('-')[2] === String(s.rollNumber)))
      );

      if (studentMatch) {
        matchedCard = {
          personType: 'student',
          personId: studentMatch.id,
          name: studentMatch.fullName,
          status: 'Active'
        };
      } else {
        // Check teacher matches
        const teacherMatch = teachers.find(t =>
          rawToken === `ICC-TCH-${t.teacherId}-${t.id}` ||
          rawToken === t.id ||
          rawToken.toLowerCase() === String(t.teacherId || '').toLowerCase() ||
          (rawToken.startsWith('ICC-TCH-') && (rawToken.includes(t.id) || rawToken.toLowerCase().includes(String(t.teacherId || '').toLowerCase())))
        );

        if (teacherMatch) {
          matchedCard = {
            personType: 'teacher',
            personId: teacherMatch.id,
            name: teacherMatch.fullName,
            status: 'Active'
          };
        }
      }
    }

    if (!matchedCard) {
      throw new Error(`Invalid QR Code: '${token}'. Badge token is not recognized in the institutional database.`);
    }

    const isStudent = matchedCard.personType === 'student';

    if (isStudent) {
      // Check student account status
      const students = await this.getCollection('students');
      const student = students.find(s => s.id === matchedCard.personId);
      if (!student) throw new Error('Student record not found in system database.');
      if (student.status !== 'Active') throw new Error(`Student ${student.fullName} is currently ${student.status}. Attendance scan blocked.`);

      // Validate class filter only if explicitly requested and not 'All'
      if (selectedClass && selectedClass !== 'All' && mode === 'student' && student.class !== selectedClass) {
        throw new Error(`Wrong Class! Student is in Class ${student.class}, but scanner filter is set to ${selectedClass}.`);
      }

      // Check duplicate attendance for date and session
      const existingAtt = await this.getCollection('attendance');
      const duplicate = existingAtt.find(a => 
        a.studentId === student.id && 
        a.date === date && 
        (!selectedSession || !a.session || a.session === selectedSession)
      );

      if (duplicate) {
        return {
          duplicate: true,
          personType: 'student',
          person: student,
          record: duplicate,
          message: `Already marked '${duplicate.status}' today on ${date} at ${duplicate.scanTime || 'earlier'}${selectedSession ? ` [${selectedSession}]` : ''}.`
        };
      }

      const scanTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Record Present Attendance
      const attRecord = {
        id: `att_${student.id}_${date}_${Date.now()}`,
        studentId: student.id,
        rollNumber: student.rollNumber,
        studentName: student.fullName,
        fatherName: student.fatherName || '',
        class: student.class,
        group: student.group || 'General',
        date: date,
        session: selectedSession || 'Morning',
        status: 'Present',
        method: 'QR Scan',
        scanTime: scanTime,
        markedBy: recordedBy || 'Touchless QR Gate Terminal',
        createdAt: new Date().toISOString()
      };

      await this.addDocument('attendance', attRecord);

      await window.AuditService.log({
        action: 'Student QR Attendance Scanned',
        category: 'Attendance',
        targetType: 'Student',
        targetId: student.id,
        details: `Marked Present via QR Scan for ${student.fullName} (Roll #${student.rollNumber}, Class ${student.class}) at ${scanTime}`
      });

      return { 
        success: true, 
        personType: 'student',
        duplicate: false, 
        person: student, 
        record: attRecord, 
        message: `${student.fullName} (Roll #${student.rollNumber}) marked Present at ${scanTime}.` 
      };

    } else {
      // Teacher Attendance
      const teachers = await this.getCollection('teachers');
      const teacher = teachers.find(t => t.id === matchedCard.personId);
      if (!teacher) throw new Error('Faculty record not found in system database.');
      const isTchActive = (teacher.accountStatus === 'Active' || teacher.status === 'Active' || (!teacher.accountStatus && teacher.status !== 'Disabled'));
      if (!isTchActive) throw new Error(`Teacher account for ${teacher.fullName} is disabled. Attendance scan blocked.`);

      // Check duplicate teacher scan
      const existingTAtt = await this.getCollection('teacher_attendance');
      const duplicate = existingTAtt.find(a => a.teacherId === teacher.id && a.date === date);

      if (duplicate) {
        return {
          duplicate: true,
          personType: 'teacher',
          person: teacher,
          record: duplicate,
          message: `Faculty attendance already recorded today on ${date} (Arrived at ${duplicate.arrivalTime || 'earlier'}).`
        };
      }

      const arrivalTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const tRecord = {
        id: `tatt_${teacher.id}_${date}`,
        teacherId: teacher.id,
        teacherCode: teacher.teacherId,
        teacherName: teacher.fullName,
        date: date,
        status: 'Present',
        arrivalTime: arrivalTime,
        method: 'QR Scan',
        recordedBy: recordedBy || 'Touchless QR Gate Terminal',
        createdAt: new Date().toISOString()
      };

      await this.addDocument('teacher_attendance', tRecord);

      await window.AuditService.log({
        action: 'Teacher QR Attendance Scanned',
        category: 'Attendance',
        targetType: 'Teacher',
        targetId: teacher.id,
        details: `Recorded Teacher Arrival via QR Scan: ${teacher.fullName} (${teacher.teacherId}) at ${arrivalTime}`
      });

      return { 
        success: true, 
        personType: 'teacher',
        duplicate: false, 
        person: teacher, 
        record: tRecord, 
        message: `Faculty ${teacher.fullName} marked Present at ${arrivalTime}.` 
      };
    }
  }

  /**
   * Generate or Regenerate Attendance Card Token
   */
  async generateOrRegenerateAttendanceCard(personId, personType) {
    const cards = await this.getCollection('attendance_cards');
    let existing = cards.find(c => c.personId === personId && c.personType === personType);

    const salt = Math.floor(1000 + Math.random() * 9000);
    const token = personType === 'student'
      ? `ICC-STD-${personId}-${salt}-V2`
      : `ICC-TCH-${personId}-${salt}-V2`;

    let personName = '';
    let extraData = {};

    if (personType === 'student') {
      const student = await this.getDocument('students', personId);
      if (!student) throw new Error('Student record not found.');
      personName = student.fullName;
      extraData = { rollNumber: student.rollNumber, class: student.class, group: student.group };
    } else {
      const teacher = await this.getDocument('teachers', personId);
      if (!teacher) throw new Error('Teacher record not found.');
      personName = teacher.fullName;
      extraData = { teacherId: teacher.teacherId, subjects: teacher.subjects };
    }

    const cardData = {
      personId,
      personType,
      name: personName,
      ...extraData,
      token,
      status: 'Active',
      generatedAt: new Date().toISOString()
    };

    if (existing) {
      await this.updateDocument('attendance_cards', existing.id, cardData);
    } else {
      cardData.id = `card_${personType}_${personId}`;
      await this.addDocument('attendance_cards', cardData);
    }

    await window.AuditService.log({
      action: existing ? 'Attendance Card Token Regenerated' : 'Attendance Card Generated',
      category: 'Attendance',
      targetType: personType === 'student' ? 'Student' : 'Teacher',
      targetId: personId,
      details: `Generated secure attendance QR card for ${personName} (${personType})`
    });

    return cardData;
  }

  /**
   * Generate Monthly Payroll for Teachers
   */
  async generateMonthlyPayroll(monthStr, academicYear = '2026-2027') {
    const teachers = await this.getCollection('teachers');
    const activeTeachers = teachers.filter(t => t.accountStatus === 'Active');
    const existingPayroll = await this.getCollection('payroll');
    const configs = await this.getCollection('salary_configs');

    const createdRecords = [];

    for (const teacher of activeTeachers) {
      // Check if payroll already exists for this teacher & month
      const exists = existingPayroll.find(p => p.teacherId === teacher.id && p.salaryMonth === monthStr);
      if (exists) continue;

      const cfg = configs.find(c => c.teacherId === teacher.id) || {
        salaryType: teacher.salaryType || 'fixed',
        baseAmount: Number(teacher.salaryAmount) || 50000,
        allowances: 0,
        deductions: 0
      };

      let baseSalary = Number(cfg.baseAmount) || Number(teacher.salaryAmount) || 50000;
      let calculatedPayable = baseSalary + (Number(cfg.allowances) || 0) - (Number(cfg.deductions) || 0);

      const payrollRef = `PAY-${monthStr.replace(/\s+/g, '_').toUpperCase()}-${teacher.teacherId || teacher.id}`;
      const record = {
        id: `pay_${teacher.id}_${monthStr.replace(/\s+/g, '_').toLowerCase()}`,
        payrollRef,
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        teacherCode: teacher.teacherId || 'TCH',
        salaryMonth: monthStr,
        academicYear,
        salaryType: cfg.salaryType || 'fixed',
        baseSalary,
        allowances: Number(cfg.allowances) || 0,
        deductions: Number(cfg.deductions) || 0,
        advances: 0,
        netPayable: Math.max(0, calculatedPayable),
        actualPaid: 0,
        status: 'Unpaid',
        paymentDate: null,
        paymentMethod: null,
        transactionRef: null,
        notes: `Generated payroll for ${monthStr}`,
        createdAt: new Date().toISOString()
      };

      await this.addDocument('payroll', record);
      createdRecords.push(record);
    }

    await window.AuditService.log({
      action: 'Monthly Payroll Batch Generated',
      category: 'Payroll',
      targetType: 'Payroll',
      targetId: monthStr,
      details: `Generated payroll slips for ${createdRecords.length} teachers for ${monthStr}`
    });

    return createdRecords;
  }

  /**
   * Record Teacher Salary Payment, generate official salary receipt, update payroll, and notify teacher
   */
  async recordTeacherSalaryPayment(paymentData) {
    const salaryMonth = paymentData.salaryMonth || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const teacherId = paymentData.teacherId;
    const baseSalary = Number(paymentData.baseSalary) || 0;
    const allowances = Number(paymentData.allowances) || 0;
    const deductions = Number(paymentData.deductions) || 0;
    const netPayable = Number(paymentData.netPayable) || (baseSalary + allowances - deductions);
    const amountPaid = Number(paymentData.amount !== undefined ? paymentData.amount : netPayable);
    const paymentDate = paymentData.paymentDate || new Date().toISOString().split('T')[0];
    const paymentMethod = paymentData.paymentMethod || 'Bank Transfer (HBL)';
    const transactionRef = paymentData.transactionRef || '';
    const notes = paymentData.notes || 'Official teacher salary disbursement';
    const disbursedBy = paymentData.disbursedBy || 'Super Administrator';

    // Generate unique salary receipt number: SAL-YYMM-XXXX
    const now = new Date();
    const yr = String(now.getFullYear()).slice(-2);
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = paymentData.receiptNumber || `SAL-${yr}${mo}-${randCode}`;

    // Find or create payroll document for this teacher & month
    const allPayroll = await this.getCollection('payroll');
    let payrollRecord = allPayroll.find(p => p.teacherId === teacherId && p.salaryMonth === salaryMonth);

    const payrollRef = (payrollRecord && payrollRecord.payrollRef) ? payrollRecord.payrollRef : `PR-${Date.now().toString().slice(-6)}`;
    const payrollPayload = {
      teacherId,
      teacherName: paymentData.teacherName,
      teacherCode: paymentData.teacherCode || '',
      salaryMonth,
      academicYear: paymentData.academicYear || '2026-2027',
      salaryType: paymentData.salaryType || 'fixed',
      baseSalary,
      allowances,
      deductions,
      netPayable,
      actualPaid: amountPaid,
      status: 'Paid',
      paymentDate,
      paymentMethod,
      transactionRef,
      receiptNumber,
      notes,
      disbursedBy,
      payrollRef
    };

    if (payrollRecord) {
      await this.updateDocument('payroll', payrollRecord.id, payrollPayload);
      payrollRecord = { ...payrollRecord, ...payrollPayload };
    } else {
      const payrollId = `pr_${Date.now()}`;
      payrollRecord = { id: payrollId, ...payrollPayload, createdAt: new Date().toISOString() };
      await this.addDocument('payroll', payrollRecord);
    }

    // Create official Salary Receipt Document in 'salary_receipts' collection
    const receiptRecord = {
      id: `sal_rcpt_${receiptNumber}`,
      receiptNumber,
      payrollId: payrollRecord.id,
      payrollRef,
      teacherId,
      teacherName: paymentData.teacherName,
      teacherCode: paymentData.teacherCode || '',
      salaryMonth,
      academicYear: paymentData.academicYear || '2026-2027',
      salaryType: paymentData.salaryType || 'fixed',
      baseSalary,
      allowances,
      deductions,
      netPayable,
      amountPaid,
      actualPaid: amountPaid,
      paymentDate,
      paymentMethod,
      transactionRef,
      disbursedBy,
      notes,
      status: 'Paid',
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await this.addDocument('salary_receipts', receiptRecord);

    // Send Real-time Notification to Teacher
    await this.addDocument('notifications', {
      teacherId,
      title: 'Salary Disbursed & Official Receipt Issued',
      message: `Your official salary for ${salaryMonth} of Rs. ${amountPaid.toLocaleString()} has been disbursed via ${paymentMethod}. Official Receipt Number: ${receiptNumber}.`,
      type: 'salary_receipt',
      receiptNumber,
      salaryMonth,
      amount: amountPaid,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    // Audit log
    await window.AuditService.log({
      action: 'Teacher Salary Disbursed',
      category: 'Payroll',
      targetType: 'Teacher',
      targetId: teacherId,
      details: `Disbursed Rs. ${amountPaid.toLocaleString()} to ${paymentData.teacherName} for ${salaryMonth} via ${paymentMethod}. Official Receipt: #${receiptNumber}`
    });

    return { payrollRecord, receipt: receiptRecord };
  }

  /**
   * Process Salary Payment (Invoked from payroll list or modal)
   */
  async processSalaryPayment(payrollId, paymentData) {
    const record = await this.getDocument('payroll', payrollId);
    if (!record) throw new Error('Payroll record not found.');

    const result = await this.recordTeacherSalaryPayment({
      teacherId: record.teacherId,
      teacherName: record.teacherName,
      teacherCode: record.teacherCode,
      salaryMonth: record.salaryMonth,
      academicYear: record.academicYear,
      salaryType: record.salaryType,
      baseSalary: record.baseSalary,
      allowances: record.allowances,
      deductions: record.deductions,
      netPayable: record.netPayable,
      amount: paymentData.amount || record.netPayable,
      paymentDate: paymentData.paymentDate,
      paymentMethod: paymentData.paymentMethod,
      transactionRef: paymentData.transactionRef,
      notes: paymentData.notes,
      disbursedBy: paymentData.disbursedBy
    });

    return result.payrollRecord;
  }

  /**
   * Get Teacher Official Salary Receipts
   */
  async getTeacherSalaryReceipts(teacherId = null) {
    const receipts = await this.getCollection('salary_receipts');
    if (!teacherId) {
      return receipts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return receipts
      .filter(r => r.teacherId === teacherId || r.teacherCode === teacherId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  /**
   * Get Single Teacher Salary Receipt by Receipt Number or ID
   */
  async getTeacherSalaryReceipt(receiptIdentifier) {
    const receipts = await this.getCollection('salary_receipts');
    return receipts.find(r => r.receiptNumber === String(receiptIdentifier) || r.id === String(receiptIdentifier)) || null;
  }

  /**
   * Submit Attendance Correction Request
   */
  async submitAttendanceCorrection(reqData) {
    const id = `corr_${Date.now()}`;
    const newReq = {
      id,
      ...reqData,
      status: 'Pending Approval',
      createdAt: new Date().toISOString()
    };
    await this.addDocument('attendance_corrections', newReq);

    // Notify Super Admin
    await this.addDocument('notifications', {
      targetRole: 'super_admin',
      title: 'Pending Attendance Correction',
      message: `Correction requested for ${reqData.personName} (${reqData.date}): Change status from ${reqData.originalStatus} to ${reqData.requestedStatus}.`,
      type: 'attendance_correction_pending',
      correctionId: id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    await window.AuditService.log({
      action: 'Attendance Correction Submitted',
      category: 'Attendance',
      targetType: 'CorrectionRequest',
      targetId: id,
      details: `Requested change for ${reqData.personName} on ${reqData.date} from ${reqData.originalStatus} to ${reqData.requestedStatus}. Reason: ${reqData.reason}`
    });

    return newReq;
  }

  /**
   * Approve Attendance Correction
   */
  async approveAttendanceCorrection(correctionId, reason, approvedBy = 'Super Administrator') {
    const req = await this.getDocument('attendance_corrections', correctionId);
    if (!req) throw new Error('Correction request not found.');

    // Update attendance record in the database atomically
    if (req.requestType === 'teacher_attendance') {
      const allTAtt = await this.getCollection('teacher_attendance');
      const targetAtt = allTAtt.find(a => a.teacherId === req.personId && a.date === req.date);
      if (targetAtt) {
        await this.updateDocument('teacher_attendance', targetAtt.id, {
          status: req.requestedStatus,
          corrected: true,
          correctedBy: approvedBy,
          correctionReason: reason || req.reason
        });
      }
    } else {
      // Student attendance
      const allAtt = await this.getCollection('attendance');
      const targetAtt = allAtt.find(a => a.studentId === req.personId && a.date === req.date);
      if (targetAtt) {
        await this.updateDocument('attendance', targetAtt.id, {
          status: req.requestedStatus,
          corrected: true,
          correctedBy: approvedBy,
          correctionReason: reason || req.reason
        });
      }
    }

    // Mark request approved
    await this.updateDocument('attendance_corrections', req.id, {
      status: 'Approved',
      approvedBy,
      approvalReason: reason || '',
      decidedAt: new Date().toISOString()
    });

    await window.AuditService.log({
      action: 'Attendance Correction Approved',
      category: 'Attendance',
      targetType: 'CorrectionRequest',
      targetId: req.id,
      details: `Approved attendance change for ${req.personName} on ${req.date} to ${req.requestedStatus} by ${approvedBy}`
    });

    return true;
  }

  /**
   * Reject Attendance Correction
   */
  async rejectAttendanceCorrection(correctionId, reason, rejectedBy = 'Super Administrator') {
    const req = await this.getDocument('attendance_corrections', correctionId);
    if (!req) throw new Error('Correction request not found.');

    await this.updateDocument('attendance_corrections', req.id, {
      status: 'Rejected',
      rejectedBy,
      rejectionReason: reason || 'Denied by Super Administrator',
      decidedAt: new Date().toISOString()
    });

    await window.AuditService.log({
      action: 'Attendance Correction Rejected',
      category: 'Attendance',
      targetType: 'CorrectionRequest',
      targetId: req.id,
      details: `Rejected attendance change for ${req.personName} on ${req.date}. Reason: ${reason || 'Denied'}`
    });

    return true;
  }

  /**
   * Submit Financial Adjustment Request (Refund or Payment Correction)
   */
  async submitFinancialAdjustment(adjData) {
    const id = `adj_${Date.now()}`;
    const newAdj = {
      id,
      ...adjData,
      status: 'Pending Approval',
      createdAt: new Date().toISOString()
    };
    await this.addDocument('financial_adjustments', newAdj);

    // Notify Super Admin
    await this.addDocument('notifications', {
      targetRole: 'super_admin',
      title: `Financial Adjustment Request (${adjData.adjustmentType.toUpperCase()})`,
      message: `Pending ${adjData.adjustmentType} request for ${adjData.studentName} (Receipt #${adjData.receiptNumber}). Reason: ${adjData.reason}`,
      type: 'financial_adjustment_pending',
      adjustmentId: id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    await window.AuditService.log({
      action: 'Financial Adjustment Submitted',
      category: 'Finance',
      targetType: 'FinancialAdjustment',
      targetId: id,
      details: `Submitted ${adjData.adjustmentType} request for ${adjData.studentName} (Roll #${adjData.rollNumber}) on Receipt #${adjData.receiptNumber}`
    });

    return newAdj;
  }

  /**
   * Approve Financial Adjustment (Refund or Payment Correction)
   */
  async approveFinancialAdjustment(adjId, reason, approvedBy = 'Super Administrator') {
    const adj = await this.getDocument('financial_adjustments', adjId);
    if (!adj) throw new Error('Adjustment record not found.');

    const receipts = await this.getCollection('receipts');
    const existingRcpt = receipts.find(r => r.receiptNumber === adj.receiptNumber);

    if (adj.adjustmentType === 'refund') {
      // Issue separate official Refund Receipt
      const refundRcptNumber = 'RFD-' + window.UIUtils.generate10DigitReceiptNumber(receipts).slice(4);
      const refundRecord = {
        id: `rcpt_${refundRcptNumber}`,
        receiptNumber: refundRcptNumber,
        originalReceiptNumber: adj.receiptNumber,
        feeType: 'Fee Refund',
        studentId: adj.studentId,
        studentName: adj.studentName,
        rollNumber: adj.rollNumber,
        month: adj.feeMonth || 'Tuition Refund',
        academicYear: existingRcpt ? existingRcpt.academicYear : '2026-2027',
        refundAmount: Number(adj.requestedAmount),
        paidAmount: -Math.abs(Number(adj.requestedAmount)),
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMode: 'Cash Refund',
        receiptDate: new Date().toISOString(),
        notes: `Refund approved: ${reason || adj.reason}`,
        availableToStudent: true,
        createdAt: new Date().toISOString()
      };
      await this.addDocument('receipts', refundRecord);

      // Link refund to original receipt
      if (existingRcpt) {
        await this.updateDocument('receipts', existingRcpt.id, {
          hasRefund: true,
          refundReceiptNumber: refundRcptNumber,
          refundAmount: Number(adj.requestedAmount)
        });
      }

    } else if (adj.adjustmentType === 'correction') {
      // Issue Corrected Receipt with adjusted amount
      const corrRcptNumber = 'COR-' + window.UIUtils.generate10DigitReceiptNumber(receipts).slice(4);
      const corrRecord = {
        id: `rcpt_${corrRcptNumber}`,
        receiptNumber: corrRcptNumber,
        originalReceiptNumber: adj.receiptNumber,
        feeType: 'Payment Correction',
        studentId: adj.studentId,
        studentName: adj.studentName,
        rollNumber: adj.rollNumber,
        month: adj.feeMonth || 'Tuition Correction',
        academicYear: existingRcpt ? existingRcpt.academicYear : '2026-2027',
        correctedAmount: Number(adj.proposedAmount),
        paidAmount: Number(adj.proposedAmount),
        paymentDate: new Date().toISOString().split('T')[0],
        receiptDate: new Date().toISOString(),
        notes: `Corrected payment: ${reason || adj.reason}`,
        availableToStudent: true,
        createdAt: new Date().toISOString()
      };
      await this.addDocument('receipts', corrRecord);

      if (existingRcpt) {
        await this.updateDocument('receipts', existingRcpt.id, {
          isCorrected: true,
          correctedReceiptNumber: corrRcptNumber,
          adjustedAmount: Number(adj.proposedAmount)
        });
      }
    }

    // Mark adjustment approved
    await this.updateDocument('financial_adjustments', adj.id, {
      status: 'Approved',
      approvedBy,
      approvalReason: reason || '',
      decidedAt: new Date().toISOString()
    });

    await window.AuditService.log({
      action: 'Financial Adjustment Approved',
      category: 'Finance',
      targetType: 'FinancialAdjustment',
      targetId: adj.id,
      details: `Approved ${adj.adjustmentType} for ${adj.studentName} (Receipt #${adj.receiptNumber}) by ${approvedBy}`
    });

    return true;
  }

  /**
   * Reject Financial Adjustment
   */
  async rejectFinancialAdjustment(adjId, reason, rejectedBy = 'Super Administrator') {
    const adj = await this.getDocument('financial_adjustments', adjId);
    if (!adj) throw new Error('Adjustment record not found.');

    await this.updateDocument('financial_adjustments', adj.id, {
      status: 'Rejected',
      rejectedBy,
      rejectionReason: reason || 'Declined by Super Administrator',
      decidedAt: new Date().toISOString()
    });

    await window.AuditService.log({
      action: 'Financial Adjustment Rejected',
      category: 'Finance',
      targetType: 'FinancialAdjustment',
      targetId: adj.id,
      details: `Rejected ${adj.adjustmentType} for ${adj.studentName} (Receipt #${adj.receiptNumber}). Reason: ${reason || 'Declined'}`
    });

    return true;
  }

  /**
   * Promote Students to Next Academic Class
   * Preserves historical fees, attendance, results, and generates new fee schedule for destination class
   */
  async promoteStudents(promotionData) {
    const { sourceYear, destYear, sourceClass, destClass, sourceGroup, destGroup, studentIds, rollNumberPolicy, executedBy } = promotionData;

    const students = await this.getCollection('students');
    const targetStudents = students.filter(s => studentIds.includes(s.id));

    if (targetStudents.length === 0) throw new Error('No students selected for promotion.');

    const promotedRecords = [];
    for (const student of targetStudents) {
      // Archive historical enrollment snapshot in student record
      const previousEnrollment = {
        academicYear: student.academicYear || sourceYear,
        class: student.class,
        group: student.group,
        rollNumber: student.rollNumber,
        promotedDate: new Date().toISOString()
      };

      const history = Array.isArray(student.promotionHistory) ? [...student.promotionHistory, previousEnrollment] : [previousEnrollment];

      // New roll number if specified, otherwise retain
      let newRoll = student.rollNumber;
      if (rollNumberPolicy === 'prefix_dest_class') {
        const classDigits = destClass.replace(/[^0-9]/g, '');
        newRoll = `${classDigits}${student.rollNumber.slice(-2)}`;
      }

      // Update student profile with new class and group
      await this.updateDocument('students', student.id, {
        class: destClass,
        group: destGroup,
        rollNumber: newRoll,
        academicYear: destYear,
        promotionHistory: history,
        lastPromotedAt: new Date().toISOString()
      });

      // Generate clean fee schedule for the destination class and academic year
      const updatedStudent = { ...student, class: destClass, group: destGroup, rollNumber: newRoll };
      await this.initStudentFeeSchedule(updatedStudent);

      promotedRecords.push(updatedStudent);
    }

    // Record promotion batch log
    const promBatch = {
      id: `prom_${Date.now()}`,
      sourceYear,
      destYear,
      sourceClass,
      destClass,
      sourceGroup,
      destGroup,
      studentCount: promotedRecords.length,
      rollNumberPolicy,
      executedBy: executedBy || 'Super Administrator',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };
    await this.addDocument('promotions', promBatch);

    await window.AuditService.log({
      action: 'Student Promotion Batch Executed',
      category: 'Academic',
      targetType: 'Promotion',
      targetId: promBatch.id,
      details: `Promoted ${promotedRecords.length} students from Class ${sourceClass} (${sourceGroup}) to Class ${destClass} (${destGroup}) for ${destYear}`
    });

    return promBatch;
  }
}

window.FirebaseService = new FirebaseService();
