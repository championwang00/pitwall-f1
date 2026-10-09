// TEMPORARY dev-only page for scripts/link-audit.mjs — delete after the audit.
import { notFound } from "next/navigation";
import { linkDictionary } from "@/lib/linkify";
export const dynamic = "force-dynamic";
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <pre id="dict">{JSON.stringify(linkDictionary())}</pre>;
}
