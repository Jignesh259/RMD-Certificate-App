# 📊 Step-by-Step Guide: Connect Google Sheets (Live Update)

This guide shows you how to connect your **College Certificate Generator** to a **Google Sheet** (Google Excel) so that every time a student downloads a certificate, their details and download timestamp appear **live in real time**.

---

## 🌟 Benefits of Google Sheets Integration
- **Live Real-Time Updates**: Watch student records appear line-by-line as certificates are downloaded.
- **Access Anywhere**: Open the Google Sheet on your smartphone, tablet, or laptop.
- **1-Click Excel Export**: Download as `.xlsx` anytime via `File` → `Download` → `Microsoft Excel`.
- **Zero Server Setup**: No database servers, no ports, no connection timeouts, 100% reliable.

---

## 📋 Step 1: Create Your Google Sheet

1. Open your browser and go to [sheets.new](https://sheets.new) (creates a new blank Google Sheet).
2. Name the sheet at the top-left:
   ```
   RMD Ayurved College - Certificate Downloads
   ```
3. In **Row 1**, type these exact column headers across columns **A to F**:

| Column | Header Name | Description |
| :---: | :--- | :--- |
| **A** | `Timestamp` | Date & time of certificate download (IST) |
| **B** | `First Name` | Student's first name |
| **C** | `Last Name` | Student's last name |
| **D** | `Email` | Student's registered email |
| **E** | `Competition` | Category of competition |
| **F** | `IP Address` | Student's network IP address (audit log) |

*(Tip: You can make Row 1 **Bold** and give it a light green background for an authentic Ayurvedic look!)*

---

## ⚙️ Step 2: Open Google Apps Script

1. In the top menu of your Google Sheet, click **Extensions** → **Apps Script**.
2. A new tab will open with a code editor showing a default `function myFunction() { ... }`.
3. **Delete everything** inside the editor.

---

## 💻 Step 3: Paste the Webhook Code

Copy and paste the following complete code into the Apps Script editor:

```javascript
/**
 * Google Apps Script Webhook for College Certificate Portal
 * Appends a new row live on every certificate download.
 */
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Format timestamp in Indian Standard Time (IST)
    var timestamp = data.timestamp || Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a");
    
    // Append the row to the sheet
    sheet.appendRow([
      timestamp,
      data.first_name || "",
      data.last_name || "",
      data.email || "",
      data.competition || "",
      data.ip_address || "Web User"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Row added successfully" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function (optional: run to test sheet permissions)
function testAppend() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([
    new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    "Test First",
    "Test Last",
    "test@example.com",
    "Poster Making",
    "127.0.0.1"
  ]);
}
```

4. Click the **Save** icon 💾 (or press `Ctrl + S`).
5. Name the project `Certificate Webhook` at the top.

---

## 🚀 Step 4: Deploy as Web App (Very Important!)

1. In the top-right corner of the Apps Script window, click the blue **Deploy** button → **New deployment**.
2. On the left side, click the gear icon ⚙️ (next to *Select type*) and select **Web app**.
3. Configure these exact settings:
   - **Description**: `Live Certificate Sync`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: **`Anyone`**  
     *(⚠️ IMPORTANT: You must select "Anyone" so your website can send data to the sheet).*
4. Click **Deploy**.
5. Google will ask you to **Authorize access**:
   - Click **Authorize access**.
   - Choose your Google account.
   - Click **Advanced** (small text at bottom-left).
   - Click **Go to Certificate Webhook (unsafe)**.
   - Click **Allow**.
6. Google will show you your **Web app URL**.
   It looks like this:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
7. Click **Copy** to copy this URL.

---

## 🔑 Step 5: Add the URL to Your `.env` File

1. Open your project's `.env` file:
   [`certificate-app/.env`](file:///d:/own%20Project/College%20Certificate/certificate-app/.env)
2. Paste your copied URL in the `GOOGLE_SHEET_WEBHOOK_URL` field:

```env
# Google Sheet Live Update Webhook
GOOGLE_SHEET_WEBHOOK_URL="https://script.google.com/macros/s/YOUR_COPIED_ID_HERE/exec"
```

3. Save the `.env` file.

---

## ✅ Step 6: Test & Verify Live Sync

1. Open your Certificate portal in the browser: [http://localhost:3000](http://localhost:3000)
2. Fill in the student form (or click **"Fill Sample"**).
3. Click **"Show Live Preview"** and then click **"Download Official Certificate"**.
4. Switch to your **Google Sheet tab** — you will immediately see the new row appear live with:
   - Current IST Timestamp
   - First Name
   - Last Name
   - Email
   - Competition Name
   - IP Address

---

## 🛠️ Troubleshooting & Tips

- **Rows are not appearing?**
  - Verify that under Deployment settings, **"Who has access"** is set to **`Anyone`**, not *"Only myself"*.
  - Make sure your URL in `.env` ends with `/exec` (NOT `/edit`).
  - Restart your Next.js dev server (`npm run dev`) after editing `.env` so it loads the new variable.
- **Exporting to Excel**:
  - In Google Sheets, click `File` → `Download` → `Microsoft Excel (.xlsx)` at any time to share offline copies with the college administration.
