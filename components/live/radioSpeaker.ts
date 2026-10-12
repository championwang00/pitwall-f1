export type Speaker = "driver" | "team" | "unknown";
/** Roles only come from audio matching against verified references, never subtitle wording. */
export function speakers(segments: { speaker?: string; speakerSource?: string; voiceSimilarity?: number; voiceReferenceId?: string }[], _names: string[] = []): Speaker[] {
  return segments.map(s => s.speakerSource === "audio" && !!s.voiceReferenceId && Number.isFinite(s.voiceSimilarity) && s.voiceSimilarity! >= 0.72 && (s.speaker === "driver" || s.speaker === "team") ? s.speaker : "unknown");
}
