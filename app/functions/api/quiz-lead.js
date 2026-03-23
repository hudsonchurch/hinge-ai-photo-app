export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {};

    if (!isEmail(email)) return json({ error: 'Invalid email' }, 400);

    const fromEmail = context.env.FROM_EMAIL;
    const resendKey = context.env.RESEND_API_KEY;
    const notifyEmail = context.env.LEAD_NOTIFY_EMAIL;

    if (!fromEmail || !resendKey) {
      return json({ error: 'Missing FROM_EMAIL or RESEND_API_KEY env var' }, 500);
    }

    const origin = new URL(context.request.url).origin;
    const salesLink = `${origin}/?step=sales`;
    const planHtml = buildLeadPlanHtml({ salesLink, answers });

    await sendResendEmail({
      apiKey: resendKey,
      from: fromEmail,
      to: email,
      subject: 'Your Hinge Upgrade Plan + Next Step',
      html: planHtml,
      replyTo: notifyEmail || fromEmail,
    });

    if (notifyEmail) {
      await sendResendEmail({
        apiKey: resendKey,
        from: fromEmail,
        to: notifyEmail,
        subject: 'New Hinge Quiz Lead',
        html: `<p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Answers:</strong></p><pre>${escapeHtml(JSON.stringify(answers, null, 2))}</pre>`,
        replyTo: fromEmail,
      });
    }

    return json({ ok: true });
  } catch (err) {
    return json({ error: err?.message || 'Unexpected error' }, 500);
  }
}

function buildLeadPlanHtml({ salesLink, answers }) {
  const priorities = [answers.goal, answers.struggle, answers.obj].filter(Boolean).slice(0, 3);
  const bullets = priorities.length
    ? priorities.map((x) => `<li>${escapeHtml(String(x))}</li>`).join('')
    : '<li>Improve first-photo quality and profile consistency</li><li>Use stronger social proof shots</li><li>Upgrade lighting and framing</li>';

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:0 auto;">
      <h2 style="margin:0 0 12px;">Your Hinge Upgrade Plan</h2>
      <p>Based on your quiz answers, here are your biggest leverage points:</p>
      <ul>${bullets}</ul>
      <p>Next step: unlock the full done-for-you upgrade flow here:</p>
      <p><a href="${salesLink}" style="display:inline-block;background:#c9943e;color:#111;padding:12px 16px;border-radius:8px;text-decoration:none;font-weight:700;">View Your Full Upgrade Options</a></p>
      <p style="font-size:13px;color:#555;">Reply to this email if you want help choosing the best package.</p>
    </div>
  `;
}

async function sendResendEmail({ apiKey, from, to, subject, html, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      reply_to: replyTo,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Email send failed');
  return data;
}

function isEmail(v) {
  return /^\S+@\S+\.\S+$/.test(v);
}

function escapeHtml(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
