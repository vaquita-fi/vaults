require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-dependency-compiler");
require("hardhat-contract-sizer");
const hretry = require("@ensuro/utils/js/hardhat-retry");

hretry.installWrapper();

// Load environment variables if a .env file exists
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      initialBaseFeePerGas: 0,
    },
    base: {
      url: "https://base-mainnet.g.alchemy.com/v2/CKtBSkPQbM8JlHqz2GPiVnDLxbiBXXGT",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000,
    },
    baseSepolia: {
      url: "https://base-sepolia.g.alchemy.com/v2/CKtBSkPQbM8JlHqz2GPiVnDLxbiBXXGT",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000,
    },
    scrollSepolia: {
      url: "https://sepolia-rpc.scroll.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000,
      // gasPrice: 'auto',
      // chainId: 534351,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=8453",
          browserURL: "https://basescan.org/"
        }
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=84532",
          browserURL: "https://sepolia.basescan.org/"
        }
      },
      {
        network: "scrollSepolia",
        chainId: 534351,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=534351",
          browserURL: "https://sepolia.scrollscan.com/"
        }
      }
    ]
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  dependencyCompiler: {
    paths: [
      "@ensuro/utils/contracts/TestCurrency.sol",
      "@ensuro/swaplibrary/contracts/mocks/SwapRouterMock.sol",
      "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol",
      "@openzeppelin/contracts/access/manager/AccessManager.sol",
    ],
  },
  mocha: {
    timeout: 180000,
  },
};
