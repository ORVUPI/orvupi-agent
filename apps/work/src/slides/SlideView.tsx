import type { CSSProperties, ReactNode } from "react";
import { PT, SLIDE_H, SLIDE_W, type ChartItem, type LineItem, type Slide, type SlideItem, type TableItem, type TextStyle } from "./model";
import { shapePath } from "./shapes";
import { THEMES, fontStack, type ThemeSpec } from "./themes";
import { hasRunStyle, parasOf, runCss } from "./rich";

function cssObject(css: Record<string, string>): CSSProperties {
  return Object.fromEntries(Object.entries(css).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v])) as CSSProperties;
}

export type PlaceholderLabels = Partial<Record<string, string>>;

export function themeOf(slide: Slide): ThemeSpec {
  return THEMES[slide.theme] ?? THEMES.papel;
}

function defaultSize(item: SlideItem & TextStyle): number {
  if (item.kind === "text") {
    if (item.placeholder === "title") return 32;
    if (item.placeholder === "number") return 120;
    if (item.placeholder === "subtitle") return 24;
  }
  return 18;
}

export function textCss(item: SlideItem & TextStyle, theme: ThemeSpec): CSSProperties {
  const isTitle = item.kind === "text" && (item.placeholder === "title" || item.placeholder === "number");
  const size = item.size ?? defaultSize(item);
  const deco = [item.underline ? "underline" : "", item.strike ? "line-through" : ""].filter(Boolean).join(" ");
  return {
    fontFamily: fontStack(item.font, isTitle ? theme.titleFont : theme.bodyFont),
    fontSize: `${size * PT}px`,
    color: item.color ?? (item.kind === "shape" ? undefined : isTitle ? theme.title : theme.text),
    fontWeight: item.bold ? 700 : 400,
    fontStyle: item.italic ? "italic" : undefined,
    textDecoration: deco || undefined,
    textAlign: item.align ?? "left",
    lineHeight: item.lineHeight ?? 1.15,
    justifyContent: item.valign === "middle" ? "center" : item.valign === "bottom" ? "flex-end" : "flex-start",
  };
}

export function inkOn(fill: string | undefined): string {
  if (!fill || fill === "none" || !/^#[0-9a-f]{6}$/i.test(fill)) return "#102032";
  const r = Number.parseInt(fill.slice(1, 3), 16);
  const g = Number.parseInt(fill.slice(3, 5), 16);
  const b = Number.parseInt(fill.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150 ? "#ffffff" : "#102032";
}

export function lines(text: string): string[] {
  return text.split("\n");
}

function TextLines({ item, placeholder }: { item: SlideItem & TextStyle; placeholder?: string }) {
  const empty = !item.text;
  const list = item.list && item.list !== "none" ? ` is-${item.list}` : "";
  if (empty && placeholder) return <div className="sl-lines is-ph">{placeholder}</div>;
  return (
    <div className={`sl-lines${list}`} style={{ background: item.highlight }}>
      {item.rich && hasRunStyle(item.rich)
        ? parasOf(item).map((para, i) => (
          <div key={i}>
            {para.some((r) => r.t) ? para.map((r, k) => {
              const span = <span key={k} style={cssObject(runCss(r))}>{r.t}</span>;
              return r.link ? <a key={k} href={r.link} className="sl-run-link" onClick={(e) => e.preventDefault()}>{span}</a> : span;
            }) : <br />}
          </div>
        ))
        : lines(item.text).map((line, i) => <div key={i}>{line || <br />}</div>)}
    </div>
  );
}

export function dashArray(dash: string | undefined, width: number): string | undefined {
  if (dash === "dash") return `${width * 4} ${width * 2.5}`;
  if (dash === "dot") return `${width} ${width * 1.6}`;
  return undefined;
}

function LineSvg({ item, theme }: { item: LineItem; theme: ThemeSpec }) {
  const width = item.width ?? 2;
  const color = item.color ?? theme.title;
  const x1 = item.x1 - item.x;
  const y1 = item.y1 - item.y;
  const x2 = item.x2 - item.x;
  const y2 = item.y2 - item.y;
  const m = `m-${item.id}`;
  return (
    <svg className="sl-line" width={item.w} height={item.h} viewBox={`0 0 ${item.w} ${item.h}`} aria-hidden="true">
      <defs>
        <marker id={`${m}-a`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill={color} /></marker>
        <marker id={`${m}-d`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3.5" markerHeight="3.5"><circle cx="5" cy="5" r="4.5" fill={color} /></marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={Math.max(16, width + 12)} className="sl-line-hit" />
      <line
        x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round"
        strokeDasharray={dashArray(item.dash, width)}
        markerStart={item.start === "arrow" ? `url(#${m}-a)` : item.start === "dot" ? `url(#${m}-d)` : undefined}
        markerEnd={item.end === "arrow" ? `url(#${m}-a)` : item.end === "dot" ? `url(#${m}-d)` : undefined}
      />
    </svg>
  );
}

function TableView({ item, theme }: { item: TableItem; theme: ThemeSpec }) {
  const cols = item.rows[0]?.length ?? 1;
  return (
    <table className="sl-table" style={{ fontSize: `${(item.size ?? 14) * PT}px`, color: item.color ?? theme.text, fontFamily: fontStack(item.font, theme.bodyFont), background: item.fill }}>
      <tbody>
        {item.rows.map((row, r) => (
          <tr key={r} style={{ height: `${100 / item.rows.length}%` }}>
            {row.map((cell, c) => (
              <td key={c} data-cell={`${r}:${c}`} style={{ width: `${100 / cols}%`, background: item.header !== false && r === 0 ? theme.accent : undefined, color: item.header !== false && r === 0 ? inkOn(theme.accent) : undefined, fontWeight: item.header !== false && r === 0 ? 700 : undefined }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const CHART_COLORS = ["#ff3070", "#102032", "#007960", "#1d4e89", "#ffb000", "#9c1446", "#5b2a86", "#00a37f"];

export function ChartView({ item, theme }: { item: ChartItem; theme: ThemeSpec }) {
  const w = item.w;
  const h = item.h;
  const top = item.title ? 34 : 10;
  const max = Math.max(1, ...item.values.map((v) => Math.abs(v)));
  const n = Math.max(1, item.values.length);
  const color = item.color ?? theme.accent;
  const ink = theme.text;
  if (item.chart === "pie") {
    const total = item.values.reduce((sum, v) => sum + Math.max(0, v), 0) || 1;
    const r = Math.min(w * 0.6, h - top - 10) / 2;
    const cx = r + 10;
    const cy = top + (h - top) / 2;
    let angle = -Math.PI / 2;
    return (
      <svg className="sl-chart" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={item.title ?? "chart"}>
        {item.title ? <text x={w / 2} y={22} textAnchor="middle" fill={ink} fontSize={18} fontWeight={700}>{item.title}</text> : null}
        {item.values.map((v, i) => {
          const a = (Math.max(0, v) / total) * Math.PI * 2;
          const x1 = cx + r * Math.cos(angle);
          const y1 = cy + r * Math.sin(angle);
          angle += a;
          const x2 = cx + r * Math.cos(angle);
          const y2 = cy + r * Math.sin(angle);
          const large = a > Math.PI ? 1 : 0;
          const d = a >= Math.PI * 2 - 1e-6 ? `M${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}Z` : `M${cx} ${cy}L${x1} ${y1}A${r} ${r} 0 ${large} 1 ${x2} ${y2}Z`;
          return <path key={i} d={d} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />;
        })}
        {item.labels.map((label, i) => (
          <g key={i}>
            <rect x={cx + r + 24} y={top + 6 + i * 22} width={12} height={12} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            <text x={cx + r + 42} y={top + 17 + i * 22} fill={ink} fontSize={14}>{label}</text>
          </g>
        ))}
      </svg>
    );
  }
  const left = 40;
  const bottom = 26;
  const ph = h - top - bottom;
  const pw = w - left - 10;
  const horizontal = item.chart === "bar";
  return (
    <svg className="sl-chart" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={item.title ?? "chart"}>
      {item.title ? <text x={w / 2} y={22} textAnchor="middle" fill={ink} fontSize={18} fontWeight={700}>{item.title}</text> : null}
      <line x1={left} y1={top} x2={left} y2={top + ph} stroke={ink} strokeOpacity={0.5} />
      <line x1={left} y1={top + ph} x2={left + pw} y2={top + ph} stroke={ink} strokeOpacity={0.5} />
      {item.chart === "line" ? (
        <>
          <polyline fill="none" stroke={color} strokeWidth={3} points={item.values.map((v, i) => `${left + (pw * (i + 0.5)) / n},${top + ph - (Math.max(0, v) / max) * ph}`).join(" ")} />
          {item.values.map((v, i) => <circle key={i} cx={left + (pw * (i + 0.5)) / n} cy={top + ph - (Math.max(0, v) / max) * ph} r={4} fill={color} />)}
        </>
      ) : item.values.map((v, i) => {
        const value = Math.max(0, v) / max;
        if (horizontal) {
          const bh = (ph / n) * 0.7;
          return <rect key={i} x={left} y={top + (ph * i) / n + (ph / n) * 0.15} width={pw * value} height={bh} fill={CHART_COLORS[i % CHART_COLORS.length]} />;
        }
        const bw = (pw / n) * 0.7;
        return <rect key={i} x={left + (pw * i) / n + (pw / n) * 0.15} y={top + ph - ph * value} width={bw} height={ph * value} fill={CHART_COLORS[i % CHART_COLORS.length]} />;
      })}
      {item.labels.map((label, i) => (
        horizontal
          ? <text key={i} x={left - 4} y={top + (ph * (i + 0.5)) / n + 4} textAnchor="end" fill={ink} fontSize={11}>{label.slice(0, 8)}</text>
          : <text key={i} x={left + (pw * (i + 0.5)) / n} y={h - 8} textAnchor="middle" fill={ink} fontSize={12}>{label.slice(0, 12)}</text>
      ))}
    </svg>
  );
}

export function ItemBody({ item, theme, placeholder, editor, live }: { item: SlideItem; theme: ThemeSpec; placeholder?: string; editor?: ReactNode; live?: boolean }) {
  if (item.kind === "text") {
    return (
      <div className="sl-text" style={{ ...textCss(item, theme), background: item.fill, border: item.stroke ? `2px solid ${item.stroke}` : undefined }}>
        {editor ?? <TextLines item={item} placeholder={placeholder} />}
      </div>
    );
  }
  if (item.kind === "shape") {
    const sw = item.stroke === "none" ? 0 : item.strokeWidth ?? 2;
    return (
      <>
        <svg className="sl-shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={flipCss(item)}>
          <path d={shapePath(item.shape)} fill={item.fill === "none" ? "transparent" : item.fill} stroke={sw > 0 ? item.stroke ?? "#102032" : "none"} strokeWidth={sw} vectorEffect="non-scaling-stroke" strokeDasharray={dashArray(item.dash, sw)} />
        </svg>
        <div className="sl-text sl-shape-text" style={{ ...textCss(item, theme), color: item.color ?? inkOn(item.fill), textAlign: item.align ?? "center", justifyContent: item.valign === "top" ? "flex-start" : item.valign === "bottom" ? "flex-end" : "center" }}>
          {editor ?? (item.text ? <TextLines item={item} /> : null)}
        </div>
      </>
    );
  }
  if (item.kind === "image") {
    const c = item.crop ?? { l: 0, t: 0, r: 0, b: 0 };
    const sw = 1 / Math.max(0.1, 1 - c.l - c.r);
    const sh = 1 / Math.max(0.1, 1 - c.t - c.b);
    return (
      <div className="sl-img" style={{ opacity: item.opacity, ...flipCss(item) }}>
        <img src={item.src} alt="" draggable={false} style={{ width: `${sw * 100}%`, height: `${sh * 100}%`, left: `${-c.l * sw * 100}%`, top: `${-c.t * sh * 100}%` }} />
      </div>
    );
  }
  if (item.kind === "line") return <LineSvg item={item} theme={theme} />;
  if (item.kind === "table") return <TableView item={item} theme={theme} />;
  if (item.kind === "chart") return <ChartView item={item} theme={theme} />;
  if (item.kind === "video") {
    if (live && item.youtube) {
      return <iframe className="sl-video" title="YouTube" src={`https://www.youtube-nocookie.com/embed/${item.youtube}${item.autoplay ? "?autoplay=1&mute=1" : ""}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />;
    }
    if (live && item.src) return <video className="sl-video" src={item.src} controls autoPlay={item.autoplay} muted={item.autoplay} playsInline />;
    return (
      <div className="sl-video is-poster">
        {item.youtube ? <img src={`https://i.ytimg.com/vi/${item.youtube}/hqdefault.jpg`} alt="" draggable={false} onError={(e) => { e.currentTarget.style.display = "none"; }} /> : item.src ? <video src={item.src} muted playsInline preload="metadata" /> : null}
        <span aria-hidden="true">▶</span>
      </div>
    );
  }
  return null;
}

function flipCss(item: SlideItem): CSSProperties | undefined {
  if (!item.flipH && !item.flipV) return undefined;
  return { transform: `scale(${item.flipH ? -1 : 1}, ${item.flipV ? -1 : 1})` };
}

export function itemFrameStyle(item: SlideItem): CSSProperties {
  return {
    left: item.x,
    top: item.y,
    width: item.w,
    height: item.h,
    transform: item.rot && item.kind !== "line" ? `rotate(${item.rot}deg)` : undefined,
  };
}

export function ThemeDeco({ theme }: { theme: ThemeSpec }) {
  if (!theme.deco) return null;
  const a = theme.accent;
  return (
    <svg className="sl-deco" viewBox={`0 0 ${SLIDE_W} ${SLIDE_H}`} aria-hidden="true">
      {theme.deco === "bar-left" ? <rect x={0} y={0} width={18} height={SLIDE_H} fill={a} /> : null}
      {theme.deco === "bar-bottom" ? <rect x={0} y={SLIDE_H - 14} width={SLIDE_W} height={14} fill={a} /> : null}
      {theme.deco === "corner" ? <circle cx={SLIDE_W} cy={0} r={150} fill={a} opacity={0.18} /> : null}
      {theme.deco === "dots" ? [0, 1, 2].map((i) => <circle key={i} cx={SLIDE_W - 40 - i * 28} cy={SLIDE_H - 36} r={8} fill={a} />) : null}
      {theme.deco === "wave" ? <path d={`M0 ${SLIDE_H - 50}Q${SLIDE_W / 4} ${SLIDE_H - 90} ${SLIDE_W / 2} ${SLIDE_H - 50}T${SLIDE_W} ${SLIDE_H - 50}V${SLIDE_H}H0Z`} fill={a} opacity={0.22} /> : null}
    </svg>
  );
}

export function slideBackground(slide: Slide, theme: ThemeSpec): CSSProperties {
  return {
    backgroundColor: slide.background ?? theme.bg,
    backgroundImage: slide.backgroundImage ? `url("${slide.backgroundImage}")` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}

/** Diapositiva a tamaño lógico (960 × 540) escalada con `scale`. Se usa en miniaturas, temas, diseños y presentación. */
export function SlideView({
  slide,
  scale,
  number,
  master,
  hidden = [],
  live = false,
  className = "",
  animClass,
}: {
  slide: Slide;
  scale: number;
  number?: number;
  master?: string;
  hidden?: string[];
  live?: boolean;
  className?: string;
  animClass?: (item: SlideItem) => string | undefined;
}) {
  const theme = themeOf(slide);
  return (
    <div className={`sl-view ${className}`.trim()} style={{ width: SLIDE_W * scale, height: SLIDE_H * scale }}>
      <div className="sl-slide" style={{ ...slideBackground(slide, theme), transform: `scale(${scale})` }}>
        {slide.backgroundImage ? null : <ThemeDeco theme={theme} />}
        {master ? <p className="sl-master" style={{ color: theme.text }}>{master}</p> : null}
        {slide.items.map((item) => (
          <div key={item.id} className={`sl-item is-${item.kind} ${animClass?.(item) ?? ""}`.trim()} style={{ ...itemFrameStyle(item), visibility: hidden.includes(item.id) ? "hidden" : undefined }}>
            {item.link && live ? (
              <a className="sl-link" href={item.link.startsWith("#") ? undefined : item.link} target="_blank" rel="noopener noreferrer" data-link={item.link}>
                <ItemBody item={item} theme={theme} live={live} />
              </a>
            ) : <ItemBody item={item} theme={theme} live={live} />}
          </div>
        ))}
        {number ? <span className="sl-number" style={{ color: theme.text }}>{number}</span> : null}
      </div>
    </div>
  );
}
