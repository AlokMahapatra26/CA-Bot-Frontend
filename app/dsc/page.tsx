import { createSupabaseServer } from '@/lib/supabase-server';
import DscDashboard from '@/app/components/DscDashboard';

export const revalidate = 0;

export default async function DscPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  const { data: clientsData, error } = await supabase
    .from('clients')
    .select(`
      *,
      dsc_applications (
        id,
        assigned_to,
        user_type,
        provider,
        status,
        payment_status,
        token_pin,
        token_location,
        expiry_date,
        created_at,
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

  // Filter clients to show those who opted in for DSC
  const dscClients = (clientsData || []).filter(
    (client: any) => client.services && client.services.includes('DSC')
  );

  // Filter clients to show only assigned ones if the user is an employee
  let displayClients = dscClients;
  if (profile?.role === 'employee') {
    displayClients = dscClients.filter(
      (client: any) => client.dsc_applications && client.dsc_applications.length > 0 && client.dsc_applications[0].assigned_to === user?.id
    );
  }

  return <DscDashboard clientsData={displayClients} />;
}
