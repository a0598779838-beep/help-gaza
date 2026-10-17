import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== allowedOrigin) {
    return Response.json({ error: 'Origin not allowed' }, { status: 403, headers: corsHeaders });
  }
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 12_000) return Response.json({ error: 'Request too large' }, { status: 413, headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return Response.json({ error: 'Invalid request' }, { status: 400, headers: corsHeaders });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
  }

  const reportType = typeof body.report_type === 'string' ? body.report_type.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (body.reported_url != null && typeof body.reported_url !== 'string') {
    return Response.json({ error: 'Invalid URL' }, { status: 400, headers: corsHeaders });
  }
  if (body.contact_email != null && typeof body.contact_email !== 'string') {
    return Response.json({ error: 'Invalid email' }, { status: 400, headers: corsHeaders });
  }
  if (body.aid_post_id != null && typeof body.aid_post_id !== 'string') {
    return Response.json({ error: 'Invalid aid reference' }, { status: 400, headers: corsHeaders });
  }
  const reportedUrl = typeof body.reported_url === 'string' && body.reported_url.trim() ? body.reported_url.trim() : null;
  const email = typeof body.contact_email === 'string' && body.contact_email.trim() ? body.contact_email.trim() : null;
  const aidPostId = typeof body.aid_post_id === 'string' ? body.aid_post_id : null;

  if (reportType.length < 2 || reportType.length > 80 || description.length < 10 || description.length > 2000) {
    return Response.json({ error: 'Invalid report' }, { status: 400, headers: corsHeaders });
  }
  if (reportedUrl && !isHttpUrl(reportedUrl)) return Response.json({ error: 'Invalid URL' }, { status: 400, headers: corsHeaders });
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return Response.json({ error: 'Invalid email' }, { status: 400, headers: corsHeaders });
  }
  if (aidPostId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(aidPostId)) {
    return Response.json({ error: 'Invalid aid reference' }, { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const rateLimitSalt = Deno.env.get('RATE_LIMIT_SALT');
  if (!supabaseUrl || !serviceRoleKey || !rateLimitSalt) return Response.json({ error: 'Report service unavailable' }, { status: 503, headers: corsHeaders });
  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const fingerprint = await sha256(`${forwardedFor}:${rateLimitSalt}`);
  const { data: allowed, error: rateError } = await client.rpc('take_report_rate_limit', { fingerprint_value: fingerprint });
  if (rateError) return Response.json({ error: 'Report service unavailable' }, { status: 503, headers: corsHeaders });
  if (!allowed) return Response.json({ error: 'Too many reports. Try again later.' }, { status: 429, headers: corsHeaders });

  const { error } = await client.from('reports').insert({
    aid_post_id: aidPostId,
    report_type: reportType,
    reported_url: reportedUrl,
    description,
    contact_email: email,
  });
  if (error) return Response.json({ error: 'Could not save report' }, { status: 400, headers: corsHeaders });
  return Response.json({ ok: true }, { status: 201, headers: corsHeaders });
});
