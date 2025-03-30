'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import React from 'react';
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
  TrophyOutlined
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

const { Header, Content, Sider } = Layout;
const { Meta } = Card;

export default function StudentIndexPage() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
  });
  const [loading, setLoading] = useState(true);
  
  // 将theme.useToken()移到条件渲染后使用

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
        setLoading(false);
      } catch (error) {
        console.error("Authentication check error:", error);
        setLoading(false); // 确保即使出错也会停止加载状态
      }
    };

    checkUserAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userRoleHash');
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
    return <div className={styles.container}>正在加载...</div>;
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
      />
    </ConfigProvider>
  );
}

// 将 Ant Design 组件分离到单独的组件中，避免在主组件中直接使用 useToken
function AntDesignContent({ userData, handleLogout, headerItems, siderItems, router }) {
  const {
    token: { colorBgContainer, borderRadiusLG, colorPrimary },
  } = theme.useToken();
  
  // 统计数据（示例数据）
  const stats = [
    { title: '已评价课程', value: 8, icon: <BookOutlined /> },
    { title: '总评价数', value: 12, icon: <CommentOutlined /> },
    { title: '完成率', value: '85%', icon: <TrophyOutlined /> },
  ];
  
  return (
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
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {/* 个人信息区域 - 美化版 */}
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
                        backgroundColor: colorPrimary,
                        boxShadow: '0 4px 8px rgba(26,115,232,0.2)'
                      }} 
                    />
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
                    <span><strong>邮箱:</strong> student@example.com</span>
                  </p>
                  <p style={{ display: 'flex', alignItems: 'center' }}>
                    <TeamOutlined style={{ marginRight: 8, color: colorPrimary }} />
                    <span><strong>学院:</strong> 计算机科学与技术学院</span>
                  </p>
                </Col>
                <Col xs={24} sm={24} md={24} lg={6}>
                  <Row gutter={[16, 16]}>
                    {stats.map((stat, index) => (
                      <Col span={8} key={index}>
                        <Statistic 
                          title={stat.title}
                          value={stat.value}
                          prefix={stat.icon}
                          valueStyle={{ color: colorPrimary }}
                        />
                      </Col>
                    ))}
                  </Row>
                </Col>
              </Row>
            </Card>

            {/* 功能区 - 美化版 */}
            <h2 style={{ fontSize: 20, marginBottom: 16 }}>功能区</h2>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  className={styles.functionCardEnhanced}
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
                    description="浏览所有可评价的课程，查看课程详情及评价要求"
                  />
                  <div style={{ marginTop: 16 }}>
                    <Button type="primary" ghost>立即查看</Button>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  className={styles.functionCardEnhanced}
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
                    description="查看我已提交的所有课程评价历史记录与状态"
                  />
                  <div style={{ marginTop: 16 }}>
                    <Button type="primary" ghost>查看评价</Button>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  className={styles.functionCardEnhanced}
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
                    description="为你的课程提交新的评价，记录你的学习体验"
                  />
                  <div style={{ marginTop: 16 }}>
                    <Button type="primary" ghost>立即评价</Button>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 系统公告或其他内容可以添加在这里 */}
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
                  <p style={{ margin: 0, fontWeight: 'bold' }}>系统更新通知</p>
                  <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>2023-05-15</p>
                  <p>链评系统已更新到最新版本，新增了评价数据分析功能，欢迎体验！</p>
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', alignItems: 'start' }}>
                <ClockCircleOutlined style={{ marginRight: 8, marginTop: 4, color: '#8c8c8c' }} />
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>评价活动通知</p>
                  <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>2023-05-10</p>
                  <p>本学期课程评价将于6月15日截止，请及时完成所有课程评价！</p>
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