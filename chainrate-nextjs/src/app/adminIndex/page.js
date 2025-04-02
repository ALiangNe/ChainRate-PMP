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
  TeamOutlined, 
  BookOutlined, 
  CommentOutlined, 
  LogoutOutlined,
  MailOutlined,
  GlobalOutlined,
  RocketOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  AppstoreAddOutlined,
  BarChartOutlined,
  PieChartOutlined,
  SettingOutlined,
  UserAddOutlined,
  ProfileOutlined,
  AuditOutlined,
  SafetyOutlined
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

const { Header, Content, Sider } = Layout;
const { Meta } = Card;

export default function AdminIndexPage() {
  const router = useRouter();
  
  // 提前调用 useToken，确保Hook顺序一致
  const { token } = theme.useToken();
  const { colorBgContainer, borderRadiusLG, colorPrimary } = token;
  
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
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalEvaluations, setTotalEvaluations] = useState(0);

  useEffect(() => {
    // 确保代码仅在客户端执行
    if (typeof window === 'undefined') return;

    // 检查用户是否已登录并且是管理员角色
    const checkUserAuth = () => {
      try {
        console.log('检查管理员认证...');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userRole = localStorage.getItem('userRole');
          
        console.log('认证状态:', { isLoggedIn, userRole });
        
        if (!isLoggedIn || userRole !== 'admin') {
          console.log('未认证为管理员，重定向到登录页面');
          router.push('/login');
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
          
        console.log('管理员认证成功，初始化Web3连接');
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
        
        // 获取统计数据
        await loadStatistics(chainRateContract);
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setLoading(false);
      }
    };
    
    // 加载统计数据
    const loadStatistics = async (contractInstance) => {
      try {
        setStatsLoading(true);
        console.log("开始加载统计数据...");
        
        // 获取学生总数
        const students = await contractInstance.getAllStudents();
        console.log("学生总数:", students.length);
        
        // 获取教师总数
        const teachers = await contractInstance.getAllTeachers();
        console.log("教师总数:", teachers.length);
        
        // 计算用户总数
        const userCount = students.length + teachers.length;
        setTotalUsers(userCount);
        
        // 获取课程总数
        // 注意：合约中可能没有直接获取课程总数的方法，这里使用courseCount状态变量
        const coursesCount = await contractInstance.courseCount();
        console.log("课程总数:", Number(coursesCount));
        setTotalCourses(Number(coursesCount));
        
        // 获取评价总数
        // 注意：合约中可能没有直接获取评价总数的方法，这里使用evaluationCount状态变量
        const evalsCount = await contractInstance.evaluationCount();
        console.log("评价总数:", Number(evalsCount));
        setTotalEvaluations(Number(evalsCount));
        
        setStatsLoading(false);
      } catch (err) {
        console.error("加载统计数据失败:", err);
        setStatsLoading(false);
      }
    };

    // 添加延迟执行验证，避免客户端渲染问题
    const timer = setTimeout(() => {
      checkUserAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  // 添加刷新统计数据的函数
  const refreshStatistics = async () => {
    if (!contract) return;
    
    try {
      await loadStatistics(contract);
    } catch (err) {
      console.error("刷新统计数据失败:", err);
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

  // 侧边栏菜单项
  const siderItems = [
    {
      key: 'sub1',
      icon: <UserOutlined />,
      label: '系统管理',
      children: [
        {
          key: '1',
          label: '管理员主页',
        },
        {
          key: '2',
          label: '系统设置',
          onClick: () => router.push('/adminSettings')
        }
      ],
    },
    {
      key: 'sub2',
      icon: <TeamOutlined />,
      label: '用户管理',
      children: [
        {
          key: '3',
          label: '教师管理',
          onClick: () => router.push('/adminGetTeacherList')
        },
        {
          key: '4',
          label: '学生管理',
          onClick: () => router.push('/adminGetStudentList')
        }
      ],
    },
    {
      key: 'sub3',
      icon: <BookOutlined />,
      label: '课程管理',
      children: [
        {
          key: '5',
          label: '所有课程',
          onClick: () => router.push('/adminCourseManagement')
        }
      ],
    },
    {
      key: 'sub4',
      icon: <CommentOutlined />,
      label: '评价管理',
      children: [
        {
          key: '6',
          label: '评价审核',
          onClick: () => router.push('/adminEvaluationReview')
        },
        {
          key: '7',
          label: '评价统计',
          onClick: () => router.push('/adminEvaluationStats')
        }
      ],
    },
    {
      key: 'sub5',
      icon: <BarChartOutlined />,
      label: '数据分析',
      children: [
        {
          key: '8',
          label: '系统概览',
          onClick: () => router.push('/adminDashboard')
        },
        {
          key: '9',
          label: '详细分析',
          onClick: () => router.push('/adminAnalytics')
        }
      ],
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ padding: '100px', background: 'rgba(0,0,0,0.01)', borderRadius: '4px' }}>
          正在加载管理员首页...
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff', // 使用蓝色作为管理员端主题色
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
              链评系统（ChainRate）- 管理员端
            </div>
          </div>
          <div style={{ color: 'white', marginRight: '20px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '15px' }}>欢迎, {userData.name}</span>
            <UserAvatar color="#fff" />
          </div>
        </Header>
        <Layout>
          <Sider width={200} style={{ background: colorBgContainer }}>
            <Menu
              mode="inline"
              defaultSelectedKeys={['1']}
              defaultOpenKeys={['sub1']}
              style={{ height: '100%', borderRight: 0 }}
              items={siderItems}
            />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[{ title: '首页' }, { title: '系统管理' }]}
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
              {/* 管理员信息区域 */}
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
                            boxShadow: '0 4px 8px rgba(22,119,255,0.2)'
                          }} 
                        />
                      ) : (
                        <Avatar 
                          size={100} 
                          icon={<UserOutlined />} 
                          style={{ 
                            backgroundColor: '#1677ff',
                            boxShadow: '0 4px 8px rgba(22,119,255,0.2)'
                          }} 
                        />
                      )}
                    </div>
                  </Col>
                  <Col xs={24} sm={18} md={18} lg={14}>
                    <h2 style={{ marginBottom: 16, fontSize: 24 }}>{userData.name} <Tag color="blue">系统管理员</Tag></h2>
                    <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <GlobalOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                      <span style={{ wordBreak: 'break-all' }}><strong>钱包地址:</strong> {userData.address}</span>
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <MailOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                      <span><strong>邮箱:</strong> {userData.email || 'admin@chainrate.edu'}</span>
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <TeamOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                      <span><strong>学院:</strong> {userData.college || '系统管理部门'}</span>
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <BookOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                      <span><strong>专业:</strong> {userData.major || '系统管理'}</span>
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center' }}>
                      <SafetyOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                      <span><strong>权限级别:</strong> {userData.grade || '系统超级管理员'}</span>
                    </p>
                  </Col>
                  <Col xs={24} sm={24} md={24} lg={6}>
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Statistic 
                          title="用户总数"
                          value={statsLoading ? <Spin size="small" /> : totalUsers}
                          prefix={<TeamOutlined />}
                          valueStyle={{ color: '#1677ff' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="课程总数"
                          value={statsLoading ? <Spin size="small" /> : totalCourses}
                          prefix={<BookOutlined />}
                          valueStyle={{ color: '#1677ff' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="评价总数"
                          value={statsLoading ? <Spin size="small" /> : totalEvaluations}
                          prefix={<CommentOutlined />}
                          valueStyle={{ color: '#1677ff' }}
                        />
                      </Col>
                    </Row>
                  </Col>
                </Row>
              </Card>

              {/* 功能区 */}
              <h2 style={{ fontSize: 20, marginBottom: 16 }}>系统管理功能</h2>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Card
                    hoverable
                    className={styles.functionCardEnhanced}
                    onClick={() => router.push('/adminTeacherManagement')}
                    cover={
                      <div style={{ padding: '24px 0 0 0', textAlign: 'center' }}>
                        <UserAddOutlined style={{ fontSize: 48, color: '#1677ff' }} />
                      </div>
                    }
                    style={{ height: '100%' }}
                  >
                    <Meta
                      title="用户管理"
                      description="管理系统中的教师和学生用户"
                    />
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" ghost>管理用户</Button>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} md={6}>
                  <Card
                    hoverable
                    className={styles.functionCardEnhanced}
                    onClick={() => router.push('/adminCourseManagement')}
                    cover={
                      <div style={{ padding: '24px 0 0 0', textAlign: 'center' }}>
                        <BookOutlined style={{ fontSize: 48, color: '#1677ff' }} />
                      </div>
                    }
                    style={{ height: '100%' }}
                  >
                    <Meta
                      title="课程管理"
                      description="查看和管理系统中的所有课程"
                    />
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" ghost>管理课程</Button>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} md={6}>
                  <Card
                    hoverable
                    className={styles.functionCardEnhanced}
                    onClick={() => router.push('/adminEvaluationReview')}
                    cover={
                      <div style={{ padding: '24px 0 0 0', textAlign: 'center' }}>
                        <AuditOutlined style={{ fontSize: 48, color: '#1677ff' }} />
                      </div>
                    }
                    style={{ height: '100%' }}
                  >
                    <Meta
                      title="评价审核"
                      description="审核学生提交的评价内容"
                    />
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" ghost>审核评价</Button>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} md={6}>
                  <Card
                    hoverable
                    className={styles.functionCardEnhanced}
                    onClick={() => router.push('/adminDashboard')}
                    cover={
                      <div style={{ padding: '24px 0 0 0', textAlign: 'center' }}>
                        <PieChartOutlined style={{ fontSize: 48, color: '#1677ff' }} />
                      </div>
                    }
                    style={{ height: '100%' }}
                  >
                    <Meta
                      title="系统统计"
                      description="查看系统整体使用数据和统计"
                    />
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" ghost>查看统计</Button>
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* 系统公告与状态 */}
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <SafetyCertificateOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                    <span>系统状态与通知</span>
                  </div>
                }
                style={{ marginTop: 24 }}
                variant="outlined"
              >
                <div style={{ display: 'flex', alignItems: 'start', marginBottom: 12 }}>
                  <ClockCircleOutlined style={{ marginRight: 8, marginTop: 4, color: '#8c8c8c' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>系统升级通知</p>
                    <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>2023-06-10</p>
                    <p>链评系统将于本周日凌晨2:00-4:00进行系统升级维护，期间系统可能暂时无法访问，请安排好相关工作。</p>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', alignItems: 'start' }}>
                  <ClockCircleOutlined style={{ marginRight: 8, marginTop: 4, color: '#8c8c8c' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>管理员审核提醒</p>
                    <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>2023-06-08</p>
                    <p>目前有5条新评价和3条疑似违规内容需要管理员审核，请及时处理！</p>
                  </div>
                </div>
              </Card>

              {/* 系统活动记录 */}
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ProfileOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                    <span>最近系统活动</span>
                  </div>
                }
                style={{ marginTop: 24 }}
                variant="outlined"
              >
                <div style={{ display: 'flex', alignItems: 'start', marginBottom: 12 }}>
                  <ClockCircleOutlined style={{ marginRight: 8, marginTop: 4, color: '#8c8c8c' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>新教师账号注册</p>
                    <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>2023-06-09 15:32</p>
                    <p>教师"张明"完成注册并认证，等待管理员审核。</p>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', alignItems: 'start', marginBottom: 12 }}>
                  <ClockCircleOutlined style={{ marginRight: 8, marginTop: 4, color: '#8c8c8c' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>系统安全警告</p>
                    <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>2023-06-09 10:15</p>
                    <p>检测到多次异常登录尝试，IP地址已被临时封禁。</p>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', alignItems: 'start' }}>
                  <ClockCircleOutlined style={{ marginRight: 8, marginTop: 4, color: '#8c8c8c' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>学期评价统计完成</p>
                    <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>2023-06-08 18:40</p>
                    <p>2023春季学期评价数据统计完成，可在统计分析页面查看详情。</p>
                  </div>
                </div>
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