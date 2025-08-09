import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFixture } from "./fixture";

interface Domain {
  name: string;
  version: string;
  chainId: bigint;
  verifyingContract: string;
}

describe("GreenMintingToken", function () {
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

async function getDomain(contractAddress: string): Promise<Domain> {
  return {
    name: "Green Minting Token",
    version: "1",
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: contractAddress,
  };
}
