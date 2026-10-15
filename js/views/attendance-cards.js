/**
 * Ideal Coaching Center - Student & Teacher QR Attendance Cards Module
 * Generates official high-resolution, scannable QR identity cards with institutional branding,
 * individual print, bulk A4 sheet printing (8-per-page), PNG export, and token regeneration.
 */

const AttendanceCardsView = {
  activeTab: 'students', // 'students' or 'teachers'
  selectedClass: 'All',
  selectedGroup: 'All',

  async render(container) {
    const students = await window.FirebaseService.getCollection('students');
    const teachers = await window.FirebaseService.getCollection('teachers');
    const cards = await window.FirebaseService.getCollection('attendance_cards');

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 0.25rem;">
            <span>Attendance Center</span> <span style="margin: 0 0.4rem;">/</span> <span style="color: var(--primary-600); font-weight: 600;">Attendance Cards</span>
          </div>
          <h1 style="font-size: 1.6rem; color: var(--slate-900); font-weight: 800; margin: 0;">QR Attendance Identity Cards</h1>
          <p style="color: var(--slate-500); font-size: 0.85rem; margin-top: 0.25rem;">
            Issue and print secure QR-coded attendance badges for students and teaching faculty • Ideal Coaching Center
          </p>
        </div>
        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="btn-bulk-print-cards">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Bulk Print A4 Sheet (8 Cards/Page)
          </button>
        </div>
      </div>

      <!-- Tab Buttons -->
      <div class="tabs-nav" style="margin-bottom: 1.5rem; display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">
        <button type="button" class="tab-btn ${this.activeTab === 'students' ? 'active-tab' : ''}" id="tab-student-cards" style="padding: 0.6rem 1.25rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.activeTab === 'students' ? 'var(--primary-600)' : 'transparent'}; color: ${this.activeTab === 'students' ? '#fff' : 'var(--slate-600)'};">
          Student Attendance Cards (${students.length})
        </button>
        <button type="button" class="tab-btn ${this.activeTab === 'teachers' ? 'active-tab' : ''}" id="tab-teacher-cards" style="padding: 0.6rem 1.25rem; border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer; background: ${this.activeTab === 'teachers' ? 'var(--primary-600)' : 'transparent'}; color: ${this.activeTab === 'teachers' ? '#fff' : 'var(--slate-600)'};">
          Teacher Attendance Cards (${teachers.length})
        </button>
      </div>

      <!-- Filters Row -->
      <div class="data-card" style="padding: 1rem 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <input type="text" id="card-search-input" class="form-control" placeholder="Search by name, roll # or ID..." style="width: 250px;" />
          ${this.activeTab === 'students' ? `
            <select id="card-class-filter" class="form-control" style="width: auto;">
              <option value="All">All Classes</option>
              <option value="12th">Class 12th</option>
              <option value="11th">Class 11th</option>
              <option value="10th">Class 10th</option>
              <option value="9th">Class 9th</option>
            </select>
          ` : ''}
        </div>
      </div>

      <!-- Cards Grid Display Area -->
      <div id="cards-grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;">
        ${this.buildCardsGrid(students, teachers, cards)}
      </div>
    `;

    this.attachEvents(container, students, teachers, cards);
  },

  buildCardsGrid(students, teachers, cards) {
    if (this.activeTab === 'students') {
      let filteredStudents = students;
      if (this.selectedClass !== 'All') {
        filteredStudents = filteredStudents.filter(s => s.class === this.selectedClass);
      }

      if (filteredStudents.length === 0) {
        return `<div style="grid-column: 1/-1; text-align: center; color: var(--slate-500); padding: 3rem;">No student records match the selected criteria.</div>`;
      }

      return filteredStudents.map(s => {
        const card = cards.find(c => c.personId === s.id && c.personType === 'student') || {
          token: `ICC-STD-${s.rollNumber}-${s.id}`,
          status: 'Active'
        };

        const qrSvg = window.QRCodeGenerator ? window.QRCodeGenerator.generateSVG(card.token, 110) : '';

        return `
          <div class="attendance-card-wrapper" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md); transition: transform 0.2s, box-shadow 0.2s;">
            <!-- Card Header -->
            <div style="background: linear-gradient(135deg, #0284c7 0%, #0f172a 100%); color: #fff; padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 28px; height: 28px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.75rem;">
                  ICC
                </div>
                <div>
                  <div style="font-size: 0.8rem; font-weight: 800; letter-spacing: 0.5px;">IDEAL COACHING CENTER</div>
                  <div style="font-size: 0.65rem; color: #bae6fd;">Student Attendance Pass</div>
                </div>
              </div>
              <span class="badge" style="background: rgba(255,255,255,0.25); color: #fff; font-size: 0.65rem;">Class ${s.class}</span>
            </div>

            <!-- Card Body with QR -->
            <div style="padding: 1.25rem; display: flex; gap: 1rem; align-items: center;">
              <div class="qr-canvas-box" style="flex-shrink: 0; background: #fff; padding: 4px; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: var(--shadow-sm);">
                ${qrSvg}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 1.05rem; font-weight: 800; color: var(--slate-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${s.fullName}
                </div>
                <div style="font-size: 0.75rem; color: var(--slate-600); margin-top: 0.15rem;">
                  Father: ${s.fatherName || 'N/A'}
                </div>
                <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.75rem;">
                  <div>Roll #: <strong style="color: var(--primary-600);">${s.rollNumber}</strong></div>
                  <div>Group: <strong>${s.group}</strong></div>
                  <div style="font-size: 0.65rem; color: var(--slate-400); font-family: monospace;">Token: ${card.token.slice(-10)}</div>
                </div>
              </div>
            </div>

            <!-- Actions Bar -->
            <div style="background: var(--slate-50); border-top: 1px solid var(--border-color); padding: 0.65rem 1rem; display: flex; justify-content: space-between; align-items: center;">
              <button type="button" class="btn btn-sm btn-secondary btn-print-single-card" data-type="student" data-id="${s.id}">
                Print Card
              </button>
              <button type="button" class="btn btn-sm btn-link btn-regen-token" data-type="student" data-id="${s.id}" style="font-size: 0.725rem; color: var(--primary-600);">
                Regenerate QR
              </button>
            </div>
          </div>
        `;
      }).join('');
    } else {
      // Teachers tab
      return teachers.map(t => {
        const card = cards.find(c => c.personId === t.id && c.personType === 'teacher') || {
          token: `ICC-TCH-${t.teacherId}-${t.id}`,
          status: 'Active'
        };

        const qrSvg = window.QRCodeGenerator ? window.QRCodeGenerator.generateSVG(card.token, 110) : '';

        return `
          <div class="attendance-card-wrapper" style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-md);">
            <div style="background: linear-gradient(135deg, #059669 0%, #064e3b 100%); color: #fff; padding: 0.85rem 1rem; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 28px; height: 28px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.75rem;">
                  ICC
                </div>
                <div>
                  <div style="font-size: 0.8rem; font-weight: 800; letter-spacing: 0.5px;">IDEAL COACHING CENTER</div>
                  <div style="font-size: 0.65rem; color: #a7f3d0;">Faculty Attendance Pass</div>
                </div>
              </div>
              <span class="badge" style="background: rgba(255,255,255,0.25); color: #fff; font-size: 0.65rem;">${t.teacherId}</span>
            </div>

            <div style="padding: 1.25rem; display: flex; gap: 1rem; align-items: center;">
              <div class="qr-canvas-box" style="flex-shrink: 0; background: #fff; padding: 4px; border: 1px solid #e2e8f0; border-radius: 6px;">
                ${qrSvg}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 1.05rem; font-weight: 800; color: var(--slate-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${t.fullName}
                </div>
                <div style="font-size: 0.75rem; color: var(--slate-600); margin-top: 0.15rem;">
                  ${t.qualifications || 'Teaching Faculty'}
                </div>
                <div style="margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.75rem;">
                  <div>Faculty ID: <strong style="color: var(--success-700);">${t.teacherId}</strong></div>
                  <div>Subjects: <strong>${Array.isArray(t.subjects) ? t.subjects.join(', ') : t.subjects}</strong></div>
                  <div style="font-size: 0.65rem; color: var(--slate-400); font-family: monospace;">Token: ${card.token.slice(-10)}</div>
                </div>
              </div>
            </div>

            <div style="background: var(--slate-50); border-top: 1px solid var(--border-color); padding: 0.65rem 1rem; display: flex; justify-content: space-between; align-items: center;">
              <button type="button" class="btn btn-sm btn-secondary btn-print-single-card" data-type="teacher" data-id="${t.id}">
                Print Card
              </button>
              <button type="button" class="btn btn-sm btn-link btn-regen-token" data-type="teacher" data-id="${t.id}" style="font-size: 0.725rem; color: var(--primary-600);">
                Regenerate QR
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  },

  attachEvents(container, students, teachers, cards) {
    // Tabs
    const tabStd = container.querySelector('#tab-student-cards');
    const tabTch = container.querySelector('#tab-teacher-cards');

    if (tabStd) tabStd.onclick = () => { this.activeTab = 'students'; this.render(container); };
    if (tabTch) tabTch.onclick = () => { this.activeTab = 'teachers'; this.render(container); };

    // Class filter
    const classFilter = container.querySelector('#card-class-filter');
    if (classFilter) {
      classFilter.onchange = () => {
        this.selectedClass = classFilter.value;
        const grid = container.querySelector('#cards-grid-container');
        if (grid) grid.innerHTML = this.buildCardsGrid(students, teachers, cards);
        this.attachCardActions(container, students, teachers, cards);
      };
    }

    // Search filter
    const searchInput = container.querySelector('#card-search-input');
    if (searchInput) {
      searchInput.oninput = () => {
        const q = searchInput.value.trim().toLowerCase();
        container.querySelectorAll('.attendance-card-wrapper').forEach(cardEl => {
          const text = cardEl.textContent.toLowerCase();
          cardEl.style.display = text.includes(q) ? '' : 'none';
        });
      };
    }

    this.attachCardActions(container, students, teachers, cards);

    // Bulk print A4 sheet
    const btnBulk = container.querySelector('#btn-bulk-print-cards');
    if (btnBulk) {
      btnBulk.onclick = () => this.bulkPrintA4Sheet(students, teachers, cards);
    }
  },

  attachCardActions(container, students, teachers, cards) {
    // Print single card
    container.querySelectorAll('.btn-print-single-card').forEach(btn => {
      btn.onclick = () => {
        const type = btn.getAttribute('data-type');
        const id = btn.getAttribute('data-id');
        const person = type === 'student' ? students.find(s => s.id === id) : teachers.find(t => t.id === id);
        const card = cards.find(c => c.personId === id && c.personType === type) || {
          token: `ICC-${type.toUpperCase()}-${id}`,
          status: 'Active'
        };

        if (person) this.printSingleCard(person, card, type);
      };
    });

    // Regenerate QR Token
    container.querySelectorAll('.btn-regen-token').forEach(btn => {
      btn.onclick = async () => {
        const type = btn.getAttribute('data-type');
        const id = btn.getAttribute('data-id');
        if (!confirm('Regenerating will invalidate the previous physical QR code card. Proceed?')) return;

        await window.GlobalLoader.wrap(async () => {
          await window.FirebaseService.generateOrRegenerateAttendanceCard(id, type);
        }, 'Regenerating secure cryptographic QR token in Firestore...', 'Ideal Coaching Center');

        window.UIUtils.showToast('success', 'Token Regenerated', 'Card QR code token updated.');
        this.render(container);
      };
    });
  },

  /**
   * Print single card
   */
  printSingleCard(person, card, type) {
    const qrSvg = window.QRCodeGenerator ? window.QRCodeGenerator.generateSVG(card.token, 130) : '';
    const isStudent = type === 'student';

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Card - ${person.fullName}</title>
        <style>
          body { font-family: sans-serif; margin: 0; padding: 20px; background: #fff; display: flex; justify-content: center; }
          .card {
            width: 340px; border: 2px solid #0f172a; border-radius: 10px; overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .hdr {
            background: ${isStudent ? '#0284c7' : '#059669'}; color: #fff; padding: 12px; text-align: center;
          }
          .bdy { padding: 16px; display: flex; gap: 12px; align-items: center; }
          @media print { body { padding: 0; } @page { size: auto; margin: 5mm; } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="hdr">
            <h3 style="margin: 0; font-size: 15px; letter-spacing: 0.5px;">IDEAL COACHING CENTER</h3>
            <div style="font-size: 11px; opacity: 0.9;">${isStudent ? 'STUDENT ATTENDANCE BADGE' : 'FACULTY ATTENDANCE BADGE'}</div>
          </div>
          <div class="bdy">
            <div>${qrSvg}</div>
            <div style="font-size: 12px; line-height: 1.4;">
              <strong style="font-size: 14px; display: block; margin-bottom: 4px;">${person.fullName}</strong>
              ${isStudent ? `
                <div>Roll #: <strong>${person.rollNumber}</strong></div>
                <div>Class: <strong>${person.class}</strong> (${person.group})</div>
              ` : `
                <div>Teacher ID: <strong>${person.teacherId}</strong></div>
                <div>Role: <strong>Faculty Member</strong></div>
              `}
              <div style="font-size: 9px; color: #64748b; margin-top: 6px;">Token: ${card.token}</div>
            </div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    try {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(printHtml);
        w.document.close();
      } else {
        const frame = document.createElement('iframe');
        frame.style.position = 'fixed';
        frame.style.right = '0';
        frame.style.bottom = '0';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.border = '0';
        document.body.appendChild(frame);
        frame.contentDocument.write(printHtml);
        frame.contentDocument.close();
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => document.body.removeChild(frame), 1000);
      }
    } catch (e) {
      console.warn('Print error fallback:', e);
      window.print();
    }
  },

  /**
   * Bulk Print A4 Sheet (8 Cards per page grid)
   */
  bulkPrintA4Sheet(students, teachers, cards) {
    const list = this.activeTab === 'students' ? students : teachers;
    const type = this.activeTab === 'students' ? 'student' : 'teacher';

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk Attendance Cards - Ideal Coaching Center</title>
        <style>
          body { font-family: sans-serif; margin: 0; padding: 10mm; background: #fff; }
          .grid {
            display: grid; grid-template-columns: repeat(2, 1fr); gap: 10mm;
          }
          .card {
            border: 1px solid #334155; border-radius: 8px; overflow: hidden; page-break-inside: avoid;
          }
          .hdr {
            background: #0f172a; color: #fff; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;
          }
          .bdy { padding: 10px; display: flex; gap: 10px; align-items: center; }
          @media print {
            body { padding: 5mm; }
            @page { size: A4; margin: 5mm; }
          }
        </style>
      </head>
      <body>
        <div class="grid">
          ${list.map(p => {
            const card = cards.find(c => c.personId === p.id && c.personType === type) || {
              token: `ICC-${type.toUpperCase()}-${p.rollNumber || p.teacherId || p.id}`,
              status: 'Active'
            };
            const qrSvg = window.QRCodeGenerator ? window.QRCodeGenerator.generateSVG(card.token, 95) : '';
            return `
              <div class="card">
                <div class="hdr">
                  <span style="font-size: 11px; font-weight: 800;">IDEAL COACHING CENTER</span>
                  <span style="font-size: 10px; opacity: 0.85;">${type === 'student' ? 'Roll #' + p.rollNumber : p.teacherId}</span>
                </div>
                <div class="bdy">
                  <div>${qrSvg}</div>
                  <div style="font-size: 11px; line-height: 1.35;">
                    <strong style="font-size: 13px; display: block;">${p.fullName}</strong>
                    ${type === 'student' ? `Class ${p.class} (${p.group})` : 'Faculty: ' + (p.qualifications || 'Staff')}
                    <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Scannable Gate Pass</div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    try {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(printHtml);
        w.document.close();
      } else {
        const frame = document.createElement('iframe');
        frame.style.position = 'fixed';
        frame.style.right = '0';
        frame.style.bottom = '0';
        frame.style.width = '0';
        frame.style.height = '0';
        frame.style.border = '0';
        document.body.appendChild(frame);
        frame.contentDocument.write(printHtml);
        frame.contentDocument.close();
        frame.contentWindow.focus();
        frame.contentWindow.print();
        setTimeout(() => document.body.removeChild(frame), 1000);
      }
    } catch (e) {
      console.warn('Bulk print error fallback:', e);
      window.print();
    }
  }
};

window.AttendanceCardsView = AttendanceCardsView;
