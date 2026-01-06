// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

// 1. 定义一个接口，告诉交易所真正的 Verifier 长什么样
interface IVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[1] memory input
    ) external view returns (bool);
}

contract ZkPodExchange is Ownable {
    struct Pod {
        address seller;
        uint256 price;
        uint256 dataCommitment; // 注意：这里改成了 uint256 以匹配 ZK 电路输入
        bool isSold;
    }

    Pod[] public pods;
    address public verifierContract;

    event PodListed(uint256 indexed podId, address indexed seller, uint256 price);
    event PodPurchased(uint256 indexed podId, address indexed buyer);

    constructor() {}

    function setVerifier(address _verifier) external onlyOwner {
        verifierContract = _verifier;
    }

    // 上架：_commitment 改为 uint256 类型
    function listPod(uint256 _price, uint256 _commitment) public {
        pods.push(Pod({
            seller: msg.sender,
            price: _price,
            dataCommitment: _commitment,
            isSold: false
        }));
        emit PodListed(pods.length - 1, msg.sender, _price);
    }

    // 购买：参数大换血！接收 ZK 的三个椭圆曲线点 (a, b, c)
    function buyPod(
        uint256 _podId, 
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c
    ) public payable {
        Pod storage pod = pods[_podId];

        require(!pod.isSold, "Pod already sold");
        require(msg.value >= pod.price, "Not enough ETH");
        require(msg.sender != pod.seller, "Cannot buy your own pod");

        // --- 连接真实 ZK 验证器 ---
        // 构造公共输入 (Public Input)。我们的电路里只有一个公共输入：hash (即 commitment)
        uint[1] memory input;
        input[0] = pod.dataCommitment;

        // 调用 Verifier.sol 进行数学验证
        bool isValid = IVerifier(verifierContract).verifyProof(a, b, c, input);
        require(isValid, "Invalid ZK Proof!");

        // --- 交易通过 ---
        pod.isSold = true;
        (bool sent, ) = pod.seller.call{value: pod.price}("");
        require(sent, "Failed to send Ether");

        emit PodPurchased(_podId, msg.sender);
    }
}