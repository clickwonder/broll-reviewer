import { useState, useEffect } from 'react';
import { BRollAsset, SceneCutaway, GenerationSettings, DEFAULT_SETTINGS, IMAGE_MODEL_INFO, VIDEO_MODEL_INFO, ImageModel, VideoModel } from './types';
import { BRollGrid } from './components/BRollGrid';
import { SceneTimeline } from './components/SceneTimeline';
import { VerticalTimeline } from './components/VerticalTimeline';
import { RegenerateModal } from './components/RegenerateModal';
import { SettingsModal } from './components/SettingsModal';
import { StockBrowser } from './components/StockBrowser';
import { Header } from './components/Header';
import { ProjectSelector } from './components/ProjectSelector';
import { buildImagePrompt, buildVideoPrompt } from './services/brollService';
import { generateBRoll, GenerationProgress, ImageModel as KieImageModel, VideoModel as KieVideoModel } from './services/kieService';
import {
  DBProject,
  DBBRollAsset,
  saveProject,
  updateProject,
  getProjectAssets,
  saveAsset,
  updateAsset,
  saveAssetVersion,
  appAssetToDbFormat,
  dbAssetToAppAsset,
  transformDBScenesToSceneCutaways,
  isDatabaseEnabled
} from './services/databaseService';

// Map types.ts model names (underscores) to kieService model names (hyphens)
const IMAGE_MODEL_MAP: Record<ImageModel, KieImageModel> = {
  imagen4_fast: 'imagen4-fast',
  imagen4: 'imagen4',
  imagen4_ultra: 'imagen4-ultra',
  nano_banana: 'nano-banana',
  nano_banana_pro: 'nano-banana-pro',
  ideogram_v3: 'ideogram-v3',
  seedream: 'seedream',
  gpt4o: 'gpt-4o',
  flux_kontext: 'flux-kontext'
};

const VIDEO_MODEL_MAP: Record<VideoModel, KieVideoModel> = {
  sora_2: 'sora-2',
  seedance: 'seedance',
  hailuo: 'hailuo',
  veo3: 'veo3',
  grok: 'grok'
};

// Initial B-roll data based on public/broll folder
// In Vite, files in public/ are served at the root path
const initialBRollAssets: BRollAsset[] = [
  {
    id: 'worried_bills',
    filename: 'worried_bills.mp4',
    path: '/broll/worried_bills.mp4',
    description: 'Person stressed looking at medical bills',
    status: 'pending',
    usedInScenes: ['Scene 01', 'Scene 02'],
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'credit_report',
    filename: 'credit_report.mp4',
    path: '/broll/credit_report.mp4',
    description: 'Credit report document close-up',
    status: 'pending',
    usedInScenes: ['Scene 01', 'Scene 04'],
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'happy_family',
    filename: 'happy_family.mp4',
    path: '/broll/happy_family.mp4',
    description: 'Family receiving good financial news',
    status: 'pending',
    usedInScenes: ['Scene 03', 'Scene 04', 'Scene 07'],
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'government_building',
    filename: 'government_building.mp4',
    path: '/broll/government_building.mp4',
    description: 'Government building with American flags',
    status: 'pending',
    usedInScenes: ['Scene 06', 'Scene 08'],
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'courtroom',
    filename: 'courtroom.mp4',
    path: '/broll/courtroom.mp4',
    description: 'Courtroom interior - legal proceedings',
    status: 'pending',
    usedInScenes: ['Scene 08'],
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'doctor_tablet',
    filename: 'doctor_tablet.mp4',
    path: '/broll/doctor_tablet.mp4',
    description: 'Doctor reviewing medical files on tablet',
    status: 'pending',
    usedInScenes: ['Scene 06', 'Scene 07'],
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'signing_document',
    filename: 'signing_document.mp4',
    path: '/broll/signing_document.mp4',
    description: 'Hand signing official document',
    status: 'pending',
    usedInScenes: ['Scene 02', 'Scene 05'],
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'calendar_deadlines',
    filename: 'calendar_deadlines.mp4',
    path: '/broll/calendar_deadlines.mp4',
    description: 'Calendar with highlighted deadline dates',
    status: 'pending',
    usedInScenes: ['Scene 03', 'Scene 05'],
    createdAt: new Date().toISOString(),
    versions: []
  },
  // Stock videos
  {
    id: 'stock_courtroom',
    filename: 'courtroom.mp4',
    path: '/videos/stock/stock_pexels_6101348_1765420340756.mp4',
    description: 'Stock video: Courtroom interior',
    status: 'pending',
    usedInScenes: ['Scene 08'],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_calendar',
    filename: 'calendar_deadlines.mp4',
    path: '/videos/stock/stock_pexels_7924459_1765420340333.mp4',
    description: 'Stock video: Calendar with deadlines',
    status: 'pending',
    usedInScenes: [],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_credit_report',
    filename: 'credit_report.mp4',
    path: '/videos/stock/stock_pexels_8519382_1765420340903.mp4',
    description: 'Stock video: Credit report document',
    status: 'pending',
    usedInScenes: [],
    source: 'pexels',
    createdAt: new Date().toISOString(),
    versions: []
  },
  // Stock videos for scenes 9-14 (Pexels)
  {
    id: 'stock_person_typing',
    filename: 'person_typing.mp4',
    path: 'https://www.pexels.com/video/946146/download',
    description: 'Stock video: Person typing on keyboard',
    status: 'pending',
    usedInScenes: ['Scene 09'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/946146/download',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_credit_score_check',
    filename: 'credit_score_check.mp4',
    path: 'https://www.pexels.com/video/946146/download',
    description: 'Stock video: Checking credit score on computer',
    status: 'pending',
    usedInScenes: ['Scene 09'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/946146/download',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_filling_form',
    filename: 'filling_form.mp4',
    path: 'https://www.pexels.com/video/8060732/download',
    description: 'Stock video: Person filling up a form (Pexels 8060732)',
    status: 'pending',
    usedInScenes: ['Scene 10'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/8060732/download',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_typing_fast',
    filename: 'typing_fast.mp4',
    path: 'https://www.pexels.com/video/852421/download',
    description: 'Stock video: Person typing fast (Pexels 852421)',
    status: 'pending',
    usedInScenes: ['Scene 10'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/852421/download',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_arranging_documents',
    filename: 'arranging_documents.mp4',
    path: 'https://www.pexels.com/video/6177732/download',
    description: 'Stock video: Person arranging documents at office desk (Pexels 6177732)',
    status: 'pending',
    usedInScenes: ['Scene 11'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/6177732/download',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_paper_printing',
    filename: 'paper_printing.mp4',
    path: 'https://www.pexels.com/video/6962434/download',
    description: 'Stock video: Paper printing office documents (Pexels 6962434)',
    status: 'pending',
    usedInScenes: ['Scene 11'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/6962434/download',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_medical_bills',
    filename: 'medical_bills.mp4',
    path: 'https://www.pexels.com/video/946146/download',
    description: 'Stock video: Medical bills and paperwork',
    status: 'pending',
    usedInScenes: ['Scene 12'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/946146/download',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_calculator_bills',
    filename: 'calculator_bills.mp4',
    path: 'https://www.pexels.com/video/946146/download',
    description: 'Stock video: Calculator and bills on desk',
    status: 'pending',
    usedInScenes: ['Scene 12'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/946146/download',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_signing_agreement',
    filename: 'signing_agreement.mp4',
    path: 'https://www.pexels.com/video/8814706/download',
    description: 'Stock video: Person signing an agreement (Pexels 8814706)',
    status: 'pending',
    usedInScenes: ['Scene 13'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/8814706/download',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_signing_contract',
    filename: 'signing_contract.mp4',
    path: 'https://www.pexels.com/video/5923409/download',
    description: 'Stock video: Person signing a contract (Pexels 5923409)',
    status: 'pending',
    usedInScenes: ['Scene 13'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/5923409/download',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_celebrating_success',
    filename: 'celebrating_success.mp4',
    path: 'https://www.pexels.com/video/6194810/download',
    description: 'Stock video: Man celebrating success (Pexels 6194810)',
    status: 'pending',
    usedInScenes: ['Scene 14'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/6194810/download',
    createdAt: new Date().toISOString(),
    versions: []
  },
  {
    id: 'stock_people_celebrating',
    filename: 'people_celebrating.mp4',
    path: 'https://www.pexels.com/video/8134766/download',
    description: 'Stock video: People celebrating success (Pexels 8134766)',
    status: 'pending',
    usedInScenes: ['Scene 14'],
    source: 'pexels',
    videoUrl: 'https://www.pexels.com/video/8134766/download',
    createdAt: new Date().toISOString(),
    versions: []
  }
];

const initialSceneCutaways: SceneCutaway[] = [
  { sceneId: 'scene_01', sceneTitle: 'Scene 01 - Medical Debt Title', cutaways: [
    { video: 'broll/worried_bills.mp4', startTime: 0.5, duration: 3.5, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
    { video: 'broll/credit_report.mp4', startTime: 5.5, duration: 3.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1 }
  ]},
  { sceneId: 'scene_02', sceneTitle: 'Scene 02 - Scope of Problem', cutaways: [
    { video: 'broll/worried_bills.mp4', startTime: 1.0, duration: 4.0, style: 'fullscreen', videoStartTime: 1, playbackRate: 0.9 },
    { video: 'broll/signing_document.mp4', startTime: 7.5, duration: 3.5, style: 'fullscreen', videoStartTime: 0, playbackRate: 1 }
  ]},
  { sceneId: 'scene_03', sceneTitle: 'Scene 03 - April 2023', cutaways: [
    { video: 'broll/happy_family.mp4', startTime: 2.0, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
    { video: 'broll/calendar_deadlines.mp4', startTime: 10.0, duration: 3.5, style: 'fullscreen', videoStartTime: 0, playbackRate: 1 }
  ]},
  { sceneId: 'scene_04', sceneTitle: 'Scene 04 - Credit Score', cutaways: [
    { video: 'broll/credit_report.mp4', startTime: 1.5, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
    { video: 'broll/happy_family.mp4', startTime: 8.0, duration: 3.5, style: 'fullscreen', videoStartTime: 2, playbackRate: 1 }
  ]},
  { sceneId: 'scene_05', sceneTitle: 'Scene 05 - Current Rules', cutaways: [
    { video: 'broll/signing_document.mp4', startTime: 1.5, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
    { video: 'broll/calendar_deadlines.mp4', startTime: 9.5, duration: 3.5, style: 'fullscreen', videoStartTime: 1, playbackRate: 1 }
  ]},
  { sceneId: 'scene_06', sceneTitle: 'Scene 06 - CFPB Rule', cutaways: [
    { video: 'broll/government_building.mp4', startTime: 1.5, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
    { video: 'broll/doctor_tablet.mp4', startTime: 9.5, duration: 3.5, style: 'fullscreen', videoStartTime: 0, playbackRate: 1 }
  ]},
  { sceneId: 'scene_07', sceneTitle: 'Scene 07 - Why Matters', cutaways: [
    { video: 'broll/doctor_tablet.mp4', startTime: 1.5, duration: 4.0, style: 'fullscreen', videoStartTime: 1, playbackRate: 0.9 },
    { video: 'broll/happy_family.mp4', startTime: 9.0, duration: 3.5, style: 'fullscreen', videoStartTime: 0, playbackRate: 1 }
  ]},
  { sceneId: 'scene_08', sceneTitle: 'Scene 08 - Legal Challenges', cutaways: [
    { video: 'broll/courtroom.mp4', startTime: 1.5, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
    { video: 'broll/government_building.mp4', startTime: 8.5, duration: 3.5, style: 'fullscreen', videoStartTime: 1, playbackRate: 1 }
  ]},
  { sceneId: 'scene_09', sceneTitle: 'Scene 09 - Check Your Report', cutaways: [
    { video: 'https://www.pexels.com/video/946146/download', startTime: 1.5, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
    { video: 'https://www.pexels.com/video/6801876/download', startTime: 8.0, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1 }
  ]},
  { sceneId: 'scene_10', sceneTitle: 'Scene 10 - Disputing Errors', cutaways: [
    { video: 'https://www.pexels.com/video/8060732/download', startTime: 1.5, duration: 4.5, style: 'fullscreen', videoStartTime: 1, playbackRate: 0.9 },
    { video: 'https://www.pexels.com/video/852421/download', startTime: 9.0, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 1 }
  ]},
  { sceneId: 'scene_11', sceneTitle: 'Scene 11 - Document Everything', cutaways: [
    { video: 'https://www.pexels.com/video/6177732/download', startTime: 1.5, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
    { video: 'https://www.pexels.com/video/6962434/download', startTime: 7.5, duration: 3.5, style: 'fullscreen', videoStartTime: 1, playbackRate: 1 }
  ]},
  { sceneId: 'scene_12', sceneTitle: 'Scene 12 - Debt Over $500', cutaways: [
    { video: 'https://www.pexels.com/video/5981723/download', startTime: 1.5, duration: 4.5, style: 'fullscreen', videoStartTime: 2, playbackRate: 0.9 },
    { video: 'https://www.pexels.com/video/9057559/download', startTime: 9.0, duration: 3.5, style: 'fullscreen', videoStartTime: 0, playbackRate: 1 }
  ]},
  { sceneId: 'scene_13', sceneTitle: 'Scene 13 - Pay-for-Delete Strategy', cutaways: [
    { video: 'https://www.pexels.com/video/8814706/download', startTime: 1.5, duration: 4.0, style: 'fullscreen', videoStartTime: 0, playbackRate: 0.9 },
    { video: 'https://www.pexels.com/video/5923409/download', startTime: 8.0, duration: 3.5, style: 'fullscreen', videoStartTime: 2, playbackRate: 1 }
  ]},
  { sceneId: 'scene_14', sceneTitle: 'Scene 14 - Final Call to Action', cutaways: [
    { video: 'https://www.pexels.com/video/6194810/download', startTime: 1.5, duration: 4.5, style: 'fullscreen', videoStartTime: 1, playbackRate: 0.9 },
    { video: 'https://www.pexels.com/video/8134766/download', startTime: 9.0, duration: 4.0, style: 'fullscreen', videoStartTime: 1, playbackRate: 1 }
  ]}
];

// CutawayConfig type for timeline editing
import { CutawayConfig } from './types';

type ViewMode = 'grid' | 'timeline' | 'vertical';

function App() {
  const [currentProject, setCurrentProject] = useState<DBProject | null>(null);
  const [assets, setAssets] = useState<BRollAsset[]>(initialBRollAssets);
  const [sceneCutaways, setSceneCutaways] = useState<SceneCutaway[]>(initialSceneCutaways);
  const [viewMode, setViewMode] = useState<ViewMode>('vertical');
  const [selectedAsset, setSelectedAsset] = useState<BRollAsset | null>(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStockBrowser, setShowStockBrowser] = useState(false);
  const [stockBrowserSource, setStockBrowserSource] = useState<'pexels' | 'pixabay'>('pexels');
  const [stockBrowserQuery, setStockBrowserQuery] = useState('');
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [regenerationLog, setRegenerationLog] = useState<string[]>([]);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Timeline editing handlers
  const handleUpdateCutaway = async (sceneId: string, cutawayIndex: number, updates: { startTime?: number; duration?: number }) => {
    // Compute the new scenes array
    const updatedScenes = sceneCutaways.map(scene => {
      if (scene.sceneId !== sceneId) return scene;
      return {
        ...scene,
        cutaways: scene.cutaways.map((cutaway, idx) => {
          if (idx !== cutawayIndex) return cutaway;
          return {
            ...cutaway,
            ...(updates.startTime !== undefined && { startTime: updates.startTime }),
            ...(updates.duration !== undefined && { duration: updates.duration })
          };
        })
      };
    });

    // Update local state
    setSceneCutaways(updatedScenes);
    console.log(`[Timeline Edit] Updated cutaway ${cutawayIndex} in ${sceneId}:`, updates);

    // Persist to database
    if (currentProject) {
      try {
        await updateProject(currentProject.id, { scenes: updatedScenes });
        console.log('[Timeline Edit] Scenes persisted to database');
      } catch (error) {
        console.error('[Timeline Edit] Failed to persist scenes:', error);
      }
    }
  };

  const handleInsertCutaway = async (sceneId: string, cutaway: CutawayConfig) => {
    // Check if we need to create an asset for this video
    const videoPath = cutaway.video;
    console.log(`[handleInsertCutaway] Checking for asset with path: ${videoPath}`);
    console.log(`[handleInsertCutaway] Current assets count: ${assets.length}`);

    const existingAsset = assets.find(a =>
      a.path === videoPath ||
      a.videoUrl === videoPath ||
      a.path?.split('/').pop() === videoPath.split('/').pop()
    );

    console.log(`[handleInsertCutaway] Existing asset found:`, existingAsset ? existingAsset.filename : 'NONE');

    // If no asset exists, create one (for stock videos or external URLs)
    if (!existingAsset) {
      console.log(`[handleInsertCutaway] Creating new asset for: ${videoPath}`);
      const filename = videoPath.split('/').pop() || 'unknown.mp4';
      const isExternalUrl = videoPath.startsWith('http://') || videoPath.startsWith('https://');
      const source = videoPath.includes('pexels.com') ? 'pexels' :
                     videoPath.includes('pixabay.com') ? 'pixabay' : 'local';

      const newAsset: BRollAsset = {
        id: crypto.randomUUID(),
        filename,
        path: videoPath, // Use the URL as path (satisfies NOT NULL constraint)
        videoUrl: isExternalUrl ? videoPath : undefined, // Store external URL in videoUrl
        description: `Stock video from ${source}`,
        status: 'pending',
        usedInScenes: [sceneId],
        source: source as 'ai' | 'pexels' | 'pixabay' | 'local',
        createdAt: new Date().toISOString(),
        versions: []
      };

      // Add to assets array
      console.log(`[handleInsertCutaway] About to add asset to state:`, newAsset);
      setAssets(prev => {
        const updated = [...prev, newAsset];
        console.log(`[handleInsertCutaway] Assets array updated. New count: ${updated.length}`);
        return updated;
      });
      console.log(`[handleInsertCutaway] Asset added to state successfully`);

      // Save to database
      if (currentProject && isDatabaseEnabled()) {
        try {
          await saveAsset(currentProject.id, appAssetToDbFormat(newAsset, newAsset.source));
          console.log('[Timeline Edit] Asset saved to database');
        } catch (error) {
          console.error('[Timeline Edit] Failed to save asset:', error);
        }
      }
    }

    // Compute the new scenes array
    const updatedScenes = sceneCutaways.map(scene => {
      if (scene.sceneId !== sceneId) return scene;
      return {
        ...scene,
        cutaways: [...scene.cutaways, cutaway].sort((a, b) => a.startTime - b.startTime)
      };
    });

    // Update local state
    setSceneCutaways(updatedScenes);
    console.log(`[Timeline Edit] Inserted cutaway in ${sceneId}:`, cutaway);

    // Persist to database
    if (currentProject) {
      try {
        await updateProject(currentProject.id, { scenes: updatedScenes });
        console.log('[Timeline Edit] Scenes persisted to database');
      } catch (error) {
        console.error('[Timeline Edit] Failed to persist scenes:', error);
      }
    }
  };

  const handleDeleteCutaway = async (sceneId: string, cutawayIndex: number) => {
    // Compute the new scenes array
    const updatedScenes = sceneCutaways.map(scene => {
      if (scene.sceneId !== sceneId) return scene;
      return {
        ...scene,
        cutaways: scene.cutaways.filter((_, idx) => idx !== cutawayIndex)
      };
    });

    // Update local state
    setSceneCutaways(updatedScenes);
    console.log(`[Timeline Edit] Deleted cutaway ${cutawayIndex} from ${sceneId}`);

    // Persist to database
    if (currentProject) {
      try {
        await updateProject(currentProject.id, { scenes: updatedScenes });
        console.log('[Timeline Edit] Scenes persisted to database');
      } catch (error) {
        console.error('[Timeline Edit] Failed to persist scenes:', error);
      }
    }
  };

  // Load project assets and scenes when project is selected
  useEffect(() => {
    const loadProjectData = async () => {
      if (!currentProject) return;

      // Use project settings if available
      if (currentProject.settings) {
        setSettings(currentProject.settings);
      }

      // Load assets first (needed for scene transformation)
      let dbAssets: DBBRollAsset[] = [];
      try {
        dbAssets = await getProjectAssets(currentProject.id);
        if (dbAssets.length > 0) {
          setAssets(dbAssets.map(dbAssetToAppAsset));
        } else {
          setAssets(initialBRollAssets);
          for (const asset of initialBRollAssets) {
            await saveAsset(currentProject.id, appAssetToDbFormat(asset));
          }
        }
      } catch (error) {
        console.error('Failed to load project assets:', error);
        setAssets(initialBRollAssets);
      }

      // Load and transform scenes from project
      if (currentProject.scenes && currentProject.scenes.length > 0) {
        // Transform scenes from DB format to SceneCutaway format
        const transformedScenes = transformDBScenesToSceneCutaways(
          currentProject.scenes as unknown as Parameters<typeof transformDBScenesToSceneCutaways>[0],
          dbAssets
        );
        setSceneCutaways(transformedScenes);
        console.log('[Project Load] Loaded and transformed scenes from database:', transformedScenes.length);
      } else {
        // Fall back to initial scenes
        setSceneCutaways(initialSceneCutaways);
        console.log('[Project Load] Using initial scenes (no saved scenes in database)');
      }
    };

    loadProjectData();
  }, [currentProject?.id]);

  const handleSelectProject = (project: DBProject) => {
    setCurrentProject(project);
    setRegenerationLog([]);
  };

  const handleCreateProject = async (name: string, description: string) => {
    try {
      const newProject = await saveProject(name, description, DEFAULT_SETTINGS, initialSceneCutaways);
      if (newProject) {
        setCurrentProject(newProject);
        setAssets(initialBRollAssets);
        setSceneCutaways(initialSceneCutaways);
        // Save initial assets to the new project
        for (const asset of initialBRollAssets) {
          await saveAsset(newProject.id, appAssetToDbFormat(asset));
        }
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleCloseProject = () => {
    setCurrentProject(null);
    setAssets(initialBRollAssets);
    setSceneCutaways(initialSceneCutaways);
    setRegenerationLog([]);
  };

  const handleApprove = async (assetId: string) => {
    setAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, status: 'approved' as const } : a
    ));
    // Update in database
    if (currentProject) {
      try {
        await updateAsset(assetId, { status: 'approved' });
      } catch (error) {
        console.error('Failed to update asset status:', error);
      }
    }
  };

  const handleReject = async (assetId: string) => {
    setAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, status: 'rejected' as const } : a
    ));
    // Update in database
    if (currentProject) {
      try {
        await updateAsset(assetId, { status: 'rejected' });
      } catch (error) {
        console.error('Failed to update asset status:', error);
      }
    }
  };

  const handleRegenerate = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      setSelectedAsset(asset);
      setShowRegenerateModal(true);
    }
  };

  const handleRegenerateSubmit = async (prompt: string, style: string) => {
    if (!selectedAsset) return;

    const assetId = selectedAsset.id;

    // Update status to regenerating
    setAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, status: 'regenerating' as const } : a
    ));

    setIsGenerating(true);
    setShowRegenerateModal(false);

    // Build enhanced prompts
    const imagePrompt = buildImagePrompt(prompt, style);
    const videoPrompt = buildVideoPrompt(prompt);

    // Map model names from types.ts (underscores) to kieService (hyphens)
    const kieImageModel = IMAGE_MODEL_MAP[settings.imageModel];
    const kieVideoModel = VIDEO_MODEL_MAP[settings.videoModel];

    // Log the start of generation
    const logEntry = [
      `=== STARTING REAL GENERATION ===`,
      `Asset: ${selectedAsset.filename}`,
      `Style: ${style}`,
      `Image Model: ${IMAGE_MODEL_INFO[settings.imageModel].name} (${kieImageModel})`,
      `Video Model: ${VIDEO_MODEL_INFO[settings.videoModel].name} (${kieVideoModel})`,
      `Image Prompt: ${imagePrompt}`,
      `Video Prompt: ${videoPrompt}`,
      ``,
    ];
    setRegenerationLog(prev => [...prev, ...logEntry]);
    console.log(logEntry.join('\n'));

    try {
      // Call the real Kie API
      const result = await generateBRoll(
        imagePrompt,
        style,
        kieImageModel,
        kieVideoModel,
        (progress: GenerationProgress) => {
          setGenerationProgress(progress);
          console.log(`[Generation Progress] ${progress.stage}: ${progress.message}`);
          setRegenerationLog(prev => [...prev, `[${progress.stage.toUpperCase()}] ${progress.message}`]);
        }
      );

      // Success! Update the asset with new URLs
      const successLog = [
        ``,
        `=== GENERATION COMPLETE ===`,
        `Image URL: ${result.imageUrl}`,
        `Video URL: ${result.videoUrl}`,
        `================================`,
      ];
      setRegenerationLog(prev => [...prev, ...successLog]);
      console.log(successLog.join('\n'));

      // Update the asset with new video URL and add to versions
      setAssets(prev => prev.map(a => {
        if (a.id !== assetId) return a;

        const newVersion = {
          id: crypto.randomUUID(),
          filename: `${a.id}_v${a.versions.length + 1}.mp4`,
          path: result.videoUrl,
          versionNumber: a.versions.length + 1,
          createdAt: new Date().toISOString(),
          isSelected: true
        };

        // Mark previous versions as not selected
        const updatedVersions = a.versions.map(v => ({ ...v, isSelected: false }));

        return {
          ...a,
          path: result.videoUrl,
          imageUrl: result.imageUrl,
          videoUrl: result.videoUrl,
          status: 'pending' as const,
          versions: [...updatedVersions, newVersion]
        };
      }));

      // Save version to database
      if (currentProject) {
        try {
          await saveAssetVersion(assetId, result.imageUrl, result.videoUrl, selectedAsset.filename);
        } catch (dbError) {
          console.error('Failed to save version to database:', dbError);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorLog = [
        ``,
        `=== GENERATION FAILED ===`,
        `Error: ${errorMessage}`,
        `================================`,
      ];
      setRegenerationLog(prev => [...prev, ...errorLog]);
      console.error('Generation failed:', error);

      // Reset asset status on failure
      setAssets(prev => prev.map(a =>
        a.id === assetId ? { ...a, status: 'rejected' as const } : a
      ));

      setGenerationProgress({
        stage: 'error',
        message: errorMessage,
        error: errorMessage
      });
    } finally {
      setIsGenerating(false);
      setSelectedAsset(null);
    }
  };

  const handleApproveAll = () => {
    setAssets(prev => prev.map(a => ({ ...a, status: 'approved' as const })));
  };

  const handleRejectAll = () => {
    setAssets(prev => prev.map(a => ({ ...a, status: 'rejected' as const })));
  };

  // Show project selector if no project is selected
  if (!currentProject) {
    return (
      <ProjectSelector
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      {/* Project Name Bar */}
      <div style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '8px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleCloseProject}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              padding: '6px 12px',
              borderRadius: '6px'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#334155'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: '18px' }}>&larr;</span>
            Projects
          </button>
          <span style={{ color: '#475569' }}>|</span>
          <span style={{ color: '#f1f5f9', fontWeight: 500 }}>
            {currentProject.name}
          </span>
          {currentProject.description && (
            <span style={{ color: '#64748b', fontSize: '13px' }}>
              &mdash; {currentProject.description}
            </span>
          )}
        </div>
      </div>

      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        approvedCount={assets.filter(a => a.status === 'approved').length}
        pendingCount={assets.filter(a => a.status === 'pending').length}
        rejectedCount={assets.filter(a => a.status === 'rejected').length}
        onApproveAll={handleApproveAll}
        onRejectAll={handleRejectAll}
        onSettingsClick={() => setShowSettingsModal(true)}
      />

      <main style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
        {viewMode === 'grid' && (
          <BRollGrid
            assets={assets}
            onApprove={handleApprove}
            onReject={handleReject}
            onRegenerate={handleRegenerate}
          />
        )}
        {viewMode === 'timeline' && (
          <SceneTimeline
            scenes={sceneCutaways}
            assets={assets}
            onApprove={handleApprove}
            onReject={handleReject}
            onRegenerate={handleRegenerate}
          />
        )}
        {viewMode === 'vertical' && (
          <VerticalTimeline
            scenes={sceneCutaways}
            assets={assets}
            onApprove={handleApprove}
            onReject={handleReject}
            onRegenerate={handleRegenerate}
            onUpdateCutaway={handleUpdateCutaway}
            onInsertCutaway={handleInsertCutaway}
            onDeleteCutaway={handleDeleteCutaway}
          />
        )}

        {/* Regeneration Log Panel */}
        {regenerationLog.length > 0 && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#1e293b',
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h3 style={{ color: '#f1f5f9', fontSize: '14px', margin: 0 }}>
                Regeneration Commands (Copy to Claude)
              </h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(regenerationLog.join('\n'));
                }}
                style={{
                  padding: '6px 12px',
                  background: '#3b82f6',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Copy All
              </button>
            </div>
            <pre style={{
              background: '#0f172a',
              padding: '12px',
              borderRadius: '4px',
              color: '#94a3b8',
              fontSize: '11px',
              overflow: 'auto',
              maxHeight: '300px',
              margin: 0
            }}>
              {regenerationLog.join('\n')}
            </pre>
          </div>
        )}
      </main>

      {showRegenerateModal && selectedAsset && (
        <RegenerateModal
          asset={selectedAsset}
          settings={settings}
          onClose={() => {
            setShowRegenerateModal(false);
            setSelectedAsset(null);
          }}
          onSubmit={handleRegenerateSubmit}
          onBrowseStock={(source, searchQuery) => {
            setStockBrowserSource(source);
            setStockBrowserQuery(searchQuery);
            setShowRegenerateModal(false);
            setShowStockBrowser(true);
          }}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onSettingsChange={setSettings}
          onClose={() => setShowSettingsModal(false)}
          onBrowseStock={() => {
            setShowSettingsModal(false);
            setShowStockBrowser(true);
          }}
          scenes={sceneCutaways}
          onScenesUpdate={setSceneCutaways}
          projectId={currentProject?.id}
        />
      )}

      {showStockBrowser && (
        <StockBrowser
          source={stockBrowserSource}
          initialQuery={stockBrowserQuery}
          onSelect={async (video) => {
            console.log('Selected stock video:', video);
            // Update the selected asset with the new stock video
            if (selectedAsset) {
              const updatedDescription = `Stock video by ${video.author} (${video.source})`;

              // Source is always 'pexels' or 'pixabay' from StockBrowser
              const assetSource = video.source as 'pexels' | 'pixabay';

              // Update local state
              setAssets(prev => prev.map(a =>
                a.id === selectedAsset.id
                  ? {
                      ...a,
                      path: video.downloadUrl,
                      videoUrl: video.downloadUrl,
                      status: 'pending' as const,
                      description: updatedDescription,
                      source: assetSource
                    }
                  : a
              ));

              // Persist to database
              if (currentProject) {
                try {
                  await updateAsset(selectedAsset.id, {
                    path: video.downloadUrl,
                    video_url: video.downloadUrl,
                    status: 'pending',
                    description: updatedDescription,
                    source: assetSource
                  });
                  console.log('Stock video saved to database');
                } catch (dbError) {
                  console.error('Failed to save stock video to database:', dbError);
                }
              }

              setSelectedAsset(null);
            }
            setShowStockBrowser(false);
            setStockBrowserQuery('');
          }}
          onClose={() => {
            setShowStockBrowser(false);
            setStockBrowserQuery('');
            // Keep selectedAsset if user wants to go back to regenerate modal
          }}
        />
      )}

      {/* Generation Progress Overlay */}
      {isGenerating && generationProgress && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            border: '1px solid #334155'
          }}>
            {/* Spinner */}
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid #334155',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px'
            }} />

            <h3 style={{
              color: '#f1f5f9',
              fontSize: '20px',
              marginBottom: '8px'
            }}>
              {generationProgress.stage === 'image' ? 'Generating Image...' :
               generationProgress.stage === 'video' ? 'Converting to Video...' :
               generationProgress.stage === 'complete' ? 'Complete!' :
               'Error'}
            </h3>

            <p style={{
              color: '#94a3b8',
              fontSize: '14px',
              marginBottom: '24px'
            }}>
              {generationProgress.message}
            </p>

            {/* Progress steps */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: generationProgress.stage === 'image' ? '#3b82f6' :
                              generationProgress.imageUrl ? '#22c55e' : '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#fff'
                }}>
                  {generationProgress.imageUrl ? '\u2713' : '1'}
                </div>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Image</span>
              </div>

              <div style={{
                width: '40px',
                height: '2px',
                background: generationProgress.imageUrl ? '#22c55e' : '#334155',
                alignSelf: 'center'
              }} />

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: generationProgress.stage === 'video' ? '#3b82f6' :
                              generationProgress.videoUrl ? '#22c55e' : '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#fff'
                }}>
                  {generationProgress.videoUrl ? '\u2713' : '2'}
                </div>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Video</span>
              </div>
            </div>

            {/* Generated image preview */}
            {generationProgress.imageUrl && (
              <div style={{ marginBottom: '16px' }}>
                <img
                  src={generationProgress.imageUrl}
                  alt="Generated preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    border: '1px solid #334155'
                  }}
                />
              </div>
            )}

            {/* Error message */}
            {generationProgress.error && (
              <div style={{
                background: '#7f1d1d',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '16px'
              }}>
                <p style={{ color: '#fca5a5', fontSize: '14px', margin: 0 }}>
                  {generationProgress.error}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
