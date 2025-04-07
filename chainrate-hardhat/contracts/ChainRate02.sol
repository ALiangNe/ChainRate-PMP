// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ChainRate.sol";

/**
 * @title ChainRate02
 * @dev 链评系统扩展合约，专注于教师多维度评价功能
 * 
 * 主要功能：
 * 1. 多维度教师评价：学生可以对教师进行多个维度的评分和评价
 * 2. 教师评价查询：统计和展示教师评价数据
 * 3. 与主合约ChainRate的关联集成
 * 
 * 评价维度包括：
 * - 教学能力: 讲课清晰度、知识掌握程度等
 * - 教学态度: 认真负责、关注学生
 * - 教学方法: 教学手段多样性、互动性
 * - 学术水平: 学术研究能力、前沿知识掌握
 * - 指导能力: 指导学生解决问题的能力
 */
contract ChainRate02 {
    // 主合约引用
    ChainRate public mainContract;
    
    // 教师评价维度
    enum TeacherEvaluationDimension {
        TeachingAbility,    // 教学能力
        TeachingAttitude,   // 教学态度
        TeachingMethod,     // 教学方法
        AcademicLevel,      // 学术水平
        GuidanceAbility     // 指导能力
    }
    
    /**
     * @dev 教师评价数据结构
     * @param id 评价唯一标识符
     * @param student 学生地址
     * @param teacher 教师地址
     * @param timestamp 评价时间戳
     * @param contentHash 评价内容哈希值
     * @param imageHashes 评价图片哈希数组
     * @param isAnonymous 是否匿名评价
     * @param overallRating 总体评分(1-5)
     * @param teachingAbilityRating 教学能力评分(1-5)
     * @param teachingAttitudeRating 教学态度评分(1-5)
     * @param teachingMethodRating 教学方法评分(1-5)
     * @param academicLevelRating 学术水平评分(1-5)
     * @param guidanceAbilityRating 指导能力评分(1-5)
     * @param isActive 评价是否有效
     */
    struct TeacherEvaluation {
        uint256 id;
        address student;
        address teacher;
        uint256 timestamp;
        string contentHash;
        string[] imageHashes;
        bool isAnonymous;
        uint8 overallRating;
        uint8 teachingAbilityRating;
        uint8 teachingAttitudeRating;
        uint8 teachingMethodRating;
        uint8 academicLevelRating;
        uint8 guidanceAbilityRating;
        bool isActive;
    }
    
    // 状态变量
    address public owner;  // 合约部署者地址
    mapping(uint256 => TeacherEvaluation) public teacherEvaluations;  // 评价ID到评价信息的映射
    mapping(address => mapping(address => bool)) public hasEvaluatedTeacher;  // 记录学生是否已评价教师
    mapping(address => uint256[]) public studentTeacherEvaluations;  // 学生地址到其教师评价ID列表的映射
    mapping(address => uint256[]) public teacherEvaluationsList;  // 教师地址到其被评价ID列表的映射
    
    uint256 public teacherEvaluationCount;  // 教师评价总数
    
    // 事件定义
    event TeacherEvaluationSubmitted(uint256 indexed evaluationId, address indexed student, address indexed teacher);  // 教师评价提交事件
    event TeacherEvaluationUpdated(uint256 indexed evaluationId, address indexed student);  // 教师评价更新事件
    
    // 修饰符
    /**
     * @dev 仅合约所有者可调用
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "ChainRate02: caller is not the owner");
        _;
    }
    
    /**
     * @dev 仅学生可调用
     */
    modifier onlyStudent() {
        require(address(mainContract) != address(0), "ChainRate02: main contract not set");
        (, , , , , , , bytes32 role, bool isRegistered) = mainContract.getUserInfo(msg.sender);
        bytes32 STUDENT_ROLE = keccak256("STUDENT_ROLE");
        require(isRegistered && role == STUDENT_ROLE, "ChainRate02: caller is not student");
        _;
    }
    
    /**
     * @dev 确保评价存在
     */
    modifier evaluationExists(uint256 evaluationId) {
        require(teacherEvaluations[evaluationId].id == evaluationId, "ChainRate02: evaluation does not exist");
        _;
    }
    
    /**
     * @dev 确保学生已修过该教师的课程
     */
    modifier hasStudiedWithTeacher(address teacherAddress) {
        require(address(mainContract) != address(0), "ChainRate02: main contract not set");
        
        // 检查学生是否已修过该教师的课程
        bool hasStudied = false;
        uint256[] memory studentCourses = mainContract.getStudentCourses(msg.sender);
        
        for (uint256 i = 0; i < studentCourses.length; i++) {
            uint256 courseId = studentCourses[i];
            (uint256 id, address teacher, , , , , ) = mainContract.courses(courseId);
            if (id == courseId && teacher == teacherAddress) {
                hasStudied = true;
                break;
            }
        }
        
        require(hasStudied, "ChainRate02: student has not studied with this teacher");
        _;
    }
    
    /**
     * @dev 构造函数，设置合约所有者
     */
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev 设置主合约地址
     * @param _mainContract 主合约地址
     */
    function setMainContract(address _mainContract) external onlyOwner {
        require(_mainContract != address(0), "ChainRate02: invalid main contract address");
        mainContract = ChainRate(_mainContract);
    }
    
    /**
     * @dev 提交教师评价
     * @param teacherAddress 教师地址
     * @param contentHash 评价内容哈希值
     * @param imageHashes 评价图片哈希数组
     * @param overallRating 总体评分(1-5)
     * @param teachingAbilityRating 教学能力评分(1-5)
     * @param teachingAttitudeRating 教学态度评分(1-5)
     * @param teachingMethodRating 教学方法评分(1-5)
     * @param academicLevelRating 学术水平评分(1-5)
     * @param guidanceAbilityRating 指导能力评分(1-5)
     * @param isAnonymous 是否匿名评价
     * @return 新创建的评价ID
     */
    function submitTeacherEvaluation(
        address teacherAddress,
        string memory contentHash,
        string[] memory imageHashes,
        uint8 overallRating,
        uint8 teachingAbilityRating,
        uint8 teachingAttitudeRating,
        uint8 teachingMethodRating,
        uint8 academicLevelRating,
        uint8 guidanceAbilityRating,
        bool isAnonymous
    ) external onlyStudent hasStudiedWithTeacher(teacherAddress) returns (uint256) {
        // 检查教师是否存在
        (, , , , , , , bytes32 role, bool isRegistered) = mainContract.getUserInfo(teacherAddress);
        bytes32 TEACHER_ROLE = keccak256("TEACHER_ROLE");
        require(isRegistered && role == TEACHER_ROLE, "ChainRate02: invalid teacher address");
        
        // 检查学生是否已经评价过该教师
        require(!hasEvaluatedTeacher[msg.sender][teacherAddress], "ChainRate02: already evaluated this teacher");
        
        // 检查评分范围
        require(overallRating >= 1 && overallRating <= 5, "ChainRate02: invalid rating");
        require(teachingAbilityRating >= 1 && teachingAbilityRating <= 5, "ChainRate02: invalid teaching ability rating");
        require(teachingAttitudeRating >= 1 && teachingAttitudeRating <= 5, "ChainRate02: invalid teaching attitude rating");
        require(teachingMethodRating >= 1 && teachingMethodRating <= 5, "ChainRate02: invalid teaching method rating");
        require(academicLevelRating >= 1 && academicLevelRating <= 5, "ChainRate02: invalid academic level rating");
        require(guidanceAbilityRating >= 1 && guidanceAbilityRating <= 5, "ChainRate02: invalid guidance ability rating");
        
        uint256 evaluationId = teacherEvaluationCount++;
        teacherEvaluations[evaluationId] = TeacherEvaluation({
            id: evaluationId,
            student: msg.sender,
            teacher: teacherAddress,
            timestamp: block.timestamp,
            contentHash: contentHash,
            imageHashes: imageHashes,
            isAnonymous: isAnonymous,
            overallRating: overallRating,
            teachingAbilityRating: teachingAbilityRating,
            teachingAttitudeRating: teachingAttitudeRating,
            teachingMethodRating: teachingMethodRating,
            academicLevelRating: academicLevelRating,
            guidanceAbilityRating: guidanceAbilityRating,
            isActive: true
        });
        
        hasEvaluatedTeacher[msg.sender][teacherAddress] = true;
        studentTeacherEvaluations[msg.sender].push(evaluationId);
        teacherEvaluationsList[teacherAddress].push(evaluationId);
        
        emit TeacherEvaluationSubmitted(evaluationId, msg.sender, teacherAddress);
        return evaluationId;
    }
    
    /**
     * @dev 获取教师评价详情
     * @param evaluationId 评价ID
     * @return id 评价ID
     * @return student 学生地址
     * @return teacher 教师地址
     * @return timestamp 评价时间戳
     * @return contentHash 评价内容哈希值
     * @return imageHashes 评价图片哈希数组
     * @return isAnonymous 是否匿名评价
     * @return overallRating 总体评分
     * @return teachingAbilityRating 教学能力评分
     * @return teachingAttitudeRating 教学态度评分
     * @return teachingMethodRating 教学方法评分
     * @return academicLevelRating 学术水平评分
     * @return guidanceAbilityRating 指导能力评分
     * @return isActive 评价是否有效
     */
    function getTeacherEvaluationDetails(uint256 evaluationId) external view evaluationExists(evaluationId) returns (
        uint256 id,
        address student,
        address teacher,
        uint256 timestamp,
        string memory contentHash,
        string[] memory imageHashes,
        bool isAnonymous,
        uint8 overallRating,
        uint8 teachingAbilityRating,
        uint8 teachingAttitudeRating,
        uint8 teachingMethodRating,
        uint8 academicLevelRating,
        uint8 guidanceAbilityRating,
        bool isActive
    ) {
        TeacherEvaluation memory eval = teacherEvaluations[evaluationId];
        return (
            eval.id,
            eval.student,
            eval.teacher,
            eval.timestamp,
            eval.contentHash,
            eval.imageHashes,
            eval.isAnonymous,
            eval.overallRating,
            eval.teachingAbilityRating,
            eval.teachingAttitudeRating,
            eval.teachingMethodRating,
            eval.academicLevelRating,
            eval.guidanceAbilityRating,
            eval.isActive
        );
    }
    
    /**
     * @dev 获取学生提交的所有教师评价ID
     * @param studentAddress 学生地址
     * @return 评价ID数组
     */
    function getStudentTeacherEvaluations(address studentAddress) external view returns (uint256[] memory) {
        return studentTeacherEvaluations[studentAddress];
    }
    
    /**
     * @dev 获取教师收到的所有评价ID
     * @param teacherAddress 教师地址
     * @return 评价ID数组
     */
    function getTeacherEvaluations(address teacherAddress) external view returns (uint256[] memory) {
        return teacherEvaluationsList[teacherAddress];
    }
    
    /**
     * @dev 检查学生是否已评价教师
     * @param studentAddress 学生地址
     * @param teacherAddress 教师地址
     * @return 是否已评价
     */
    function isTeacherEvaluated(address studentAddress, address teacherAddress) external view returns (bool) {
        return hasEvaluatedTeacher[studentAddress][teacherAddress];
    }
    
    /**
     * @dev 计算教师的多维度平均评分
     * @param teacherAddress 教师地址
     * @return totalEvaluations 评价总数
     * @return averageOverallRating 总体平均评分(乘以100以避免浮点数)
     * @return averageTeachingAbilityRating 教学能力平均评分(乘以100)
     * @return averageTeachingAttitudeRating 教学态度平均评分(乘以100)
     * @return averageTeachingMethodRating 教学方法平均评分(乘以100)
     * @return averageAcademicLevelRating 学术水平平均评分(乘以100)
     * @return averageGuidanceAbilityRating 指导能力平均评分(乘以100)
     * @return anonymousCount 匿名评价数量
     */
    function getTeacherAverageRatings(address teacherAddress) external view returns (
        uint256 totalEvaluations,
        uint256 averageOverallRating,
        uint256 averageTeachingAbilityRating,
        uint256 averageTeachingAttitudeRating,
        uint256 averageTeachingMethodRating,
        uint256 averageAcademicLevelRating,
        uint256 averageGuidanceAbilityRating,
        uint256 anonymousCount
    ) {
        uint256[] memory evalIds = teacherEvaluationsList[teacherAddress];
        totalEvaluations = evalIds.length;
        
        if (totalEvaluations == 0) {
            return (0, 0, 0, 0, 0, 0, 0, 0);
        }
        
        uint256 totalOverallRating = 0;
        uint256 totalTeachingAbilityRating = 0;
        uint256 totalTeachingAttitudeRating = 0;
        uint256 totalTeachingMethodRating = 0;
        uint256 totalAcademicLevelRating = 0;
        uint256 totalGuidanceAbilityRating = 0;
        uint256 anonCount = 0;
        
        for (uint256 i = 0; i < evalIds.length; i++) {
            TeacherEvaluation memory eval = teacherEvaluations[evalIds[i]];
            if (eval.isActive) {
                totalOverallRating += eval.overallRating;
                totalTeachingAbilityRating += eval.teachingAbilityRating;
                totalTeachingAttitudeRating += eval.teachingAttitudeRating;
                totalTeachingMethodRating += eval.teachingMethodRating;
                totalAcademicLevelRating += eval.academicLevelRating;
                totalGuidanceAbilityRating += eval.guidanceAbilityRating;
                
                if (eval.isAnonymous) {
                    anonCount++;
                }
            }
        }
        
        // 乘以100避免小数
        averageOverallRating = (totalOverallRating * 100) / totalEvaluations;
        averageTeachingAbilityRating = (totalTeachingAbilityRating * 100) / totalEvaluations;
        averageTeachingAttitudeRating = (totalTeachingAttitudeRating * 100) / totalEvaluations;
        averageTeachingMethodRating = (totalTeachingMethodRating * 100) / totalEvaluations;
        averageAcademicLevelRating = (totalAcademicLevelRating * 100) / totalEvaluations;
        averageGuidanceAbilityRating = (totalGuidanceAbilityRating * 100) / totalEvaluations;
        anonymousCount = anonCount;
    }
    
    /**
     * @dev 批量获取教师评价数据（用于导出）
     * @param teacherAddress 教师地址
     * @param offset 起始位置
     * @param limit 获取数量
     * @return ids 评价ID数组
     * @return studentAddresses 学生地址数组
     * @return names 学生姓名数组（匿名则为"Anonymous"）
     * @return timestamps 时间戳数组
     * @return overallRatings 总体评分数组
     * @return teachingAbilityRatings 教学能力评分数组
     * @return teachingAttitudeRatings 教学态度评分数组
     * @return teachingMethodRatings 教学方法评分数组
     * @return academicLevelRatings 学术水平评分数组
     * @return guidanceAbilityRatings 指导能力评分数组
     * @return isAnonymous 是否匿名数组
     */
    function getTeacherBatchEvaluations(address teacherAddress, uint256 offset, uint256 limit) external view returns (
        uint256[] memory ids,
        address[] memory studentAddresses,
        string[] memory names,
        uint256[] memory timestamps,
        uint8[] memory overallRatings,
        uint8[] memory teachingAbilityRatings,
        uint8[] memory teachingAttitudeRatings,
        uint8[] memory teachingMethodRatings,
        uint8[] memory academicLevelRatings,
        uint8[] memory guidanceAbilityRatings,
        bool[] memory isAnonymous
    ) {
        uint256[] memory allEvalIds = teacherEvaluationsList[teacherAddress];
        uint256 totalEvals = allEvalIds.length;
        
        // 检查边界条件
        if (offset >= totalEvals) {
            return (
                new uint256[](0), 
                new address[](0), 
                new string[](0), 
                new uint256[](0), 
                new uint8[](0),
                new uint8[](0),
                new uint8[](0),
                new uint8[](0),
                new uint8[](0),
                new uint8[](0),
                new bool[](0)
            );
        }
        
        // 计算实际要返回的数量
        uint256 count = totalEvals - offset;
        if (count > limit) {
            count = limit;
        }
        
        // 初始化返回数组
        ids = new uint256[](count);
        studentAddresses = new address[](count);
        names = new string[](count);
        timestamps = new uint256[](count);
        overallRatings = new uint8[](count);
        teachingAbilityRatings = new uint8[](count);
        teachingAttitudeRatings = new uint8[](count);
        teachingMethodRatings = new uint8[](count);
        academicLevelRatings = new uint8[](count);
        guidanceAbilityRatings = new uint8[](count);
        isAnonymous = new bool[](count);
        
        // 填充数据
        for (uint256 i = 0; i < count; i++) {
            uint256 evalId = allEvalIds[offset + i];
            TeacherEvaluation memory eval = teacherEvaluations[evalId];
            
            ids[i] = eval.id;
            studentAddresses[i] = eval.student;
            
            // 获取学生姓名（如果不匿名）
            if (!eval.isAnonymous) {
                (string memory studentName, , , , , , , , ) = mainContract.getUserInfo(eval.student);
                names[i] = studentName;
            } else {
                names[i] = "Anonymous";
            }
            
            timestamps[i] = eval.timestamp;
            overallRatings[i] = eval.overallRating;
            teachingAbilityRatings[i] = eval.teachingAbilityRating;
            teachingAttitudeRatings[i] = eval.teachingAttitudeRating;
            teachingMethodRatings[i] = eval.teachingMethodRating;
            academicLevelRatings[i] = eval.academicLevelRating;
            guidanceAbilityRatings[i] = eval.guidanceAbilityRating;
            isAnonymous[i] = eval.isAnonymous;
        }
    }
    
    /**
     * @dev 获取教师多维度评价统计
     * @param teacherAddress 教师地址
     * @return overallRatingCounts 总体评分分布(1-5分的评价数量)
     * @return teachingAbilityRatingCounts 教学能力评分分布(1-5分的评价数量)
     * @return teachingAttitudeRatingCounts 教学态度评分分布(1-5分的评价数量)
     * @return teachingMethodRatingCounts 教学方法评分分布(1-5分的评价数量)
     * @return academicLevelRatingCounts 学术水平评分分布(1-5分的评价数量)
     * @return guidanceAbilityRatingCounts 指导能力评分分布(1-5分的评价数量)
     */
    function getTeacherRatingDistribution(address teacherAddress) external view returns (
        uint256[5] memory overallRatingCounts,
        uint256[5] memory teachingAbilityRatingCounts,
        uint256[5] memory teachingAttitudeRatingCounts,
        uint256[5] memory teachingMethodRatingCounts,
        uint256[5] memory academicLevelRatingCounts,
        uint256[5] memory guidanceAbilityRatingCounts
    ) {
        uint256[] memory evalIds = teacherEvaluationsList[teacherAddress];
        
        for (uint256 i = 0; i < evalIds.length; i++) {
            TeacherEvaluation memory eval = teacherEvaluations[evalIds[i]];
            if (eval.isActive) {
                overallRatingCounts[eval.overallRating - 1]++;
                teachingAbilityRatingCounts[eval.teachingAbilityRating - 1]++;
                teachingAttitudeRatingCounts[eval.teachingAttitudeRating - 1]++;
                teachingMethodRatingCounts[eval.teachingMethodRating - 1]++;
                academicLevelRatingCounts[eval.academicLevelRating - 1]++;
                guidanceAbilityRatingCounts[eval.guidanceAbilityRating - 1]++;
            }
        }
    }
    
    /**
     * @dev 生成指定教师的评价报告
     * @param teacherAddress 教师地址
     * @return name 教师姓名
     * @return totalEvaluations 评价总数
     * @return averageOverallRating 总体平均评分(乘以100)
     * @return dimensionRatings 各维度平均评分(乘以100)
     * @return strengthDimension 最强维度
     * @return weaknessDimension 最弱维度
     * @return recentEvaluationCount 最近一个月评价数量
     */
    function generateTeacherReport(address teacherAddress) external view returns (
        string memory name,
        uint256 totalEvaluations,
        uint256 averageOverallRating,
        uint256[5] memory dimensionRatings,
        TeacherEvaluationDimension strengthDimension,
        TeacherEvaluationDimension weaknessDimension,
        uint256 recentEvaluationCount
    ) {
        // 获取教师姓名
        (name, , , , , , , , ) = mainContract.getUserInfo(teacherAddress);
        
        uint256[] memory evalIds = teacherEvaluationsList[teacherAddress];
        totalEvaluations = evalIds.length;
        
        if (totalEvaluations == 0) {
            return (
                name,
                0,
                0,
                [uint256(0), 0, 0, 0, 0],
                TeacherEvaluationDimension.TeachingAbility,
                TeacherEvaluationDimension.TeachingAbility,
                0
            );
        }
        
        uint256 totalOverallRating = 0;
        uint256 totalTeachingAbilityRating = 0;
        uint256 totalTeachingAttitudeRating = 0;
        uint256 totalTeachingMethodRating = 0;
        uint256 totalAcademicLevelRating = 0;
        uint256 totalGuidanceAbilityRating = 0;
        uint256 recentCount = 0;
        uint256 oneMonthAgo = block.timestamp - 30 days;
        
        for (uint256 i = 0; i < evalIds.length; i++) {
            TeacherEvaluation memory eval = teacherEvaluations[evalIds[i]];
            if (eval.isActive) {
                totalOverallRating += eval.overallRating;
                totalTeachingAbilityRating += eval.teachingAbilityRating;
                totalTeachingAttitudeRating += eval.teachingAttitudeRating;
                totalTeachingMethodRating += eval.teachingMethodRating;
                totalAcademicLevelRating += eval.academicLevelRating;
                totalGuidanceAbilityRating += eval.guidanceAbilityRating;
                
                // 统计最近一个月的评价数量
                if (eval.timestamp >= oneMonthAgo) {
                    recentCount++;
                }
            }
        }
        
        // 计算平均评分
        averageOverallRating = (totalOverallRating * 100) / totalEvaluations;
        dimensionRatings[0] = (totalTeachingAbilityRating * 100) / totalEvaluations;
        dimensionRatings[1] = (totalTeachingAttitudeRating * 100) / totalEvaluations;
        dimensionRatings[2] = (totalTeachingMethodRating * 100) / totalEvaluations;
        dimensionRatings[3] = (totalAcademicLevelRating * 100) / totalEvaluations;
        dimensionRatings[4] = (totalGuidanceAbilityRating * 100) / totalEvaluations;
        
        // 找出最强和最弱维度
        uint256 maxRating = dimensionRatings[0];
        uint256 minRating = dimensionRatings[0];
        uint256 maxIndex = 0;
        uint256 minIndex = 0;
        
        for (uint256 i = 1; i < 5; i++) {
            if (dimensionRatings[i] > maxRating) {
                maxRating = dimensionRatings[i];
                maxIndex = i;
            }
            if (dimensionRatings[i] < minRating) {
                minRating = dimensionRatings[i];
                minIndex = i;
            }
        }
        
        strengthDimension = TeacherEvaluationDimension(maxIndex);
        weaknessDimension = TeacherEvaluationDimension(minIndex);
        recentEvaluationCount = recentCount;
    }
    
    /**
     * @dev 课程反馈状态枚举
     */
    enum FeedbackStatus {
        Submitted,   // 已提交
        Replied,     // 已回复
        Modified,    // 已修改
        Deleted      // 已删除
    }
    
    /**
     * @dev 课程内容反馈数据结构
     * @param id 反馈唯一标识符
     * @param courseId 课程ID
     * @param student 学生地址
     * @param timestamp 反馈时间戳
     * @param contentHash 反馈文字内容哈希值
     * @param documentHashes 文档哈希数组
     * @param imageHashes 图片哈希数组
     * @param versions 反馈历史版本总数
     * @param status 反馈状态
     */
    struct CourseFeedback {
        uint256 id;
        uint256 courseId;
        address student;
        uint256 timestamp;
        string contentHash;
        string[] documentHashes;
        string[] imageHashes;
        uint256 versions;
        FeedbackStatus status;
    }
    
    /**
     * @dev 反馈版本数据结构
     * @param id 版本标识符
     * @param feedbackId 反馈ID
     * @param timestamp 版本时间戳
     * @param contentHash 内容哈希值
     * @param documentHashes 文档哈希数组
     * @param imageHashes 图片哈希数组
     */
    struct FeedbackVersion {
        uint256 id;
        uint256 feedbackId;
        uint256 timestamp;
        string contentHash;
        string[] documentHashes;
        string[] imageHashes;
    }
    
    /**
     * @dev 教师回复数据结构
     * @param id 回复唯一标识符
     * @param feedbackId 反馈ID
     * @param teacher 教师地址
     * @param timestamp 回复时间戳
     * @param contentHash 回复内容哈希值
     * @param documentHashes 文档哈希数组
     * @param imageHashes 图片哈希数组
     */
    struct TeacherReply {
        uint256 id;
        uint256 feedbackId;
        address teacher;
        uint256 timestamp;
        string contentHash;
        string[] documentHashes;
        string[] imageHashes;
    }
    
    // 新增状态变量
    mapping(uint256 => CourseFeedback) public courseFeedbacks;  // 反馈ID到反馈信息的映射
    mapping(uint256 => mapping(uint256 => FeedbackVersion)) public feedbackVersions;  // 反馈ID和版本ID到版本信息的映射
    mapping(uint256 => TeacherReply) public teacherReplies;  // 反馈ID到教师回复的映射
    
    mapping(address => uint256[]) public studentFeedbacks;  // 学生地址到其反馈ID列表的映射
    mapping(uint256 => uint256[]) public courseFeedbacksList;  // 课程ID到其反馈ID列表的映射
    
    uint256 public feedbackCount;  // 反馈总数
    uint256 public replyCount;  // 回复总数
    
    // 新增事件
    event FeedbackSubmitted(uint256 indexed feedbackId, address indexed student, uint256 indexed courseId);  // 反馈提交事件
    event FeedbackUpdated(uint256 indexed feedbackId, address indexed student, uint256 version);  // 反馈更新事件
    event FeedbackDeleted(uint256 indexed feedbackId, address indexed student);  // 反馈删除事件
    event TeacherReplied(uint256 indexed feedbackId, address indexed teacher);  // 教师回复事件
    
    /**
     * @dev 确保学生已加入课程
     */
    modifier hasJoinedCourse(uint256 courseId) {
        require(address(mainContract) != address(0), "ChainRate02: main contract not set");
        require(mainContract.hasJoinedCourse(courseId, msg.sender), "ChainRate02: student has not joined this course");
        _;
    }
    
    /**
     * @dev 确保反馈存在
     */
    modifier feedbackExists(uint256 feedbackId) {
        require(courseFeedbacks[feedbackId].id == feedbackId, "ChainRate02: feedback does not exist");
        _;
    }
    
    /**
     * @dev 确保反馈状态不是已删除
     */
    modifier feedbackNotDeleted(uint256 feedbackId) {
        require(courseFeedbacks[feedbackId].status != FeedbackStatus.Deleted, "ChainRate02: feedback is deleted");
        _;
    }
    
    /**
     * @dev 确保是反馈的学生
     */
    modifier onlyFeedbackStudent(uint256 feedbackId) {
        require(courseFeedbacks[feedbackId].student == msg.sender, "ChainRate02: caller is not the feedback student");
        _;
    }
    
    /**
     * @dev 确保是课程的教师
     */
    modifier onlyCourseTeacher(uint256 courseId) {
        require(address(mainContract) != address(0), "ChainRate02: main contract not set");
        
        (uint256 id, address teacher, , , , , ) = mainContract.courses(courseId);
        require(id == courseId && teacher == msg.sender, "ChainRate02: caller is not the course teacher");
        _;
    }
    
    /**
     * @dev 提交课程内容反馈
     * @param courseId 课程ID
     * @param contentHash 反馈内容哈希值
     * @param documentHashes 文档哈希数组
     * @param imageHashes 图片哈希数组
     * @return 新创建的反馈ID
     */
    function submitCourseFeedback(
        uint256 courseId,
        string memory contentHash,
        string[] memory documentHashes,
        string[] memory imageHashes
    ) external onlyStudent hasJoinedCourse(courseId) returns (uint256) {
        // 检查课程是否存在
        (uint256 id, , , , , bool isActive, ) = mainContract.courses(courseId);
        require(id == courseId && isActive, "ChainRate02: course does not exist or is inactive");
        
        uint256 feedbackId = feedbackCount++;
        courseFeedbacks[feedbackId] = CourseFeedback({
            id: feedbackId,
            courseId: courseId,
            student: msg.sender,
            timestamp: block.timestamp,
            contentHash: contentHash,
            documentHashes: documentHashes,
            imageHashes: imageHashes,
            versions: 1,
            status: FeedbackStatus.Submitted
        });
        
        // 存储初始版本
        feedbackVersions[feedbackId][0] = FeedbackVersion({
            id: 0,
            feedbackId: feedbackId,
            timestamp: block.timestamp,
            contentHash: contentHash,
            documentHashes: documentHashes,
            imageHashes: imageHashes
        });
        
        studentFeedbacks[msg.sender].push(feedbackId);
        courseFeedbacksList[courseId].push(feedbackId);
        
        emit FeedbackSubmitted(feedbackId, msg.sender, courseId);
        return feedbackId;
    }
    
    /**
     * @dev 修改课程内容反馈
     * @param feedbackId 反馈ID
     * @param contentHash 新的反馈内容哈希值
     * @param documentHashes 新的文档哈希数组
     * @param imageHashes 新的图片哈希数组
     * @return 新的版本号
     */
    function updateCourseFeedback(
        uint256 feedbackId,
        string memory contentHash,
        string[] memory documentHashes,
        string[] memory imageHashes
    ) external onlyStudent feedbackExists(feedbackId) feedbackNotDeleted(feedbackId) onlyFeedbackStudent(feedbackId) returns (uint256) {
        CourseFeedback storage feedback = courseFeedbacks[feedbackId];
        
        // 创建新版本
        uint256 newVersion = feedback.versions;
        feedbackVersions[feedbackId][newVersion] = FeedbackVersion({
            id: newVersion,
            feedbackId: feedbackId,
            timestamp: block.timestamp,
            contentHash: contentHash,
            documentHashes: documentHashes,
            imageHashes: imageHashes
        });
        
        // 更新反馈内容
        feedback.contentHash = contentHash;
        feedback.documentHashes = documentHashes;
        feedback.imageHashes = imageHashes;
        feedback.timestamp = block.timestamp;
        feedback.versions++;
        feedback.status = FeedbackStatus.Modified;
        
        emit FeedbackUpdated(feedbackId, msg.sender, newVersion);
        return newVersion;
    }
    
    /**
     * @dev 删除课程内容反馈
     * @param feedbackId 反馈ID
     */
    function deleteCourseFeedback(
        uint256 feedbackId
    ) external onlyStudent feedbackExists(feedbackId) feedbackNotDeleted(feedbackId) onlyFeedbackStudent(feedbackId) {
        CourseFeedback storage feedback = courseFeedbacks[feedbackId];
        feedback.status = FeedbackStatus.Deleted;
        
        emit FeedbackDeleted(feedbackId, msg.sender);
    }
    
    /**
     * @dev 教师回复课程反馈
     * @param feedbackId 反馈ID
     * @param contentHash 回复内容哈希值
     * @param documentHashes 文档哈希数组
     * @param imageHashes 图片哈希数组
     * @return replyId 回复ID
     */
    function replyToFeedback(
        uint256 feedbackId,
        string memory contentHash,
        string[] memory documentHashes,
        string[] memory imageHashes
    ) external feedbackExists(feedbackId) feedbackNotDeleted(feedbackId) returns (uint256) {
        CourseFeedback storage feedback = courseFeedbacks[feedbackId];
        
        // 检查是否为课程教师
        (uint256 id, address teacher, , , , , ) = mainContract.courses(feedback.courseId);
        require(id == feedback.courseId && teacher == msg.sender, "ChainRate02: caller is not the course teacher");
        
        uint256 replyId = replyCount++;
        teacherReplies[feedbackId] = TeacherReply({
            id: replyId,
            feedbackId: feedbackId,
            teacher: msg.sender,
            timestamp: block.timestamp,
            contentHash: contentHash,
            documentHashes: documentHashes,
            imageHashes: imageHashes
        });
        
        // 更新反馈状态
        feedback.status = FeedbackStatus.Replied;
        
        emit TeacherReplied(feedbackId, msg.sender);
        return replyId;
    }
    
    /**
     * @dev 获取课程反馈详情
     * @param feedbackId 反馈ID
     * @return id 反馈ID
     * @return courseId 课程ID
     * @return student 学生地址
     * @return timestamp 反馈时间戳
     * @return contentHash 反馈内容哈希值
     * @return documentHashes 文档哈希数组
     * @return imageHashes 图片哈希数组
     * @return versions 版本数量
     * @return status 反馈状态
     */
    function getCourseFeedbackDetails(uint256 feedbackId) external view feedbackExists(feedbackId) returns (
        uint256 id,
        uint256 courseId,
        address student,
        uint256 timestamp,
        string memory contentHash,
        string[] memory documentHashes,
        string[] memory imageHashes,
        uint256 versions,
        FeedbackStatus status
    ) {
        CourseFeedback memory feedback = courseFeedbacks[feedbackId];
        return (
            feedback.id,
            feedback.courseId,
            feedback.student,
            feedback.timestamp,
            feedback.contentHash,
            feedback.documentHashes,
            feedback.imageHashes,
            feedback.versions,
            feedback.status
        );
    }
    
    /**
     * @dev 获取反馈历史版本
     * @param feedbackId 反馈ID
     * @param versionId 版本ID
     * @return id 版本ID
     * @return fbId 反馈ID
     * @return timestamp 版本时间戳
     * @return contentHash 内容哈希值
     * @return documentHashes 文档哈希数组
     * @return imageHashes 图片哈希数组
     */
    function getFeedbackVersion(uint256 feedbackId, uint256 versionId) external view feedbackExists(feedbackId) returns (
        uint256 id,
        uint256 fbId,
        uint256 timestamp,
        string memory contentHash,
        string[] memory documentHashes,
        string[] memory imageHashes
    ) {
        require(feedbackVersions[feedbackId][versionId].feedbackId == feedbackId, "ChainRate02: version does not exist");
        
        FeedbackVersion memory version = feedbackVersions[feedbackId][versionId];
        return (
            version.id,
            version.feedbackId,
            version.timestamp,
            version.contentHash,
            version.documentHashes,
            version.imageHashes
        );
    }
    
    /**
     * @dev 获取教师回复详情
     * @param feedbackId 反馈ID
     * @return id 回复ID
     * @return fbId 反馈ID
     * @return teacher 教师地址
     * @return timestamp 回复时间戳
     * @return contentHash 回复内容哈希值
     * @return documentHashes 文档哈希数组
     * @return imageHashes 图片哈希数组
     */
    function getTeacherReplyDetails(uint256 feedbackId) external view feedbackExists(feedbackId) returns (
        uint256 id,
        uint256 fbId,
        address teacher,
        uint256 timestamp,
        string memory contentHash,
        string[] memory documentHashes,
        string[] memory imageHashes
    ) {
        require(teacherReplies[feedbackId].feedbackId == feedbackId, "ChainRate02: reply does not exist");
        
        TeacherReply memory reply = teacherReplies[feedbackId];
        return (
            reply.id,
            reply.feedbackId,
            reply.teacher,
            reply.timestamp,
            reply.contentHash,
            reply.documentHashes,
            reply.imageHashes
        );
    }
    
    /**
     * @dev 获取学生提交的所有反馈ID
     * @param studentAddress 学生地址
     * @return 反馈ID数组
     */
    function getStudentFeedbacks(address studentAddress) external view returns (uint256[] memory) {
        return studentFeedbacks[studentAddress];
    }
    
    /**
     * @dev 获取课程的所有反馈ID
     * @param courseId 课程ID
     * @return 反馈ID数组
     */
    function getCourseFeedbacks(uint256 courseId) external view returns (uint256[] memory) {
        return courseFeedbacksList[courseId];
    }
    
    /**
     * @dev 批量获取课程反馈数据（用于导出）
     * @param courseId 课程ID
     * @param offset 起始位置
     * @param limit 获取数量
     * @return ids 反馈ID数组
     * @return studentAddresses 学生地址数组
     * @return studentNames 学生姓名数组
     * @return timestamps 时间戳数组
     * @return contentHashes 内容哈希数组
     * @return statuses 状态数组
     * @return hasReplies 是否有回复数组
     */
    function getBatchCourseFeedbacks(uint256 courseId, uint256 offset, uint256 limit) external view returns (
        uint256[] memory ids,
        address[] memory studentAddresses,
        string[] memory studentNames,
        uint256[] memory timestamps,
        string[] memory contentHashes,
        FeedbackStatus[] memory statuses,
        bool[] memory hasReplies
    ) {
        uint256[] memory allFeedbackIds = courseFeedbacksList[courseId];
        uint256 totalFeedbacks = allFeedbackIds.length;
        
        // 检查边界条件
        if (offset >= totalFeedbacks) {
            return (
                new uint256[](0), 
                new address[](0), 
                new string[](0), 
                new uint256[](0), 
                new string[](0),
                new FeedbackStatus[](0),
                new bool[](0)
            );
        }
        
        // 计算实际要返回的数量
        uint256 count = totalFeedbacks - offset;
        if (count > limit) {
            count = limit;
        }
        
        // 初始化返回数组
        ids = new uint256[](count);
        studentAddresses = new address[](count);
        studentNames = new string[](count);
        timestamps = new uint256[](count);
        contentHashes = new string[](count);
        statuses = new FeedbackStatus[](count);
        hasReplies = new bool[](count);
        
        // 填充数据
        for (uint256 i = 0; i < count; i++) {
            uint256 feedbackId = allFeedbackIds[offset + i];
            CourseFeedback memory feedback = courseFeedbacks[feedbackId];
            
            ids[i] = feedback.id;
            studentAddresses[i] = feedback.student;
            
            // 获取学生姓名
            (string memory studentName, , , , , , , , ) = mainContract.getUserInfo(feedback.student);
            studentNames[i] = studentName;
            
            timestamps[i] = feedback.timestamp;
            contentHashes[i] = feedback.contentHash;
            statuses[i] = feedback.status;
            
            // 检查是否有教师回复
            hasReplies[i] = teacherReplies[feedbackId].feedbackId == feedbackId;
        }
    }
} 