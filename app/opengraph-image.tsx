import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0c0b0a",
          color: "#f3eee6",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 64,
            height: 64,
            borderRadius: 999,
            background: "#e0b48a",
            color: "#0c0b0a",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          CC
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 500, letterSpacing: -2 }}>Cafe Cursor</div>
          <div style={{ marginTop: 16, fontSize: 28, color: "#9a9188" }}>
            Paste your link. Find everyone in the room.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
