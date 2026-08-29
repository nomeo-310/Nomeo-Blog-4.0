import { Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles as s, BRAND, formatDateTime } from "./styles";

export function PdfHeader({ title, docNumber }: { title: string; docNumber: string }) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.brand}>{BRAND.name}</Text>
        <Text style={s.brandSub}>Admin-generated document</Text>
      </View>
      <View>
        <Text style={s.docTitle}>{title}</Text>
        <Text style={s.docMeta}>{docNumber}</Text>
        <Text style={s.docMeta}>Generated {formatDateTime(new Date())}</Text>
      </View>
    </View>
  );
}

export function PdfFooter() {
  return (
    <Text style={s.footer} fixed>
      {BRAND.name} · This document was generated from the admin dashboard and is for record-keeping purposes.
    </Text>
  );
}

export function PdfSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function PdfRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

export function PdfPage({ children }: { children: React.ReactNode }) {
  return (
    <Page size="A4" style={s.page}>
      {children}
      <PdfFooter />
    </Page>
  );
}
