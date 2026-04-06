import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generateLoanPDF(reportData) {
  const { loan, applicant } = reportData;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("EZLoan", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Loan Application Report", 14, 28);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);

  // Loan ID badge on right
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Loan #${loan.loan_id}`, pageWidth - 14, 22, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Status: ${loan.status}`, pageWidth - 14, 32, { align: "right" });

  y = 50;

  // Loan Summary Table
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Loan Summary", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fontSize: 10, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    head: [["Field", "Value"]],
    body: [
      ["Loan Amount", `Rs ${Number(loan.loan_amount).toLocaleString()}`],
      ["Tenure", `${loan.tenure} months`],
      ["Interest Rate", `${loan.interest_rate}% p.a.`],
      ["Monthly EMI", `Rs ${Number(loan.emi).toFixed(2)}`],
      ["Total Payable", `Rs ${(Number(loan.emi) * loan.tenure).toFixed(2)}`],
      ["Total Interest", `Rs ${(Number(loan.emi) * loan.tenure - loan.loan_amount).toFixed(2)}`],
      ["Status", loan.status],
      ["Applied Date", loan.applied_date ? new Date(loan.applied_date).toLocaleDateString() : "N/A"],
      ["Applicant", loan.user_name || loan.user_email],
    ],
  });

  y = doc.lastAutoTable.finalY + 14;

  // Applicant Details
  if (applicant) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Applicant Details", 14, y);
    y += 6;

    const applicantRows = [
      ["Full Name", applicant.full_name || "N/A"],
      ["Contact Email", applicant.contact_email || "N/A"],
      ["Mobile", applicant.primary_mobile || "N/A"],
      ["Date of Birth", applicant.dob || "N/A"],
      ["Address", applicant.address || "N/A"],
      ["PAN Number", applicant.pan_number || "N/A"],
      ["Monthly Income", applicant.monthly_income ? `Rs ${Number(applicant.monthly_income).toLocaleString()}` : "N/A"],
      ["Employer", applicant.employer_name || "N/A"],
      ["Employment Type", applicant.employment_type || "N/A"],
      ["Loan Purpose", applicant.loan_purpose || "N/A"],
    ];

    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: "bold", fontSize: 10 },
      bodyStyles: { fontSize: 10, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      margin: { left: 14, right: 14 },
      head: [["Field", "Value"]],
      body: applicantRows,
    });

    y = doc.lastAutoTable.finalY + 14;
  }

  // EMI Amortization Schedule (first 12 months)
  if (loan.emi && loan.loan_amount && loan.interest_rate && loan.tenure) {
    const P = Number(loan.loan_amount);
    const r = Number(loan.interest_rate) / 100 / 12;
    const emi = Number(loan.emi);
    const n = Math.min(loan.tenure, 12);

    // Check if we need a new page
    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("EMI Schedule (First 12 Months)", 14, y);
    y += 6;

    const rows = [];
    let balance = P;
    for (let i = 1; i <= n; i++) {
      const interest = balance * r;
      const principal = emi - interest;
      balance = Math.max(0, balance - principal);
      rows.push([
        i,
        `Rs ${emi.toFixed(2)}`,
        `Rs ${principal.toFixed(2)}`,
        `Rs ${interest.toFixed(2)}`,
        `Rs ${balance.toFixed(2)}`,
      ]);
    }

    autoTable(doc, {
      startY: y,
      theme: "grid",
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      margin: { left: 14, right: 14 },
      head: [["Month", "EMI", "Principal", "Interest", "Balance"]],
      body: rows,
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `EZLoan Report | Page ${i} of ${pageCount} | Confidential`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save(`EZLoan_Report_${loan.loan_id}.pdf`);
}
