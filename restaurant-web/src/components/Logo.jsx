import React from "react";

/**
 * Maestro logo mark: two bold "M" strokes with a lightning bolt cutting through the middle,
 * matching the brand artwork (black background, white M, yellow bolt).
 */
export function LogoMark({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 96V30L38 54V96H14Z"
        fill="#FFFFFF"
      />
      <path
        d="M106 96V30L82 54V96H106Z"
        fill="#FFFFFF"
      />
      <path
        d="M38 54L60 30L82 54"
        stroke="#FFFFFF"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M66 14L44 58H58L52 106L80 50H64L66 14Z"
        fill="#FFC700"
        stroke="#0D0D0D"
        strokeWidth="2"
      />
    </svg>
  );
}

export function LogoLockup({ height = 56 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <LogoMark size={height} />
      <div
        style={{
          fontFamily: "Cairo, sans-serif",
          fontWeight: 900,
          fontSize: height * 0.42,
          color: "#FFC700",
          letterSpacing: "1px",
          fontStyle: "italic",
          lineHeight: 1,
        }}
      >
        MAESTRO
      </div>
      <div
        style={{
          fontFamily: "Cairo, sans-serif",
          fontWeight: 500,
          fontSize: height * 0.14,
          color: "#FFFFFF",
          letterSpacing: "4px",
        }}
      >
        FAST DELIVERY
      </div>
    </div>
  );
}
