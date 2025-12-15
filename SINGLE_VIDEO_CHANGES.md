# Single Video Playback - Implementation Guide

## Changes Made

### 1. Video Files Created
- ✅ `public/scenes/combined_full_1080p.mp4` - Full quality (59MB)
- ✅ `public/scenes/preview_720p.mp4` - Web optimized (11MB) **← USE THIS**

### 2. Seek Time Configuration
- ✅ Created `/src/sceneSeekTimes.ts` with all scene start times

## Required VerticalTimeline.tsx Changes

### State to REMOVE:
```typescript
// DELETE these dual-buffer states:
const [activeVideoSlot, setActiveVideoSlot] = useState<'A' | 'B'>('A');
const [videoSlotA, setVideoSlotA] = useState<string>('/scenes/scene_01.mp4');
const [videoSlotB, setVideoSlotB] = useState<string | null>(null);
const videoRefA = useRef<HTMLVideoElement>(null);
const videoRefB = useRef<HTMLVideoElement>(null);
const crossfadeTimeoutRef = useRef<number | null>(null);
const CROSSFADE_DURATION = 150;
const isTransitioningRef = useRef(false);
const [currentSceneVideo, setCurrentSceneVideo] = useState<string>(...);
const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);
const currentSceneIndexRef = useRef<number>(0);
const isSwitchingSceneRef = useRef(false);
const sceneStartTimeRef = useRef<number>(0);
const sceneElapsedRef = useRef<number>(0);
```

### State to ADD:
```typescript
import { SCENE_SEEK_TIMES, getCurrentScene } from '../sceneSeekTimes';

const videoRef = useRef<HTMLVideoElement>(null); // Single video ref
```

### Video Element Changes:

**REPLACE** (lines ~950-1000):
```typescript
{/* Video Slot A */}
<video ref={videoRefA} src={videoSlotA} ... />

{/* Video Slot B */}
{videoSlotB && <video ref={videoRefB} src={videoSlotB} ... />}
```

**WITH**:
```typescript
{/* Single combined video */}
<video
  ref={videoRef}
  src="/scenes/preview_720p.mp4"
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
      setCurrentTime(videoRef.current.currentTime);

      // Update active scene based on current time
      const scene = getCurrentScene(videoRef.current.currentTime);
      if (scene) {
        const sceneId = `scene_${String(scene.sceneIndex).padStart(2, '0')}`;
        setActiveScene(sceneId);
      }
    }
  }}
/>
```

### togglePlay() Function Changes:

**REPLACE**:
```typescript
const togglePlay = () => {
  const activeVideo = getActiveVideoRef().current;
  if (activeVideo) {
    if (isPlaying) {
      activeVideo.pause();
      // Also pause cutaway...
    } else {
      activeVideo.play();
      // Also play cutaway...
    }
    setIsPlaying(!isPlaying);
  }
};
```

**WITH**:
```typescript
const togglePlay = () => {
  if (videoRef.current) {
    if (isPlaying) {
      videoRef.current.pause();
      if (cutawayVideoRef.current) cutawayVideoRef.current.pause();
    } else {
      videoRef.current.play();
      if (cutawayVideoRef.current && showWithCutaways && activeCutawayAsset) {
        cutawayVideoRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  }
};
```

### seekTo() Function Changes:

**REPLACE** complex scene-switching logic **WITH**:
```typescript
const seekTo = (time: number) => {
  if (videoRef.current) {
    videoRef.current.currentTime = time;
    setCurrentTime(time);

    // Update active scene
    const scene = getCurrentScene(time);
    if (scene) {
      const sceneId = `scene_${String(scene.sceneIndex).padStart(2, '0')}`;
      setActiveScene(sceneId);
    }
  }
};
```

### Animation Frame Loop (DELETE):
All the complex scene transition logic (`useEffect` with animation frame, `transitionToNextScene`, preloading, etc.) can be DELETED. The browser handles playback automatically.

### Benefits:
- ✅ **11MB** instead of 59MB (81% reduction)
- ✅ **ONE HTTP request** instead of 15+
- ✅ **No scene switching** - seamless playback
- ✅ **Simple seeking** - just set `video.currentTime`
- ✅ **No dual-buffer complexity**
- ✅ **No WSL performance issues**
- ✅ **Instant page load**
