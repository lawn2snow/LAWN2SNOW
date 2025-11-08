const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CaribbeanToken", function () {
  let caribToken;
  let owner;
  let gameContract;
  let player1;
  let player2;

  beforeEach(async function () {
    // Get signers
    [owner, gameContract, player1, player2] = await ethers.getSigners();

    // Deploy CaribbeanToken
    const CaribbeanToken = await ethers.getContractFactory("CaribbeanToken");
    caribToken = await CaribbeanToken.deploy();
    await caribToken.deployed();

    // Set game contract
    await caribToken.setGameContract(gameContract.address);
  });

  describe("Deployment", function () {
    it("Should deploy with correct name and symbol", async function () {
      expect(await caribToken.name()).to.equal("Caribbean Crypto");
      expect(await caribToken.symbol()).to.equal("CARIB");
    });

    it("Should mint initial supply to deployer", async function () {
      const deployerBalance = await caribToken.balanceOf(owner.address);
      expect(deployerBalance).to.equal(ethers.utils.parseEther("10000000"));
    });

    it("Should set max supply correctly", async function () {
      const maxSupply = await caribToken.MAX_SUPPLY();
      expect(maxSupply).to.equal(ethers.utils.parseEther("100000000"));
    });
  });

  describe("Game Contract Management", function () {
    it("Should allow owner to set game contract", async function () {
      await caribToken.setGameContract(player1.address);
      expect(await caribToken.gameContract()).to.equal(player1.address);
    });

    it("Should not allow non-owner to set game contract", async function () {
      await expect(
        caribToken.connect(player1).setGameContract(player2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow setting zero address as game contract", async function () {
      await expect(
        caribToken.setGameContract(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid game contract");
    });
  });

  describe("Reward System", function () {
    it("Should allow game contract to reward players", async function () {
      const rewardAmount = ethers.utils.parseEther("100");

      await caribToken
        .connect(gameContract)
        .rewardPlayer(player1.address, rewardAmount, "Mission completed");

      const balance = await caribToken.balanceOf(player1.address);
      expect(balance).to.equal(rewardAmount);
    });

    it("Should emit PlayerRewarded event", async function () {
      const rewardAmount = ethers.utils.parseEther("50");

      await expect(
        caribToken
          .connect(gameContract)
          .rewardPlayer(player1.address, rewardAmount, "PvP victory")
      )
        .to.emit(caribToken, "PlayerRewarded")
        .withArgs(player1.address, rewardAmount, "PvP victory");
    });

    it("Should not allow non-game contract to reward", async function () {
      const rewardAmount = ethers.utils.parseEther("100");

      await expect(
        caribToken
          .connect(player1)
          .rewardPlayer(player2.address, rewardAmount, "Cheating")
      ).to.be.revertedWith("Only game contract can reward");
    });

    it("Should not exceed max supply when rewarding", async function () {
      // Try to reward more than max supply
      const excessiveReward = ethers.utils.parseEther("100000000"); // 100M (already 10M minted)

      await expect(
        caribToken
          .connect(gameContract)
          .rewardPlayer(player1.address, excessiveReward, "Too much")
      ).to.be.revertedWith("Max supply exceeded");
    });

    it("Should track total rewards distributed", async function () {
      const reward1 = ethers.utils.parseEther("100");
      const reward2 = ethers.utils.parseEther("200");

      await caribToken.connect(gameContract).rewardPlayer(player1.address, reward1, "Quest 1");
      await caribToken.connect(gameContract).rewardPlayer(player2.address, reward2, "Quest 2");

      const totalRewarded = await caribToken.totalRewardsDistributed();
      expect(totalRewarded).to.equal(reward1.add(reward2));
    });
  });

  describe("Burning", function () {
    it("Should allow users to burn their tokens", async function () {
      // Give player some tokens first
      const amount = ethers.utils.parseEther("100");
      await caribToken.connect(gameContract).rewardPlayer(player1.address, amount, "Test");

      // Burn half
      const burnAmount = ethers.utils.parseEther("50");
      await caribToken.connect(player1).burn(burnAmount);

      const balance = await caribToken.balanceOf(player1.address);
      expect(balance).to.equal(amount.sub(burnAmount));
    });

    it("Should emit TokensBurned event", async function () {
      const amount = ethers.utils.parseEther("100");
      await caribToken.connect(gameContract).rewardPlayer(player1.address, amount, "Test");

      const burnAmount = ethers.utils.parseEther("50");
      await expect(caribToken.connect(player1).burn(burnAmount))
        .to.emit(caribToken, "TokensBurned")
        .withArgs(player1.address, burnAmount);
    });

    it("Should not allow burning more than balance", async function () {
      const amount = ethers.utils.parseEther("100");
      await caribToken.connect(gameContract).rewardPlayer(player1.address, amount, "Test");

      const burnAmount = ethers.utils.parseEther("200");
      await expect(caribToken.connect(player1).burn(burnAmount)).to.be.reverted;
    });
  });

  describe("Blacklist", function () {
    it("Should allow owner to blacklist addresses", async function () {
      await caribToken.setBlacklist(player1.address, true);
      expect(await caribToken.isBlacklisted(player1.address)).to.be.true;
    });

    it("Should prevent blacklisted sender from transferring", async function () {
      // Give player tokens
      const amount = ethers.utils.parseEther("100");
      await caribToken.connect(gameContract).rewardPlayer(player1.address, amount, "Test");

      // Blacklist player
      await caribToken.setBlacklist(player1.address, true);

      // Try to transfer
      await expect(
        caribToken.connect(player1).transfer(player2.address, amount)
      ).to.be.revertedWith("Sender is blacklisted");
    });

    it("Should prevent transfers to blacklisted addresses", async function () {
      // Give player tokens
      const amount = ethers.utils.parseEther("100");
      await caribToken.connect(gameContract).rewardPlayer(player1.address, amount, "Test");

      // Blacklist recipient
      await caribToken.setBlacklist(player2.address, true);

      // Try to transfer
      await expect(
        caribToken.connect(player1).transfer(player2.address, amount)
      ).to.be.revertedWith("Recipient is blacklisted");
    });

    it("Should allow removing from blacklist", async function () {
      await caribToken.setBlacklist(player1.address, true);
      await caribToken.setBlacklist(player1.address, false);
      expect(await caribToken.isBlacklisted(player1.address)).to.be.false;
    });
  });

  describe("Pause", function () {
    it("Should allow owner to pause", async function () {
      await caribToken.pause();
      expect(await caribToken.paused()).to.be.true;
    });

    it("Should prevent transfers when paused", async function () {
      const amount = ethers.utils.parseEther("100");
      await caribToken.connect(gameContract).rewardPlayer(player1.address, amount, "Test");

      await caribToken.pause();

      await expect(
        caribToken.connect(player1).transfer(player2.address, amount)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner to unpause", async function () {
      await caribToken.pause();
      await caribToken.unpause();
      expect(await caribToken.paused()).to.be.false;
    });

    it("Should allow transfers after unpause", async function () {
      const amount = ethers.utils.parseEther("100");
      await caribToken.connect(gameContract).rewardPlayer(player1.address, amount, "Test");

      await caribToken.pause();
      await caribToken.unpause();

      await expect(
        caribToken.connect(player1).transfer(player2.address, amount)
      ).to.not.be.reverted;
    });
  });

  describe("Transfers", function () {
    it("Should allow normal transfers", async function () {
      const amount = ethers.utils.parseEther("100");
      await caribToken.connect(gameContract).rewardPlayer(player1.address, amount, "Test");

      await caribToken.connect(player1).transfer(player2.address, amount);

      expect(await caribToken.balanceOf(player1.address)).to.equal(0);
      expect(await caribToken.balanceOf(player2.address)).to.equal(amount);
    });

    it("Should not allow transfers exceeding balance", async function () {
      const amount = ethers.utils.parseEther("100");
      await caribToken.connect(gameContract).rewardPlayer(player1.address, amount, "Test");

      await expect(
        caribToken.connect(player1).transfer(player2.address, amount.mul(2))
      ).to.be.reverted;
    });
  });
});
