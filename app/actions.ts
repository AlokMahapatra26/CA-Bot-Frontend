'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase-server';

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
  docType: 'PAN' | 'Aadhaar' | 'Form16' | 'BankStatement' | 'CapitalGains' | 'PropertyDocs' | 'OtherDocs',
  reason?: string,
  targetUrl?: string
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
      let finalUrlValue: string | null = null;

      if (docType === 'OtherDocs' && targetUrl) {
        // Fetch current other_docs_media_url to selectively filter
        const { data: currentFiling, error: selectErr } = await serverSupabase
          .from('itr_filings')
          .select('other_docs_media_url')
          .eq('id', filingId)
          .single();

        if (!selectErr && currentFiling?.other_docs_media_url) {
          const urls = currentFiling.other_docs_media_url.split(',');
          const filteredUrls = urls
            .map((url: string) => url.trim())
            .filter((url: string) => url !== targetUrl.trim());

          if (filteredUrls.length > 0) {
            finalUrlValue = filteredUrls.join(',');
          }
        }
      }

      // filing documents are on the 'itr_filings' table
      const { error: filingErr } = await serverSupabase
        .from('itr_filings')
        .update({
          [doc.column]: finalUrlValue,
          status: doc.state
        })
        .eq('id', filingId);

      if (filingErr) {
        throw new Error(`Filing update failed: ${filingErr.message}`);
      }
    }

    // 3. Send automated WhatsApp notification through backend WhatsApp socket
    const reasonText = reason ? `\n\n*Reason:* ${reason}` : ' due to incomplete or unclear details';
    const response = await fetch('http://localhost:4000/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jid: recipientJid,
        text: `⚠️ *Document Rejected* ⚠️\n\nDear *${clientName}*,\n\nYour submitted *${doc.label}* has been rejected by our CA team${reasonText}.\n\nPlease upload a clear photo or PDF of your *${doc.label}* again on WhatsApp to proceed with your ITR filing.\n\nThank you! 🙏`
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
  docType: 'PAN' | 'Aadhaar' | 'Form16' | 'BankStatement' | 'CapitalGains' | 'PropertyDocs' | 'OtherDocs'
) {
  try {
    const docLabels = {
      PAN: 'PAN Card',
      Aadhaar: 'Aadhaar Card',
      Form16: 'Form 16',
      BankStatement: 'Bank Statement',
      CapitalGains: 'Capital Gains Statement',
      PropertyDocs: 'Property Deeds',
      OtherDocs: 'Other Supporting Document'
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

export async function uploadItrvReceipt(filingId: string, formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    // 1. Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Upload to Supabase Storage
    const timestamp = Date.now();
    const rawExtension = file.name.split('.').pop() || 'pdf';
    const extension = rawExtension.toLowerCase();
    const cleanFileName = `itrv_${filingId}_${timestamp}.${extension}`;
    const filePath = `itrv_receipts/${cleanFileName}`;

    const { error: uploadErr } = await serverSupabase.storage
      .from('itr-documents')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: true
      });

    if (uploadErr) {
      throw new Error(`Failed to upload file to storage: ${uploadErr.message}`);
    }

    // 3. Get the public URL of the uploaded receipt
    const { data: publicUrlData } = serverSupabase.storage
      .from('itr-documents')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // 4. Update the 'notes' field inside 'itr_filings' to save this ITR-V receipt URL
    // and set filing_status to 'FILED'!
    const { error: dbErr } = await serverSupabase
      .from('itr_filings')
      .update({
        notes: publicUrl,
        filing_status: 'FILED'
      })
      .eq('id', filingId);

    if (dbErr) {
      throw new Error(`Failed to update filing status: ${dbErr.message}`);
    }

    // 5. Fetch client info to send automated WhatsApp message
    const { data: filingRow, error: fetchErr } = await serverSupabase
      .from('itr_filings')
      .select('client_id, fy_year, clients (whatsapp_jid, full_name, phone_number)')
      .eq('id', filingId)
      .single();

    if (fetchErr || !filingRow) {
      console.warn('Failed to fetch client for WhatsApp receipt notification:', fetchErr?.message);
    } else {
      const client = (filingRow as any).clients;
      const recipientJid = client?.whatsapp_jid || (client?.phone_number ? `${client.phone_number}@s.whatsapp.net` : null);
      const clientName = client?.full_name || 'there';
      const activeFy = (filingRow as any).fy_year || '2025-26';

      if (recipientJid) {
        // Send automated message with document attachment!
        try {
          const waResponse = await fetch('http://localhost:4000/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jid: recipientJid,
              text: 
                `🎉 *ITR Filing Completed!* 🎉\n\n` +
                `Dear *${clientName}*,\n\n` +
                `We have successfully filed your Income Tax Return for Financial Year *${activeFy}*!\n\n` +
                `Please find your official *ITR-V Acknowledgement Receipt* PDF attached below for your records.\n\n` +
                `Thank you for choosing *DAV Labs*! 🙏`,
              documentUrl: publicUrl,
              fileName: `ITRV_Acknowledgement_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_FY_${activeFy}.pdf`
            })
          });

          if (!waResponse.ok) {
            console.warn('WhatsApp API Warning: Failed to deliver receipt message to WhatsApp bot.');
          }
        } catch (waErr) {
          console.warn('WhatsApp delivery exception:', waErr);
        }
      }
    }

    revalidatePath('/');
    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('uploadItrvReceipt Error:', error);
    return { success: false, error: error.message };
  }
}

export async function importClients(clients: Array<{ full_name: string; phone_number: string; email?: string; date_of_birth?: string | null; services?: string[] }>) {
  try {
    // Fetch user profile to get company_id
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    let companyId = null;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      companyId = profile?.company_id || null;
    }

    const toInsert = clients.map(c => {
      let phone = c.phone_number.replace(/\D/g, '');
      if (phone.length === 10) {
        phone = `91${phone}`;
      }
      const jid = phone ? `${phone}@s.whatsapp.net` : null;

      return {
        full_name: c.full_name.trim(),
        phone_number: phone || null,
        whatsapp_jid: jid,
        email: c.email?.trim().toLowerCase() || null,
        date_of_birth: c.date_of_birth || null,
        bot_status: 'REGISTERED',
        account_status: 'APPROVED',
        company_id: companyId,
        services: c.services || [],
      };
    });

    const { data: insertedClients, error } = await serverSupabase
      .from('clients')
      .insert(toInsert)
      .select('id, services');

    if (error) throw new Error(error.message);

    // Create matching ITR filings for any client that opted for ITR
    if (insertedClients && insertedClients.length > 0) {
      const itrFilingsToInsert = insertedClients
        .filter(c => c.services && c.services.includes('ITR'))
        .map(c => ({
          client_id: c.id,
          fy_year: '2025-26',
          status: 'AWAITING_INCOME_SOURCE',
          filing_status: 'AWAITING_DOCS',
          company_id: companyId
        }));

      if (itrFilingsToInsert.length > 0) {
        const { error: filingErr } = await serverSupabase
          .from('itr_filings')
          .insert(itrFilingsToInsert);
        if (filingErr) {
          console.error('Failed to auto-create ITR filings on import:', filingErr.message);
        }
      }
    }

    revalidatePath('/clients');
    return { success: true };
  } catch (error: any) {
    console.error('Import Clients Error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateClientProfile(clientId: string, updates: {
  full_name: string;
  phone_number: string;
  email?: string | null;
  date_of_birth?: string | null;
  account_status?: string;
  bot_status?: string;
  has_itr?: boolean;
  services?: string[];
}) {
  try {
    let phone = updates.phone_number.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = `91${phone}`;
    }
    const jid = phone ? `${phone}@s.whatsapp.net` : null;

    const { error } = await serverSupabase
      .from('clients')
      .update({
        full_name: updates.full_name.trim(),
        phone_number: phone || null,
        whatsapp_jid: jid,
        email: updates.email?.trim().toLowerCase() || null,
        date_of_birth: updates.date_of_birth || null,
        account_status: updates.account_status || 'PENDING',
        bot_status: updates.bot_status || 'REGISTERED',
        services: updates.services || [],
      })
      .eq('id', clientId);

    if (error) throw new Error(error.message);

    // Sync ITR filing active status
    const hasItr = updates.services ? updates.services.includes('ITR') : updates.has_itr;
    if (hasItr !== undefined) {
      if (hasItr) {
        const { data: existing } = await serverSupabase
          .from('itr_filings')
          .select('id')
          .eq('client_id', clientId)
          .maybeSingle();

        if (!existing) {
          // Fetch client's company_id
          const { data: clientData } = await serverSupabase
            .from('clients')
            .select('company_id')
            .eq('id', clientId)
            .single();

          await serverSupabase
            .from('itr_filings')
            .insert({
              client_id: clientId,
              fy_year: '2025-26',
              status: 'AWAITING_INCOME_SOURCE',
              filing_status: 'AWAITING_DOCS',
              company_id: clientData?.company_id || null
            });
        }
      } else {
        await serverSupabase
          .from('itr_filings')
          .delete()
          .eq('client_id', clientId);
      }
    }

    revalidatePath('/clients');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Update Client Profile Error:', error);
    return { success: false, error: error.message };
  }
}

export async function uploadClientDoc(clientId: string, docType: 'pan' | 'aadhaar', formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error('No file provided');

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const rawExtension = file.name.split('.').pop() || 'pdf';
    const extension = rawExtension.toLowerCase();
    const cleanFileName = `${docType}_${clientId}_${timestamp}.${extension}`;
    const filePath = `kyc_documents/${cleanFileName}`;

    const { error: uploadErr } = await serverSupabase.storage
      .from('itr-documents')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: true
      });

    if (uploadErr) {
      throw new Error(`Failed to upload file to storage: ${uploadErr.message}`);
    }

    const { data: publicUrlData } = serverSupabase.storage
      .from('itr-documents')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    const dbField = docType === 'pan' ? 'pan_media_url' : 'aadhaar_media_url';
    const { error: dbErr } = await serverSupabase
      .from('clients')
      .update({
        [dbField]: publicUrl
      })
      .eq('id', clientId);

    if (dbErr) throw new Error(dbErr.message);

    revalidatePath('/clients');
    revalidatePath('/');
    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error('Upload Client KYC Error:', error);
    return { success: false, error: error.message };
  }
}

export async function createClientProfile(client: {
  full_name: string;
  phone_number: string;
  email?: string | null;
  date_of_birth?: string | null;
  account_status?: string;
  services?: string[];
  has_itr?: boolean;
}) {
  try {
    let phone = client.phone_number.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = `91${phone}`;
    }
    const jid = phone ? `${phone}@s.whatsapp.net` : null;

    // Fetch the logged-in user's company_id to associate with this client
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    let companyId = null;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      companyId = profile?.company_id || null;
    }

    const { data: inserted, error } = await serverSupabase
      .from('clients')
      .insert({
        full_name: client.full_name.trim(),
        phone_number: phone || null,
        whatsapp_jid: jid,
        email: client.email?.trim().toLowerCase() || null,
        date_of_birth: client.date_of_birth || null,
        account_status: client.account_status || 'APPROVED',
        bot_status: 'REGISTERED',
        company_id: companyId,
        services: client.services || [],
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    // Sync ITR filing active status
    const hasItr = client.services ? client.services.includes('ITR') : client.has_itr;
    if (hasItr && inserted) {
      await serverSupabase
        .from('itr_filings')
        .insert({
          client_id: inserted.id,
          fy_year: '2025-26',
          status: 'AWAITING_INCOME_SOURCE',
          filing_status: 'AWAITING_DOCS',
          company_id: companyId
        });
    }

    revalidatePath('/clients');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Create Client Profile Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getChangelogs() {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const frontendPath = path.join(process.cwd(), 'CHANGELOG.md');
    const backendPath = path.join(process.cwd(), '../wb-backend/CHANGELOG.md');

    const frontendChangelog = await fs.readFile(frontendPath, 'utf8');
    const backendChangelog = await fs.readFile(backendPath, 'utf8');

    return {
      success: true,
      frontend: frontendChangelog,
      backend: backendChangelog,
    };
  } catch (error: any) {
    console.error('getChangelogs server action error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteAllClients() {
  try {
    const { error } = await serverSupabase
      .from('clients')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw new Error(error.message);

    revalidatePath('/');
    revalidatePath('/clients');
    return { success: true };
  } catch (error: any) {
    console.error('Delete All Clients Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function createTeamMember({
  email,
  password,
  role,
  department,
  fullName,
  companyId,
  phone,
  dateOfBirth,
}: {
  email: string;
  password: string;
  role: string;
  department: string;
  fullName: string;
  companyId: string;
  phone?: string;
  dateOfBirth?: string;
}) {
  try {
    const { data, error } = await serverSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
        department: department,
        company_id: companyId,
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
      },
      app_metadata: {
        role: role,
        department: department,
        company_id: companyId,
      },
    });

    if (error) throw new Error(error.message);

    // Also update the profiles table directly to ensure role, department, company, phone, and date_of_birth are set
    if (data?.user) {
      await serverSupabase
        .from('profiles')
        .update({
          role,
          department,
          full_name: fullName,
          company_id: companyId,
          phone: phone || null,
          date_of_birth: dateOfBirth || null,
        })
        .eq('id', data.user.id);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Create Team Member Action Error:', error);
    return { success: false, error: memberCreateErrorMessage(error) };
  }
}

export async function deleteTeamMember(userId: string) {
  try {
    const { error } = await serverSupabase.auth.admin.deleteUser(userId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (error: any) {
    console.error('Delete Team Member Action Error:', error);
    return { success: false, error: error.message };
  }
}

function memberCreateErrorMessage(error: any): string {
  if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
    return 'This email address is already registered as a team member.';
  }
  return error.message || 'Failed to create team member.';
}

/**
 * Create a new company and set the user as its admin.
 * Called during onboarding after sign-up.
 */
export async function createCompany(userId: string, companyName: string) {
  try {
    // 1. Create the company
    const { data: company, error: companyError } = await serverSupabase
      .from('companies')
      .insert({ name: companyName.trim(), created_by: userId })
      .select('id')
      .single();

    if (companyError) throw new Error(companyError.message);

    const companyId = company.id;

    // 2. Update the user's profile to admin + ALL department + company_id
    const { error: profileError } = await serverSupabase
      .from('profiles')
      .update({
        role: 'admin',
        department: 'ALL',
        company_id: companyId,
      })
      .eq('id', userId);

    if (profileError) throw new Error(profileError.message);

    // 3. Sync to auth.users app_metadata for JWT claims
    await serverSupabase.auth.admin.updateUserById(userId, {
      app_metadata: {
        role: 'admin',
        department: 'ALL',
        company_id: companyId,
      },
    });

    return { success: true, companyId };
  } catch (error: any) {
    console.error('Create Company Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getMyProfile(userId: string) {
  try {
    let { data, error } = await serverSupabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message, profile: null };
    }

    // Auto-healing: If user exists in Auth but has no profile row yet
    if (!data) {
      const { data: { user }, error: authError } = await serverSupabase.auth.admin.getUserById(userId);
      
      if (authError || !user) {
        return { success: false, error: 'Auth user not found', profile: null };
      }

      const { data: newProfile, error: insertError } = await serverSupabase
        .from('profiles')
        .insert({
          id: userId,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || '',
          role: 'employee',
          department: 'ALL',
        })
        .select('*')
        .single();

      if (insertError) {
        return { success: false, error: insertError.message, profile: null };
      }
      data = newProfile;
    }

    return { success: true, profile: data };
  } catch (error: any) {
    return { success: false, error: error.message, profile: null };
  }
}

/**
 * Fetch all team profiles for a specific company (bypasses RLS). Admin-only usage.
 */
export async function getAllProfiles(companyId?: string) {
  try {
    let query = serverSupabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, profiles: [] };
    }

    return { success: true, profiles: data };
  } catch (error: any) {
    return { success: false, error: error.message, profiles: [] };
  }
}

/**
 * Update a team member's role and department (bypasses RLS). Also syncs to auth.users app_metadata.
 */
export async function updateTeamMemberRoleAndDepartment(userId: string, newRole: string, newDepartment: string) {
  try {
    // Update profiles table
    const { error } = await serverSupabase
      .from('profiles')
      .update({ role: newRole, department: newDepartment })
      .eq('id', userId);

    if (error) throw new Error(error.message);

    // Also sync to auth.users app_metadata for JWT claims
    await serverSupabase.auth.admin.updateUserById(userId, {
      app_metadata: { role: newRole, department: newDepartment },
      user_metadata: { role: newRole, department: newDepartment }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Update Role/Department Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch a company name by ID (bypasses RLS).
 */
export async function getCompanyName(companyId: string) {
  try {
    const { data, error } = await serverSupabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    if (error) {
      return { success: false, name: null };
    }

    return { success: true, name: data.name };
  } catch {
    return { success: false, name: null };
  }
}


export async function assignClientProfile(clientId: string, staffId: string | null) {
  try {
    const supabase = await createSupabaseServer();
    const { error } = await supabase
      .from('clients')
      .update({ assigned_to: staffId || null })
      .eq('id', clientId);

    if (error) throw new Error(error.message);

    revalidatePath('/clients');
    return { success: true };
  } catch (err: any) {
    console.error('AssignClientProfile Error:', err);
    return { success: false, error: err.message };
  }
}

export async function getBotQuestions() {
  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from('bot_questions')
      .select('*')
      .order('sequence_order', { ascending: true });

    if (error) throw new Error(error.message);
    return { success: true, questions: data || [] };
  } catch (err: any) {
    console.error('getBotQuestions Error:', err);
    return { success: false, error: err.message };
  }
}

export async function saveBotQuestion(question: {
  id: string;
  sequence_order: number;
  question_text: string;
  expected_type: 'text' | 'phone' | 'date' | 'email' | 'file';
  validation_regex?: string | null;
  error_message?: string | null;
}) {
  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from('bot_questions')
      .upsert(question)
      .select()
      .single();

    if (error) throw new Error(error.message);
    revalidatePath('/bot-builder');
    return { success: true, question: data };
  } catch (err: any) {
    console.error('saveBotQuestion Error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteBotQuestion(id: string) {
  try {
    const supabase = await createSupabaseServer();
    const { error } = await supabase
      .from('bot_questions')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/bot-builder');
    return { success: true };
  } catch (err: any) {
    console.error('deleteBotQuestion Error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateQuestionOrder(orderedIds: string[]) {
  try {
    const supabase = await createSupabaseServer();
    // Perform updates sequentially
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('bot_questions')
        .update({ sequence_order: i + 1 })
        .eq('id', orderedIds[i]);
      
      if (error) throw new Error(error.message);
    }
    revalidatePath('/bot-builder');
    return { success: true };
  } catch (err: any) {
    console.error('updateQuestionOrder Error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateTeamMemberDetails({
  userId,
  fullName,
  phone,
  dateOfBirth,
}: {
  userId: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
}) {
  try {
    // 1. Update profiles table
    const { error } = await serverSupabase
      .from('profiles')
      .update({ full_name: fullName, phone: phone || null, date_of_birth: dateOfBirth || null })
      .eq('id', userId);

    if (error) throw new Error(error.message);

    // 2. Also update auth.users user_metadata for this user
    const { error: authError } = await serverSupabase.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: fullName, phone: phone || null, date_of_birth: dateOfBirth || null },
    });

    if (authError) throw new Error(authError.message);

    return { success: true };
  } catch (error: any) {
    console.error('Update Team Member Details Action Error:', error);
    return { success: false, error: error.message || 'Failed to update team member details.' };
  }
}
