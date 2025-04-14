'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import Image from 'next/image';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import ChainRate02ABI from '../../contracts/ChainRate02.json';
import ChainRate02Address from '../../contracts/ChainRate02-address.json';
import styles from './page.module.css';
import React from 'react';
import axios from 'axios'; 
import UserAvatar from '../components/UserAvatar';
import StudentSidebar from '../components/StudentSidebar';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  FormOutlined, 
  LogoutOutlined,
  TeamOutlined,
  StarOutlined,
  StarFilled,
  CalendarOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  SearchOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  MailOutlined,
  BankOutlined,
  ReadOutlined,
  NumberOutlined,
  BarChartOutlined,
  PieChartOutlined,
  PictureOutlined
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
  Rate,
  Input,
  List,
  Avatar,
  Select,
  Tabs,
  Statistic,
  Timeline,
  Badge,
  Space,
  Modal,
  message,
  Drawer,
  Image as AntImage
} from 'antd';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;
const { Meta } = Card;

export default function StudentViewEvaluateTeacherPage() {
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
    avgRating: 0
  });
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [contract02, setContract02] = useState(null);

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

  // 加载学生提交的教师评价列表
  const loadTeacherEvaluations = async (mainContract, teacherContract, studentAddress) => {
    try {
      setLoading(true);
      console.log("加载教师评价列表...");
      
      // 获取学生提交的所有教师评价ID
      const evaluationIds = await teacherContract.getStudentTeacherEvaluations(studentAddress);
      console.log("学生提交的教师评价ID:", evaluationIds);
      
      if (evaluationIds.length === 0) {
        console.log("学生未提交任何教师评价");
        setHasEvaluations(false);
        setLoading(false);
        return;
      }
      
      setHasEvaluations(true);
      
      // 获取所有评价详情
      const evaluationsList = [];
      let totalRating = 0;
      let anonymousCount = 0;
      let highRatingCount = 0;
      
      for (let i = 0; i < evaluationIds.length; i++) {
        try {
          const evaluationId = evaluationIds[i];
          const evaluation = await teacherContract.teacherEvaluations(evaluationId);
          
          console.log(`获取评价 ${evaluationId} 的教师信息:`, evaluation.teacher);
          
          // 获取教师信息 - 从ChainRate主合约中获取
          const teacherInfo = await mainContract.getUserInfo(evaluation.teacher);
          console.log("教师信息:", teacherInfo);
          
          // 确保提取的头像哈希是有效的
          const avatarHash = teacherInfo[6];
          console.log("教师头像哈希:", avatarHash);
          
          // 检查头像哈希是否已经是完整URL
          let avatarUrl = null;
          if (avatarHash && avatarHash.trim() !== "") {
            // 如果已经是完整URL，直接使用
            if (avatarHash.startsWith('http')) {
              avatarUrl = avatarHash;
            } else {
              // 否则拼接IPFS网关
              avatarUrl = `https://gateway.pinata.cloud/ipfs/${avatarHash}`;
            }
          }
          console.log("头像URL:", avatarUrl);
          
          // 检查图片哈希数组
          const imageHashes = evaluation.imageHashes || [];
          console.log("图片哈希数组:", imageHashes);
          
          // 格式化时间戳
          const timestamp = new Date(Number(evaluation.timestamp) * 1000);
          
          // 计算统计数据
          totalRating += Number(evaluation.overallRating);
          if (evaluation.isAnonymous) anonymousCount++;
          if (Number(evaluation.overallRating) >= 4) highRatingCount++;
          
          evaluationsList.push({
            id: evaluationId.toString(),
            studentAddress: evaluation.student,
            teacherAddress: evaluation.teacher,
            teacherName: teacherInfo[0],
            teacherCollege: teacherInfo[3],
            teacherAvatar: avatarUrl,
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
      
      // 更新统计数据
      setEvaluationStats({
        total: evaluationsList.length,
        anonymous: anonymousCount,
        highRating: highRatingCount,
        avgRating: evaluationsList.length > 0 ? (totalRating / evaluationsList.length).toFixed(1) : 0
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
      evaluation.teacherName.toLowerCase().includes(search.toLowerCase()) ||
      evaluation.teacherCollege.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // 按类型过滤
  if (type !== 'all') {
    if (type === 'anonymous') {
      filtered = filtered.filter(evaluation => evaluation.isAnonymous);
    } else if (type === 'high-rating') {
      filtered = filtered.filter(evaluation => evaluation.overallRating >= 4);
    } else if (type === 'recent') {
      // 已经按时间排序，只需取最近的
      filtered = filtered.slice(0, 5);
      }
    }
    
    setFilteredEvaluations(filtered);
  };
  
  // 获取主题变量
  const {
    token: { colorBgContainer, borderRadiusLG, colorPrimary },
  } = theme.useToken();

  // 评分项描述
  const ratingLabels = {
    teachingAbility: '教学能力',
    teachingAttitude: '教学态度',
    teachingMethod: '教学方法',
    academicLevel: '学术水平',
    guidanceAbility: '指导能力'
  };

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
            <StudentSidebar defaultSelectedKey="6" defaultOpenKey="sub3" />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页' },
                { title: '评价管理' },
                { title: '查看教师评价' },
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
                      您还没有提交任何教师评价。
                      <br />
                      前往教师评价页面提交您的第一个评价吧！
                    </span>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button 
                    type="primary" 
                    icon={<FormOutlined />}
                    onClick={() => router.push('/studentEvaluateTeacher')}
                  >
                    去评价教师
                  </Button>
                </Empty>
              ) : (
                <>
                  {/* 统计数据卡片 */}
                  <div className={styles.statsContainer}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                          <Statistic 
                            title="评价总数" 
                            value={evaluationStats.total} 
                            prefix={<CommentOutlined className={styles.statIcon} />} 
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                          <Statistic 
                            title="匿名评价" 
                            value={evaluationStats.anonymous} 
                            prefix={<UserOutlined className={styles.statIcon} />} 
                            suffix={`/ ${evaluationStats.total}`}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                          <Statistic 
                            title="平均评分" 
                            value={evaluationStats.avgRating} 
                            prefix={<StarFilled className={styles.statIcon} />} 
                            suffix="/ 5"
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Card className={styles.statCard}>
                          <Statistic 
                            title="高分评价 (≥4)" 
                            value={evaluationStats.highRating} 
                            prefix={<StarOutlined className={styles.statIcon} />} 
                            suffix={`/ ${evaluationStats.total}`}
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
                          placeholder="搜索教师名称或学院"
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
                          <Select.Option value="all">全部评价</Select.Option>
                          <Select.Option value="anonymous">匿名评价</Select.Option>
                          <Select.Option value="high-rating">高分评价 (≥4)</Select.Option>
                          <Select.Option value="recent">最近评价</Select.Option>
                        </Select>
                      </Col>
                    </Row>
                  </div>

                  {/* 评价列表 */}
                  <div className={styles.evaluationListContainer}>
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
                      dataSource={filteredEvaluations}
                      renderItem={(evaluation) => (
                        <List.Item>
                          <Card 
                            hoverable 
                            className={styles.evaluationCard}
                            actions={[
                              <Button 
                                type="primary" 
                                icon={<EyeOutlined />} 
                                onClick={() => viewEvaluationDetail(evaluation)}
                              >
                                查看详情
                              </Button>
                            ]}
                          >
                            <Row gutter={[16, 16]}>
                              <Col xs={24} md={8}>
                                <div className={styles.teacherAvatar}>
                                  <Avatar 
                                    size={120} 
                                    src={evaluation.teacherAvatar || null}
                                    icon={!evaluation.teacherAvatar ? <UserOutlined /> : null} 
                                  />
                                </div>
                              </Col>
                              <Col xs={24} md={16}>
                                <div className={styles.evaluationInfo}>
                                  <div className={styles.teacherName}>
                                    {evaluation.teacherName}
                                    {evaluation.isAnonymous && (
                                      <Tag color="blue" style={{ marginLeft: 8 }}>匿名</Tag>
                                    )}
                                  </div>
                                  <div className={styles.teacherCollege}>
                                    {evaluation.teacherCollege}
                                  </div>
                                  <div className={styles.evaluationRating}>
                                    <Rate 
                                      disabled 
                                      value={evaluation.overallRating} 
                                      size="small"
                                      style={{ fontSize: '14px' }}
                                    />
                                    <span className={styles.ratingText}>
                                      {evaluation.overallRating}.0
                                    </span>
                                  </div>
                                  <div className={styles.evaluationTime}>
                                    <ClockCircleOutlined style={{ marginRight: 4 }} />
                                    {evaluation.formattedDate}
                                  </div>
                                </div>
                              </Col>
                            </Row>
                            <Divider style={{ margin: '16px 0' }} />
                            <div className={styles.detailedRatings}>
                              <Row gutter={[8, 8]}>
                                {Object.entries(ratingLabels).map(([key, label]) => (
                                  <Col span={12} key={key}>
                                    <div className={styles.ratingItem}>
                                      <span className={styles.ratingLabel}>{label}:</span>
                                      <Rate 
                                        disabled 
                                        value={evaluation[`${key}Rating`]} 
                                        size="small"
                                      />
                                    </div>
                                  </Col>
                                ))}
                              </Row>
                            </div>
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
                  title={`${selectedEvaluation.teacherName} 的评价详情`}
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
                    {/* 教师信息 */}
                    <div className={styles.teacherInfoDetail}>
                      <Avatar 
                        size={64}
                        src={selectedEvaluation.teacherAvatar && selectedEvaluation.teacherAvatar.trim() !== "" ? 
                          selectedEvaluation.teacherAvatar : null}
                        icon={!selectedEvaluation.teacherAvatar || selectedEvaluation.teacherAvatar.trim() === "" ? <UserOutlined /> : null}
                      />
                      <div className={styles.teacherInfoText}>
                        <Title level={4}>{selectedEvaluation.teacherName}</Title>
                        <Text type="secondary">{selectedEvaluation.teacherCollege}</Text>
                      </div>
                    </div>
                    
                    {/* 评价信息 */}
                    <Card title="评价内容" className={styles.contentCard}>
                      {evaluationContentLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <Spin />
                          <div style={{ marginTop: 8 }}>加载评价内容...</div>
                        </div>
                      ) : (
                        <Paragraph>{evaluationContent}</Paragraph>
                      )}
                    </Card>
                    
                    {/* 评分详情 */}
                    <Card title="评分详情" className={styles.ratingCard}>
                      <div className={styles.overallRating}>
                        <span className={styles.overallRatingLabel}>总体评分:</span>
                        <Rate 
                          disabled 
                          value={selectedEvaluation.overallRating}
                          size="small"
                          style={{ fontSize: '16px' }}
                        />
                        <span className={styles.ratingValue}>{selectedEvaluation.overallRating}.0</span>
                      </div>
                      <div className={styles.detailedRatingsDetail}>
                        {Object.entries(ratingLabels).map(([key, label]) => (
                          <div className={styles.ratingItemDetail} key={key}>
                            <span className={styles.ratingLabelDetail}>{label}:</span>
                            <Rate 
                              disabled 
                              value={selectedEvaluation[`${key}Rating`]}
                              size="small"
                              style={{ fontSize: '14px' }}
                            />
                            <span className={styles.ratingValueDetail}>
                              {selectedEvaluation[`${key}Rating`]}.0
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                    
                    {/* 评价图片 */}
                    {selectedEvaluation.imageHashes && selectedEvaluation.imageHashes.length > 0 && (
                      <Card title="附加图片" className={styles.imagesCard}>
                        <div className={styles.imageGrid}>
                          {selectedEvaluation.imageHashes.map((hash, index) => (
                            <div 
                              key={index} 
                              className={styles.imageItem}
                              onClick={() => handlePreview(`https://gateway.pinata.cloud/ipfs/${hash}`)}
                            >
                              <img 
                                src={`https://gateway.pinata.cloud/ipfs/${hash}`} 
                                alt={`评价图片 ${index + 1}`}
                                className={styles.thumbnail}
                              />
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                    
                    {/* 评价信息 */}
                    <Card title="评价信息" className={styles.metaCard}>
                      <div className={styles.metaItem}>
                        <ClockCircleOutlined className={styles.metaIcon} />
                        <span className={styles.metaLabel}>提交时间:</span>
                        <span className={styles.metaValue}>{selectedEvaluation.formattedDate}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <GlobalOutlined className={styles.metaIcon} />
                        <span className={styles.metaLabel}>教师地址:</span>
                        <span className={styles.metaValue} style={{ wordBreak: 'break-all' }}>
                          {selectedEvaluation.teacherAddress}
                        </span>
                      </div>
                      <div className={styles.metaItem}>
                        <FileTextOutlined className={styles.metaIcon} />
                        <span className={styles.metaLabel}>评价ID:</span>
                        <span className={styles.metaValue}>{selectedEvaluation.id}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <UserOutlined className={styles.metaIcon} />
                        <span className={styles.metaLabel}>匿名评价:</span>
                        <span className={styles.metaValue}>
                          {selectedEvaluation.isAnonymous ? '是' : '否'}
                        </span>
                      </div>
                    </Card>
                  </div>
                </Drawer>
              )}
              
              {/* 图片预览模态框 */}
              <Modal
                open={previewVisible}
                footer={null}
                onCancel={handlePreviewClose}
                width="auto"
                centered
                style={{ maxWidth: '90%' }}
              >
                <img 
                  alt="图片预览" 
                  style={{ width: '100%' }} 
                  src={previewImage} 
                />
              </Modal>
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