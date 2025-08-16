// Test script for email verification with OTP
// Run this with: node test-email-verification.js

const BASE_URL = 'http://localhost:2000';

async function testEmailVerification() {
  console.log('🧪 Testing StudentMate Email Verification Flow\n');

  const testEmail = 'test-verification@example.com';
  let userId = null;
  let otpCode = null;

  // Step 1: Register new user (should send OTP)
  console.log('1. Testing user registration with email verification...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: 'Test',
        fullName: 'Test Verification User',
        email: testEmail,
        phone: '1234567890',
        password: 'testpass123',
        confirmPassword: 'testpass123'
      })
    });
    const data = await response.json();
    console.log('📧 Registration response:', data.message);
    
    if (data.userId) {
      userId = data.userId;
      console.log('✅ User ID received:', userId);
    }
  } catch (error) {
    console.log('❌ Registration failed:', error.message);
    return;
  }

  // Step 2: Try to login (should fail - email not verified)
  console.log('\n2. Testing login with unverified email...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'testpass123'
      })
    });
    const data = await response.json();
    console.log('🔒 Login response:', data.message);
    
    if (data.needsVerification) {
      console.log('✅ Correctly blocked unverified user from logging in');
    }
  } catch (error) {
    console.log('❌ Login test failed:', error.message);
  }

  // Step 3: Test invalid OTP verification
  console.log('\n3. Testing invalid OTP verification...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        otpCode: '000000'
      })
    });
    const data = await response.json();
    console.log('❌ Invalid OTP response:', data.message);
  } catch (error) {
    console.log('❌ Invalid OTP test failed:', error.message);
  }

  // Step 4: Test resend verification OTP
  console.log('\n4. Testing resend verification OTP...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail
      })
    });
    const data = await response.json();
    console.log('📧 Resend OTP response:', data.message);
  } catch (error) {
    console.log('❌ Resend OTP test failed:', error.message);
  }

  console.log('\n🎉 Email verification flow test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Check the email for the verification OTP');
  console.log('2. Use the OTP to verify the email via /api/auth/verify-email');
  console.log('3. After verification, the user can login successfully');
  console.log('4. Welcome email will be sent after successful verification');
}

// Run the test
testEmailVerification().catch(console.error); 