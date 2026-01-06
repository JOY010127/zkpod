import { ethers } from "hardhat";
// @ts-ignore
import * as snarkjs from "snarkjs";
import path from "path";
// @ts-ignore
import { buildPoseidon } from "circomlibjs";

async function main() {
  console.log(">>> 开始 ZK 隐私交易全流程演示 (含财务审计) <<<");

  // 1. 准备账户
  const [seller, buyer] = await ethers.getSigners();
  console.log(`[信息] 卖家地址: ${seller.address}`);
  console.log(`[信息] 买家地址: ${buyer.address}`);

  // 记录初始余额 (通常测试网是 10000 ETH)
  // 注意：卖家部署合约和上架商品会消耗少量 Gas，所以最终余额不会正好是 +0.001
  const initialBalanceSeller = await ethers.provider.getBalance(seller.address);
  const initialBalanceBuyer = await ethers.provider.getBalance(buyer.address);

  // ----------------------------------------------------
  // 2. 部署合约
  // ----------------------------------------------------
  console.log("\n[步骤 1] 正在部署合约...");
  
  // A. 部署 Verifier (注意：snarkjs 生成的合约名叫 Groth16Verifier)
  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  console.log(`  + Verifier 地址: ${verifier.target}`);

  // B. 部署 Exchange
  const ZkPodExchange = await ethers.getContractFactory("ZkPodExchange");
  const zkPod = await ZkPodExchange.deploy();
  await zkPod.waitForDeployment();
  console.log(`  + Exchange 地址: ${zkPod.target}`);

  // C. 连接两者
  await zkPod.setVerifier(verifier.target);
  console.log("  + 验证器已连接到交易所");

  // ----------------------------------------------------
  // 3. 卖家上架商品 (Listing)
  // ----------------------------------------------------
  console.log("\n[步骤 2] 卖家生成哈希并上架...");

  const poseidon = await buildPoseidon();
  const secret = 123456n; 
  const hashBigInt = poseidon.F.toObject(poseidon([secret]));
  
  console.log(`  + 商品秘密 (Secret): ${secret}`);
  console.log(`  + 商品指纹 (Hash): ${hashBigInt}`);

  const price = ethers.parseEther("0.001"); // 商品价格 0.001 ETH

  // 卖家上架
  const txList = await (zkPod as any).connect(seller).listPod(price, hashBigInt);
  await txList.wait(); // 等待上架完成
  console.log("  + 卖家上架成功");

  // ----------------------------------------------------
  // 4. 买家生成 ZK 证明 (Off-Chain)
  // ----------------------------------------------------
  console.log("\n[步骤 3] 买家生成零知识证明 (链下计算)...");

  const input = {
    secret: secret,
    hash: hashBigInt
  };

  const wasmPath = path.join(__dirname, "../circuits/simple_pod_js/simple_pod.wasm");
  const zkeyPath = path.join(__dirname, "../circuits/simple_pod_final.zkey");

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
  console.log("  + 证明生成成功 (Proof Generated)");

  // ----------------------------------------------------
  // 5. 格式化证明
  // ----------------------------------------------------
  const pA = [proof.pi_a[0], proof.pi_a[1]];
  const pB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
  const pC = [proof.pi_c[0], proof.pi_c[1]];
  
  // ----------------------------------------------------
  // 6. 提交交易与数据分析 (On-Chain)
  // ----------------------------------------------------
  console.log("\n[步骤 4] 买家提交 Proof 进行购买...");

  try {
    const tx = await (zkPod as any).connect(buyer).buyPod(
      0, pA, pB, pC, { value: price }
    );
    
    const receipt = await tx.wait();

    console.log(">>> 交易成功！ZK 验证通过 <<<");
    
    // --- 论文数据核心部分 ---
    console.log("------------------------------------------------");
    console.log(`[实验数据统计]`);
    console.log(`Gas Used (消耗量): ${receipt.gasUsed.toString()} units`);
    
    const gasPrice = 20n; // 假设 20 gwei
    const costEth = ethers.formatEther(receipt.gasUsed * gasPrice * 1000000000n);
    console.log(`预估手续费成本 (20 gwei): ${costEth} ETH`);
    
    const pod = await zkPod.pods(0);
    console.log(`链上状态 (isSold): ${pod.isSold}`);
    console.log("------------------------------------------------");

    // --- 财务审计部分 (验证转账是否成功) ---
    console.log(`\n[资金流向审计]`);
    
    const finalBalanceSeller = await ethers.provider.getBalance(seller.address);
    const finalBalanceBuyer = await ethers.provider.getBalance(buyer.address);

    // 计算差值
    const sellerProfit = finalBalanceSeller - initialBalanceSeller;
    const buyerCost = initialBalanceBuyer - finalBalanceBuyer;

    console.log(`卖家最终余额: ${ethers.formatEther(finalBalanceSeller)} ETH`);
    // 注意：卖家虽然收到了 0.001，但他部署合约和上架花了 Gas，所以总变化是负的或者微正，取决于 Gas 费
    console.log(`卖家变动详情: 收到商品费 (+0.001) - 部署/上架Gas费`); 
    
    console.log(`\n买家最终余额: ${ethers.formatEther(finalBalanceBuyer)} ETH`);
    console.log(`买家总花费: ${ethers.formatEther(buyerCost)} ETH`);
    console.log(`(构成: 商品费 0.001 ETH + 验证交易 Gas 费)`);
    console.log("------------------------------------------------");

  } catch (error) {
    console.error("交易失败:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});