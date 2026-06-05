import React, { useState, useEffect } from 'react';
import { Color, PieceType } from '../model/Piece';

interface PieceSVGProps {
  type: PieceType;
  color: Color;
  className?: string;
}

export const PieceSVG: React.FC<PieceSVGProps> = ({ type, color, className = 'w-full h-full' }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [type, color]);

  if (!imgError) {
    const imgSrc = `/images/pieces/${color}-${type}.png`;
    return (
      <img
        src={imgSrc}
        alt={`${color} ${type}`}
        className={className}
        onError={() => setImgError(true)}
      />
    );
  }

  const isWhite = color === Color.WHITE;
  
  // Custom Chess.com "Neo" inspired palette:
  // Both colors utilize a thick, solid dark-charcoal outline for that crisp, premium vector look.
  // White pieces are filled with pure white. Black pieces are styled with Chess.com's Neo neutral charcoal grey/black.
  const fill = isWhite ? '#FFFFFF' : '#454545';
  const stroke = '#2C2A29'; // Solid, elegant dark charcoal stroke for crisp outlines
  const strokeWidth = 2.2;  // Beautiful thick outline
  const detailColor = isWhite ? '#2C2A29' : '#BABABA'; // Crisp dark details for white, soft-silver highlights for black

  switch (type) {
    case PieceType.PAWN:
      return (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
            {/* Pedestal block base */}
            <path d="M 10.5,34 C 10.5,31.5 12,31.5 22.5,31.5 C 33,31.5 34.5,31.5 34.5,34 L 34.5,38.5 L 10.5,38.5 Z" />
            {/* Body trunk flaring outwards */}
            <path d="M 18.5,23.5 C 19,27 16,30.5 11.5,32.5 L 33.5,32.5 C 29,30.5 26,27 26.5,23.5 Z" />
            {/* Collar plate */}
            <path d="M 16,19 L 29,19 L 31.5,23.5 L 13.5,23.5 Z" />
            {/* Bulb head */}
            <circle cx="22.5" cy="12.5" r="7" />
            {/* Crescent shine overlay on bulb */}
            {isWhite && (
              <path d="M 18,10.2 C 19.3,8.7 21.7,8.2 23.2,8.8 C 21,8.5 19.2,10 18.8,11.8 C 18.4,13.5 19.2,15 20.3,15.8 C 18.8,14.6 17.5,12.5 18,10.2 Z" fill="#FFFFFF" opacity={0.8} stroke="none" />
            )}
            {!isWhite && (
              <path d="M 18,10.2 C 19.3,8.7 21.7,8.2 23.2,8.8 C 21,8.5 19.2,10 18.8,11.8 C 18.4,13.5 19.2,15 20.3,15.8 C 18.8,14.6 17.5,12.5 18,10.2 Z" fill="#BABABA" opacity={0.4} stroke="none" />
            )}
          </g>
        </svg>
      );

    case PieceType.KNIGHT:
      return (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            {/* Rounded pedestal base matching reference */}
            <path d="M 13.5 38.5 C 13.5 35.5, 14 34.5, 22.5 34.5 C 31 34.5, 31.5 35.5, 31.5 38.5 L 31.5 41 L 13.5 41 Z" />
            {/* Horizontal dividing stripe above base */}
            <path d="M 15 34.5 C 20 34, 25 34, 30 34.5" fill="none" stroke={stroke} strokeWidth={strokeWidth + 0.2} />
            {/* Elegantly sculpted left-facing Neo horse body */}
            <path d="M 30 34.5 
                     C 30.2 27, 27.5 18, 24 11 
                     C 23 11, 21 9, 19 7.5 
                     C 19 7.5, 19.5 10.5, 19.5 10.5 
                     C 17.5 12, 14.5 16, 12 20.5 
                     C 10.5 23, 12 24.5, 14 24.2 
                     C 17.5 23.5, 18.2 21, 19.5 18.5 
                     C 19 20.5, 16.5 24.5, 16.2 34.5" />
            {/* The distinctive drop-like tilted Eye of the Knight */}
            <path d="M 21.5,16.2 C 20.6,16.2 19.8,17 19.5,18 C 19.2,19 19.8,19.8 20.5,19.8 C 21.2,19.8 22,18.6 22,17.6 C 22,16.6 22.2,16.2 21.5,16.2 Z" fill={detailColor} stroke="none" />
          </g>
        </svg>
      );

    case PieceType.BISHOP:
      return (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            {/* Elegant rounded pedestal base matching reference */}
            <path d="M 10,34.5 C 10,31.5 13,31.5 22.5,31.5 C 32,31.5 35,31.5 35,34.5 L 35,38.5 C 35,40.5 33,41 22.5,41 C 12,41 10,40.5 10,38.5 Z" />
            {/* Horizontal dividing stripe above base */}
            <path d="M 12.5,32.8 C 16.5,33.5 28.5,33.5 32.5,32.8" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
            {/* Sleek Onion Dome with the deep right-side mitre slit */}
            <path d="M 14.5,31.2 C 10.5,27.2 10.5,19 17.5,13.5 C 18.5,11 19,8 20.5,6 C 22,4 23.5,4 24.5,6 C 25.5,8 25,10.5 22.5,12 C 21.5,14 21,18 21,24.5 L 24,24.5 L 24,16.5 L 28,13 C 32,17 33.5,24.5 29.5,31.2 C 24.5,31.2 19.5,31.2 14.5,31.2 Z" />
            {/* Subtle light highlighting detail on left dome boundary */}
            {isWhite && (
              <path d="M 15.5,29 C 12,25.5 12,19.5 18,15" fill="none" stroke="#FFFFFF" strokeWidth={1} opacity={0.6} />
            )}
            {!isWhite && (
              <path d="M 15.5,29 C 12,25.5 12,19.5 18,15" fill="none" stroke="#FFFFFF" strokeWidth={1} opacity={0.3} />
            )}
          </g>
        </svg>
      );

    case PieceType.ROOK:
      return (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
            {/* Sturdy pedestal base */}
            <path d="M 9.5,34.2 C 9.5,31.8 11,31.8 22.5,31.8 C 34,31.8 35.5,31.8 35.5,34.2 L 35.5,40.5 L 9.5,40.5 Z" />
            {/* Tower main trunk */}
            <path d="M 13.5,16.5 L 31.5,16.5 L 29.5,32.2 L 15.5,32.2 Z" />
            {/* Castle battlements (3 crenellations visible with shadows) */}
            <path d="M 10.5,8.5 L 15.5,8.5 L 15.5,12.2 L 20.5,12.2 L 20.5,8.5 L 24.5,8.5 L 24.5,12.2 L 29.5,12.2 L 29.5,8.5 L 34.5,8.5 L 34.5,16.5 L 10.5,16.5 Z" />
            {/* Subtle center support line shadow */}
            <line x1="22.5" y1="16.5" x2="22.5" y2="31.8" stroke={detailColor} strokeWidth={1.5} opacity={0.3} strokeDasharray="3 2" />
          </g>
        </svg>
      );

    case PieceType.QUEEN:
      return (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            {/* Dynamic bottom pedestal base */}
            <path d="M 11,35.5 C 11,33.5 12,33.5 22.5,33.5 C 33,33.5 34,33.5 34,35.5 L 34,41.2 L 11,41.2 Z" />
            {/* Elegant horizontal stripe layout cushion bands */}
            <path d="M 11,28 C 15,26.5 19,26.5 22.5,26.5 C 26,26.5 30,26.5 34,28 C 34,28 34,31 22.5,31 C 11,31 11,28 11,28 Z" />
            <path d="M 12.5,31.2 C 16.5,32.8 20.5,32.8 22.5,32.8 C 24.5,32.8 28.5,32.8 32.5,31.2" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
            {/* Crown jagged spikes structure */}
            <path d="M 7.5,16.5 L 11.5,28.5 L 14.5,10.5 L 18,28.5 L 22.5,8.5 L 27,28.5 L 30.5,10.5 L 33.5,28.5 L 37.5,16.5 Z" />
            {/* 5 brilliant crown beads */}
            <circle cx="7" cy="15.5" r="1.8" fill={fill} stroke={stroke} strokeWidth={1.8} />
            <circle cx="14" cy="9.5" r="1.8" fill={fill} stroke={stroke} strokeWidth={1.8} />
            <circle cx="22.5" cy="7.5" r="1.8" fill={fill} stroke={stroke} strokeWidth={1.8} />
            <circle cx="31" cy="9.5" r="1.8" fill={fill} stroke={stroke} strokeWidth={1.8} />
            <circle cx="38" cy="15.5" r="1.8" fill={fill} stroke={stroke} strokeWidth={1.8} />
          </g>
        </svg>
      );

    case PieceType.KING:
      return (
        <svg viewBox="0 0 45 45" className={className} xmlns="http://www.w3.org/2000/svg">
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            {/* Rigid base plate block */}
            <path d="M 8.5,38.5 L 36.5,38.5 L 36.5,41 L 8.5,41 Z" />
            <path d="M 10,34 L 35,34 L 33,38.5 L 12,38.5 Z" />
            {/* Elegant wing-tip lobes styling (left and right) */}
            <path d="M 22.5,34 C 20,26 4,21 4,29.5 C 4,33 9.5,33 13,34" />
            <path d="M 22.5,34 C 25,26 41,21 41,29.5 C 41,33 35.5,33 32,34" />
            {/* Majestic vertical pointed central teardrop dome */}
            <path d="M 22.5,13 C 19.5,17 17,22.5 17,34 L 28,34 C 28,22.5 25.5,17 22.5,13 Z" />
            {/* Holy crowning cross on top with a solid thick outline */}
            <path d="M 22.5,5.5 L 22.5,13" stroke={detailColor} strokeWidth={2.8} strokeLinecap="square" />
            <path d="M 19,8.2 L 26,8.2" stroke={detailColor} strokeWidth={2.8} strokeLinecap="square" />
          </g>
        </svg>
      );

    default:
      return null;
  }
};
