import React, { useState, useEffect, useRef, useCallback } from "react";

const W = 560,
  H = 360;
const PAD_W = 10,
  PAD_H = 72;
const BALL_SIZE = 10;
const SPEED = 4;
const TRAIL_LEN = 14;

function initGame() {
  return {
    ball: { x: W / 2, y: H / 2, vx: -SPEED, vy: SPEED * 0.8 },
    p1: { y: H / 2 - PAD_H / 2 },
    p2: { y: H / 2 - PAD_H / 2 },
    score: { p1: 0, p2: 0 },
    trail: [],
  };
}

function Pong() {
  const [tvState, setTvState] = useState("off");
  const [game, setGame] = useState(initGame());
  const [winner, setWinner] = useState(null);
  const [channel, setChannel] = useState(3);
  const [brightness, setBrightness] = useState(100);

  const keys = useRef({});
  const rafRef = useRef();
  const tvRef = useRef(tvState);
  tvRef.current = tvState;

  const powerOn = () => {
    if (tvState !== "off") {
      powerOff();
      return;
    }
    setTvState("powering");
    setTimeout(() => setTvState("static"), 600);
    setTimeout(() => {
      setTvState("playing");
      setGame(initGame());
      setWinner(null);
    }, 2000);
  };

  const powerOff = () => {
    cancelAnimationFrame(rafRef.current);
    setTvState("off");
    setGame(initGame());
    setWinner(null);
  };

  const togglePause = () => {
    if (tvState === "playing") setTvState("paused");
    else if (tvState === "paused") setTvState("playing");
  };

  const resetGame = () => {
    if (tvState !== "off") {
      setGame(initGame());
      setWinner(null);
      setTvState("playing");
    }
  };

  const isOn = tvState !== "off";

  const tick = useCallback(() => {
    if (tvRef.current !== "playing") {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    setGame((prev) => {
      let { ball, p1, p2, score, trail } = prev;
      let { x, y, vx, vy } = ball;

      let p1y = p1.y,
        p2y = p2.y;
      if (keys.current["w"] || keys.current["W"]) p1y = Math.max(0, p1y - 5);
      if (keys.current["s"] || keys.current["S"])
        p1y = Math.min(H - PAD_H, p1y + 5);
      if (keys.current["ArrowUp"]) p2y = Math.max(0, p2y - 5);
      if (keys.current["ArrowDown"]) p2y = Math.min(H - PAD_H, p2y + 5);

      const newTrail = [
        ...trail,
        { x: x + BALL_SIZE / 2, y: y + BALL_SIZE / 2 },
      ];
      if (newTrail.length > TRAIL_LEN) newTrail.shift();

      x += vx;
      y += vy;

      if (y <= 0) {
        y = 0;
        vy = Math.abs(vy);
      }
      if (y >= H - BALL_SIZE) {
        y = H - BALL_SIZE;
        vy = -Math.abs(vy);
      }

      if (
        x <= 30 + PAD_W &&
        y + BALL_SIZE >= p1y &&
        y <= p1y + PAD_H &&
        vx < 0
      ) {
        vx = Math.abs(vx) * 1.04;
        vy =
          ((y + BALL_SIZE / 2 - (p1y + PAD_H / 2)) / (PAD_H / 2)) * SPEED * 1.4;
        x = 30 + PAD_W;
      }
      if (
        x + BALL_SIZE >= W - 30 - PAD_W &&
        y + BALL_SIZE >= p2y &&
        y <= p2y + PAD_H &&
        vx > 0
      ) {
        vx = -Math.abs(vx) * 1.04;
        vy =
          ((y + BALL_SIZE / 2 - (p2y + PAD_H / 2)) / (PAD_H / 2)) * SPEED * 1.4;
        x = W - 30 - PAD_W - BALL_SIZE;
      }

      const spd = Math.sqrt(vx * vx + vy * vy);
      if (spd > 13) {
        vx = (vx / spd) * 13;
        vy = (vy / spd) * 13;
      }

      let newScore = { ...score };
      let reset = false;
      let win = null;

      if (x < 0) {
        newScore.p2 += 1;
        reset = true;
      }
      if (x > W) {
        newScore.p1 += 1;
        reset = true;
      }
      if (newScore.p1 >= 7) win = "PLAYER 1";
      if (newScore.p2 >= 7) win = "PLAYER 2";

      if (win) {
        setWinner(win);
        setTvState("paused");
      }

      if (reset) {
        return {
          ...prev,
          ball: {
            x: W / 2,
            y: H / 2,
            vx: SPEED * (x < 0 ? 1 : -1),
            vy: SPEED * 0.8,
          },
          p1: { y: H / 2 - PAD_H / 2 },
          p2: { y: H / 2 - PAD_H / 2 },
          score: newScore,
          trail: [],
        };
      }

      return {
        ...prev,
        ball: { x, y, vx, vy },
        p1: { y: p1y },
        p2: { y: p2y },
        score: newScore,
        trail: newTrail,
      };
    });
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  useEffect(() => {
    const down = (e) => {
      keys.current[e.key] = true;
      if (["ArrowUp", "ArrowDown", "w", "s"].includes(e.key))
        e.preventDefault();
    };
    const up = (e) => {
      keys.current[e.key] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const { ball, p1, p2, score, trail } = game;
  const brightFilter = `brightness(${brightness}%)`;

  const renderScreen = () => {
    if (tvState === "off")
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#000",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 2,
              height: 2,
              background: "#fff",
              borderRadius: "50%",
              boxShadow: "0 0 8px #fff",
            }}
          />
        </div>
      );

    if (tvState === "powering")
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#000",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%",
              height: 3,
              background: "#fff",
              boxShadow: "0 0 12px #fff, 0 0 30px #fff",
              animation: "expand 0.5s ease-out forwards",
            }}
          />
          <style>{`@keyframes expand { from { transform: scaleY(1); } to { transform: scaleY(60); } }`}</style>
        </div>
      );

    if (tvState === "static")
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 8,
            overflow: "hidden",
            position: "relative",
            background: "#111",
          }}
        >
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${4 + Math.random() * 40}px`,
                height: `${2 + Math.random() * 6}px`,
                background: `rgba(255,255,255,${Math.random() * 0.8})`,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 11,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: 6,
              }}
            >
              CHANNEL {channel}
            </div>
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 9,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: 3,
              }}
            >
              LOADING...
            </div>
          </div>
        </div>
      );

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a1a",
          borderRadius: 8,
          position: "relative",
          overflow: "hidden",
          filter: brightFilter,
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={"v" + i}
            style={{
              position: "absolute",
              left: (i + 1) * (W / 10),
              top: 0,
              width: 1,
              height: "100%",
              background: "rgba(255,255,255,0.04)",
            }}
          />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={"h" + i}
            style={{
              position: "absolute",
              top: (i + 1) * (H / 8),
              left: 0,
              height: 1,
              width: "100%",
              background: "rgba(255,255,255,0.04)",
            }}
          />
        ))}
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={"d" + i}
            style={{
              position: "absolute",
              left: W / 2 - 1,
              top: i * 22 + 6,
              width: 2,
              height: 12,
              background: "rgba(255,255,255,0.15)",
            }}
          />
        ))}
        {trail.map((pt, i) => {
          const a = (i / trail.length) * 0.5;
          const s = 2 + (i / trail.length) * 5;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: pt.x - s / 2,
                top: pt.y - s / 2,
                width: s,
                height: s,
                borderRadius: "50%",
                background: `rgba(100,180,255,${a})`,
                boxShadow: `0 0 ${s * 2}px rgba(100,180,255,${a * 0.5})`,
              }}
            />
          );
        })}
        <div
          style={{
            position: "absolute",
            left: 30,
            top: p1.y,
            width: PAD_W,
            height: PAD_H,
            background: "#fff",
            borderRadius: 3,
            boxShadow: "0 0 8px rgba(255,255,255,0.6)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 30,
            top: p2.y,
            width: PAD_W,
            height: PAD_H,
            background: "#fff",
            borderRadius: 3,
            boxShadow: "0 0 8px rgba(255,255,255,0.6)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: ball.x,
            top: ball.y,
            width: BALL_SIZE,
            height: BALL_SIZE,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 0 6px #fff, 0 0 16px rgba(100,180,255,0.8)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 20,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 28,
              fontWeight: "bold",
              color: "#fff",
              textShadow: "0 0 10px rgba(100,180,255,0.8)",
            }}
          >
            {score.p1}
          </div>
          <div
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 12,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            :
          </div>
          <div
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 28,
              fontWeight: "bold",
              color: "#fff",
              textShadow: "0 0 10px rgba(100,180,255,0.8)",
            }}
          >
            {score.p2}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 10,
            fontFamily: "'Courier New', monospace",
            fontSize: 8,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: 2,
          }}
        >
          CH {channel}
        </div>
        {tvState === "paused" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,10,0.75)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            {winner ? (
              <>
                <div
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: 10,
                    color: "rgba(255,255,255,0.5)",
                    letterSpacing: 6,
                  }}
                >
                  GAME OVER
                </div>
                <div
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: 26,
                    color: "#fff",
                    letterSpacing: 6,
                    textShadow: "0 0 20px rgba(100,180,255,0.8)",
                  }}
                >
                  {winner}
                </div>
                <div
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: 10,
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: 3,
                  }}
                >
                  {score.p1} — {score.p2}
                </div>
                <div
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: 8,
                    color: "rgba(255,255,255,0.25)",
                    letterSpacing: 2,
                    marginTop: 8,
                  }}
                >
                  PRESS RESET TO PLAY AGAIN
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: 6,
                  }}
                >
                  ⏸ PAUSED
                </div>
                <div
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: 8,
                    color: "rgba(255,255,255,0.2)",
                    letterSpacing: 3,
                  }}
                >
                  PRESS ⏯ TO RESUME
                </div>
              </>
            )}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
            pointerEvents: "none",
            borderRadius: 8,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.5) 100%)",
            pointerEvents: "none",
            borderRadius: 8,
          }}
        />
      </div>
    );
  };

  const btnStyle = (color = "#444") => ({
    borderRadius: 6,
    background: `radial-gradient(circle at 38% 32%, ${color}, #111)`,
    border: "1px solid #555",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#aaa",
    fontSize: 11,
    fontFamily: "'Courier New', monospace",
    letterSpacing: 1,
    boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
    userSelect: "none",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e8e8e0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Courier New', monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* TV body */}
        <div
          style={{
            background:
              "linear-gradient(160deg, #f0eeea 0%, #d8d6d0 60%, #c8c6c0 100%)",
            borderRadius: "16px 16px 8px 8px",
            padding: "18px 24px 24px",
            boxShadow:
              "0 0 0 2px #b0aea8, 0 0 0 4px #a0a09a, 0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)",
            position: "relative",
          }}
        >
          {/* top handle */}
          <div
            style={{
              position: "absolute",
              top: -12,
              left: "50%",
              transform: "translateX(-50%)",
              width: 60,
              height: 14,
              background: "#c8c6c0",
              borderRadius: "8px 8px 0 0",
              boxShadow:
                "0 -2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.6)",
            }}
          />

          {/* brand */}
          <div
            style={{
              textAlign: "center",
              fontSize: 9,
              letterSpacing: 6,
              color: "#888",
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            SONIVOX · ST-80
          </div>

          {/* screen bezel */}
          <div
            style={{
              background: "#1a1a1a",
              borderRadius: 10,
              padding: 10,
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.8), 0 0 0 1px #111",
            }}
          >
            <div
              style={{
                width: W,
                height: H,
                borderRadius: 8,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {renderScreen()}
            </div>
          </div>

          {/* bottom controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
              padding: "0 8px",
            }}
          >
            {/* left speaker */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 4 }}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <div
                      key={j}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: "#b0aea8",
                        boxShadow: "inset 0 1px 1px rgba(0,0,0,0.3)",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* center controls */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* power button */}
              <div style={{ textAlign: "center" }}>
                <div
                  onClick={powerOn}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    cursor: "pointer",
                    background: isOn
                      ? "radial-gradient(circle at 38% 32%, #e05050, #801010)"
                      : "radial-gradient(circle at 38% 32%, #505050, #1a1a1a)",
                    border: `2px solid ${isOn ? "#601010" : "#333"}`,
                    boxShadow: isOn
                      ? "0 0 10px rgba(220,60,60,0.6), 0 3px 8px rgba(0,0,0,0.6)"
                      : "0 3px 8px rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isOn ? "#ffaaaa" : "#444",
                    fontSize: 14,
                  }}
                >
                  ⏻
                </div>
                <div
                  style={{
                    fontSize: 7,
                    color: "#888",
                    marginTop: 4,
                    letterSpacing: 1,
                  }}
                >
                  POWER
                </div>
              </div>

              {/* pause button */}
              <div style={{ textAlign: "center" }}>
                <div
                  onClick={togglePause}
                  style={{
                    ...btnStyle(),
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    fontSize: 14,
                    opacity: isOn ? 1 : 0.3,
                    pointerEvents: isOn ? "auto" : "none",
                  }}
                >
                  {tvState === "playing" ? "⏸" : "▶"}
                </div>
                <div
                  style={{
                    fontSize: 7,
                    color: "#888",
                    marginTop: 4,
                    letterSpacing: 1,
                  }}
                >
                  PAUSE
                </div>
              </div>

              {/* reset button */}
              <div style={{ textAlign: "center" }}>
                <div
                  onClick={resetGame}
                  style={{
                    ...btnStyle("#1a3a1a"),
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    color: "#3a8a3a",
                    fontSize: 14,
                    opacity: isOn ? 1 : 0.3,
                    pointerEvents: isOn ? "auto" : "none",
                  }}
                >
                  ⏮
                </div>
                <div
                  style={{
                    fontSize: 7,
                    color: "#888",
                    marginTop: 4,
                    letterSpacing: 1,
                  }}
                >
                  RESET
                </div>
              </div>

              {/* brightness */}
              <div style={{ textAlign: "center" }}>
                <input
                  type="range"
                  min="40"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(e.target.value)}
                  style={{ width: 60, accentColor: "#888", cursor: "pointer" }}
                />
                <div
                  style={{
                    fontSize: 7,
                    color: "#888",
                    marginTop: 2,
                    letterSpacing: 1,
                  }}
                >
                  BRGHTNS
                </div>
              </div>

              {/* channel display */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    background: "#1a1a1a",
                    borderRadius: 4,
                    padding: "4px 10px",
                    border: "1px solid #333",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: 16,
                      color: isOn ? "#ff6600" : "#331100",
                      textShadow: isOn ? "0 0 6px #ff6600" : "none",
                    }}
                  >
                    {String(channel).padStart(2, "0")}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 7,
                    color: "#888",
                    marginTop: 4,
                    letterSpacing: 1,
                  }}
                >
                  CHANNEL
                </div>
              </div>
            </div>

            {/* right speaker */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 4 }}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <div
                      key={j}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: "#b0aea8",
                        boxShadow: "inset 0 1px 1px rgba(0,0,0,0.3)",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* controls hint */}
          <div
            style={{
              textAlign: "center",
              marginTop: 10,
              fontSize: 8,
              color: "#999",
              letterSpacing: 2,
            }}
          >
            P1: W/S · P2: ↑/↓
          </div>

          {/* TV feet */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              padding: "0 20px",
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  width: 30,
                  height: 8,
                  background: "#b0aea8",
                  borderRadius: "0 0 4px 4px",
                  boxShadow: "0 3px 6px rgba(0,0,0,0.2)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pong;
