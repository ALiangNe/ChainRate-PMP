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
    ├── scripts/             # 部署脚本
    ├── test/                # 测试文件
    └── package.json         # 项目依赖