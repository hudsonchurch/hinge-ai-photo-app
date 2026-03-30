import React from "react";

export default function App() {
  const params = new URLSearchParams(window.location.search || "");
  params.set("v", "20260330-1213");
  const hash = window.location.hash || "";
  const src = `/matchframe-funnel.html?${params.toString()}${hash}`;

  return (
    <iframe
      title="MatchFrame Funnel"
      src={src}
      style={{ width: "100%", height: "100dvh", border: "none", display: "block" }}
    />
  );
}
