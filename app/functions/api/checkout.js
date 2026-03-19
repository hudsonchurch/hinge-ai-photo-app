export async function onRequestPost(context) {
  try {
    const stripeKey = context.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json({ error: 'Missing STRIPE_SECRET_KEY env var' }, 500);

    const body = await context.request.json();
    const origin = new URL(context.request.url).origin;

    const orderPacks = [
      { name: 'MatchFrame Profile Pack (8 photos)', amount: 1900 },
      { name: 'MatchFrame Double Pack (16 photos)', amount: 2900 },
      { name: 'MatchFrame Ultimate Pack (24 photos)', amount: 3900 },
    ];

    let lineItems = [];
    let successStep = 'thanks';
    let cancelStep = 'thanks';
    let metadata = {};
    let customerEmail = undefined;

    if (body?.flow !== 'final') {
      return json({ error: 'Invalid flow (expected final)' }, 400);
    }

    const pack = orderPacks[Number(body.packIndex)];
    if (!pack) return json({ error: 'Invalid packIndex' }, 400);

    lineItems.push(item(pack.name, pack.amount));
    if (body.rush) lineItems.push(item('Rush Delivery (12 Hours)', 700));
    if (body.consult) lineItems.push(item('Photo Selection Consultation', 900));
    if (body.oto1) lineItems.push(item('Hinge Domination Pack', 2400));
    if (body.oto1d) lineItems.push(item('Lite Pack', 1400));
    if (body.oto2) lineItems.push(item('Profile Prompt Optimization', 1300));
    if (body.oto2d) lineItems.push(item('Prompt Templates Pack', 700));

    customerEmail = body.email || undefined;
    metadata = {
      flow: 'final',
      packIndex: String(body.packIndex),
      rush: body.rush ? '1' : '0',
      consult: body.consult ? '1' : '0',
      oto1: body.oto1 ? '1' : '0',
      oto1d: body.oto1d ? '1' : '0',
      oto2: body.oto2 ? '1' : '0',
      oto2d: body.oto2d ? '1' : '0',
      firstName: (body.firstName || '').slice(0, 120),
      lastName: (body.lastName || '').slice(0, 120),
    };

    const payload = new URLSearchParams();
    payload.set('mode', 'payment');
    payload.set('success_url', `${origin}/?step=${successStep}&session_id={CHECKOUT_SESSION_ID}`);
    payload.set('cancel_url', `${origin}/?step=${cancelStep}`);
    payload.set('billing_address_collection', 'auto');
    payload.set('allow_promotion_codes', 'true');

    if (customerEmail) payload.set('customer_email', customerEmail);

    lineItems.forEach((li, i) => {
      payload.set(`line_items[${i}][quantity]`, '1');
      payload.set(`line_items[${i}][price_data][currency]`, 'usd');
      payload.set(`line_items[${i}][price_data][unit_amount]`, String(li.amount));
      payload.set(`line_items[${i}][price_data][product_data][name]`, li.name);
    });

    Object.entries(metadata).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') payload.set(`metadata[${k}]`, String(v));
    });

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    });

    const stripeJson = await stripeRes.json();
    if (!stripeRes.ok) {
      return json({ error: stripeJson?.error?.message || 'Stripe error', stripe: stripeJson }, 500);
    }

    return json({ url: stripeJson.url, id: stripeJson.id });
  } catch (err) {
    return json({ error: err?.message || 'Unexpected error' }, 500);
  }
}

function item(name, amount) {
  return { name, amount };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
