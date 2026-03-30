export interface LithuanianPersonalCodeResult {
  valid: boolean;
  errorEn?: string;
  errorLt?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: "male" | "female";
}

/**
 * Validates a Lithuanian personal identification code (asmens kodas).
 * Format: 11 digits — GYYMMDDNNNC
 *   G = century+gender (1–6)
 *   YY = year within century
 *   MM = birth month
 *   DD = birth day
 *   NNN = serial number
 *   C = checksum digit
 */
export function validateLithuanianPersonalCode(code: string): LithuanianPersonalCodeResult {
  if (!/^\d{11}$/.test(code)) {
    return {
      valid: false,
      errorEn: "Must be exactly 11 digits",
      errorLt: "Turi būti lygiai 11 skaitmenų",
    };
  }

  const d = code.split("").map(Number);
  const century = d[0];

  let yearPrefix: number;
  let gender: "male" | "female";

  if (century === 1 || century === 2) {
    yearPrefix = 1800;
    gender = century === 1 ? "male" : "female";
  } else if (century === 3 || century === 4) {
    yearPrefix = 1900;
    gender = century === 3 ? "male" : "female";
  } else if (century === 5 || century === 6) {
    yearPrefix = 2000;
    gender = century === 5 ? "male" : "female";
  } else {
    return {
      valid: false,
      errorEn: "First digit must be 1–6",
      errorLt: "Pirmasis skaitmuo turi būti 1–6",
    };
  }

  const year  = yearPrefix + d[1] * 10 + d[2];
  const month = d[3] * 10 + d[4];
  const day   = d[5] * 10 + d[6];

  if (month < 1 || month > 12) {
    return {
      valid: false,
      errorEn: "Invalid birth month in personal code",
      errorLt: "Neteisingas gimimo mėnuo asmens kode",
    };
  }

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth()    !== month - 1 ||
    date.getDate()     !== day
  ) {
    return {
      valid: false,
      errorEn: "Invalid birth date in personal code",
      errorLt: "Neteisinga gimimo data asmens kode",
    };
  }

  // Checksum — two weight sets
  const w1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
  const w2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3];

  let sum = 0;
  for (let i = 0; i < 10; i++) sum += d[i] * w1[i];
  let check = sum % 11;

  if (check === 10) {
    sum = 0;
    for (let i = 0; i < 10; i++) sum += d[i] * w2[i];
    check = sum % 11;
    if (check === 10) check = 0;
  }

  if (check !== d[10]) {
    return {
      valid: false,
      errorEn: "Invalid personal code (checksum error)",
      errorLt: "Neteisingas asmens kodas (kontrolinio skaitmens klaida)",
    };
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return {
    valid: true,
    dateOfBirth: `${year}-${mm}-${dd}`,
    gender,
  };
}
