# PITWALL 信息架构定稿（IA Spec v5）

> 作者：Fable 5.1（产品 / IA）。执行：Opus 5.5。日期：2026-10-09。
> 依据：用户 24 条输入（`scratchpad/user-inputs.md` 1–14，口述 15–24）、README、design-log、当前站点实测截图（`/`、`/live`、`/live?year=2024`、`/seasons/2024`、`/seasons/2026/era`、`/seasons/1988/circuits`、`/races/2024/1`、`/races/2026/16`、`/circuits/monaco`、`/drivers/lewis-hamilton`、`/teams/ferrari`、`/brief`）。
> 本文是唯一的结构真相；与 README 冲突以本文为准，实施完成后再回写 README。**读本文先读 §0.5（站点结构 v5）——它是全站的树、每页的落点与面包屑；再读 §1.2（年份栏）——它是全站唯一的时间控件。** v3 相对 v1：加入**时代层**（输入 16）、**恢复被删页面**（输入 16）、**大卡片设计规则**（输入 17）、**左栏是唯一的年份控件**（输入 18）、**照片必须符合年代**（输入 19）。v4 相对 v3：年份栏成为栏目 / 主体感知的（输入 20）；hover 全站统一为下划线（输入 23）。**v5 相对 v4（输入 24「整个导航结构非常混乱 … 回放应该是当年的 2 级页面 … 要有面包屑去做导航和定位 … 现在这些页面都不要漏掉」）：新增 §0.5 站点结构——每页恰有一个顶栏落点、每个非根页有面包屑；回放从 `/live?year=` 迁到 `/seasons/Y/replay`，解说手册迁到 `/races/Y/R/brief`，`/calendar` 归「实时」只管本赛季；年份栏去掉栏头只剩时间线；所有旧 URL 重定向、一页不删。** §1–§6 中与 §0.5 冲突的句子已按 v5 改写并标「v5」。

---

## 0. 用户要的到底是什么（底层模型）

把 17 条输入压成一句话：**一个以「年份 × 赛道 × 车手 × 车队」为坐标轴的数据立方体，任何页面都是立方体的一个切片；时间轴有两级刻度——时代 → 年份；年份是全局的、常驻的、唯一的时间旋钮，它是叠在现有单元页之上的一层，而不是替换它们；「实时」只是这个立方体在"当前年份 · 此刻"的那一格。**

七条公理，后面所有决定都从这里推出来：

| # | 公理 | 来源（用户输入） |
|---|---|---|
| A1 | 四个基础单元：**年份 / 赛道 / 车手 / 车队**；赛车挂在「车队 × 年份」上；**单场比赛 = 「年份 × 赛道」的格子**。任何页面出现这四类词都是链接，能互相跳。 | 1(4a/4d)、3、7 |
| A2 | **年份是全局上下文，左侧年份栏是全站唯一的年份控件**：它在每一页都在；在任何页面点一个年份，意思都是"把我现在看的东西切到那一年"；页面里不再有任何第二个年份选择器（横向赛季条、年份下拉、上一年 / 下一年翻页）。用户随时知道自己在哪一年。**栏里放什么随主体变化**：有主体时只列主体存在的年份并写出它逐年的状态，无主体时是历史树。 | 11、13、16、18、20 |
| A3 | **时代是年份之上的一级刻度**：年份栏是一棵树 历史 → 时代 → 年份；时代标题可点，点了回到该时代的介绍；每个时代的特征（规则、事件、冠军）必须保留并可达。 | 11、16、18 |
| A4 | **「实时」= 当前年份的"现在"**：上面是下一站，下面是上一站（领奖台 + 计时回放），再往下是本赛季已赛的每一站（有回放放回放，没有放档案）。 | 1(场景一)、11、13 |
| A5 | **每个单元页打开先看"值得说的事"**（解说员视角）：默认是当前年代（2026）的事件；切到某一年就是那一年的事。 | 4、16 |
| A6 | **表达纪律**：人 = 头像 + 名字，**且头像必须是那个年代的照片**（梅奔时代的汉密尔顿不能穿法拉利衣服）；荣誉 = 月桂（官方素材）；hover 简介卡只出现在"顺带提到的别的实体"上，绝不重复屏上已在介绍的东西；**卡片 = 纯色身份底 + 大头像，不要细线装饰**。 | 8、9、12、15、17、19 |
| A7 | **只做加法**：旧版本中没有错的页面不删除（时代带 + 冠军卡的 `/seasons` 总览、全年赛历 `/calendar`），年份维度叠加在它们之上。 | 16 |

### 0.1 用户各条输入之间的矛盾与裁决

| 矛盾 | 裁决 | 一句话理由 |
|---|---|---|
| 输入 11「进去（历史）第一页肯定是当年的赛历」vs 输入 16「默认展示当前年代（2026）的事件和总的特征年代介绍」 | 「历史」落地页 = `/seasons` 时代总览，**第一屏就是 2026 所在时代的带**，带内第一行是 2026 的赛历状态（下一站一行 + 上一站 ▶ 回放 + 「完整赛历 →」）。 | 16 更晚且更具体；把 2026 赛历状态放进第一带，11 的诉求一屏内仍然满足。 |
| 输入 11「进去第一页是当年赛历」vs 输入 13「旧首页英雄区要在『实时』最上面」 | 完整的下一站 3D 英雄区只在「实时」；「历史」里只有紧凑一行。 | 同一英雄区出现两次是现在最明显的重复，13 已指定它归「实时」。 |
| 输入 11 横向导航"只有 历史、赛道、车手、车队、赛车" vs 现有「实时」「对比」 | 主导航 = **实时 · 历史 · 赛道 · 车手 · 车队 · 赛车**；「对比」移到右侧工具区（搜索旁），车手页 / 车手列表保留入口。 | 13 明确把「实时」当导航项用；「对比」是工具不是单元。 |
| 输入 16「不要删掉旧页面」vs 执行者已把 `/seasons` 总览与 `/calendar` 改成重定向 | **恢复** `/seasons` 总览页与 `/calendar` 全年赛历页，它们与年份中枢共用组件（一份实现，多个入口）。 | A7；共用组件避免两套实现漂移。 |
| 输入 17「去掉上面一根线、左边一根线」vs 现有 31 处 `inset` 车队色细线 | 全站删除细线，改为纯色身份底卡片（§1.4）。 | 用户明确。 |
| 输入 18「左边导航能控制一切跟年份相关的事情，页面里的赛季条不需要了」vs 顶部导航「历史」与 `/seasons` 总览页是否还需要 | **保留**「历史」导航项与 `/seasons` 页，但把它们重新定义为**年份树根节点的内容页**：栏是导航，页是内容；页内不再有任何年份选择控件（赛季条、时代段条、年份翻页一律删除）。 | 栏只能导航、不能承载时代介绍与冠军卡等内容；导航项同时是移动端与新用户发现"树根"的入口。 |
| 输入 24「回放应该是当年回放的 2 级页面」vs 输入 11 / 13「2026 = 实时赛历，下面每一站的回放」与 v4 把回放做成 `/live?year=` | 回放 = **年份中枢的一个标签** `/seasons/Y/replay?session=K`（历史 › Y › 回放）；`/live` 只剩「下一站英雄区 + 本赛季分站卡」，卡上的 ▶ 跳到 `/seasons/2026/replay?session=`；进行中的节次仍在 `/live` 英雄区下方（那才是"实时"）。 | 24 最新且点名了问题（回放在顶栏没有落点、没有面包屑）。回放面板本来就是整季的（分站下拉可切），放在年份下最自然；"2026 实时赛历下面每站可回放"的诉求靠卡上的 ▶ 一键到达仍然满足。 |
| 输入 24「每页都要有落点和面包屑」vs v4 D4「栏头 = 历史根 + 主体行」 | 年份栏**去掉栏头**，只剩时间线；"我在哪"由顶栏高亮 + 面包屑承担（§0.5.6）。 | 用户口述：栏不要 header 块。两个"我在哪"只留一个，留在所有页面形态一致的面包屑上。 |

### 0.5 站点结构 v5（输入 24）— 每页恰有一个顶栏落点，每个非根页有一条面包屑

> 用户原话：「现在整个导航结构非常的混乱 … 要不你所有的实时、回放你都做成 2 级，其实回放都应该是当年回放的 2 级页面，你可以直接跳转到那个页面，但是你要有面包屑去做导航和定位。现在比如说我现在到回放，你现在是在导航栏是没有一个落点的，这个落点不存在是有问题的 … 现在这页面都不要漏掉。」

#### 0.5.1 五条结构规则（全站不变量，可被脚本检查）

| # | 规则 | 检查方法 |
|---|---|---|
| S1 | **每个页面恰有一个顶栏落点**。落点由路径第一段决定：`live` `calendar` → 实时；`seasons` `eras` `races` → 历史；`circuits` → 赛道；`drivers` `compare` → 车手；`teams` → 车队；`cars` → 赛车。查询串不改变落点。 | 任一页 `nav [aria-current="page"]` 恰 1 个 |
| S2 | **每个非根页有一条面包屑，且第一节 = 落点**。六个根页（`/live` `/seasons` `/circuits` `/drivers` `/teams` `/cars`，无查询串）没有面包屑——顶栏高亮本身就是位置。面包屑只写**祖先链**（树上的父节点），不写立方体的横向关系（车手页不写车队）。 | 非根页 `nav[aria-label="面包屑"] li:first-child` 文本 === 高亮导航项文本 |
| S3 | **链接去最具体的单元**：大奖赛 / 某站 → `/races/Y/R`；年份上下文里的车手 / 车队 / 赛道 → 它的 `?year=Y` 切片；裸年份 → `/seasons/Y`；某年某站的计时 → `/seasons/Y/replay?session=K`；某站的解说 → `/races/Y/R/brief`。 | 代码审查：全站不再出现 `/live?year=` `/live?session=` `/brief?` |
| S4 | **「实时」= 本赛季的现在**，只有两样东西：下一站英雄区 + 本赛季分站卡；它的子页只有本赛季的「赛历与日历订阅」。任何"往年"的东西一律在「历史」树里。 | `/live` DOM 只有 `#hero` `#rounds`（live 相位多一个 `#timing`） |
| S5 | **旧 URL 一个不丢**：移动的路由全部 308 到新位置（§0.5.5），`/poc/*` 留在壳外。 | §0.5.5 表逐行 `curl -I` |

#### 0.5.2 站点树（顶栏栏目 → 二级 → 三级，全部页面）

```
实时  /live ·························· 根（无面包屑）· 栏：隐藏
├─ 赛历与日历订阅  /calendar ··········· 实时 › 赛历与日历订阅 · 栏：隐藏（只管本赛季；往年 308 → /seasons/Y）
└─ [进行中的节次] 计时面板 ············· 不是页面：live 相位挂在 /live 英雄区下方（S4 的唯一例外）

历史  /seasons ······················· 根（无面包屑）· 栏：历史树
├─ 时代  /eras/[id] ··················· 历史 › 时代名 · 栏：历史树（时代标题高亮，时代外变暗）
└─ 年份  /seasons/Y ··················· 历史 › Y · 栏：历史树（Y 高亮）· 页 = 英雄区 + 赛季综述 + 标签
   ├─ 赛历     /seasons/Y ············· （默认标签，面包屑止于 Y）
   ├─ 积分榜   /seasons/Y/standings ··· 历史 › Y › 积分榜
   ├─ 时代     /seasons/Y/era ········· 历史 › Y › 时代
   ├─ 赛道     /seasons/Y/circuits ···· 历史 › Y › 赛道
   ├─ 车手     /seasons/Y/drivers ····· 历史 › Y › 车手
   ├─ 车队     /seasons/Y/teams ······· 历史 › Y › 车队
   ├─ 赛车     /seasons/Y/cars ········ 历史 › Y › 赛车
   ├─ 回放     /seasons/Y/replay?session=K · 历史 › Y › 回放 › 巴林大奖赛 · 正赛（2023 ≤ Y ≤ 当前年才有此标签）
   └─ 第 R 站  /races/Y/R ············· 历史 › Y › 第 R 站 巴林大奖赛 · 栏：赛道时间线（Y 高亮）
      └─ 解说手册  /races/Y/R/brief ··· 历史 › Y › 第 R 站 巴林大奖赛 › 解说手册 · 栏：赛道时间线

赛道  /circuits[?year=Y] ·············· 根；带 ?year 时面包屑 赛道 › Y · 栏：历史树
└─ 赛道  /circuits/[id][?year=Y] ······ 赛道 › 摩纳哥 [› Y] · 栏：布局时间线

车手  /drivers[?year=Y] ··············· 根；带 ?year 时 车手 › Y · 栏：历史树
├─ 车手  /drivers/[id][?year=Y] ······· 车手 › 汉密尔顿 [› Y] · 栏：车队期时间线
└─ 对比  /compare?a&b[&year=Y] ········ 车手 › 对比 [› Y] · 栏：两人并集时间线（P2-3 前为历史树）· 入口在顶栏工具区

车队  /teams[?year=Y] ················· 根；带 ?year 时 车队 › Y · 栏：历史树
└─ 车队  /teams/[id][?year=Y] ········· 车队 › 法拉利 [› Y] · 栏：引擎期时间线

赛车  /cars[?year=Y] ·················· 根；带 ?year 时 赛车 › Y · 栏：历史树
└─ 赛车  /cars/[id] ··················· 赛车 › SF-26 · 栏：同车队的赛车时间线

壳外（无顶栏、无栏、无面包屑）：/ → 308 /live；/poc/a /poc/b /poc/c（内部原型，不进任何导航与搜索）
```

层级说明：用户说的「2 级」= 从年份页往下数一级。回放、第 R 站、七个标签都是年份页的直接子节点；解说手册是某站的子节点（它是那一站的文档）。

#### 0.5.3 页面总表（每页：规范 URL · 顶栏落点 · 面包屑 · 栏形态 · 从哪里链到）

面包屑写法：`标签[→ 链接]`，最后一节永远是纯文本（当前位置）。年份用展示字体（`.num`）。

| 页面 | 规范 URL | 顶栏 | 面包屑（精确标签与链接） | 栏 | 入口 |
|---|---|---|---|---|---|
| 实时 | `/live` | 实时 | —（根） | 隐藏 | 字标、顶栏、`/`、ticker「进行中」、年份中枢当前年「打开实时 →」、`/seasons` 第一带「实时」按钮 |
| 赛历与日历订阅 | `/calendar` | 实时 | `实时→/live › 赛历与日历订阅` | 隐藏 | ticker「赛历与日历订阅」、`/live` 英雄区「全年赛历与订阅」、分站卡区标题行 |
| 历史 | `/seasons` | 历史 | —（根） | 历史树（无高亮） | 顶栏、面包屑第一节 |
| 时代 | `/eras/[id]` | 历史 | `历史→/seasons › {时代名}` | 历史树（时代标题高亮） | `/seasons` 带标题、年份中枢「所属时代」、单元页「横跨 N 个时代」、栏的时代标题 |
| 年份中枢 · 赛历 | `/seasons/Y` | 历史 | `历史→/seasons › {Y}` | 历史树（Y） | 栏年份行、裸年份链接、`/calendar?year=` 重定向、`/live?year=`（<2023）重定向 |
| 年份中枢 · 其余标签 | `/seasons/Y/{standings\|era\|circuits\|drivers\|teams\|cars}` | 历史 | `历史→/seasons › {Y}→/seasons/Y › {标签名}` | 历史树（Y；注记随标签 §1.2.3 A） | 标签条、索引页「Y 年的…」区块 |
| 年份中枢 · 回放 | `/seasons/Y/replay[?session=K][&a&b]` | 历史 | `历史→/seasons › {Y}→/seasons/Y › 回放`；有 `session` 时再追加 ` › {大奖赛名} · {节次}`（纯文本） | 历史树（Y；2023+ 行 sub `▶ 回放`，点 Y′ ≥ 2023 → `/seasons/Y′/replay`，更早 → `/seasons/Y′`） | 分站卡 ▶（`/live` `/seasons/Y` `/calendar`）、单场页「计时回放」、标签条「回放」、`/live?year=` `/live?session=` `/races/Y/R/replay` 重定向 |
| 单场 | `/races/Y/R` | 历史 | `历史→/seasons › {Y}→/seasons/Y › 第 {R} 站 {大奖赛名}` | 赛道时间线（Y） | 分站卡、英雄区大奖赛名、赛道页「Y 年在这里」、回放面板「本站档案」、上一站 / 下一站 |
| 解说手册 | `/races/Y/R/brief` | 历史 | `历史→/seasons › {Y}→/seasons/Y › 第 {R} 站 {大奖赛名}→/races/Y/R › 解说手册` | 赛道时间线（Y；点 Y′ → `/races/Y′/R′/brief`） | ticker「解说手册」（指向下一站的）、`/live` 英雄区「本站解说手册」、单场页「解说手册」按钮、`/brief` 重定向 |
| 赛道索引 | `/circuits[?year=Y]` | 赛道 | 无参数：—；有 `?year`：`赛道→/circuits › {Y}` | 历史树（注记 `N 站`） | 顶栏、栏年份行 |
| 赛道 | `/circuits/[id][?year=Y]` | 赛道 | `赛道→/circuits › {赛道中文名}`；有 `?year` 再 ` › {Y}` | 布局时间线 | 索引卡、单场页、英雄区、hover 卡 |
| 车手索引 | `/drivers[?year=Y]` | 车手 | 同赛道索引 | 历史树（注记冠军姓氏） | 顶栏 |
| 车手 | `/drivers/[id][?year=Y]` | 车手 | `车手→/drivers › {车手中文名}`；有 `?year` 再 ` › {Y}` | 车队期时间线 | 索引卡、积分榜、领奖台、hover 卡 |
| 对比 | `/compare[?a&b][&year=Y]` | 车手 | `车手→/drivers › 对比`；有 `?year` 再 ` › {Y}` | 两人并集（P2-3）；之前历史树 | 顶栏工具区、车手页「对比」、车手索引 |
| 车队索引 | `/teams[?year=Y]` | 车队 | 同赛道索引 | 历史树（注记车队冠军） | 顶栏 |
| 车队 | `/teams/[id][?year=Y]` | 车队 | `车队→/teams › {车队中文名}`；有 `?year` 再 ` › {Y}` | 引擎期时间线 | 索引卡、车手页车队、hover 卡 |
| 赛车索引 | `/cars[?year=Y]` | 赛车 | 同赛道索引 | 历史树（注记冠军赛车） | 顶栏 |
| 赛车 | `/cars/[id]` | 赛车 | `赛车→/cars › {底盘名}` | 同车队的赛车时间线 | 索引卡、车队页「Y 赛季」带、单场页冠军车 |
| 原型 | `/poc/a` `/poc/b` `/poc/c` | 无（壳外） | — | — | 仅直接输入 URL |

`?year=` 作为最后一节：它是**切片**不是子页，所以写成纯文本；回到"全部年份"就点上一节（主体名）。v4 栏头的「全部年份 ×」由此废除。

#### 0.5.4 实时 · 回放 · 解说手册 · 赛历 · 对比 的归属（裁决与理由）

| 东西 | v4 位置 | v5 位置 | 理由 |
|---|---|---|---|
| **实时** | `/live`：英雄区 + 本周要点 + 上一站领奖台 + 回放面板 + 矩阵 + 赛道的过去 + 历史上的今天 | `/live`：**下一站英雄区（新加坡 · R17）+ 本赛季分站卡（已赛 = 领奖台 + ▶，未赛 = 各节时间）**，每张卡 → `/races/Y/R`。没有其他区块。只有 live 相位在英雄区下挂 `LiveTiming`（进行中的节）。栏隐藏。 | 用户裁决。「实时」只回答两个问题：下一站是什么、这赛季每一站怎么样。 |
| **回放** | `/live?year=Y&session=K`（`/live` 的"回放模式"，顶栏亮「实时」，无面包屑） | **`/seasons/Y/replay?session=K`** = 年份中枢的第 8 个标签「回放」（2023 ≤ Y ≤ 当前年）。页 = 年份中枢外壳（英雄区 + 赛季综述 + 标签条）+ 回放面板（`#timing`，分站 / 节次切换、A/B 对比）+ 该季分站卡（▶ = 切面板）。带 `session` 进入时滚到 `#timing`。顶栏亮「历史」，面包屑 `历史 › 2024 › 回放 › 巴林大奖赛 · 正赛`。`/races/Y/R/replay` 是它的短链（308 → 该站正赛 key）。 | 用户说的「当年回放的 2 级页面」。面板本身就是整季的（分站下拉），归年份最自然；本赛季也一样——2026 的 ▶ 去 `/seasons/2026/replay`，于是 2026 和 2024 的回放是同一种页面，不再有"实时里的回放模式"这种第二套结构。 |
| **解说手册** | `/brief[?year&round]`（顶栏不亮任何项，无面包屑） | **`/races/Y/R/brief`**（某站的子页）。`/brief` 保留为短链：308 → 下一站的手册（休赛期 → 上一站）。 | 手册是某一站的文档，S3 要它挂在最具体的单元下。ticker 与英雄区的入口直接写规范 URL（`next` 已在 Header 里），不经过重定向。 |
| **赛历** | `/calendar?year=Y`（任意年；顶栏亮「历史」） | **`/calendar`** = 本赛季的赛历 + 地球仪 + webcal / Google 订阅，归「实时」二级。`?year=` 往年 → 308 `/seasons/Y`（同一个 `SeasonCalendar` 组件，那边本来就有）。 | 订阅只对本赛季有意义；往年赛历在年份中枢的「赛历」标签已经一字不差地存在。页面不删，只是只管本赛季。 |
| **对比** | `/compare`（顶栏亮「车手」，无面包屑） | 不动：`/compare?a&b`，车手树的二级，面包屑 `车手 › 对比`。 | 它是工具，不是单元；留在工具区，但树上有位置。 |
| **进行中的节次** | `/live` #2 面板 | `/live` 英雄区正下方（仅 live 相位）。结束后 60 分钟窗口关闭，该节的 ▶ 出现在分站卡上 → `/seasons/Y/replay?session=K`。 | 「实时」名副其实；回放是历史。 |

#### 0.5.5 重定向表（全部 308 `permanentRedirect`，在各 `page.tsx` 顶部用服务端判断；查询串需要读，所以不用 `next.config` redirects）

| 旧 URL | 新 URL | 规则 |
|---|---|---|
| `/` | `/live` | 不变 |
| `/live?year=Y&session=K[&a&b]`（2023 ≤ Y < 当前年） | `/seasons/Y/replay?session=K[&a&b]` | 原样透传 `session` `a` `b` |
| `/live?year=Y`（Y < 2023 或 Y > 当前年） | `/seasons/Y` | 无回放的年份落到档案 |
| `/live?session=K`（无 `year`） | `/seasons/{当前年}/replay?session=K` | **例外**：K 是进行中的节 → 不重定向，`/live` 自己显示面板 |
| `/live#timing` | `/seasons/{当前年}/replay` | 锚点由客户端处理：`/live` 不再有 `#timing`，分站卡 ▶ 直接写新 URL |
| `/brief` | `/races/{next.year}/{next.round}/brief` | 休赛期 → `lastRace` |
| `/brief?year=Y&round=R` | `/races/Y/R/brief` | — |
| `/calendar?year=Y`（Y ≠ 当前年） | `/seasons/Y` | — |
| `/calendar?year={当前年}` | `/calendar` | 去掉多余参数 |
| `/races/Y/R/replay` | `/seasons/Y/replay?session={该站正赛 key}` | 无 OpenF1 会话（< 2023 或未赛）→ `/races/Y/R` |
| `/seasons/Y/replay`（Y < 2023 或 Y > 当前年或该年尚无已完成节次） | `/seasons/Y` | 标签条此时不渲染「回放」 |
| `/seasons/Y/replay?year=…` | 忽略 `year` 参数 | 路径已含年 |

链接改写（不留任何旧写法）：`lib/raceCards.tsx` `replayHref` → `/seasons/${r.year}/replay?session=${key}`（不再区分当前年）；`components/live/ReplayButton.tsx` 同；`app/(site)/races/[year]/[round]/page.tsx` 「计时回放」按钮同；`components/live/LivePage.tsx` 栏映射删除（栏隐藏）；`components/shell/Header.tsx` ticker「解说手册」→ `/races/${next.year}/${next.round}/brief`、「赛历与日历订阅」→ `/calendar` 不变；`/live` 英雄区「本站解说手册」→ 同上；单场页加「解说手册」按钮 → `/races/Y/R/brief`；§1.2.3 E `/brief` 行的 pattern → `/races/{y}/{r}/brief`。

#### 0.5.6 面包屑规范

**组件** `components/shell/Breadcrumb.tsx`（服务端组件）+ `components/shell/breadcrumb.module.css`：

```ts
export type Crumb = { label: React.ReactNode; href?: string; kind?: "driver" | "team" | "circuit" | "year" | "era"; id?: string };
export default function Breadcrumb({ items, tone }: { items: Crumb[]; tone?: "paper" | "dark" }): JSX.Element;
```

- 渲染 `<nav aria-label="面包屑"><ol>…</ol></nav>`；最后一节 `aria-current="page"`、无链接；其余节 `<Link>`。带 `kind` + `id` 的节用 `EntityLink`（§1.3 规则 1：面包屑里的上级实体有 hover 卡；规则 3：指向当前页主体的自动不弹——`?year=` 切片页的主体节因此不弹）。年份节包 `<span class="num">`。同时输出 `application/ld+json` `BreadcrumbList`。
- `items` 由**页面 / 布局**给出（它们有数据），不是由壳猜：`seasons/[year]/layout.tsx` 给 `历史 › Y [› 标签]`（标签名由 `usePathname` 第三段或布局的 `children` 段决定——用 Next `useSelectedLayoutSegment` 在一个小客户端子组件里取），`races/[year]/[round]/page.tsx` 与其 `brief` 页、`eras/[id]`、四个单元页、四个索引页（仅 `?year` 时）、`/compare`、`/calendar`、`/seasons/Y/replay`。

**位置**：页面内容列的**第一个元素**，在英雄区**之上**，与英雄区同宽（`var(--gutter)` 内），不在英雄区里面，不在栏里面。现有嵌在英雄区内的三套面包屑（`entity.module.css .crumbs`、`season.module.css .crumbs`、各单元页 `s.crumbs` 的「← 车手 / 汉密尔顿」）全部删除，换成这一个组件。单场页英雄区是深色媒体面，面包屑用 `tone="dark"` 放在面的上缘内侧（仍是内容列第一个元素）。

**样式**（对标 formula1.com 的页头小路径条，小而不抢）：

```css
.nav { height: 40px; display: flex; align-items: center; }
.ol  { display: flex; align-items: center; gap: 6px; list-style: none; margin: 0; padding: 0; white-space: nowrap; overflow: hidden; }
.li  { display: inline-flex; align-items: center; gap: 6px; font: 600 13px/16px "Titillium Web", var(--font-cn); color: rgba(21,21,30,.56); }
.li :global(.num) { font-family: var(--font-display); font-weight: 500; }
.li a { color: inherit; } .li a:hover { text-decoration: underline; text-underline-offset: 4px; }  /* D7：只有下划线 */
.li[aria-current] { color: #15151e; }
.sep { width: 12px; height: 12px; opacity: .4; }            /* Icon chevron-right */
.dark .li { color: rgba(255,255,255,.72); } .dark .li[aria-current] { color: #fff; }
```

没有底线、没有背景块（§1.4 禁细线）。40px 行高含在页面顶部留白里，不增加英雄区下移。

**移动端（≤ 960px）**：紧贴横向年份条之下（年份条 sticky，面包屑不 sticky），36px，单行不换行；超过 3 节时折叠成 `第一节 › … › 倒数第二节 › 当前`，「…」是按钮，点一下在原位展开全部；右缘 24px 渐隐表示可横向滚动。`/live` `/calendar` 没有年份条，面包屑直接在页头下。

**与年份栏的关系**：栏**没有栏头**（输入 24 口述：只要时间线），"我在哪"只有两处——顶栏高亮（栏目）与面包屑（路径）。主体形态下，栏的当前行 = 面包屑最后一节的年份；点栏一行 → URL 变、面包屑最后一节跟着变、主体节不变。历史树形态下 `/seasons/Y/*` 的 Y 行高亮 = 面包屑第二节。`/live` `/calendar` 栏隐藏，面包屑照常。

**与年份中枢标签的关系**：标签条是控件，面包屑是只读位置。默认标签（赛历）面包屑止于 `Y`；其它标签追加标签名；回放标签在 `session` 存在时再追加 `{大奖赛} · {节次}`（面板切换分站 / 节次时用 `router.replace` 改 `?session=`，面包屑随之更新，不新增历史记录）。年份中枢英雄区里原来的「历史 › 2024 › 地面效应回归」删除——时代不是年份的祖先，它已在赛季综述的「所属时代」一行里。

**与 hover 卡的关系**：面包屑里的上级实体节（`车手 › 汉密尔顿 › 2014` 的「汉密尔顿」）按 §1.3 规则 3 自动不弹（同路径）；`历史 › 2024 › 第 1 站` 里的「2024」弹年份卡；`赛车 › SF-26` 的「赛车」是索引，不弹。

#### 0.5.7 实施清单 v5（优先级顺序；验收都写成"打开某页能看到什么"）

**P0-10 面包屑组件 + 全站接入**
- 文件：新 `components/shell/Breadcrumb.tsx`、`breadcrumb.module.css`；接入 `app/(site)/seasons/[year]/layout.tsx`（删 `y.crumbs` 行）、`app/(site)/eras/[id]/page.tsx` + `components/season/EraIntro.tsx`（删 `e.crumbs`）、`app/(site)/races/[year]/[round]/page.tsx`（删英雄区内 `e.crumbs`）、`drivers/[id]` `teams/[id]` `circuits/[id]` `cars/[id]` 的 `page.tsx`（删「← 车手 / …」）、四个索引页（`?year` 时）、`compare/page.tsx`、`calendar/page.tsx`；`entity.module.css` `season.module.css` 各单元 `*.module.css` 删 `.crumbs`。
- 验收：
  1. `/seasons/2024` 英雄区上方一行 `历史 › 2024`，英雄区内不再有「历史 › 2024 › 地面效应回归」；`/seasons/2024/standings` 为 `历史 › 2024 › 积分榜`，点「2024」→ `/seasons/2024`。
  2. `/races/2024/1`：`历史 › 2024 › 第 1 站 巴林大奖赛`，三节前两节可点；英雄区内没有旧的「2024 赛季 / 第 1 站」。
  3. `/drivers/lewis-hamilton?year=2014`：`车手 › 汉密尔顿 › 2014`，点「汉密尔顿」→ 无参数页；hover「汉密尔顿」不弹卡。`/teams/ferrari` `车队 › 法拉利`；`/circuits/monaco?year=1988` `赛道 › 摩纳哥 › 1988`；`/cars/ferrari-sf-26` `赛车 › SF-26`。
  4. `/eras/v8-2006-2013`：`历史 › 2.4升V8时代`。`/compare?a=…&b=…`：`车手 › 对比`。`/calendar`：`实时 › 赛历与日历订阅`。`/drivers?year=1988`：`车手 › 1988`；`/drivers` 无面包屑。
  5. 六个根页与 `/live` 无面包屑；`/poc/a` 无顶栏无面包屑。
  6. 390px 宽 `/races/2024/1/brief`：显示 `历史 › … › 第 1 站 巴林大奖赛 › 解说手册`，点「…」展开出「2024」。
  7. `grep -rn "crumbs" app components --include=*.tsx` 只命中 `Breadcrumb.tsx`。

**P0-11 回放迁入年份中枢 `/seasons/Y/replay`**
- 文件：新 `app/(site)/seasons/[year]/replay/page.tsx`（把 `components/live/LivePage.tsx` 的 `ReplayPage` 搬成 `components/season/ReplayTab.tsx`：面板 + 该季分站卡；年份不合法 → `permanentRedirect('/seasons/Y')`；有 `session` → 面板初始会话 = 它并滚到 `#timing`；面板切换时 `router.replace` 改 `?session=`）；`components/season/YearTabs.tsx` 加 `{ seg: "replay", label: "回放" }`（仅 2023 ≤ Y ≤ 当前年且有已完成节次时渲染，计数 = 可回放的分站数）；`lib/raceCards.tsx replayHref`、`components/live/ReplayButton.tsx`、单场页「计时回放」按钮改写目标；新 `app/(site)/races/[year]/[round]/replay/page.tsx` = 308 短链；`app/(site)/live/page.tsx` 删 `ReplayPage` 分支，改为 §0.5.5 的重定向；`components/live/LivePage.tsx` 删 `liveRail` / `replayMap` / `RailScope`。
- 验收：
  1. `/seasons/2024/replay` 顶栏亮「历史」，标签条「回放」高亮，面包屑 `历史 › 2024 › 回放`；下方面板默认阿布扎比正赛；再下方 24 张分站卡，点任一张的 ▶ 面板切站、URL 变 `?session=`、面包屑末尾变 `… › 回放 › 巴林大奖赛 · 正赛`。
  2. `/seasons/2024/replay?session=<巴林正赛 key>` 打开即滚到面板且已是巴林正赛。
  3. `/live?year=2024&session=K` 地址栏变 `/seasons/2024/replay?session=K`；`/live?year=1988` → `/seasons/1988`；`/races/2024/1/replay` → `/seasons/2024/replay?session=<巴林正赛>`；`/races/1988/3/replay` → `/races/1988/3`；`/seasons/1988/replay` → `/seasons/1988`，且 `/seasons/1988` 标签条没有「回放」。
  4. `/races/2024/1` 的「计时回放」→ `/seasons/2024/replay?session=…`；`/races/1988/3` 没有该按钮。
  5. `/seasons/2024/replay` 年份栏 2024 高亮、2023–2025 行 sub `▶ 回放`，点 2023 → `/seasons/2023/replay`，点 1988 → `/seasons/1988`。
  6. `grep -rn "live?year\|live?session\|#timing" app components lib` 只命中回放页自身的锚点。

**P0-12 `/live` 收敛为「英雄区 + 本赛季分站卡」**
- 文件：`components/live/LivePage.tsx`（删本周要点、上一站领奖台、回放面板、赛道的过去、历史上的今天；保留 `SeasonOverHero` 休赛期分支；live 相位在英雄区下挂 `LiveTiming`）；`app/(site)/live/page.tsx`（`?session=` 非进行中 → 308）；`components/season/YearRail.tsx`（`/live` `/calendar` 返回 `s.off`，已有 `/live` 分支，加 `/calendar`）。
- 验收：`/live` 自上而下只有：下一站英雄区（第 17 站 · 新加坡 · 3D · 倒计时 · 各节时间 · 积分前十 · 加入日历 / 全年赛历与订阅 / 本站解说手册）→ 「2026 赛季 · 全部分站」卡（已赛 = 领奖台 + ▶，未赛 = 各节时间，下一站带「下一站」标）；每张卡 → `/races/2026/R`；▶ → `/seasons/2026/replay?session=`；页面左侧没有年份栏；`?debugLive=<进行中 key>` 时英雄区下紧贴计时面板。

**P0-13 解说手册迁到 `/races/Y/R/brief`**
- 文件：新 `app/(site)/races/[year]/[round]/brief/page.tsx`（从 `app/(site)/brief/page.tsx` 搬入，`year` `round` 改读 `params`；`briefRail` pattern → `/races/{y}/{r}/brief`）；`app/(site)/brief/page.tsx` 改为 308（按 §0.5.5）；`components/shell/Header.tsx` ticker「解说手册」与 `LivePage` 英雄区「本站解说手册」→ `/races/${next.year}/${next.round}/brief`；单场页英雄区加「解说手册」`btn-line`。
- 验收：`/brief` 地址栏变 `/races/2026/17/brief`；`/brief?year=2019&round=15` → `/races/2019/15/brief`；手册页顶栏亮「历史」，面包屑四节，年份栏为滨海湾布局时间线，点 2019 → `/races/2019/15/brief`；`/races/2026/16` 有「解说手册」按钮。

**P0-14 `/calendar` 归「实时」、只管本赛季**
- 文件：`app/(site)/calendar/page.tsx`（`?year` 非当前年 → 308 `/seasons/Y`；去掉 `RailScope`；加面包屑）；`components/shell/NavLinks.tsx`（`calendar` 并入「实时」的 `also`，从「历史」删除；`brief` 不再需要特判——它在 `/races` 下）。
- 验收：`/calendar` 顶栏亮「实时」，无年份栏，面包屑 `实时 › 赛历与日历订阅`，内容 = 2026 分站（与 `/live` 卡同组件）+ 地球仪 + 订阅；`/calendar?year=1988` → `/seasons/1988`。

**P0-15 年份栏去掉栏头**
- 文件：`components/season/YearRail.tsx`（删栏头两行：根节点行、主体行、「全部年份 ×」；`scope.header` 不再渲染，`railStore.ts` 标 `@deprecated`，各页的 `header` 传参留着无害、下一轮清理）；`rail.module.css`（删 `.head` 系列）；移动端条删主体 sticky 芯片（§1.2.7 v5）。
- 验收：`/drivers/lewis-hamilton` 栏第一行就是「法拉利 2025–26」分组标题；`/seasons/2024` 栏第一行是「2026– 2026新时代」；任何页面栏顶部没有「历史 Seasons」。

**P0-16 顶栏落点与不变量脚本**
- 文件：`components/shell/NavLinks.tsx`（按 S1 的"路径第一段"实现，不再逐条 `also`）；新 `scripts/ia-check.mjs`（复用 `scripts/shot.mjs` 的浏览器，遍历 §0.5.3 的全部规范 URL 各一例 + §0.5.5 的每条旧 URL：断言 ① `nav [aria-current="page"]` 恰 1 个，② 非根页面包屑第一节文本 === 高亮项文本，③ 旧 URL 最终地址 === 表中新 URL）。
- 验收：`node scripts/ia-check.mjs` 全绿；人工抽查 `/seasons/2024/replay`、`/races/2026/17/brief`、`/calendar`、`/compare`、`/cars/ferrari-sf-26` 五页，顶栏各恰亮一项且与面包屑第一节一致。

执行顺序：P0-10 → P0-11 → P0-12 → P0-13 → P0-14 → P0-15 → P0-16；每步独立可验收，P0-16 的脚本最后跑一遍兜底。

---

## 1. 全局外壳（Shell）

### 1.1 顶部导航 `components/shell/NavLinks.tsx`

| 顺序 | 标签 | 指向 | 高亮条件 |
|---|---|---|---|
| 1 | **实时**（状态点：红 = 有节次进行中） | `/live` | 路径第一段 `live`、`calendar`（v5） |
| 2 | **历史** | `/seasons`（时代总览，不再重定向） | 第一段 `seasons`（含 `/seasons/Y/replay`）、`eras`、`races`（含 `/races/Y/R/brief`） |
| 3 | **赛道** | `/circuits` | 第一段 `circuits` |
| 4 | **车手** | `/drivers` | 第一段 `drivers`、`compare` |
| 5 | **车队** | `/teams` | 第一段 `teams` |
| 6 | **赛车** | `/cars` | 第一段 `cars` |
| 右侧工具区 | 对比（小字）· 搜索 ⌘K | `/compare`、CommandK | — |

高亮规则 = §0.5.1 S1（按路径第一段，查询串不参与），每页恰亮一项。品牌字标 PITWALL → `/live`。ticker（下一节倒计时 / 进行中 · 解说手册 → `/races/{next.year}/{next.round}/brief`（v5）· 赛历订阅 → `/calendar`）全局保留。

### 1.2 全局左侧年份栏（Year Rail）— 全站唯一的时间控件，内容随栏目与主体变化

**位置**：同 v3——`YearShell` 在 `app/(site)/layout.tsx` 包**所有**页面（`/poc/*` 不包）。栏仍然是唯一的时间控件（输入 18），年份仍然是叠在单元页之上的一层（输入 16）；v4 只改变**栏里放什么**。**v5 两条改动**：① 栏在「实时」栏目（`/live`、`/calendar`）**隐藏**（用户裁决：实时只有本赛季，没有年份可切）；② 栏**没有栏头**——没有「历史 Seasons」根行、没有主体行、没有「全部年份 ×」，栏就是时间线本身；"我在哪"由顶栏高亮与面包屑（§0.5.6）承担。下文凡提到栏头 / 主体行的句子以此为准。

#### 1.2.0 一条规则（输入 20）

> 用户原话：「导航要随着上面选择的栏目去变化。选『历史』，讲历史上的这些东西以及跟历史相关的内容；选『车手』，这个导航就应该是看他参加过哪些年份，以及不同年份的变化是什么。」

**栏 = 当前主体的时间线。** 有主体（某车手 / 车队 / 赛道 / 赛车 / 某场比赛 / 对比中的两人）时，栏**只列这个主体存在的年份**，并逐年写出"它那一年是什么样"，按主体自己的阶段分组；没有主体（历史根、时代页、年份中枢、实时、四个索引页）时，栏是整部历史的 时代 → 年份 树，年份行右侧的注记按栏目换义。主体优先于栏目：单场页在顶栏属于「历史」，但它有主体（那条赛道），栏就是那条赛道的时间线。

两种形态（mode），由页面通过 `<RailScope>` 声明，栏自身不猜：

| 形态 | 何时 | 分组 | 行集合 | 行右侧注记 |
|---|---|---|---|---|
| **历史树** history | 无主体：`/seasons`、`/eras/[id]`、`/seasons/Y/*`（含 `/seasons/Y/replay`）、`/drivers` `/teams` `/circuits` `/cars` 索引页 | 规则时代（`content/regulations.json` 的 `eras`，重叠时取年数最短，现状） | 1950–2026 全部 77 年 | 按栏目换义（§1.2.3）：车手冠军姓氏 / 车队冠军 / 冠军赛车 / 分站数 |
| **主体时间线** subject | 有主体：`/drivers/[id]`、`/teams/[id]`、`/circuits/[id]`、`/cars/[id]`、`/races/Y/R`、`/races/Y/R/brief`、`/compare?a&b` | 主体自己的阶段：车手 = 效力车队期；车队 / 赛车 = 引擎合作期（+ 前身 / 后继）；赛道 / 单场 / 手册 = 赛道布局；对比 = 时代（只列有行的） | **只有主体存在的年份**；跨度内的断档压成一行"断档行" | 主体那年的状态：名次 + 月桂 + 胜场 / 冠军 / 赛车名 |
| **隐藏** off（v5） | 「实时」栏目：`/live`、`/calendar` | — | — | — |

#### 1.2.1 七个裁决

| # | 问题 | 裁决 | 理由 |
|---|---|---|---|
| D1 | 主体不存在的年份：隐藏还是变暗？ | **隐藏**（`only: true`）。汉密尔顿页 20 行而不是 77 行；跨度**之内**的断档（阿隆索 2019–20、摩纳哥 1951–54 与 2020、梅赛德斯 1956–2009）压成**一行灰色断档行**「1951–54 · 未举办」，可点 → `?year=<断档首年>`，页面给「Y 年未举办 / 未参赛」带（§4）。 | "汉密尔顿的 1988 年"没有意义；要去 1988 就先切栏目（点「历史」或栏头），这正是用户要的"随栏目变化"。v3 的"变暗仍可点"只保留给历史树（时代页的时代外年份）。 |
| D2 | 主体形态下时代标题还在不在？ | **不在**，由主体阶段分组替代。时代入口转移到页面英雄区的「横跨 N 个时代」行（§4）。例外：`/compare` 两人没有共同阶段，用时代分组。 | 用户要的是"不同年份的变化是什么"——对车手来说变化是换队，对车队是换引擎，对赛道是改布局；规则时代是全局刻度，在主体页上是噪音。 |
| D3 | 行里放什么？ | 左 **色块** = 该年归属色（车手 = 那年车队色；车队 / 赛车 = 车队色；赛道 / 单场 = 那年冠军车队色；历史树 = 那年车手冠军车队色）· **年份**（`--font-data` 14px）· 右侧 **label**（11px，如 `P1`）· **sub**（更暗一级，如 `11胜`，可省）· **月桂**小图标（金 = 该年冠军；红 = 进行中且领跑）。进行中的年份 label 用红色（现有 `.live` 样式）。一行一年，不换行，超长省略。 | 168px 只装得下"状态"，装不下"故事"；故事在页面的「Y 年」带里。 |
| D4 | 栏头 / 上下文行 | **v5：没有栏头。** 栏第一行就是第一个分组标题（主体形态）或第一个时代标题（历史树）。"栏现在控制的是谁"由面包屑回答（`车手 › 汉密尔顿 › 2014`）；回到"全部年份"= 点面包屑的主体节。`Scope.header` 保留为 `@deprecated`、不渲染。 | 用户口述：栏只要时间线。两处"我在哪"合并到面包屑，所有页面一致。 |
| D5 | 当前年份怎么标？"全部年份"态长什么样？ | 当前行：白底 + 左 4px 红条 + 粗体（不变）。**全部年份态**（主体页无 `?year=`）：没有任何行高亮，栏滚到最新一行（顶部）。历史树形态下 `/eras/[id]` 高亮时代标题、`/seasons` **无任何高亮**（v5，没有栏头可亮）。 | 两种选中态（时代 / 年份）+ 一种"未切片"态。 |
| D6 | 点一行去哪？ | **保持主体，切到那一年**（唯一语义，不变）：主体页 → `?year=Y`；单场 → 同赛道那年那站；手册 → `/races/Y′/R′/brief`（v5）；赛车 → 同车队那年的车；对比 → 两人那年；历史树 → `/seasons/Y`（索引页 → `/xxx?year=Y`；`/seasons/Y/[tab]` → `/seasons/Y′/[tab]`，其中回放标签 Y′ < 2023 → `/seasons/Y′`）。点分组标题 → 分组的 `href`（车队页 / 时代页），没有 `href` 的分组标题不可点。点断档行 → `?year=<断档首年>`。「实时」栏目没有栏（v5）。 | 栏是导航不是内容。 |
| D7 | hover | 行 hover = 年份数字与 label **下划线**，不加底色、不弹简介卡（输入 23 + 「卡里不弹卡」）。分组标题 hover = 标题下划线。现有 `.y:hover { background }` 改为下划线。 | 全站统一 hover。 |

#### 1.2.2 栏的解剖（主体形态，以 `/drivers/lewis-hamilton?year=2014` 为例）

```
（v5：没有栏头——「历史 Seasons」根行与「汉密尔顿 2007–2026 · 20 季 · 7 冠」主体行都不渲染；
　页面上方的面包屑「车手 › 汉密尔顿 › 2014」承担这两行的职责）
┌ 分组：效力车队 ────────────────────┐
│ ■ 法拉利        2025–26          ▸  [分组标题：车队色方块 + 车队名 + 跨度 → /teams/ferrari]
│   ■ 2026   P3 · 1胜        ●红      [进行中：label 红；红月桂 = 积分领跑时才有]
│   ■ 2025   P6
│ ■ 梅赛德斯      2013–24          ▸
│   ■ 2024   P7 · 2胜
│   …
│ ▌■ 2014   P1 · 11胜        🏆金      [当前年：白底 + 左红条 + 粗体 + 金月桂]
│   ■ 2013   P4 · 1胜
│ ■ 迈凯伦        2007–12          ▸
│   ■ 2012   P4 · 4胜
│   …
│   ■ 2008   P1 · 5胜        🏆金
│   ■ 2007   P2 · 4胜
└────────────────────────────────────┘
（1950–2006 不渲染；若主体跨度内有断档，渲染一行「2019–20 · 未参赛」灰色断档行）
```

历史树形态的解剖与 v3 §1.2.2 相同（时代标题可点 → `/eras/[id]`，当前时代展开一行摘要，年份行 = 色块 + 年份 + 栏目注记）。

#### 1.2.3 逐栏目 / 逐页面规格

每张表的列：**主体行**（v5 起**不渲染**，列保留只为说明"栏在控制谁"，这个文案现在出现在面包屑里）· **分组** · **行集合** · **一行 = 色块 · label · sub · 月桂** · **当前** · **点击去哪** · **页面要传的数据**（`lib/` 函数）。

**A. 历史（无主体）**

| 页面 | 主体行（面包屑） | 分组 | 行集合 | 一行 | 当前 | 点击 |
|---|---|---|---|---|---|---|
| `/seasons` | 「历史」 | 时代 | 全部 | 冠军车队色 · 冠军姓氏 · — · — | 无高亮，当前时代展开摘要 | `/seasons/Y` |
| `/eras/[id]` | 「历史 › 时代名」 | 时代 | 全部，时代外**变暗** | 同上 | 时代标题高亮 | `/seasons/Y` |
| `/seasons/Y/[tab]` | 「历史 › Y [› 标签]」 | 时代 | 全部 | 同上；`teams` 标签 → 车队冠军名；`circuits` 标签 → `16 站`；`drivers` / `standings` / `era` / `cars` / 赛历 → 冠军姓氏 | Y | `/seasons/Y′/[tab]` |
| `/seasons/Y/replay`（v5） | 「历史 › Y › 回放」 | 时代 | 全部 | 冠军车队色 · 冠军姓氏；2023+ 行 sub = `▶ 回放`；进行中年份 label `进行中`（红） | Y | Y′ ≥ 2023 → `/seasons/Y′/replay`；更早 → `/seasons/Y′`（tooltip「无计时回放 · 打开赛季」） |

**B. 实时**

| 页面 | 栏 |
|---|---|
| `/live`、`/calendar` | **隐藏**（v5）。往年赛历 / 回放都在「历史」树里：`/seasons/Y`、`/seasons/Y/replay`。 |

> v4 的「`/live?year=` 回放模式 + 栏 2023+ 行 → `/live?year=Y′`」整体作废，由 `/seasons/Y/replay` 行取代（§0.5.4）。

**C. 车手**

| 页面 | 主体行 | 分组 | 行集合 | 一行 | 当前 | 点击 |
|---|---|---|---|---|---|---|
| `/drivers` | 「车手索引」 | 时代 | 全部 | 冠军车队色 · 车手冠军姓氏 | 当前年 / `?year` | `/drivers?year=Y′` |
| `/drivers/[id]` | 「汉密尔顿 · 2007–2026 · 20 季 · 7 冠」→ `/drivers/[id]` | **效力车队期**：连续年份同一车队为一组；标题 = 车队色方块 + 车队中文名 + 跨度 → `/teams/[team]`；最新在上 | 参赛年份（`only`）；断档行「2019–20 · 未参赛」 | 那年车队色 · `P{年终名次}`（无名次 = `posText` 或 `—`）· `{N}胜`（N>0 才显示）· 金月桂 = 车手冠军；进行中年份 label 红，积分领跑 = 红月桂 | `?year` 或无 | `/drivers/[id]?year=Y′` |
| `/compare?a&b` | 「汉密尔顿 vs 维斯塔潘 · 2015–2026 同场」 | 时代（只列含行的） | 两人年份并集（`only`）；只有一人参赛的年份 `half`（半透明） | 双色块（左 a 右 b，`color` / `color2`）· `P2 · P1`（a · b）· — · 月桂给冠军那位（金） | `?year` 或无 | `/compare?a&b&year=Y′`（随 P2-3 一起上线；在此之前 `/compare` 用历史树缺省） |

一年换过两队（劳森 2026 红牛 → RB）：归属**那年最后效力的车队**的分组，色块取该队，sub 追加 `· 2 队`。

**D. 车队**

| 页面 | 主体行 | 分组 | 行集合 | 一行 | 当前 | 点击 |
|---|---|---|---|---|---|---|
| `/teams` | 「车队索引」 | 时代 | 全部 | 车队冠军色 · **车队冠军**中文名（1958 前无车队冠军 → 车手冠军所属车队） | 当前年 / `?year` | `/teams?year=Y′` |
| `/teams/[id]` | 「法拉利 · 1950–2026 · 77 季 · 16 冠」→ `/teams/[id]` | **引擎合作期**：连续年份同一引擎厂为一组，标题「梅赛德斯引擎 · 1995–2014」（无 `href`）；**前身 / 后继**（`constructorLineage`）作为只有标题的分组按年插入链条：「布朗 GP · 2009 →」→ `/teams/brawn`，「蒂勒尔 · 1970–98 →」 | 参赛年份（`only`）；未被任何分组覆盖的跨度压成断档行「1956–69 · 未参赛」 | 车队色 · `P{车队排名}`（1958 前 = `—`）· `{N}胜` · 金月桂 = 车队冠军；进行中同车手 | `?year` 或无 | `/teams/[id]?year=Y′` |

梅赛德斯的栏因此读作：引擎期 2010–26 → 布朗 2009 → 本田 2006–08 → BAR 1999–2005 → 蒂勒尔 1970–98 → 断档 1956–69 → 1954–55。法拉利只有一组「法拉利引擎 · 1950–2026」——这本身就是信息。

**E. 赛道**

| 页面 | 主体行 | 分组 | 行集合 | 一行 | 当前 | 点击 |
|---|---|---|---|---|---|---|
| `/circuits` | 「赛道索引」 | 时代 | 全部 | 冠军车队色 · `16 站` | 当前年 / `?year` | `/circuits?year=Y′` |
| `/circuits/[id]` | 「摩纳哥 · 1950–2026 · 72 届」→ `/circuits/[id]` | **布局**（`circuit_layout_id`）：标题「布局 6 · 3.337 km · 19 弯 · 2003–」（无 `href`）；最新在上 | 举办年份（`only`）；断档行「1951–54 · 未举办」「2020 · 未举办」 | 那年冠军车队色 · 冠军姓氏 · 同年两站 = `×2` · 无月桂 | `?year` 或无 | `/circuits/[id]?year=Y′` |
| `/races/Y/R`（赛道 C） | 「摩纳哥 · 第 72 届」→ `/circuits/[C]` | 布局 | 同上 | 同上 | **Y** | `/races/Y′/R′`（`circuitRounds`，同年两站取第一站） |
| `/races/Y/R/brief`（赛道 C；v5，原 `/brief?year&round`） | 「历史 › Y › 第 R 站 › 解说手册」 | 布局 | 同上 | 同上 | Y | `/races/Y′/R′/brief` |

> 覆盖 v3 P1-1 验收 1 的「未举办年份变暗」：改为断档行。覆盖 v3 §4.6 / 路由表的「没有则落到 `/seasons/Y′`」：主体形态下不存在的年份根本不渲染，不需要兜底。

**F. 赛车**

| 页面 | 主体行 | 分组 | 行集合 | 一行 | 当前 | 点击 |
|---|---|---|---|---|---|---|
| `/cars` | 「赛车索引」 | 时代 | 全部 | 冠军车队色 · **冠军赛车名**（车手冠军所属车队那年的主力底盘，`teamChassisByYear`） | 当前年 / `?year` | `/cars?year=Y′` |
| `/cars/[id]`（车队 T） | 「法拉利的赛车 · 1950–2026」→ `/teams/[T]` | 引擎合作期（同车队页，含前身 / 后继） | T 的参赛年份（`only`） | 车队色 · **那年底盘名**（`F2004`）· `P{车队排名}` · 金月桂 = 车队冠军 | 本车的年份（跨两年的车高亮最新一年，另一年 label 相同即可辨认） | `/cars/[id′]`（`teamChassisByYear`）；那年无底盘记录 → `/teams/[T]?year=Y′` |

#### 1.2.4 `<RailScope>` 的扩展（`components/season/railStore.ts`）

```ts
export type RailRow = {
  label?: string;              // 右侧主注记：P1 / 冠军姓氏 / 底盘名 / 16 站
  sub?: string;                // 次注记（更暗）：11胜 / ▶ 回放 / ×2 / 2 队
  color?: string;              // 左色块；缺省 = 历史树的冠军车队色
  color2?: string;             // 第二色（对比页双色块）
  laurel?: "gold" | "red";     // 金 = 该年冠军；红 = 进行中领跑
  live?: boolean;              // label 用红色（进行中）
  half?: boolean;              // 半透明（对比页只有一人参赛的年份）
};
export type RailGroup = { id: string; title: string; from: number; to: number; href?: string; color?: string };

export type Scope = {
  header?: { title: string; sub?: string; href?: string }; // 主体行（替代 v3 的 label）
  years?: number[];            // 主体存在的年份（不变）
  only?: boolean;              // true = 主体形态：只渲染 years；未被分组覆盖的断档压成断档行。缺省 = 历史树，years 外变暗
  rows?: Record<number, RailRow>; // 逐年注记；缺行 = 历史树缺省
  groups?: RailGroup[];        // 有则替代时代标题；年份归入 [from,to] 含它的分组；不含任何行的分组渲染为一行标题（前身 / 后继）
  labels?: "champ" | "champTeam" | "champCar" | "rounds"; // 历史树右侧注记取哪一列，缺省 champ
  gap?: string;                // 断档行文案模板："{a}–{b} · 未参赛"，缺省 "{a}–{b}"
  map?: Record<number, string>; pattern?: string; fallback?: string; missing?: string; // 不变
  current?: number | null; era?: string;                                               // 不变
};
```

- `YearShell` 为每年预算四列注记：`champ`（车手冠军姓氏）、`champTeam`（车队冠军中文名）、`champCar`（冠军底盘名）、`rounds`（分站数），`YearRail` 按 `scope.labels` 取。
- `YearRail` 渲染顺序：有 `groups` → 按 `groups`（已按 `from` 降序）渲染，每组内年份降序；无 `groups` → 时代树。`only` 时在相邻两行年份不连续、且中间年份未被任何分组覆盖处插一行 `.gap`。
- 无 `RailScope` 的页面 = 历史树 + v3 路由表缺省（`/seasons/Y`）。

#### 1.2.5 每页要传的数据（给执行者）

| 页面 | `years` | `rows[y]` 来源 | `groups` 来源 | 其余 |
|---|---|---|---|---|
| `/drivers/[id]` | `driverYears(id)` | `driverSeasons(id).standings`（`pos` / `posText` / `champ`）+ `entries`（`team` → `teamColor`）+ 当年胜场（`facts({driver:id})` 按年数 `pos===1`，页面已为立方体加载）；进行中年份：`driverStandingsAfter(latest)` 的名次 + `pos===1` → 红月桂 | 从 `entries` 按年合并连续同 `team` → `{ id: team+from, title: zhName.team(team), from, to, href: /teams/${team}, color: teamColor(team) }` | `only: true`, `pattern: /drivers/${id}?year={y}`, `gap: "{a}–{b} · 未参赛"`, `header: { title: zhName.driver(id), sub: "${y0}–${y1} · N 季 · T 冠", href: /drivers/${id} }` |
| `/teams/[id]` | `constructorYears(id)` | `constructorSeasons(id).standings` + `chassis`（`engine`）+ 胜场（`facts({team:id})`） | `chassis` 每年取主力底盘的 `engine`，合并连续同引擎 → 「{ENGINE_ZH} 引擎 · from–to」；`constructorLineage(id)` 中非自身的条目 → `{ title: zhName.team(o) + " →", from: year_from, to: year_to ?? latest, href: /teams/${o} }` | `only`, `pattern: /teams/${id}?year={y}`, `gap: "{a}–{b} · 未参赛"` |
| `/circuits/[id]` | `circuitYears(id)` | `circuitRaces(id)`（`winner` → 姓氏、`winnerTeam` → 色；同年多条 → `sub: "×2"`） | `circuitRaces().layout` 按布局合并 + `circuitLayouts(id)`（`length` / `turns`）→ 「布局 n · L km · T 弯 · from–to」 | `only`, `pattern: /circuits/${id}?year={y}`, `gap: "{a}–{b} · 未举办"` |
| `/races/Y/R`、`/races/Y/R/brief` | 同赛道 | 同赛道 | 同赛道 | `only`, `current: Y`, `map` 由 `circuitRounds(C)` 生成（手册页 map 到 `/races/{y}/{r}/brief`） |
| `/cars/[id]` | `constructorYears(T)` | `teamChassisByYear(T)`（label = 底盘名）+ `constructorSeasons(T).standings`（sub = `P{pos}`、月桂） | 同车队页 | `only`, `current: 本车最新年份`, `map[y] = /cars/${chassis}`, `fallback: /teams/${T}?year={y}` |
| `/compare?a&b` | 并集 | 两人的 `driverSeasons().standings` + `entries` | 无（走时代树，`only` 下只渲染含行的时代） | `only`, `pattern: /compare?a=&b=&year={y}` |
| `/live`、`/calendar` | — | — | — | 不传；栏按路径隐藏（v5） |
| `/seasons/Y/replay`（v5） | — | `rows[y].sub = "▶ 回放"`（2023 ≤ y ≤ 当前年） | — | `labels: "champ"`, `current: Y`, `map`（2023+ → `/seasons/{y}/replay`）, `fallback: /seasons/{y}` |
| 索引页 | — | — | — | `labels: "champ" / "champTeam" / "rounds" / "champCar"`, `pattern: /drivers?year={y}` 等 |
| `/seasons/Y/[tab]` | — | — | — | `labels` 随标签（`teams` → `champTeam`、`circuits` → `rounds`） |

#### 1.2.6 路由表（取代 v3 的表）

| 当前路由 | 形态 | 高亮 | 点年份 Y′ 去哪 | 未渲染 / 变暗 |
|---|---|---|---|---|
| `/live`、`/calendar` | **隐藏**（v5） | — | — | — |
| `/seasons` | 历史树 | 无 | `/seasons/Y′` | 无 |
| `/eras/[id]` | 历史树 | 时代标题 | `/seasons/Y′` | 时代外变暗 |
| `/seasons/Y/[tab]` | 历史树 | Y | `/seasons/Y′/[tab]` | 无 |
| `/seasons/Y/replay`（v5） | 历史树（2023+ 行 `▶ 回放`） | Y | 2023+ `/seasons/Y′/replay`；更早 `/seasons/Y′` | 无 |
| `/drivers` `/teams` `/circuits` `/cars` | 历史树（注记随栏目） | 当前年 / `?year` | `/xxx?year=Y′` | 无 |
| `/drivers/[id]` | 主体 · 车队期 | `?year` / 无 | `/drivers/[id]?year=Y′` | 未参赛年份不渲染 |
| `/teams/[id]` | 主体 · 引擎期 + 前身后继 | `?year` / 无 | `/teams/[id]?year=Y′` | 未参赛年份不渲染 |
| `/circuits/[id]` | 主体 · 布局 | `?year` / 无 | `/circuits/[id]?year=Y′` | 未举办年份不渲染 |
| `/races/Y/R` | 主体 · 布局 | Y | `/races/Y′/R′` | 未举办年份不渲染 |
| `/races/Y/R/brief`（v5） | 主体 · 布局 | Y | `/races/Y′/R′/brief` | 未举办年份不渲染 |
| `/cars/[id]` | 主体 · 引擎期 | 本车年份 | `/cars/[id′]`；无 → `/teams/T?year=Y′` | T 未参赛年份不渲染 |
| `/compare?a&b` | 主体 · 时代 | `?year` / 无 | `/compare?a&b&year=Y′` | 两人都没跑的年份不渲染；只一人跑的半透明 |

时代标题（历史树）在所有页面都 → `/eras/[id]`；分组标题（主体形态）→ 分组自己的 `href`。

#### 1.2.7 移动端（≤ 960px）

横向 sticky 条，44px，除「实时」栏目（`/live` `/calendar`）外所有页面都有。主体形态下：没有主体芯片（v5，主体名在条下方的面包屑里）；分组标题变成条内的小分隔标签（车队色方块 + 简称，点 → `href`）；断档行变成一枚「…」灰色分隔；行芯片只显示年份 + 月桂小图标，label / sub 隐藏（桌面端才有空间讲"变化"）。当前年自动居中。面包屑紧贴条下（§0.5.6）。

### 1.3 hover 简介卡的全站规则（输入 7 + 15）

1. 任何**顺带提到**的其他实体（正文、解说要点、表格单元格、面包屑中的上级）→ 有简介卡。
2. **元素本身就是该实体的卡片 / 介绍**（车手卡、赛道卡、车队卡、冠军卡、领奖台卡、英雄区标题、年份栏的年份条目与时代标题、索引页列表卡、`Person` 在以该人为主题的卡内）→ `preview={false}`。
3. **指向当前页面主体**的链接（`href === pathname`，含同页带查询串）→ 自动不弹（`EntityLink` 已实现）。
4. 口诀：**"卡里不弹卡"**。一张以 X 为标题、带 X 图像或数据的独立块，块内指向 X 的链接都不弹；块内提到的 Y（赛道卡上的"去年冠军 塞纳"）照常弹。
5. 列表行（积分榜一行、矩阵一格、历届冠军表一行）不是卡，照常弹。

### 1.4 卡片设计规则（输入 17）— 全站视觉纪律

> 用户原话：避免"上面一根线、左边一根线"，很丑且冗余；要大卡片、纯色身份底、把头像放上去，像车手介绍卡那样；去掉"AI 味"。

1. **禁止细线装饰**：删除全部 `box-shadow: inset 0 3px 0 var(--team)` / `inset 4px 0 0 …` 之类的顶线 / 左线（当前 31 处，分布在 `home.module.css`、`calendar.module.css`、`live.module.css`、`index.module.css`、`cal.module.css`、`tab.module.css`、`globals.css`、`circuit.module.css`、`season.module.css`、`brief.module.css`、`race.module.css`）。不要用 2–4px 的色条、色点、色角表示归属。
2. **身份色 = 背景**：卡片整块使用主体的身份色作纯色底：车手 = 所属车队色（按卡片所指的那一年）；车队 = 车队色；赛车 = 车队色；年份 / 时代冠军卡 = 冠军车队色；赛道 = 碳黑 `#15151e` 底 + 赛道线稿；单场 = 冠军车队色。文字对比：底色相对亮度 > 0.45 时用深色文字（`#15151e`），否则白字；用 `--team-ink` 变量统一处理。
3. **大头像**：人物卡以 formula1.com 车手卡为范式——半身像从卡片右侧 / 顶部出血，占卡高 ≥ 70%；名字用「拉丁姓氏展示字 + 中文名」锁定组合；号码或年份作为超大背景数字（现有车手英雄区的做法）。车队卡以赛车侧视图出血；赛道卡以赛道线稿出血。
4. **卡片等级**：
   - **大卡**（冠军卡、领奖台卡、索引卡、阵容卡、时代带内的年份卡）：纯色底 + 出血图像 + 月桂 + 2–3 个数字，圆角 ≤ 8px，无边框。
   - **小卡**（透视表格、解说要点、赛历分站行）：保持纸色 / 碳黑底，不加色线；归属靠头像 + 文字表达。
   - 半调（halftone）WebGL 车手卡是本站差异点，保留，它本身就符合"纯色身份底 + 大头像"。
5. hover 简介卡：顶部区域用身份色纯色底 + 头像 / 车标 / 赛道线稿，下方白底数据；同样无色线。
6. 执行顺序：先改赛季冠军卡（执行者已在做）→ 领奖台卡 → 索引卡 → 阵容卡 → 其余细线清零。

### 1.5 照片必须符合年代（输入 19）

> 用户原话：汉密尔顿在梅奔时代要用梅奔时代的照片，不能用穿法拉利衣服的照片配梅奔的颜色；其他车手同理。

1. **规则**：任何出现在**年份上下文**里的人物（冠军卡、时代带、领奖台卡、年份中枢英雄区、单元页的「Y 年」带、车队阵容、单场成绩、切片后的 hover 卡、纪录簿里带年份的人），头像一律取**那一年**的照片：`/api/face/<id>?year=YYYY`。无年份上下文（车手页默认、索引页、搜索）取最新一季照片。
2. **取图优先级**（`lib/periodFace.ts` + `app/api/face/[id]/route.ts?year=`，执行者已在做）：① F1 官方该赛季半身像（有则必用）→ ② Wikimedia Commons「<Name> in <year>」类目 → ③ 该车手**只效力过一支车队**时才允许用其通用主图 → ④ 缩写徽章，底色 = **那一年**车队色。**绝不**回退到别的车队时期的照片；宁可用徽章。
3. **颜色与照片同源**：卡片底色（§1.4）取的是"卡片所指那一年"的车队色，照片也必须是同一年 / 同一效力期——两者由同一个 `year` 参数驱动，不能一个按年、一个按最新。
4. 赛车同理：年份上下文下用该年底盘的图（现状按 chassis 已满足）。
5. 验收口径：`/drivers/lewis-hamilton?year=2015`、`/seasons/2015`、`/eras/hybrid-2014-2021` 中的汉密尔顿都是梅赛德斯时期照片；`/seasons/2008` 是迈凯伦时期；`/live` 领奖台是 2026 法拉利官方像。

---

## 2. 「实时」页 `/live`（P0）

### 2.1 状态机 `lib/live.ts`

```ts
type Phase = "live" | "weekend" | "between" | "preseason" | "offseason";
liveState(): {
  phase, year,
  nextRace,            // 下一站（f1db nextRace()）
  nextSession,         // 下一节（lib/schedule nextSession()）
  liveSession,         // 进行中的节（开始前 5 分钟 ~ 结束后 60 分钟，现有窗口）
  latestDoneSession,   // 最近一节已完成的会话（OpenF1，2023+；否则 null）
  lastRace,            // 上一站（f1db lastCompletedRace()）
}
```

- `live`：有 `liveSession`
- `weekend`：无进行中的节，但 `nextSession` 与 `latestDoneSession` 属于同一 meeting（周末两节之间）
- `between`：赛季进行中、两站之间（**现在**）
- `preseason`：当年已有赛程但一站未赛
- `offseason`：当年全部赛完；若下一年赛程已知则按下一年的 `preseason` 处理

开发态保留 `?debugLive=<session_key>`，新增 `?debugPhase=`。

### 2.2 区块顺序（自上而下）

> **v5 覆盖本节**（用户裁决，§0.5.4）：`/live` 只有 **#1 下一站英雄区** 与 **#5 本赛季分站卡**（已赛 = 领奖台三头像 + ▶ → `/seasons/Y/replay?session=`，未赛 = 各节时间，每张卡 → `/races/Y/R`）；live 相位在 #1 下紧贴 **#2 计时面板**；offseason 用 `SeasonOverHero`。#3 本周要点、#4 上一站 + 回放面板、#6 赛道的过去、#7 历史上的今天**从 `/live` 移除**（内容不丢：#4 的回放面板 = `/seasons/Y/replay`，#6 = 赛道页，#7 暂停渲染、组件保留）。下表保留作各相位英雄区的定义。

**统一规则：英雄区 = 下一节 / 下一站；回放面板（v5：在 `/seasons/Y/replay`）= 最近一节已完成的会话。**

| # | 区块 | between（现在） | live | weekend | preseason | offseason |
|---|---|---|---|---|---|---|
| 1 | **下一站英雄区**（旧首页英雄区原样搬入：第 N 站 · 大奖赛名 · 3D 遥测赛道 · 下一节倒计时 · 各节本地时间条 · 右侧车手积分前十 · 「加入日历 / 全年赛历与订阅 / 本站解说手册」） | 新加坡 | 同站，倒计时位改「进行中 · 一练」红标；高度压到约 60%；积分栏下移到 #4 | 同站，倒计时指向下一节 | 第 1 站 | 下赛季赛程已知 → 下赛季第 1 站；否则「赛季结束」+ 车手 / 车队冠军金月桂 + 「赛季回顾 → /seasons/Y/standings」 |
| 2 | **计时面板**（`LiveTiming`，一页只挂载一个实例） | —（在 #4） | **进行中**：紧贴英雄区下方 | —（在 #4） | — | — |
| 3 | **本周值得说的**（3 条，`skip` 当前赛道） | 新加坡 | 同 | 同 | 第 1 站 | 赛季总结 3 条 |
| 4 | **上一站：YYYY XX 大奖赛**（领奖台三张**大卡**：车队色底 + 头像 + 名字 + 月桂；完整成绩 → `/races/Y/R`）**+ 计时回放面板**（默认会话 = `latestDoneSession`，标题「回放 · 巴林大奖赛 正赛」，可切该周末各节；2022 及更早无 OpenF1 → 放「档案」卡） | 巴林 + 巴林正赛回放 | 巴林领奖台（面板已在 #2） | 领奖台 = 巴林；**面板 = 本周末最近一节** | 上赛季收官站 + 其回放 | 收官站 + 回放 |
| 5 | **本赛季：每一站每一个人**（`SeasonGrid`；已赛 2023+ 带 ▶，点击 = #4 面板切到该站正赛并滚到面板；未赛 = 前瞻 → `/races/Y/R`） | 2026 | 同 | 同 | 全是前瞻 | 完整 |
| 6 | **这条赛道的过去** | 滨海湾 | 同 | 同 | 第 1 站赛道 | 隐藏 |
| 7 | **历史上的今天** | 保留 | 保留 | 保留 | 保留 | 保留 |
| ~~8~~ | ~~从 1950 年开始（77 格赛季条）~~ | **移除**（输入 18：左栏是唯一年份控件）。`SeasonStrip` 组件不再在任何页面渲染。 | | | | |

### 2.3 深链与参数（v5）

- `/live` — 按状态机渲染；`?debugLive=` `?debugPhase=` 开发态保留
- `/live?session=<key>` — 若是进行中的节：面板初始会话 = 它；否则 308 → `/seasons/{当前年}/replay?session=`
- `/live?year=YYYY[&session]` — **308** → `/seasons/YYYY/replay[?session]`（2023+）或 `/seasons/YYYY`（更早）。回放模式不再存在于 `/live`。
- `/live?a=&b=` — 透传到 `/seasons/{当前年}/replay?a&b`（对比预设属于面板）

### 2.4 `/` 的去向

`app/(site)/page.tsx` → `redirect("/live")`。旧首页组件（`components/home/HomeTrack.tsx`、`SeasonGrid.tsx`、英雄区 JSX）整体迁入 `/live`，不复制。

---

## 3. 「历史」：时代 → 年份 两级

### 3.1 `/seasons` 时代总览（恢复旧页 + 叠加年份维度）— 「历史」落地页 = 年份树根节点的内容

页内**没有任何年份选择控件**（输入 18）：不放 `SeasonStrip`，不放时代段条，年份与时代的选择全部交给左栏。自上而下：
1. **总的特征年代介绍**（一段）：9 个时代各一句话（`title` + 一句特征），每句的时代名 → `/eras/[id]`。这是正文，不是选择器。
2. **时代带**（`EraBand` 组件，最新在前，当前时代默认展开、其余折叠为标题 + 年份冠军头像行）。每条带：
   - 标题、年份范围、`summary`、关键规则 3 条、「时代介绍 →」
   - **该时代的特征事件**：`notes.seasons.json` 中落在该时代年份内的故事线，按年倒序取 3–5 条（每条带年份链接 → `/seasons/Y`）
   - **每年一张冠军大卡**（§1.4：冠军车队色底 + 车手头像出血 + 金月桂 + 车队名 + 分站数；进行中年份 = 积分领跑者 + 红月桂「进行中」）→ `/seasons/Y`
   - **当前年份所在的带额外在最上方放「2026 现在」一行**：下一站（旗 · 名 · 倒计时）· 上一站领奖台三头像 · ▶ 回放 · 「完整赛历 →」`/seasons/2026`。这满足输入 11"进去第一页是当年赛历"。
3. 年份栏：当前年高亮，点年份 → `/seasons/Y′`。

### 3.2 `/eras/[id]` 时代介绍页（新增，时代作为独立可导航层级）

- 面包屑：历史 / 时代名。英雄区：时代名（中文大字）· 年份范围 · 一句话特征；底色 = 该时代冠军最多的车队色（§1.4）。
- 模块顺序：时代摘要与关键规则（含来源）→ **特征事件**（同 §3.1 的 notes，全量）→ 逐年冠军大卡（车手 + 车队）→ 本时代的赛道（出现过的赛道，标首次 / 告别）→ 本时代的统治者（胜场最多的车手 / 车队，头像 + 名字 + 数字）→ 上一个 / 下一个时代。
- 年份栏：时代标题高亮，时代内年份点亮；点年份 → `/seasons/Y′`。
- `/seasons/[year]/era` 标签**保留**，内容 = 该年所在时代的 `EraIntro`（同组件，当前年份在冠军卡中高亮）+「完整时代页 →」。面包屑里的时代名链接改指 `/eras/[id]`。

### 3.3 `/seasons/[year]` 年份中枢（现状保留）

页 = 英雄区 → **赛季综述**（`SeasonOverview`，用户裁决）→ 标签条 **赛历 · 积分榜 · 时代 · 赛道 · 车手 · 车队 · 赛车 · 回放**（v5：加「赛车」`/seasons/Y/cars`，加「回放」`/seasons/Y/replay`——后者只在 2023 ≤ Y ≤ 当前年且有已完成节次时渲染）。面包屑 `历史 › Y [› 标签]`（§0.5.6），英雄区内原来的面包屑删除。改动三处：
1. **赛历标签（当前年）去重**：全幅 3D 英雄区改为一行紧凑卡（旗 · 第 N 站 名 · 下一节倒计时 · 各节时间小字 · 「打开实时 →」「加入日历」）。其余（最新一站领奖台条、逐站卡片带 ▶ 回放 / 档案）保留；地球仪与订阅只在 `/calendar`。往年赛历不变。
2. 赛历标签与 `/calendar` **共用 `SeasonCalendar` 组件**（§3.4）。
3. **回放标签**（§0.5.4）：面板（`#timing`，默认该年收官站正赛；`?session=` 指定）+ 该季分站卡（▶ = 切面板并 `router.replace` `?session=`）。

### 3.4 `/calendar` 赛历与日历订阅（v5：归「实时」，只管本赛季）

- 独立页面（不重定向）：本赛季逐站（与 `/live` 同一套分站卡）· 地球仪 · 日历订阅（webcal / Google）。顶栏亮「实时」，面包屑 `实时 › 赛历与日历订阅`，年份栏隐藏。
- `?year=YYYY`：等于当前年 → 308 `/calendar`；否则 308 `/seasons/YYYY`（往年赛历在年份中枢的赛历标签，同一个组件）。
- 与 `/seasons/[year]` 赛历标签是**同一个 `SeasonCalendar` 组件的两个入口**，避免两套实现。ticker 的「赛历与日历订阅」指向 `/calendar`。

---

## 4. 四个基础单元页：年份是叠加的一层

共同原则（输入 16"只增加一个合理的年份维度"）：**现有页面骨架一律不动。无 `?year=` = 现状（全部年份）；有 `?year=` = 在英雄区下方插入一条「YYYY 年」带，其余模块按该年预筛。**

**"默认 = 当前年代（2026）的事件 + 总的时代介绍"在单元页上的含义**：
- 解说要点默认已经以 2025–2026 事件优先（现状），保持；
- 英雄区副标新增一行**时代跨度**：「横跨 3 个时代：V8 · 混动 · 地面效应回归」，每个时代名 → `/eras/[id]`（车手 = 参赛年份覆盖的时代；车队同；赛道 = 举办年份覆盖的时代；赛车 = 所属时代一个）——这就是单元页上的"总的时代介绍"入口；
- 年份栏：主体形态（§1.2.3）——只列主体存在的年份，按主体阶段分组，没有时代标题；时代入口就是上面这行「横跨 N 个时代」。

### 4.1 车手 `/drivers/[id]?year=Y`
- 副标行追加：`Y · 车队 · 赛车 · 年终第 P · 积分 N`（车队 / 赛车可点）。
- 「Y 赛季」带：该年逐站名次条（复用透视组件，`from=to=Y`）；队友对比一行（头像 + 名字 + 积分）；**该年的事件**：解说要点切到该年（notes 带年标签 + 该年计算事实：首胜 / 杆位数 / 最佳逆转）。
- 未参赛：「Y 年未参赛 · 生涯 YYYY–YYYY」，前后最近年份可点。
- 生涯条带中 Y 高亮。年份栏 = 效力车队期分组 + 每行「P 名次 · N 胜 · 月桂」（§1.2.3 C，P0-9）。

### 4.2 车队 `/teams/[id]?year=Y`
- 「Y 赛季」带：阵容（头像 + 名字 + 车号，§1.4 阵容大卡）· 赛车（侧视图 → `/cars/[id]`）· 引擎 · 车队第 P · 分站胜 N · 该年事件。
- 年份 × 车手 × 赛车 × 引擎表中 Y 行高亮。未参赛：「Y 年未参赛」+ 前身 / 后继链接（`constructorLineage`）。

### 4.3 赛道 `/circuits/[id]?year=Y`
- 「Y 年在这里」带：大奖赛名 · 日期 · 冠亚季军（头像 + 名字 + 月桂）· 杆位 · 最快圈 · 「完整单场 → /races/Y/R」· 2023+「▶ 计时回放」· 该年此地的故事线。
- 未举办：「Y 年未举办」+ 备注（若有）+ 前后最近举办年份。
- 历届冠军时间带 Y 高亮。年份栏：只列举办年份，按布局分组，断档压成「1951–54 · 未举办」一行（§1.2.3 E，P0-9）= "它在哪几年存在于这个比赛中"。

### 4.4 年份 `/seasons/[year]` — 年份栏即主体选择器（§3.3）。

### 4.5 赛车 `/cars/[id]` — 本身是「车队 × 年份」切片，不接受 `?year=`；年份栏点 Y′ → 同车队 Y′ 年赛车。

### 4.6 单场 `/races/[year]/[round]` — 不接受 `?year=`；年份栏点 Y′ → 同赛道 Y′ 年那站。面包屑 `历史 › Y › 第 R 站 {大奖赛名}`（v5，英雄区内旧面包屑删除）。英雄区 2023+ 加「▶ 计时回放」→ `/seasons/Y/replay?session=<正赛 key>`（v5），并加「解说手册」→ `/races/Y/R/brief`（v5）。英雄区下方的「同一赛道 ← 2017」裸年份翻页删除（栏已承担）；「本赛季 ← 上一站 / 下一站 →」是分站翻页不是年份翻页，保留。子页：`/races/Y/R/brief`（§0.5.4）、`/races/Y/R/replay`（短链 308）。

### 4.7 索引页 `/circuits` `/drivers` `/teams` `/cars` — 顶部「Y 年的…」区块随 `?year=` 切换，与 `/seasons/Y/{circuits|drivers|teams}` 标签共用组件；下方全部历史列表不受影响。卡片按 §1.4 改为大卡。

### 4.8 年份上下文的传递（P2）
在**已带年份**的页面（`/seasons/Y/*`、`/races/Y/R`、`?year=Y` 页）里，指向车手 / 车队 / 赛道的 `EntityLink` 自动附带 `?year=Y`；指向年份 / 时代 / 单场 / 赛车的不附带；从无年份页面出发不附带。

---

## 5. 路由总表

| 路由 | 处置 |
|---|---|
| `/` | 308 → `/live` |
| `/live` | v5：只剩下一站英雄区 + 本赛季分站卡（§0.5.4）；`?year=` `?session=` 308（§0.5.5） |
| `/calendar` | v5：归「实时」，只管本赛季；`?year=` 往年 308 → `/seasons/Y`（§3.4） |
| `/seasons` | 时代总览落地页（§3.1），不再重定向 |
| `/eras/[id]` | 时代介绍页（§3.2） |
| `/seasons/[year]/*` | 保留七个标签 + v5 新增 `/seasons/[year]/replay`（§0.5.4） |
| `/races/[year]/[round]` | 保留；回放按钮 → `/seasons/Y/replay?session=`；手册按钮 → 子页 |
| `/races/[year]/[round]/brief` | v5 **新增**（原 `/brief` 搬入） |
| `/races/[year]/[round]/replay` | v5 **新增**短链，308 → `/seasons/Y/replay?session=<正赛>` |
| `/brief[?year&round]` | 保留 URL，308 → `/races/Y/R/brief`（无参数 = 下一站） |
| `/compare` | 保留；工具区入口；树上在「车手」下；`?year=` P2 |
| `/drivers` `/teams` `/circuits` `/cars` 及 `[id]` | 保留；面包屑 §0.5.3；年份栏行为 §1.2 |
| `/poc/*` | 保留，壳外，不进导航 |

完整的每页落点 / 面包屑 / 栏 / 入口见 §0.5.3；重定向细则见 §0.5.5。

---

## 6. 实施清单（给 Opus 5.5）

验收全部写成"打开某页能观察到什么"。不要改动与条目无关的东西；**不删除任何现有页面或组件**，只做 §0.5.5 的重定向。

> **v5 执行顺序**：先做 §0.5.7 的 **P0-10 → P0-16**（结构：面包屑、回放迁移、`/live` 收敛、手册迁移、赛历归实时、栏去头、落点脚本），再回头做下面尚未完成的条目。下面条目中与 v5 冲突的验收句已标「v5 改」。

### P0 — 立即（输入 13、15、16、17、20）

**P0-1 `/live` 重构为"下一站在上、上一站在下"**
- 文件：`app/(site)/live/page.tsx`（服务端组合页）、新 `components/live/LivePage.tsx`、`components/live/LiveTiming.tsx`（加 `embedded` / `title` props，可在页中段挂载）、`components/home/*`（引用，不复制）、新 `lib/live.ts`（先实现 `between` / `live`，其余按 `between` 渲染）。
- 验收：
  1. `/live` 首屏 = 「第 17 站 · 新加坡大奖赛」3D 赛道 + 倒计时 + 各节时间 + 积分前十 + 三按钮（与旧 `/` 一致）。
  2. ~~向下依次：本周值得说的 → 上一站领奖台 → 回放面板 → 矩阵 → 滨海湾的过去 → 历史上的今天~~ **v5 改**：向下只有「2026 赛季 · 全部分站」卡（P0-12）。
  3. 页面上没有 77 格赛季条。
  4. ~~`/live?session=<key>` 面板已是该会话；`/live?year=2024` 为回放模式~~ **v5 改**：两者 308 到 `/seasons/Y/replay`（P0-11）。
  5. `?debugLive=<进行中 key>`：面板紧贴英雄区，英雄区显示「进行中」，积分前十在面板之下。

**P0-2 `/` → `/live`；字标 → `/live`**
- 文件：`app/(site)/page.tsx`、`components/shell/Header.tsx`。
- 验收：访问 `/` 地址栏变 `/live`；「实时」高亮。

**P0-3 年份栏全局化 + 树结构（根 / 时代 / 年份）+ 删除所有其他年份控件**
- 文件：`app/(site)/layout.tsx`（包 `YearShell`）；清空 `seasons/layout.tsx`、`races/layout.tsx`；`components/season/YearRail.tsx`（路由表、`?year=` 解析、~~栏头 → `/seasons`、上下文说明行 + 「全部年份 ×」~~（v5 改：无栏头，见 P0-15）、时代标题 `<Link href="/eras/[id]">`、当前时代展开摘要）；`YearShell.tsx`（传 `era.id`、`summary`）；`rail.module.css`；删除 `SeasonStrip` 的所有渲染点（`/seasons`、`/live`）与单场页「同一赛道 ← 年份」翻页。
- 验收：
  1. `/races/2026/17/brief`、`/seasons`、`/seasons/2024/replay`、`/drivers/lewis-hamilton`、`/circuits/monaco`、`/teams/ferrari`、`/cars`、`/compare` 左侧都有年份栏；`/live`、`/calendar` **没有**（v5 改）；≤ 960px 为横向条。
  2. ~~`/live` 上 2026 高亮 … 点 2025 → `/live?year=2025`~~ **v5 改**：`/live` 无栏；`/seasons/2024/replay` 上 2024 高亮，点 2025 → `/seasons/2025/replay`，点 1988 → `/seasons/1988`。
  3. ~~点栏头「年份」→ `/seasons`~~ **v5 改**：没有栏头；点「2006–13 2.4升V8时代」→ `/eras/v8-2006-2013`。
  4. `/drivers/lewis-hamilton`：1950–2006 不渲染（见 P0-9）；~~栏头主体行与「全部年份 ×」~~ **v5 改**：没有栏头，回到无参数页 = 点面包屑「汉密尔顿」。
  5. `/races/2026/16` 点 2017 → `/races/2017/14`；2020–21 在栏中是一行「2020–21 · 未举办」断档行（v4 改：未举办年份不渲染，不再变暗兜底）；页面上不再有「同一赛道 ← 2017」。
  6. 全站搜索 `SeasonStrip` 无渲染点；`/seasons`、`/live` 上没有横向年份条。
  7. 年份条目与时代标题 hover 不弹简介卡。

**P0-4 恢复 `/seasons` 时代总览与 `/calendar` 全年赛历**
- 文件：`app/(site)/seasons/page.tsx`（从 git / 旧实现恢复时代带 + 冠军卡，抽成 `components/season/EraBand.tsx`）；`app/(site)/calendar/page.tsx`（恢复，抽 `components/calendar/SeasonCalendar.tsx`，`/seasons/[year]/page.tsx` 赛历标签改为引用它）；`components/shell/Header.tsx` ticker 的赛历链接 → `/calendar`。
- 验收：
  1. 点导航「历史」→ `/seasons`：顶部一段"九个时代各一句"的正文（时代名可点），**没有**横向年份条或时代段条；第一条带「2026新时代」展开，带顶一行「2026 现在：下一站 新加坡 倒计时 · 上一站 巴林 领奖台 ▶ 回放 · 完整赛历 →」；其下摘要 + 关键规则 + 特征事件 + 2026 积分领跑大卡；往下是「2022–25 地面效应回归」等带，各带每年一张冠军大卡。
  2. `/calendar` 显示 2026 逐站 + 地球仪 + 订阅；~~`/calendar?year=1988` 显示 1988；年份栏点 1988 → `/calendar?year=1988`~~ **v5 改**：`/calendar?year=1988` 308 → `/seasons/1988`，`/calendar` 无年份栏（P0-14）。
  3. `/seasons/2026` 赛历标签内容与 `/calendar` 逐站部分一致（同组件），顶部为紧凑下一站一行、无 3D 英雄区。

**P0-5 `/eras/[id]` 时代介绍页**
- 文件：新 `app/(site)/eras/[id]/page.tsx`、`components/season/EraIntro.tsx`；`app/(site)/seasons/[year]/era/page.tsx` 改为引用 `EraIntro` + 「完整时代页 →」；`seasons/[year]/layout.tsx` 面包屑时代名 → `/eras/[id]`。
- 验收：`/eras/v8-2006-2013` 面包屑 `历史 › 2.4升V8时代`（v5，用 `Breadcrumb`），显示时代名、2006–2013、摘要、关键规则（带来源）、特征事件、8 张冠军大卡（阿隆索 … 维特尔）、本时代赛道、统治者、上一个 / 下一个时代；年份栏「2006–13」标题高亮、2006–2013 点亮、其余变暗。

**P0-6 hover 卡"卡里不弹卡"补齐**
- 文件：`EntityLink.tsx`（已有）；给年份栏条目 / 时代标题、领奖台卡、冠军卡、索引卡、`/seasons/Y/*` 卡片标题、英雄区自指链接、`Person`（透传 `preview`）加 `preview={false}`。
- 验收：`/drivers/lewis-hamilton` 内任何"汉密尔顿"无卡；`/seasons` 冠军卡无卡；`/circuits/monaco` 要点里「塞纳」有卡、「摩纳哥」无卡；`/live` 英雄区「滨海湾街道赛道」有卡（英雄区是单场卡）。

**P0-7 大卡片规则落地（第一批）**
- 文件：`components/season/EraBand.tsx` 冠军卡（执行中）、`/live` 领奖台卡（`home.module.css`）、`season.module.css`；同时删除这些文件内的 `inset` 色线。
- 验收：`/seasons` 冠军卡 = 冠军车队色纯色底 + 头像出血 + 金月桂 + 白字（浅色队底用深字），四周无细线；`/live` 领奖台三卡同规则；放大检查无 3–4px 顶线 / 左线。

**P0-8 年代正确的照片（§1.5）**
- 文件：`lib/periodFace.ts`、`app/api/face/[id]/route.ts`（`?year=`，优先级 ①官方该季 → ②Commons「Name in year」→ ③仅单队车手可用通用主图 → ④该年车队色徽章；执行中）；`components/entity/Person.tsx`（透传 `year`）；所有年份上下文的渲染点传 `year`：`EraBand` 冠军卡、`/seasons/[year]/layout.tsx` 英雄区、`/live` 领奖台、`/races/[year]/[round]`、单元页「Y 年」带、车队阵容、hover 卡（当 `?year=` 存在时）。
- 验收：`/seasons/2008` 英雄区与冠军卡中的汉密尔顿穿迈凯伦；`/seasons/2015`、`/eras/hybrid-2014-2021` 穿梅赛德斯；`/live` 领奖台为 2026 法拉利官方像；找不到该年照片的历史车手显示该年车队色缩写徽章，而不是别队照片。

**P0-9 年份栏栏目 / 主体感知（输入 20、23）— §1.2**
- 文件：`components/season/railStore.ts`（`Scope` 扩展：`header` / `only` / `rows` / `groups` / `labels` / `gap`，删 `label`）；`YearShell.tsx`（每年预算 `champ` / `champTeam` / `champCar` / `rounds` 四列注记）；`YearRail.tsx`（主体形态渲染：分组、断档行、`rows` 注记、月桂、双色块；历史树按 `labels` 取注记；hover 改下划线）；`rail.module.css`（`.group` `.gap` `.sub` `.laurel` `.half`；删 `.y:hover { background }`）；`drivers/[id]`、`teams/[id]`、`circuits/[id]`、`cars/[id]`、`races/[year]/[round]`、`brief`、`live`、四个索引页、`seasons/[year]/*` 的 `page.tsx` 按 §1.2.5 传 `<RailScope>`。
- 验收：
  1. `/drivers/lewis-hamilton`：栏只有 2007–2026 共 20 行，没有时代标题，没有 1950–2006，**没有栏头**（v5 改，栏第一行就是「法拉利 2025–26」）；自上而下三组「法拉利 2025–26」「梅赛德斯 2013–24」「迈凯伦 2007–12」，组标题带车队色方块，点「梅赛德斯」→ `/teams/mercedes`；每行 = 车队色块 + 年份 + `P1 · 11胜` / `P3` 等 + 金月桂（2008、2014、2015、2017–2020 共 7 枚）；2026 行 label 红色；点 2014 行 → `?year=2014`，该行白底红条，面包屑变 `车手 › 汉密尔顿 › 2014`。
  2. `/drivers/fernando-alonso`：2021 与 2018 之间有一行灰色「2019–20 · 未参赛」，点它 → `?year=2019` 并出现「2019 年未参赛」带。
  3. `/teams/mercedes`：自上而下「梅赛德斯引擎 · 2010–26」（17 行，2014–2021 金月桂，label 如 `P1 · 16胜`）→ 只有标题的「布朗 GP · 2009 →」（→ `/teams/brawn`）→「本田 · 2006–08 →」→「BAR · 1999–2005 →」→「蒂勒尔 · 1970–98 →」→ 断档行「1956–69 · 未参赛」→ 1955、1954 两行。`/teams/ferrari`：单组「法拉利引擎 · 1950–2026」77 行。`/teams/red-bull`：引擎组依次 红牛福特 2026 / 本田 RBPT 2023–25 / RBPT 2022 / 本田 2019–21 / TAG Heuer 2016–18 / 雷诺 2007–15 / 法拉利 2006 / 考斯沃斯 2005。
  4. `/circuits/monaco`：72 行，组「布局 6 · 3.337 km · 19 弯 · 2003–26」…「布局 1 · 1950」；断档行「2020 · 未举办」「1951–54 · 未举办」；每行 = 冠军车队色块 + 年份 + 冠军姓氏，无月桂。`/circuits/marina-bay`：2008–2026，中间一行「2020–21 · 未举办」。
  5. `/races/2026/16`：栏与 `/circuits/marina-bay` 相同，2026 行白底；~~主体行~~（v5：无栏头，赛道入口在面包屑之外的英雄区赛道链接）；点 2017 → `/races/2017/14`。
  6. `/cars/ferrari-sf-26`：栏 = 法拉利 77 行，每行 label 是那年底盘名（`SF-26`、`F2004`…），sub = `P2` 等，2026 行高亮；点 2004 行 → `/cars/ferrari-f2004`；~~主体行~~（v5：无栏头）。
  7. 索引页注记随栏目：`/drivers` 行 = 车手冠军姓氏；`/teams` 行 = 车队冠军名（1988 = 迈凯伦，色块迈凯伦色）；`/cars` 行 = 冠军赛车名（1988 = `MP4/4`）；`/circuits` 行 = `16 站`；点行 → `/xxx?year=Y`。`/seasons/1988/teams` 的栏注记同 `/teams`。
  8. ~~`/live`：2023 及以后各行 sub 为 `▶ 回放`，点 2024 → `/live?year=2024`~~ **v5 改**：`/live` 无栏；`/seasons/2024/replay` 上 2023+ 各行 sub `▶ 回放`，点 2025 → `/seasons/2025/replay`，点 1988 → `/seasons/1988`。
  9. `/compare` 在 P2-3 之前仍为历史树缺省；`/eras/v8-2006-2013` 仍为历史树 + 时代外变暗（主体形态不影响历史树）。
  10. hover：年份行 / 分组标题 hover 只出现下划线，无底色变化，无简介卡；`grep -n "hover { background" components/season/rail.module.css` 为 0。
  11. 移动端（390px）`/drivers/lewis-hamilton`：横向条内三枚车队分隔标签，20 枚年份芯片（有冠军的带月桂小图标），无 1950–2006；~~左端 sticky 芯片「汉密尔顿」~~（v5：没有，主体名在条下方的面包屑里）。

### P1 — 年份成为真正的全局旋钮

**P1-1 单元页 `?year=` 切片 + `RailScope` + 时代跨度行**
- 文件：新 `components/season/railScope.ts`、`RailScope.tsx`；`drivers/[id]`、`teams/[id]`、`circuits/[id]` 的 `page.tsx`（读 `sp.year`，渲染「Y 年」带，透视 `from=to=Y`，英雄区时代跨度行，`<RailScope>`）；`lib/f1.ts` 补 `driverYears / constructorYears / circuitYears`。
- 验收：
  1. `/circuits/monaco`：栏只列 72 个举办年份，1951–54 与 2020 各压成一行断档行（v4 改）；英雄区副标「横跨 9 个时代」各可点；点 1988 → `?year=1988` 出现「1988 年在这里：摩纳哥大奖赛 · 冠军 普罗斯特 …· 完整单场 →」；点 2020 → 「2020 年未举办 · 最近 2019 / 2021」。
  2. `/drivers/lewis-hamilton?year=2008`：副标「2008 · 迈凯伦 · MP4-23 · 世界冠军 · 98 分」，2008 逐站条 + 队友对比，要点切到 2008 事件。
  3. `/teams/ferrari?year=2004`：阵容大卡（舒马赫、巴里切罗）、F2004 可点、车队冠军金月桂。
  4. 去掉 `?year=` 回到现状页面；年份栏无行高亮、主体行标题白色粗体、只列存在年份。

**P1-2 `/brief`、`/cars`、`/cars/[id]`、索引页的年份栏映射与 `?year=`**
- 验收：`/races/2026/17/brief`（新加坡）点 2019 → `/races/2019/15/brief`（v5 改）；`/cars/<2026 法拉利>` 点 2004 → F2004；`/circuits?year=1988` 顶部区块 = 「1988 年的 16 条赛道」，与 `/seasons/1988/circuits` 同组件，面包屑 `赛道 › 1988`。

**P1-3 状态机五态 + `?debugPhase=`**
- 验收：`?debugPhase=weekend` 面板显示本周末最近一节、「上一站」仍是巴林；`?debugPhase=offseason` 英雄区为「赛季结束」+ 冠军月桂（或下赛季第 1 站）。

**P1-4 导航整理** → 并入 **P0-16**（v5）
- 验收：主导航「实时 · 历史 · 赛道 · 车手 · 车队 · 赛车」；「对比」在搜索旁；`/compare` 时「车手」高亮；`/eras/*`、`/races/*/*/brief`、`/seasons/*/replay` 时「历史」高亮；`/calendar` 时「实时」高亮（v5 改）。

**P1-5 单场页回放按钮** → 并入 **P0-11**（v5）
- 验收：`/races/2026/16` 有「▶ 计时回放」→ `/seasons/2026/replay?session=`（v5 改）与「解说手册」→ `/races/2026/16/brief`；`/races/1988/3` 没有回放按钮。

**P1-6 大卡片规则第二批 + 细线清零**
- 文件：§1.4 列出的 11 个 css 文件；索引卡（`components/index/*`）、阵容卡、赛历分站卡、hover 简介卡头部。
- 验收：`grep -rn "inset 0 3px 0\|inset 4px 0 0\|inset 3px 0 0\|inset 0 4px 0" components app` 返回 0；`/drivers`、`/teams`、`/cars` 索引卡为纯色身份底 + 出血图像。

### P2 — 深化

- **P2-1** 年份上下文传递（§4.8）：从 `/seasons/1988/drivers` 点「塞纳」→ `/drivers/ayrton-senna?year=1988`。
- ~~**P2-2** 年份栏条目的页面相关注记~~ → 已提升并入 **P0-9**（v4）。
- **P2-3** `/compare?year=` 当年同场交锋 + 对比页的年份栏（§1.2.3 C：两人年份并集、双色块、`P2 · P1`、只一人参赛的年份半透明；点 → `/compare?a&b&year=`）。
- **P2-4** 时代页「本时代的赛道 / 统治者」与 `/seasons/Y/circuits` 共用组件。
- **P2-5** README「页面」表与 design-log 回写。

---

## 7. 需求追溯

| 用户输入 | 要求 | 落点 |
|---|---|---|
| 1 场景一 | 实时排名、两车手圈速差；今年赛历、下一站、加入系统日历 | `/live` #2/#4 面板；`/live` 英雄区按钮 + `/calendar` + `/api/calendar` |
| 1 场景三 | 车手历史、每年成绩、车队、趣事；赛道当年发生了什么 | `/drivers/[id]?year=`、`/circuits/[id]?year=`、`/races/Y/R` |
| 1 (4) | 五类颗粒度；对标官网；图片 | 四单元 + 单场 + `/cars`；不变 |
| 2、10 | WebGL 3D、落差赛道、转场 | 不变；3D 英雄区归 `/live` |
| 3 | 四基础单元互相透视 | §4 |
| 4 | 每个单元"值得说的事" | 解说要点；`?year=` 下按年切换；时代页特征事件 |
| 7 | 处处可跳 + hover 简介卡 | §1.3 |
| 8、9、12 | 人 = 图 + 名；荣誉 = 官方月桂 | 不变 |
| 11 | 年份常驻左栏、形式不变；「历史」；统一年份选择；2026 = 实时赛历 + 逐站回放 / 档案；切年换标签；时代；赛道存在年份 | §1.2、§3、§4.3 |
| 13 | 「实时」上 = 下一站，下 = 上一站；左栏一直在 | §2、§1.2（P0-1、P0-3） |
| 15 | hover 卡不重复屏上内容 | §1.3（P0-6） |
| 16 | 时代标题可点回到时代介绍；旧页面不删；年份维度是叠加层，每个单元都能按年导航、知道自己在哪；默认 = 2026 事件 + 总的时代介绍 | §1.2 时代标题、§3.1 恢复 `/seasons`、§3.2 `/eras/[id]`、§3.4 恢复 `/calendar`、§4 开头"默认"定义（P0-3/4/5、P1-1） |
| 17 | 去掉顶线 / 左线；大卡片、纯色身份底、大头像 | §1.4（P0-7、P1-6） |
| 18 | 左栏控制一切年份相关；页面里的赛季条不需要；想清楚年份结构与所有内容如何关联 | §1.2.1 年份树 + 上下文说明行 + "无第二个年份控件"规则；§3.1 去掉条带；§4.6 去掉年份翻页（P0-3） |
| 19 | 照片必须符合年代（梅奔时代用梅奔照片） | §1.5（P0-8） |
| 20 | 左栏要随顶部栏目变化：「历史」讲历史，「车手」就是他参加过哪些年份、各年有什么变化 | §1.2.0 一条规则、§1.2.1 七个裁决、§1.2.3 逐页规格、§1.2.4 `Scope` 扩展（P0-9） |
| 23 | hover 样式全站统一：只有下划线 | §1.2.1 D7（P0-9 验收 10） |
| 24 | 导航结构混乱；实时 / 回放做成 2 级，回放是当年的 2 级页面，可直达但要有面包屑定位；回放在顶栏没有落点；用 Fable 5.1 重想页面结构，一页不漏 | §0.5 全部：S1 每页一个落点、S2 面包屑、`/seasons/Y/replay`、`/races/Y/R/brief`、`/calendar` 归实时、栏去头、重定向表（P0-10 … P0-16） |
| 口述（v5 前） | 顶栏中文六项 + 对比 / 搜索工具区；`/live` = 英雄区 + 本赛季分站卡；栏在实时隐藏、无栏头；链接去最具体单元；年份页先赛季综述再标签 | §1.1、§0.5.4、§1.2（位置段）、§0.5.1 S3、§3.3 |
