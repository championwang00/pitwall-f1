import { NextResponse } from "next/server";
import { eraOf } from "@/lib/eras";

/** The 时代 tab is gone (spec §0.8.7 D3): it was /eras/[id] minus the circuits, and the season card's 所属时代 links
 *  there. A route handler so the answer is a real 308 (see ../cars/route.ts). */
export async function GET(req: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const er = /^\d{4}$/.test(year) ? eraOf(+year) : null;
  return NextResponse.redirect(new URL(er ? `/eras/${er.id}` : `/seasons/${year}`, req.url), 308);
}
