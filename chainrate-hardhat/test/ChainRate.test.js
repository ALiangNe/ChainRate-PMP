const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChainRate", function () {
    let chainRate;
    let owner;
    let teacher;
    let student;
    let admin;
    
    // 密码哈希
    const teacherPasswordHash = ethers.keccak256(ethers.toUtf8Bytes("teacher123"));
    const studentPasswordHash = ethers.keccak256(ethers.toUtf8Bytes("student123"));
    const adminPasswordHash = ethers.keccak256(ethers.toUtf8Bytes("admin123"));
    
    beforeEach(async function () {
        // 获取测试账户
        [owner, teacher, student, admin] = await ethers.getSigners();
        
        // 部署合约
        const ChainRate = await ethers.getContractFactory("ChainRate");
        chainRate = await ChainRate.deploy();
        
        // 注册用户
        await chainRate.connect(teacher).registerUser(
            "张老师",
            "13800138000", // 电话号码
            teacherPasswordHash,
            await chainRate.TEACHER_ROLE()
        );
        
        await chainRate.connect(student).registerUser(
            "李同学",
            "13900139000", // 电话号码
            studentPasswordHash,
            await chainRate.STUDENT_ROLE()
        );
        
        await chainRate.connect(admin).registerUser(
            "王管理员",
            "13700137000", // 电话号码
            adminPasswordHash,
            await chainRate.ADMIN_ROLE()
        );
    });
    
    describe("用户管理", function () {
        it("应该正确注册用户", async function () {
            const userInfo = await chainRate.getUserInfo(teacher.address);
            expect(userInfo.name).to.equal("张老师");
            expect(userInfo.phone).to.equal("13800138000");
            expect(userInfo.role).to.equal(await chainRate.TEACHER_ROLE());
            expect(userInfo.isRegistered).to.be.true;
        });
        
        it("应该正确验证密码", async function () {
            expect(await chainRate.connect(teacher).verifyPassword(teacherPasswordHash)).to.be.true;
            expect(await chainRate.connect(teacher).verifyPassword(ethers.keccak256(ethers.toUtf8Bytes("wrong")))).to.be.false;
        });
    });
    
    describe("课程管理", function () {
        it("应该正确创建课程", async function () {
            const currentTime = Math.floor(Date.now() / 1000);
            const startTime = currentTime;
            const endTime = currentTime + 86400; // 24小时后
            
            const tx = await chainRate.connect(teacher).createCourse(
                "计算机科学导论",
                startTime,
                endTime
            );
            
            // 获取返回的课程ID
            const receipt = await tx.wait();
            const courseId = 0; // 第一个创建的课程ID应该是0
            
            const course = await chainRate.courses(courseId);
            expect(course.name).to.equal("计算机科学导论");
            expect(course.teacher).to.equal(teacher.address);
            expect(Number(course.startTime)).to.equal(startTime);
            expect(Number(course.endTime)).to.equal(endTime);
            expect(course.isActive).to.be.true;
        });
        
        it("应该正确更新课程", async function () {
            const currentTime = Math.floor(Date.now() / 1000);
            const startTime = currentTime;
            const endTime = currentTime + 86400;
            
            const tx = await chainRate.connect(teacher).createCourse(
                "计算机科学导论",
                startTime,
                endTime
            );
            
            const receipt = await tx.wait();
            const courseId = 0; // 第一个创建的课程ID应该是0
            
            const newStartTime = startTime + 3600;
            const newEndTime = endTime + 3600;
            
            await chainRate.connect(teacher).updateCourse(
                courseId,
                "计算机科学导论（更新）",
                newStartTime,
                newEndTime,
                true
            );
            
            const course = await chainRate.courses(courseId);
            expect(course.name).to.equal("计算机科学导论（更新）");
            expect(Number(course.startTime)).to.equal(newStartTime);
            expect(Number(course.endTime)).to.equal(newEndTime);
        });
    });
    
    describe("评价管理", function () {
        let courseId;
        
        beforeEach(async function () {
            const currentTime = Math.floor(Date.now() / 1000);
            const startTime = currentTime;
            const endTime = currentTime + 86400;
            
            const tx = await chainRate.connect(teacher).createCourse(
                "计算机科学导论",
                startTime,
                endTime
            );
            
            courseId = 0; // 第一个创建的课程ID应该是0
        });
        
        it("应该正确提交评价", async function () {
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("这是一门很好的课程"));
            const rating = 5;
            
            const tx = await chainRate.connect(student).submitEvaluation(
                courseId,
                contentHash,
                rating,
                false
            );
            
            const receipt = await tx.wait();
            const evaluationId = 0; // 第一个创建的评价ID应该是0
            
            const evaluation = await chainRate.evaluations(evaluationId);
            expect(evaluation.student).to.equal(student.address);
            expect(Number(evaluation.courseId)).to.equal(Number(courseId));
            expect(evaluation.contentHash).to.equal(contentHash);
            expect(evaluation.rating).to.equal(rating);
            expect(evaluation.isAnonymous).to.be.false;
            expect(evaluation.isActive).to.be.true;
        });
        
        it("应该正确计算平均评分", async function () {
            // 我们需要创建3个不同的学生来提交3个不同的评价
            const [, , , , student2, student3] = await ethers.getSigners();
            
            // 注册额外的学生
            await chainRate.connect(student2).registerUser(
                "王同学",
                "13600136000", // 电话号码
                ethers.keccak256(ethers.toUtf8Bytes("student2")),
                await chainRate.STUDENT_ROLE()
            );
            
            await chainRate.connect(student3).registerUser(
                "赵同学",
                "13500135000", // 电话号码
                ethers.keccak256(ethers.toUtf8Bytes("student3")),
                await chainRate.STUDENT_ROLE()
            );
            
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("评价内容"));
            
            // 提交多个评价
            await chainRate.connect(student).submitEvaluation(courseId, contentHash, 5, false);
            await chainRate.connect(student2).submitEvaluation(courseId, contentHash, 4, false);
            await chainRate.connect(student3).submitEvaluation(courseId, contentHash, 3, false);
            
            const averageRating = await chainRate.getAverageRating(courseId);
            expect(Number(averageRating)).to.equal(400); // 乘以100以保留小数点后两位
        });
        
        it("应该正确获取课程评价列表", async function () {
            // 同样需要创建不同的学生
            const [, , , , student2] = await ethers.getSigners();
            
            // 注册额外的学生
            await chainRate.connect(student2).registerUser(
                "王同学",
                "13600136000", // 电话号码
                ethers.keccak256(ethers.toUtf8Bytes("student2")),
                await chainRate.STUDENT_ROLE()
            );
            
            const contentHash = ethers.keccak256(ethers.toUtf8Bytes("评价内容"));
            
            // 提交多个评价
            await chainRate.connect(student).submitEvaluation(courseId, contentHash, 5, false);
            await chainRate.connect(student2).submitEvaluation(courseId, contentHash, 4, false);
            
            const evaluationIds = await chainRate.getCourseEvaluations(courseId);
            expect(evaluationIds.length).to.equal(2);
        });
    });
}); 