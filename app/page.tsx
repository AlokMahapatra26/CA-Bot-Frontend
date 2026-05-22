import { supabase } from '@/lib/supabase';
import ClientDashboard from './components/ClientDashboard';

export const revalidate = 0;

export default async function DashboardPage() {
  const { data: clientsData, error } = await supabase
    .from('clients')
    .select(`
      *,
      itr_filings (
        id,
        fy_year,
        status,
        filing_status,
        bank_name,
        bank_account_number,
        bank_ifsc,
        form16_media_url,
        updated_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
        <h2 className="font-semibold text-sm">Error Loading Data</h2>
        <p className="text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  return <ClientDashboard clientsData={clientsData || []} />;
}
