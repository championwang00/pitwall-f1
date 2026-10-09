# F1 Flying Lap 素材调查与加载效果

核查日期：2026-10-09。参考站 https://f1-flyinglap.vercel.app/ ，公开仓库 https://github.com/zhongth/f1-flyinglap 。

## 赛车模型

README 标注 F1 2025 赛车资产，覆盖 2025 年 10 支车队；不含 2026 年 Audi / Cadillac。模型随仓库放在 public/3d-model/，浏览器脚本直接从同域加载，压缩模型使用 Draco。GLB asset.generator 为 glTF-Transform v3.10.1，extensionsUsed 包含 KHR_draco_mesh_compression。检查的 10 个压缩模型未发现 asset 里的作者、版权字段或顶层 extras。README 没有给出原作者、模型平台或逐模型许可。

README 声称 MIT 并链接 LICENSE，但核查时根目录及递归文件列表没有 LICENSE 文件，GitHub API license 为 null。故不把代码说明当作赛车模型资产的已确认授权。本次没有将其模型或图片转存进当前项目。

| 仓库文件 | 文件大小 |
|---|---|
| [Alpine-3d-compressed.glb](https://github.com/zhongth/f1-flyinglap/blob/main/public/3d-model/Alpine-3d-compressed.glb) | 5.13 MiB |
| [Aston-3d-compressed.glb](https://github.com/zhongth/f1-flyinglap/blob/main/public/3d-model/Aston-3d-compressed.glb) | 4.70 MiB |
| [Ferrari-3d-compressed.glb](https://github.com/zhongth/f1-flyinglap/blob/main/public/3d-model/Ferrari-3d-compressed.glb) | 4.99 MiB |
| [Haas-3d-compressed.glb](https://github.com/zhongth/f1-flyinglap/blob/main/public/3d-model/Haas-3d-compressed.glb) | 5.22 MiB |
| [McLaren-3d-compressed.glb](https://github.com/zhongth/f1-flyinglap/blob/main/public/3d-model/McLaren-3d-compressed.glb) | 4.90 MiB |
| [Mercedas-3d-compressed.glb](https://github.com/zhongth/f1-flyinglap/blob/main/public/3d-model/Mercedas-3d-compressed.glb) | 4.40 MiB |
| [RacingBull-3d-compressed.glb](https://github.com/zhongth/f1-flyinglap/blob/main/public/3d-model/RacingBull-3d-compressed.glb) | 4.63 MiB |
| [RedBull-3d-compressed.glb](https://github.com/zhongth/f1-flyinglap/blob/main/public/3d-model/RedBull-3d-compressed.glb) | 4.66 MiB |
| [Sauber-3d-compressed.glb](https://github.com/zhongth/f1-flyinglap/blob/main/public/3d-model/Sauber-3d-compressed.glb) | 4.89 MiB |
| [Williams-3d-compressed.glb](https://github.com/zhongth/f1-flyinglap/blob/main/public/3d-model/Williams-3d-compressed.glb) | 4.86 MiB |

部署脚本里的红牛路径仍指向 `Red Bull 3D Model.glb`，仓库该文件约 39.7 MiB，明显大于压缩版。

## 其他素材

README 致谢称车手肖像来自 F1 官方媒体，数据使用 FastF1；部署页还引用 flagcdn.com 的国旗。字体文件及 radio 音频随仓库存储，但 README 未逐项交代来源授权。详见 README 的 Credits、目录树和 public/sound。

## 加载效果与当前实现

参考站 FiveLightsOut 是代码生成的五个大圆灯，600ms 后亮第一盏，其余每隔 1 秒亮起；等待模型预加载完成，五灯同时熄灭后退场。所检查的 FiveLightsOut 源码不包含点灯音效，其他页面的音频为车手 radio。用户否定了初版合成提示音，已删除振荡器方案。当前使用 Voicemod Tuna 社区上传的起跑录音片段，通过 Web Audio 播放，出处及处理见 public/sounds/f1-start-light.source.md；未确认是官方发布或官方授权，未公开部署。

用户要求缩小并差异化。当前实现采用五列双灯、紧凑灯架、项目碳黑底色，搭配现有 PITWALL logo、Formula1 字体、英文 READY / GETTING READY / LIGHTS OUT 和数字进度。首次进入同一标签页时强制完成一次：第一列 350ms 后亮起，后四列间隔 700 / 760 / 700 / 800ms，约 3.31 秒亮齐，保持 600ms 后再用 400ms 退场。并行预加载首屏图片、展示字体、起跑录音；预取 cars / 当前年份 seasons 路由。预加载最多等待 2.5 秒，其余请求继续后台加载。sessionStorage 记录完成状态，后续路由和刷新只使用页面骨架，不再显示全屏灯序。系统减少动态效果时静态显示灯架并在资源就绪后退场。赛车模型工作按用户要求暂停。

声音默认 SOUND ON，保留用户主动关闭的 localStorage 设置。自动尝试启用 AudioContext；浏览器拦截自动播放时显示 START，点击后先启用声音，再完成灯序。静音按钮也允许直接继续。点灯同步播放从录音提取的本地 WAV，不再使用合成振荡器。预览页另有完整 9.192 秒原始录音播放器；已验证播放状态、时长及无媒体错误，不能将运行检查当作官方出处认证。

根 loading 和站内 loading 注册实际等待状态，第一次覆盖层等待完整灯序及加载完成。进度表示启动就绪度：资源任务完成度与灯序阶段上限取较小值，数字在每个阶段平滑过渡。第五列亮起前不会到 100%，五灯亮齐、资源就绪且停留完成后才退场。并非全站所有资源的下载百分比。

预览：http://localhost:3210/poc/loading 。预览页提供重新播放和预览首次进入两个显式测试入口；正常浏览不会重播。

## 预览声音修复

原短 WAV 因截取后淡出时间戳未重置而变成静音；重新截取并重置时间戳后，新文件 f1-start-light-v2.wav 的平均音量 -20.3 dB、峰值 -7.5 dB。点灯播放此文件，使用新 URL 避免缓存旧静音。预览入口改为同文档重播、先解锁 AudioContext 再显示灯序，预览首页使用客户端导航，保留点击解锁的声音上下文。

## 最新节奏与布局反馈

按用户要求，音效增益设为 0.6；PITWALL logo 在灯架正上方居中。浏览器实测四列亮时进度 62%（向 80% 平滑推进），第五列亮起瞬间 82%（向 100% 推进），两种状态均仍显示覆盖层。五列全亮保持至少 600ms，保证最后一次 460ms 录音播完再熄灯进入。

熄灯后播放 rfhache 的巴西 2006 F1 引擎启动现场录音，Freesound 44763，CC BY 4.0；截取 1.6 秒，出处及修改记录见 public/sounds/f1-engine-launch.source.md。引擎 buffer 播放结束后才进入 400ms 退场阶段；静音时保留同样时长。

防闪露：起跑显示期间底层页面设置 visibility:hidden 并 inert；首次会话检查完成前也隐藏内容，避免初始化间隙闪露。预览首页直接客户端导航到 /live，取消 / 到 /live 的中间重定向。浏览器验证四灯时 62%，熄灯阶段零灯亮、100%，覆盖层仍存在，之后引擎完成才退场。

最新用户确认的时序：五灯亮齐停留后同时熄灭；立即开始900ms上下展开转场并播放1.6秒引擎声，不再等待引擎播完。转场结束显示真实页面，剩余约700ms引擎尾音自然续播。

默认开始修订：已移除 START 按钮及音频权限阻塞，加载画面出现后直接启动灯序。声音尝试自动播放；浏览器拦截时保持动画正常推进，用户在开场中点击或按键可启用后续音效，不回放或暂停灯序。
