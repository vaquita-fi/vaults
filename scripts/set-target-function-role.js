const { ethers } = require("hardhat");

// Role definitions (matching deploy-vault.js)
const roles = {
  LP_ROLE: 1,
  LOM_ADMIN: 2,
  REBALANCER_ROLE: 3,
  STRATEGY_ADMIN_ROLE: 4,
  QUEUE_ADMIN_ROLE: 5,
  FORWARD_TO_STRATEGY_ROLE: 6,
  READ_ONLY_ROLE: 7
};

// Enhanced logging function
function logStep(step, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${step}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [${step}] Data:`, JSON.stringify(data, null, 2));
  }
}

async function main() {
  // Get parameters from environment variables
  const accessManagerAddress = process.env.ACCESS_MANAGER_ADDRESS;
  const targetAddress = process.env.TARGET_ADDRESS;
  const functionSelectors = process.env.FUNCTION_SELECTORS;
  const roleId = parseInt(process.env.ROLE_ID);
  
  // Validate required parameters
  if (!accessManagerAddress) {
    throw new Error("ACCESS_MANAGER_ADDRESS environment variable is required");
  }
  
  if (!targetAddress) {
    throw new Error("TARGET_ADDRESS environment variable is required");
  }
  
  if (!functionSelectors) {
    throw new Error("FUNCTION_SELECTORS environment variable is required");
  }
  
  if (roleId === undefined || roleId < 0 || roleId > 7) {
    throw new Error("ROLE_ID environment variable is required and must be between 0-7 (0 for public)");
  }
  
  logStep("INIT", "Starting setTargetFunctionRole operation");
  logStep("CONFIG", `AccessManager: ${accessManagerAddress}`);
  logStep("CONFIG", `Target Address: ${targetAddress}`);
  logStep("CONFIG", `Function Selectors: ${functionSelectors}`);
  logStep("CONFIG", `Role ID: ${roleId}`);
  
  // Get the signer
  const [signer] = await ethers.getSigners();
  logStep("SIGNER", `Using account: ${signer.address}`);
  
  // Connect to the AccessManager contract
  const AccessManager = await ethers.getContractFactory("AccessManager");
  const accessManager = AccessManager.attach(accessManagerAddress);
  
  // Parse function selectors (comma-separated)
  const selectors = functionSelectors.split(',').map(s => s.trim()).filter(s => s.length > 0);
  
  if (selectors.length === 0) {
    throw new Error("No valid function selectors provided");
  }
  
  // Validate selectors format (should be 4-byte hex strings)
  for (const selector of selectors) {
    if (!/^0x[a-fA-F0-9]{8}$/.test(selector)) {
      throw new Error(`Invalid function selector format: ${selector}. Must be 4-byte hex string (e.g., 0x12345678)`);
    }
  }
  
  // Get role name for logging
  const roleName = roleId === 0 ? "PUBLIC" : (Object.keys(roles).find(key => roles[key] === roleId) || `ROLE_${roleId}`);
  
  logStep("SETUP", `Setting ${selectors.length} function(s) to ${roleName} role...`);
  logStep("SETUP", `Selectors: ${selectors.join(', ')}`);
  
  try {
    // Call setTargetFunctionRole function
    const tx = await accessManager.setTargetFunctionRole(targetAddress, selectors, roleId);
    logStep("TX", `Transaction submitted: ${tx.hash}`);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    logStep("SUCCESS", `✅ Function roles set successfully!`);
    logStep("INFO", `Transaction hash: ${tx.hash}`);
    logStep("INFO", `Gas used: ${receipt.gasUsed.toString()}`);
    logStep("INFO", `Block number: ${receipt.blockNumber}`);
    
    // Verify the function roles were set
    logStep("VERIFY", "Verifying function role assignments...");
    for (const selector of selectors) {
      try {
        const assignedRole = await accessManager.getTargetFunctionRole(targetAddress, selector);
        if (assignedRole.toString() === roleId.toString()) {
          logStep("VERIFY", `✅ Function ${selector} correctly assigned to role ${roleId}`);
        } else {
          logStep("WARNING", `⚠️ Function ${selector} assigned to role ${assignedRole}, expected ${roleId}`);
        }
      } catch (error) {
        logStep("WARNING", `⚠️ Could not verify function ${selector}: ${error.message}`);
      }
    }
    
  } catch (error) {
    logStep("ERROR", `❌ Failed to set function roles: ${error.message}`);
    
    // Provide helpful error messages
    if (error.message.includes("AccessManager: account is missing role")) {
      logStep("HELP", "The signer account doesn't have permission to set function roles");
      logStep("HELP", "Make sure the signer has the appropriate admin role");
    } else if (error.message.includes("AccessManager: role is not managed")) {
      logStep("HELP", "The role ID is not managed by this AccessManager");
    } else if (error.message.includes("AccessManager: target is not a contract")) {
      logStep("HELP", "The target address is not a contract or doesn't exist");
    }
    
    throw error;
  }
  
  logStep("COMPLETE", "Function role assignment operation completed successfully");
}

// Execute the script
main()
  .then(() => {
    logStep("SUCCESS", "Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logStep("ERROR", `Script failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
