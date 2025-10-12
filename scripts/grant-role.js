const { ethers } = require("hardhat");

// Role definitions (matching deploy-vault-enhanced.js)
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
  const roleId = parseInt(process.env.ROLE_ID);
  const targetAddress = process.env.TARGET_ADDRESS;
  const delay = parseInt(process.env.DELAY || '0');
  
  // Validate required parameters
  if (!accessManagerAddress) {
    throw new Error("ACCESS_MANAGER_ADDRESS environment variable is required");
  }
  
  if (!roleId || roleId < 1 || roleId > 7) {
    throw new Error("ROLE_ID environment variable is required and must be between 1-7");
  }
  
  if (!targetAddress) {
    throw new Error("TARGET_ADDRESS environment variable is required");
  }
  
  logStep("INIT", "Starting role grant operation");
  logStep("CONFIG", `AccessManager: ${accessManagerAddress}`);
  logStep("CONFIG", `Role ID: ${roleId}`);
  logStep("CONFIG", `Target Address: ${targetAddress}`);
  logStep("CONFIG", `Delay: ${delay}`);
  
  // Get the signer
  const [signer] = await ethers.getSigners();
  logStep("SIGNER", `Using account: ${signer.address}`);
  
  // Connect to the AccessManager contract
  const AccessManager = await ethers.getContractFactory("AccessManager");
  const accessManager = AccessManager.attach(accessManagerAddress);
  
  // Get role name for logging
  const roleName = Object.keys(roles).find(key => roles[key] === roleId) || `ROLE_${roleId}`;
  
  logStep("GRANT", `Granting ${roleName} (${roleId}) to ${targetAddress}...`);
  
  try {
    // Call grantRole function
    const tx = await accessManager.grantRole(roleId, targetAddress, delay);
    logStep("TX", `Transaction submitted: ${tx.hash}`);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    logStep("SUCCESS", `✅ Role granted successfully!`);
    logStep("INFO", `Transaction hash: ${tx.hash}`);
    logStep("INFO", `Gas used: ${receipt.gasUsed.toString()}`);
    logStep("INFO", `Block number: ${receipt.blockNumber}`);
    
    // Verify the role was granted
    logStep("VERIFY", "Verifying role grant...");
    const hasRole = await accessManager.hasRole(roleId, targetAddress);
    if (hasRole) {
      logStep("VERIFY", "✅ Role verification successful");
    } else {
      logStep("WARNING", "⚠️ Role verification failed - role may not be active yet");
    }
    
  } catch (error) {
    logStep("ERROR", `❌ Failed to grant role: ${error.message}`);
    
    // Provide helpful error messages
    if (error.message.includes("AccessManager: account is missing role")) {
      logStep("HELP", "The signer account doesn't have permission to grant this role");
      logStep("HELP", "Make sure the signer has the appropriate admin role");
    } else if (error.message.includes("AccessManager: can only renounce roles for self")) {
      logStep("HELP", "Cannot grant role to the same address that's calling the function");
    } else if (error.message.includes("AccessManager: role is not managed")) {
      logStep("HELP", "The role ID is not managed by this AccessManager");
    }
    
    throw error;
  }
  
  logStep("COMPLETE", "Role grant operation completed successfully");
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
