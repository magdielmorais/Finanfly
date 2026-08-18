import React, { useState } from 'react';
import logoAsset from '../assets/logo.png';

interface FinanFlyLogoProps {
  className?: string;
  size?: number | string;
  rounded?: string;
  shadow?: boolean;
}

export const FinanFlyLogo: React.FC<FinanFlyLogoProps> = ({
  className = '',
  size = 32,
  rounded = '',
  shadow = false
}) => {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <svg
        viewBox="0 0 1024 1024"
        className={`block ${rounded} ${shadow ? 'shadow-md shadow-blue-500/20' : ''} ${className}`}
        style={{ width: size, height: size }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="finanflyBlueGradFallback" x1="15%" y1="5%" x2="85%" y2="95%">
            <stop offset="0%" stopColor="#075ffc" />
            <stop offset="50%" stopColor="#0246e4" />
            <stop offset="100%" stopColor="#0022a3" />
          </linearGradient>
          <linearGradient id="speedGradFallback" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5588ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7da8ff" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" fill="#000000" />
        <rect x="2" y="2" width="1020" height="1020" rx="225" ry="225" fill="url(#finanflyBlueGradFallback)" />
        <rect x="198" y="424" width="220" height="38" rx="19" fill="url(#speedGradFallback)" />
        <rect x="144" y="506" width="274" height="38" rx="19" fill="url(#speedGradFallback)" />
        <rect x="205" y="588" width="186" height="38" rx="19" fill="url(#speedGradFallback)" />
        <path d="M 432 208 L 788 208 L 760 324 L 566 324 L 536 432 L 722 432 L 694 544 L 508 544 L 434 816 L 278 816 Z" fill="#ffffff" />
        <g transform="translate(348, 540)">
          <g transform="translate(4, 18)">
            <path d="M 120 70 C 50 45 -10 -5 18 -42 C 42 -20 54 18 84 28 C 42 -12 78 -50 114 -32 C 122 8 126 38 132 60 Z" fill="#ffffff" stroke="#06227b" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M 52 -18 C 76 8 84 32 94 48" fill="none" stroke="#06227b" strokeWidth="7" strokeLinecap="round" />
          </g>
          <g transform="translate(325, 42)">
            <path d="M 50 60 C 118 32 178 -18 152 -54 C 128 -32 114 6 86 16 C 128 -22 92 -62 56 -44 C 48 -4 44 26 38 48 Z" fill="#ffffff" stroke="#06227b" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M 118 -30 C 94 -4 86 20 76 36" fill="none" stroke="#06227b" strokeWidth="7" strokeLinecap="round" />
          </g>
          <g transform="rotate(-13, 220, 110)">
            <rect x="70" y="45" width="280" height="152" rx="18" ry="18" fill="#ffffff" stroke="#06227b" strokeWidth="14" />
            <rect x="86" y="61" width="248" height="120" rx="10" ry="10" fill="none" stroke="#06227b" strokeWidth="5" strokeDasharray="12 6" />
            <circle cx="210" cy="121" r="44" fill="#06227b" />
            <text x="210" y="142" fontFamily="system-ui, -apple-system, sans-serif" fontSize="62" fontWeight="900" fill="#ffffff" textAnchor="middle">$</text>
            <circle cx="124" cy="121" r="9" fill="#06227b" />
            <circle cx="296" cy="121" r="9" fill="#06227b" />
          </g>
        </g>
      </svg>
    );
  }

  return (
    <img
      src={logoAsset}
      alt="FinanFly Logo"
      className={`block object-contain ${rounded} ${shadow ? 'shadow-md shadow-blue-500/20' : ''} ${className}`}
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.src.includes('favicon.png')) {
          target.src = '/favicon.png';
        } else {
          setImageError(true);
        }
      }}
    />
  );
};
export default FinanFlyLogo;
