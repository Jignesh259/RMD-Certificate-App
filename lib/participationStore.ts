import { fetchSheet2Participants } from "./googleSheet";

export interface Participant {
  srNo: number;
  firstName: string;
  lastName: string;
  email: string;
  contestName: string;
  authorized: boolean;
  downloaded: boolean;
  downloadedAt?: string | null;
  emailSent: boolean;
  emailSentAt?: string | null;
  sendMailChecked?: boolean; // For Admin checklist: if checked, send mail; if unchecked, don't send mail for this ID
}


// Initial seed data from Sheet 2 (from user screenshot) this data fatch in google sheet using validation 
const INITIAL_PARTICIPANTS: Participant[] = [];

// Global in-memory storage for participation & status tracking
declare global {
  var __participantsStore: Participant[] | undefined;
}

if (!globalThis.__participantsStore) {
  globalThis.__participantsStore = [...INITIAL_PARTICIPANTS];
}

export function getParticipants(): Participant[] {
  return globalThis.__participantsStore || [];
}

export async function getParticipantsAsync(forceRefresh = false): Promise<Participant[]> {
  if (!forceRefresh && globalThis.__participantsStore && globalThis.__participantsStore.length > 0) {
    return getParticipants();
  }

  try {
    const sheetData = await fetchSheet2Participants();
    if (sheetData && Array.isArray(sheetData) && sheetData.length > 0) {
      const mapped: Participant[] = sheetData.map((p: any, idx: number) => ({
        srNo: idx + 1,
        firstName: p.firstName || p.first_name || p["First Name"] || "",
        lastName: p.lastName || p.last_name || p["Last Name"] || "",
        email: (p.email || p.email_id || p["e-mail Id"] || p["Email"] || "").trim().toLowerCase(),
        contestName: p.contestName || p.contest_name || p["Contest Name"] || "REEL MAKING COMPITITION",
        authorized: true,
        downloaded: p.downloaded === true || p.downloaded === "true" || false,
        emailSent: p.emailSent === true || p.emailSent === "true" || false,
        sendMailChecked: p.sendMailChecked ?? true,
      }));
      if (mapped.length > 0) {
        setParticipants(mapped);
      }
    }
  } catch (err) {
    console.warn("Could not sync participants from Google Sheet:", err);
  }

  return getParticipants();
}

export function setParticipants(list: Participant[]) {
  globalThis.__participantsStore = list;
}

export function updateParticipant(srNo: number, updated: Partial<Participant>): Participant | null {
  const list = getParticipants();
  const index = list.findIndex((p) => p.srNo === srNo);
  if (index === -1) return null;

  list[index] = { ...list[index], ...updated };
  setParticipants(list);
  return list[index];
}

export function addParticipant(newP: Omit<Participant, "srNo">): Participant {
  const list = getParticipants();
  const nextSrNo = list.length > 0 ? Math.max(...list.map((p) => p.srNo)) + 1 : 1;
  const created: Participant = {
    ...newP,
    srNo: nextSrNo,
    authorized: newP.authorized ?? true,
    downloaded: newP.downloaded ?? false,
    emailSent: newP.emailSent ?? false,
    sendMailChecked: newP.sendMailChecked ?? true,
  };
  list.push(created);
  setParticipants(list);
  return created;
}

export function deleteParticipant(srNo: number): boolean {
  const list = getParticipants();
  const filtered = list.filter((p) => p.srNo !== srNo);
  if (filtered.length === list.length) return false;
  setParticipants(filtered);
  return true;
}

export interface VerificationCheckResult {
  verified: boolean;
  alreadyDownloaded: boolean;
  message: string;
  participant?: Participant;
}

/**
 * Checks verification for student panel:
 * 1. Checks if student exists in Sheet 2 participation database matching Email (and First/Last/Contest)
 * 2. Checks if student has already downloaded certificate (1 time download limit)
 */
export function verifyStudentEligibility(
  firstName: string,
  lastName: string,
  email: string,
  contestName: string
): VerificationCheckResult {
  const list = getParticipants();
  const normEmail = email.trim().toLowerCase();
  const normFirst = firstName.trim().toLowerCase();
  const normLast = lastName.trim().toLowerCase();
  const normContest = contestName.trim().toLowerCase();

  // Find match in participation list by email
  const match = list.find((p) => p.email.trim().toLowerCase() === normEmail);

  if (!match) {
    return {
      verified: false,
      alreadyDownloaded: false,
      message: `Verification Failed: Email '${email}' is not listed in student participation records (Sheet 2). Certificate downloads are restricted to verified participants.`,
    };
  }

  // Check contest match (case-insensitive fuzzy match)
  const isContestMatch =
    match.contestName.trim().toLowerCase().includes(normContest) ||
    normContest.includes(match.contestName.trim().toLowerCase());

  if (!isContestMatch) {
    return {
      verified: false,
      alreadyDownloaded: false,
      message: `Verification Notice: Record found for ${email}, but contest '${contestName}' does not match registered contest '${match.contestName}'.`,
      participant: match,
    };
  }

  // Check 1-time download lock
  if (match.downloaded) {
    const downloadedTime = match.downloadedAt || "earlier";
    return {
      verified: true,
      alreadyDownloaded: true,
      message: `Already Downloaded: Certificate for ${match.firstName} ${match.lastName} (${match.contestName}) has already been downloaded on ${downloadedTime}. Each participant can download only once.`,
      participant: match,
    };
  }

  return {
    verified: true,
    alreadyDownloaded: false,
    message: `Verification Success: Student ${match.firstName} ${match.lastName} is authorized for ${match.contestName}.`,
    participant: match,
  };
}

/**
 * Marks participant as downloaded (enforces 1-time download)
 */
export function markStudentDownloaded(email: string): boolean {
  const list = getParticipants();
  const match = list.find((p) => p.email.trim().toLowerCase() === email.trim().toLowerCase());
  if (match) {
    match.downloaded = true;
    match.downloadedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    setParticipants(list);
    return true;
  }
  return false;
}

/**
 * Marks participant as email sent
 */
export function markStudentEmailSent(email: string): boolean {
  const list = getParticipants();
  const match = list.find((p) => p.email.trim().toLowerCase() === email.trim().toLowerCase());
  if (match) {
    match.emailSent = true;
    match.emailSentAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    setParticipants(list);
    return true;
  }
  return false;
}
