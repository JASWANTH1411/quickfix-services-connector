const PDFDocument = require('pdfkit');

class PDFService {
  static generateInvoicePDF(booking, res) {
    const doc = new PDFDocument({ margin: 50 });

    // Set HTTP Response Headers for PDF Download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice-${booking.booking_code}.pdf`);

    doc.pipe(res);

    // Header
    doc
      .fillColor('#0F172A')
      .fontSize(24)
      .text('QuickFix Home Services', 50, 50)
      .fontSize(10)
      .fillColor('#64748B')
      .text('On-Demand Booking Invoice', 50, 78);

    doc
      .fontSize(10)
      .fillColor('#334155')
      .text(`Invoice Code: ${booking.booking_code}`, 400, 50, { align: 'right' })
      .text(`Date: ${new Date(booking.created_at || Date.now()).toLocaleDateString()}`, 400, 65, { align: 'right' })
      .text(`Status: PAID`, 400, 80, { align: 'right' });

    doc.moveTo(50, 105).lineTo(550, 105).strokeColor('#CBD5E1').stroke();

    // Customer & Worker Info
    doc.fontSize(12).fillColor('#0F172A').text('Customer Details', 50, 120);
    doc.fontSize(10).fillColor('#475569')
      .text(`Name: ${booking.customer_name || 'Customer'}`)
      .text(`Address: ${booking.customer_address || 'Address provided on app'}`);

    doc.fontSize(12).fillColor('#0F172A').text('Worker Details', 320, 120);
    doc.fontSize(10).fillColor('#475569')
      .text(`Worker Name: ${booking.worker_name || 'Assigned Worker'}`)
      .text(`Service: ${booking.service_name || 'Home Repair Service'}`);

    doc.moveTo(50, 185).lineTo(550, 185).strokeColor('#CBD5E1').stroke();

    // Billing Table Header
    let y = 205;
    doc.fontSize(10).fillColor('#0F172A').text('Description', 50, y);
    doc.text('Qty', 300, y);
    doc.text('Amount (INR)', 450, y, { align: 'right' });

    y += 20;
    doc.moveTo(50, y).lineTo(550, y).strokeColor('#E2E8F0').stroke();

    // Items
    y += 10;
    doc.fontSize(10).fillColor('#334155');
    doc.text(booking.service_name || 'Home Service', 50, y);
    doc.text('1', 300, y);
    doc.text(`₹${parseFloat(booking.base_price || 0).toFixed(2)}`, 450, y, { align: 'right' });

    if (parseFloat(booking.discount_amount) > 0) {
      y += 20;
      doc.text('Coupon Discount', 50, y);
      doc.text('-', 300, y);
      doc.text(`-₹${parseFloat(booking.discount_amount).toFixed(2)}`, 450, y, { align: 'right' });
    }

    if (parseFloat(booking.tax_amount) > 0) {
      y += 20;
      doc.text('GST / Taxes (18%)', 50, y);
      doc.text('1', 300, y);
      doc.text(`₹${parseFloat(booking.tax_amount).toFixed(2)}`, 450, y, { align: 'right' });
    }

    y += 25;
    doc.moveTo(50, y).lineTo(550, y).strokeColor('#0F172A').stroke();

    // Total Amount
    y += 15;
    doc.fontSize(14).fillColor('#0F172A').text('Total Paid:', 300, y);
    doc.fontSize(14).fillColor('#2563EB').text(`₹${parseFloat(booking.total_amount || 0).toFixed(2)}`, 450, y, { align: 'right' });

    // Footer
    doc
      .fontSize(9)
      .fillColor('#94A3B8')
      .text('Thank you for choosing QuickFix! For support email support@quickfix.com', 50, 700, { align: 'center', width: 500 });

    doc.end();
  }
}

module.exports = PDFService;
