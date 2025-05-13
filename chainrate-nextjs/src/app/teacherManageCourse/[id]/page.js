'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ethers } from 'ethers';
import ChainRateABI from '../../../contracts/ChainRate.json';
import ChainRateAddress from '../../../contracts/ChainRate-address.json';
import dayjs from 'dayjs';
import styles from './page.module.css';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  LogoutOutlined,
  SettingOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StarFilled,
  StarOutlined,
  BarChartOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { 
  Breadcrumb, 
  Layout, 
  Menu, 
  ConfigProvider, 
  Form,
  Input,
  DatePicker,
  Checkbox,
  Button,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Tabs,
  List,
  Avatar,
  Rate,
  Typography,
  Divider,
  Tooltip,
  Spin,
  Alert,
  Switch,
  Empty
} from 'antd';
import UserAvatar from '../../components/UserAvatar';
import TeacherSidebar from '../../components/TeacherSidebar';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

export default function TeacherManageCoursePage({ params }) {
  const router = useRouter();
  const courseId = params.id;
  
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
  
  // 课程原始数据
  const [originalCourse, setOriginalCourse] = useState(null);
  
  // 编辑表单数据
  const [formData, setFormData] = useState({
    courseName: '',
    startTime: '',
    endTime: '',
    isActive: true
  });
  
  // 学生列表
  const [students, setStudents] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [form] = Form.useForm();
  
  // 统计数据
  const [stats, setStats] = useState({
    averageRating: 0,
    evaluationCount: 0,
    studentCount: 0
  });
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    // 检查用户是否已登录并且是教师角色
    const checkUserAuth = () => {
      try {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userRole = localStorage.getItem('userRole');
        
        if (!isLoggedIn || userRole !== 'teacher') {
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
        
        // 加载课程详情
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

  // 加载课程详情
  const loadCourseDetails = async (contractInstance, teacherAddress, courseId) => {
    try {
      // 检查课程是否存在
      try {
        const course = await contractInstance.courses(courseId);
        
        // 检查课程是否由当前教师创建
        if (course.teacher.toLowerCase() !== teacherAddress.toLowerCase()) {
          setError('您无权管理此课程');
          setTimeout(() => {
            router.push('/teacherViewCourse');
          }, 3000);
          return;
        }
        
        // 转换时间戳为日期时间字符串（用于表单输入）
        const startDate = new Date(Number(course.startTime) * 1000);
        const endDate = new Date(Number(course.endTime) * 1000);
        
        // 格式化为HTML datetime-local输入所需的格式: YYYY-MM-DDThh:mm
        const formatDateForInput = (date) => {
          return date.toISOString().slice(0, 16);
        };
        
        // 更新课程信息
        setOriginalCourse({
          id: Number(courseId),
          name: course.name,
          teacher: course.teacher,
          startTime: startDate,
          endTime: endDate,
          isActive: course.isActive,
          studentCount: Number(course.studentCount)
        });
        
        // 更新表单数据
        setFormData({
          courseName: course.name,
          startTime: formatDateForInput(startDate),
          endTime: formatDateForInput(endDate),
          isActive: course.isActive
        });
        
        // 设置表单初始值
        form.setFieldsValue({
          courseName: course.name,
          timeRange: [dayjs(startDate), dayjs(endDate)],
          isActive: course.isActive
        });
        
        // 加载课程统计数据
        await loadCourseStats(contractInstance, courseId);
        
        // 加载课程学生
        await loadCourseStudents(contractInstance, courseId);
        
        // 加载课程评价
        await loadCourseEvaluations(contractInstance, courseId);
      } catch (error) {
        console.error(`获取课程 ${courseId} 失败:`, error);
        setError(`课程 ID ${courseId} 不存在或无法访问`);
        setTimeout(() => {
          router.push('/teacherViewCourse');
        }, 3000);
      }
    } catch (err) {
      console.error("加载课程详情失败:", err);
      setError('获取课程详情失败: ' + (err.message || err));
    }
  };
  
  // 加载课程统计数据
  const loadCourseStats = async (contractInstance, courseId) => {
    try {
      // 获取课程平均评分
      const averageRating = await contractInstance.getAverageRating(courseId);
      
      // 获取课程评价列表
      const evaluationIds = await contractInstance.getCourseEvaluations(courseId);
      
      // 更新统计数据
      setStats({
        averageRating: Number(averageRating) / 100, // 转换为小数（因为合约中乘以了100）
        evaluationCount: evaluationIds.length,
        studentCount: Number(originalCourse?.studentCount || 0)
      });
    } catch (err) {
      console.error("加载课程统计数据失败:", err);
    }
  };
  
  // 加载课程学生
  const loadCourseStudents = async (contractInstance, courseId) => {
    setLoadingStudents(true);
    
    try {
      // 获取课程的学生地址列表
      const studentAddresses = await contractInstance.getCourseStudents(courseId);
      
      // 获取学生详情
      const studentsList = [];
      for (let i = 0; i < studentAddresses.length; i++) {
        const studentAddr = studentAddresses[i];
        try {
          // 检查学生是否仍然加入课程（可能已退出）
          const isJoined = await contractInstance.isStudentJoined(courseId, studentAddr);
          
          if (isJoined) {
            // 获取学生信息
            const studentInfo = await contractInstance.getUserInfo(studentAddr);
            
            studentsList.push({
              address: studentAddr,
              name: studentInfo[0], // 学生姓名
              hasEvaluated: await contractInstance.hasEvaluated(courseId, studentAddr)
            });
          }
        } catch (error) {
          console.warn(`获取学生 ${studentAddr} 信息失败:`, error);
        }
      }
      
      setStudents(studentsList);
    } catch (err) {
      console.error("加载课程学生失败:", err);
    } finally {
      setLoadingStudents(false);
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
            contentHash: evaluation.contentHash, // 在实际应用中，需要从IPFS获取内容
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
    } finally {
      setLoadingEvaluations(false);
    }
  };

  // 处理表单提交
  const handleSubmit = async (values) => {
    setError('');
    setSuccessMessage('');
    setSubmitting(true);
    
    try {
      // 转换时间为Unix时间戳（秒）
      const startTimestamp = Math.floor(values.timeRange[0].valueOf() / 1000);
      const endTimestamp = Math.floor(values.timeRange[1].valueOf() / 1000);
      
      // 调用合约更新课程
      const tx = await contract.updateCourse(
        courseId,
        values.courseName,
        startTimestamp,
        endTimestamp,
        values.isActive
      );
      
      // 等待交易确认
      await tx.wait();
      
      // 更新原始课程数据
      setOriginalCourse(prev => ({
        ...prev,
        name: values.courseName,
        startTime: new Date(startTimestamp * 1000),
        endTime: new Date(endTimestamp * 1000),
        isActive: values.isActive
      }));
      
      setSuccessMessage('课程信息已成功更新');
      
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error("更新课程失败:", err);
      
      // 特殊处理用户拒绝的情况
      if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        setError('您取消了交易。如需更新课程，请重新提交并在MetaMask中确认。');
      } else {
        setError('更新课程失败: ' + (err.message || err));
      }
    } finally {
      setSubmitting(false);
    }
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

  // 标签页配置
  const tabItems = [
    {
      key: 'courseInfo',
      label: '基本信息',
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            courseName: originalCourse?.name || '',
            isActive: originalCourse?.isActive || false
          }}
        >
          <Form.Item
            name="courseName"
            label="课程名称"
            rules={[{ required: true, message: '请输入课程名称' }]}
          >
            <Input placeholder="请输入课程名称" />
          </Form.Item>
          
          <Form.Item
            name="timeRange"
            label="评价时间范围"
            rules={[{ required: true, message: '请选择评价时间范围' }]}
          >
            <RangePicker 
              showTime 
              format="YYYY-MM-DD HH:mm:ss" 
              style={{ width: '100%' }}
            />
          </Form.Item>
          
          <Form.Item
            name="isActive"
            valuePropName="checked"
          >
            <Checkbox>启用课程（学生可加入和评价）</Checkbox>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
              >
                保存修改
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                }}
                disabled={submitting}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'students',
      label: `选课学生 (${students.length})`,
      children: (
        <List
          loading={loadingStudents}
          dataSource={students}
          locale={{
            emptyText: <Empty description="还没有学生选择此课程" />
          }}
          renderItem={student => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1a73e8' }} />}
                title={student.name}
                description={`${student.address.slice(0, 6)}...${student.address.slice(-4)}`}
              />
              <Tag color="#e3f2fd" style={{ color: '#1a73e8' }}>
                {student.hasEvaluated ? '已评价' : '未评价'}
              </Tag>
            </List.Item>
          )}
        />
      )
    },
    {
      key: 'evaluations',
      label: `课程评价 (${evaluations.length})`,
      children: (
        <List
          loading={loadingEvaluations}
          dataSource={evaluations}
          locale={{
            emptyText: <Empty description="暂无评价" />
          }}
          renderItem={evaluation => (
            <List.Item>
              <Card style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>{evaluation.isAnonymous ? '匿名学生' : evaluation.studentName}</Text>
                  <Rate disabled defaultValue={evaluation.rating} />
                </div>
                <Paragraph>{evaluation.contentHash}</Paragraph>
                <div style={{ textAlign: 'right', color: '#999' }}>
                  {formatDateTime(evaluation.timestamp)}
                </div>
              </Card>
            </List.Item>
          )}
        />
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
        <span style={{ marginLeft: '12px' }}>正在加载课程详情...</span>
      </div>
    );
  }

  if (!originalCourse) {
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
                链评系统（ChainRate）- 教师端
              </div>
          </div>
            <div style={{ color: 'white', marginRight: '20px', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '15px' }}>欢迎, {userData.name}</span>
              <UserAvatar color="#fff" />
            </div>
          </Header>
          <Content style={{ padding: '20px' }}>
            <Alert
              message="错误"
              description={error || '无法加载课程详情，课程可能不存在'}
              type="error"
              showIcon
              action={
                <Button type="primary" onClick={() => router.push('/teacherViewCourse')}>
                  返回课程列表
                </Button>
              }
            />
          </Content>
        </Layout>
      </ConfigProvider>
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
            <TeacherSidebar defaultSelectedKey="3" defaultOpenKey="sub2" />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页', onClick: () => router.push('/teacherIndex') },
                { title: '课程管理', onClick: () => router.push('/teacherViewCourse') },
                { title: `管理课程: ${originalCourse.name}` }
              ]}
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
              {error && (
                <Alert
                  message="错误"
                  description={error}
                  type="error"
                  showIcon
                  style={{ marginBottom: '24px' }}
                  closable
                />
              )}
              
              {successMessage && (
                <Alert
                  message="成功"
                  description={successMessage}
                  type="info"
                  showIcon
                  style={{ marginBottom: '24px', backgroundColor: 'rgba(26, 115, 232, 0.1)', borderColor: 'rgba(26, 115, 232, 0.3)' }}
                  closable
                />
              )}
              
              <Card style={{ marginBottom: '24px' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={6}>
                    <Statistic 
                      title="已选学生"
                      value={originalCourse.studentCount}
                      prefix={<UserOutlined />}
                      valueStyle={{ color: '#1a73e8' }}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Statistic 
                      title="评价数量"
                      value={stats.evaluationCount}
                      prefix={<CommentOutlined />}
                      valueStyle={{ color: '#1a73e8' }}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Statistic 
                      title="平均评分"
                      value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '暂无'}
                      prefix={<StarFilled />}
                      valueStyle={{ color: '#1a73e8' }}
                    />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Statistic 
                      title="课程状态"
                      value={originalCourse.isActive ? '已启用' : '已停用'}
                      valueStyle={{ 
                        color: originalCourse.isActive ? '#1a73e8' : '#999',
                      }}
                      prefix={originalCourse.isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    />
                  </Col>
                </Row>
              </Card>
              
              <Tabs
                items={tabItems}
                defaultActiveKey="courseInfo"
                type="card"
              />
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