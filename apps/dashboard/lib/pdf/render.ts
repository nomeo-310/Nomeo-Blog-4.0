import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { NextResponse } from "next/server";

/** Renders a React-PDF <Document> element to a downloadable PDF response. */
export async function renderPdfResponse(doc: ReactElement<DocumentProps>, filename: string): Promise<NextResponse> {
  const buffer = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
