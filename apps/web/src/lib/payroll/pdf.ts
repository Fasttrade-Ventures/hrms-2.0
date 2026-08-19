export function generatePayslipPdf(data: {
  employeeName: string;
  employeeNumber: string;
  periodLabel: string;
  grossPay: number;
  netPay: number;
  epfEmployee: number;
  epfEmployer: number;
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  pcb: number;
}): Uint8Array {
  let stream = "";

  // 1. Draw Green Header Bar
  stream += "0.05 0.5 0.3 rg\n"; // Dark emerald green fill
  stream += "0 760 595 82 re f\n"; // Green bar at the top

  // 2. Header Text (White)
  stream += "BT\n/F2 16 Tf\n1.0 1.0 1.0 rg\n50 800 Td (FASTTRADE VENTURES) Tj\nET\n";
  stream += "BT\n/F1 9 Tf\n1.0 1.0 1.0 rg\n50 780 Td (Employee Salary Statement - Locked Payroll) Tj\nET\n";
  stream += "BT\n/F2 12 Tf\n1.0 1.0 1.0 rg\n420 790 Td (PAYSLIP) Tj\nET\n";
  stream += `BT\n/F1 10 Tf\n1.0 1.0 1.0 rg\n420 775 Td (${data.periodLabel}) Tj\nET\n`;

  // 3. Section 1: Employee Information
  stream += "0.94 0.97 0.95 rg\n"; // Light mint background
  stream += "50 710 495 20 re f\n"; // Mint banner
  stream += "BT\n/F2 9 Tf\n0.05 0.3 0.2 rg\n60 716 Td (EMPLOYEE DETAILS) Tj\nET\n"; // Dark green text

  // Details text (Dark grey: 0.2 0.2 0.2 rg)
  stream += "0.2 0.2 0.2 rg\n";
  stream += `BT\n/F2 9 Tf\n50 685 Td (Employee Name:) Tj\nET\nBT\n/F1 9 Tf\n150 685 Td (${data.employeeName}) Tj\nET\n`;
  stream += `BT\n/F2 9 Tf\n50 665 Td (Employee ID:) Tj\nET\nBT\n/F1 9 Tf\n150 665 Td (${data.employeeNumber}) Tj\nET\n`;
  stream += `BT\n/F2 9 Tf\n320 685 Td (Statement Period:) Tj\nET\nBT\n/F1 9 Tf\n430 685 Td (${data.periodLabel}) Tj\nET\n`;
  stream += `BT\n/F2 9 Tf\n320 665 Td (Payment Date:) Tj\nET\nBT\n/F1 9 Tf\n430 665 Td (${new Date().toLocaleDateString("en-MY")}) Tj\nET\n`;

  // Horizontal divider
  stream += "0.9 0.9 0.9 RG\n0.5 w\n50 645 m 545 645 l S\n";

  // 4. Section 2: Earnings & Deductions
  stream += "0.94 0.97 0.95 rg\n"; // Light mint banner
  stream += "50 610 495 20 re f\n";
  stream += "BT\n/F2 9 Tf\n0.05 0.3 0.2 rg\n60 616 Td (SALARY & DEDUCTIONS SUMMARY) Tj\nET\n";

  // Table Columns headers
  stream += "BT\n/F2 9 Tf\n0.2 0.2 0.2 rg\n50 580 Td (Earnings) Tj\nET\nBT\n/F2 9 Tf\n230 580 Td (Employee Deductions) Tj\nET\nBT\n/F2 9 Tf\n410 580 Td (Employer Contributions) Tj\nET\n";
  stream += "0.9 0.9 0.9 RG\n0.5 w\n50 572 m 545 572 l S\n"; // Line under headers

  // Table rows (Explicit absolute positioning via separate BT/ET blocks to avoid relative translation issues)
  stream += "0.2 0.2 0.2 rg\n";
  stream += `BT\n/F1 9 Tf\n50 550 Td (Basic Salary) Tj\nET\nBT\n/F1 9 Tf\n140 550 Td (RM ${data.grossPay.toFixed(2)}) Tj\nET\n`;

  stream += `BT\n/F1 9 Tf\n230 550 Td (EPF) Tj\nET\nBT\n/F1 9 Tf\n320 550 Td (RM ${data.epfEmployee.toFixed(2)}) Tj\nET\n`;
  stream += `BT\n/F1 9 Tf\n410 550 Td (EPF) Tj\nET\nBT\n/F1 9 Tf\n500 550 Td (RM ${data.epfEmployer.toFixed(2)}) Tj\nET\n`;

  stream += `BT\n/F1 9 Tf\n230 532 Td (SOCSO) Tj\nET\nBT\n/F1 9 Tf\n320 532 Td (RM ${data.socsoEmployee.toFixed(2)}) Tj\nET\n`;
  stream += `BT\n/F1 9 Tf\n410 532 Td (SOCSO) Tj\nET\nBT\n/F1 9 Tf\n500 532 Td (RM ${data.socsoEmployer.toFixed(2)}) Tj\nET\n`;

  stream += `BT\n/F1 9 Tf\n230 514 Td (EIS) Tj\nET\nBT\n/F1 9 Tf\n320 514 Td (RM ${data.eisEmployee.toFixed(2)}) Tj\nET\n`;
  stream += `BT\n/F1 9 Tf\n410 514 Td (EIS) Tj\nET\nBT\n/F1 9 Tf\n500 514 Td (RM ${data.eisEmployer.toFixed(2)}) Tj\nET\n`;

  stream += `BT\n/F1 9 Tf\n230 496 Td (PCB (Tax)) Tj\nET\nBT\n/F1 9 Tf\n320 496 Td (RM ${data.pcb.toFixed(2)}) Tj\nET\n`;

  // Draw another divider
  stream += "0.9 0.9 0.9 RG\n0.5 w\n50 480 m 545 480 l S\n";

  // Totals
  stream += `BT\n/F2 9 Tf\n0.2 0.2 0.2 rg\n50 455 Td (Gross Pay:) Tj\nET\nBT\n/F2 9 Tf\n0.2 0.2 0.2 rg\n140 455 Td (RM ${data.grossPay.toFixed(2)}) Tj\nET\n`;

  const totalDeductions = data.epfEmployee + data.socsoEmployee + data.eisEmployee + data.pcb;
  stream += `BT\n/F2 9 Tf\n0.2 0.2 0.2 rg\n230 455 Td (Total Deductions:) Tj\nET\nBT\n/F2 9 Tf\n0.2 0.2 0.2 rg\n320 455 Td (RM ${totalDeductions.toFixed(2)}) Tj\nET\n`;

  // Draw Net Pay highlight box
  stream += "0.05 0.5 0.3 rg\n"; // Theme green background
  stream += "50 395 495 36 re f\n"; // Solid green block
  stream += `BT\n/F2 11 Tf\n1.0 1.0 1.0 rg\n70 409 Td (NET PAY RECEIVED:) Tj\nET\n`;
  stream += `BT\n/F2 11 Tf\n1.0 1.0 1.0 rg\n250 409 Td (RM ${data.netPay.toFixed(2)}) Tj\nET\n`;

  // Footer note
  stream += "BT\n/F1 8 Tf\n0.5 0.5 0.5 rg\n50 330 Td (* This is a computer-generated document and does not require a physical signature.) Tj\nET\n";
  stream += "BT\n/F1 8 Tf\n0.5 0.5 0.5 rg\n50 318 Td (Generated securely via HRMS Portal.) Tj\nET\n";

  const catalog = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const pages = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  const page = `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /MediaBox [0 0 595 842] /Contents 4 0 R >>\nendobj\n`;
  
  const streamLength = stream.length;
  const content = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}endstream\nendobj\n`;

  const header = `%PDF-1.4\n`;
  const offset1 = header.length;
  const offset2 = offset1 + catalog.length;
  const offset3 = offset2 + pages.length;
  const offset4 = offset3 + page.length;
  const xrefOffset = offset4 + content.length;

  const xref = `xref\n0 5\n0000000000 65535 f \n${String(offset1).padStart(10, "0")} 00000 n \n${String(offset2).padStart(10, "0")} 00000 n \n${String(offset3).padStart(10, "0")} 00000 n \n${String(offset4).padStart(10, "0")} 00000 n \n`;
  
  const trailer = `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const pdfStr = header + catalog + pages + page + content + xref + trailer;
  
  const buf = new Uint8Array(pdfStr.length);
  for (let i = 0; i < pdfStr.length; i++) {
    buf[i] = pdfStr.charCodeAt(i);
  }
  return buf;
}
