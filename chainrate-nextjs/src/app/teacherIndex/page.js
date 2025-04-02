'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';
import React from 'react';
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
  PieChartOutlined
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
  Button
} from 'antd';
import UserAvatar from '../components/UserAvatar';

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
        console.log('教师认证成功，停止加载状态');
        setLoading(false);
      } catch (error) {
        console.error("Authentication check error:", error);
        setLoading(false); // 确保即使出错也会停止加载状态
      }
    };

    // 添加延迟执行验证，避免客户端渲染问题
    const timer = setTimeout(() => {
    checkUserAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

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
      icon: <BookOutlined />,
      label: '课程管理',
      children: [
        {
          key: '2',
          label: '创建课程',
          onClick: () => router.push('/teacherCreateCourse')
        },
        {
          key: '3',
          label: '我的课程',
          onClick: () => router.push('/teacherViewCourse')
        }
      ],
    },
    {
      key: 'sub3',
      icon: <CommentOutlined />,
      label: '评价管理',
      children: [
        {
          key: '4',
          label: '查看评价',
          onClick: () => router.push('/teacherViewEvaluation')
        }
      ],
    },
    {
      key: 'sub4',
      icon: <BarChartOutlined />,
      label: '数据分析',
      children: [
        {
          key: '5',
          label: '统计分析',
          onClick: () => router.push('/statistics')
        }
      ],
    }
  ];

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          正在加载教师首页...
        </div>
      </div>
    );
  }

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
                      <Avatar 
                        size={100} 
                        icon={<UserOutlined />} 
                        style={{ 
                          backgroundColor: '#34a853',
                          boxShadow: '0 4px 8px rgba(52,168,83,0.2)'
                        }} 
                      />
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
                      <span><strong>邮箱:</strong> teacher@example.com</span>
                    </p>
                    <p style={{ display: 'flex', alignItems: 'center' }}>
                      <TeamOutlined style={{ marginRight: 8, color: '#34a853' }} />
                      <span><strong>学院:</strong> 计算机科学与技术学院</span>
                    </p>
                  </Col>
                  <Col xs={24} sm={24} md={24} lg={6}>
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Statistic 
                          title="已创建课程"
                          value={5}
                          prefix={<BookOutlined />}
                          valueStyle={{ color: '#34a853' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="学生人数"
                          value={120}
                          prefix={<TeamOutlined />}
                          valueStyle={{ color: '#34a853' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="收到评价"
                          value={45}
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
                <div style={{ display: 'flex', alignItems: 'start', marginBottom: 12 }}>
                  <ClockCircleOutlined style={{ marginRight: 8, marginTop: 4, color: '#8c8c8c' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>教师评价分析功能上线</p>
                    <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>2023-05-15</p>
                    <p>链评系统已上线教师评价分析功能，可视化展示学生评价数据，帮助您更好地改进教学。</p>
                  </div>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ display: 'flex', alignItems: 'start' }}>
                  <ClockCircleOutlined style={{ marginRight: 8, marginTop: 4, color: '#8c8c8c' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>评价活动通知</p>
                    <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>2023-05-10</p>
                    <p>本学期课程评价将于6月15日截止，请及时提醒学生完成课程评价！</p>
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