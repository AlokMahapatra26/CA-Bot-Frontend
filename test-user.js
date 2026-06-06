const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const userId = "ea3d4b1b-1c6e-4d3a-9b48-c52e9332a5d7";
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  console.log("Data:", data);
  console.log("Error:", error);
}

main();
