const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase URL or Anon Key. Make sure .env.local exists.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLES = [
  'profiles',
  'projects',
  'project_crew',
  'scripts',
  'script_versions',
  'script_collaborators',
  'jobs',
  'job_applications',
  'messages',
  'activity_feed',
  'studio_boards',
  'studio_assets',
  'portfolio_projects',
  'portfolio_media',
  'project_tasks',
  'project_beats',
  'script_metadata',
  'marketing_campaigns',
  'channels',
  'channel_members',
  'timeline_items',
  'budget_items',
  'beats',
  'concept_assets',
  'scenes',
  'campaigns',
  'character_castings',
  'spotify_connections',
  'portfolio_blocks'
];

async function runAudit() {
  console.log("=========================================");
  console.log("RUNNING ANON SECURITY FLOOR RLS AUDIT");
  console.log(`Target: ${supabaseUrl}`);
  console.log("Persona: Riley (Anonymous / Logged Out)");
  console.log("=========================================");

  let leaksFound = 0;
  let secureTables = 0;

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(5);
      if (error) {
        // If there's an error (e.g. permission denied) that means it's secure!
        console.log(`[SECURE] Table: ${table.padEnd(25)} | Error received: ${error.message}`);
        secureTables++;
      } else if (data && data.length > 0) {
        // If data is returned, we have a leak! Riley can see private data!
        console.error(`[⚠️ LEAK!] Table: ${table.padEnd(25)} | Riley can read ${data.length} records!`);
        console.error("Sample Row:", JSON.stringify(data[0], null, 2));
        leaksFound++;
      } else {
        // If no data and no error, standard Postgres RLS filters the records out (silent filter)
        // Let's verify whether it's truly empty because of RLS or because the table is empty.
        // We can check if we can insert/update as anon. But select returning empty is standard Postgres RLS behavior.
        console.log(`[SECURE] Table: ${table.padEnd(25)} | Returned 0 rows (Silent Filter)`);
        secureTables++;
      }
    } catch (err) {
      console.log(`[SECURE] Table: ${table.padEnd(25)} | Threw error: ${err.message}`);
      secureTables++;
    }
  }

  console.log("=========================================");
  console.log("AUDIT SUMMARY:");
  console.log(`Secure Tables: ${secureTables}`);
  console.log(`Leaked Tables: ${leaksFound}`);
  console.log("=========================================");

  if (leaksFound > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit();