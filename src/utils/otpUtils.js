// OTP utility functions

// Generate a 6-digit OTP code
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if OTP is expired
export function isOTPExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
}

// Check if OTP attempts exceeded
export function isOTPAttemptsExceeded(attempts, maxAttempts = 5) {
  return attempts >= maxAttempts;
}

// Calculate OTP expiration time (10 minutes from now)
export function getOTPExpirationTime() {
  const expirationTime = new Date();
  expirationTime.setMinutes(expirationTime.getMinutes() + 10);
  return expirationTime;
}

// Validate OTP format (6 digits)
export function validateOTPFormat(otp) {
  return /^\d{6}$/.test(otp);
} 