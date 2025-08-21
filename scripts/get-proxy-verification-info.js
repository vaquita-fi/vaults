const { ethers } = require("hardhat");

async function main() {
  // Contract addresses from deployment
  const PROXY_ADDRESS = "0xF9B2CFB1a624ea39933290eF943A1140f78E2017";
  
  // AccessManagedProxy constructor arguments:
  // 1. implementation
  // 2. data (initialization data)
  // 3. accessManager
  
  // Get implementation address from storage slot
  const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const provider = ethers.provider;
  
  try {
    console.log("Getting information for AccessManagedProxy verification...");
    
    // Get implementation address
    const storageValue = await provider.getStorage(PROXY_ADDRESS, IMPLEMENTATION_SLOT);
    const implementationAddress = "0x" + storageValue.toString().slice(-40);
    console.log(`Implementation Address: ${implementationAddress}`);
    
    // Get AccessManager address
    // This requires examining the contract storage layout
    // We know ACCESS_MANAGER is an immutable variable, which means it's part of the runtime code
    // We need to analyze the contract bytecode
    console.log("\nAccessManager address can be found directly from the contract bytecode.");
    console.log("To verify the AccessManagedProxy, you'll need:");
    console.log("1. The Implementation Address: " + implementationAddress);
    console.log("2. The Initialization Data (from deployment)");
    console.log("3. The AccessManager Address: 0x54Cd6C56Ab1676b16d92a7C7F103C2F277c0dDF3");
    
    console.log("\nYou can verify the proxy on Scrollscan by:");
    console.log("1. Go to https://sepolia.scrollscan.com/address/" + PROXY_ADDRESS);
    console.log("2. Select 'Contract' tab");
    console.log("3. Click 'Verify and Publish'");
    console.log("4. Select 'Solidity (Standard JSON Input)' as verification method");
    console.log("5. Upload contract source and enter constructor arguments in ABI-encoded format");
    
    // For manually constructing the ABI-encoded constructor arguments
    console.log("\nConstructor Arguments Format:");
    console.log(`implementation address: ${implementationAddress}`);
    console.log("initialization data: [complex byte string from deployment]");
    console.log("access manager: 0x54Cd6C56Ab1676b16d92a7C7F103C2F277c0dDF3");
    
    // Example of how to generate the ABI-encoded constructor arguments
    console.log("\nGet ABI-encoded constructor args with this command:");
    console.log(`npx hardhat run scripts/encode-proxy-constructor.js`);
  } catch (error) {
    console.error("Error getting proxy verification info:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 