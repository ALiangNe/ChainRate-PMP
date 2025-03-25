// 部署合约并保存ABI和地址到前端项目
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("===========================================");
  console.log("开始部署ChainRate合约");
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  console.log("===========================================");

  // 增加一个空交易来改变nonce (可选，如果你希望每次部署的地址不同)
  // await deployer.sendTransaction({
  //   to: deployer.address,
  //   value: ethers.parseEther("0")
  // });

  // 部署 ChainRate 合约
  const ChainRate = await ethers.getContractFactory("ChainRate");
  const chainRate = await ChainRate.deploy();
  
  console.log("等待部署交易确认...");
  await chainRate.waitForDeployment();
  
  const chainRateAddress = await chainRate.getAddress();

  console.log("===========================================");
  console.log("ChainRate合约已成功部署！");
  console.log("合约地址:", chainRateAddress);
  console.log("===========================================");

  // 保存ABI和地址到前端项目
  saveFrontendFiles(chainRate, chainRateAddress, "ChainRate");

  return chainRateAddress;
}

function saveFrontendFiles(contract, address, name) {
  // 前端项目的contracts目录
  const contractsDir = path.join(__dirname, '..', '..', 'chainrate-nextjs', 'src', 'contracts');

  // 确保目录存在
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
    console.log(`创建目录: ${contractsDir}`);
  }

  // 保存合约地址
  const addressFile = path.join(contractsDir, `${name}-address.json`);
  fs.writeFileSync(
    addressFile,
    JSON.stringify({ address: address }, undefined, 2)
  );
  console.log(`合约地址已保存到: ${addressFile}`);

  // 保存合约ABI
  const ContractArtifact = artifacts.readArtifactSync(name);
  const abiFile = path.join(contractsDir, `${name}.json`);
  fs.writeFileSync(
    abiFile,
    JSON.stringify(ContractArtifact, null, 2)
  );
  console.log(`合约ABI已保存到: ${abiFile}`);
}

main()
  .then((address) => {
    console.log(`部署流程完成，合约地址: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("部署失败:");
    console.error(error);
    process.exit(1);
  }); 