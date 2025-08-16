// Test script for email service
// Run this with: node test-email.js

const BASE_URL = 'http://localhost:2000';

async function testEmailService() {
  console.log('🧪 Testing StudentMate Email Service\n');

  // Test 1: Check if server is running
  console.log('1. Testing server connection...');
  try {
    const response = await fetch(`${BASE_URL}/`);
    const data = await response.text();
    console.log('✅ Server is running:', data);
  } catch (error) {
    console.log('❌ Server connection failed:', error.message);
    return;
  }

  // Test 2: Test email service connection
  console.log('\n2. Testing email service connection...');
  try {
    const response = await fetch(`${BASE_URL}/api/email/test`);
    const data = await response.json();
    console.log('📧 Email service response:', data.message);
  } catch (error) {
    console.log('❌ Email service test failed:', error.message);
  }

  // Test 3: Test welcome email (will fail without email config)
  console.log('\n3. Testing welcome email...');
  try {
    const response = await fetch(`${BASE_URL}/api/email/test-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });
    const data = await response.json();
    console.log('📧 Welcome email test response:', data.message);
  } catch (error) {
    console.log('❌ Welcome email test failed:', error.message);
  }

  // Test 4: Test user registration (will send welcome email if configured)
  console.log('\n4. Testing user registration...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: 'Test',
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        password: 'testpassword123',
        confirmPassword: 'testpassword123'
      })
    });
    const data = await response.json();
    console.log('📧 Registration response:', data.message);
  } catch (error) {
    console.log('❌ Registration test failed:', error.message);
  }

  console.log('\n🎉 Email service test completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Configure your email credentials in .env file');
  console.log('2. See EMAIL_SETUP_GUIDE.md for detailed instructions');
  console.log('3. Test again with proper email configuration');
}

// Run the test
testEmailService().catch(console.error); 