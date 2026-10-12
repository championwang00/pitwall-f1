import { speakers as inferSpeakers, type Speaker } from "@/lib/radioSpeakerText";
export type { Speaker };
/** Keep the driver/team colour convention; verified roles override contextual automatic inference. */
export function speakers(segments: { text: string; speaker?: string; speakerSource?: string }[], names: string[] = []): Speaker[] {
  const inferred = inferSpeakers(segments, names);
  return segments.map((s,i) => s.speakerSource === "verified" && (s.speaker === "driver" || s.speaker === "team") ? s.speaker : inferred[i]);
}
