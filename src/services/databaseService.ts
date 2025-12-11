/**
 * Database Service for B-Roll Reviewer
 * Handles saving/loading projects and B-Roll assets to Supabase
 */

import { supabase, isSupabaseEnabled } from './supabaseClient';
import type { BRollAsset, SceneCutaway, CutawayConfig, GenerationSettings } from '../types';

// Database types
export interface DBProject {
  id: string;
  name: string;
  description?: string;
  settings: GenerationSettings;
  scenes: SceneCutaway[];
  created_at: string;
  updated_at: string;
}

export interface DBBRollAsset {
  id: string;
  project_id: string;
  filename: string;
  path: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'regenerating';
  used_in_scenes: string[];
  image_url?: string;
  video_url?: string;
  source: 'ai' | 'pexels' | 'pixabay' | 'local';
  image_model?: string;
  video_model?: string;
  versions: AssetVersion[];
  created_at: string;
  updated_at: string;
}

export interface AssetVersion {
  id: string;
  filename: string;
  path: string;
  versionNumber: number;
  createdAt: string;
  isSelected: boolean;
  imageUrl?: string;
  videoUrl?: string;
}

// Check if database is available
export function isDatabaseEnabled(): boolean {
  return isSupabaseEnabled;
}

// Project operations
export async function saveProject(
  name: string,
  description: string,
  settings: GenerationSettings,
  scenes: SceneCutaway[]
): Promise<DBProject | null> {
  if (!supabase) {
    console.warn('Database not available - project not saved');
    return null;
  }

  const { data, error } = await supabase
    .from('broll_projects')
    .insert({
      name,
      description,
      settings,
      scenes,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Failed to save project:', error);
    throw new Error(`Failed to save project: ${error.message}`);
  }

  return data;
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<DBProject, 'name' | 'description' | 'settings' | 'scenes'>>
): Promise<DBProject | null> {
  if (!supabase) {
    console.warn('Database not available - project not updated');
    return null;
  }

  const { data, error } = await supabase
    .from('broll_projects')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Failed to update project:', error);
    throw new Error(`Failed to update project: ${error.message}`);
  }

  return data;
}

export async function getAllProjects(): Promise<DBProject[]> {
  if (!supabase) {
    console.warn('Database not available');
    return [];
  }

  const { data, error } = await supabase
    .from('broll_projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch projects:', error);
    throw new Error(`Failed to fetch projects: ${error.message}`);
  }

  return data || [];
}

export async function getProject(id: string): Promise<DBProject | null> {
  if (!supabase) {
    console.warn('Database not available');
    return null;
  }

  const { data, error } = await supabase
    .from('broll_projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch project:', error);
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  return data;
}

export async function deleteProject(id: string): Promise<void> {
  if (!supabase) {
    console.warn('Database not available');
    return;
  }

  // Delete associated assets first
  await supabase
    .from('broll_assets')
    .delete()
    .eq('project_id', id);

  const { error } = await supabase
    .from('broll_projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete project:', error);
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

// Asset operations
export async function saveAsset(
  projectId: string,
  asset: Omit<DBBRollAsset, 'id' | 'project_id' | 'created_at' | 'updated_at'>
): Promise<DBBRollAsset | null> {
  if (!supabase) {
    console.warn('Database not available - asset not saved');
    return null;
  }

  const { data, error } = await supabase
    .from('broll_assets')
    .insert({
      project_id: projectId,
      ...asset,
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Failed to save asset:', error);
    throw new Error(`Failed to save asset: ${error.message}`);
  }

  return data;
}

export async function updateAsset(
  id: string,
  updates: Partial<Omit<DBBRollAsset, 'id' | 'project_id' | 'created_at' | 'updated_at'>>
): Promise<DBBRollAsset | null> {
  if (!supabase) {
    console.warn('Database not available - asset not updated');
    return null;
  }

  const { data, error } = await supabase
    .from('broll_assets')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Failed to update asset:', error);
    throw new Error(`Failed to update asset: ${error.message}`);
  }

  return data;
}

export async function getProjectAssets(projectId: string): Promise<DBBRollAsset[]> {
  if (!supabase) {
    console.warn('Database not available');
    return [];
  }

  const { data, error } = await supabase
    .from('broll_assets')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch assets:', error);
    throw new Error(`Failed to fetch assets: ${error.message}`);
  }

  return data || [];
}

export async function deleteAsset(id: string): Promise<void> {
  if (!supabase) {
    console.warn('Database not available');
    return;
  }

  const { error } = await supabase
    .from('broll_assets')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete asset:', error);
    throw new Error(`Failed to delete asset: ${error.message}`);
  }
}

// Save a new version of an asset after regeneration
export async function saveAssetVersion(
  assetId: string,
  imageUrl: string,
  videoUrl: string,
  filename?: string
): Promise<void> {
  if (!supabase) {
    console.warn('Database not available');
    return;
  }

  // Get current asset to append version
  const { data: asset, error: fetchError } = await supabase
    .from('broll_assets')
    .select('versions, filename')
    .eq('id', assetId)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to fetch asset for version update:', fetchError);
    throw new Error(`Failed to fetch asset: ${fetchError.message}`);
  }

  const currentVersions: AssetVersion[] = asset?.versions || [];
  const versionNumber = currentVersions.length + 1;
  const baseFilename = filename || asset?.filename || assetId;

  // Mark all existing versions as not selected
  const updatedVersions = currentVersions.map(v => ({ ...v, isSelected: false }));

  // Add new version
  const newVersion: AssetVersion = {
    id: crypto.randomUUID(),
    filename: `${baseFilename}_v${versionNumber}.mp4`,
    path: videoUrl,
    versionNumber,
    createdAt: new Date().toISOString(),
    isSelected: true,
    imageUrl,
    videoUrl,
  };

  updatedVersions.push(newVersion);

  // Update asset with new version and new URLs
  const { error: updateError } = await supabase
    .from('broll_assets')
    .update({
      versions: updatedVersions,
      image_url: imageUrl,
      video_url: videoUrl,
      path: videoUrl, // Update path to new video
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId);

  if (updateError) {
    console.error('Failed to save asset version:', updateError);
    throw new Error(`Failed to save asset version: ${updateError.message}`);
  }
}

// Raw database scene format (different from SceneCutaway)
interface RawDBScene {
  id: string;
  name: string;
  duration?: number;
}

// Transform raw DB scene format to SceneCutaway format
// DB has: {id, name, duration}
// App expects: {sceneId, sceneTitle, cutaways[]}
export function transformDBScenesToSceneCutaways(
  rawScenes: RawDBScene[] | SceneCutaway[] | undefined,
  assets: DBBRollAsset[] = []
): SceneCutaway[] {
  if (!rawScenes || !Array.isArray(rawScenes)) {
    return [];
  }

  return rawScenes.map((scene: RawDBScene | SceneCutaway, sceneIndex: number) => {
    // Check if it's already in SceneCutaway format
    if ('sceneId' in scene && 'cutaways' in scene) {
      return scene as SceneCutaway;
    }

    // It's in raw DB format {id, name, duration}
    const rawScene = scene as RawDBScene;

    // Generate possible scene identifiers to match against used_in_scenes
    // Assets might have used_in_scenes like ["Scene 01", "scene_01", "scene-01", "1", etc.]
    const sceneNumber = sceneIndex + 1;
    const paddedNumber = String(sceneNumber).padStart(2, '0');
    const possibleMatchers = [
      rawScene.id,                           // UUID or actual ID
      rawScene.name,                         // Full scene name
      `Scene ${paddedNumber}`,               // "Scene 01"
      `Scene ${sceneNumber}`,                // "Scene 1"
      `scene_${paddedNumber}`,               // "scene_01"
      `scene_${sceneNumber}`,                // "scene_1"
      `scene-${paddedNumber}`,               // "scene-01"
      `scene-${sceneNumber}`,                // "scene-1"
      String(sceneNumber),                   // "1"
      paddedNumber,                          // "01"
    ];

    // Find assets that belong to this scene by checking multiple matching patterns
    const sceneAssets = assets.filter(asset => {
      if (!asset.used_in_scenes || !Array.isArray(asset.used_in_scenes)) {
        return false;
      }
      // Check if any of the possible matchers are in the asset's used_in_scenes
      return asset.used_in_scenes.some(usedScene =>
        possibleMatchers.some(matcher =>
          usedScene.toLowerCase() === matcher.toLowerCase() ||
          usedScene.toLowerCase().includes(matcher.toLowerCase())
        )
      );
    });

    console.log(`[Scene Transform] Scene "${rawScene.name}" (index ${sceneIndex}): Found ${sceneAssets.length} matching assets`);
    sceneAssets.forEach((asset, i) => {
      console.log(`  Asset ${i+1}: ${asset.filename} -> ${asset.path} (source: ${asset.source})`);
    });

    // Create cutaways from assets
    const cutaways: CutawayConfig[] = sceneAssets.map((asset, index) => ({
      video: asset.path || asset.video_url || '',
      startTime: index * 3, // Default spacing
      duration: 3,
      style: 'default',
      videoStartTime: 0,
      playbackRate: 1
    }));

    console.log(`  Created ${cutaways.length} cutaways:`, cutaways.map(c => c.video));

    return {
      sceneId: rawScene.id,
      sceneTitle: rawScene.name,
      cutaways
    };
  });
}

// Convert DB asset to app BRollAsset type
export function dbAssetToAppAsset(dbAsset: DBBRollAsset): BRollAsset {
  return {
    id: dbAsset.id,
    filename: dbAsset.filename,
    path: dbAsset.path,
    description: dbAsset.description,
    status: dbAsset.status,
    usedInScenes: dbAsset.used_in_scenes,
    imageUrl: dbAsset.image_url,
    videoUrl: dbAsset.video_url,
    source: dbAsset.source,
    createdAt: dbAsset.created_at,
    versions: dbAsset.versions,
  };
}

// Convert app BRollAsset to DB format
export function appAssetToDbFormat(
  asset: BRollAsset,
  source: 'ai' | 'pexels' | 'pixabay' | 'local' = 'local',
  imageModel?: string,
  videoModel?: string
): Omit<DBBRollAsset, 'id' | 'project_id' | 'created_at' | 'updated_at'> {
  return {
    filename: asset.filename,
    path: asset.path,
    description: asset.description,
    status: asset.status,
    used_in_scenes: asset.usedInScenes,
    image_url: asset.imageUrl,
    video_url: asset.videoUrl,
    source,
    image_model: imageModel,
    video_model: videoModel,
    versions: asset.versions || [],
  };
}
