export interface SheetRowData {
  first_name: string;
  last_name: string;
  email: string;
  competition: string;
  ip_address?: string;
  authorized?: string; // Column for authorization status: "Yes", "Downloaded", "Authorized (SMTP)", etc.
  source?: string;
}

/**
 * Sends student certificate download/issuance data to Google Sheet 1 via Google Apps Script Webhook.
 * Stores every detail live in real-time.
 */
export async function appendToGoogleSheet(data: SheetRowData): Promise<boolean> {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl.includes("PASTE_YOUR_WEBHOOK_URL_HERE")) {
    console.warn("⚠️ [Google Sheet Notice] GOOGLE_SHEET_WEBHOOK_URL not configured.");
    return false;
  }

  try {
    const payload = JSON.stringify({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      competition: data.competition,
      ip_address: data.ip_address || "Web User",
      authorized: data.authorized || "Yes",
      source: data.source || "System",
      timestamp: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
    });

    // Use text/plain and redirect: follow to avoid CORS & preflight issues with Google Apps Script
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: payload,
      redirect: "follow",
    });

    if (res.ok) {
      console.log(`✅ [Google Sheet Live] Row added to Sheet 1 for ${data.email} (Auth: ${data.authorized || "Yes"})`);
      return true;
    } else {
      console.warn(`⚠️ [Google Sheet Notice] Webhook returned status ${res.status}`);
      return false;
    }
  } catch (err: any) {
    console.error("⚠️ [Google Sheet Error]: Failed to send row:", err.message);
    return false;
  }
}

/**
 * Fetches authorized student participation list from Sheet 2 via Google Apps Script Web App.
 */
export async function fetchSheet2Participants(): Promise<any[]> {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl.includes("PASTE_YOUR_WEBHOOK_URL_HERE")) {
    return [];
  }

  try {
    const res = await fetch(`${webhookUrl}?action=get_sheet2`, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (err: any) {
    console.warn("⚠️ [Google Sheet Fetch Notice]:", err.message);
  }

  return [];
}
