const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CaribbeanAssets", function () {
  let caribAssets;
  let owner;
  let gameContract;
  let marketplace;
  let player1;
  let player2;
  let treasury;

  beforeEach(async function () {
    [owner, gameContract, marketplace, player1, player2, treasury] = await ethers.getSigners();

    // Deploy CaribbeanAssets
    const CaribbeanAssets = await ethers.getContractFactory("CaribbeanAssets");
    caribAssets = await CaribbeanAssets.deploy(treasury.address);
    await caribAssets.deployed();

    // Set game and marketplace contracts
    await caribAssets.setGameContract(gameContract.address);
    await caribAssets.setMarketplaceContract(marketplace.address);
  });

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      expect(await caribAssets.name()).to.equal("Caribbean Game Assets");
      expect(await caribAssets.symbol()).to.equal("CGA");
    });

    it("Should set treasury correctly", async function () {
      expect(await caribAssets.treasury()).to.equal(treasury.address);
    });

    it("Should not allow deploying with zero treasury", async function () {
      const CaribbeanAssets = await ethers.getContractFactory("CaribbeanAssets");
      await expect(
        CaribbeanAssets.deploy(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid treasury");
    });
  });

  describe("Asset Minting", function () {
    it("Should allow owner to mint assets", async function () {
      await caribAssets.mintAsset(
        player1.address,
        0, // AssetType.Vehicle
        "Lamborghini",
        1000,
        "Jamaica",
        "ipfs://metadata"
      );

      expect(await caribAssets.balanceOf(player1.address)).to.equal(1);
    });

    it("Should allow game contract to mint assets", async function () {
      await caribAssets.connect(gameContract).mintAsset(
        player1.address,
        1, // AssetType.Property
        "Beach House",
        5000,
        "Bahamas",
        "ipfs://metadata"
      );

      expect(await caribAssets.balanceOf(player1.address)).to.equal(1);
    });

    it("Should not allow unauthorized minting", async function () {
      await expect(
        caribAssets.connect(player1).mintAsset(
          player2.address,
          0,
          "Stolen Car",
          1000,
          "Jamaica",
          "ipfs://metadata"
        )
      ).to.be.revertedWith("Not authorized to mint");
    });

    it("Should emit AssetMinted event", async function () {
      await expect(
        caribAssets.mintAsset(
          player1.address,
          2, // AssetType.Weapon
          "AK-47",
          500,
          "Jamaica",
          "ipfs://metadata"
        )
      )
        .to.emit(caribAssets, "AssetMinted")
        .withArgs(1, player1.address, 2, "AK-47", 500);
    });

    it("Should store asset data correctly", async function () {
      await caribAssets.mintAsset(
        player1.address,
        0,
        "Ferrari",
        2000,
        "Puerto Rico",
        "ipfs://metadata"
      );

      const asset = await caribAssets.getAsset(1);
      expect(asset.assetType).to.equal(0);
      expect(asset.name).to.equal("Ferrari");
      expect(asset.value).to.equal(2000);
      expect(asset.island).to.equal("Puerto Rico");
      expect(asset.isLocked).to.be.false;
    });

    it("Should increment token IDs", async function () {
      await caribAssets.mintAsset(player1.address, 0, "Car1", 1000, "Jamaica", "ipfs://1");
      await caribAssets.mintAsset(player2.address, 0, "Car2", 1000, "Jamaica", "ipfs://2");
      await caribAssets.mintAsset(player1.address, 0, "Car3", 1000, "Jamaica", "ipfs://3");

      expect(await caribAssets.balanceOf(player1.address)).to.equal(2);
      expect(await caribAssets.balanceOf(player2.address)).to.equal(1);
    });
  });

  describe("Asset Locking", function () {
    let tokenId;

    beforeEach(async function () {
      await caribAssets.mintAsset(
        player1.address,
        0,
        "Test Car",
        1000,
        "Jamaica",
        "ipfs://metadata"
      );
      tokenId = 1;
    });

    it("Should allow game contract to lock assets", async function () {
      const lockDuration = 24 * 60 * 60; // 24 hours
      await caribAssets.connect(gameContract).lockAsset(tokenId, lockDuration);

      const asset = await caribAssets.getAsset(tokenId);
      expect(asset.isLocked).to.be.true;
    });

    it("Should allow owner to lock their own assets", async function () {
      const lockDuration = 24 * 60 * 60;
      await caribAssets.connect(player1).lockAsset(tokenId, lockDuration);

      const asset = await caribAssets.getAsset(tokenId);
      expect(asset.isLocked).to.be.true;
    });

    it("Should not allow locking already locked assets", async function () {
      const lockDuration = 24 * 60 * 60;
      await caribAssets.connect(gameContract).lockAsset(tokenId, lockDuration);

      await expect(
        caribAssets.connect(gameContract).lockAsset(tokenId, lockDuration)
      ).to.be.revertedWith("Already locked");
    });

    it("Should emit AssetLocked event", async function () {
      const lockDuration = 24 * 60 * 60;

      await expect(caribAssets.connect(gameContract).lockAsset(tokenId, lockDuration))
        .to.emit(caribAssets, "AssetLocked");
    });

    it("Should allow unlocking after duration", async function () {
      const lockDuration = 1; // 1 second
      await caribAssets.connect(gameContract).lockAsset(tokenId, lockDuration);

      // Wait for lock to expire
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine");

      await caribAssets.unlockAsset(tokenId);

      const asset = await caribAssets.getAsset(tokenId);
      expect(asset.isLocked).to.be.false;
    });

    it("Should not allow unlocking before duration", async function () {
      const lockDuration = 24 * 60 * 60;
      await caribAssets.connect(gameContract).lockAsset(tokenId, lockDuration);

      await expect(caribAssets.unlockAsset(tokenId)).to.be.revertedWith("Still locked");
    });

    it("Should prevent transfer of locked assets", async function () {
      const lockDuration = 24 * 60 * 60;
      await caribAssets.connect(gameContract).lockAsset(tokenId, lockDuration);

      await expect(
        caribAssets
          .connect(player1)
          .transferFrom(player1.address, player2.address, tokenId)
      ).to.be.reverted;
    });
  });

  describe("Robbery Transfer", function () {
    let tokenId;

    beforeEach(async function () {
      await caribAssets.mintAsset(
        player1.address,
        0,
        "Robbery Target",
        1000,
        "Jamaica",
        "ipfs://metadata"
      );
      tokenId = 1;
    });

    it("Should allow game contract to execute robbery transfer", async function () {
      await caribAssets
        .connect(gameContract)
        .robberyTransfer(player1.address, player2.address, tokenId);

      expect(await caribAssets.ownerOf(tokenId)).to.equal(player2.address);
    });

    it("Should not allow non-game contract to execute robbery", async function () {
      await expect(
        caribAssets.connect(player1).robberyTransfer(player1.address, player2.address, tokenId)
      ).to.be.revertedWith("Only game can execute robbery");
    });

    it("Should not allow robbery of locked assets", async function () {
      await caribAssets.connect(gameContract).lockAsset(tokenId, 24 * 60 * 60);

      await expect(
        caribAssets.connect(gameContract).robberyTransfer(player1.address, player2.address, tokenId)
      ).to.be.revertedWith("Asset is locked");
    });

    it("Should emit AssetTransferred event", async function () {
      await expect(
        caribAssets.connect(gameContract).robberyTransfer(player1.address, player2.address, tokenId)
      )
        .to.emit(caribAssets, "AssetTransferred")
        .withArgs(tokenId, player1.address, player2.address, "robbery");
    });
  });

  describe("Get Assets By Owner", function () {
    it("Should return all assets owned by address", async function () {
      await caribAssets.mintAsset(player1.address, 0, "Car1", 1000, "Jamaica", "ipfs://1");
      await caribAssets.mintAsset(player1.address, 1, "House1", 5000, "Bahamas", "ipfs://2");
      await caribAssets.mintAsset(player2.address, 0, "Car2", 1000, "Jamaica", "ipfs://3");
      await caribAssets.mintAsset(player1.address, 2, "Gun1", 500, "Jamaica", "ipfs://4");

      const player1Assets = await caribAssets.getAssetsByOwner(player1.address);
      expect(player1Assets.length).to.equal(3);
      expect(player1Assets[0]).to.equal(1);
      expect(player1Assets[1]).to.equal(2);
      expect(player1Assets[2]).to.equal(4);

      const player2Assets = await caribAssets.getAssetsByOwner(player2.address);
      expect(player2Assets.length).to.equal(1);
      expect(player2Assets[0]).to.equal(3);
    });

    it("Should return empty array for address with no assets", async function () {
      const assets = await caribAssets.getAssetsByOwner(player1.address);
      expect(assets.length).to.equal(0);
    });
  });

  describe("Marketplace Transfer", function () {
    let tokenId;

    beforeEach(async function () {
      await caribAssets.mintAsset(
        player1.address,
        0,
        "For Sale",
        1000,
        "Jamaica",
        "ipfs://metadata"
      );
      tokenId = 1;
    });

    it("Should allow marketplace to transfer with fee", async function () {
      await caribAssets
        .connect(marketplace)
        .transferWithFee(player1.address, player2.address, tokenId);

      expect(await caribAssets.ownerOf(tokenId)).to.equal(player2.address);
    });

    it("Should allow owner to transfer with fee", async function () {
      await caribAssets
        .connect(player1)
        .transferWithFee(player1.address, player2.address, tokenId);

      expect(await caribAssets.ownerOf(tokenId)).to.equal(player2.address);
    });

    it("Should emit AssetTransferred event for sales", async function () {
      await expect(
        caribAssets.connect(marketplace).transferWithFee(player1.address, player2.address, tokenId)
      )
        .to.emit(caribAssets, "AssetTransferred")
        .withArgs(tokenId, player1.address, player2.address, "sale");
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow owner to pause", async function () {
      await caribAssets.pause();
      expect(await caribAssets.paused()).to.be.true;
    });

    it("Should prevent transfers when paused", async function () {
      await caribAssets.mintAsset(player1.address, 0, "Car", 1000, "Jamaica", "ipfs://metadata");
      await caribAssets.pause();

      await expect(
        caribAssets.connect(player1).transferFrom(player1.address, player2.address, 1)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner to unpause", async function () {
      await caribAssets.pause();
      await caribAssets.unpause();
      expect(await caribAssets.paused()).to.be.false;
    });
  });
});
