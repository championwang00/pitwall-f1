/** Chinese names for Grand Prix ids (F1DB grand_prix.id). */
export const GP_ZH: Record<string, string> = {
  "great-britain": "英国", italy: "意大利", monaco: "摩纳哥", belgium: "比利时", germany: "德国", france: "法国",
  spain: "西班牙", canada: "加拿大", brazil: "巴西", "united-states": "美国", hungary: "匈牙利", australia: "澳大利亚",
  japan: "日本", austria: "奥地利", netherlands: "荷兰", "san-marino": "圣马力诺", mexico: "墨西哥城", europe: "欧洲",
  "south-africa": "南非", bahrain: "巴林", argentina: "阿根廷", china: "中国", malaysia: "马来西亚", portugal: "葡萄牙",
  "abu-dhabi": "阿布扎比", singapore: "新加坡", indianapolis: "印第安纳波利斯 500", azerbaijan: "阿塞拜疆", turkey: "土耳其",
  russia: "俄罗斯", "united-states-west": "美国西部", detroit: "底特律", sweden: "瑞典", switzerland: "瑞士",
  "emilia-romagna": "艾米利亚-罗马涅", miami: "迈阿密", "sao-paulo": "圣保罗", "saudi-arabia": "沙特阿拉伯", korea: "韩国",
  qatar: "卡塔尔", india: "印度", "las-vegas": "拉斯维加斯", "caesars-palace": "凯撒宫", luxembourg: "卢森堡",
  pacific: "太平洋", styria: "施泰尔马克", "70th-anniversary": "70 周年", "barcelona-catalunya": "巴塞罗那-加泰罗尼亚",
  dallas: "达拉斯", eifel: "艾菲尔", morocco: "摩洛哥", pescara: "佩斯卡拉", sakhir: "萨基尔", tuscany: "托斯卡纳",
};

export const gpZh = (id: string) => (GP_ZH[id] ?? id) + (id === "indianapolis" ? "" : "大奖赛");

/** Chinese names for frequently shown constructors not on the 2026 grid. */
export const TEAM_ZH: Record<string, string> = {
  mercedes: "梅赛德斯", ferrari: "法拉利", mclaren: "迈凯伦", "red-bull": "红牛", "racing-bulls": "小红牛", alpine: "阿尔派",
  haas: "哈斯", audi: "奥迪", williams: "威廉姆斯", "aston-martin": "阿斯顿·马丁", cadillac: "凯迪拉克",
  lotus: "莲花", brabham: "布拉汉姆", tyrrell: "泰勒尔", cooper: "库珀", benetton: "贝纳通", brawn: "布朗",
  renault: "雷诺", jordan: "乔丹", minardi: "米纳尔迪", sauber: "索伯", "toro-rosso": "红牛二队", "force-india": "印度力量",
  "racing-point": "赛点", alphatauri: "阿尔法托利", "alfa-romeo": "阿尔法·罗密欧", march: "马奇", ligier: "利吉尔",
  vanwall: "范沃尔", brm: "BRM", matra: "马特拉", bar: "BAR", honda: "本田", toyota: "丰田", jaguar: "捷豹",
  stewart: "斯图尔特", maserati: "玛莎拉蒂", "lotus-f1": "路特斯", "rb": "RB", "kick-sauber": "Kick 索伯", prost: "普罗斯特",
  arrows: "箭头", footwork: "Footwork", "spyker": "世爵", "super-aguri": "超级亚久里", "manor": "马诺", virgin: "维珍", marussia: "马鲁西亚",
  caterham: "卡特汉姆", hrt: "HRT", "lotus-racing": "莲花车队",
};

export const ENGINE_ZH: Record<string, string> = {
  mercedes: "梅赛德斯", ferrari: "法拉利", honda: "本田", renault: "雷诺", "red-bull-ford": "红牛-福特", audi: "奥迪",
  "red-bull": "红牛", ford: "福特", cosworth: "考斯沃斯", bmw: "宝马", toyota: "丰田", tag: "TAG", porsche: "保时捷",
};

export const NAT_ZH: Record<string, string> = {
  "united-kingdom": "英国", netherlands: "荷兰", germany: "德国", spain: "西班牙", france: "法国", italy: "意大利",
  monaco: "摩纳哥", australia: "澳大利亚", "new-zealand": "新西兰", canada: "加拿大", mexico: "墨西哥", finland: "芬兰",
  thailand: "泰国", japan: "日本", china: "中国", argentina: "阿根廷", brazil: "巴西", denmark: "丹麦", "united-states": "美国",
  sweden: "瑞典", austria: "奥地利", belgium: "比利时", switzerland: "瑞士", "south-africa": "南非", poland: "波兰",
  russia: "俄罗斯", colombia: "哥伦比亚", venezuela: "委内瑞拉", portugal: "葡萄牙", ireland: "爱尔兰", india: "印度",
  indonesia: "印度尼西亚", malaysia: "马来西亚", hungary: "匈牙利", "czech-republic": "捷克", uruguay: "乌拉圭",
  chile: "智利", rhodesia: "罗得西亚", liechtenstein: "列支敦士登", singapore: "新加坡", azerbaijan: "阿塞拜疆",
  bahrain: "巴林", qatar: "卡塔尔", "saudi-arabia": "沙特阿拉伯", "united-arab-emirates": "阿联酋", turkey: "土耳其",
  "south-korea": "韩国", morocco: "摩洛哥", portugal2: "葡萄牙",
};

/** A result gap in Chinese: "+1 Lap" / "+2 laps" → "+1 圈" / "+2 圈"; time gaps pass through unchanged. */
export const gapZh = <T extends string | null | undefined>(g: T): T =>
  (typeof g === "string" ? g.replace(/^\+?(\d+)\s*laps?$/i, "+$1 圈") : g) as T;
