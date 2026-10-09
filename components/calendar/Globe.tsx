"use client";
import RouteGlobe, { type Stop } from "@/components/three/RouteGlobe";
export default function Globe({ stops }: { stops: Stop[] }) {
  return <RouteGlobe stops={stops} className="route-globe" />;
}
