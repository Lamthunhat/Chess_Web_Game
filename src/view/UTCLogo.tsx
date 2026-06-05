import React from 'react';

interface UTCLogoProps {
  className?: string;
  size?: number;
}

export const UTCLogo: React.FC<UTCLogoProps> = ({ className = '', size = 64 }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`} style={{ width: size, height: size }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Golden Border Circle */}
        <circle cx="256" cy="256" r="236" fill="#F1C40F" />
        
        {/* Pale Golden Ring for text padding */}
        <circle cx="256" cy="256" r="218" fill="#FFFDE7" />
        
        {/* Inner Dark Blue Circle */}
        <circle cx="256" cy="256" r="185" fill="#1B1464" />
        
        {/* Inner Golden Ring */}
        <circle cx="256" cy="256" r="134" stroke="#F1C40F" strokeWidth="12" />

        {/* Central emblem shapes */}
        {/* Yellow central book backing */}
        <path
          d="M 130,325 C 130,325 150,355 256,355 C 362,355 382,325 382,325 Z"
          fill="#F1C40F"
        />

        {/* Dynamic yellow road / ribbon 'S'-ish curve representing transport network */}
        <path
          d="M 183,143 
             C 219,139, 310,135, 335,178 
             C 353,209, 350,243, 290,270 
             L 218,300
             C 256,290, 290,290, 290,290
             L 160,250 
             C 178,210, 227,178, 255,175
             C 280,172, 282,190, 240,210
             C 190,234, 150,243, 150,275
             C 150,305, 195,325, 230,325 
             C 282,325, 323,286, 351,250
             C 362,236, 381,254, 358,274
             C 300,328, 220,345, 160,320 
             C 134,309, 131,273, 158,242
             C 183,214, 218,206, 218,175
             C 218,154, 192,152, 183,143 Z"
          fill="#F1C40F"
        />

        {/* Yellow highway book at the bottom center of logo */}
        <path
          d="M 170,328 C 200,328, 235,338, 256,346 C 277,338, 312,328, 342,328 C 362,328, 375,334, 375,334 L 364,352 C 324,345, 280,356, 256,362 C 232,356, 188,345, 148,352 L 137,334 C 137,334, 150,328, 170,328 Z"
          fill="#F1C40F"
        />

        {/* Road lane stripes */}
        <path
          d="M 220,305 C 235,296, 255,286, 275,274"
          stroke="#1B1464"
          strokeWidth="5"
          strokeDasharray="16,8"
        />

        {/* Path elements containing textual instructions */}
        <path id="textPathTop" d="M 60,256 A 196,196 0 0,1 452,256" fill="none" />
        <path id="textPathBottom" d="M 452,256 A 196,196 0 0,1 60,256" fill="none" />

        {/* Top Text Content definition */}
        <text fontFamily="Inter, sans-serif" fontSize="23.5" fontWeight="900" fill="#1B1464">
          <textPath href="#textPathTop" startOffset="50%" textAnchor="middle">
            TRƯỜNG ĐẠI HỌC GIAO THÔNG VẬN TẢI
          </textPath>
        </text>

        {/* Bottom Text Content definition */}
        <text fontFamily="Inter, sans-serif" fontSize="14.8" fontWeight="bold" fill="#1B1464">
          <textPath href="#textPathBottom" startOffset="50%" textAnchor="middle">
            UNIVERSITY OF TRANSPORT AND COMMUNICATIONS
          </textPath>
        </text>
      </svg>
    </div>
  );
};
