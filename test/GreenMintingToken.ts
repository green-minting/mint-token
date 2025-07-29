import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

interface TokenHolder {
  account: HardhatEthersSigner;
  balance: bigint;
}

interface Domain {
  name: string;
  version: string;
  chainId: bigint;
  verifyingContract: string;
}

describe("GreenMintingToken", function () {
  async function deployFixture(_unvestStartTimestamp?: number) {
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
    const secPerStage = 10;
    const claimingPercentsSchedule = [3000, 2000, 5000]; // 100% = 10000

    const greenMintingToken = await GreenMintingToken.deploy(
      [tokenHolderA.account, tokenHolderB.account],
      [tokenHolderA.balance, tokenHolderB.balance],
      vestedAmount
    );

    const currentBlock = await ethers.provider.getBlock("latest");
    const unvestStartTimestamp =
      _unvestStartTimestamp || currentBlock!.timestamp;
    const vestedLock = await VestedLock.deploy(
      vestingAccount,
      secPerStage,
      claimingPercentsSchedule,
      unvestStartTimestamp,
      greenMintingToken
    );

    await greenMintingToken.transfer(vestedLock, vestedAmount);

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

  describe("Deployment", () => {
    it("Fund predefined accounts with tokens", async () => {
      const { greenMintingToken, tokenHolderA, tokenHolderB } =
        await deployFixture();

      expect(await greenMintingToken.balanceOf(tokenHolderA.account)).equal(
        tokenHolderA.balance
      );
      expect(await greenMintingToken.balanceOf(tokenHolderB.account)).equal(
        tokenHolderB.balance
      );
    });

    it("Mint vested amount of tokens to VestedLock", async () => {
      const { greenMintingToken, vestedAmount, vestedLock } =
        await deployFixture();

      expect(await greenMintingToken.balanceOf(vestedLock)).equal(vestedAmount);
    });
  });

  describe("Vesting", function () {
    it("Unvest will start after defined timestamp", async () => {
      const timeTillUnlockInSec = 10;
      const currentBlock = await ethers.provider.getBlock("latest");
      const unvestStartTimestamp =
        currentBlock!.timestamp + timeTillUnlockInSec;
      const { vestingAccount, vestedLock } = await deployFixture(
        unvestStartTimestamp
      );

      const availableVestedTokens = await vestedLock.availableVestedTokens();

      expect(availableVestedTokens).equal(0);

      await expect(vestedLock.connect(vestingAccount).claimVestedTokens()).to
        .reverted;

      await mineBlocks(unvestStartTimestamp);

      await expect(vestedLock.connect(vestingAccount).claimVestedTokens()).to
        .not.reverted;
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

      await expect(vestedLock.connect(vestingAccount).claimVestedTokens()).to
        .not.reverted;

      // claiming again will revert as all available were claimed for this stage
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

      await expect(vestedLock.connect(vestingAccount).claimVestedTokens()).to
        .not.reverted;

      // move to third claiming stage
      await mineBlocks(unvestStartTimestamp + 2 * secPerStage);
      currentStage++;

      expectedAvailableVestedTokens =
        (vestedAmount * BigInt(claimingPercentsSchedule[currentStage])) /
        BigInt(10000);

      availableVestedTokens = await vestedLock.availableVestedTokens();

      expect(expectedAvailableVestedTokens).equal(availableVestedTokens);

      await expect(vestedLock.connect(vestingAccount).claimVestedTokens()).to
        .not.reverted;
    });

    it("Only Vesting Account can claim tokens", async () => {
      const { vestedLock, otherAccounts } = await deployFixture();

      await expect(vestedLock.connect(otherAccounts[0]).claimVestedTokens()).to
        .reverted;
    });
  });
  describe("EIP3009 implementation", () => {
    const transferWithAuthorizationTypes = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const receiveWithAuthorizationTypes = {
      ReceiveWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const cancelAuthorizationTypes = {
      CancelAuthorization: [
        { name: "authorizer", type: "address" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    it("Anyone can execute signed transfer with transferWithAuthorization", async () => {
      const { greenMintingToken, tokenHolderA, tokenHolderB, otherAccounts } =
        await deployFixture();
      const nonce = ethers.randomBytes(32);
      const validBefore = Math.floor(Date.now() / 1000) + 3600;
      const validAfter = 0;
      const transferAmount = 100;

      const domain = await getDomain(await greenMintingToken.getAddress());

      const signature = await tokenHolderA.account.signTypedData(
        domain,
        transferWithAuthorizationTypes,
        {
          from: tokenHolderA.account.address,
          to: tokenHolderB.account.address,
          value: transferAmount,
          validAfter,
          validBefore,
          nonce,
        }
      );

      const { v, r, s } = ethers.Signature.from(signature);

      await greenMintingToken
        .connect(otherAccounts[0])
        .transferWithAuthorization(
          tokenHolderA.account.address,
          tokenHolderB.account.address,
          transferAmount,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s
        );

      const balanceA = await greenMintingToken.balanceOf(tokenHolderA.account);
      const balanceB = await greenMintingToken.balanceOf(tokenHolderB.account);

      expect(balanceA).to.equal(tokenHolderA.balance - BigInt(transferAmount));
      expect(balanceB).to.equal(tokenHolderB.balance + BigInt(transferAmount));
    });

    it("Only receiver can receive tokens with receiveWithAuthorization", async () => {
      const { greenMintingToken, tokenHolderA, tokenHolderB, otherAccounts } =
        await deployFixture();
      const transferAmount = 100;
      const nonce = ethers.randomBytes(32);
      const validBefore = Math.floor(Date.now() / 1000) + 3600;
      const validAfter = 0;

      const domain = await getDomain(await greenMintingToken.getAddress());

      const signature = await tokenHolderA.account.signTypedData(
        domain,
        receiveWithAuthorizationTypes,
        {
          from: tokenHolderA.account.address,
          to: tokenHolderB.account.address,
          value: transferAmount,
          validAfter,
          validBefore,
          nonce,
        }
      );

      const { v, r, s } = ethers.Signature.from(signature);

      await expect(
        greenMintingToken
          .connect(otherAccounts[0])
          .receiveWithAuthorization(
            tokenHolderA.account.address,
            tokenHolderB.account.address,
            transferAmount,
            validAfter,
            validBefore,
            nonce,
            v,
            r,
            s
          )
      ).to.rejected;

      await greenMintingToken
        .connect(tokenHolderB.account)
        .receiveWithAuthorization(
          tokenHolderA.account.address,
          tokenHolderB.account.address,
          transferAmount,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s
        );

      const balanceA = await greenMintingToken.balanceOf(tokenHolderA.account);
      const balanceB = await greenMintingToken.balanceOf(tokenHolderB.account);

      expect(balanceA).to.equal(tokenHolderA.balance - BigInt(transferAmount));
      expect(balanceB).to.equal(tokenHolderB.balance + BigInt(transferAmount));
    });

    it("Can cancel authorization with cancelAuthorization", async () => {
      const { greenMintingToken, tokenHolderA, tokenHolderB, otherAccounts } =
        await deployFixture();
      const nonce = ethers.randomBytes(32);
      const validBefore = Math.floor(Date.now() / 1000) + 3600;
      const validAfter = 0;
      const transferAmount = 100;

      const domain = await getDomain(await greenMintingToken.getAddress());

      const transferSignature = await tokenHolderA.account.signTypedData(
        domain,
        transferWithAuthorizationTypes,
        {
          from: tokenHolderA.account.address,
          to: tokenHolderB.account.address,
          value: transferAmount,
          validAfter,
          validBefore,
          nonce,
        }
      );

      const transferSplitSignature = ethers.Signature.from(transferSignature);

      const cancelAuthorizationSignature =
        await tokenHolderA.account.signTypedData(
          domain,
          cancelAuthorizationTypes,
          {
            authorizer: tokenHolderA.account.address,
            nonce,
          }
        );

      const cancelAuthorizationSplitSignature = ethers.Signature.from(
        cancelAuthorizationSignature
      );

      await greenMintingToken
        .connect(tokenHolderA.account)
        .cancelAuthorization(
          tokenHolderA.account,
          nonce,
          cancelAuthorizationSplitSignature.v,
          cancelAuthorizationSplitSignature.r,
          cancelAuthorizationSplitSignature.s
        );

      const state = await greenMintingToken.authorizationState(
        tokenHolderA.account,
        nonce
      );
      expect(state).to.be.true;

      await expect(
        greenMintingToken
          .connect(otherAccounts[0])
          .transferWithAuthorization(
            tokenHolderA.account.address,
            tokenHolderB.account.address,
            transferAmount,
            validAfter,
            validBefore,
            nonce,
            transferSplitSignature.v,
            transferSplitSignature.r,
            transferSplitSignature.s
          )
      ).to.rejected;
    });
  });
});

async function mineBlocks(mineTillTimestamp: number) {
  // const timestamp = current
  // for (let i = 0; i < blocksToMine; i++) {
  // }
  await hre.ethers.provider.send("evm_mine", [mineTillTimestamp]);
}

async function getDomain(contractAddress: string): Promise<Domain> {
  return {
    name: "Green Minting Token",
    version: "1",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: contractAddress,
  };
}
