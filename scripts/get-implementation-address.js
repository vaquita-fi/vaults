const { ethers } = require("hardhat");

async function main() {
  // The proxy address
  const PROXY_ADDRESS = "0xF9B2CFB1a624ea39933290eF943A1140f78E2017";
  
  // Get implementation slot
  const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  
  const provider = ethers.provider;
  console.log("Getting implementation address...");
  
  try {
    // For Ethers v6
    const storageValue = await provider.getStorage(PROXY_ADDRESS, IMPLEMENTATION_SLOT);
    // Extract the address from the storage value (padding with zeros if needed)
    const implementationAddress = "0x" + storageValue.toString().slice(-40);
    console.log(`Implementation address: ${implementationAddress}`);
    console.log(`\nTo verify the implementation contract, run:`);
    console.log(`npx hardhat verify --network scrollSepolia ${implementationAddress}`);
  } catch (error) {
    // Handle error or try alternative method
    console.error("Error getting implementation address:", error.message);
    console.log("Make sure you're using the correct Ethers version and provider method");
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 