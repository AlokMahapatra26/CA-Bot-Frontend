import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// We use the anon key for public read access (assuming RLS is configured appropriately or public for this internal tool)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ItrStatus = 'AWAITING_PAN' | 'AWAITING_AADHAAR' | 'AWAITING_FORM16' | 'COMPLETED';

export interface Client {
  id: string;
  phone_number: string | null;
  whatsapp_jid: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  pan_media_url: string | null;
  aadhaar_media_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItrFiling {
  id: string;
  client_id: string;
  fy_year: string;
  status: ItrStatus;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  form16_media_url: string | null;
  filing_status: string;
  updated_at: string;
  created_at: string;
  clients?: Client;
}
