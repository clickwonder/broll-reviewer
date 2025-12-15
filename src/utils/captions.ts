/**
 * Caption System - Remotion-inspired TikTok-style captions
 *
 * Key concepts from Remotion template-tiktok:
 * - Group words into "pages" that display for ~1200ms
 * - Word-level highlighting based on timing
 * - Smooth spring-like animations on page transitions
 */

// How long each caption page displays before switching (ms)
export const SWITCH_CAPTIONS_EVERY_MS = 1200;

// Word token with timing information
export interface CaptionToken {
  text: string;
  startMs: number;
  endMs: number;
}

// A page of captions (group of words displayed together)
export interface CaptionPage {
  id: number;
  text: string;           // Full text of the page
  tokens: CaptionToken[]; // Individual words with timing
  startMs: number;        // When this page starts
  endMs: number;          // When this page ends
}

// Raw SRT cue before processing
export interface SRTCue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

/**
 * Parse SRT timestamp to milliseconds
 * Format: HH:MM:SS,mmm or HH:MM:SS.mmm
 */
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.replace(',', '.').split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const [seconds, ms] = parts[2].split('.');

  return (
    hours * 3600000 +
    minutes * 60000 +
    parseInt(seconds, 10) * 1000 +
    parseInt(ms.padEnd(3, '0').slice(0, 3), 10)
  );
}

/**
 * Parse SRT content into cues
 */
export function parseSRT(content: string): SRTCue[] {
  const cues: SRTCue[] = [];
  const blocks = content.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    const timeParts = lines[1].split(' --> ');
    if (timeParts.length !== 2) continue;

    const startMs = parseTimestamp(timeParts[0].trim());
    const endMs = parseTimestamp(timeParts[1].trim());
    const text = lines.slice(2).join(' ').trim();

    cues.push({ index, startMs, endMs, text });
  }

  return cues;
}

/**
 * Convert SRT cues to word-level tokens
 * Distributes timing evenly across words in each cue
 */
function cuesToTokens(cues: SRTCue[]): CaptionToken[] {
  const tokens: CaptionToken[] = [];

  for (const cue of cues) {
    // Split text into words, preserving punctuation
    const words = cue.text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) continue;

    const duration = cue.endMs - cue.startMs;
    const wordDuration = duration / words.length;

    words.forEach((word, i) => {
      tokens.push({
        text: word,
        startMs: cue.startMs + (i * wordDuration),
        endMs: cue.startMs + ((i + 1) * wordDuration),
      });
    });
  }

  return tokens;
}

/**
 * Group tokens into pages (TikTok-style caption grouping)
 * Similar to Remotion's createTikTokStyleCaptions
 */
export function createCaptionPages(
  cues: SRTCue[],
  combineWithinMs: number = SWITCH_CAPTIONS_EVERY_MS
): CaptionPage[] {
  const tokens = cuesToTokens(cues);
  if (tokens.length === 0) return [];

  const pages: CaptionPage[] = [];
  let currentPage: CaptionToken[] = [];
  let pageStartMs = tokens[0].startMs;

  for (const token of tokens) {
    // Check if this token should start a new page
    const timeSincePageStart = token.startMs - pageStartMs;

    if (currentPage.length > 0 && timeSincePageStart >= combineWithinMs) {
      // Save current page
      pages.push({
        id: pages.length,
        text: currentPage.map(t => t.text).join(' '),
        tokens: currentPage,
        startMs: pageStartMs,
        endMs: currentPage[currentPage.length - 1].endMs,
      });

      // Start new page
      currentPage = [token];
      pageStartMs = token.startMs;
    } else {
      currentPage.push(token);
    }
  }

  // Don't forget the last page
  if (currentPage.length > 0) {
    pages.push({
      id: pages.length,
      text: currentPage.map(t => t.text).join(' '),
      tokens: currentPage,
      startMs: pageStartMs,
      endMs: currentPage[currentPage.length - 1].endMs,
    });
  }

  return pages;
}

/**
 * Get the current caption page for a given time
 */
export function getCurrentPage(pages: CaptionPage[], timeMs: number): CaptionPage | null {
  // Find the page that contains this time
  for (const page of pages) {
    if (timeMs >= page.startMs && timeMs < page.endMs + 200) { // 200ms grace period
      return page;
    }
  }
  return null;
}

/**
 * Check if a token should be highlighted at the current time
 * For karaoke style: only highlight if time is WITHIN the token's duration
 */
export function isTokenActive(token: CaptionToken, timeMs: number): boolean {
  return timeMs >= token.startMs && timeMs < token.endMs;
}

/**
 * Calculate highlight progress for a token (0 = not started, 1 = complete)
 */
export function getTokenProgress(token: CaptionToken, timeMs: number): number {
  if (timeMs < token.startMs) return 0;
  if (timeMs >= token.endMs) return 1;
  return (timeMs - token.startMs) / (token.endMs - token.startMs);
}

/**
 * Generate sample captions for demo/testing
 */
export function generateSampleCaptions(): SRTCue[] {
  return [
    { index: 1, startMs: 0, endMs: 2000, text: "Medical debt on your credit report?" },
    { index: 2, startMs: 2000, endMs: 4000, text: "Here's what you need to know" },
    { index: 3, startMs: 4000, endMs: 6500, text: "about removing it legally" },
    { index: 4, startMs: 6500, endMs: 9000, text: "and protecting your credit score" },
    { index: 5, startMs: 9000, endMs: 11500, text: "The process is simpler than you think" },
    { index: 6, startMs: 11500, endMs: 14000, text: "Let's break it down step by step" },
  ];
}
