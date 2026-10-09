import s from "./shell.module.css";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.footLine} />
      <div className={s.footIn}>
        <div>
          <div className={s.footBrand}>PITWALL</div>
          <p style={{ marginTop: 12, maxWidth: 420 }}>
            非官方 F1 数据百科。以年份、赛道、车手、车队为基础单元，任何一个对象都能从另外三个维度展开。与 Formula 1 及 FIA 无关联。
          </p>
        </div>
        <div className={s.footCols}>
          <div>
            <h4>数据来源</h4>
            <a href="https://github.com/f1db/f1db">F1DB（1950 至今，CC BY 4.0）</a>
            <a href="https://openf1.org">OpenF1（实时与遥测）</a>
            <a href="https://github.com/jolpica/jolpica-f1">Jolpica-F1</a>
            <a href="https://www.wikipedia.org">Wikipedia（赛事综述）</a>
          </div>
          <div>
            <h4>图片与字体</h4>
            <p>车手、车队、赛车、赛道图片引用自 formula1.com 媒体服务器，版权归 Formula One World Championship Limited。Formula1 字体为非官方演示使用。</p>
            <p>引擎音效：<a href="https://freesound.org/people/rfhache/sounds/44763/">rfhache · F1 BR 06 Engine Starts 2</a>（<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>，截取并淡入淡出）。</p>
          </div>
          <div>
            <h4>浏览</h4>
            <Link href="/seasons">历史 · 全部赛季</Link>
            <Link href="/circuits">全部赛道</Link>
            <Link href="/drivers">全部车手</Link>
            <Link href="/teams">全部车队</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
