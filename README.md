# Ideal Coaching Center — Management Portal

An enterprise-grade, responsive **Coaching Management System & Student Management Portal** built purely using **HTML5, Vanilla CSS3, and Vanilla JavaScript**, integrated with **Firebase** (Authentication & Cloud Firestore real-time database).

---

## 🌟 Key Features & Role Architecture

### 1. Super Admin Portal
* **Executive Dashboard**: Real-time Firebase operational statistics (Total Students, Active Students, Fees Collected, Pending Dues, Today's Attendance breakdown, Active Admins, Enrolled batches by Class).
* **Admin Management**: Create new administrator accounts with custom granular permissions, view all admins in a responsive table, enable/disable access, trigger password resets, or delete admin accounts with confirmation modals.
* **System Settings**: Configure the active Academic Year (e.g., `2026-2027`), default monthly tuition fee amounts per class, and coaching center contact information.
* **Audit Logs**: Immutable ledger tracking all administrative actions (timestamp, action, performed by, category, details).

### 2. Admin Portal
* **Enroll New Student**:
  * Fields: Full Name, Father's Name, Roll Number, Contact Number, Class (`9th`, `10th`, `11th`, `12th`), Group, Account Status, and Student Login PIN.
  * **Dynamic Academic Streams**:
    * **9th & 10th**: *Science* and *General* only.
    * **11th & 12th**: *Pre-Medical*, *Pre-Engineering*, and *Computer Science* only.
  * **Unique Roll Number Validation**: Validates against the central Firebase database; displays a professional centered dialog if a duplicate roll number is entered.
  * **12-Month Schedule Auto-Initialization**: Automatically initializes all 12 chronological monthly fee records as *Pending*.
* **All Students Directory**: Search by student name or roll number, filter by class/stream and status, view complete student profiles, edit details, toggle active/inactive, or delete student records with confirmation.
* **12-Month Fee Management**:
  * Chronological 12-month schedule for every student.
  * **Mark as Paid**: Interactive payment modal allowing entry of the exact amount paid, payment mode, and notes.
  * **Collision-Resistant Exactly 10-Digit Receipts**: Generates unique 10-digit invoice/receipt numbers (e.g., `2609012345`).
  * **Send Receipt to Student Account**: Marks the receipt as accessible in the student's personal account and dispatches an instant real-time notification.
  * **Printable / Downloadable Official Receipts**: High-fidelity official layout with watermarked branding, student particulars, fee breakdown, and signature lines.
* **Attendance System**:
  * Date, Class, and Group selector.
  * Statuses: *Present*, *Absent*, *Leave*.
  * **Automatic Sunday Exclusion**: Sundays are automatically flagged as non-working off-days and excluded from monthly working day calculations.
* **Daily Diary & Homework**:
  * Post daily homework assignments by Class, Group, and Date.
  * Preserves historical diary records.
* **Syllabus & Curriculum**:
  * Configure books and chapters for each Class and Group.
  * Chapter statuses: *Not Started*, *Currently Studying*, *Completed*.
  * **Single Active Chapter Logic**: Marking a chapter as *Currently Studying* automatically unmarks any previous active chapter in that subject.
* **Reports Hub**:
  * Fee Collection & Dues Report.
  * Complete Student Directory.
  * Class & Group Distribution.
  * Attendance Percentage Report.
  * Issued 10-Digit Payment Receipts History.
  * Print-friendly formatting with official Ideal Coaching Center letterhead.

### 3. Student Portal
* **Personalized Dashboard**: Greets the student by name and shows their Class, Group, current month fee status, monthly attendance percentage, today's diary, latest circular, and active syllabus chapters.
* **Fee Details**: View all 12 months permanently; view and download official receipts sent by the administration.
* **Attendance Records**: Progress bar for current month attendance rate (excluding Sundays) and complete chronological attendance logs.
* **Today's Diary**: View daily homework posted for their specific class and stream.
* **Syllabus & Books**: Track syllabus progress with status badges (*Currently Studying*, *Completed*, *Not Started*).
* **Notifications**: Real-time alerts for fee confirmations, receipt delivery, and circular notices.

### 4. Global 5-Second Minimum Loading Animation System
* Every meaningful asynchronous operation (Login, Logout, Student Creation, Fee Payments, Receipt Generation, Attendance Saving, Diary Posting, Syllabus Updates, and Firebase sync) strictly enforces a **5-second minimum display time**.
* Features an animated educational emblem, smooth progress bar, contextual status messages, blurred backdrop, and a resilient error state with a "Try Again" option.

---

## 📁 Project Structure

```text
ideal/
├── index.html                 # Main App Shell & Login Interface
├── firebase-config.js         # Firebase Project Configuration & Detection Helper
├── firestore.rules            # Production Firestore Security Rules
├── firestore.indexes.json     # Firestore Composite Indexes
├── README.md                  # Complete Documentation
├── assets/
│   └── logo.svg               # Official Ideal Coaching Center SVG Emblem
├── css/
│   ├── main.css               # Design System, Typography, Layout, Sidebar & Header
│   ├── components.css         # 5-Second Loader, Modals, Toasts, Badges, Tables, Cards
│   ├── dashboards.css         # Dashboards, Fee Grid, Attendance, Syllabus & Diary styles
│   └── print.css              # Printable Official Receipt & Report Stylesheet
└── js/
    ├── firebase-service.js    # Firestore Database CRUD, Live Subscriptions & Seed Engine
    ├── loader.js              # Global Loading Manager (5-second minimum display)
    ├── ui-utils.js            # Toasts, Modals, 10-digit Receipt Generator, Date & Helpers
    ├── audit.js               # Centralized Audit Log Recording Service
    ├── auth.js                # Role Authentication, Session State & Route Guards
    ├── app.js                 # Central Application Router & Shell Controller
    └── views/
        ├── super-admin.js     # Super Admin Dashboard, Admin Management & Settings
        ├── admin.js           # Admin Dashboard, Add Student & All Students Directory
        ├── fees.js            # 12-Month Fees, Payment Modal, 10-Digit Receipts & Print
        ├── attendance.js      # Attendance Marking & Automatic Sunday Exclusion
        ├── announcements.js   # Targeted Circulars & Notice Management
        ├── diary.js           # Daily Diary & Homework Management
        ├── syllabus.js        # Books & Chapter Progress with Single-Active Rule
        ├── reports.js         # Operational Reports & Analytics
        └── student-portal.js  # Dedicated Student Portal Views
```

---

## 🚀 How to Run the Application

### Option 1: Direct File Opening (No Server / No Python Required!)
1. Open your file manager and navigate to `c:\Users\Noman\Desktop\ideal`.
2. Double-click **`index.html`** or right-click and choose **Open with Google Chrome / Microsoft Edge / Firefox**.
3. The portal will launch immediately!

### Option 2: Live Firebase Connection
When you are ready to link the portal to your live Firebase Cloud Firestore project:
1. Open `firebase-config.js` in any text editor.
2. Replace the placeholder values with your Firebase Web App credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyYourActualApiKeyHere...",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef1234567890"
   };
   ```
3. Deploy `firestore.rules` using the Firebase CLI:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 🔑 Login Credentials (Pre-seeded & Ready to Test)

The portal features a single, unified login page for all users (Super Admin, Admin, and Student) using **Email Address** and **Password**:

| Role | Email Address | Password | Name / Description |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@ideal.edu` | `Admin@123` | Master Super Administrator |
| **Admin** | `tariq@ideal.edu` | `Admin@123` | Administrator (Muhammad Tariq) |
| **Admin** | `ayesha@ideal.edu` | `Admin@123` | Administrator (Ayesha Khan) |
| **Student (12th CS)** | `usman@ideal.edu` | `Student@123` | Usman Farooq (12th Computer Science, Roll #1201) |
| **Student (12th Med)** | `mariam@ideal.edu` | `Student@123` | Mariam Siddiqui (12th Pre-Medical, Roll #1202) |
| **Student (11th Med)** | `fatima@ideal.edu` | `Student@123` | Fatima Zahra (11th Pre-Medical, Roll #1101) |
| **Student (11th Eng)** | `zaid@ideal.edu` | `Student@123` | Zaid Ali (11th Pre-Engineering, Roll #1102) |
| **Student (10th Sci)** | `daniyal@ideal.edu` | `Student@123` | Daniyal Raza (10th Science, Roll #1001) |
| **Student (9th Sci)** | `hamza@ideal.edu` | `Student@123` | Hamza Ahmed (9th Science, Roll #9001) |
| **Student (9th Gen)** | `sara@ideal.edu` | `Student@123` | Sara Bilal (9th General, Roll #9002) |

*(Note: Students can also use their Roll Number `#` directly in the email field with their password).*

