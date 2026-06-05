import React from 'react';
import { MoveAnalysisClass } from '../utils/analysis';

interface AnalysisIconProps {
  category: MoveAnalysisClass;
  size?: number;
  className?: string;
}

export const AnalysisIcon: React.FC<AnalysisIconProps> = ({ category, size = 20, className = '' }) => {
  // Generate unique IDs for SVG gradients to prevent collisions if multiple SVGs render on the same page
  const gradId = React.useId().replace(/:/g, '');

  switch (category) {
    case 'brilliant': // Cyan !!
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block select-none ${className}`}>
          <defs>
            <linearGradient id={`grad-brilliant-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1BE7D4" />
              <stop offset="100%" stopColor="#0D9FA5" />
            </linearGradient>
            <filter id={`shadow-brilliant-${gradId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.4" />
            </filter>
          </defs>
          {/* Subtle outer dark border/glow */}
          <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="4" />
          {/* Primary glossy 3D ball */}
          <circle cx="50" cy="50" r="45" fill={`url(#grad-brilliant-${gradId})`} />
          {/* Top gloss bubble overlay */}
          <ellipse cx="50" cy="26" rx="30" ry="12" fill="#FFF" fillOpacity="0.25" />
          {/* Bold text */}
          <text
            x="50"
            y="56"
            dominantBaseline="central"
            textAnchor="middle"
            fill="#FFF"
            fontFamily="Impact, -apple-system, sans-serif"
            fontWeight="bold"
            fontSize="44"
            letterSpacing="-2"
            filter={`url(#shadow-brilliant-${gradId})`}
          >
            !!
          </text>
        </svg>
      );

    case 'great': // Royal Blue !
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block select-none ${className}`}>
          <defs>
            <linearGradient id={`grad-great-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4395F7" />
              <stop offset="100%" stopColor="#2159B5" />
            </linearGradient>
            <filter id={`shadow-great-${gradId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.4" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="4" />
          <circle cx="50" cy="50" r="45" fill={`url(#grad-great-${gradId})`} />
          <ellipse cx="50" cy="26" rx="30" ry="12" fill="#FFF" fillOpacity="0.25" />
          <text
            x="51"
            y="54"
            dominantBaseline="central"
            textAnchor="middle"
            fill="#FFF"
            fontFamily="Impact, -apple-system, sans-serif"
            fontWeight="bold"
            fontSize="52"
            filter={`url(#shadow-great-${gradId})`}
          >
            !
          </text>
        </svg>
      );

    case 'best': // Green Star
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block select-none ${className}`}>
          <defs>
            <linearGradient id={`grad-best-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#43B962" />
              <stop offset="100%" stopColor="#1E7A35" />
            </linearGradient>
            <filter id={`shadow-best-${gradId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="2" floodOpacity="0.4" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="4" />
          <circle cx="50" cy="50" r="45" fill={`url(#grad-best-${gradId})`} />
          <ellipse cx="50" cy="26" rx="30" ry="12" fill="#FFF" fillOpacity="0.25" />
          {/* Solid 5-pointed star */}
          <g transform="translate(30, 30) scale(1.667)" filter={`url(#shadow-best-${gradId})`}>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="#FFF"
            />
          </g>
        </svg>
      );

    case 'excellent': // Light Green Thumbs Up
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block select-none ${className}`}>
          <defs>
            <linearGradient id={`grad-excellent-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9CCC3D" />
              <stop offset="100%" stopColor="#67911F" />
            </linearGradient>
            <filter id={`shadow-excellent-${gradId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="2" floodOpacity="0.4" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="4" />
          <circle cx="50" cy="50" r="45" fill={`url(#grad-excellent-${gradId})`} />
          <ellipse cx="50" cy="26" rx="30" ry="12" fill="#FFF" fillOpacity="0.25" />
          {/* Thumbs up paths scaled & translated from Lucide standard: */}
          <g transform="translate(29, 29) scale(1.75)" filter={`url(#shadow-excellent-${gradId})`}>
            <path
              d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3 M14 22v-4a4 4 0 0 0-4-4H7V4h3a2 2 0 0 1 2 2v4h4a3 3 0 0 1 3 3L17 22z"
              fill="#FFF"
              stroke="#FFF"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      );

    case 'good': // Chess.com Olive/Grey-Green Checkmark
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block select-none ${className}`}>
          <defs>
            <linearGradient id={`grad-good-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#759B62" />
              <stop offset="100%" stopColor="#4A653F" />
            </linearGradient>
            <filter id={`shadow-good-${gradId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="2" floodOpacity="0.4" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="4" />
          <circle cx="50" cy="50" r="45" fill={`url(#grad-good-${gradId})`} />
          <ellipse cx="50" cy="26" rx="30" ry="12" fill="#FFF" fillOpacity="0.25" />
          <g transform="translate(28, 28) scale(1.833)" filter={`url(#shadow-good-${gradId})`}>
            <path
              d="M20 6L9 17l-5-5"
              stroke="#FFF"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        </svg>
      );

    case 'book': // Brown Open Book
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block select-none ${className}`}>
          <defs>
            <linearGradient id={`grad-book-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BD8E62" />
              <stop offset="100%" stopColor="#805C3B" />
            </linearGradient>
            <filter id={`shadow-book-${gradId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="2" floodOpacity="0.4" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="4" />
          <circle cx="50" cy="50" r="45" fill={`url(#grad-book-${gradId})`} />
          <ellipse cx="50" cy="26" rx="30" ry="12" fill="#FFF" fillOpacity="0.25" />
          <g transform="translate(26, 28) scale(2.0)" filter={`url(#shadow-book-${gradId})`}>
            <path
              d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
              fill="#FFF"
              stroke="#FFF"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      );

    case 'inaccuracy': // Orange-Yellow ?!
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block select-none ${className}`}>
          <defs>
            <linearGradient id={`grad-inaccuracy-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5BD25" />
              <stop offset="100%" stopColor="#D59508" />
            </linearGradient>
            <filter id={`shadow-inaccuracy-${gradId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.4" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="4" />
          <circle cx="50" cy="50" r="45" fill={`url(#grad-inaccuracy-${gradId})`} />
          <ellipse cx="50" cy="26" rx="30" ry="12" fill="#FFF" fillOpacity="0.25" />
          <text
            x="50"
            y="54"
            dominantBaseline="central"
            textAnchor="middle"
            fill="#FFF"
            fontFamily="Impact, -apple-system, sans-serif"
            fontWeight="bold"
            fontSize="43"
            filter={`url(#shadow-inaccuracy-${gradId})`}
          >
            ?!
          </text>
        </svg>
      );

    case 'mistake': // Orange ?
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block select-none ${className}`}>
          <defs>
            <linearGradient id={`grad-mistake-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F39C24" />
              <stop offset="100%" stopColor="#CF710A" />
            </linearGradient>
            <filter id={`shadow-mistake-${gradId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.4" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="4" />
          <circle cx="50" cy="50" r="45" fill={`url(#grad-mistake-${gradId})`} />
          <ellipse cx="50" cy="26" rx="30" ry="12" fill="#FFF" fillOpacity="0.25" />
          <text
            x="51"
            y="53"
            dominantBaseline="central"
            textAnchor="middle"
            fill="#FFF"
            fontFamily="Impact, -apple-system, sans-serif"
            fontWeight="bold"
            fontSize="52"
            filter={`url(#shadow-mistake-${gradId})`}
          >
            ?
          </text>
        </svg>
      );

    case 'blunder': // Red ??
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block select-none ${className}`}>
          <defs>
            <linearGradient id={`grad-blunder-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D93D2C" />
              <stop offset="100%" stopColor="#B22114" />
            </linearGradient>
            <filter id={`shadow-blunder-${gradId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.4" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="4" />
          <circle cx="50" cy="50" r="45" fill={`url(#grad-blunder-${gradId})`} />
          <ellipse cx="50" cy="26" rx="30" ry="12" fill="#FFF" fillOpacity="0.25" />
          <text
            x="50"
            y="55"
            dominantBaseline="central"
            textAnchor="middle"
            fill="#FFF"
            fontFamily="Impact, -apple-system, sans-serif"
            fontWeight="bold"
            fontSize="45"
            letterSpacing="-2"
            filter={`url(#shadow-blunder-${gradId})`}
          >
            ??
          </text>
        </svg>
      );

    case 'miss': // Coral-Salmon background with white 'X'
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block select-none ${className}`}>
          <defs>
            <linearGradient id={`grad-miss-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF6B6B" />
              <stop offset="100%" stopColor="#C92A2A" />
            </linearGradient>
            <filter id={`shadow-miss-${gradId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.4" />
            </filter>
          </defs>
          <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="4" />
          <circle cx="50" cy="50" r="45" fill={`url(#grad-miss-${gradId})`} />
          <ellipse cx="50" cy="26" rx="30" ry="12" fill="#FFF" fillOpacity="0.25" />
          <g transform="translate(32, 32) scale(1.5)" filter={`url(#shadow-miss-${gradId})`}>
            <path
              d="M4 4L20 20M20 4L4 20"
              stroke="#FFF"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      );

    default:
      return null;
  }
};
