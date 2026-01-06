// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Baseline {
    // 模拟最笨的存储方式：直接把数据存进 bytes 变量
    bytes public dataStore;

    // 这是一个非常昂贵的操作
    function uploadData(bytes calldata _data) public {
        dataStore = _data;
    }
}