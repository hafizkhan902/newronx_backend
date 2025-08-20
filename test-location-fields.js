import { updateProfileSchema } from './src/validators/userValidators.js';

// Test the location fields with empty strings
const testData = {
  firstName: "Hafiz",
  fullName: "hafiz",
  bio: "Test update 1755667899409",
  skills: ["js", "ps", "gf"],
  interestedRoles: [],
  resume: "",
  phone: "8801645272591",
  city: "",
  country: ""
};

console.log('Testing location fields with empty strings:');
console.log('Input data:', JSON.stringify(testData, null, 2));

try {
  const result = updateProfileSchema.validate(testData);
  console.log('\n✅ Validation passed!');
  console.log('Validated data:', JSON.stringify(result.value, null, 2));
} catch (error) {
  console.log('\n❌ Validation failed!');
  console.log('Error:', error.message);
  if (error.details) {
    error.details.forEach((detail, index) => {
      console.log(`Detail ${index + 1}:`);
      console.log('  Path:', detail.path);
      console.log('  Message:', detail.message);
      console.log('  Type:', detail.type);
    });
  }
}

// Test with different location field combinations
console.log('\n--- Testing different location field combinations ---');

const testCases = [
  {
    name: 'All location fields empty',
    data: { city: "", country: "", state: "", address: "", zipCode: "" }
  },
  {
    name: 'Some location fields filled, some empty',
    data: { city: "Dhaka", country: "", state: "Dhaka", address: "Test Address", zipCode: "" }
  },
  {
    name: 'All location fields filled',
    data: { city: "Dhaka", country: "Bangladesh", state: "Dhaka", address: "Test Address", zipCode: "1200" }
  },
  {
    name: 'Mixed empty and filled',
    data: { city: "", country: "Bangladesh", state: "", address: "Test Address", zipCode: "" }
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}:`);
  try {
    const result = updateProfileSchema.validate(testCase.data);
    console.log('   ✅ PASS');
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}`);
  }
});
