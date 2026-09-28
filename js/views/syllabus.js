/**
 * Ideal Coaching Center - Syllabus & Books System
 * Configurable syllabus per Class & Group, books, chapters, and single-active "Currently Studying" logic
 */

const SyllabusView = {
  selectedClass: '12th',
  selectedGroup: 'Computer Science',

  /**
   * Render Syllabus Management for Admin / Super Admin
   */
  async render(container) {
    const books = await window.FirebaseService.getCollection('books');
    const chapters = await window.FirebaseService.getCollection('chapters');

    const filteredBooks = books.filter(b => b.class === this.selectedClass && b.group === this.selectedGroup);

    container.innerHTML = `
      <div class="data-card">
        <div class="data-card-header">
          <div class="data-card-title-group">
            <h2 class="data-card-title">Syllabus & Books Management</h2>
            <span class="data-card-subtitle">Configure subject curricula and track current chapter progress • Ideal Coaching Center</span>
          </div>
          <div class="data-card-actions">
            <button type="button" class="btn btn-primary btn-sm" id="btn-add-book">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Book / Subject
            </button>
          </div>
        </div>

        <div style="padding: 1.5rem;">
          <!-- Class & Group Filter Bar -->
          <div class="attendance-filter-bar">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
              <div class="form-group" style="margin: 0;">
                <label class="form-label">Class:</label>
                <select id="syl-filter-class" class="form-control" style="width: 120px;">
                  <option value="9th" ${this.selectedClass === '9th' ? 'selected' : ''}>9th</option>
                  <option value="10th" ${this.selectedClass === '10th' ? 'selected' : ''}>10th</option>
                  <option value="11th" ${this.selectedClass === '11th' ? 'selected' : ''}>11th</option>
                  <option value="12th" ${this.selectedClass === '12th' ? 'selected' : ''}>12th</option>
                </select>
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label">Group:</label>
                <select id="syl-filter-group" class="form-control" style="min-width: 180px;">
                  <!-- Dynamic groups -->
                </select>
              </div>
            </div>

            <div style="font-size: 0.825rem; color: var(--slate-600);">
              Curriculum for: <strong style="color: var(--primary-700);">${this.selectedClass} (${this.selectedGroup})</strong>
            </div>
          </div>

          <!-- Books & Chapters Grid -->
          <div id="syllabus-books-grid" class="syllabus-books-grid">
            ${filteredBooks.length === 0 ? `
              <div class="form-col-full" style="grid-column: 1 / -1;">
                <div class="table-empty-state">
                  <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                  <h4 class="empty-state-title">Syllabus has not been configured yet</h4>
                  <p class="empty-state-text">No books configured for Class ${this.selectedClass} (${this.selectedGroup}). Click "Add Book / Subject" to start.</p>
                </div>
              </div>
            ` : filteredBooks.map(book => {
              const bookChapters = chapters
                .filter(c => c.bookId === book.id)
                .sort((a, b) => a.order - b.order);

              return `
                <div class="book-card" data-book-id="${book.id}">
                  <div class="book-card-header">
                    <div>
                      <h4 class="book-card-title">${book.title}</h4>
                      <span style="font-size: 0.725rem; color: #93c5fd;">Code: ${book.code || 'N/A'} • ${bookChapters.length} Chapters</span>
                    </div>
                    <div style="display: flex; gap: 0.35rem;">
                      <button type="button" class="btn btn-secondary btn-sm btn-add-chapter" data-book-id="${book.id}" data-book-title="${book.title}" title="Add Chapter">
                        + Chapter
                      </button>
                      <button type="button" class="btn btn-danger btn-sm btn-delete-book" data-book-id="${book.id}" title="Delete Book">
                        &times;
                      </button>
                    </div>
                  </div>

                  <div class="book-card-body">
                    ${bookChapters.length === 0 ? `
                      <p style="font-size: 0.8rem; color: var(--slate-400); text-align: center; padding: 1.5rem 0;">
                        No chapters added yet.
                      </p>
                    ` : `
                      <div>
                        ${bookChapters.map(ch => `
                          <div class="chapter-item ${ch.status === 'Currently Studying' ? 'chapter-status-active' : ''}">
                            <div class="chapter-title-group">
                              <span class="chapter-order-badge">${ch.order}</span>
                              <span class="chapter-title">${ch.title}</span>
                            </div>

                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                              <select class="filter-select select-chapter-status" data-book-id="${book.id}" data-chapter-id="${ch.id}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                                <option value="Not Started" ${ch.status === 'Not Started' ? 'selected' : ''}>Not Started</option>
                                <option value="Currently Studying" ${ch.status === 'Currently Studying' ? 'selected' : ''}>Currently Studying</option>
                                <option value="Completed" ${ch.status === 'Completed' ? 'selected' : ''}>Completed</option>
                              </select>
                              <button type="button" class="btn btn-secondary btn-sm btn-delete-chapter" data-chapter-id="${ch.id}" style="padding: 0.2rem 0.4rem; color: var(--danger-600);" title="Delete Chapter">
                                &times;
                              </button>
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    this.populateGroupOptions(container);
    this.bindEvents(container);
  },

  populateGroupOptions(container) {
    const classGroups = window.UIUtils.getClassesAndGroups();
    const groups = classGroups[this.selectedClass] || [];
    const groupSelect = container.querySelector('#syl-filter-group');
    if (!groupSelect) return;

    groupSelect.innerHTML = groups.map(g => `
      <option value="${g}" ${this.selectedGroup === g ? 'selected' : ''}>${g}</option>
    `).join('');

    if (!groups.includes(this.selectedGroup) && groups.length > 0) {
      this.selectedGroup = groups[0];
    }
  },

  bindEvents(container) {
    const classSelect = container.querySelector('#syl-filter-class');
    const groupSelect = container.querySelector('#syl-filter-group');
    const addBookBtn = container.querySelector('#btn-add-book');

    if (classSelect) {
      classSelect.onchange = async () => {
        this.selectedClass = classSelect.value;
        const classGroups = window.UIUtils.getClassesAndGroups();
        this.selectedGroup = classGroups[this.selectedClass][0];
        await window.GlobalLoader.wrap(async () => {
          this.render(container);
        }, 'Loading syllabus for selected class...', 'Ideal Coaching Center');
      };
    }

    if (groupSelect) {
      groupSelect.onchange = async () => {
        this.selectedGroup = groupSelect.value;
        await window.GlobalLoader.wrap(async () => {
          this.render(container);
        }, 'Filtering books by group...', 'Ideal Coaching Center');
      };
    }

    if (addBookBtn) {
      addBookBtn.onclick = () => this.openAddBookModal(container);
    }

    // Add chapter buttons
    container.querySelectorAll('.btn-add-chapter').forEach(btn => {
      btn.onclick = () => {
        const bookId = btn.getAttribute('data-book-id');
        const bookTitle = btn.getAttribute('data-book-title');
        this.openAddChapterModal(container, bookId, bookTitle);
      };
    });

    // Delete Book buttons
    container.querySelectorAll('.btn-delete-book').forEach(btn => {
      btn.onclick = async () => {
        const bookId = btn.getAttribute('data-book-id');
        const confirmed = await window.UIUtils.confirm({
          title: 'Delete Book / Subject',
          message: 'Are you sure you want to delete this book and its chapters from the syllabus?',
          confirmText: 'Yes, Delete Book',
          cancelText: 'Cancel',
          type: 'danger'
        });

        if (confirmed) {
          await window.GlobalLoader.wrap(async () => {
            await window.FirebaseService.deleteDocument('books', bookId);
            // Delete child chapters
            const allChapters = await window.FirebaseService.getCollection('chapters');
            for (const ch of allChapters) {
              if (ch.bookId === bookId) {
                await window.FirebaseService.deleteDocument('chapters', ch.id);
              }
            }
          }, 'Removing book from syllabus...', 'Ideal Coaching Center');

          window.UIUtils.showToast('info', 'Book Deleted', 'The book and chapters have been removed.');
          this.render(container);
        }
      };
    });

    // Delete Chapter buttons
    container.querySelectorAll('.btn-delete-chapter').forEach(btn => {
      btn.onclick = async () => {
        const chId = btn.getAttribute('data-chapter-id');
        const confirmed = await window.UIUtils.confirm({
          title: 'Delete Chapter',
          message: 'Are you sure you want to delete this chapter?',
          confirmText: 'Yes, Delete',
          cancelText: 'Cancel',
          type: 'danger'
        });

        if (confirmed) {
          await window.GlobalLoader.wrap(async () => {
            await window.FirebaseService.deleteDocument('chapters', chId);
          }, 'Removing chapter...', 'Ideal Coaching Center');
          this.render(container);
        }
      };
    });

    // Chapter Status Change (ENFORCES SINGLE ACTIVE CURRENTLY STUDYING CHAPTER PER BOOK)
    container.querySelectorAll('.select-chapter-status').forEach(select => {
      select.onchange = async (e) => {
        const bookId = select.getAttribute('data-book-id');
        const chapterId = select.getAttribute('data-chapter-id');
        const newStatus = e.target.value;

        await window.GlobalLoader.wrap(async () => {
          if (newStatus === 'Currently Studying') {
            // Automatically remove "Currently Studying" from any previous chapter in this same book
            const allChapters = await window.FirebaseService.getCollection('chapters');
            for (const ch of allChapters) {
              if (ch.bookId === bookId && ch.id !== chapterId && ch.status === 'Currently Studying') {
                await window.FirebaseService.updateDocument('chapters', ch.id, {
                  status: 'Completed'
                });
              }
            }
          }

          // Update targeted chapter
          await window.FirebaseService.updateDocument('chapters', chapterId, {
            status: newStatus
          });

          await window.AuditService.log({
            action: 'Syllabus Chapter Status Updated',
            category: 'Academic',
            targetType: 'Chapter',
            targetId: chapterId,
            details: `Updated chapter status to ${newStatus}`
          });
        }, 'Updating chapter status in Firebase...', 'Ideal Coaching Center');

        window.UIUtils.showToast('success', 'Status Updated', `Chapter marked as "${newStatus}".`);
        this.render(container);
      };
    });
  },

  openAddBookModal(container) {
    let modal = document.getElementById('add-book-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'add-book-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog modal-sm">
        <div class="modal-header">
          <h3 class="modal-title">Add Book / Subject</h3>
          <button type="button" class="modal-close-btn" id="btn-close-book-modal">&times;</button>
        </div>

        <div class="modal-body">
          <div style="font-size: 0.8rem; color: var(--slate-600); margin-bottom: 1rem;">
            Adding for: <strong>Class ${this.selectedClass} (${this.selectedGroup})</strong>
          </div>

          <form id="add-book-form" class="form-group" style="gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Book / Subject Title <span class="req-star">*</span></label>
              <input type="text" id="book-input-title" class="form-control" placeholder="e.g. Physics - Part II" required />
            </div>

            <div class="form-group">
              <label class="form-label">Subject Code / Short Code</label>
              <input type="text" id="book-input-code" class="form-control" placeholder="e.g. PHY-12" />
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-cancel-book">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-confirm-add-book">Add Book</button>
        </div>
      </div>
    `;

    window.UIUtils.openModal('add-book-modal');

    modal.querySelector('#btn-close-book-modal').onclick = () => window.UIUtils.closeModal('add-book-modal');
    modal.querySelector('#btn-cancel-book').onclick = () => window.UIUtils.closeModal('add-book-modal');

    modal.querySelector('#btn-confirm-add-book').onclick = async () => {
      const title = modal.querySelector('#book-input-title').value.trim();
      const code = modal.querySelector('#book-input-code').value.trim();

      if (!title) {
        window.UIUtils.showToast('error', 'Title Required', 'Please enter a book or subject title.');
        return;
      }

      window.UIUtils.closeModal('add-book-modal');

      await window.GlobalLoader.wrap(async () => {
        const bookId = `book_${this.selectedClass}_${Date.now()}`;
        await window.FirebaseService.addDocument('books', {
          id: bookId,
          class: this.selectedClass,
          group: this.selectedGroup,
          title: title,
          code: code || title.slice(0, 4).toUpperCase(),
          createdAt: new Date().toISOString()
        });
      }, 'Saving book to syllabus...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Book Added', `"${title}" has been added to the syllabus.`);
      this.render(container);
    };
  },

  openAddChapterModal(container, bookId, bookTitle) {
    let modal = document.getElementById('add-chapter-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'add-chapter-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog modal-sm">
        <div class="modal-header">
          <h3 class="modal-title">Add Chapter to ${bookTitle}</h3>
          <button type="button" class="modal-close-btn" id="btn-close-chapter-modal">&times;</button>
        </div>

        <div class="modal-body">
          <form id="add-chapter-form" class="form-group" style="gap: 1rem;">
            <div class="form-group">
              <label class="form-label">Chapter Order Number <span class="req-star">*</span></label>
              <input type="number" id="ch-input-order" class="form-control" value="1" min="1" required />
            </div>

            <div class="form-group">
              <label class="form-label">Chapter Title / Name <span class="req-star">*</span></label>
              <input type="text" id="ch-input-title" class="form-control" placeholder="e.g. Electromagnetic Induction" required />
            </div>

            <div class="form-group">
              <label class="form-label">Initial Status</label>
              <select id="ch-input-status" class="form-control">
                <option value="Not Started" selected>Not Started</option>
                <option value="Currently Studying">Currently Studying</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </form>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btn-cancel-chapter">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-confirm-add-chapter">Save Chapter</button>
        </div>
      </div>
    `;

    window.UIUtils.openModal('add-chapter-modal');

    modal.querySelector('#btn-close-chapter-modal').onclick = () => window.UIUtils.closeModal('add-chapter-modal');
    modal.querySelector('#btn-cancel-chapter').onclick = () => window.UIUtils.closeModal('add-chapter-modal');

    modal.querySelector('#btn-confirm-add-chapter').onclick = async () => {
      const order = Number(modal.querySelector('#ch-input-order').value) || 1;
      const title = modal.querySelector('#ch-input-title').value.trim();
      const status = modal.querySelector('#ch-input-status').value;

      if (!title) {
        window.UIUtils.showToast('error', 'Title Required', 'Please enter a chapter title.');
        return;
      }

      window.UIUtils.closeModal('add-chapter-modal');

      await window.GlobalLoader.wrap(async () => {
        if (status === 'Currently Studying') {
          // Unset previous active
          const allChapters = await window.FirebaseService.getCollection('chapters');
          for (const c of allChapters) {
            if (c.bookId === bookId && c.status === 'Currently Studying') {
              await window.FirebaseService.updateDocument('chapters', c.id, { status: 'Completed' });
            }
          }
        }

        const chId = `ch_${Date.now()}`;
        await window.FirebaseService.addDocument('chapters', {
          id: chId,
          bookId: bookId,
          order: order,
          title: title,
          status: status,
          createdAt: new Date().toISOString()
        });
      }, 'Saving chapter to syllabus...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Chapter Added', `Chapter ${order}: "${title}" added.`);
      this.render(container);
    };
  }
};

window.SyllabusView = SyllabusView;
