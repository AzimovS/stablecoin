//
// This script executes when you run 'yarn test'
//

import { ethers } from "hardhat";
import { expect } from "chai";
import { Corn, CornDEX, BasicLending } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("🚩 Challenge 10: ♦♦♦⚖️💰 Over Collateralized Lending Challenge 🤓", function () {
  let cornToken: Corn;
  let cornDEX: CornDEX;
  let basicLending: BasicLending;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const collateralAmount = ethers.parseEther("10");
  const borrowAmount = ethers.parseEther("5000");

  beforeEach(async function () {
    await ethers.provider.send("hardhat_reset", []);
    [owner, user1, user2] = await ethers.getSigners();

    const Corn = await ethers.getContractFactory("Corn");
    cornToken = await Corn.deploy();

    const CornDEX = await ethers.getContractFactory("CornDEX");
    cornDEX = await CornDEX.deploy(await cornToken.getAddress());

    await cornToken.mintTo(owner.address, ethers.parseEther("1000000"));
    await cornToken.approve(cornDEX.target, ethers.parseEther("1000000"));
    await cornDEX.init(ethers.parseEther("1000000"), { value: ethers.parseEther("1000") });

    const BasicLending = await ethers.getContractFactory("BasicLending");
    basicLending = await BasicLending.deploy(cornDEX.target, cornToken.target);

    await cornToken.transferOwnership(basicLending.target);
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await cornToken.owner()).to.equal(await basicLending.getAddress());
    });
  });

  describe("Collateral Operations", function () {
    it("Should allow adding collateral", async function () {
      await basicLending.connect(user1).addCollateral({ value: collateralAmount });
      expect(await basicLending.s_userCollateral(user1.address)).to.equal(collateralAmount);
    });

    it("Should emit CollateralAdded event", async function () {
      await expect(basicLending.connect(user1).addCollateral({ value: collateralAmount }))
        .to.emit(basicLending, "CollateralAdded")
        .withArgs(user1.address, collateralAmount, await cornDEX.currentPrice());
    });

    it("Should allow withdrawing collateral when no debt", async function () {
      await basicLending.connect(user1).addCollateral({ value: collateralAmount });
      await basicLending.connect(user1).withdrawCollateral(collateralAmount);
      expect(await basicLending.s_userCollateral(user1.address)).to.equal(0);
    });

    it("Should prevent withdrawing more than deposited", async function () {
      await basicLending.connect(user1).addCollateral({ value: collateralAmount });
      await expect(basicLending.connect(user1).withdrawCollateral(collateralAmount * 2n)).to.be.revertedWithCustomError(
        basicLending,
        "Lending__InvalidAmount",
      );
    });
  });

  describe("Borrowing Operations", function () {
    beforeEach(async function () {
      await basicLending.connect(user1).addCollateral({ value: collateralAmount });
    });

    it("Should allow borrowing when sufficiently collateralized", async function () {
      expect(await cornToken.balanceOf(user1.address)).to.equal(0n);
      await basicLending.connect(user1).borrowCorn(borrowAmount);
      expect(await basicLending.s_userBorrowed(user1.address)).to.equal(borrowAmount);
      expect(await cornToken.balanceOf(user1.address)).to.equal(borrowAmount);
    });

    it("Should prevent borrowing when insufficiently collateralized", async function () {
      const tooMuchBorrow = ethers.parseEther("10000");
      await expect(basicLending.connect(user1).borrowCorn(tooMuchBorrow)).to.be.revertedWithCustomError(
        basicLending,
        "Lending__UnsafePositionRatio",
      );
    });

    it("Should emit AssetBorrowed event", async function () {
      await expect(basicLending.connect(user1).borrowCorn(borrowAmount))
        .to.emit(basicLending, "AssetBorrowed")
        .withArgs(user1.address, borrowAmount, await cornDEX.currentPrice());
    });
  });

  describe("Repayment Operations", function () {
    beforeEach(async function () {
      await basicLending.connect(user1).addCollateral({ value: collateralAmount });
      await basicLending.connect(user1).borrowCorn(borrowAmount);
    });

    it("Should allow repaying borrowed amount", async function () {
      await cornToken.connect(user1).approve(basicLending.target, borrowAmount);
      await basicLending.connect(user1).repayCorn(borrowAmount);
      expect(await basicLending.s_userBorrowed(user1.address)).to.equal(0);
    });

    it("Should allow repaying less than full borrowed amount", async function () {
      await cornToken.connect(user1).approve(basicLending.target, borrowAmount / 2n);
      await basicLending.connect(user1).repayCorn(borrowAmount / 2n);
      expect(await basicLending.s_userBorrowed(user1.address)).to.equal(borrowAmount / 2n);
    });

    it("Should prevent repaying more than borrowed", async function () {
      await cornToken.connect(user1).approve(basicLending.target, borrowAmount * 2n);
      await expect(basicLending.connect(user1).repayCorn(borrowAmount * 2n)).to.be.revertedWithCustomError(
        basicLending,
        "Lending__InvalidAmount",
      );
    });

    it("Should emit AssetRepaid event", async function () {
      await cornToken.connect(user1).approve(basicLending.target, borrowAmount);
      await expect(basicLending.connect(user1).repayCorn(borrowAmount))
        .to.emit(basicLending, "AssetRepaid")
        .withArgs(user1.address, borrowAmount, await cornDEX.currentPrice());
    });
  });

  describe("Liquidation", function () {
    beforeEach(async function () {
      await basicLending.connect(user1).addCollateral({ value: collateralAmount });
      await basicLending.connect(user1).borrowCorn(borrowAmount);
      await cornToken
        .connect(await ethers.getImpersonatedSigner(basicLending.target as string))
        .mintTo(user2.address, borrowAmount);
      await cornToken.connect(user2).approve(basicLending.target, borrowAmount);
    });

    it("Should allow liquidation when position is unsafe", async function () {
      // drop price of eth so that user1 position is below 1.2
      await cornDEX.swap(ethers.parseEther("300"), { value: ethers.parseEther("300") });

      expect(await basicLending.isLiquidatable(user1)).to.be.true;
      const beforeBalance = await ethers.provider.getBalance(user2.address);
      await basicLending.connect(user2).liquidate(user1.address);
      const afterBalance = await ethers.provider.getBalance(user2.address);
      expect(await basicLending.s_userBorrowed(user1.address)).to.equal(0);
      expect(afterBalance).to.be.gt(beforeBalance);
    });

    it("Should prevent liquidation of safe positions", async function () {
      expect(await basicLending.isLiquidatable(user1)).to.be.false;
      await expect(basicLending.connect(user2).liquidate(user1.address)).to.be.revertedWithCustomError(
        basicLending,
        "Lending__NotLiquidatable",
      );
    });

    it("Should emit appropriate events on liquidation", async function () {
      await cornDEX.swap(ethers.parseEther("300"), { value: ethers.parseEther("300") });
      await expect(basicLending.connect(user2).liquidate(user1.address))
        .to.emit(basicLending, "CollateralWithdrawn")
        .and.to.emit(basicLending, "AssetRepaid");
    });
  });
});
