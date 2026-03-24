import React from 'react';

export const TeamLogo = () => (
  <svg viewBox="0 0 300 350" className="w-full h-full drop-shadow-md" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#00E5F2" />
        <stop offset="50%" stopColor="#00B4C4" />
        <stop offset="100%" stopColor="#001F2D" />
      </linearGradient>
    </defs>
    
    {/* Outer Shield Border */}
    <path d="M150 10 L280 60 C280 200 240 300 150 340 C60 300 20 200 20 60 L150 10 Z" fill="#001F2D" />
    
    {/* Inner Shield with Gradient */}
    <path d="M150 22 L268 68 C268 195 230 288 150 328 C70 288 32 195 32 68 L150 22 Z" fill="url(#shieldGradient)" />
    
    {/* Text */}
    <text x="150" y="100" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="Inter, sans-serif" letterSpacing="0.5">DE MARKIEZATEN</text>
    
    {/* Three X Marks (St. Andrew's Crosses) */}
    <g stroke="white" strokeWidth="8" strokeLinecap="round">
      {/* Top Left X */}
      <path d="M95 145 L115 165 M115 145 L95 165" />
      {/* Top Right X */}
      <path d="M185 145 L205 165 M205 145 L185 165" />
      {/* Bottom Center X */}
      <path d="M140 185 L160 205 M160 185 L140 205" />
    </g>

    {/* Mountain/Peak Shapes at the bottom */}
    <path d="M50 310 L110 240 L150 290 L200 190 L250 290 L280 260 L300 310" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
  </svg>
);
