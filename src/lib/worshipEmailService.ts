import { supabase } from './supabase';

export type EmailCampaignStatus = 'draft' | 'sending' | 'sent' | 'partial_failed' | 'failed';
export type EmailRecipientStatus = 'queued' | 'sent' | 'failed' | 'skipped';

export type WorshipEmailCampaign = {
  campaign_id: string;
  subject: string;
  status: EmailCampaignStatus;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  finished_at: string | null;
};

export type WorshipEmailCampaignRecipient = {
  recipient_id: string;
  member_name: string;
  member_email: string;
  status: EmailRecipientStatus;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
};

export async function createWorshipEmailCampaign(
  eventId: string,
  subject?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_worship_email_campaign', {
    p_event_id: eventId,
  });
  if (error) throw new Error(error.message);

  const campaignId = data as string;

  if (subject) {
    const { error: updateError } = await supabase
      .from('worship_email_campaigns')
      .update({ subject })
      .eq('id', campaignId);
    if (updateError) throw new Error(updateError.message);
  }

  return campaignId;
}

export async function triggerWorshipEmailCampaign(
  eventId: string,
  campaignId: string,
): Promise<{ sent: number; failed: number }> {
  const { data, error } = await supabase.functions.invoke(
    'send-worship-assignment-emails',
    { body: { event_id: eventId, campaign_id: campaignId } },
  );
  if (error) throw new Error(error.message);
  return data as { sent: number; failed: number };
}

export async function getWorshipEmailCampaigns(
  eventId: string,
): Promise<WorshipEmailCampaign[]> {
  const { data, error } = await supabase.rpc('get_worship_email_campaigns', {
    p_event_id: eventId,
  });
  if (error) throw new Error(error.message);
  return (data as WorshipEmailCampaign[]) ?? [];
}

export async function getWorshipEmailCampaignRecipients(
  campaignId: string,
): Promise<WorshipEmailCampaignRecipient[]> {
  const { data, error } = await supabase.rpc('get_worship_email_campaign_recipients', {
    p_campaign_id: campaignId,
  });
  if (error) throw new Error(error.message);
  return (data as WorshipEmailCampaignRecipient[]) ?? [];
}

export function emailCampaignStatusLabel(status: EmailCampaignStatus): string {
  const labels: Record<EmailCampaignStatus, string> = {
    draft: 'rascunho',
    sending: 'enviando',
    sent: 'enviado',
    partial_failed: 'parcial',
    failed: 'falhou',
  };
  return labels[status] ?? status;
}

export function emailErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message === 'NO_RECIPIENTS') return 'Nenhum escalado com e-mail válido encontrado.';
  if (message === 'NOT_AUTHORIZED') return 'Sem permissão para enviar e-mails neste evento.';
  if (message.includes('Campaign already sent') || message.includes('sending'))
    return 'Este envio já foi processado ou está em andamento.';
  return message || 'Não foi possível enviar os e-mails.';
}
