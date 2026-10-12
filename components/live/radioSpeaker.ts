export type Speaker = "driver" | "team" | "unknown";
/** Voice clusters and wording identify neither person's role. Only verified roles receive colours. */
export function speakers(segments: { text: string; speaker?: string; speakerSource?: string }[], _names: string[] = []): Speaker[] {
  return segments.map(s => s.speakerSource === "verified" && (s.speaker === "driver" || s.speaker === "team") ? s.speaker : "unknown");
}
