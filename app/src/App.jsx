import React from "react";

export default function App() {
  const qs = window.location.search || "";
  const hash = window.location.hash || "";
  const src = `/matchframe-funnel.html?v=20260319-1432${qs}${hash}`;

  return (
    <iframe
      title="MatchFrame Funnel"
      src={src}
      style={{ width: "100%", height: "100dvh", border: "none", display: "block" }}
    />
  );
}
