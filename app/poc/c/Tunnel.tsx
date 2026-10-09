"use client";
import TimeTunnel, { type SeasonRing } from "@/components/three/TimeTunnel";
export default function Tunnel({ seasons }: { seasons: SeasonRing[] }) {
  return <TimeTunnel seasons={seasons} className="tunnel" />;
}
