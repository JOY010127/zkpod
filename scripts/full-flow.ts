import { ethers } from "hardhat";
// @ts-ignore
import * as snarkjs from "snarkjs";
import path from "path";
// @ts-ignore
import { buildPoseidon } from "circomlibjs";
import crypto from "crypto"; // 引入加密库

// --- 辅助函数：把 BigInt 转换成适合 AES 加密的 32字节 Key ---
function bigIntToAesKey(secretBigInt: bigint): Buffer {
  // 简单处理：把数字转成字符串，再哈希一次作为 AES 密钥
  return crypto.createHash('sha256').update(secretBigInt.toString()).digest();
}

// --- 辅助函数：AES 加密 ---
function encryptData(text: string, secretBigInt: bigint) {
  const key = bigIntToAesKey(secretBigInt);
  const iv = crypto.randomBytes(16); // 随机初始化向量
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag
  };
}

// --- 辅助函数：AES 解密 ---
function decryptData(encryptedObj: any, secretBigInt: bigint) {
  const key = bigIntToAesKey(secretBigInt);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm', 
    key, 
    Buffer.from(encryptedObj.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
  let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function main() {
  console.log("🎬 --- zkPoD 全流程模拟 (加密-交易-解密) --- 🎬");

  const [seller, buyer] = await ethers.getSigners();
  const poseidon = await buildPoseidon();

  // ----------------------------------------------------
  // 0. 环境初始化 (部署合约)
  // ----------------------------------------------------
  console.log("\n[0] 初始化系统...");
  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  
  const ZkPodExchange = await ethers.getContractFactory("ZkPodExchange");
  const zkPod = await ZkPodExchange.deploy();
  await zkPod.waitForDeployment();
  await zkPod.setVerifier(verifier.target);
  console.log("✅ 合约部署完成");

  // ----------------------------------------------------
  // 1. 卖家准备数据 (Encryption Phase)
  // ----------------------------------------------------
  console.log("\n[1] 卖家准备数据...");
  
  // 这是我们要卖的真实文件内容
  const realData = "🌊 机密数据: 猎杀潜航的坐标是 [N 32.5, E 121.8]";
  console.log(`📄 原始文件: "${realData}"`);

  // 生成一个随机密钥 (Secret)
  // 在 ZK 电路里，我们用 BigInt 表示这个密钥
  const secretKey = 88888888n; 
  console.log(`🔑 生成密钥 (Secret): ${secretKey}`);

  // 使用密钥加密数据
  console.log("🔒 正在使用 AES-256 加密文件...");
  const encryptedPackage = encryptData(realData, secretKey);
  console.log(`📦 加密完成! 生成密文包 (Ciphertext)`);
  console.log(`   (买家现在只能看到这一堆乱码: ${encryptedPackage.encryptedData.substring(0, 20)}...)`);

  // 计算密钥的哈希 (Commitment) 上链
  const commitment = poseidon.F.toObject(poseidon([secretKey]));
  console.log(`📌 计算密钥承诺 (Commitment): ${commitment}`);

  // ----------------------------------------------------
  // 2. 卖家上架 (Listing Phase)
  // ----------------------------------------------------
  console.log("\n[2] 卖家上架...");
  const price = ethers.parseEther("0.001");
  const txList = await (zkPod as any).connect(seller).listPod(price, commitment);
  await txList.wait();
  console.log("✅ 商品已上架区块链，承诺已锁定。");

  // ----------------------------------------------------
  // 3. 模拟数据传输 (Delivery Simulation)
  // ----------------------------------------------------
  console.log("\n[3] 模拟场景切换...");
  console.log("   (卖家把【密文包】发给了买家)");
  console.log("   (买家此时拥有：密文 + 链上的Commitment，但没有密钥，解不开文件)");

  // ----------------------------------------------------
  // 4. 买家验证并购买 (Trading Phase)
  // ----------------------------------------------------
  console.log("\n[4] 买家生成 ZK 证明并购买...");
  
  // 注意：在完整 zkPoD 协议中，这里通常涉及“可验证加密”或“密钥交换协议”。
  // 为了 MVP 演示，我们假设买家通过某种方式（如原子交换协议的预备阶段）获得了生成 Proof 的能力。
  // 这里我们模拟买家使用正确的 Secret 生成 Proof。
  
  const input = {
    secret: secretKey, // 证明我知道这个密钥
    hash: commitment   // 且这个密钥对应链上的哈希
  };

  const wasmPath = path.join(__dirname, "../circuits/simple_pod_js/simple_pod.wasm");
  const zkeyPath = path.join(__dirname, "../circuits/simple_pod_final.zkey");

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
  
  // 整理 Proof 格式
  const pA = [proof.pi_a[0], proof.pi_a[1]];
  const pB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
  const pC = [proof.pi_c[0], proof.pi_c[1]];

  console.log("⚡ Proof 生成成功，发起链上交易...");
  const txBuy = await (zkPod as any).connect(buyer).buyPod(
    0, pA, pB, pC, { value: price }
  );
  const receipt = await txBuy.wait();
  
  console.log(`✅ 交易成功! Gas Used: ${receipt.gasUsed}`);

  // ----------------------------------------------------
  // 5. 买家解密数据 (Decryption Phase)
  // ----------------------------------------------------
  console.log("\n[5] 交易完成，买家解密数据...");

  try {
    // 买家现在确信密钥是安全的（因为通过了 ZK 验证），开始解密
    const decryptedText = decryptData(encryptedPackage, secretKey);
    console.log(`🔓 解密成功!`);
    console.log(`📄 还原的文件内容: "${decryptedText}"`);
    
    if (decryptedText === realData) {
        console.log("🎉 --- 全流程数据一致性验证通过！ --- 🎉");
    } else {
        console.error("❌ 数据损坏！");
    }

  } catch (e) {
    console.error("❌ 解密失败，密钥错误！");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});