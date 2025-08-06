import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { deployFixture } from "./fixture";

describe("VestedLock.sol", function () {
  it("Unvest will start after defined timestamp", async () => {
    const timeTillUnlockInSec = 10;
    const currentBlock = await ethers.provider.getBlock("latest");
    const unvestStartTimestamp = currentBlock!.timestamp + timeTillUnlockInSec;
    const { vestingAccount, vestedLock } = await deployFixture({
      unvestStartTimestamp,
    });

    const availableVestedTokens = await vestedLock.availableVestedTokens();

    expect(availableVestedTokens).equal(0);

    await expect(vestedLock.connect(vestingAccount).claimVestedTokens()).to
      .reverted;

    await mineBlocks(unvestStartTimestamp);

    await expect(vestedLock.connect(vestingAccount).claimVestedTokens()).to.not
      .reverted;
  });
  it("Unvest tokens in schedule", async () => {
    const {
      vestingAccount,
      vestedAmount,
      claimingPercentsSchedule,
      secPerStage,
      vestedLock,
      unvestStartTimestamp,
    } = await deployFixture();

    let currentStage = 0;

    let expectedAvailableVestedTokens =
      (vestedAmount * BigInt(claimingPercentsSchedule[currentStage])) /
      BigInt(10000);

    let availableVestedTokens = await vestedLock.availableVestedTokens();

    expect(expectedAvailableVestedTokens).equal(availableVestedTokens);

    await expect(vestedLock.connect(vestingAccount).claimVestedTokens()).to.not
      .reverted;

    // claiming again will revert as all available tokens were claimed for this stage
    await expect(vestedLock.connect(vestingAccount).claimVestedTokens()).to
      .reverted;

    // move to second claiming stage
    await mineBlocks(unvestStartTimestamp + secPerStage);
    currentStage++;

    expectedAvailableVestedTokens =
      (vestedAmount * BigInt(claimingPercentsSchedule[currentStage])) /
      BigInt(10000);

    availableVestedTokens = await vestedLock.availableVestedTokens();

    expect(expectedAvailableVestedTokens).equal(availableVestedTokens);

    await expect(vestedLock.connect(vestingAccount).claimVestedTokens()).to.not
      .reverted;

    // move to third claiming stage
    await mineBlocks(unvestStartTimestamp + 2 * secPerStage);
    currentStage++;

    expectedAvailableVestedTokens =
      (vestedAmount * BigInt(claimingPercentsSchedule[currentStage])) /
      BigInt(10000);

    availableVestedTokens = await vestedLock.availableVestedTokens();

    expect(expectedAvailableVestedTokens).equal(availableVestedTokens);

    await expect(vestedLock.connect(vestingAccount).claimVestedTokens()).to.not
      .reverted;
  });

  it("VestedLock can be funded only once by owner", async () => {
    const [deployer, tokenHolder, vestingAccount] =
      await hre.ethers.getSigners();
    const vestedAmount = BigInt(100000);

    const GreenMintingToken = await hre.ethers.getContractFactory(
      "GreenMintingToken"
    );
    const VestedLock = await hre.ethers.getContractFactory("VestedLock");

    const greenMintingToken = await GreenMintingToken.deploy(
      [tokenHolder],
      [vestedAmount],
      vestedAmount
    );

    const latestBlock = await ethers.provider.getBlock("latest");
    const vestedLock = await VestedLock.deploy(
      vestingAccount,
      10,
      [10],
      latestBlock!.timestamp,
      greenMintingToken
    );

    await greenMintingToken.connect(deployer).approve(vestedLock, vestedAmount);
    await greenMintingToken
      .connect(tokenHolder)
      .approve(vestedLock, vestedAmount);

    await expect(vestedLock.connect(tokenHolder).lockFunds(vestedAmount)).to
      .rejected;
    await expect(vestedLock.connect(deployer).lockFunds(vestedAmount)).to.not
      .rejected;

    await greenMintingToken
      .connect(tokenHolder)
      .transfer(deployer, vestedAmount);
    await greenMintingToken.connect(deployer).approve(vestedLock, vestedAmount);
    await expect(vestedLock.connect(deployer).lockFunds(vestedAmount)).to
      .rejected;
  });

  it("Token transfers to Lock do not affect calculation", async () => {
    const {
      vestingAccount,
      vestedAmount,
      claimingPercentsSchedule,
      secPerStage,
      vestedLock,
      unvestStartTimestamp,
      tokenHolderA,
      tokenHolderB,
      greenMintingToken,
    } = await deployFixture();

    let currentStage = 0;

    let expectedAvailableVestedTokens =
      (vestedAmount * BigInt(claimingPercentsSchedule[currentStage])) /
      BigInt(10000);

    await greenMintingToken
      .connect(tokenHolderA.account)
      .transfer(vestedLock, tokenHolderA.balance);

    let availableVestedTokens = await vestedLock.availableVestedTokens();

    expect(expectedAvailableVestedTokens).equal(availableVestedTokens);
    await vestedLock.connect(vestingAccount).claimVestedTokens();

    // move to second claiming stage
    await mineBlocks(unvestStartTimestamp + secPerStage);
    currentStage++;

    await greenMintingToken
      .connect(tokenHolderB.account)
      .transfer(vestedLock, tokenHolderB.balance);

    expectedAvailableVestedTokens =
      (vestedAmount * BigInt(claimingPercentsSchedule[currentStage])) /
      BigInt(10000);

    availableVestedTokens = await vestedLock.availableVestedTokens();

    expect(expectedAvailableVestedTokens).equal(availableVestedTokens);
  });

  it("Claiming stage can be skipped and no tokens are lost", async () => {
    const {
      vestingAccount,
      vestedAmount,
      claimingPercentsSchedule,
      secPerStage,
      vestedLock,
      unvestStartTimestamp,
      greenMintingToken,
    } = await deployFixture();

    // move right to the third claiming stage
    await mineBlocks(unvestStartTimestamp + secPerStage * 2);

    const accumulatedPercents =
      BigInt(claimingPercentsSchedule[0]) +
      BigInt(claimingPercentsSchedule[1]) +
      BigInt(claimingPercentsSchedule[2]);

    const expectedAvailableVestedTokens =
      (vestedAmount * accumulatedPercents) / BigInt(10000);

    const availableVestedTokens = await vestedLock.availableVestedTokens();

    expect(expectedAvailableVestedTokens).equal(availableVestedTokens);
    await vestedLock.connect(vestingAccount).claimVestedTokens();

    expect(await greenMintingToken.balanceOf(vestingAccount)).equal(
      expectedAvailableVestedTokens
    );
  });

  it("After all stages unlock any left amount", async () => {
    // sum not equal to 100% (10000 == 100%)
    const claimingPercentsSchedule = [3000];

    const {
      vestingAccount,
      vestedAmount,
      greenMintingToken,
      secPerStage,
      vestedLock,
      unvestStartTimestamp,
    } = await deployFixture({ claimingPercentsSchedule });

    let expectedAvailableVestedTokens =
      (vestedAmount * BigInt(claimingPercentsSchedule[0])) / BigInt(10000);

    await vestedLock.connect(vestingAccount).claimVestedTokens();

    expect(expectedAvailableVestedTokens).equal(
      await greenMintingToken.balanceOf(vestingAccount)
    );

    await mineBlocks(unvestStartTimestamp + secPerStage * 5);

    expectedAvailableVestedTokens =
      vestedAmount - expectedAvailableVestedTokens;

    expect(await vestedLock.availableVestedTokens()).equal(
      expectedAvailableVestedTokens
    );
  });

  it("Only Vesting Account can claim tokens", async () => {
    const { vestedLock, otherAccounts } = await deployFixture();

    await expect(vestedLock.connect(otherAccounts[0]).claimVestedTokens()).to
      .reverted;
  });
});

async function mineBlocks(mineTillTimestamp: number) {
  await hre.ethers.provider.send("evm_mine", [mineTillTimestamp]);
}
