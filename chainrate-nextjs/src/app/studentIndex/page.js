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
  FormOutlined, 
  LogoutOutlined,
  MailOutlined,
  GlobalOutlined,
  TeamOutlined,
  RocketOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  BankOutlined,
  ReadOutlined,
  NumberOutlined
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
import StudentSidebar from '../components/StudentSidebar';

const { Header, Content, Sider } = Layout;
const { Meta } = Card;

export default function StudentIndexPage() {
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
  const [evaluatedCoursesCount, setEvaluatedCoursesCount] = useState(0);
  const [unevaluatedCoursesCount, setUnevaluatedCoursesCount] = useState(0);
  const [totalEvaluationsCount, setTotalEvaluationsCount] = useState(0);
  
  // 添加公告数据状态
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  
  useEffect(() => {
    // 确保代码仅在客户端执行
    if (typeof window === 'undefined') return;

    // 检查用户是否已登录并且是学生角色
    const checkUserAuth = () => {
      try {
        console.log('检查学生认证...');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userRole = localStorage.getItem('userRole');
        
        console.log('认证状态:', { isLoggedIn, userRole });
        
        if (!isLoggedIn || userRole !== 'student') {
          console.log('未认证为学生，重定向到登录页面');
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
        console.log('学生认证成功，初始化Web3连接');
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
        
        // 获取学生统计数据
        await loadStudentStatistics(chainRateContract);
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setLoading(false);
      }
    };
    
    // 加载学生统计数据
    const loadStudentStatistics = async (contractInstance) => {
      try {
        setStatsLoading(true);
        console.log("开始加载学生统计数据...");
        
        const studentAddress = localStorage.getItem('userAddress');
        if (!studentAddress) {
          console.error("未找到学生地址");
          setStatsLoading(false);
          return;
        }
        
        console.log("正在获取学生课程和评价数据...");
        
        // 使用现有合约函数获取学生统计数据
        try {
          // 1. 获取学生加入的所有课程ID
          const studentCourses = await contractInstance.getStudentCourses(studentAddress);
          console.log("学生课程:", studentCourses);
          
          // 2. 获取学生的所有评价ID
          const studentEvals = await contractInstance.getStudentEvaluations(studentAddress);
          console.log("学生评价:", studentEvals);
          
          // 3. 计算已评价课程数量
          let evaluatedCount = 0;
          
          // 对每个课程，检查学生是否已评价
          const coursesCount = studentCourses.length;
          console.log("学生加入的课程总数:", coursesCount);
          
          for (let i = 0; i < coursesCount; i++) {
            const courseId = studentCourses[i];
            const hasEvaluated = await contractInstance.isStudentEvaluated(courseId, studentAddress);
            if (hasEvaluated) {
              evaluatedCount++;
            }
          }
          
          console.log("已评价课程数:", evaluatedCount);
          
          // 4. 计算未评价课程数
          const unevaluatedCount = coursesCount - evaluatedCount;
          console.log("未评价课程数:", unevaluatedCount);
          
          // 5. 获取评价总数
          const totalEvals = studentEvals.length;
          console.log("评价总数:", totalEvals);
          
          // 更新状态
          setEvaluatedCoursesCount(evaluatedCount);
          setUnevaluatedCoursesCount(unevaluatedCount);
          setTotalEvaluationsCount(totalEvals);
          
        } catch (contractErr) {
          console.error("合约调用失败:", contractErr);
          // 设置默认值，避免显示加载中状态
          setEvaluatedCoursesCount(0);
          setUnevaluatedCoursesCount(0);
          setTotalEvaluationsCount(0);
        }
        
        setStatsLoading(false);
      } catch (err) {
        console.error("加载学生统计数据失败:", err);
        setStatsLoading(false);
        // 设置默认值，避免显示加载中状态
        setEvaluatedCoursesCount(0);
        setUnevaluatedCoursesCount(0);
        setTotalEvaluationsCount(0);
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
        }
      } catch (error) {
        console.error('获取公告数据错误:', error);
        // 设置为空数组，避免显示加载状态
        setAnnouncements([]);
      } finally {
        setAnnouncementsLoading(false);
      }
    };

    checkUserAuth();
    fetchAnnouncements();
  }, [router]);
  
  // 刷新学生统计数据的函数
  const refreshStudentStatistics = async () => {
    if (contract) {
      await loadStudentStatistics(contract);
    }
  };
  
  // 处理登出
  const handleLogout = () => {
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
  
  // 头部菜单项
  const headerItems = [
    {
      key: 'logout',
      icon: React.createElement(LogoutOutlined),
      label: '退出登录',
      onClick: handleLogout,
    }
  ];

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          正在加载学生首页...
        </div>
      </div>
    );
  }
  
  // 将 ConfigProvider 包裹整个应用，并使用 defaultToken 代替直接使用 useToken
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8',
        },
      }}
    >
      <AntDesignContent 
        userData={userData} 
        handleLogout={handleLogout} 
        headerItems={headerItems}
        router={router}
        statsLoading={statsLoading}
        evaluatedCoursesCount={evaluatedCoursesCount}
        unevaluatedCoursesCount={unevaluatedCoursesCount}
        totalEvaluationsCount={totalEvaluationsCount}
        refreshStats={refreshStudentStatistics}
        announcements={announcements}
        announcementsLoading={announcementsLoading}
      />
    </ConfigProvider>
  );
}

// 将 Ant Design 组件分离到单独的组件中，避免在主组件中直接使用 useToken
function AntDesignContent({ 
  userData, 
  handleLogout, 
  headerItems, 
  router,
  statsLoading,
  evaluatedCoursesCount,
  unevaluatedCoursesCount,
  totalEvaluationsCount,
  refreshStats,
  announcements,
  announcementsLoading
}) {
  const {
    token: { colorBgContainer, borderRadiusLG, colorPrimary },
  } = theme.useToken();
  
  // 统计数据（动态数据）
  const stats = [
    { 
      title: '已评价课程', 
      value: statsLoading ? <Spin size="small" /> : evaluatedCoursesCount, 
      icon: <BookOutlined /> 
    },
    { 
      title: '未评价课程', 
      value: statsLoading ? <Spin size="small" /> : unevaluatedCoursesCount, 
      icon: <FormOutlined /> 
    },
    { 
      title: '总评价数', 
      value: statsLoading ? <Spin size="small" /> : totalEvaluationsCount, 
      icon: <CommentOutlined /> 
    },
  ];
  
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
            链评系统（ChainRate）- 学生端
          </div>
        </div>
        <div style={{ color: 'white', marginRight: '20px', display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '15px' }}>欢迎, {userData.name}</span>
          <UserAvatar color="#fff" />
        </div>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: colorBgContainer }}>
          <StudentSidebar defaultSelectedKey="1" defaultOpenKey="sub1" />
        </Sider>
        <Layout style={{ padding: '0 24px 24px' }}>
          <Breadcrumb
            items={[
              { title: '首页' },
              { title: '个人中心' },
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
                          boxShadow: '0 4px 8px rgba(26,115,232,0.2)'
                        }} 
                      />
                    ) : (
                      <Avatar 
                        size={100} 
                        icon={<UserOutlined />} 
                        style={{ 
                          backgroundColor: colorPrimary,
                          boxShadow: '0 4px 8px rgba(26,115,232,0.2)'
                        }} 
                      />
                    )}
                  </div>
                </Col>
                <Col xs={24} sm={18} md={18} lg={14}>
                  <h2 style={{ marginBottom: 16, fontSize: 24 }}>{userData.name} <Tag color="blue">学生</Tag></h2>
                  <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <GlobalOutlined style={{ marginRight: 8, color: colorPrimary }} />
                    <span style={{ wordBreak: 'break-all' }}><strong>钱包地址:</strong> {userData.address}</span>
                  </p>
                  <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <MailOutlined style={{ marginRight: 8, color: colorPrimary }} />
                    <span><strong>邮箱:</strong> {userData.email}</span>
                  </p>
                  <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <BankOutlined style={{ marginRight: 8, color: colorPrimary }} />
                    <span><strong>学院:</strong> {userData.college}</span>
                  </p>
                  <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <ReadOutlined style={{ marginRight: 8, color: colorPrimary }} />
                    <span><strong>专业:</strong> {userData.major}</span>
                  </p>
                  <p style={{ display: 'flex', alignItems: 'center' }}>
                    <NumberOutlined style={{ marginRight: 8, color: colorPrimary }} />
                    <span><strong>年级:</strong> {userData.grade}</span>
                  </p>
                </Col>
                <Col xs={24} sm={24} md={24} lg={6}>
                  <Row gutter={[16, 16]}>
                    {stats.map((stat, index) => (
                      <Col span={8} key={index}>
                        <Statistic 
                          title={stat.title}
                          value={stat.value}
                          prefix={React.cloneElement(stat.icon, { style: { color: colorPrimary } })}
                          valueStyle={{ color: colorPrimary }}
                        />
                      </Col>
                    ))}
                  </Row>
                </Col>
              </Row>
            </Card>

            {/* 功能区 */}
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>功能区</h2>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  onClick={() => router.push('/studentViewCourses')}
                  cover={
                    <div style={{ padding: '24px 0 0 0', textAlign: 'center' }}>
                      <BookOutlined style={{ fontSize: 48, color: colorPrimary }} />
                    </div>
                  }
                  style={{ height: '100%' }}
                >
                  <Meta
                    title="查看课程"
                    description="浏览可评价的课程列表"
                  />
                  <div style={{ marginTop: 16 }}>
                    <Button type="primary" ghost>进入</Button>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  onClick={() => router.push('/studentMyEvaluation')}
                  cover={
                    <div style={{ padding: '24px 0 0 0', textAlign: 'center' }}>
                      <CommentOutlined style={{ fontSize: 48, color: colorPrimary }} />
                    </div>
                  }
                  style={{ height: '100%' }}
                >
                  <Meta
                    title="我的评价"
                    description="查看已提交的课程评价"
                  />
                  <div style={{ marginTop: 16 }}>
                    <Button type="primary" ghost>进入</Button>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  onClick={() => router.push('/submit-evaluation')}
                  cover={
                    <div style={{ padding: '24px 0 0 0', textAlign: 'center' }}>
                      <FormOutlined style={{ fontSize: 48, color: colorPrimary }} />
                    </div>
                  }
                  style={{ height: '100%' }}
                >
                  <Meta
                    title="提交评价"
                    description="为已选课程提交评价"
                  />
                  <div style={{ marginTop: 16 }}>
                    <Button type="primary" ghost>进入</Button>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 系统公告 */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <RocketOutlined style={{ marginRight: 8, color: colorPrimary }} />
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
  );
} 