// src/components/Avatar.jsx
import React from 'react';

const COLORS = ['#6c63ff','#E53935','#43A047','#F9A825','#1E88E5','#D81B60','#00ACC1','#FB8C00'];
const TEXT_COLORS = ['#fff','#fff','#fff','#1a1a2e','#fff','#fff','#fff','#fff'];

export function Avatar({ name = '', index = 0, size = 40 }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const bg = COLORS[index % COLORS.length];
  const color = TEXT_COLORS[index % TEXT_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color, fontWeight: 700,
      fontSize: size * 0.35, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}
