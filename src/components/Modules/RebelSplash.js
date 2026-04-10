import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
const BOOT_MESSAGES = [
    "BOOTING CORE SYSTEMS...",
    "LOADING REBEL MODULES...",
    "ESTABLISHING UPLINK...",
    "CALIBRATING MATRIX...",
    "SYSTEM ONLINE",
];
export default function RebelSplash() {
    const [progress, setProgress] = useState(0);
    const [msgIndex, setMsgIndex] = useState(0);
    const [done, setDone] = useState(false);
    const intervalRef = useRef(null);
    const navigate = useNavigate();
    // Boot sequence
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setProgress((prev) => {
                const next = prev + Math.random() * 6 + 2;
                if (next >= 100) {
                    clearInterval(intervalRef.current);
                    setDone(true);
                    return 100;
                }
                return next;
            });
        }, 120);
        return () => clearInterval(intervalRef.current);
    }, []);
    // Sync boot message to progress
    useEffect(() => {
        setMsgIndex(Math.min(Math.floor(progress / 25), BOOT_MESSAGES.length - 1));
    }, [progress]);
    // Auto-navigate to dashboard 900ms after boot completes (fade-out plays first)
    useEffect(() => {
        if (!done)
            return;
        const t = setTimeout(() => navigate("/"), 900);
        return () => clearTimeout(t);
    }, [done, navigate]);
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

        @keyframes rebel-pulse-ring {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(1.04); }
        }
        @keyframes rebel-pulse-inner {
          0%, 100% { opacity: 0.8; }
          50%       { opacity: 1; }
        }
        @keyframes rebel-scan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(110vh); }
        }
        @keyframes rebel-flicker {
          0%, 90%, 94%, 98%, 100% { opacity: 1; }
          92% { opacity: 0.7; }
          96% { opacity: 0.8; }
        }
        @keyframes rebel-fadeup {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rebel-dot-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.3); }
        }
        @keyframes rebel-fadeout {
          from { opacity: 1; }
          to   { opacity: 0; }
        }

        *, *::before, *::after { box-sizing: border-box; }

        .rebel-root {
          background: #020b18;
          min-height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: fixed;
          inset: 0;
          z-index: 9999;
          overflow: hidden;
          font-family: 'Orbitron', monospace;
          padding: 24px 16px;
        }
        .rebel-root.rebel-exit {
          animation: rebel-fadeout 0.8s ease forwards;
          pointer-events: none;
        }

        .rebel-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,180,255,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,180,255,.04) 1px, transparent 1px);
          background-size: 36px 36px;
          pointer-events: none;
        }

        .rebel-scan {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(transparent, rgba(0,200,255,.18), transparent);
          animation: rebel-scan 4s linear infinite;
          pointer-events: none;
        }

        .rebel-corner {
          position: absolute;
          width: 20px;
          height: 20px;
        }
        .rebel-corner::before,
        .rebel-corner::after {
          content: '';
          position: absolute;
          background: rgba(0,200,255,.5);
        }
        .rebel-corner::before { width: 100%; height: 1.5px; top: 0; }
        .rebel-corner::after  { width: 1.5px; height: 100%; top: 0; }
        .rebel-corner-tl { top: 20px; left: 20px; }
        .rebel-corner-tr { top: 20px; right: 20px; transform: scaleX(-1); }
        .rebel-corner-bl { bottom: 20px; left: 20px; transform: scaleY(-1); }
        .rebel-corner-br { bottom: 20px; right: 20px; transform: scale(-1); }

        @media (max-width: 480px) {
          .rebel-corner-tl { top: 12px; left: 12px; }
          .rebel-corner-tr { top: 12px; right: 12px; }
          .rebel-corner-bl { bottom: 12px; left: 12px; }
          .rebel-corner-br { bottom: 12px; right: 12px; }
        }

        .rebel-logo-wrap {
          position: relative;
          width: clamp(160px, 40vw, 220px);
          height: clamp(160px, 40vw, 220px);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
          animation: rebel-fadeup .8s ease both;
        }

        .rebel-orbit-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(0,200,255,.18);
          animation: rebel-pulse-ring 3s ease-in-out infinite;
        }
        .rebel-ring-outer { width: 240px; height: 240px; animation-delay: 1s; border-color: rgba(0,160,255,.08); }
        .rebel-ring-mid   { width: 210px; height: 210px; animation-delay: 0s; }
        .rebel-ring-inner { width: 180px; height: 180px; animation-delay: .5s; border-style: dashed; border-color: rgba(0,180,255,.1); }

        @media (max-width: 480px) {
          .rebel-ring-outer { width: 180px; height: 180px; }
          .rebel-ring-mid   { width: 158px; height: 158px; }
          .rebel-ring-inner { width: 136px; height: 136px; }
        }

        .rebel-hex-svg {
          width: clamp(120px, 32vw, 180px);
          height: clamp(120px, 32vw, 180px);
          animation: rebel-pulse-inner 2.5s ease-in-out infinite;
          filter: drop-shadow(0 0 18px rgba(0,180,255,.5));
        }

        .rebel-brand {
          text-align: center;
          animation: rebel-fadeup 1s ease .3s both;
        }

        .rebel-name {
          font-size: clamp(28px, 8vw, 48px);
          font-weight: 900;
          letter-spacing: clamp(6px, 2vw, 12px);
          color: #00c8ff;
          text-transform: uppercase;
          margin: 0 0 8px;
          animation: rebel-flicker 6s ease-in-out infinite;
          text-shadow:
            0 0 30px rgba(0,200,255,.6),
            0 0 60px rgba(0,180,255,.3);
        }

        .rebel-sub {
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 5px;
          color: rgba(0,200,255,.45);
          text-transform: uppercase;
          margin: 0 0 1.5rem;
        }

        .rebel-divider {
          width: 120px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,200,255,.4), transparent);
          margin: 0 auto 1.5rem;
        }

        .rebel-bar-wrap {
          width: clamp(160px, 50vw, 200px);
          height: 3px;
          background: rgba(0,200,255,.1);
          border-radius: 2px;
          overflow: hidden;
          margin: 0 auto 10px;
          animation: rebel-fadeup 1s ease .6s both;
        }

        .rebel-bar {
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(90deg, #0070c0, #00c8ff);
          transition: width .1s linear;
        }

        .rebel-load-text {
          font-size: 8px;
          font-weight: 400;
          letter-spacing: 3px;
          color: rgba(0,200,255,.4);
          text-align: center;
          animation: rebel-fadeup 1s ease .7s both;
          min-height: 14px;
        }
        .rebel-load-text.rebel-online {
          color: #00c8ff;
          text-shadow: 0 0 10px rgba(0,200,255,.5);
        }

        .rebel-dots {
          display: flex;
          gap: 14px;
          margin-top: 1.2rem;
          animation: rebel-fadeup 1s ease .9s both;
        }

        .rebel-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #00c8ff;
          animation: rebel-dot-pulse 1.5s ease-in-out infinite;
        }
        .rebel-dot:nth-child(2) { animation-delay: .3s; }
        .rebel-dot:nth-child(3) { animation-delay: .6s; }

        .rebel-enter-btn {
          margin-top: 1.8rem;
          padding: 10px 32px;
          font-family: 'Orbitron', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 4px;
          color: #00c8ff;
          background: transparent;
          border: 1px solid rgba(0,200,255,.4);
          border-radius: 2px;
          cursor: pointer;
          text-transform: uppercase;
          transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          animation: rebel-fadeup 0.5s ease both;
        }
        .rebel-enter-btn:hover {
          background: rgba(0,200,255,.08);
          border-color: rgba(0,200,255,.8);
          box-shadow: 0 0 16px rgba(0,200,255,.25);
        }
      ` }), _jsxs("div", { className: `rebel-root${done ? " rebel-exit" : ""}`, children: [_jsx("div", { className: "rebel-grid" }), _jsx("div", { className: "rebel-scan" }), _jsx("div", { className: "rebel-corner rebel-corner-tl" }), _jsx("div", { className: "rebel-corner rebel-corner-tr" }), _jsx("div", { className: "rebel-corner rebel-corner-bl" }), _jsx("div", { className: "rebel-corner rebel-corner-br" }), _jsxs("div", { className: "rebel-logo-wrap", children: [_jsx("div", { className: "rebel-orbit-ring rebel-ring-outer" }), _jsx("div", { className: "rebel-orbit-ring rebel-ring-mid" }), _jsx("div", { className: "rebel-orbit-ring rebel-ring-inner" }), _jsxs("svg", { className: "rebel-hex-svg", viewBox: "0 0 200 200", xmlns: "http://www.w3.org/2000/svg", children: [_jsxs("defs", { children: [_jsxs("radialGradient", { id: "rebel-core-glow", cx: "50%", cy: "50%", r: "50%", children: [_jsx("stop", { offset: "0%", stopColor: "#aaf0ff" }), _jsx("stop", { offset: "40%", stopColor: "#00aaff" }), _jsx("stop", { offset: "100%", stopColor: "#002244" })] }), _jsxs("radialGradient", { id: "rebel-mid-glow", cx: "50%", cy: "50%", r: "50%", children: [_jsx("stop", { offset: "0%", stopColor: "#003366" }), _jsx("stop", { offset: "100%", stopColor: "#000e1c" })] })] }), _jsx("polygon", { points: "100,10 175,52.5 175,147.5 100,190 25,147.5 25,52.5", fill: "#000e1c", stroke: "#00c8ff", strokeWidth: "2" }), _jsx("polygon", { points: "100,34 155,65 155,135 100,166 45,135 45,65", fill: "#001122", stroke: "#0088cc", strokeWidth: "1.2" }), _jsx("polygon", { points: "100,58 138,80 138,122 100,144 62,122 62,80", fill: "url(#rebel-mid-glow)", stroke: "#0099dd", strokeWidth: "1" }), _jsx("polygon", { points: "100,72 124,86 124,114 100,128 76,114 76,86", fill: "url(#rebel-core-glow)" }), _jsx("circle", { cx: "100", cy: "100", r: "22", fill: "#77ddff", opacity: ".9" }), _jsx("circle", { cx: "100", cy: "100", r: "15", fill: "#cceeff", opacity: ".95" }), _jsx("line", { x1: "100", y1: "80", x2: "100", y2: "120", stroke: "white", strokeWidth: ".8", opacity: ".7" }), _jsx("line", { x1: "82", y1: "90", x2: "118", y2: "110", stroke: "white", strokeWidth: ".8", opacity: ".7" }), _jsx("line", { x1: "82", y1: "110", x2: "118", y2: "90", stroke: "white", strokeWidth: ".8", opacity: ".7" }), _jsx("circle", { cx: "100", cy: "100", r: "50", fill: "none", stroke: "#0099cc", strokeWidth: ".6", strokeDasharray: "6,4", children: _jsx("animateTransform", { attributeName: "transform", type: "rotate", from: "0 100 100", to: "360 100 100", dur: "12s", repeatCount: "indefinite" }) })] })] }), _jsxs("div", { className: "rebel-brand", children: [_jsx("p", { className: "rebel-name", children: "REBEL" }), _jsx("p", { className: "rebel-sub", children: "systems \u00A0\u00B7\u00A0 initializing" }), _jsx("div", { className: "rebel-divider" })] }), _jsx("div", { className: "rebel-bar-wrap", children: _jsx("div", { className: "rebel-bar", style: { width: `${Math.min(progress, 100)}%` } }) }), _jsx("p", { className: `rebel-load-text${done ? " rebel-online" : ""}`, children: BOOT_MESSAGES[msgIndex] }), !done && (_jsxs("div", { className: "rebel-dots", children: [_jsx("div", { className: "rebel-dot" }), _jsx("div", { className: "rebel-dot" }), _jsx("div", { className: "rebel-dot" })] })), done && (_jsx("button", { className: "rebel-enter-btn", onClick: () => navigate("/"), children: "ENTER DASHBOARD" }))] })] }));
}
