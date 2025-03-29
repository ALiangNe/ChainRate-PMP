'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import Image from 'next/image';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import styles from './page.module.css';

export default function StudentMyEvaluationsPage() {
  const router = useRouter();
  
  // 用户身份信息
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
  });
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 评价数据
  const [evaluations, setEvaluations] = useState([]);
  
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
        
        // 加载学生提交的评价
        await loadStudentEvaluations(chainRateContract, await signer.getAddress());
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router]);

  // 加载学生提交的所有评价
  const loadStudentEvaluations = async (contractInstance, studentAddress) => {
    try {
      // 获取所有课程ID
      const courseIds = await contractInstance.getAllCourses();
      let studentEvaluations = [];
      
      // 获取学生的所有评价ID
      const evaluationIds = await contractInstance.getStudentEvaluations(studentAddress);
      console.log("学生评价IDs:", evaluationIds);
      
      // 如果没有评价，直接返回
      if (evaluationIds.length === 0) {
        setEvaluations([]);
        return;
      }
      
      // 遍历所有评价ID，获取详细信息
      for (let i = 0; i < evaluationIds.length; i++) {
        try {
          const evaluationId = Number(evaluationIds[i]);
          
          // 获取评价详情
          const evalDetails = await contractInstance.getEvaluationDetails(evaluationId);
          const courseId = Number(evalDetails.courseId);
          
          // 获取课程信息
          const course = await contractInstance.courses(courseId);
          
          // 获取教师信息
          let teacherName = "未知";
          try {
            const teacherInfo = await contractInstance.getUserInfo(course.teacher);
            teacherName = teacherInfo[0]; // 教师姓名
          } catch (error) {
            console.warn(`获取教师信息失败: ${error.message}`);
          }
          
          // 构建评价数据
          const evaluationData = {
            courseId: courseId,
            courseName: course.name,
            teacherAddress: course.teacher,
            teacherName: teacherName,
            content: evalDetails.contentHash, // 存储的是内容的哈希值
            rating: Number(evalDetails.rating),
            teachingRating: Number(evalDetails.teachingRating),
            contentRating: Number(evalDetails.contentRating),
            interactionRating: Number(evalDetails.interactionRating),
            timestamp: new Date(Number(evalDetails.timestamp) * 1000),
            isAnonymous: evalDetails.isAnonymous,
            imageHashes: evalDetails.imageHashes || []
          };
          
          studentEvaluations.push(evaluationData);
        } catch (err) {
          console.warn(`获取评价 ${evaluationIds[i]} 详情失败:`, err);
          // 继续检查下一个评价
        }
      }
      
      // 按时间戳降序排列（最新的排在前面）
      studentEvaluations.sort((a, b) => b.timestamp - a.timestamp);
      
      setEvaluations(studentEvaluations);
    } catch (err) {
      console.error("加载学生评价失败:", err);
      setError('获取评价数据失败: ' + (err.message || err));
    }
  };

  // 格式化日期时间
  const formatDateTime = (date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 渲染星级评分
  const renderStars = (rating) => {
    return (
      <div className={styles.ratingDisplay}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span 
            key={star} 
            className={star <= rating ? styles.starFilled : styles.star}
          >
            ★
          </span>
        ))}
        <span className={styles.ratingValue}>({rating}/5)</span>
      </div>
    );
  };

  // 查看课程详情
  const viewCourseDetail = (courseId) => {
    router.push(`/studentCourseDetail/${courseId}`);
  };

  // 返回课程列表
  const goBack = () => {
    router.push('/studentViewCourses');
  };

  // 显示加载中
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>加载中，请稍候...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>我的课程评价</h1>
        <button className={styles.backButton} onClick={goBack}>
          返回课程列表
        </button>
      </div>
      
      {error && <div className={styles.errorBox}>{error}</div>}
      
      <div className={styles.main}>
        {evaluations.length === 0 ? (
          <div className={styles.noEvaluations}>
            <p>您尚未提交任何课程评价。</p>
            <button 
              className={styles.actionButton} 
              onClick={() => router.push('/studentViewCourses')}
            >
              浏览可评价课程
            </button>
          </div>
        ) : (
          <div className={styles.evaluationsList}>
            {evaluations.map((evaluation, index) => (
              <div key={index} className={styles.evaluationCard}>
                <div className={styles.evaluationHeader}>
                  <h2 className={styles.courseName}>{evaluation.courseName}</h2>
                  <button 
                    className={styles.viewCourseButton}
                    onClick={() => viewCourseDetail(evaluation.courseId)}
                  >
                    查看课程
                  </button>
                </div>
                
                <div className={styles.evaluationInfo}>
                  <p className={styles.teacherInfo}>
                    <span className={styles.label}>授课教师:</span> {evaluation.teacherName}
                  </p>
                  <p className={styles.timestampInfo}>
                    <span className={styles.label}>提交时间:</span> {formatDateTime(evaluation.timestamp)}
                  </p>
                  <p className={styles.anonymousInfo}>
                    <span className={styles.label}>匿名提交:</span> {evaluation.isAnonymous ? '是' : '否'}
                  </p>
                </div>
                
                <div className={styles.ratingsSection}>
                  <div className={styles.ratingItem}>
                    <span className={styles.ratingLabel}>总体评分:</span>
                    {renderStars(evaluation.rating)}
                  </div>
                  <div className={styles.ratingItem}>
                    <span className={styles.ratingLabel}>教学质量:</span>
                    {renderStars(evaluation.teachingRating)}
                  </div>
                  <div className={styles.ratingItem}>
                    <span className={styles.ratingLabel}>内容设计:</span>
                    {renderStars(evaluation.contentRating)}
                  </div>
                  <div className={styles.ratingItem}>
                    <span className={styles.ratingLabel}>师生互动:</span>
                    {renderStars(evaluation.interactionRating)}
                  </div>
                </div>
                
                <div className={styles.contentSection}>
                  <h3>评价内容</h3>
                  <p>{evaluation.content}</p>
                </div>
                
                {evaluation.imageHashes && evaluation.imageHashes.length > 0 && (
                  <div className={styles.imagesSection}>
                    <h3>评价图片</h3>
                    <div className={styles.imagesGrid}>
                      {evaluation.imageHashes.map((hash, imgIndex) => (
                        <div key={imgIndex} className={styles.imageWrapper}>
                          {/* 在实际应用中，应该从IPFS或其他存储服务获取图片 */}
                          {/* 这里使用占位图像示例 */}
                          <div className={styles.placeholderImage}>
                            <span>图片 {imgIndex + 1}</span>
                            <small>{hash.substring(0, 10)}...</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 