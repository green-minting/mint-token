import { expect } from "chai";

import { deployFixture } from "./fixture";

describe("GreenMintingToken.sol", function () {
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

    it("Mint vested amount of tokens to deployer and transfer it to VestedLock", async () => {
      const { greenMintingToken, vestedAmount, vestedLock } =
        await deployFixture();

      expect(await greenMintingToken.balanceOf(vestedLock)).equal(vestedAmount);
    });
  });
});
