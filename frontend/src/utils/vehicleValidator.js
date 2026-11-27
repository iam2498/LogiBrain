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
 * Validates an Indian Vehicle / Truck Registration Number according to MoRTH rules.
 * Standard format: SS-RR-XX-NNNN (e.g. MH-12-AB-1234, DL-01-C-5678)
 * Bharat (BH) format: YY-BH-NNNN-XX (e.g. 22-BH-1234-AA)
 * 
 * @param {string} input - Vehicle registration number
 * @returns {object} { isValid, message, stateCode, stateName, rto, series, number, formatted, clean }
 */
export function validateTruckRegistrationNumber(input) {
  if (!input || typeof input !== "string") {
    return {
      isValid: false,
      message: "Registration number is required",
      clean: "",
    };
  }

  const raw = input.trim().toUpperCase();
  if (!raw) {
    return {
      isValid: false,
      message: "Registration number is required",
      clean: "",
    };
  }

  const clean = raw.replace(/[^A-Z0-9]/g, "");

  if (clean.length < 6) {
    return {
      isValid: false,
      message: "Incomplete registration number. Format: SS-RR-XX-NNNN (e.g. MH-12-AB-1234)",
      clean,
    };
  }

  if (clean.length > 13) {
    return {
      isValid: false,
      message: "Registration number is too long (maximum 10-12 characters)",
      clean,
    };
  }

  // Check BH series: YY BH 4digits 1-2letters (e.g. 22BH1234AA)
  const bhMatch = clean.match(/^(\d{2})BH(\d{4})([A-Z]{1,2})$/);
  if (bhMatch) {
    const [, year, num, series] = bhMatch;
    const yearNum = parseInt(year, 10);
    const curr2Digit = new Date().getFullYear() % 100;
    if (yearNum < 21 || yearNum > curr2Digit) {
      return {
        isValid: false,
        message: `Invalid Bharat Series year ${year}. BH series started in 2021.`,
        clean,
      };
    }
    const formatted = `${year}-BH-${num}-${series}`;
    return {
      isValid: true,
      isBH: true,
      year: `20${year}`,
      number: num,
      series,
      formatted,
      clean,
      message: `Valid Bharat (BH) Series Vehicle (Year 20${year}) • #${num}`,
    };
  }

  // Standard State format: State (2 letters) + RTO (2 digits) + Series (0-5 letters) + Number (1-4 digits)
  const stdMatch = clean.match(/^([A-Z]{2})(\d{2})([A-Z]{0,5})(\d{1,4})$/);
  if (!stdMatch) {
    return {
      isValid: false,
      message: "Invalid format. Standard format: SS-RR-XX-NNNN (e.g. MH-12-AB-1234 or DL-01-1234)",
      clean,
    };
  }

  const [, stateCode, rtoStr, series, numStr] = stdMatch;
  const stateName = INDIAN_STATE_CODES[stateCode];
  if (!stateName) {
    return {
      isValid: false,
      message: `Invalid State code '${stateCode}'. Must be a recognized Indian State/UT code (e.g. MH, DL, KA, GJ).`,
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

  const num = parseInt(numStr, 10);
  if (num === 0) {
    return {
      isValid: false,
      message: "Registration number cannot be 0000.",
      clean,
    };
  }

  const formatted = `${stateCode}-${rtoStr}${series ? `-${series}` : ""}-${numStr}`;
  return {
    isValid: true,
    stateCode,
    stateName,
    rto: rtoStr,
    series,
    number: numStr,
    formatted,
    clean,
    message: `Valid: ${stateName} (RTO ${rtoStr})${series ? ` • Series ${series}` : ""} • #${numStr}`,
  };
}
