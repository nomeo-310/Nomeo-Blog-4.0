import { Document, View, Text } from "@react-pdf/renderer";
import { pdfStyles as s, formatMoney, formatDate } from "./styles";
import { PdfPage, PdfHeader, PdfSection, PdfRow } from "./document-shell";

export interface AccountSummaryDocumentProps {
  account: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string | Date;
  };
  profile: {
    username?: string | null;
    displayName?: string;
    banStatus: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
  } | null;
  subscription: {
    status: string;
    interval: string;
    currentPeriodEnd: string | Date;
  } | null;
  /** Present only when exporting a creator account */
  creator?: {
    creatorStatus: string | null;
    becameCreatorAt?: string | Date | null;
    recentEarnings: Array<{ billingPeriod: string; netAmount: number; currency: string; payoutStatus: string }>;
  };
}

export function AccountSummaryDocument({ account, profile, subscription, creator }: AccountSummaryDocumentProps) {
  const title = creator ? "Creator Account Summary" : "User Account Summary";

  return (
    <Document>
      <PdfPage>
        <PdfHeader title={title} docNumber={account.id} />

        <PdfSection title="Account">
          <PdfRow label="Name" value={account.name} />
          <PdfRow label="Email" value={account.email} />
          <PdfRow label="Role" value={account.role} />
          <PdfRow label="Member since" value={formatDate(account.createdAt)} />
          {profile?.username && <PdfRow label="Username" value={`@${profile.username}`} />}
          {profile && <PdfRow label="Account status" value={profile.banStatus} />}
        </PdfSection>

        {profile && (
          <PdfSection title="Activity">
            <PdfRow label="Followers" value={String(profile.followersCount)} />
            <PdfRow label="Following" value={String(profile.followingCount)} />
            <PdfRow label="Posts" value={String(profile.postsCount)} />
          </PdfSection>
        )}

        {subscription && (
          <PdfSection title="Subscription">
            <PdfRow label="Status" value={subscription.status} />
            <PdfRow label="Interval" value={subscription.interval} />
            <PdfRow label="Current period ends" value={formatDate(subscription.currentPeriodEnd)} />
          </PdfSection>
        )}

        {creator && (
          <PdfSection title="Creator standing">
            <PdfRow label="Creator status" value={creator.creatorStatus ?? "active"} />
            {creator.becameCreatorAt && <PdfRow label="Became creator" value={formatDate(creator.becameCreatorAt)} />}
          </PdfSection>
        )}

        {creator && creator.recentEarnings.length > 0 && (
          <PdfSection title="Recent earnings">
            <View style={s.table}>
              <View style={s.tableHeaderRow}>
                <Text style={{ ...s.tableHeaderCell, width: "40%" }}>Period</Text>
                <Text style={{ ...s.tableHeaderCell, width: "30%" }}>Status</Text>
                <Text style={{ ...s.tableHeaderCell, width: "30%", textAlign: "right" }}>Net amount</Text>
              </View>
              {creator.recentEarnings.map((e) => (
                <View style={s.tableRow} key={e.billingPeriod}>
                  <Text style={{ ...s.tableCell, width: "40%" }}>{e.billingPeriod}</Text>
                  <Text style={{ ...s.tableCell, width: "30%" }}>{e.payoutStatus}</Text>
                  <Text style={{ ...s.tableCell, width: "30%", textAlign: "right" }}>{formatMoney(e.netAmount, e.currency)}</Text>
                </View>
              ))}
            </View>
          </PdfSection>
        )}
      </PdfPage>
    </Document>
  );
}
