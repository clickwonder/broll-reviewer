import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  CaptionPage,
  CaptionToken,
  isTokenActive,
} from '../utils/captions';

export interface CaptionStyle {
  // Text styling
  fontSize?: number;              // Base font size in pixels (default: 32)
  fontFamily?: string;            // Font family (default: Inter)
  textColor?: string;             // Default text color (default: white)
  highlightColor?: string;        // Active word color (default: #39E508 green)

  // Background/karaoke styling
  backgroundColor?: string;       // Background color for active words (default: none)
  backgroundOpacity?: number;     // Background opacity 0-1 (default: 0.8)
  backgroundPadding?: string;     // Padding around background (default: '4px 8px')

  // Outline/stroke
  strokeColor?: string;           // Text outline color (default: black)
  strokeWidth?: number;           // Outline width in pixels (default: 1.5)

  // Shadows
  textShadow?: string;            // Custom text shadow (optional)

  // Animation
  animationDuration?: number;     // Page entrance duration in ms (default: 150)
  highlightScale?: number;        // Scale factor for active words (default: 1.05)
}

interface CaptionOverlayProps {
  pages: CaptionPage[];
  currentTimeMs: number;
  containerHeight?: number;
  style?: CaptionStyle;           // Customizable styling options
}

/**
 * CaptionOverlay - Remotion-inspired TikTok-style captions
 *
 * Features:
 * - Page-based display (words grouped into ~1200ms pages)
 * - Word-by-word highlighting as audio progresses
 * - Spring-like entrance animations on page changes
 * - Performant: uses CSS transitions, no blocking operations
 */
export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({
  pages,
  currentTimeMs,
  containerHeight = 480,
  style: customStyle = {},
}) => {
  const [animationKey, setAnimationKey] = useState(0);
  const lastPageIdRef = useRef<number | null>(null);

  // Merge custom style with defaults
  const styleConfig: Required<CaptionStyle> = {
    fontSize: customStyle.fontSize ?? 24,
    fontFamily: customStyle.fontFamily ?? "'Inter', 'Segoe UI', system-ui, sans-serif",
    textColor: customStyle.textColor ?? '#ffffff',
    highlightColor: customStyle.highlightColor ?? '#39E508',
    backgroundColor: customStyle.backgroundColor ?? 'transparent',
    backgroundOpacity: customStyle.backgroundOpacity ?? 0.8,
    backgroundPadding: customStyle.backgroundPadding ?? '4px 8px',
    strokeColor: customStyle.strokeColor ?? '#000000',
    strokeWidth: customStyle.strokeWidth ?? 1.5,
    textShadow: customStyle.textShadow ?? '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)',
    animationDuration: customStyle.animationDuration ?? 150,
    highlightScale: customStyle.highlightScale ?? 1.05,
  };

  // Find current page based on time
  const currentPage = useMemo(() => {
    for (const page of pages) {
      // Include a small buffer after page ends for smoother transitions
      if (currentTimeMs >= page.startMs && currentTimeMs < page.endMs + 200) {
        return page;
      }
    }
    return null;
  }, [pages, currentTimeMs]);

  // Trigger animation when page changes
  useEffect(() => {
    if (currentPage && currentPage.id !== lastPageIdRef.current) {
      lastPageIdRef.current = currentPage.id;
      setAnimationKey(k => k + 1);
    }
  }, [currentPage]);

  if (!currentPage) {
    return null;
  }

  // Scale font size based on container
  const baseFontSize = Math.round(styleConfig.fontSize * (containerHeight / 480));

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '800px',
        textAlign: 'center',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <div
        key={animationKey}
        style={{
          display: 'inline-block',
          animation: `captionEnter ${styleConfig.animationDuration}ms ease-out`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: `${baseFontSize}px`,
            fontFamily: styleConfig.fontFamily,
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: '0.01em',
            textTransform: 'uppercase',
            color: styleConfig.textColor,
            WebkitTextStroke: `${styleConfig.strokeWidth}px ${styleConfig.strokeColor}`,
            paintOrder: 'stroke fill',
            textShadow: styleConfig.textShadow,
          }}
        >
          <TokenizedText
            tokens={currentPage.tokens}
            currentTimeMs={currentTimeMs}
            styleConfig={styleConfig}
          />
        </p>
      </div>

      {/* CSS Animation keyframes */}
      <style>{`
        @keyframes captionEnter {
          from {
            opacity: 0.5;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

/**
 * TokenizedText - Renders words with individual highlighting
 */
interface TokenizedTextProps {
  tokens: CaptionToken[];
  currentTimeMs: number;
  styleConfig: Required<CaptionStyle>;
}

const TokenizedText: React.FC<TokenizedTextProps> = ({ tokens, currentTimeMs, styleConfig }) => {
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
      {tokens.map((token, idx) => {
        const isActive = isTokenActive(token, currentTimeMs);

        // Convert hex background color to rgba for opacity
        const bgColor = styleConfig.backgroundColor;
        const bgWithOpacity = bgColor !== 'transparent' && isActive
          ? bgColor.startsWith('#')
            ? `${bgColor}${Math.round(styleConfig.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
            : bgColor
          : 'transparent';

        return (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              transition: 'background-color 0.1s ease-out',
              color: styleConfig.textColor,
              backgroundColor: bgWithOpacity,
              padding: styleConfig.backgroundPadding,  // Always same padding
              borderRadius: '4px',  // Always same border radius
              textShadow: styleConfig.textShadow,
              margin: '0 -3px',  // Consistent spacing between words (reduced from 2px)
            }}
          >
            {token.text}
          </span>
        );
      })}
    </span>
  );
};

export default CaptionOverlay;
