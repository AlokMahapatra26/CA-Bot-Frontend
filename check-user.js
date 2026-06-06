const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value.length) acc[key.trim()] = value.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) console.error(error);
  else {
    const user = data.users.find(u => u.email === 'ryanmahapatra007@gmail.com');
    if (user) {
      console.log('User exists:', user.id, user.email, 'Confirmed at:', user.email_confirmed_at);
    } else {
      console.log('User does NOT exist in auth.users');
    }
  }
}
check();
