// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract VestedLock {
    uint256 constant DENOMINATOR = 10_000;

    address immutable vestingAccount;
    IERC20 immutable token;
    uint256 immutable secPerStage;
    uint256 immutable unvestingStartTimestamp;
    uint256[] claimingPercentsSchedule;
    uint256 claimedVestedAmount;

    constructor(
        address _vestingAccount,
        uint256 _secPerStage,
        uint256[] memory _claimingPercentsSchedule, // 100% = 10000,
        uint256 _unvestingStartTimestamp,
        address tokenAddress
    ) {
        vestingAccount = _vestingAccount;
        secPerStage = _secPerStage;
        claimingPercentsSchedule = _claimingPercentsSchedule;
        unvestingStartTimestamp = _unvestingStartTimestamp;
        claimedVestedAmount = 0;
        token = IERC20(tokenAddress);
    }

    function claimVestedTokens() public {
        require(
            block.timestamp > unvestingStartTimestamp,
            "Claiming is not available yet"
        );
        uint256 availableToClaim = availableVestedTokens();
        require(msg.sender == vestingAccount, "Only Vesting Account can claim");
        require(availableToClaim > 0, "No available tokens to claim");

        claimedVestedAmount += availableToClaim;
        token.transfer(msg.sender, availableToClaim);
    }

    function availableVestedTokens() public view returns (uint256) {
        if (block.timestamp < unvestingStartTimestamp) {
            return 0;
        }
        uint256 stage = ((block.timestamp - unvestingStartTimestamp) /
            secPerStage) + 1;
        uint256 availablePercents = 0;

        for (uint i = 0; i < stage; i++) {
            availablePercents += claimingPercentsSchedule[i];
        }

        uint256 fullVestedAmount = token.balanceOf(address(this)) +
            claimedVestedAmount;

        uint256 availableToClaim = ((fullVestedAmount * availablePercents) /
            DENOMINATOR) - claimedVestedAmount;

        return availableToClaim;
    }
}
