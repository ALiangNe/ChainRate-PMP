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
npx hardhat run ./ignition/deploy.js --network localhost
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


## Git指南
- git reflog
- git reset --hard "HEAD@{1}"

# ChainRate-PMP 链评系统

ChainRate是一个基于区块链的课程评价系统，支持学生对课程和教师进行多维度评价，让教学评价更透明、更公正。

## 项目概述

本项目由两个主要智能合约组成：
- **ChainRate.sol**: 提供用户管理、课程管理和课程评价功能
- **ChainRate02.sol**: 提供教师多维度评价功能

## 功能列表

### ChainRate.sol 核心功能
1. **用户管理**
   - 用户注册：学生、教师、管理员角色
   - 用户登录：密码验证
   - 用户信息查询

2. **课程管理**
   - 课程创建：教师可创建课程
   - 课程更新：修改课程信息
   - 课程查询：获取课程列表和详情

3. **课程选修**
   - 学生加入课程
   - 学生退出课程
   - 课程学生管理

4. **课程评价**
   - 提交课程评价：内容、评分等
   - 查看评价：按课程、按学生查询
   - 评价统计：平均评分、分布等

### ChainRate02.sol 教师评价功能
1. **教师多维度评价**
   - 学生可以对教师进行多维度评价（仅限选修过该教师课程的学生）
   - 评价维度包括：
     - 教学能力：讲课清晰度、知识掌握程度等
     - 教学态度：认真负责、关注学生
     - 教学方法：教学手段多样性、互动性
     - 学术水平：学术研究能力、前沿知识掌握
     - 指导能力：指导学生解决问题的能力

2. **教师评价查询**
   - 查看单个教师的评价详情
   - 获取评价统计数据
   - 生成教师评价报告

3. **评价权限管理**
   - 验证学生是否有权限评价特定教师
   - 防止重复评价

## 如何使用

### 评价教师
1. 学生必须先选修该教师的至少一门课程
2. 使用`submitTeacherEvaluation`函数提交评价，包括:
   - 教师地址
   - 评价内容
   - 每个维度的评分(1-5分)
   - 是否匿名

### 查看教师评价
1. 使用`getTeacherEvaluations`查看指定教师收到的所有评价
2. 使用`getTeacherAverageRatings`查看教师各维度的平均评分
3. 使用`generateTeacherReport`生成教师评价报告

## 合约关联

两个合约之间通过以下方式关联：
1. ChainRate02合约通过`setMainContract`函数设置ChainRate主合约地址
2. ChainRate02合约可以调用ChainRate合约的函数，如获取用户信息、验证用户角色等
3. 教师评价时，会验证学生是否选修过该教师的课程

## 数据结构

### TeacherEvaluation 教师评价数据结构
```
struct TeacherEvaluation {
    uint256 id;                      // 评价唯一标识符
    address student;                 // 学生地址
    address teacher;                 // 教师地址
    uint256 timestamp;               // 评价时间戳
    string contentHash;              // 评价内容哈希值
    string[] imageHashes;            // 评价图片哈希数组
    bool isAnonymous;                // 是否匿名评价
    uint8 overallRating;             // 总体评分(1-5)
    uint8 teachingAbilityRating;     // 教学能力评分(1-5)
    uint8 teachingAttitudeRating;    // 教学态度评分(1-5)
    uint8 teachingMethodRating;      // 教学方法评分(1-5)
    uint8 academicLevelRating;       // 学术水平评分(1-5)
    uint8 guidanceAbilityRating;     // 指导能力评分(1-5)
    bool isActive;                   // 评价是否有效
}
```

## 系统部署

1. 先部署ChainRate.sol合约
2. 部署ChainRate02.sol合约
3. 调用ChainRate02合约的`setMainContract`函数，设置ChainRate合约地址
4. 系统即可完整运行

## 前端页面现代化改造示例：学生课程列表

在 `chainrate-nextjs/src/app/studentViewCourses/page.js` 页面中，原先的卡片式课程列表已被改造为现代化的表格视图，以提供更清晰、更易于管理的信息展示。

### 表格视图特性
- **清晰的列布局**：课程信息被组织在以下列中：
  - `课程名称`: 显示课程的名称，点击可查看课程详情。
  - `教师`: 显示授课教师的姓名。
  - `课程状态`: 显示课程当前状态（如：即将开始、评价中、已结束），并以不同颜色的标签区分。
  - `开始时间`: 课程的开始日期和时间。
  - `结束时间`: 课程的结束日期和时间。
  - `学生人数`: 已选修该课程的学生数量。
  - `平均评分`: 学生对该课程的平均评分，以星级展示。
  - `操作`: 提供"查看详情"和"加入课程"/"已加入"等操作按钮。
- **交互功能**：
  - **排序**: 用户可以点击大部分列标题对课程进行升序或降序排序。
  - **筛选**: "课程状态"列提供了筛选功能，用户可以根据状态筛选课程。
  - **分页**: 当课程数量较多时，表格会自动进行分页显示。
  - **搜索与全局筛选**: 页面保留了顶部的搜索框（可按课程名或教师名搜索）和状态/时间筛选器，这些会与表格内容联动。
- **技术实现**：
  - 该表格视图使用了 **Ant Design** 的 `Table` 组件，充分利用了其内置的排序、筛选、分页和加载状态管理功能。
  - 样式与项目整体 Ant Design 风格保持一致，确保了用户体验的统一性。

这种表格化的改造不仅提升了信息的可读性，也使得学生能更高效地浏览和管理可选课程。