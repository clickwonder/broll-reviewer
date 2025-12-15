// Scene seek times for combined preview video
// Generated from scene durations - DO NOT EDIT MANUALLY

export interface SceneSeekTime {
  sceneIndex: number;
  startTime: number; // seconds
  duration: number; // seconds
}

export const SCENE_SEEK_TIMES: SceneSeekTime[] = [
  { sceneIndex: 1, startTime: 0.00, duration: 10.24 },
  { sceneIndex: 2, startTime: 10.24, duration: 14.08 },
  { sceneIndex: 3, startTime: 24.32, duration: 19.49 },
  { sceneIndex: 4, startTime: 43.81, duration: 14.18 },
  { sceneIndex: 5, startTime: 58.00, duration: 17.71 },
  { sceneIndex: 6, startTime: 75.71, duration: 17.66 },
  { sceneIndex: 7, startTime: 93.37, duration: 16.69 },
  { sceneIndex: 8, startTime: 110.06, duration: 15.62 },
  { sceneIndex: 9, startTime: 125.68, duration: 17.29 },
  { sceneIndex: 10, startTime: 142.97, duration: 21.71 },
  { sceneIndex: 11, startTime: 164.68, duration: 17.35 },
  { sceneIndex: 12, startTime: 182.03, duration: 23.56 },
  { sceneIndex: 13, startTime: 205.59, duration: 18.31 },
  { sceneIndex: 14, startTime: 223.90, duration: 20.92 },
  { sceneIndex: 15, startTime: 244.82, duration: 9.95 }
];

export const TOTAL_DURATION = 254.77; // seconds (4m 14.77s)

// Helper: Get scene by index (1-based)
export function getSceneSeekTime(sceneIndex: number): SceneSeekTime | undefined {
  return SCENE_SEEK_TIMES.find(s => s.sceneIndex === sceneIndex);
}

// Helper: Get current scene based on playback time
export function getCurrentScene(currentTime: number): SceneSeekTime | undefined {
  return SCENE_SEEK_TIMES.find(scene =>
    currentTime >= scene.startTime &&
    currentTime < scene.startTime + scene.duration
  );
}
