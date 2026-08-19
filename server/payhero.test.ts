import { describe, expect, it } from "vitest";

describe("PayHero production configuration", () => {
  const shouldRunLiveCheck = process.env.PAYHERO_VERIFY_LIVE === "true";

  it.skipIf(!shouldRunLiveCheck)("authenticates to the read-only payment-channel endpoint", async () => {
    const username = process.env.PAYHERO_API_USERNAME;
    const password = process.env.PAYHERO_API_PASSWORD;
    const channelId = process.env.PAYHERO_CHANNEL_ID;
    const token = username && password ? `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}` : "";

    expect(username, "PAYHERO_API_USERNAME must be configured").toBeTruthy();
    expect(password, "PAYHERO_API_PASSWORD must be configured").toBeTruthy();
    expect(channelId, "PAYHERO_CHANNEL_ID must be configured").toMatch(/^\d+$/);

    const response = await fetch("https://backend.payhero.co.ke/api/v2/payment_channels", {
      headers: {
        Authorization: token!,
        "Content-Type": "application/json",
      },
    });

    expect(response.status, `PayHero returned ${response.status}`).toBeGreaterThanOrEqual(200);
    expect(response.status, `PayHero returned ${response.status}`).toBeLessThan(300);
  }, 15_000);
});
