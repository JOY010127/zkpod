import { ethers } from "hardhat";

async function main() {
  console.log("🎬 --- ZKPod (带验证版) 交易模拟 --- \n");
  const [seller, buyer] = await ethers.getSigners();

  // 1. 部署【模拟验证器】 (Verifier)
  const MockVerifier = await ethers.getContractFactory("MockVerifier");
  const verifier = await MockVerifier.deploy();
  await verifier.waitForDeployment();
  console.log(`⚖️  验证器合约已部署: ${verifier.target}`);

  // 2. 部署【交易所】 (Exchange)
  const ZkPodExchange = await ethers.getContractFactory("ZkPodExchange");
  const zkPod = await ZkPodExchange.deploy();
  await zkPod.waitForDeployment();
  console.log(`🏦 交易所合约已部署: ${zkPod.target}`);

  // 3. 【关键一步】把验证器装进交易所 (Set Verifier)
  await zkPod.setVerifier(verifier.target);
  console.log("🔗 验证器已连接到交易所！");

  // 4. 上架
  const price = ethers.parseEther("1.0");
  const commitment = ethers.keccak256(ethers.toUtf8Bytes("SecretData"));
  await zkPod.listPod(price, commitment, "QmCid...");
  console.log("\n📦 商品已上架");

  // 5. 购买 (这次要带上 Proof！)
  console.log("\n💸 [买家] 正在尝试购买...");
  
  // 模拟一个 Proof (随便写点字节，只要不为空，MockVerifier 就会放行)
  const dummyProof = ethers.toUtf8Bytes("这是一个假证明");

  // 调用 buyPod，传入 proof
  // 加了 (zkPod as any)
const tx = await (zkPod as any).connect(buyer).buyPod(0, dummyProof, { value: price });
  await tx.wait();

  console.log("🎉 购买成功!ZK 验证通过！");
  
  // 验证状态
  const pod = await zkPod.pods(0);
  console.log(`📝 最终状态: IsSold = ${pod.isSold}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});