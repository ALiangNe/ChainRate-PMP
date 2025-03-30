'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import styles from './page.module.css';
import React from 'react';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  FormOutlined, 
  LogoutOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  TeamOutlined,
  StarOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { 
  Breadcrumb, 
  Layout, 
  Menu, 
  ConfigProvider, 
  theme, 
  Card, 
  Row, 
  Col, 
  Input, 
  Button, 
  Tag, 
  Empty, 
  Spin, 
  Space,
  Alert,
  Tooltip,
  Badge,
  Divider
} from 'antd';

const { Header, Content, Sider } = Layout;
const { Meta } = Card;
const { Search } = Input;

export default function StudentViewCoursesPage() {
  const router = useRouter();
  
  // 提前调用 useToken，确保Hook顺序一致
  const { token } = theme.useToken();
  const { colorBgContainer, borderRadiusLG } = token;
  
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
      try {
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
      } catch (error) {
        console.error("Authentication check error:", error);
        setLoading(false);
      }
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
  const handleSearchChange = (value) => {
    setSearchTerm(value);
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };
  
  // 获取课程状态
  const getCourseStatus = (course) => {
    const now = new Date();
    if (now < course.startTime) return { status: '即将开始', color: 'blue' };
    if (now >= course.startTime && now <= course.endTime) return { status: '进行中', color: 'green' };
    return { status: '已结束', color: 'default' };
  };
  
  // 返回
  const goBack = () => {
    router.push('/studentIndex');
  };

  // 侧边栏菜单项
  const siderItems = [
    {
      key: 'sub1',
      icon: React.createElement(UserOutlined),
      label: '个人中心',
      children: [
        {
          key: '1',
          label: '个人信息',
          onClick: () => router.push('/studentIndex')
        }
      ],
    },
    {
      key: 'sub2',
      icon: React.createElement(BookOutlined),
      label: '课程管理',
      children: [
        {
          key: '2',
          label: '查看课程',
          onClick: () => router.push('/studentViewCourses')
        }
      ],
    },
    {
      key: 'sub3',
      icon: React.createElement(CommentOutlined),
      label: '评价管理',
      children: [
        {
          key: '3',
          label: '我的评价',
          onClick: () => router.push('/studentMyEvaluation')
        },
        {
          key: '4',
          label: '提交评价',
          onClick: () => router.push('/submit-evaluation')
        }
      ],
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userRoleHash');
    router.push('/login');
  };

  if (loading) {
    return <div className={styles.container}>正在加载...</div>;
  }
  
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className={styles.logo} />
            <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
              链评系统（ChainRate）
            </div>
          </div>
          <div style={{ color: 'white', marginRight: '20px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '15px' }}>欢迎, {userData.name}</span>
            <Tooltip title="退出登录">
              <LogoutOutlined onClick={handleLogout} style={{ fontSize: '18px', cursor: 'pointer' }} />
            </Tooltip>
          </div>
        </Header>
        <Layout>
          <Sider width={200} style={{ background: colorBgContainer }}>
            <Menu
              mode="inline"
              defaultSelectedKeys={['2']}
              defaultOpenKeys={['sub2']}
              style={{ height: '100%', borderRight: 0 }}
              items={siderItems}
            />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页', onClick: () => router.push('/studentIndex'), className: 'clickable-breadcrumb' },
                { title: '查看课程' }
              ]}
              style={{ margin: '16px 0' }}
            />
            <Content
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
              }}
            >
              <div className={styles.courseContainer}>
                <div style={{ marginBottom: '20px' }}>
                  <Search
                    placeholder="搜索课程名称或教师"
                    allowClear
                    enterButton={<><SearchOutlined /> 搜索</>}
                    size="large"
                    onSearch={handleSearchChange}
                    style={{ maxWidth: '600px' }}
                  />
                </div>

                {error && 
                  <Alert
                    message="错误"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: '20px' }}
                    closable
                    onClose={() => setError('')}
                  />
                }
                
                {successMessage && 
                  <Alert
                    message="成功"
                    description={successMessage}
                    type="success"
                    showIcon
                    style={{ marginBottom: '20px' }}
                    closable
                    onClose={() => setSuccessMessage('')}
                  />
                }

                {loadingCourses ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                    <p style={{ marginTop: '16px' }}>正在加载课程列表...</p>
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <Empty 
                    description="没有找到符合条件的课程" 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    style={{ margin: '40px 0' }}
                  />
                ) : (
                  <Row gutter={[16, 16]}>
                    {filteredCourses.map(course => {
                      const courseStatus = getCourseStatus(course);
                      
                      return (
                        <Col xs={24} sm={12} md={8} lg={8} xl={6} key={course.id}>
                          <Card
                            hoverable
                            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                            cover={
                              <div style={{ 
                                height: '8px', 
                                background: courseStatus.color === 'default' ? '#d9d9d9' : 
                                            courseStatus.color === 'blue' ? '#1a73e8' : '#52c41a'
                              }} />
                            }
                            actions={[
                              <Button 
                                key="view" 
                                icon={<BookOutlined />}
                                onClick={() => handleViewCourseDetail(course.id)}
                              >
                                查看详情
                              </Button>,
                              course.isJoined ? (
                                <Button 
                                  key="joined" 
                                  type="primary" 
                                  ghost 
                                  disabled 
                                  icon={<CheckCircleOutlined />}
                                >
                                  已加入
                                </Button>
                              ) : (
                                <Button 
                                  key="join" 
                                  type="primary" 
                                  loading={joinCoursePending[course.id]} 
                                  onClick={() => handleJoinCourse(course.id)}
                                  icon={<TeamOutlined />}
                                >
                                  加入课程
                                </Button>
                              )
                            ]}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <Meta
                                title={<span style={{ fontSize: '16px', fontWeight: 'bold' }}>{course.name}</span>}
                              />
                              <Tag color={courseStatus.color}>{courseStatus.status}</Tag>
                            </div>
                            
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                                <UserOutlined style={{ marginRight: '8px', color: '#1a73e8' }} />
                                <span>{course.teacherName}</span>
                              </div>
                              
                              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                                <CalendarOutlined style={{ marginRight: '8px', color: '#1a73e8' }} />
                                <span>{formatDateTime(course.startTime)} 至 {formatDateTime(course.endTime)}</span>
                              </div>
                              
                              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                                <TeamOutlined style={{ marginRight: '8px', color: '#1a73e8' }} />
                                <span>学生数: {course.studentCount}</span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <StarOutlined style={{ marginRight: '8px', color: '#1a73e8' }} />
                                <span>评分: {course.averageRating.toFixed(1)}</span>
                              </div>
                            </div>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </div>
            </Content>
          </Layout>
        </Layout>
        <div className={styles.footer}>
          <p>© 2023 链评系统 - 基于区块链的教学评价系统</p>
        </div>
      </Layout>
    </ConfigProvider>
  );
} 