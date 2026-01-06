import { ethers } from "hardhat";

async function main() {
  console.log("📊 --- 开始测量【普通上链方案】Gas 开销 ---");
  
  const Factory = await ethers.getContractFactory("Baseline");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  // 生成指定大小的随机数据 (字符串)
  const generateData = (size: number) => {
    return "a".repeat(size); // 生成一串 'aaaa...'
  };

  // 定义我们要测试的数据量
  const testSizes = [
    { label: "128 Bytes", size: 128 },
    { label: "1 KB",      size: 1024 },
    { label: "5 KB",      size: 5 * 1024 }, 
    // 注意：以太坊单个区块有Gas限制，太大这里会报错，所以我们测小的然后推算大的
  ];

  console.log(`| 数据规模 | 消耗 Gas (实测) |`);
  console.log(`| :--- | :--- |`);

  for (const test of testSizes) {
    // 把字符串转成 bytes
    const data = ethers.toUtf8Bytes(generateData(test.size));
    
    // 发送交易
    const tx = await contract.uploadData(data);
    const receipt = await tx.wait();
    
    if (receipt) {
        console.log(`| ${test.label.padEnd(9)} | ${receipt.gasUsed.toString().padEnd(15)} |`);
    }
  }
  
  console.log("\n⚠️ 提示：对于 1MB 或 1GB 的数据，由于超出区块 Gas 上限，论文中应使用上述 1KB 的 Gas 值乘以倍数进行【推算】。");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});