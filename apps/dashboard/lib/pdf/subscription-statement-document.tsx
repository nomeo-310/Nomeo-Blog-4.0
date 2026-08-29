import { Document, View, Text } from "@react-pdf/renderer";
import { pdfStyles as s, formatMoney, formatDate } from "./styles";
import { PdfPage, PdfHeader, PdfSection, PdfRow } from "./document-shell";

export interface SubscriptionStatementProps {
  subscription: {
    id: string;
    status: string;
    interval: string;
    priceAmount: number;
    currency: string;
    currentPeriodStart: string | Date;
    currentPeriodEnd: string | Date;
    autoRenew: boolean;
    createdAt: string | Date;
  };
  subscriber: { name: string; email: string };
  plan: { name: string } | null;
  payments: Array<{
    reference: string;
    amount: number;
    currency: string;
    gatewayStatus: string;
    paidAt?: string | Date;
    createdAt: string | Date;
  }>;
}

export function SubscriptionStatementDocument({ subscription, subscriber, plan, payments }: SubscriptionStatementProps) {
  return (
    <Document>
      <PdfPage>
        <PdfHeader title="Subscription Statement" docNumber={subscription.id} />

        <View style={{ marginBottom: 18 }}>
          <Text style={s.badge}>{subscription.status.toUpperCase()}</Text>
        </View>

        <PdfSection title="Subscriber">
          <PdfRow label="Name" value={subscriber.name} />
          <PdfRow label="Email" value={subscriber.email} />
        </PdfSection>

        <PdfSection title="Subscription">
          {plan && <PdfRow label="Plan" value={plan.name} />}
          <PdfRow label="Interval" value={subscription.interval} />
          <PdfRow label="Price" value={formatMoney(subscription.priceAmount, subscription.currency)} />
          <PdfRow label="Current period" value={`${formatDate(subscription.currentPeriodStart)} – ${formatDate(subscription.currentPeriodEnd)}`} />
          <PdfRow label="Auto-renew" value={subscription.autoRenew ? "Yes" : "No"} />
          <PdfRow label="Subscribed since" value={formatDate(subscription.createdAt)} />
        </PdfSection>

        <PdfSection title="Payment history">
          {payments.length === 0 ? (
            <Text style={{ color: "#6b7280" }}>No payments recorded for this subscription.</Text>
          ) : (
            <View style={s.table}>
              <View style={s.tableHeaderRow}>
                <Text style={{ ...s.tableHeaderCell, width: "35%" }}>Reference</Text>
                <Text style={{ ...s.tableHeaderCell, width: "20%" }}>Date</Text>
                <Text style={{ ...s.tableHeaderCell, width: "20%" }}>Status</Text>
                <Text style={{ ...s.tableHeaderCell, width: "25%", textAlign: "right" }}>Amount</Text>
              </View>
              {payments.map((p) => (
                <View style={s.tableRow} key={p.reference}>
                  <Text style={{ ...s.tableCell, width: "35%" }}>{p.reference}</Text>
                  <Text style={{ ...s.tableCell, width: "20%" }}>{formatDate(p.paidAt ?? p.createdAt)}</Text>
                  <Text style={{ ...s.tableCell, width: "20%" }}>{p.gatewayStatus}</Text>
                  <Text style={{ ...s.tableCell, width: "25%", textAlign: "right" }}>{formatMoney(p.amount, p.currency)}</Text>
                </View>
              ))}
            </View>
          )}
        </PdfSection>
      </PdfPage>
    </Document>
  );
}
