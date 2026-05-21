import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { estimate_id } = body;

    if (!estimate_id) {
      return Response.json({ error: 'Missing estimate_id' }, { status: 400 });
    }

    // Get user company
    const userProfiles = await base44.asServiceRole.entities.UserProfile.filter({
      user_id: user.id,
      is_deleted: false,
    });
    const userCompanyId = userProfiles[0]?.company_id;

    // Get estimate
    const estimates = await base44.asServiceRole.entities.Estimate.filter({
      id: estimate_id,
      company_id: userCompanyId,
    });
    
    if (!estimates || estimates.length === 0) {
      return Response.json({ error: 'Estimate not found' }, { status: 404 });
    }

    const estimate = estimates[0];
    const company = await base44.asServiceRole.entities.Company.filter({
      id: userCompanyId,
    });
    const companyData = company && company.length > 0 ? company[0] : {};

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Header
    doc.setFontSize(24);
    doc.text('ESTIMATE', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`#${estimate.estimate_number}`, margin, yPosition);
    yPosition += 5;

    if (companyData.name) {
      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.text(companyData.name, margin, yPosition);
      yPosition += 5;
    }

    if (companyData.phone) {
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(companyData.phone, margin, yPosition);
      yPosition += 4;
    }

    if (companyData.address_line_1) {
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(companyData.address_line_1, margin, yPosition);
      yPosition += 3;
    }

    yPosition += 5;

    // Customer Info
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('Bill To:', margin, yPosition);
    yPosition += 5;

    doc.setFontSize(9);
    if (estimate.customer_name) doc.text(estimate.customer_name, margin, yPosition), yPosition += 4;
    if (estimate.property_address) doc.text(estimate.property_address, margin, yPosition), yPosition += 4;
    if (estimate.phone) doc.text(estimate.phone, margin, yPosition), yPosition += 4;
    if (estimate.email) doc.text(estimate.email, margin, yPosition), yPosition += 4;

    yPosition += 3;

    // Service Type
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Service: ${estimate.service_type.replace(/_/g, ' ').toUpperCase()}`, margin, yPosition);
    yPosition += 5;

    // Line Items Table
    const tableTop = yPosition;
    const col1 = margin;
    const col2 = margin + 60;
    const col3 = margin + 90;
    const col4 = margin + 110;
    const col5 = pageWidth - margin - 20;

    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');

    doc.text('Description', col1, tableTop);
    doc.text('Unit', col3, tableTop);
    doc.text('Qty', col4, tableTop);
    doc.text('Price', col5, tableTop, { align: 'right' });

    doc.setFont(undefined, 'normal');
    doc.setTextColor(80);

    let itemTop = tableTop + 5;
    estimate.line_items.forEach((item) => {
      // Check if we need a new page
      if (itemTop > pageHeight - 40) {
        doc.addPage();
        itemTop = margin;
      }

      doc.setFontSize(8);
      doc.setTextColor(60);

      // Wrap description
      const desc = item.description || '';
      const maxWidth = 50;
      const lines = doc.splitTextToSize(desc, maxWidth);
      doc.text(lines, col1, itemTop);

      const lineHeight = lines.length * 3;
      doc.text(item.unit || '', col3, itemTop);
      doc.text(item.quantity?.toString() || '0', col4, itemTop);
      doc.text(`$${(item.total || 0).toFixed(2)}`, col5, itemTop, { align: 'right' });

      itemTop += Math.max(lineHeight, 4);
    });

    yPosition = itemTop + 5;

    // Totals Section
    const totalsX = col4;
    doc.setFontSize(9);
    doc.setTextColor(0);

    yPosition += 3;
    doc.line(totalsX, yPosition, pageWidth - margin, yPosition);
    yPosition += 3;

    doc.text('Subtotal:', totalsX, yPosition);
    doc.text(`$${estimate.subtotal.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 5;

    doc.text('Tax:', totalsX, yPosition);
    doc.text(`$${estimate.tax.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 5;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.line(totalsX, yPosition - 2, pageWidth - margin, yPosition - 2);
    doc.text('Total:', totalsX, yPosition);
    doc.text(`$${estimate.total.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });

    // Notes
    if (estimate.notes) {
      yPosition += 10;
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.setFont(undefined, 'bold');
      doc.text('Notes:', margin, yPosition);
      yPosition += 4;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80);
      const noteLines = doc.splitTextToSize(estimate.notes, pageWidth - 2 * margin);
      doc.text(noteLines, margin, yPosition);
    }

    // Generate PDF
    const pdfBytes = doc.output('arraybuffer');

    // Upload to storage
    const fileName = `estimate-${estimate.estimate_number}.pdf`;
    const uploadRes = await base44.integrations.Core.UploadFile({
      file: pdfBytes,
    });

    return Response.json({
      file_url: uploadRes.file_url,
      estimate_number: estimate.estimate_number,
    });
  } catch (error) {
    console.error('PDF Export Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});