const PDFDocument = require('pdfkit');
const { getTaxByCountry } = require('./tax.service');

// Map currencies to symbols dynamically
const currencySymbols = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  AED: 'د.إ',
  JPY: '¥',
  CHF: 'Fr',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  NZD: 'NZ$',
  BRL: 'R$'
};

const calculateTax = (amount, countryCode) => {
  const taxInfo = getTaxByCountry(countryCode);
  const taxAmount = amount * taxInfo.rate;
  return {
    baseAmount: amount,
    tax: parseFloat(taxAmount.toFixed(2)),
    total: parseFloat((amount + taxAmount).toFixed(2)),
    name: taxInfo.name,
    label: taxInfo.label,
    note: taxInfo.note || `${taxInfo.name} @${(taxInfo.rate * 100).toFixed(2)}% flat`
  };
};

const generateGSTReport = (orgData, subscriptions, period, user = {}) => {
  return new Promise((resolve, reject) => {
    try {
      // Log the subscriptions array before PDF generation to debug
      console.log("Subscriptions array passed to generateGSTReport:", subscriptions);

      if (!subscriptions || subscriptions.length === 0) {
        return reject(new Error("Could not compile report PDF. Verify you have active logged subscriptions."));
      }

      // Verify getTaxByCountry doesn't crash when country is undefined — add fallback
      const country = (orgData && orgData.country) || user.country || 'IN';

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const taxInfo = getTaxByCountry(country);
      const currency = (orgData && orgData.currency) || 'INR';
      const symbol = currencySymbols[currency] || '₹';
      const isIndia = country.toUpperCase() === 'IN';
      const isUS = country.toUpperCase() === 'US';

      // --- BRAND HEADER ---
      // Primary brand gradient simulation (Purple/Teal colors)
      doc.rect(0, 0, 600, 15).fill('#6C63FF');
      
      doc.moveDown(1.5);
      doc.fontSize(24).fillColor('#1F2937').font('Helvetica-Bold').text('Trackovo', 50, 40);
      
      const titleLabel = isIndia ? 'Subscription Expense Audit & GST Report' : `Subscription Expense Audit & Tax Statement`;
      doc.fontSize(10).fillColor('#6B7280').font('Helvetica-Oblique').text(titleLabel, 50, 68);

      // --- METADATA PANEL ---
      doc.moveDown(2);
      const metadataTop = doc.y;
      
      // Left Column: Company Info
      doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold').text('ISSUED TO:', 50, metadataTop);
      doc.fontSize(14).fillColor('#6C63FF').font('Helvetica-Bold').text(orgData.name || 'Acme Corporation', 50, metadataTop + 18);
      
      const identifierLabel = isIndia ? `GSTIN: ${orgData.gstNumber || 'NOT PROVIDED'}` : `Tax Reference: ${orgData.gstNumber || 'NOT PROVIDED'}`;
      doc.fontSize(10).fillColor('#4B5563').font('Helvetica')
        .text(identifierLabel, 50, metadataTop + 36)
        .text(`Admin Email: ${orgData.adminEmail || 'admin@company.com'}`, 50, metadataTop + 50);

      // Right Column: Invoice/Report Info
      const reportHeader = isIndia ? 'GST REPORT DETAILS:' : 'STATEMENT DETAILS:';
      doc.fontSize(12).fillColor('#1F2937').font('Helvetica-Bold').text(reportHeader, 340, metadataTop);
      doc.fontSize(10).fillColor('#4B5563').font('Helvetica')
        .text(`Statement Period: ${period || 'This Month'}`, 340, metadataTop + 18)
        .text(`Report Generated: ${new Date().toLocaleDateString('en-US')}`, 340, metadataTop + 32)
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
      doc.text(taxInfo.name, 340, tableHeaderTop, { width: 90, align: 'right' });
      doc.text('Total Expense', 450, tableHeaderTop, { width: 95, align: 'right' });

      // Table Header Underline
      doc.moveTo(50, tableHeaderTop + 16).lineTo(545, tableHeaderTop + 16).strokeColor('#4B5563').strokeWidth(1).stroke();

      // Table Body Rows
      let y = tableHeaderTop + 24;
      let grandBaseTotal = 0;
      let grandTaxTotal = 0;
      let grandExpenseTotal = 0;

      // Filter active subscriptions and process them
      const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active' || sub.status === 'Active');

      if (activeSubscriptions.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor('#9CA3AF').text('No active corporate subscriptions found for this period.', 50, y, { align: 'center' });
        y += 25;
      } else {
        activeSubscriptions.forEach(sub => {
          // Adjust base price to monthly billingCycle
          let amount = parseFloat(sub.amount) || 0;
          const billingCycle = (sub.billingCycle || 'monthly').toLowerCase();
          if (billingCycle === 'yearly') amount = amount / 12;
          if (billingCycle === 'weekly') amount = amount * 4;

          const taxCalc = calculateTax(amount, country);
          grandBaseTotal += taxCalc.baseAmount;
          grandTaxTotal += taxCalc.tax;
          grandExpenseTotal += taxCalc.total;

          // Prevent PDF overlap by moving down
          if (y > 700) {
            doc.addPage();
            y = 50; // Reset margin on new page
          }

          doc.font('Helvetica').fontSize(9).fillColor('#374151');
          doc.text(sub.name, 50, y, { width: 170, truncate: true });
          
          doc.text(`${symbol}${taxCalc.baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 230, y, { width: 90, align: 'right' });
          doc.text(`${symbol}${taxCalc.tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 340, y, { width: 90, align: 'right' });
          doc.text(`${symbol}${taxCalc.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { width: 95, align: 'right' });
          
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
      doc.text(`${symbol}${grandBaseTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 230, y, { width: 90, align: 'right' });
      doc.text(`${symbol}${grandTaxTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 340, y, { width: 90, align: 'right' });
      doc.text(`${symbol}${grandExpenseTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, y, { width: 95, align: 'right' });
      
      y += 30;

      // --- Disclaimer Panel ---
      doc.rect(50, y, 495, 60).fill('#F3F4F6');
      
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#EF4444').text(`⚠️ LEGAL DISCLAIMER & ${taxInfo.name.toUpperCase()} NOTICE:`, 60, y + 8);
      
      let disclaimerText = `This document compiles an expense summary statement. Base amounts and flat ${taxInfo.label} calculations have been formulated to provide corporate expenditure visibility. This is not an official tax invoice.`;
      
      if (isIndia) {
        disclaimerText += ' Please consult a registered Chartered Accountant (CA) to determine state-wise CGST, SGST, or IGST tax splits for filing actual GSTR-2B input tax credits.';
      } else if (isUS) {
        disclaimerText += ' SaaS subscriptions are generally exempt from state and local sales taxes in many jurisdictions within the US. Consult your tax advisor for state-specific exemption rules and rates.';
      } else {
        disclaimerText += ` Please consult a local tax professional or CPA to verify applicability, local filings, and input credits for ${taxInfo.name}.`;
      }

      if (taxInfo.note) {
        disclaimerText += ` Note: ${taxInfo.note}`;
      }

      doc.font('Helvetica').fontSize(8).fillColor('#4B5563').text(
        disclaimerText,
        60, y + 20, { width: 475, align: 'justify', lineGap: 1.5 }
      );

      // --- FOOTER ---
      doc.moveTo(50, 755).lineTo(545, 755).strokeColor('#E5E7EB').strokeWidth(1).stroke();
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#9CA3AF').text(
        'Generated automatically by Trackovo B2B Portal — trackovo.onrender.com',
        50, 765, { align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  calculateTax,
  generateGSTReport
};
