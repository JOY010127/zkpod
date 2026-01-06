"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var hardhat_1 = require("hardhat");
// @ts-ignore
var snarkjs = require("snarkjs");
var path_1 = require("path");
// @ts-ignore
var circomlibjs_1 = require("circomlibjs");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, seller, buyer, initialBalanceSeller, initialBalanceBuyer, Verifier, verifier, ZkPodExchange, zkPod, poseidon, secret, hashBigInt, price, txList, input, wasmPath, zkeyPath, _b, proof, publicSignals, pA, pB, pC, tx, receipt, gasPrice, costEth, pod, finalBalanceSeller, finalBalanceBuyer, sellerProfit, buyerCost, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log(">>> 开始 ZK 隐私交易全流程演示 (含财务审计) <<<");
                    return [4 /*yield*/, hardhat_1.ethers.getSigners()];
                case 1:
                    _a = _c.sent(), seller = _a[0], buyer = _a[1];
                    console.log("[\u4FE1\u606F] \u5356\u5BB6\u5730\u5740: ".concat(seller.address));
                    console.log("[\u4FE1\u606F] \u4E70\u5BB6\u5730\u5740: ".concat(buyer.address));
                    return [4 /*yield*/, hardhat_1.ethers.provider.getBalance(seller.address)];
                case 2:
                    initialBalanceSeller = _c.sent();
                    return [4 /*yield*/, hardhat_1.ethers.provider.getBalance(buyer.address)];
                case 3:
                    initialBalanceBuyer = _c.sent();
                    // ----------------------------------------------------
                    // 2. 部署合约
                    // ----------------------------------------------------
                    console.log("\n[步骤 1] 正在部署合约...");
                    return [4 /*yield*/, hardhat_1.ethers.getContractFactory("Groth16Verifier")];
                case 4:
                    Verifier = _c.sent();
                    return [4 /*yield*/, Verifier.deploy()];
                case 5:
                    verifier = _c.sent();
                    return [4 /*yield*/, verifier.waitForDeployment()];
                case 6:
                    _c.sent();
                    console.log("  + Verifier \u5730\u5740: ".concat(verifier.target));
                    return [4 /*yield*/, hardhat_1.ethers.getContractFactory("ZkPodExchange")];
                case 7:
                    ZkPodExchange = _c.sent();
                    return [4 /*yield*/, ZkPodExchange.deploy()];
                case 8:
                    zkPod = _c.sent();
                    return [4 /*yield*/, zkPod.waitForDeployment()];
                case 9:
                    _c.sent();
                    console.log("  + Exchange \u5730\u5740: ".concat(zkPod.target));
                    // C. 连接两者
                    return [4 /*yield*/, zkPod.setVerifier(verifier.target)];
                case 10:
                    // C. 连接两者
                    _c.sent();
                    console.log("  + 验证器已连接到交易所");
                    // ----------------------------------------------------
                    // 3. 卖家上架商品 (Listing)
                    // ----------------------------------------------------
                    console.log("\n[步骤 2] 卖家生成哈希并上架...");
                    return [4 /*yield*/, (0, circomlibjs_1.buildPoseidon)()];
                case 11:
                    poseidon = _c.sent();
                    secret = 123456n;
                    hashBigInt = poseidon.F.toObject(poseidon([secret]));
                    console.log("  + \u5546\u54C1\u79D8\u5BC6 (Secret): ".concat(secret));
                    console.log("  + \u5546\u54C1\u6307\u7EB9 (Hash): ".concat(hashBigInt));
                    price = hardhat_1.ethers.parseEther("0.001");
                    return [4 /*yield*/, zkPod.connect(seller).listPod(price, hashBigInt)];
                case 12:
                    txList = _c.sent();
                    return [4 /*yield*/, txList.wait()];
                case 13:
                    _c.sent(); // 等待上架完成
                    console.log("  + 卖家上架成功");
                    // ----------------------------------------------------
                    // 4. 买家生成 ZK 证明 (Off-Chain)
                    // ----------------------------------------------------
                    console.log("\n[步骤 3] 买家生成零知识证明 (链下计算)...");
                    input = {
                        secret: secret,
                        hash: hashBigInt
                    };
                    wasmPath = path_1.default.join(__dirname, "../circuits/simple_pod_js/simple_pod.wasm");
                    zkeyPath = path_1.default.join(__dirname, "../circuits/simple_pod_final.zkey");
                    return [4 /*yield*/, snarkjs.groth16.fullProve(input, wasmPath, zkeyPath)];
                case 14:
                    _b = _c.sent(), proof = _b.proof, publicSignals = _b.publicSignals;
                    console.log("  + 证明生成成功 (Proof Generated)");
                    pA = [proof.pi_a[0], proof.pi_a[1]];
                    pB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
                    pC = [proof.pi_c[0], proof.pi_c[1]];
                    // ----------------------------------------------------
                    // 6. 提交交易与数据分析 (On-Chain)
                    // ----------------------------------------------------
                    console.log("\n[步骤 4] 买家提交 Proof 进行购买...");
                    _c.label = 15;
                case 15:
                    _c.trys.push([15, 21, , 22]);
                    return [4 /*yield*/, zkPod.connect(buyer).buyPod(0, pA, pB, pC, { value: price })];
                case 16:
                    tx = _c.sent();
                    return [4 /*yield*/, tx.wait()];
                case 17:
                    receipt = _c.sent();
                    console.log(">>> 交易成功！ZK 验证通过 <<<");
                    // --- 论文数据核心部分 ---
                    console.log("------------------------------------------------");
                    console.log("[\u5B9E\u9A8C\u6570\u636E\u7EDF\u8BA1]");
                    console.log("Gas Used (\u6D88\u8017\u91CF): ".concat(receipt.gasUsed.toString(), " units"));
                    gasPrice = 20n;
                    costEth = hardhat_1.ethers.formatEther(receipt.gasUsed * gasPrice * 1000000000n);
                    console.log("\u9884\u4F30\u624B\u7EED\u8D39\u6210\u672C (20 gwei): ".concat(costEth, " ETH"));
                    return [4 /*yield*/, zkPod.pods(0)];
                case 18:
                    pod = _c.sent();
                    console.log("\u94FE\u4E0A\u72B6\u6001 (isSold): ".concat(pod.isSold));
                    console.log("------------------------------------------------");
                    // --- 财务审计部分 (验证转账是否成功) ---
                    console.log("\n[\u8D44\u91D1\u6D41\u5411\u5BA1\u8BA1]");
                    return [4 /*yield*/, hardhat_1.ethers.provider.getBalance(seller.address)];
                case 19:
                    finalBalanceSeller = _c.sent();
                    return [4 /*yield*/, hardhat_1.ethers.provider.getBalance(buyer.address)];
                case 20:
                    finalBalanceBuyer = _c.sent();
                    sellerProfit = finalBalanceSeller - initialBalanceSeller;
                    buyerCost = initialBalanceBuyer - finalBalanceBuyer;
                    console.log("\u5356\u5BB6\u6700\u7EC8\u4F59\u989D: ".concat(hardhat_1.ethers.formatEther(finalBalanceSeller), " ETH"));
                    // 注意：卖家虽然收到了 0.001，但他部署合约和上架花了 Gas，所以总变化是负的或者微正，取决于 Gas 费
                    console.log("\u5356\u5BB6\u53D8\u52A8\u8BE6\u60C5: \u6536\u5230\u5546\u54C1\u8D39 (+0.001) - \u90E8\u7F72/\u4E0A\u67B6Gas\u8D39");
                    console.log("\n\u4E70\u5BB6\u6700\u7EC8\u4F59\u989D: ".concat(hardhat_1.ethers.formatEther(finalBalanceBuyer), " ETH"));
                    console.log("\u4E70\u5BB6\u603B\u82B1\u8D39: ".concat(hardhat_1.ethers.formatEther(buyerCost), " ETH"));
                    console.log("(\u6784\u6210: \u5546\u54C1\u8D39 0.001 ETH + \u9A8C\u8BC1\u4EA4\u6613 Gas \u8D39)");
                    console.log("------------------------------------------------");
                    return [3 /*break*/, 22];
                case 21:
                    error_1 = _c.sent();
                    console.error("交易失败:", error_1);
                    return [3 /*break*/, 22];
                case 22: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});
