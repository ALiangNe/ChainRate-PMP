'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import styles from './page.module.css';

export default function ViewCoursesPage() {
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
  const [filter, setFilter] = useState('all'); // all, active, inactive
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState('');
  
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
        
        setLoading(false);
        
        // 加载教师创建的课程
        loadTeacherCourses(chainRateContract, await signer.getAddress());
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router]);
  
  // 加载教师创建的课程
  const loadTeacherCourses = async (contractInstance, teacherAddress) => {
    setLoadingCourses(true);
    setError('');
    
    try {
      // 获取课程总数
      const courseCount = await contractInstance.courseCount();
      const courseCountNum = Number(courseCount);
      
      // 存储教师创建的课程
      const teacherCourses = [];
      
      // 遍历所有课程，查找教师创建的课程
      for (let i = 0; i < courseCountNum; i++) {
        try {
          const course = await contractInstance.courses(i);
          
          // 检查课程是否由当前教师创建
          if (course.teacher.toLowerCase() === teacherAddress.toLowerCase()) {
            // 将课程数据添加到列表中
            teacherCourses.push({
              id: i,
              name: course.name,
              teacher: course.teacher,
              startTime: new Date(Number(course.startTime) * 1000),
              endTime: new Date(Number(course.endTime) * 1000),
              isActive: course.isActive
            });
          }
        } catch (courseErr) {
          console.warn(`获取课程 ${i} 失败:`, courseErr);
          // 继续处理下一个课程
        }
      }
      
      // 更新课程列表
      setCourses(teacherCourses);
      setFilteredCourses(teacherCourses);
    } catch (err) {
      console.error("加载课程失败:", err);
      setError('获取课程列表失败: ' + (err.message || err));
    } finally {
      setLoadingCourses(false);
    }
  };
  
  // 处理搜索和筛选
  useEffect(() => {
    let result = [...courses];
    
    // 应用名称搜索
    if (searchTerm.trim() !== '') {
      result = result.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 应用状态筛选
    if (filter === 'active') {
      result = result.filter(course => course.isActive);
    } else if (filter === 'inactive') {
      result = result.filter(course => !course.isActive);
    }
    
    setFilteredCourses(result);
  }, [searchTerm, filter, courses]);
  
  // 处理搜索输入
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // 处理筛选切换
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
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
  
  // 管理课程
  const handleManageCourse = (courseId) => {
    router.push(`/teacherManageCourse/${courseId}`);
  };
  
  // 查看评价
  const handleViewEvaluations = (courseId) => {
    // 未来可以实现跳转到课程评价页面
    router.push(`/courseEvaluations/${courseId}`);
  };
  
  const goBack = () => {
    router.push('/teacherIndex');
  };

  if (loading) {
    return <div className={styles.container}>正在加载...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>我的课程</h1>
        <button onClick={goBack} className={styles.backButton}>返回首页</button>
      </header>

      <main className={styles.main}>
        <div className={styles.courseContainer}>
          <div className={styles.controlPanel}>
            <div className={styles.searchBox}>
              <input 
                type="text" 
                placeholder="搜索课程名称..." 
                value={searchTerm}
                onChange={handleSearchChange}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.filterBox}>
              <select 
                value={filter}
                onChange={handleFilterChange}
                className={styles.filterSelect}
              >
                <option value="all">所有课程</option>
                <option value="active">仅显示启用的课程</option>
                <option value="inactive">仅显示停用的课程</option>
              </select>
            </div>
          </div>
          
          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}
          
          {loadingCourses ? (
            <div className={styles.loadingBox}>正在加载课程数据...</div>
          ) : filteredCourses.length === 0 ? (
            <div className={styles.emptyBox}>
              <p>未找到课程</p>
              {searchTerm || filter !== 'all' ? (
                <p>尝试清除搜索或更改筛选条件</p>
              ) : (
                <p>您还没有创建任何课程，请前往"创建课程"页面创建新课程</p>
              )}
              <button 
                onClick={() => router.push('/createCourse')} 
                className={styles.createButton}
              >
                创建新课程
              </button>
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
                      <p><strong>课程ID:</strong> {course.id}</p>
                      <p><strong>评价开始:</strong> {formatDateTime(course.startTime)}</p>
                      <p><strong>评价结束:</strong> {formatDateTime(course.endTime)}</p>
                      <p><strong>状态:</strong> {course.isActive ? '已启用' : '已停用'}</p>
                    </div>
                    <div className={styles.courseActions}>
                      <button 
                        onClick={() => handleManageCourse(course.id)}
                        className={styles.manageButton}
                      >
                        管理课程
                      </button>
                      <button 
                        onClick={() => handleViewEvaluations(course.id)}
                        className={styles.viewButton}
                      >
                        查看评价
                      </button>
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