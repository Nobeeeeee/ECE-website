import jsPDF from "jspdf";

/**
 * Generates and downloads a beautifully styled PDF document for StudyNotes.
 * @param {Object} params
 * @param {string} params.subjectName - e.g. "Engineering Physics"
 * @param {string} params.assignedTeacher - e.g. "Dr. A. Sharma" or "Unassigned"
 * @param {Array} params.notesList - Array of selected note items to render in PDF
 */
export function generateNotesPDF({ subjectName, assignedTeacher, notesList }) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // Dark slate (#0f172a)
  doc.rect(0, 0, pageWidth, 42, "F");

  // Accent Top Line
  doc.setFillColor(139, 92, 246); // Accent Purple (#8b5cf6)
  doc.rect(0, 0, pageWidth, 3, "F");

  // Brand Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("StudyNotes Academic Hub", margin, 18);

  // Sub-header Badge
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Subject: ${subjectName.toUpperCase()} | Faculty: ${assignedTeacher || "Unassigned"}`, margin, 26);

  // Date timestamp
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${dateStr}`, margin, 34);

  cursorY = 50;

  // Document Title Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(139, 92, 246);
  doc.text("CURATED STUDY NOTES & EXAMINATION REVISION GUIDE", margin, cursorY);
  cursorY += 8;

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  // Render each note item
  notesList.forEach((note, index) => {
    // Check page overflow
    if (cursorY > pageHeight - 35) {
      doc.addPage();
      cursorY = margin + 10;
    }

    // Note Section Header Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, cursorY, contentWidth, 12, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`${index + 1}. ${note.title}`, margin + 4, cursorY + 8);

    if (note.type) {
      doc.setFontSize(9);
      doc.setTextColor(124, 58, 237);
      doc.text(`[${note.type}]`, pageWidth - margin - 25, cursorY + 8);
    }

    cursorY += 16;

    // Unit Tag if available
    if (note.unit) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Topic / Unit: ${note.unit}`, margin + 2, cursorY);
      cursorY += 6;
    }

    // Description / Key Overview
    if (note.description) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const splitDesc = doc.splitTextToSize(note.description, contentWidth - 4);
      doc.text(splitDesc, margin + 2, cursorY);
      cursorY += splitDesc.length * 5 + 4;
    }

    // Detailed Study Content Sections (Key Concepts, Q&A, Formulas)
    if (note.sections && note.sections.length > 0) {
      note.sections.forEach((sec) => {
        if (cursorY > pageHeight - 30) {
          doc.addPage();
          cursorY = margin + 10;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`• ${sec.heading}:`, margin + 4, cursorY);
        cursorY += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);

        const splitBody = doc.splitTextToSize(sec.body, contentWidth - 10);
        doc.text(splitBody, margin + 8, cursorY);
        cursorY += splitBody.length * 4.5 + 4;
      });
    }

    cursorY += 6;

    // Subtle Section Divider
    if (index < notesList.length - 1) {
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 8;
    }
  });

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `StudyNotes Academic System • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  // Save the PDF
  const sanitizedSubject = subjectName.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = notesList.length === 1
    ? `${sanitizedSubject}_${notesList[0].title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
    : `${sanitizedSubject}_Selected_Notes.pdf`;

  doc.save(fileName);
}
