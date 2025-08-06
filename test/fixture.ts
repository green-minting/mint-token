import hre, { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

interface TokenHolder {
  account: HardhatEthersSigner;
  balance: bigint;
}

interface DeploymentInput {
  unvestStartTimestamp?: number;
  claimingPercentsSchedule?: number[];
}

export async function deployFixture(input?: DeploymentInput) {
  const [
    deployer,
    _tokenHolderA,
    _tokenHolderB,
    vestingAccount,
    ...otherAccounts
  ] = await hre.ethers.getSigners();

  const GreenMintingToken = await hre.ethers.getContractFactory(
    "GreenMintingToken"
  );

  const VestedLock = await hre.ethers.getContractFactory("VestedLock");

  const tokenHolderA: TokenHolder = {
    account: otherAccounts[0],
    balance: BigInt(500),
  };

  const tokenHolderB: TokenHolder = {
    account: otherAccounts[1],
    balance: BigInt(500),
  };

  const vestedAmount = BigInt(100000);
  const secPerStage = 150;

  // 100% = 10000
  const claimingPercentsSchedule = input?.claimingPercentsSchedule || [
    3000, 2000, 5000,
  ];

  const greenMintingToken = await GreenMintingToken.deploy(
    [tokenHolderA.account, tokenHolderB.account],
    [tokenHolderA.balance, tokenHolderB.balance],
    vestedAmount
  );

  const currentBlock = await ethers.provider.getBlock("latest");
  const unvestStartTimestamp =
    input?.unvestStartTimestamp || currentBlock!.timestamp + 100;

  const vestedLock = await VestedLock.deploy(
    vestingAccount,
    secPerStage,
    claimingPercentsSchedule,
    unvestStartTimestamp,
    greenMintingToken
  );

  await greenMintingToken.approve(vestedLock, vestedAmount);
  await vestedLock.lockFunds(vestedAmount);

  return {
    greenMintingToken,
    deployer,
    tokenHolderA,
    tokenHolderB,
    vestingAccount,
    otherAccounts,
    vestedAmount,
    secPerStage,
    claimingPercentsSchedule,
    vestedLock,
    unvestStartTimestamp,
  };
}
