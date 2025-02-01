// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;


contract EthPriceOracle {
    uint256 public price;

    event PriceUpdated(uint256 indexed price);

    constructor(uint256 _price) {
        price = _price;
    }

    function updatePrice(uint256 _price) external {
        price = _price;
        emit PriceUpdated(price);
    } 
}
