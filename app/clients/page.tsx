import { supabase } from '@/lib/supabase';
import ClientsDashboard from '../components/ClientsDashboard';

export const revalidate = 0;

export default async function ClientsPage() {
  const { data: clientsData, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg m-6">
        <h2 className="font-semibold text-sm">Error Loading Client Profiles</h2>
        <p className="text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  return <ClientsDashboard clientsData={clientsData || []} />;
}
