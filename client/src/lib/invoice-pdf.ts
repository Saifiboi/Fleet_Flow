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
  const accentColor: [number, number, number] = [251, 146, 60];

  doc.setFillColor(...accentColor);
  doc.rect(marginLeft, 16, usableWidth, 12, "F");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Sale Tax Invoice", marginLeft + usableWidth / 2, 24, { align: "center" });
  doc.setTextColor(0, 0, 0);

  const columnGap = 8;
  const detailsTableWidth = Math.max(usableWidth * 0.58, 110);
  const summaryTableWidth = usableWidth - detailsTableWidth - columnGap;
  const summaryMarginLeft = marginLeft + detailsTableWidth + columnGap;

  const summary = [
    buildSummaryRow("Subtotal", formatCurrency(invoice.subtotal)),
    buildSummaryRow("Adjustment", formatCurrency(invoice.adjustment)),
    buildSummaryRow(`Sales tax (${invoice.salesTaxRate ?? 0}% )`, formatCurrency(invoice.salesTaxAmount)),
    buildSummaryRow("Total", formatCurrency(invoice.total)),
  ];

  const invoiceMeta = [
    ["Invoice #", invoiceNumber],
    ["Date", invoiceDate],
    ["Period", `${invoice.periodStart} — ${invoice.periodEnd}`],
    ["Due date", invoice.dueDate ?? "-"],
  ];

  const infoStartY = 44;
  const billToDetails = [customer?.name, customer?.email].filter(Boolean).join("\n") || "-";
  const billToAddress = customer?.address ?? customer?.companyAddress ?? "-";
  const taxNumber = customer?.taxNumber ?? "-";
  const projectDetails = project?.name ?? "-";
  const contactNumber = customer?.phone ?? "-";

  autoTable(doc, {
    startY: infoStartY,
    theme: "grid",
    head: [["Details", ""]],
    body: [
      ["Bill to", billToDetails],
      ["Project", projectDetails],
      ["Address", billToAddress],
      ["NTN", taxNumber],
      ["Contact No", contactNumber],
    ],
    styles: { fontSize: 10, cellPadding: 4, halign: "left" },
    headStyles: { fontStyle: "bold", fillColor: accentColor, textColor: [255, 255, 255], halign: "left" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: Math.min(36, detailsTableWidth * 0.32) },
      1: { cellWidth: Math.max(detailsTableWidth - Math.min(36, detailsTableWidth * 0.32), 70) },
    },
    tableWidth: detailsTableWidth,
  });

  const infoFinalY = (doc as any).lastAutoTable?.finalY ?? infoStartY;

  autoTable(doc, {
    startY: infoStartY,
    margin: { left: summaryMarginLeft },
    theme: "grid",
    head: [["Invoice", ""]],
    body: invoiceMeta,
    styles: { fontSize: 10, cellPadding: 4, halign: "left" },
    headStyles: { fontStyle: "bold", fillColor: accentColor, textColor: [255, 255, 255], halign: "left" },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: Math.min(40, summaryTableWidth * 0.5) },
      1: { cellWidth: Math.max(summaryTableWidth - Math.min(40, summaryTableWidth * 0.5), 40) },
    },
    tableWidth: summaryTableWidth,
  });

  const metaFinalY = (doc as any).lastAutoTable?.finalY ?? infoStartY;
  const summaryStartY = Math.max(infoFinalY, metaFinalY) + 10;

  autoTable(doc, {
    startY: summaryStartY,
    head: [["SubTotal", "Adjustment", `Sale Tax (${invoice.salesTaxRate ?? 0}% )`, "Total"]],
    body: [summary.map((row) => row.value)],
    styles: { fontSize: 10, cellPadding: 4, halign: "right" },
    headStyles: { fillColor: accentColor, textColor: [0, 0, 0], halign: "center" },
    columnStyles: {
      0: { halign: "right" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
    theme: "grid",
    tableWidth: usableWidth,
    margin: { left: marginLeft },
  });

  const itemsStartY = ((doc as any).lastAutoTable?.finalY ?? summaryStartY) + 12;

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
  const customer = "customer" in invoice ? invoice.customer : undefined;
  const project = "project" in invoice ? invoice.project : undefined;

  const invoiceNumber = invoice.invoiceNumber ?? "Pending";
  const invoiceDate = invoice.createdAt ? new Date(invoice.createdAt).toISOString().split("T")[0] : "-";
  const billToAddress = customer?.address ?? customer?.companyAddress ?? "-";
  const taxNumber = customer?.taxNumber ?? "-";
  const contactNumber = customer?.phone ?? "-";
  const summaryValues = [
    formatCurrency(invoice.subtotal),
    formatCurrency(invoice.adjustment),
    formatCurrency(invoice.salesTaxAmount),
    formatCurrency(invoice.total),
  ];

  const sheetData = [
    ["Sale Tax Invoice"],
    [],
    ["Customer", customer?.name ?? "-", "", "", "Invoice#", invoiceNumber],
    ["Address", billToAddress, "", "", "Date", invoiceDate],
    ["Contact No", contactNumber, "", "", "Period", `${invoice.periodStart} — ${invoice.periodEnd}`],
    ["Project", project?.name ?? "-", "", "", "Due Date", invoice.dueDate ?? "-"],
    ["NTN", taxNumber],
    [],
    ["SubTotal", "Adjustment", `Sale Tax (${invoice.salesTaxRate ?? 0}% )`, "Total"],
    summaryValues,
    [],
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
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);

  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, "Invoice");

  const filename = `${buildInvoiceTitle(invoiceNumber)}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return true;
}
