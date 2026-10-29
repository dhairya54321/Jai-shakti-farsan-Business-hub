import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../server/db/index.js';
import VendorService, { validateVendorData } from '../server/services/vendorService.js';
import { parseInvoiceText, fixGstin } from '../server/services/ocrService.js';
import ExpenseService from '../server/services/expenseService.js';

describe('Phase 2: Vendor Management & Bill OCR Tests', () => {
  let db;
  const testBizId = 'biz_jaishakti_001';
  const ownerUser = { id: 'usr_owner_001', username: 'admin', role: 'owner', business_id: testBizId };
  const managerUser = { id: 'usr_manager_001', username: 'manager', role: 'manager', business_id: testBizId };
  const staffUser = { id: 'usr_staff_001', username: 'staff', role: 'staff', business_id: testBizId };

  before(() => {
    db = getDatabase();
    // Clean any test-created records from previous runs while preserving seeded vendors
    db.prepare("DELETE FROM bill_attachments WHERE id LIKE 'bat_%'").run();
    db.prepare("DELETE FROM vendor_bills WHERE id LIKE 'bill_%'").run();
    db.prepare("DELETE FROM expense_payments WHERE expense_id IN (SELECT id FROM expenses WHERE vendor_id NOT IN ('ven_001', 'ven_002', 'ven_003', 'ven_004'))").run();
    db.prepare("DELETE FROM expense_attachments WHERE expense_id IN (SELECT id FROM expenses WHERE vendor_id NOT IN ('ven_001', 'ven_002', 'ven_003', 'ven_004'))").run();
    db.prepare("DELETE FROM expenses WHERE vendor_id NOT IN ('ven_001', 'ven_002', 'ven_003', 'ven_004')").run();
    db.prepare("DELETE FROM vendors WHERE id NOT IN ('ven_001', 'ven_002', 'ven_003', 'ven_004')").run();
  });

  test('1. Field validation for vendor creation (required and format checks)', () => {
    // Missing name
    const errs1 = validateVendorData({ name: '', category: 'raw_materials' });
    assert.ok(errs1.some(e => e.includes('Vendor name is required')));

    // Missing category
    const errs2 = validateVendorData({ name: 'Shree Ram Traders', category: '' });
    assert.ok(errs2.some(e => e.includes('Vendor category is required')));

    // Invalid phone
    const errs3 = validateVendorData({ name: 'Test', category: 'raw_materials', phone: '12345' });
    assert.ok(errs3.some(e => e.includes('10-digit Indian mobile number')));

    // Invalid PIN code
    const errs4 = validateVendorData({ name: 'Test', category: 'raw_materials', pin_code: '360' });
    assert.ok(errs4.some(e => e.includes('6-digit postal code')));

    // Invalid GSTIN format
    const errs5 = validateVendorData({ name: 'Test', category: 'raw_materials', gstin: 'INVALID_GST' });
    assert.ok(errs5.some(e => e.includes('Invalid GSTIN format')));
  });

  test('2. Add a vendor manually with sensible defaults (Gujarat state)', () => {
    const vendor = VendorService.createVendor(ownerUser, {
      name: 'Radhe Spices & Masala',
      category: 'raw_materials',
      phone: '9825199999',
      city: 'Gondal',
      state: 'Gujarat',
      pin_code: '360311',
      gstin: '24AAACR9999F1Z9',
      payment_terms: '15_days',
      notes: 'Haldi and Chilli powder supplier'
    });

    assert.ok(vendor.id.startsWith('ven_'));
    assert.equal(vendor.name, 'Radhe Spices & Masala');
    assert.equal(vendor.state, 'Gujarat');
    assert.equal(vendor.gstin, '24AAACR9999F1Z9');
    assert.equal(vendor.pan, 'AAACR9999F'); // Auto-extracted PAN
    assert.equal(vendor.payment_terms, '15_days');
    assert.equal(vendor.is_active, 1);
  });

  test('3. Detect duplicate vendors by GSTIN, Phone, Email, and Name', () => {
    // Attempt to create duplicate by GSTIN
    assert.throws(() => {
      VendorService.createVendor(ownerUser, {
        name: 'Radhe Masala New Branch',
        category: 'raw_materials',
        gstin: '24AAACR9999F1Z9' // Same GSTIN as Radhe Spices
      });
    }, (err) => {
      assert.equal(err.code, 'DUPLICATE_VENDOR');
      assert.ok(err.duplicates.length > 0);
      assert.ok(err.duplicates[0].matchedFields.includes('gstin'));
      return true;
    });

    // Attempt to create duplicate by Phone
    assert.throws(() => {
      VendorService.createVendor(ownerUser, {
        name: 'Another Vendor',
        category: 'services',
        phone: '9825199999' // Same phone as Radhe Spices
      });
    }, (err) => {
      assert.equal(err.code, 'DUPLICATE_VENDOR');
      assert.ok(err.duplicates[0].matchedFields.includes('phone'));
      return true;
    });

    // Check duplicate detection service directly
    const check = VendorService.checkDuplicates(testBizId, {
      name: 'Shree Krishna Oil Mill' // Seeded vendor
    });
    assert.equal(check.isDuplicate, true);
    assert.ok(check.matches.some(m => m.matchedFields.includes('name')));
  });

  test('4. Authorized override creates vendor when duplicate is justified', () => {
    const bypassed = VendorService.createVendor(ownerUser, {
      name: 'Radhe Spices Branch 2',
      category: 'raw_materials',
      phone: '9825199999' // duplicate phone
    }, { allowDuplicate: true, reason: 'Separate billing branch authorized' });

    assert.ok(bypassed.id);
    assert.equal(bypassed.name, 'Radhe Spices Branch 2');
  });

  test('5. View and search all vendors with category and keyword filters', () => {
    const listAll = VendorService.listVendors(testBizId, {});
    assert.ok(listAll.vendors.length >= 4);

    // Search by GSTIN
    const searchGstin = VendorService.listVendors(testBizId, { search: '24AAACR1234F1Z1' });
    assert.equal(searchGstin.vendors.length, 1);
    assert.ok(searchGstin.vendors[0].name.includes('Shree Krishna Oil'));

    // Search by city
    const searchCity = VendorService.listVendors(testBizId, { search: 'Gondal' });
    assert.ok(searchCity.vendors.length >= 1);

    // Filter by category
    const searchCat = VendorService.listVendors(testBizId, { category: 'raw_materials' });
    assert.ok(searchCat.vendors.length >= 1);

    // Verify main title category matching ignoring brackets (e.g. Raw Materials (potatoes), Finished Goods (Khakhra))
    VendorService.createVendor(ownerUser, {
      name: 'Popatlal Potato Merchant',
      category: 'Raw Materials (potatoes)',
      phone: '9825000001',
      city: 'Ahmedabad'
    });

    VendorService.createVendor(ownerUser, {
      name: 'Ranna Khakhra Maker',
      category: 'Finished Goods (Khakhra)',
      phone: '9825000002',
      city: 'Vadodara'
    });

    const rawMatch = VendorService.listVendors(testBizId, { category: 'raw_materials' });
    assert.ok(rawMatch.vendors.some(v => v.name === 'Popatlal Potato Merchant'));
    assert.ok(!rawMatch.vendors.some(v => v.name === 'Ranna Khakhra Maker'));

    const finishedMatch = VendorService.listVendors(testBizId, { category: 'finished_goods' });
    assert.ok(finishedMatch.vendors.some(v => v.name === 'Ranna Khakhra Maker'));
    assert.ok(!finishedMatch.vendors.some(v => v.name === 'Popatlal Potato Merchant'));

    const titleMatch = VendorService.listVendors(testBizId, { category: 'Raw Materials' });
    assert.ok(titleMatch.vendors.some(v => v.name === 'Popatlal Potato Merchant'));
  });

  test('6. Open vendor detail profile and retrieve complete associated data', () => {
    const oilVendor = VendorService.listVendors(testBizId, { search: 'Krishna' }).vendors[0];
    assert.ok(oilVendor);

    const profile = VendorService.getVendorById(testBizId, oilVendor.id);
    assert.equal(profile.vendor.id, oilVendor.id);
    assert.ok(Array.isArray(profile.bills));
    assert.ok(Array.isArray(profile.expenses));
    assert.ok(profile.summary);
    assert.equal(typeof profile.summary.totalBilled, 'number');
    assert.equal(typeof profile.summary.totalExpenses, 'number');
  });

  test('7. Edit vendor details with dirty field tracking and audit trail', () => {
    const oilVendor = VendorService.listVendors(testBizId, { search: 'Krishna' }).vendors[0];

    const updated = VendorService.updateVendor(managerUser, oilVendor.id, {
      contact_person: 'Govindbhai Patel',
      credit_limit: 100000,
      payment_terms: '30_days',
      notes: 'Primary groundnut oil supplier for farsan frying'
    });

    assert.equal(updated.contact_person, 'Govindbhai Patel');
    assert.equal(updated.credit_limit, 100000);
    assert.equal(updated.payment_terms, '30_days');

    // Verify audit log was recorded
    const logs = db.prepare(`
      SELECT * FROM audit_logs
      WHERE entity_type = 'vendor' AND entity_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(oilVendor.id);

    assert.ok(logs);
    assert.equal(logs.actor_user_id, managerUser.id);
    assert.equal(logs.action, 'update');
  });

  test('8. OCR text parsing extracts invoice fields accurately', () => {
    const invoiceSample = `
      TAX INVOICE
      Gujarat Packaging Solution
      Plot 104, Metoda GIDC, Kalawad Road, Rajkot 360021
      Phone: +91 98252 88888
      Email: info@gujaratpackaging.in
      GSTIN: 24AABCG1234D1Z8

      Invoice No: GPS/2026/1042
      Date: 12/10/2026
      Due Date: 27/10/2026
      Order No: PO-8921

      Item: 500g Farsan Printed Pouches x 5000 pcs
      Taxable Amount: 18500.00
      CGST @ 9%: 1665.00
      SGST @ 9%: 1665.00
      Discount: 500.00
      Total Amount: 21330.00
    `;

    const { extracted, confidence } = parseInvoiceText(invoiceSample);

    assert.equal(extracted.vendorName, 'Gujarat Packaging Solution');
    assert.equal(extracted.gstin, '24AABCG1234D1Z8');
    assert.equal(extracted.pan, 'AABCG1234D');
    assert.equal(extracted.phone, '9825288888');
    assert.equal(extracted.email, 'info@gujaratpackaging.in');
    assert.equal(extracted.city, 'Rajkot');
    assert.equal(extracted.state, 'Gujarat');
    assert.equal(extracted.pinCode, '360021');
    assert.equal(extracted.invoiceNumber, 'GPS/2026/1042');
    assert.equal(extracted.invoiceDate, '2026-10-12');
    assert.equal(extracted.dueDate, '2026-10-27');
    assert.equal(extracted.poNumber, 'PO-8921');
    assert.equal(extracted.taxableAmount, 18500);
    assert.equal(extracted.cgst, 1665);
    assert.equal(extracted.sgst, 1665);
    assert.equal(extracted.discount, 500);
    assert.equal(extracted.totalAmount, 21330);

    assert.equal(confidence.vendorName, 'extracted');
    assert.equal(confidence.gstin, 'extracted');
    assert.equal(confidence.invoiceNumber, 'extracted');
    assert.equal(confidence.totalAmount, 'extracted');
  });

  test('9. Save bill associated with vendor and verify persistence', () => {
    const oilVendor = VendorService.listVendors(testBizId, { search: 'Krishna' }).vendors[0];

    const bill = VendorService.saveBill(ownerUser, {
      vendor_id: oilVendor.id,
      bill_number: 'INV-OIL-2026-001',
      bill_date: '2026-10-14',
      due_date: '2026-10-28',
      taxable_amount: 28000,
      cgst: 700,
      sgst: 700,
      total_amount: 29400,
      paid_amount: 10000,
      notes: '20 tins cottonseed oil delivered'
    }, {
      filename: 'sample_bill_1.jpg',
      originalname: 'bill_receipt.jpg',
      mimetype: 'image/jpeg',
      size: 102400
    });

    assert.ok(bill.id.startsWith('bill_'));
    assert.equal(bill.vendor_id, oilVendor.id);
    assert.equal(bill.total_amount, 29400);
    assert.equal(bill.paid_amount, 10000);
    assert.equal(bill.payment_status, 'partially_paid');

    // Verify attachment record in database
    const attachment = db.prepare('SELECT * FROM bill_attachments WHERE bill_id = ?').get(bill.id);
    assert.ok(attachment);
    assert.equal(attachment.original_filename, 'bill_receipt.jpg');
    assert.equal(attachment.content_type, 'image/jpeg');

    // Verify vendor profile summary updates correctly
    const profile = VendorService.getVendorById(testBizId, oilVendor.id);
    assert.equal(profile.summary.billsCount, 1);
    assert.equal(profile.summary.totalBilled, 29400);
    assert.equal(profile.summary.totalBillPaid, 10000);
  });

  test('10. Link bill with Daily Expenses without duplicating expenses or balances', () => {
    const oilVendor = VendorService.listVendors(testBizId, { search: 'Krishna' }).vendors[0];

    // Create an existing expense in Daily Expenses
    const expense = ExpenseService.createExpense(ownerUser, {
      category_id: 'cat_raw_materials',
      amount: 5000,
      payment_method: 'bank_transfer',
      payment_status: 'paid',
      transaction_date: '2026-10-15',
      vendor_id: oilVendor.id,
      description: 'Advance payment for oil supply'
    });

    // Save a bill explicitly referencing the existing expense
    const bill = VendorService.saveBill(ownerUser, {
      vendor_id: oilVendor.id,
      expense_id: expense.id,
      bill_number: 'INV-OIL-2026-002',
      bill_date: '2026-10-15',
      total_amount: 5000,
      paid_amount: 5000
    });

    assert.equal(bill.expense_id, expense.id);

    // Profile reflects both records clearly linked
    const profile = VendorService.getVendorById(testBizId, oilVendor.id);
    assert.ok(profile.bills.some(b => b.id === bill.id && b.expense_id === expense.id));
    assert.ok(profile.expenses.some(e => e.id === expense.id));
  });

  test('11. Handle unreadable or incomplete bills gracefully without losing data', () => {
    const unreadableText = "--- blurred and smudged receipt image ---";
    const { extracted, confidence } = parseInvoiceText(unreadableText);

    // Missing fields marked clearly
    assert.equal(extracted.vendorName, '');
    assert.equal(extracted.gstin, '');
    assert.equal(extracted.totalAmount, null);
    assert.equal(confidence.gstin, 'missing');
    assert.equal(confidence.totalAmount, 'missing');

    // System does NOT auto-create a vendor from unreadable text
    assert.throws(() => {
      VendorService.createVendor(ownerUser, extracted);
    }, (err) => {
      assert.ok(err.message.includes('Vendor name is required'));
      return true;
    });
  });

  test('12. End-to-end OCR processing of real bill file on disk', async () => {
    const fs = await import('fs');
    const { processBillFile } = await import('../server/services/ocrService.js');
    const pdfPath = 'uploads/test_real_bill.pdf';
    const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 260 >> stream
BT
/F1 12 Tf
70 700 Td
(TAX INVOICE) Tj
0 -20 Td
(Shree Krishna Besan Mills) Tj
0 -20 Td
(Grain Market Gondal 360311 Gujarat) Tj
0 -20 Td
(Phone: 9825123456) Tj
0 -20 Td
(GSTIN: 24AABCG5678H1Z2) Tj
0 -20 Td
(Invoice No: INV-BESAN-88) Tj
0 -20 Td
(Date: 16/10/2026) Tj
0 -20 Td
(Total Amount: 18000.00) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000556 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
633
%%EOF`;

    fs.writeFileSync(pdfPath, pdfContent);
    try {
      const ocrResult = await processBillFile(pdfPath, 'application/pdf');
      assert.equal(ocrResult.ocrStatus, 'completed');
      assert.equal(ocrResult.extracted.vendorName, 'Shree Krishna Besan Mills');
      assert.equal(ocrResult.extracted.gstin, '24AABCG5678H1Z2');
      assert.equal(ocrResult.extracted.totalAmount, 18000);
      assert.equal(ocrResult.extracted.invoiceDate, '2026-10-16');
      assert.equal(ocrResult.extracted.invoiceNumber, 'INV-BESAN-88');
    } finally {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    }
  });

  test('13. Multi-orientation OCR and Indian GSTIN error correction', () => {
    // Test GSTIN OCR error correction (S->5, 2a->24, O->0)
    const fixed = fixGstin('2aaPEPKS151P2ZM');
    assert.equal(fixed, '24APEPK5151P2ZM');

    // Test invoice text with Seller vs Buyer separation
    const sampleSidewaysOcr = `
      NN £ Tax Invoice
      NN 'SATGURUKRUPA SALES (26-27) TU [inves Ne.
      SN | Ro8 HATHIKHANA MARKET, FATERURA
      VADODARA
      NN [SETINUIN. 2aaPEPKS151P2ZM
      State Name : Gujarat, Code : 24
      E-Mail : sgksales01@gmail.com
      Buyer (Bill to)
      JAY SHAKTI FARSAN (RAOPURA)
      9426583787-9427839982
      GSTINUIN: 24AGPPR0859M1ZX
      1 KOPRA SALI 5% 08011100 10.00 KG 245.00 233.33 KG 2,333.30
      CGST 58.33
      SGST 58.33
      ROUND OFF 0.04
      Total Amount: 2450.00
    `;

    const { extracted, confidence } = parseInvoiceText(sampleSidewaysOcr);
    assert.equal(extracted.vendorName, 'SATGURUKRUPA SALES (26-27)');
    assert.equal(extracted.gstin, '24APEPK5151P2ZM');
    assert.equal(extracted.pan, 'APEPK5151P');
    assert.equal(extracted.city, 'Vadodara');
    assert.equal(extracted.email, 'sgksales01@gmail.com');
    assert.equal(extracted.state, 'Gujarat');
    assert.equal(extracted.taxableAmount, 2333.30);
    assert.equal(extracted.totalAmount, 2450.00);
    assert.equal(confidence.vendorName, 'extracted');
    assert.equal(confidence.gstin, 'extracted');
    assert.equal(confidence.totalAmount, 'extracted');
  });

  test('14. checkBillDuplicate detects duplicate bill by bill_number and vendor', () => {
    // ven_001 is Rani Oil Traders in test database
    const bill = VendorService.saveBill(ownerUser, {
      vendor_id: 'ven_001',
      bill_number: 'RANI-9901',
      bill_date: '2026-10-25',
      total_amount: 15400,
      paid_amount: 15400
    });
    assert.ok(bill.id);

    // Now test duplicate detection with same bill number & vendor
    const dupe = ExpenseService.checkBillDuplicate(testBizId, {
      vendor_id: 'ven_001',
      bill_number: 'RANI-9901',
      total_amount: 15400
    });

    assert.equal(dupe.isDuplicate, true);
    assert.equal(dupe.matchType, 'invoice_number');
    assert.equal(dupe.duplicate.bill_number, 'RANI-9901');
    assert.ok(dupe.message.includes('ડબલ એન્ટ્રી પ્રતિબંધિત છે'));
  });

  test('15. checkBillDuplicate detects duplicate bill by vendor, date and amount', () => {
    // Unnumbered challan with vendor, date, amount
    const dupe = ExpenseService.checkBillDuplicate(testBizId, {
      vendor_id: 'ven_001',
      bill_date: '2026-10-25',
      total_amount: 15400
    });

    assert.equal(dupe.isDuplicate, true);
    assert.equal(dupe.matchType, 'vendor_date_amount');
    assert.equal(dupe.duplicate.total_amount, 15400);
    assert.ok(dupe.message.includes('પહેલેથી જ ચોપડે નોંધાયેલ છે'));
  });
});
