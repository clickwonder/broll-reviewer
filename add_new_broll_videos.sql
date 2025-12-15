-- Add new B-roll videos for scenes 9-14 that were downloaded from Pexels and Pixabay

INSERT INTO broll_assets (project_id, filename, path, description, source, status, used_in_scenes)
SELECT
  'd64b42b2-f589-4b33-8e1a-8bc90a6fdb0d'::uuid,
  filename,
  '/broll/' || filename,
  description,
  source,
  'approved',
  ARRAY[scene_id]
FROM (VALUES
  -- Scene 09
  ('person_typing.mp4', 'Person typing on computer', 'pexels', 'scene_09'),
  ('reading_documents.mp4', 'Person reading documents', 'pixabay', 'scene_09'),
  -- Scene 10
  ('writing_signing.mp4', 'Person writing and signing documents', 'pexels', 'scene_10'),
  ('calendar_planning.mp4', 'Calendar planning', 'pexels', 'scene_10'),
  -- Scene 11
  ('organizing_papers.mp4', 'Organizing papers', 'pixabay', 'scene_11'),
  ('filing_documents.mp4', 'Filing documents', 'pixabay', 'scene_11'),
  -- Scene 12
  ('calculator_bills.mp4', 'Calculator with bills', 'pixabay', 'scene_12'),
  ('money_payment.mp4', 'Money and payment', 'pexels', 'scene_12'),
  -- Scene 13
  ('signing_agreement.mp4', 'Signing agreement or contract', 'pixabay', 'scene_13'),
  ('legal_documents.mp4', 'Legal documents', 'pexels', 'scene_13'),
  -- Scene 14
  ('happy_relief.mp4', 'Happy person showing relief', 'pexels', 'scene_14'),
  ('success_achievement.mp4', 'Success and achievement celebration', 'pixabay', 'scene_14')
) AS v(filename, description, source, scene_id)
ON CONFLICT (id) DO NOTHING;
