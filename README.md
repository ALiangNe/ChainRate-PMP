# ChainRate-PMP 项目

## 项目简介
ChainRate-PMP是一个基于区块链技术的项目管理评估系统，旨在为项目管理专业人士提供透明、可信的评估机制。本系统利用区块链的不可篡改特性，确保评估过程的公正性和结果的可靠性。

## 核心特性
- 🔒 基于区块链的不可篡改评估记录
- 📊 实时项目绩效跟踪与分析
- 👥 多角色评估体系（项目经理、团队成员、客户）
- 📱 响应式Web界面，支持多端访问
- 🔍 评估结果可追溯与验证
- 📈 数据可视化展示

## 技术架构
### 前端技术栈
- Next.js 14 (React框架)
- TailwindCSS (样式框架)
- Web3.js (区块链交互)
- Chart.js (数据可视化)

### 智能合约技术栈
- Solidity (智能合约语言)
- Hardhat (开发框架)
- OpenZeppelin (合约库)

## 项目结构
```
ChainRate-PMP/
├── chainrate-nextjs/          # 前端项目
│   ├── src/                   # 源代码
│   │   ├── components/       # React组件
│   │   ├── pages/           # 页面路由
│   │   ├── styles/          # 样式文件
│   │   └── utils/           # 工具函数
│   ├── public/               # 静态资源
│   └── package.json          # 项目依赖
│
└── chainrate-hardhat/        # 智能合约项目
    ├── contracts/            # 智能合约代码
    ├── scripts/             # 部署脚本
    ├── test/                # 测试文件
    └── package.json         # 项目依赖
```

## 安装说明
### 前端项目安装
```bash
cd chainrate-nextjs
npm install
npm run dev
```

### 智能合约项目安装
```bash
cd chainrate-hardhat
npm install
npx hardhat compile  
```

## 使用说明
1. **环境要求**
   - Node.js >= 16.0.0
   - npm >= 7.0.0
   - MetaMask 或其他 Web3 钱包

2. **本地开发**
   - 启动本地区块链节点：`npx hardhat node`
   - 部署智能合约：`npx hardhat run scripts/deploy.js --network localhost`
   - 启动前端服务：`npm run dev`

3. **测试**
   - 运行合约测试：`npx hardhat test`
   - 运行前端测试：`npm test`

## 主要功能模块
1. **用户管理**
   - 用户注册与登录
   - 角色权限管理
   - 个人信息管理

2. **项目管理**
   - 项目创建与配置
   - 项目进度跟踪
   - 资源分配管理

3. **评估系统**
   - 多维度评估指标
   - 实时评估记录
   - 评估结果公示

4. **数据分析**
   - 项目绩效分析
   - 趋势图表展示
   - 评估报告生成

## 开发计划
### 第一阶段（基础功能）
- [x] 项目基础架构搭建
- [x] 智能合约开发
- [ ] 用户认证系统
- [ ] 基础项目管理功能

### 第二阶段（核心功能）
- [ ] 评估系统实现
- [ ] 数据可视化
- [ ] 报告生成系统
- [ ] 权限管理系统

### 第三阶段（优化升级）
- [ ] 性能优化
- [ ] UI/UX改进
- [ ] 多链支持
- [ ] 移动端适配

## 贡献指南
1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证
本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系方式
- 项目负责人：[联系方式]
- 项目邮箱：[邮箱地址]
- 项目网站：[网站地址]

## 致谢
感谢所有为本项目做出贡献的开发者们！ 