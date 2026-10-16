"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import "./storage-theatre.css";

const COLORS = ["#ff4ba0", "#b7ff45", "#53d9ff", "#aa83ff"];

/** An illustrative cutaway, not a literal SSD architecture or execution trace. */
export function StorageTheatre({ recovery = false }: { recovery?: boolean }) {
  const scene = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.visible = String(entry.isIntersecting);
    }, { threshold: 0.15 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <figure ref={scene} className={`storage-theatre ${recovery ? "storage-theatre--recovery" : ""}`} data-visible="false">
      <svg viewBox="0 0 620 540" role="img" aria-label={recovery ? "A conceptual journal keeps a record while a write is interrupted, then restores the data." : "A cutaway storage machine: bright writes travel through a controller into layers of memory."}>
        {recovery ? <>
          <path d="M145 173C420 90 530 175 474 325S190 468 147 348" fill="none" stroke="#6544ad" strokeWidth="3" />
          <path className="storage-stream" d="M145 173C420 90 530 175 474 325S190 468 147 348" fill="none" strokeWidth="5" />
          <g transform="translate(80 100) rotate(-8 100 150)">
            <rect x="10" y="12" width="176" height="288" rx="16" fill="#211343" />
            <rect width="176" height="288" rx="16" fill="#fff2d3" />
            <foreignObject x="24" y="24" width="132" height="28">
              <div style={{ color: "#38207c", background: "#fff2d3", fontFamily: "monospace", fontSize: 19 }}>journal</div>
            </foreignObject>
            {[0, 1, 2, 3, 4].map(i => <g key={i} transform={`translate(24 ${74 + i * 37})`}>
              <circle cx="7" cy="7" r="7" fill={COLORS[i % 4]} />
              <path d="M29 3h77M29 12h49" stroke="#644e87" strokeWidth="3" strokeLinecap="round" />
            </g>)}
          </g>
          <g transform="translate(337 125) rotate(8 80 60)">
            <rect width="157" height="110" rx="18" fill="#ff4ba0" />
            <path className="recovery-interrupted" d="m87 16-32 45h28l-13 34 37-49H79Z" fill="#38207c" />
          </g>
          <g transform="translate(335 287) rotate(-8 80 70)">
            <rect x="8" y="10" width="157" height="125" rx="18" fill="#25144b" />
            <rect width="157" height="125" rx="18" fill="#b7ff45" />
            <path className="recovery-restored" d="m49 59 19 19 40-42" fill="none" stroke="#38207c" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
            <foreignObject x="12" y="89" width="133" height="26">
              <div style={{ color: "#38207c", background: "#b7ff45", fontFamily: "monospace", fontSize: 15, textAlign: "center" }}>recovered</div>
            </foreignObject>
          </g>
        </> : <>
        <ellipse cx="315" cy="466" rx="232" ry="35" fill="#110b35" opacity=".25" />
        <g className="storage-assembly">
          {[2, 1, 0].map((layer) => (
            <g key={layer} className="storage-layer" style={{ "--layer": layer } as CSSProperties}>
              <g transform={`translate(0 ${layer * 94})`}>
                <path d="M83 198 329 60 556 191 310 332Z" fill={layer === 0 ? "#7954ef" : "#5436b7"} />
                <path d="M83 198 310 332 310 350 83 217Z" fill="#39216f" />
                <path d="M310 332 556 191 556 210 310 350Z" fill="#45278b" />
                <path d="M83 198 329 60 556 191" fill="none" stroke="#c0a5ff" strokeWidth="2" />
                {[0, 1, 2].map((row) => [0, 1, 2, 3].map((col) => {
                  const x = 292 + (col - row) * 52;
                  const y = 102 + (col + row) * 30;
                  const color = COLORS[(row + col + layer) % COLORS.length];
                  return <g key={`${row}-${col}`} transform={`translate(${x} ${y})`}>
                    <path d="M0 0 43 25 0 50 -43 25Z" fill="#302059" />
                    <g className="storage-cell" style={{ "--beat": `${(col + row + layer) * -0.4}s`, "--cell-color": color } as CSSProperties}>
                      <path d="M-37 18 0 39 0 49 -37 28Z" fill="#34234d" />
                      <path d="M0 39 37 18 37 28 0 49Z" fill="#4a3269" />
                      <path d="M0 -3 37 18 0 39 -37 18Z" fill={color} />
                      <path d="m-13 16 13 8 13-8" fill="none" stroke="#24153f" strokeWidth="2" opacity=".5" />
                    </g>
                  </g>;
                }))}
              </g>
            </g>
          ))}
        </g>
        <g fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M12 120 92 74 201 137" stroke="#ff4ba0" opacity=".35" />
          <path d="M423 133 540 66 604 104" stroke="#53d9ff" opacity=".35" />
          <path d="M450 403 562 339 602 361" stroke="#b7ff45" opacity=".35" />
          <path className="storage-stream" d="M12 120 92 74 201 137" stroke="#ff4ba0" />
          <path className="storage-stream storage-stream--blue" d="M423 133 540 66 604 104" stroke="#53d9ff" />
          <path className="storage-stream storage-stream--lime" d="M450 403 562 339 602 361" stroke="#b7ff45" />
        </g>
        <g className="storage-write" fill="#ff4ba0">
          <path d="m95 42 25 14-25 15-25-15Z" />
          <path d="m70 56 25 15v13L70 70Z" fill="#bb2675" />
          <path d="m95 71 25-15v14L95 84Z" fill="#e5378c" />
        </g>
        <g className="storage-orbit" transform="translate(534 281)">
          <circle r="35" fill="#b7ff45" />
          <path d="m-15 0 10 10L16-11" fill="none" stroke="#282334" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        </>}
      </svg>
      <figcaption>{recovery ? "Record. Write. Recover." : "A little world beneath every save."}</figcaption>
    </figure>
  );
}
