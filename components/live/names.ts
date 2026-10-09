// Chinese copy + id mappings for the live timing page. Pure data, safe on server and client.

/** OpenF1 circuit_short_name -> F1DB circuit id (mirrors scripts/build-tracks.mjs MAP). */
export const CIRCUIT_ID: Record<string, string> = {
  Melbourne: "melbourne", Shanghai: "shanghai", Suzuka: "suzuka", Miami: "miami", Montreal: "montreal",
  "Monte Carlo": "monaco", Catalunya: "catalunya", Spielberg: "spielberg", Silverstone: "silverstone",
  "Spa-Francorchamps": "spa-francorchamps", Hungaroring: "hungaroring", Zandvoort: "zandvoort", Monza: "monza",
  Madring: "madring", Baku: "baku", "Kuala Lumpur": "sepang", Singapore: "marina-bay", Austin: "austin",
  "Mexico City": "mexico-city", Interlagos: "interlagos", "Las Vegas": "las-vegas", Lusail: "lusail",
  "Yas Marina Circuit": "yas-marina", Sakhir: "bahrain", Jeddah: "jeddah", Imola: "imola",
};

export const PLACE_ZH: Record<string, string> = {
  Melbourne: "墨尔本", Shanghai: "上海", Suzuka: "铃鹿", Miami: "迈阿密", Montreal: "蒙特利尔", "Monte Carlo": "蒙特卡洛",
  Catalunya: "加泰罗尼亚", Spielberg: "施皮尔贝格", Silverstone: "银石", "Spa-Francorchamps": "斯帕", Hungaroring: "亨格罗林",
  Zandvoort: "赞德沃特", Monza: "蒙扎", Madring: "马德里", Baku: "巴库", "Kuala Lumpur": "吉隆坡（雪邦）", Singapore: "滨海湾",
  Austin: "奥斯汀", "Mexico City": "墨西哥城", Interlagos: "英特拉格斯", "Las Vegas": "拉斯维加斯", Lusail: "卢赛尔",
  "Yas Marina Circuit": "亚斯码头", Sakhir: "萨基尔", Jeddah: "吉达", Imola: "伊莫拉",
};

const GP_ZH: Record<string, string> = {
  Australian: "澳大利亚", Chinese: "中国", Japanese: "日本", Bahrain: "巴林", "Saudi Arabian": "沙特阿拉伯", Miami: "迈阿密",
  Canadian: "加拿大", Monaco: "摩纳哥", Barcelona: "巴塞罗那", Austrian: "奥地利", British: "英国", Belgian: "比利时",
  Hungarian: "匈牙利", Dutch: "荷兰", Italian: "意大利", Spanish: "西班牙", Azerbaijan: "阿塞拜疆", Singapore: "新加坡",
  "United States": "美国", "Mexico City": "墨西哥城", "São Paulo": "圣保罗", "Las Vegas": "拉斯维加斯", Qatar: "卡塔尔",
  "Abu Dhabi": "阿布扎比", "Emilia Romagna": "艾米利亚-罗马涅",
};

export function meetingZh(name: string) {
  const m = name.match(/^(.*) Grand Prix$/);
  if (m && GP_ZH[m[1]]) return GP_ZH[m[1]] + "大奖赛";
  return name;
}

export const SESSION_ZH: Record<string, string> = {
  "Practice 1": "一练", "Practice 2": "二练", "Practice 3": "三练", Qualifying: "排位赛",
  "Sprint Qualifying": "冲刺排位", "Sprint Shootout": "冲刺排位", Sprint: "冲刺赛", Race: "正赛",
};

export const COMPOUND: Record<string, { l: string; c: string; zh: string }> = {
  SOFT: { l: "S", c: "#ff3b30", zh: "软胎" },
  MEDIUM: { l: "M", c: "#ffd800", zh: "中性胎" },
  HARD: { l: "H", c: "#f2f2f2", zh: "硬胎" },
  INTERMEDIATE: { l: "I", c: "#3bb54a", zh: "半雨胎" },
  WET: { l: "W", c: "#2f80ed", zh: "全雨胎" },
};

export type RcKind =
  | "sc" | "vsc" | "red" | "yellow" | "dyellow" | "green" | "clear" | "blue" | "chequered" | "bw"
  | "penalty" | "investigation" | "deleted" | "session" | "info";

const REASON: [RegExp, string][] = [
  [/CAUSING A COLLISION/, "引发碰撞"], [/FALSE START|MOVING BEFORE SIGNAL/, "抢跑"], [/DRIVING ERRATICALLY/, "驾驶不稳定"],
  [/UNSAFE RELEASE/, "不安全放行"], [/TRACK LIMITS/, "超出赛道界限"], [/LEAVING THE TRACK AND GAINING/, "离开赛道获利"],
  [/FAILING TO FOLLOW/, "未遵守赛事总监指令"], [/IMPEDING/, "阻挡对手"], [/SPEEDING IN THE PIT LANE|PIT LANE SPEEDING/, "维修区超速"],
  [/FORCING ANOTHER DRIVER OFF/, "将对手挤出赛道"], [/OVERTAKING UNDER (SAFETY CAR|SC|VSC)/, "安全车期间超车"],
  [/UNDER (DOUBLE )?YELLOW/, "黄旗下未减速"], [/DRIVING UNNECESSARILY SLOWLY/, "不必要的慢速驾驶"],
  [/CROSSING THE (WHITE )?LINE/, "越过维修区白线"], [/MORE THAN ONE CHANGE OF DIRECTION/, "多次变线防守"], [/PIT ENTRY|PIT EXIT/, "维修区出入口违规"], [/RED FLAG/, "红旗违规"],
];
const reasonZh = (s: string) => REASON.find(([r]) => r.test(s))?.[1] ?? "";
const stamp = (s: string) => s.replace(/\s*\(\d{2}:\d{2}:\d{2}\)\s*$/, "");

/** "CARS 16 (LEC) AND 27 (HUL)" -> "LEC、HUL" */
const cars = (s: string) => {
  const m = [...s.matchAll(/\d+ \((\w{3})\)/g)].map((x) => x[1]);
  return m.length ? m.join("、") : "";
};

/** Translate an FIA race-control message into concise Chinese. Falls back to the original text. */
export function rcZh(message: string, flag: string | null, category: string): { text: string; kind: RcKind } {
  const m = (message || "").toUpperCase().trim();
  let x: RegExpMatchArray | null;
  if (/^(VSC|VIRTUAL SAFETY CAR) DEPLOYED/.test(m)) return { text: "虚拟安全车出动", kind: "vsc" };
  if (/^(VSC|VIRTUAL SAFETY CAR) ENDING/.test(m)) return { text: "虚拟安全车即将结束", kind: "vsc" };
  if (/^SAFETY CAR DEPLOYED/.test(m)) return { text: "安全车出动", kind: "sc" };
  if (/^SAFETY CAR IN THIS LAP/.test(m)) return { text: "安全车本圈返回维修区", kind: "sc" };
  if (/^SAFETY CAR ENDING/.test(m)) return { text: "安全车即将结束", kind: "sc" };
  if (/SAFETY CAR LIGHTS ON/.test(m)) return { text: "安全车灯亮起", kind: "sc" };
  if (/SAFETY CAR LIGHTS OFF/.test(m)) return { text: "安全车灯熄灭", kind: "sc" };
  if (flag === "RED" || /^RED FLAG/.test(m)) return { text: "红旗 · 比赛中断", kind: "red" };
  if (flag === "CHEQUERED" || /^CHEQUERED FLAG/.test(m)) return { text: "方格旗", kind: "chequered" };
  if ((x = m.match(/^(DOUBLE )?YELLOW IN TRACK SECTOR (\d+)/))) return { text: `第 ${x[2]} 赛段${x[1] ? "双黄旗" : "黄旗"}`, kind: x[1] ? "dyellow" : "yellow" };
  if ((x = m.match(/^CLEAR IN TRACK SECTOR (\d+)/))) return { text: `第 ${x[1]} 赛段解除黄旗`, kind: "clear" };
  if (/^TRACK CLEAR/.test(m)) return { text: "全赛道解除", kind: "green" };
  if (/^GREEN LIGHT - PIT EXIT OPEN/.test(m)) return { text: "绿灯 · 维修区出口开放", kind: "green" };
  if ((x = m.match(/BLUE FLAG FOR CAR (\d+) \((\w+)\)/))) return { text: `蓝旗 · ${x[2]}`, kind: "blue" };
  if ((x = m.match(/BLACK AND WHITE FLAG FOR CAR (\d+) \((\w+)\)(?: - (.*))?/))) return { text: `黑白旗警告 · ${x[2]}${x[3] ? " · " + (reasonZh(x[3]) || stamp(x[3])) : ""}`, kind: "bw" };
  if ((x = m.match(/^CAR (\d+) \((\w+)\) (?:TIME ([\d:.]+) )?(?:LAP )?DELETED - TRACK LIMITS AT TURN (\d+)(?: LAP (\d+))?/)))
    return { text: `${x[2]}${x[5] ? ` 第 ${x[5]} 圈` : ""}${x[3] ? ` ${x[3]}` : ""} 成绩删除 · ${x[4]} 号弯超出赛道界限`, kind: "deleted" };
  if ((x = m.match(/(\d+) SECOND (?:TIME|STOP\/GO) PENALTY FOR CAR (\d+) \((\w+)\)(?: - (.*))?/)))
    return { text: `${m.includes("PENALTY SERVED") ? "罚时已执行 · " : "处罚 · "}${x[3]} ${x[1]} 秒${x[4] ? " · " + (reasonZh(x[4]) || "") : ""}`, kind: "penalty" };
  if ((x = m.match(/DRIVE THROUGH PENALTY FOR CAR (\d+) \((\w+)\)/))) return { text: `处罚 · ${x[2]} 通过维修区`, kind: "penalty" };
  if (/INCIDENT/.test(m)) {
    const who = cars(m), why = reasonZh(m);
    const st = /UNDER INVESTIGATION/.test(m) ? "调查中" : /AFTER THE (RACE|SESSION)/.test(m) ? "赛后调查" : /NO FURTHER/.test(m) ? "不予处罚" : /REVIEWED/.test(m) ? "已审查" : "事件记录";
    return { text: `${st}${who ? " · " + who : ""}${why ? " · " + why : ""}`, kind: "investigation" };
  }
  if (/^SESSION STARTED/.test(m)) return { text: "会话开始", kind: "session" };
  if (/^SESSION FINISHED/.test(m)) return { text: "会话结束", kind: "session" };
  if (/^SESSION (WILL )?RESUME/.test(m)) return { text: "会话恢复", kind: "session" };
  if (/^RACE START/.test(m)) return { text: "比赛开始", kind: "session" };
  if (/^STANDING START/.test(m)) return { text: "静止起步", kind: "session" };
  if (/^ROLLING START/.test(m)) return { text: "滚动起步", kind: "session" };
  if (/^DELAYED START/.test(m)) return { text: "推迟起步", kind: "session" };
  if (/^STARTING PROCEDURE SUSPENDED/.test(m)) return { text: "起步程序暂停", kind: "session" };
  if (/FORMATION LAPS? BEHIND SAFETY CAR/.test(m)) return { text: "安全车领跑暖胎圈", kind: "sc" };
  if ((x = m.match(/FORMATION LAP WILL START AT ([\d:]+)/))) return { text: `暖胎圈将于当地 ${x[1]} 开始`, kind: "session" };
  if ((x = m.match(/RACE WILL START AT ([\d:]+)/))) return { text: `比赛将于当地 ${x[1]} 开始`, kind: "session" };
  if ((x = m.match(/FIRST CAR TO TAKE THE FLAG - CAR (\d+) \((\w+)\)/))) return { text: `首辆冲线 · ${x[2]}`, kind: "chequered" };
  if (/^PIT EXIT CLOSED/.test(m)) return { text: "维修区出口关闭", kind: "info" };
  if ((x = m.match(/RISK OF RAIN .* IS (\d+)%/))) return { text: `降雨概率 ${x[1]}%`, kind: "info" };
  if (/^DRS ENABLED/.test(m)) return { text: "DRS 开启", kind: "info" };
  if (/^DRS DISABLED/.test(m)) return { text: "DRS 关闭", kind: "info" };
  if (/^OVERTAKE ENABLED/.test(m)) return { text: "超车模式开启", kind: "info" };
  if (/^OVERTAKE DISABLED/.test(m)) return { text: "超车模式关闭", kind: "info" };
  if ((x = m.match(/^MARSHALS ON TRACK AT TURN (\d+)/))) return { text: `${x[1]} 号弯有工作人员上赛道`, kind: "info" };
  if ((x = m.match(/^RECOVERY VEHICLE ON TRACK AT TURN (\d+)/))) return { text: `${x[1]} 号弯救援车上赛道`, kind: "info" };
  if ((x = m.match(/^TRACK SURFACE SLIPPERY IN TRACK SECTOR (\d+)/))) return { text: `第 ${x[1]} 赛段路面湿滑`, kind: "info" };
  if (/LAPPED CARS MAY NOW OVERTAKE/.test(m)) return { text: "被套圈赛车可超越安全车", kind: "sc" };
  if (/LAPPED CARS WILL NOT BE ALLOWED/.test(m)) return { text: "被套圈赛车不得超越安全车", kind: "sc" };
  if (/ALL CARS THROUGH THE PIT LANE/.test(m)) return { text: "全部赛车经维修区通过", kind: "info" };
  if (/ALL CARS USE START\/FINISH STRAIGHT/.test(m)) return { text: "全部赛车经起终点直道通过", kind: "info" };
  if (/ALL PASS HOLDERS MAY ACCESS THE PIT LANE/.test(m)) return { text: "维修区开放通行", kind: "info" };
  if (/LOW GRIP/.test(m)) return { text: "低抓地条件", kind: "info" };
  if (/NORMAL GRIP/.test(m)) return { text: "恢复正常抓地", kind: "info" };
  if (/AWNINGS MAY BE USED/.test(m)) return { text: "允许使用遮阳棚", kind: "info" };
  if (/CHANGE IN CLIMATIC CONDITIONS/.test(m)) return { text: "天气条件变化", kind: "info" };
  if (/WEATHER RADAR SYSTEM NOT AVAILABLE/.test(m)) return { text: "气象雷达暂不可用", kind: "info" };
  if (/WEATHER RADAR SYSTEM NOW OPERATIONAL/.test(m)) return { text: "气象雷达恢复", kind: "info" };
  if (/START ORDER: ORIGINAL GRID/.test(m)) return { text: "按原始发车顺序起步", kind: "session" };
  if (/^PIT LANE (ENTRY|EXIT)/.test(m)) return { text: message, kind: "info" };
  if (category === "Flag" && flag === "GREEN") return { text: "绿旗", kind: "green" };
  return { text: message, kind: "info" };
}
