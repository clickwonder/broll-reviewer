import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BRollAsset, SceneCutaway, CutawayConfig, StockSource } from '../types';
import { StockBrowser } from './StockBrowser';
import { generateBRoll, ImageModel, VideoModel, GenerationProgress } from '../services/kieService';
import { downloadAndSaveStockVideo, StockVideoInfo, DownloadProgress } from '../services/stockStorageService';
// Note: Removed hardcoded SCENE_SEEK_TIMES - now using dynamic getCurrentSceneFromScenes()
import { CaptionOverlay } from './CaptionOverlay';
import { CaptionPage, createCaptionPages } from '../utils/captions';
import { getCaptionsForScene, defaultCaptionStyle } from '../config/captions.config';

// Fast video server running on native Linux filesystem (1000x faster than WSL2/Vite)
// Server: python3 -m http.server 8888 from ~/broll-videos/
// Using WSL2 IP (172.20.67.11) so Windows browser can access it
const FAST_VIDEO_SERVER = 'http://172.20.67.11:8888';

// Video URL helper - routes videos through fast native Linux server
const getVideoUrl = (path: string): string => {
  if (!path) return path;
  // Already a full URL - return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Route video files through fast server
  if (path.startsWith('/scenes/') || path.startsWith('/broll/')) {
    return `${FAST_VIDEO_SERVER}${path}`;
  }
  return path;
};

interface CutawayUpdate {
  startTime?: number;
  duration?: number;
}

interface VerticalTimelineProps {
  scenes: SceneCutaway[];
  assets: BRollAsset[];
  videoSource?: string; // Base video source, defaults to '/scenes/full_video.mp4'
  onApprove: (assetId: string) => void;
  onReject: (assetId: string) => void;
  onRegenerate: (assetId: string) => void;
  onUpdateCutaway?: (sceneId: string, cutawayIndex: number, updates: CutawayUpdate) => void;
  onInsertCutaway?: (sceneId: string, cutaway: CutawayConfig) => void;
  onDeleteCutaway?: (sceneId: string, cutawayIndex: number) => void;
}

export const VerticalTimeline: React.FC<VerticalTimelineProps> = ({
  scenes,
  assets,
  videoSource = '/scenes/full_video.mp4',
  onApprove,
  onReject,
  onRegenerate,
  onUpdateCutaway,
  onInsertCutaway,
  onDeleteCutaway
}) => {
  // State to trigger insert modal from main timeline
  const [triggerInsertModal, setTriggerInsertModal] = useState<{ sceneId: string; time: number } | null>(null);

  const getAssetFromPath = (path: string): BRollAsset | undefined => {
    // First try exact match by path or videoUrl
    let asset = assets.find(a => a.path === path || a.videoUrl === path);

    // If no exact match, try matching by filename extracted from path
    if (!asset && path) {
      const filename = path.split('/').pop(); // Get filename from path like "/broll/credit_report.mp4"
      if (filename) {
        asset = assets.find(a =>
          a.filename === filename ||
          a.path?.endsWith(`/${filename}`) ||
          a.videoUrl?.endsWith(`/${filename}`)
        );
        if (asset) {
          console.log(`[VerticalTimeline] ✓ Matched asset by filename: "${filename}" -> ${asset.path}`);
        }
      }
    }

    if (!asset) {
      console.log(`[VerticalTimeline] ⚠️ No asset found for path: "${path}"`);
      console.log(`[VerticalTimeline] Available assets:`, assets.map(a => ({ path: a.path, filename: a.filename })));
    }

    return asset;
  };

  // Calculate cumulative timeline
  // Use scene.duration from audio files as source of truth
  let cumulativeTime = 0;
  const scenesWithTime = (scenes || []).map(scene => {
    // Use scene.duration from audio files, fallback to cutaway calculation if not available
    const sceneDuration = scene.duration || Math.max(
      ...((scene.cutaways || []).length > 0 ? scene.cutaways.map(c => c.startTime + c.duration) : [0]),
      15 // minimum scene duration fallback
    );
    const sceneStart = cumulativeTime;
    cumulativeTime += sceneDuration;
    return { ...scene, sceneStart, sceneDuration };
  });

  // Debug: Log scenes and cutaways on mount
  React.useEffect(() => {
    console.log(`[VerticalTimeline] Loaded ${scenes.length} scenes`);
    scenes.forEach((scene, idx) => {
      if (scene.cutaways && scene.cutaways.length > 0) {
        console.log(`[VerticalTimeline] ${scene.sceneId}: ${scene.cutaways.length} cutaways`, scene.cutaways.map(c => c.video));
      }
    });
  }, [scenes]);

  const totalDuration = cumulativeTime;

  return (
    <div>
      {/* Full Video Preview Section */}
      <FullVideoPreview
        scenes={scenesWithTime}
        totalDuration={totalDuration}
        getAssetFromPath={getAssetFromPath}
        assets={assets}
        videoSource={videoSource}
        onUpdateCutaway={onUpdateCutaway}
        onTimelineClick={(sceneId, time) => setTriggerInsertModal({ sceneId, time })}
      />

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#f1f5f9',
          margin: 0
        }}>
          Scene-by-Scene B-Roll Review
        </h2>
        <div style={{
          display: 'flex',
          gap: '16px',
          fontSize: '13px',
          color: '#94a3b8'
        }}>
          <span>Total Duration: <strong style={{ color: '#f1f5f9' }}>{totalDuration.toFixed(1)}s</strong></span>
          <span>Scenes: <strong style={{ color: '#f1f5f9' }}>{scenes.length}</strong></span>
          <span>B-Rolls: <strong style={{ color: '#f1f5f9' }}>{assets.length}</strong></span>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '24px',
        marginBottom: '24px',
        padding: '12px 16px',
        background: '#1e293b',
        borderRadius: '8px'
      }}>
        <LegendItem color="#3b82f6" label="Scene Background" />
        <LegendItem color="#22c55e" label="B-Roll (Approved)" />
        <LegendItem color="#f59e0b" label="B-Roll (Pending)" />
        <LegendItem color="#ef4444" label="B-Roll (Rejected)" />
        <LegendItem color="#8b5cf6" label="B-Roll (Regenerating)" />
      </div>

      {/* Vertical Timeline */}
      <div style={{
        position: 'relative',
        paddingLeft: '80px'
      }}>
        {/* Time markers */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '60px',
          borderRight: '2px solid #334155'
        }}>
          {Array.from({ length: Math.ceil(totalDuration / 10) + 1 }, (_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: `${(i * 10 / totalDuration) * 100}%`,
                right: '8px',
                fontSize: '11px',
                color: '#64748b',
                fontFamily: 'monospace'
              }}
            >
              {i * 10}s
            </div>
          ))}
        </div>

        {/* Scenes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {scenesWithTime.map((scene, sceneIndex) => (
            <SceneBlock
              key={scene.sceneId || `scene-${sceneIndex}`}
              scene={scene}
              sceneIndex={sceneIndex}
              assets={assets}
              totalDuration={totalDuration}
              getAssetFromPath={getAssetFromPath}
              onApprove={onApprove}
              onReject={onReject}
              onRegenerate={onRegenerate}
              onUpdateCutaway={onUpdateCutaway}
              onInsertCutaway={onInsertCutaway}
              onDeleteCutaway={onDeleteCutaway}
              triggerInsertModal={triggerInsertModal}
              onClearTrigger={() => setTriggerInsertModal(null)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div style={{
      width: '16px',
      height: '16px',
      borderRadius: '4px',
      background: `${color}40`,
      border: `2px solid ${color}`
    }} />
    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{label}</span>
  </div>
);

// Full Video Preview Component - Shows complete video with B-roll cutaway overlay
interface FullVideoPreviewProps {
  scenes: (SceneCutaway & { sceneStart: number; sceneDuration: number })[];
  totalDuration: number;
  getAssetFromPath: (path: string) => BRollAsset | undefined;
  assets: BRollAsset[]; // Added to trigger re-renders on asset changes
  videoSource: string; // Base video source path
  onUpdateCutaway?: (sceneId: string, cutawayIndex: number, updates: CutawayUpdate) => void;
  onTimelineClick?: (sceneId: string, time: number) => void; // Trigger insert modal for a scene
}

// Drag operation types for full timeline
type FullTimelineDragOperation = 'move' | 'resize-left' | 'resize-right' | null;

interface FullTimelineDragState {
  sceneId: string;
  cutawayIndex: number;
  operation: FullTimelineDragOperation;
  startX: number;
  originalAbsoluteStart: number;
  originalDuration: number;
}

const FullVideoPreview: React.FC<FullVideoPreviewProps> = ({
  scenes,
  totalDuration,
  getAssetFromPath,
  assets,
  videoSource,
  onUpdateCutaway,
  onTimelineClick
}) => {
  // Single video ref for combined preview video
  const videoRef = useRef<HTMLVideoElement>(null);
  const cutawayVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showWithCutaways, setShowWithCutaways] = useState(true);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [activeCutaway, setActiveCutaway] = useState<string | null>(null);
  const [activeCutawayAsset, setActiveCutawayAsset] = useState<BRollAsset | null>(null);

  // Helper: Find current scene from dynamic scenes array (not hardcoded SCENE_SEEK_TIMES)
  const getCurrentSceneFromScenes = useCallback((time: number) => {
    let cumulativeStart = 0;
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const duration = scene.duration || 15; // fallback duration
      if (time >= cumulativeStart && time < cumulativeStart + duration) {
        return {
          sceneIndex: i + 1,
          startTime: cumulativeStart,
          duration,
          scene
        };
      }
      cumulativeStart += duration;
    }
    return null;
  }, [scenes]);
  const [previewHeight, setPreviewHeight] = useState(480); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [captionPages, setCaptionPages] = useState<CaptionPage[]>([]);
  const [showCaptions, setShowCaptions] = useState(true);

  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(0); // Track previous time to detect unexpected jumps

  // Scrubbing state for timeline seek
  const [isScrubbing, setIsScrubbing] = useState(false);
  const sceneMarkersRef = useRef<HTMLDivElement>(null);

  // Full timeline drag state
  const cutawayTimelineRef = useRef<HTMLDivElement>(null);
  const [fullTimelineDragState, setFullTimelineDragState] = useState<FullTimelineDragState | null>(null);
  const [fullTimelinePreviewUpdate, setFullTimelinePreviewUpdate] = useState<{
    sceneId: string;
    cutawayIndex: number;
    startTime: number;
    duration: number;
  } | null>(null);

  // Assets prop ensures re-renders when B-roll URLs change
  void assets; // Used for prop-based re-rendering

  // Debug: Log scenes and cutaways on mount
  useEffect(() => {
    console.log('[VerticalTimeline] === VIDEO INFRASTRUCTURE DEBUG ===');
    console.log('[VerticalTimeline] Fast video server:', FAST_VIDEO_SERVER);
    console.log('[VerticalTimeline] Main video URL:', getVideoUrl(videoSource));
    console.log('[VerticalTimeline] Scenes loaded:', scenes.length);
    console.log('[VerticalTimeline] First scene ID:', scenes[0]?.sceneId);
    console.log('[VerticalTimeline] First scene cutaways:', scenes[0]?.cutaways?.length || 0);
    if (scenes[0]?.cutaways?.[0]) {
      console.log('[VerticalTimeline] First cutaway URL:', getVideoUrl(scenes[0].cutaways[0].video));
    }
    const totalCutaways = scenes.reduce((sum, s) => sum + (s.cutaways?.length || 0), 0);
    console.log('[VerticalTimeline] Total cutaways:', totalCutaways);
    console.log('[VerticalTimeline] ================================');
  }, [scenes, videoSource]);

  // Handle drag operations for the full timeline cutaway blocks
  useEffect(() => {
    if (!fullTimelineDragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!cutawayTimelineRef.current || !fullTimelineDragState) return;

      const rect = cutawayTimelineRef.current.getBoundingClientRect();
      const deltaX = e.clientX - fullTimelineDragState.startX;
      const deltaTime = (deltaX / rect.width) * totalDuration;

      // Find the scene this cutaway belongs to
      const scene = scenes.find(s => s.sceneId === fullTimelineDragState.sceneId);
      if (!scene) return;

      // Calculate new values based on operation
      let newAbsoluteStart = fullTimelineDragState.originalAbsoluteStart;
      let newDuration = fullTimelineDragState.originalDuration;

      if (fullTimelineDragState.operation === 'move') {
        // Move the entire block (keeping it within scene bounds)
        newAbsoluteStart = fullTimelineDragState.originalAbsoluteStart + deltaTime;
        // Clamp to scene boundaries
        newAbsoluteStart = Math.max(
          scene.sceneStart,
          Math.min(scene.sceneStart + scene.sceneDuration - newDuration, newAbsoluteStart)
        );
      } else if (fullTimelineDragState.operation === 'resize-left') {
        // Resize from left edge (changes start time and duration)
        const maxDelta = fullTimelineDragState.originalDuration - 0.5; // Minimum duration of 0.5s
        const minStart = scene.sceneStart;
        const clampedDelta = Math.max(
          minStart - fullTimelineDragState.originalAbsoluteStart,
          Math.min(maxDelta, deltaTime)
        );
        newAbsoluteStart = fullTimelineDragState.originalAbsoluteStart + clampedDelta;
        newDuration = fullTimelineDragState.originalDuration - clampedDelta;
      } else if (fullTimelineDragState.operation === 'resize-right') {
        // Resize from right edge (changes only duration)
        const maxEnd = scene.sceneStart + scene.sceneDuration;
        const maxDuration = maxEnd - fullTimelineDragState.originalAbsoluteStart;
        newDuration = Math.max(0.5, Math.min(maxDuration, fullTimelineDragState.originalDuration + deltaTime));
      }

      // Convert absolute time to scene-relative time
      const newStartTime = newAbsoluteStart - scene.sceneStart;

      setFullTimelinePreviewUpdate({
        sceneId: fullTimelineDragState.sceneId,
        cutawayIndex: fullTimelineDragState.cutawayIndex,
        startTime: Math.round(newStartTime * 10) / 10,
        duration: Math.round(newDuration * 10) / 10
      });
    };

    const handleMouseUp = () => {
      if (fullTimelinePreviewUpdate && onUpdateCutaway) {
        onUpdateCutaway(fullTimelinePreviewUpdate.sceneId, fullTimelinePreviewUpdate.cutawayIndex, {
          startTime: fullTimelinePreviewUpdate.startTime,
          duration: fullTimelinePreviewUpdate.duration
        });
      }
      setFullTimelineDragState(null);
      setFullTimelinePreviewUpdate(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [fullTimelineDragState, fullTimelinePreviewUpdate, scenes, totalDuration, onUpdateCutaway]);

  // Start drag operation for full timeline
  const startFullTimelineDrag = (
    e: React.MouseEvent,
    sceneId: string,
    cutawayIndex: number,
    absoluteStart: number,
    duration: number,
    operation: FullTimelineDragOperation
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setFullTimelineDragState({
      sceneId,
      cutawayIndex,
      operation,
      startX: e.clientX,
      originalAbsoluteStart: absoluteStart,
      originalDuration: duration
    });
  };

  // Handle resize drag
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate delta from where we started dragging
      const deltaY = e.clientY - startYRef.current;
      const newHeight = startHeightRef.current + deltaY;
      setPreviewHeight(Math.max(200, Math.min(800, newHeight))); // Clamp between 200-800px
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Load captions when active scene changes
  useEffect(() => {
    if (!activeScene) {
      setCaptionPages([]);
      return;
    }

    const sceneCaptions = getCaptionsForScene(activeScene);
    if (sceneCaptions && sceneCaptions.captions.length > 0) {
      // Group words into pages of 6-7 words max (TikTok style)
      const allTokens = sceneCaptions.captions.map(cue => ({
        text: cue.text,
        startMs: cue.startMs,
        endMs: cue.endMs,
      }));

      const pages: CaptionPage[] = [];
      const MAX_WORDS_PER_PAGE = 7;

      for (let i = 0; i < allTokens.length; i += MAX_WORDS_PER_PAGE) {
        const pageTokens = allTokens.slice(i, i + MAX_WORDS_PER_PAGE);

        pages.push({
          id: pages.length,
          text: pageTokens.map(t => t.text).join(' '),
          tokens: pageTokens,
          startMs: pageTokens[0].startMs,
          endMs: pageTokens[pageTokens.length - 1].endMs,
        });
      }

      setCaptionPages(pages);
    } else {
      setCaptionPages([]);
    }
  }, [activeScene]);

  // Handle scrubbing (drag to seek) on timeline
  useEffect(() => {
    if (!isScrubbing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Use either scene markers or cutaway timeline ref for position calculation
      const rect = sceneMarkersRef.current?.getBoundingClientRect() ||
                   cutawayTimelineRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clickX = e.clientX - rect.left;
      const scrubTime = Math.max(0, Math.min((clickX / rect.width) * totalDuration, totalDuration));

      // Update video position during scrub
      if (videoRef.current) {
        videoRef.current.currentTime = scrubTime;
        setCurrentTime(scrubTime);
      }
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      console.log('[SCRUB END] Stopped scrubbing');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, totalDuration]);

  const handleResizeStart = (e: React.MouseEvent) => {
    startYRef.current = e.clientY;
    startHeightRef.current = previewHeight;
    setIsResizing(true);
  };



  const togglePlay = () => {
    console.log(`[TOGGLE PLAY] Called. isPlaying: ${isPlaying}, currentTime: ${videoRef.current?.currentTime.toFixed(2)}s`);
    if (videoRef.current) {
      if (isPlaying) {
        console.log('[TOGGLE PLAY] Pausing video');
        videoRef.current.pause();
        if (cutawayVideoRef.current) cutawayVideoRef.current.pause();
      } else {
        console.log('[TOGGLE PLAY] Playing video');
        videoRef.current.play();
        if (cutawayVideoRef.current && showWithCutaways && activeCutawayAsset) {
          cutawayVideoRef.current.play();
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekTo = (time: number) => {
    console.log(`[SEEKTO] Called with time: ${time.toFixed(2)}s, current: ${videoRef.current?.currentTime.toFixed(2)}s, isPlaying: ${isPlaying}`);

    if (videoRef.current) {
      const video = videoRef.current;
      const wasPlaying = isPlaying;
      const oldTime = video.currentTime;

      // Diagnose video state
      const readyStateNames = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
      const networkStateNames = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];
      console.log(`[SEEKTO DIAG] readyState: ${video.readyState} (${readyStateNames[video.readyState]})`);
      console.log(`[SEEKTO DIAG] networkState: ${video.networkState} (${networkStateNames[video.networkState]})`);
      console.log(`[SEEKTO DIAG] duration: ${video.duration}s`);
      console.log(`[SEEKTO DIAG] src: ${video.src}`);

      // Check seekable ranges
      const seekable = video.seekable;
      if (seekable.length === 0) {
        console.error(`[SEEKTO ERROR] No seekable ranges! Video may not be loaded.`);
      } else {
        for (let i = 0; i < seekable.length; i++) {
          console.log(`[SEEKTO DIAG] Seekable range ${i}: ${seekable.start(i).toFixed(2)}s - ${seekable.end(i).toFixed(2)}s`);
        }
        // Check if target time is within seekable range
        let canSeek = false;
        for (let i = 0; i < seekable.length; i++) {
          if (time >= seekable.start(i) && time <= seekable.end(i)) {
            canSeek = true;
            break;
          }
        }
        if (!canSeek) {
          console.error(`[SEEKTO ERROR] Target time ${time.toFixed(2)}s is NOT in any seekable range!`);
        }
      }

      // Pause video before seeking to prevent race conditions
      if (wasPlaying) {
        console.log('[SEEKTO] Pausing video before seek');
        video.pause();
        if (cutawayVideoRef.current) cutawayVideoRef.current.pause();
      }

      // Set new time
      console.log(`[SEEKTO] Setting currentTime from ${oldTime.toFixed(2)}s to ${time.toFixed(2)}s`);
      video.currentTime = time;
      setCurrentTime(time);

      // Verify the time was actually set
      setTimeout(() => {
        console.log(`[SEEKTO VERIFY] After 100ms, video currentTime is: ${videoRef.current?.currentTime.toFixed(2)}s`);
        if (videoRef.current && Math.abs(videoRef.current.currentTime - time) > 1) {
          console.error(`[SEEKTO FAILED] Seek to ${time.toFixed(2)}s failed! Video is at ${videoRef.current.currentTime.toFixed(2)}s`);
        }
      }, 100);

      // Update active scene using dynamic scenes array
      const sceneInfo = getCurrentSceneFromScenes(time);
      if (sceneInfo) {
        const sceneId = sceneInfo.scene.sceneId;
        console.log(`[SEEKTO] Setting active scene to: ${sceneId}`);
        setActiveScene(sceneId);
      }

      // Resume playback if it was playing before
      if (wasPlaying) {
        console.log('[SEEKTO] Will resume playback in requestAnimationFrame');
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          if (videoRef.current) {
            console.log(`[SEEKTO RAF] Resuming playback at time: ${videoRef.current.currentTime.toFixed(2)}s`);
            videoRef.current.play().catch(err => console.error('[SEEK] Play error:', err));
            if (cutawayVideoRef.current && showWithCutaways && activeCutawayAsset) {
              cutawayVideoRef.current.play().catch(err => console.error('[SEEK] Cutaway play error:', err));
            }
          }
        });
      }
    }
  };

  // Get all cutaways with absolute times for the timeline
  const allCutaways = scenes.flatMap(scene =>
    (scene.cutaways || []).map((cutaway, cutawayIdx) => ({
      ...cutaway,
      absoluteStart: scene.sceneStart + cutaway.startTime,
      sceneId: scene.sceneId,
      cutawayIndex: cutawayIdx
    }))
  );

  return (
    <div
      ref={containerRef}
      style={{
        marginBottom: '32px',
        background: '#1e293b',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #334155',
        userSelect: isResizing ? 'none' : 'auto'
      }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        background: 'linear-gradient(to right, #10b98120, #3b82f620)',
        borderBottom: isCollapsed ? 'none' : '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
              Full Video Preview
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Watch the complete video with all scenes and B-roll cutaways
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Size presets */}
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', marginRight: '4px' }}>Size:</span>
              {[
                { label: 'S', height: 280 },
                { label: 'M', height: 400 },
                { label: 'L', height: 560 }
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setPreviewHeight(preset.height)}
                  style={{
                    width: '28px',
                    height: '24px',
                    background: Math.abs(previewHeight - preset.height) < 50 ? '#3b82f6' : 'transparent',
                    border: `1px solid ${Math.abs(previewHeight - preset.height) < 50 ? '#3b82f6' : '#475569'}`,
                    borderRadius: '4px',
                    color: Math.abs(previewHeight - preset.height) < 50 ? '#fff' : '#94a3b8',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Toggle switch for with/without cutaways */}
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex' }}>
                <button
                  onClick={() => setShowWithCutaways(false)}
                  style={{
                    padding: '8px 16px',
                    background: !showWithCutaways ? '#3b82f6' : 'transparent',
                    border: `1px solid ${!showWithCutaways ? '#3b82f6' : '#475569'}`,
                    borderRadius: '6px 0 0 6px',
                    color: !showWithCutaways ? '#fff' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Base Scenes Only
                </button>
                <button
                  onClick={() => setShowWithCutaways(true)}
                  style={{
                    padding: '8px 16px',
                    background: showWithCutaways ? '#3b82f6' : 'transparent',
                    border: `1px solid ${showWithCutaways ? '#3b82f6' : '#475569'}`,
                    borderRadius: '0 6px 6px 0',
                    marginLeft: '-1px',
                    color: showWithCutaways ? '#fff' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  With B-Roll Cutaways
                </button>
              </div>

              {/* Captions toggle */}
              <div style={{ display: 'flex' }}>
                <button
                  onClick={() => setShowCaptions(false)}
                  style={{
                    padding: '8px 16px',
                    background: !showCaptions ? '#10b981' : 'transparent',
                    border: `1px solid ${!showCaptions ? '#10b981' : '#475569'}`,
                    borderRadius: '6px 0 0 6px',
                    color: !showCaptions ? '#fff' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Captions Off
                </button>
                <button
                  onClick={() => setShowCaptions(true)}
                  style={{
                    padding: '8px 16px',
                    background: showCaptions ? '#10b981' : 'transparent',
                    border: `1px solid ${showCaptions ? '#10b981' : '#475569'}`,
                    borderRadius: '0 6px 6px 0',
                    marginLeft: '-1px',
                    color: showCaptions ? '#fff' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Captions On
                </button>
              </div>
            </div>
          )}

          {/* Collapse/Expand button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              width: '32px',
              height: '32px',
              background: 'transparent',
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isCollapsed ? 'Expand preview' : 'Collapse preview'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video Player and Timeline */}
      {!isCollapsed && (
        <div style={{ padding: '24px', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Video Player */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  position: 'relative',
                  height: `${previewHeight}px`,
                  width: `${Math.round(previewHeight * (16 / 9))}px`,
                  background: '#0f172a',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}
              >
              {/* Single combined video */}
              <video
                ref={videoRef}
                src={getVideoUrl(videoSource)}
                playsInline
                preload="auto"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 0
                }}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    const newTime = videoRef.current.currentTime;
                    const prevTime = prevTimeRef.current;

                    // Detect unexpected jumps backwards (more than 2 seconds back, excluding small rewinds)
                    if (prevTime > 5 && newTime < 2 && (prevTime - newTime) > 3) {
                      console.error(`[TIME JUMP DETECTED] Video jumped from ${prevTime.toFixed(2)}s to ${newTime.toFixed(2)}s! This is the bug!`);
                      console.trace('[TIME JUMP STACK TRACE]');
                    }
                    prevTimeRef.current = newTime;

                    setCurrentTime(newTime);

                    // Update active scene based on current time using dynamic scenes array
                    const sceneInfo = getCurrentSceneFromScenes(newTime);
                    if (sceneInfo) {
                      const { scene: currentScene, startTime: sceneStartTime } = sceneInfo;
                      const sceneId = currentScene.sceneId;
                      setActiveScene(sceneId);

                      // Check if we're in a cutaway
                      const sceneLocalTime = videoRef.current.currentTime - sceneStartTime;

                      let foundCutaway = false;

                      // Debug logging (every 2 seconds to avoid spam)
                      if (Math.floor(videoRef.current.currentTime) % 2 === 0 && Math.floor(videoRef.current.currentTime * 10) % 10 < 2) {
                        console.log(`[Cutaway Debug] sceneId: ${sceneId}, cutaways: ${currentScene?.cutaways?.length || 0}, localTime: ${sceneLocalTime.toFixed(1)}s`);
                        // Log cutaway timing details
                        if (currentScene?.cutaways) {
                          currentScene.cutaways.forEach((c, i) => {
                            const inRange = sceneLocalTime >= c.startTime && sceneLocalTime < c.startTime + c.duration;
                            console.log(`  [Cutaway ${i}] startTime: ${c.startTime}, duration: ${c.duration}, endTime: ${c.startTime + c.duration}, inRange: ${inRange}`);
                          });
                        }
                      }

                      if (currentScene && currentScene.cutaways) {
                        for (const cutaway of currentScene.cutaways) {
                          if (sceneLocalTime >= cutaway.startTime && sceneLocalTime < cutaway.startTime + cutaway.duration) {
                            console.log(`[CUTAWAY TRIGGERED] ${cutaway.video} at localTime ${sceneLocalTime.toFixed(2)}s`);
                            setActiveCutaway(cutaway.video);
                            const asset = getAssetFromPath(cutaway.video);
                            // Create fallback asset if not found in assets array
                            const fallbackAsset: BRollAsset = {
                              id: cutaway.video,
                              filename: cutaway.video.split('/').pop() || 'unknown.mp4',
                              path: cutaway.video,
                              description: '',
                              status: 'pending',
                              usedInScenes: [],
                              source: 'pexels',
                              createdAt: new Date().toISOString(),
                              versions: []
                            };
                            setActiveCutawayAsset(asset || fallbackAsset);
                            foundCutaway = true;
                            break;
                          }
                        }
                      }
                      if (!foundCutaway) {
                        setActiveCutaway(null);
                        setActiveCutawayAsset(null);
                      }
                    }
                  }
                }}
                onEnded={() => {
                  setIsPlaying(false);
                }}
              />

              {/* Cutaway video overlay - shows the actual B-roll asset */}
              {showWithCutaways && activeCutawayAsset && (() => {
                const videoUrl = getVideoUrl(activeCutawayAsset.path);
                console.log(`[CUTAWAY RENDER] Rendering cutaway video: ${videoUrl}`);
                return (
                  <video
                    key={`cutaway-${activeCutawayAsset.id}-${activeCutawayAsset.path}`}
                    ref={cutawayVideoRef}
                    src={videoUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      zIndex: 1
                    }}
                    autoPlay
                    muted
                    loop
                    playsInline
                    onLoadedData={() => {
                      console.log(`[CUTAWAY LOADED] Video loaded: ${videoUrl}`);
                      if (isPlaying && cutawayVideoRef.current) {
                        cutawayVideoRef.current.play().catch(e => console.error('[CUTAWAY PLAY ERROR]', e));
                      }
                    }}
                    onError={(e) => console.error(`[CUTAWAY ERROR] Failed to load: ${videoUrl}`, e)}
                  />
                );
              })()}

              {/* Play/Pause Overlay */}
              <div
                onClick={togglePlay}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isPlaying ? 'transparent' : 'rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  zIndex: 2
                }}
              >
                {!isPlaying && (
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#0f172a">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                )}
              </div>

              {/* TikTok-style Captions */}
              {showCaptions && captionPages.length > 0 && (() => {
                // Calculate scene-relative time for captions using dynamic scenes array
                const sceneInfo = getCurrentSceneFromScenes(currentTime);
                const sceneRelativeTime = sceneInfo ? (currentTime - sceneInfo.startTime) * 1000 : 0;

                return (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
                    <CaptionOverlay
                      pages={captionPages}
                      currentTimeMs={sceneRelativeTime}
                      containerHeight={previewHeight}
                      style={{
                        ...defaultCaptionStyle,
                        // Get custom style from scene config if available
                        ...(activeScene && getCaptionsForScene(activeScene)?.style),
                      }}
                    />
                  </div>
                );
              })()}

              {/* Current Time Badge */}
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.8)',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#fff',
                fontFamily: 'monospace',
                zIndex: 3
              }}>
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </div>

              {/* Active Cutaway Indicator */}
              {activeCutaway && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  padding: '6px 12px',
                  background: '#f59e0b',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  zIndex: 3
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  B-ROLL: {activeCutaway.split('/').pop()?.replace('.mp4', '')}
                </div>
              )}
            </div>

            {/* Timeline Scrubber */}
            <div style={{ marginTop: '16px' }}>
              {/* Scene markers - Click anywhere to seek, drag to scrub */}
              <div
                ref={sceneMarkersRef}
                style={{
                  position: 'relative',
                  height: '32px',
                  background: '#0f172a',
                  borderRadius: '8px 8px 0 0',
                  overflow: 'hidden',
                  cursor: isScrubbing ? 'grabbing' : 'pointer'
                }}
                onMouseDown={(e) => {
                  // Start scrubbing on mouse down
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const clickedTime = (clickX / rect.width) * totalDuration;
                  console.log(`[SCRUB START] Starting scrub at ${clickedTime.toFixed(2)}s`);
                  seekTo(Math.max(0, Math.min(clickedTime, totalDuration)));
                  setIsScrubbing(true);
                  e.preventDefault(); // Prevent text selection during drag
                }}
              >
                {scenes.map((scene, idx) => (
                  <div
                    key={scene.sceneId || `scene-marker-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`[SCENE MARKER CLICK] Scene ${idx + 1} (${scene.sceneId}), seeking to ${scene.sceneStart.toFixed(2)}s`);
                      seekTo(scene.sceneStart);
                    }}
                    style={{
                      position: 'absolute',
                      left: `${(scene.sceneStart / totalDuration) * 100}%`,
                      width: `${(scene.sceneDuration / totalDuration) * 100}%`,
                      height: '100%',
                      background: activeScene === scene.sceneId ? '#3b82f640' : '#3b82f620',
                      borderRight: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    title={scene.sceneTitle}
                  >
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: activeScene === scene.sceneId ? '#3b82f6' : '#64748b'
                    }}>
                      S{idx + 1}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cutaway markers - Interactive with drag/resize, click/drag to scrub */}
              <div
                ref={cutawayTimelineRef}
                style={{
                  position: 'relative',
                  height: '28px',
                  background: '#1e293b',
                  borderRadius: '0 0 8px 8px',
                  cursor: isScrubbing ? 'grabbing' : 'pointer'
                }}
                onMouseDown={(e) => {
                  // Only handle clicks on the timeline background, not on cutaway bars
                  if (e.target === e.currentTarget) {
                    const rect = cutawayTimelineRef.current?.getBoundingClientRect();
                    if (!rect) return;

                    // Calculate clicked time
                    const clickX = e.clientX - rect.left;
                    const clickedTime = (clickX / rect.width) * totalDuration;

                    // Shift+click opens insert modal, normal click/drag scrubs
                    if (e.shiftKey && onTimelineClick) {
                      // Find which scene this time falls into
                      const scene = scenes.find(s =>
                        clickedTime >= s.sceneStart &&
                        clickedTime < s.sceneStart + s.sceneDuration
                      );

                      if (scene) {
                        // Calculate scene-relative start time
                        const startTime = clickedTime - scene.sceneStart;
                        console.log(`[Timeline Shift+Click] Triggering insert modal for ${scene.sceneId} at ${startTime.toFixed(1)}s`);
                        onTimelineClick(scene.sceneId, Math.max(0, Math.round(startTime * 10) / 10));
                      }
                    } else {
                      // Normal click = start scrubbing
                      console.log(`[SCRUB START] Starting scrub at ${clickedTime.toFixed(2)}s (cutaway timeline)`);
                      seekTo(Math.max(0, Math.min(clickedTime, totalDuration)));
                      setIsScrubbing(true);
                      e.preventDefault(); // Prevent text selection during drag
                    }
                  }
                }}
                title="Click to seek • Shift+click to insert B-roll"
              >
                {allCutaways.map((cutaway, idx) => {
                  const asset = getAssetFromPath(cutaway.video);
                  const statusColor = asset ? {
                    approved: '#22c55e',
                    pending: '#f59e0b',
                    rejected: '#ef4444',
                    regenerating: '#8b5cf6'
                  }[asset.status] : '#475569';

                  const isActive = activeCutaway === cutaway.video;
                  const isDragging = fullTimelineDragState?.sceneId === cutaway.sceneId &&
                    fullTimelineDragState?.cutawayIndex === cutaway.cutawayIndex;

                  // Use preview values during drag, otherwise use actual values
                  const displayStart = (fullTimelinePreviewUpdate?.sceneId === cutaway.sceneId &&
                    fullTimelinePreviewUpdate?.cutawayIndex === cutaway.cutawayIndex)
                    ? scenes.find(s => s.sceneId === cutaway.sceneId)!.sceneStart + fullTimelinePreviewUpdate.startTime
                    : cutaway.absoluteStart;
                  const displayDuration = (fullTimelinePreviewUpdate?.sceneId === cutaway.sceneId &&
                    fullTimelinePreviewUpdate?.cutawayIndex === cutaway.cutawayIndex)
                    ? fullTimelinePreviewUpdate.duration
                    : cutaway.duration;

                  return (
                    <div
                      key={`${cutaway.sceneId || 'cutaway'}-${cutaway.cutawayIndex}-${idx}`}
                      style={{
                        position: 'absolute',
                        left: `${(displayStart / totalDuration) * 100}%`,
                        width: `${(displayDuration / totalDuration) * 100}%`,
                        height: '100%',
                        background: isDragging ? `${statusColor}90` : `${statusColor}60`,
                        borderLeft: `2px solid ${statusColor}`,
                        borderRight: `2px solid ${statusColor}`,
                        cursor: isDragging ? 'grabbing' : 'grab',
                        opacity: isActive ? 1 : 0.8,
                        transition: isDragging ? 'none' : 'opacity 0.2s',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: isDragging ? 20 : 1
                      }}
                      title={`${cutaway.video.split('/').pop()} (${cutaway.startTime}s, ${cutaway.duration}s) - Drag to move, edges to resize`}
                      onMouseDown={(e) => {
                        // Check if clicking on resize handles
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const handleWidth = 10; // pixels

                        if (clickX <= handleWidth) {
                          // Left resize handle
                          startFullTimelineDrag(e, cutaway.sceneId, cutaway.cutawayIndex, cutaway.absoluteStart, cutaway.duration, 'resize-left');
                        } else if (clickX >= rect.width - handleWidth) {
                          // Right resize handle
                          startFullTimelineDrag(e, cutaway.sceneId, cutaway.cutawayIndex, cutaway.absoluteStart, cutaway.duration, 'resize-right');
                        } else {
                          // Center - move operation
                          startFullTimelineDrag(e, cutaway.sceneId, cutaway.cutawayIndex, cutaway.absoluteStart, cutaway.duration, 'move');
                        }
                      }}
                      onClick={(e) => {
                        // Only seek if not dragging
                        if (!fullTimelineDragState) {
                          e.stopPropagation();
                          seekTo(cutaway.absoluteStart);
                        }
                      }}
                    >
                      {/* Left resize handle */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: '10px',
                          height: '100%',
                          cursor: 'ew-resize',
                          background: isDragging && fullTimelineDragState?.operation === 'resize-left'
                            ? 'rgba(255,255,255,0.3)'
                            : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isDragging || fullTimelineDragState?.operation !== 'resize-left') {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      />

                      {/* Center label */}
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: 'calc(100% - 20px)',
                        padding: '0 4px'
                      }}>
                        B{cutaway.cutawayIndex + 1}
                      </span>

                      {/* Right resize handle */}
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          width: '10px',
                          height: '100%',
                          cursor: 'ew-resize',
                          background: isDragging && fullTimelineDragState?.operation === 'resize-right'
                            ? 'rgba(255,255,255,0.3)'
                            : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isDragging || fullTimelineDragState?.operation !== 'resize-right') {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      />
                    </div>
                  );
                })}

                {/* Playhead */}
                <div style={{
                  position: 'absolute',
                  left: `${(currentTime / totalDuration) * 100}%`,
                  top: '-32px',
                  width: '2px',
                  height: '60px',
                  background: '#ef4444',
                  zIndex: 10,
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-4px',
                    width: '10px',
                    height: '10px',
                    background: '#ef4444',
                    borderRadius: '2px',
                    transform: 'rotate(45deg)'
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel - Current Scene Info */}
          <div style={{
            width: '280px',
            flexShrink: 0,
            background: '#0f172a',
            borderRadius: '12px',
            padding: '16px',
            height: `${previewHeight}px`,
            overflow: 'auto'
          }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#64748b',
              margin: '0 0 16px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Now Playing
            </h3>

            {activeScene && (() => {
              const scene = scenes.find(s => s.sceneId === activeScene);
              if (!scene) return null;

              return (
                <div>
                  <div style={{
                    padding: '12px',
                    background: '#1e293b',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    border: '1px solid #3b82f640'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        {scenes.indexOf(scene) + 1}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6' }}>
                        SCENE
                      </span>
                    </div>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#f1f5f9',
                      margin: 0
                    }}>
                      {scene.sceneTitle.replace(/^Scene \d+ - /, '')}
                    </h4>
                  </div>

                  {activeCutaway && (() => {
                    const cutaway = (scene.cutaways || []).find(c => c.video === activeCutaway);
                    const asset = getAssetFromPath(activeCutaway);
                    if (!cutaway) return null;

                    return (
                      <div style={{
                        padding: '12px',
                        background: '#1e293b',
                        borderRadius: '8px',
                        border: '1px solid #f59e0b40'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            padding: '4px 8px',
                            background: '#f59e0b20',
                            borderRadius: '4px'
                          }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b' }}>
                              B-ROLL
                            </span>
                          </div>
                          {asset && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 500,
                              color: asset.status === 'approved' ? '#22c55e' :
                                     asset.status === 'pending' ? '#f59e0b' :
                                     asset.status === 'rejected' ? '#ef4444' : '#8b5cf6',
                              textTransform: 'uppercase'
                            }}>
                              {asset.status}
                            </span>
                          )}
                        </div>
                        <p style={{
                          fontSize: '13px',
                          color: '#e2e8f0',
                          margin: '0 0 6px 0'
                        }}>
                          {activeCutaway.split('/').pop()?.replace('.mp4', '').replace(/_/g, ' ')}
                        </p>
                        {asset && (
                          <p style={{
                            fontSize: '11px',
                            color: '#94a3b8',
                            margin: 0
                          }}>
                            {asset.description}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {!activeCutaway && (
                    <div style={{
                      padding: '16px',
                      background: '#1e293b40',
                      borderRadius: '8px',
                      border: '1px dashed #334155',
                      textAlign: 'center'
                    }}>
                      <p style={{
                        fontSize: '12px',
                        color: '#64748b',
                        margin: 0
                      }}>
                        Base scene content
                        <br />
                        <span style={{ fontSize: '11px' }}>(No B-roll cutaway active)</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {!activeScene && (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '13px'
              }}>
                Click play to start
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            height: '20px',
            cursor: 'ns-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
            borderTop: '1px solid #334155'
          }}
        >
          <div style={{
            width: '80px',
            height: '6px',
            borderRadius: '3px',
            background: isResizing ? '#3b82f6' : '#475569',
            transition: 'background 0.2s'
          }} />
        </div>
      )}
    </div>
  );
};

// Helper function to format time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface SceneBlockProps {
  scene: SceneCutaway & { sceneStart: number; sceneDuration: number };
  sceneIndex: number;
  assets: BRollAsset[];
  totalDuration: number;
  getAssetFromPath: (path: string) => BRollAsset | undefined;
  onApprove: (assetId: string) => void;
  onReject: (assetId: string) => void;
  onRegenerate: (assetId: string) => void;
  onUpdateCutaway?: (sceneId: string, cutawayIndex: number, updates: CutawayUpdate) => void;
  onInsertCutaway?: (sceneId: string, cutaway: CutawayConfig) => void;
  triggerInsertModal?: { sceneId: string; time: number } | null;
  onClearTrigger?: () => void;
  onDeleteCutaway?: (sceneId: string, cutawayIndex: number) => void;
}

// Drag operation types
type DragOperation = 'move' | 'resize-left' | 'resize-right' | null;

interface DragState {
  cutawayIndex: number;
  operation: DragOperation;
  startX: number;
  originalStartTime: number;
  originalDuration: number;
}

const SceneBlock: React.FC<SceneBlockProps> = ({
  scene,
  sceneIndex,
  assets: _assets,
  totalDuration: _totalDuration,
  getAssetFromPath,
  onApprove,
  onReject,
  onRegenerate,
  onUpdateCutaway,
  onInsertCutaway,
  onDeleteCutaway,
  triggerInsertModal,
  onClearTrigger
}) => {
  // _assets and _totalDuration available for future features (e.g., overall timeline)
  void _assets;
  void _totalDuration;
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredCutaway, setHoveredCutaway] = useState<number | null>(null);
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertTime, setInsertTime] = useState(0);
  const [selectedAssetForInsert, setSelectedAssetForInsert] = useState<string>('');
  const [insertMode, setInsertMode] = useState<'existing' | 'stock' | 'generate'>('existing');
  const [showStockBrowser, setShowStockBrowser] = useState(false);
  const [stockSource, setStockSource] = useState<StockSource>('pexels');
  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState<'cinematic' | 'realistic' | 'documentary'>('cinematic');
  const [aiImageModel, setAiImageModel] = useState<ImageModel>('imagen4-fast');
  const [aiVideoModel, setAiVideoModel] = useState<VideoModel>('sora-2');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState<GenerationProgress | null>(null);
  // Stock download state
  const [stockDownloading, setStockDownloading] = useState(false);
  const [stockDownloadProgress, setStockDownloadProgress] = useState<DownloadProgress | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewUpdate, setPreviewUpdate] = useState<{ index: number; startTime: number; duration: number } | null>(null);

  // Handle triggered insert modal from main timeline
  useEffect(() => {
    if (triggerInsertModal && triggerInsertModal.sceneId === scene.sceneId) {
      console.log(`[SceneBlock] Opening insert modal for ${scene.sceneId} at ${triggerInsertModal.time}s`);
      setInsertTime(triggerInsertModal.time);
      setShowInsertModal(true);
      setIsExpanded(true); // Ensure scene is expanded
      // Clear the trigger after processing
      if (onClearTrigger) {
        onClearTrigger();
      }
    }
  }, [triggerInsertModal, scene.sceneId, onClearTrigger]);

  // Convert pixel position to time
  const pixelToTime = useCallback((pixelX: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, pixelX / rect.width));
    return percentage * scene.sceneDuration;
  }, [scene.sceneDuration]);

  // Handle mouse move for drag operations
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || !dragState) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragState.startX;
      const deltaTime = (deltaX / rect.width) * scene.sceneDuration;

      let newStartTime = dragState.originalStartTime;
      let newDuration = dragState.originalDuration;

      if (dragState.operation === 'move') {
        // Move the entire block
        newStartTime = Math.max(0, Math.min(
          scene.sceneDuration - dragState.originalDuration,
          dragState.originalStartTime + deltaTime
        ));
      } else if (dragState.operation === 'resize-left') {
        // Resize from left edge (changes start time and duration)
        const maxDelta = dragState.originalDuration - 0.5; // Minimum duration of 0.5s
        const clampedDelta = Math.max(-dragState.originalStartTime, Math.min(maxDelta, deltaTime));
        newStartTime = dragState.originalStartTime + clampedDelta;
        newDuration = dragState.originalDuration - clampedDelta;
      } else if (dragState.operation === 'resize-right') {
        // Resize from right edge (changes only duration)
        const maxDuration = scene.sceneDuration - dragState.originalStartTime;
        newDuration = Math.max(0.5, Math.min(maxDuration, dragState.originalDuration + deltaTime));
      }

      // Update preview
      setPreviewUpdate({
        index: dragState.cutawayIndex,
        startTime: Math.round(newStartTime * 10) / 10,
        duration: Math.round(newDuration * 10) / 10
      });
    };

    const handleMouseUp = () => {
      if (previewUpdate && onUpdateCutaway) {
        onUpdateCutaway(scene.sceneId, previewUpdate.index, {
          startTime: previewUpdate.startTime,
          duration: previewUpdate.duration
        });
      }
      setDragState(null);
      setPreviewUpdate(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, previewUpdate, scene.sceneId, scene.sceneDuration, onUpdateCutaway]);

  // Start drag operation
  const startDrag = (e: React.MouseEvent, cutawayIndex: number, operation: DragOperation) => {
    e.preventDefault();
    e.stopPropagation();
    const cutaways = scene.cutaways || [];
    const cutaway = cutaways[cutawayIndex];
    if (!cutaway) return;
    setDragState({
      cutawayIndex,
      operation,
      startX: e.clientX,
      originalStartTime: cutaway.startTime,
      originalDuration: cutaway.duration
    });
  };

  // Handle timeline click to insert at position
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || dragState) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = pixelToTime(clickX);

    // Check if we clicked on an existing cutaway
    for (const cutaway of (scene.cutaways || [])) {
      if (clickTime >= cutaway.startTime && clickTime <= cutaway.startTime + cutaway.duration) {
        return; // Clicked on existing cutaway, don't show insert modal
      }
    }

    setInsertTime(Math.round(clickTime * 10) / 10);
    setShowInsertModal(true);
  };

  // Handle insert new cutaway
  const handleInsert = () => {
    if (onInsertCutaway && selectedAssetForInsert) {
      onInsertCutaway(scene.sceneId, {
        video: selectedAssetForInsert,
        startTime: insertTime,
        duration: 3.0, // Default 3 second duration
        style: 'standard',
        videoStartTime: 0,
        playbackRate: 1.0
      });
    }
    setShowInsertModal(false);
    setSelectedAssetForInsert('');
    setInsertMode('existing');
  };

  // Handle stock video selection - downloads and saves to permanent storage
  const handleStockVideoSelect = async (video: {
    id: string;
    downloadUrl: string;
    previewUrl?: string;
    duration: number;
    source: StockSource;
    author?: string;
  }) => {
    if (!onInsertCutaway) return;

    // Only download if source is pexels or pixabay
    const isStockVideo = video.source === 'pexels' || video.source === 'pixabay';

    if (!isStockVideo) {
      // Non-stock video - just insert directly
      onInsertCutaway(scene.sceneId, {
        video: video.downloadUrl,
        startTime: insertTime,
        duration: Math.min(video.duration, scene.sceneDuration - insertTime, 5),
        style: 'standard',
        videoStartTime: 0,
        playbackRate: 1.0
      });
      setShowStockBrowser(false);
      setShowInsertModal(false);
      setInsertMode('existing');
      return;
    }

    setStockDownloading(true);
    setStockDownloadProgress({ loaded: 0, total: 0, percent: 0 });

    try {
      // Download and save to Supabase Storage
      const videoInfo: StockVideoInfo = {
        id: video.id,
        downloadUrl: video.downloadUrl,
        previewUrl: video.previewUrl,
        duration: video.duration,
        source: video.source as 'pexels' | 'pixabay',
        author: video.author,
      };

      const result = await downloadAndSaveStockVideo(
        videoInfo,
        'broll-reviewer', // Default project ID
        (progress) => setStockDownloadProgress(progress)
      );

      // Use the permanent URL (or fallback to original if storage unavailable)
      const videoUrl = result.success && result.localUrl ? result.localUrl : video.downloadUrl;

      onInsertCutaway(scene.sceneId, {
        video: videoUrl,
        startTime: insertTime,
        duration: Math.min(video.duration, scene.sceneDuration - insertTime, 5), // Cap at 5s or remaining scene time
        style: 'standard',
        videoStartTime: 0,
        playbackRate: 1.0
      });

      setShowStockBrowser(false);
      setShowInsertModal(false);
      setInsertMode('existing');
    } catch (error) {
      console.error('Failed to download stock video:', error);
      // Fallback: use original URL
      onInsertCutaway(scene.sceneId, {
        video: video.downloadUrl,
        startTime: insertTime,
        duration: Math.min(video.duration, scene.sceneDuration - insertTime, 5),
        style: 'standard',
        videoStartTime: 0,
        playbackRate: 1.0
      });
      setShowStockBrowser(false);
      setShowInsertModal(false);
      setInsertMode('existing');
    } finally {
      setStockDownloading(false);
      setStockDownloadProgress(null);
    }
  };

  // Handle AI B-Roll generation
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiGenerating) return;

    setAiGenerating(true);
    setAiProgress({ stage: 'image', message: 'Starting generation...' });

    try {
      const result = await generateBRoll(
        aiPrompt,
        aiStyle,
        aiImageModel,
        aiVideoModel,
        (progress) => setAiProgress(progress)
      );

      // Insert the generated video as a cutaway
      if (onInsertCutaway && result.videoUrl) {
        onInsertCutaway(scene.sceneId, {
          video: result.videoUrl,
          startTime: insertTime,
          duration: Math.min(5, scene.sceneDuration - insertTime), // Default 5s duration
          style: 'standard',
          videoStartTime: 0,
          playbackRate: 1.0
        });
      }

      // Close modal and reset
      setShowInsertModal(false);
      setInsertMode('existing');
      setAiPrompt('');
      setAiProgress(null);
    } catch (error) {
      console.error('AI generation failed:', error);
      setAiProgress({
        stage: 'error',
        message: error instanceof Error ? error.message : 'Generation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setAiGenerating(false);
    }
  };

  // Reset AI state when closing modal
  const handleCloseInsertModal = () => {
    setShowInsertModal(false);
    setInsertMode('existing');
    setSelectedAssetForInsert('');
    setAiPrompt('');
    setAiProgress(null);
    setAiGenerating(false);
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #334155'
      }}>
      {/* Scene Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '16px 20px',
          background: '#3b82f620',
          borderBottom: isExpanded ? '1px solid #334155' : 'none',
          cursor: 'pointer'
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: '14px'
        }}>
          {sceneIndex + 1}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#f1f5f9',
            margin: 0
          }}>
            {scene.sceneTitle}
          </h3>
          <p style={{
            fontSize: '12px',
            color: '#64748b',
            margin: '2px 0 0 0'
          }}>
            {scene.sceneStart.toFixed(1)}s - {(scene.sceneStart + scene.sceneDuration).toFixed(1)}s
            ({scene.sceneDuration.toFixed(1)}s duration)
          </p>
        </div>
        <div style={{
          padding: '4px 10px',
          background: '#475569',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#e2e8f0'
        }}>
          {(scene.cutaways || []).length} cutaway{(scene.cutaways || []).length !== 1 ? 's' : ''}
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Cutaways Timeline */}
      {isExpanded && (
        <div style={{ padding: '20px' }}>
          {/* Mini Timeline Bar - Interactive */}
          <div
            ref={timelineRef}
            onClick={handleTimelineClick}
            style={{
              position: 'relative',
              height: '80px',
              background: '#0f172a',
              borderRadius: '8px',
              marginBottom: '16px',
              overflow: 'visible',
              cursor: dragState ? (dragState.operation === 'move' ? 'grabbing' : 'ew-resize') : 'pointer',
              userSelect: 'none'
            }}
          >
            {/* Scene background bar */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: 0,
              right: 0,
              height: '20px',
              background: '#3b82f620',
              borderRadius: '4px'
            }} />

            {/* Insert hint */}
            {!dragState && (
              <div style={{
                position: 'absolute',
                top: '8px',
                left: 0,
                right: 0,
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <span style={{
                  fontSize: '10px',
                  color: '#475569',
                  background: '#0f172a',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  Click to insert B-roll
                </span>
              </div>
            )}

            {/* Cutaway bars - Interactive */}
            {(scene.cutaways || []).map((cutaway, idx) => {
              const asset = getAssetFromPath(cutaway.video);
              const statusColor = asset ? {
                approved: '#22c55e',
                pending: '#f59e0b',
                rejected: '#ef4444',
                regenerating: '#8b5cf6'
              }[asset.status] : '#475569';

              // Use preview values if this cutaway is being dragged
              const displayStartTime = previewUpdate?.index === idx ? previewUpdate.startTime : cutaway.startTime;
              const displayDuration = previewUpdate?.index === idx ? previewUpdate.duration : cutaway.duration;

              const left = (displayStartTime / scene.sceneDuration) * 100;
              const width = (displayDuration / scene.sceneDuration) * 100;
              const isDragging = dragState?.cutawayIndex === idx;

              return (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    top: '32px',
                    left: `${left}%`,
                    width: `${width}%`,
                    height: '36px',
                    background: isDragging ? `${statusColor}80` : `${statusColor}60`,
                    border: `2px solid ${statusColor}`,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: '#fff',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: dragState?.operation === 'move' ? 'grabbing' : 'grab',
                    transition: isDragging ? 'none' : 'left 0.1s, width 0.1s',
                    zIndex: isDragging ? 10 : 1,
                    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.4)' : 'none'
                  }}
                  onMouseDown={(e) => startDrag(e, idx, 'move')}
                  onMouseEnter={() => setHoveredCutaway(idx)}
                  onMouseLeave={() => setHoveredCutaway(null)}
                  title={`${cutaway.video.split('/').pop()} (${displayStartTime.toFixed(1)}s - ${(displayStartTime + displayDuration).toFixed(1)}s)\nDrag to move, drag edges to resize`}
                >
                  {/* Left resize handle */}
                  <div
                    onMouseDown={(e) => startDrag(e, idx, 'resize-left')}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '8px',
                      cursor: 'ew-resize',
                      background: 'linear-gradient(to right, rgba(255,255,255,0.3), transparent)',
                      borderRadius: '4px 0 0 4px'
                    }}
                  />

                  {/* Center content */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    pointerEvents: 'none'
                  }}>
                    <span>B{idx + 1}</span>
                    <span style={{ fontSize: '8px', opacity: 0.8 }}>
                      {displayDuration.toFixed(1)}s
                    </span>
                  </div>

                  {/* Right resize handle */}
                  <div
                    onMouseDown={(e) => startDrag(e, idx, 'resize-right')}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: '8px',
                      cursor: 'ew-resize',
                      background: 'linear-gradient(to left, rgba(255,255,255,0.3), transparent)',
                      borderRadius: '0 4px 4px 0'
                    }}
                  />

                  {/* Delete button */}
                  {onDeleteCutaway && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCutaway(scene.sceneId, idx);
                      }}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        border: '2px solid #0f172a',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: hoveredCutaway === idx ? 1 : 0,
                        transition: 'opacity 0.2s',
                        pointerEvents: hoveredCutaway === idx ? 'auto' : 'none'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}

            {/* Time labels */}
            <div style={{
              position: 'absolute',
              bottom: '4px',
              left: '4px',
              fontSize: '10px',
              color: '#64748b'
            }}>0s</div>
            <div style={{
              position: 'absolute',
              bottom: '4px',
              right: '4px',
              fontSize: '10px',
              color: '#64748b'
            }}>{scene.sceneDuration.toFixed(0)}s</div>

            {/* Tick marks */}
            {Array.from({ length: Math.floor(scene.sceneDuration / 5) + 1 }, (_, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: `${(i * 5 / scene.sceneDuration) * 100}%`,
                  width: '1px',
                  height: '6px',
                  background: '#475569'
                }}
              />
            ))}
          </div>

          {/* Insert Modal */}
          {showInsertModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: '#1e293b',
                borderRadius: '12px',
                width: '520px',
                maxWidth: '90vw',
                border: '1px solid #334155',
                overflow: 'hidden'
              }}>
                {/* Header */}
                <div style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #334155',
                  background: '#0f172a'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#f1f5f9',
                    margin: 0
                  }}>
                    Insert B-Roll at {insertTime.toFixed(1)}s
                  </h3>
                  <p style={{
                    fontSize: '12px',
                    color: '#64748b',
                    margin: '4px 0 0 0'
                  }}>
                    Scene {sceneIndex + 1}: {scene.sceneId}
                  </p>
                </div>

                {/* Tab Buttons */}
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid #334155'
                }}>
                  <button
                    onClick={() => setInsertMode('existing')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      background: insertMode === 'existing' ? '#1e293b' : 'transparent',
                      border: 'none',
                      borderBottom: insertMode === 'existing' ? '2px solid #3b82f6' : '2px solid transparent',
                      color: insertMode === 'existing' ? '#f1f5f9' : '#64748b',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    Existing Assets ({_assets.length})
                  </button>
                  <button
                    onClick={() => setInsertMode('stock')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      background: insertMode === 'stock' ? '#1e293b' : 'transparent',
                      border: 'none',
                      borderBottom: insertMode === 'stock' ? '2px solid #22c55e' : '2px solid transparent',
                      color: insertMode === 'stock' ? '#f1f5f9' : '#64748b',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Find New Stock
                  </button>
                  <button
                    onClick={() => setInsertMode('generate')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      background: insertMode === 'generate' ? '#1e293b' : 'transparent',
                      border: 'none',
                      borderBottom: insertMode === 'generate' ? '2px solid #a855f7' : '2px solid transparent',
                      color: insertMode === 'generate' ? '#f1f5f9' : '#64748b',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    Generate with AI
                  </button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px 24px' }}>
                  {insertMode === 'existing' ? (
                    // Existing Assets Tab
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#94a3b8',
                        marginBottom: '8px'
                      }}>
                        Select from project B-Roll assets
                      </label>
                      <select
                        value={selectedAssetForInsert}
                        onChange={(e) => setSelectedAssetForInsert(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#f1f5f9',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Choose an asset...</option>
                        {_assets.map(asset => (
                          <option key={asset.id} value={asset.path}>
                            {asset.filename} - {asset.description}
                          </option>
                        ))}
                      </select>

                      {/* Asset Preview */}
                      {selectedAssetForInsert && (
                        <div style={{
                          marginTop: '16px',
                          padding: '12px',
                          background: '#0f172a',
                          borderRadius: '8px',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'center'
                        }}>
                          <video
                            src={getVideoUrl(selectedAssetForInsert)}
                            style={{
                              width: '100px',
                              height: '56px',
                              objectFit: 'cover',
                              borderRadius: '4px'
                            }}
                            muted
                            autoPlay
                            loop
                            playsInline
                          />
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontSize: '13px',
                              color: '#f1f5f9',
                              margin: 0
                            }}>
                              {selectedAssetForInsert.split('/').pop()}
                            </p>
                            <p style={{
                              fontSize: '11px',
                              color: '#64748b',
                              margin: '4px 0 0 0'
                            }}>
                              Will be inserted at {insertTime.toFixed(1)}s with 3s duration
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : insertMode === 'stock' ? (
                    // Find New Stock Tab
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#94a3b8',
                        marginBottom: '12px'
                      }}>
                        Search free stock video libraries
                      </label>

                      {/* Stock Source Selection */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '16px'
                      }}>
                        <button
                          onClick={() => setStockSource('pexels')}
                          style={{
                            padding: '16px',
                            background: stockSource === 'pexels' ? '#05a08115' : '#0f172a',
                            border: `2px solid ${stockSource === 'pexels' ? '#05a081' : '#334155'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: stockSource === 'pexels' ? '#05a08120' : '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 8px',
                            color: stockSource === 'pexels' ? '#05a081' : '#64748b'
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          </div>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: stockSource === 'pexels' ? '#05a081' : '#e2e8f0',
                            margin: '0 0 4px 0'
                          }}>
                            Pexels
                          </p>
                          <p style={{
                            fontSize: '11px',
                            color: '#64748b',
                            margin: 0
                          }}>
                            HD/4K stock videos
                          </p>
                        </button>

                        <button
                          onClick={() => setStockSource('pixabay')}
                          style={{
                            padding: '16px',
                            background: stockSource === 'pixabay' ? '#00ab6c15' : '#0f172a',
                            border: `2px solid ${stockSource === 'pixabay' ? '#00ab6c' : '#334155'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: stockSource === 'pixabay' ? '#00ab6c20' : '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 8px',
                            color: stockSource === 'pixabay' ? '#00ab6c' : '#64748b'
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="12" r="10"/>
                            </svg>
                          </div>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: stockSource === 'pixabay' ? '#00ab6c' : '#e2e8f0',
                            margin: '0 0 4px 0'
                          }}>
                            Pixabay
                          </p>
                          <p style={{
                            fontSize: '11px',
                            color: '#64748b',
                            margin: 0
                          }}>
                            Free stock footage
                          </p>
                        </button>
                      </div>

                      {/* Open Browser Button */}
                      <button
                        onClick={() => setShowStockBrowser(true)}
                        style={{
                          width: '100%',
                          padding: '14px',
                          background: stockSource === 'pexels' ? '#05a081' : '#00ab6c',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Browse {stockSource === 'pexels' ? 'Pexels' : 'Pixabay'} Videos
                      </button>

                      <p style={{
                        fontSize: '11px',
                        color: '#64748b',
                        margin: '12px 0 0 0',
                        textAlign: 'center'
                      }}>
                        Free to use. No attribution required.
                      </p>
                    </div>
                  ) : (
                    // Generate with AI Tab
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#94a3b8',
                        marginBottom: '8px'
                      }}>
                        Describe the B-Roll you want to generate
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="e.g., Professional business meeting in a modern office with natural lighting..."
                        disabled={aiGenerating}
                        style={{
                          width: '100%',
                          height: '80px',
                          padding: '10px 12px',
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#f1f5f9',
                          fontSize: '14px',
                          resize: 'none',
                          fontFamily: 'inherit'
                        }}
                      />

                      {/* Style Selection */}
                      <div style={{ marginTop: '16px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#94a3b8',
                          marginBottom: '8px'
                        }}>
                          Visual Style
                        </label>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '8px'
                        }}>
                          {(['cinematic', 'realistic', 'documentary'] as const).map(style => (
                            <button
                              key={style}
                              onClick={() => setAiStyle(style)}
                              disabled={aiGenerating}
                              style={{
                                padding: '10px',
                                background: aiStyle === style ? '#a855f720' : '#0f172a',
                                border: `1px solid ${aiStyle === style ? '#a855f7' : '#334155'}`,
                                borderRadius: '6px',
                                color: aiStyle === style ? '#a855f7' : '#94a3b8',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: aiGenerating ? 'not-allowed' : 'pointer',
                                textTransform: 'capitalize'
                              }}
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Model Selection */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginTop: '16px'
                      }}>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            color: '#94a3b8',
                            marginBottom: '6px'
                          }}>
                            Image Model
                          </label>
                          <select
                            value={aiImageModel}
                            onChange={(e) => setAiImageModel(e.target.value as ImageModel)}
                            disabled={aiGenerating}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              background: '#0f172a',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              color: '#f1f5f9',
                              fontSize: '13px'
                            }}
                          >
                            <option value="imagen4-fast">Imagen 4 Fast</option>
                            <option value="imagen4">Imagen 4</option>
                            <option value="nano-banana">Nano Banana</option>
                            <option value="ideogram-v3">Ideogram V3</option>
                            <option value="seedream">Seedream</option>
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="flux-kontext">Flux Kontext</option>
                          </select>
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '12px',
                            color: '#94a3b8',
                            marginBottom: '6px'
                          }}>
                            Video Model
                          </label>
                          <select
                            value={aiVideoModel}
                            onChange={(e) => setAiVideoModel(e.target.value as VideoModel)}
                            disabled={aiGenerating}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              background: '#0f172a',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              color: '#f1f5f9',
                              fontSize: '13px'
                            }}
                          >
                            <option value="sora-2">Sora 2</option>
                            <option value="seedance">Seedance</option>
                            <option value="hailuo">Hailuo</option>
                            <option value="veo3">Veo 3</option>
                            <option value="grok">Grok</option>
                          </select>
                        </div>
                      </div>

                      {/* Progress Display */}
                      {aiProgress && (
                        <div style={{
                          marginTop: '16px',
                          padding: '12px',
                          background: aiProgress.stage === 'error' ? '#dc262620' : '#a855f710',
                          border: `1px solid ${aiProgress.stage === 'error' ? '#dc2626' : '#a855f750'}`,
                          borderRadius: '8px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            {aiProgress.stage !== 'error' && aiProgress.stage !== 'complete' && (
                              <div style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid #a855f7',
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }} />
                            )}
                            {aiProgress.stage === 'complete' && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                            {aiProgress.stage === 'error' && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                              </svg>
                            )}
                            <span style={{
                              fontSize: '13px',
                              color: aiProgress.stage === 'error' ? '#dc2626' : '#e2e8f0'
                            }}>
                              {aiProgress.message}
                            </span>
                          </div>
                          {aiProgress.imageUrl && (
                            <div style={{ marginTop: '10px' }}>
                              <img
                                src={aiProgress.imageUrl}
                                alt="Generated"
                                style={{
                                  width: '100%',
                                  height: '100px',
                                  objectFit: 'cover',
                                  borderRadius: '4px'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Generate Button */}
                      <button
                        onClick={handleAiGenerate}
                        disabled={!aiPrompt.trim() || aiGenerating}
                        style={{
                          width: '100%',
                          marginTop: '16px',
                          padding: '14px',
                          background: (!aiPrompt.trim() || aiGenerating) ? '#334155' : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: (!aiPrompt.trim() || aiGenerating) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        {aiGenerating ? (
                          <>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              border: '2px solid #fff',
                              borderTopColor: 'transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                            Generating...
                          </>
                        ) : (
                          <>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2L2 7l10 5 10-5-10-5z" />
                              <path d="M2 17l10 5 10-5" />
                              <path d="M2 12l10 5 10-5" />
                            </svg>
                            Generate B-Roll
                          </>
                        )}
                      </button>

                      <p style={{
                        fontSize: '11px',
                        color: '#64748b',
                        margin: '12px 0 0 0',
                        textAlign: 'center'
                      }}>
                        Uses AI to generate image, then converts to video (~2-5 min)
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #334155',
                  background: '#0f172a',
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={handleCloseInsertModal}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: '1px solid #475569',
                      borderRadius: '6px',
                      color: '#94a3b8',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  {insertMode === 'existing' && (
                    <button
                      onClick={handleInsert}
                      disabled={!selectedAssetForInsert}
                      style={{
                        padding: '10px 20px',
                        background: selectedAssetForInsert ? '#22c55e' : '#334155',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: selectedAssetForInsert ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Insert B-Roll
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stock Browser Modal */}
          {showStockBrowser && (
            <StockBrowser
              source={stockSource}
              onSelect={handleStockVideoSelect}
              onClose={() => setShowStockBrowser(false)}
              initialQuery=""
            />
          )}

          {/* Stock Download Progress Overlay */}
          {stockDownloading && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
            }}>
              <div style={{
                background: '#1e293b',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                minWidth: '300px',
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#f1f5f9',
                  marginBottom: '16px',
                }}>
                  Downloading Stock Video...
                </div>
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#334155',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    width: `${stockDownloadProgress?.percent || 0}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                }}>
                  {stockDownloadProgress?.percent || 0}% complete
                  {stockDownloadProgress && stockDownloadProgress.total > 0 && (
                    <span style={{ marginLeft: '8px' }}>
                      ({(stockDownloadProgress.loaded / 1024 / 1024).toFixed(1)} / {(stockDownloadProgress.total / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#64748b',
                  marginTop: '8px',
                }}>
                  Saving to permanent storage...
                </div>
              </div>
            </div>
          )}

          {/* Cutaway Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(scene.cutaways || []).map((cutaway, idx) => {
              const asset = getAssetFromPath(cutaway.video);
              return (
                <CutawayDetail
                  key={idx}
                  cutaway={cutaway}
                  asset={asset}
                  index={idx}
                  onApprove={onApprove}
                  onReject={onReject}
                  onRegenerate={onRegenerate}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

interface CutawayDetailProps {
  cutaway: SceneCutaway['cutaways'][0];
  asset: BRollAsset | undefined;
  index: number;
  onApprove: (assetId: string) => void;
  onReject: (assetId: string) => void;
  onRegenerate: (assetId: string) => void;
}

const CutawayDetail: React.FC<CutawayDetailProps> = ({
  cutaway,
  asset,
  index,
  onApprove,
  onReject,
  onRegenerate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Check if this is an external URL (stock video or AI-generated)
  const isExternalUrl = cutaway.video.startsWith('http://') || cutaway.video.startsWith('https://');
  // Use the external URL directly, or fall back to asset.path
  const videoSrc = isExternalUrl ? cutaway.video : asset?.path;
  // For external URLs without assets, we treat them as "pending" status
  const isExternalOnly = isExternalUrl && !asset;

  const statusColors = (asset || isExternalOnly) ? {
    approved: '#22c55e',
    pending: '#f59e0b',
    rejected: '#ef4444',
    regenerating: '#8b5cf6'
  }[asset?.status || 'pending'] : '#475569';

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '12px',
      background: '#0f172a',
      borderRadius: '8px',
      border: `1px solid ${statusColors}30`
    }}>
      {/* Video Preview */}
      <div
        style={{
          width: '180px',
          flexShrink: 0,
          aspectRatio: '16/9',
          background: '#1e293b',
          borderRadius: '6px',
          overflow: 'hidden',
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={togglePlay}
      >
        {videoSrc ? (
          <>
            <video
              ref={videoRef}
              src={getVideoUrl(videoSrc)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              muted
              loop
              playsInline
              crossOrigin="anonymous"
            />
            {!isPlaying && asset?.status !== 'regenerating' && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0f172a">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </div>
              </div>
            )}
            {/* Regenerating spinner overlay */}
            {asset?.status === 'regenerating' && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.85)',
                gap: '8px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #8b5cf630',
                  borderTopColor: '#8b5cf6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#8b5cf6'
                }}>
                  Regenerating...
                </span>
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            )}
          </>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            fontSize: '12px'
          }}>
            Video not found
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px'
        }}>
          <span style={{
            padding: '2px 8px',
            background: '#475569',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            color: '#e2e8f0'
          }}>
            B-ROLL {index + 1}
          </span>
          {(asset || isExternalOnly) && (
            <span style={{
              padding: '2px 8px',
              background: `${statusColors}20`,
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              color: statusColors,
              textTransform: 'uppercase'
            }}>
              {asset?.status || (isExternalOnly ? 'stock' : 'pending')}
            </span>
          )}
        </div>

        <h4 style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#f1f5f9',
          margin: '0 0 4px 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {cutaway.video.split('/').pop()}
        </h4>

        {asset && (
          <p style={{
            fontSize: '12px',
            color: '#94a3b8',
            margin: '0 0 8px 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {asset.description}
          </p>
        )}

        <div style={{
          display: 'flex',
          gap: '12px',
          fontSize: '11px',
          color: '#64748b',
          marginBottom: '10px'
        }}>
          <span>Start: <strong style={{ color: '#94a3b8' }}>{cutaway.startTime}s</strong></span>
          <span>Duration: <strong style={{ color: '#94a3b8' }}>{cutaway.duration}s</strong></span>
          <span>Speed: <strong style={{ color: '#94a3b8' }}>{cutaway.playbackRate}x</strong></span>
        </div>

        {/* Actions */}
        {asset && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <MiniButton
              onClick={() => onApprove(asset.id)}
              disabled={asset.status === 'approved'}
              color="#22c55e"
            >
              Approve
            </MiniButton>
            <MiniButton
              onClick={() => onReject(asset.id)}
              disabled={asset.status === 'rejected'}
              color="#ef4444"
            >
              Reject
            </MiniButton>
            <MiniButton
              onClick={() => onRegenerate(asset.id)}
              disabled={asset.status === 'regenerating'}
              color="#8b5cf6"
            >
              Regenerate
            </MiniButton>
          </div>
        )}
      </div>
    </div>
  );
};

const MiniButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  color: string;
}> = ({ children, onClick, disabled, color }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '4px 10px',
      background: disabled ? '#1e293b' : `${color}20`,
      border: `1px solid ${disabled ? '#334155' : color}40`,
      borderRadius: '4px',
      color: disabled ? '#475569' : color,
      fontSize: '10px',
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer'
    }}
  >
    {children}
  </button>
);
