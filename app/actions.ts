'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Initialize a server-only Supabase client.
// We try to use the private service role key if available, otherwise fallback to the public anon key.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serverSupabase = createClient(supabaseUrl, supabaseKey);

export async function deleteFiling(id: string) {
  try {
    const { error } = await serverSupabase
      .from('itr_filings')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Delete Filing Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteClient(id: string) {
  try {
    const { error } = await serverSupabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/');
    revalidatePath('/clients');
    return { success: true };
  } catch (error: any) {
    console.error('Delete Client Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function approveClient(clientId: string) {
  try {
    // 1. Fetch client to get their JID and name for WhatsApp notification
    const { data: client, error: fetchErr } = await serverSupabase
      .from('clients')
      .select('whatsapp_jid, full_name')
      .eq('id', clientId)
      .single();

    if (fetchErr || !client) throw new Error(fetchErr?.message || 'Client not found');

    // 2. Update account_status to APPROVED and bot_status to REGISTERED
    const { error: updateErr } = await serverSupabase
      .from('clients')
      .update({ account_status: 'APPROVED', bot_status: 'REGISTERED' })
      .eq('id', clientId);

    if (updateErr) throw new Error(updateErr.message);

    // 3. Send WhatsApp notification to the client
    if (client.whatsapp_jid) {
      const name = client.full_name || 'there';
      try {
        await fetch('http://localhost:4000/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jid: client.whatsapp_jid,
            text:
              `✅ *Account Approved!*\n\n` +
              `Dear *${name}*, your account with *DAV Labs* has been verified and approved by our CA team! 🎉\n\n` +
              `You can now access our services. Reply *hi* to get started!\n\n` +
              `Available services:\n` +
              `*1* — 📊 ITR Filing (Income Tax Return)\n\n` +
              `_More services coming soon!_`
          }),
        });
      } catch (e) {
        console.warn('WhatsApp notification failed (non-critical):', e);
      }
    }

    revalidatePath('/clients');
    return { success: true };
  } catch (error: any) {
    console.error('Approve Client Error:', error);
    return { success: false, error: error.message };
  }
}

export async function rejectClientAccount(clientId: string, reason?: string) {
  try {
    // 1. Fetch client
    const { data: client, error: fetchErr } = await serverSupabase
      .from('clients')
      .select('whatsapp_jid, full_name')
      .eq('id', clientId)
      .single();

    if (fetchErr || !client) throw new Error(fetchErr?.message || 'Client not found');

    // 2. Update account_status to REJECTED
    const { error: updateErr } = await serverSupabase
      .from('clients')
      .update({ account_status: 'REJECTED' })
      .eq('id', clientId);

    if (updateErr) throw new Error(updateErr.message);

    // 3. Notify client on WhatsApp
    if (client.whatsapp_jid) {
      const name = client.full_name || 'User';
      const reasonText = reason ? `\n\n*Reason:* ${reason}` : '';
      try {
        await fetch('http://localhost:4000/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jid: client.whatsapp_jid,
            text:
              `❌ *Account Registration Rejected*\n\n` +
              `Dear *${name}*, unfortunately your account registration has been rejected by our CA team.${reasonText}\n\n` +
              `Please contact us for more details or to resubmit your documents.`
          }),
        });
      } catch (e) {
        console.warn('WhatsApp notification failed (non-critical):', e);
      }
    }

    revalidatePath('/clients');
    return { success: true };
  } catch (error: any) {
    console.error('Reject Client Error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateFilingStatus(id: string, status: string) {
  try {
    const { error } = await serverSupabase
      .from('itr_filings')
      .update({ filing_status: status })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Update Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function rejectDocument(
  filingId: string,
  clientName: string,
  recipientJid: string,
  docType: 'PAN' | 'Aadhaar' | 'Form16' | 'BankStatement' | 'CapitalGains' | 'PropertyDocs' | 'OtherDocs'
) {
  try {
    // 1. Map document types to DB columns and bot states
    const mapping = {
      PAN: {
        column: 'pan_media_url',
        state: 'AWAITING_PAN',
        label: 'PAN Card'
      },
      Aadhaar: {
        column: 'aadhaar_media_url',
        state: 'AWAITING_AADHAAR',
        label: 'Aadhaar Card'
      },
      Form16: {
        column: 'form16_media_url',
        state: 'AWAITING_FORM16',
        label: 'Form 16'
      },
      BankStatement: {
        column: 'bank_statement_media_url',
        state: 'AWAITING_BANK_STATEMENT',
        label: 'Bank Statement'
      },
      CapitalGains: {
        column: 'capital_gains_media_url',
        state: 'AWAITING_CAPITAL_GAINS',
        label: 'Capital Gains Statement'
      },
      PropertyDocs: {
        column: 'property_docs_media_url',
        state: 'AWAITING_PROPERTY_DOCS',
        label: 'Property Sale/Purchase details'
      },
      OtherDocs: {
        column: 'other_docs_media_url',
        state: 'AWAITING_OTHER_DOCS',
        label: 'Other Supporting Documents'
      }
    };

    const doc = mapping[docType];
    if (!doc) {
      throw new Error('Invalid document type specified');
    }

    // Fetch filing to get client_id
    const { data: filingRow, error: fetchErr } = await serverSupabase
      .from('itr_filings')
      .select('client_id')
      .eq('id', filingId)
      .single();

    if (fetchErr || !filingRow) {
      throw new Error(`Failed to fetch filing: ${fetchErr?.message || 'Not found'}`);
    }

    const clientId = filingRow.client_id;

    // 2. Update Supabase: Clear the media URL and set status back to collect that document
    if (docType === 'PAN' || docType === 'Aadhaar') {
      // Identity documents are on the 'clients' table
      const { error: clientErr } = await serverSupabase
        .from('clients')
        .update({ [doc.column]: null })
        .eq('id', clientId);

      if (clientErr) {
        throw new Error(`Client update failed: ${clientErr.message}`);
      }

      // Reset the filing's status
      const { error: filingErr } = await serverSupabase
        .from('itr_filings')
        .update({ status: doc.state })
        .eq('id', filingId);

      if (filingErr) {
        throw new Error(`Filing update failed: ${filingErr.message}`);
      }
    } else {
      // filing documents are on the 'itr_filings' table
      const { error: filingErr } = await serverSupabase
        .from('itr_filings')
        .update({
          [doc.column]: null,
          status: doc.state
        })
        .eq('id', filingId);

      if (filingErr) {
        throw new Error(`Filing update failed: ${filingErr.message}`);
      }
    }

    // 3. Send automated WhatsApp notification through backend WhatsApp socket
    const response = await fetch('http://localhost:4000/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jid: recipientJid,
        text: `⚠️ *Document Rejected* ⚠️\n\nDear *${clientName}*,\n\nYour submitted *${doc.label}* has been rejected by our CA team due to incomplete or unclear details.\n\nPlease upload a clear photo or PDF of your *${doc.label}* again on WhatsApp to proceed with your ITR filing.\n\nThank you! 🙏`
      })
    });

    if (!response.ok) {
      console.warn('WhatsApp API warning: Notification message could not be sent to WhatsApp bot.');
    }

    revalidatePath('/');
    revalidatePath('/clients');
    return { success: true };
  } catch (error: any) {
    console.error('Reject Document Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function acceptDocument(
  filingId: string,
  clientName: string,
  recipientJid: string,
  docType: 'PAN' | 'Aadhaar' | 'Form16'
) {
  try {
    const docLabels = {
      PAN: 'PAN Card',
      Aadhaar: 'Aadhaar Card',
      Form16: 'Form 16'
    };

    const docLabel = docLabels[docType] || docType;

    // Send automated WhatsApp notification through backend WhatsApp socket
    const response = await fetch('http://localhost:4000/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jid: recipientJid,
        text: `✅ *Document Approved* ✅\n\nDear *${clientName}*,\n\nYour submitted *${docLabel}* has been successfully verified and accepted by our CA team!\n\nThank you! 🙏`
      })
    });

    if (!response.ok) {
      console.warn('WhatsApp API warning: Notification message could not be sent to WhatsApp bot.');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Accept Document Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function acceptAllDocuments(
  filingId: string,
  clientName: string,
  recipientJid: string
) {
  try {
    // 1. Mark filing_status as DOCS_VERIFIED in Supabase to persist the accepted state
    const { error } = await serverSupabase
      .from('itr_filings')
      .update({ filing_status: 'DOCS_VERIFIED' })
      .eq('id', filingId);

    if (error) {
      throw new Error(`Database update failed: ${error.message}`);
    }

    // 2. Send automated WhatsApp notification through backend WhatsApp socket
    const response = await fetch('http://localhost:4000/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jid: recipientJid,
        text: `✅ *All Documents Approved* ✅\n\nDear *${clientName}*,\n\nAll your submitted documents have been successfully verified and accepted by our CA team!\n\nWe will now proceed with your ITR filing. Thank you! 🙏`
      })
    });

    if (!response.ok) {
      console.warn('WhatsApp API warning: Notification message could not be sent to WhatsApp bot.');
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Accept All Documents Action Error:', error);
    return { success: false, error: error.message };
  }
}
