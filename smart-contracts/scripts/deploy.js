const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Caribbean Crypto Game Contracts...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("");

  // 1. Deploy CARIB Token
  console.log("📝 Deploying CaribbeanToken (CARIB)...");
  const CaribbeanToken = await hre.ethers.getContractFactory("CaribbeanToken");
  const caribToken = await CaribbeanToken.deploy();
  await caribToken.deployed();
  console.log("✅ CaribbeanToken deployed to:", caribToken.address);
  console.log("");

  // 2. Deploy Asset NFT Contract
  console.log("📝 Deploying CaribbeanAssets (NFT)...");
  const CaribbeanAssets = await hre.ethers.getContractFactory("CaribbeanAssets");
  const caribAssets = await CaribbeanAssets.deploy(deployer.address); // Treasury = deployer
  await caribAssets.deployed();
  console.log("✅ CaribbeanAssets deployed to:", caribAssets.address);
  console.log("");

  // Wait for confirmations
  console.log("⏳ Waiting for block confirmations...");
  await caribToken.deployTransaction.wait(5);
  await caribAssets.deployTransaction.wait(5);
  console.log("✅ Confirmations complete\n");

  // Save deployment addresses
  const deployment = {
    network: hre.network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      CaribbeanToken: caribToken.address,
      CaribbeanAssets: caribAssets.address
    }
  };

  const deploymentPath = `./deployments/${hre.network.name}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`📄 Deployment info saved to ${deploymentPath}\n`);

  // Verify on block explorer
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("🔍 Verifying contracts on block explorer...");
    console.log("Run these commands:\n");
    console.log(`npx hardhat verify --network ${hre.network.name} ${caribToken.address}`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${caribAssets.address} ${deployer.address}`);
    console.log("");
  }

  // Initial setup instructions
  console.log("📋 Next steps:");
  console.log("1. Set game contract address:");
  console.log(`   caribToken.setGameContract(gameContractAddress)`);
  console.log(`   caribAssets.setGameContract(gameContractAddress)`);
  console.log("");
  console.log("2. Update .env with contract addresses");
  console.log("3. Update Unity scripts with contract addresses");
  console.log("4. Test minting assets");
  console.log("");

  console.log("🎉 Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
