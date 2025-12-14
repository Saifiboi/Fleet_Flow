import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { CustomerInvoiceWithDetails, CustomerInvoiceWithItems } from "@shared/schema";

const buildSummaryRow = (label: string, value: string) => ({ label, value });

const buildInvoiceTitle = (invoiceNumber: string) => `Invoice-${invoiceNumber.replace(/\s+/g, "-")}`;

const formatAmount = (value: number | string | undefined | null) =>
  (Math.round(Number(value ?? 0) * 100) / 100).toFixed(2);

export function exportCustomerInvoicePdf(
  invoice: CustomerInvoiceWithItems | CustomerInvoiceWithDetails,
  formatCurrency: (value: number | string | undefined | null) => string,
): boolean {
  const customer = "customer" in invoice ? invoice.customer : undefined;
  const project = "project" in invoice ? invoice.project : undefined;

  const invoiceNumber = invoice.invoiceNumber ?? "Pending";
  const invoiceDate = invoice.createdAt
    ? new Date(invoice.createdAt).toISOString().split("T")[0]
    : "-";
  const doc = new jsPDF();
  const marginLeft = 14;
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

  const summary = [
    buildSummaryRow("Subtotal", formatCurrency(invoice.subtotal)),
    buildSummaryRow("Adjustment", formatCurrency(invoice.adjustment)),
    buildSummaryRow(`Sales tax (${invoice.salesTaxRate ?? 0}% )`, formatCurrency(invoice.salesTaxAmount)),
    buildSummaryRow("Total", formatCurrency(invoice.total)),
  ];

  const invoiceMeta = [
    ["Invoice #", invoiceNumber],
    ["Invoice date", invoiceDate],
    ["Period", `${invoice.periodStart} — ${invoice.periodEnd}`],
    ["Due date", invoice.dueDate ?? "-"],
  ];

  const infoStartY = 44;
  const billToDetails = [customer?.name, customer?.email].filter(Boolean).join("\n") || "-";
  const billToAddress = customer?.address ?? customer?.companyAddress ?? "-";
  const taxNumber = customer?.taxNumber ?? "-";
  const projectDetails = project?.name ?? "-";

  autoTable(doc, {
    startY: infoStartY,
    theme: "plain",
    head: [["Details", ""]],
    body: [
      ["Bill to", billToDetails],
      ["Project", projectDetails],
      ["Address", billToAddress],
      ["NTN", taxNumber],
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
  autoTable(doc, {
    startY: summaryFinalY + 6,
    margin: { left: summaryMarginLeft },
    theme: "plain",
    head: [["Invoice", ""]],
    body: invoiceMeta,
    styles: { fontSize: 10, cellPadding: 3, halign: "left", lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: Math.min(40, summaryTableWidth * 0.5) },
      1: { cellWidth: Math.max(summaryTableWidth - Math.min(40, summaryTableWidth * 0.5), 40) },
    },
    tableWidth: summaryTableWidth,
  });

  const metaFinalY = (doc as any).lastAutoTable?.finalY ?? summaryFinalY;
  const itemsStartY = Math.max(infoFinalY, metaFinalY) + 12;

  autoTable(doc, {
    startY: itemsStartY,
    head: [
      [
        "S. No.",
        "Vehicle",
        "Type",
        "Year",
        "Model",
        "Rate",
        "Days",
        "MOB",
        "DI MOB",
        "Amount",
        "Sales tax",
        "Total",
      ],
    ],
    body: invoice.items.map((item, index) => [
      index + 1,
      item.vehicle?.licensePlate ?? "-",
      item.vehicle?.make ?? "-",
      item.vehicle?.year ?? "-",
      item.vehicle?.model ?? "-",
      formatAmount(item.projectRate),
      item.presentDays,
      formatAmount(item.vehicleMob),
      formatAmount(item.vehicleDimob),
      formatAmount(item.amount),
      formatAmount(item.salesTaxAmount),
      formatAmount(item.totalAmount),
    ]),
    styles: { fontSize: 9, cellPadding: 3, valign: "middle" },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: "center", valign: "middle" },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "left" },
      2: { halign: "left" },
      3: { halign: "right" },
      4: { halign: "left" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
      10: { halign: "right" },
      11: { halign: "right" },
    },
    theme: "grid",
  });

  doc.save(`${buildInvoiceTitle(invoiceNumber)}.pdf`);
  return true;
}

export function exportCustomerInvoiceExcel(
  invoice: CustomerInvoiceWithItems | CustomerInvoiceWithDetails,
  formatCurrency: (value: number | string | undefined | null) => string,
): boolean {
  const summaryData = [
    ["Field", "Value"],
    ["Invoice number", invoice.invoiceNumber ?? "Pending"],
    ["Invoice date", invoice.createdAt ? new Date(invoice.createdAt).toISOString().split("T")[0] : "-"],
    ["Period", `${invoice.periodStart} — ${invoice.periodEnd}`],
    ["Due date", invoice.dueDate ?? "-"],
    ["Subtotal", formatCurrency(invoice.subtotal)],
    ["Adjustment", formatCurrency(invoice.adjustment)],
    [`Sales tax (${invoice.salesTaxRate ?? 0}% )`, formatCurrency(invoice.salesTaxAmount)],
    ["Total", formatCurrency(invoice.total)],
  ];

  const itemsData = [
    [
      "S. No.",
      "Vehicle",
      "Type",
      "Year",
      "Model",
      "Rate",
      "Days",
      "MOB",
      "DI MOB",
      "Amount",
      "Sales tax",
      "Total",
    ],
    ...invoice.items.map((item, index) => [
      index + 1,
      item.vehicle?.licensePlate ?? "-",
      item.vehicle?.make ?? "-",
      item.vehicle?.year ?? "-",
      item.vehicle?.model ?? "-",
      formatAmount(item.projectRate),
      item.presentDays,
      formatAmount(item.vehicleMob),
      formatAmount(item.vehicleDimob),
      formatAmount(item.amount),
      formatAmount(item.salesTaxAmount),
      formatAmount(item.totalAmount),
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
