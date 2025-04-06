'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../../contracts/ChainRate.json';
import ChainRateAddress from '../../../contracts/ChainRate-address.json';
import styles from './page.module.css';
import React from 'react';
import Image from 'next/image';
import UserAvatar from '../../components/UserAvatar';
import StudentSidebar from '../../components/StudentSidebar';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  FormOutlined, 
  LogoutOutlined,
  TeamOutlined,
  StarOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  FileTextOutlined
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
  Button, 
  Tag, 
  Empty, 
  Spin, 
  Alert,
  Tooltip,
  Divider,
  Typography,
  Statistic,
  Rate,
  List,
  Avatar,
  Space,
  Progress
} from 'antd';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function CourseDetailPage({ params }) {
  const router = useRouter();
  
  // 使用React.use()解包params参数，避免警告
  const resolvedParams = React.use(params);
  const courseId = resolvedParams.id;
  
  // 提前调用 useToken，确保Hook顺序一致
  const { token } = theme.useToken();
  const { colorBgContainer, borderRadiusLG, colorPrimary } = token;
  
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
  
  // 课程数据
  const [course, setCourse] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const [canEvaluate, setCanEvaluate] = useState(false);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [error, setError] = useState('');
  const [joinCoursePending, setJoinCoursePending] = useState(false);
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
        
        // 加载课程详情和评价
        await loadCourseDetails(chainRateContract, await signer.getAddress(), courseId);
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router, courseId]);
  
  // 加载课程详情和评价
  const loadCourseDetails = async (contractInstance, studentAddress, courseId) => {
    try {
      // 检查课程是否存在
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
        
        // 检查学生是否已加入课程
        const studentJoined = await contractInstance.isStudentJoined(courseId, studentAddress);
        setIsJoined(studentJoined);
        
        // 检查学生是否已评价课程
        const evaluated = await contractInstance.hasEvaluated(courseId, studentAddress);
        setHasEvaluated(evaluated);
        
        // 检查当前是否在评价期间内
        const now = Math.floor(Date.now() / 1000);
        const canEvaluate = studentJoined && 
                          now >= Number(course.startTime) && 
                          now <= Number(course.endTime) && 
                          !evaluated;
        setCanEvaluate(canEvaluate);
        
        // 更新课程信息
        setCourse({
          id: Number(courseId),
          name: course.name,
          teacher: course.teacher,
          teacherName: teacherName,
          startTime: new Date(Number(course.startTime) * 1000),
          endTime: new Date(Number(course.endTime) * 1000),
          isActive: course.isActive,
          studentCount: Number(course.studentCount),
          averageRating: averageRating
        });
        
        // 加载课程评价
        await loadCourseEvaluations(contractInstance, courseId);
      } catch (error) {
        console.error(`获取课程 ${courseId} 失败:`, error);
        setError(`课程 ID ${courseId} 不存在或无法访问`);
      }
    } catch (err) {
      console.error("加载课程详情失败:", err);
      setError('获取课程详情失败: ' + (err.message || err));
    }
  };
  
  // 加载课程评价
  const loadCourseEvaluations = async (contractInstance, courseId) => {
    setLoadingEvaluations(true);
    
    try {
      // 获取课程的评价ID列表
      const evaluationIds = await contractInstance.getCourseEvaluations(courseId);
      
      // 获取评价详情
      const evaluationsList = [];
      for (let i = 0; i < evaluationIds.length; i++) {
        const evalId = evaluationIds[i];
        try {
          const evaluation = await contractInstance.getEvaluationDetails(evalId);
          
          // 获取学生姓名
          let studentName = "未知";
          if (!evaluation.isAnonymous) {
            try {
              const studentInfo = await contractInstance.getUserInfo(evaluation.student);
              studentName = studentInfo[0]; // 学生姓名
            } catch (error) {
              console.warn(`获取学生信息失败: ${error.message}`);
            }
          }
          
          evaluationsList.push({
            id: Number(evaluation.id),
            student: evaluation.student,
            studentName: evaluation.isAnonymous ? "匿名学生" : studentName,
            courseId: Number(evaluation.courseId),
            timestamp: new Date(Number(evaluation.timestamp) * 1000),
            contentHash: evaluation.contentHash,
            isAnonymous: evaluation.isAnonymous,
            rating: Number(evaluation.rating),
            isActive: evaluation.isActive
          });
        } catch (error) {
          console.warn(`获取评价 ${evalId} 失败:`, error);
        }
      }
      
      // 按时间降序排序评价（最新的在前）
      evaluationsList.sort((a, b) => b.timestamp - a.timestamp);
      
      setEvaluations(evaluationsList);
    } catch (err) {
      console.error("加载课程评价失败:", err);
      setError('获取课程评价失败: ' + (err.message || err));
    } finally {
      setLoadingEvaluations(false);
    }
  };
  
  // 加入课程
  const handleJoinCourse = async () => {
    setError('');
    setSuccessMessage('');
    setJoinCoursePending(true);
    
    try {
      // 调用合约加入课程
      const tx = await contract.joinCourse(courseId);
      
      // 等待交易确认
      await tx.wait();
      
      // 更新状态
      setIsJoined(true);
      setCourse(prev => ({
        ...prev,
        studentCount: prev.studentCount + 1
      }));
      
      // 检查当前是否在评价期间内
      const now = Math.floor(Date.now() / 1000);
      if (course && now >= course.startTime && now <= course.endTime) {
        setCanEvaluate(true);
      }
      
      setSuccessMessage(`成功加入课程 "${course?.name}"`);
      
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
      setJoinCoursePending(false);
    }
  };
  
  // 前往评价页面
  const handleEvaluateCourse = () => {
    router.push(`/studentSubmitEvaluation/${courseId}`);
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
  const getCourseStatus = () => {
    if (!course) return { status: '未知', color: 'default' };
    
    const now = new Date();
    if (now < course.startTime) {
      return { status: '未开始', color: 'default' };
    } else if (now >= course.startTime && now <= course.endTime) {
      return { status: '评价中', color: 'processing' };
    } else {
      return { status: '已结束', color: 'default' };
    }
  };
  
  // 返回上一页
  const goBack = () => {
    router.push('/studentViewCourses');
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中，请稍候...">
          <div style={{ padding: '100px', background: 'rgba(0,0,0,0.01)', borderRadius: '4px' }} />
        </Spin>
      </div>
    );
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
            <StudentSidebar defaultSelectedKey="2" defaultOpenKey="sub2" />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页', onClick: () => router.push('/studentIndex'), className: 'clickable-breadcrumb' },
                { title: '课程列表', onClick: () => router.push('/studentViewCourses'), className: 'clickable-breadcrumb' },
                { title: course?.name || '课程详情' }
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
              {error && (
                <Alert
                  message="错误"
                  description={error}
                  type="error"
                  showIcon
                  style={{ marginBottom: '20px' }}
                  closable
                  onClose={() => setError('')}
                />
              )}
              
              {successMessage && (
                <Alert
                  message="成功"
                  description={successMessage}
                  type="success"
                  showIcon
                  style={{ marginBottom: '20px' }}
                  closable
                  onClose={() => setSuccessMessage('')}
                />
              )}
              
              {!course ? (
                <Empty 
                  description="未找到课程" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <>
                  <Card
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Space>
                          <BookOutlined style={{ color: colorPrimary, fontSize: '20px' }} />
                          <Title level={4} style={{ margin: 0 }}>{course.name}</Title>
                          <Tag color={getCourseStatus().color}>{getCourseStatus().status}</Tag>
                        </Space>
                        {!isJoined ? (
                          <Button 
                            type="primary" 
                            onClick={handleJoinCourse}
                            loading={joinCoursePending}
                            icon={<TeamOutlined />}
                          >
                            加入课程
                          </Button>
                        ) : canEvaluate ? (
                          <Button 
                            type="primary" 
                            onClick={handleEvaluateCourse}
                            icon={<FormOutlined />}
                          >
                            评价课程
                          </Button>
                        ) : hasEvaluated ? (
                          <Button 
                            type="default" 
                            disabled
                            icon={<CheckCircleOutlined />}
                          >
                            已评价
                          </Button>
                        ) : (
                          <Button 
                            type="primary" 
                            ghost
                            disabled
                            icon={<CheckCircleOutlined />}
                          >
                            已加入
                          </Button>
                        )}
                      </div>
                    }
                    style={{ marginBottom: '24px' }}
                  >
                    <Row gutter={[24, 24]}>
                      <Col xs={24} md={12}>
                        <div style={{ marginBottom: '16px' }}>
                          <Text strong>课程信息</Text>
                          <Divider style={{ margin: '12px 0' }} />
                          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                            <UserOutlined style={{ marginRight: '8px', color: colorPrimary }} />
                            <Text>教师: {course.teacherName}</Text>
                          </div>
                          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                            <CalendarOutlined style={{ marginRight: '8px', color: colorPrimary }} />
                            <Text>评价期间: {formatDateTime(course.startTime)} 至 {formatDateTime(course.endTime)}</Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <TeamOutlined style={{ marginRight: '8px', color: colorPrimary }} />
                            <Text>学生数: {course.studentCount}</Text>
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} md={12}>
                        <div style={{ textAlign: 'center' }}>
                          <Text strong>课程评分</Text>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '24px 0' }}>
                            <Statistic 
                              value={course.averageRating.toFixed(1)}
                              suffix="/5"
                              valueStyle={{ color: colorPrimary, fontSize: '40px' }}
                            />
                          </div>
                          <Rate allowHalf disabled defaultValue={course.averageRating} style={{ fontSize: '24px' }} />
                          <div style={{ marginTop: '12px' }}>
                            <Text type="secondary">基于 {evaluations.length} 条学生评价</Text>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                  
                  <Card
                    title={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <CommentOutlined style={{ color: colorPrimary, marginRight: '8px' }} />
                        <span>课程评价</span>
                      </div>
                    }
                  >
                    {loadingEvaluations ? (
                      <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Spin tip="加载评价中...">
                          <div style={{ padding: '50px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }} />
                        </Spin>
                      </div>
                    ) : evaluations.length === 0 ? (
                      <Empty 
                        description="尚无评价" 
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ) : (
                      <List
                        itemLayout="vertical"
                        dataSource={evaluations}
                        renderItem={evaluation => (
                          <List.Item
                            key={evaluation.id}
                            extra={
                              <div style={{ textAlign: 'center', minWidth: '120px' }}>
                                <Rate disabled defaultValue={evaluation.rating} />
                                <div>
                                  <Text type="secondary">{formatDateTime(evaluation.timestamp)}</Text>
                                </div>
                              </div>
                            }
                          >
                            <List.Item.Meta
                              avatar={
                                <Avatar 
                                  icon={<UserOutlined />} 
                                  style={{ backgroundColor: evaluation.isAnonymous ? '#d9d9d9' : colorPrimary }}
                                />
                              }
                              title={
                                <Space>
                                  <Text strong>{evaluation.studentName}</Text>
                                  {evaluation.isAnonymous && <Tag color="default">匿名</Tag>}
                                </Space>
                              }
                              description={evaluation.contentHash || "无评价内容"}
                            />
                          </List.Item>
                        )}
                      />
                    )}
                  </Card>
                </>
              )}
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