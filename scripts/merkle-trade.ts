import { ethers } from "hardhat";
// @ts-ignore
import * as snarkjs from "snarkjs";
import path from "path";
// @ts-ignore
import { buildPoseidon } from "circomlibjs";
import { performance } from "perf_hooks";

// --- 辅助类：支持任意层数的 Merkle Tree ---
class SimpleMerkleTree {
  poseidon: any;
  leaves: bigint[];
  tree: bigint[][];
  levels: number; // 新增：记录树的高度

  constructor(poseidon: any, inputs: bigint[], levels: number) {
    this.poseidon = poseidon;
    this.levels = levels;
    // 1. 哈希原始数据作为叶子
    this.leaves = inputs.map(x => poseidon.F.toObject(poseidon([x]))); 
    this.tree = [];
    this.build();
  }

  build() {
    this.tree = [this.leaves];
    let level = this.leaves;
    // 循环次数改为 this.levels
    for (let i = 0; i < this.levels; i++) {
      let nextLevel = [];
      // 如果当前层节点数是奇数，补一个 0
      if (level.length % 2 === 1) {
          level.push(BigInt(0));
      }
      
      for (let j = 0; j < level.length; j += 2) {
        const left = level[j];
        const right = (j + 1 < level.length) ? level[j + 1] : BigInt(0); 
        const hash = this.poseidon.F.toObject(this.poseidon([left, right]));
        nextLevel.push(hash);
      }
      level = nextLevel;
      this.tree.push(level);
    }
  }

  getRoot() {
    return this.tree[this.tree.length - 1][0];
  }

  getPath(index: number) {
    let pathElements = [];
    let pathIndices = [];
    let currIndex = index;
    
    // 循环次数改为 this.levels
    for (let i = 0; i < this.levels; i++) {
      let isRight = currIndex % 2;
      let siblingIndex = isRight ? currIndex - 1 : currIndex + 1;
      
      // 如果这一层没有这么多节点（比如数据不满），兄弟节点就是0
      let sibling = BigInt(0);
      if (siblingIndex < this.tree[i].length) {
          sibling = this.tree[i][siblingIndex];
      }
      
      pathElements.push(sibling);
      pathIndices.push(isRight);
      
      currIndex = Math.floor(currIndex / 2);
    }
    return { pathElements, pathIndices };
  }
}

async function main() {
  console.log("--- zkPoD 10层树高测试 (Capacity: 1024 chunks) ---");
  const poseidon = await buildPoseidon();
  const [seller, buyer] = await ethers.getSigners();

  // 1. 生成 1024 个数据块 (2^10 = 1024)
  // 为了填满 10 层树，我们需要更多的数据，或者允许树是稀疏的（不足补0）
  console.log("正在生成 1024 个虚拟数据块...");
  const inputs: bigint[] = [];
  for (let i = 0; i < 1024; i++) {
      // 简单模拟：数据块就是索引号
      inputs.push(BigInt(i + 100000)); 
  }
  
  // 2. 构建 10 层 Merkle Tree
  const TREE_LEVELS = 10; // 👈 这里设置为 10
  console.log(`正在构建 ${TREE_LEVELS} 层 Merkle Tree (这可能需要一点时间)...`);
  
  const buildStart = performance.now();
  const merkleTree = new SimpleMerkleTree(poseidon, inputs, TREE_LEVELS);
  const buildEnd = performance.now();
  
  console.log(`树构建完成，耗时: ${(buildEnd - buildStart).toFixed(2)} ms`);
  const root = merkleTree.getRoot();
  console.log(`Merkle Root: ${root}`);

  // 3. 部署合约
  console.log("[2] 部署合约...");
  const Verifier = await ethers.getContractFactory("MerkleGroth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();

  const ZkPodExchange = await ethers.getContractFactory("ZkPodExchange");
  const zkPod = await ZkPodExchange.deploy();
  await zkPod.waitForDeployment();
  await zkPod.setVerifier(verifier.target);

  // 4. 卖家上架
  console.log("[3] 卖家上架...");
  const price = ethers.parseEther("0.001");
  const txList = await (zkPod as any).connect(seller).listPod(price, root);
  await txList.wait();

  // 5. 买家验证
  console.log("[4] 买家验证...");
  // 我们验证第 512 个数据块 (中间位置)
  const targetIndex = 512; 
  const targetValue = inputs[targetIndex]; 
  const targetLeafHash = poseidon.F.toObject(poseidon([targetValue]));
  
  const { pathElements, pathIndices } = merkleTree.getPath(targetIndex);
  
  // 打印一下路径长度，确认是 10
  console.log(`路径长度: ${pathElements.length} (预期: 10)`);

  const input = {
    root: root.toString(),
    leaf: targetLeafHash.toString(),
    pathElements: pathElements.map((x) => x.toString()),
    pathIndices: pathIndices.map((x) => x.toString()) 
  };

  // 注意：这里要指向新生成的 10 层 zkey
  const wasmPath = path.join(__dirname, "../circuits/merkle_pod_js/merkle_pod.wasm");
  // 👇 如果你刚才生成的新key叫 merkle_pod_10.zkey，这里要改
  // 如果你直接覆盖了原来的，就不用改
  const zkeyPath = path.join(__dirname, "../circuits/merkle_pod_10.zkey"); 

  console.log("开始生成 10层 Merkle Proof...");
  
  const startTime = performance.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
  const endTime = performance.now();
  
  const duration = (endTime - startTime).toFixed(2);
  console.log(`Proof 生成耗时: ${duration} ms (${(Number(duration)/1000).toFixed(3)} s)`);

  // 6. 提交上链
  const pA = [proof.pi_a[0], proof.pi_a[1]];
  const pB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
  const pC = [proof.pi_c[0], proof.pi_c[1]];

  console.log("[5] 提交链上验证...");
  try {
    const tx = await (zkPod as any).connect(buyer).buyPod(
      0, pA, pB, pC, { value: price }
    );
    const receipt = await tx.wait();
    
    console.log(`交易成功！`);
    console.log(`Gas 消耗: ${receipt.gasUsed}`);
  } catch (e) {
    console.error("验证失败", e);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});