'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../../contracts/ChainRate.json';
import ChainRateAddress from '../../../contracts/ChainRate-address.json';
import styles from './page.module.css';

export default function TeacherManageCoursePage({ params }) {
  const router = useRouter();
  const courseId = params.id;
  
  // 用户身份信息
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
  });
  
  // 课程原始数据
  const [originalCourse, setOriginalCourse] = useState(null);
  
  // 编辑表单数据
  const [formData, setFormData] = useState({
    courseName: '',
    startTime: '',
    endTime: '',
    isActive: true
  });
  
  // 学生列表
  const [students, setStudents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // 统计数据
  const [stats, setStats] = useState({
    averageRating: 0,
    evaluationCount: 0,
    studentCount: 0
  });
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    // 检查用户是否已登录并且是教师角色
    const checkUserAuth = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const userRole = localStorage.getItem('userRole');
      
      if (!isLoggedIn || userRole !== 'teacher') {
        router.push('/login');
        return;
      }

      // 获取用户信息
      setUserData({
        isLoggedIn: true,
        address: localStorage.getItem('userAddress') || '',
        name: localStorage.getItem('userName') || '',
        role: userRole
      });
      
      // 初始化Web3连接
      initWeb3();
    };

    const initWeb3 = async () => {
      try {
        // 检查是否有 MetaMask
        if (typeof window.ethereum === 'undefined') {
          setError('请安装 MetaMask 钱包以使用此应用');
          setLoading(false);
          return;
        }
        
        // 请求用户连接钱包
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // 创建 Web3 Provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);
        
        // 获取 Signer
        const signer = await provider.getSigner();
        setSigner(signer);
        
        // 连接到合约
        const chainRateContract = new ethers.Contract(
          ChainRateAddress.address,
          ChainRateABI.abi,
          signer
        );
        setContract(chainRateContract);
        
        // 加载课程详情
        await loadCourseDetails(chainRateContract, await signer.getAddress(), courseId);
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router, courseId]);

  // 加载课程详情
  const loadCourseDetails = async (contractInstance, teacherAddress, courseId) => {
    try {
      // 检查课程是否存在
      try {
        const course = await contractInstance.courses(courseId);
        
        // 检查课程是否由当前教师创建
        if (course.teacher.toLowerCase() !== teacherAddress.toLowerCase()) {
          setError('您无权管理此课程');
          setTimeout(() => {
            router.push('/viewCourses');
          }, 3000);
          return;
        }
        
        // 转换时间戳为日期时间字符串（用于表单输入）
        const startDate = new Date(Number(course.startTime) * 1000);
        const endDate = new Date(Number(course.endTime) * 1000);
        
        // 格式化为HTML datetime-local输入所需的格式: YYYY-MM-DDThh:mm
        const formatDateForInput = (date) => {
          return date.toISOString().slice(0, 16);
        };
        
        // 更新课程信息
        setOriginalCourse({
          id: Number(courseId),
          name: course.name,
          teacher: course.teacher,
          startTime: startDate,
          endTime: endDate,
          isActive: course.isActive,
          studentCount: Number(course.studentCount)
        });
        
        // 更新表单数据
        setFormData({
          courseName: course.name,
          startTime: formatDateForInput(startDate),
          endTime: formatDateForInput(endDate),
          isActive: course.isActive
        });
        
        // 加载课程统计数据
        await loadCourseStats(contractInstance, courseId);
        
        // 加载课程学生
        await loadCourseStudents(contractInstance, courseId);
        
        // 加载课程评价
        await loadCourseEvaluations(contractInstance, courseId);
      } catch (error) {
        console.error(`获取课程 ${courseId} 失败:`, error);
        setError(`课程 ID ${courseId} 不存在或无法访问`);
        setTimeout(() => {
          router.push('/viewCourses');
        }, 3000);
      }
    } catch (err) {
      console.error("加载课程详情失败:", err);
      setError('获取课程详情失败: ' + (err.message || err));
    }
  };
  
  // 加载课程统计数据
  const loadCourseStats = async (contractInstance, courseId) => {
    try {
      // 获取课程平均评分
      const averageRating = await contractInstance.getAverageRating(courseId);
      
      // 获取课程评价列表
      const evaluationIds = await contractInstance.getCourseEvaluations(courseId);
      
      // 更新统计数据
      setStats({
        averageRating: Number(averageRating) / 100, // 转换为小数（因为合约中乘以了100）
        evaluationCount: evaluationIds.length,
        studentCount: Number(originalCourse?.studentCount || 0)
      });
    } catch (err) {
      console.error("加载课程统计数据失败:", err);
    }
  };
  
  // 加载课程学生
  const loadCourseStudents = async (contractInstance, courseId) => {
    setLoadingStudents(true);
    
    try {
      // 获取课程的学生地址列表
      const studentAddresses = await contractInstance.getCourseStudents(courseId);
      
      // 获取学生详情
      const studentsList = [];
      for (let i = 0; i < studentAddresses.length; i++) {
        const studentAddr = studentAddresses[i];
        try {
          // 检查学生是否仍然加入课程（可能已退出）
          const isJoined = await contractInstance.isStudentJoined(courseId, studentAddr);
          
          if (isJoined) {
            // 获取学生信息
            const studentInfo = await contractInstance.getUserInfo(studentAddr);
            
            studentsList.push({
              address: studentAddr,
              name: studentInfo[0], // 学生姓名
              hasEvaluated: await contractInstance.hasEvaluated(courseId, studentAddr)
            });
          }
        } catch (error) {
          console.warn(`获取学生 ${studentAddr} 信息失败:`, error);
        }
      }
      
      setStudents(studentsList);
    } catch (err) {
      console.error("加载课程学生失败:", err);
    } finally {
      setLoadingStudents(false);
    }
  };
  
  // 加载课程评价
  const loadCourseEvaluations = async (contractInstance, courseId) => {
    setLoadingEvaluations(true);
    
    try {
      // 获取课程的评价ID列表
      const evaluationIds = await contractInstance.getCourseEvaluations(courseId);
      
      // 获取评价详情
      const evaluationsList = [];
      for (let i = 0; i < evaluationIds.length; i++) {
        const evalId = evaluationIds[i];
        try {
          const evaluation = await contractInstance.getEvaluationDetails(evalId);
          
          // 获取学生姓名
          let studentName = "未知";
          if (!evaluation.isAnonymous) {
            try {
              const studentInfo = await contractInstance.getUserInfo(evaluation.student);
              studentName = studentInfo[0]; // 学生姓名
            } catch (error) {
              console.warn(`获取学生信息失败: ${error.message}`);
            }
          }
          
          evaluationsList.push({
            id: Number(evaluation.id),
            student: evaluation.student,
            studentName: evaluation.isAnonymous ? "匿名学生" : studentName,
            courseId: Number(evaluation.courseId),
            timestamp: new Date(Number(evaluation.timestamp) * 1000),
            contentHash: evaluation.contentHash, // 在实际应用中，需要从IPFS获取内容
            isAnonymous: evaluation.isAnonymous,
            rating: Number(evaluation.rating),
            isActive: evaluation.isActive
          });
        } catch (error) {
          console.warn(`获取评价 ${evalId} 失败:`, error);
        }
      }
      
      // 按时间降序排序评价（最新的在前）
      evaluationsList.sort((a, b) => b.timestamp - a.timestamp);
      
      setEvaluations(evaluationsList);
    } catch (err) {
      console.error("加载课程评价失败:", err);
    } finally {
      setLoadingEvaluations(false);
    }
  };

  // 处理表单输入变化
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setSubmitting(true);
    
    try {
      // 表单验证
      if (!formData.courseName.trim()) {
        throw new Error('请输入课程名称');
      }
      
      if (!formData.startTime || !formData.endTime) {
        throw new Error('请选择评价开始和结束时间');
      }
      
      // 转换时间为Unix时间戳（秒）
      const startTimestamp = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(formData.endTime).getTime() / 1000);
      
      // 确保开始时间早于结束时间
      if (startTimestamp >= endTimestamp) {
        throw new Error('结束时间必须晚于开始时间');
      }
      
      // 调用合约更新课程
      const tx = await contract.updateCourse(
        courseId,
        formData.courseName,
        startTimestamp,
        endTimestamp,
        formData.isActive
      );
      
      // 等待交易确认
      await tx.wait();
      
      // 更新原始课程数据
      setOriginalCourse(prev => ({
        ...prev,
        name: formData.courseName,
        startTime: new Date(startTimestamp * 1000),
        endTime: new Date(endTimestamp * 1000),
        isActive: formData.isActive
      }));
      
      setSuccessMessage('课程信息已成功更新');
      
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error("更新课程失败:", err);
      
      // 特殊处理用户拒绝的情况
      if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        setError('您取消了交易。如需更新课程，请重新提交并在MetaMask中确认。');
      } else {
        setError('更新课程失败: ' + (err.message || err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 格式化日期时间
  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const goBack = () => {
    router.push('/teacherViewCourse');
  };

  if (loading) {
    return <div className={styles.container}>正在加载课程详情...</div>;
  }

  if (!originalCourse) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>管理课程</h1>
          <button onClick={goBack} className={styles.backButton}>返回课程列表</button>
        </header>
        <main className={styles.main}>
          <div className={styles.errorBox}>
            {error || '无法加载课程详情，课程可能不存在'}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>管理课程</h1>
        <button onClick={goBack} className={styles.backButton}>返回课程列表</button>
      </header>

      <main className={styles.main}>
        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className={styles.successBox}>
            {successMessage}
          </div>
        )}
        
        <div className={styles.courseStatsCard}>
          <h2 className={styles.sectionTitle}>课程概览</h2>
          <div className={styles.statsContainer}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{originalCourse.studentCount}</span>
              <span className={styles.statLabel}>已选学生</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.evaluationCount}</span>
              <span className={styles.statLabel}>评价数量</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '暂无'}
              </span>
              <span className={styles.statLabel}>平均评分</span>
            </div>
            <div className={styles.statItem}>
              <span className={`${styles.statusBadge} ${originalCourse.isActive ? styles.statusActive : styles.statusInactive}`}>
                {originalCourse.isActive ? '已启用' : '已停用'}
              </span>
              <span className={styles.statLabel}>课程状态</span>
            </div>
          </div>
        </div>
        
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>编辑课程信息</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="courseName" className={styles.formLabel}>课程名称</label>
              <input
                type="text"
                id="courseName"
                name="courseName"
                value={formData.courseName}
                onChange={handleInputChange}
                className={styles.formInput}
                required
              />
            </div>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="startTime" className={styles.formLabel}>评价开始时间</label>
                <input
                  type="datetime-local"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  required
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="endTime" className={styles.formLabel}>评价结束时间</label>
                <input
                  type="datetime-local"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className={styles.formInput}
                  required
                />
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formCheckbox}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                />
                启用课程（学生可加入和评价）
              </label>
            </div>
            
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    courseName: originalCourse.name,
                    startTime: new Date(originalCourse.startTime).toISOString().slice(0, 16),
                    endTime: new Date(originalCourse.endTime).toISOString().slice(0, 16),
                    isActive: originalCourse.isActive
                  });
                }}
                className={styles.resetButton}
                disabled={submitting}
              >
                重置
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? '保存中...' : '保存修改'}
              </button>
            </div>
          </form>
        </div>
        
        <div className={styles.tabContainer}>
          <div className={styles.tabSection}>
            <h2 className={styles.sectionTitle}>选课学生 ({students.length})</h2>
            {loadingStudents ? (
              <div className={styles.loadingBox}>正在加载学生信息...</div>
            ) : students.length === 0 ? (
              <div className={styles.emptyBox}>还没有学生选择此课程</div>
            ) : (
              <div className={styles.studentsList}>
                {students.map((student, index) => (
                  <div key={student.address} className={styles.studentCard}>
                    <div className={styles.studentInfo}>
                      <div className={styles.studentName}>{student.name}</div>
                      <div className={styles.studentAddress}>{`${student.address.slice(0, 6)}...${student.address.slice(-4)}`}</div>
                    </div>
                    <div className={styles.studentStatus}>
                      {student.hasEvaluated ? (
                        <span className={styles.evaluatedBadge}>已评价</span>
                      ) : (
                        <span className={styles.notEvaluatedBadge}>未评价</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className={styles.tabSection}>
            <h2 className={styles.sectionTitle}>课程评价 ({evaluations.length})</h2>
            {loadingEvaluations ? (
              <div className={styles.loadingBox}>正在加载评价...</div>
            ) : evaluations.length === 0 ? (
              <div className={styles.emptyBox}>暂无评价</div>
            ) : (
              <div className={styles.evaluationsList}>
                {evaluations.map(evaluation => (
                  <div key={evaluation.id} className={styles.evaluationCard}>
                    <div className={styles.evaluationHeader}>
                      <div className={styles.evaluationUser}>
                        {evaluation.isAnonymous ? '匿名学生' : evaluation.studentName}
                      </div>
                      <div className={styles.evaluationRating}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <span 
                            key={star}
                            className={`${styles.star} ${evaluation.rating >= star ? styles.starFilled : ''}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className={styles.evaluationContent}>
                      {evaluation.contentHash}
                    </div>
                    
                    <div className={styles.evaluationFooter}>
                      <span className={styles.evaluationTime}>
                        {formatDateTime(evaluation.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 