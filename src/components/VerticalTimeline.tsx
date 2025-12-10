import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BRollAsset, SceneCutaway, CutawayConfig } from '../types';

interface CutawayUpdate {
  startTime?: number;
  duration?: number;
}

interface VerticalTimelineProps {
  scenes: SceneCutaway[];
  assets: BRollAsset[];
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
  onApprove,
  onReject,
  onRegenerate,
  onUpdateCutaway,
  onInsertCutaway,
  onDeleteCutaway
}) => {
  const getAssetFromPath = (path: string): BRollAsset | undefined => {
    const filename = path.split('/').pop(); // e.g., "worried_bills.mp4"
    return assets.find(a => a.filename === filename);
  };

  // Calculate cumulative timeline
  let cumulativeTime = 0;
  const scenesWithTime = scenes.map(scene => {
    const sceneDuration = Math.max(
      ...scene.cutaways.map(c => c.startTime + c.duration),
      15 // minimum scene duration
    );
    const sceneStart = cumulativeTime;
    cumulativeTime += sceneDuration;
    return { ...scene, sceneStart, sceneDuration };
  });

  const totalDuration = cumulativeTime;

  return (
    <div>
      {/* Full Video Preview Section */}
      <FullVideoPreview
        scenes={scenesWithTime}
        totalDuration={totalDuration}
        getAssetFromPath={getAssetFromPath}
        assets={assets}
        onUpdateCutaway={onUpdateCutaway}
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
              key={scene.sceneId}
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
  onUpdateCutaway?: (sceneId: string, cutawayIndex: number, updates: CutawayUpdate) => void;
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
  onUpdateCutaway
}) => {
  const baseVideoRef = useRef<HTMLVideoElement>(null);
  const cutawayVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showWithCutaways, setShowWithCutaways] = useState(true);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [activeCutaway, setActiveCutaway] = useState<string | null>(null);
  const [activeCutawayAsset, setActiveCutawayAsset] = useState<BRollAsset | null>(null);
  const [previewHeight, setPreviewHeight] = useState(480); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

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

  const handleResizeStart = (e: React.MouseEvent) => {
    startYRef.current = e.clientY;
    startHeightRef.current = previewHeight;
    setIsResizing(true);
  };

  // Update current time and active elements using animation frame for smoother updates
  useEffect(() => {
    const baseVideo = baseVideoRef.current;
    if (!baseVideo) return;

    const updateTimeline = () => {
      const time = baseVideo.currentTime;
      setCurrentTime(time);

      // Find current scene and cutaway
      let foundScene = false;
      for (const scene of scenes) {
        if (time >= scene.sceneStart && time < scene.sceneStart + scene.sceneDuration) {
          setActiveScene(scene.sceneId);
          foundScene = true;

          // Check if we're in a cutaway
          const sceneLocalTime = time - scene.sceneStart;
          let foundCutaway = false;
          for (const cutaway of scene.cutaways) {
            if (sceneLocalTime >= cutaway.startTime && sceneLocalTime < cutaway.startTime + cutaway.duration) {
              setActiveCutaway(cutaway.video);
              // Get the actual asset for this cutaway
              const asset = getAssetFromPath(cutaway.video);
              setActiveCutawayAsset(asset || null);
              foundCutaway = true;
              break;
            }
          }
          if (!foundCutaway) {
            setActiveCutaway(null);
            setActiveCutawayAsset(null);
          }
          break;
        }
      }
      if (!foundScene) {
        setActiveScene(null);
        setActiveCutaway(null);
        setActiveCutawayAsset(null);
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateTimeline);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTimeline);
    }

    // Also update on timeupdate for when scrubbing/seeking
    const handleTimeUpdate = () => {
      if (!isPlaying) {
        updateTimeline();
      }
    };

    baseVideo.addEventListener('timeupdate', handleTimeUpdate);
    baseVideo.addEventListener('seeked', updateTimeline);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      baseVideo.removeEventListener('timeupdate', handleTimeUpdate);
      baseVideo.removeEventListener('seeked', updateTimeline);
    };
  }, [scenes, isPlaying, getAssetFromPath]);

  const togglePlay = () => {
    if (baseVideoRef.current) {
      if (isPlaying) {
        baseVideoRef.current.pause();
        // Also pause cutaway video if present
        if (cutawayVideoRef.current) {
          cutawayVideoRef.current.pause();
        }
      } else {
        baseVideoRef.current.play();
        // Also play cutaway video if we're in a cutaway
        if (cutawayVideoRef.current && showWithCutaways && activeCutawayAsset) {
          cutawayVideoRef.current.play();
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const seekTo = (time: number) => {
    if (baseVideoRef.current) {
      baseVideoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Get all cutaways with absolute times for the timeline
  const allCutaways = scenes.flatMap(scene =>
    scene.cutaways.map((cutaway, cutawayIdx) => ({
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
            <div style={{ display: 'flex', alignItems: 'center' }}>
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
              {/* Base video (always shown in background) */}
              <video
                ref={baseVideoRef}
                src={'/scenes/full_video.mp4'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  top: 0,
                  left: 0
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />

              {/* Cutaway video overlay - shows the actual B-roll asset */}
              {showWithCutaways && activeCutawayAsset && (
                <video
                  key={`cutaway-${activeCutawayAsset.id}-${activeCutawayAsset.path}`}
                  ref={cutawayVideoRef}
                  src={activeCutawayAsset.path}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1
                  }}
                  autoPlay={isPlaying}
                  muted
                  loop
                  playsInline
                />
              )}

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
              {/* Scene markers */}
              <div style={{
                position: 'relative',
                height: '32px',
                background: '#0f172a',
                borderRadius: '8px 8px 0 0',
                overflow: 'hidden'
              }}>
                {scenes.map((scene, idx) => (
                  <div
                    key={scene.sceneId}
                    onClick={() => seekTo(scene.sceneStart)}
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

              {/* Cutaway markers - Interactive with drag/resize */}
              <div
                ref={cutawayTimelineRef}
                style={{
                  position: 'relative',
                  height: '28px',
                  background: '#1e293b',
                  borderRadius: '0 0 8px 8px'
                }}
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
                      key={`${cutaway.sceneId}-${idx}`}
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
                    const cutaway = scene.cutaways.find(c => c.video === activeCutaway);
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
  onDeleteCutaway
}) => {
  // _assets and _totalDuration available for future features (e.g., overall timeline)
  void _assets;
  void _totalDuration;
  const [isExpanded, setIsExpanded] = useState(true);
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertTime, setInsertTime] = useState(0);
  const [selectedAssetForInsert, setSelectedAssetForInsert] = useState<string>('');
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [previewUpdate, setPreviewUpdate] = useState<{ index: number; startTime: number; duration: number } | null>(null);

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
    const cutaway = scene.cutaways[cutawayIndex];
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
    for (const cutaway of scene.cutaways) {
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
  };

  return (
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
          {scene.cutaways.length} cutaway{scene.cutaways.length !== 1 ? 's' : ''}
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
            {scene.cutaways.map((cutaway, idx) => {
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
                        opacity: 0,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
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
                padding: '24px',
                width: '400px',
                maxWidth: '90vw',
                border: '1px solid #334155'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#f1f5f9',
                  margin: '0 0 16px 0'
                }}>
                  Insert B-Roll at {insertTime.toFixed(1)}s
                </h3>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#94a3b8',
                    marginBottom: '8px'
                  }}>
                    Select B-Roll Asset
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
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => {
                      setShowInsertModal(false);
                      setSelectedAssetForInsert('');
                    }}
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
                </div>
              </div>
            </div>
          )}

          {/* Cutaway Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scene.cutaways.map((cutaway, idx) => {
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

  const statusColors = asset ? {
    approved: '#22c55e',
    pending: '#f59e0b',
    rejected: '#ef4444',
    regenerating: '#8b5cf6'
  }[asset.status] : '#475569';

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
        {asset ? (
          <>
            <video
              ref={videoRef}
              src={asset.path}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              muted
              loop
              playsInline
            />
            {!isPlaying && asset.status !== 'regenerating' && (
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
            {asset.status === 'regenerating' && (
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
          {asset && (
            <span style={{
              padding: '2px 8px',
              background: `${statusColors}20`,
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              color: statusColors,
              textTransform: 'uppercase'
            }}>
              {asset.status}
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
