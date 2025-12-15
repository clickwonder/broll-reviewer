-- Query to see scene structure with statistics
SELECT 
  id,
  name,
  jsonb_pretty(scenes) as scenes_json
FROM broll_projects
WHERE name LIKE '%Medical Debt%'
ORDER BY updated_at DESC
LIMIT 1;
