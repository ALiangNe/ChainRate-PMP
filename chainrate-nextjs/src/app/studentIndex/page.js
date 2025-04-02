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

    // 添加延迟执行验证，避免客户端渲染问题
    const timer = setTimeout(() => {
      checkUserAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  // 刷新学生统计数据
  const refreshStudentStatistics = async () => {
    if (!contract) return;
    
    try {
      await loadStudentStatistics(contract);
    } catch (err) {
      console.error("刷新学生统计数据失败:", err);
    }
  };

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

  // 顶部菜单项
  const headerItems = [
    {
      key: '1',
      label: '链评系统（ChainRate）',
    }
  ];

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
        siderItems={siderItems} 
        router={router}
        statsLoading={statsLoading}
        evaluatedCoursesCount={evaluatedCoursesCount}
        unevaluatedCoursesCount={unevaluatedCoursesCount}
        totalEvaluationsCount={totalEvaluationsCount}
        refreshStats={refreshStudentStatistics}
      />
    </ConfigProvider>
  );
}

// 将 Ant Design 组件分离到单独的组件中，避免在主组件中直接使用 useToken
function AntDesignContent({ 
  userData, 
  handleLogout, 
  headerItems, 
  siderItems, 
  router,
  statsLoading,
  evaluatedCoursesCount,
  unevaluatedCoursesCount,
  totalEvaluationsCount,
  refreshStats
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
              <div style={{ display: 'flex', alignItems: 'start', marginBottom: 12 }}>
                <ClockCircleOutlined style={{ marginRight: 8, marginTop: 4, color: '#8c8c8c' }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>课程评价入口开放</p>
                  <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>2023-05-15</p>
                  <p>本学期课程评价系统已开放，请同学们及时完成课程评价，您的反馈对我们非常重要！</p>
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', alignItems: 'start' }}>
                <ClockCircleOutlined style={{ marginRight: 8, marginTop: 4, color: '#8c8c8c' }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>评价活动通知</p>
                  <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>2023-05-10</p>
                  <p>本学期课程评价将于6月15日截止，请及时完成所有课程的评价工作！</p>
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
  );
} 