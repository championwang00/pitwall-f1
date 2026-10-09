import { NextResponse } from "next/server";

/** The 赛车 tab is gone (spec §0.8.7 D3): every row was a subset of the 车队 tab's cards (car link · engine · drivers).
 *  A route handler, not a page: a page's permanentRedirect streams after the hub layout (200 + meta refresh), this is a
 *  real 308. */
export async function GET(req: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  return NextResponse.redirect(new URL(`/seasons/${year}/teams`, req.url), 308);
}
