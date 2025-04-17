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
  CalendarOutlined,
  StarFilled,
  FileTextOutlined,
  TeamOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  RiseOutlined,
  FallOutlined,
  FilterOutlined,
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
  Progress,
  Divider,
  Typography,
  Spin,
  Alert,
  Select,
  DatePicker,
  Radio,
  Tooltip,
  Empty,
  Rate,
  List,
  Table,
  Tag
} from 'antd';
import UserAvatar from '../components/UserAvatar';
import TeacherSidebar from '../components/TeacherSidebar';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// 评分维度组件
const RatingDisplay = ({ title, value, color, icon, showProgress = true }) => (
  <div className={styles.ratingDisplayContainer}>
    <div className={styles.ratingTitle}>
      {icon} <span>{title}</span>
    </div>
    <div className={styles.ratingContent}>
      <div className={styles.ratingStars}>
        <Rate allowHalf disabled value={value} style={{ fontSize: 16, whiteSpace: 'nowrap', display: 'inline-flex' }} />
        <span className={styles.ratingValue}>{value.toFixed(1)}</span>
      </div>
      {showProgress && (
        <Progress 
          percent={value * 20} 
          showInfo={false} 
          strokeColor={color} 
          trailColor="#f5f5f5" 
          strokeWidth={8} 
          className={styles.ratingProgress}
        />
      )}
    </div>
  </div>
);

// 趋势指标组件
const TrendIndicator = ({ current, previous, title, suffix = '', precision = 1 }) => {
  const diff = current - previous;
  const percentage = previous !== 0 ? (diff / previous) * 100 : 0;
  const isUp = diff > 0;
  const isNoChange = diff === 0;
  
  return (
    <div className={styles.trendIndicator}>
      <div className={styles.trendTitle}>{title}</div>
      <div className={styles.trendValue}>
        {current.toFixed(precision)}{suffix}
      </div>
      <div className={
        `${styles.trendChange} ${isUp ? styles.up : isNoChange ? styles.neutral : styles.down}`
      }>
        {isNoChange ? (
          <span>无变化</span>
        ) : (
          <>
            {isUp ? <RiseOutlined /> : <FallOutlined />}
            <span>{Math.abs(percentage).toFixed(1)}%</span>
          </>
        )}
      </div>
    </div>
  );
};

export default function TeacherStatisticalAnalysisPage() {
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

  // 统计数据状态
  const [evaluations, setEvaluations] = useState([]);
  const [timeRange, setTimeRange] = useState('all'); // all, month, week
  const [overallStats, setOverallStats] = useState({
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
  
  // 趋势数据状态
  const [trends, setTrends] = useState({
    currentPeriod: {
      total: 0,
      avgRating: 0,
      highRating: 0
    },
    previousPeriod: {
      total: 0,
      avgRating: 0,
      highRating: 0
    }
  });
  
  // 评分分布状态
  const [ratingDistribution, setRatingDistribution] = useState([
    { name: '5星', value: 0, color: '#1a73e8' },
    { name: '4星', value: 0, color: '#1890ff' },
    { name: '3星', value: 0, color: '#faad14' },
    { name: '2星', value: 0, color: '#fa8c16' },
    { name: '1星', value: 0, color: '#f5222d' }
  ]);

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
        
        const chainRate02Contract = new ethers.Contract(
          ChainRate02Address.address,
          ChainRate02ABI.abi,
          signer
        );
        setContract02(chainRate02Contract);
        
        // 加载教师评价统计数据
        await loadTeacherEvaluationStats(chainRateContract, chainRate02Contract, await signer.getAddress());
        
        // 设置定时刷新
        const interval = setInterval(async () => {
          if (chainRateContract && chainRate02Contract && signer) {
            await loadTeacherEvaluationStats(chainRateContract, chainRate02Contract, await signer.getAddress());
          }
        }, 30000); // 每30秒刷新一次
        
        setRefreshInterval(interval);
        
        setLoading(false);
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
  
  // 时间范围改变处理
  useEffect(() => {
    if (evaluations.length > 0) {
      calculateStats();
    }
  }, [timeRange, evaluations]);
  
  // 加载教师收到的所有评价
  const loadTeacherEvaluationStats = async (mainContract, teacherContract, teacherAddress) => {
    try {
      setLoading(true);
      console.log("加载教师评价统计数据...");
      
      // 获取该教师收到的所有评价ID
      const evaluationIds = await teacherContract.getTeacherEvaluations(teacherAddress);
      console.log("教师收到的评价ID:", evaluationIds);
      
      if (evaluationIds.length === 0) {
        console.log("教师未收到任何评价");
        setLoading(false);
        return;
      }
      
      // 获取所有评价详情
      const evaluationsList = [];
      
      for (let i = 0; i < evaluationIds.length; i++) {
        try {
          const evaluationId = evaluationIds[i];
          // 获取评价详情
          const evaluation = await teacherContract.getTeacherEvaluationDetails(evaluationId);
          
          // 格式化时间戳
          const timestamp = new Date(Number(evaluation.timestamp) * 1000);
          
          evaluationsList.push({
            id: evaluationId.toString(),
            studentAddress: evaluation.student,
            contentHash: evaluation.contentHash,
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
      
    } catch (err) {
      console.error("加载教师评价统计数据失败:", err);
      setError('获取教师评价统计数据失败: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };
  
  // 根据时间范围筛选评价并计算统计数据
  const calculateStats = () => {
    // 获取当前时间
    const now = new Date();
    
    // 获取筛选起始时间
    let startDate;
    if (timeRange === 'week') {
      // 最近一周
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      // 最近一个月
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
    } else {
      // 全部时间
      startDate = new Date(0);
    }
    
    // 筛选当前时间段的评价
    const currentPeriodEvals = evaluations.filter(evaluation => evaluation.timestamp >= startDate);
    
    // 计算总体统计数据
    let totalRating = 0;
    let totalTeachingAbility = 0;
    let totalTeachingAttitude = 0;
    let totalTeachingMethod = 0;
    let totalAcademicLevel = 0;
    let totalGuidanceAbility = 0;
    let anonymousCount = 0;
    let highRatingCount = 0;
    
    // 评分分布数据
    const distribution = [0, 0, 0, 0, 0]; // 1-5星评价数量
    
    currentPeriodEvals.forEach(evaluation => {
      totalRating += evaluation.overallRating;
      totalTeachingAbility += evaluation.teachingAbilityRating;
      totalTeachingAttitude += evaluation.teachingAttitudeRating;
      totalTeachingMethod += evaluation.teachingMethodRating;
      totalAcademicLevel += evaluation.academicLevelRating;
      totalGuidanceAbility += evaluation.guidanceAbilityRating;
      
      if (evaluation.isAnonymous) anonymousCount++;
      if (evaluation.overallRating >= 4) highRatingCount++;
      
      // 统计评分分布
      distribution[Math.floor(evaluation.overallRating) - 1]++;
    });
    
    // 更新评分分布
    const distributionData = [
      { name: '5星', value: distribution[4], color: '#1a73e8' },
      { name: '4星', value: distribution[3], color: '#1890ff' },
      { name: '3星', value: distribution[2], color: '#faad14' },
      { name: '2星', value: distribution[1], color: '#fa8c16' },
      { name: '1星', value: distribution[0], color: '#f5222d' }
    ];
    setRatingDistribution(distributionData);
    
    // 更新总体统计
    const count = currentPeriodEvals.length;
    setOverallStats({
      total: count,
      anonymous: anonymousCount,
      highRating: highRatingCount,
      avgRating: count > 0 ? (totalRating / count) : 0,
      avgTeachingAbility: count > 0 ? (totalTeachingAbility / count) : 0,
      avgTeachingAttitude: count > 0 ? (totalTeachingAttitude / count) : 0,
      avgTeachingMethod: count > 0 ? (totalTeachingMethod / count) : 0,
      avgAcademicLevel: count > 0 ? (totalAcademicLevel / count) : 0,
      avgGuidanceAbility: count > 0 ? (totalGuidanceAbility / count) : 0
    });
    
    // 计算趋势数据（与前一个相同时间段比较）
    let previousStartDate;
    if (timeRange === 'week') {
      // 前一周
      previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - 7);
    } else if (timeRange === 'month') {
      // 前一个月
      previousStartDate = new Date(startDate);
      previousStartDate.setMonth(previousStartDate.getMonth() - 1);
    } else {
      // 对于全部时间，我们取当前总数据的一半作为比较基础
      const middleIndex = Math.floor(evaluations.length / 2);
      const recentEvals = evaluations.slice(0, middleIndex);
      const olderEvals = evaluations.slice(middleIndex);
      
      // 计算前半部分数据
      let prevTotalRating = 0;
      let prevHighRatingCount = 0;
      olderEvals.forEach(evaluation => {
        prevTotalRating += evaluation.overallRating;
        if (evaluation.overallRating >= 4) prevHighRatingCount++;
      });
      
      setTrends({
        currentPeriod: {
          total: recentEvals.length,
          avgRating: recentEvals.length > 0 ? (recentEvals.reduce((sum, evaluation) => sum + evaluation.overallRating, 0) / recentEvals.length) : 0,
          highRating: recentEvals.filter(evaluation => evaluation.overallRating >= 4).length
        },
        previousPeriod: {
          total: olderEvals.length,
          avgRating: olderEvals.length > 0 ? (prevTotalRating / olderEvals.length) : 0,
          highRating: prevHighRatingCount
        }
      });
      
      return;
    }
    
    // 筛选上一个时间段的评价
    const previousPeriodEvals = evaluations.filter(evaluation => 
      evaluation.timestamp >= previousStartDate && evaluation.timestamp < startDate
    );
    
    // 计算上一个时间段的统计数据
    let prevTotalRating = 0;
    let prevHighRatingCount = 0;
    
    previousPeriodEvals.forEach(evaluation => {
      prevTotalRating += evaluation.overallRating;
      if (evaluation.overallRating >= 4) prevHighRatingCount++;
    });
    
    // 更新趋势数据
    setTrends({
      currentPeriod: {
        total: currentPeriodEvals.length,
        avgRating: currentPeriodEvals.length > 0 ? (totalRating / currentPeriodEvals.length) : 0,
        highRating: highRatingCount
      },
      previousPeriod: {
        total: previousPeriodEvals.length,
        avgRating: previousPeriodEvals.length > 0 ? (prevTotalRating / previousPeriodEvals.length) : 0,
        highRating: prevHighRatingCount
      }
    });
  };
  
  // 处理时间范围切换
  const handleTimeRangeChange = (value) => {
    setTimeRange(value);
  };
  
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8', // 使用蓝色主题
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
          <TeacherSidebar defaultSelectedKey="5" defaultOpenKey="sub4" />
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页' },
                { title: '数据分析' },
                { title: '统计分析' },
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
              ) : evaluations.length === 0 ? (
                <Empty
                  description={
                    <span>
                      您还没有收到任何学生对您的评价，无法生成统计数据。
                    </span>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <>
                  {/* 筛选条件 */}
                  <Card
                    title={
                      <div className={styles.cardTitle}>
                        <FilterOutlined style={{ marginRight: 8 }} />
                        数据筛选
                      </div>
                    }
                    style={{ marginBottom: 24 }}
                  >
                    <Row gutter={[16, 16]} align="middle">
                      <Col xs={24} md={8}>
                        <div className={styles.filterItem}>
                          <span className={styles.filterLabel}>时间范围：</span>
                          <Radio.Group 
                            value={timeRange} 
                            onChange={(e) => handleTimeRangeChange(e.target.value)}
                            buttonStyle="solid"
                          >
                            <Radio.Button value="all">全部</Radio.Button>
                            <Radio.Button value="month">近一个月</Radio.Button>
                            <Radio.Button value="week">近一周</Radio.Button>
                          </Radio.Group>
                        </div>
                      </Col>
                    </Row>
                  </Card>
                  
                  {/* 总体数据卡片 */}
                  <div className={styles.statisticsContainer}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24}>
                        <Card 
                          title={
                            <div className={styles.cardTitle}>
                              <PieChartOutlined style={{ marginRight: 8 }} />
                              评价统计概览
                            </div>
                          }
                        >
                          <Row gutter={[24, 24]}>
                            {/* 统计卡片 */}
                            <Col xs={24} sm={8} md={6}>
                              <Card className={styles.statCard}>
                                <Statistic 
                                  title="评价总数" 
                                  value={overallStats.total} 
                                  prefix={<CommentOutlined style={{ color: '#1a73e8' }} />} 
                                />
                                {timeRange !== 'all' && (
                                  <div className={styles.trendValue}>
                                    <TrendIndicator 
                                      current={trends.currentPeriod.total} 
                                      previous={trends.previousPeriod.total}
                                      title="较上期"
                                      precision={0}
                                    />
                                  </div>
                                )}
                              </Card>
                            </Col>
                            
                            <Col xs={24} sm={8} md={6}>
                              <Card className={styles.statCard}>
                                <Statistic 
                                  title="平均评分" 
                                  value={overallStats.avgRating.toFixed(1)} 
                                  prefix={<StarFilled style={{ color: '#faad14' }} />} 
                                  suffix="/5"
                                />
                                {timeRange !== 'all' && (
                                  <div className={styles.trendValue}>
                                    <TrendIndicator 
                                      current={trends.currentPeriod.avgRating} 
                                      previous={trends.previousPeriod.avgRating}
                                      title="较上期"
                                      suffix=""
                                    />
                                  </div>
                                )}
                              </Card>
                            </Col>
                            
                            <Col xs={24} sm={8} md={6}>
                              <Card className={styles.statCard}>
                                <Statistic 
                                  title="匿名评价" 
                                  value={overallStats.anonymous} 
                                  prefix={<UserOutlined style={{ color: '#1890ff' }} />} 
                                  suffix={`/ ${overallStats.total}`}
                                />
                              </Card>
                            </Col>
                            
                            <Col xs={24} sm={8} md={6}>
                              <Card className={styles.statCard}>
                                <Statistic 
                                  title="高分评价" 
                                  value={overallStats.highRating} 
                                  prefix={<StarFilled style={{ color: '#faad14' }} />} 
                                  suffix={`/ ${overallStats.total}`}
                                />
                                {timeRange !== 'all' && (
                                  <div className={styles.trendValue}>
                                    <TrendIndicator 
                                      current={trends.currentPeriod.highRating} 
                                      previous={trends.previousPeriod.highRating}
                                      title="较上期"
                                      precision={0}
                                    />
                                  </div>
                                )}
                              </Card>
                            </Col>
                            
                            <Col span={24}>
                              <Divider orientation="left">评分均值</Divider>
                              <Row gutter={[24, 24]}>
                                <Col xs={24} sm={12} md={8}>
                                  <div style={{ padding: '0 16px' }}>
                                    <RatingDisplay 
                                      title="总体评分" 
                                      value={overallStats.avgRating} 
                                      color="#faad14" 
                                      icon={<StarFilled />} 
                                    />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                  <div style={{ padding: '0 16px' }}>
                                    <RatingDisplay 
                                      title="教学能力" 
                                      value={overallStats.avgTeachingAbility} 
                                      color="#1890ff" 
                                      icon={<BookOutlined />} 
                                    />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                  <div style={{ padding: '0 16px' }}>
                                    <RatingDisplay 
                                      title="教学态度" 
                                      value={overallStats.avgTeachingAttitude} 
                                      color="#1a73e8" 
                                      icon={<TeamOutlined />} 
                                    />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                  <div style={{ padding: '0 16px' }}>
                                    <RatingDisplay 
                                      title="教学方法" 
                                      value={overallStats.avgTeachingMethod} 
                                      color="#faad14" 
                                      icon={<FileTextOutlined />} 
                                    />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                  <div style={{ padding: '0 16px' }}>
                                    <RatingDisplay 
                                      title="学术水平" 
                                      value={overallStats.avgAcademicLevel} 
                                      color="#722ed1" 
                                      icon={<BarChartOutlined />} 
                                    />
                                  </div>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                  <div style={{ padding: '0 16px' }}>
                                    <RatingDisplay 
                                      title="指导能力" 
                                      value={overallStats.avgGuidanceAbility} 
                                      color="#eb2f96" 
                                      icon={<CommentOutlined />} 
                                    />
                                  </div>
                                </Col>
                              </Row>
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                  
                  {/* 评分分布 */}
                  <div style={{ marginTop: 24 }}>
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Card 
                          title={
                            <div className={styles.cardTitle}>
                              <PieChartOutlined style={{ marginRight: 8 }} />
                              评分分布
                            </div>
                          }
                        >
                          <div className={styles.distributionContainer}>
                            {/* 评分分布柱状图 */}
                            {ratingDistribution.map((item, index) => (
                              <div key={index} className={styles.distributionItem}>
                                <div className={styles.distributionLabel}>{item.name}</div>
                                <div className={styles.distributionBar}>
                                  <div 
                                    className={styles.distributionBarInner} 
                                    style={{ 
                                      width: `${(item.value / overallStats.total) * 100}%`,
                                      backgroundColor: item.color
                                    }}
                                  />
                                </div>
                                <div className={styles.distributionValue}>
                                  {item.value}
                                  <span className={styles.distributionPercent}>
                                    ({overallStats.total > 0 ? 
                                      ((item.value / overallStats.total) * 100).toFixed(1) : 0}%)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </Col>
                      
                      {/* 评价趋势 */}
                      <Col xs={24} md={12}>
                        <Card 
                          title={
                            <div className={styles.cardTitle}>
                              <LineChartOutlined style={{ marginRight: 8 }} />
                              时间分布
                            </div>
                          }
                        >
                          <div className={styles.timeDistributionContainer}>
                            <div className={styles.timeDistributionContent}>
                              {/* 最近评价统计 */}
                              <List
                                header={<div>最近评价统计</div>}
                                dataSource={
                                  evaluations.slice(0, 5).map(evaluation => ({
                                    date: evaluation.formattedDate,
                                    rating: evaluation.overallRating
                                  }))
                                }
                                renderItem={(item) => (
                                  <List.Item>
                                    <div className={styles.timeDistributionItem}>
                                      <div className={styles.timeDistributionDate}>
                                        <CalendarOutlined style={{ marginRight: 8 }} />
                                        {item.date}
                                      </div>
                                      <div className={styles.timeDistributionRating}>
                                        <Rate 
                                          disabled 
                                          value={item.rating} 
                                          style={{ fontSize: 12 }} 
                                        />
                                        <span className={styles.timeDistributionRatingValue}>
                                          {item.rating.toFixed(1)}
                                        </span>
                                      </div>
                                    </div>
                                  </List.Item>
                                )}
                              />
                              
                              {/* 月度统计 */}
                              <div className={styles.monthlyStats}>
                                <div className={styles.monthlyStatsHeader}>
                                  月度评价统计
                                </div>
                                <div className={styles.monthlyStatsContent}>
                                  {/* 统计当前年份的每月评价数量 */}
                                  {(() => {
                                    const currentYear = new Date().getFullYear();
                                    const monthlyData = Array(12).fill(0);
                                    
                                    evaluations
                                      .filter(evaluation => evaluation.timestamp.getFullYear() === currentYear)
                                      .forEach(evaluation => {
                                        const month = evaluation.timestamp.getMonth();
                                        monthlyData[month]++;
                                      });
                                    
                                    return (
                                      <div className={styles.monthlyChart}>
                                        {monthlyData.map((count, index) => (
                                          <div key={index} className={styles.monthlyChartBar}>
                                            <div 
                                              className={styles.monthlyChartBarInner} 
                                              style={{ 
                                                height: `${(count / Math.max(...monthlyData, 1)) * 100}%`,
                                                backgroundColor: count > 0 ? '#1a73e8' : '#f0f0f0'
                                              }}
                                            >
                                              {count > 0 && (
                                                <div className={styles.monthlyChartBarValue}>
                                                  {count}
                                                </div>
                                              )}
                                            </div>
                                            <div className={styles.monthlyChartBarLabel}>
                                              {index + 1}月
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </>
              )}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
} 