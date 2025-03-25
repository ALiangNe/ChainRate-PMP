// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainRate
 * @dev 链评系统智能合约，集成用户管理、课程管理和评价管理功能
 * 
 * 主要功能：
 * 1. 用户管理：注册、登录、角色管理
 * 2. 课程管理：创建、更新课程信息
 * 3. 评价管理：提交、查看课程评价
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
     */
    struct Course {
        uint256 id;
        address teacher;
        string name;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
    }
    
    /**
     * @dev 评价数据结构
     * @param id 评价唯一标识符
     * @param student 学生地址
     * @param courseId 课程ID
     * @param timestamp 评价时间戳
     * @param contentHash 评价内容哈希值
     * @param isAnonymous 是否匿名评价
     * @param rating 评分(1-5)
     * @param isActive 评价是否有效
     */
    struct Evaluation {
        uint256 id;
        address student;
        uint256 courseId;
        uint256 timestamp;
        string contentHash;
        bool isAnonymous;
        uint8 rating;
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
    
    uint256 public courseCount;  // 课程总数
    uint256 public evaluationCount;  // 评价总数
    
    // 事件定义
    event UserRegistered(address indexed user, string name, bytes32 role);  // 用户注册事件
    event CourseCreated(uint256 indexed courseId, address indexed teacher, string name);  // 课程创建事件
    event CourseUpdated(uint256 indexed courseId, address indexed teacher);  // 课程更新事件
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
            isActive: true
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
     * @dev 提交课程评价
     * @param courseId 课程ID
     * @param contentHash 评价内容哈希值
     * @param rating 评分(1-5)
     * @param isAnonymous 是否匿名评价
     * @return 新创建的评价ID
     */
    function submitEvaluation(
        uint256 courseId,
        string memory contentHash,
        uint8 rating,
        bool isAnonymous
    ) external onlyStudent courseExists(courseId) withinEvaluationPeriod(courseId) returns (uint256) {
        require(!hasEvaluated[courseId][msg.sender], "ChainRate: already evaluated");
        require(rating >= 1 && rating <= 5, "ChainRate: invalid rating");
        
        uint256 evaluationId = evaluationCount++;
        evaluations[evaluationId] = Evaluation({
            id: evaluationId,
            student: msg.sender,
            courseId: courseId,
            timestamp: block.timestamp,
            contentHash: contentHash,
            isAnonymous: isAnonymous,
            rating: rating,
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
     * @return isAnonymous 是否匿名评价
     * @return rating 评分(1-5)
     * @return isActive 评价是否有效
     */
    function getEvaluationDetails(uint256 evaluationId) external view evaluationExists(evaluationId) returns (
        uint256 id,
        address student,
        uint256 courseId,
        uint256 timestamp,
        string memory contentHash,
        bool isAnonymous,
        uint8 rating,
        bool isActive
    ) {
        Evaluation memory eval = evaluations[evaluationId];
        return (
            eval.id,
            eval.student,
            eval.courseId,
            eval.timestamp,
            eval.contentHash,
            eval.isAnonymous,
            eval.rating,
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
} 