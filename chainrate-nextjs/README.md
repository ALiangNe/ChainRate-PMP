# ChainRate - 基于区块链的教学评价系统

ChainRate 是一个基于区块链（以太坊）的教学评价系统，旨在为学校提供一个透明、不可篡改的教学评价平台。系统采用 Next.js 前端和 Solidity 智能合约开发，结合 Hardhat Ignition 框架进行部署和测试。

## 功能特性

### 用户认证和管理
- 支持多角色用户系统：管理员、教师和学生
- 基于区块链的用户注册和登录认证
- 安全的用户信息存储和访问控制

### 教师功能
- 创建新课程并设置评价时间段
- 查看和管理已创建的课程
- 浏览学生对课程的评价（包括匿名评价）
- 查看课程的综合评分和统计数据

### 学生功能
- 浏览所有可用课程
- 加入感兴趣的课程
- 在规定时间内为已加入的课程提交评价
- 支持匿名评价选项
- 查看课程详情和其他学生的评价

### 评价系统
- 评分和文字评价相结合的评价机制
- 评价一旦提交不可篡改，确保真实性
- 评价时间段控制，确保评价在合适的时间段内进行
- 自动计算课程平均评分

## 技术栈

- **前端**：Next.js、React、CSS Modules、ethers.js
- **后端**：Solidity 智能合约
- **开发环境**：Hardhat、Hardhat Ignition
- **区块链**：以太坊（支持Sepolia测试网和本地开发网络）

## 项目结构

```
chainrate-nextjs/               # 前端项目目录
├── public/                     # 静态资源
├── src/
│   ├── app/                    # Next.js 13+ 路由结构
│   │   ├── courseDetail/[id]/  # 课程详情页面（动态路由）
│   │   ├── dashboard/          # 用户仪表板
│   │   ├── login/              # 登录页面
│   │   ├── register/           # 注册页面
│   │   ├── studentIndex/       # 学生首页
│   │   ├── studentViewCourses/ # 学生查看课程列表
│   │   ├── submitEvaluation/[id]/ # 学生提交评价（动态路由）
│   │   ├── teacherCreateCourse/# 教师创建课程
│   │   ├── teacherIndex/       # 教师首页
│   │   ├── teacherViewCourse/  # 教师查看课程
│   │   ├── contracts/              # 智能合约 ABI 和地址
│   │   └── utils/                  # 工具函数
```

## 使用指南

### 前提条件
- 安装 Node.js 和 npm
- 安装并配置 MetaMask 浏览器扩展
- 在MetaMask中添加本地开发网络或Sepolia测试网

### 本地开发

1. 克隆项目
```bash
git clone https://github.com/your-username/chainrate.git
cd chainrate
```

2. 安装依赖
```bash
cd chainrate-nextjs
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 在浏览器中访问 `http://localhost:3000`

### 使用流程

1. **注册和登录**：
   - 用户使用MetaMask连接钱包
   - 根据身份选择相应角色（管理员、教师、学生）
   - 输入姓名和相关信息完成注册
   - 使用已注册的钱包地址进行登录

2. **教师创建课程**：
   - 教师登录后，进入"创建课程"页面
   - 输入课程名称并设置评价时间范围
   - 点击"创建课程"，确认MetaMask交易

3. **学生浏览和加入课程**：
   - 学生登录后，可在"查看课程"页面浏览所有课程
   - 点击"加入课程"按钮加入感兴趣的课程
   - 通过MetaMask确认加入课程的交易

4. **学生评价课程**：
   - 在评价时间段内，进入已加入的课程详情页
   - 点击"评价课程"按钮
   - 选择评分、填写评价内容，并选择是否匿名
   - 提交评价，通过MetaMask确认交易

5. **查看评价和统计**：
   - 所有用户都可查看课程的评价（视角根据角色不同）
   - 教师可查看自己课程的所有评价和统计数据
   - 学生可浏览所有课程的评价

## 安全和隐私

- 匿名评价选项保护学生隐私
- 基于区块链的不可篡改性确保评价真实可靠
- 智能合约权限控制确保数据安全

## 贡献

欢迎贡献代码或提出改进建议！请先fork项目，然后提交pull request。

## 许可证

本项目采用 MIT 许可证。

## 最新功能更新：区块链交易记录

### 交易记录存证功能
我们新增了区块链交易记录存证功能，现在当学生提交评价时，系统会自动：
1. 将交易哈希、区块号等关键信息保存到数据库
2. 在评价提交成功后显示交易哈希作为存证凭证
3. 提供API接口用于查询用户的交易记录

### 数据库结构
新增交易记录表 `transaction_records`，包含以下字段：
- `id`: 主键
- `transaction_hash`: 交易哈希
- `block_number`: 区块号
- `wallet_address`: 钱包地址
- `user_name`: 用户名字
- `function_name`: 函数名称
- `gas_used`: 消耗的gas
- `transaction_time`: 交易时间

### API接口
1. **保存交易记录**
   - 路径: `/api/saveTransaction`
   - 方法: POST
   - 参数: `transaction_hash`, `block_number`, `wallet_address`, `user_name`, `function_name`, `gas_used`

2. **获取用户交易记录**
   - 路径: `/api/getTransactions?walletAddress={wallet地址}&limit={数量}`
   - 方法: GET
   - 参数: `walletAddress` (必须), `limit` (可选, 默认20)

### 使用方法
在表单提交后，系统自动保存交易信息，并在成功模态框中展示交易哈希和区块号作为区块链存证凭证。
