import { ethers } from "hardhat";

async function main() {
  // --- 1. 准备阶段 ---
  console.log("🚀 正在启动 APP (脚本)...");

  // 获取默认的一个“用户账号” (测试网里的虚拟富豪)
  const [signer] = await ethers.getSigners();
  console.log("👤 当前操作员:", signer.address);

  // --- 2. 部署阶段 (相当于把餐厅盖好) ---
  console.log("\n🏗️  正在部署 ZkPodExchange 合约...");
  const zkPod = await ethers.deployContract("ZkPodExchange");
  await zkPod.waitForDeployment();
  console.log("✅ 合约已部署到地址:", zkPod.target);

  // --- 3. 实操：调用“写” API (ListPod) ---
  // 这就是你说的 "使用 API"！
  // 我们在本地代码里调用的函数，会变成一笔交易发给区块链
  console.log("\n📦 正在调用 listPod API 上架商品...");
  
  // 动作：上架一个价格为 100，名字叫 "MyFirstData" 的 Pod
  const tx = await zkPod.listPod(100, "MyFirstData"); 
  
  console.log("⏳ 交易发送成功，等待区块链确认 (Hash:", tx.hash, ")...");
  await tx.wait(); // 等待区块确认
  console.log("🎉 商品上架成功！");

  // --- 4. 实操：调用“读” API (GetTotalPods) ---
  // 再次使用 API，这次是查数据
  console.log("\n🔍 正在调用 getTotalPods API 查询...");
  
  const count = await zkPod.getTotalPods();
  console.log("📊 现在的商品总数是:", count.toString());
  
  // 验证一下刚才上架的数据对不对
  const pod = await zkPod.pods(0);
  console.log(`📝 第0号商品的详情: 名字=${pod.name}, 价格=${pod.price}`);
}

// 运行主函数，捕获错误
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});