import { cachedJSON } from "./cache";

const BASE = "https://api.openf1.org/v1";

export type OF1Session = {
  session_key: number; session_type: string; session_name: string; date_start: string; date_end: string;
  meeting_key: number; circuit_key: number; circuit_short_name: string; country_name: string; location: string;
  gmt_offset: string; year: number; is_cancelled?: boolean;
};

export type OF1Meeting = {
  meeting_key: number; meeting_name: string; meeting_official_name: string; location: string; country_name: string;
  circuit_key: number; circuit_short_name: string; date_start: string; date_end?: string; year: number;
  is_cancelled?: boolean; country_flag?: string; circuit_image?: string; gmt_offset: string;
};

export const sessionsForYear = (year: number) => cachedJSON<OF1Session[]>(`${BASE}/sessions?year=${year}`, 3600).then((r) => r || []);
export const meetingsForYear = (year: number) => cachedJSON<OF1Meeting[]>(`${BASE}/meetings?year=${year}`, 3600).then((r) => r || []);

/** Sessions grouped per meeting, cancelled meetings and testing dropped. */
export async function weekendSessions(year: number) {
  const [sessions, meetings] = await Promise.all([sessionsForYear(year), meetingsForYear(year)]);
  const byMeeting = new Map<number, OF1Session[]>();
  for (const s of sessions) {
    if (s.is_cancelled) continue;
    const arr = byMeeting.get(s.meeting_key) || [];
    arr.push(s);
    byMeeting.set(s.meeting_key, arr);
  }
  return meetings
    .filter((m) => !m.is_cancelled && !/testing/i.test(m.meeting_name))
    .map((m) => ({ meeting: m, sessions: (byMeeting.get(m.meeting_key) || []).sort((a, b) => a.date_start.localeCompare(b.date_start)) }))
    .filter((w) => w.sessions.length)
    .sort((a, b) => a.sessions[0].date_start.localeCompare(b.sessions[0].date_start));
}

/** formula1.com's own short session labels (countdown strip, schedule rows). */
export const SESSION_EN: Record<string, string> = {
  "Practice 1": "FP1", "Practice 2": "FP2", "Practice 3": "FP3", Qualifying: "Qualifying",
  "Sprint Qualifying": "Sprint Qualifying", "Sprint Shootout": "Sprint Qualifying", Sprint: "Sprint", Race: "Race",
};

export const SESSION_ZH: Record<string, string> = {
  "Practice 1": "一练", "Practice 2": "二练", "Practice 3": "三练", Qualifying: "排位赛",
  "Sprint Qualifying": "冲刺排位", "Sprint Shootout": "冲刺排位", Sprint: "冲刺赛", Race: "正赛",
};
