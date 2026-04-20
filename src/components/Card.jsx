// src/components/Card.jsx
import React from 'react';

const LABEL = { red: 'R', yellow: 'Y', blue: 'B', green: 'G' };

export function Card({ color, num, size = 'md', selected, onClick }) {
  return (
    <div
      className={`uno-card ${size} ${color} ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        outline: selected ? '3px solid #fff' : 'none',
        outlineOffset: 2,
        transition: 'transform 0.1s',
        transform: selected ? 'translateY(-4px)' : 'none',
      }}
    >
      <span className="corner tl">{LABEL[color]}</span>
      {num}
      <span className="corner br">{LABEL[color]}</span>
    </div>
  );
}

export function CardBack({ size = 'md' }) {
  return (
    <div className={`uno-card ${size}`} style={{ background: '#22223b', border: '1px solid #2d2d4e', color: '#555' }}>?</div>
  );
}
