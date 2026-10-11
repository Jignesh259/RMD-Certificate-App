import { COMPETITIONS, CompetitionType } from "./competitions";

export interface StudentInput {
  first_name: string;
  last_name: string;
  email: string;
  competition: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitized: {
    firstName: string;
    lastName: string;
    email: string;
    competition: CompetitionType;
    fullName: string;
  };
}

// Regex for valid human names (supports letters, unicode letters, spaces, hyphens, periods, apostrophes)
const NAME_REGEX = /^[A-Za-z\s.'\-\u00C0-\u024F]+$/;

// Standard email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateStudentInput(input: Partial<StudentInput>): ValidationResult {
  const errors: Record<string, string> = {};

  const rawFirst = (input.first_name || "").trim();
  const rawLast = (input.last_name || "").trim();
  const rawEmail = (input.email || "").trim().toLowerCase();
  const rawComp = (input.competition || "").trim();

  // Validate First Name
  if (!rawFirst) {
    errors.first_name = "First name is required.";
  } else if (rawFirst.length < 2) {
    errors.first_name = "First name must be at least 2 characters.";
  } else if (rawFirst.length > 50) {
    errors.first_name = "First name cannot exceed 50 characters.";
  } else if (!NAME_REGEX.test(rawFirst)) {
    errors.first_name = "First name can only contain letters, spaces, hyphens, and apostrophes.";
  }

  // Validate Last Name
  if (!rawLast) {
    errors.last_name = "Last name is required.";
  } else if (rawLast.length < 2) {
    errors.last_name = "Last name must be at least 2 characters.";
  } else if (rawLast.length > 50) {
    errors.last_name = "Last name cannot exceed 50 characters.";
  } else if (!NAME_REGEX.test(rawLast)) {
    errors.last_name = "Last name can only contain letters, spaces, hyphens, and apostrophes.";
  }

  // Validate Email
  if (!rawEmail) {
    errors.email = "Email address is required.";
  } else if (rawEmail.length > 254) {
    errors.email = "Email address cannot exceed 254 characters.";
  } else if (!EMAIL_REGEX.test(rawEmail)) {
    errors.email = "Please enter a valid email address (e.g., student@college.edu).";
  }

  // Validate Competition
  if (!rawComp) {
    errors.competition = "Please select a competition.";
  } else if (!COMPETITIONS.includes(rawComp as CompetitionType)) {
    errors.competition = `Invalid competition selected. Must be one of: ${COMPETITIONS.join(", ")}.`;
  }

  // Proper Title Case for Names (e.g. "rahul patel" -> "Rahul Patel")
  const formatName = (str: string) =>
    str
      .split(/\s+/)
      .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
      .join(" ");

  const firstName = formatName(rawFirst);
  const lastName = formatName(rawLast);
  const fullName = `${firstName} ${lastName}`.trim();

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      firstName,
      lastName,
      email: rawEmail,
      competition: rawComp as CompetitionType,
      fullName,
    },
  };
}
