import { Document, View, Text } from "@react-pdf/renderer";
import { pdfStyles as s, formatMoney, formatDateTime, formatDate } from "./styles";
import { PdfPage, PdfHeader, PdfSection, PdfRow } from "./document-shell";

export interface ReceiptDocumentProps {
  payment: {
    reference: string;
    amount: number;
    amountPaid: number;
    currency: string;
    gatewayStatus: string;
    channel?: string;
    paidAt?: string | Date;
    createdAt: string | Date;
    cardType?: string;
    cardLast4?: string;
    cardBank?: string;
  };
  payer: { name: string; email: string };
  plan: { name: string; interval: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  success:   "#059669",
  pending:   "#d97706",
  failed:    "#dc2626",
  abandoned: "#6b7280",
  reversed:  "#dc2626",
};

export function ReceiptDocument({ payment, payer, plan }: ReceiptDocumentProps) {
  return (
    <Document>
      <PdfPage>
        <PdfHeader title="Payment Receipt" docNumber={payment.reference} />

        <View style={{ marginBottom: 18 }}>
          <Text style={{ ...s.badge, backgroundColor: STATUS_COLOR[payment.gatewayStatus] ?? "#6b7280" }}>
            {payment.gatewayStatus.toUpperCase()}
          </Text>
        </View>

        <PdfSection title="Payer">
          <PdfRow label="Name" value={payer.name} />
          <PdfRow label="Email" value={payer.email} />
        </PdfSection>

        {plan && (
          <PdfSection title="Plan">
            <PdfRow label="Plan" value={plan.name} />
            <PdfRow label="Billing interval" value={plan.interval} />
          </PdfSection>
        )}

        <PdfSection title="Payment details">
          <PdfRow label="Reference" value={payment.reference} />
          <PdfRow label="Amount" value={formatMoney(payment.amount, payment.currency)} />
          <PdfRow label="Amount paid" value={formatMoney(payment.amountPaid, payment.currency)} />
          {payment.channel && <PdfRow label="Channel" value={payment.channel} />}
          {payment.cardBank && <PdfRow label="Card" value={`${payment.cardType ?? ""} •••• ${payment.cardLast4 ?? ""} (${payment.cardBank})`} />}
          <PdfRow label="Initiated" value={formatDate(payment.createdAt)} />
          {payment.paidAt && <PdfRow label="Paid at" value={formatDateTime(payment.paidAt)} />}
        </PdfSection>
      </PdfPage>
    </Document>
  );
}
