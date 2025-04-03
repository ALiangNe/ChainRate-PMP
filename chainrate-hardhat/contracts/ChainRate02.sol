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
} 