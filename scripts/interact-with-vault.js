const { ethers } = require("hardhat");

// Addresses from deployment (replace with your actual deployed addresses)
const VAULT_ADDRESS = "REPLACE_WITH_YOUR_VAULT_ADDRESS";
const USDC_TOKEN_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Interacting with the vault using account:", deployer.address);
  
  // Connect to contracts
  const usdc = await ethers.getContractAt("IERC20", USDC_TOKEN_BASE_SEPOLIA);
  const vault = await ethers.getContractAt("AccessManagedMSV", VAULT_ADDRESS);
  
  // Get current balances
  const usdcBalance = await usdc.balanceOf(deployer.address);
  const sharesBalance = await vault.balanceOf(deployer.address);
  
  console.log(`USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
  console.log(`Vault Shares Balance: ${ethers.formatUnits(sharesBalance, 6)} shares`);
  
  // Get vault details
  const totalAssets = await vault.totalAssets();
  const totalSupply = await vault.totalSupply();
  
  console.log(`Vault Total Assets: ${ethers.formatUnits(totalAssets, 6)} USDC`);
  console.log(`Vault Total Supply: ${ethers.formatUnits(totalSupply, 6)} shares`);
  
  // Check if we need to approve tokens
  const allowance = await usdc.allowance(deployer.address, VAULT_ADDRESS);
  console.log(`Current USDC allowance: ${ethers.formatUnits(allowance, 6)} USDC`);
  
  // Example interaction functions (uncomment to use)
  
  // 1. Approve vault to spend USDC
  // const amountToApprove = ethers.parseUnits("1000", 6); // 1000 USDC
  // console.log(`Approving ${ethers.formatUnits(amountToApprove, 6)} USDC for the vault...`);
  // const approveTx = await usdc.approve(VAULT_ADDRESS, amountToApprove);
  // await approveTx.wait();
  // console.log("Approval successful!");
  
  // 2. Deposit into vault
  // const amountToDeposit = ethers.parseUnits("100", 6); // 100 USDC
  // console.log(`Depositing ${ethers.formatUnits(amountToDeposit, 6)} USDC into the vault...`);
  // const depositTx = await vault.deposit(amountToDeposit, deployer.address);
  // await depositTx.wait();
  // console.log("Deposit successful!");
  // const sharesAfterDeposit = await vault.balanceOf(deployer.address);
  // console.log(`New Shares Balance: ${ethers.formatUnits(sharesAfterDeposit, 6)} shares`);
  
  // 3. Withdraw from vault
  // const amountToWithdraw = ethers.parseUnits("50", 6); // 50 USDC
  // console.log(`Withdrawing ${ethers.formatUnits(amountToWithdraw, 6)} USDC from the vault...`);
  // const withdrawTx = await vault.withdraw(amountToWithdraw, deployer.address, deployer.address);
  // await withdrawTx.wait();
  // console.log("Withdrawal successful!");
  // const sharesAfterWithdraw = await vault.balanceOf(deployer.address);
  // console.log(`New Shares Balance: ${ethers.formatUnits(sharesAfterWithdraw, 6)} shares`);
  
  // 4. Redeem shares for tokens
  // const sharesToRedeem = ethers.parseUnits("10", 6); // 10 shares
  // console.log(`Redeeming ${ethers.formatUnits(sharesToRedeem, 6)} shares from the vault...`);
  // const redeemTx = await vault.redeem(sharesToRedeem, deployer.address, deployer.address);
  // await redeemTx.wait();
  // console.log("Redemption successful!");
  // const sharesAfterRedeem = await vault.balanceOf(deployer.address);
  // console.log(`New Shares Balance: ${ethers.formatUnits(sharesAfterRedeem, 6)} shares`);
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 