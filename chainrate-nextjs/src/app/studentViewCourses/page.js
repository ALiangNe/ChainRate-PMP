'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import styles from './page.module.css';

export default function StudentViewCoursesPage() {
  const router = useRouter();
  
  // 用户身份信息
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
  });
  
  // 课程数据
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [joinedCourses, setJoinedCourses] = useState({});
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [joinCoursePending, setJoinCoursePending] = useState({});
  const [error, setError] = useState('');
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
        
        setLoading(false);
        
        // 加载课程列表
        loadCourses(chainRateContract, await signer.getAddress());
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router]);
  
  // 加载课程列表
  const loadCourses = async (contractInstance, studentAddress) => {
    setLoadingCourses(true);
    setError('');
    
    try {
      // 获取所有激活的课程
      const activeCourseIds = await contractInstance.getActiveCourses();
      
      // 获取学生已加入的课程
      const studentCourseIds = await contractInstance.getStudentCourses(studentAddress);
      
      // 记录学生已加入的课程
      const joinedCoursesMap = {};
      for (let i = 0; i < studentCourseIds.length; i++) {
        const courseId = Number(studentCourseIds[i]);
        // 检查学生是否仍然加入此课程（可能已退出）
        const isJoined = await contractInstance.isStudentJoined(courseId, studentAddress);
        if (isJoined) {
          joinedCoursesMap[courseId] = true;
        }
      }
      setJoinedCourses(joinedCoursesMap);
      
      // 获取课程详情
      const coursesList = [];
      for (let i = 0; i < activeCourseIds.length; i++) {
        const courseId = Number(activeCourseIds[i]);
        
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
          
          coursesList.push({
            id: courseId,
            name: course.name,
            teacher: course.teacher,
            teacherName: teacherName,
            startTime: new Date(Number(course.startTime) * 1000),
            endTime: new Date(Number(course.endTime) * 1000),
            isActive: course.isActive,
            studentCount: Number(course.studentCount),
            averageRating: averageRating,
            isJoined: joinedCoursesMap[courseId] || false
          });
        } catch (courseErr) {
          console.warn(`获取课程 ${courseId} 失败:`, courseErr);
        }
      }
      
      setCourses(coursesList);
      setFilteredCourses(coursesList);
    } catch (err) {
      console.error("加载课程失败:", err);
      setError('获取课程列表失败: ' + (err.message || err));
    } finally {
      setLoadingCourses(false);
    }
  };
  
  // 处理搜索
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCourses(courses);
    } else {
      const filtered = courses.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCourses(filtered);
    }
  }, [searchTerm, courses]);
  
  // 处理搜索输入
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // 加入课程
  const handleJoinCourse = async (courseId) => {
    setError('');
    setSuccessMessage('');
    setJoinCoursePending(prev => ({ ...prev, [courseId]: true }));
    
    try {
      // 调用合约加入课程
      const tx = await contract.joinCourse(courseId);
      
      // 等待交易确认
      await tx.wait();
      
      // 更新状态
      setJoinedCourses(prev => ({ ...prev, [courseId]: true }));
      setFilteredCourses(prev => 
        prev.map(course => 
          course.id === courseId 
            ? { ...course, isJoined: true, studentCount: course.studentCount + 1 } 
            : course
        )
      );
      setCourses(prev => 
        prev.map(course => 
          course.id === courseId 
            ? { ...course, isJoined: true, studentCount: course.studentCount + 1 } 
            : course
        )
      );
      
      setSuccessMessage(`成功加入课程 "${courses.find(c => c.id === courseId)?.name}"`);
      
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
      setJoinCoursePending(prev => ({ ...prev, [courseId]: false }));
    }
  };
  
  // 查看课程详情
  const handleViewCourseDetail = (courseId) => {
    router.push(`/studentCourseDetail/${courseId}`);
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
  
  // 检查课程评价状态
  const getCourseStatus = (course) => {
    const now = new Date();
    
    if (now < course.startTime) {
      return { status: 'upcoming', text: '未开始', className: styles.statusUpcoming };
    } else if (now >= course.startTime && now <= course.endTime) {
      return { status: 'active', text: '评价中', className: styles.statusActive };
    } else {
      return { status: 'ended', text: '已结束', className: styles.statusEnded };
    }
  };
  
  const goBack = () => {
    router.push('/studentIndex');
  };

  if (loading) {
    return <div className={styles.container}>正在加载...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>可选课程列表</h1>
        <button onClick={goBack} className={styles.backButton}>返回首页</button>
      </header>

      <main className={styles.main}>
        <div className={styles.courseContainer}>
          <div className={styles.searchBox}>
            <input 
              type="text" 
              placeholder="搜索课程名称或教师..." 
              value={searchTerm}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
          </div>
          
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
          
          {loadingCourses ? (
            <div className={styles.loadingBox}>正在加载课程数据...</div>
          ) : filteredCourses.length === 0 ? (
            <div className={styles.emptyBox}>
              <p>未找到课程</p>
              {searchTerm ? (
                <p>尝试使用其他关键词搜索</p>
              ) : (
                <p>当前没有可选的课程，请稍后再来查看</p>
              )}
            </div>
          ) : (
            <div className={styles.courseGrid}>
              {filteredCourses.map(course => {
                const courseStatus = getCourseStatus(course);
                
                return (
                  <div key={course.id} className={styles.courseCard}>
                    <div className={styles.courseHeader}>
                      <h3 className={styles.courseName}>{course.name}</h3>
                      <span className={`${styles.courseStatus} ${courseStatus.className}`}>
                        {courseStatus.text}
                      </span>
                    </div>
                    <div className={styles.courseBody}>
                      <p><strong>教师:</strong> {course.teacherName}</p>
                      <p><strong>评价开始:</strong> {formatDateTime(course.startTime)}</p>
                      <p><strong>评价结束:</strong> {formatDateTime(course.endTime)}</p>
                      <p><strong>已选人数:</strong> {course.studentCount}</p>
                      {course.averageRating > 0 && (
                        <p><strong>平均评分:</strong> {course.averageRating.toFixed(1)}/5</p>
                      )}
                    </div>
                    <div className={styles.courseActions}>
                      <button 
                        onClick={() => handleViewCourseDetail(course.id)}
                        className={styles.viewButton}
                      >
                        查看详情
                      </button>
                      {course.isJoined ? (
                        <button 
                          className={styles.joinedButton}
                          disabled
                        >
                          已加入
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleJoinCourse(course.id)}
                          className={styles.joinButton}
                          disabled={joinCoursePending[course.id]}
                        >
                          {joinCoursePending[course.id] ? '加入中...' : '加入课程'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 