'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import axios from 'axios';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import ChainRate02ABI from '../../contracts/ChainRate02.json';
import ChainRate02Address from '../../contracts/ChainRate02-address.json';
import { default as NextImage } from 'next/image';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  CalendarOutlined,
  StarFilled,
  FileTextOutlined,
  TeamOutlined,
  FilterOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  EnvironmentOutlined,
  RollbackOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { 
  Breadcrumb, 
  Layout, 
  ConfigProvider, 
  theme,
  Card,
  Row,
  Col,
  Statistic,
  Divider,
  Typography,
  Spin,
  Alert,
  Select,
  Input,
  DatePicker,
  Radio,
  Tooltip,
  Empty,
  Rate,
  List,
  Avatar,
  Space,
  Tag,
  Button,
  message,
  Modal,
  Form,
  Tabs,
  Badge,
  Popover
} from 'antd';
import UserAvatar from '../components/UserAvatar';
import TeacherSidebar from '../components/TeacherSidebar';
import styles from './page.module.css';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

export default function TeacherViewFeedbackPage() {
  const router = useRouter();
  
  // 获取主题变量
  const { token } = theme.useToken();
  const { colorBgContainer, borderRadiusLG, colorPrimary } = token;
  
  // 用户信息状态
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
  
  // 数据加载状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Web3相关状态
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [contract02, setContract02] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  
  // 课程和反馈状态
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({
    total: 0,
    pending: 0,
    replied: 0,
    avgRating: 0
  });
  
  // 筛选和搜索状态
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, replied
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, rating
  
  // 回复反馈状态
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyForm] = Form.useForm();
  
  // 初始化检查用户登录状态和加载数据
  useEffect(() => {
    // 检查用户是否已登录且是教师角色
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
        
        // 连接到ChainRate02合约
        const chainRate02Contract = new ethers.Contract(
          ChainRate02Address.address,
          ChainRate02ABI.abi,
          signer
        );
        setContract02(chainRate02Contract);
        
        // 加载教师课程
        await loadTeacherCourses(chainRateContract, chainRate02Contract, await signer.getAddress());
        
        // 设置定时刷新
        const interval = setInterval(async () => {
          if (chainRateContract && chainRate02Contract && signer) {
            await loadTeacherCourses(chainRateContract, chainRate02Contract, await signer.getAddress());
          }
        }, 30000); // 每30秒刷新一次
        
        setRefreshInterval(interval);
        
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
    
    // 组件卸载时清除定时器
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [router]);
  
  // 加载教师课程
  const loadTeacherCourses = async (contractInstance, contract02Instance, teacherAddress) => {
    try {
      setLoading(true);
      console.log("加载教师课程...");
      
      // 获取所有课程，然后过滤出教师创建的课程
      const allCourseIds = await contractInstance.getAllCourses();
      console.log("所有课程ID:", allCourseIds);
      
      if (allCourseIds.length === 0) {
        console.log("系统中没有课程");
        setLoading(false);
        return;
      }
      
      // 获取所有课程详情，并筛选出教师创建的课程
      const coursesList = [];
      
      for (let i = 0; i < allCourseIds.length; i++) {
        try {
          const courseId = allCourseIds[i];
          
          // 获取课程详情
          const course = await contractInstance.courses(courseId);
          
          // 检查是否是当前教师创建的课程
          if (course.teacher.toLowerCase() === teacherAddress.toLowerCase()) {
            coursesList.push({
              id: courseId.toString(),
              name: course.name,
              description: "",
              image: "",
              teacher: course.teacher,
              isActive: course.isActive,
              studentsCount: Number(course.studentCount),
              students: [],
              feedbacks: []
            });
          }
        } catch (error) {
          console.error(`获取课程详情失败 ${allCourseIds[i]}:`, error);
        }
      }
      
      console.log("教师课程列表:", coursesList);
      setCourses(coursesList);
      
      // 如果有课程，默认选择第一个课程并加载其反馈
      if (coursesList.length > 0) {
        setSelectedCourse(coursesList[0]);
        await loadCourseFeedbacks(contract02Instance, coursesList[0].id);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("加载教师课程失败:", err);
      setError('获取教师课程失败: ' + (err.message || err));
      setLoading(false);
    }
  };
  
  // 从IPFS获取内容
  const fetchIpfsContent = async (contentUrl) => {
    try {
      // 处理不同格式的IPFS链接
      let gatewayUrl = contentUrl;
      
      // 如果是ipfs://格式的链接
      if (contentUrl.startsWith('ipfs://')) {
        const cid = contentUrl.replace('ipfs://', '');
        gatewayUrl = `https://ipfs.io/ipfs/${cid}`;
      }
      // 如果已经是网关链接但不是以https开头，添加https
      else if (contentUrl.includes('/ipfs/') && !contentUrl.startsWith('http')) {
        gatewayUrl = `https://${contentUrl}`;
      }
      
      console.log("获取IPFS内容:", gatewayUrl);
      const response = await axios.get(gatewayUrl);
      
      // 如果返回的是JSON对象并且有content字段
      if (typeof response.data === 'object' && response.data.content) {
        console.log("从JSON中提取内容字段:", response.data.content);
        return response.data.content;
      }
      
      // 如果直接返回的是字符串
      console.log("返回原始内容");
      return response.data;
    } catch (error) {
      console.error("获取IPFS内容失败:", error);
      throw error;
    }
  };

  // 从IPFS获取反馈内容
  const fetchContentIfNeeded = async (contentText) => {
    if (!contentText) return "内容为空";
    
    // 识别各种可能的IPFS链接格式
    if (
      contentText.startsWith('ipfs://') || 
      contentText.includes('/ipfs/') ||
      contentText.startsWith('https://gateway.pinata.cloud/') ||
      contentText.startsWith('https://ipfs.io/')
    ) {
      try {
        const content = await fetchIpfsContent(contentText);
        console.log("成功从IPFS获取内容:", content);
        return content;
      } catch (error) {
        console.error("获取IPFS内容失败:", error);
        return "无法加载内容";
      }
    }
    
    return contentText;
  };
  
  // 加载课程反馈
  const loadCourseFeedbacks = async (contract02Instance, courseId) => {
    try {
      setLoading(true);
      console.log(`加载课程 ${courseId} 的反馈...`);
      
      // 获取课程反馈ID列表
      const feedbackIds = await contract02Instance.getCourseFeedbacks(courseId);
      console.log("课程反馈ID:", feedbackIds);
      
      if (feedbackIds.length === 0) {
        console.log("课程没有反馈");
        setFeedbacks([]);
        setFilteredFeedbacks([]);
        setFeedbackStats({
          total: 0,
          pending: 0,
          replied: 0,
          avgRating: 0
        });
        setLoading(false);
        return;
      }
      
      // 获取所有反馈详情
      const feedbacksList = [];
      let totalRating = 0;
      let pendingCount = 0;
      let repliedCount = 0;
      
      for (let i = 0; i < feedbackIds.length; i++) {
        try {
          const feedbackId = feedbackIds[i];
          // 获取反馈详情
          const feedback = await contract02Instance.getCourseFeedbackDetails(feedbackId);
          
          // 获取提交反馈的学生信息
          const student = await contract.getUserInfo(feedback.student);
          
          // 检查反馈是否已回复
          let hasReply = false;
          let reply = "";
          let replyTimestamp = null;
          
          try {
            // 从合约中获取状态枚举值 FeedbackStatus.Replied = 1
            // status字段是一个数字，对应合约中的枚举值：
            // enum FeedbackStatus { Submitted, Replied, Modified, Deleted }
            console.log(`反馈 ${feedbackId} 状态:`, feedback.status);
            
            if (Number(feedback.status) === 1) { // FeedbackStatus.Replied = 1
              try {
                const replyDetails = await contract02Instance.getTeacherReplyDetails(feedbackId);
                hasReply = true;
                
                // 获取回复的实际内容
                reply = await fetchContentIfNeeded(replyDetails.contentHash);
                
                replyTimestamp = new Date(Number(replyDetails.timestamp) * 1000);
                console.log(`反馈 ${feedbackId} 已回复:`, reply);
              } catch (error) {
                console.error(`获取反馈回复失败 ${feedbackId}:`, error);
                hasReply = false; // 如果获取回复失败，则认为没有回复
              }
            } else {
              console.log(`反馈 ${feedbackId} 未回复`);
            }
          } catch (error) {
            console.error(`检查反馈状态失败 ${feedbackId}:`, error);
          }
          
          // 格式化时间戳
          const timestamp = new Date(Number(feedback.timestamp) * 1000);

          // 从IPFS获取反馈内容
          const content = await fetchContentIfNeeded(feedback.contentHash);
          
          const feedbackItem = {
            id: feedbackId.toString(),
            courseId: courseId,
            content: content,
            isAnonymous: false, // 假设反馈不是匿名的，因为反馈没有匿名字段
            student: {
              address: feedback.student,
              name: student.name,
              college: student.college,
              major: student.major,
              grade: student.grade
            },
            timestamp: timestamp,
            formattedDate: timestamp.toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }),
            reply: reply,
            replyTimestamp: replyTimestamp,
            formattedReplyDate: replyTimestamp ? 
              replyTimestamp.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }) : null,
            hasReply: hasReply,
            status: Number(feedback.status) // 保存原始状态值
          };
          
          feedbacksList.push(feedbackItem);
          
          // 统计数据
          if (feedbackItem.hasReply) {
            repliedCount++;
          } else {
            pendingCount++;
          }
          
        } catch (error) {
          console.error(`获取反馈详情失败 ${feedbackIds[i]}:`, error);
        }
      }
      
      // 按时间排序（从新到旧）
      feedbacksList.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log("反馈列表:", feedbacksList);
      console.log("统计数据: 总数:", feedbacksList.length, "已回复:", repliedCount, "未回复:", pendingCount);
      
      setFeedbacks(feedbacksList);
      setFilteredFeedbacks(feedbacksList);
      
      // 更新统计数据
      setFeedbackStats({
        total: feedbacksList.length,
        pending: pendingCount,
        replied: repliedCount,
        avgRating: 0 // 课程反馈没有评分
      });
      
      setLoading(false);
    } catch (err) {
      console.error("加载课程反馈失败:", err);
      setError('获取课程反馈失败: ' + (err.message || err));
      setLoading(false);
    }
  };
  
  // 处理课程选择变化
  const handleCourseChange = async (courseId) => {
    const selected = courses.find(course => course.id === courseId);
    setSelectedCourse(selected);
    
    if (contract02 && selected) {
      await loadCourseFeedbacks(contract02, selected.id);
    }
  };
  
  // 处理筛选状态变化
  const handleFilterChange = (value) => {
    setFilterStatus(value);
    
    // 应用筛选
    applyFilters(value, searchText, sortBy);
  };
  
  // 处理搜索文本变化
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    
    // 应用筛选
    applyFilters(filterStatus, value, sortBy);
  };
  
  // 处理排序方式变化
  const handleSortChange = (value) => {
    setSortBy(value);
    
    // 应用筛选
    applyFilters(filterStatus, searchText, value);
  };
  
  // 应用筛选、搜索和排序
  const applyFilters = (status, search, sort) => {
    // 基于状态筛选
    let result = [...feedbacks];
    
    if (status !== 'all') {
      result = result.filter(feedback => {
        if (status === 'pending') return !feedback.hasReply;
        if (status === 'replied') return feedback.hasReply;
        return true;
      });
    }
    
    // 基于搜索文本筛选
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(feedback => 
        feedback.content.toLowerCase().includes(searchLower) ||
        (!feedback.isAnonymous && feedback.student.name.toLowerCase().includes(searchLower))
      );
    }
    
    // 应用排序
    if (sort === 'newest') {
      result.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sort === 'oldest') {
      result.sort((a, b) => a.timestamp - b.timestamp);
    } else if (sort === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }
    
    console.log(`筛选结果: ${result.length}条反馈, 状态:${status}, 搜索:${search}, 排序:${sort}`);
    setFilteredFeedbacks(result);
  };
  
  // 打开回复模态框
  const openReplyModal = (feedback) => {
    setCurrentFeedback(feedback);
    setReplyContent(feedback.reply || '');
    setReplyModalVisible(true);
    replyForm.setFieldsValue({
      replyContent: feedback.reply || ''
    });
  };
  
  // 关闭回复模态框
  const closeReplyModal = () => {
    setReplyModalVisible(false);
    setCurrentFeedback(null);
    setReplyContent('');
    replyForm.resetFields();
  };
  
  // 提交回复
  const submitReply = async () => {
    try {
      await replyForm.validateFields();
      
      if (!currentFeedback || !contract02) {
        message.error('提交回复失败：无法获取反馈信息或合约实例');
        return;
      }
      
      setSubmitting(true);
      
      const replyContent = replyForm.getFieldValue('replyContent');
      
      // 调用智能合约方法提交回复
      const tx = await contract02.replyToFeedback(
        currentFeedback.id,
        replyContent, // 直接使用文本内容，不上传到IPFS
        [], // 文档哈希数组
        []  // 图片哈希数组
      );
      
      // 等待交易确认
      message.loading('正在提交回复，请等待区块链确认...', 0);
      await tx.wait();
      message.destroy();
      
      // 更新成功
      message.success('反馈回复已提交');
      
      // 关闭模态框
      closeReplyModal();
      
      // 重新加载反馈数据
      if (selectedCourse) {
        // 增加延迟确保区块链状态同步
        setTimeout(async () => {
          await loadCourseFeedbacks(contract02, selectedCourse.id);
        }, 1000); // 等待1秒后刷新
      }
      
    } catch (error) {
      console.error('提交回复失败:', error);
      message.error('提交回复失败: ' + (error.message || error));
    } finally {
      setSubmitting(false);
    }
  };
  
  // 渲染反馈列表项
  const renderFeedbackItem = (feedback) => {
    return (
      <List.Item
        key={feedback.id}
        actions={[
          <Button 
            type={feedback.hasReply ? "default" : "primary"}
            icon={<RollbackOutlined />}
            onClick={() => openReplyModal(feedback)}
            key="reply-button"
          >
            {feedback.hasReply ? "修改回复" : "回复"}
          </Button>
        ]}
      >
        <List.Item.Meta
          avatar={
            <Avatar 
              style={{ 
                backgroundColor: feedback.isAnonymous ? '#ccc' : colorPrimary,
                verticalAlign: 'middle'
              }}
            >
              {feedback.isAnonymous ? '匿' : feedback.student.name[0]}
            </Avatar>
          }
          title={
            <Space>
              <span>{feedback.isAnonymous ? '匿名学生' : feedback.student.name}</span>
              {!feedback.isAnonymous && (
                <Tooltip title={`${feedback.student.college} - ${feedback.student.major} - ${feedback.student.grade}`}>
                  <Tag icon={<EnvironmentOutlined />} color="blue">
                    {feedback.student.college}
                  </Tag>
                </Tooltip>
              )}
              {feedback.hasReply ? (
                <Tag icon={<CheckCircleOutlined />} color="success">已回复</Tag>
              ) : (
                <Tag icon={<ClockCircleOutlined />} color="warning">待回复</Tag>
              )}
            </Space>
          }
          description={
            <div>
              <div className={styles.feedbackDate}>
                <CalendarOutlined style={{ marginRight: 8 }} />
                <span>{feedback.formattedDate}</span>
              </div>
              <Paragraph 
                className={styles.feedbackContent}
              >
                {feedback.content}
              </Paragraph>
              
              {feedback.hasReply && (
                <div className={styles.replyContainer}>
                  <div className={styles.replyHeader}>
                    <Space>
                      <MessageOutlined /> 
                      <span>教师回复</span>
                      <span className={styles.replyDate}>
                        {feedback.formattedReplyDate}
                      </span>
                    </Space>
                  </div>
                  <Paragraph className={styles.replyContent}>
                    {feedback.reply}
                  </Paragraph>
                </div>
              )}
            </div>
          }
        />
      </List.Item>
    );
  };
  
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8',
        },
      }}
    >
      <Layout className={styles.layout}>
        <Header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>
              <NextImage 
                src="/images/logo1.png" 
                alt="链评系统Logo" 
                width={40} 
                height={40}
                style={{ borderRadius: '6px' }}
              />
            </div>
            <div className={styles.headerTitle}>
              链评系统（ChainRate）- 教师端
            </div>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.welcomeText}>欢迎, {userData.name}</span>
            <UserAvatar color="#fff" />
          </div>
        </Header>
        <Layout>
          <TeacherSidebar defaultSelectedKey="7" defaultOpenKey="sub3" />
          <Layout className={styles.contentLayout}>
            <Breadcrumb
              items={[
                { title: '首页' },
                { title: '教学反馈' },
                { title: '查看反馈' },
              ]}
              className={styles.breadcrumb}
            />
            <Content
              className={styles.content}
              style={{
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
              }}
            >
              {loading && feedbacks.length === 0 ? (
                <div className={styles.loadingContainer}>
                  <Spin size="large" />
                  <div className={styles.loadingText}>加载中...</div>
                </div>
              ) : error ? (
                <Alert
                  message="错误"
                  description={error}
                  type="error"
                  showIcon
                  className={styles.errorAlert}
                />
              ) : courses.length === 0 ? (
                <Empty
                  description={
                    <span>
                      您还没有创建任何课程，请先创建课程以接收学生反馈。
                    </span>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <>
                  {/* 课程选择和统计概览 */}
                  <Card 
                    className={styles.courseCard}
                    title={
                      <div className={styles.cardTitle}>
                        <BookOutlined className={styles.cardTitleIcon} />
                        <span>课程反馈管理</span>
                      </div>
                    }
                  >
                    <Row gutter={[24, 24]}>
                      <Col xs={24} md={8}>
                        <div>
                          <Title level={5}>选择课程</Title>
                          <Select
                            className={styles.courseSelect}
                            placeholder="选择要查看反馈的课程"
                            value={selectedCourse?.id}
                            onChange={handleCourseChange}
                          >
                            {courses.map(course => (
                              <Option key={course.id} value={course.id}>
                                {course.name}
                              </Option>
                            ))}
                          </Select>
                        </div>
                      </Col>
                      <Col xs={24} md={16}>
                        <Row gutter={[16, 16]}>
                          <Col xs={24} sm={8}>
                            <Statistic 
                              title="总反馈数" 
                              value={feedbackStats.total} 
                              prefix={<CommentOutlined className={styles.statIcon} />} 
                            />
                          </Col>
                          <Col xs={24} sm={8}>
                            <Statistic 
                              title="待回复" 
                              value={feedbackStats.pending}
                              prefix={<ClockCircleOutlined className={styles.warningIcon} />} 
                              suffix={feedbackStats.total > 0 ? `/${feedbackStats.total}` : ''}
                            />
                          </Col>
                          <Col xs={24} sm={8}>
                            <Statistic 
                              title="平均评分" 
                              value={feedbackStats.avgRating} 
                              prefix={<StarFilled className={styles.ratingIcon} />} 
                              suffix="/5"
                            />
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </Card>
                  
                  {/* 筛选和搜索 */}
                  <Card className={styles.filterCard}>
                    <Row gutter={[16, 16]} align="middle">
                      <Col xs={24} md={8}>
                        <div className={styles.filterItem}>
                          <span className={styles.filterLabel}>状态筛选:</span>
                          <Radio.Group 
                            value={filterStatus} 
                            onChange={(e) => handleFilterChange(e.target.value)}
                            buttonStyle="solid"
                          >
                            <Radio.Button value="all">全部</Radio.Button>
                            <Radio.Button value="pending">
                              待回复
                              {feedbackStats.pending > 0 && (
                                <Badge 
                                  count={feedbackStats.pending} 
                                  className={styles.pendingBadge}
                                /> 
                              )}
                            </Radio.Button>
                            <Radio.Button value="replied">已回复</Radio.Button>
                          </Radio.Group>
                        </div>
                      </Col>
                      <Col xs={24} md={8}>
                        <Input 
                          placeholder="搜索反馈内容或学生姓名" 
                          prefix={<SearchOutlined />} 
                          allowClear
                          value={searchText}
                          onChange={handleSearchChange}
                          className={styles.searchInput}
                        />
                      </Col>
                      <Col xs={24} md={8}>
                        <div className={styles.sortContainer}>
                          <span className={styles.sortLabel}>排序:</span>
                          <Select 
                            className={styles.sortSelect}
                            value={sortBy}
                            onChange={handleSortChange}
                          >
                            <Option value="newest">最新优先</Option>
                            <Option value="oldest">最早优先</Option>
                            <Option value="rating">评分排序</Option>
                          </Select>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                  
                  {/* 反馈列表 */}
                  <Card className={styles.feedbackListCard}>
                    {filteredFeedbacks.length > 0 ? (
                      <List
                        itemLayout="vertical"
                        dataSource={filteredFeedbacks}
                        renderItem={renderFeedbackItem}
                        pagination={{
                          pageSize: 10,
                          showSizeChanger: false,
                          showTotal: (total) => `共 ${total} 条反馈`
                        }}
                        className={styles.feedbackList}
                      />
                    ) : (
                      <Empty description={
                        searchText ? 
                          "没有找到匹配的反馈" : 
                          (filterStatus !== 'all' ? 
                            `没有${filterStatus === 'pending' ? '待回复' : '已回复'}的反馈` : 
                            "该课程暂无学生反馈")
                      } />
                    )}
                  </Card>
                </>
              )}
            </Content>
          </Layout>
        </Layout>
      </Layout>
      
      {/* 回复反馈模态框 */}
      <Modal
        title={
          <div className={styles.modalTitle}>
            <RollbackOutlined className={styles.modalTitleIcon} />
            <span>{currentFeedback?.hasReply ? '修改回复' : '回复学生反馈'}</span>
          </div>
        }
        open={replyModalVisible}
        onCancel={closeReplyModal}
        footer={[
          <Button key="cancel" onClick={closeReplyModal}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting} 
            onClick={submitReply}
          >
            提交回复
          </Button>
        ]}
        width={600}
        className={styles.replyModal}
      >
        {currentFeedback && (
          <div>
            <div className={styles.modalFeedbackContainer}>
              <Card
                size="small"
                title={
                  <Space>
                    <span>
                      {currentFeedback.isAnonymous ? '匿名学生' : currentFeedback.student.name}
                    </span>
                    <Rate disabled value={currentFeedback.rating} style={{ fontSize: 14 }} />
                  </Space>
                }
                className={styles.modalFeedbackCard}
              >
                <Paragraph className={styles.modalFeedbackContent}>
                  {currentFeedback.content}
                </Paragraph>
                <div className={styles.modalFeedbackDate}>
                  {currentFeedback.formattedDate}
                </div>
              </Card>
            </div>
            
            <Form form={replyForm} layout="vertical" className={styles.replyForm}>
              <Form.Item
                name="replyContent"
                label="回复内容"
                rules={[
                  { required: true, message: '请输入回复内容' },
                  { min: 5, message: '回复内容至少5个字符' }
                ]}
              >
                <TextArea 
                  rows={6} 
                  placeholder="请输入对学生反馈的回复..." 
                  showCount 
                  maxLength={500}
                  className={styles.replyTextArea}
                />
              </Form.Item>
              
              <div className={styles.replyTip}>
                <InfoCircleOutlined className={styles.tipIcon} />
                <span>提交回复后，学生将可以在反馈页面看到您的回复。已有回复的反馈将无法被学生修改。</span>
              </div>
            </Form>
          </div>
        )}
      </Modal>
    </ConfigProvider>
  );
} 