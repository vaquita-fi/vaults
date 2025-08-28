const { ethers, upgrades, run } = require("hardhat");
const { deploy: ozUpgradesDeploy } = require("@openzeppelin/hardhat-upgrades/dist/utils");

// Configuration for deployment
const VAULT_NAME = "Vaquita Multi Strategy Vault";
const VAULT_SYMBOL = "VAQ";

// Base Sepolia Aave V3 addresses
const AAVE_L2POOL_BASE_SEPOLIA = "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b";
const USDC_TOKEN_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Scroll Sepolia Aave V3 addresses
const AAVE_L2POOL_SCROLL_SEPOLIA = "0x48914C788295b5db23aF2b5F0B3BE775C4eA9440";
const USDC_TOKEN_SCROLL_SEPOLIA = "0x2C9678042D52B97D27f2bD2947F7111d93F3dD0D";

// Base Mainnet Aave V3 addresses
const AAVE_L2POOL_BASE_MAINNET = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
const USDC_TOKEN_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Default IMPLEMENTATION_SLOT for OpenZeppelin UUPS Proxy
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

// Network-aware address selection
function getNetworkConfig() {
  const network = process.env.HARDHAT_NETWORK || 'hardhat';
  
  if (network === 'scrollSepolia') {
    return {
      aavePool: AAVE_L2POOL_SCROLL_SEPOLIA,
      token: USDC_TOKEN_SCROLL_SEPOLIA,
    };
  }
  
  if (network === 'base') {
    return {
      aavePool: AAVE_L2POOL_BASE_MAINNET,
      token: USDC_TOKEN_BASE_MAINNET,
    };
  }
  
  // Default to Base Sepolia
  return {
    aavePool: AAVE_L2POOL_BASE_SEPOLIA,
    token: USDC_TOKEN_BASE_SEPOLIA,
  };
}

// Use configuration based on the network
const networkConfig = getNetworkConfig();
const AAVE_POOL = networkConfig.aavePool;
const TOKEN_ADDRESS = networkConfig.token;

async function main() {
  console.log("Deploying Multi-Strategy Vault...");
  console.log(`Using token address: ${TOKEN_ADDRESS}`);
  console.log(`Using Aave Pool address: ${AAVE_POOL}`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);
  
  // 1. Deploy AccessManager first
  console.log("Deploying AccessManager...");
  const AccessManager = await ethers.getContractFactory("AccessManager");
  const accessManager = await AccessManager.deploy(deployer.address);
  await accessManager.waitForDeployment();
  const accessManagerAddress = await accessManager.getAddress();
  console.log(`AccessManager deployed at: ${accessManagerAddress}`);
  
  // Define roles
  const roles = {
    LP_ROLE: 1,
    LOM_ADMIN: 2,
    REBALANCER_ROLE: 3,
    STRATEGY_ADMIN_ROLE: 4,
    QUEUE_ADMIN_ROLE: 5,
    FORWARD_TO_STRATEGY_ROLE: 6,
  };
  
  // 2. Deploy AaveV3InvestStrategy
  console.log("Deploying AaveV3InvestStrategy...");
  const AaveV3InvestStrategy = await ethers.getContractFactory("AaveV3InvestStrategy");
  const strategy = await AaveV3InvestStrategy.deploy(
    TOKEN_ADDRESS,        // asset (USDC)
    AAVE_POOL             // aave pool
  );
  
  await strategy.waitForDeployment();
  const strategyAddress = await strategy.getAddress();
  console.log(`AaveV3InvestStrategy deployed at: ${strategyAddress}`);
  
  // 3. Deploy the AccessManagedMSV using the custom proxy implementation
  console.log("Deploying AccessManagedMSV...");
  const AccessManagedMSV = await ethers.getContractFactory("AccessManagedMSV");
  const AccessManagedProxy = await ethers.getContractFactory("AccessManagedProxy");
  
  // Prepare initialization parameters
  const strategies = [strategyAddress]; // List of strategy addresses
  const initStrategyDatas = ["0x"]; // Empty bytes for AaveV3InvestStrategy (no initData needed)
  const depositQueue = [0]; // Index of strategy in the strategies array
  const withdrawQueue = [0]; // Index of strategy in the strategies array
  
  // Deploy using upgrades.deployProxy with custom parameters
  const vault = await upgrades.deployProxy(
    AccessManagedMSV,
    [
      VAULT_NAME,
      VAULT_SYMBOL,
      TOKEN_ADDRESS,
      strategies,
      initStrategyDatas,
      depositQueue,
      withdrawQueue,
    ],
    {
      kind: "uups",
      unsafeAllow: ["delegatecall"],
      proxyFactory: AccessManagedProxy,
      deployFunction: async (hre, opts, factory, ...args) => ozUpgradesDeploy(hre, opts, factory, ...args, accessManager),
    }
  );
  
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`AccessManagedMSV deployed at: ${vaultAddress}`);
  
  // Helper function to make all views public
  async function makeAllViewsPublic(vault) {
    // Get all functions from vault
    const vaultInterface = AccessManagedMSV.interface;
    
    // Selectors of functions you want to make public
    const selectors = [];
    for (const fragment of Object.values(vaultInterface.fragments)) {
      if (fragment.type === "function" && 
          (fragment.stateMutability === "view" || fragment.stateMutability === "pure")) {
        selectors.push(vaultInterface.getFunction(fragment.name).selector);
      }
    }
    
    // Set public access for these functions
    if (selectors.length > 0) {
      console.log(`Making ${selectors.length} view functions public...`);
      await accessManager.setTargetFunctionRole(vaultAddress, selectors, 0);
    }
  }
  
  // Make view functions public
  await makeAllViewsPublic(vault);
  
  // Setup roles for the vault
  async function setupRole(roleName, functions) {
    const roleId = roles[roleName];
    if (roleId === undefined) throw new Error(`Unknown role ${roleName}`);
    
    console.log(`Setting up ${roleName} role...`);
    const selectors = [];
    for (const functionName of functions) {
      try {
        const fragment = AccessManagedMSV.interface.getFunction(functionName);
        if (fragment) {
          selectors.push(fragment.selector);
        }
      } catch (error) {
        console.warn(`Function ${functionName} not found in interface`);
      }
    }
    
    if (selectors.length > 0) {
      await accessManager.setTargetFunctionRole(vaultAddress, selectors, roleId);
      
      // Grant this role to the deployer initially
      await accessManager.grantRole(roleId, deployer.address, 0);
    }
  }

  // wait for 60 seconds
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  // Setup the roles
  await setupRole("LP_ROLE", ["withdraw", "deposit", "mint", "redeem", "transfer"]);
  await setupRole("STRATEGY_ADMIN_ROLE", ["addStrategy", "replaceStrategy", "removeStrategy"]);
  await setupRole("QUEUE_ADMIN_ROLE", ["changeDepositQueue", "changeWithdrawQueue"]);
  await setupRole("REBALANCER_ROLE", ["rebalance"]);
  await setupRole("FORWARD_TO_STRATEGY_ROLE", ["forwardToStrategy"]);
  
  // Get implementation address from storage slot
  const provider = ethers.provider;
  const implBytes = await provider.getStorage(vaultAddress, IMPLEMENTATION_SLOT);
  const implAddress = "0x" + implBytes.slice(26);
  
  console.log("Deployment completed successfully!");
  console.log("------------------------------------");
  console.log(`USDC Token Address: ${TOKEN_ADDRESS}`);
  console.log(`Aave V3 Pool Address: ${AAVE_POOL}`);
  console.log("------------------------------------");
  console.log(`AccessManager: ${accessManagerAddress}`);
  console.log(`AaveV3InvestStrategy: ${strategyAddress}`);
  console.log(`Vault: ${vaultAddress}`);
  console.log(`AccessManagedMSV Implementation: ${implAddress}`);
  
  // Verify contracts if not on local network
  const network = process.env.HARDHAT_NETWORK || 'hardhat';
  if (network !== 'hardhat' && network !== 'localhost') {
    const shouldVerify = process.env.VERIFY_CONTRACTS !== 'false';
    
    if (shouldVerify) {
      console.log("\n=== Starting Contract Verification ===");
      
      // Small delay to make sure the blockchain has processed all transactions
      console.log("Waiting for 10 seconds before verification...");
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // 1. Verify AccessManager
      try {
        console.log(`\n1. Verifying AccessManager at ${accessManagerAddress}...`);
        await run("verify:verify", {
          address: accessManagerAddress,
          constructorArguments: [deployer.address],
          contract: "contracts/access/AccessManager.sol:AccessManager"
        });
        console.log("AccessManager verified successfully");
      } catch (error) {
        if (error.message.includes("already verified")) {
          console.log("AccessManager already verified");
        } else {
          console.error("Error verifying AccessManager:", error.message);
        }
      }
      
      // 2. Verify Strategy
      try {
        console.log(`\n2. Verifying AaveV3InvestStrategy at ${strategyAddress}...`);
        await run("verify:verify", {
          address: strategyAddress,
          constructorArguments: [
            TOKEN_ADDRESS,
            AAVE_POOL
          ]
        });
        console.log("AaveV3InvestStrategy verified successfully");
      } catch (error) {
        if (error.message.includes("already verified")) {
          console.log("AaveV3InvestStrategy already verified");
        } else {
          console.error("Error verifying AaveV3InvestStrategy:", error.message);
        }
      }
      
      // 3. Verify Vault Implementation
      try {
        console.log(`\n3. Verifying Vault implementation at ${implAddress}...`);
        await run("verify:verify", {
          address: implAddress
        });
        console.log("Vault implementation verified successfully");
      } catch (error) {
        if (error.message.includes("already verified")) {
          console.log("Vault implementation already verified");
        } else {
          console.error("Error verifying Vault implementation:", error.message);
        }
      }

      // 4. Verify Vault Proxy
      try {
        console.log(`\n4. Verifying AccessManagedProxy at ${vaultAddress}...`);
        
        // Get the initialization data that was used
        const AccessManagedMSV = await ethers.getContractFactory("AccessManagedMSV");
        
        // Encode the initialize function call
        const initializeData = AccessManagedMSV.interface.encodeFunctionData("initialize", [
          VAULT_NAME,
          VAULT_SYMBOL,
          TOKEN_ADDRESS,
          strategies,
          initStrategyDatas,
          depositQueue,
          withdrawQueue
        ]);
        
        // Verify the proxy with the correct constructor arguments
        await run("verify:verify", {
          address: vaultAddress,
          constructorArguments: [
            implAddress,        // implementation address
            initializeData,     // initialization data
            accessManagerAddress // access manager address
          ],
          contract: "contracts/AccessManagedProxy.sol:AccessManagedProxy"
        });
        
        console.log("AccessManagedProxy verified successfully");
      } catch (error) {
        if (error.message.includes("already verified")) {
          console.log("AccessManagedProxy already verified");
        } else {
          console.error("Error verifying AccessManagedProxy:", error.message);
          
          // If verification failed, provide manual verification instructions
          console.log("\nIf proxy verification failed, you can verify manually using:");
          console.log(`npx hardhat run scripts/encode-proxy-constructor.js`);
          console.log("Modify the script first with these values:");
          console.log(`IMPLEMENTATION_ADDRESS: ${implAddress}`);
          console.log(`ACCESS_MANAGER_ADDRESS: ${accessManagerAddress}`);
          console.log("Then use the encoded constructor arguments for manual verification");
        }
      }
      
      console.log("\n=== Contract Verification Completed ===");
    } else {
      console.log("\nSkipping contract verification (VERIFY_CONTRACTS=false)");
      console.log("To verify contracts later, run:");
      console.log(`./scripts/verify-all-contracts.sh ${network} ${vaultAddress} ${strategyAddress} ${accessManagerAddress} ${deployer.address}`);
    }
  }
  
  // Return deployed contract addresses
  return {
    accessManager: accessManagerAddress,
    vault: vaultAddress,
    strategy: strategyAddress,
    implementation: implAddress
  };
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 