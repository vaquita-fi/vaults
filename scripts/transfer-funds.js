const { ethers } = require("hardhat");

// Enhanced logging function
function logStep(step, message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${step}] ${message}`);
  if (data) {
    console.log(`[${timestamp}] [${step}] Data:`, JSON.stringify(data, null, 2));
  }
}

// ERC20 ABI for token transfers
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

async function main() {
  // Get parameters from environment variables
  const recipientAddress = process.env.RECIPIENT_ADDRESS;
  const tokenAddress = process.env.TOKEN_ADDRESS; // Optional, if not provided will transfer ETH
  const transferAmount = process.env.TRANSFER_AMOUNT; // Optional, if not provided will transfer all
  const network = process.env.HARDHAT_NETWORK || 'hardhat';
  
  // Validate required parameters
  if (!recipientAddress) {
    throw new Error("RECIPIENT_ADDRESS environment variable is required");
  }
  
  // Validate recipient address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
    throw new Error("Invalid recipient address format");
  }
  
  logStep("INIT", "Starting fund transfer operation");
  logStep("CONFIG", `Recipient: ${recipientAddress}`);
  logStep("CONFIG", `Token: ${tokenAddress || 'ETH'}`);
  logStep("CONFIG", `Amount: ${transferAmount || 'ALL'}`);
  logStep("CONFIG", `Network: ${network}`);
  
  // Get the signer
  const [signer] = await ethers.getSigners();
  const signerAddress = signer.address;
  logStep("SIGNER", `Using account: ${signerAddress}`);
  
  // Check if recipient is the same as sender
  if (signerAddress.toLowerCase() === recipientAddress.toLowerCase()) {
    throw new Error("Cannot transfer to the same address");
  }
  
  try {
    if (tokenAddress) {
      // Transfer ERC20 token
      await transferERC20Token(signer, tokenAddress, recipientAddress, transferAmount);
    } else {
      // Transfer ETH
      await transferETH(signer, recipientAddress, transferAmount);
    }
  } catch (error) {
    logStep("ERROR", `❌ Transfer failed: ${error.message}`);
    
    // Provide helpful error messages
    if (error.message.includes("insufficient funds")) {
      logStep("HELP", "Insufficient balance for the transfer");
    } else if (error.message.includes("execution reverted")) {
      logStep("HELP", "Transaction reverted - check token contract and permissions");
    } else if (error.message.includes("gas required exceeds allowance")) {
      logStep("HELP", "Insufficient gas limit - try increasing gas limit");
    }
    
    throw error;
  }
  
  logStep("COMPLETE", "Fund transfer operation completed successfully");
}

async function transferETH(signer, recipientAddress, transferAmount) {
  logStep("TRANSFER", "Preparing ETH transfer...");
  
  // Get current ETH balance
  const balance = await signer.provider.getBalance(signer.address);
  logStep("BALANCE", `Current ETH balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance === 0n) {
    logStep("WARNING", "No ETH balance to transfer");
    return;
  }
  
  // Calculate transfer amount
  let amount;
  if (transferAmount) {
    amount = ethers.parseEther(transferAmount);
    if (amount > balance) {
      throw new Error(`Insufficient ETH balance. Requested: ${transferAmount} ETH, Available: ${ethers.formatEther(balance)} ETH`);
    }
  } else {
    // Transfer all ETH minus gas fees
    const gasPrice = await signer.provider.getGasPrice();
    const gasLimit = 21000n; // Standard ETH transfer gas limit
    const gasCost = gasPrice * gasLimit;
    
    if (balance <= gasCost) {
      throw new Error("Insufficient ETH balance to cover gas costs");
    }
    
    amount = balance - gasCost;
  }
  
  logStep("TRANSFER", `Transferring ${ethers.formatEther(amount)} ETH to ${recipientAddress}...`);
  
  // Send ETH transfer
  const tx = await signer.sendTransaction({
    to: recipientAddress,
    value: amount,
    gasLimit: 21000
  });
  
  logStep("TX", `Transaction submitted: ${tx.hash}`);
  
  // Wait for confirmation
  const receipt = await tx.wait();
  logStep("SUCCESS", `✅ ETH transfer completed!`);
  logStep("INFO", `Transaction hash: ${tx.hash}`);
  logStep("INFO", `Gas used: ${receipt.gasUsed.toString()}`);
  logStep("INFO", `Block number: ${receipt.blockNumber}`);
  
  // Check final balance
  const finalBalance = await signer.provider.getBalance(signer.address);
  logStep("BALANCE", `Remaining ETH balance: ${ethers.formatEther(finalBalance)} ETH`);
}

async function transferERC20Token(signer, tokenAddress, recipientAddress, transferAmount) {
  logStep("TRANSFER", "Preparing ERC20 token transfer...");
  
  // Connect to token contract
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  
  // Get token info
  const [symbol, name, decimals] = await Promise.all([
    tokenContract.symbol(),
    tokenContract.name(),
    tokenContract.decimals()
  ]);
  
  logStep("TOKEN", `Token: ${name} (${symbol})`);
  logStep("TOKEN", `Decimals: ${decimals}`);
  
  // Get current token balance
  const balance = await tokenContract.balanceOf(signer.address);
  logStep("BALANCE", `Current ${symbol} balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
  
  if (balance === 0n) {
    logStep("WARNING", `No ${symbol} balance to transfer`);
    return;
  }
  
  // Calculate transfer amount
  let amount;
  if (transferAmount) {
    amount = ethers.parseUnits(transferAmount, decimals);
    if (amount > balance) {
      throw new Error(`Insufficient ${symbol} balance. Requested: ${transferAmount} ${symbol}, Available: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    }
  } else {
    amount = balance; // Transfer all
  }
  
  logStep("TRANSFER", `Transferring ${ethers.formatUnits(amount, decimals)} ${symbol} to ${recipientAddress}...`);
  
  // Send token transfer
  const tx = await tokenContract.transfer(recipientAddress, amount);
  logStep("TX", `Transaction submitted: ${tx.hash}`);
  
  // Wait for confirmation
  const receipt = await tx.wait();
  logStep("SUCCESS", `✅ ${symbol} transfer completed!`);
  logStep("INFO", `Transaction hash: ${tx.hash}`);
  logStep("INFO", `Gas used: ${receipt.gasUsed.toString()}`);
  logStep("INFO", `Block number: ${receipt.blockNumber}`);
  
  // Check final balance
  const finalBalance = await tokenContract.balanceOf(signer.address);
  logStep("BALANCE", `Remaining ${symbol} balance: ${ethers.formatUnits(finalBalance, decimals)} ${symbol}`);
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
