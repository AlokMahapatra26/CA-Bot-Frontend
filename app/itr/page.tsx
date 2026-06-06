import { createSupabaseServer } from '@/lib/supabase-server';
import ClientDashboard from '@/app/components/ClientDashboard';

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();
  const { data: clientsData, error } = await supabase
    .from('clients')

    .select(`
      *,
      itr_filings (
        id,
        assigned_to,
        fy_year,
        status,
        filing_status,
        income_source,
        bank_name,
        bank_account_number,
        bank_ifsc,
        form16_media_url,
        bank_statement_media_url,
        capital_gains_media_url,
        property_docs_media_url,
        other_docs_media_url,
        notes,
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

  // Only display clients who have actively opted in for ITR filing
  const activeItrClients = (clientsData || []).filter(
    (client: any) => client.itr_filings && client.itr_filings.length > 0
  );

  return <ClientDashboard clientsData={activeItrClients} />;
}
