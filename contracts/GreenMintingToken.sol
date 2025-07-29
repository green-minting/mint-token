// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "./EIP3009.sol";

contract GreenMintingToken is ERC20Burnable, EIP3009 {
    constructor(
        address[] memory prefundedAccounts,
        uint256[] memory prefundedAmounts,
        uint256 vestedAmount
    ) ERC20("Green Minting Token", "MINT") EIP712("Green Minting Token", "1") {
        require(
            prefundedAccounts.length == prefundedAmounts.length,
            "Prefunded accounts length doesn't match amounts"
        );
        for (uint i = 0; i < prefundedAccounts.length; i++) {
            _mint(prefundedAccounts[i], prefundedAmounts[i]);
        }

        _mint(msg.sender, vestedAmount);
    }

    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        _receiveWithAuthorization(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            v,
            r,
            s
        );
    }

    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        _transferWithAuthorization(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            v,
            r,
            s
        );
    }

    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        _cancelAuthorization(authorizer, nonce, v, r, s);
    }

    function _transferInternal(
        address from,
        address to,
        uint256 amount
    ) internal override {
        _transfer(from, to, amount);
    }
}
