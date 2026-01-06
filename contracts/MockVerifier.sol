// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// 这是一个模拟的 ZK 验证器
// 在真正的生产环境中，这个文件会被 SnarkJS 生成的代码替代
contract MockVerifier {

    // 核心函数：验证证明
    // 在测试阶段，我们让它永远返回 true (验证通过)
    // 这样我们就可以先跑通交易所的流程
    function verifyProof(
        bytes memory proof,
        bytes32 /* commitment */ // <--- 把变量名注释掉，保留类型即可
    ) external pure returns (bool) {
        if (proof.length > 0) {
            return true;
        }
        return false; 
    }
}