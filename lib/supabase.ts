import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Client {
  id: string;
  phone_number: string | null;
  whatsapp_jid: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  email: string | null;
  pan_media_url: string | null;
  aadhaar_media_url: string | null;
  bot_status: string | null;
  account_status: string | null; // 'PENDING' | 'APPROVED' | 'REJECTED'
  created_at: string;
  updated_at: string;
}

export type ItrStatus =
  | 'SERVICE_MENU'
  | 'AWAITING_BANK_NAME'
  | 'AWAITING_BANK_ACC'
  | 'AWAITING_BANK_IFSC'
  | 'AWAITING_INCOME_SOURCE'
  | 'AWAITING_FORM16'
  | 'AWAITING_BANK_STATEMENT'
  | 'AWAITING_CAPITAL_GAINS'
  | 'AWAITING_PROPERTY_SALE_DECISION'
  | 'AWAITING_PROPERTY_DOCS'
  | 'AWAITING_OTHER_DOCS_DECISION'
  | 'AWAITING_OTHER_DOCS'
  | 'COMPLETED';

export interface ItrFiling {
  id: string;
  client_id: string;
  fy_year: string;
  status: ItrStatus;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  income_source: string | null;
  form16_media_url: string | null;
  bank_statement_media_url: string | null;
  capital_gains_media_url: string | null;
  property_docs_media_url: string | null;
  other_docs_media_url: string | null;
  filing_status: string;
  updated_at: string;
  created_at: string;
  clients?: Client;
}
