const PAYHERO_API = "https://backend.payhero.co.ke/api/v2/payments";

type PayHeroConfig = { token: string; channelId: number; liveEnabled: boolean };

function getConfig(): PayHeroConfig {
  const username = process.env.PAYHERO_API_USERNAME?.trim() ?? "";
  const password = process.env.PAYHERO_API_PASSWORD?.trim() ?? "";
  const token = username && password ? `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` : "";
  const channelId = Number(process.env.PAYHERO_CHANNEL_ID ?? "");
  return { token, channelId, liveEnabled: process.env.PAYHERO_LIVE_ENABLED === "true" };
}

export function payHeroStatus() {
  const { token, channelId, liveEnabled } = getConfig();
  return {
    configured: /^Basic\s+\S+/.test(token) && Number.isInteger(channelId) && channelId > 0,
    liveEnabled,
    provider: "PayHero",
    mode: liveEnabled ? "live" : "safe-disabled",
  } as const;
}

export async function initiatePayHeroStkPush(input: { amount: number; phoneNumber: string; externalReference: string; customerName?: string; callbackUrl: string }) {
  const config = getConfig();
  const status = payHeroStatus();
  if (!status.configured) throw new Error("PayHero is not configured with a server-side API username, password, and channel ID");
  if (!config.liveEnabled) throw new Error("PayHero live payment initiation is disabled until the merchant explicitly enables production mode");

  const response = await fetch(PAYHERO_API, {
    method: "POST",
    headers: { Authorization: config.token, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(input.amount),
      phone_number: input.phoneNumber,
      channel_id: config.channelId,
      provider: "m-pesa",
      external_reference: input.externalReference,
      customer_name: input.customerName,
      callback_url: input.callbackUrl,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`PayHero payment initiation failed (${response.status})`);
  return body as { success: boolean; status: string; reference?: string; CheckoutRequestID?: string };
}
