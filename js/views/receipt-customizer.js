/**
 * Ideal Coaching Center - Receipt Customization & Historical Receipts Module
 * Provides live interactive receipt design customization, layout controls,
 * field toggles, real-time preview, print, PDF export, and historical receipt search & reprint.
 */

const ReceiptCustomizerView = {
  activeTemplate: null,

  async render(container) {
    this.activeTemplate = await window.FirebaseService.getReceiptTemplate();
    const tpl = this.activeTemplate;

    container.innerHTML = `
      <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div class="breadcrumbs" style="font-size: 0.8rem; color: var(--slate-500); margin-bottom: 0.25rem;">
            <span>System Settings</span> <span style="margin: 0 0.4rem;">/</span> <span style="color: var(--primary-600); font-weight: 600;">Receipt Customization</span>
          </div>
          <h1 style="font-size: 1.6rem; color: var(--slate-900); font-weight: 800; margin: 0;">Official Fee Receipt Customization</h1>
          <p style="color: var(--slate-500); font-size: 0.85rem; margin-top: 0.25rem;">
            Design and configure the institutional receipt layout, active fields, typography, and printing specifications for Ideal Coaching Center.
          </p>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="btn-reprint-receipts">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Search & Reprint Receipts
          </button>
          <button type="button" class="btn btn-secondary" id="btn-print-sample-receipt">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print Preview
          </button>
          <button type="button" class="btn btn-primary" id="btn-save-receipt-template">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            Save Template Changes
          </button>
        </div>
      </div>

      <!-- Main Two-Column Layout: Settings Editor Left, Live Preview Right -->
      <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 1.75rem; align-items: start;">
        
        <!-- Left Column: Controls & Toggles -->
        <div class="data-card" style="margin-bottom: 0;">
          <div class="data-card-header" style="border-bottom: 1px solid var(--border-color); padding: 1rem 1.5rem;">
            <h3 class="data-card-title" style="font-size: 1.05rem;">Receipt Header & Layout Controls</h3>
            <span class="badge badge-paid">Live Sync Active</span>
          </div>

          <div style="padding: 1.5rem;">
            <form id="receipt-customizer-form" class="form-grid">

              <div class="form-group form-col-full">
                <label class="form-label">Institution Official Title <span class="req-star">*</span></label>
                <input type="text" id="rcpt-inst-name" class="form-control" value="${tpl.institutionName || 'Ideal Coaching Center'}" required />
                <span class="form-help">Locked to official institution name.</span>
              </div>

              <div class="form-group">
                <label class="form-label">Receipt Main Heading</label>
                <input type="text" id="rcpt-heading" class="form-control" value="${tpl.receiptHeading || 'OFFICIAL FEE RECEIPT'}" />
              </div>

              <div class="form-group">
                <label class="form-label">Tagline / Subheading</label>
                <input type="text" id="rcpt-tagline" class="form-control" value="${tpl.tagline || 'Excellence in Education'}" />
              </div>

              <div class="form-group form-col-full">
                <label class="form-label">Campus Address</label>
                <input type="text" id="rcpt-address" class="form-control" value="${tpl.address || 'Main Boulevard, Academic Block, Lahore, Pakistan'}" />
              </div>

              <div class="form-group">
                <label class="form-label">Helpline Phone Number</label>
                <input type="text" id="rcpt-phone" class="form-control" value="${tpl.phone || '+92 300 1234567'}" />
              </div>

              <div class="form-group">
                <label class="form-label">Official Email</label>
                <input type="email" id="rcpt-email" class="form-control" value="${tpl.email || 'info@idealcoaching.edu.pk'}" />
              </div>

              <div class="form-group">
                <label class="form-label">Print Layout / Copies</label>
                <select id="rcpt-print-layout" class="form-control">
                  <option value="2-copy" ${tpl.printLayout === '2-copy' ? 'selected' : ''}>2-Copy A4 (Office Copy + Student Copy)</option>
                  <option value="single" ${tpl.printLayout === 'single' ? 'selected' : ''}>Single A4 Full Page</option>
                  <option value="thermal" ${tpl.printLayout === 'thermal' ? 'selected' : ''}>80mm Thermal Receipt (Counter POS)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Currency Symbol</label>
                <input type="text" id="rcpt-currency" class="form-control" value="${tpl.currency || 'Rs.'}" />
              </div>

              <div class="form-group">
                <label class="form-label">Left Signature Label</label>
                <input type="text" id="rcpt-sig-left" class="form-control" value="${tpl.signatureLabelLeft || 'Depositor / Student Signature'}" />
              </div>

              <div class="form-group">
                <label class="form-label">Right Signature Label</label>
                <input type="text" id="rcpt-sig-right" class="form-control" value="${tpl.signatureLabelRight || 'Authorized Cashier / Principal'}" />
              </div>

              <div class="form-group form-col-full">
                <label class="form-label">Footer Terms & Disclaimer Note</label>
                <textarea id="rcpt-footer" class="form-control" rows="2">${tpl.footerText || 'This is an official computer-generated receipt from Ideal Coaching Center. Fees once deposited are non-refundable and non-transferable.'}</textarea>
              </div>

              <!-- Field Display Toggles -->
              <div class="form-col-full" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.75rem;">
                  Visible Information Toggles on Receipt
                </h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.65rem; background: var(--slate-50); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-name" ${tpl.showStudentName !== false ? 'checked' : ''} /> Student Full Name
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-father" ${tpl.showFatherName !== false ? 'checked' : ''} /> Father's Name
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-roll" ${tpl.showRollNumber !== false ? 'checked' : ''} /> Student Roll Number
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-contact" ${tpl.showContactNumber !== false ? 'checked' : ''} /> Contact Number
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-class" ${tpl.showClass !== false ? 'checked' : ''} /> Class (e.g. 12th)
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-group" ${tpl.showGroup !== false ? 'checked' : ''} /> Group / Stream
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-year" ${tpl.showAcademicYear !== false ? 'checked' : ''} /> Academic Cycle
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-month" ${tpl.showFeeMonth !== false ? 'checked' : ''} /> Fee Month(s)
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-type" ${tpl.showFeeType !== false ? 'checked' : ''} /> Fee Category Type
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-expected" ${tpl.showExpectedAmount !== false ? 'checked' : ''} /> Expected Due Amount
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-paid" ${tpl.showPaidAmount !== false ? 'checked' : ''} /> Amount Paid
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-balance" ${tpl.showRemainingBalance !== false ? 'checked' : ''} /> Remaining Balance
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-method" ${tpl.showPaymentMethod !== false ? 'checked' : ''} /> Payment Method / Mode
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-date" ${tpl.showPaymentDate !== false ? 'checked' : ''} /> Payment Date & Time
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-ref" ${tpl.showTransactionRef !== false ? 'checked' : ''} /> Transaction Reference
                  </label>
                  <label class="checkbox-label" style="font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="checkbox" id="chk-show-staff" ${tpl.showStaffMember !== false ? 'checked' : ''} /> Authorized Cashier / Staff
                  </label>
                </div>
              </div>

            </form>
          </div>
        </div>

        <!-- Right Column: Live Interactive Receipt Preview -->
        <div style="position: sticky; top: 1.5rem;">
          <div class="data-card" style="margin-bottom: 0; box-shadow: var(--shadow-xl); border: 2px solid var(--primary-200);">
            <div class="data-card-header" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #fff; padding: 0.85rem 1.25rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span style="font-size: 0.85rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                  Live Interactive Receipt Preview
                </span>
                <span class="badge" style="background: rgba(255,255,255,0.2); color: #fff; font-size: 0.7rem;">
                  WYSIWYG
                </span>
              </div>
            </div>

            <!-- Preview Paper Canvas -->
            <div id="receipt-preview-container" style="padding: 1.5rem; background: #f1f5f9; overflow-x: auto;">
              <!-- Embedded Live Receipt -->
              ${this.buildPreviewHTML(tpl)}
            </div>
          </div>
        </div>

      </div>
    `;

    this.attachEvents(container);
  },

  /**
   * Generates standard live receipt preview HTML based on active template properties
   */
  buildPreviewHTML(tpl, sampleReceipt = null) {
    const r = sampleReceipt || {
      receiptNumber: '2609001201',
      feeType: 'Monthly Tuition Fee',
      month: 'September 2026',
      academicYear: '2026-2027',
      studentName: 'Usman Farooq',
      fatherName: 'Farooq Ahmed',
      rollNumber: '1201',
      contactNumber: '0321-7654321',
      class: '12th',
      group: 'Computer Science',
      expectedAmount: 3000,
      paidAmount: 3000,
      remainingBalance: 0,
      paymentMode: 'Cash Counter',
      paymentDate: new Date().toISOString().split('T')[0],
      transactionRef: 'CSH-99210',
      cashier: 'Muhammad Tariq (Admin)',
      isOriginal: true
    };

    return `
      <div class="receipt-paper" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 1.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); font-family: 'Inter', -apple-system, sans-serif; color: #1e293b; max-width: 580px; margin: 0 auto; position: relative;">
        
        <!-- Watermark / Tag -->
        <div style="position: absolute; right: 1.5rem; top: 1.5rem; text-align: right;">
          <span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">
            ${r.isRefund ? 'REFUND RECEIPT' : (r.isCorrected ? 'CORRECTED RECEIPT' : (tpl.printLayout === '2-copy' ? 'STUDENT COPY' : 'OFFICIAL ORIGINAL'))}
          </span>
          <div style="font-size: 0.75rem; font-weight: 700; color: #0284c7; margin-top: 0.25rem;">
            #${r.receiptNumber}
          </div>
        </div>

        <!-- Receipt Header -->
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 0.85rem; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 42px; height: 42px; border-radius: 8px; background: linear-gradient(135deg, #0284c7, #0f172a); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.1rem; flex-shrink: 0;">
              ICC
            </div>
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 900; color: #0f172a; margin: 0; line-height: 1.2;">
                ${tpl.institutionName || 'Ideal Coaching Center'}
              </h2>
              <div style="font-size: 0.75rem; font-weight: 600; color: #d97706; text-transform: uppercase; letter-spacing: 0.5px;">
                ${tpl.tagline || 'Excellence in Education'}
              </div>
            </div>
          </div>
          <div style="font-size: 0.725rem; color: #64748b; margin-top: 0.5rem; line-height: 1.35;">
            ${tpl.address || 'Main Boulevard, Academic Block, Lahore, Pakistan'}<br />
            Ph: ${tpl.phone || '+92 300 1234567'} • Email: ${tpl.email || 'info@idealcoaching.edu.pk'}
          </div>
        </div>

        <!-- Title Banner -->
        <div style="text-align: center; background: #f8fafc; border: 1px dashed #cbd5e1; padding: 0.4rem; border-radius: 4px; margin-bottom: 1rem;">
          <strong style="font-size: 0.85rem; color: #0f172a; text-transform: uppercase; letter-spacing: 1px;">
            ${tpl.receiptHeading || 'OFFICIAL FEE RECEIPT'}
          </strong>
        </div>

        <!-- Key Information Grid -->
        <table style="width: 100%; border-collapse: collapse; font-size: 0.775rem; margin-bottom: 1rem;">
          <tbody>
            ${tpl.showStudentName !== false ? `
              <tr>
                <td style="padding: 0.25rem 0; color: #64748b; width: 35%;">Student Name:</td>
                <td style="padding: 0.25rem 0; font-weight: 700; color: #0f172a;">${r.studentName}</td>
              </tr>
            ` : ''}
            ${tpl.showFatherName !== false ? `
              <tr>
                <td style="padding: 0.25rem 0; color: #64748b;">Father's Name:</td>
                <td style="padding: 0.25rem 0; font-weight: 600;">${r.fatherName}</td>
              </tr>
            ` : ''}
            ${tpl.showRollNumber !== false ? `
              <tr>
                <td style="padding: 0.25rem 0; color: #64748b;">Roll Number:</td>
                <td style="padding: 0.25rem 0; font-weight: 800; color: #0284c7;">${r.rollNumber}</td>
              </tr>
            ` : ''}
            ${tpl.showClass !== false || tpl.showGroup !== false ? `
              <tr>
                <td style="padding: 0.25rem 0; color: #64748b;">Class & Group:</td>
                <td style="padding: 0.25rem 0; font-weight: 600;">
                  ${tpl.showClass !== false ? r.class : ''} ${tpl.showGroup !== false ? `(${r.group})` : ''}
                </td>
              </tr>
            ` : ''}
            ${tpl.showFeeMonth !== false ? `
              <tr>
                <td style="padding: 0.25rem 0; color: #64748b;">Fee Month:</td>
                <td style="padding: 0.25rem 0; font-weight: 600;">${r.month}</td>
              </tr>
            ` : ''}
            ${tpl.showFeeType !== false ? `
              <tr>
                <td style="padding: 0.25rem 0; color: #64748b;">Fee Category:</td>
                <td style="padding: 0.25rem 0; font-weight: 600;">${r.feeType}</td>
              </tr>
            ` : ''}
            ${tpl.showPaymentDate !== false ? `
              <tr>
                <td style="padding: 0.25rem 0; color: #64748b;">Payment Date:</td>
                <td style="padding: 0.25rem 0; font-weight: 600;">${r.paymentDate}</td>
              </tr>
            ` : ''}
            ${tpl.showPaymentMethod !== false ? `
              <tr>
                <td style="padding: 0.25rem 0; color: #64748b;">Payment Mode:</td>
                <td style="padding: 0.25rem 0; font-weight: 600;">${r.paymentMode} ${tpl.showTransactionRef !== false && r.transactionRef ? `(${r.transactionRef})` : ''}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>

        <!-- Amount Financial Breakdown Table -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 1.25rem;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
            <thead>
              <tr style="background: #e2e8f0; color: #334155; font-weight: 700; text-align: left;">
                <th style="padding: 0.4rem 0.75rem;">Description</th>
                <th style="padding: 0.4rem 0.75rem; text-align: right;">Amount (${tpl.currency || 'Rs.'})</th>
              </tr>
            </thead>
            <tbody>
              ${tpl.showExpectedAmount !== false ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 0.4rem 0.75rem; color: #64748b;">Total Fee Payable</td>
                  <td style="padding: 0.4rem 0.75rem; text-align: right; font-weight: 600;">${(r.expectedAmount || 3000).toLocaleString()}</td>
                </tr>
              ` : ''}
              ${tpl.showPaidAmount !== false ? `
                <tr style="border-bottom: 1px solid #e2e8f0; background: #ecfdf5;">
                  <td style="padding: 0.5rem 0.75rem; font-weight: 800; color: #047857;">Amount Received in Cash</td>
                  <td style="padding: 0.5rem 0.75rem; text-align: right; font-weight: 900; color: #047857; font-size: 0.95rem;">
                    ${tpl.currency || 'Rs.'} ${(r.paidAmount || 3000).toLocaleString()}
                  </td>
                </tr>
              ` : ''}
              ${tpl.showRemainingBalance !== false ? `
                <tr>
                  <td style="padding: 0.4rem 0.75rem; color: #64748b;">Balance Remaining</td>
                  <td style="padding: 0.4rem 0.75rem; text-align: right; font-weight: 700; color: ${r.remainingBalance > 0 ? '#b91c1c' : '#0f172a'};">
                    ${tpl.currency || 'Rs.'} ${(r.remainingBalance || 0).toLocaleString()}
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <!-- Footer Terms -->
        <div style="font-size: 0.675rem; color: #64748b; line-height: 1.4; border-top: 1px dashed #cbd5e1; padding-top: 0.75rem; margin-bottom: 2rem;">
          ${tpl.footerText || 'This is an official computer-generated receipt from Ideal Coaching Center. Fees once deposited are non-refundable and non-transferable.'}
        </div>

        <!-- Signatures Row -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 1rem;">
          <div style="text-align: center; width: 42%;">
            <div style="border-top: 1px solid #64748b; padding-top: 0.35rem; font-size: 0.725rem; font-weight: 600; color: #475569;">
              ${tpl.signatureLabelLeft || 'Depositor / Student Signature'}
            </div>
          </div>
          <div style="text-align: center; width: 42%;">
            <div style="border-top: 1px solid #64748b; padding-top: 0.35rem; font-size: 0.725rem; font-weight: 700; color: #0f172a;">
              ${tpl.signatureLabelRight || 'Authorized Cashier / Principal'}
            </div>
          </div>
        </div>

      </div>
    `;
  },

  /**
   * Attach Live Sync listeners to inputs
   */
  attachEvents(container) {
    const updatePreview = () => {
      const liveTpl = {
        institutionName: container.querySelector('#rcpt-inst-name').value.trim(),
        receiptHeading: container.querySelector('#rcpt-heading').value.trim(),
        tagline: container.querySelector('#rcpt-tagline').value.trim(),
        address: container.querySelector('#rcpt-address').value.trim(),
        phone: container.querySelector('#rcpt-phone').value.trim(),
        email: container.querySelector('#rcpt-email').value.trim(),
        printLayout: container.querySelector('#rcpt-print-layout').value,
        currency: container.querySelector('#rcpt-currency').value.trim(),
        signatureLabelLeft: container.querySelector('#rcpt-sig-left').value.trim(),
        signatureLabelRight: container.querySelector('#rcpt-sig-right').value.trim(),
        footerText: container.querySelector('#rcpt-footer').value.trim(),
        showStudentName: container.querySelector('#chk-show-name').checked,
        showFatherName: container.querySelector('#chk-show-father').checked,
        showRollNumber: container.querySelector('#chk-show-roll').checked,
        showContactNumber: container.querySelector('#chk-show-contact').checked,
        showClass: container.querySelector('#chk-show-class').checked,
        showGroup: container.querySelector('#chk-show-group').checked,
        showAcademicYear: container.querySelector('#chk-show-year').checked,
        showFeeMonth: container.querySelector('#chk-show-month').checked,
        showFeeType: container.querySelector('#chk-show-type').checked,
        showExpectedAmount: container.querySelector('#chk-show-expected').checked,
        showPaidAmount: container.querySelector('#chk-show-paid').checked,
        showRemainingBalance: container.querySelector('#chk-show-balance').checked,
        showPaymentMethod: container.querySelector('#chk-show-method').checked,
        showPaymentDate: container.querySelector('#chk-show-date').checked,
        showTransactionRef: container.querySelector('#chk-show-ref').checked,
        showStaffMember: container.querySelector('#chk-show-staff').checked
      };

      const previewDiv = container.querySelector('#receipt-preview-container');
      if (previewDiv) {
        previewDiv.innerHTML = this.buildPreviewHTML(liveTpl);
      }
      return liveTpl;
    };

    // Attach input / change events for live preview updates
    container.querySelectorAll('#receipt-customizer-form input, #receipt-customizer-form textarea, #receipt-customizer-form select').forEach(el => {
      el.addEventListener('input', updatePreview);
      el.addEventListener('change', updatePreview);
    });

    // Save Template
    container.querySelector('#btn-save-receipt-template').onclick = async () => {
      const dataToSave = updatePreview();
      await window.GlobalLoader.wrap(async () => {
        await window.FirebaseService.saveReceiptTemplate(dataToSave);
      }, 'Saving customized receipt template to Cloud Firestore...', 'Ideal Coaching Center');

      window.UIUtils.showToast('success', 'Template Saved', 'Receipt configuration saved successfully across all devices.');
    };

    // Print Preview
    container.querySelector('#btn-print-sample-receipt').onclick = () => {
      const liveTpl = updatePreview();
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt Preview - Ideal Coaching Center</title>
          <style>
            body { margin: 20px; font-family: sans-serif; background: #fff; }
            @media print {
              body { margin: 0; }
              @page { size: ${liveTpl.printLayout === 'thermal' ? '80mm auto' : 'A4'}; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          ${this.buildPreviewHTML(liveTpl)}
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
        </html>
      `;
      const w = window.open('', '_blank');
      w.document.write(printHtml);
      w.document.close();
    };

    // Search & Reprint Receipts Modal
    container.querySelector('#btn-reprint-receipts').onclick = () => {
      this.openReprintModal();
    };
  },

  /**
   * Open Search & Reprint Historical Receipts Modal
   */
  async openReprintModal() {
    const receipts = await window.FirebaseService.getCollection('receipts');
    const tpl = await window.FirebaseService.getReceiptTemplate();

    const content = `
      <div style="padding: 1rem 0;">
        <div style="display: flex; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
          <input type="text" id="reprint-search-input" class="form-control" placeholder="Search by Receipt #, Roll #, Student Name..." style="flex: 1; min-width: 240px;" />
          <select id="reprint-filter-type" class="form-control" style="width: auto;">
            <option value="All">All Types</option>
            <option value="Tuition">Tuition Fee</option>
            <option value="Examination">Examination Fee</option>
            <option value="Refund">Refunds</option>
            <option value="Correction">Corrections</option>
          </select>
        </div>

        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Student</th>
                <th>Class / Group</th>
                <th>Category</th>
                <th>Amount Paid</th>
                <th>Date</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody id="reprint-table-body">
              ${this.buildReceiptRows(receipts)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    window.UIUtils.showModal('Search & Reprint Historical Receipts', content, null, 'modal-lg');

    // Attach search filter
    const modalEl = document.querySelector('.modal-container');
    if (!modalEl) return;

    const input = modalEl.querySelector('#reprint-search-input');
    const select = modalEl.querySelector('#reprint-filter-type');
    const tbody = modalEl.querySelector('#reprint-table-body');

    const filterRows = () => {
      const q = input.value.trim().toLowerCase();
      const type = select.value;
      const filtered = receipts.filter(r => {
        const matchesQ = !q || 
          (r.receiptNumber && r.receiptNumber.toLowerCase().includes(q)) ||
          (r.studentName && r.studentName.toLowerCase().includes(q)) ||
          (r.rollNumber && String(r.rollNumber).toLowerCase().includes(q));

        const matchesType = type === 'All' ||
          (type === 'Tuition' && (!r.feeType || r.feeType.includes('Tuition'))) ||
          (type === 'Examination' && (r.feeType && r.feeType.includes('Examination'))) ||
          (type === 'Refund' && (r.feeType && r.feeType.includes('Refund'))) ||
          (type === 'Correction' && (r.feeType && r.feeType.includes('Correction')));

        return matchesQ && matchesType;
      });

      tbody.innerHTML = this.buildReceiptRows(filtered);
      this.attachReprintRowEvents(modalEl, receipts, tpl);
    };

    input.oninput = filterRows;
    select.onchange = filterRows;
    this.attachReprintRowEvents(modalEl, receipts, tpl);
  },

  buildReceiptRows(receipts) {
    if (receipts.length === 0) {
      return `<tr><td colspan="8" style="text-align: center; color: var(--slate-500); padding: 2rem;">No matching receipts found in archives.</td></tr>`;
    }

    return receipts.map(r => {
      const isRefund = r.feeType && r.feeType.includes('Refund');
      const isCorrection = r.feeType && r.feeType.includes('Correction');
      const badgeClass = isRefund ? 'badge-cancelled' : (isCorrection ? 'badge-warning' : 'badge-paid');
      const badgeText = isRefund ? 'Refund' : (isCorrection ? 'Correction' : 'Original');

      return `
        <tr>
          <td><strong style="color: var(--primary-600);">#${r.receiptNumber}</strong></td>
          <td>
            <strong>${r.studentName || 'Student'}</strong><br />
            <span style="font-size: 0.725rem; color: var(--slate-500);">Roll #${r.rollNumber || 'N/A'}</span>
          </td>
          <td>${r.class || 'N/A'} <span style="font-size: 0.725rem; color: var(--slate-500);">(${r.group || 'General'})</span></td>
          <td><span style="font-size: 0.8rem;">${r.feeType || r.month || 'Tuition'}</span></td>
          <td><strong>Rs. ${(r.paidAmount || 0).toLocaleString()}</strong></td>
          <td><span style="font-size: 0.8rem;">${r.paymentDate || 'N/A'}</span></td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          <td style="text-align: right;">
            <button type="button" class="btn btn-sm btn-secondary btn-reprint-act" data-id="${r.id}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Reprint
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  attachReprintRowEvents(modalEl, receipts, tpl) {
    modalEl.querySelectorAll('.btn-reprint-act').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const rcpt = receipts.find(r => r.id === id);
        if (!rcpt) return;

        const printHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Receipt #${rcpt.receiptNumber} - Ideal Coaching Center</title>
            <style>
              body { margin: 20px; font-family: sans-serif; background: #fff; }
              @media print {
                body { margin: 0; }
                @page { size: ${tpl.printLayout === 'thermal' ? '80mm auto' : 'A4'}; margin: 10mm; }
              }
            </style>
          </head>
          <body>
            ${this.buildPreviewHTML(tpl, rcpt)}
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
          </html>
        `;
        const w = window.open('', '_blank');
        w.document.write(printHtml);
        w.document.close();
      };
    });
  }
};

window.ReceiptCustomizerView = ReceiptCustomizerView;
