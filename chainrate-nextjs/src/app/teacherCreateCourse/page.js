'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import styles from './page.module.css';
import React from 'react';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  LogoutOutlined,
  ArrowLeftOutlined,
  BarChartOutlined,
  CalendarOutlined,
  EditOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  SendOutlined,
  BulbOutlined,
  SafetyOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  SmileOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { 
  Breadcrumb, 
  Layout, 
  Menu, 
  ConfigProvider, 
  Form,
  Input,
  DatePicker,
  Button,
  Alert,
  Tooltip,
  Space,
  Card,
  Typography,
  Divider,
  Spin,
  Badge,
  Tag,
  Avatar
} from 'antd';
import UserAvatar from '../components/UserAvatar';

const { Header, Content, Sider } = Layout;
const { RangePicker } = DatePicker;

export default function CreateCoursePage() {
  const router = useRouter();
  
  // 用户身份信息
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
  
  // 课程表单数据
  const [formData, setFormData] = useState({
    courseName: '',
    startTime: '',
    endTime: ''
  });
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    // 检查用户是否已登录并且是教师角色
    const checkUserAuth = () => {
      try {
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
          role: userRole,
          email: localStorage.getItem('userEmail') || '',
          college: localStorage.getItem('userCollege') || '',
          major: localStorage.getItem('userMajor') || '',
          grade: localStorage.getItem('userGrade') || '',
          avatar: localStorage.getItem('userAvatar') || ''
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
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
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
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userCollege');
    localStorage.removeItem('userMajor');
    localStorage.removeItem('userGrade');
    localStorage.removeItem('userAvatar');
    router.push('/login');
  };

  const handleSubmit = async (values) => {
    // 重置状态
    setError('');
    setSuccess('');
    setSubmitting(true);
    
    try {
      // 转换时间为Unix时间戳（秒）
      const startTimestamp = Math.floor(values.timeRange[0].valueOf() / 1000);
      const endTimestamp = Math.floor(values.timeRange[1].valueOf() / 1000);
      
      // 调用合约创建课程
      const tx = await contract.createCourse(
        values.courseName,
        startTimestamp,
        endTimestamp
      );
      
      // 等待交易完成
      const receipt = await tx.wait();
      console.log('交易哈希:', receipt.hash);
      
      // 查找事件以获取新课程ID
      const event = receipt.logs
        .map(log => {
          try {
            return contract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === 'CourseCreated');
      
      const courseId = event ? event.args[0] : null;
      
      setSuccess(`课程 "${values.courseName}" 创建成功！课程ID: ${courseId}`);
      
      // 重置表单
      form.resetFields();
      
    } catch (err) {
      console.error("创建课程失败:", err);
      
      // 特殊处理用户拒绝的情况
      if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        setError('您取消了交易。如需继续创建课程，请重新提交并在MetaMask中确认。');
      } else {
        setError('创建课程失败: ' + (err.message || err));
      }
    } finally {
      setSubmitting(false);
    }
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
          onClick: () => router.push('/teacherIndex')
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
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <Spin size="large" tip="加载中..." className={styles.loadingSpin} />
          <Typography.Title level={4} className={styles.loadingTitle}>
            正在连接区块链...
          </Typography.Title>
          <Typography.Text type="secondary" className={styles.loadingSubtitle}>
            准备创建您的课程评价
          </Typography.Text>
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
              defaultSelectedKeys={['2']}
              defaultOpenKeys={['sub2']}
              style={{ height: '100%', borderRight: 0 }}
              items={siderItems}
            />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页', onClick: () => router.push('/teacherIndex') },
                { title: '课程管理' },
                { title: '创建课程' }
              ]}
              style={{ margin: '16px 0' }}
            />
            <Content
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div className={styles.pageHeader}>
                <div className={styles.pageHeaderLeft}>
                  <Badge color="#34a853" className={styles.pageHeaderBadge} />
                  <Typography.Title level={2} className={styles.pageTitle}>
                    创建新课程
                  </Typography.Title>
                </div>
                <div className={styles.pageHeaderRight}>
                  <Tag color="#34a853" icon={<BookOutlined />}>课程管理</Tag>
                </div>
              </div>
              
              <Card 
                className={styles.infoBoxCard}
                title={
                  <div className={styles.infoBoxTitle}>
                    <BulbOutlined className={styles.infoBoxIcon} />
                    <span>创建课程须知</span>
                  </div>
                }
                bordered={false}
              >
                <div className={styles.infoBoxContent}>
                  <div className={styles.infoItem}>
                    <SafetyOutlined className={styles.infoItemIcon} />
                    <Typography.Text>创建课程会调用智能合约，需要支付少量的Gas费用</Typography.Text>
                  </div>
                  <div className={styles.infoItem}>
                    <ClockCircleOutlined className={styles.infoItemIcon} />
                    <Typography.Text>请设置合理的评价时间范围，学生只能在该时间范围内提交评价</Typography.Text>
                  </div>
                  <div className={styles.infoItem}>
                    <TeamOutlined className={styles.infoItemIcon} />
                    <Typography.Text>创建后的课程可以在"我的课程"中管理</Typography.Text>
                  </div>
                </div>
              </Card>
              
              {error && (
                <Alert
                  message={<Typography.Text strong>错误提示</Typography.Text>}
                  description={error}
                  type="error"
                  showIcon
                  className={styles.alertError}
                  closable
                  onClose={() => setError('')}
                />
              )}
              
              {success && (
                <Alert
                  message={<Typography.Text strong>操作成功</Typography.Text>}
                  description={
                    <div className={styles.successContent}>
                      <div className={styles.successText}>{success}</div>
                      <div className={styles.successActions}>
                        <Button 
                          type="primary" 
                          size="small" 
                          icon={<EditOutlined />}
                          onClick={() => router.push(`/teacherManageCourse/${success.match(/课程ID: (\d+)/)?.[1]}`)}
                        >
                          管理课程
                        </Button>
                      </div>
                    </div>
                  }
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  className={styles.alertSuccess}
                  closable
                  onClose={() => setSuccess('')}
                />
              )}
              
              <Card 
                className={styles.formCard}
                title={
                  <div className={styles.formCardTitle}>
                    <div className={styles.formCardIcon}>
                      <EditOutlined className={styles.formCardIconInner} />
                    </div>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      课程信息
                    </Typography.Title>
                  </div>
                }
                bordered={false}
              >
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  disabled={submitting}
                  className={styles.modernForm}
                >
                  <Form.Item
                    name="courseName"
                    label={
                      <span className={styles.formLabel}>
                        <BookOutlined /> 课程名称
                      </span>
                    }
                    rules={[{ required: true, message: '请输入课程名称' }]}
                  >
                    <Input 
                      placeholder="请输入课程名称" 
                      prefix={<BookOutlined style={{ color: '#bfbfbf' }} />}
                      size="large"
                      className={styles.modernInput}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    name="timeRange"
                    label={
                      <span className={styles.formLabel}>
                        <CalendarOutlined /> 评价时间范围
                      </span>
                    }
                    tooltip={{ 
                      title: '学生只能在设定的时间范围内提交课程评价', 
                      icon: <InfoCircleOutlined style={{ color: '#34a853' }} /> 
                    }}
                    rules={[{ required: true, message: '请选择评价时间范围' }]}
                  >
                    <RangePicker 
                      showTime 
                      format="YYYY-MM-DD HH:mm:ss" 
                      style={{ width: '100%' }}
                      size="large"
                      className={styles.modernDatePicker}
                      placeholder={['开始时间', '结束时间']}
                      suffixIcon={<ClockCircleOutlined style={{ color: '#34a853' }} />}
                    />
                  </Form.Item>
                  
                  <Divider dashed className={styles.formDivider} />
                  
                  <Form.Item>
                    <div className={styles.formActions}>
                      <Button 
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                        icon={<SendOutlined />}
                        size="large"
                        className={styles.submitButton}
                      >
                        创建课程
                      </Button>
                      <Button 
                        onClick={() => router.push('/teacherIndex')}
                        disabled={submitting}
                        icon={<HomeOutlined />}
                        size="large"
                        className={styles.cancelButton}
                      >
                        返回首页
                      </Button>
                    </div>
                  </Form.Item>
                </Form>
              </Card>
            </Content>
          </Layout>
        </Layout>
        <div className={styles.footer}>
          <div className={styles.footerContent}>
            <div className={styles.footerLogo}>
              <Avatar 
                src="/images/logo1.png" 
                size={32} 
                style={{ marginRight: 8 }} 
              />
              <Typography.Text strong>链评系统</Typography.Text>
            </div>
            <div className={styles.footerText}>
              <Typography.Text type="secondary">
                © 2023 链评系统 - 基于区块链的教学评价系统
              </Typography.Text>
            </div>
            <div className={styles.footerLinks}>
              <Button type="link" size="small">平台简介</Button>
              <Button type="link" size="small">使用帮助</Button>
              <Button type="link" size="small">联系我们</Button>
            </div>
          </div>
        </div>
      </Layout>
    </ConfigProvider>
  );
} 