export const INDIAN_STATE_CODES = {
  AN: "Andaman & Nicobar",
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CH: "Chandigarh",
  CG: "Chhattisgarh",
  CT: "Chhattisgarh",
  DD: "Daman & Diu",
  DL: "Delhi",
  DN: "Dadra & Nagar Haveli",
  GA: "Goa",
  GJ: "Gujarat",
  HR: "Haryana",
  HP: "Himachal Pradesh",
  JH: "Jharkhand",
  JK: "Jammu & Kashmir",
  KA: "Karnataka",
  KL: "Kerala",
  LA: "Ladakh",
  LD: "Lakshadweep",
  MP: "Madhya Pradesh",
  MH: "Maharashtra",
  MN: "Manipur",
  ML: "Meghalaya",
  MZ: "Mizoram",
  NL: "Nagaland",
  OD: "Odisha",
  OR: "Odisha",
  PB: "Punjab",
  PY: "Puducherry",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TN: "Tamil Nadu",
  TS: "Telangana",
  TR: "Tripura",
  UP: "Uttar Pradesh",
  UK: "Uttarakhand",
  UA: "Uttarakhand",
  WB: "West Bengal",
};

/**
 * Validates an Indian Driving License number according to MoRTH / Sarathi rules.
 * Standard format: SS-RR-YYYY-NNNNNNN
 *  - SS: 2-letter State/UT code (e.g. MH, DL, KA)
 *  - RR: 2-digit RTO office code (01 - 99)
 *  - YYYY: 4-digit Year of issue (1970 - current year)
 *  - NNNNNNN: 4 to 8 digit serial number (standard Sarathi is 7 digits)
 * 
 * @param {string} licenseInput - The license number entered by user
 * @returns {object} { isValid, message, stateCode, stateName, rto, year, serial, formatted, clean }
 */
export function validateLicenseNumber(licenseInput) {
  if (!licenseInput || typeof licenseInput !== "string") {
    return {
      isValid: false,
      message: "License number is required",
      clean: "",
    };
  }

  const raw = licenseInput.trim().toUpperCase();
  if (!raw) {
    return {
      isValid: false,
      message: "License number is required",
      clean: "",
    };
  }

  // Remove spaces, hyphens, slashes and any non-alphanumeric characters
  const clean = raw.replace(/[^A-Z0-9]/g, "");

  // Rule 1: Check length (Clean DL is usually 15 or 16 chars: 2 + 2 + 4 + 7 = 15; legacy allows 4-8 serial)
  if (clean.length < 11) {
    return {
      isValid: false,
      message: "Incomplete license number. Format: SS-RR-YYYY-NNNNNNN (e.g. MH-12-2023-1234567)",
      clean,
    };
  }

  if (clean.length > 16) {
    return {
      isValid: false,
      message: "License number is too long (maximum 16 alphanumeric characters)",
      clean,
    };
  }

  // Rule 2: State Code (first 2 chars must be valid state letters)
  const stateCode = clean.substring(0, 2);
  if (!/^[A-Z]{2}$/.test(stateCode)) {
    return {
      isValid: false,
      message: "License must start with a 2-letter State code (e.g. MH, DL, KA, GJ)",
      clean,
    };
  }

  const stateName = INDIAN_STATE_CODES[stateCode];
  if (!stateName) {
    return {
      isValid: false,
      message: `Invalid State code '${stateCode}'. Must be a recognized Indian State/UT code.`,
      clean,
    };
  }

  // Rule 3: RTO Code (next 2 chars must be digits 01 to 99)
  const rtoStr = clean.substring(2, 4);
  if (!/^\d{2}$/.test(rtoStr)) {
    return {
      isValid: false,
      message: "State code must be followed by a 2-digit RTO code (01 - 99)",
      clean,
    };
  }

  const rtoNum = parseInt(rtoStr, 10);
  if (rtoNum === 0) {
    return {
      isValid: false,
      message: "Invalid RTO code '00'. RTO codes range from 01 to 99.",
      clean,
    };
  }

  // Rule 4: Year of Issue (next 4 chars must be a 4-digit year)
  const yearStr = clean.substring(4, 8);
  if (!/^\d{4}$/.test(yearStr)) {
    return {
      isValid: false,
      message: "RTO code must be followed by a 4-digit Year of Issue (e.g. 2018, 2023)",
      clean,
    };
  }

  const yearNum = parseInt(yearStr, 10);
  const currentYear = new Date().getFullYear();
  if (yearNum < 1970) {
    return {
      isValid: false,
      message: `Invalid issue year ${yearNum}. Issue year cannot be before 1970.`,
      clean,
    };
  }
  if (yearNum > currentYear) {
    return {
      isValid: false,
      message: `Invalid issue year ${yearNum}. Year of issue cannot be in the future.`,
      clean,
    };
  }

  // Rule 5: Serial Number (remaining chars must be digits)
  const serialStr = clean.substring(8);
  if (!/^\d+$/.test(serialStr)) {
    return {
      isValid: false,
      message: "License serial number after the year must contain only digits",
      clean,
    };
  }

  if (serialStr.length < 4 || serialStr.length > 8) {
    return {
      isValid: false,
      message: "License serial number should be between 4 and 8 digits (standard is 7 digits)",
      clean,
    };
  }

  const formatted = `${stateCode}-${rtoStr}-${yearStr}-${serialStr}`;
  return {
    isValid: true,
    stateCode,
    stateName,
    rto: rtoStr,
    year: yearNum,
    serial: serialStr,
    formatted,
    clean,
    message: `Valid Indian DL: ${stateName} • RTO ${rtoStr} • Year ${yearNum}`,
  };
}
