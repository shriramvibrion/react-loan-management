/**
 * Validate email format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate Indian mobile number (10 digits).
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

/**
 * Validate PAN number format (ABCDE1234F).
 * @param {string} pan
 * @returns {boolean}
 */
export function isValidPAN(pan) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
}

/**
 * Validate Aadhaar number (12 digits).
 * @param {string} aadhaar
 * @returns {boolean}
 */
export function isValidAadhaar(aadhaar) {
  return /^\d{12}$/.test(aadhaar);
}

/**
 * Validate postal code (6 digits).
 * @param {string} code
 * @returns {boolean}
 */
export function isValidPostalCode(code) {
  return /^\d{6}$/.test(code);
}

/**
 * Sanitize string input (trim and limit length).
 * @param {string} value
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeInput(value, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}
