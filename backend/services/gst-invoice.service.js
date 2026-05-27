const PDFDocument = require('pdfkit');

// ✅ Simplified GST calculator helper (Fix 6)
const calculateGST = (amount) => {
  const gstRate = 0.18; // 18% flat rate
  const gstAmount = amount * gstRate;
  return {
    baseAmount: amount,
    gst: parseFloat(gstAmount.toFixed(2)),
    total: parseFloat((amount + gstAmount).toFixed(2)),
    note: 'GST @18% flat (consult CA for CGST/SGST/IGST split)'
  };
};

const generateGSTReport = (orgData, subscriptions, period) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // --- BRAND HEADER ---
      // Primary brand gradient simulation (Purple/Teal colors)
      doc.rect(0, 0, 600, 15).fill('#6C63FF');
      
      doc.moveDown(1.5);
      doc.fontSize(24).fillColor('#1F2937').font('Helvetica-Bold').text('SubTrackr', 50, 40);
      doc.fontSize(10).fillColor('#6B7280').font('Helvetica-Oblique').text('Subscription Expense Audit & GST Report', 50, 68);

      // --- METADATA PANEL ---
      doc.moveDown(2);
      const metadataTop = doc.y;
      
      // Left Column: Company Info
      doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold').text('ISSUED TO:', 50, metadataTop);
      doc.fontSize(14).fillColor('#6C63FF').font('Helvetica-Bold').text(orgData.name || 'Acme Corporation', 50, metadataTop + 18);
      doc.fontSize(10).fillColor('#4B5563').font('Helvetica')
        .text(`GSTIN: ${orgData.gstNumber || 'NOT PROVIDED'}`, 50, metadataTop + 36)
        .text(`Admin Email: ${orgData.adminEmail || 'admin@company.com'}`, 50, metadataTop + 50);

      // Right Column: Invoice/Report Info
      doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold').text('REPORT DETAILS:', 340, metadataTop);
      doc.fontSize(10).fillColor('#4B5563').font('Helvetica')
        .text(`Statement Period: ${period || 'This Month'}`, 340, metadataTop + 18)
        .text(`Report Generated: ${new Date().toLocaleDateString('en-IN')}`, 340, metadataTop + 32)
        .text(`Account Plan: Corporate Premium`, 340, metadataTop + 46);

      // Horizontal Divider
      doc.moveTo(50, metadataTop + 75).lineTo(545, metadataTop + 75).strokeColor('#E5E7EB').strokeWidth(1.5).stroke();

      // --- EXPENSE TABLE ---
      doc.moveDown(2.5);
      doc.fontSize(11).fillColor('#1F2937').font('Helvetica-Bold');
      const tableHeaderTop = doc.y;
      
      // Table Header Titles
      doc.text('Subscription', 50, tableHeaderTop);
      doc.text('Base Price', 230, tableHeaderTop, { width: 90, align: 'right' });
      doc.text('GST (18%)', 340, tableHeaderTop, { width: 90, align: 'right' });
      doc.text('Total Expense', 450, tableHeaderTop, { width: 95, align: 'right' });

      // Table Header Underline
      doc.moveTo(50, tableHeaderTop + 16).lineTo(545, tableHeaderTop + 16).strokeColor('#4B5563').strokeWidth(1).stroke();

      // Table Body Rows
      let y = tableHeaderTop + 24;
      let grandBaseTotal = 0;
      let grandGSTTotal = 0;
      let grandExpenseTotal = 0;

      // Filter active subscriptions and process them
      const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');

      if (activeSubscriptions.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor('#9CA3AF').text('No active corporate subscriptions found for this period.', 50, y, { align: 'center' });
        y += 25;
      } else {
        activeSubscriptions.forEach(sub => {
          // Adjust base price to monthly billingCycle
          let amount = parseFloat(sub.amount) || 0;
          if (sub.billingCycle === 'yearly') amount = amount / 12;
          if (sub.billingCycle === 'weekly') amount = amount * 4;

          const gstCalc = calculateGST(amount);
          grandBaseTotal += gstCalc.baseAmount;
          grandGSTTotal += gstCalc.gst;
          grandExpenseTotal += gstCalc.total;

          // Prevent PDF overlap by moving down
          if (y > 700) {
            doc.addPage();
            y = 50; // Reset margin on new page
          }

          doc.font('Helvetica').fontSize(9).fillColor('#374151');
          doc.text(sub.name, 50, y, { width: 170, truncate: true });
          doc.text(`₹${gstCalc.baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 230, y, { width: 90, align: 'right' });
          doc.text(`₹${gstCalc.gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 340, y, { width: 90, align: 'right' });
          doc.text(`₹${gstCalc.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { width: 95, align: 'right' });
          
          y += 22;
        });
      }

      // --- GRAND TOTAL PANEL ---
      if (y > 660) {
        doc.addPage();
        y = 50;
      }

      // Total Top Border
      doc.moveTo(50, y).lineTo(545, y).strokeColor('#E5E7EB').strokeWidth(1).stroke();
      y += 10;

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1F2937');
      doc.text('GRAND TOTALS', 50, y);
      doc.text(`₹${grandBaseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 230, y, { width: 90, align: 'right' });
      doc.text(`₹${grandGSTTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 340, y, { width: 90, align: 'right' });
      doc.text(`₹${grandExpenseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { width: 95, align: 'right' });
      
      y += 30;

      // --- simplified GST Disclaimer Panel (Fix 6) ---
      doc.rect(50, y, 495, 60).fill('#F3F4F6');
      
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#EF4444').text('⚠️ LEGAL DISCLAIMER & GST NOTICE:', 60, y + 8);
      doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(
        'This document compiles an expense summary statement. Base amounts and flat 18% GST have been calculated to provide corporate expenditure visibility. This is not an official tax invoice. Please consult a registered Chartered Accountant (CA) to determine state-wise CGST, SGST, or IGST tax splits for filing actual GSTR-2B input tax credits.',
        60, y + 20, { width: 475, align: 'justify', lineGap: 1.5 }
      );

      // --- FOOTER ---
      doc.moveTo(50, 755).lineTo(545, 755).strokeColor('#E5E7EB').strokeWidth(1).stroke();
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#9CA3AF').text(
        'Generated automatically by SubTrackr B2B Portal — subtrackr.in',
        50, 765, { align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  calculateGST,
  generateGSTReport
};
