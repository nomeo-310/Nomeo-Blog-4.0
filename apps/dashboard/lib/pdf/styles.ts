import { StyleSheet } from "@react-pdf/renderer";

/** Shared visual language for every admin-exported PDF document. */
export const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "2 solid #111827",
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },
  brandSub: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  docTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  docMeta: {
    fontSize: 9,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 2,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b7280",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottom: "1 solid #e5e7eb",
  },
  rowLabel: {
    color: "#6b7280",
  },
  rowValue: {
    fontFamily: "Helvetica-Bold",
  },
  table: {
    marginTop: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: "1 solid #e5e7eb",
  },
  tableCell: {
    fontSize: 9,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#6b7280",
  },
  badge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    color: "#ffffff",
    backgroundColor: "#6b7280",
    alignSelf: "flex-start",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
    borderTop: "1 solid #e5e7eb",
    paddingTop: 10,
  },
});

export const BRAND = { name: "Nomeo" };

export function formatMoney(amountInKobo: number, currency = "NGN"): string {
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  return `${symbol}${(amountInKobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value?: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateTime(value?: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-NG", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
