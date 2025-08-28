import hre, { ethers } from "hardhat";
import { sleepFor, verifyContract } from "./verifyContract";
import { PrefundedAccount } from "./types";
import { saveDeploymentFile } from "./saveDeployment";

const ONE_YEAR_IN_SEC = 31536000;
const UNVESTING_START_TIMESTAMP = 1767139200; // 31 Dec 2025

const CLAIMING_PERCENTS_SCHEDULE = [
  3000, 2000, 1000, 500, 500, 500, 500, 500, 500, 500, 250, 250,
];
const PREFUNDED_ACCOUNTS: PrefundedAccount[] = [
  {
    address: "0x82a274a6F7C2990a5dAe92C2c0fbB0890aD2E69c",
    amount: ethers.parseEther("750000000"),
  },
  {
    address: "0x91366843793C21506512a6e80d669ad6BB617561",
    amount: ethers.parseEther("20000000") + ethers.parseEther("15000000"),
  },
  {
    address: "0x0CD749BC3e8e768d1C1Ab1fAC05d1C0119e80349",
    amount: ethers.parseEther("1115000000"),
  },
  {
    address: "0x56eDd1B091e83360eB4efF57A4A7eDf940c3333d",
    amount: ethers.parseEther("50000000"),
  },
];
const VESTING_ACCOUNT = "0x86955cB19D38651C1cC0B2D5e76ed5987E4466Ed";
const VESTED_AMOUNT = ethers.parseEther("50000000");

async function main() {
  const [deployer] = await ethers.getSigners();
  const GreenMintingToken = await ethers.getContractFactory(
    "GreenMintingToken"
  );
  const VestedLock = await ethers.getContractFactory("VestedLock");

  console.log("Deploying token...");
  const greenMintingToken = await GreenMintingToken.deploy(
    PREFUNDED_ACCOUNTS.map((prefunded) => prefunded.address),
    PREFUNDED_ACCOUNTS.map((prefunded) => prefunded.amount),
    VESTED_AMOUNT
  );
  await greenMintingToken.waitForDeployment();
  const greenMintingTokenAddress = await greenMintingToken.getAddress();
  console.log(`Token deployed: ${greenMintingTokenAddress}`);

  console.log("Deploying vested lock...");
  const vestedLock = await VestedLock.deploy(
    VESTING_ACCOUNT,
    ONE_YEAR_IN_SEC,
    CLAIMING_PERCENTS_SCHEDULE,
    UNVESTING_START_TIMESTAMP,
    greenMintingToken,
    VESTED_AMOUNT
  );
  await vestedLock.waitForDeployment();
  const vestedLockAddress = await vestedLock.getAddress();
  console.log(`Vested lock deployed: ${vestedLockAddress}`);

  const approveTokensTx = await greenMintingToken
    .connect(deployer)
    .approve(vestedLockAddress, VESTED_AMOUNT);
  await approveTokensTx.wait();

  const lockVestedTokensTx = await vestedLock.connect(deployer).lockFunds();
  await lockVestedTokensTx.wait();

  console.log("Waiting 45 sec for Etherscan to index new contracts...");
  await sleepFor(45000);

  await verifyContract(await greenMintingToken.getAddress(), hre, [
    PREFUNDED_ACCOUNTS.map((prefunded) => prefunded.address),
    PREFUNDED_ACCOUNTS.map((prefunded) => prefunded.amount),
    VESTED_AMOUNT,
  ]);

  await verifyContract(await vestedLock.getAddress(), hre, [
    VESTING_ACCOUNT,
    ONE_YEAR_IN_SEC,
    CLAIMING_PERCENTS_SCHEDULE,
    UNVESTING_START_TIMESTAMP,
    greenMintingTokenAddress,
    VESTED_AMOUNT,
  ]);

  saveDeploymentFile({
    vestedLock: vestedLockAddress,
    greenMintingToken: greenMintingTokenAddress,
    prefundedAccounts: PREFUNDED_ACCOUNTS,
    deployer: deployer.address,
  });
}

main();
