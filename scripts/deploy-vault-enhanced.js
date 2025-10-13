const { ethers, upgrades, run } = require("hardhat");
const { deploy: ozUpgradesDeploy } = require("@openzeppelin/hardhat-upgrades/dist/utils");

// Enhanced configuration for deployment with multiple tokens
const VAULT_NAME_PREFIX = "Vaquita Multi Strategy Vault";
const VAULT_SYMBOL_PREFIX = "VAQ";

// Token configurations for different networks
const TOKEN_CONFIGS = {
  baseSepolia: {
    USDC: {
      address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      aavePool: "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b",
      symbol: "USDC",
      name: "USD Coin"
    },
    WETH: {
      address: "0x4200000000000000000000000000000000000006", // Native WETH on Base Sepolia
      aavePool: "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b",
      symbol: "WETH",
      name: "Wrapped Ether"
    },
    USDT: {
      address: "0x0a215D8ba66387DCA84B284D18c3B4ec3de6E54a",
      aavePool: "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27",
      symbol: "USDT",
      name: "Tether USD"
    }
  },
  base: {
    USDC: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      symbol: "USDC",
      name: "USD Coin"
    },
    WETH: {
      address: "0x4200000000000000000000000000000000000006", // Native WETH on Base
      aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      symbol: "WETH",
      name: "Wrapped Ether"
    },
    cbBTC: {
      address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", // cbBTC on Base
      aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      symbol: "cbBTC",
      name: "Coinbase Bitcoin"
    }
  },
  scrollSepolia: {
    USDC: {
      address: "0x2C9678042D52B97D27f2bD2947F7111d93F3dD0D",
      aavePool: "0x48914C788295b5db23aF2b5F0B3BE775C4eA9440",
      symbol: "USDC",
      name: "USD Coin"
    }
  }
};

// Default IMPLEMENTATION_SLOT for OpenZeppelin UUPS Proxy
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

// Network-aware configuration selection
function getNetworkConfig(tokenType = 'USDC') {
  const network = process.env.HARDHAT_NETWORK || 'hardhat';
  
  if (!TOKEN_CONFIGS[network]) {
    throw new Error(`Network ${network} not supported`);
  }
  
  if (!TOKEN_CONFIGS[network][tokenType]) {
    throw new Error(`Token ${tokenType} not supported on network ${network}`);
  }
  
  return TOKEN_CONFIGS[network][tokenType];
}

// Enhanced logging function
function logStep(step, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${step}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [${step}] Data:`, JSON.stringify(data, null, 2));
  }
}

// Get verification delay from environment or use default
function getVerificationDelay() {
  return parseInt(process.env.VERIFICATION_DELAY || '15') * 1000; // Convert to milliseconds
}

// Enhanced verification function with better error handling
async function verifyContract(contractName, address, constructorArgs = [], contractPath = null) {
  logStep("VERIFY", `Starting verification for ${contractName} at ${address}`);
  
  try {
    const verifyOptions = {
      address: address,
      constructorArguments: constructorArgs
    };
    
    if (contractPath) {
      verifyOptions.contract = contractPath;
    }
    
    await run("verify:verify", verifyOptions);
    logStep("VERIFY", `✅ ${contractName} verified successfully`);
    return true;
  } catch (error) {
    if (error.message.includes("already verified")) {
      logStep("VERIFY", `ℹ️ ${contractName} already verified`);
      return true;
    } else {
      logStep("VERIFY", `❌ Failed to verify ${contractName}: ${error.message}`);
      return false;
    }
  }
}

async function main() {
  // Get token type from environment variable or default to USDC
  const tokenType = process.env.TOKEN_TYPE || 'USDC';
  const network = process.env.HARDHAT_NETWORK || 'hardhat';
  
  logStep("INIT", `Starting deployment for ${tokenType} on ${network}`);
  
  // Get network configuration
  const networkConfig = getNetworkConfig(tokenType);
  const TOKEN_ADDRESS = networkConfig.address;
  const AAVE_POOL = networkConfig.aavePool;
  const TOKEN_SYMBOL = networkConfig.symbol;
  
  // Check if token is supported (not placeholder)
  if (TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
    logStep("ERROR", `Token ${tokenType} is not supported on ${network}`);
    process.exit(1);
  }
  
  logStep("CONFIG", `Using ${tokenType} token: ${TOKEN_ADDRESS}`);
  logStep("CONFIG", `Using Aave Pool: ${AAVE_POOL}`);
  
  const [deployer] = await ethers.getSigners();
  logStep("DEPLOYER", `Deploying with account: ${deployer.address}`);
  
  // 1. Deploy AccessManager first
  logStep("DEPLOY", "Deploying AccessManager...");
  const AccessManager = await ethers.getContractFactory("AccessManager");
  const accessManager = await AccessManager.deploy(deployer.address);
  await accessManager.waitForDeployment();
  const accessManagerAddress = await accessManager.getAddress();
  logStep("DEPLOY", `✅ AccessManager deployed at: ${accessManagerAddress}`);
  
  // Define roles
  const roles = {
    LP_ROLE: 1,
    LOM_ADMIN: 2,
    REBALANCER_ROLE: 3,
    STRATEGY_ADMIN_ROLE: 4,
    QUEUE_ADMIN_ROLE: 5,
    FORWARD_TO_STRATEGY_ROLE: 6,
    READ_ONLY_ROLE: 7
  };
  
  // 2. Deploy AaveV3InvestStrategy
  logStep("DEPLOY", "Deploying AaveV3InvestStrategy...");
  const AaveV3InvestStrategy = await ethers.getContractFactory("AaveV3InvestStrategy");
  const strategy = await AaveV3InvestStrategy.deploy(
    TOKEN_ADDRESS,        // asset
    AAVE_POOL             // aave pool
  );
  
  await strategy.waitForDeployment();
  const strategyAddress = await strategy.getAddress();
  logStep("DEPLOY", `✅ AaveV3InvestStrategy deployed at: ${strategyAddress}`);
  
  // 3. Deploy the AccessManagedMSV using the custom proxy implementation
  logStep("DEPLOY", "Deploying AccessManagedMSV...");
  const AccessManagedMSV = await ethers.getContractFactory("AccessManagedMSV");
  const AccessManagedProxy = await ethers.getContractFactory("AccessManagedProxy");
  
  // Prepare initialization parameters
  const strategies = [strategyAddress]; // List of strategy addresses
  const initStrategyDatas = ["0x"]; // Empty bytes for AaveV3InvestStrategy (no initData needed)
  const depositQueue = [0]; // Index of strategy in the strategies array
  const withdrawQueue = [0]; // Index of strategy in the strategies array
  
  // Create token-specific vault name and symbol
  const vaultName = `${VAULT_NAME_PREFIX} ${TOKEN_SYMBOL}`;
  const vaultSymbol = `${VAULT_SYMBOL_PREFIX}-${TOKEN_SYMBOL}`;
  
  // Deploy using upgrades.deployProxy with custom parameters
  const vault = await upgrades.deployProxy(
    AccessManagedMSV,
    [
      vaultName,
      vaultSymbol,
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
  logStep("DEPLOY", `✅ AccessManagedMSV deployed at: ${vaultAddress}`);
  
  // Helper function to make all views public
  async function makeAllViewsPublic(vault) {
    logStep("SETUP", "Making view functions public...");
    const vaultInterface = AccessManagedMSV.interface;
    
    const selectors = [];
    for (const fragment of Object.values(vaultInterface.fragments)) {
      if (fragment.type === "function" && 
          (fragment.stateMutability === "view" || fragment.stateMutability === "pure")) {
        selectors.push(vaultInterface.getFunction(fragment.name).selector);
      }
    }
    
    if (selectors.length > 0) {
      logStep("SETUP", `Setting ${selectors.length} view functions as public...`);
      await accessManager.setTargetFunctionRole(vaultAddress, selectors, 0);
      logStep("SETUP", "✅ View functions set as public");
    }
  }
  
  // Make view functions public
  await makeAllViewsPublic(vault);
  
  // Setup roles for the vault
  async function setupRole(roleName, functions) {
    const roleId = roles[roleName];
    if (roleId === undefined) throw new Error(`Unknown role ${roleName}`);
    
    logStep("SETUP", `Setting up ${roleName} role...`);
    const selectors = [];
    for (const functionName of functions) {
      try {
        const fragment = AccessManagedMSV.interface.getFunction(functionName);
        if (fragment) {
          selectors.push(fragment.selector);
        }
      } catch (error) {
        logStep("WARNING", `Function ${functionName} not found in interface`);
      }
    }
    
    if (selectors.length > 0) {
      await accessManager.setTargetFunctionRole(vaultAddress, selectors, roleId);
      await accessManager.grantRole(roleId, deployer.address, 0);
      logStep("SETUP", `✅ ${roleName} role configured`);
    }
  }

  // Wait for transactions to be processed
  logStep("WAIT", "Waiting for transactions to be processed...");
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  // Setup the roles
  await setupRole("LP_ROLE", ["withdraw", "deposit", "mint", "redeem", "transfer"]);
  await setupRole("STRATEGY_ADMIN_ROLE", ["addStrategy", "replaceStrategy", "removeStrategy"]);
  await setupRole("QUEUE_ADMIN_ROLE", ["changeDepositQueue", "changeWithdrawQueue"]);
  await setupRole("REBALANCER_ROLE", ["rebalance"]);
  await setupRole("FORWARD_TO_STRATEGY_ROLE", ["forwardToStrategy"]);
  await setupRole("READ_ONLY_ROLE", ["previewDeposit", "previewMint", "previewWithdraw", "previewRedeem"]);
  
  // Get implementation address from storage slot
  const provider = ethers.provider;
  const implBytes = await provider.getStorage(vaultAddress, IMPLEMENTATION_SLOT);
  const implAddress = "0x" + implBytes.slice(26);
  
  logStep("SUCCESS", "Deployment completed successfully!");
  logStep("INFO", "=== DEPLOYMENT SUMMARY ===");
  logStep("INFO", `Network: ${network}`);
  logStep("INFO", `Token: ${tokenType} (${TOKEN_SYMBOL})`);
  logStep("INFO", `Token Address: ${TOKEN_ADDRESS}`);
  logStep("INFO", `Aave Pool: ${AAVE_POOL}`);
  logStep("INFO", `AccessManager: ${accessManagerAddress}`);
  logStep("INFO", `Strategy: ${strategyAddress}`);
  logStep("INFO", `Vault: ${vaultAddress}`);
  logStep("INFO", `Implementation: ${implAddress}`);
  
  // Verify contracts if not on local network
  if (network !== 'hardhat' && network !== 'localhost') {
    const shouldVerify = process.env.VERIFY_CONTRACTS !== 'false';
    
    if (shouldVerify) {
      logStep("VERIFY", "=== Starting Contract Verification ===");
      
      // Wait for blockchain to process transactions
      logStep("VERIFY", "Waiting 10 seconds before verification...");
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const verificationResults = {
        accessManager: false,
        strategy: false,
        implementation: false,
        proxy: false
      };
      
      // 1. Verify AccessManager
      verificationResults.accessManager = await verifyContract(
        "AccessManager",
        accessManagerAddress,
        [deployer.address],
        "contracts/access/extensions/AccessManager.sol:AccessManager"
      );
      
      // Wait between verifications to avoid rate limiting
      let verificationDelay = getVerificationDelay();
      logStep("VERIFY", `Waiting ${verificationDelay / 1000} seconds before next verification...`);
      await new Promise(resolve => setTimeout(resolve, verificationDelay));
      
      // 2. Verify Strategy
      verificationResults.strategy = await verifyContract(
        "AaveV3InvestStrategy",
        strategyAddress,
        [TOKEN_ADDRESS, AAVE_POOL]
      );
      
      // Wait between verifications to avoid rate limiting
      verificationDelay = getVerificationDelay();
      logStep("VERIFY", `Waiting ${verificationDelay / 1000} seconds before next verification...`);
      await new Promise(resolve => setTimeout(resolve, verificationDelay));
      
      // 3. Verify Vault Implementation
      verificationResults.implementation = await verifyContract(
        "Vault Implementation",
        implAddress
      );

      // Wait between verifications to avoid rate limiting
      verificationDelay = getVerificationDelay();
      logStep("VERIFY", `Waiting ${verificationDelay / 1000} seconds before proxy verification...`);
      await new Promise(resolve => setTimeout(resolve, verificationDelay));

      // 4. Verify Vault Proxy
      logStep("VERIFY", "Preparing to verify AccessManagedProxy...");
      
      try {
        const initializeData = AccessManagedMSV.interface.encodeFunctionData("initialize", [
          vaultName,
          vaultSymbol,
          TOKEN_ADDRESS,
          strategies,
          initStrategyDatas,
          depositQueue,
          withdrawQueue
        ]);
        
        verificationResults.proxy = await verifyContract(
          "AccessManagedProxy",
          vaultAddress,
          [implAddress, initializeData, accessManagerAddress],
          "contracts/AccessManagedProxy.sol:AccessManagedProxy"
        );
      } catch (error) {
        logStep("VERIFY", `❌ Proxy verification failed: ${error.message}`);
        logStep("VERIFY", "Manual verification required:");
        logStep("VERIFY", `npx hardhat run scripts/encode-proxy-constructor.js`);
        logStep("VERIFY", `IMPLEMENTATION_ADDRESS: ${implAddress}`);
        logStep("VERIFY", `ACCESS_MANAGER_ADDRESS: ${accessManagerAddress}`);
      }
      
      // Summary of verification results
      logStep("VERIFY", "=== VERIFICATION SUMMARY ===");
      logStep("VERIFY", `AccessManager: ${verificationResults.accessManager ? '✅' : '❌'}`);
      logStep("VERIFY", `Strategy: ${verificationResults.strategy ? '✅' : '❌'}`);
      logStep("VERIFY", `Implementation: ${verificationResults.implementation ? '✅' : '❌'}`);
      logStep("VERIFY", `Proxy: ${verificationResults.proxy ? '✅' : '❌'}`);
      
      const allVerified = Object.values(verificationResults).every(result => result);
      if (allVerified) {
        logStep("VERIFY", "🎉 All contracts verified successfully!");
      } else {
        logStep("VERIFY", "⚠️ Some contracts failed verification. Check logs above for details.");
      }
    } else {
      logStep("VERIFY", "Skipping contract verification (VERIFY_CONTRACTS=false)");
    }
  }
  
  // Return deployed contract addresses
  return {
    network,
    tokenType,
    tokenAddress: TOKEN_ADDRESS,
    aavePool: AAVE_POOL,
    accessManager: accessManagerAddress,
    vault: vaultAddress,
    strategy: strategyAddress,
    implementation: implAddress
  };
}

// Execute the deployment
main()
  .then((result) => {
    logStep("COMPLETE", "Deployment script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logStep("ERROR", `Deployment failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
