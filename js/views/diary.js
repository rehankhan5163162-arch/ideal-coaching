/**
 * Ideal Coaching Center - Daily Diary System
 * Class and Group Daily Diary entries, history viewer, and editor
 */

const DiaryView = {
  selectedClass: '12th',
  selectedGroup: 'Computer Science',
  selectedDate: new Date().toISOString().split('T')[0],

  /**
   * Render Diary Management View for Admin / Super Admin
   */
  async render(container) {
    const classGroups = window.UIUtils.getClassesAndGroups();

    container.innerHTML = `
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">Daily Diary & Homework</h2>
            <span class="data-card-subtitle">Post and manage class daily diaries and homework assignments • Ideal Coaching Center</span>
          </div>
          <div class="data-card-actions">
            <button type="button" class="btn btn-primary btn-sm" id="btn-save-diary-entry">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Save Diary Entry
            </button>
          </div>
        </div>

        <div style="padding: 1.5rem;">
          <!-- Controls Bar -->
          <div class="attendance-filter-bar">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Diary Date:</label>
                <input type="date" id="diary-date-picker" class="form-control" value="${this.selectedDate}" style="width: 170px;" />
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label">Class:</label>
                <select id="diary-class-select" class="form-control" style="width: 120px;">
                  <option value="9th" ${this.selectedClass === '9th' ? 'selected' : ''}>9th</option>
                  <option value="10th" ${this.selectedClass === '10th' ? 'selected' : ''}>10th</option>
                  <option value="11th" ${this.selectedClass === '11th' ? 'selected' : ''}>11th</option>
                  <option value="12th" ${this.selectedClass === '12th' ? 'selected' : ''}>12th</option>
                </select>
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label">Group:</label>
                <select id="diary-group-select" class="form-control" style="min-width: 180px;">
                  <!-- Dynamic groups -->
                </select>
              </div>
            </div>

            <div style="font-size: 0.825rem; color: var(--slate-600);">
              Posting for: <strong style="color: var(--primary-700);">Class ${this.selectedClass} (${this.selectedGroup})</strong>
            </div>
          </div>

          <!-- Diary Editor Card -->
          <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 2rem;">
            <label class="form-label" style="font-size: 0.95rem; margin-bottom: 0.5rem;">
              Diary Content for ${window.UIUtils.formatDate(this.selectedDate)}:
            </label>
            <textarea id="diary-editor-text" class="form-control" style="min-height: 140px; font-size: 0.9rem; line-height: 1.6;" placeholder="Enter daily diary notes, subjects, exercises, and homework instructions..."></textarea>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
              <span class="form-help">Students in ${this.selectedClass} (${this.selectedGroup}) will see this under Today's Diary.</span>
              <button type="button" class="btn btn-success btn-sm" id="btn-save-editor-direct">
                Save & Update Diary
              </button>
            </div>
          </div>

          <!-- Diary History Timeline for Class & Group -->
          <div style="margin-top: 2rem;">
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 1rem;">Past Diary Entries (History)</h3>
            <div id="diary-history-timeline">
              <!-- Rendered below -->
            </div>
          </div>
        </div>
      </div>
    `;

    this.populateGroupOptions(container);
    await this.loadActiveDiaryEntry(container);
    await this.renderDiaryHistory(container);
    this.bindEvents(container);
  },

  populateGroupOptions(container) {
    const classGroups = window.UIUtils.getClassesAndGroups();
    const groups = classGroups[this.selectedClass] || [];
    const groupSelect = container.querySelector('#diary-group-select');
    if (!groupSelect) return;

    groupSelect.innerHTML = groups.map(g => `
      <option value="${g}" ${this.selectedGroup === g ? 'selected' : ''}>${g}</option>
    `).join('');

    if (!groups.includes(this.selectedGroup) && groups.length > 0) {
      this.selectedGroup = groups[0];
    }
  },

  async loadActiveDiaryEntry(container) {
    const allDiaries = await window.FirebaseService.getCollection('diary');
    const matched = allDiaries.find(d => d.class === this.selectedClass && d.group === this.selectedGroup && d.date === this.selectedDate);
    const textarea = container.querySelector('#diary-editor-text');
    if (textarea) {
      textarea.value = matched ? matched.content : '';
    }
  },

  async renderDiaryHistory(container) {
    const historyWrapper = container.querySelector('#diary-history-timeline');
    if (!historyWrapper) return;

    const allDiaries = await window.FirebaseService.getCollection('diary');
    const classDiaries = allDiaries
      .filter(d => d.class === this.selectedClass && d.group === this.selectedGroup)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (classDiaries.length === 0) {
      historyWrapper.innerHTML = `
        <div class="table-empty-state">
          <p class="empty-state-text">No past diary entries recorded for ${this.selectedClass} (${this.selectedGroup}).</p>
        </div>
      `;
      return;
    }

    historyWrapper.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${classDiaries.map(d => `
          <div class="diary-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
              <span class="diary-date-badge">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                ${window.UIUtils.formatDate(d.date)}
              </span>
              <span style="font-size: 0.75rem; color: var(--slate-500);">Posted by: <strong>${d.author || 'Admin'}</strong></span>
            </div>
            <div class="diary-content-text">${d.content}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  bindEvents(container) {
    const dateInput = container.querySelector('#diary-date-picker');
    const classSelect = container.querySelector('#diary-class-select');
    const groupSelect = container.querySelector('#diary-group-select');
    const saveBtn = container.querySelector('#btn-save-diary-entry');
    const saveDirectBtn = container.querySelector('#btn-save-editor-direct');

    if (dateInput) {
      dateInput.onchange = async () => {
        this.selectedDate = dateInput.value;
        await this.loadActiveDiaryEntry(container);
      };
    }

    if (classSelect) {
      classSelect.onchange = async () => {
        this.selectedClass = classSelect.value;
        const classGroups = window.UIUtils.getClassesAndGroups();
        this.selectedGroup = classGroups[this.selectedClass][0];
        await window.GlobalLoader.wrap(async () => {
          this.render(container);
        }, 'Loading diary history...', 'Ideal Coaching Center');
      };
    }

    if (groupSelect) {
      groupSelect.onchange = async () => {
        this.selectedGroup = groupSelect.value;
        await window.GlobalLoader.wrap(async () => {
          this.render(container);
        }, 'Loading diary history...', 'Ideal Coaching Center');
      };
    }

    const handleSave = async () => {
      const textarea = container.querySelector('#diary-editor-text');
      const content = textarea ? textarea.value.trim() : '';

      if (!content) {
        window.UIUtils.showToast('error', 'Diary Content Empty', 'Please enter text content for the daily diary.');
        return;
      }

      await window.GlobalLoader.wrap(async () => {
        const user = window.AuthService.getCurrentUser() || { fullName: 'Admin' };
        const diaryId = `diary_${this.selectedClass}_${this.selectedGroup.replace(/\s+/g, '_')}_${this.selectedDate}`;
        const diaryRecord = {
          id: diaryId,
          class: this.selectedClass,
          group: this.selectedGroup,
          date: this.selectedDate,
          content: content,
          author: user.fullName || 'Admin',
          updatedAt: new Date().toISOString()
        };

        await window.FirebaseService.addDocument('diary', diaryRecord);

        await window.AuditService.log({
          action: 'Daily Diary Saved',
          category: 'Academic',
          targetType: 'Diary',
          targetId: diaryId,
          details: `Saved daily diary for ${this.selectedClass} (${this.selectedGroup}) on ${this.selectedDate}`
        });
      }, 'Saving daily diary entry to Firebase...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Diary Saved', `Daily diary for ${this.selectedDate} has been posted successfully.`);
      this.renderDiaryHistory(container);
    };

    if (saveBtn) saveBtn.onclick = handleSave;
    if (saveDirectBtn) saveDirectBtn.onclick = handleSave;
  }
};

window.DiaryView = DiaryView;
