/**
 * Ideal Coaching Center - Student Academic Promotion Module
 * Supports class progression (9th->10th, 10th->11th, 11th->12th), destination stream selection,
 * roll number retention or prefix policies, candidate preview, historical fee/attendance preservation,
 * and automated destination fee schedule initialization.
 */

const PromotionsView = {
  sourceYear: '2025-2026',
  destYear: '2026-2027',
  sourceClass: '11th',
  destClass: '12th',
  sourceGroup: 'All',
  destGroup: 'Computer Science',
  rollNumberPolicy: 'retain', // 'retain' or 'prefix_dest_class'

  async render(container) {
    const students = await window.FirebaseService.getCollection('students');
    const promotions = await window.FirebaseService.getCollection('promotions');

    // Filter students eligible for promotion from sourceClass
    let eligibleStudents = students.filter(s => s.class === this.sourceClass && s.status === 'Active');
    if (this.sourceGroup !== 'All') {
      eligibleStudents = eligibleStudents.filter(s => s.group === this.sourceGroup);
    }

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 0.25rem;">
            <span>Academic Management</span> <span style="margin: 0 0.4rem;">/</span> <span style="color: var(--primary-600); font-weight: 600;">Student Promotion</span>
          </div>
          <h1 style="font-size: 1.6rem; color: var(--slate-900); font-weight: 800; margin: 0;">Academic Year Student Promotions</h1>
          <p style="color: var(--slate-500); font-size: 0.85rem; margin-top: 0.25rem;">
            Transition students between academic cycles (9th→10th, 10th→11th, 11th→12th) while preserving permanent historical records.
          </p>
        </div>
        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="btn-view-promotion-history">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Promotion Audit History (${promotions.length})
          </button>
        </div>
      </div>

      <!-- Promotion Configuration Setup Card -->
      <div class="data-card">
        <div class="data-card-header">
          <h3 class="data-card-title">1. Configure Academic Progression Pathway</h3>
          <span class="badge badge-studying">Historical Archives Preserved</span>
        </div>

        <div style="padding: 1.5rem;">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Current Academic Cycle <span class="req-star">*</span></label>
              <select id="prom-source-year" class="form-control">
                <option value="2025-2026" ${this.sourceYear === '2025-2026' ? 'selected' : ''}>2025-2026</option>
                <option value="2026-2027" ${this.sourceYear === '2026-2027' ? 'selected' : ''}>2026-2027</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Destination Academic Cycle <span class="req-star">*</span></label>
              <select id="prom-dest-year" class="form-control">
                <option value="2026-2027" ${this.destYear === '2026-2027' ? 'selected' : ''}>2026-2027</option>
                <option value="2027-2028" ${this.destYear === '2027-2028' ? 'selected' : ''}>2027-2028</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Source Class <span class="req-star">*</span></label>
              <select id="prom-source-class" class="form-control">
                <option value="11th" ${this.sourceClass === '11th' ? 'selected' : ''}>Class 11th (First Year)</option>
                <option value="10th" ${this.sourceClass === '10th' ? 'selected' : ''}>Class 10th (Matric)</option>
                <option value="9th" ${this.sourceClass === '9th' ? 'selected' : ''}>Class 9th (Freshman)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Destination Class <span class="req-star">*</span></label>
              <select id="prom-dest-class" class="form-control">
                <option value="12th" ${this.destClass === '12th' ? 'selected' : ''}>Class 12th (Final Year)</option>
                <option value="11th" ${this.destClass === '11th' ? 'selected' : ''}>Class 11th (College)</option>
                <option value="10th" ${this.destClass === '10th' ? 'selected' : ''}>Class 10th (Senior)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Source Group</label>
              <select id="prom-source-group" class="form-control">
                <option value="All" ${this.sourceGroup === 'All' ? 'selected' : ''}>All Groups</option>
                <option value="Computer Science" ${this.sourceGroup === 'Computer Science' ? 'selected' : ''}>Computer Science</option>
                <option value="Pre-Medical" ${this.sourceGroup === 'Pre-Medical' ? 'selected' : ''}>Pre-Medical</option>
                <option value="Pre-Engineering" ${this.sourceGroup === 'Pre-Engineering' ? 'selected' : ''}>Pre-Engineering</option>
                <option value="Science" ${this.sourceGroup === 'Science' ? 'selected' : ''}>Science</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Destination Stream / Group <span class="req-star">*</span></label>
              <select id="prom-dest-group" class="form-control">
                <option value="Computer Science" ${this.destGroup === 'Computer Science' ? 'selected' : ''}>Computer Science</option>
                <option value="Pre-Medical" ${this.destGroup === 'Pre-Medical' ? 'selected' : ''}>Pre-Medical</option>
                <option value="Pre-Engineering" ${this.destGroup === 'Pre-Engineering' ? 'selected' : ''}>Pre-Engineering</option>
                <option value="Science" ${this.destGroup === 'Science' ? 'selected' : ''}>Science</option>
              </select>
            </div>

            <div class="form-group form-col-full">
              <label class="form-label">Roll Number Handling Policy</label>
              <div style="display: flex; gap: 1.5rem; background: var(--slate-50); padding: 0.85rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer;">
                  <input type="radio" name="rdo-policy" value="retain" ${this.rollNumberPolicy === 'retain' ? 'checked' : ''} />
                  <strong>Retain Existing Roll Number</strong> (Recommended across academic cycles)
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer;">
                  <input type="radio" name="rdo-policy" value="prefix_dest_class" ${this.rollNumberPolicy === 'prefix_dest_class' ? 'checked' : ''} />
                  <strong>Auto-Assign Destination Class Prefix</strong> (e.g. 1101 becomes 1201)
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Candidate Selection & Preview Table Card -->
      <div class="data-card">
        <div class="data-card-header" style="flex-wrap: wrap; gap: 1rem;">
          <div class="data-card-title-group">
            <h3 class="data-card-title">2. Select Eligible Candidates for Progression</h3>
            <span class="data-card-subtitle">
              Candidates in Class ${this.sourceClass} (${this.sourceGroup}) eligible to progress to Class ${this.destClass} (${this.destGroup})
            </span>
          </div>
          <div style="display: flex; gap: 0.65rem; align-items: center;">
            <button type="button" class="btn btn-primary" id="btn-execute-promotions" ${eligibleStudents.length === 0 ? 'disabled' : ''}>
              Execute Promotion Workflow (${eligibleStudents.length})
            </button>
          </div>
        </div>

        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); background: var(--slate-50); display: flex; justify-content: space-between; align-items: center;">
          <label class="checkbox-label" style="font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
            <input type="checkbox" id="chk-select-all-promo" checked /> Select All Candidates (${eligibleStudents.length})
          </label>
          <div style="font-size: 0.8rem; color: var(--slate-600);">
            Fee schedules for Class ${this.destClass} will be automatically initialized for promoted students.
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px;"></th>
                <th>Current Roll #</th>
                <th>Student Full Name</th>
                <th>Current Class & Group</th>
                <th>Proposed Destination</th>
                <th>Predicted Roll #</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="promo-candidates-body">
              ${eligibleStudents.length === 0 ? `
                <tr><td colspan="7" style="text-align: center; color: #334155; padding: 2.5rem; font-weight: 600;">
                  No active students currently enrolled in Class ${this.sourceClass} (${this.sourceGroup}).
                </td></tr>
              ` : eligibleStudents.map(s => {
                const predictedRoll = this.rollNumberPolicy === 'prefix_dest_class'
                  ? `${this.destClass.replace(/[^0-9]/g, '')}${s.rollNumber.slice(-2)}`
                  : s.rollNumber;

                return `
                  <tr>
                    <td><input type="checkbox" class="chk-promo-item" value="${s.id}" checked /></td>
                    <td><strong style="color: var(--primary-600);">${s.rollNumber}</strong></td>
                    <td><strong>${s.fullName}</strong></td>
                    <td>Class ${s.class} (${s.group})</td>
                    <td><span class="badge badge-paid">Class ${this.destClass} (${this.destGroup})</span></td>
                    <td><strong style="color: var(--primary-800);">${predictedRoll}</strong></td>
                    <td><span class="badge badge-studying">Ready for Promotion</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.attachEvents(container, eligibleStudents, promotions);
  },

  attachEvents(container, eligibleStudents, promotions) {
    // Config dropdown changes
    const srcYear = container.querySelector('#prom-source-year');
    const dstYear = container.querySelector('#prom-dest-year');
    const srcClass = container.querySelector('#prom-source-class');
    const dstClass = container.querySelector('#prom-dest-class');
    const srcGroup = container.querySelector('#prom-source-group');
    const dstGroup = container.querySelector('#prom-dest-group');

    const updatePathway = () => {
      this.sourceYear = srcYear.value;
      this.destYear = dstYear.value;
      this.sourceClass = srcClass.value;
      this.destClass = dstClass.value;
      this.sourceGroup = srcGroup.value;
      this.destGroup = dstGroup.value;
      this.render(container);
    };

    if (srcClass) srcClass.onchange = () => {
      // Auto-set logical destination class
      if (srcClass.value === '9th') dstClass.value = '10th';
      else if (srcClass.value === '10th') dstClass.value = '11th';
      else if (srcClass.value === '11th') dstClass.value = '12th';
      updatePathway();
    };

    if (srcYear) srcYear.onchange = updatePathway;
    if (dstYear) dstYear.onchange = updatePathway;
    if (dstClass) dstClass.onchange = updatePathway;
    if (srcGroup) srcGroup.onchange = updatePathway;
    if (dstGroup) dstGroup.onchange = updatePathway;

    // Policy radio
    container.querySelectorAll('input[name="rdo-policy"]').forEach(rdo => {
      rdo.onchange = () => {
        this.rollNumberPolicy = rdo.value;
        this.render(container);
      };
    });

    // Select all
    const chkAll = container.querySelector('#chk-select-all-promo');
    const items = container.querySelectorAll('.chk-promo-item');

    if (chkAll) {
      chkAll.onchange = () => {
        items.forEach(cb => cb.checked = chkAll.checked);
      };
    }

    // Execute Promotion button
    const btnExecute = container.querySelector('#btn-execute-promotions');
    if (btnExecute) {
      btnExecute.onclick = async () => {
        const selectedIds = Array.from(container.querySelectorAll('.chk-promo-item:checked')).map(cb => cb.value);
        if (selectedIds.length === 0) {
          window.UIUtils.showToast('error', 'None Selected', 'Please select at least one student for promotion.');
          return;
        }

        const confirmMsg = `PROCEED WITH ACADEMIC PROMOTION?\n\n` +
          `• Promote ${selectedIds.length} students from Class ${this.sourceClass} to Class ${this.destClass} (${this.destGroup})\n` +
          `• Target Academic Year: ${this.destYear}\n` +
          `• Roll Number Policy: ${this.rollNumberPolicy}\n\n` +
          `Historical attendance, previous fees, and audit records will remain permanently preserved.`;

        if (!confirm(confirmMsg)) return;

        await window.GlobalLoader.wrap(async () => {
          await window.FirebaseService.promoteStudents({
            sourceYear: this.sourceYear,
            destYear: this.destYear,
            sourceClass: this.sourceClass,
            destClass: this.destClass,
            sourceGroup: this.sourceGroup,
            destGroup: this.destGroup,
            studentIds: selectedIds,
            rollNumberPolicy: this.rollNumberPolicy,
            executedBy: 'Super Administrator'
          });
        }, `Executing academic year promotion workflow and generating fee ledgers for ${selectedIds.length} students in Cloud Firestore...`, 'Ideal Coaching Center');

        window.UIUtils.showToast('success', 'Promotion Completed', `Successfully promoted ${selectedIds.length} students to Class ${this.destClass}.`);
        this.render(container);
      };
    }

    // View promotion history
    const btnHist = container.querySelector('#btn-view-promotion-history');
    if (btnHist) {
      btnHist.onclick = () => this.openHistoryModal(promotions);
    }
  },

  /**
   * Modal: Promotion Audit History
   */
  openHistoryModal(promotions) {
    const content = `
      <div style="padding: 0.5rem 0;">
        <table class="data-table" style="font-size: 0.8rem;">
          <thead>
            <tr>
              <th>Date</th>
              <th>Transition Pathway</th>
              <th>Destination Stream</th>
              <th>Candidates Promoted</th>
              <th>Executed By</th>
            </tr>
          </thead>
          <tbody>
            ${promotions.length === 0 ? `
              <tr><td colspan="5" style="text-align: center; color: var(--slate-500); padding: 2rem;">No historical promotion batches recorded.</td></tr>
            ` : promotions.map(p => `
              <tr>
                <td>${p.date || 'N/A'}</td>
                <td><strong>Class ${p.sourceClass} → Class ${p.destClass}</strong> (${p.sourceYear} to ${p.destYear})</td>
                <td>${p.destGroup}</td>
                <td><strong style="color: var(--primary-700);">${p.studentCount} Students</strong></td>
                <td>${p.executedBy || 'Super Admin'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    window.UIUtils.showModal('Academic Promotion Audit History', content, `
      <button type="button" class="btn btn-primary" onclick="window.UIUtils.closeModal('promo-hist-modal')">Close</button>
    `, 'modal-lg', 'promo-hist-modal');
  }
};

window.PromotionsView = PromotionsView;
