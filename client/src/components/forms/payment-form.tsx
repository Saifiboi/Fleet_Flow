export default function PaymentForm() {
  return (
    <div className="space-y-4 p-6" data-testid="payment-form-disabled">
      <h3 className="text-lg font-semibold text-foreground">Manual payment entry disabled</h3>
      <p className="text-sm text-muted-foreground">
        Payments can only be generated through the calculation workflow so that attendance days and maintenance
        deductions are tracked accurately. Use the "Calculate payment" action to review a period and then create the
        payment from the approved totals.
      </p>
    </div>
  );
}
