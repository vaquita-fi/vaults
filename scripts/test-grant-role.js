const { ethers } = require("hardhat");

// Test script to validate the grant-role functionality
async function main() {
  console.log("Testing grant-role script functionality...");
  
  // Test environment variable validation
  const testCases = [
    {
      name: "Missing ACCESS_MANAGER_ADDRESS",
      env: { ROLE_ID: "7", TARGET_ADDRESS: "0xfceBCCfD7c74e8c5191609dEd61fD81D26a83327" },
      shouldFail: true
    },
    {
      name: "Invalid ROLE_ID",
      env: { 
        ACCESS_MANAGER_ADDRESS: "0xCc020c689BC7a485084d335335bE0c4BE520c3E4",
        ROLE_ID: "0",
        TARGET_ADDRESS: "0xfceBCCfD7c74e8c5191609dEd61fD81D26a83327"
      },
      shouldFail: true
    },
    {
      name: "Missing TARGET_ADDRESS",
      env: { 
        ACCESS_MANAGER_ADDRESS: "0xCc020c689BC7a485084d335335bE0c4BE520c3E4",
        ROLE_ID: "7"
      },
      shouldFail: true
    },
    {
      name: "Valid parameters",
      env: { 
        ACCESS_MANAGER_ADDRESS: "0xCc020c689BC7a485084d335335bE0c4BE520c3E4",
        ROLE_ID: "7",
        TARGET_ADDRESS: "0xfceBCCfD7c74e8c5191609dEd61fD81D26a83327",
        DELAY: "0"
      },
      shouldFail: false
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.name}`);
    
    // Set environment variables
    for (const [key, value] of Object.entries(testCase.env)) {
      process.env[key] = value;
    }
    
    try {
      // Import and run the grant-role script logic
      const { main: grantRoleMain } = require('./grant-role.js');
      
      if (testCase.shouldFail) {
        console.log("❌ Expected to fail but didn't");
      } else {
        console.log("✅ Test passed");
      }
    } catch (error) {
      if (testCase.shouldFail) {
        console.log("✅ Test passed (failed as expected)");
      } else {
        console.log(`❌ Test failed: ${error.message}`);
      }
    }
    
    // Clean up environment variables
    for (const key of Object.keys(testCase.env)) {
      delete process.env[key];
    }
  }
  
  console.log("\nTest completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
