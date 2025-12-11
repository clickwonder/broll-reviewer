-- Add stock video assets to the current project
-- First, get the project ID (should be the most recently updated one)

DO $$
DECLARE
  project_uuid UUID;
BEGIN
  -- Get the most recent project
  SELECT id INTO project_uuid FROM broll_projects ORDER BY updated_at DESC LIMIT 1;

  -- Insert stock video assets if they don't already exist
  INSERT INTO broll_assets (project_id, filename, path, description, status, used_in_scenes, source, video_url, versions)
  VALUES
    (project_uuid, 'courtroom.mp4', '/videos/stock/stock_pexels_6101348_1765420340756.mp4', 'Stock video: Courtroom interior', 'pending', ARRAY['Scene 08'], 'pexels', '/videos/stock/stock_pexels_6101348_1765420340756.mp4', '[]'::jsonb)
  ON CONFLICT DO NOTHING;

  INSERT INTO broll_assets (project_id, filename, path, description, status, used_in_scenes, source, video_url, versions)
  VALUES
    (project_uuid, 'calendar_deadlines.mp4', '/videos/stock/stock_pexels_7924459_1765420340333.mp4', 'Stock video: Calendar with deadlines', 'pending', ARRAY[]::text[], 'pexels', '/videos/stock/stock_pexels_7924459_1765420340333.mp4', '[]'::jsonb)
  ON CONFLICT DO NOTHING;

  INSERT INTO broll_assets (project_id, filename, path, description, status, used_in_scenes, source, video_url, versions)
  VALUES
    (project_uuid, 'credit_report.mp4', '/videos/stock/stock_pexels_8519382_1765420340903.mp4', 'Stock video: Credit report document', 'pending', ARRAY[]::text[], 'pexels', '/videos/stock/stock_pexels_8519382_1765420340903.mp4', '[]'::jsonb)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Stock assets added to project %', project_uuid;
END $$;
