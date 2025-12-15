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

  const drawSectionHeader = (label: string, x: number, y: number, width: number) => {
    doc.setFillColor(...accentColor);
    doc.rect(x, y, width, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(label, x + 4, y + 5.5);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    return y + 12;
  };

  const drawField = (
    label: string,
    value: string,
    x: number,
    y: number,
    labelWidth: number,
    availableWidth: number,
  ) => {
    doc.setFont(undefined, "bold");
    doc.text(`${label}:`, x, y, { baseline: "top" });
    doc.setFont(undefined, "normal");
    const valueX = x + labelWidth + 2;
    const wrapped = doc.splitTextToSize(value || "-", availableWidth - labelWidth - 4);
    doc.text(wrapped, valueX, y, { baseline: "top" });
    const lineCount = Array.isArray(wrapped) ? wrapped.length : 1;
    return y + lineCount * 6;
  };

  const labelWidth = Math.min(44, detailsTableWidth * 0.35);
  let detailsY = drawSectionHeader("Details", marginLeft, infoStartY, detailsTableWidth);
  detailsY = drawField("Bill to", billToDetails, marginLeft, detailsY, labelWidth, detailsTableWidth);
  detailsY = drawField("Project", projectDetails, marginLeft, detailsY + 2, labelWidth, detailsTableWidth);
  detailsY = drawField("Address", billToAddress, marginLeft, detailsY + 2, labelWidth, detailsTableWidth);
  detailsY = drawField("NTN", taxNumber, marginLeft, detailsY + 2, labelWidth, detailsTableWidth);
  detailsY = drawField("Contact No", contactNumber, marginLeft, detailsY + 2, labelWidth, detailsTableWidth);

  let invoiceY = drawSectionHeader("Invoice", summaryMarginLeft, infoStartY, summaryTableWidth);
  const metaLabelWidth = Math.min(50, summaryTableWidth * 0.5);
  invoiceMeta.forEach(([label, value]) => {
    invoiceY = drawField(label, value ?? "-", summaryMarginLeft, invoiceY + 2, metaLabelWidth, summaryTableWidth);
  });

  const summaryStartY = Math.max(detailsY, invoiceY) + 10;

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
      2: { halign: "right" },
      3: { halign: "left" },
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
  const billToDetails = [customer?.name, customer?.email].filter(Boolean).join("\n") || "-";
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
    ["Details"],
    ["Bill to", billToDetails],
    ["Project", project?.name ?? "-"],
    ["Address", billToAddress],
    ["NTN", taxNumber],
    ["Contact No", contactNumber],
    [],
    ["Invoice"],
    ["Invoice #", invoiceNumber],
    ["Date", invoiceDate],
    ["Period", `${invoice.periodStart} — ${invoice.periodEnd}`],
    ["Due Date", invoice.dueDate ?? "-"],
    [],
    ["SubTotal", "Adjustment", `Sale Tax (${invoice.salesTaxRate ?? 0}% )`, "Total"],
    summaryValues,
    [],
    [
      "S. No.",
      "Vehicle",
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
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, "Invoice");

  const filename = `${buildInvoiceTitle(invoiceNumber)}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return true;
}
