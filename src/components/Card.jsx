// src/components/Card.jsx
import React from 'react';

const COLOR_HEX = { red: '#E53935', yellow: '#F9A825', blue: '#1565C0', green: '#2E7D32' };
const COLOR_DARK = { red: '#b71c1c', yellow: '#f57f17', blue: '#0d47a1', green: '#1b5e20' };
const LABEL = { red: 'R', yellow: 'Y', blue: 'B', green: 'G' };

export function Card({ color, num, size = 'md', selected, onClick }) {
  const bg = COLOR_HEX[color] || '#333';
  const dark = COLOR_DARK[color] || '#111';

  const dims = {
    md: { w: 56, h: 80, numSize: 28, cornerSize: 11, ovalW: 36, ovalH: 52, borderR: 10 },
    sm: { w: 40, h: 58, numSize: 20, cornerSize: 9,  ovalW: 26, ovalH: 38, borderR: 8  },
    xs: { w: 30, h: 44, numSize: 15, cornerSize: 7,  ovalW: 20, ovalH: 30, borderR: 6  },
  }[size] || { w: 56, h: 80, numSize: 28, cornerSize: 11, ovalW: 36, ovalH: 52, borderR: 10 };

  return (
    <div
      onClick={onClick}
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: dims.borderR,
        background: bg,
        border: `2px solid ${dark}`,
        boxShadow: selected
          ? `0 0 0 3px #fff, 0 4px 14px rgba(0,0,0,0.5)`
          : '0 3px 8px rgba(0,0,0,0.4)',
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transform: selected ? 'translateY(-6px) scale(1.05)' : 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* White border inset */}
      <div style={{
        position: 'absolute',
        inset: 3,
        borderRadius: dims.borderR - 2,
        border: '1.5px solid rgba(255,255,255,0.35)',
        pointerEvents: 'none',
      }} />

      {/* Centre oval */}
      <div style={{
        width: dims.ovalW,
        height: dims.ovalH,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <span style={{
          fontSize: dims.numSize,
          fontWeight: 900,
          color: '#fff',
          textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          fontFamily: "'Arial Black', 'Arial', sans-serif",
          WebkitTextStroke: '0.5px rgba(0,0,0,0.3)',
          lineHeight: 1,
        }}>
          {num}
        </span>
      </div>

      {/* Top-left corner */}
      <div style={{
        position: 'absolute',
        top: 4,
        left: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 1,
      }}>
        <span style={{ fontSize: dims.cornerSize, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{num}</span>
        <span style={{ fontSize: dims.cornerSize - 2, fontWeight: 700, color: 'rgba(255,255,255,0.75)', lineHeight: 1 }}>{LABEL[color]}</span>
      </div>

      {/* Bottom-right corner (rotated) */}
      <div style={{
        position: 'absolute',
        bottom: 4,
        right: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        lineHeight: 1,
        transform: 'rotate(180deg)',
      }}>
        <span style={{ fontSize: dims.cornerSize, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{num}</span>
        <span style={{ fontSize: dims.cornerSize - 2, fontWeight: 700, color: 'rgba(255,255,255,0.75)', lineHeight: 1 }}>{LABEL[color]}</span>
      </div>
    </div>
  );
}

export function CardBack({ size = 'md' }) {
  const dims = {
    md: { w: 56, h: 80, borderR: 10 },
    sm: { w: 40, h: 58, borderR: 8 },
    xs: { w: 30, h: 44, borderR: 6 },
  }[size] || { w: 56, h: 80, borderR: 10 };

  return (
    <div style={{
      width: dims.w,
      height: dims.h,
      borderRadius: dims.borderR,
      background: 'linear-gradient(135deg, #1a1a3e, #2d1b69)',
      border: '2px solid #6c63ff55',
      boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute',
        inset: 3,
        borderRadius: dims.borderR - 2,
        border: '1.5px solid rgba(108,99,255,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: 18, opacity: 0.4 }}>🂠</span>
      </div>
    </div>
  );
}
