'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import Image from 'next/image';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import styles from './page.module.css';
import React from 'react';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  FormOutlined, 
  LogoutOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  TeamOutlined,
  StarOutlined,
  StarFilled,
  ClockCircleOutlined,
  EyeOutlined,
  FileImageOutlined,
  EnvironmentOutlined,
  FilterOutlined
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
  Space,
  Alert,
  Tooltip,
  Divider,
  Typography,
  Rate,
  Image as AntImage,
  Input,
  DatePicker,
  Select,
  Form,
  message,
  Statistic,
  List,
  Modal
} from 'antd';
import UserAvatar from '../components/UserAvatar';
import StudentSidebar from '../components/StudentSidebar';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function StudentMyEvaluationsPage() {
  const router = useRouter();
  
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
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 评价数据
  const [evaluations, setEvaluations] = useState([]);
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  // 搜索相关状态
  const [searchForm] = Form.useForm();
  const [searchParams, setSearchParams] = useState({
    keyword: '',
    dateRange: null,
    rating: null
  });
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');

  // 评分项描述
  const ratingLabels = {
    rating: '总体评分',
    teachingRating: '教学质量',
    contentRating: '内容设计',
    interactionRating: '师生互动'
  };

  // 获取评分颜色
  const getRatingColor = (rating) => {
    if (rating >= 4) return '#52c41a'; // 绿色 - 好评
    if (rating >= 3) return '#faad14'; // 黄色 - 中评
    return '#f5222d'; // 红色 - 差评
  };
  
  // 获取评分标签
  const getRatingTag = (rating) => {
    if (rating >= 4) return '好评';
    if (rating >= 3) return '中评';
    return '差评';
  };

  // 模态框相关状态
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  useEffect(() => {
    // 检查用户是否已登录并且是学生角色
    const checkUserAuth = () => {
      try {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userRole = localStorage.getItem('userRole');
        
        if (!isLoggedIn || userRole !== 'student') {
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
        
        // 加载学生提交的评价
        await loadStudentEvaluations(chainRateContract, await signer.getAddress());
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router]);

  // 加载学生提交的所有评价
  const loadStudentEvaluations = async (contractInstance, studentAddress) => {
    try {
      // 获取所有课程ID
      const courseIds = await contractInstance.getAllCourses();
      let studentEvaluations = [];
      
      // 获取学生的所有评价ID
      const evaluationIds = await contractInstance.getStudentEvaluations(studentAddress);
      console.log("学生评价IDs:", evaluationIds);
      
      // 如果没有评价，直接返回
      if (evaluationIds.length === 0) {
        setEvaluations([]);
        return;
      }
      
      // 遍历所有评价ID，获取详细信息
      for (let i = 0; i < evaluationIds.length; i++) {
        try {
          const evaluationId = Number(evaluationIds[i]);
          
          // 获取评价详情
          const evalDetails = await contractInstance.getEvaluationDetails(evaluationId);
          const courseId = Number(evalDetails.courseId);
          
          // 获取课程信息
          const course = await contractInstance.courses(courseId);
          
          // 获取教师信息
          let teacherName = "未知";
          try {
            const teacherInfo = await contractInstance.getUserInfo(course.teacher);
            teacherName = teacherInfo[0]; // 教师姓名
          } catch (error) {
            console.warn(`获取教师信息失败: ${error.message}`);
          }
          
          // 构建评价数据
          const evaluationData = {
            courseId: courseId,
            courseName: course.name,
            teacherAddress: course.teacher,
            teacherName: teacherName,
            content: evalDetails.contentHash, // 存储的是内容的哈希值
            rating: Number(evalDetails.rating),
            teachingRating: Number(evalDetails.teachingRating),
            contentRating: Number(evalDetails.contentRating),
            interactionRating: Number(evalDetails.interactionRating),
            timestamp: new Date(Number(evalDetails.timestamp) * 1000),
            isAnonymous: evalDetails.isAnonymous,
            imageHashes: evalDetails.imageHashes || []
          };
          
          studentEvaluations.push(evaluationData);
        } catch (err) {
          console.warn(`获取评价 ${evaluationIds[i]} 详情失败:`, err);
          // 继续检查下一个评价
        }
      }
      
      // 按时间戳降序排列（最新的排在前面）
      studentEvaluations.sort((a, b) => b.timestamp - a.timestamp);
      
      setEvaluations(studentEvaluations);
    } catch (err) {
      console.error("加载学生评价失败:", err);
      setError('获取评价数据失败: ' + (err.message || err));
    }
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

  // 查看课程详情
  const viewCourseDetail = (courseId) => {
    router.push(`/studentCourseDetail/${courseId}`);
  };

  // 返回课程列表
  const goBack = () => {
    router.push('/studentViewCourses');
  };

  // 侧边栏菜单项
  // const siderItems = [
  //   {
  //     key: 'sub1',
  //     icon: React.createElement(UserOutlined),
  //     label: '个人中心',
  //     children: [
  //       {
  //         key: '1',
  //         label: '个人信息',
  //         onClick: () => router.push('/studentIndex')
  //       }
  //     ],
  //   },
  //   {
  //     key: 'sub2',
  //     icon: React.createElement(BookOutlined),
  //     label: '课程管理',
  //     children: [
  //       {
  //         key: '2',
  //         label: '查看课程',
  //         onClick: () => router.push('/studentViewCourses')
  //       }
  //     ],
  //   },
  //   {
  //     key: 'sub3',
  //     icon: React.createElement(CommentOutlined),
  //     label: '评价管理',
  //     children: [
  //       {
  //         key: '3',
  //         label: '我的评价',
  //         onClick: () => router.push('/studentMyEvaluation')
  //       },
  //       {
  //         key: '4',
  //         label: '提交评价',
  //         onClick: () => router.push('/submit-evaluation')
  //       }
  //     ],
  //   }
  // ];

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

  // 处理搜索提交
  const handleSearch = (values) => {
    setSearchError('');
    setSearched(true);
    
    const { keyword, dateRange, rating } = values;
    
    // 检查日期范围是否超过6个月
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].valueOf();
      const endDate = dateRange[1].valueOf();
      const sixMonthsInMs = 6 * 30 * 24 * 60 * 60 * 1000; // 大约6个月的毫秒数
      
      if (endDate - startDate > sixMonthsInMs) {
        setSearchError('查询时间范围不能超过6个月');
        setSearchResults([]);
        return;
      }
    }
    
    // 保存搜索参数
    setSearchParams({
      keyword: keyword || '',
      dateRange: dateRange,
      rating: rating
    });
    
    // 根据条件筛选评价
    let results = [...evaluations];
    
    // 关键词筛选
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      results = results.filter(evaluation => 
        evaluation.courseName.toLowerCase().includes(lowerKeyword) ||
        evaluation.teacherName.toLowerCase().includes(lowerKeyword) ||
        evaluation.content.toLowerCase().includes(lowerKeyword)
      );
    }
    
    // 日期范围筛选
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day').valueOf();
      const endDate = dateRange[1].endOf('day').valueOf();
      
      results = results.filter(evaluation => {
        const evalDate = evaluation.timestamp.valueOf();
        return evalDate >= startDate && evalDate <= endDate;
      });
    }
    
    // 评分筛选
    if (rating) {
      results = results.filter(evaluation => evaluation.rating === Number(rating));
    }
    
    setSearchResults(results);
    
    // 检查是否有符合条件的记录
    if (results.length === 0) {
      message.info('未找到符合条件的记录');
    }
  };
  
  // 重置搜索
  const handleResetSearch = () => {
    searchForm.resetFields();
    setSearched(false);
    setSearchError('');
    setSearchParams({
      keyword: '',
      dateRange: null,
      rating: null
    });
  };
  
  // 获取要显示的评价列表
  const getDisplayEvaluations = () => {
    if (searched) {
      return searchResults;
    }
    return evaluations;
  };

  // 打开模态框显示评价详情
  const showEvaluationDetails = (evaluation) => {
    setSelectedEvaluation(evaluation);
    setModalVisible(true);
  };
  
  // 关闭模态框
  const handleModalClose = () => {
    setModalVisible(false);
  };
  
  // 图片预览
  const handlePreview = (imageSrc) => {
    setPreviewImage(imageSrc);
    setPreviewVisible(true);
  };
  
  // 关闭图片预览
  const handlePreviewClose = () => {
    setPreviewVisible(false);
  };

  // 显示加载中
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
            <StudentSidebar defaultSelectedKey="3" defaultOpenKey="sub3" />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页', onClick: () => router.push('/studentIndex'), className: 'clickable-breadcrumb' },
                { title: '我的评价' }
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
              
              {searchError && (
                <Alert
                  message="搜索错误"
                  description={searchError}
                  type="warning"
                  showIcon
                  style={{ marginBottom: '20px' }}
                  closable
                  onClose={() => setSearchError('')}
                />
              )}
              
              {evaluations.length === 0 ? (
                <Empty
                  description={
                    <span>
                      您尚未提交任何课程评价
                      <br />
                      <Button 
                        type="primary" 
                        style={{ marginTop: '16px' }}
                        onClick={() => router.push('/studentViewCourses')}
                      >
                        浏览可评价课程
                      </Button>
                    </span>
                  }
                  style={{ margin: '40px 0' }}
                />
              ) : (
                <div>
                  {/* 统计数据卡片 */}
                  <div className={styles.statsContainer}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                          <Statistic 
                            title="评价总数" 
                            value={evaluations.length} 
                            prefix={<CommentOutlined className={styles.statIcon} style={{ color: colorPrimary }} />} 
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                          <Statistic 
                            title="匿名评价" 
                            value={evaluations.filter(e => e.isAnonymous).length} 
                            prefix={<UserOutlined className={styles.statIcon} style={{ color: colorPrimary }} />} 
                            suffix={`/ ${evaluations.length}`}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                          <Statistic 
                            title="平均评分" 
                            value={(evaluations.reduce((sum, e) => sum + e.rating, 0) / evaluations.length).toFixed(1)} 
                            prefix={<StarFilled className={styles.statIcon} style={{ color: '#faad14' }} />} 
                            suffix="/ 5"
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                          <Statistic 
                            title="高分评价 (≥4)" 
                            value={evaluations.filter(e => e.rating >= 4).length} 
                            prefix={<StarOutlined className={styles.statIcon} style={{ color: '#52c41a' }} />} 
                            suffix={`/ ${evaluations.length}`}
                          />
                        </Card>
                      </Col>
                    </Row>
                  </div>
                  
                  <Card style={{ marginBottom: '24px', marginTop: '24px' }}>
                    <Form
                      form={searchForm}
                      layout="horizontal"
                      onFinish={handleSearch}
                      initialValues={{
                        keyword: '',
                        dateRange: null,
                        rating: null
                      }}
                    >
                      <Row gutter={[16, 16]}>
                        <Col xs={24} sm={24} md={6}>
                          <Form.Item name="keyword" label="关键词">
                            <Input 
                              placeholder="课程名称/教师/内容" 
                              prefix={<SearchOutlined />} 
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={24} md={10}>
                          <Form.Item name="dateRange" label="提交日期">
                            <DatePicker.RangePicker 
                              style={{ width: '100%' }} 
                              placeholder={['开始日期', '结束日期']}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={4}>
                          <Form.Item name="rating" label="总体评分">
                            <Select placeholder="选择评分">
                              <Select.Option value={null}>全部</Select.Option>
                              <Select.Option value={5}>5分</Select.Option>
                              <Select.Option value={4}>4分</Select.Option>
                              <Select.Option value={3}>3分</Select.Option>
                              <Select.Option value={2}>2分</Select.Option>
                              <Select.Option value={1}>1分</Select.Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={4} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                          <Form.Item>
                            <Space>
                              <Button onClick={handleResetSearch}>重置</Button>
                              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                                搜索
                              </Button>
                            </Space>
                          </Form.Item>
                        </Col>
                      </Row>
                    </Form>
                  </Card>
                
                  <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4}>
                      我的课程评价记录 
                      {searched && <Tag color="blue" style={{ marginLeft: '8px' }}>搜索结果: {searchResults.length} 条</Tag>}
                    </Title>
                  </div>
                  
                  {getDisplayEvaluations().length === 0 ? (
                    <Empty 
                      description="未找到符合条件的记录" 
                      style={{ margin: '40px 0' }}
                    />
                  ) : (
                    <List
                      grid={{
                        gutter: 16,
                        xs: 1,
                        sm: 1,
                        md: 1,
                        lg: 2,
                        xl: 2,
                        xxl: 2,
                      }}
                      dataSource={getDisplayEvaluations()}
                      renderItem={(evaluation) => (
                        <List.Item>
                          <Card 
                            hoverable 
                            className={styles.evaluationCard}
                            onClick={() => showEvaluationDetails(evaluation)}
                            actions={[
                              <Button 
                                type="primary" 
                                icon={<EyeOutlined />} 
                                onClick={(e) => {
                                  e.stopPropagation(); // 阻止冒泡，避免触发卡片点击事件
                                  viewCourseDetail(evaluation.courseId);
                                }}
                              >
                                查看课程
                              </Button>
                            ]}
                          >
                            <div style={{ position: 'relative' }}>
                              <div style={{ position: 'absolute', top: 0, right: 0 }}>
                                <Tag color={getRatingColor(evaluation.rating)}>
                                  {getRatingTag(evaluation.rating)}
                                </Tag>
                              </div>
                              
                              <Title level={4} style={{ marginBottom: 16 }}>
                                {evaluation.courseName}
                              </Title>
                              
                              <Row gutter={[16, 16]}>
                                <Col xs={24} md={12}>
                                  <div className={styles.evaluationInfo}>
                                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                                      <UserOutlined style={{ marginRight: 8, color: colorPrimary }} />
                                      <Text style={{ minWidth: 80 }}>教师:</Text>
                                      <Text strong>{evaluation.teacherName}</Text>
                                      {evaluation.isAnonymous && (
                                        <Tag color="blue" style={{ marginLeft: 8 }}>匿名</Tag>
                                      )}
                                    </div>
                                    
                                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                                      <StarFilled style={{ marginRight: 8, color: '#faad14' }} />
                                      <Text style={{ minWidth: 80 }}>总体评分:</Text>
                                      <Rate disabled value={evaluation.rating} style={{ fontSize: 14 }} />
                                      <Text strong style={{ marginLeft: 8 }}>{evaluation.rating}.0</Text>
                                    </div>
                                  </div>
                                </Col>
                                
                                <Col xs={24} md={12}>
                                  <div className={styles.evaluationInfo}>
                                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                                      <ClockCircleOutlined style={{ marginRight: 8, color: colorPrimary }} />
                                      <Text style={{ minWidth: 80 }}>提交时间:</Text>
                                      <Text>{formatDateTime(evaluation.timestamp)}</Text>
                                    </div>
                                    
                                    {evaluation.imageHashes && evaluation.imageHashes.length > 0 && (
                                      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                                        <FileImageOutlined style={{ marginRight: 8, color: colorPrimary }} />
                                        <Text style={{ minWidth: 80 }}>图片附件:</Text>
                                        <Text>{evaluation.imageHashes.length} 张</Text>
                                      </div>
                                    )}
                                  </div>
                                </Col>
                              </Row>
                              
                              <Divider style={{ margin: '12px 0' }} />
                              
                              <div className={styles.evaluationContent}>
                                <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}>
                                  {evaluation.content || '无评价内容'}
                                </Paragraph>
                              </div>
                              
                              <Divider style={{ margin: '12px 0' }} />
                              
                              <div className={styles.detailedRatings}>
                                <Row gutter={[8, 8]}>
                                  {Object.entries(ratingLabels).filter(([key]) => key !== 'rating').map(([key, label]) => (
                                    <Col span={8} key={key}>
                                      <div className={styles.ratingItem}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{label}:</Text>
                                        <Rate 
                                          disabled 
                                          value={evaluation[key]} 
                                          style={{ fontSize: 12 }}
                                        />
                                      </div>
                                    </Col>
                                  ))}
                                </Row>
                              </div>
                            </div>
                          </Card>
                        </List.Item>
                      )}
                    />
                  )}
                  
                  {/* 评价详情模态框 */}
                  <Modal
                    title={selectedEvaluation ? `评价详情 - ${selectedEvaluation.courseName}` : '评价详情'}
                    open={modalVisible}
                    onCancel={handleModalClose}
                    footer={[
                      <Button key="close" onClick={handleModalClose}>
                        关闭
                      </Button>,
                      <Button 
                        key="viewCourse" 
                        type="primary" 
                        onClick={() => {
                          handleModalClose();
                          selectedEvaluation && viewCourseDetail(selectedEvaluation.courseId);
                        }}
                      >
                        查看课程
                      </Button>
                    ]}
                    width={800}
                  >
                    {selectedEvaluation && (
                      <div className={styles.evaluationDetail}>
                        <div className={styles.detailHeader}>
                          <div className={styles.courseTitle}>
                            <Title level={4}>{selectedEvaluation.courseName}</Title>
                            <Tag color={getRatingColor(selectedEvaluation.rating)}>
                              {getRatingTag(selectedEvaluation.rating)}
                            </Tag>
                          </div>
                          
                          <Card className={styles.detailInfoCard}>
                            <Row gutter={[16, 16]}>
                              <Col xs={24} sm={12}>
                                <div className={styles.detailInfoItem}>
                                  <UserOutlined style={{ color: colorPrimary, marginRight: 8 }} />
                                  <Text style={{ minWidth: 80 }}>教师:</Text>
                                  <Text strong>{selectedEvaluation.teacherName}</Text>
                                </div>
                              </Col>
                              
                              <Col xs={24} sm={12}>
                                <div className={styles.detailInfoItem}>
                                  <TeamOutlined style={{ color: colorPrimary, marginRight: 8 }} />
                                  <Text style={{ minWidth: 80 }}>匿名评价:</Text>
                                  <Text>{selectedEvaluation.isAnonymous ? '是' : '否'}</Text>
                                  {selectedEvaluation.isAnonymous && (
                                    <Tag color="blue" style={{ marginLeft: 8 }}>匿名</Tag>
                                  )}
                                </div>
                              </Col>
                              
                              <Col xs={24} sm={12}>
                                <div className={styles.detailInfoItem}>
                                  <ClockCircleOutlined style={{ color: colorPrimary, marginRight: 8 }} />
                                  <Text style={{ minWidth: 80 }}>提交时间:</Text>
                                  <Text>{formatDateTime(selectedEvaluation.timestamp)}</Text>
                                </div>
                              </Col>
                            </Row>
                          </Card>
                          
                          <Divider />
                          
                          <div className={styles.ratingsSummary}>
                            <Title level={5}>评分详情</Title>
                            <div className={styles.overallRating}>
                              <div className={styles.mainRating}>
                                <Text>总体评分:</Text>
                                <Rate disabled value={selectedEvaluation.rating} />
                                <Text strong style={{ marginLeft: 8 }}>{selectedEvaluation.rating}.0</Text>
                              </div>
                            </div>
                            
                            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                              {Object.entries(ratingLabels).filter(([key]) => key !== 'rating').map(([key, label]) => (
                                <Col span={8} key={key}>
                                  <div className={styles.detailRatingItem}>
                                    <Text>{label}:</Text>
                                    <Rate disabled value={selectedEvaluation[key]} style={{ fontSize: 16 }} />
                                    <Text strong>{selectedEvaluation[key]}.0</Text>
                                  </div>
                                </Col>
                              ))}
                            </Row>
                          </div>
                          
                          <Divider />
                          
                          <div className={styles.contentSection}>
                            <Title level={5}>评价内容</Title>
                            <div className={styles.contentBox}>
                              <Paragraph>
                                {selectedEvaluation.content || '无评价内容'}
                              </Paragraph>
                            </div>
                          </div>
                          
                          {selectedEvaluation.imageHashes && selectedEvaluation.imageHashes.length > 0 && (
                            <>
                              <Divider />
                              <div className={styles.imagesSection}>
                                <Title level={5}>附件图片 ({selectedEvaluation.imageHashes.length}张)</Title>
                                <div className={styles.imageGrid}>
                                  {selectedEvaluation.imageHashes.map((hash, idx) => (
                                    <div key={idx} className={styles.imageItem}>
                                      <AntImage
                                        width={150}
                                        height={150}
                                        style={{ objectFit: 'cover' }}
                                        src={`https://gateway.pinata.cloud/ipfs/${hash}`}
                                        alt={`评价图片 ${idx + 1}`}
                                        fallback="/images/image-error.png"
                                        preview={{
                                          src: `https://gateway.pinata.cloud/ipfs/${hash}`,
                                          mask: <EyeOutlined style={{ fontSize: 16 }} />
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </Modal>
                  
                  {/* 图片预览 */}
                  <div style={{ display: 'none' }}>
                    <AntImage
                      preview={{
                        visible: previewVisible,
                        onVisibleChange: (visible) => setPreviewVisible(visible),
                        src: previewImage
                      }}
                    />
                  </div>
                
                </div>
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