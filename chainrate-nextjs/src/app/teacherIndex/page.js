'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';
import React from 'react';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  LogoutOutlined,
  MailOutlined,
  GlobalOutlined,
  TeamOutlined,
  RocketOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  FileAddOutlined,
  BarChartOutlined,
  PieChartOutlined,
  EyeOutlined,
  BellOutlined,
  AuditOutlined,
  PoweroffOutlined
} from '@ant-design/icons';
import { 
  Breadcrumb, 
  Layout, 
  Menu, 
  ConfigProvider, 
  theme, 
  Card, 
  Avatar, 
  Row, 
  Col, 
  Statistic, 
  Divider, 
  Tag,
  Tooltip,
  Button,
  Spin
} from 'antd';
import UserAvatar from '../components/UserAvatar';
import TeacherSidebar from '../components/TeacherSidebar';

const { Header, Content, Sider } = Layout;
const { Meta } = Card;

export default function TeacherIndexPage() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: '',
    email: '',
    college: '',
    major: '',
    grade: '',
    avatar: ''
  });
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState(null);
  
  // 统计数据状态
  const [statsLoading, setStatsLoading] = useState(true);
  const [coursesCount, setCoursesCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const [evaluationsCount, setEvaluationsCount] = useState(0);
  
  // 添加公告数据状态
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  useEffect(() => {
    // 确保代码仅在客户端执行
    if (typeof window === 'undefined') return;

    // 检查用户是否已登录并且是教师角色
    const checkUserAuth = () => {
      try {
        console.log('检查教师认证...');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userRole = localStorage.getItem('userRole');
        
        console.log('认证状态:', { isLoggedIn, userRole });
        
        if (!isLoggedIn || userRole !== 'teacher') {
          console.log('未认证为教师，重定向到登录页面');
          router.push('/NotFound');
          return;
        }

        // 获取用户信息
        setUserData({
          isLoggedIn: true,
          address: localStorage.getItem('userAddress') || '',
          name: localStorage.getItem('userName') || '',
          role: userRole,
          email: localStorage.getItem('userEmail') || '',
          college: localStorage.getItem('userCollege') || '',
          major: localStorage.getItem('userMajor') || '',
          grade: localStorage.getItem('userGrade') || '',
          avatar: localStorage.getItem('userAvatar') || ''
        });
        console.log('教师认证成功，初始化Web3连接');
        initWeb3();
      } catch (error) {
        console.error("Authentication check error:", error);
        setLoading(false); // 确保即使出错也会停止加载状态
      }
    };
    
    // 初始化Web3连接
    const initWeb3 = async () => {
      try {
        // 检查是否有 MetaMask
        if (typeof window.ethereum === 'undefined') {
          console.error('请安装 MetaMask 钱包以使用此应用');
          setLoading(false);
          return;
        }
        
        // 请求用户连接钱包
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // 创建 Web3 Provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // 获取 Signer
        const signer = await provider.getSigner();
        
        // 连接到合约
        const chainRateContract = new ethers.Contract(
          ChainRateAddress.address,
          ChainRateABI.abi,
          signer
        );
        setContract(chainRateContract);
        
        // 获取教师统计数据
        await loadTeacherStatistics(chainRateContract);
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setLoading(false);
      }
    };
    
    // 加载教师统计数据
    const loadTeacherStatistics = async (contractInstance) => {
      try {
        setStatsLoading(true);
        console.log("开始加载教师统计数据...");
        
        const teacherAddress = localStorage.getItem('userAddress');
        if (!teacherAddress) {
          console.error("未找到教师地址");
          setStatsLoading(false);
          return;
        }
        
        // 获取教师面板数据 - 这个函数返回教师的所有课程和统计信息
        const teacherDashboard = await contractInstance.getTeacherDashboard(teacherAddress);
        console.log("教师面板数据:", teacherDashboard);
        
        // 解构数据
        const totalCourses = Number(teacherDashboard[0] || 0);
        const totalStudents = Number(teacherDashboard[1] || 0);
        const totalEvaluations = Number(teacherDashboard[2] || 0);
        
        // 更新状态
        setCoursesCount(totalCourses);
        setStudentsCount(totalStudents);
        setEvaluationsCount(totalEvaluations);
        
        setStatsLoading(false);
      } catch (err) {
        console.error("加载教师统计数据失败:", err);
        setStatsLoading(false);
      }
    };

    // 添加获取公告数据的函数
    const fetchAnnouncements = async () => {
      try {
        setAnnouncementsLoading(true);
        console.log('开始获取系统公告...');
        
        const response = await fetch('/api/announcements?limit=2');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('获取到公告数据:', data);
        
        if (data.success && data.data) {
          setAnnouncements(data.data);
        } else {
          console.error('获取公告数据失败:', data.message);
          // 如果API请求失败，尝试从localStorage获取临时数据
          const tempAnnouncements = localStorage.getItem('tempAnnouncements')
            ? JSON.parse(localStorage.getItem('tempAnnouncements'))
            : [];
          setAnnouncements(tempAnnouncements);
        }
      } catch (error) {
        console.error('获取公告数据错误:', error);
        // 设置为空数组，避免显示加载状态
        setAnnouncements([]);
        // 如果API请求失败，尝试从localStorage获取临时数据
        const tempAnnouncements = localStorage.getItem('tempAnnouncements')
          ? JSON.parse(localStorage.getItem('tempAnnouncements'))
          : [];
        setAnnouncements(tempAnnouncements);
      } finally {
        setAnnouncementsLoading(false);
      }
    };

    // 添加延迟执行验证，避免客户端渲染问题
    const timer = setTimeout(() => {
      checkUserAuth();
      fetchAnnouncements(); // 调用获取公告的函数
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);
  
  // 刷新教师统计数据
  const refreshTeacherStatistics = async () => {
    if (!contract) return;
    
    try {
      await loadTeacherStatistics(contract);
    } catch (err) {
      console.error("刷新教师统计数据失败:", err);
    }
  };

  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userRoleHash');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userCollege');
    localStorage.removeItem('userMajor');
    localStorage.removeItem('userGrade');
    localStorage.removeItem('userAvatar');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          正在加载教师首页...
        </div>
      </div>
    );
  }

  // 格式化日期函数
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#34a853', // 使用绿色作为教师端主题色
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className={styles.logo}>
              <Image 
                src="/images/logo1.png" 
                alt="链评系统Logo" 
                width={40} 
                height={40}
                style={{ borderRadius: '6px' }}
              />
            </div>
            <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
              链评系统（ChainRate）- 教师端
            </div>
          </div>
          <div style={{ color: 'white', marginRight: '20px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '15px' }}>欢迎, {userData.name}</span>
            <UserAvatar color="#fff" />
          </div>
        </Header>
        <Layout>
          <Sider width={200} style={{ background: 'white' }}>
            <TeacherSidebar defaultSelectedKey="1" defaultOpenKey="sub1" />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[{ title: '首页' }, { title: '个人中心' }]}
              style={{ margin: '16px 0' }}
            />
            <Content
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
                background: 'white',
                borderRadius: 8,
              }}
            >
              {/* 个人信息区域 */}
              <Card
                className={styles.profileCard}
                variant="outlined"
                style={{ 
                  marginBottom: 24,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
              >
                <Row gutter={[24, 24]} align="middle">
                  <Col xs={24} sm={6} md={6} lg={4}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {userData.avatar ? (
                        <Avatar 
                          size={100} 
                          src={userData.avatar}
                          style={{ 
                            boxShadow: '0 4px 8px rgba(52,168,83,0.2)'
                          }} 
                        />
                      ) : (
                        <Avatar 
                          size={100} 
                          icon={<UserOutlined />} 
                          style={{ 
                            backgroundColor: '#34a853',
                            boxShadow: '0 4px 8px rgba(52,168,83,0.2)'
                          }} 
                        />
                      )}
                    </div>
                  </Col>
                  <Col xs={24} sm={18} md={18} lg={14}>
                    <h2 style={{ marginBottom: 16, fontSize: 24 }}>{userData.name} <Tag color="green">教师</Tag></h2>
                    <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <GlobalOutlined style={{ marginRight: 8, color: '#34a853' }} />
                      <span style={{ wordBreak: 'break-all' }}><strong>钱包地址:</strong> {userData.address}</span>
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <MailOutlined style={{ marginRight: 8, color: '#34a853' }} />
                      <span><strong>邮箱:</strong> {userData.email || '未设置'}</span>
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <TeamOutlined style={{ marginRight: 8, color: '#34a853' }} />
                      <span><strong>学院:</strong> {userData.college || '未设置'}</span>
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <BookOutlined style={{ marginRight: 8, color: '#34a853' }} />
                      <span><strong>专业:</strong> {userData.major || '未设置'}</span>
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center' }}>
                      <TrophyOutlined style={{ marginRight: 8, color: '#34a853' }} />
                      <span><strong>职称:</strong> {userData.grade || '未设置'}</span>
                    </p>
                  </Col>
                  <Col xs={24} sm={24} md={24} lg={6}>
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Statistic 
                          title="已创建课程"
                          value={statsLoading ? <Spin size="small" /> : coursesCount}
                          prefix={<BookOutlined />}
                          valueStyle={{ color: '#34a853' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="学生人数"
                          value={statsLoading ? <Spin size="small" /> : studentsCount}
                          prefix={<TeamOutlined />}
                          valueStyle={{ color: '#34a853' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="收到评价"
                          value={statsLoading ? <Spin size="small" /> : evaluationsCount}
                          prefix={<CommentOutlined />}
                          valueStyle={{ color: '#34a853' }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card>

              {/* 功能区 */}
              <h2 style={{ fontSize: 20, marginBottom: 16 }}>功能区</h2>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Card
                    hoverable
                    className={styles.functionCardEnhanced}
                    onClick={() => router.push('/teacherCreateCourse')}
                    cover={
                      <div style={{ padding: '24px 0 0 0', textAlign: 'center' }}>
                        <FileAddOutlined style={{ fontSize: 48, color: '#34a853' }} />
                      </div>
                    }
                    style={{ height: '100%' }}
                  >
                    <Meta
                      title="创建课程"
                      description="创建新的课程供学生评价"
                    />
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" ghost>立即创建</Button>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} md={6}>
                  <Card
                    hoverable
                    className={styles.functionCardEnhanced}
                    onClick={() => router.push('/teacherViewCourse')}
                    cover={
                      <div style={{ padding: '24px 0 0 0', textAlign: 'center' }}>
                        <BookOutlined style={{ fontSize: 48, color: '#34a853' }} />
                      </div>
                    }
                    style={{ height: '100%' }}
                  >
                    <Meta
                      title="我的课程"
                      description="管理您已创建的课程"
                    />
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" ghost>查看课程</Button>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} md={6}>
                  <Card
                    hoverable
                    className={styles.functionCardEnhanced}
                    onClick={() => router.push('/teacherViewEvaluation')}
                    cover={
                      <div style={{ padding: '24px 0 0 0', textAlign: 'center' }}>
                        <CommentOutlined style={{ fontSize: 48, color: '#34a853' }} />
                      </div>
                    }
                    style={{ height: '100%' }}
                  >
                    <Meta
                      title="查看评价"
                      description="查看学生对课程的评价"
                    />
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" ghost>查看评价</Button>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} md={6}>
                  <Card
                    hoverable
                    className={styles.functionCardEnhanced}
                    onClick={() => router.push('/statistics')}
                    cover={
                      <div style={{ padding: '24px 0 0 0', textAlign: 'center' }}>
                        <PieChartOutlined style={{ fontSize: 48, color: '#34a853' }} />
                      </div>
                    }
                    style={{ height: '100%' }}
                  >
                    <Meta
                      title="统计分析"
                      description="查看课程评价的统计数据"
                    />
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" ghost>查看分析</Button>
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* 系统公告 */}
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <RocketOutlined style={{ marginRight: 8, color: '#34a853' }} />
                    <span>系统公告</span>
                  </div>
                }
                style={{ marginTop: 24 }}
                variant="outlined"
              >
                {announcementsLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Spin tip="加载公告中..." />
                  </div>
                ) : announcements.length > 0 ? (
                  <>
                    {announcements.map((announcement, index) => (
                      <React.Fragment key={announcement.announcement_id}>
                        <div style={{ display: 'flex', alignItems: 'start', marginBottom: 12 }}>
                          <ClockCircleOutlined style={{ marginRight: 8, marginTop: 4, color: '#8c8c8c' }} />
                          <div>
                            <p style={{ margin: 0, fontWeight: 'bold' }}>{announcement.title}</p>
                            <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>
                              {formatDate(announcement.created_at)}
                            </p>
                            <p>{announcement.content}</p>
                          </div>
                        </div>
                        {index < announcements.length - 1 && <Divider style={{ margin: '12px 0' }} />}
                      </React.Fragment>
                    ))}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#8c8c8c' }}>
                    暂无公告
                  </div>
                )}
              </Card>
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