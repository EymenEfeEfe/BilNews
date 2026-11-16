import React from 'react';

const SaturnLogo = ({
  className = 'w-10 h-10',
  color = 'currentColor',
}: {
  className?: string;
  color?: string;
}) => {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(100, 100) rotate(180)">
        <ellipse
          cx="0"
          cy="0"
          rx="90"
          ry="30"
          stroke={color}
          strokeWidth="12"
          transform="rotate(-15)"
        />
        <circle
          cx="0"
          cy="0"
          r="45"
          fill="var(--background)"
          stroke={color}
          strokeWidth="12"
        />
        <path
          d="M -86.9 0 A 90 30 -15 0 1 86.9 0"
          stroke={color}
          strokeWidth="12"
          fill="none"
          transform="rotate(-15)"
          clipPath="url(#planet-outline)"
        />
        <clipPath id="planet-outline">
          <rect x="-100" y="-100" width="200" height="100" />
        </clipPath>
      </g>
    </svg>
  );
};

export default SaturnLogo;
