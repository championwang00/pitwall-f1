import Header, { type NextSession } from "@/components/shell/Header";
import Footer from "@/components/shell/Footer";
import { nextSession } from "@/lib/schedule";
import YearShell from "@/components/season/YearShell";
import HoverLayer from "@/components/entity/HoverLayer";
import NavSkeleton from "@/components/shell/NavSkeleton";
import DemoCursor from "@/components/shell/DemoCursor";
import { Suspense } from "react";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  let next: NextSession = null;
  try { next = await nextSession(); } catch {}
  return (
    <>
      <Header next={next} />
      <main><YearShell>{children}</YearShell></main>
      <Footer />
      <HoverLayer />
      <Suspense fallback={null}><NavSkeleton /></Suspense>
      <DemoCursor />
    </>
  );
}
