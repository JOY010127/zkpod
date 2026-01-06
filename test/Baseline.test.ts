import { expect } from "chai";
import { ethers } from "hardhat";

describe("Baseline Contract Test", function () {
  it("应该能够成功部署 Baseline 合约", async function () {
    // 1. 获取测试账户
    const [owner] = await ethers.getSigners();

    // 2. 获取合约工厂
    // 注意：这里假设你的 Solidity 代码里写的是 "contract Baseline { ... }"
    const Factory = await ethers.getContractFactory("Baseline");

    // 3. 部署合约
    const contract = await Factory.deploy();
    await contract.waitForDeployment(); 

    // 4. 打印地址并验证
    const address = await contract.getAddress();
    console.log("    Baseline 合约部署地址:", address);
    
    // 验证地址是否合法
    expect(address).to.be.properAddress;
  });
});