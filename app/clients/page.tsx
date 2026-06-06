import { createSupabaseServer } from '@/lib/supabase-server';
import ClientsDashboard from '../components/ClientsDashboard';
import { ShieldAlert } from 'lucide-react';

export const revalidate = 0;

export default async function ClientsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  if (profile?.role === 'employee') {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="max-w-md space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-[16px] font-bold text-slate-900 uppercase tracking-wider">Access Restricted</h2>
          <p className="text-[12px] text-slate-500 max-w-xs mx-auto leading-relaxed">
            The Client Profiles module is restricted to system administrators and HODs.
          </p>
        </div>
      </div>
    );
  }

  const { data: clientsData, error } = await supabase
    .from('clients')
    .select('*, itr_filings(id, assigned_to)')
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

