import { speakers as textSpeakers, type Speaker } from "@/lib/radioSpeakerText";
export type { Speaker };

/** Speaker per line: the server's voice-clustered label where the two voices separated clearly, else phrase inference. */
export function speakers(segments: { text: string; speaker?: Speaker; spk?: string }[], names: string[]): Speaker[] {
  const inferred = textSpeakers(segments, names);
  return segments.map((s, i) => (s.spk === "voice" && s.speaker ? s.speaker : inferred[i]));
}
