import type { CustomerInvoiceWithDetails, CustomerInvoiceWithItems } from "@shared/schema";

const BANK_DETAILS = {
  accountName: "FleetFlow Logistics",
  accountNumber: "1234-567890-12",
  bankName: "National Bank of Pakistan",
  iban: "PK12NBPA0000001234567890",
  swift: "NBPAPKKA",
  branch: "Main Boulevard Branch",
};

const buildSummaryRow = (label: string, value: string) =>
  `<div class="summary-row"><span>${label}</span><strong>${value}</strong></div>`;

export function exportCustomerInvoicePdf(
  invoice: CustomerInvoiceWithItems | CustomerInvoiceWithDetails,
  formatCurrency: (value: number | string | undefined | null) => string,
): boolean {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1000");

  if (!printWindow) {
    return false;
  }

  const payments = "payments" in invoice ? invoice.payments ?? [] : [];
  const customer = "customer" in invoice ? invoice.customer : undefined;
  const project = "project" in invoice ? invoice.project : undefined;
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const outstanding = Math.max(Number(invoice.total ?? 0) - totalPaid, 0);

  const lineItems = invoice.items
    .map(
      (item) => `
        <tr>
          <td>${item.vehicle?.licensePlate ?? "-"}</td>
          <td>${item.vehicle ? `${item.vehicle.make} ${item.vehicle.model}` : "-"}</td>
          <td>${item.monthLabel ?? `${item.month}/${item.year}`}</td>
          <td class="text-right">${formatCurrency(item.projectRate)}</td>
          <td class="text-right">${item.presentDays}</td>
          <td class="text-right">${formatCurrency(item.vehicleMob)}</td>
          <td class="text-right">${formatCurrency(item.vehicleDimob)}</td>
          <td class="text-right">${formatCurrency(item.dailyRate)}</td>
          <td class="text-right">${formatCurrency(item.amount)}</td>
          <td class="text-right">${formatCurrency(item.salesTaxAmount)}</td>
          <td class="text-right">${formatCurrency(item.totalAmount)}</td>
        </tr>`,
    )
    .join("");

  const customerName = customer?.name ?? "-";
  const projectName = project?.name ?? "-";
  const invoiceNumber = invoice.invoiceNumber ?? "Pending number";

  printWindow.document.write(`
    <html>
      <head>
        <title>Invoice ${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1, h2, h3 { margin: 0; }
          .header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
          .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; margin-top: 16px; }
          .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 16px; }
          .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
          .summary-row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; padding: 8px 12px; background: #f8fafc; border-radius: 8px; }
          .summary-row span { color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: 600; }
          .text-right { text-align: right; }
          .note { margin-top: 8px; color: #475569; font-size: 12px; }
          .bank { border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; background: #f8fafc; }
          .bank h3 { margin-bottom: 8px; }
          .bank ul { list-style: none; padding: 0; margin: 0; font-size: 12px; }
          .bank li { margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Invoice ${invoiceNumber}</h1>
            <div class="note">${invoice.periodStart} — ${invoice.periodEnd}</div>
            <div class="note">Status: ${invoice.status}</div>
            <div class="note">Due date: ${invoice.dueDate}</div>
          </div>
          <div class="bank">
            <h3>Bank details</h3>
            <ul>
              <li><strong>Account name:</strong> ${BANK_DETAILS.accountName}</li>
              <li><strong>Account number:</strong> ${BANK_DETAILS.accountNumber}</li>
              <li><strong>Bank:</strong> ${BANK_DETAILS.bankName}</li>
              <li><strong>IBAN:</strong> ${BANK_DETAILS.iban}</li>
              <li><strong>SWIFT:</strong> ${BANK_DETAILS.swift}</li>
              <li><strong>Branch:</strong> ${BANK_DETAILS.branch}</li>
            </ul>
          </div>
        </div>

        <div class="meta">
          <div class="card">
            <h3>Customer</h3>
            <p>${customerName}</p>
          </div>
          <div class="card">
            <h3>Project</h3>
            <p>${projectName}</p>
          </div>
          <div class="card">
            <h3>Contact</h3>
            <p>${customer?.contactName ?? "-"}</p>
            <p class="note">${customer?.email ?? ""}</p>
          </div>
        </div>

        <div class="card">
          <h3>Invoice summary</h3>
          <div class="summary">
            ${buildSummaryRow("Subtotal", formatCurrency(invoice.subtotal))}
            ${buildSummaryRow("Adjustment", formatCurrency(invoice.adjustment))}
            ${buildSummaryRow(`Sales tax (${invoice.salesTaxRate ?? 0}% )`, formatCurrency(invoice.salesTaxAmount))}
            ${buildSummaryRow("Total", formatCurrency(invoice.total))}
            ${buildSummaryRow("Total paid", formatCurrency(totalPaid))}
            ${buildSummaryRow("Outstanding", formatCurrency(outstanding))}
          </div>
          <p class="note">Amounts are rounded to two decimal places. Payment instructions are provided in the bank details.</p>
        </div>

        <div class="card">
          <h3>Line items</h3>
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Details</th>
                <th>Month</th>
                <th class="text-right">Project rate</th>
                <th class="text-right">Present days</th>
                <th class="text-right">MOB</th>
                <th class="text-right">DI MOB</th>
                <th class="text-right">Daily rate</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Sales tax</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>${lineItems}</tbody>
          </table>
          <p class="note">Please verify attendance and rates before remitting payment.</p>
        </div>

        <div class="card">
          <h3>Receiving details</h3>
          <p class="note">Transfer payments to the bank account above and share remittance advice with billing@fleetflow.test.</p>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();

  return true;
}
