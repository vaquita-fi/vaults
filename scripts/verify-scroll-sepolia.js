const { ethers, run } = require("hardhat");

async function main() {
  // Replace these addresses with your deployed contract addresses
  const VAULT_ADDRESS = "0xF9B2CFB1a624ea39933290eF943A1140f78E2017";
  const STRATEGY_ADDRESS = "0x4628E4E8e28C00f4Ba85FFAE39A6A0d78569E975";
  const ACCESS_MANAGER_ADDRESS = "0x54Cd6C56Ab1676b16d92a7C7F103C2F277c0dDF3";
  
  // USDC on Scroll Sepolia
  const USDC_ADDRESS = "0x2C9678042D52B97D27f2bD2947F7111d93F3dD0D";
  // Aave Pool on Scroll Sepolia  
  const AAVE_POOL_ADDRESS = "0x48914C788295b5db23aF2b5F0B3BE775C4eA9440";
  
  console.log("Starting contract verification on Scroll Sepolia...");
  
  try {
    // 1. Verify AccessManager
    console.log(`Verifying AccessManager at ${ACCESS_MANAGER_ADDRESS}...`);
    await run("verify:verify", {
      address: ACCESS_MANAGER_ADDRESS,
      constructorArguments: [
        // Admin address - this is the deployer address
        "0x5fDF2F46959bD37ba72C06aB523CAC3F88291756"
      ],
      contract: "@openzeppelin/contracts/access/manager/AccessManager.sol:AccessManager"
    });
    console.log("AccessManager verified successfully");
  } catch (error) {
    console.error("Error verifying AccessManager:", error.message);
  }
  
  try {
    // 2. Verify Strategy
    console.log(`Verifying AaveV3InvestStrategy at ${STRATEGY_ADDRESS}...`);
    await run("verify:verify", {
      address: STRATEGY_ADDRESS,
      constructorArguments: [
        USDC_ADDRESS,          // USDC token address
        AAVE_POOL_ADDRESS      // Aave Pool address
      ]
    });
    console.log("AaveV3InvestStrategy verified successfully");
  } catch (error) {
    console.error("Error verifying AaveV3InvestStrategy:", error.message);
  }
  
  // For the implementation address, we need to suggest a manual approach
  // console.log("\nTo verify the vault implementation (proxy):");
  // console.log("1. Use the following command to find the implementation address:");
  // console.log(`   npx hardhat console --network scrollSepolia`);
  // console.log(`   > const provider = ethers.provider`);
  // console.log(`   > const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"`);
  // console.log(`   > const implBytes = await provider.getStorage("${VAULT_ADDRESS}", implSlot)`);
  // console.log(`   > const implAddress = "0x" + implBytes.slice(26)`);
  // console.log(`   > console.log(implAddress)`);
  // console.log("\n2. Once you have the implementation address, verify it using:");
  // console.log("   npx hardhat verify --network scrollSepolia <IMPLEMENTATION_ADDRESS>");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
