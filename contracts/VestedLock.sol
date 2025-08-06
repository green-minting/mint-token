// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract VestedLock {
    using SafeERC20 for IERC20;
    uint256 constant DENOMINATOR = 10_000;

    address immutable vestingAccount;
    IERC20 immutable token;
    uint256 immutable secPerStage;
    uint256 immutable unvestingStartTimestamp;
    address immutable owner;
    uint256[] claimingPercentsSchedule;
    uint256 claimedVestedAmount;
    uint256 leftVestedAmount;
    bool funded;

    constructor(
        address _vestingAccount,
        uint256 _secPerStage,
        uint256[] memory _claimingPercentsSchedule, // 100% = 10000,
        uint256 _unvestingStartTimestamp,
        address tokenAddress
    ) {
        require(
            _vestingAccount != address(0),
            "VestingAccount is zero address"
        );
        require(tokenAddress != address(0), "tokenAddress is zero address");
        require(_secPerStage > 100, "Seconds per stage too low");
        require(
            _claimingPercentsSchedule.length > 0,
            "Percents schedule empty"
        );
        require(
            block.timestamp < _unvestingStartTimestamp,
            "Unvesting start timestamp too low"
        );

        vestingAccount = _vestingAccount;
        secPerStage = _secPerStage;
        claimingPercentsSchedule = _claimingPercentsSchedule;
        unvestingStartTimestamp = _unvestingStartTimestamp;
        claimedVestedAmount = 0;
        token = IERC20(tokenAddress);
        owner = msg.sender;
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
        leftVestedAmount -= availableToClaim;
        token.safeTransfer(msg.sender, availableToClaim);
    }

    function lockFunds(uint256 amount) public {
        require(msg.sender == owner, "Only owner can lock funds");
        require(funded == false, "This Lock has already been funded");
        funded = true;
        leftVestedAmount = amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function availableVestedTokens() public view returns (uint256) {
        if (block.timestamp < unvestingStartTimestamp) {
            return 0;
        }
        uint256 stage = ((block.timestamp - unvestingStartTimestamp) /
            secPerStage) + 1;

        if (stage > claimingPercentsSchedule.length) {
            return leftVestedAmount;
        }
        uint256 availablePercents = 0;

        for (uint i = 0; i < stage; i++) {
            availablePercents += claimingPercentsSchedule[i];
        }

        uint256 fullVestedAmount = leftVestedAmount + claimedVestedAmount;

        uint256 availableToClaim = ((fullVestedAmount * availablePercents) /
            DENOMINATOR) - claimedVestedAmount;

        return availableToClaim;
    }
}
