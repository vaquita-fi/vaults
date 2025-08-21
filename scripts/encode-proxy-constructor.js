const { ethers } = require("hardhat");

async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  
  // Validate command line arguments or use defaults
  const IMPLEMENTATION_ADDRESS = args[0] || process.env.IMPLEMENTATION_ADDRESS;
  const ACCESS_MANAGER_ADDRESS = args[1] || process.env.ACCESS_MANAGER_ADDRESS;
  const VAULT_ADDRESS = args[2] || process.env.VAULT_ADDRESS;
  
  // Check if we have the required addresses
  if (!IMPLEMENTATION_ADDRESS || !ACCESS_MANAGER_ADDRESS) {
    console.log("Usage: npx hardhat run scripts/encode-proxy-constructor.js <implementation_address> <access_manager_address> [vault_address]");
    console.log("Or set IMPLEMENTATION_ADDRESS and ACCESS_MANAGER_ADDRESS in your environment/config");
    console.log("\nExample:");
    console.log("  npx hardhat run scripts/encode-proxy-constructor.js 0x1234...5678 0xabcd...ef01");
    process.exit(1);
  }
  
  console.log("Using addresses:");
  console.log(`Implementation: ${IMPLEMENTATION_ADDRESS}`);
  console.log(`Access Manager: ${ACCESS_MANAGER_ADDRESS}`);
  if (VAULT_ADDRESS) console.log(`Vault: ${VAULT_ADDRESS}`);

  try {
    console.log("\nEncoding constructor arguments for AccessManagedProxy...");
    
    // If we have a vault address, we can try to get the initialization data from the blockchain
    let initializeData;
    
    if (VAULT_ADDRESS) {
      console.log("Getting initialization data from transaction history...");
      try {
        // This is a simplification - in reality we would need to look through transaction history
        // and find the transaction that deployed the proxy, then extract the init data
        console.log("Note: Automatic retrieval of initialization data not implemented.");
        console.log("Using a sample initialization data instead:");
        
        // Generate sample initialization data for demonstration
        const AccessManagedMSV = await ethers.getContractFactory("AccessManagedMSV");
        
        initializeData = AccessManagedMSV.interface.encodeFunctionData("initialize", [
          "Vaquita Multi Strategy Vault",
          "VAQ",
          ethers.ZeroAddress, // Placeholder for token address
          [], // strategies array
          [], // initStrategyDatas array
          [], // depositQueue
          []  // withdrawQueue
        ]);
      } catch (error) {
        console.log("Failed to get initialization data from blockchain:", error.message);
        // Fallback to sample data
        initializeData = "0xfe4b84df000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000019566171756974612056616c74204d756c746920537472617465677900000000000000000000000000000000000000000000000000000000000000000000000354415100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
      }
    } else {
      // Use sample initialization data
      initializeData = "0xfe4b84df000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000019566171756974612056616c74204d756c746920537472617465677900000000000000000000000000000000000000000000000000000000000000000000000354415100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
      console.log("No vault address provided. Using sample initialization data.");
    }
    
    console.log("\nInitialization Data (for reference):");
    console.log(initializeData);
    
    // Using ethers to encode constructor arguments based on version
    try {
      // For ethers v6
      console.log("\nABI-encoded constructor arguments (ethers v6):");
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encodedArgs = abiCoder.encode(
        ["address", "bytes", "address"],
        [IMPLEMENTATION_ADDRESS, initializeData, ACCESS_MANAGER_ADDRESS]
      );
      console.log(encodedArgs);
    } catch (e) {
      try {
        // For ethers v5
        console.log("\nABI-encoded constructor arguments (ethers v5):");
        const encodedArgs = ethers.utils.defaultAbiCoder.encode(
          ["address", "bytes", "address"],
          [IMPLEMENTATION_ADDRESS, initializeData, ACCESS_MANAGER_ADDRESS]
        );
        console.log(encodedArgs);
      } catch (e2) {
        console.error("Error with ABI encoding, trying alternative method...");
        
        // Manual encoding with console instructions
        console.log("\nUse this tool to encode your constructor arguments:");
        console.log("https://abi.hashex.org/");
        console.log("\nFunction: constructor(address _implementation, bytes _data, address _accessManager)");
        console.log("\nArguments:");
        console.log(`_implementation: ${IMPLEMENTATION_ADDRESS}`);
        console.log(`_data: ${initializeData}`);
        console.log(`_accessManager: ${ACCESS_MANAGER_ADDRESS}`);
      }
    }
    
    console.log("\nUse these encoded constructor arguments for verification on the block explorer.");
    console.log("\nVerification steps:");
    console.log(`1. Go to the block explorer and find your proxy contract at ${VAULT_ADDRESS || '<your-proxy-address>'}`);
    console.log("2. Select 'Contract' tab and then 'Verify & Publish'");
    console.log("3. Select 'Solidity (Standard JSON Input)' as the verification method");
    console.log("4. Upload your flattened contract or provide the source code");
    console.log("5. Set the contract name to 'AccessManagedProxy'");
    console.log("6. Paste the ABI-encoded constructor arguments from above");
    console.log("7. Complete the verification process");
  } catch (error) {
    console.error("Error encoding constructor arguments:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 