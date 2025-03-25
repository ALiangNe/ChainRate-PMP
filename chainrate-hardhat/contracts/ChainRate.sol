// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainRate
 * @dev 链评系统智能合约，集成用户管理、课程管理和评价管理功能
 */
contract ChainRate {
    // 角色定义
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant TEACHER_ROLE = keccak256("TEACHER_ROLE");
    bytes32 public constant STUDENT_ROLE = keccak256("STUDENT_ROLE");
    
    // 用户数据结构
    struct User {
        string name;
        string phone;
        bytes32 passwordHash;
        bytes32 role;
        bool isRegistered;
    }
    
    // 课程数据结构
    struct Course {
        uint256 id;
        address teacher;
        string name;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
    }
    
    // 评价数据结构
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
    address public owner;
    mapping(address => User) public users;
    mapping(uint256 => Course) public courses;
    mapping(uint256 => Evaluation) public evaluations;
    mapping(address => bool) public admins;
    mapping(address => bool) public teachers;
    mapping(address => bool) public students;
    mapping(uint256 => mapping(address => bool)) public hasEvaluated;
    mapping(address => uint256[]) public studentEvaluations;
    mapping(uint256 => uint256[]) public courseEvaluations;
    
    uint256 public courseCount;
    uint256 public evaluationCount;
    
    // 事件定义
    event UserRegistered(address indexed user, string name, bytes32 role);
    event CourseCreated(uint256 indexed courseId, address indexed teacher, string name);
    event CourseUpdated(uint256 indexed courseId, address indexed teacher);
    event EvaluationSubmitted(uint256 indexed evaluationId, address indexed student, uint256 indexed courseId);
    event EvaluationUpdated(uint256 indexed evaluationId, address indexed student);
    
    // 修饰符
    modifier onlyOwner() {
        require(msg.sender == owner, "ChainRate: caller is not the owner");
        _;
    }
    
    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner, "ChainRate: caller is not admin");
        _;
    }
    
    modifier onlyTeacher() {
        require(teachers[msg.sender] || admins[msg.sender] || msg.sender == owner, "ChainRate: caller is not teacher");
        _;
    }
    
    modifier onlyStudent() {
        require(students[msg.sender] || msg.sender == owner, "ChainRate: caller is not student");
        _;
    }
    
    modifier courseExists(uint256 courseId) {
        require(courses[courseId].id == courseId, "ChainRate: course does not exist");
        _;
    }
    
    modifier evaluationExists(uint256 evaluationId) {
        require(evaluations[evaluationId].id == evaluationId, "ChainRate: evaluation does not exist");
        _;
    }
    
    modifier withinEvaluationPeriod(uint256 courseId) {
        require(
            block.timestamp >= courses[courseId].startTime && 
            block.timestamp <= courses[courseId].endTime,
            "ChainRate: not within evaluation period"
        );
        _;
    }
    
    // 构造函数
    constructor() {
        owner = msg.sender;
        admins[msg.sender] = true;
    }
    
    // 用户管理功能
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
        
        if (role == ADMIN_ROLE) {
            admins[msg.sender] = true;
        } else if (role == TEACHER_ROLE) {
            teachers[msg.sender] = true;
        } else if (role == STUDENT_ROLE) {
            students[msg.sender] = true;
        }
        
        emit UserRegistered(msg.sender, name, role);
    }
    
    function verifyPassword(bytes32 passwordHash) external view returns (bool) {
        return users[msg.sender].passwordHash == passwordHash;
    }
    
    function getUserInfo(address userAddress) external view returns (
        string memory name,
        string memory phone,
        bytes32 role,
        bool isRegistered
    ) {
        User memory user = users[userAddress];
        return (user.name, user.phone, user.role, user.isRegistered);
    }
    
    // 课程管理功能
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
    
    // 评价管理功能
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
    
    function getCourseEvaluations(uint256 courseId) external view courseExists(courseId) returns (uint256[] memory) {
        return courseEvaluations[courseId];
    }
    
    function getStudentEvaluations(address studentAddress) external view returns (uint256[] memory) {
        return studentEvaluations[studentAddress];
    }
    
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