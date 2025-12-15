import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:55431';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const supabase = createClient(supabaseUrl, supabaseKey);

const projectId = 'd64b42b2-f589-4b33-8e1a-8bc90a6fdb0d';

const newAssets = [
  { filename: 'person_typing.mp4', path: '/broll/person_typing.mp4', description: 'Person typing on computer', source: 'pexels', status: 'approved', used_in_scenes: ['scene_09'] },
  { filename: 'reading_documents.mp4', path: '/broll/reading_documents.mp4', description: 'Person reading documents', source: 'pixabay', status: 'approved', used_in_scenes: ['scene_09'] },
  { filename: 'writing_signing.mp4', path: '/broll/writing_signing.mp4', description: 'Person writing and signing documents', source: 'pexels', status: 'approved', used_in_scenes: ['scene_10'] },
  { filename: 'calendar_planning.mp4', path: '/broll/calendar_planning.mp4', description: 'Calendar planning', source: 'pexels', status: 'approved', used_in_scenes: ['scene_10'] },
  { filename: 'organizing_papers.mp4', path: '/broll/organizing_papers.mp4', description: 'Organizing papers', source: 'pixabay', status: 'approved', used_in_scenes: ['scene_11'] },
  { filename: 'filing_documents.mp4', path: '/broll/filing_documents.mp4', description: 'Filing documents', source: 'pixabay', status: 'approved', used_in_scenes: ['scene_11'] },
  { filename: 'calculator_bills.mp4', path: '/broll/calculator_bills.mp4', description: 'Calculator with bills', source: 'pixabay', status: 'approved', used_in_scenes: ['scene_12'] },
  { filename: 'money_payment.mp4', path: '/broll/money_payment.mp4', description: 'Money and payment', source: 'pexels', status: 'approved', used_in_scenes: ['scene_12'] },
  { filename: 'signing_agreement.mp4', path: '/broll/signing_agreement.mp4', description: 'Signing agreement or contract', source: 'pixabay', status: 'approved', used_in_scenes: ['scene_13'] },
  { filename: 'legal_documents.mp4', path: '/broll/legal_documents.mp4', description: 'Legal documents', source: 'pexels', status: 'approved', used_in_scenes: ['scene_13'] },
  { filename: 'happy_relief.mp4', path: '/broll/happy_relief.mp4', description: 'Happy person showing relief', source: 'pexels', status: 'approved', used_in_scenes: ['scene_14'] },
  { filename: 'success_achievement.mp4', path: '/broll/success_achievement.mp4', description: 'Success and achievement celebration', source: 'pixabay', status: 'approved', used_in_scenes: ['scene_14'] }
];

console.log('Inserting missing B-roll assets...\n');

for (const asset of newAssets) {
  const { data, error } = await supabase
    .from('broll_assets')
    .insert({
      project_id: projectId,
      ...asset
    });

  if (error) {
    console.error(`❌ Failed to insert ${asset.filename}:`, error.message);
  } else {
    console.log(`✅ Inserted ${asset.filename}`);
  }
}

console.log('\n✅ Done!');
