'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../../contracts/ChainRate.json';
import ChainRateAddress from '../../../contracts/ChainRate-address.json';
import styles from './page.module.css';

export default function CourseDetailPage({ params }) {
  const router = useRouter();
  const courseId = params.id;
  
  // 用户身份信息
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
  });
  
  // 课程数据
  const [course, setCourse] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [canEvaluate, setCanEvaluate] = useState(false);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [error, setError] = useState('');
  const [joinCoursePending, setJoinCoursePending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    // 检查用户是否已登录并且是学生角色
    const checkUserAuth = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const userRole = localStorage.getItem('userRole');
      
      if (!isLoggedIn || userRole !== 'student') {
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
        
        // 加载课程详情和评价
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
  
  // 加载课程详情和评价
  const loadCourseDetails = async (contractInstance, studentAddress, courseId) => {
    try {
      // 检查课程是否存在
      try {
        const course = await contractInstance.courses(courseId);
        
        // 获取教师信息
        let teacherName = "未知";
        try {
          const teacherInfo = await contractInstance.getUserInfo(course.teacher);
          teacherName = teacherInfo[0]; // 教师姓名
        } catch (error) {
          console.warn(`获取教师信息失败: ${error.message}`);
        }
        
        // 获取课程评分
        let averageRating = 0;
        try {
          const rating = await contractInstance.getAverageRating(courseId);
          averageRating = Number(rating) / 100; // 转换为小数（因为合约中乘以了100）
        } catch (error) {
          console.warn(`获取课程评分失败: ${error.message}`);
        }
        
        // 检查学生是否已加入课程
        const studentJoined = await contractInstance.isStudentJoined(courseId, studentAddress);
        setIsJoined(studentJoined);
        
        // 检查学生是否已评价课程
        const evaluated = await contractInstance.hasEvaluated(courseId, studentAddress);
        setHasEvaluated(evaluated);
        
        // 检查当前是否在评价期间内
        const now = Math.floor(Date.now() / 1000);
        const canEvaluate = studentJoined && 
                          now >= Number(course.startTime) && 
                          now <= Number(course.endTime) && 
                          !evaluated;
        setCanEvaluate(canEvaluate);
        
        // 更新课程信息
        setCourse({
          id: Number(courseId),
          name: course.name,
          teacher: course.teacher,
          teacherName: teacherName,
          startTime: new Date(Number(course.startTime) * 1000),
          endTime: new Date(Number(course.endTime) * 1000),
          isActive: course.isActive,
          studentCount: Number(course.studentCount),
          averageRating: averageRating
        });
        
        // 加载课程评价
        await loadCourseEvaluations(contractInstance, courseId);
      } catch (error) {
        console.error(`获取课程 ${courseId} 失败:`, error);
        setError(`课程 ID ${courseId} 不存在或无法访问`);
      }
    } catch (err) {
      console.error("加载课程详情失败:", err);
      setError('获取课程详情失败: ' + (err.message || err));
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
            contentHash: evaluation.contentHash,
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
      setError('获取课程评价失败: ' + (err.message || err));
    } finally {
      setLoadingEvaluations(false);
    }
  };
  
  // 加入课程
  const handleJoinCourse = async () => {
    setError('');
    setSuccessMessage('');
    setJoinCoursePending(true);
    
    try {
      // 调用合约加入课程
      const tx = await contract.joinCourse(courseId);
      
      // 等待交易确认
      await tx.wait();
      
      // 更新状态
      setIsJoined(true);
      setCourse(prev => ({
        ...prev,
        studentCount: prev.studentCount + 1
      }));
      
      // 检查当前是否在评价期间内
      const now = Math.floor(Date.now() / 1000);
      if (course && now >= course.startTime && now <= course.endTime) {
        setCanEvaluate(true);
      }
      
      setSuccessMessage(`成功加入课程 "${course?.name}"`);
      
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error("加入课程失败:", err);
      
      // 特殊处理用户拒绝的情况
      if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        setError('您取消了交易。如需加入课程，请重新点击加入并在MetaMask中确认。');
      } else {
        setError('加入课程失败: ' + (err.message || err));
      }
    } finally {
      setJoinCoursePending(false);
    }
  };
  
  // 前往评价页面
  const handleEvaluateCourse = () => {
    router.push(`/submitEvaluation/${courseId}`);
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
  
  // 获取课程评价状态
  const getCourseStatus = () => {
    if (!course) return { status: 'unknown', text: '未知', className: '' };
    
    const now = new Date();
    
    if (!course.isActive) {
      return { status: 'inactive', text: '已停用', className: styles.statusInactive };
    } else if (now < course.startTime) {
      return { status: 'upcoming', text: '未开始', className: styles.statusUpcoming };
    } else if (now >= course.startTime && now <= course.endTime) {
      return { status: 'active', text: '评价中', className: styles.statusActive };
    } else {
      return { status: 'ended', text: '已结束', className: styles.statusEnded };
    }
  };
  
  const goBack = () => {
    router.push('/studentViewCourses');
  };

  if (loading) {
    return <div className={styles.container}>正在加载课程详情...</div>;
  }

  if (!course) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>课程详情</h1>
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

  const courseStatus = getCourseStatus();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>课程详情</h1>
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
        
        <div className={styles.courseDetailCard}>
          <div className={styles.courseHeader}>
            <h2 className={styles.courseName}>{course.name}</h2>
            <span className={`${styles.courseStatus} ${courseStatus.className}`}>
              {courseStatus.text}
            </span>
          </div>
          
          <div className={styles.courseInfo}>
            <div className={styles.infoRow}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>教师：</span>
                <span className={styles.infoValue}>{course.teacherName}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>已选人数：</span>
                <span className={styles.infoValue}>{course.studentCount}</span>
              </div>
            </div>
            
            <div className={styles.infoRow}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>评价开始：</span>
                <span className={styles.infoValue}>{formatDateTime(course.startTime)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>评价结束：</span>
                <span className={styles.infoValue}>{formatDateTime(course.endTime)}</span>
              </div>
            </div>
            
            {course.averageRating > 0 && (
              <div className={styles.ratingContainer}>
                <span className={styles.infoLabel}>平均评分：</span>
                <div className={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span 
                      key={star}
                      className={`${styles.star} ${course.averageRating >= star ? styles.starFilled : ''}`}
                    >
                      ★
                    </span>
                  ))}
                  <span className={styles.ratingText}>{course.averageRating.toFixed(1)}/5</span>
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.courseActions}>
            {!isJoined ? (
              <button 
                onClick={handleJoinCourse}
                className={styles.joinButton}
                disabled={joinCoursePending || !course.isActive}
              >
                {joinCoursePending ? '加入中...' : '加入课程'}
              </button>
            ) : hasEvaluated ? (
              <button 
                className={styles.evaluatedButton}
                disabled
              >
                已评价
              </button>
            ) : canEvaluate ? (
              <button 
                onClick={handleEvaluateCourse}
                className={styles.evaluateButton}
              >
                评价课程
              </button>
            ) : (
              <button 
                className={styles.cannotEvaluateButton}
                disabled
              >
                {new Date() < course.startTime ? '评价未开始' : '评价已结束'}
              </button>
            )}
          </div>
        </div>
        
        <div className={styles.evaluationsSection}>
          <h2 className={styles.sectionTitle}>课程评价</h2>
          
          {loadingEvaluations ? (
            <div className={styles.loadingBox}>正在加载评价...</div>
          ) : evaluations.length === 0 ? (
            <div className={styles.emptyBox}>
              <p>暂无评价</p>
            </div>
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
      </main>
    </div>
  );
} 