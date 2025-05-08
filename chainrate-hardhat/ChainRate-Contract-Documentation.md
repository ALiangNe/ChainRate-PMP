# ChainRate 智能合约文档

## 一、ChainRate 合约

### 结构体 (Structs)

### User
用户数据结构
- `name`: 用户姓名
- `phone`: 用户手机号
- `email`: 用户邮箱
- `college`: 用户所属学院
- `major`: 用户所学专业
- `grade`: 用户年级
- `avatar`: 用户头像URL或哈希
- `passwordHash`: 密码哈希值
- `role`: 用户角色哈希值
- `isRegistered`: 是否已注册

### Course
课程数据结构
- `id`: 课程唯一标识符
- `teacher`: 教师地址
- `name`: 课程名称
- `startTime`: 评价开始时间
- `endTime`: 评价结束时间
- `isActive`: 课程是否激活
- `studentCount`: 选修学生数量

### Evaluation
评价数据结构
- `id`: 评价唯一标识符
- `student`: 学生地址
- `courseId`: 课程ID
- `timestamp`: 评价时间戳
- `contentHash`: 评价内容哈希值
- `imageHashes`: 评价图片哈希数组
- `isAnonymous`: 是否匿名评价
- `rating`: 总体评分(1-5)
- `teachingRating`: 教学质量评分(1-5)
- `contentRating`: 内容设计评分(1-5)
- `interactionRating`: 师生互动评分(1-5)
- `isActive`: 评价是否有效

### 映射 (Mappings)

- `users`: 用户地址到用户信息的映射
- `courses`: 课程ID到课程信息的映射
- `evaluations`: 评价ID到评价信息的映射
- `admins`: 管理员地址映射
- `teachers`: 教师地址映射
- `students`: 学生地址映射
- `hasEvaluated`: 记录学生是否已评价课程的映射
- `studentEvaluations`: 学生地址到其评价ID列表的映射
- `courseEvaluations`: 课程ID到其评价ID列表的映射
- `hasJoinedCourse`: 记录学生是否已加入课程的映射
- `studentCourses`: 学生地址到其加入的课程ID列表的映射
- `courseStudents`: 课程ID到其学生地址列表的映射

### 函数 (Functions)

#### 用户管理

- `registerUser`: 注册新用户，设置用户信息和角色
- `verifyPassword`: 验证用户密码
- `getUserInfo`: 获取指定用户的详细信息
- `getAllStudents`: 获取所有学生地址列表
- `getAllTeachers`: 获取所有教师地址列表
- `getAllAdmins`: 获取所有管理员地址列表
- `getStudentsBatch`: 批量获取学生信息
- `getTeachersBatch`: 批量获取教师信息
- `getStudentDetailInfo`: 获取学生的详细信息和统计数据
- `getTeacherDetailInfo`: 获取教师的详细信息和统计数据

#### 课程管理

- `createCourse`: 教师创建新课程
- `updateCourse`: 更新现有课程信息
- `joinCourse`: 学生加入课程
- `leaveCourse`: 学生退出课程
- `getStudentCourses`: 获取学生加入的所有课程
- `getCourseStudents`: 获取课程中的所有学生
- `isStudentJoined`: 检查学生是否已加入课程
- `getAllCourses`: 获取所有课程ID
- `getActiveCourses`: 获取所有激活状态的课程ID

#### 评价管理

- `submitEvaluation`: 提交课程评价
- `getEvaluationDetails`: 获取评价详情
- `getCourseEvaluations`: 获取课程的所有评价ID
- `getStudentEvaluations`: 获取学生的所有评价ID
- `isStudentEvaluated`: 检查学生是否已评价课程
- `getCourseBatchEvaluations`: 批量获取课程评价数据

#### 数据统计

- `getAverageRating`: 计算课程的平均评分
- `getCourseStatistics`: 获取课程统计数据
- `getTeacherDashboard`: 获取教师数据概览
- `getStudentDashboard`: 获取学生数据概览

## 二、ChainRate02 合约

ChainRate02是ChainRate的扩展合约，专注于教师多维度评价功能和课程内容反馈系统。通过引用ChainRate主合约实现功能扩展。

### 结构体 (Structs)

#### TeacherEvaluation
教师评价数据结构
- `id`: 评价唯一标识符
- `student`: 学生地址
- `teacher`: 教师地址
- `timestamp`: 评价时间戳
- `contentHash`: 评价内容哈希值
- `imageHashes`: 评价图片哈希数组
- `isAnonymous`: 是否匿名评价
- `overallRating`: 总体评分(1-5)
- `teachingAbilityRating`: 教学能力评分(1-5)
- `teachingAttitudeRating`: 教学态度评分(1-5)
- `teachingMethodRating`: 教学方法评分(1-5)
- `academicLevelRating`: 学术水平评分(1-5)
- `guidanceAbilityRating`: 指导能力评分(1-5)
- `isActive`: 评价是否有效

#### CourseFeedback
课程内容反馈数据结构
- `id`: 反馈唯一标识符
- `courseId`: 课程ID
- `student`: 学生地址
- `timestamp`: 反馈时间戳
- `contentHash`: 反馈文字内容哈希值
- `documentHashes`: 文档哈希数组
- `imageHashes`: 图片哈希数组
- `versions`: 反馈历史版本总数
- `status`: 反馈状态

#### FeedbackVersion
反馈版本数据结构
- `id`: 版本标识符
- `feedbackId`: 反馈ID
- `timestamp`: 版本时间戳
- `contentHash`: 内容哈希值
- `documentHashes`: 文档哈希数组
- `imageHashes`: 图片哈希数组

#### TeacherReply
教师回复数据结构
- `id`: 回复唯一标识符
- `feedbackId`: 反馈ID
- `teacher`: 教师地址
- `timestamp`: 回复时间戳
- `contentHash`: 回复内容哈希值
- `documentHashes`: 文档哈希数组
- `imageHashes`: 图片哈希数组

### 枚举 (Enums)

#### TeacherEvaluationDimension
教师评价维度枚举
- `TeachingAbility`: 教学能力
- `TeachingAttitude`: 教学态度
- `TeachingMethod`: 教学方法
- `AcademicLevel`: 学术水平
- `GuidanceAbility`: 指导能力

#### FeedbackStatus
课程反馈状态枚举
- `Submitted`: 已提交
- `Replied`: 已回复
- `Modified`: 已修改
- `Deleted`: 已删除

### 映射 (Mappings)

- `teacherEvaluations`: 评价ID到教师评价信息的映射
- `hasEvaluatedTeacher`: 记录学生是否已评价教师的映射
- `studentTeacherEvaluations`: 学生地址到其教师评价ID列表的映射
- `teacherEvaluationsList`: 教师地址到其被评价ID列表的映射
- `courseFeedbacks`: 反馈ID到反馈信息的映射
- `feedbackVersions`: 反馈ID和版本ID到版本信息的映射
- `teacherReplies`: 反馈ID到教师回复的映射
- `studentFeedbacks`: 学生地址到其反馈ID列表的映射
- `courseFeedbacksList`: 课程ID到其反馈ID列表的映射

### 函数 (Functions)

#### 合约管理
- `setMainContract`: 设置主合约地址，建立与ChainRate合约的关联

#### 教师评价管理
- `submitTeacherEvaluation`: 提交教师多维度评价
- `getTeacherEvaluationDetails`: 获取教师评价详情
- `getStudentTeacherEvaluations`: 获取学生提交的所有教师评价ID
- `getTeacherEvaluations`: 获取教师收到的所有评价ID
- `isTeacherEvaluated`: 检查学生是否已评价教师
- `getTeacherAverageRatings`: 计算教师的多维度平均评分
- `getTeacherBatchEvaluations`: 批量获取教师评价数据
- `getTeacherRatingDistribution`: 获取教师多维度评价统计
- `generateTeacherReport`: 生成指定教师的评价报告

#### 课程反馈系统
- `submitCourseFeedback`: 提交课程内容反馈
- `updateCourseFeedback`: 修改课程内容反馈
- `deleteCourseFeedback`: 删除课程内容反馈
- `replyToFeedback`: 教师回复课程反馈
- `getCourseFeedbackDetails`: 获取课程反馈详情
- `getFeedbackVersion`: 获取反馈历史版本
- `getTeacherReplyDetails`: 获取教师回复详情
- `getStudentFeedbacks`: 获取学生提交的所有反馈ID
- `getCourseFeedbacks`: 获取课程的所有反馈ID
- `getBatchCourseFeedbacks`: 批量获取课程反馈数据

## 三、合约间关联方式

ChainRate02通过以下方式与ChainRate合约关联：

1. **导入主合约**：使用`import "./ChainRate.sol"`导入主合约
2. **引用主合约**：通过`ChainRate public mainContract`状态变量引用主合约
3. **设置主合约地址**：提供`setMainContract`函数在部署后建立两合约的实际连接
4. **调用主合约函数**：通过`mainContract`变量调用ChainRate的公开函数
5. **权限校验**：使用主合约存储的用户信息进行角色校验

这种关联方式使ChainRate02能够在保持ChainRate核心功能完整的同时，扩展更多专业评价功能，实现模块化开发和部署。