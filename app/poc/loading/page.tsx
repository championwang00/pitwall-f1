"use client";

import { useRaceLoadingPreview } from "@/components/shell/RaceLoading";

export default function LoadingPreview() {
  const preview = useRaceLoadingPreview();
  return <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", background: "#1a1a1a", color: "#ededed" }}>
    <div style={{ textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-cn)", fontSize: 24 }}>起跑灯预览</h1>
      <p style={{ margin: "20px 0", color: "#aaa", fontSize: 14 }}>加载动画与音效预览</p>
      <button type="button" style={{ padding: "12px 20px", border: "1px solid #ffffff40", borderRadius: 4 }} onClick={() => {
        void preview?.();
      }}>重新播放</button>
      <button type="button" style={{ display: "block", margin: "16px auto 0", padding: "8px 12px", color: "#aaa", fontSize: 13 }} onClick={() => {
        void preview?.(true);
      }}>预览首次进入</button>
      <div style={{ marginTop: 28 }}>
        <p style={{ marginBottom: 12, color: "#aaa", fontSize: 12 }}>完整起跑灯录音试听</p>
        <audio onLoadedMetadata={(event) => { event.currentTarget.volume = 0.6; }} controls preload="metadata" src="/sounds/f1-start-sequence.mp3" aria-label="F1 起跑灯录音试听" />
      </div>
    </div>
  </main>;
}
