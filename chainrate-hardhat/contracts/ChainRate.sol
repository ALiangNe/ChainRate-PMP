// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainRate
 * @dev 链评系统智能合约，集成用户管理、课程管理和评价管理功能
 * 
 * 主要功能：
 * 1. 用户管理：注册、登录、角色管理
 * 2. 课程管理：创建、更新课程信息
 * 3. 课程选修：学生加入课程
 * 4. 评价管理：提交、查看课程评价
 * 
 * 角色说明：
 * - ADMIN_ROLE: 管理员，具有最高权限
 * - TEACHER_ROLE: 教师，可以管理课程
 * - STUDENT_ROLE: 学生，可以提交评价
 */
contract ChainRate {
    // 角色定义 - 使用keccak256哈希确保角色标识的唯一性
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant TEACHER_ROLE = keccak256("TEACHER_ROLE");
    bytes32 public constant STUDENT_ROLE = keccak256("STUDENT_ROLE");
    
    /**
     * @dev 用户数据结构
     * @param name 用户姓名
     * @param phone 用户手机号
     * @param passwordHash 密码哈希值
     * @param role 用户角色哈希值
     * @param isRegistered 是否已注册
     */
    struct User {
        string name;
        string phone;
        bytes32 passwordHash;
        bytes32 role;
        bool isRegistered;
    }
    
    /**
     * @dev 课程数据结构
     * @param id 课程唯一标识符
     * @param teacher 教师地址
     * @param name 课程名称
     * @param startTime 评价开始时间
     * @param endTime 评价结束时间
     * @param isActive 课程是否激活
     * @param studentCount 选修学生数量
     */
    struct Course {
        uint256 id;
        address teacher;
        string name;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 studentCount;
    }
    
    /**
     * @dev 评价数据结构
     * @param id 评价唯一标识符
     * @param student 学生地址
     * @param courseId 课程ID
     * @param timestamp 评价时间戳
     * @param contentHash 评价内容哈希值
     * @param imageHashes 评价图片哈希数组
     * @param isAnonymous 是否匿名评价
     * @param rating 总体评分(1-5)
     * @param teachingRating 教学质量评分(1-5)
     * @param contentRating 内容设计评分(1-5)
     * @param interactionRating 师生互动评分(1-5)
     * @param isActive 评价是否有效
     */
    struct Evaluation {
        uint256 id;
        address student;
        uint256 courseId;
        uint256 timestamp;
        string contentHash;
        string[] imageHashes;
        bool isAnonymous;
        uint8 rating;
        uint8 teachingRating;
        uint8 contentRating; 
        uint8 interactionRating;
        bool isActive;
    }
    
    // 状态变量
    address public owner;  // 合约部署者地址
    mapping(address => User) public users;  // 用户地址到用户信息的映射
    mapping(uint256 => Course) public courses;  // 课程ID到课程信息的映射
    mapping(uint256 => Evaluation) public evaluations;  // 评价ID到评价信息的映射
    mapping(address => bool) public admins;  // 管理员地址映射
    mapping(address => bool) public teachers;  // 教师地址映射
    mapping(address => bool) public students;  // 学生地址映射
    mapping(uint256 => mapping(address => bool)) public hasEvaluated;  // 记录学生是否已评价课程
    mapping(address => uint256[]) public studentEvaluations;  // 学生地址到其评价ID列表的映射
    mapping(uint256 => uint256[]) public courseEvaluations;  // 课程ID到其评价ID列表的映射
    
    // 新增映射：记录学生是否已加入课程
    mapping(uint256 => mapping(address => bool)) public hasJoinedCourse;  // 记录学生是否已加入课程
    // 新增映射：记录学生加入的课程ID列表
    mapping(address => uint256[]) public studentCourses;  // 学生地址到其加入的课程ID列表的映射
    // 新增映射：记录课程中的学生地址列表
    mapping(uint256 => address[]) public courseStudents;  // 课程ID到其学生地址列表的映射
    
    uint256 public courseCount;  // 课程总数
    uint256 public evaluationCount;  // 评价总数
    
    // 事件定义
    event UserRegistered(address indexed user, string name, bytes32 role);  // 用户注册事件
    event CourseCreated(uint256 indexed courseId, address indexed teacher, string name);  // 课程创建事件
    event CourseUpdated(uint256 indexed courseId, address indexed teacher);  // 课程更新事件
    event CourseJoined(uint256 indexed courseId, address indexed student);  // 学生加入课程事件
    event CourseLeft(uint256 indexed courseId, address indexed student);  // 学生退出课程事件
    event EvaluationSubmitted(uint256 indexed evaluationId, address indexed student, uint256 indexed courseId);  // 评价提交事件
    event EvaluationUpdated(uint256 indexed evaluationId, address indexed student);  // 评价更新事件
    
    // 修饰符
    /**
     * @dev 仅合约所有者可调用
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "ChainRate: caller is not the owner");
        _;
    }
    
    /**
     * @dev 仅管理员可调用
     */
    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "ChainRate: caller is not admin");
        _;
    }
    
    /**
     * @dev 仅教师可调用
     */
    modifier onlyTeacher() {
        require(teachers[msg.sender] || admins[msg.sender] || msg.sender == owner, "ChainRate: caller is not teacher");
        _;
    }
    
    /**
     * @dev 仅学生可调用
     */
    modifier onlyStudent() {
        require(students[msg.sender] || msg.sender == owner, "ChainRate: caller is not student");
        _;
    }
    
    /**
     * @dev 确保课程存在
     */
    modifier courseExists(uint256 courseId) {
        require(courses[courseId].id == courseId, "ChainRate: course does not exist");
        _;
    }
    
    /**
     * @dev 确保评价存在
     */
    modifier evaluationExists(uint256 evaluationId) {
        require(evaluations[evaluationId].id == evaluationId, "ChainRate: evaluation does not exist");
        _;
    }
    
    /**
     * @dev 确保在评价期间内
     */
    modifier withinEvaluationPeriod(uint256 courseId) {
        require(
            block.timestamp >= courses[courseId].startTime && 
            block.timestamp <= courses[courseId].endTime,
            "ChainRate: not within evaluation period"
        );
        _;
    }
    
    /**
     * @dev 确保学生已加入课程
     */
    modifier hasJoined(uint256 courseId) {
        require(hasJoinedCourse[courseId][msg.sender], "ChainRate: student has not joined the course");
        _;
    }
    
    /**
     * @dev 构造函数，设置合约所有者和初始管理员
     */
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }
    
    /**
     * @dev 用户注册函数
     * @param name 用户姓名
     * @param phone 用户手机号
     * @param passwordHash 密码哈希值
     * @param role 用户角色哈希值
     */
    function registerUser(
        string memory name,
        string memory phone,
        bytes32 passwordHash,
        bytes32 role
    ) external {
        require(!users[msg.sender].isRegistered, "ChainRate: user already registered");
        
        users[msg.sender] = User({
            name: name,
            phone: phone,
            passwordHash: passwordHash,
            role: role,
            isRegistered: true
        });
        
        // 根据角色设置相应的权限
        if (role == ADMIN_ROLE) {
            admins[msg.sender] = true;
        } else if (role == TEACHER_ROLE) {
            teachers[msg.sender] = true;
        } else if (role == STUDENT_ROLE) {
            students[msg.sender] = true;
        }
        
        emit UserRegistered(msg.sender, name, role);
    }
    
    /**
     * @dev 验证用户密码
     * @param passwordHash 待验证的密码哈希值
     * @return 密码是否正确
     */
    function verifyPassword(bytes32 passwordHash) external view returns (bool) {
        return users[msg.sender].passwordHash == passwordHash;
    }
    
    /**
     * @dev 获取用户信息
     * @param userAddress 用户地址
     * @return name 用户姓名
     * @return phone 用户手机号
     * @return role 用户角色
     * @return isRegistered 是否已注册
     */
    function getUserInfo(address userAddress) external view returns (
        string memory name,
        string memory phone,
        bytes32 role,
        bool isRegistered
    ) {
        User memory user = users[userAddress];
        return (user.name, user.phone, user.role, user.isRegistered);
    }
    
    /**
     * @dev 创建新课程
     * @param name 课程名称
     * @param startTime 评价开始时间
     * @param endTime 评价结束时间
     * @return 新创建的课程ID
     */
    function createCourse(
        string memory name,
        uint256 startTime,
        uint256 endTime
    ) external onlyTeacher returns (uint256) {
        require(startTime < endTime, "ChainRate: invalid time period");
        
        uint256 courseId = courseCount++;
        courses[courseId] = Course({
            id: courseId,
            teacher: msg.sender,
            name: name,
            startTime: startTime,
            endTime: endTime,
            isActive: true,
            studentCount: 0
        });
        
        emit CourseCreated(courseId, msg.sender, name);
        return courseId;
    }
    
    /**
     * @dev 更新课程信息
     * @param courseId 课程ID
     * @param name 新课程名称
     * @param startTime 新评价开始时间
     * @param endTime 新评价结束时间
     * @param isActive 课程是否激活
     */
    function updateCourse(
        uint256 courseId,
        string memory name,
        uint256 startTime,
        uint256 endTime,
        bool isActive
    ) external courseExists(courseId) onlyTeacher {
        Course storage course = courses[courseId];
        require(course.teacher == msg.sender || admins[msg.sender] || msg.sender == owner, "ChainRate: not authorized");
        
        course.name = name;
        course.startTime = startTime;
        course.endTime = endTime;
        course.isActive = isActive;
        
        emit CourseUpdated(courseId, msg.sender);
    }
    
    /**
     * @dev 学生加入课程
     * @param courseId 课程ID
     */
    function joinCourse(uint256 courseId) external courseExists(courseId) onlyStudent {
        require(courses[courseId].isActive, "ChainRate: course is not active");
        require(!hasJoinedCourse[courseId][msg.sender], "ChainRate: student has already joined the course");
        
        // 记录学生已加入课程
        hasJoinedCourse[courseId][msg.sender] = true;
        
        // 将课程ID添加到学生的课程列表
        studentCourses[msg.sender].push(courseId);
        
        // 将学生地址添加到课程的学生列表
        courseStudents[courseId].push(msg.sender);
        
        // 更新课程学生数量
        courses[courseId].studentCount++;
        
        emit CourseJoined(courseId, msg.sender);
    }
    
    /**
     * @dev 学生退出课程
     * @param courseId 课程ID
     */
    function leaveCourse(uint256 courseId) external courseExists(courseId) onlyStudent hasJoined(courseId) {
        // 确保学生未对课程进行评价
        require(!hasEvaluated[courseId][msg.sender], "ChainRate: student has already evaluated the course");
        
        // 记录学生已退出课程
        hasJoinedCourse[courseId][msg.sender] = false;
        
        // 更新课程学生数量
        courses[courseId].studentCount--;
        
        emit CourseLeft(courseId, msg.sender);
        
        // 注意：我们不会从studentCourses和courseStudents中删除记录，以保持历史数据的完整性
        // 实际使用时应通过hasJoinedCourse检查学生是否当前加入了课程
    }
    
    /**
     * @dev 获取学生加入的所有课程ID
     * @param studentAddress 学生地址
     * @return 课程ID数组
     */
    function getStudentCourses(address studentAddress) external view returns (uint256[] memory) {
        return studentCourses[studentAddress];
    }
    
    /**
     * @dev 获取课程中的所有学生地址
     * @param courseId 课程ID
     * @return 学生地址数组
     */
    function getCourseStudents(uint256 courseId) external view courseExists(courseId) returns (address[] memory) {
        return courseStudents[courseId];
    }
    
    /**
     * @dev 检查学生是否已加入课程
     * @param courseId 课程ID
     * @param studentAddress 学生地址
     * @return 是否已加入
     */
    function isStudentJoined(uint256 courseId, address studentAddress) external view courseExists(courseId) returns (bool) {
        return hasJoinedCourse[courseId][studentAddress];
    }
    
    /**
     * @dev 提交课程评价
     * @param courseId 课程ID
     * @param contentHash 评价内容哈希值
     * @param imageHashes 评价图片哈希数组
     * @param rating 总体评分(1-5)
     * @param teachingRating 教学质量评分(1-5)
     * @param contentRating 内容设计评分(1-5)
     * @param interactionRating 师生互动评分(1-5)
     * @param isAnonymous 是否匿名评价
     * @return 新创建的评价ID
     */
    function submitEvaluation(
        uint256 courseId,
        string memory contentHash,
        string[] memory imageHashes,
        uint8 rating,
        uint8 teachingRating,
        uint8 contentRating,
        uint8 interactionRating,
        bool isAnonymous
    ) external onlyStudent courseExists(courseId) withinEvaluationPeriod(courseId) hasJoined(courseId) returns (uint256) {
        require(!hasEvaluated[courseId][msg.sender], "ChainRate: already evaluated");
        require(rating >= 1 && rating <= 5, "ChainRate: invalid rating");
        require(teachingRating >= 1 && teachingRating <= 5, "ChainRate: invalid teaching rating");
        require(contentRating >= 1 && contentRating <= 5, "ChainRate: invalid content rating");
        require(interactionRating >= 1 && interactionRating <= 5, "ChainRate: invalid interaction rating");
        
        uint256 evaluationId = evaluationCount++;
        evaluations[evaluationId] = Evaluation({
            id: evaluationId,
            student: msg.sender,
            courseId: courseId,
            timestamp: block.timestamp,
            contentHash: contentHash,
            imageHashes: imageHashes,
            isAnonymous: isAnonymous,
            rating: rating,
            teachingRating: teachingRating,
            contentRating: contentRating,
            interactionRating: interactionRating,
            isActive: true
        });
        
        hasEvaluated[courseId][msg.sender] = true;
        studentEvaluations[msg.sender].push(evaluationId);
        courseEvaluations[courseId].push(evaluationId);
        
        emit EvaluationSubmitted(evaluationId, msg.sender, courseId);
        return evaluationId;
    }
    
    /**
     * @dev 获取评价详情
     * @param evaluationId 评价ID
     * @return id 评价ID
     * @return student 学生地址
     * @return courseId 课程ID
     * @return timestamp 评价时间戳
     * @return contentHash 评价内容哈希值
     * @return imageHashes 评价图片哈希数组
     * @return isAnonymous 是否匿名评价
     * @return rating 总体评分
     * @return teachingRating 教学质量评分
     * @return contentRating 内容设计评分
     * @return interactionRating 师生互动评分
     * @return isActive 评价是否有效
     */
    function getEvaluationDetails(uint256 evaluationId) external view evaluationExists(evaluationId) returns (
        uint256 id,
        address student,
        uint256 courseId,
        uint256 timestamp,
        string memory contentHash,
        string[] memory imageHashes,
        bool isAnonymous,
        uint8 rating,
        uint8 teachingRating,
        uint8 contentRating,
        uint8 interactionRating,
        bool isActive
    ) {
        Evaluation memory eval = evaluations[evaluationId];
        return (
            eval.id,
            eval.student,
            eval.courseId,
            eval.timestamp,
            eval.contentHash,
            eval.imageHashes,
            eval.isAnonymous,
            eval.rating,
            eval.teachingRating,
            eval.contentRating,
            eval.interactionRating,
            eval.isActive
        );
    }
    
    /**
     * @dev 获取课程的所有评价ID
     * @param courseId 课程ID
     * @return 评价ID数组
     */
    function getCourseEvaluations(uint256 courseId) external view courseExists(courseId) returns (uint256[] memory) {
        return courseEvaluations[courseId];
    }
    
    /**
     * @dev 获取学生的所有评价ID
     * @param studentAddress 学生地址
     * @return 评价ID数组
     */
    function getStudentEvaluations(address studentAddress) external view returns (uint256[] memory) {
        return studentEvaluations[studentAddress];
    }
    
    /**
     * @dev 计算课程的平均评分
     * @param courseId 课程ID
     * @return 平均评分(乘以100以避免浮点数)
     */
    function getAverageRating(uint256 courseId) external view courseExists(courseId) returns (uint256) {
        uint256[] memory evalIds = courseEvaluations[courseId];
        if (evalIds.length == 0) return 0;
        
        uint256 totalRating = 0;
        for (uint256 i = 0; i < evalIds.length; i++) {
            totalRating += evaluations[evalIds[i]].rating;
        }
        
        return (totalRating * 100) / evalIds.length;
    }
    
    /**
     * @dev 获取所有课程
     * @return 课程ID数组
     */
    function getAllCourses() external view returns (uint256[] memory) {
        uint256[] memory allCourses = new uint256[](courseCount);
        for (uint256 i = 0; i < courseCount; i++) {
            allCourses[i] = i;
        }
        return allCourses;
    }
    
    /**
     * @dev 获取所有激活状态的课程
     * @return 激活状态的课程ID数组
     */
    function getActiveCourses() external view returns (uint256[] memory) {
        // 首先计算激活状态的课程数量
        uint256 activeCount = 0;
        for (uint256 i = 0; i < courseCount; i++) {
            if (courses[i].isActive) {
                activeCount++;
            }
        }
        
        // 创建适当大小的数组并填充激活状态的课程ID
        uint256[] memory activeCourses = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < courseCount; i++) {
            if (courses[i].isActive) {
                activeCourses[index] = i;
                index++;
            }
        }
        
        return activeCourses;
    }
    
    /**
     * @dev 获取课程统计数据
     * @param courseId 课程ID
     * @return totalEvaluations 评价总数
     * @return averageRating 平均总体评分(乘以100)
     * @return averageTeachingRating 平均教学评分(乘以100)
     * @return averageContentRating 平均内容评分(乘以100)
     * @return averageInteractionRating 平均互动评分(乘以100)
     * @return anonymousCount 匿名评价数量
     * @return completeCount 包含内容的评价数量
     */
    function getCourseStatistics(uint256 courseId) external view courseExists(courseId) returns (
        uint256 totalEvaluations,
        uint256 averageRating,
        uint256 averageTeachingRating,
        uint256 averageContentRating,
        uint256 averageInteractionRating,
        uint256 anonymousCount,
        uint256 completeCount
    ) {
        uint256[] memory evalIds = courseEvaluations[courseId];
        totalEvaluations = evalIds.length;
        
        if (totalEvaluations == 0) {
            return (0, 0, 0, 0, 0, 0, 0);
        }
        
        uint256 totalRating = 0;
        uint256 totalTeachingRating = 0;
        uint256 totalContentRating = 0;
        uint256 totalInteractionRating = 0;
        uint256 anonCount = 0;
        uint256 complete = 0;
        
        for (uint256 i = 0; i < evalIds.length; i++) {
            Evaluation memory eval = evaluations[evalIds[i]];
            totalRating += eval.rating;
            totalTeachingRating += eval.teachingRating;
            totalContentRating += eval.contentRating;
            totalInteractionRating += eval.interactionRating;
            
            if (eval.isAnonymous) {
                anonCount++;
            }
            
            // 判断是否为完整评价（有文字内容）
            if (bytes(eval.contentHash).length > 0) {
                complete++;
            }
        }
        
        // 乘以100避免小数
        averageRating = (totalRating * 100) / totalEvaluations;
        averageTeachingRating = (totalTeachingRating * 100) / totalEvaluations;
        averageContentRating = (totalContentRating * 100) / totalEvaluations;
        averageInteractionRating = (totalInteractionRating * 100) / totalEvaluations;
        anonymousCount = anonCount;
        completeCount = complete;
    }
    
    /**
     * @dev 批量获取课程评价数据（用于导出）
     * @param courseId 课程ID
     * @param offset 起始位置
     * @param limit 获取数量
     * @return ids 评价ID数组
     * @return students 学生地址数组
     * @return names 学生姓名数组（匿名则为"Anonymous"）
     * @return timestamps 时间戳数组
     * @return ratings 总体评分数组
     * @return teachingRatings 教学评分数组
     * @return contentRatings 内容评分数组
     * @return interactionRatings 互动评分数组
     * @return isAnonymous 是否匿名数组
     */
    function getCourseBatchEvaluations(uint256 courseId, uint256 offset, uint256 limit) external view courseExists(courseId) returns (
        uint256[] memory ids,
        address[] memory students,
        string[] memory names,
        uint256[] memory timestamps,
        uint8[] memory ratings,
        uint8[] memory teachingRatings,
        uint8[] memory contentRatings,
        uint8[] memory interactionRatings,
        bool[] memory isAnonymous
    ) {
        uint256[] memory allEvalIds = courseEvaluations[courseId];
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
        students = new address[](count);
        names = new string[](count);
        timestamps = new uint256[](count);
        ratings = new uint8[](count);
        teachingRatings = new uint8[](count);
        contentRatings = new uint8[](count);
        interactionRatings = new uint8[](count);
        isAnonymous = new bool[](count);
        
        // 填充数据
        for (uint256 i = 0; i < count; i++) {
            uint256 evalId = allEvalIds[offset + i];
            Evaluation memory eval = evaluations[evalId];
            
            ids[i] = eval.id;
            students[i] = eval.student;
            
            // 获取学生姓名（如果不匿名）
            if (!eval.isAnonymous) {
                names[i] = users[eval.student].name;
            } else {
                names[i] = "Anonymous";
            }
            
            timestamps[i] = eval.timestamp;
            ratings[i] = eval.rating;
            teachingRatings[i] = eval.teachingRating;
            contentRatings[i] = eval.contentRating;
            interactionRatings[i] = eval.interactionRating;
            isAnonymous[i] = eval.isAnonymous;
        }
    }
    
    /**
     * @dev 获取教师数据概览（用于dashboard）
     * @param teacherAddress 教师地址
     * @return totalCourses 教师创建的课程总数
     * @return totalStudents 选修教师课程的学生总数
     * @return totalEvaluations 教师课程的评价总数
     * @return courseIds 课程ID数组
     * @return courseNames 课程名称数组
     * @return studentCounts 每个课程的学生数量
     * @return evaluationCounts 每个课程的评价数量
     * @return averageRatings 每个课程的平均评分（乘以100）
     */
    function getTeacherDashboard(address teacherAddress) external view returns (
        uint256 totalCourses,
        uint256 totalStudents,
        uint256 totalEvaluations,
        uint256[] memory courseIds,
        string[] memory courseNames,
        uint256[] memory studentCounts,
        uint256[] memory evaluationCounts,
        uint256[] memory averageRatings
    ) {
        // 统计教师创建的课程数量
        uint256 courseCounter = 0;
        for (uint256 i = 0; i < courseCount; i++) {
            if (courses[i].teacher == teacherAddress) {
                courseCounter++;
            }
        }
        
        totalCourses = courseCounter;
        
        // 如果没有课程，返回空数据
        if (courseCounter == 0) {
            return (0, 0, 0, new uint256[](0), new string[](0), new uint256[](0), new uint256[](0), new uint256[](0));
        }
        
        // 初始化返回数组
        courseIds = new uint256[](courseCounter);
        courseNames = new string[](courseCounter);
        studentCounts = new uint256[](courseCounter);
        evaluationCounts = new uint256[](courseCounter);
        averageRatings = new uint256[](courseCounter);
        
        // 填充数据
        uint256 index = 0;
        uint256 studentsTotal = 0;
        uint256 evalsTotal = 0;
        
        for (uint256 i = 0; i < courseCount; i++) {
            if (courses[i].teacher == teacherAddress) {
                Course memory course = courses[i];
                courseIds[index] = i;
                courseNames[index] = course.name;
                studentCounts[index] = course.studentCount;
                
                // 获取评价数量
                uint256[] memory evalIds = courseEvaluations[i];
                evaluationCounts[index] = evalIds.length;
                
                // 计算平均评分
                if (evalIds.length > 0) {
                    uint256 totalRating = 0;
                    for (uint256 j = 0; j < evalIds.length; j++) {
                        totalRating += evaluations[evalIds[j]].rating;
                    }
                    averageRatings[index] = (totalRating * 100) / evalIds.length;
                } else {
                    averageRatings[index] = 0;
                }
                
                // 累加总计
                studentsTotal += course.studentCount;
                evalsTotal += evalIds.length;
                
                index++;
            }
        }
        
        totalStudents = studentsTotal;
        totalEvaluations = evalsTotal;
    }
    
    /**
     * @dev 检查学生是否已评价课程
     * @param courseId 课程ID
     * @param studentAddress 学生地址
     * @return 是否已评价
     */
    function isStudentEvaluated(uint256 courseId, address studentAddress) external view courseExists(courseId) returns (bool) {
        return hasEvaluated[courseId][studentAddress];
    }
} 