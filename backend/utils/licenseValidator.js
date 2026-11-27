const INDIAN_STATE_CODES = {
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

function validateLicenseNumber(licenseInput) {
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

  const clean = raw.replace(/[^A-Z0-9]/g, "");

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

module.exports = {
  INDIAN_STATE_CODES,
  validateLicenseNumber,
};
