pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
// 👇 引入官方的切换器组件
include "../node_modules/circomlib/circuits/switcher.circom";

template MerkleVerifier(levels) {
    signal input root;
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hashers[levels];
    component switchers[levels]; // 声明切换器

    signal currentHash[levels + 1];
    currentHash[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);
        switchers[i] = Switcher(); // 实例化切换器

        // Switcher 的逻辑：
        // sel=0 (L) -> outL=L, outR=R
        // sel=1 (R) -> outL=R, outR=L
        
        // 1. 设置选择器 (0 或 1)
        switchers[i].sel <== pathIndices[i];
        
        // 2. 输入数据 (L=当前哈希, R=兄弟节点)
        switchers[i].L <== currentHash[i];
        switchers[i].R <== pathElements[i];

        // 3. 将切换后的结果喂给哈希函数
        hashers[i].inputs[0] <== switchers[i].outL;
        hashers[i].inputs[1] <== switchers[i].outR;

        currentHash[i + 1] <== hashers[i].out;
    }

    root === currentHash[levels];
}

component main {public [root]} = MerkleVerifier(10);