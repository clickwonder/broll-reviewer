#!/bin/bash
# Script to combine all 15 scene videos into one optimized preview

set -e

SCENES_DIR="public/scenes"
OUTPUT_DIR="public/scenes"

echo "=== Creating Combined Video from 15 Scenes ==="
echo ""

# Step 1: Create concat file for ffmpeg (with absolute paths)
echo "Step 1: Creating concat list..."
cd "$SCENES_DIR"
PWD_ESCAPED=$(pwd | sed 's/\//\\\//g')
cat > concat_list.txt << EOF
file '$(pwd)/scene_01.mp4'
file '$(pwd)/scene_02.mp4'
file '$(pwd)/scene_03.mp4'
file '$(pwd)/scene_04.mp4'
file '$(pwd)/scene_05.mp4'
file '$(pwd)/scene_06.mp4'
file '$(pwd)/scene_07.mp4'
file '$(pwd)/scene_08.mp4'
file '$(pwd)/scene_09.mp4'
file '$(pwd)/scene_10.mp4'
file '$(pwd)/scene_11.mp4'
file '$(pwd)/scene_12.mp4'
file '$(pwd)/scene_13.mp4'
file '$(pwd)/scene_14.mp4'
file '$(pwd)/scene_15.mp4'
EOF

# Step 2: Concatenate all scenes (copy codec, no re-encoding)
echo "Step 2: Concatenating 15 scenes (fast, no re-encoding)..."
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy combined_full_1080p.mp4 -y

echo ""
echo "✓ Full 1080p combined video created: $OUTPUT_DIR/combined_full_1080p.mp4"

# Step 3: Create 720p web-optimized version
echo ""
echo "Step 3: Creating 720p web-optimized preview (this may take 1-2 minutes)..."
ffmpeg -i combined_full_1080p.mp4 \
  -vf scale=1280:720 \
  -c:v libx264 \
  -crf 28 \
  -preset faster \
  -movflags +faststart \
  -c:a aac \
  -b:a 128k \
  preview_720p.mp4 -y

echo ""
echo "✓ 720p web preview created: $OUTPUT_DIR/preview_720p.mp4"

# Step 4: Show file sizes
echo ""
echo "=== File Size Comparison ==="
ls -lh scene_*.mp4 | awk '{sum+=$5} END {print "Individual scenes total: " sum/1024/1024 " MB"}'
ls -lh combined_full_1080p.mp4 | awk '{print "Combined 1080p: " $5}'
ls -lh preview_720p.mp4 | awk '{print "Preview 720p: " $5 " (recommended for web)"}'

echo ""
echo "=== Scene Seek Times (for VerticalTimeline) ==="
cat << 'EOF'
Scene 1:  0.00s
Scene 2:  10.24s
Scene 3:  24.32s
Scene 4:  43.81s
Scene 5:  58.00s
Scene 6:  75.71s
Scene 7:  93.37s
Scene 8:  110.06s
Scene 9:  125.68s
Scene 10: 142.97s
Scene 11: 164.68s
Scene 12: 182.03s
Scene 13: 205.59s
Scene 14: 223.90s
Scene 15: 244.82s
Total:    254.77s (4m 14.77s)
EOF

echo ""
echo "=== Done! ==="
echo "Next: Update VerticalTimeline.tsx to use preview_720p.mp4 with seek times"
