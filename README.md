# ChainRate-PMP 项目

## 项目简介
ChainRate-PMP是一个基于区块链技术的教育评价系统，旨在为高校师生提供透明、公正、可信的多维度评价平台。本系统利用区块链的不可篡改特性，实现课程评价和教师评价的全过程记录，确保评价数据的真实性和可靠性。系统支持学生对课程及教师进行多维度评分与反馈，同时为教师和管理员提供数据分析功能，促进教学质量提升。

## 核心特性
- 🔒 基于区块链的不可篡改评价记录，确保数据真实可信
- 👥 多角色权限管理（管理员、教师、学生），满足不同用户需求
- 📊 多维度评价体系，全方位评估教学质量与效果
- 🔍 评价结果可追溯与验证，支持匿名与实名评价
- 📱 响应式Web界面，支持多端访问与操作
- 📈 评价数据可视化与统计分析，辅助教学决策
- 🔄 课程管理与选课系统，实现教学全流程管理

## 核心功能
### 用户管理
- 用户注册与角色分配（管理员、教师、学生）
- 用户信息管理与身份验证
- 权限控制与访问管理

### 课程管理
- 教师创建与管理课程
- 学生选课与退课
- 课程信息查询与展示
- 课程评价时段控制

### 评价系统
#### 课程评价
- 学生对已选课程进行多维度评分
  - 教学质量评分
  - 内容设计评分 
  - 师生互动评分
- 课程评价内容与图片上传
- 匿名评价选项

#### 教师评价
- 学生对授课教师进行多维度评分
  - 教学能力评分
  - 教学态度评分
  - 教学方法评分
  - 学术水平评分
  - 指导能力评分
- 教师评价内容与图片上传
- 匿名评价选项

### 数据分析与展示
- 评价结果统计与分析
- 数据可视化展示
- 评价趋势分析
- 课程与教师评价对比分析

### 区块链集成
- 智能合约自动执行评价流程
- 评价数据上链存储，确保数据不可篡改
- 区块链交易记录查询

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


## 安装使用说明
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
npx hardhat run ./ignition/deploy.js --network localhost
```
## 许可证
本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## Git指南
- git reflog
- git reset --hard "HEAD@{1}"


## 项目结构
```
ChainRate-PMP/
├── chainrate-nextjs/          # 前端项目
│   ├── src/                   # 源代码
│   │   ├── app/              # Next.js 应用程序目录
│   │   │   ├── adminGetStudentList/     # 管理员获取学生列表页面
│   │   │   ├── adminGetTeacherList/     # 管理员获取教师列表页面
│   │   │   ├── adminIndex/              # 管理员首页
│   │   │   ├── api/                     # API路由
│   │   │   ├── components/              # 共享组件
│   │   │   │   ├── StudentSidebar.js    # 学生侧边栏
│   │   │   │   ├── TeacherSidebar.js    # 教师侧边栏
│   │   │   │   └── UserAvatar.js        # 用户头像组件
│   │   │   ├── dashboard/               # 仪表板页面
│   │   │   ├── login/                   # 登录页面
│   │   │   ├── NotFound/                # 404页面
│   │   │   ├── register/                # 注册页面
│   │   │   ├── studentCourseDetail/     # 学生课程详情页面
│   │   │   ├── studentEvaluateTeacher/  # 学生评价老师页面
│   │   │   ├── studentIndex/            # 学生首页
│   │   │   ├── studentMyEvaluation/     # 学生我的评价页面
│   │   │   ├── studentSubmitEvaluation/ # 学生提交评价页面
│   │   │   ├── studentSubmitFeedback/   # 学生提交反馈页面
│   │   │   ├── studentViewCourses/      # 学生查看课程页面
│   │   │   ├── studentViewEvaluateTeacher/ # 学生查看教师评价页面
│   │   │   ├── studentViewFeedback/     # 学生查看反馈页面
│   │   │   ├── teacheFeedbackAnalysis/  # 教师反馈分析页面
│   │   │   ├── teacherCreateCourse/     # 教师创建课程页面
│   │   │   ├── teacherIndex/            # 教师首页
│   │   │   ├── teacherManageCourse/     # 教师管理课程页面
│   │   │   ├── teacherStatisticalAnalysis/ # 教师统计分析页面
│   │   │   ├── teacherViewCourse/       # 教师查看课程页面
│   │   │   ├── teacherViewEvaluation/   # 教师查看评价页面
│   │   │   ├── teacherViewEvaluateTeacher/ # 教师查看教师评价页面
│   │   │   ├── teacherViewFeedback/     # 教师查看反馈页面
│   │   │   ├── utils/                   # 工具函数
│   │   │   ├── favicon.ico              # 网站图标
│   │   │   ├── globals.css              # 全局样式
│   │   │   ├── layout.js                # 布局组件
│   │   │   ├── page.js                  # 主页面
│   │   │   └── page.module.css          # 主页面样式
│   │   ├── contracts/                  # 区块链合约相关文件
│   │   │   ├── ChainRate.json           # 合约ABI
│   │   │   ├── ChainRate-address.json   # 合约地址
│   │   │   ├── ChainRate02.json         # 合约ABI (第二版)
│   │   │   └── ChainRate02-address.json # 合约地址 (第二版)
│   │   ├── database/                   # 数据库相关文件
│   │   │   └── transaction_records.sql  # SQL语句
│   │   └── utils/                      # 工具函数
│   │       └── db.js                    # 数据库工具
│   ├── public/               # 静态资源
│   │   ├── images/           # 图片资源
│   │   │   ├── logo.jpg      # 徽标图片
│   │   │   ├── logo1.png     # 徽标图片1
│   │   │   └── logo12.png    # 徽标图片12
│   │   ├── ethereum.svg      # 以太坊图标
│   │   ├── file.svg          # 文件图标
│   │   ├── globe.svg         # 地球图标
│   │   ├── next.svg          # Next.js图标
│   │   ├── vercel.svg        # Vercel图标
│   │   └── window.svg        # 窗口图标
│   ├── .next/                # Next.js构建文件
│   ├── node_modules/         # 依赖包
│   ├── .gitignore            # Git忽略文件
│   ├── jsconfig.json         # JavaScript配置
│   ├── next.config.mjs       # Next.js配置
│   ├── package.json          # 项目依赖
│   ├── package-lock.json     # 依赖锁定文件
│   └── postcss.config.mjs    # PostCSS配置
│
└── chainrate-hardhat/        # 智能合约项目
    ├── contracts/            # 智能合约代码
    │   ├── ChainRate.sol      # 主要智能合约
    │   └── ChainRate02.sol    # 智能合约升级版本
    ├── ignition/             # Hardhat Ignition部署框架
    │   ├── modules/          # 模块目录
    │   │   └── Lock.js        # 锁定模块
    │   └── deploy.js          # 部署脚本
    ├── test/                 # 测试文件
    │   └── ChainRate.test.js  # 合约测试脚本
    ├── artifacts/            # 编译后的合约文件
    ├── cache/                # Hardhat缓存
    ├── node_modules/         # 依赖包
    ├── ChainRate-Contract-Documentation.md # 合约文档
    ├── hardhat.config.js     # Hardhat配置文件
    ├── package.json          # 项目依赖
    ├── package-lock.json     # 依赖锁定文件
    ├── README.md             # 项目说明文件
    └── .gitignore            # Git忽略文件