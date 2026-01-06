import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  // 把原来的 solidity: "0.8.19" 改成下面这样：
  solidity: {
    compilers: [
      {
        version: "0.8.19", // 你的主合约用这个
      },
      {
        version: "0.6.11", // ZK Verifier 用这个
      },
    ],
  },
};

export default config;