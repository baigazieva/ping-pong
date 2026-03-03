

import './App.css'

import { useState, useEffect, useRef, useCallback } from "react";

const W = 700, H = 480;
const PAD_W = 10, PAD_H = 80;
const BALL_SIZE = 10;
const SPEED = 4;

function initState() {
  return {
    ball: { x: W / 2, y: H / 2, vx: SPEED, vy: SPEED },
    p1: { y: H / 2 - PAD_H / 2 },
    p2: { y: H / 2 - PAD_H / 2 },
    score: { p1: 0, p2: 0 },
    running: false,
    winner: null,
  };
}

export default function Pong() {
  const [state, setState] = useState(initState());
  const keys = useRef({});
  const rafRef = useRef();
  const stateRef = useRef(state);
  stateRef.current = state;

  const tick = useCallback(() => {
    setState(prev => {
      if (!prev.running) return prev;
      let { ball, p1, p2, score } = prev;
      let { x, y, vx, vy } = ball;

      // Move paddles
      let p1y = p1.y, p2y = p2.y;
      if (keys.current["w"] || keys.current["W"]) p1y = Math.max(0, p1y - 5);
      if (keys.current["s"] || keys.current["S"]) p1y = Math.min(H - PAD_H, p1y + 5);
      if (keys.current["ArrowUp"]) p2y = Math.max(0, p2y - 5);
      if (keys.current["ArrowDown"]) p2y = Math.min(H - PAD_H, p2y + 5);

      x += vx; y += vy;

      // Top/bottom bounce
      if (y <= 0) { y = 0; vy = Math.abs(vy); }
      if (y >= H - BALL_SIZE) { y = H - BALL_SIZE; vy = -Math.abs(vy); }

      // P1 paddle (left)
      if (x <= 30 + PAD_W && y + BALL_SIZE >= p1y && y <= p1y + PAD_H && vx < 0) {
        vx = Math.abs(vx) * 1.03;
        let hit = (y + BALL_SIZE / 2 - (p1y + PAD_H / 2)) / (PAD_H / 2);
        vy = hit * SPEED * 1.5;
        x = 30 + PAD_W;
      }

      // P2 paddle (right)
      if (x + BALL_SIZE >= W - 30 - PAD_W && y + BALL_SIZE >= p2y && y <= p2y + PAD_H && vx > 0) {
        vx = -Math.abs(vx) * 1.03;
        let hit = (y + BALL_SIZE / 2 - (p2y + PAD_H / 2)) / (PAD_H / 2);
        vy = hit * SPEED * 1.5;
        x = W - 30 - PAD_W - BALL_SIZE;
      }

      // Clamp speed
      const spd = Math.sqrt(vx * vx + vy * vy);
      if (spd > 14) { vx = vx / spd * 14; vy = vy / spd * 14; }

      // Scoring
      let newScore = { ...score };
      let winner = null;
      let reset = false;

      if (x < 0) { newScore.p2 += 1; reset = true; }
      if (x > W) { newScore.p1 += 1; reset = true; }
      if (newScore.p1 >= 7) winner = "Player 1";
      if (newScore.p2 >= 7) winner = "Player 2";

      if (reset) {
        const dir = x < 0 ? 1 : -1;
        return {
          ...prev,
          ball: { x: W / 2, y: H / 2, vx: SPEED * dir, vy: SPEED },
          p1: { y: H / 2 - PAD_H / 2 },
          p2: { y: H / 2 - PAD_H / 2 },
          score: newScore,
          running: !winner,
          winner,
        };
      }

      return { ...prev, ball: { x, y, vx, vy }, p1: { y: p1y }, p2: { y: p2y }, score: newScore };
    });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const down = e => { keys.current[e.key] = true; e.preventDefault(); };
    const up = e => { keys.current[e.key] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    if (state.running) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [state.running, tick]);

  const start = () => setState({ ...initState(), running: true });

  const { ball, p1, p2, score, running, winner } = state;

  return (
    <div style={{
      minHeight: "100vh", background: "#f5f5f0",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "monospace"
    }}>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 48 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#999", marginBottom: 4 }}>PLAYER 1</div>
          <div style={{ fontSize: 48, fontWeight: 100, color: "#222" }}>{score.p1}</div>
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>W / S</div>
        </div>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#ccc" }}>VS</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#999", marginBottom: 4 }}>PLAYER 2</div>
          <div style={{ fontSize: 48, fontWeight: 100, color: "#222" }}>{score.p2}</div>
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>↑ / ↓</div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{
        position: "relative", width: W, height: H,
        background: "#fff", border: "1px solid #e0e0e0",
        borderRadius: 4, overflow: "hidden",
        boxShadow: "0 2px 20px rgba(0,0,0,0.06)"
      }}>
        {/* Center line */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} style={{
            position: "absolute", left: W / 2 - 1, top: i * 32 + 8,
            width: 2, height: 16, background: "#eee"
          }} />
        ))}

        {/* P1 Paddle */}
        <div style={{
          position: "absolute", left: 30, top: p1.y,
          width: PAD_W, height: PAD_H,
          background: "#222", borderRadius: 4
        }} />

        {/* P2 Paddle */}
        <div style={{
          position: "absolute", right: 30, top: p2.y,
          width: PAD_W, height: PAD_H,
          background: "#222", borderRadius: 4
        }} />

        {/* Ball */}
        <div style={{
          position: "absolute", left: ball.x, top: ball.y,
          width: BALL_SIZE, height: BALL_SIZE,
          background: "#222", borderRadius: "50%"
        }} />

        {/* Overlay */}
        {!running && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.92)"
          }}>
            {winner ? (
              <>
                <div style={{ fontSize: 13, letterSpacing: 4, color: "#999", marginBottom: 8 }}>WINNER</div>
                <div style={{ fontSize: 32, fontWeight: 300, color: "#222", marginBottom: 28 }}>{winner}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 28, fontWeight: 200, color: "#222", letterSpacing: 8, marginBottom: 8 }}>PONG</div>
                <div style={{ fontSize: 11, color: "#bbb", letterSpacing: 3, marginBottom: 28 }}>2 PLAYERS</div>
              </>
            )}
            <button onClick={start} style={{
              padding: "10px 32px", fontSize: 11, letterSpacing: 4,
              background: "#222", color: "#fff", border: "none",
              borderRadius: 2, cursor: "pointer"
            }}>
              {winner ? "PLAY AGAIN" : "START"}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, fontSize: 10, color: "#ccc", letterSpacing: 3 }}>
        FIRST TO 7 WINS
      </div>
    </div>
  );

}