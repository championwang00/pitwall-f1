# PITWALL 信息架构定稿（IA Spec v6）

> 作者：Fable 5.1（产品 / IA）。执行：Opus 5.5。日期：2026-10-09。
> 依据：用户 25 条输入（`scratchpad/user-inputs.md` 1–14，口述 15–25）、README、design-log、当前站点实测截图（`/`、`/live`、`/live?year=2024`、`/seasons/2024`、`/seasons/2026/era`、`/seasons/1988/circuits`、`/races/2024/1`、`/races/2026/16`、`/circuits/monaco`、`/drivers/lewis-hamilton`、`/teams/ferrari`、`/brief`）。
> 本文是唯一的结构真相；与 README 冲突以本文为准，实施完成后再回写 README。**读本文先读 §0.5（站点结构 v5）——它是全站的树、每页的落点与面包屑；再读 §1.2（年份栏）——它是全站唯一的时间控件。** v3 相对 v1：加入**时代层**（输入 16）、**恢复被删页面**（输入 16）、**大卡片设计规则**（输入 17）、**左栏是唯一的年份控件**（输入 18）、**照片必须符合年代**（输入 19）。v4 相对 v3：年份栏成为栏目 / 主体感知的（输入 20）；hover 全站统一为下划线（输入 23）。**v5 相对 v4（输入 24「整个导航结构非常混乱 … 回放应该是当年的 2 级页面 … 要有面包屑去做导航和定位 … 现在这些页面都不要漏掉」）：新增 §0.5 站点结构——每页恰有一个顶栏落点、每个非根页有面包屑；回放从 `/live?year=` 迁到 `/seasons/Y/replay`，解说手册迁到 `/races/Y/R/brief`，`/calendar` 归「实时」只管本赛季；年份栏去掉栏头只剩时间线；所有旧 URL 重定向、一页不删。** §1–§6 中与 §0.5 冲突的句子已按 v5 改写并标「v5」。 **v6 相对 v5（输入 25「底层对象逻辑 … 把人、车、队、赛车、赛道都串联起来 … 顶部的区块样式尽可能都接近维斯塔潘的区块」）：新增 §0.6 对象头图与串联——七种对象（年份 / 赛道 / 车手 / 车队 / 赛车 / 单场 / 时代）共用一个 `ObjectHero`，十个槽顺序不变，串联行按年份态 / 全部年份态写全人—车—队—赛车—赛道的关系（P0-17 … P0-22）。读本文顺序：§0.5 → §0.6 → §1.2。**

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

> **v5.1 修订（输入 25 / 26，用户原话）**：「回放应该是单独一个页面，作为赛道的某个子集吧？回放作为一个单体就很奇怪。我点了一个回放，上面又有整个赛道的一些信息，下面有别的赛道信息……它应该是一个更子集的页面。」「面包屑导航这个逻辑不太对……回放这个还是不太对。」「这个导航应该可以放到最上面去吧……只要在 2026 的时候是一个整体的介绍，然后你点击某个 tab，就对应显示某个内容。」
> 裁决：① **规范回放页 = 某站的子页** `/races/Y/R/replay[?session=K&a&b]`，面包屑 `历史 › Y › 第 R 站 {大奖赛} › 回放 · {节次}`（节次是最后一节标签的一部分，不是单独一级）；页面**只有这一站**：面板自己的紧凑标题块（大奖赛 · 赛道 · 日期 ·「返回本站档案」）+ 本站节次切换（一练…正赛，缺省正赛；切换用 `replaceState` 同步 `?session=`，不整页刷新）+ 完整计时面板。没有赛季英雄区、赛季综述、标签条、其他分站卡、分站下拉。无 OpenF1 数据（< 2023）→ 308 `/races/Y/R`；未赛 → 307 `/races/Y/R`。栏 = 赛道时间线（`raceRail`），每年指向该年同赛道的回放页（有的话）否则该年单场页。② **`/seasons/Y/replay` 只是索引**：本季可回放分站的标准分站卡，卡片与 ▶ 都进该站回放页；不再嵌面板；`?session=K` → 308 到拥有 K 的那站回放页。③ **年份中枢**：标签条是页面第一块（面包屑在其内、整块 sticky，面包屑行滚到顶栏下、标签行钉住）；新第一个标签「总览」= `/seasons/Y`（赛季卡 + 赛季综述 + 解说要点只在这里）；「赛历」迁到 `/seasons/Y/calendar`；其余标签只显示自己的内容。下文 v5 的回放 / 赛历句子以此为准。

> 用户原话：「现在整个导航结构非常的混乱 … 要不你所有的实时、回放你都做成 2 级，其实回放都应该是当年回放的 2 级页面，你可以直接跳转到那个页面，但是你要有面包屑去做导航和定位。现在比如说我现在到回放，你现在是在导航栏是没有一个落点的，这个落点不存在是有问题的 … 现在这页面都不要漏掉。」

#### 0.5.1 五条结构规则（全站不变量，可被脚本检查）

| # | 规则 | 检查方法 |
|---|---|---|
| S1 | **每个页面恰有一个顶栏落点**。落点由路径第一段决定：`live` `calendar` → 实时；`seasons` `eras` `races` → 历史；`circuits` → 赛道；`drivers` `compare` → 车手；`teams` → 车队；`cars` → 赛车。查询串不改变落点。 | 任一页 `nav [aria-current="page"]` 恰 1 个 |
| S2 | **每个非根页有一条面包屑，且第一节 = 落点**。六个根页（`/live` `/seasons` `/circuits` `/drivers` `/teams` `/cars`，无查询串）没有面包屑——顶栏高亮本身就是位置。面包屑只写**祖先链**（树上的父节点），不写立方体的横向关系（车手页不写车队）。 | 非根页 `nav[aria-label="面包屑"] li:first-child` 文本 === 高亮导航项文本 |
| S3 | **链接去最具体的单元**：大奖赛 / 某站 → `/races/Y/R`；年份上下文里的车手 / 车队 / 赛道 → 它的 `?year=Y` 切片；裸年份 → `/seasons/Y`；某年某站的计时 → `/races/Y/R/replay?session=K`（v5.1）；某站的解说 → `/races/Y/R/brief`。 | 代码审查：全站不再出现 `/live?year=` `/live?session=` `/brief?` |
| S4 | **「实时」= 本赛季的现在**，只有两样东西：下一站英雄区 + 本赛季分站卡；它的子页只有本赛季的「赛历与日历订阅」。任何"往年"的东西一律在「历史」树里。 | `/live` DOM 只有 `#hero` `#rounds`（live 相位多一个 `#timing`） |
| S5 | **旧 URL 一个不丢**：移动的路由全部 308 到新位置（§0.5.5），`/poc/*` 留在壳外。 | §0.5.5 表逐行 `curl -I` |

#### 0.5.2 站点树（顶栏栏目 → 二级 → 三级，全部页面）

```
实时  /live ·························· 根（无面包屑）· 栏：隐藏
├─ 赛历与日历订阅  /calendar ··········· 实时 › 赛历与日历订阅 · 栏：隐藏（只管本赛季；往年 308 → /seasons/Y）
└─ [进行中的节次] 计时面板 ············· 不是页面：live 相位挂在 /live 英雄区下方（S4 的唯一例外）

历史  /seasons ······················· 根（无面包屑）· 栏：历史树
├─ 时代  /eras/[id] ··················· 历史 › 时代名 · 栏：历史树（时代标题高亮，时代外变暗）
└─ 年份  /seasons/Y ··················· 历史 › Y · 栏：历史树（Y 高亮）· 页 = 标签条（第一块）+ 当前标签内容（v5.1）
   ├─ 总览     /seasons/Y ············· （默认标签 = 赛季卡 + 赛季综述 + 解说要点，面包屑止于 Y）
   ├─ 赛历     /seasons/Y/calendar ···· 历史 › Y › 赛历（v5.1）
   ├─ 积分榜   /seasons/Y/standings ··· 历史 › Y › 积分榜
   ├─ 时代     /seasons/Y/era ········· 历史 › Y › 时代
   ├─ 赛道     /seasons/Y/circuits ···· 历史 › Y › 赛道
   ├─ 车手     /seasons/Y/drivers ····· 历史 › Y › 车手
   ├─ 车队     /seasons/Y/teams ······· 历史 › Y › 车队
   ├─ 赛车     /seasons/Y/cars ········ 历史 › Y › 赛车
   ├─ 回放     /seasons/Y/replay ······ 历史 › Y › 回放（索引：可回放分站卡；2023 ≤ Y ≤ 当前年才有此标签）
   └─ 第 R 站  /races/Y/R ············· 历史 › Y › 第 R 站 巴林大奖赛 · 栏：赛道时间线（Y 高亮）
      ├─ 回放      /races/Y/R/replay?session=K · 历史 › Y › 第 R 站 巴林大奖赛 › 回放 · 正赛（v5.1）· 栏：赛道时间线 → 各年回放
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
| 年份中枢 · 回放（索引，v5.1） | `/seasons/Y/replay` | 历史 | `历史→/seasons › {Y}→/seasons/Y › 回放` | 历史树（Y；2023+ 行 sub `▶ 回放`，点 Y′ ≥ 2023 → `/seasons/Y′/replay`，更早 → `/seasons/Y′`） | 标签条「回放」、`/live?year=Y` 重定向 |
| 单场 · 回放（v5.1） | `/races/Y/R/replay[?session=K][&a&b]` | 历史 | `历史→/seasons › {Y}→/seasons/Y › 第 {R} 站 {大奖赛名}→/races/Y/R › 回放 · {节次}` | 赛道时间线（Y；点 Y′ → 该年同赛道回放页，无回放 → `/races/Y′/R′`） | 分站卡 ▶（`/live` `/seasons/Y/calendar` `/calendar` `/seasons/Y/replay`）、单场页「计时回放」、赛道页「Y 年在这里」▶、`/live?session=` `/seasons/Y/replay?session=` 重定向 |
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
| `/live?year=Y&session=K[&a&b]`（2023 ≤ Y ≤ 当前年） | `/races/Y/R/replay?session=K[&a&b]`（v5.1：R = 拥有 K 的那站） | 原样透传 `session` `a` `b` |
| `/live?year=Y`（2023 ≤ Y ≤ 当前年） | `/seasons/Y/replay` | 索引 |
| `/live?year=Y`（Y < 2023 或 Y > 当前年） | `/seasons/Y` | 无回放的年份落到档案 |
| `/live?session=K`（无 `year`） | `/races/{当前年}/R/replay?session=K`（v5.1） | **例外**：K 是进行中的节 → 不重定向，`/live` 自己显示面板 |
| `/live#timing` | `/seasons/{当前年}/replay` | 锚点由客户端处理：`/live` 不再有 `#timing`，分站卡 ▶ 直接写新 URL |
| `/brief` | `/races/{next.year}/{next.round}/brief` | 休赛期 → `lastRace` |
| `/brief?year=Y&round=R` | `/races/Y/R/brief` | — |
| `/calendar?year=Y`（Y ≠ 当前年） | `/seasons/Y/calendar`（v5.1） | — |
| `/calendar?year={当前年}` | `/calendar` | 去掉多余参数 |
| `/races/Y/R/replay` | —（v5.1：它就是规范回放页，缺省正赛） | 无 OpenF1 会话：< 2023 → 308 `/races/Y/R`；未赛 → 307 `/races/Y/R`；`?session=K` 属于别站 → 308 那站回放页 |
| `/seasons/Y/replay?session=K[&a&b]` | `/races/Y/R/replay?session=K[&a&b]`（v5.1） | R = 拥有 K 的那站 |
| `/seasons/Y/replay`（Y < 2023 或 Y > 当前年或该年尚无已完成节次） | `/seasons/Y` | 标签条此时不渲染「回放」 |
| `/seasons/Y/replay?year=…` | 忽略 `year` 参数 | 路径已含年 |

链接改写（不留任何旧写法）：`lib/raceCards.tsx` `replayHref` → `raceReplayPath(Y, R, key)` = `/races/Y/R/replay?session=K`（v5.1；v5 曾是 `/seasons/Y/replay?session=K`）；`components/live/ReplayButton.tsx`（新增 `round`）、`app/(site)/races/[year]/[round]/page.tsx`「计时回放」、`app/(site)/circuits/[id]/page.tsx` 的 ▶ 同；`/seasons/Y/replay` 索引卡片 `href` = 该站回放页；`components/live/LivePage.tsx` 栏映射删除（栏隐藏）；`components/shell/Header.tsx` ticker「解说手册」→ `/races/${next.year}/${next.round}/brief`、「赛历与日历订阅」→ `/calendar` 不变；`/live` 英雄区「本站解说手册」→ 同上；单场页加「解说手册」按钮 → `/races/Y/R/brief`；§1.2.3 E `/brief` 行的 pattern → `/races/{y}/{r}/brief`。

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

### 0.6 对象头图与串联 v6（输入 25）— 一个 `ObjectHero`，七种对象，两种状态

> 用户原话：「我这个就是底层对象逻辑。比如说，我现在点到维斯塔潘，他在年份上定位到 2026 年，他已经有一个很统一的区块，在展示他今年开的是什么车、隶属于哪个车队。如果我选了比如铃鹿赛道在 2026 年，那一定有人来说，这一年的冠军是谁？冠军车队是谁？冠军车辆是什么。那如果我选了 RB 的某辆车在对应的年数，那一定会说明它的驾驶者是谁，隶属的车队是谁。就是基于这个逻辑，要把人、车、队、赛车、赛道都给串联起来。保证它们是非常合理的、逻辑互通的。顶部的区块样式尽可能都接近于这个区块，在这个区块内能够承载所有串联互通的信息。参考这个维斯塔潘顶部的区块的信息。」

#### 0.6.0 一条规则 + 实测现状

**规则**：立方体（§0 A1）的每一种对象——**年份、赛道、车手、车队、赛车**，加上两个派生格子 **单场**（年份 × 赛道）和 **时代**（年份之上的刻度）——打开时第一屏都是同一个区块 `ObjectHero`：**它是谁（名字）→ 它在哪（元信息）→ 它和谁连着（串联行）→ 它跨过哪些时代 → 它的荣誉 → 它的数字 → 它的样子（视觉槽）**。串联行是区块的核心：把这个对象在**当前年份语境**下与其他四类对象的关系一次写全，每个被提到的对象都是可点的芯片（人 = 头像 + 名，队 = 车标 + 名，赛车 = 小车图 + 名，赛道 = 线稿 + 名，年份 = 徽章）。换对象类型，只换**填进槽里的东西**，不换槽的顺序与样式。

**基准**：`/drivers/max-verstappen` 的头图（截图 `scratchpad/hero/driver.png`）：面包屑 · `Max` / `VERSTAPPEN` · `马克斯·维斯塔潘` · `荷兰 · 1997-09-30 · 29 岁 · 生于 Hasselt` · 口号 · **「2026 效力于 [红牛] 赛车 RB22」** · 「横跨 3 个时代 …」 · 四枚月桂 · 四格数字 · 右侧出血半身像，底色 = 红牛色。这就是目标，其余六种对象向它看齐。

**实测（2026-10-09，11 张截图在 `scratchpad/hero/`）与差距**：

| 页面 | 现状 | 差距（v6 要补的） |
|---|---|---|
| `/drivers/max-verstappen` | 基准 | 串联行缺**队友**与**名次 / 积分**（2026 进行中：P6 · 188 分）、缺**引擎** |
| `/drivers/max-verstappen?year=2021` | 「2026 效力于 红牛 赛车 RB22」与「2021 红牛 RB16B · 世界冠军 · 395.5 分」**两行叠放** | 年份态必须**替换**而不是叠加；半身像仍是 2026 红牛版（违反 §1.5，应为 2021 本田时期照片）；缺队友（佩雷斯） |
| `/teams/red-bull` | 谱系行、时代行、月桂、数字、赛车侧视图 | **没有任何串联行**：不说 2026 阵容是谁、开的什么车、什么引擎、目前第几 |
| `/teams/red-bull?year=2021` | 「2021 车队 P2 · RB16B · 本田 引擎」 | 缺**阵容**（维斯塔潘 · 佩雷斯）、积分、分站胜 |
| `/circuits/suzuka` | 名字 · 元信息 · 口号 · 特征 · 时代行 · 数字 · 三枚月桂（赛道之王 / 杆位最多 / 圈速纪录）· 3D 赛道 | **没有串联行**：不说最近一届是谁赢的、哪支车队 / 哪辆车赢得最多 |
| `/circuits/suzuka?year=2026` | 「2026 日本大奖赛 · 冠军 基米·安东内利」 | 缺**冠军车队、冠军赛车、杆位、最快圈**，缺「计时回放 / 解说手册」入口 |
| `/cars/red-bull-rb22` | 「[红牛] 2026」· 全名 · 动力单元 · 风洞图 · 数字 | 缺**驾驶者**（维斯塔潘 · 哈贾尔 · 劳森）、**车队名次 / 积分**、设计师；无中文名槽、无时代行；数字行在视觉槽之后（顺序与基准不同） |
| `/cars/lotus-79` | 「莲花 1978–1979」· 动力单元 · 「1978 安德雷蒂 · 车手冠军」月桂 · 照片 | 同上；两季各自的驾驶者（安德雷蒂 / 彼得森 / 雅里埃；罗伊特曼 / 雷巴克）与名次 |
| `/seasons/2021`（总览 tab 内的赛季卡，另一位执行者正在做） | 「WORLD CHAMPION」· `2021` · 两枚月桂 · Champion [维斯塔潘] · Constructors [梅赛德斯] · 四格数字 · 冠军时期照片 | 缺**冠军赛车**（RB16B）与**车队冠军的赛车**（F1 W12）、缺时代行（所属时代 → `/eras/hybrid-2014-2021`） |
| `/races/2026/3` | `2026` / 日本大奖赛 · 官方名 · 日期 · [铃鹿赛道] · 圈数 · 两个按钮 · **冠军大卡**（安东内利 · 梅赛德斯 · F1 W17 · 杆位起步 · 用时）· 亚季军格 · 荣誉月桂 · 右侧前十塔 | 已经最接近"串联全"；差：冠军大卡里的车队 / 赛车是文字链不是芯片；缺**积分榜影响**（赛后领跑者）可不做；顺序：串联在按钮之后（应在按钮之前） |
| `/eras/hybrid-2014-2021` | 卡片：`ERA · 2014–2021` · 标题 · 摘要 · 四格数字 · 「6 冠 车手冠军最多 [汉密尔顿]」「8 冠 车队冠军最多 [梅赛德斯]」 | 缺**代表赛车**（胜场最多底盘 F1 W07 · 19 胜）、缺举办最多的赛道；没有视觉槽 |

共同的结论：**串联行要么没有，要么只写了一半；每页各写各的，年份态和全部年份态的关系也不一致。** v6 用一个组件、一张槽位表、一张串联表把它们统一。

#### 0.6.1 共享解剖（十个槽，顺序全站不变）

```
┌ ObjectHero（底色 = 对象的身份色，§1.4；dark 变体作底 + DRS 半调纹理）──────────────────────────────┐
│ ① breadcrumb   §0.5.6（flush，白字）                                              │  ⑩ visual        │
│ ② eyebrow      小写标签（Titillium 12/16 700 大写）：对象类型 · 状态                  │  出血的大图：     │
│ ③ display      拉丁展示名（Formula1 Wide 大写；车手 = first 小 + LAST 大；年份 = 数字字体） │  半身像 / 赛车    │
│ ④ cx           中文名（`.cx`）；无中文名的对象 = 全名拉丁小写行                        │  侧视 / 3D 赛道  │
│ ⑤ meta         `.meta-line`：国旗 + 国籍 · 日期 / 基地 / 地点 · 类型                 │  / 冠军时期照片   │
│ ⑤b lineage     （仅车队有谱系、赛道有多布局时）谱系行                                 │                  │
│ ⑥ tagline      content 口号（`Linked`，skip 自己）                                 │                  │
│ ⑦ connection   串联行 L1（身份：和谁连着）+ L2（结果：名次 / 积分 / 冠军 / 杆位 / 最快圈） │                  │
│ ⑧ eras         「横跨 N 个时代 / 所属时代」（`EraSpan`）                              │                  │
│ ⑨ laurels      月桂行（生涯 / 历史荣誉；年份态的当年冠军月桂放进 L2 末尾）               │                  │
│ ⑨b actions     （仅单场 / 赛道@Y）按钮：▶ 计时回放 · 解说手册                          │                  │
│ ⑩ stats        `StatRow`：英文标签 + Formula1 数字（生涯 / 历史合计，不随年份变）        │                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- **顺序不可调换**；某个槽没有数据就整行不渲染，不留空。
- **两种表面**：`surface="bleed"`（车手 / 车队 / 赛道 / 赛车 / 单场 / 时代页：通栏，`entity.module.css .hero` 的现状）；`surface="card"`（年份中枢总览 tab 内的赛季卡、年份中枢「时代」tab 内的时代卡：纸底上的圆角 8 卡片，`season.module.css .hero` 的现状）。槽位与样式相同，只是外框不同——这是与正在重构年份中枢（tab 在最上、总览 tab 放赛季头图）的那位执行者对齐的点：**赛季头图留在总览 tab 的卡片里，v6 只换它的内部槽位，不动它的位置。**
- **年份态 vs 全部年份态**：同一个组件，`year` 有值时 ②⑦⑩ 按下表变化，①按 §0.5.6 多一节，⑩ 视觉槽照片换成那一年（§1.5）。**年份态的串联行替换全部年份态的串联行**，不叠放（修正 `?year=2021` 现状）。
- 三个"没有全部年份态"的对象：**年份**的全部年份 = 历史根 `/seasons`（时代总览，不是对象头图）；**单场**的全部年份 = 赛道页；**时代**的"指定年份" = 年份中枢的「时代」tab（卡片表面，同槽位，去掉 ⑩ 视觉）。表里标 —。

#### 0.6.2 串联表：七种对象 × 两种状态（每格 = 串联行的精确写法）

写法约定：`[X]` = 芯片（可点、可 hover）；`{…}` = 填值；`·` = 分隔点；`(…)` = 条件渲染；L2 行首的年份徽章只在年份态出现。进行中的赛季（`live`）名次前缀「目前」，已结束的「年终」。人名用 `zhName.driver` 全名；车队 `zhName.team`；赛车 = 底盘名（拉丁，`.lat`）。

| 对象 | 全部年份态 L1 / L2 | 指定年份态（Y）L1 / L2 |
|---|---|---|
| **车手** `/drivers/[id]` | 现役（最后一季 = 当前年）：**L1** `[{当前年}] 效力于 [Team] · 赛车 [Car] · 引擎 [Engine]` **L2** `队友 [Person]( · [Person]) · 目前 P{n} · {pts} 分` ＝ 与 `?year={当前年}` 完全相同的两行（所以维斯塔潘无参数页和 `?year=2026` 看到的串联行一字不差）。退役 / 离开：**L1** `最后效力于 [Team] · 赛车 [Car] · [{Y1}]` **L2** `队友 [Person] · 年终 P{n} · {pts} 分( · 世界冠军 月桂)` | **L1** `[Y] 效力于 [Team] · 赛车 [Car] · 引擎 [Engine]`（一年多队：每队一段 `[Team] [Car] 第 {a–b} 站`，用 ` → ` 连接）**L2** `队友 [Person]( · [Person]…最多 3 人，按同场次数降序) · 目前/年终 P{n} · {pts} 分( · 世界冠军 月桂)`；未参赛：`[Y] 年未参赛 · 生涯 [{y0}]–[{y1}]`（前后最近年份可点） |
| **车队** `/teams/[id]` | 现役：＝ `?year={当前年}`。解散 / 改名：**L1** `最后参赛 [{Y1}] · 阵容 [Person] · [Person] · 赛车 [Car] · 引擎 [Engine]`（谱系后继在 ⑤b 行）**L2** `年终 车队 P{n} · {wins} 胜 · {pts} 分( · 车队冠军 月桂)` | **L1** `[Y] 阵容 [Person] · [Person]( · [Person]…按出赛场次降序，最多 4 人，多的折成「等 {k} 人」→ 「Y 赛季」带) · 赛车 [Car]( · [Car]) · 引擎 [Engine]` **L2** `目前/年终 车队 P{n} · {wins} 胜 · {pts} 分( · 车队冠军 月桂)( · 车手冠军 [Person] 月桂)`；1958 年前：「1958 年前无车队锦标赛」代替名次；未参赛：`[Y] 年未参赛 · 出赛 [{y0}]–[{y1}]`（+ 同一车队别名提示，现状保留） |
| **赛道** `/circuits/[id]` | **L1** `最近 [{Y1}] [第 R 站 {大奖赛名}] · 冠军 [Person] · [Team] · [Car]`（有未赛的本赛季场次 → 追加 ` · 下一次 [{Y} 第 R 站]`，链到 `/races/Y/R`）**L2** `胜场最多车队 [Team] {n} 胜 · 举办 {m} 届 [{y0}]–[{y1}]`（赛道之王 / 杆位最多 / 圈速纪录已在 ⑨ 月桂行，不重复） | **L1** `[Y] [第 R 站 {大奖赛名}] · {date}` **L2** `冠军 [Person] · [Team] · [Car] · 杆位 [Person] · 最快圈 [Person] {time}`（+ ⑨b 按钮：2023+ 已赛 `▶ 计时回放` → 回放页；`解说手册` → `/races/Y/R/brief`）；同年两场（2020 红牛环）→ 两组 L1/L2；未赛：L2 = `尚未进行 · {各节时间}`；未举办：`[Y] 年未举办 · 最近 [{prev}] / [{next}]` |
| **赛车** `/cars/[id]`（本身就是「车队 × 年份」切片，不接受 `?year=`；年份栏切换 = 换底盘） | **L1** `[Team] · [{y0}](–[{y1}]) · 车手 [Person] · [Person]( · [Person]…该底盘所有正赛车手，按场次降序，最多 4) · 引擎 [Engine] {engine.full_name}` **L2**（每个赛季一行，最多 3 行，最新在上）`[Y] 目前/年终 车队 P{n} · {wins} 胜 · {pts} 分( · 车队冠军 月桂)( · 车手冠军 [Person] 月桂)`；设计师放 ⑤ meta 行末尾 `· 设计 {designers}` | —（多年份底盘的"指定年份"= L2 里那一年的行；年份栏点 Y′ → 同车队 Y′ 年底盘，§4.5） |
| **年份** `/seasons/Y`（总览 tab 的赛季卡，`surface="card"`） | —（= `/seasons` 历史根） | 已结束：**L1** `世界冠军 [Person] · [Team] · 赛车 [Car]` **L2** `车队冠军 [Team] · 赛车 [Car]( · 车手 [Person] · [Person])`；进行中：**L1** `积分领跑 [Person] · [Team] · [Car] · {pts} 分 · 领先 [Person] +{gap}` **L2** `车队领跑 [Team] · [Car] · {pts} 分`；尚未开始：`赛季尚未开始 · 首站 [第 1 站 {GP}] {date}`。⑧ = `所属时代 [Era]` |
| **单场** `/races/Y/R` | —（= 赛道页） | **L1** `[Y 赛季] 第 R 站 · [Circuit] · {date} · {laps} 圈 {km} km`（现状 meta 行并入）**L2** `冠军 [Person] · [Team] · [Car] · 杆位 [Person] · 最快圈 [Person] {time}`；⑨b 按钮 `▶ 计时回放`（2023+）`解说手册`；未赛：L2 = `尚未进行 · 查看 [Y] 赛程与日历订阅`。右侧 ⑩ 视觉 = **冠军大卡**（现状 `r.winner`，冠军车队色 f1-surface + 时期半身像）+ 亚季军格 + 前十塔；大卡内指向冠军的链接 `preview={false}`（卡里不弹卡），L2 里的冠军芯片照常弹 |
| **时代** `/eras/[id]`（`surface="card"`，底色 = 冠军最多车队色） | **L1** `[{a}]–[{b}] · {n} 季 · 车手冠军最多 [Person] {k} 冠 · 车队冠军最多 [Team] {k} 冠`（现状「统治者」月桂行即此行，改成芯片语法）**L2** `胜场最多赛车 [Car] {n} 胜 · 举办最多 [Circuit] {n} 届` | 年份中枢「时代」tab：同两行，白卡，无 ⑩ |

**三个必须一致的"互通"检查**（任一对象页说的事，在相对对象页上必须能找到同一句话的反面）：
1. 车手@Y 说「效力于 [Team] · 赛车 [Car]」⇔ 车队@Y 阵容里有他 ⇔ 赛车页车手里有他。数据同源：三者都来自 `season_entrant_driver × season_entrant_chassis`（`driverYear.entries` / `teamYear.drivers` / `getChassis().drivers`）。
2. 赛道@Y 说「冠军 [Person] · [Team] · [Car]」⇔ 单场页冠军大卡 ⇔ 年份中枢赛历那一站的领奖台。数据同源：`circuitYear().podium[0]` / `raceResults()[0]` + `chassisForTeamYear(team, Y)`。
3. 年份@Y 说「世界冠军 [Person] · [Team] · [Car]」⇔ 车手@Y L2 有「世界冠军」月桂 ⇔ 车队@Y L2 有「车手冠军 [Person]」⇔ 赛车页 L2 该年有「车手冠军 [Person]」。数据同源：`seasonDriverStandings(Y).champ` + 冠军最后一站的 `constructor_id`（`SeasonHero` 的 `heroTeam` 查询）+ `chassisForTeamYear`。

#### 0.6.3 每个槽的数据来源（`lib/hero.ts`，新建；所有查询复用现有函数）

新建 `lib/hero.ts`，导出一个统一模型和七个构造函数，页面只传模型给 `<ObjectHero>`：

```ts
export type Chip =
  | { kind: "driver"; id: string; name: string; year?: number | null; color?: string | null }
  | { kind: "team"; id: string; name: string; year?: number | null }
  | { kind: "car"; id: string; name: string; team: string; year: number }
  | { kind: "circuit"; id: string; name: string; year?: number | null }
  | { kind: "year"; year: number; href?: string; label?: string }      // 年份徽章；href 可指向 /races/Y/R
  | { kind: "engine"; id: string | null; name?: string | null; year?: number | null; self?: string }
  | { kind: "era"; id: string; title: string }
  | { kind: "text"; text: string }                                   // 「效力于」「冠军」「·」等连接词
  | { kind: "laurel"; tone: Tone; top: string; bottom?: string };    // L2 末尾的当年冠军月桂
export type HeroModel = {
  kind: "driver" | "team" | "circuit" | "car" | "season" | "race" | "era";
  id: string; year: number | null;                 // year = 指定年份态；null = 全部年份态
  surface: "bleed" | "card"; color: string;        // 身份色（§1.4）
  crumbs: Crumb[]; eyebrow?: string;
  display: { first?: string; last: string; numeral?: boolean };  // ③；numeral = 年份数字字体
  cx?: string | null; meta: Chip[]; lineage?: Chip[][]; tagline?: string | null;
  connection: Chip[][];                            // ⑦：一行 = 一个 Chip[]；通常两行，赛车可到四行
  eraYears: number[];                              // ⑧：EraSpan 的输入（赛季 / 时代 = 自身年份）
  laurels: React.ReactNode[]; actions?: { label: string; href: string; icon?: string; tone?: "red" | "line" }[];
  stats: { k: string; v: React.ReactNode; sub?: string }[];
  visual: React.ReactNode;                         // ⑩，页面自己组装（半身像 / WindTunnel / TrackField / 冠军卡）
};
```

| 对象 | 构造函数 | 槽 ③④⑤⑥ | 槽 ⑦ L1 / L2 来源 | ⑧ | ⑨ | ⑩ 数字 | 身份色 |
|---|---|---|---|---|---|---|---|
| 车手 | `driverHero(id, year)` | `getDriver` · `zhName.driver` · `getCountry` + `NAT_ZH` + `flag` · `content.drivers[id].tagline` | 年份态 / 现役：`driverYear(id, Y)` → `entries`（team · cars · engine · rounds_text）、`mates`（id · n）、`line`（pos · points · champ · live）；退役：`driverSeasons(id).entries.at(-1)` + `standings.at(-1)` + `teammates(id)` 过滤该年 | `driverYears(id)` | 现状四枚（生涯合计） | 现状 `StatRow` | `teamColor(年份态的 team ?? DRIVERS_2026[id].team ?? 签名车队)` |
| 车队 | `teamHero(id, year)` | `getConstructor` · `zhName.team` · `content.teams[id]`（base / founded / tagline）· `constructorLineage` → ⑤b | `teamYear(id, Y)` → `drivers`（id · starts）、`cars`（id · name · engine · engineName）、`line`（pos · points · wins · champ · live）、车手冠军 = `drivers.find(d => d.line?.champ)`；解散车队：`constructorYears(id).at(-1)` 作 Y | `constructorYears(id)` | 现状三枚 | 现状 | `teamColor(id)` |
| 赛道 | `circuitHero(id, year)` | `getCircuit` · `content.circuits[id]`（nameZh / tagline / traits）· `TYPE_ZH` | 年份态：`circuitYear(id, Y)` → `round · gp · date · podium[0]（id · team）· pole · fl` + `chassisForTeamYear(podium[0].team, Y)` 取冠军赛车；回放键：`seasonSchedule(Y)` + `raceReplayPath`（现状）；全部年份态：`circuitRaces(id)[0]`（最近一届：year · round · gp · winner · winnerTeam）+ `chassisForTeamYear`；胜场最多车队 = `circuitRaces` 按 `winnerTeam` 计数；未赛场次：`seasonRaces(当前年)` 中 `circuit === id && !winner` | `circuitYears(id)` | 现状三枚（赛道之王 / 杆位最多 / 圈速纪录） | 现状 | `#15151e`（碳黑） |
| 赛车 | `carHero(id)` | `getChassis` → `name · full_name · constructor_id · seasons · drivers · engines`；`content.cars[id]`（nameEn · designers） | L1：`drivers` 按场次（`facts({team, year})` 计数）降序；`engines[0]`；L2 每季：`yearTeams(y).find(t => t.id === team)`（pos · points · wins · champ · live；**用积分榜积分，不用 `race_result` 求和**——RB22 现状 286 分是漏了冲刺赛，积分榜是 298）+ 车手冠军 = `seasonDriverStandings(y).champ ∈ drivers` | `seasons.map(y)` | 现状（`cTitles` / `dTitles`，一年多底盘时按现状规则不计车队冠军） | 现状五格（把 `StatRow` 从视觉槽之后挪到之前，与基准顺序一致） | `teamColor(team)` |
| 年份 | `seasonHero(year)`（改造现有 `components/season/SeasonHero.tsx`，保留它在总览 tab 卡片内的位置） | ③ = 年份数字（`numeral`）· ② = `World Champion` / `Championship Leader · Round n / N` / `Season` | `seasonDriverStandings` / `driverStandingsAfter`（live）→ champ / leader；`seasonConstructorStandings` / `constructorStandingsAfter` → champTeam；冠军所在车队 = 现状 `heroTeam` 查询；**赛车** = `chassisForTeamYear(heroTeam, Y)[0]` 与 `chassisForTeamYear(champTeam, Y)[0]`；车队冠军的两位车手 = `teamYear(champTeam, Y).drivers.slice(0, 2)` | `[year]`（EraSpan 自动变成「所属时代」） | 现状两枚 | 现状四格 | `teamColor(heroTeam)` |
| 单场 | `raceHero(year, round)` | `getRaceByYearRound` → ③ = `{Y}` 数字 + 大奖赛中文名（现状两行标题保留为 ③ 的 `first/last`）· ④ = `official_name` | `raceResults(race.id)[0]`（winner · constructor_id · time · grid）、`chassisForTeamYear(winner.constructor_id, Y)[0]`、`pole = results.find(pole_position)`、`raceData(id, "FASTEST_LAP")[0]`；回放 key：现状 `seasonSchedule` | `[year]` | 现状（大满贯 / 帽子戏法 / 杆位 / 最快圈 / 车手之日） | `laps · distance` 并入 L1，⑩ 数字行不单独渲染（单场没有"合计" ） | 已赛 = `teamColor(winner.constructor_id)`；未赛 = 碳黑 + 官方赛事图 |
| 时代 | `eraHero(id)`（改造 `EraIntro` 的头部） | `eraById` → ③ = `era.title`（中文，`font-cn` 900）· ② = `Era · a–b` · ⑥ = `era.summary` | `eraFacts(er)` → `titlesD[0]`、`titlesT[0]`、`circuits[0]`；**新查询** `eraTopChassis(a, b)`：`race_result ⋈ race ⋈ season_entrant_chassis`（同年同车队）按 `chassis_id` 计 `position_number = 1`，取第一（混动时代 = `mercedes-f1-w07` · 19 胜） | `years`（本时代 = 一条，EraSpan 省略） | 现状两枚（改成 L1 的芯片语法后，⑨ 行只留月桂 + 芯片） | 现状四格 | `teamColor(titlesT[0] ?? winsT[0])` |

#### 0.6.4 链接去向（最具体单元，§0.5.1 S3 的头图特例）

| 芯片 | 全部年份态 | 指定年份态 Y | 不链接的情况 |
|---|---|---|---|
| `[Person]` | `/drivers/{id}`；现役车手的"当前年"行按年份态处理 → `?year={当前年}` | `/drivers/{id}?year=Y` | 页面主体自己（车手页不出现自己） |
| `[Team]` | `/teams/{id}`；现役 → `?year={当前年}` | `/teams/{id}?year=Y` | 车队页自己的队名 → `plain`；赛车页 L1 的车队 → `?year={底盘最新年}` |
| `[Car]` | `/cars/{chassisId}`（永不带 `?year=`，§4.5） | 同左 | 赛车页自己 |
| `[Circuit]` | `/circuits/{id}` | `/circuits/{id}?year=Y`（单场页的赛道芯片 → `?year=Y`） | 赛道页自己 |
| `[第 R 站 大奖赛名]` | `/races/Y/R`（`EntityLink kind="year" href=…`，预览赛季） | 同左 | 单场页自己（标题不链） |
| `[Y]` 年份徽章 | `/seasons/Y` | `/seasons/Y` | 年份中枢自己的 `{Y}` 数字不链 |
| `[Engine]` | `Engine` 组件现状规则（有厂队 → `/teams/{works}`，该年厂队参赛才带 `?year=`；纯供应商 = 文字） | 同左 | 车队页自己做引擎（`self`） |
| `[Era]` | `/eras/{id}` | 同左 | 时代页自己 |
| ⑨b 按钮 | `▶ 计时回放` → 单场的回放页（随年份中枢 / 回放重构：回放页挂在单场下，入口由 `raceReplayPath` 给出，本节不另定 URL）；`解说手册` → `/races/Y/R/brief` | | |

面包屑：现状 `subjectCrumbs(section, href, subject, year)`；单场 / 年份 / 时代按 §0.5.3。

#### 0.6.5 芯片形态（`components/entity/*`，头图区统一尺寸）

| 芯片 | 组件 | 形态 | 头图尺寸 | hover 卡 |
|---|---|---|---|---|
| 人 | `Person`（现有） | 圆头像（**那一年**的照片 `?year=Y`，§1.5；背景 = 那一年车队色 `color`）+ 中文全名粗体 | `size={24}`，名字 15/700 | `/api/preview/driver/{id}`（现有） |
| 车队 | `Team`（现有，`onDark`） | 白色车标（透明底，不加圆片）+ 中文名粗体；历史车队无 logo → 名字 | `size={22}` | `/api/preview/team/{id}`（现有） |
| **赛车** | **新建 `components/entity/Car.tsx`** | 小侧视图 + 底盘名（`.lat` 拉丁等宽展示字）：2026 车 = `teamCar(team, 160)` 裁成 56×20；历史车 = `carImageFast(id)` 缩略（无图 → 只有名字，不画占位）；链接 `/cars/{id}` | 图高 20，名字 15/700 | **新增 `kind: "car"`**：`EntityLink` 的 `Kind` 加 `"car"`，`hrefOf("car", id) = /cars/{id}`；`app/api/preview/[kind]/[id]/route.ts` 加 `car` 分支（`getChassis`：title = 底盘名，latin = full_name，image = 2026 官方侧视图 / `carImageFast`，`imageKind: "car"`（新：宽图贴底），color = 车队色，metaParts = `[Team] · y0–y1 · 引擎`，stats = Starts / Wins / Podiums / Poles（`facts({team, year})` 按季合计），blurb = `content.cars[id].summary` 首句）；`HoverLayer` 加 `.car` 样式（宽 180 高 64，object-fit contain，贴卡底） |
| **赛道** | **新建 `components/entity/Circuit.tsx`** | 白色线稿 `trackOutline(id)`（无线稿 → 不画）+ 中文名粗体；链接按 §0.6.4 | 线稿高 22（宽随比例，最大 44） | `/api/preview/circuit/{id}`（现有） |
| 年份徽章 | `u.yBadge`（现有样式）抽成 `YearBadge` | 白底黑字 Formula1 900；`href` 可覆盖（指向 `/races/Y/R` 时仍预览赛季） | 15px | `/api/preview/year/{Y}`（现有） |
| 引擎 | `Engine` / `Engines`（现有） | 文字（`hlink`） | 15/700 | 厂队 → team 卡；供应商无卡 |
| 时代 | `EraSpan`（现有） | 文字下划线 | 14 | 无（时代无卡，P2 可加 `kind: "era"`） |
| 连接词 | `text` chip | 白字 55% 不透明、400 字重（`u.yLine > span` 现状） | 15 | — |
| 当年冠军月桂 | `Laurel tone="white" onColor size={28}` | 行内 | 28 | — |

所有芯片在同一行里用 `u.yLine` 的现状排版（flex · gap 6/10 · 15px · 700），**L1 与 L2 之间 8px**，L2 行首的年份徽章只在年份态出现（全部年份态的 L1 行首已经有）。

#### 0.6.6 hover 在头图区的规则（§1.3 的头图实例）

1. **头图的主体不弹卡**：③④ 标题、⑩ 视觉（半身像 / 赛车 / 赛道）、面包屑最后一节——`preview={false}` 或根本不是链接；面包屑上级（`车手` `历史 › 2026`）照常弹。
2. **串联行里的每个芯片都弹**：它们是"顺带提到的别的实体"（车手页的车队 / 赛车 / 队友，赛道页的冠军 / 车队 / 赛车，赛车页的车手 / 车队）。年份态的芯片带 `year`，卡片标题链接到 `?year=Y` 切片（`HoverLayer` 现状已支持）。
3. **卡里不弹卡**：单场页右侧冠军大卡内指向冠军的链接 `preview={false}`；大卡内提到的车队 / 赛车芯片照常弹；左侧 L2 的冠军芯片照常弹（它在"行"里，不在"卡"里）。
4. **hover 形态**：芯片 = 共享的软药丸（`person.module.css` / `team.module.css` 的 `:hover` 背景 10% + 外环 5px）；纯文字链 = 下划线（`heroLink` 现状：1px 40% 白 → hover 1.5px 100% 白）；年份徽章 = `hlink` 下划线；按钮 = `btn-red` / `btn-line` 现状。**不再有第三种 hover**（输入 23）。
5. hover 卡**不重复屏上内容**（输入 15）：车队页@2026 L1 里的 `[RB22]` 弹赛车卡（另一个实体，允许）；车手页 L1 的 `[红牛]` 弹车队卡（允许）；赛车页 L1 的 `[红牛]` 弹车队卡（允许）；但赛车页 ⑩ 的风洞图不弹（它就是主体）。

#### 0.6.7 视觉槽 ⑩ 与身份色（按对象）

| 对象 | ⑩ 视觉（全部年份态 → 指定年份态） | 身份色 |
|---|---|---|
| 车手 | 官方出血半身像 `driverBust`（仅当前年 / 2025+ 有）→ 年份态 Y < 2025：`/api/face/{id}?s=600&year=Y` 时期照片（`s.photo` 4:5 圆角，`SeasonHero` 现状做法），**不得**用当前年半身像（修正 `?year=2021` 截图） | 年份态 = 那一年车队色；全部年份态 = 当前车队（现役）/ 签名车队（退役） |
| 车队 | 当前年官方侧视图 `teamCar`（2026）→ 年份态：该年底盘图 `carImageFast(cars[0].id)`（无图 → 该年主力车手时期照片 `teamImageFast` 现状） | 车队色（不随年变——同一车队的历史色是 P2） |
| 赛道 | `TrackField` 3D（最新布局遥测）→ 年份态：同一 3D，点击去 `/races/Y/R`（现状） | 碳黑 + 线稿 |
| 赛车 | 2026：`WindTunnel`；历史：`carImageFast` 照片（现状） | 车队色 |
| 年份 | 冠军 / 领跑者时期照片（现状，`SeasonHero`） | 冠军 / 领跑者车队色 |
| 单场 | 冠军大卡 + 亚季军格 + 前十塔（现状）；未赛：3D 赛道 | 已赛 = 冠军车队色（§1.4「单场 = 冠军车队色」，现状碳黑 + 官方照片 → 改成冠军色 dark 变体，照片 35% 叠在上面）；未赛 = 碳黑 |
| 时代 | 无（卡片表面）；P2：胜场最多赛车的照片出血 | 冠军最多车队色 |

#### 0.6.8 实施清单 v6（给 Opus 5.5；接在 P0-16 之后，与年份中枢 / 回放重构并行时只动下面列出的文件）

**P0-17 `ObjectHero` 组件 + 芯片**
- 文件：新 `components/entity/ObjectHero.tsx`（十个槽、两种表面；接受 `HeroModel`）、`objecthero.module.css`（把 `entity.module.css` 的 `.hero .heroIn .heroText .first .last .tagline .portrait .stats` 与 `season.module.css .hero .text .kick .year` 的卡片变体合并进来；旧 class 保留一轮不删）；新 `components/entity/ConnectionLine.tsx`（渲染 `Chip[]`，按 §0.6.5 分发到 `Person` / `Team` / `Car` / `Circuit` / `YearBadge` / `Engine` / `Laurel` / 文字）；新 `components/entity/Car.tsx`、`Circuit.tsx`、`YearBadge.tsx`；`EntityLink.tsx` `Kind` 加 `"car"`；`app/api/preview/[kind]/[id]/route.ts` 加 `car` 分支；`HoverLayer.tsx` + `hover.module.css` 加 `imageKind: "car"`；新 `lib/hero.ts`（§0.6.3 的七个构造函数 + `eraTopChassis`）。
- 验收：
  1. `npx tsc --noEmit -p .` 干净；`curl /api/preview/car/red-bull-rb22` 返回 `title: "RB22"`、`metaParts` 含 `红牛` 与 `2026`、`stats[0].k === "Starts"`。
  2. 任何页面还没接入前，站点与现状一致（组件先建、后接入）。

**P0-18 车手页接入（基准页先做，确认样式与现状像素级一致）**
- 文件：`app/(site)/drivers/[id]/page.tsx`（头图替换为 `<ObjectHero model={driverHero(id, year)} visual={…} />`；删 `k.dek` 行与 `u.yLine` 行；`driver.module.css` 删 `.dek .honours .heroLink`，留 `.h1 .fit .cell*`）。
- 验收（精确文案）：
  1. `/drivers/max-verstappen` 与 `/drivers/max-verstappen?year=2026` 串联行**完全相同**：L1 `2026 效力于 [红牛] · 赛车 [RB22] · 引擎 红牛-福特`；L2 `队友 [伊萨克·哈贾尔] · [利亚姆·劳森] · 目前 P6 · 188 分`（数据随赛季推进变化，验收时以 `/seasons/2026/standings` 的维斯塔潘行为准）。`[红牛]` → `/teams/red-bull?year=2026`，`[RB22]` → `/cars/red-bull-rb22`，`[伊萨克·哈贾尔]` → `/drivers/isack-hadjar?year=2026`，`2026` 徽章 → `/seasons/2026`。
  2. `/drivers/max-verstappen?year=2021`：**只有一组**串联行：L1 `2021 效力于 [红牛] · 赛车 [RB16B] · 引擎 本田`；L2 `队友 [塞尔吉奥·佩雷斯] · 年终 P1 · 395.5 分 · [世界冠军 月桂]`；页面上不再出现「2026 效力于」；右侧是 2021 本田时期照片（4:5 圆角），不是 2026 半身像。
  3. `/drivers/ayrton-senna`：L1 `最后效力于 [威廉姆斯] · 赛车 [FW16] · 1994`；L2 `队友 [达蒙·希尔]`（1994 无年终名次 → 名次 / 积分段不渲染；有 `posText` 无 `pos` 的年份写 `posText`）。
  4. `/drivers/lewis-hamilton?year=2008`：L1 `2008 效力于 [迈凯伦] · 赛车 [MP4-23] · 引擎 梅赛德斯`；L2 `队友 [海基·科瓦莱宁] · 年终 P1 · 98 分 · [世界冠军]`。
  5. hover `[红牛]` 弹车队卡、hover `[RB22]` 弹赛车卡（顶部红牛色 + 侧视图）、hover 半身像与 `VERSTAPPEN` 标题不弹。

**P0-19 车队页、赛道页接入**
- 文件：`app/(site)/teams/[id]/page.tsx` + `team.module.css`（删 `.lineage` 的独立样式 → ⑤b 槽；删 `u.yLine`）；`app/(site)/circuits/[id]/page.tsx` + `circuit.module.css`（头图改用 `ObjectHero surface="bleed"`，⑩ 视觉 = 现状 `c.track` 的 3D 画布，`.note` 保留）。
- 验收（精确文案）：
  1. `/teams/red-bull` 与 `/teams/red-bull?year=2026` 相同：L1 `2026 阵容 [马克斯·维斯塔潘] · [伊萨克·哈贾尔] · [利亚姆·劳森] · 赛车 [RB22] · 引擎 红牛-福特`；L2 `目前 车队 P4 · 1 胜 · 298 分`（以 `/seasons/2026/standings` 车队榜为准）。
  2. `/teams/red-bull?year=2021`：L1 `2021 阵容 [马克斯·维斯塔潘] · [塞尔吉奥·佩雷斯] · 赛车 [RB16B] · 引擎 本田`；L2 `年终 车队 P2 · 11 胜 · 585.5 分 · 车手冠军 [马克斯·维斯塔潘] [月桂]`。
  3. `/teams/brawn`（布朗GP）：L1 `最后参赛 2009 · 阵容 [简森·巴顿] · [鲁本斯·巴里切罗] · 赛车 [BGP 001] · 引擎 梅赛德斯`；L2 `年终 车队 P1 · 8 胜 · 172 分 · [车队冠军]`；⑤b 谱系行现状保留（本田 → 布朗GP → 梅赛德斯）。
  4. **`/circuits/suzuka?year=2026`**：L1 `2026 [第 3 站 日本大奖赛] · 2026-03-29`；L2 `冠军 [基米·安东内利] · [梅赛德斯] · [F1 W17] · 杆位 [基米·安东内利] · 最快圈 [基米·安东内利] 1:32.432`；⑨b 两个按钮 `▶ 计时回放`（→ 该站回放页）`解说手册`（→ `/races/2026/3/brief`）。`[第 3 站 日本大奖赛]` → `/races/2026/3`；`[梅赛德斯]` → `/teams/mercedes?year=2026`；`[F1 W17]` → `/cars/mercedes-f1-w17`。面包屑 `赛道 › 铃鹿赛道 › 2026`。
  5. `/circuits/suzuka`：L1 `最近 2026 [第 3 站 日本大奖赛] · 冠军 [基米·安东内利] · [梅赛德斯] · [F1 W17]`；L2 `胜场最多车队 [红牛] 8 胜 · 举办 36 届 1987–2026`；⑨ 月桂行现状保留（6 胜 赛道之王 [舒马赫] · 8 杆 杆位最多 [舒马赫] · 圈速纪录 1:30.965 [安东内利] 2025）。
  6. `/circuits/monaco?year=2020`：`2020 年未举办 · 最近 [2019] / [2021]`，无 L2、无按钮。

**P0-20 赛车页、单场页接入**
- 文件：`app/(site)/cars/[id]/page.tsx` + `car.module.css`（删 `.dek .dekYears .teamChip .sub .full`；`StatRow` 移到视觉槽之前；头图补 ④ 全名行、⑧ `EraSpan`）；`app/(site)/races/[year]/[round]/page.tsx` + `race.module.css`（L1 吸收 `.meta`；L2 新增在按钮之前；`.winner` 大卡与 `.tower` 作为 ⑩；已赛底色改冠军车队色）。
- 验收（精确文案）：
  1. **`/cars/red-bull-rb22`**：③ `RB22`，④ `RED BULL RB22`，⑤ `红牛-福特 DM01 1.6 V6 T H · 设计 Pierre Waché、Ben Hodgkinson、Craig Skinner、Enrico Balbo、Paul Monaghan`；L1 `[红牛] · 2026 · 车手 [马克斯·维斯塔潘] · [伊萨克·哈贾尔] · [利亚姆·劳森] · 引擎 红牛-福特`；L2 `2026 目前 车队 P4 · 1 胜 · 298 分`；⑧ `所属时代 2026新时代`；⑩ 数字 `Starts 16 · Wins 1 · Podiums 10 · Poles 1 · Points 298`（Points 改为积分榜积分；以 `/seasons/2026/standings` 为准）。`[红牛]` → `/teams/red-bull?year=2026`。
  2. `/cars/lotus-79`：L1 `[莲花] · 1978–1979 · 车手 [马里奥·安德雷蒂] · [罗尼·彼得森] · [卡洛斯·罗伊特曼] · [让-皮埃尔·雅里埃] · 引擎 福特 Ford Cosworth DFV 3.0 V8`；L2 两行：`1979 年终 车队 P4 · 0 胜 · 39 分` / `1978 年终 车队 P1 · 8 胜 · 86 分 · 车手冠军 [马里奥·安德雷蒂] [月桂]`（1978 车队冠军月桂按现状"一年多底盘不计"规则省略，但 L2 的名次仍写 P1）。
  3. `/races/2026/3`：L1 `[2026 赛季] 第 3 站 · [铃鹿赛道] · 2026-03-29 · 53 圈 307.471 km`；L2 `冠军 [基米·安东内利] · [梅赛德斯] · [F1 W17] · 杆位 [基米·安东内利] · 最快圈 [基米·安东内利] 1:32.432`；按钮在 L2 之后；右侧冠军大卡内 `[梅赛德斯]` `[F1 W17]` 改为芯片，卡内「基米·安东内利」`preview={false}`；头图底色 = 梅赛德斯色。
  4. `/races/2026/17`（未赛）：L2 `尚未进行 · 查看 [2026] 赛程与日历订阅`；底色碳黑。

**P0-21 赛季卡、时代卡接入（卡片表面；与年份中枢重构的执行者协调——只改 `SeasonHero.tsx` / `EraIntro.tsx` 头部的内部结构，不改它们在 tab 里的位置）**
- 文件：`components/season/SeasonHero.tsx`（`y.dek` 改为 `ConnectionLine` 两行；加 `EraSpan years={[year]}`）；`components/season/EraIntro.tsx`（`e.rulers` 改为 L1 芯片语法 + 新 L2）；`lib/hero.ts eraTopChassis`。
- 验收：
  1. `/seasons/2021` 总览 tab 的赛季卡：L1 `世界冠军 [马克斯·维斯塔潘] · [红牛] · 赛车 [RB16B]`；L2 `车队冠军 [梅赛德斯] · 赛车 [F1 W12] · 车手 [刘易斯·汉密尔顿] · [瓦尔特利·博塔斯]`；⑧ `所属时代 V6涡轮混动时代` → `/eras/hybrid-2014-2021`。卡片仍在 tab 条之下。
  2. `/seasons/2026`（进行中）：L1 `积分领跑 [基米·安东内利] · [梅赛德斯] · [F1 W17] · 320 分 · 领先 [乔治·拉塞尔] +84`；L2 `车队领跑 [梅赛德斯] · [F1 W17] · 556 分`（以当时积分榜为准）。
  3. `/eras/hybrid-2014-2021`：L1 `2014–2021 · 8 季 · 车手冠军最多 [刘易斯·汉密尔顿] 6 冠 · 车队冠军最多 [梅赛德斯] 8 冠`；L2 `胜场最多赛车 [F1 W07] 19 胜 · 举办最多 [红牛环] 10 届`（`spielberg`，2014–2021 含 2020 施蒂利亚站）。

**P0-22 一致性脚本 `scripts/hero-check.mjs`**
- 对 §0.6.2 的三个互通检查各取 3 组（维斯塔潘 / 红牛 / RB22 @2026；汉密尔顿 / 迈凯伦 / MP4-23 @2008；安东内利 / 梅赛德斯 / F1 W17 @ 铃鹿 2026 ↔ `/races/2026/3` ↔ `/seasons/2026`），抓每页 `[data-hero-line]` 的文本，断言同一事实在相对页面上出现（车手页的车队名 ∈ 车队页阵容；赛道页冠军 = 单场页冠军 = 年份赛历该站冠军）。
- 验收：`node scripts/hero-check.mjs` 全绿；`grep -rn "u.yLine\|k.dek\|y.dek\|e.rulers" app components` 返回 0（旧串联行全部迁移）。

执行顺序：P0-17 → P0-18 → P0-19 → P0-20 → P0-21 → P0-22。P0-18 做完先截图与 `scratchpad/hero/driver.png` 对比，像素级一致后再推其他页。

---

### 0.7 状态筛选（总览 / 年份 / 时期）v1（输入 26）— 页面上的一切随左栏状态走

> 用户原话：「左边导航是哪个阶段，就要看哪个阶段的事情啊。不应该是展示所有整体阶段，整体阶段只有在总览的时候出现啊。」「像这种，我选了 18 年到 20 年，你右边还是展示所有年份的信息。这个还是没有做到，筛选逻辑还是不对啊。」「这块和 2024 赛季就是一个重复信息了吧？没有用了吧？」（`/drivers/lewis-hamilton?year=2024` 年份带开头的赛季摘要卡）

#### 0.7.0 两条规则

**R1 状态规则。** 三个对象页（`/drivers/[id]`、`/teams/[id]`、`/circuits/[id]`）恰有三种状态，由左栏决定：**总览**（无参数）= 全部年份；**年份** `?year=Y` = 只有 Y；**时期** `?from=A&to=B` = 只有 A–B（含端点；来自栏的分组标题）。头图之下的**每一个区块**——阵容、成绩表、高光、趣事、解说要点、纪录簿、队友、赛车、图表、「全部 N 场」透视、档案——都只呈现当前状态里的内容。**全时段内容只出现在总览。**没有"筛一半"：一个区块要么按范围过滤并改题，要么在该状态下整体隐藏，要么换成范围专用变体（下表逐一裁决）。

**R2 去重规则。** 头图（§0.6）在年份 / 时期态已经把该范围的串联行、瓷砖（车队 · 赛车 · 引擎 / 阵容 / 冠军 · 杆位 · 最快圈）、月桂与数字行写全。**头图之下的任何区块不得重复头图在同一状态下已展示的信息**（同一组瓷砖 + 同一行数字）。年份带 / 时期区块直接从**新信息**开始（逐站成绩、队友对比、阵容大卡、领奖台三人、完整单场入口……）。删除清单见 §0.7.5。

**实测（2026-10-09，curl 抽文本）**：

| 页面 | 泄漏的全时段区块 |
|---|---|
| `/teams/mclaren?from=2018&to=2020` | 「历年阵容与赛车」列 2026…1966；透视题「全部 2121 场出赛」+ 年份下拉可跳出范围；「车队的故事」档案 `出赛 1966–2026 · 1009 场 / 车队冠军 1974…` |
| `/teams/mclaren?year=2019` | 同上三处；年份带开头 `P4 · 145 · 0 · 1 · 21` 数字行与「赛车与引擎 MCL34 雷诺」卡 = 头图重复 |
| `/drivers/lewis-hamilton?from=2007&to=2012` | 「每一个赛季」列 2007–2026；「历任队友」全时段；解说要点混进现在时的「下一站 在滨海湾…（2009）…（2025）」「纪录 美国站六冠」（正则年份命中）；透视「全部 396 场比赛」 |
| `/drivers/lewis-hamilton?year=2024` | 同上；年份带开头赛季摘要卡（车队标 · F1 W15 · 梅赛德斯引擎 · P7 / 223 / 2 / 5 / 0 / 24 · 肖像）= 头图重复 |
| `/circuits/monza?from=2000&to=2026`、`?year=1971` | 「历届比赛 76 场 · 1950–2026」+ 全部年份色带；「这里的故事」官方赛道图；透视「谁最擅长这里」全时段；年份带的站名 / 日期行与「杆位 / 最快圈」小块 = 头图重复 |

头图下半（口号 · 时代 · 月桂 · 数字）已由 `lib/hero.ts` 的 `scopeOf / inScope / teamTotals / driverTotals` 修好，三页三态抽查一致（迈凯伦 2018–20：`0 胜 · 3 领奖台 · 59 出赛`，时代行只列 V6 混动），**不再改**。

#### 0.7.1 一个共享机制：`lib/range.ts`（新建，纯函数，无 db 依赖，客户端组件可引）

```ts
export type Range = { from: number; to: number };
/** 页面状态：year 优先；都没有 = 总览（null） */
export const rangeOf = (year: number | null, period: Range | null): Range | null => (year ? { from: year, to: year } : period);
export const inRange = (y: number, r: Range | null) => !r || (y >= r.from && y <= r.to);
export const rangeLabel = (r: Range) => (r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`);
/** 区块标题：总览用原题；年份 / 时期用「{范围} {后缀}」，如 rangeTitle(r, "历年阵容与赛车", "阵容与赛车") → 「2018–2020 阵容与赛车」 */
export const rangeTitle = (r: Range | null, overview: string, suffix: string) => (r ? `${rangeLabel(r)} ${suffix}` : overview);
/** 范围内最近的两个存在年份（范围之外），给"未参赛 / 未举办"带用 */
export const nearestOutside = (ys: number[], r: Range) => ({ prev: [...ys].reverse().find((y) => y < r.from) ?? null, next: ys.find((y) => y > r.to) ?? null });
/** 策展条目：有 year 字段按 year；没有的（趣事）按标题 / 正文里写到的赛季；r=null 全给 */
export function rangeItems<T extends { year?: number | null; title?: string; text?: string }>(items: T[], r: Range | null): T[] {
  if (!r) return items;
  return items.filter((x) => x.year != null ? inRange(x.year, r)
    : (`${x.title ?? ""} ${x.text ?? ""}`.match(/(19|20)\d{2}/g) ?? []).some((y) => inRange(+y, r)));
}
```

`lib/hero.ts` 里的 `forYear / forPeriod / parsePeriod` 保留给头图自己用，页面层**只用** `rangeItems`（语义与 `forYear`∪`forPeriod` 相同，一处实现）。`teamTotals / driverTotals` 加 `export`（时期解说要点复用，§0.7.3），其余不动。

**每页开头统一四行**（三页相同，之后所有区块只认 `range`）：

```ts
const year = parseYear(sp.year);
const period = year ? null : parsePeriod(sp);
const range = rangeOf(year, period);                 // null = 总览
const exists = !range || ys.some((y) => inRange(y, range));   // ys = driverYears / constructorYears / circuitYears
```

**不存在态**（`range && !exists`，含手输的 `?from=1950&to=1960`）：页面 = 头图 + 栏 + 一条带，**其余区块全部不渲染**（现状在「Y 年未参赛」下仍渲染全时段阵容、故事，属泄漏）。带用 `YearBand`，给它加可选 `to?: number`（`<YearSpan from={year} to={to} />`，label 改「时期」）：
- 年份：现状文案不变（`{名字} Y 年未参赛 · 出赛年份 A–B`，前后最近年份 → `?year=`；车队另有「同一支车队的不同名号」）。
- 时期：`{名字} <A–B> 未参赛 · 出赛年份 <首–末>` / 赛道 `… 未举办 F1 世锦赛分站 · 举办年份 …`，`prev / next = nearestOutside(ys, range)` → `?year=`。

#### 0.7.2 区块裁决表（三页 × 三态）

记法：**原样** = 总览现状；**过滤 + 改题** = `items.filter(inRange)` + `rangeTitle`；**隐藏** = 不渲染；**变体** = 范围专用组件。所有改题区块的 `.sec-head` 右侧加 `<Link href={base} className="sub">看全部年份</Link>`（`base` = 对象总览 URL；与 `YearBand` 的「看全部年份」同款语义）。

**A. 车手 `/drivers/[id]`**

| 区块（现文件位置） | 总览 | 年份 `?year=Y` | 时期 `?from&to` |
|---|---|---|---|
| 头图 `ObjectHero`（`lib/hero.ts driverHero`） | 原样 | 原样（已修） | 原样（已修） |
| 「Y 赛季」带 `YearBand` + `DriverYear` | — | 保留，但 **删掉开头赛季摘要卡**（`u.season`：车队标 · 赛车 · 引擎 · 月桂 · 6 格数字 · 肖像，全是头图已有）；带从「逐站成绩」开始，然后「队友对比」。`sub` 文案改「{名} 的 Y 赛季：逐站成绩与队友对比」 | — （时期没有带；头图承担摘要） |
| 解说要点 `TalkingPoints`（`lib/talk.ts driverTalk` + `notes.driver` + `driverRecords`） | 原样（含纪录簿） | `driverYearTalk`（现状） | **变体** `driverPeriodTalk(id, range)`（§0.7.3）；**不传 `records`**（纪录簿是全时段，只在总览） |
| 「每一个赛季」生涯格（`page.tsx` `byYear` → `k.cell`） | 原样 | **隐藏**（年份带已是那一年；栏负责换年） | 过滤 `[...byYear].filter(([y]) => inRange(y, range))`；题 `rangeTitle(range, "每一个赛季", "的每一个赛季")` → 「2007–2012 的每一个赛季」；格内年份芯片 `EntityLink kind="year"` 的 `href` 改为 `yHref(y)`（同对象 `?year=Y`，hover 仍是赛季卡）；`card-link` 不变 |
| 透视 `Cube`（「全部 N 场比赛」） | 原样 | 过滤 + 锁定（§0.7.4）；题 `${Y} 赛季 ${n} 场比赛` | 过滤 + 锁定；题 `${A–B} ${n} 场比赛` |
| 「人物」传记 + 维基来源 + 「F1 家族」 | 原样 | **隐藏** | **隐藏** |
| 「历任队友」（`mates`） | 原样（在人物侧栏） | **隐藏**（年份带有「队友对比」） | **变体**：独立小节「{A–B} 的队友」，`mates.filter((m) => inRange(m.year, range))` 按 id 去重，`sub` = 范围内年份（现有压缩写法 `2008, 2009` / `2010–2012`）；空 → 整节隐藏 |
| 「高光时刻」`LinkedMoments` / 「你可能不知道」`LinkedAnecdotes` | 原样（题「高光时刻」「你可能不知道」） | 从「人物」节里**搬出**成独立 `band band-paper`；`rangeItems`；题 `rangeTitle(range, "高光时刻", "年高光时刻")`（年份态 → 「2008 年高光时刻」；时期态后缀 `高光时刻` → 「2007–2012 高光时刻」——`rangeTitle` 调两次或传后缀前判断 `range.from===range.to`）；趣事题「2007–2012 · 你可能不知道」；两者都空 → 整节隐藏 | 同左 |

**B. 车队 `/teams/[id]`**

| 区块 | 总览 | 年份 | 时期 |
|---|---|---|---|
| 头图 `teamHero` | 原样 | 原样 | 原样 |
| 「Y 赛季」带 + `TeamYear` | — | 保留，但 **删掉 `u.teamStats` 数字行**（P · 积分 · 胜场 · 领奖台 · 1-2 · 出赛 + 两枚月桂 = 头图）和 **「赛车与引擎」卡**（头图已有赛车 + 引擎瓷砖，含车图）；带从「阵容 · N 位车手」大卡开始（每人成绩是新信息）。F1DB 无底盘记录那行提示（`t.cars.length === 0`）随卡一起删。`sub` 改「{名} 的 Y 赛季：阵容与每位车手的成绩」 | — |
| 解说要点 | 原样（含纪录簿） | `teamYearTalk`（现状） | **变体** `teamPeriodTalk(id, range)`；无 `records` |
| 「历年阵容与赛车」（`decades` → `t.yRow`） | 原样（含「更早」折叠） | **隐藏**（年份带的阵容大卡已覆盖） | 过滤 `years.filter((y) => inRange(y, range))`；题 `rangeTitle(range, "历年阵容与赛车", "阵容与赛车")` → 「2018–2020 阵容与赛车」；范围 ≤ 15 季：**扁平列表**，无年代标签、无「更早」折叠；> 15 季：保留年代标签，全部展开。行内链接不变（年份 → `yHref`；车手 → `/drivers/{d}?team={id}&from={y}&to={y}`；赛车 → `/cars/{id}`） |
| 透视 `Cube`（「全部 N 场出赛」） | 原样 | 过滤 + 锁定；题 `${Y} 赛季 ${n} 场出赛` | 过滤 + 锁定；题 `${A–B} ${n} 场出赛` |
| 「车队的故事」传记 + 档案（基地 · 出赛 · 最近赛车 · 车队冠军 · 车手冠军）+ 维基 | 原样 | **隐藏** | **隐藏**（范围内的冠军 / 出赛已在头图数字行） |
| 「高光时刻」/「你可能不知道」 | 原样 | 搬出成独立节，`rangeItems` + 改题（同车手） | 同左 |

**C. 赛道 `/circuits/[id]`**

| 区块 | 总览 | 年份 | 时期 |
|---|---|---|---|
| 头图 `circuitHero`（含 `after` 的 3D 模型说明） | 原样 | 原样 | 原样 |
| 「Y 年在这里」带 + `CircuitYear` | — | 保留，但 **删掉每场的 `u.raceHead`（站名 · 第 R 站 · 日期 · 圈数）**、**删掉 `u.extras`（杆位 / 最快圈）**——都在头图串联行。**例外**：同年多场（2020 穆杰罗 / 伊莫拉式双站、`races.length > 1`）时每场保留一行 `raceHead` 以区分。带 = 领奖台三张大卡（P2 / P3 的差距、发车位是新信息）+ 「完整单场 / 计时回放」按钮。`sub` 改「{名} 的 Y 年：领奖台与完整单场」 | — |
| 解说要点 | 原样（含纪录簿） | `circuitYearTalk`（现状） | **变体** `circuitPeriodTalk(id, range)`；无 `records` |
| 「历届比赛」（`sec-head` 统计 + `YearStrip` + `c.list`） | 原样 | **隐藏**（年份带就是那一年那场） | 过滤 `races.filter((r) => inRange(r.year, range))`；题 `rangeTitle(range, "历届比赛", "的比赛")` → 「2000–2026 的比赛」；`sub` 的 `N 场 · A–B · 胜场最多：X（n 胜）` 用**范围内**的 `winsBy / king` 重算；`YearStrip` 只传范围内的 `races`（其头部「首届 / 最近 / 共 N 场」随之变成范围值）；无「更早」折叠，范围跨 ≥ 2 个年代才显示年代标签；列表的年份格 `EntityLink` `href` 改为 `/circuits/{id}?year={r.year}`（同对象；色带芯片仍 → `/races/Y/R`，其图例写明"点击进入那一站"） |
| 透视 `Cube`「谁最擅长这里」 | 原样 | **隐藏**（一年一场，无"最擅长"可言；领奖台在带里） | 过滤 + 锁定；题 「2000–2026 谁最擅长这里」 |
| 「这里的故事」概述 + 官方赛道图 + 故事照片 + 维基 | 原样 | **隐藏** | **隐藏** |
| 「这里发生过」`Moments`（`content.moments`） | 原样，题「这里发生过」 | 搬出成独立节；`rangeItems`；题「1971 年这里发生过」（现状） | 独立节；题「2000–2026 这里发生过」；空 → 隐藏 |

**D. 赛车 `/cars/[id]`**：本身是「车队 × 年份」切片（§4.5），不接受 `?year / ?from`，栏分组 `slice=false` 无链接——**没有三态，不改**。

**E. 空态文案**（范围来自栏分组时成绩类区块不会空；手输范围走 0.7.1 的不存在态；下列是对象存在但该区块无数据时）：

| 区块 | 文案 |
|---|---|
| 透视 `Cube`（范围内 0 行；如报名未出赛） | `这一时期没有出赛记录`（年份态 `Y 赛季没有出赛记录`），替代表格，筛选条不渲染 |
| 阵容与赛车 / 每一个赛季 / 的比赛 | `这一时期没有记录`（理论上不可达，兜底） |
| 的队友 | 整节隐藏 |
| 解说要点 / 高光时刻 / 你可能不知道 / 这里发生过 | 整节隐藏（现状做法；策展内容可选，不提示） |

#### 0.7.3 时期解说要点 `driverPeriodTalk / teamPeriodTalk / circuitPeriodTalk`（`components/unit/yearTalk.ts` 新增三函数，与 `*YearTalk` 同形 `{ notes, auto }`）

现状用 `forPeriod(driverTalk(id))` 正则抓年份，把现在时条目（`最近一次`、`下一站`、`现役`）也放进来——**废止**。时期态的 `auto` 必须**只由范围内的数据计算**，`notes` 只取范围内的策展：

- `notes`（三页同法，`uniq` 去重，按年倒序，最多 16 条）：`notes.X(id).filter(n => inRange(n.year))` + 范围内的 `highlights / moments`（`fromMoment`，tag 故事线）+ `notes.season(y)`（y ∈ 范围 ∩ ys）中提到主体的条目（车手按姓氏、车队按中文名、赛道按 `circuit` 字段——与 `*YearTalk` 相同判法）。
- `auto` 车手（用 `driverTotals(id, range)`）：
  1. 「数字」`${rangeLabel} 战绩`：`${starts} 站出赛，${wins} 胜、${podiums} 次领奖台、${poles} 次杆位，${points} 分。`
  2. 「里程碑」每个范围内的冠军年：`${y} 年世界冠军`（href `/drivers/{id}?year={y}`）；> 3 个合并一条「{n} 次世界冠军：y1、y2…」。
  3. 「里程碑」生涯首胜 / 首杆 / 首个领奖台落在范围内的：`生涯首胜：${y} ${gp}`（href 单场）。
  4. 「数字」范围内效力 > 1 支车队：`效力 ${n} 支车队：迈凯伦（2007–2012）、梅赛德斯（2013–2024）`。
  5. 无冠军时「数字」最佳赛季：`最佳赛季 ${y} 年第 ${pos}`（href `?year=`）。
- `auto` 车队（`teamTotals(subject, range)`，`subject` 同 `teamPeriod` 的谱系判定）：战绩（含 `oneTwo` 包揽前二）；车队冠军年 / 车手冠军年（名字）；范围内 > 1 家引擎：`用过 ${n} 家引擎：本田（2015–2017）、雷诺（2018–2020）`；范围内车手名单（≤ 8 人）：`${n} 位车手为车队出赛：…`；无冠军时最佳赛季。
- `auto` 赛道（范围内 `circuitRaces`）：`共举办 ${n} 届`；夺冠最多 / 杆位最多（若 ≥ 2 次）；范围内最快圈（`fastest_lap` 最小 `time_millis`，写 `${time} · ${y}`，href 单场）；最大逆转（冠军发车位 > 3）。
- 绝不出现 `最近一次 / 下一站 / 现役` 标签；不传 `records`。标题沿用 `${heroModel.crumbs.at(-1)?.label} 解说要点`，`subject` = `${名} · ${rangeLabel}`；空 → 不渲染。

#### 0.7.4 透视 `Cube` 的范围锁定（`components/cube/Cube.tsx`，客户端）

新 prop `range?: Range | null`（类型从 `lib/range.ts` 引，纯类型）：
- 页面**先过滤**再传：`data={{ ...cube, rows: cube.rows.filter((f) => inRange(f.y, range)) }}`，`title` 由页面按 0.7.2 给，`key={range ? rangeLabel(range) : "all"}`。
- `range` 存在时：年份下拉**不渲染**（`years` 本就只剩范围内）；`flt.from / flt.to` 不再从 `initial` 取（删掉 `initial.from/to` 的传入）；URL 同步 `useEffect` **跳过 `from / to` 两键**（保持地址栏的 `?from&to` 或 `?year`，不再把 `?year=2019` 写成 `?year=2019&from=2019&to=2019`）；「清除筛选」只清 driver / team / circuit。
- 跨对象链接 `href(dim, id)` 在 `range` 存在时追加 `&from=${range.from}&to=${range.to}`（与阵容表的车手链接同规则：从一个对象的时期进入另一个对象的同一时期）。
- `rows.length === 0` → 渲染 0.7.2 E 的空态一行，不渲染筛选条与表格。

#### 0.7.5 链接规则（筛选后的区块内）

1. **年份芯片 → 同对象的 `?year=Y`**：生涯格、阵容表、赛道列表的年份格一律 `yHref(y)`；`EntityLink kind="year"` 保留，hover 仍是赛季卡。赛道「举办年份」色带芯片例外（→ `/races/Y/R`，图例已声明）。
2. **跨对象链接带上切片**：`?{fixed}={id}&from=A&to=B`（透视、阵容表现状）。
3. **「看全部年份」→ 对象总览 `base`**，出现在 `YearBand` 与每个改题区块头。
4. 头图、栏、面包屑不在本节范围（§0.6、§1.2、§0.5.6）。

#### 0.7.6 实施清单 v1（给 Opus；只动下列文件）

**S-1 `lib/range.ts`**（新建）：0.7.1 的全部导出。`lib/hero.ts`：`teamTotals`、`driverTotals` 前加 `export`，其余不动。`components/unit/YearBand.tsx`：加 `to?: number`。

**S-2 `components/unit/yearTalk.ts`**：新增 `driverPeriodTalk / teamPeriodTalk / circuitPeriodTalk`（0.7.3）。

**S-3 `components/cube/Cube.tsx`**：`range` prop（0.7.4）。

**S-4 去重（R2）**：`components/unit/DriverYear.tsx` 删 `u.season` 整块（含 `sKick / stats / sPhoto`）；`components/unit/TeamYear.tsx` 删 `u.teamStats` 行与「赛车与引擎」块（`u.cars` 及 `h3`）；`components/unit/CircuitYear.tsx` 删 `u.raceHead`（`races.length > 1` 时保留）与 `u.extras`。`unit.module.css` 里对应 class 留一轮不删。

**S-5 `app/(site)/drivers/[id]/page.tsx`**：四行状态头 + 不存在态早退；解说要点三分支（时期用 `driverPeriodTalk`，无 `records`）；「每一个赛季」年份隐藏 / 时期过滤改题 + 年份芯片 `yHref`；`Cube` 过滤 + `range` + 题；「人物」节总览 only；时期「{A–B} 的队友」节；高光 / 趣事搬出成独立节 + `rangeItems` + 改题；删 `forYear / forPeriod` 引用。

**S-6 `app/(site)/teams/[id]/page.tsx`**：同 S-5 结构；「历年阵容与赛车」年份隐藏 / 时期过滤改题（≤ 15 季扁平）；「车队的故事」总览 only；高光 / 趣事独立节。

**S-7 `app/(site)/circuits/[id]/page.tsx`**：同结构；「历届比赛」年份隐藏 / 时期过滤改题（`winsBy / king / YearStrip` 用范围内 `races`，年份格 → `?year=`）；`Cube` 年份隐藏 / 时期过滤；「这里的故事」总览 only；「这里发生过」独立节改题。

**验收**（`curl -s URL | perl -pe 's/<script.*?<\/script>//gs; s/<[^>]+>/ /g'` 后 grep）：
1. `/teams/mclaren?from=2018&to=2020`：含「2018–2020 阵容与赛车」且阵容区只有 2020 / 2019 / 2018 三行；不含「历年阵容与赛车」「车队的故事」「2026」「MCL40」「1966」；透视题形如「2018–2020 118 场出赛」（数字以实际为准），不含「全部 2121」；地址栏加载后仍是 `?from=2018&to=2020`。
2. `/teams/mclaren?year=2019`：不含「历年阵容与赛车」「车队的故事」；年份带内不含「赛车与引擎」，`P4 排名 145 积分` 只在头图出现一次；地址栏不被改成 `&from=2019&to=2019`。
3. `/teams/mclaren`：与改前逐字相同（除高光 / 趣事从「车队的故事」内搬到其后的独立节）。
4. `/drivers/lewis-hamilton?from=2007&to=2012`：「2007–2012 的每一个赛季」六格，不含「2013」「梅赛德斯」格；解说要点不含「下一站」「最近一次」「纪录簿」，含「2007–2012 战绩」「2008 年世界冠军」；含「2007–2012 的队友」= 阿隆索、科瓦莱宁、巴顿；不含「人物」「F1 家族」「历任队友」。
5. `/drivers/lewis-hamilton?year=2024`：年份带第一个子标题是「逐站成绩」，带内不含「F1 W15」「223」肖像卡；不含「每一个赛季」。
6. `/circuits/monza?from=2000&to=2026`：「2000–2026 的比赛」与「27 场 · 2000–2026」（数字以实际为准），色带不含「1950」；「2000–2026 谁最擅长这里」；「2000–2026 这里发生过」；不含「这里的故事」「官方赛道图」。
7. `/circuits/monza?year=1971`：不含「历届比赛」「谁最擅长这里」「这里的故事」；年份带内不含「第 9 站 1971-09-05」行与「杆位 克里斯·阿蒙」小块（它们只在头图）；含三张领奖台卡与「完整单场」。
8. `/teams/mclaren?from=1950&to=1960`：只有头图 + 「1950–1960 时期」带「迈凯伦 1950–1960 未参赛 · 出赛年份 1966–2026」+ 「之后最近 1966」；页面不含「阵容」「场出赛」。
9. `npx tsc --noEmit -p .` 干净；`grep -rn "forYear\|forPeriod" app` 返回 0（页面层全走 `rangeItems`）。

### 0.8 去重与精简 v1（输入 27）— 一个事实在一页只出现一次

> 用户原话：「整体复盘下来，基于这种总览筛选的逻辑，原来页面里的一些重复信息可以删掉，让页面信息更加简单干净一点。」

**实测（2026-10-09，curl 抽文本 + 读源码；抽样 27 个 URL，文本存 `scratchpad/txt/`）**。§0.7 已删掉三个对象页年份带开头的赛季摘要卡与重复头图的解说要点；这一轮把**同一页上重复第二次的信息**全部列出来裁决。下表只记"重复"；未列出的区块一律保留不动。

#### 0.8.0 原则

1. **头图是事实源。** 对象页里，瓷砖 + 数字行 + 头行 + 元信息已把该状态的"是谁 · 在哪 · 连着谁 · 几个数"写全；头图之下的区块只放**新信息**（§0.7 R2 推广到全站，含赛车页、赛季卡、单场、时代卡）。
2. **头图内部四个槽互斥。** 同一个键（冠军数、胜场、积分、举办届数、引擎名、长度、方向……）只能出现在 头行 / 元信息 / 瓷砖 / 月桂 / 数字行 之一。瓷砖优先（它有链接与上下文），其次数字行，最后月桂。
3. **回到总览只有两处：** 年份栏的 总览 行（`lib/railData.ts` 的 `home.sub = "总览"`）与面包屑里的对象名。区块头与年份带不再放「看全部年份」（废止 §0.7.2 开头那句与 §0.7.5 第 3 条）。
4. **策展内容只出现在它自己的区块。** 高光时刻 / 这里发生过 / 赛季故事线 不再复制进 解说要点；解说要点 = 自动计算 + 不属于任何高光的笔记。
5. **自动解说要点与纪录簿不得重述瓷砖 / 数字行已有的数。**（最擅长赛道、为车队赢得最多、队内对比、冠军从第 N 位起步、N 位不同的分站冠军……）
6. **眉题（kicker）+ 标题 + 副题不得同义**；年份中枢的 tab 页不放英文眉题（tab 栏就是眉题）。
7. **删优先于并。** 只有"被删处有且仅有它才有的小字"时才并入别处（赛车名并入透视表、车手冠军姓并入战绩瓷砖、领先亚军分差并入车手冠军瓷砖）。
8. **R1 不变**：删除不改变三态各自的范围；不存在态（§0.7.1）不变。
9. **跨页重复不算**（/seasons 的"2026 进行中"块与 /live、/seasons 的赛季卡与时代页）；但同一中枢下的 tab 互为一页。

#### 0.8.1 需要用户拍板的三处（不默默决定；下面各表按"建议"写，实施前先问）

| # | 问题 | 建议 | 备选 |
|---|---|---|---|
| **D1** | 车手 / 车队头图（总览、时期态）的**月桂行**与**冠军瓷砖**重复：「7 届 世界冠军」月桂 = 「世界冠军 7 届 · 2008、2014 … 2020」瓷砖；迈凯伦「10 届 车队冠军 · 13 届 车手冠军」月桂 = 「冠军 10 届」瓷砖。且胜场 / 杆位 / 领奖台一半画成月桂、一半留在数字行，是同一组数字的两种画法 | **A′：删掉车手 / 车队头图的全部月桂**；数字行承载全部数字（世界冠军除外——它在瓷砖里，带月桂小图标）。头图 = 头行 · 瓷砖 · 口号 · 时代 · 数字行。赛车 / 赛季 / 单场的月桂另有裁决（见各表） | A：只删冠军类月桂（世界冠军 / 车队冠军 / 车手冠军），保留 分站冠军 / 杆位 / 领奖台 月桂；或 C：维持现状 |
| **D2** | 车手 `?year=Y` 的年份带「逐站成绩」色带（R1 7 · R2 9 …）与透视「按赛道」视图（同年 24 行）是同一组逐站名次的两种详略 | **删色带与图例**，年份带只剩「队友对比」；透视在年份态默认「按赛道」，隐藏只剩 1 组的视图（按年份 / 按车队） | 保留色带，年份态隐藏透视（损失逐场积分 / 发车位表） |
| **D3** | 年份中枢两个 tab 是别处的缩略版：**「赛车」tab** 的每行（年份 · P · 赛车 · 车队 · 引擎 · 车手）是「车队」tab 卡片的子集（车队卡已含赛车链接 + 引擎 + 车手）；**「时代」tab** = `/eras/[id]` 去掉赛道的缩略版，而头图的「所属时代」已直接链去 `/eras/[id]` | **删这两个 tab**（§0.5 的 tab 表相应减两行；`/seasons/Y/cars`、`/seasons/Y/era` 路由 308 → `/seasons/Y/teams`、`/eras/{id}`） | 只删「赛车」；或都留 |

#### 0.8.2 全站通用（三条改动，影响所有对象页）

| 元素 | 与谁重复 | 裁决 | 文件 |
|---|---|---|---|
| 「看全部年份」链接（`YearBand` 右上 + 三个对象页每个改题区块头的 `rangeHead`） | 年份栏 总览 行；面包屑对象名 | **删**（全部） | `components/unit/YearBand.tsx` 删 `u.clear` 链接与 `clearHref` prop；`app/(site)/{drivers,teams,circuits}/[id]/page.tsx` 删 `rangeHead` 及其引用 |
| 透视 `Cube` 顶部汇总行「396 场 · 106 胜 · 208 领奖台 · 104 杆位 · 5149.5 分」 | 头图数字行 / 月桂（且积分口径不同：头图 5233 含冲刺分，透视 5149.5 不含；车队页 48 场 = 车次，头图 出赛 24 = 场次） | **只在 driver / team / circuit 任一筛选激活时渲染**（那时它是"筛选小计"，是新信息）；无筛选不渲染 | `components/cube/Cube.tsx` L191–196：条件 `total && (flt.driver \|\| flt.team \|\| flt.circuit)` |
| 年份 / 时期解说要点 `notes` 里的 `fromMoment` 条目（高光时刻 / 这里发生过 / `momentsFor` 复制成「故事线」） | 同页独立的「Y 年高光时刻」「A–B 高光时刻」「这里发生过」节 | **删**：`driverYearTalk / teamYearTalk / circuitYearTalk` 与三个 `*PeriodTalk` 的 `notes` 不再拼入 `fromMoment(...)`；`notes.season(y)` 里提到主体的条目与 `notes.X(id)` 照旧。§0.7.3「范围内的 highlights / moments（fromMoment，tag 故事线）」一句废止 | `components/unit/yearTalk.ts` L26、55、70–71、99、128、148–149；`fromMoment` 不再被引用则删 |

#### 0.8.3 车手 `/drivers/[id]`

| 状态 | 元素 | 与谁重复 | 裁决 | 文件 · 组件 |
|---|---|---|---|---|
| 总览 | 月桂「7 届 世界冠军 · 106 场 分站冠军 · 104 次 杆位 · 208 次 领奖台」 | 瓷砖「世界冠军 7 届 2008、2014 … 2020」；数字行（已隐藏月桂键，形成两行数字） | **D1**（建议 A′：`laurels = []`，`stats` 显示 胜场 · 领奖台 · 杆位 · 最快圈 · 出赛 · 积分 · 大满贯；世界冠军键仍不进数字行——在瓷砖） | `lib/hero.ts` `driverHero` L497–514 |
| 总览 | 解说要点 auto「纪录 · 最擅长：银石赛道（出赛 21 次，9 胜、16 领奖台）」 | 瓷砖「最擅长赛道 银石赛道 9 胜」 | **删** | `lib/talk.ts` `driverTalk` L153 |
| 总览 · 时期 | 「每一个赛季」/「2013–2024 的每一个赛季」生涯格（年 · P · 车队 · 赛车 · 积分） | 透视「按年份」行（年 · 车队 · 总成绩 · 出赛 · 胜 · 领奖台 · 杆位 · 积分 · 逐场）+ 年份栏（每季名次 + 胜） | **删整节**；**合并**：赛车名（唯一只在此处的小字）并入透视「按年份」行的车队格：「梅赛德斯 · F1 W15」（链 `/cars/{id}`） | `app/(site)/drivers/[id]/page.tsx` 删 `byYear` 节（`s.career / k.cell`）；`components/cube/Cube.tsx` 新 prop `cars?: Record<string, { id: string; name: string }>`（键 `${y}\|${t}`），页面从 `entries` 的 `chassis / chassisIds` 生成；`team` 维度同样传（车队页 `chassis` 表） |
| 总览 | 「人物」「F1 家族」「历任队友」「纪录簿」「高光时刻」「你可能不知道」 | — | 保留（队友的年份、家族、纪录都只在这里） | — |
| 年份 | 数字行「积分 223」 | 瓷砖「排名 P7 · 年终 · 223 分」 | **删**年份态数字行的 积分 键（时期 / 总览不变） | `lib/hero.ts` `driverHero` stats：`{ k: "积分", laurel: !!year }` 式隐藏 |
| 年份 | 解说要点 auto「数字 · 队内对比：拉塞尔（同场 24 站，名次 9:15，发车位 5:17，积分 223 对 245）」 | 年份带「队友对比」块（同一组数字） | **删** | `components/unit/yearTalk.ts` `driverYearTalk` L46 |
| 年份 | 年份带「逐站成绩」色带 + 图例 | 透视「按赛道」（年份态 = 一行一站） | **D2**（建议删；`sub` 改「{名} 的 Y 赛季：队友对比」；无队友时带只放一句「本季无同队队友」——不可达则略） | `components/unit/DriverYear.tsx` 删 `u.strip / u.legend` 与 `h3 逐站成绩`；`Cube.tsx`：`range` 为单年时 `defaultView = "circuit"`，`views` 过滤掉分组数 ≤ 1 的维度（矩阵保留） |
| 时期 | 月桂「6 届 世界冠军 · 84 场 分站冠军 …」 | 瓷砖「最佳排名 P1 · 世界冠军 2014、2015、2017…」 | **D1** | 同上 |
| 时期 | 「2013–2024 的队友」节（罗斯伯格 2013–2016 · 博塔斯 · 拉塞尔） | 瓷砖「队友 博塔斯 · 罗斯伯格 · 拉塞尔」 | **只在 `pMates.length > 3` 时渲染**（瓷砖最多 3 人，超出时这一节才有新名字）；≤ 3 删 | `app/(site)/drivers/[id]/page.tsx` 条件 `period && pMates.length > 3` |

#### 0.8.4 车队 `/teams/[id]`

| 状态 | 元素 | 与谁重复 | 裁决 | 文件 · 组件 |
|---|---|---|---|---|
| 总览 | 瓷砖「冠军 10 届」的子行「车队冠军 10 届 · 车手冠军 13 届」 | 瓷砖自身的值 | 子行只留「车手冠军 13 届」 | `lib/hero.ts` `teamOverviewTiles` L298 |
| 总览 | 月桂「10 届 车队冠军 · 13 届 车手冠军 · 205 场 分站冠军」 | 瓷砖 冠军；数字行 | **D1**（A′：`laurels = []`；数字行 = 胜场 · 一二名 · 杆位 · 领奖台 · 出赛，车队冠军 / 车手冠军 仍在瓷砖） | `lib/hero.ts` `teamHero` L595–608 |
| 总览 | 纪录簿「为车队赢得最多 35 胜 埃尔顿·塞纳」 | 瓷砖「传奇车手 塞纳 35 胜」 | **删**；当瓷砖是「出赛最多」（`legend.w === 0`）时改删「为车队出赛最多」 | `lib/records.ts` `teamRecords` L109 / L112（加参数或在 page 过滤 `label`） |
| 总览 | 「车队的故事」右侧**档案**框：基地 · 出赛 1966–2026 · 1009 场 · 最近赛车 MCL40 · 梅赛德斯 动力 · 车队冠军 年份表 · 车手冠军 13 次 | 元信息「英国 · 英国沃金」；头行「出赛 1966 – 2026」；数字行 出赛 1009；阵容表首行 MCL40 梅赛德斯引擎；阵容表各年的 车队冠军 月桂；瓷砖 冠军 | **删整个档案框**（传记正文 + 维基来源保留，`twoCol` 变单列） | `app/(site)/teams/[id]/page.tsx` 删 `<aside className={s.sideBox}>…档案…</aside>` 及 `driverTitles / titleYears` 的档案用法（`titleYears` 阵容表仍用） |
| 年份 | 数字行「胜场 6」 | 瓷砖「排名 车队冠军 P1 · 年终 · 6 胜 · 666 分」 | **删**年份态数字行的 胜场 键 | `lib/hero.ts` `teamHero` stats L603：`laurel: (!year && t.wins > 0) \|\| !!year` |
| 年份 · 时期 | 「历年阵容与赛车」/「2018–2020 阵容与赛车」、阵容大卡、透视 | — | 保留（每年每人的名次是新信息） | — |

#### 0.8.5 赛道 `/circuits/[id]`

| 状态 | 元素 | 与谁重复 | 裁决 | 文件 · 组件 |
|---|---|---|---|---|
| 总览 | 数字行「举办场次 76 · 首届大奖赛 1950」 | 头行「总览 · 历史 · 举办 76 届 1950 – 2026 · 最近 …」 | **删**这两格；数字行 = 赛道长度 · 弯道 | `lib/hero.ts` `circuitHero` stats L795–800 |
| 总览 · 三态 | 特征行「高速 / 长直道 / 减速弯 / **顺时针** / 1922年启用」 | 元信息「意大利 · Monza · 永久赛道 · **顺时针**」 | 特征行过滤掉 `顺时针 / 逆时针` | `lib/hero.ts` `circuitHero` `traits: content?.traits?.filter((t) => !/顺时针\|逆时针/.test(t))` |
| 总览 · 时期 | 「历届比赛」/「2000–2026 的比赛」副题「76 场 · 1950 – 2026 · 胜场最多：汉密尔顿（5 胜）」 | 头行 举办 N 届 A–B；瓷砖 夺冠最多 | **删**副题（`winsBy / king / kingName` 若无他用一并删） | `app/(site)/circuits/[id]/page.tsx` `sec-head` 内 `<span className="sub">` |
| 总览 · 时期 | `YearStrip` 头「举办年份 · 首届 1950 · 最近 2026 · 共 76 场世界锦标赛分站」 | 头行 | **删**三个数字，只留图例「色块 = 当年冠军所在车队；悬停看那个赛季，点击进入那一站」 | `app/(site)/circuits/[id]/YearStrip.tsx` |
| 总览 | 纪录簿「杆位最多 7 次 汉密尔顿」 | 瓷砖「杆位最多 汉密尔顿 7 杆」 | **删** | `lib/records.ts` `circuitRecords` L53 |
| 总览 | 解说要点 auto「纪录 · 最大逆转：第 N 位起步夺冠」 | 纪录簿「最靠后起步的冠军 第 19 位 安东内利 · 2026」 | **删** auto（时期态的 `circuitPeriodTalk` 无纪录簿，其「最大逆转」保留） | `lib/talk.ts` `circuitTalk` L65 |
| 年份 | 年份带尾部「计时回放」按钮 | 头图 actions「计时回放 · 解说手册」 | **删**带内 计时回放，只留「完整单场」 | `components/unit/CircuitYear.tsx` `u.actions`（`replay` prop 可删） |
| 年份 | 解说要点 auto「冠军从第 4 位起步 / 杆位转化为胜利」 | 瓷砖 杆位；领奖台 P1 卡「发车位 P4」 | **删** | `components/unit/yearTalk.ts` `circuitYearTalk` L79–80 |
| 年份 | 解说要点 auto「第 74 次在这里举办 — 意大利大奖赛是 2024 年第 16 站，53 圈」 | 头行「2024 第 16 站 意大利大奖赛 · 2024-09-01」 | 保留标题；正文改「53 圈」（圈数是唯一新信息） | `yearTalk.ts` L78 |
| 年份 | 领奖台 P1 卡（勒克莱尔 · 法拉利 · 1:14:40.727 · 发车位 P4） | 瓷砖 冠军（名 + 用时）、冠军车队 | **保留**：领奖台是一组三张，P1 卡的发车位是新信息 | — |
| 时期 | 瓷砖「布局 7」子行「5.793 km · 11 弯 · 2000–2026」 | 数字行 赛道长度 5.793 · 弯道 11 | 子行只留年份跨度；**R1 顺手修**：时期态数字行的 长度 / 弯道 改用该布局（`lay.length / lay.turns`，老布局时与现行值不同） | `lib/hero.ts` `circuitPeriod` tiles + `circuitHero` stats |
| 时期 | 数字行「期间举办 27」 | 头行「布局 7 时期 · 2000 – 2026 · 举办 27 届」 | **删** | `lib/hero.ts` `circuitHero` stats（`heldIn` 只给头行用） |

#### 0.8.6 赛车 `/cars/[id]`

| 元素 | 与谁重复 | 裁决 | 文件 · 组件 |
|---|---|---|---|
| 元信息行「梅赛德斯-AMG F1 M15 1.6 V6 T H」 | 瓷砖「引擎 梅赛德斯-AMG F1 M15 1.6 V6 T H」 | 元信息只留「设计 …」（无设计师 → 元信息为空，槽不渲染） | `lib/hero.ts` `carHero` meta L859–862 |
| 月桂「2024 车队冠军」「1978 安德雷蒂 · 车手冠军」 | 瓷砖「战绩 车队冠军 P1」（月桂小图标 + 标签） | **删月桂**；**合并**：战绩瓷砖子行每季写「{y} 年终」+（该季有冠军时）「车队冠军」/「车手冠军 {姓}」（写法同 `teamTiles` 的 `车手冠军 ${dn(...).split(/[·・]/).pop()}`） | `lib/hero.ts` `carHero` L849–853 删 `laurels`；tiles 的 `valueTile("战绩", …)` sub 改写 |
| 瓷砖 战绩 子行「2024 年终 · 4 胜 · 468 分」 | 数字行「胜场 4 · 积分 468」 | 子行**不写胜 / 分**（上一行已定义）；数字行管全部数字。`teamStanding().sub` 由 `teamTiles`（车队年份态）共用，给 `carHero` 单独拼子行，不改 `teamStanding` | `lib/hero.ts` `carHero` |
| 侧栏「技术规格」框：引擎全名 · 排量 1.6 升 · 布局 V6 · 进气 TURBOCHARGED_HYBRID | 瓷砖 引擎（三者都是引擎串的拆写；进气枚举还没翻译） | **无 `c.tech` 时删整框**；有策展 `c.tech` 时保留（只渲染 `c.tech`，不再渲染引擎四行）。`设计：` 一行跟着框走——无框时已在元信息 | `app/(site)/cars/[id]/page.tsx` aside 第一个 `sideBox` |
| 侧栏「车手」框「拉塞尔 2024 · 汉密尔顿 2024」 | 瓷砖「车手 拉塞尔 · 汉密尔顿」 | **只在 多赛季（`years.length > 1`）或 车手 > 2 人 时渲染**（年份 / 第三人是新信息，如 Lotus 79）；否则删 | `app/(site)/cars/[id]/page.tsx` aside 第二个 `sideBox` |
| 「Era · 2022–2025 地面效应回归」段落（时代摘要全文） | 头图「所属时代 地面效应回归」→ `/eras/[id]`；时代页本身 | **删** | `app/(site)/cars/[id]/page.tsx` `k.era` 块（`reg / era` 若无他用一并删） |
| 「这是一辆怎样的车」「技术亮点」「它的每一场比赛」「前后几代」「2026 技术规则」 | — | 保留 | — |

#### 0.8.7 年份中枢 `/seasons/[year]` 与 tab

| 元素 | 与谁重复 | 裁决 | 文件 · 组件 |
|---|---|---|---|
| 赛季卡数字行「分站 24 · 不同冠军 7 · 车手 24 · 车队 10」 | 瓷砖「分站 24 站 · 7 位分站冠军」；tab 栏计数「赛历 24 · 车手 24 · 车队 10」 | **删整个数字行**（`stats: []`） | `lib/hero.ts` `seasonHero` L921–926 |
| 月桂「[迈凯伦] 第 9 座车队冠军」 | 瓷砖「车队冠军 迈凯伦 666 分」 | 月桂改 `top: "第 9 座"`，`bottom: "车队冠军"`，不再放队名链接；「第 4 冠 车手世界冠军」保留（第几冠是新信息） | `lib/hero.ts` `seasonHero` L911–913 |
| 肖像题注「世界冠军 · Max Verstappen」 | 眉题「世界冠军」+ 瓷砖 车手冠军 | **删** `figcaption`（§0.6.6：视觉就是主体） | `components/season/SeasonHero.tsx` |
| 赛季综述 `factSummary` 段「2024 赛季共24站，7位车手赢得过分站。维斯塔潘以437分、9场分站胜利夺得车手世界冠军，领先亚军诺里斯 63分。迈凯伦夺得车队锦标赛（666分）。」 | 头图瓷砖 | **删**；**合并**：唯一新信息「9 胜」「领先亚军 +63」并入 车手冠军 瓷砖子行——已完赛季也用进行中的写法：`[`437 分 · 9 胜 · 红牛`, `领先 诺里斯 +63`]` | `components/season/SeasonOverview.tsx` 删 `factSummary` 与 `s.facts`；`lib/hero.ts` `seasonHero` tiles L898–900 |
| 赛季综述 meta「所属时代 地面效应回归 · 来源 维基百科」 | 头图 `EraSpan`「所属时代 地面效应回归」 | 删「所属时代」，只留「来源 维基百科」 | `SeasonOverview.tsx` `s.meta` |
| 赛季综述右侧三条故事线（`notes.season(y).slice(0, 3)`） | 解说要点 notes（同三条逐字相同：拉斯维加斯封王 / 迈凯伦26年后夺冠 / 七位冠军） | **删** `<ol className={s.story}>`（综述 = 维基段落 + 来源） | `SeasonOverview.tsx` |
| 解说要点 auto「数字 · 7 位不同的分站冠军（24 场正赛产生了 7 位冠军，赢得最多的是维斯塔潘 9 胜）」 | 瓷砖 分站 子行；瓷砖 车手冠军 子行（并入 9 胜后） | **删** | `lib/talk.ts` `seasonTalk`（标题 `${n} 位不同的分站冠军` 那条） |
| tab「赛车」`/seasons/Y/cars` | tab「车队」卡片（P · 积分 · 胜场 · 赛车链接 · 引擎 · 车手） | **D3**（建议删 tab + 路由 308 → `/seasons/Y/teams`；`YearCarsGrid` 若只被此 tab 用则删） | `components/season/YearTabs.tsx` `TABS`；`app/(site)/seasons/[year]/cars/page.tsx` |
| tab「时代」`/seasons/Y/era` | 头图「所属时代」→ `/eras/[id]`；`/eras/[id]` 本页 | **D3**（建议删 tab + 路由 308 → `/eras/{eraOf(Y).id}`） | 同上；`app/(site)/seasons/[year]/era/page.tsx` |
| 各 tab 页顶部眉题「Drivers / Teams / Cars / Circuits / Schedule / Standings」 | tab 栏当前项「车手 / 车队 / …」+ h2「2024 年的 24 位车手」 | **删** tab 页的英文眉题：四个 grid 的 `heading` 改为 `kicker?: string \| null`（tab 页传 `null`，索引页传 `"Season"`）；`calendar/page.tsx` L57「Schedule」、`standings/page.tsx` L54「Standings」删；`standings` 内的「Drivers / Teams」小眉题保留（区分两张表） | `components/unit/Year{Drivers,Teams,Circuits,Cars}Grid.tsx`；`app/(site)/seasons/[year]/{calendar,standings}/page.tsx`；`app/(site)/{drivers,teams,circuits}/page.tsx` 传 `kicker="Season"` |
| 赛道 tab 每张卡的领奖台（1ST VER · 2ND PER · 3RD SAI） | 赛历 tab 每张卡同一领奖台 | **删** `YearCircuitsGrid` 的 `podium`（`CircuitCard` 不传 → 自动 `compact`）；赛道卡 = 站次 · 日期 · 大奖赛 · 届次 · 年份 | `components/unit/YearCircuitsGrid.tsx`（`pod` 查询一并删） |
| 积分榜 tab vs 车手 / 车队 tab | 同一排名两种形态 | 保留（表 + 逐站曲线 vs 带脸的卡片，功能不同） | — |

#### 0.8.8 时代 `/eras/[id]`（与年份中枢 时代 tab 同组件）

| 元素 | 与谁重复 | 裁决 | 文件 · 组件 |
|---|---|---|---|
| 时代卡数字行「赛季 4 · 分站 92」 | 头行「2022 – 2025 · 4 季 · 92 场」 | **删**两格；数字行 = 赛道 · 车手冠军 | `lib/hero.ts` `eraHero` stats L1047–1052 |
| 眉题「Era」 | 面包屑「历史 › 地面效应回归」+ h1 + 栏头 | **删** `eyebrow` | `lib/hero.ts` `eraHero` L1041 |
| 「N 个赛季的冠军」赛季卡 | 年份栏按年列冠军姓 | 保留（肖像、第几冠、分站数；时代页主体） | — |

#### 0.8.9 单场 `/races/[year]/[round]`

| 元素 | 与谁重复 | 裁决 | 文件 · 组件 |
|---|---|---|---|
| 冠军面板副行「红牛 · RB20 · 杆位起步 · 1:31:44.742」 | 瓷砖 冠军（含用时）· 车队 · 赛车 | 面板只留 脸 + 「冠军 P1」月桂 + 名字 + 「杆位起步 / 第 N 位起步」（发车位是新信息） | `app/(site)/races/[year]/[round]/page.tsx` `r.winDek`：删 `Team / Car / winTime` |
| 面板下「正赛前十 · 57 圈」塔 | 「正赛成绩」全表 | **删**塔（P2 / P3 `PodiumCells` 保留） | 同上 `r.tower` |
| 月桂「杆位 1:29.179」 | 瓷砖「杆位 维斯塔潘 1:29.179」 | **删** race 模式的 杆位 月桂（circuit 年份态不经此路径） | `lib/hero.ts` `raceHero` `add(pole, …)` L985 |
| 侧栏「最快圈 维斯塔潘 1:32.608 · 第 39 圈」框 | 月桂「最快圈 1:32.608」 | **删**框；**合并**：月桂 `bottom` 改「1:32.608 · 第 39 圈」 | `page.tsx` aside；`lib/hero.ts` `raceHero` L986（`fl.fastest_lap_lap`） |
| 侧栏「车手之日（票选）」框（前三票数） | 月桂「车手之日 31.36%」 | **删**框（第 2、3 名票数随之消失，可接受） | `page.tsx` aside |
| 分站翻页中间的 `dims`「2024 赛季 · 巴林国际赛道 · 维斯塔潘 · 红牛 · RB20」 | 头行 + 四枚瓷砖 | **删** `dims`，翻页只留 上一站 / 下一站（§4.6 的分站翻页保留） | `page.tsx` `r.dims` |
| 解说要点 auto「杆位转化为胜利 / 冠军从第 N 位起步」 | 面板发车位；成绩表 发车列；与「X 追回 N 位」同事实（2020 蒙扎：加斯利追回 9 位 + 冠军从第 10 位起步） | **删** | `lib/talk.ts` `raceTalk` L246 |
| 「百科中的这一站」同一事件的 车手条 + 赛道条（2020 蒙扎两条都写加斯利首胜） | 策展层面，两条来自不同对象 | 保留（内容问题，另立策展规则） | — |
| 正赛成绩表、本站后积分榜、排位赛、冲刺赛、进站 | — | 保留 | — |

#### 0.8.10 实时 `/live`

| 元素 | 与谁重复 | 裁决 | 文件 · 组件 |
|---|---|---|---|
| 分站卡列表里「下一站」卡的节次表（一练 周五 16:30 … 正赛 周日 20:00）+ 「前瞻 · 加入日历」 | 头图的节次表 + 「加入日历 · 本站前瞻 · 本站解说手册」 | 下一站卡只显示 标签「下一站」· 站名 · 日期（`sessions={false}`，不渲染 actions）；其余未来站卡不变 | `components/live/LivePage.tsx` `RoundCards` L193：`sessions={r.round !== nextRound}`；`lib/raceCards.tsx` `ScheduleCard` 的 `sessions=false` 分支不渲染 `actions` |
| 头图元信息「滨海湾街道赛道 · Singapore」 | h1「Singapore」 | `place_name` 与 h1 同词时不写 | `components/live/LivePage.tsx` `NextRaceHero` meta-line |
| 顶栏实时条「新加坡大奖赛 · 一练 进行中 · 实时计时 · 解说手册 · 赛历与日历订阅」 | 头图按钮 | 保留（全站壳，每页一致） | — |

#### 0.8.11 索引页 `/drivers` `/teams` `/circuits` `/cars` `/seasons`

| 元素 | 与谁重复 | 裁决 |
|---|---|---|
| `/circuits` 页眉题「Circuits」+ `YearCircuitsGrid` 区块眉题「Circuits」 | 同词两次 | grid 眉题走 0.8.7 的 `kicker` prop：索引页传「Season」（与 /drivers /teams 一致） |
| 页首一段介绍（「2026 赛季的 22 位车手，以及 1950 年以来全部 860 位…」） | 下方两个区块标题 | 保留（它说的是怎么用这页，不是数据） |
| `/seasons` 的「2026 进行中」块（下一站倒计时 · 最新一站领奖台 · 实时 / 完整赛历） | `/live` 头图（跨页） | 保留（原则 9） |

#### 0.8.12 验收（`t(){ curl -s "http://localhost:3210$1" \| perl -0pe 's/<script.*?<\/script>//gs; s/<[^>]+>/ /g; s/\s+/ /g'; }`；`n(){ t "$1" \| grep -o "$2" \| wc -l; }`）

1. 全站：`grep -rn "看全部年份" app components` = 0；`grep -n "fromMoment" components/unit/yearTalk.ts` = 0；`npx tsc --noEmit -p .` 干净。
2. `/drivers/lewis-hamilton`：不含「每一个赛季」「最擅长：」「396 场 · 106 胜」；含「全部 396 场比赛」；透视按年份行含「F1 W15」；`n … "7 届"` = 1（D1 后）。
3. `/drivers/lewis-hamilton?year=2024`：不含「队内对比」「24 场 · 2 胜」；`n … "银石第九次夺冠"` = 1（只在高光时刻）；原始 HTML `grep -c '<dt>积分'` = 0；D2 后不含「逐站成绩」，含「队友对比」。
4. `/drivers/lewis-hamilton?from=2013&to=2024`：不含「的每一个赛季」「的队友」；`n … "第92胜改写纪录"` = 1；地址栏仍 `?from=2013&to=2024`。
5. `/teams/mclaren`：不含「档案」「最近赛车」「为车队赢得最多」；`n … "35 胜"` = 1；`n … "10 届"` = 1；含「车手冠军 13 届」且不含「车队冠军 10 届」。
6. `/teams/mclaren?year=2024`：原始 HTML `grep -c '<dt>胜场'` = 0；`n … "时隔26年重夺"` = 1；不含「48 场 · 6 胜」。
7. `/circuits/monza`：不含「举办场次」「首届大奖赛」「首届 1950」「胜场最多：」「最大逆转」；`n … "顺时针"` = 1；`n … "杆位最多"` = 1（瓷砖）。
8. `/circuits/monza?year=2024`：`n … "计时回放"` = 1；不含「冠军从第」「杆位转化」；含「53 圈」；含三张领奖台卡与「完整单场」。
9. `/circuits/monza?from=2000&to=2026`：不含「期间举办」「5.793 km · 11 弯」「胜场最多：」；`n … "第19位逆转"` = 1（只在 这里发生过）。
10. `/cars/mercedes-f1-w15`：`n … "M15"` = 1；不含「技术规格」「排量」「TURBOCHARGED」「Era ·」「4 胜 · 468 分」；原始 HTML 不含 `>车手</h3>`。`/cars/mclaren-mcl38`：`n … "车队冠军"` = 1。`/cars/lotus-79`：含 `>车手</h3>`（两季），瓷砖含「车手冠军 安德雷蒂」。
11. `/seasons/2024`：原始 HTML `grep -c '<dd>'` 在赛季卡内 = 0（无数字行）；不含「不同冠军」「共24站」「世界冠军 · Max Verstappen」「7 位不同的分站冠军」；`n … "所属时代"` = 1；`n … "拉斯维加斯封王"` = 1；含「9 胜」与「+63」；D3 后原始 HTML 不含 `href="/seasons/2024/cars"`、`href="/seasons/2024/era"`，且 `curl -sI /seasons/2024/cars` 为 308 → `/seasons/2024/teams`。
12. `/seasons/2024/drivers` `/seasons/2024/teams` `/seasons/2024/circuits` `/seasons/2024/calendar`：原始 HTML `grep -c 'class="kicker">\(Drivers\|Teams\|Circuits\|Schedule\)<'` = 0；`/seasons/2024/circuits` 不含「1 ST 」，`/seasons/2024/calendar` 含「1 ST VER」；`/circuits` 含 `class="kicker">Season<` 且 `n … "Circuits"` = 1。
13. `/eras/ground-effect-2022-2025`：原始 HTML `grep -c '<dt>赛季\|<dt>分站'` = 0；不含眉题「Era」（`class="…eyebrow"` 元素不存在）；`n … "4 季"` = 1。
14. `/races/2024/1`：不含「正赛前十」「杆位转化为胜利」「车手之日（票选）」「RB20 下一站」；`n … "RB20"` = 1；`n … "1:29.179"` = 1；`n … "1:32.608"` = 1 且含「第 39 圈」；`n … "31.36%"` = 1；含「下一站 沙特阿拉伯大奖赛」与「本站后车手积分榜」。
15. `/live`：`t /live | perl -ne 'print $1 if /(下一站.*?)(Round \d+|$)/'` 不含「一练」「加入日历」；头图仍含「加入日历」「本站前瞻」。
16. 回归：§0.7.6 验收 1–9 仍通过（R1 不变；其中第 2 条「P4 排名 145 积分 只在头图出现一次」改为「只在头图出现一次且数字行无 胜场」）。

### 0.9 赛道弯角与分段 v1（输入 28）— 每条赛道的弯角有编号、有名字、hover 有解释

> 用户原话：「所有的赛道，有不同的赛道和弯角以及对应的名称，也都在地图上标识一下，或者可以 hover 到哪段都有说明，现在缺少这个部分。」

**实测（2026-10-09，Fable 5.1；探针脚本在 scratchpad `scripts/framecheck.py`、`scripts/geom.py`，已交付的构建脚本 `scripts/build-corners.mjs` 与种子数据 `content/corners.json`、`data/corners/*.json`）。**

#### 0.9.0 数据源裁决

| 要什么 | 用什么 | 实测 | 备选 |
|---|---|---|---|
| **弯心位置 + 编号**（T1 … T19，含 1A / 12A 这类字母弯） | **MultiViewer 公开赛道 API** `https://api.multiviewer.app/api/v1/circuits/{circuit_key}/{year}`（FastF1 用的就是它）。返回 `corners[{number, letter?, angle, length, trackPosition{x,y}}]`、`marshalSectors`、`marshalLights`、`miniSectorsIndexes`、`rotation`、`x[]/y[]`、`candidateLap`、`pitLoss`。 | 本机 curl 可达：HTTP 200，1.0–2.0 s/次，无鉴权。扫描 key 1–260 共 32 条赛道；**我们 26 条遥测赛道里 24 条有数据**（key 见 `scripts/build-corners.mjs` 的 `KEY`）；**Sepang（key 12）与 Madring（key 153）404**。返回的是该赛道最近一次它采过的布局（2019–2025），与我们遥测年的 F1DB 布局逐条核对全部一致（`data/corners/*.json` 的 `layout` = 遥测年的 `circuit_layout_id`）。弯角数与 F1DB `circuit_layout.turns` 全部相等（Hungaroring 14 + 1A/12A 两个字母弯）。 | 无 API 时：`content/corners.json` 的 `manual.corners[{n,t}]` 手工标定（Sepang 已按遥测曲率峰值 + 官方图标定 15 弯，转向序列 R-L-R-R-L-L-R-R-L-R-R-L-R-R-L 与真实布局一致，标 `approx:true`）。Madring 曲率检测得 24 个峰值 vs F1DB 22 弯，无法可靠编号 → **v1 不标弯角**，只画分段，待 MultiViewer 上线后 `--force` 重建即可。 |
| **弯角名称 + 中文解释** | 没有任何 API 有。**策展文件 `content/corners.json`**（已写好种子：26 条赛道、176 条弯角名 / 注释、28 个分段）。 | 名称只给真正通用的（Eau Rouge/Raidillon、Parabolica、130R、Maggotts–Becketts、Casino、Copse、Senna S、Wall of Champions、Tarzan、Tamburello…）；赞助商名只在几十年不变处保留（Catalunya 的 Elf / Repsol / Campsa / La Caixa）；其余弯角页面上只写「T7」。注释 ≤ 60 字，新闻体。每条都按 `scripts/geom.py` 的转角 / 直道长度核过：发夹弯 ≥ 130°、减速弯是相距 < 100 m 的一对、130R 前有 1033 m 直道等。 | — |
| **计时分段 S1/S2/S3** | **OpenF1 `/v1/laps`** 的 `duration_sector_1/2/3`（遥测圈本身那一行）。我们的 `data/tracks` 是按时间等距采样的一圈，时间比例 → `timeToDistance`（`components/live/trackMath.ts`）→ 距离比例，就是分段边界。 | 字段在本机 `.cache/http` 的 laps 响应里确认存在（`duration_sector_*`、`segments_sector_*`、`i1_speed/i2_speed/st_speed`）。**今天（新加坡站周末）OpenF1 免费接口对所有请求返回 401**（「Live F1 session in progress」），构建脚本已容错：留 `sectors: null`，赛后重跑一次即可。 | MultiViewer `marshalSectors`（约 20 个裁判段）不是计时段，不用。 |
| **DRS 区 / 测速点** | 没有坐标数据源：OpenF1 `car_data.drs` 只能推断开启位置且 **2026 年已无 DRS**（可动空气动力学，无固定区）；`st_speed` 有数值无位置；F1 官方只有图片。 | — | **v1 不做**。`content/corners.json` 的 `sections` 已能表达直道（`kind: "straight"`，已写肯梅尔、机库、大直道、Strip 等 10 条）；DRS 区作为 v2 的 `kind: "drs"`（按年份）留给以后，schema 不变。 |
| **弯角速度 / 挡位**（popover 里的小数字） | **OpenF1 `/v1/car_data`**（遥测圈时间窗内的 `speed`、`n_gear`），构建脚本在弯心时刻 ±1.5 s 取最低速度与此时挡位。 | 同上，今天 401；脚本已写好，重跑即填。 | 没有就不显示那一行。 |

**坐标系（关键结论）**：MultiViewer 的 `trackPosition` 与 OpenF1 `/location` 同一坐标系（单位分米，原点同）。24 条赛道的全部弯心到我们 `data/tracks` 折线的距离 **最大 8.3 m（Miami），均值 ≤ 2.5 m**，弯角沿圈顺序单调递增 —— 不需要任何旋转 / 缩放变换。`rotation` 字段只是 TV 图的摆正角度，忽略。构建期把每个弯心吸附到折线，存 **`t` = 沿圈距离比例（0–1，起点 = 遥测圈的计时线）**；这正是 `Track3D` 的 `curve.getPointAt(t)` 与回放车位 `timeToDistance(f)` 用的参数，所以**同一个 `t` 在 3D 头图、/live 头图、回放地图上都落在同一点**，不需要再做任何投影换算。`f` = 时间比例（给 car_data 对齐用）。

#### 0.9.1 数据文件（已交付）与运行时 API（待建）

```
content/corners.json                      策展（人写）。circuits[id] = { layout, corners{ "n": {name?, zh?, note} }, sections[{id, from, to, kind: corners|straight, name, zh, note}], manual? }
data/corners/<circuit>.json               构建产物（scripts/build-corners.mjs）。{ circuit, layout, source: multiviewer|manual|null, circuitKey, mvYear, lapYear, session_key,
                                          corners[{ n, t, f, x, y, angle, off, speed|null, gear|null, approx? }], sectors: [tS1end, tS2end] | null, built }
scripts/build-corners.mjs                 node --no-warnings scripts/build-corners.mjs [circuit] [--force]。MultiViewer 结果缓存在 .cache/multiviewer/；OpenF1 401/403/429 → 跳过分段与速度并提示重跑。
                                          加进 package.json："corners": "node --no-warnings scripts/build-corners.mjs"；`npm run tracks` 之后必须跑它（t 依赖 data/tracks 的那一圈）。
lib/corners.ts（新）                       cornerLayer(circuitId, layoutId?: string|null): CornerLayer | null —— 同步读两个文件（同 lib/tracks.ts 的 fs 读法，请求时无网络），
                                          layoutId 给了且 ≠ data.layout → 返回 null（§0.9.5）。输出给客户端的最小 JSON：
                                          { layout, year, approx, corners[{ n, t, name?, zh?, note?, speed?, gear?, sector: 1|2|3 }], sections[{ id, kind, from: t0, to: t1, name, zh, note }], sectors: [t,t]|null }
                                          sections 的 t0/t1 = from 弯心 t − 0.006、to 弯心 t + 0.006（corners）；straight 则 from 弯心 t + 0.006 到 to 弯心 t − 0.006（跨起点时 to < from，客户端按环处理）。
```

#### 0.9.2 哪些地图有哪一层

| 地图 | 现状 | 弯角针 | 名称标签 | 分段上色 | hover / 焦点说明 | 原因 |
|---|---|---|---|---|---|---|
| 赛道页头图 `TrackField`（`/circuits/[id]`，总览 / 时期 / 布局相同的年份态） | 3D 浮雕 + 幽灵车 | **有** | **有**（命名弯 + 分段名） | **有**（S1/S2/S3 真实边界） | **有** | 用户诉求的主场景 |
| 单场页头图（未赛 · `TrackField`） | 3D | 有 | 有 | 有 | 有 | 同一组件，同一数据 |
| `/live` 头图 `HomeTrack` | 3D，整个画布是一个 `EntityHref` 链接 | 只有编号针（静态，小） | 无 | 无 | **无**（链接内不放交互元素） | 保持首屏干净；点击进赛道页才看说明 |
| 回放地图 `LiveTrack`（`/seasons/Y/replay`、`/races/Y/R/replay`、`/live` 进行中） | 3D 顶视 + 2D 叠层（车点 / A-B 标签） | **有**（小针，编号） | 命名弯只在 hover 时出现 | 有（可选，默认开） | **有**（与车点 hover 同一叠层；车点优先） | 解说员最需要「现在在哪个弯」 |
| 2D 轮廓：F1DB 布局 SVG（历史布局、`?year=` 旧布局）、官方黑线稿 mask（`CircuitCard` / hover 卡 / 车手页「最擅长赛道」等小图） | 图片 / mask | **无** | 无 | 无 | 无 | 坐标系未知；小图放针是杂讯（§1.4 大卡纪律） |
| 「这里的故事」里的官方详图 `trackMap()`（本身印有弯角编号 / DRS / 计时段） | 图片 | 无 | 无 | 无 | 无 | 它已经是官方标注图，保留作对照 |

#### 0.9.3 UI 规格（中文、F1 风格、沿用现有部件）

1. **针（pin）**：18 px 圆，碳黑 `#15151e` 底、1 px 白环、`var(--font-display)` 10 px 700 的编号（`1`、`12A`）；在 3D 场景中贴在弯心上方（世界 y + 0.09，同车点）。**命名弯**的针右侧带标签：`zh`（12 px 600 `--font-cn`）+ 其下 `name`（10 px `--font-display` 70% 白）；标签底 `rgba(14,14,20,.72)`、radius 3，和 `live.module.css` 的 `.carTag span` 同一语言。分段（`sections`）的标签放在该段中点、斜体眉题样式（11 px，`--f1-red` 小圆点 + 名字）。
2. **防重叠**：按屏幕坐标做一次贪心剔除——两个标签在 44 px 内时只留编号小的那个（另一个仅 hover 时出现）；针永不剔除。窄屏（`max-width: 760px`）只画针不画标签。
3. **图例 / 开关**：头图右下角（`.note` 的对面，`var(--gutter)` 对齐）一个 `seg` 三段：**弯角 · 分段 · 关**（默认「弯角」；`matchMedia('(max-width:760px)')` 默认「关」）。「分段」态：丝带按真实边界三色（沿用 `Track3D` 的 `sectors` 调色：`#e10600 / #ffd800 / #00a1e8`），图例旁写 `S1 · S2 · S3`；没有 `sectors` 数据时该段按钮 `disabled` 并 `title="分段数据待构建"`。选择写进 `localStorage('pitwall.cornerLayer')`。
4. **hover / 焦点 → popover**：每个针是 `<button type="button" aria-label="T6 费尔蒙发夹弯">`，`:hover` 与 `:focus-visible` 都打开 popover（`role="tooltip"`，`aria-describedby`），**样式复用 `components/entity/hover.module.css` 的 `.card`**但宽 260 px、无顶部色块：
   - 第一行 `T6 · 费尔蒙发夹弯`（20 px 700），第二行 `Fairmont Hairpin`（12 px display，灰）；
   - 注释 1–2 行（13 px / 1.6，`.blurb` 样式）；
   - 数字行（`.stats`）：`最低 48 km/h` · `1 挡`（有 `speed/gear` 才出现）· `S2`（所在计时段，恒有）· 手工标定的加一枚 `chip`「位置约略」；
   - 无名弯：第一行只有 `T7`，第二行省略，注释没有就只显示数字行。
   - 定位：针的右上；越出容器右缘则翻到左侧，越出底部则上翻（同 `HoverLayer` 的 `up` 逻辑）；`pointer-events: none`（popover 不可交互，所以不需要 180 ms 的越沟延迟）。
5. **分段 hover**：鼠标 / 焦点落在分段标签上 → `Track3D` 收到 `highlight=[t0,t1]`，shader 里把该区间的丝带调成白色 85%（`uHiFrom/uHiTo` 两个 uniform，跨起点时 `t1 < t0`），其余不变；popover 内容同上（名称 + 注释 + 长度 `(t1−t0)×圈长` 四舍五入到 10 m）。
6. **键盘**：针按编号顺序进入 Tab 序列（在头图文字列之后）；`←/→` 在针之间移动焦点；`Esc` 关闭 popover 并保留焦点。图例按钮是普通 `seg`。
7. **触屏**：`(hover: none)` 时点针 = 开 / 关 popover，点空白关闭；不出现分段标签 hover（分段只靠上色）。
8. **文案**：头图现有 `.note`「3D 模型由 2026 年排位赛最快圈…」后追加一句：`弯角位置来自 MultiViewer（2021 年采样）；分段为该圈 S1/S2/S3 边界`，手工标定的赛道写 `弯角位置按遥测曲率估算`。Madring 这类无弯角数据的赛道，图例只剩「分段 · 关」，并在 `.note` 写 `弯角数据待补`。
9. **/live 头图**：只画编号针（无标签、无交互、`pointer-events:none`），尺寸 14 px、70% 透明——首屏信息量不变，只是让赛道"可读"。
10. **回放地图**：针 14 px，叠在 `LiveTrack` 现有 `trackOverlay` 里（同 `sfMark` 用一次性投影 `makeProjector`，因为该视图 `spin=0` 且叠层挡住指针、无视差）；`nearest()` 先找车（18 px）再找针（12 px）；车点 hover 优先。popover 复用同一组件，深色主题（`--panel` 底）。图例放 `Hud` 右侧：**弯角 · 关**（默认开，分段上色在回放里默认关——回放的丝带要留给车点辨识）。

#### 0.9.4 3D 实现方式（不引入新依赖）

`Track3D` 的场景组有自转（`spin`）与指针视差（`group.rotation.x / position.x` 每帧插值），所以**针不能一次投影了事**。沿用 `LiveTrack` 已验证的模式——每帧算屏幕坐标、直接写 DOM `transform`，不走 React state：

- `Track3D` 新 props：`marks?: { key: string; t: number }[]`、`onMarks?: (pos: Map<string, [x, y, depth]>) => void`（`useFrame` 末尾：`group.localToWorld(curve.getPointAt(t)).project(camera)` → 像素；depth = 投影 z，用来把被转到"背面"的标签淡掉 15%）、`sectors?: [number, number] | null`（真实边界；传了就替换 shader 里的 0.333/0.666 硬编码，`showSectors` 语义不变）、`highlight?: [number, number] | null`。
- 新 `components/track/CornerLayer.tsx`（client）：接 `CornerLayer` 数据 + `mode`，渲染针 / 标签 / 图例 / popover，把 `onMarks` 回调的坐标写到 ref 的 `style.transform`（同 `LiveTrack` 的 `tagA/tagB`）。`drei` 的 `<Html>` 也能做，但它会在 Canvas 外再开一层 portal 且与现有 `ViewTransition name="track-…"` 的 morph 不兼容，不用。
- `TrackField` 加 `corners?: CornerLayer | null` 透传；`HomeTrack` 加 `pins?: {t:number;n:string}[]`（只画静态针）。

#### 0.9.5 历史布局：永不把标签放到另一个布局上

- `content/corners.json` 与 `data/corners/*.json` 都带 `layout`（F1DB `circuit_layout_id`）。`lib/corners.ts` 的 `cornerLayer(id, layoutId)` 在 `layoutId ≠ data.layout` 时返回 `null`——调用方把 `circuitImage(...).layout` 传进去，**于是 `?year=1995` 的蒙扎（SVG 旧布局）与 `?from=1983&to=2002` 的斯帕（SVG）自然无针**；`?year=2024` 的蒙扎（布局 monza-7 = 遥测布局）有针。
- 遥测与 MultiViewer 年份不同（如 Spa 遥测 2026 / MV 2021）但 F1DB 布局 id 相同 → 可用（已逐条核对，弯角位置偏差 ≤ 8 m）。若将来 `npm run tracks` 换了遥测年而布局变了，`build-corners` 会用新遥测年的布局 id 重新对账；MV 弯心离折线 > 15 m 时脚本打 WARNING，此时宁可把该赛道的 `source` 清空（无针）也不渲染。
- 旧布局的弯角名（如 1994 年前的 Tamburello 是全油门弯、旧 Hockenheim 的 Ostkurve）**不做**：没有坐标，也没有地图。

#### 0.9.6 性能

- 渲染期零网络：`cornerLayer()` 是同步文件读取（与 `trackShape` 同一模式），服务端组件把 ≤ 3 KB 的 JSON 作为 prop 传给客户端。
- 回放：`/api/track/[circuit]` 的响应**加上 `corners` 与 `sectors` 字段**（同一个 JSON，同一条请求，`max-age=86400` 不变），`LiveTiming` 不再多发请求。
- 每帧只做 ≤ 30 次向量投影 + DOM transform 写入（与现有 20 个车点同量级）；popover 开关才触发 React 渲染。
- 构建脚本离线跑；MultiViewer 结果缓存在 `.cache/multiviewer/`，OpenF1 只在 `npm run corners` 时访问。

#### 0.9.7 需要用户拍板（不默默决定）

| # | 问题 | 建议 | 备选 |
|---|---|---|---|
| **D4** | 弯角名的**中文译名**：有些名字中文圈习惯直接说英文（Eau Rouge、130R、Parabolica、Maggotts–Becketts），有些有固定译名（发夹弯、塞纳 S 弯、冠军之墙）。种子数据两种都给了（`zh` + `name`）。 | 标签 **中文在上、原文在下**（无 `zh` 时只显示原文）；popover 同。 | 标签只显示原文（更像 TV 图），中文只进 popover |
| **D5** | **Madring**（2026 新赛道）现在没有弯角坐标源，曲率峰值 24 ≠ 22 弯。 | v1 只画分段、不标弯角，`.note` 写「弯角数据待补」；等 MultiViewer 补数据后 `npm run corners -- madring --force` 即可。 | 我按曲率峰值手工合并成 22 弯标上去（有标错编号的风险，且 La Monumental 的编号未核实） |
| **D6** | **分段上色**在回放地图里默认关（丝带留给车点），在赛道页头图里默认「弯角」而不是「分段」。 | 如建议 | 回放也默认开；或头图默认「分段」 |
| **D7** | 回放地图的针要不要在**直播**（进行中节次）也显示。 | 显示（它是静态的，不影响轮询）。 | 只在回放显示 |

#### 0.9.8 实施清单（给 Opus 5.5）

> 顺序：C-1 → C-2 → C-3（数据与 API，可独立验证）→ C-4（Track3D）→ C-5（CornerLayer + 赛道页）→ C-6（回放）→ C-7（/live、单场）→ C-8（样式与无障碍）→ C-9（文档）。**不要改 `content/corners.json` 的事实内容**（要改名 / 加弯请走用户），schema 可加字段不可删。

| # | 文件 | 做什么 |
|---|---|---|
| C-1 | `package.json` | `"corners": "node --no-warnings scripts/build-corners.mjs"`；README 的数据脚本表加一行（`tracks` 之后跑 `corners`）。**赛后（新加坡站结束后）跑一次 `npm run corners`**，确认 `data/corners/*.json` 的 `sectors` 与 `speed` 填上；今天跑只会得到弯角（已交付）。 |
| C-2 | `lib/corners.ts`（新） | `export type CornerLayer = {...}`（§0.9.1）；`cornerLayer(circuitId, layoutId?)`；`sectorOf(t, sectors)`；sections 的 t 区间计算；`manual` 赛道 `approx: true`。纯同步 fs + JSON，无 db 依赖（layout 比对用传入值）。 |
| C-3 | `app/api/track/[circuit]/route.ts` | 响应体加 `corners: cornerLayer(id, null)`（回放地图始终是遥测布局，不需要比对）。 |
| C-4 | `components/three/Track3D.tsx` | 新 props `marks / onMarks / sectors / highlight`（§0.9.4）；shader：`uS1End / uS2End` 替换 0.333/0.666，`uHiFrom / uHiTo / uHi` 做高亮（白 85% 混入 `line` 区域）；`Scene` 的 `useFrame` 末尾投影 marks。保持现有调用方零改动（新 props 全部可选）。 |
| C-5 | `components/track/CornerLayer.tsx` + `corner.module.css`（新）；`components/entity/TrackField.tsx`；`app/(site)/circuits/[id]/page.tsx` | 针 / 标签 / 分段标签 / 图例 seg / popover / 键盘 / 触屏（§0.9.3 1–8）。赛道页：`const corners = pic?.kind === "shape" ? cornerLayer(id, pic.layout) : null;` 传给 `TrackField`；`after` 里的 `.note` 追加来源句（§0.9.3 8）。图例放在 `.note` 对面（`right: var(--gutter); bottom: 20px`），窄屏（`max-width: 960px`，与 `.track` 变 360 px 同断点）图例进入 `.note` 之下的流式位置。 |
| C-6 | `components/live/LiveTrack.tsx`、`LiveTiming.tsx`、`Controls.tsx`（Hud）、`live.module.css` | `LiveTiming` 从 `/api/track` 响应取 `corners` 传下去；`LiveTrack` 用 `makeProjector` 一次性投影针（同 `sfMark`），`nearest()` 车优先、针其次；popover 深色；Hud 右侧 `seg`「弯角 · 关」。 |
| C-7 | `components/home/HomeTrack.tsx`、`components/live/LivePage.tsx`、`app/(site)/races/[year]/[round]/page.tsx` | `/live` 头图静态针（§0.9.3 9）；单场页未赛头图与赛道页同样传 `cornerLayer(race.circuit_id, cpic.layout)`。 |
| C-8 | `corner.module.css`、`hover.module.css` | popover 复用 `.card` 的阴影 / 圆角 / 字体 token（不复制整段，`composes` 或共享 class）；`:focus-visible` 用全局红框；`prefers-reduced-motion` 下去掉 popover 的 `pop` 动画；无色线（§1.4）。 |
| C-9 | `README.md`、`docs/design-log.md` | 数据来源表加 MultiViewer（公开、无鉴权、仅构建期访问）；design-log 记一段「弯角层」。 |

#### 0.9.9 验收（打开某页能观察到什么）

1. `/circuits/spa-francorchamps`：头图上 19 个编号针；标签可见 La Source / 红水弯·雷迪隆 / 莱孔布 / 普翁 / 布朗希蒙 / 公交站减速弯 等（防重叠后 ≥ 8 个）；hover T6 弹出「T6 · 莱孔布 — Les Combes — 莱孔布组合的第二个弯（左弯）。— S1」；hover 分段「红水弯 · 雷迪隆」时丝带 T2–T4 段变白。鼠标移动（视差）与自转过程中针始终贴在弯心上。
2. `/circuits/suzuka`：T15 标签「130R」，T11「发夹弯」，T13–14「汤匙弯」；分段态下 S1/S2/S3 三色边界不在 1/3、2/3 处（`npm run corners` 跑过之后）；跑之前「分段」按钮 disabled 且有 title。
3. `/circuits/monza?year=1995`：图片是 F1DB 旧布局 SVG，**无针、无图例**。`/circuits/monza?year=2024`：3D + 11 个针，T11「抛物线弯」。
4. `/circuits/sepang`：15 个针，popover 内有「位置约略」chip；`.note` 含「按遥测曲率估算」。`/circuits/madring`：无针，图例只有「分段 · 关」，`.note` 含「弯角数据待补」。
5. `/seasons/2026/replay?session=11330`（斯帕排位）：顶视图上 19 个小针；hover 针显示 popover，hover 车点显示车手（车优先）；Hud 右侧「弯角 · 关」切换生效并记住。
6. `/live`：头图有编号小针、无标签；整个头图仍是一个链接（点击进赛道页）。
7. 键盘：在赛道页 Tab 到第一个针，`→` 移到 T2，popover 随焦点出现，`Esc` 关闭；`axe` 无 `button-name` / `aria` 错误。
8. 窄屏 375 px：只有针无标签，默认「关」；选「弯角」后针可点出 popover 且 popover 不越出视口。
9. 性能：赛道页 `curl` 原始 HTML 内含 `"corners":[` 且大小增量 < 4 KB；DevTools Network 在页面加载后没有对 `multiviewer.app` / `openf1.org` 的请求。
10. `node --no-warnings scripts/build-corners.mjs` 在非直播时段结束后：26 个文件 `sectors` 非 null（madring 除外视 OpenF1 数据而定），`speed` 覆盖率 ≥ 90%；脚本对任何一条赛道不打 WARNING。

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
| 25 | 底层对象逻辑：点到维斯塔潘定位到 2026 就有统一区块说他开什么车、属哪个队；选铃鹿 2026 要说冠军 / 冠军车队 / 冠军车；选 RB 某车要说驾驶者 / 车队；人、车、队、赛车、赛道串联互通；顶部区块样式都向维斯塔潘的看齐 | §0.6 全部：`ObjectHero` 十槽、串联表 0.6.2、互通检查、链接 / 芯片 / hover 规则（P0-17 … P0-22） |
| 26 | 左边导航是哪个阶段就看哪个阶段的事；整体阶段只在总览出现；选了 18–20 年右边仍展示所有年份；年份带开头的赛季摘要卡与头图重复、没有用 | §0.7 全部：R1 状态规则 + R2 去重规则、`lib/range.ts` 一个机制、三页 × 三态裁决表、时期解说要点、透视锁定、去重删除清单（S-1 … S-7） |
| 27 | 基于总览 / 筛选逻辑，页面里重复的信息可以删掉，让页面更简单干净 | §0.8 全部：9 条原则、三处待拍板（D1 月桂 vs 冠军瓷砖、D2 逐站色带 vs 透视、D3 赛车 / 时代 tab）、全站三条通用改动、逐页去重表（车手 / 车队 / 赛道 / 赛车 / 年份中枢 / 时代 / 单场 / 实时 / 索引）、16 条验收 |
| 口述（v5 前） | 顶栏中文六项 + 对比 / 搜索工具区；`/live` = 英雄区 + 本赛季分站卡；栏在实时隐藏、无栏头；链接去最具体单元；年份页先赛季综述再标签 | §1.1、§0.5.4、§1.2（位置段）、§0.5.1 S3、§3.3 |
