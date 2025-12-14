import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { CustomerInvoiceWithDetails, CustomerInvoiceWithItems } from "@shared/schema";

const BANK_DETAILS = {
  accountName: "FleetFlow Logistics",
  accountNumber: "1234-567890-12",
  bankName: "National Bank of Pakistan",
  iban: "PK12NBPA0000001234567890",
  swift: "NBPAPKKA",
  branch: "Main Boulevard Branch",
};

const buildSummaryRow = (label: string, value: string) => ({ label, value });

const buildInvoiceTitle = (invoiceNumber: string) => `Invoice-${invoiceNumber.replace(/\s+/g, "-")}`;

export function exportCustomerInvoicePdf(
  invoice: CustomerInvoiceWithItems | CustomerInvoiceWithDetails,
  formatCurrency: (value: number | string | undefined | null) => string,
): boolean {
  const payments = "payments" in invoice ? invoice.payments ?? [] : [];
  const customer = "customer" in invoice ? invoice.customer : undefined;
  const project = "project" in invoice ? invoice.project : undefined;
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const outstanding = Math.max(Number(invoice.total ?? 0) - totalPaid, 0);

  const invoiceNumber = invoice.invoiceNumber ?? "Pending";
  const doc = new jsPDF();
  const marginLeft = 14;
  const lineHeight = 8;
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - marginLeft * 2;
  const gapBetweenTables = 6;

  const minSummaryWidth = 80;
  const minDetailsWidth = 90;
  let summaryTableWidth = 90;
  let detailsTableWidth = usableWidth - summaryTableWidth - gapBetweenTables;

  if (detailsTableWidth < minDetailsWidth) {
    detailsTableWidth = minDetailsWidth;
    summaryTableWidth = Math.max(usableWidth - detailsTableWidth - gapBetweenTables, minSummaryWidth);
  }

  const summaryMarginLeft = marginLeft + detailsTableWidth + gapBetweenTables;

  doc.setFontSize(18);
  doc.text(`Invoice ${invoiceNumber}`, marginLeft, 18);
  doc.setFontSize(11);
  doc.setTextColor("#475569");
  doc.text(`Period: ${invoice.periodStart} — ${invoice.periodEnd}`, marginLeft, 26);
  doc.text(`Status: ${invoice.status}  |  Due: ${invoice.dueDate ?? "-"}`, marginLeft, 26 + lineHeight);

  const summary = [
    buildSummaryRow("Subtotal", formatCurrency(invoice.subtotal)),
    buildSummaryRow("Adjustment", formatCurrency(invoice.adjustment)),
    buildSummaryRow(`Sales tax (${invoice.salesTaxRate ?? 0}% )`, formatCurrency(invoice.salesTaxAmount)),
    buildSummaryRow("Total", formatCurrency(invoice.total)),
    buildSummaryRow("Total paid", formatCurrency(totalPaid)),
    buildSummaryRow("Outstanding", formatCurrency(outstanding)),
  ];

  const infoStartY = 44;
  const billToDetails = [customer?.name, customer?.email].filter(Boolean).join("\n") || "-";
  const projectDetails = project?.name ?? "-";

  autoTable(doc, {
    startY: infoStartY,
    theme: "plain",
    head: [["Details", ""]],
    body: [
      ["Bill to", billToDetails],
      ["Project", projectDetails],
      ["Invoice #", invoiceNumber],
      ["Period", `${invoice.periodStart} — ${invoice.periodEnd}`],
      ["Due date", invoice.dueDate ?? "-"],
      ["Status", invoice.status],
    ],
    styles: { fontSize: 10, cellPadding: 3, halign: "left", lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: Math.min(32, detailsTableWidth * 0.35) },
      1: { cellWidth: Math.max(detailsTableWidth - Math.min(32, detailsTableWidth * 0.35), 58) },
    },
    tableWidth: detailsTableWidth,
  });

  const infoFinalY = (doc as any).lastAutoTable?.finalY ?? infoStartY;

  autoTable(doc, {
    startY: infoStartY,
    margin: { left: summaryMarginLeft },
    head: [["Summary", "Amount"]],
    body: summary.map((row) => [row.label, row.value]),
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [15, 23, 42], halign: "center" },
    columnStyles: {
      0: { halign: "left", cellWidth: Math.max(summaryTableWidth * 0.55, 42) },
      1: { halign: "right", cellWidth: Math.max(summaryTableWidth * 0.45, 36) },
    },
    theme: "striped",
    tableWidth: summaryTableWidth,
  });

  const summaryFinalY = (doc as any).lastAutoTable?.finalY ?? infoStartY;
  const itemsStartY = Math.max(infoFinalY, summaryFinalY) + 12;

  autoTable(doc, {
    startY: itemsStartY,
    head: [
      [
        "Vehicle",
        "Details",
        "Month",
        "Project rate",
        "Present days",
        "MOB",
        "DI MOB",
        "Daily rate",
        "Amount",
        "Sales tax",
        "Total",
      ],
    ],
    body: invoice.items.map((item) => [
      item.vehicle?.licensePlate ?? "-",
      item.vehicle ? `${item.vehicle.make} ${item.vehicle.model}` : "-",
      item.monthLabel ?? `${item.month}/${item.year}`,
      formatCurrency(item.projectRate),
      item.presentDays,
      formatCurrency(item.vehicleMob),
      formatCurrency(item.vehicleDimob),
      formatCurrency(item.dailyRate),
      formatCurrency(item.amount),
      formatCurrency(item.salesTaxAmount),
      formatCurrency(item.totalAmount),
    ]),
    styles: { fontSize: 9, cellPadding: 3, valign: "middle" },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: "center", valign: "middle" },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "left" },
      2: { halign: "left" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
      10: { halign: "right" },
    },
    theme: "grid",
  });

  const detailsStartY = (doc as any).lastAutoTable?.finalY + 12 || itemsStartY + 40;

  doc.setTextColor("#0f172a");
  doc.setFontSize(12);
  doc.text("Payment instructions", marginLeft, detailsStartY);
  doc.setTextColor("#475569");
  doc.setFontSize(10);
  doc.text(
    `Transfer payments to the bank account below and share remittance advice with billing@fleetflow.test.`,
    marginLeft,
    detailsStartY + lineHeight,
    { maxWidth: 180 },
  );

  doc.setTextColor("#0f172a");
  doc.setFontSize(11);
  const bankLines = [
    `Account name: ${BANK_DETAILS.accountName}`,
    `Account number: ${BANK_DETAILS.accountNumber}`,
    `Bank: ${BANK_DETAILS.bankName}`,
    `IBAN: ${BANK_DETAILS.iban}`,
    `SWIFT: ${BANK_DETAILS.swift}`,
    `Branch: ${BANK_DETAILS.branch}`,
  ];

  bankLines.forEach((line, index) => {
    doc.text(line, marginLeft, detailsStartY + lineHeight * (index + 2));
  });

  doc.save(`${buildInvoiceTitle(invoiceNumber)}.pdf`);
  return true;
}

export function exportCustomerInvoiceExcel(
  invoice: CustomerInvoiceWithItems | CustomerInvoiceWithDetails,
  formatCurrency: (value: number | string | undefined | null) => string,
): boolean {
  const payments = "payments" in invoice ? invoice.payments ?? [] : [];
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const outstanding = Math.max(Number(invoice.total ?? 0) - totalPaid, 0);

  const summaryData = [
    ["Field", "Value"],
    ["Invoice number", invoice.invoiceNumber ?? "Pending"],
    ["Period", `${invoice.periodStart} — ${invoice.periodEnd}`],
    ["Status", invoice.status],
    ["Due date", invoice.dueDate ?? "-"],
    ["Subtotal", formatCurrency(invoice.subtotal)],
    ["Adjustment", formatCurrency(invoice.adjustment)],
    [`Sales tax (${invoice.salesTaxRate ?? 0}% )`, formatCurrency(invoice.salesTaxAmount)],
    ["Total", formatCurrency(invoice.total)],
    ["Total paid", formatCurrency(totalPaid)],
    ["Outstanding", formatCurrency(outstanding)],
  ];

  const itemsData = [
    [
      "Vehicle",
      "Details",
      "Month",
      "Project rate",
      "Present days",
      "MOB",
      "DI MOB",
      "Daily rate",
      "Amount",
      "Sales tax",
      "Total",
    ],
    ...invoice.items.map((item) => [
      item.vehicle?.licensePlate ?? "-",
      item.vehicle ? `${item.vehicle.make} ${item.vehicle.model}` : "-",
      item.monthLabel ?? `${item.month}/${item.year}`,
      formatCurrency(item.projectRate),
      item.presentDays,
      formatCurrency(item.vehicleMob),
      formatCurrency(item.vehicleDimob),
      formatCurrency(item.dailyRate),
      formatCurrency(item.amount),
      formatCurrency(item.salesTaxAmount),
      formatCurrency(item.totalAmount),
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, itemsSheet, "Line Items");

  const filename = `${buildInvoiceTitle(invoice.invoiceNumber ?? "Pending")}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return true;
}
