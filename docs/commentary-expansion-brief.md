# 解说要点扩充实施说明

研究日期：2026-10-12（Asia/Shanghai）。本说明由深度分析阶段完成；产品实现交给 Sol。此次研究阶段未改动产品代码。配套机器稿为 [`commentary-expansion-seeds.json`](commentary-expansion-seeds.json)，含 21 个唯一主题、23 个来源页面；A18 已采用更保守的已核实版本。

目标是让解说员打开车手、车队、赛道、分站或赛季页，就有不同角度的事实可讲。保留现有卡片与全量展开，不新增折叠、条数上限或机械分栏。不建立 CMS、新闻抓取系统或运行时 LLM。

## 1. 已核实的现状与优先问题

- 现有四类 `notes.*.json` 共 546 条：车手 137、车队 64、赛道 147、赛季 198。条数已经不少，缺的是内容角度与时效边界。
- `lib/talk.ts` 主要生成成绩、排名、里程碑、历史纪录；`content/drivers.*.json` 已有不少独立轶事，不能直接复制后在同页重复显示。
- `TalkingPoints.tsx` 的 `ORDER.indexOf()` 对新增标签会返回 -1，导致所有未知标签都排最前。现有去重依赖数字和字串重叠，容易把不同角度误判为相同内容。
- 分站没有独立策展入口；未赛页面使用整个赛道的 `circuitTalk` 与赛道 notes，不能准确区分“本届前瞻”和“赛道历史”。
- 研究时读取的 `data/f1db.db` 已包含 2026 R17 新加坡（2026-10-11，维斯塔潘夺冠）；下一站是 R18 美国（2026-10-25，austin）。静态稿仍有“维斯塔潘还没赢过新加坡”“新加坡迎来第250场”“本周新加坡”“安东内利领先84分”等旧断言，需要先修正。
- `lib/memo.ts` 的 30 分钟缓存没有数据库版本维度；数据库更新后解说数字仍可能晚半小时。随数据库 revision 失效是此次必要的关联修复。
- `components/unit/yearTalk.ts` 按年份与中文姓氏筛选，不应把人物故事为了进入当前页而改成错误的事件年份。
- 分站 brief 仍用首条“故事线”和 `seasonNotes.slice(0, 6)`，新维度若只接主组件可能漏掉赛前简报。此次应检查所有解说入口，并遵守已经确定的全量展开要求。

## 2. 内容维度与对象归属

维度表示“讲什么”，标签表示呈现时的一小段中文说明。旧有“数字、最近一次、纪录”是表达形式，不足以承担内容分类。可在 Note 增加一个稳定的 `dimension`，保持 `tag` 兼容。

| 维度 | 可用中文标签 | 主要内容 | 主归属 / 可关联 |
| --- | --- | --- | --- |
| performance | 近期状态、队内对比、冠军形势 | 状态变化、争冠条件、队友竞争；数字支持故事 | 车手、车队、赛季 / 当前或下一分站 |
| personality | 场外故事 | 爱好、求学、成长、慈善、公开跨界活动 | 车手 / 事件相关车队、分站 |
| relationships | 人物关系 | 师徒、队友、车手与工程师、可核实的公开交往 | 相关车手 / 车队 |
| career | 职业动向 | 官宣合同、转会、管理层变化；区分官宣与本人表态 | 车手或车队 / 赛季 |
| visual | 新涂装、特别头盔 | 色彩、图案位置、设计由来、具体使用分站 | 车队或车手 / 指定分站、赛道、赛季 |
| tech | 技术变化、策略看点 | 升级、轮胎、能量管理、规则与驾驶影响 | 车队、赛季 / 分站、赛道 |
| weekend | 周末前瞻、驾驶看点 | 本届赛制、赛道关键位置、待观察问题、上一站带来的悬念 | 分站 / 赛道、相关车手车队 |
| heritage | 历史回声、冷知识、里程碑 | 与本届话题有关的历史、地域文化与纪录 | 五类对象均可 |

每条只承载一个话题，用“具体事实 + 可以讲下去的关系或观察点”写成 40–120 字中文。不给每个对象强行补齐八个维度。车手页优先有人物温度，车队页优先技术/视觉/人员，赛道页优先驾驶与历史，分站页优先当届前瞻或赛后后续，赛季页优先规则与整体叙事。

独立故事只保存一份，通过关联对象复用。不要给每位车手复制相同的赛历介绍，也不要在赛季页无差别汇总全部车手花边。已有 anecdotes 若迁入解说区，需要从同页原模块去重；更小的实施范围是保留原轶事，先加入下面的新角度。

## 3. 可交付的数据与时效设计

### 最小数据增量

保持原 `Note` 的 `title/text/year/gp/circuit/sources`。建议增加可选字段：

```ts
type EditorialDimension = "performance" | "personality" | "relationships" | "career" | "visual" | "tech" | "weekend" | "heritage";
type NoteMeta = {
  id?: string;                 // 同一条事实的稳定键，不从标题临时生成
  topic?: string;              // 用于策展/自动项的语义去重；不是简单的“合同”大类
  dimension?: EditorialDimension;
  publishedAt?: string;        // 原页面发布日期；原页无日期则留空
  verifiedAt?: string;         // 本次实际核实日期，不能伪装成事件发生日期
  eventDate?: string;
  race?: { year: number; round: number };
  related?: { drivers?: string[]; teams?: string[]; circuits?: string[]; seasons?: number[]; races?: string[] };
  temporal?: "evergreen" | "event" | "preview" | "snapshot";
  validFrom?: string;
  validUntil?: string;
  asOfRace?: { year: number; round: number };
  status?: "confirmed" | "statement" | "analysis";
};
```

这是建议形状，可以压缩字段；无需为字段本身建设管理界面。`id` 与 `topic` 可先只保留一个稳定事实键。独立分站文件使用 `notes.races.json`，键为 `2026/17`、`2026/18` 等，并提供 `notes.race(year, round)`。多页关联可由统一解析函数处理，避免在每个页面重新拼数组。

### 时间规则

1. `year` 是事实发生年和实体链接的年份，不能为了在 2026 页出现而把 2025 的 Met Gala 填成 2026。原始发布时间、核实时间与适用比赛是不同概念。
2. `evergreen`：稳定的成长/兴趣故事，保留事件年份，不做短期失效。表述“2024 年采访时谈到……”比“他一直……”稳妥。
3. `event`：日期明确的已发生事件，例如 2026 新加坡特别涂装。赛后仍可在该站与相关对象档案中全量展示，但写“2026 新加坡站采用了”，不可继续写“本周将使用”。
4. `preview`：绑定具体分站。比赛结束后不进入当前前瞻；历史分站可以保留明确标为当时赛前信息的稿件，或由事件稿替代。过期保护不是重新加入折叠。
5. `snapshot`：积分、场次、距首胜多久、现役未胜、待达里程碑等必须带截至比赛。数据库可算的优先迁到 `Talk`，随当前数据库刷新。旧稿只能改为“截至2026雪邦站……”的历史观察，不可给整篇混合文本机械加前缀后仍保留“下一站”断言。
6. 历史年份/时期页不应读取未来新闻。旧日期事件可在车手生涯主页出现，不应无条件投放所有后续年份。
7. `status=statement` 表示“当事人确实这样说过”，不表示其预测已成事实。合同优先写车队正式公告；“多年合同”不能自行补齐截至年份。此次种子不需要传闻。
8. 不抓取网页来决定每次页面渲染。策展稿有日期和过期保护，编辑后发布；成绩、冠军形势、下一站历史表现由数据库与赛历自动计算。数据库更新不等于新闻自动更新。

### 排序、去重、来源

- 先按适用比赛/明确的 editorial priority 排序，再结合事件日期；头部自然混合比赛、人物、视觉角度即可，不分八个机械栏目。不截断总条数。
- 精确 `id/topic` 去重优先；旧字串相似度只作兼容兜底，不能因同一个数字删除不同主题。
- 新标签必须有已知顺序或安全 fallback，不能靠 `indexOf=-1` 抢首位。
- 保留来源页链接；多来源可显示紧凑的“F1 官方 · 10月5日”等。复制稿应同时带来源、日期和当事人表态标识，不能只复制无出处正文。
- 新涂装先用文字与官方图集链接即可。本次不扩展视觉模块；若复用已有配图能力，图片须明确对应本届分站，不能拿基本涂装冒充特别版。

## 4. 第一批实施范围

1. 完成兼容字段、统一筛选/关联/去重及数据库 revision 缓存失效。
2. 增加独立分站 notes 和 `racePreview`：由当前比赛上下文计算周末格式、争冠数学条件、近期走势、针对目标赛道的历史回声。不要把整个积分榜重写成卡片；冠军条件必须采用本季积分/剩余冲刺规则，无法严格计算时不输出。
3. 清理当前 2026 车手、车队、赛季及新加坡/奥斯汀赛道 notes 的过时断言；尤其是维斯塔潘新加坡未胜、仍在等第250场、本周新加坡、旧积分差。保留事实成立且日期清楚的历史内容。
4. 落地本文件已核实的新增草稿，优先人物、合同、三条涂装及新加坡赛后；美国站前瞻以官方赛历和数据库事实为底座。每条在相应对象或分站出现即可，不要求全部塞进赛季页。
5. 涵盖 `/drivers/*`、`/teams/*`、`/circuits/*`、`/seasons/2026`、`/races/2026/17`、`/races/2026/18` 与分站 brief；现有卡片保持全量可读。

并行任务边界：主代理正处理赛道年份列表的未举办样式。Sol 不得修改 `components/season/YearRail.tsx` 或 `components/season/rail.module.css`。

本批共有 21 条可落地主题；A08/A09 是对已有单薄话题的更新替换，其他为新增角度。可优先完成这批和时效修复，不继续扩大搜索。题目长度可在落库时压缩，事实和来源边界必须保留。

## 5. 本次实际打开并核实的种子稿

以下草稿均于 2026-10-12 核实。发布时仍需用本地 F1DB 验证与 F1 正赛有关的数字和实体键；不要照抄来源页的其他、未核对的统计。`event` 文案按已发生状态写，避免今天/最近等漂移词。

### A01 奥迪：把新加坡纹样穿上车

- 标签/维度：新涂装 / visual；状态 confirmed；temporal event。
- 归属：team `audi`；关联 race `2026/17`、circuit `marina-bay`；year 2026、gp `singapore`。
- 发布时间 2026-10-05；适用 2026 新加坡限定，不能投放为美国站正在使用的涂装。
- 草稿：`奥迪为2026年新加坡站推出特别涂装，把土生华人传统纹样放在R26的侧箱和尾翼，霍肯伯格、博托莱托的赛服也同步采用。配色以新加坡从白昼进入暮色为灵感，这次变化可以从赛车一路看到车手身上。`
- [F1 官方图集](https://www.formula1.com/en/latest/article/gallery-audi-unveil-special-livery-for-singapore-grand-prix.5Z07QWFA7vVqCPC1jb6AIq)。正文明确 one-off、图案位置和赛服；不必臆测性能收益。

### A02 哈斯：哥斯拉来到铃鹿

- 新涂装 / visual；confirmed；event。team `haas`；race `2026/3`、circuit `suzuka`；year 2026、gp `japan`。
- 发布时间 2026-03-24。
- 草稿：`2026年日本站，哈斯把哥斯拉图案带上VF-26，并在东京由奥康、比尔曼和小松礼雄一起揭幕。这是车队首次与娱乐IP合作，也是与东宝全年合作的开场；对拥有丰田冠名伙伴的哈斯，日本站多了一层主场意味。`
- [哈斯官方日本站预览](https://www.haasf1team.com/news/japanese-grand-prix-race-preview)。全年合作不代表全年都使用这套特别涂装。

### A03 威廉姆斯：一条线接回冠军年代

- 涂装故事 / visual；confirmed；event。team `williams`，year 2026；gp/circuit null。
- 发布时间 2026-02-03。
- 草稿：`威廉姆斯2026年FW48以亮面蓝色为主，侧箱、前翼和尾翼加入更多白色。车身上的红白细线呼应FW14B和FW18的冠军涂装：远看是新赛车，近看仍能找到曼塞尔和达蒙·希尔年代的线索。`
- [F1 官方发布报道](https://www.formula1.com/en/latest/article/first-look-williams-show-off-their-new-livery-for-2026-f1-season.4tY1qBa2lWI35hqxV6AH1g)。这是赛季基础涂装发布史，不应暗示每站无特别版替换。

### A04 诺里斯：续约还附赠冠军赛车

- 职业动向 / career；confirmed；event。driver `lando-norris`、team `mclaren`，year 2026；gp/circuit null。
- 发布时间/事件日期 2026-08-29。
- 草稿：`2026年8月，诺里斯在迈凯伦工厂的亲友开放日亲自宣布续约，合同至少延续至2030年底。车队还宣布将赠给他一辆2025年夺冠赛季使用的MCL39，给这次长期承诺留下一件能摸得到的纪念。`
- [迈凯伦官方续约公告](https://www.mclaren.com/racing/formula-1/2026/lando-norris-contract-extension-2030/)。截至来源发布时是将赠送，勿改成“已经运回家”。

### A05 汉密尔顿：走到红毯的另一侧

- 场外故事 / personality；confirmed；event。driver `lewis-hamilton`，year 2025，gp/circuit null。
- 发布时间 2025-05-16；事件日期 2025-05-05。
- 草稿：`2025年Met Gala，汉密尔顿以联合主席身份参与这场时尚盛会。他与设计师Grace Wales Bonner共同打造象牙白礼服，把家族与文化背景融进细节；围场里的穿搭兴趣，在这里成了一次有明确主题的合作。`
- [F1 官方本人采访](https://www.formula1.com/en/latest/article/hamilton-reflects-on-really-special-moment-as-co-chair-of-2025-met-gala.4WtmIKncsWEmVfaVHCzxrd)。不可填 year 2026；这是公开职业跨界，不涉及私人传闻。

### A06 安东内利：墙上的接班人留言

- 人物关系 / relationships；statement；event。driver `kimi-antonelli`；关联 `lewis-hamilton`、team `mercedes`；year 2025，gp/circuit null。
- 发布时间/表态日期 2025-05-15。
- 草稿：`2025年伊莫拉站前，安东内利谈到汉密尔顿留在车手房间里的留言：里面既有鼓励，也有建议。他说自己把留言留在墙上，每次走进房间都能看到。对刚接下梅赛德斯席位的新秀，这是前任留下的一份支持。`
- [FIA 官方发布会文字实录（F1 官网）](https://www.formula1.com/en/latest/article/fia-thursday-press-conference-emilia-romagna-2025.4EF0llxwXDasDqbv4hW2nV.4EF0llxwXDasDqbv4hW2nV)。只转述其公开谈及的意义，不虚构信的原文。

### A07 维斯塔潘：红牛车手的另一台赛车

- 场外故事 / personality；confirmed；event。driver `max-verstappen`；year 2026；gp/circuit null（纽北耐力赛不是 F1 分站）。
- 发布时间 2026-05-18；事件日期 2026-05-17。
- 草稿：`2026年5月，维斯塔潘首次参加纽博格林24小时赛，驾驶的是梅赛德斯AMG GT3。他的车组一度领跑，后来遭遇传动轴故障而退出争胜。F1周末之外，他已经把对耐力赛的兴趣带进了另一种比赛。`
- [F1 官方赛后图集与报告](https://www.formula1.com/en/latest/article/gallery-verstappen-makes-nurburgring-24-hours-debut.55Q7Aybsm6zpWdS8qVAq1A)。这是 2026 的新事件，和已有 2025 GT3 首秀获胜/化名测试分别处理。

### A08 美国站：重新有三节练习

- 周末前瞻 / weekend；confirmed；preview。race `2026/18`、circuit `austin`；year 2026、gp `united-states`。
- 官方动态赛事页，无单独发布日期；verifiedAt 2026-10-12。比赛日 2026-10-25。
- 草稿：`2026年美国站采用常规周末：周五两节练习，周六先练习再排位，周日正赛。来到奥斯汀，车队重新有三节练习调整赛车；看长距离表现和调校选择时，也要记得这与新加坡的一练冲刺周末不同。`
- [F1 官方美国站赛程](https://www.formula1.com/en/racing/2026/united-states)。官方确认三练排位正赛；后半句是解释赛制的观察角度。应合并/替换现有 austin 的“2026年告别冲刺赛”，避免重复。具体开始时间用现有赛历和时区计算。

### A09 诺里斯：和童年偶像站上阳台

- 人物关系 / relationships；confirmed；event。driver `lando-norris`；year 2026，gp/circuit null。
- 发布时间 2026-07-13。
- 草稿：`2026年古德伍德速度节，诺里斯先驾驶迈凯伦赛车完成爬山展示，随后与罗西一同站上古德伍德庄园阳台。过去在采访里谈起的偶像，这次成了身旁一起向车迷挥手的人，赛车之外的联系也有了新的画面。`
- [F1 官方速度节回顾](https://www.formula1.com/en/latest/article/from-norris-and-rossi-to-hills-williams-reunion-the-top-5-highlights-from-the-goodwood-festival-of-speed.5Hpi6iewEgteFPjD9Hsb43)。可替换现有“偶像是罗西”的单一事实稿；正文不必加入 F1 以外赛事冠军次数，避免未交叉核对的冗余数字。

### A10 汉密尔顿：错过进站后的一停决定

- 策略复盘 / tech；statement；event。driver `lewis-hamilton`、team `ferrari`；race `2026/17`、circuit `marina-bay`；year 2026、gp `singapore`。
- 发布时间 2026-10-11 16:42 UTC。事件长期有效，作为近期故事到美国站后降优先级。
- 草稿：`2026年新加坡站，汉密尔顿用中胎起步，随后率先换上软胎。虚拟安全车期间，车队叫他进站，但他错过入口后决定留在赛道保住位置。末段轮胎衰退让他连丢三位，赛后他承认这是自己的决定，并向车队道歉。`
- [F1 官方赛后采访](https://www.formula1.com/en/latest/article/a-painful-lesson-hamilton-apologises-as-he-takes-responsibility-for-strategy-gamble-in-singapore.6NUbQvdet1DQa5ElDtonw1)。不要改成单方面“法拉利策略失误”。本地 F1DB 已核对汉密尔顿本站正赛第六。

### A11 迈凯伦：碰撞未罚，车队仍要追问

- 队内关系 / relationships；statement；event。team `mclaren`；关联 `lando-norris`、`oscar-piastri`、race `2026/17`；year 2026、gp `singapore`、circuit `marina-bay`。
- 发布时间 2026-10-10 18:18 UTC。
- 草稿：`2026年新加坡冲刺赛最后一圈，诺里斯与皮亚斯特里相撞。干事认定双方都不承担全部或主要责任，没有处罚，但斯特拉认为事故造成了实质损失，不能接受。他在赛后强调车队利益优先，并表示还会与两位车手讨论如何避免重演。`
- [F1 官方斯特拉采访](https://www.formula1.com/en/latest/article/it-is-serious-stella-disappointed-by-norris-and-piastris-clash-in-singapore-sprint.7hW2cxQgohHZfu4wgvtfRQ)。不由此推断私交或“内斗”；“将讨论”写成当时表态。与已有 2025 年碰撞明确区分。

### A12 梅赛德斯：新旧套件对照有了结果

- 技术变化 / tech；statement；preview。主归属 team `mercedes`；关联 `kimi-antonelli`、race `2026/18`。year 2026；故事发生背景为 `singapore` / `marina-bay`，适用前瞻为 `united-states` / `austin`，不要用同一字段把二者混在一起。
- 车队报告对应 2026-10-11 正赛；F1 同文引述发布日期 2026-10-11 17:19 UTC。作为前瞻在美国站首练后需复核；若没有复核，保留日期明确的赛后事件事实。
- 草稿：`梅赛德斯在2026年新加坡站用两辆车对照新旧套件。赛后工程主管舒夫林表示，周末结束时，安东内利使用的套件已明显更快。安东内利也认为赛车仍未处于理想调校窗口，希望在奥斯汀进一步释放升级的潜力。`
- [梅赛德斯官方赛后报告](https://www.mercedesamgf1.com/reports/race-report-fighting-sunday-in-singapore-nets-podium-for-kimi-and-points-with-george)、[F1 官方赛后引述](https://www.formula1.com/en/latest/article/what-the-teams-said-race-day-in-singapore-2026.3lLHolVW3aIRAl7Ohxlxf6)。不能写“美国站已确认更快”或“美国站一定有新升级”。

### A13 新加坡：硬胎为何无人选择

- 轮胎策略 / tech；confirmed（使用事实）与供应商解释；event。race `2026/17`、circuit `marina-bay`；year 2026、gp `singapore`。
- 发布时间 2026-10-11 17:12，Europe/Amsterdam。
- 草稿：`2026年新加坡正赛只用到了软胎和中胎，没有车手选择硬胎。倍耐力解释，中胎已几乎没有明显衰退，硬胎却少了抓地力，难以带来策略收益。软胎则能维持很长的赛段，汉密尔顿同一套软胎累计跑了44圈。`
- [倍耐力官方新加坡复盘](https://press.pirelli.com/max-rules-in-singapore-en-plein-with-a-one-stop-strategy/)。本页明确 44 圈与只用 soft/medium；本场轮胎表现不得泛化为其他赛道。若最终正文需要更精简，可删 44 圈，保留选择背后的原因。

### A14 美国站：硬胎重新进入讨论

- 周末前瞻 / weekend（或 tech）；confirmed；preview。race `2026/18`、circuit `austin`；year 2026、gp **`united-states`**（本地键不是 `usa`）。
- 发布时间 2026-10-09 09:57，Europe/Amsterdam。比赛结束后退出当前前瞻；历史页保留发布时选择或转成实际使用复盘。
- 草稿：`倍耐力确认，2026年美国站使用C2硬胎、C3中胎和C4软胎。去年奥斯汀选用C1硬胎，但车队更多使用两款较软配方。今年硬胎改选C2，中胎和软胎编号保持不变，值得关注硬胎会不会重新进入策略。`
- [倍耐力官方美洲三站轮胎公告](https://press.pirelli.com/the-compound-selection-for-austin-mexico-city-and-so-paulo/)。最后一句是观察点；不同年度轮胎配方不作直接性能量化比较。此来源也确认墨西哥与圣保罗为 C3/C4/C5，可由同一条配置支持后续前瞻，不必此刻再扩三篇相似文案。

### A15 Racing Bulls：三人竞争两个席位

- 职业动向 / career；statement；snapshot，asOf 2026-10-11。team `racing-bulls`；关联 `liam-lawson`、`arvid-lindblad`；year 2026，gp/circuit null。
- 发布时间 2026-10-11 06:08 UTC。建议 2026-10-22 美国站媒体日前到期复核；届时如无新资料只能显示这次历史表态，不能继续冒充阵容未定的实时结论。
- 草稿：`2026年新加坡周末，Racing Bulls领队佩尔曼表示，2027年阵容将在未来几周决定，但没有给出具体日期。劳森和林德布拉德之外，F2车手尼古拉·佐洛夫也在考虑之中。车队既看眼前速度，也要考虑年轻车手的发展。`
- [F1 官方佩尔曼采访](https://www.formula1.com/en/latest/article/permane-states-racing-bulls-will-select-their-2027-driver-line-up-in-the-coming-weeks.39Cso2HINAEU5KViOulOZb)。这是可归因的领队表态，不是已签约或确定换人；佐洛夫若不在 F1DB 不强行构造详情链接。

### A16 诺里斯：驾驶从割草机开始

- 场外故事 / personality；statement；evergreen。driver `lando-norris`；year 2024（公开回忆年），gp/circuit null。
- 发布时间 2024-09-08。
- 草稿：`诺里斯在2024年的官方访谈中说，自己小时候每天主动剪草，只为能开家里的割草机。但他体重太轻，触发不了启动装置，只好搬来哑铃垫在座椅上再坐上去。他笑称，自己的驾驶故事就是从割草机开始的。`
- [F1 官方人物访谈](https://www.formula1.com/en/latest/article/getting-to-know-the-real-lando-norris.2EVseCJNzII9R4XSJRMLzT)。这是一段已公开回忆，不把访谈年误写为童年发生年。

### A17 勒克莱尔：午饭聊出的冰淇淋品牌

- 场外故事 / personality；confirmed；event。driver `charles-leclerc`；year 2024，gp/circuit null。
- 发布时间 2024-04-11。
- 草稿：`勒克莱尔原本想在家乡蒙特卡洛开一家冰淇淋店，午饭时把这个想法告诉了朋友。后来，他与Grom的两位创办人及经纪人尼古拉·托德一起推出LEC品牌。这个2024年问世的项目，起点就是他对冰淇淋的喜爱。`
- [勒克莱尔本人官网的项目介绍](https://charlesleclerc.com/en/news/charles-leclerc-federico-grom-guido-martinetti-and-nicolas-todt-together-for-a-great-project-irresistible-ice-cream-that-overcomes-feelings-of-guilt-lec-why-resist/)。不推断当前经营状况，也不照抄健康功效宣传。

### A18 阿尔本：头盔在赛后继续帮忙

- 头盔故事 / visual（或 personality）；confirmed；event。driver `alexander-albon`；year 2025、gp `singapore`、circuit `marina-bay`。
- 原公告 2025-10-01；F1 官方回顾 2026-03-23。日期与年份仍按 2025 事件。
- 草稿：`阿尔本把2025年新加坡站的特别版头盔捐出，支持联合国儿童基金会在泰国的项目。头盔由插画家Karlotta Freier设计，融入泰国与亚洲元素。拍卖希望支持当地儿童的教育、保护和心理健康服务，让比赛装备在赛后继续发挥作用。`
- [F1 官方公益回顾](https://www.formula1.com/en/latest/article/how-albon-is-writing-the-latest-chapter-in-southeast-asias-f1-story.2rR5O22JOxDK9tRq5SgGDF)、[官方拍卖实物页](https://us.f1authentics.com/products/alex-albon-2025-signed-race-used-helmet-singapore-gp)。[UNICEF 原公告](https://www.unicef.org/thailand/press-releases/formula-1-driver-alex-albon-donates-singapore-grand-prix-helmet-support-unicefs-work)重开偶发超时；设计/项目细节如前两个成功打开页面未充分支持，落库时删去相应细节，只保留已交叉确认的头盔公益拍卖事实。不要填写成交额或仍在开放拍卖。

### A19 塞恩斯：领奖时摔了高尔夫奖杯

- 场外故事 / personality；confirmed；event。driver `carlos-sainz-jr`；year 2023、gp `las-vegas`、circuit `las-vegas`。
- 发布时间 2023-11-15；事件日期 2023-11-14。
- 草稿：`2023年拉斯维加斯大奖赛前，塞恩斯与高尔夫球手贾斯廷·托马斯搭档，赢下首届Netflix杯。他们先击败诺里斯组合，再在决胜环节战胜加斯利组合。领奖时出了个小插曲：塞恩斯失手把奖杯掉到地上，奖杯当场摔坏。`
- [F1 官方活动报道](https://www.formula1.com/en/latest/article/carlos-sainz-and-justin-thomas-score-victory-at-the-inaugural-netflix-cup-in.1S375lfKynq6p3Y2ipH7ok)。与已有 GPDA 理事、拉力冠军父亲的条目不重复。

### A20 博塔斯：赛车之外的十年冰球

- 场外故事 / personality；statement；evergreen。driver `valtteri-bottas`；year 2020（公开回忆年），gp/circuit null。
- 发布时间 2020-09-27。
- 草稿：`博塔斯在2020年接受F1官方采访时说，如果不当赛车手，他会想成为冰球运动员。小时候，冰球是他仅次于卡丁车的第二大爱好，他在冬季参加过十年的冰球比赛。这是赛车之外，另一项从小认真投入过的运动。`
- [F1 官方人物访谈](https://www.formula1.com/en/latest/article/punk-rock-and-pizzas-getting-to-know-the-real-valtteri-bottas.46gSAuC9ASQrZ2rIuL1hmZ)。不加入本次未查证的球队投资或持股状态。

### A21 阿隆索：给学生上一堂赛车课

- 场外故事 / personality；confirmed；event。driver `fernando-alonso`，可关联 team `aston-martin`；year 2024；gp/circuit 可留 null，活动在奥维耶多，不在巴塞罗那赛道上。
- 发布时间 2024-06-19。
- 草稿：`2024年西班牙大奖赛前，阿隆索在家乡奥维耶多接待了30多名西班牙学生。活动地点是以他命名的博物馆和卡丁车场，学生先参加科学与工程工作坊，再体验卡丁车；德拉罗萨和杰西卡·霍金斯也来到现场与学生交流。`
- [阿斯顿·马丁官方活动记录](https://www.astonmartinf1.com/en-GB/news/announcement/inspiring-the-next-generation-with-fernando-and-aramco-ahead-of-the-spanish-gp)。不写成常设课程或持续承诺。

## 6. 补充实现边界

- 本地 F1DB 交叉核验：日本 2026 R3（suzuka）；新加坡 R17（marina-bay）；美国 R18（austin）。美国 `gp` 必须为 `united-states`，不是来源常用的 `usa`；2024 巴塞罗那站 `gp` 为 `spain`。
- 新加坡和美国技术文章可能同时涉及“事件发生比赛”和“下一站目标”。`gp/circuit` 定位事实背景，`race/related.races` 定位前瞻投放；如果字段更精简，须在文案和调用处明确这两个维度，避免把新加坡的升级测试误记在美国赛果中。
- 前瞻失效优先依据目标比赛/节次结束状态，不用 YYYY-MM-DD 的零点提前失效。需要硬截止日期时使用明确时区，测试跨午夜的美国赛程。
- 自动解释不要将“近五场退赛多”直接等同于“安全车概率高”，也不要将历史杆位转化率写成因果定律；退赛数据不包含事故与安全车机制，观察角度应保持准确。
- `racePreview` 必须以传入目标分站为参数，不能在用户打开墨西哥/圣保罗前瞻时仍读取全局下一站奥斯汀。当前进度来源应复用已有 raceStatus/f1/live 的已验证入口，避免新增另一套“缺结果就是下一站”的规则。
- 校验脚本现有的最终摘要没有在发现错误时明显退出失败；扩展时让真正的来源/引用/日期错误返回非零状态，以便测试能阻止坏稿发布。

## 7. 验收要求

- 内容：新增明确覆盖人物、关系/职业动向、视觉、周末/技术，至少有三个不同车队的涂装故事；所有新增事实有本次打开的官方或当事方来源，来源日期与事件年份不混淆。
- 时效：以 2026-10-12 上下文渲染时，新加坡读作已完成，美国是下一站；不再出现维斯塔潘新加坡未胜或旧赛前里程碑。数据库 revision 更新后，自动解说不等待旧的 30 分钟 memo。
- 上下文：2025 或更早历史页不混入 2026 新稿；奥迪新加坡限定涂装不成为奥斯汀当届涂装；分站前瞻使用目标分站而非全局下一站的历史。
- 去重：新稿与同页 anecdotes/highlights 不双显；不同维度不会仅因包含同一数字被误删；重复关联的同一条稿件只出现一次。
- 体验：现有全量展开持续生效，不增加“更多”截断。桌面和窄屏实页检查现有卡片、来源、复制、跳转。
- 校验：扩展 `validate-content.mjs` 覆盖新分站文件、元数据日期、唯一键、实体/赛历引用与来源；对 expiry、历史 context、数据库 revision 和目标分站选择做少量行为测试，再运行既有测试和构建。无需给每一条中文文案写镜像测试。
- 交付说明必须如实区分：成绩/前瞻计算会随数据库更新，中文策展新闻不会因为数据库更新而自动抓取。
