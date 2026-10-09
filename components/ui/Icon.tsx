/**
 * formula1.com's own icon set (24×24, fill currentColor) — paths copied verbatim from its design-system
 * icon library (the React icon components in its page bundle / the live DOM). Never draw icons by hand:
 * add a new name here from that library instead.
 */
type P = string | [d: string, evenodd: true];

const ICONS = {
  "chevron-down": ["m18 9.4-6 6-6-6L7.4 8l4.6 4.6L16.6 8z"],
  "chevron-up": ["m18 14-6-6-6 6 1.4 1.4 4.6-4.6 4.6 4.6z"],
  "chevron-right": ["m13.2 12.123-4.6-4.6 1.4-1.4 6 6-6 6-1.4-1.4z"],
  "chevron-left": ["m14 18-6-6 6-6 1.4 1.4-4.6 4.6 4.6 4.6z"],
  menu: ["M2 17h18a2 2 0 0 1 2 2H2zM2 7h15a2 2 0 0 0-2-2H2zM2 13h18a2 2 0 0 0-2-2H2z"],
  search: [["m21.707 20.565-7.108-7.214A7.13 7.13 0 0 0 16 9.105C16 5.188 12.859 2 9 2S2 5.188 2 9.105c0 3.916 3.141 7.103 7 7.103a6.9 6.9 0 0 0 4.185-1.423L20.293 22zM9 14.179c-2.757 0-5-2.276-5-5.074S6.243 4.03 9 4.03s5 2.277 5 5.075-2.243 5.074-5 5.074", true]],
  close: ["M13.48 12 19 17.52 17.52 19 12 13.48 6.48 19 5 17.52 10.52 12 5 6.48 6.48 5 12 10.52 17.52 5 19 6.48z"],
  calendar: [["M16 5V3h-2v2h-4V3H8v2H3v15.846h15a3 3 0 0 0 3-3V5zm3 12.846a1 1 0 0 1-1 1H5V7h3v2h2V7h4v2h2V7h3z", true]],
  "calendar-add": ["M13 11v2h2v2h-2v2h-2v-2.001H9v-2h2v-2z", ["M16 5V3h-2v2h-4V3H8v2H3v15.846h15a3 3 0 0 0 3-3V5zm3 12.846a1 1 0 0 1-1 1H5V7h3v2h2V7h4v2h2V7h3z", true]],
  "chequered-flag": ["M9 6h2V4H9zm4 0V4h2v2zm-4 8v-2h2v2zm8-4V8h2v2zm0 4v-2h2v2zm-4 0v-2h2v2zm4-8V4h2v2zm-6 2V6h2v2zM5 20V4h2v2h2v2H7v2h2v2H7v8zm10-8v-2h2v2zm-4 0v-2h2v2zm-2-2V8h2v2zm4 0V8h2v2zm2-2V6h2v2z"],
  "internal-link": ["M4 18.105 15.593 6.519H4V4h11.665c1.724 0 2.706.12 3.449.888.742.743.886 1.655.886 3.406V20h-2.515V8.39L5.916 20z"],
  "external-link": ["M3 3v18h18v-9h-2v7H5V5h7V3zm11 0v2h3.586l-9.293 9.293 1.414 1.414L19 6.414V10h2V3z"],
  "arrow-right": ["m21.43 13.41-6.16 6.3-1.38-1.42L19.06 13H2v-2h17l-5.11-5.29 1.38-1.42 6.16 6.3a2 2 0 0 1 0 2.82"],
  "arrow-left": ["M22 13H4.94l5.18 5.29-1.38 1.42-6.17-6.3a2 2 0 0 1 0-2.82l6.17-6.3 1.38 1.42L4.94 11H22z"],
  "arrow-up": ["m13.416 2.576 6.3 6.16-1.42 1.38-5.29-5.17v17.06h-2v-17l-5.29 5.11-1.42-1.38 6.3-6.16a2 2 0 0 1 2.82 0"],
  play: ["M20.86 10 4 2v20l16.88-8.36a2 2 0 0 0 0-3.65z"],
  pause: ["M14 21h3a3 3 0 0 0 3-3V3h-6zM10 3v15a3 3 0 0 1-3 3H4V3z"],
  "step-backward": ["M5 4h2v16a2 2 0 0 1-2-2z", ["M19 4v16L9 13.72a2 2 0 0 1 0-3.44zm-2 3.66L10 12l7 4.32z", true]],
  replay: ["M21 12a9 9 0 0 1-16.79 4.5l1.73-1A7 7 0 1 0 12 5a6.92 6.92 0 0 0-5.34 2.5H10v2H5.59A2.1 2.1 0 0 1 3.5 7.4V3h2v2.81A8.9 8.9 0 0 1 12 3a9 9 0 0 1 9 9"],
  "live-timing": ["M22 12A10 10 0 1 1 5.41 4.5l1.41 1.41a8 8 0 1 0 6.1-1.86V6h-2V2h1A10 10 0 0 1 22 12", "M13.37 12.46 8.46 7.54 7 9l3.5 3.5a2 2 0 0 0 2.87-.04"],
  trophy: ["M7 21v-2h4v-3.1a5.4 5.4 0 0 1-2.187-1.037A4.5 4.5 0 0 1 7.4 12.95a4.85 4.85 0 0 1-3.137-1.637A4.8 4.8 0 0 1 3 8V5h4V3h10v2h4v3q0 1.9-1.262 3.313A4.85 4.85 0 0 1 16.6 12.95q-.45 1.15-1.413 1.913A5.4 5.4 0 0 1 13 15.9V19h4v2zm0-10.2V7H5v1q0 .95.55 1.713.55.762 1.45 1.087m5 3.2q1.25 0 2.125-.875A2.9 2.9 0 0 0 15 11V5H9v6q0 1.25.875 2.125A2.9 2.9 0 0 0 12 14m5-3.2q.9-.326 1.45-1.088T19 8V7h-2z"],
  time: ["M12.9 13.36a2.91 2.91 0 0 0 1.1-2.28V7h-2v4.08a.93.93 0 0 1-.35.72l-4.27 3.42 1.24 1.56z", ["M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10m0-18a8 8 0 1 0 0 16 8 8 0 0 0 0-16", true]],
  location: [["M12 2C8.13 2 5 5.13 5 9c0 4.075 3.592 6.755 4.99 9.05C11.984 21.326 12 22 12 22s0-.684 1.995-3.966C15.39 15.743 19 12.982 19 9c0-3.87-3.13-7-7-7m0 10a3.001 3.001 0 0 1 0-6 3.001 3.001 0 0 1 0 6", true]],
  add: ["M20 13h-7v7h-2v-7H4v-2h7V4h2v7h7z"],
  tick: ["m19.72 7.69-8.29 8.71A2 2 0 0 1 10 17a2 2 0 0 1-1.4-.59l-4.25-3.65 1.3-1.52L10 15l8.33-8.64z"],
} satisfies Record<string, P[]>;

export type IconName = keyof typeof ICONS;

/** `<Icon name="chevron-right" />` — 1em square by default, inherits text colour. */
export default function Icon({ name, size = "1em", className, title, style }: {
  name: IconName; size?: number | string; className?: string; title?: string; style?: React.CSSProperties;
}) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ flex: "none", ...style }}
      role={title ? "img" : "presentation"} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      {(ICONS[name] as P[]).map((p, i) => typeof p === "string"
        ? <path key={i} fill="currentColor" d={p} />
        : <path key={i} fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={p[0]} />)}
    </svg>
  );
}

/** The raw path(s) of an icon, for CSS masks (`mask-image: url(data:…)`) where an element can't hold an <svg>. */
export function iconDataUri(name: IconName) {
  const body = (ICONS[name] as P[]).map((p) => typeof p === "string" ? `<path d='${p}'/>` : `<path fill-rule='evenodd' d='${p[0]}'/>`).join("");
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>${body}</svg>`)}")`;
}
