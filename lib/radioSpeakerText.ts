/**
 * Who is speaking in a team-radio line: the driver (in the cockpit) or the team (race engineer on the pit wall).
 * Whisper gives text only and audio features don't separate the two reliably (both are compressed radio), so this
 * is a phrase-based inference — good on the stock F1 radio vocabulary, labelled as "自动推断" in the UI.
 */
export type Speaker = "driver" | "team";

const TEAM = [
  /\bmate\b/i, /\bbox(,| box|ing)?\b/i, /\bstay out\b/i, /\bplan [a-f]\b/i, /\btarget\b/i, /\bdelta\b/i, /\bpush( now| push)?\b/i,
  /\b(well|good|great|nice) (done|job|work|stuff)\b/i, /\bwe('re| are) (thinking|going|looking|seeing|checking)\b/i, /\bwe('ll| will)\b/i,
  /\blet'?s\b/i, /\byou('re| are| have|'ve)\b/i, /\byour (tyres?|tires?|pace|gap|car|brakes?|engine|battery)\b/i,
  /\bhow('s| are| is) (the |your )?(tyres?|tires?|car|balance|it going|things|power|brakes?|grip)\b/i, /\bfor (your )?info\b/i, /\bbe aware\b/i,
  /\bcar (behind|ahead)\b/i, /\b(laps?|corners?) to go\b/i, /\b(switch|mode|strat) \w+/i, /\bconfirm(ed)?\b/i, /\bP\d{1,2}\b/,
  /\bwe('ve| have)( got)?\b/i, /\bwe (need|want|think|don't think|can|expect|see)\b/i, /\boffset\b/i, /\bpenalty\b/i, /\bthis lap\b/i,
  /^\s*(copy|okay|ok|understood)[,.]?\s+(checking|we|that|understood|all|we'll|noted|thanks|looking)\b/i, /\bchecking\b/i,
  /\ball (okay|ok|good|fine)\b/i, /\beverything('s| is)? (stable|fine|good|normal|okay|ok)\b/i, /\bfor now\b/i, /\bno (issue|problem)s?\b/i,
  /\b(stop|retire|park) the car\b/i, /\bwe need to\b/i, /\b(slow|pit) (this|next) lap\b/i,
  /\bsafety car\b/i, /\bkeep (it|going|pushing)\b/i, /\bpress and hold\b/i, /\bboost\b/i, /\bunderstood\b/i,
];
const DRIVER = [
  /\b(i|i'm|i've|i'd|my|me)\b/i, /\bthe car (is|feels|has|was|'s)\b/i, /\b(no|zero) grip\b/i, /\b(understeer|oversteer)\b/i, /\b(can't|cannot)\b/i,
  /\bwhat (happened|is going on|the hell)\b/i, /\bwhy\b/i, /^\s*(yeah|yes|copy|ok|okay|thank you|thanks)[.!]?\s*$/i, /^\s*(yeah|yes)\b/i, /\bguys\b/i, /\bsorry\b/i,
  /\b(what'?s|where'?s|how much) (the )?gap\b/i, /\bdangerous\b/i, /\bunbelievable\b/i, /\bridiculous\b/i,
];

export const textScore = (text: string, names: string[]) => {
  let s = 0;
  for (const re of TEAM) if (re.test(text)) s += 2;
  for (const re of DRIVER) if (re.test(text)) s -= 2;
  // addressing the driver by name ("Lewis, box this lap") is the engineer
  for (const n of names) if (n && new RegExp(`\\b${n}\\b`, "i").test(text)) s += 3;
  return s;
};

/** Speaker per segment; ambiguous lines alternate from the previous one (radio is a dialogue), first defaults to driver. */
export function speakers(segments: { text: string }[], names: string[]): Speaker[] {
  const out: Speaker[] = [];
  segments.forEach((sg, i) => {
    const s = textScore(sg.text, names);
    // ambiguous line: an answer to a question switches speaker, otherwise the same person keeps talking
    const prev = out[i - 1], asked = i > 0 && /\?\s*$/.test(segments[i - 1].text);
    out.push(s > 0 ? "team" : s < 0 ? "driver" : i === 0 ? "driver" : asked ? (prev === "team" ? "driver" : "team") : prev);
  });
  return out;
}
