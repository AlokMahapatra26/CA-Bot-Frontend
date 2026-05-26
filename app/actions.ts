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

export async function importClients(clients: Array<{ full_name: string; phone_number: string; email?: string }>) {
  try {
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
        bot_status: 'REGISTERED',
        account_status: 'APPROVED',
      };
    });

    const { error } = await serverSupabase
      .from('clients')
      .insert(toInsert);

    if (error) throw new Error(error.message);

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
      })
      .eq('id', clientId);

    if (error) throw new Error(error.message);

    // Sync ITR filing active status
    if (updates.has_itr !== undefined) {
      if (updates.has_itr) {
        const { data: existing } = await serverSupabase
          .from('itr_filings')
          .select('id')
          .eq('client_id', clientId)
          .maybeSingle();

        if (!existing) {
          await serverSupabase
            .from('itr_filings')
            .insert({
              client_id: clientId,
              fy_year: '2025-2026',
              status: 'AWAITING_INCOME_SOURCE',
              filing_status: 'AWAITING_DOCS'
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
  has_itr?: boolean;
}) {
  try {
    let phone = client.phone_number.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = `91${phone}`;
    }
    const jid = phone ? `${phone}@s.whatsapp.net` : null;

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
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    // Sync ITR filing active status
    if (client.has_itr && inserted) {
      await serverSupabase
        .from('itr_filings')
        .insert({
          client_id: inserted.id,
          fy_year: '2025-2026',
          status: 'AWAITING_INCOME_SOURCE',
          filing_status: 'AWAITING_DOCS'
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

