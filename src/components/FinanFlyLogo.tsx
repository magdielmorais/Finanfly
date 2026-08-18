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
  rounded = 'rounded-xl',
  shadow = true
}) => {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <svg
        viewBox="0 0 512 512"
        className={`${rounded} ${shadow ? 'shadow-md shadow-blue-500/20' : ''} ${className}`}
        style={{ width: size, height: size }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="finanflyBlueGradFallback" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0055ff" />
            <stop offset="100%" stopColor="#0026b3" />
          </linearGradient>
        </defs>
        <rect x="16" y="16" width="480" height="480" rx="108" ry="108" fill="url(#finanflyBlueGradFallback)" />
        {/* Speed lines */}
        <rect x="70" y="215" width="110" height="18" rx="9" fill="#4d88ff" opacity="0.8" />
        <rect x="40" y="255" width="140" height="18" rx="9" fill="#3377ff" opacity="0.65" />
        <rect x="70" y="295" width="100" height="18" rx="9" fill="#4d88ff" opacity="0.8" />
        {/* Letter F */}
        <path d="M 215 105 L 395 105 L 380 170 L 290 170 L 275 230 L 360 230 L 345 290 L 260 290 L 225 415 L 145 415 Z" fill="#ffffff" />
        {/* Flying Dollar with wings */}
        <g transform="translate(180, 280) rotate(-12)">
          {/* Wings */}
          <path d="M 0 35 C -35 20 -55 -5 -35 -20 C -25 -10 -20 10 -5 15 C -25 -5 -10 -25 5 -15 C 10 5 10 20 15 30 Z" fill="#ffffff" stroke="#0033cc" strokeWidth="4" />
          <path d="M 140 30 C 175 15 195 -10 175 -25 C 165 -15 160 5 145 10 C 165 -10 150 -30 135 -20 C 130 0 130 15 125 25 Z" fill="#ffffff" stroke="#0033cc" strokeWidth="4" />
          <rect x="0" y="0" width="140" height="75" rx="8" ry="8" fill="#ffffff" stroke="#0033cc" strokeWidth="7" />
          <circle cx="70" cy="37.5" r="20" fill="#0033cc" />
          <text x="70" y="47" fontFamily="system-ui, sans-serif" fontSize="28" fontWeight="900" fill="#ffffff" textAnchor="middle">$</text>
        </g>
      </svg>
    );
  }

  return (
    <img
      src={logoAsset}
      alt="FinanFly Logo"
      className={`${rounded} object-contain ${shadow ? 'shadow-md shadow-blue-500/20' : ''} ${className}`}
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
      onError={(e) => {
        // Fallback to /favicon.png, then to SVG
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
