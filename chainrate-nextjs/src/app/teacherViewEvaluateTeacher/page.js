'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import ChainRate02ABI from '../../contracts/ChainRate02.json';
import ChainRate02Address from '../../contracts/ChainRate02-address.json';
import styles from './page.module.css';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  LogoutOutlined,
  SearchOutlined,
  FilterOutlined,
  StarOutlined,
  StarFilled,
  FileTextOutlined,
  PictureOutlined,
  TeamOutlined,
  BarChartOutlined,
  CalendarOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  LoadingOutlined,
  EyeOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { 
  Breadcrumb, 
  Layout, 
  ConfigProvider, 
  theme,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Tag,
  Space,
  Empty,
  Tooltip,
  Spin,
  Alert,
  Typography,
  Rate,
  Avatar,
  Statistic,
  Divider,
  List,
  Progress,
  Drawer,
  Image as AntImage,
  Modal
} from 'antd';
import UserAvatar from '../components/UserAvatar';
import TeacherSidebar from '../components/TeacherSidebar';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

// 评分项目标签
const ratingLabels = {
  teaching: '教学能力',
  attitude: '教学态度',
  method: '教学方法',
  academic: '学术水平',
  guidance: '指导能力'
};

// 评分展示组件 - 使用进度条和评分星星的组合
const RatingDisplay = ({ title, value, color, icon }) => (
  <div className={styles.ratingDisplayContainer}>
    <div className={styles.ratingTitle}>
      {icon} <span>{title}</span>
    </div>
    <div className={styles.ratingContent}>
      <div className={styles.ratingStars}>
        <Rate allowHalf disabled value={value} style={{ fontSize: 16 }} />
        <span className={styles.ratingValue}>{value.toFixed(1)}</span>
      </div>
      <Progress 
        percent={value * 20} 
        showInfo={false} 
        strokeColor={color} 
        trailColor="#f5f5f5" 
        strokeWidth={8} 
        className={styles.ratingProgress}
      />
    </div>
  </div>
);

export default function TeacherViewEvaluateTeacherPage() {
  const router = useRouter();
  
  // 调用 useToken
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
  
  // 评价列表状态
  const [evaluations, setEvaluations] = useState([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasEvaluations, setHasEvaluations] = useState(false);
  
  // 查看详情状态
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [evaluationContent, setEvaluationContent] = useState('');
  const [evaluationContentLoading, setEvaluationContentLoading] = useState(false);
  
  // 搜索筛选状态
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  // 图片预览状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  
  // 统计数据
  const [evaluationStats, setEvaluationStats] = useState({
    total: 0,
    anonymous: 0,
    highRating: 0,
    avgRating: 0,
    avgTeachingAbility: 0,
    avgTeachingAttitude: 0,
    avgTeachingMethod: 0,
    avgAcademicLevel: 0,
    avgGuidanceAbility: 0
  });
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [contract02, setContract02] = useState(null);

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
        
        // 连接到主合约
        const chainRateContract = new ethers.Contract(
          ChainRateAddress.address,
          ChainRateABI.abi,
          signer
        );
        setContract(chainRateContract);
        
        // 连接到教师评价合约
        const chainRate02Contract = new ethers.Contract(
          ChainRate02Address.address,
          ChainRate02ABI.abi,
          signer
        );
        setContract02(chainRate02Contract);
        
        // 加载教师评价列表
        await loadTeacherEvaluations(chainRateContract, chainRate02Contract, await signer.getAddress());
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router]);

  // 加载教师收到的所有评价
  const loadTeacherEvaluations = async (mainContract, teacherContract, teacherAddress) => {
    try {
      setLoading(true);
      console.log("加载教师评价列表...");
      
      // 获取该教师收到的所有评价ID
      const evaluationIds = await teacherContract.getTeacherEvaluations(teacherAddress);
      console.log("教师收到的评价ID:", evaluationIds);
      
      if (evaluationIds.length === 0) {
        console.log("教师未收到任何评价");
        setHasEvaluations(false);
        setLoading(false);
        return;
      }
      
      setHasEvaluations(true);
      
      // 获取所有评价详情
      const evaluationsList = [];
      let totalRating = 0;
      let totalTeachingAbility = 0;
      let totalTeachingAttitude = 0;
      let totalTeachingMethod = 0;
      let totalAcademicLevel = 0;
      let totalGuidanceAbility = 0;
      let anonymousCount = 0;
      let highRatingCount = 0;
      
      for (let i = 0; i < evaluationIds.length; i++) {
        try {
          const evaluationId = evaluationIds[i];
          // 使用getTeacherEvaluationDetails获取评价详情
          const evaluation = await teacherContract.getTeacherEvaluationDetails(evaluationId);
          
          // 如果学生不是匿名评价，获取学生信息
          let studentName = "匿名学生";
          let studentInfo = null;
          
          if (!evaluation.isAnonymous) {
            try {
              studentInfo = await mainContract.getUserInfo(evaluation.student);
              studentName = studentInfo[0]; // 学生姓名
            } catch (error) {
              console.warn(`获取学生信息失败: ${error.message}`);
            }
          }
          
          // 检查图片哈希数组
          const imageHashes = evaluation.imageHashes || [];
          console.log("图片哈希数组:", imageHashes);
          
          // 格式化时间戳
          const timestamp = new Date(Number(evaluation.timestamp) * 1000);
          
          // 计算统计数据
          totalRating += Number(evaluation.overallRating);
          totalTeachingAbility += Number(evaluation.teachingAbilityRating);
          totalTeachingAttitude += Number(evaluation.teachingAttitudeRating);
          totalTeachingMethod += Number(evaluation.teachingMethodRating);
          totalAcademicLevel += Number(evaluation.academicLevelRating);
          totalGuidanceAbility += Number(evaluation.guidanceAbilityRating);
          
          if (evaluation.isAnonymous) anonymousCount++;
          if (Number(evaluation.overallRating) >= 4) highRatingCount++;
          
          evaluationsList.push({
            id: evaluationId.toString(),
            studentAddress: evaluation.student,
            studentName: evaluation.isAnonymous ? "匿名学生" : studentName,
            teacherAddress: evaluation.teacher,
            contentHash: evaluation.contentHash,
            imageHashes: imageHashes,
            overallRating: Number(evaluation.overallRating),
            teachingAbilityRating: Number(evaluation.teachingAbilityRating),
            teachingAttitudeRating: Number(evaluation.teachingAttitudeRating),
            teachingMethodRating: Number(evaluation.teachingMethodRating),
            academicLevelRating: Number(evaluation.academicLevelRating),
            guidanceAbilityRating: Number(evaluation.guidanceAbilityRating),
            isAnonymous: evaluation.isAnonymous,
            timestamp: timestamp,
            formattedDate: timestamp.toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          });
        } catch (error) {
          console.error(`获取评价详情失败 ${evaluationIds[i]}:`, error);
        }
      }
      
      // 按时间排序（从新到旧）
      evaluationsList.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log("评价列表:", evaluationsList);
      setEvaluations(evaluationsList);
      setFilteredEvaluations(evaluationsList);
      
      const count = evaluationsList.length;
      
      // 更新统计数据
      setEvaluationStats({
        total: count,
        anonymous: anonymousCount,
        highRating: highRatingCount,
        avgRating: count > 0 ? (totalRating / count).toFixed(1) : 0,
        avgTeachingAbility: count > 0 ? (totalTeachingAbility / count).toFixed(1) : 0,
        avgTeachingAttitude: count > 0 ? (totalTeachingAttitude / count).toFixed(1) : 0,
        avgTeachingMethod: count > 0 ? (totalTeachingMethod / count).toFixed(1) : 0,
        avgAcademicLevel: count > 0 ? (totalAcademicLevel / count).toFixed(1) : 0,
        avgGuidanceAbility: count > 0 ? (totalGuidanceAbility / count).toFixed(1) : 0
      });
      
    } catch (err) {
      console.error("加载教师评价列表失败:", err);
      setError('获取教师评价列表失败: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };
  
  // 从IPFS加载评价内容
  const loadEvaluationContent = async (contentHash) => {
    try {
      setEvaluationContentLoading(true);
      console.log("加载评价内容:", contentHash);
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${contentHash}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEvaluationContent(data.content);
    } catch (err) {
      console.error("加载评价内容失败:", err);
      setEvaluationContent("加载评价内容失败，请稍后重试。");
    } finally {
      setEvaluationContentLoading(false);
    }
  };
  
  // 查看评价详情
  const viewEvaluationDetail = (evaluation) => {
    setSelectedEvaluation(evaluation);
    loadEvaluationContent(evaluation.contentHash);
    setDetailVisible(true);
  };
  
  // 关闭详情抽屉
  const closeDetail = () => {
    setDetailVisible(false);
    setSelectedEvaluation(null);
    setEvaluationContent('');
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
  
  // 搜索过滤
  const handleSearch = (value) => {
    setSearchText(value);
    filterEvaluations(value, filterType);
  };
  
  // 类型过滤
  const handleFilterChange = (value) => {
    setFilterType(value);
    filterEvaluations(searchText, value);
  };
  
  // 过滤评价列表
  const filterEvaluations = (search, type) => {
    let filtered = [...evaluations];
    
    // 按搜索文本过滤
    if (search) {
      filtered = filtered.filter(evaluation => 
        !evaluation.isAnonymous && evaluation.studentName.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // 按类型过滤
    switch (type) {
      case 'anonymous':
        filtered = filtered.filter(evaluation => evaluation.isAnonymous);
        break;
      case 'high-rating':
        filtered = filtered.filter(evaluation => evaluation.overallRating >= 4);
        break;
      case 'recent':
        filtered = [...filtered].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
        break;
      default:
        // 不做特殊处理
        break;
    }
    
    setFilteredEvaluations(filtered);
  };
  
  // 退出登录
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

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#34a853', // 教师端主题色
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
          <TeacherSidebar defaultSelectedKey="6" defaultOpenKey="sub3" />
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页' },
                { title: '评价管理' },
                { title: '教师评价' },
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
              {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16 }}>加载中...</div>
                </div>
              ) : error ? (
                <Alert
                  message="错误"
                  description={error}
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              ) : !hasEvaluations ? (
                <Empty
                  description={
                    <span>
                      您还没有收到任何学生对您的评价。
                    </span>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <>
                  {/* 统计数据卡片 */}
                  <div className={styles.statsContainer}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Card className={styles.statCard} title="总体评价">
                          <Row gutter={[16, 16]}>
                            <Col span={12}>
                              <Statistic 
                                title="评价总数" 
                                value={evaluationStats.total} 
                                prefix={<CommentOutlined className={styles.statIcon} />} 
                              />
                            </Col>
                            <Col span={12}>
                              <Statistic 
                                title="匿名评价" 
                                value={evaluationStats.anonymous} 
                                prefix={<UserOutlined className={styles.statIcon} />} 
                                suffix={`/ ${evaluationStats.total}`}
                              />
                            </Col>
                            <Col span={24}>
                              <div style={{ marginTop: 16 }}>
                                <Title level={2} style={{ textAlign: 'center', marginBottom: 8 }}>
                                  {evaluationStats.avgRating}
                                  <span style={{ fontSize: '16px', color: '#666', marginLeft: 8 }}>/5</span>
                                </Title>
                                <div style={{ textAlign: 'center' }}>
                                  <Rate disabled allowHalf value={parseFloat(evaluationStats.avgRating)} />
                                </div>
                                <Paragraph style={{ textAlign: 'center', marginTop: 8 }}>
                                  总体平均评分
                                </Paragraph>
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card className={styles.statCard} title="维度评分">
                          <RatingDisplay 
                            title="教学能力" 
                            value={parseFloat(evaluationStats.avgTeachingAbility)} 
                            color="#1890ff" 
                            icon={<BookOutlined />} 
                          />
                          <RatingDisplay 
                            title="教学态度" 
                            value={parseFloat(evaluationStats.avgTeachingAttitude)} 
                            color="#52c41a" 
                            icon={<TeamOutlined />} 
                          />
                          <RatingDisplay 
                            title="教学方法" 
                            value={parseFloat(evaluationStats.avgTeachingMethod)} 
                            color="#faad14" 
                            icon={<FileTextOutlined />} 
                          />
                          <RatingDisplay 
                            title="学术水平" 
                            value={parseFloat(evaluationStats.avgAcademicLevel)} 
                            color="#722ed1" 
                            icon={<BarChartOutlined />} 
                          />
                          <RatingDisplay 
                            title="指导能力" 
                            value={parseFloat(evaluationStats.avgGuidanceAbility)} 
                            color="#eb2f96" 
                            icon={<CommentOutlined />} 
                          />
                        </Card>
                      </Col>
                    </Row>
                  </div>

                  {/* 搜索和筛选 */}
                  <div className={styles.toolbarContainer}>
                    <Row gutter={[16, 16]} align="middle">
                      <Col xs={24} sm={12} md={14} lg={16}>
                        <Search
                          placeholder="搜索学生姓名（仅限非匿名评价）"
                          allowClear
                          enterButton="搜索"
                          size="middle"
                          onSearch={handleSearch}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col xs={24} sm={12} md={10} lg={8}>
                        <Select
                          style={{ width: '100%' }}
                          placeholder="筛选评价类型"
                          onChange={handleFilterChange}
                          defaultValue="all"
                        >
                          <Option value="all">全部评价</Option>
                          <Option value="anonymous">匿名评价</Option>
                          <Option value="high-rating">高分评价 (≥4)</Option>
                          <Option value="recent">最近评价</Option>
                        </Select>
                      </Col>
                    </Row>
                  </div>

                  {/* 评价列表 */}
                  <div className={styles.evaluationListContainer}>
                    <List
                      dataSource={filteredEvaluations}
                      renderItem={(evaluation) => (
                        <List.Item>
                          <Card 
                            hoverable 
                            className={styles.evaluationCard}
                            style={{ width: '100%' }}
                          >
                            <Row gutter={[16, 16]}>
                              <Col xs={24} sm={6}>
                                <div className={styles.evaluationHeader}>
                                  <Avatar 
                                    size={64} 
                                    icon={<UserOutlined />} 
                                    style={{ backgroundColor: evaluation.isAnonymous ? '#87d068' : '#1a73e8' }}
                                  />
                                  <div className={styles.evaluationMeta}>
                                    <div className={styles.studentName}>
                                      {evaluation.studentName}
                                      {evaluation.isAnonymous && (
                                        <Tag color="green" style={{ marginLeft: 8 }}>匿名</Tag>
                                      )}
                                    </div>
                                    <div className={styles.evaluationTime}>
                                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                                      {evaluation.formattedDate}
                                    </div>
                                  </div>
                                </div>
                              </Col>
                              <Col xs={24} sm={18}>
                                <div className={styles.ratingsContainer}>
                                  <div className={styles.overallRating}>
                                    <div>总体评分</div>
                                    <Rate 
                                      disabled 
                                      value={evaluation.overallRating} 
                                      style={{ fontSize: 18 }}
                                    />
                                    <span className={styles.ratingText}>
                                      {evaluation.overallRating}.0
                                    </span>
                                  </div>
                                  <Divider style={{ margin: '12px 0' }} />
                                  <Row gutter={[8, 8]}>
                                    <Col xs={12} sm={8} md={4}>
                                      <div className={styles.dimensionRating}>
                                        <div>教学能力</div>
                                        <Rate 
                                          disabled 
                                          value={evaluation.teachingAbilityRating} 
                                          style={{ fontSize: 14 }}
                                        />
                                      </div>
                                    </Col>
                                    <Col xs={12} sm={8} md={4}>
                                      <div className={styles.dimensionRating}>
                                        <div>教学态度</div>
                                        <Rate 
                                          disabled 
                                          value={evaluation.teachingAttitudeRating} 
                                          style={{ fontSize: 14 }}
                                        />
                                      </div>
                                    </Col>
                                    <Col xs={12} sm={8} md={4}>
                                      <div className={styles.dimensionRating}>
                                        <div>教学方法</div>
                                        <Rate 
                                          disabled 
                                          value={evaluation.teachingMethodRating} 
                                          style={{ fontSize: 14 }}
                                        />
                                      </div>
                                    </Col>
                                    <Col xs={12} sm={8} md={4}>
                                      <div className={styles.dimensionRating}>
                                        <div>学术水平</div>
                                        <Rate 
                                          disabled 
                                          value={evaluation.academicLevelRating} 
                                          style={{ fontSize: 14 }}
                                        />
                                      </div>
                                    </Col>
                                    <Col xs={12} sm={8} md={4}>
                                      <div className={styles.dimensionRating}>
                                        <div>指导能力</div>
                                        <Rate 
                                          disabled 
                                          value={evaluation.guidanceAbilityRating} 
                                          style={{ fontSize: 14 }}
                                        />
                                      </div>
                                    </Col>
                                    <Col xs={12} sm={8} md={4}>
                                      <Button 
                                        type="primary" 
                                        icon={<EyeOutlined />} 
                                        onClick={() => viewEvaluationDetail(evaluation)}
                                        style={{ marginTop: 6 }}
                                      >
                                        查看详情
                                      </Button>
                                    </Col>
                                  </Row>
                                </div>
                              </Col>
                            </Row>
                          </Card>
                        </List.Item>
                      )}
                    />
                  </div>
                </>
              )}
              
              {/* 评价详情抽屉 */}
              {selectedEvaluation && (
                <Drawer
                  title={`评价详情`}
                  placement="right"
                  width={window.innerWidth > 768 ? 600 : '80%'}
                  onClose={closeDetail}
                  open={detailVisible}
                  extra={
                    <Space>
                      <Button onClick={closeDetail}>关闭</Button>
                    </Space>
                  }
                >
                  <div className={styles.evaluationDetail}>
                    {/* 学生信息 */}
                    <div className={styles.studentInfoDetail}>
                      <Avatar 
                        size={64}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: selectedEvaluation.isAnonymous ? '#87d068' : '#1a73e8' }}
                      />
                      <div className={styles.studentDetailInfo}>
                        <Title level={4} style={{ margin: 0 }}>
                          {selectedEvaluation.studentName}
                          {selectedEvaluation.isAnonymous && (
                            <Tag color="green" style={{ marginLeft: 8 }}>匿名评价</Tag>
                          )}
                        </Title>
                        <Text type="secondary">
                          <ClockCircleOutlined style={{ marginRight: 8 }} />
                          评价时间: {selectedEvaluation.formattedDate}
                        </Text>
                      </div>
                    </div>
                    
                    <Divider />
                    
                    {/* 评分详情 */}
                    <div className={styles.ratingDetails}>
                      <Title level={4}>评分详情</Title>
                      <div className={styles.overallRatingDetail}>
                        <Text strong>总体评分:</Text>
                        <div className={styles.starRating}>
                          <Rate disabled value={selectedEvaluation.overallRating} />
                          <Text strong style={{ marginLeft: 8 }}>
                            {selectedEvaluation.overallRating}.0
                          </Text>
                        </div>
                      </div>
                      
                      <div className={styles.dimensionRatings}>
                        <div className={styles.dimensionRating}>
                          <Text>教学能力:</Text>
                          <Rate disabled value={selectedEvaluation.teachingAbilityRating} />
                        </div>
                        <div className={styles.dimensionRating}>
                          <Text>教学态度:</Text>
                          <Rate disabled value={selectedEvaluation.teachingAttitudeRating} />
                        </div>
                        <div className={styles.dimensionRating}>
                          <Text>教学方法:</Text>
                          <Rate disabled value={selectedEvaluation.teachingMethodRating} />
                        </div>
                        <div className={styles.dimensionRating}>
                          <Text>学术水平:</Text>
                          <Rate disabled value={selectedEvaluation.academicLevelRating} />
                        </div>
                        <div className={styles.dimensionRating}>
                          <Text>指导能力:</Text>
                          <Rate disabled value={selectedEvaluation.guidanceAbilityRating} />
                        </div>
                      </div>
                    </div>
                    
                    <Divider />
                    
                    {/* 评价内容 */}
                    <div className={styles.contentDetail}>
                      <Title level={4}>评价内容</Title>
                      {evaluationContentLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <Spin />
                          <div style={{ marginTop: 8 }}>加载评价内容中...</div>
                        </div>
                      ) : (
                        <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
                          {evaluationContent}
                        </Paragraph>
                      )}
                    </div>
                    
                    {/* 评价图片 */}
                    {selectedEvaluation.imageHashes && selectedEvaluation.imageHashes.length > 0 && (
                      <>
                        <Divider />
                        <div className={styles.imageGallery}>
                          <Title level={4}>附件图片</Title>
                          <div className={styles.images}>
                            <Row gutter={[16, 16]}>
                              {selectedEvaluation.imageHashes.map((hash, index) => (
                                <Col xs={24} sm={12} md={8} key={index}>
                                  <Card 
                                    hoverable 
                                    className={styles.imageCard}
                                    cover={
                                      <img
                                        alt={`附件图片 ${index + 1}`}
                                        src={`https://gateway.pinata.cloud/ipfs/${hash}`}
                                        style={{ height: 160, objectFit: 'cover' }}
                                        onClick={() => handlePreview(`https://gateway.pinata.cloud/ipfs/${hash}`)}
                                      />
                                    }
                                  >
                                    <Card.Meta title={`附件图片 ${index + 1}`} />
                                  </Card>
                                </Col>
                              ))}
                            </Row>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </Drawer>
              )}
              
              {/* 图片预览模态框 */}
              <Modal
                open={previewVisible}
                title="图片预览"
                footer={null}
                onCancel={handlePreviewClose}
              >
                <img alt="评价图片" style={{ width: '100%' }} src={previewImage} />
              </Modal>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
} 