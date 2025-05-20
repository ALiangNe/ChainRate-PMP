'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  InfoCircleOutlined,
  CheckOutlined,
  DownloadOutlined,
  FilePdfOutlined
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
  Tag,
  Checkbox,
  Button,
  message,
  Modal,
  Collapse
} from 'antd';
import UserAvatar from '../components/UserAvatar';
import TeacherSidebar from '../components/TeacherSidebar';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import { default as NextImage } from 'next/image';

// 注册Chart.js组件
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend);

const { Header, Content, Sider } = Layout;
const { Title: AntTitle, Text, Paragraph } = Typography;
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

  // 多维度评分趋势图相关状态
  const [selectedDimensions, setSelectedDimensions] = useState([
    'avgRating',
    'avgTeachingAbility',
    'avgTeachingAttitude',
    'avgTeachingMethod',
    'avgAcademicLevel',
    'avgGuidanceAbility'
  ]);
  const [trendData, setTrendData] = useState({
    labels: [],
    datasets: []
  });
  
  // 评分维度配置
  const dimensionConfig = {
    avgRating: { label: '总体评分', color: '#faad14' },
    avgTeachingAbility: { label: '教学能力', color: '#1890ff' },
    avgTeachingAttitude: { label: '教学态度', color: '#1a73e8' },
    avgTeachingMethod: { label: '教学方法', color: '#13c2c2' },
    avgAcademicLevel: { label: '学术水平', color: '#722ed1' },
    avgGuidanceAbility: { label: '指导能力', color: '#eb2f96' }
  };

  // 报告导出相关状态
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfQuality, setPdfQuality] = useState('high'); // 新增PDF质量控制选项
  
  // 图表引用
  const chartRef = useRef(null);
  const reportRef = useRef(null);
  const distributionRef = useRef(null);
  const monthlyChartRef = useRef(null);
  const overallStatsRef = useRef(null);

  // 添加日期范围筛选状态
  const [dateFilter, setDateFilter] = useState(null);

  // 1. 首先添加一个新的状态来存储筛选后的评价数据
  const [filteredEvaluations, setFilteredEvaluations] = useState([]);

  // 2. 添加一个默认展开面板的状态
  const [activeKeys, setActiveKeys] = useState(['1', '2', '3']); // 默认全部展开

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
  }, [timeRange, dateFilter, evaluations]);
  
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
    let endDate = now;
    
    // 如果有自定义日期筛选，优先使用它
    if (dateFilter && dateFilter[0] && dateFilter[1]) {
      startDate = dateFilter[0].toDate();
      endDate = dateFilter[1].toDate();
      // 将结束日期设为当天结束时间
      endDate.setHours(23, 59, 59, 999);
    } else if (timeRange === 'week') {
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
    const currentPeriodEvals = evaluations.filter(evaluation => 
      evaluation.timestamp >= startDate && evaluation.timestamp <= endDate
    );
    
    // 更新筛选后的评价列表，供其他模块使用
    setFilteredEvaluations(currentPeriodEvals);
    
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
      
      // 生成趋势图数据
      generateTrendData();
      
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
    
    // 生成趋势图数据
    generateTrendData();
  };
  
  // 生成多维度趋势图数据
  const generateTrendData = () => {
    if (filteredEvaluations.length === 0) return;
    
    // 根据评价数量决定时间间隔粒度
    let timeGroups = [];
    let labels = [];
    
    // 对评价按照时间进行分组
    if (filteredEvaluations.length <= 10) {
      // 评价数较少时，每个评价作为一个点
      filteredEvaluations.forEach(evaluation => {
        const date = new Date(evaluation.timestamp);
        const label = `${date.getMonth()+1}/${date.getDate()}`;
        timeGroups.push({
          label,
          evaluations: [evaluation]
        });
      });
      
      // 按时间排序
      timeGroups.sort((a, b) => 
        new Date(a.evaluations[0].timestamp) - new Date(b.evaluations[0].timestamp)
      );
      
      labels = timeGroups.map(group => group.label);
    } else {
      // 评价数较多时，按月份分组
      const monthlyGroups = {};
      
      filteredEvaluations.forEach(evaluation => {
        const date = new Date(evaluation.timestamp);
        const monthKey = `${date.getFullYear()}-${date.getMonth()+1}`;
        
        if (!monthlyGroups[monthKey]) {
          monthlyGroups[monthKey] = {
            label: `${date.getFullYear()}年${date.getMonth()+1}月`,
            evaluations: []
          };
        }
        
        monthlyGroups[monthKey].evaluations.push(evaluation);
      });
      
      // 将分组转换为数组并按时间排序
      timeGroups = Object.values(monthlyGroups).sort((a, b) => {
        const dateA = new Date(a.evaluations[0].timestamp);
        const dateB = new Date(b.evaluations[0].timestamp);
        return dateA - dateB;
      });
      
      labels = timeGroups.map(group => group.label);
    }
    
    // 为每个选中的维度创建数据集
    const datasets = selectedDimensions.map(dimension => {
      const dimensionInfo = dimensionConfig[dimension];
      
      // 计算每个时间组的平均值
      const data = timeGroups.map(group => {
        const dimensionValues = group.evaluations.map(evaluation => {
          switch(dimension) {
            case 'avgRating': return evaluation.overallRating;
            case 'avgTeachingAbility': return evaluation.teachingAbilityRating;
            case 'avgTeachingAttitude': return evaluation.teachingAttitudeRating;
            case 'avgTeachingMethod': return evaluation.teachingMethodRating;
            case 'avgAcademicLevel': return evaluation.academicLevelRating;
            case 'avgGuidanceAbility': return evaluation.guidanceAbilityRating;
            default: return 0;
          }
        });
        
        // 计算该维度在该时间组的平均值
        const sum = dimensionValues.reduce((acc, val) => acc + val, 0);
        return dimensionValues.length > 0 ? (sum / dimensionValues.length).toFixed(1) : 0;
      });
      
      return {
        label: dimensionInfo.label,
        data,
        backgroundColor: dimensionInfo.color,
        borderColor: dimensionInfo.color,
        borderWidth: 2,
        pointBackgroundColor: dimensionInfo.color,
        pointRadius: 4,
        tension: 0.3,
        fill: false // 确保线条不填充，便于多维度比较
      };
    });
    
    setTrendData({
      labels,
      datasets
    });
  };
  
  // 处理维度选择变化
  const handleDimensionChange = (checkedValues) => {
    if (checkedValues.length === 0) {
      // 至少选择一个维度
      setSelectedDimensions(['avgRating']);
    } else {
      setSelectedDimensions(checkedValues);
    }
  };
  
  // 每当选中的维度变化时，重新生成趋势数据
  useEffect(() => {
    if (filteredEvaluations.length > 0) {
      generateTrendData();
    }
  }, [selectedDimensions, filteredEvaluations]);
  
  // 处理时间范围切换
  const handleTimeRangeChange = (value) => {
    // 如果切换到预设的时间范围，清除日期筛选
    if (value !== 'custom') {
      setDateFilter(null);
    }
    setTimeRange(value);
  };
  
  // 添加日期筛选处理函数
  const handleDateFilterChange = (dates) => {
    // 当清除日期筛选时，重置为null
    if (!dates || dates.length === 0) {
      setDateFilter(null);
      return;
    }
    
    setDateFilter(dates);
    // 如果选择了自定义日期范围，将时间范围设置为自定义
    setTimeRange('custom');
  };
  
  // 导出PDF报告
  const exportPdfReport = async () => {
    try {
      setExportingPdf(true);
      message.loading('正在生成PDF报告，请稍候...', 0);
      
      // 配置缩放比例 - 高质量模式
      const scaleConfig = pdfQuality === 'high' ? {
        chartScale: 3,
        imageScale: 2.5,
        imageQuality: 1.0
      } : {
        chartScale: 2,
        imageScale: 1.8,
        imageQuality: 0.9
      };

      // 创建图表的图像 - 提高缩放比例以获得更清晰的图表
      let trendChartImage = '';
      if (chartRef.current && trendData.labels.length > 0) {
        try {
          // 防止滚动影响截图
          const originalScrollPosition = window.scrollY;
          window.scrollTo(0, chartRef.current.offsetTop);
          
          const canvas = await html2canvas(chartRef.current, {
            scale: scaleConfig.chartScale, // 提高缩放比例
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 0, // 防止图像超时
            allowTaint: true, // 允许跨域图像
            width: chartRef.current.offsetWidth,
            height: chartRef.current.offsetHeight
          });
          
          // 恢复滚动位置
          window.scrollTo(0, originalScrollPosition);
          
          trendChartImage = canvas.toDataURL('image/png', scaleConfig.imageQuality);
        } catch (err) {
          console.error('无法捕获图表:', err);
        }
      }
      
      // 使用单独的高质量设置捕获每个统计部分
      let overallStatsImage = '';
      if (overallStatsRef.current) {
        try {
          const originalScrollPosition = window.scrollY;
          window.scrollTo(0, overallStatsRef.current.offsetTop);
          
          const canvas = await html2canvas(overallStatsRef.current, {
            scale: scaleConfig.imageScale,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 0,
            allowTaint: true,
            width: overallStatsRef.current.offsetWidth,
            height: overallStatsRef.current.offsetHeight
          });
          
          window.scrollTo(0, originalScrollPosition);
          overallStatsImage = canvas.toDataURL('image/png', scaleConfig.imageQuality);
        } catch (err) {
          console.error('无法捕获统计信息:', err);
        }
      }
      
      let distributionImage = '';
      if (distributionRef.current) {
        try {
          const originalScrollPosition = window.scrollY;
          window.scrollTo(0, distributionRef.current.offsetTop);
          
          const canvas = await html2canvas(distributionRef.current, {
            scale: scaleConfig.imageScale,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 0,
            allowTaint: true,
            width: distributionRef.current.offsetWidth,
            height: distributionRef.current.offsetHeight
          });
          
          window.scrollTo(0, originalScrollPosition);
          distributionImage = canvas.toDataURL('image/png', scaleConfig.imageQuality);
        } catch (err) {
          console.error('无法捕获分布图:', err);
        }
      }
      
      // 创建PDF文档 - 使用更大的格式以减少缩放压缩
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: false // 减少压缩以保持质量
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // 添加标题（使用addImage方式避免中文字体问题）
      const titleImg = await createTextAsImage('教师评价统计分析报告', '24px bold SimHei', '#1a73e8');
      pdf.addImage(titleImg, 'PNG', (pageWidth - 120) / 2, 10, 120, 10);
      
      // 添加基本信息
      let yPosition = 30;
      
      // 添加教师信息（使用图像方式）
      const teacherInfoImg = await createTextAsImage(`教师: ${userData.name}`, '14px SimSun', '#000000');
      pdf.addImage(teacherInfoImg, 'PNG', 20, yPosition, 80, 8);
      yPosition += 10;
      
      // 添加时间信息
      const currentDate = new Date().toLocaleString('zh-CN');
      const dateInfoImg = await createTextAsImage(`生成时间: ${currentDate}`, '14px SimSun', '#000000');
      pdf.addImage(dateInfoImg, 'PNG', 20, yPosition, 120, 8);
      yPosition += 10;
      
      // 添加范围信息
      const rangeText = `时间范围: ${timeRange === 'all' ? '全部' : timeRange === 'month' ? '近一个月' : timeRange === 'week' ? '近一周' : '自定义'}`;
      const rangeInfoImg = await createTextAsImage(rangeText, '14px SimSun', '#000000');
      pdf.addImage(rangeInfoImg, 'PNG', 20, yPosition, 120, 8);
      yPosition += 10;
      
      // 添加评价总数
      const totalInfoImg = await createTextAsImage(`总评价数: ${overallStats.total}`, '14px SimSun', '#000000');
      pdf.addImage(totalInfoImg, 'PNG', 20, yPosition, 80, 8);
      yPosition += 15;
      
      // 添加分割线
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;
      
      // 如果有多维度评分趋势图，先添加到PDF
      if (trendChartImage) {
        // 添加标题
        const trendTitleImg = await createTextAsImage('多维度评分趋势分析', '16px bold SimHei', '#1a73e8');
        pdf.addImage(trendTitleImg, 'PNG', 20, yPosition, 100, 8);
        yPosition += 12;
        
        // 计算合适的图像尺寸 - 保持原始比例
        const imgWidth = pageWidth - 40; // 留出页面边距
        
        // 获取原始图像尺寸以计算正确的比例
        const tempImg = new Image();
        await new Promise((resolve) => {
          tempImg.onload = resolve;
          tempImg.src = trendChartImage;
        });
        
        const aspectRatio = tempImg.height / tempImg.width;
        const imgHeight = imgWidth * aspectRatio;
        
        // 检查是否需要新页面
        if (yPosition + imgHeight > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // 使用更高质量设置添加图像
        pdf.addImage(trendChartImage, 'PNG', 20, yPosition, imgWidth, imgHeight, undefined, 'FAST');
        
        // 添加图例说明
        yPosition += imgHeight + 10;
        const dimensionsSelected = selectedDimensions.map(dim => dimensionConfig[dim].label).join('、');
        const legendImg = await createTextAsImage(`所选维度: ${dimensionsSelected}`, '12px SimSun', '#666666');
        pdf.addImage(legendImg, 'PNG', 20, yPosition, 160, 6);
        yPosition += 15;
      }
      
      // 如果有统计图像，添加到PDF
      if (overallStatsImage) {
        // 检查是否需要新页面
        if (yPosition + 100 > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // 添加标题
        const statsTitleImg = await createTextAsImage('评分统计概览', '16px bold SimHei', '#1a73e8');
        pdf.addImage(statsTitleImg, 'PNG', 20, yPosition, 100, 8);
        yPosition += 12;
        
        // 计算合适的图像尺寸 - 保持原始比例
        const imgWidth = pageWidth - 40; // 留出页面边距
        
        // 获取原始图像尺寸以计算正确的比例
        const tempImg = new Image();
        await new Promise((resolve) => {
          tempImg.onload = resolve;
          tempImg.src = overallStatsImage;
        });
        
        const aspectRatio = tempImg.height / tempImg.width;
        const imgHeight = imgWidth * aspectRatio;
        
        // 检查是否需要新页面
        if (yPosition + imgHeight > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // 使用更高质量设置添加图像
        pdf.addImage(overallStatsImage, 'PNG', 20, yPosition, imgWidth, imgHeight, undefined, 'FAST');
        yPosition += imgHeight + 15;
      }
      
      // 如果有分布图像，添加到PDF - 使用同样的比例计算方法
      if (distributionImage) {
        // 检查是否需要新页面
        if (yPosition + 80 > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // 添加标题
        const distTitleImg = await createTextAsImage('评分分布情况', '16px bold SimHei', '#1a73e8');
        pdf.addImage(distTitleImg, 'PNG', 20, yPosition, 100, 8);
        yPosition += 12;
        
        // 计算正确的比例
        const imgWidth = pageWidth - 40;
        
        // 获取原始图像尺寸
        const tempImg = new Image();
        await new Promise((resolve) => {
          tempImg.onload = resolve;
          tempImg.src = distributionImage;
        });
        
        const aspectRatio = tempImg.height / tempImg.width;
        const imgHeight = imgWidth * aspectRatio;
        
        // 检查是否需要新页面
        if (yPosition + imgHeight > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.addImage(distributionImage, 'PNG', 20, yPosition, imgWidth, imgHeight, undefined, 'FAST');
        yPosition += imgHeight + 15;
      }
      
      // 添加页脚
      const footerImg = await createTextAsImage(`ChainRate教师评价分析系统 - ${new Date().toLocaleDateString('zh-CN')}`, '12px SimSun', '#999999');
      pdf.addImage(footerImg, 'PNG', 60, pageHeight - 15, 120, 6);
      
      // 保存PDF
      pdf.save(`教师评价分析报告_${userData.name}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      message.destroy();
      message.success('PDF报告生成成功！');
    } catch (error) {
      console.error('生成PDF报告失败:', error);
      message.destroy();
      message.error('生成PDF报告失败: ' + error.message);
    } finally {
      setExportingPdf(false);
    }
  };
  
  // 辅助函数：将文本转换为图像
  const createTextAsImage = (text, font, color) => {
    return new Promise((resolve) => {
      // 创建临时canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 设置字体和大小
      ctx.font = font;
      ctx.fillStyle = color;
      
      // 测量文本宽度
      const textWidth = ctx.measureText(text).width;
      
      // 设置canvas大小 - 添加抗锯齿处理
      const scale = 2; // 提高Canvas内部分辨率
      canvas.width = (textWidth + 20) * scale;
      canvas.height = (parseInt(font) * 1.5) * scale;
      
      // 缩放画布以提高分辨率
      ctx.scale(scale, scale);
      
      // 重新设置字体，因为canvas大小改变后字体设置会被重置
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';
      
      // 添加文本抗锯齿
      ctx.textRendering = 'optimizeLegibility';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // 绘制文本
      ctx.fillText(text, 10, canvas.height / (2 * scale));
      
      // 转换为高质量图像
      resolve(canvas.toDataURL('image/png', 1.0));
    });
  };
  
  // 第一步：提取"最近评价统计"组件代码，方便后续插入
  const RecentEvaluationList = () => (
    <List
      header={null}
      dataSource={
        filteredEvaluations.slice(0, 5).map(evaluation => ({
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
  );

  // 3. 处理折叠面板变化的函数
  const handleCollapseChange = (keys) => {
    setActiveKeys(keys);
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
              <NextImage 
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
                <div ref={reportRef}>
                  {/* 筛选条件和导出按钮 */}
                  <Card
                    title={
                      <div className={styles.cardTitle}>
                        <FilterOutlined style={{ marginRight: 8 }} />
                        数据筛选
                      </div>
                    }
                    style={{ marginBottom: 24 }}
                    extra={
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <Select
                          defaultValue="high"
                          style={{ width: 120 }}
                          onChange={(value) => setPdfQuality(value)}
                          options={[
                            { value: 'high', label: '高质量PDF' },
                            { value: 'standard', label: '标准质量PDF' },
                          ]}
                        />
                        <Button 
                          type="primary" 
                          icon={<FilePdfOutlined />} 
                          onClick={exportPdfReport}
                          loading={exportingPdf}
                        >
                          导出分析报告
                        </Button>
                      </div>
                    }
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
                            <Radio.Button value="custom">自定义</Radio.Button>
                          </Radio.Group>
                        </div>
                      </Col>
                      <Col xs={24} md={16}>
                        <div className={styles.filterItem}>
                          <span className={styles.filterLabel} style={{ whiteSpace: 'nowrap', marginRight: '8px' }}>日期筛选：</span>
                          <RangePicker 
                            value={dateFilter}
                            onChange={handleDateFilterChange}
                            style={{ width: 'calc(100% - 80px)' }}
                            placeholder={['起始日期', '结束日期']}
                            disabled={timeRange !== 'custom'}
                            format="YYYY-MM-DD"
                          />
                        </div>
                      </Col>
                    </Row>
                  </Card>
                  
                  {/* 总体数据卡片 */}
                  <div className={styles.statisticsContainer}>
                    <Collapse 
                      activeKey={activeKeys} 
                      onChange={handleCollapseChange}
                      expandIconPosition="end"
                      ghost
                    >
                      <Collapse.Panel 
                        key="1" 
                        header={
                          <div className={styles.cardTitle}>
                            <PieChartOutlined style={{ marginRight: 8 }} />
                            评价统计概览
                          </div>
                        }
                      >
                        <div ref={overallStatsRef}>
                          <Card bordered={false}>
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
                                <Row gutter={[24, 24]}>
                                  {/* 评分均值占2/3 */}
                                  <Col xs={24} sm={24} md={16}>
                                    {/* 居中显示的评分均值标题 */}
                                    <div style={{ textAlign: 'center', margin: '0 0 16px 0' }}>
                                      <Typography.Title level={4} style={{ margin: 0 }}>评分均值</Typography.Title>
                                    </div>
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
                                  
                                  {/* 最近评价统计占1/3 */}
                                  <Col xs={24} sm={24} md={8}>
                                    {/* 居中显示的最近评价统计标题 */}
                                    <div style={{ textAlign: 'center', margin: '0 0 16px 0' }}>
                                      <Typography.Title level={4} style={{ margin: 0 }}>最近评价统计</Typography.Title>
                                    </div>
                                    <div className={styles.recentEvaluationsPanel}>
                                      <RecentEvaluationList />
                                    </div>
                                  </Col>
                                </Row>
                              </Col>
                            </Row>
                          </Card>
                        </div>
                      </Collapse.Panel>
                    </Collapse>
                  </div>
                  
                  {/* 评分分布 */}
                  <div style={{ marginTop: 24 }}>
                    <Collapse 
                      activeKey={activeKeys} 
                      onChange={handleCollapseChange}
                      expandIconPosition="end"
                      ghost
                    >
                      <Collapse.Panel 
                        key="2" 
                        header={
                          <div className={styles.cardTitle}>
                            <PieChartOutlined style={{ marginRight: 8 }} />
                            评分、时间分布
                          </div>
                        }
                      >
                        <Card bordered={false}>
                          <Row gutter={[24, 24]}>
                            {/* 评分分布部分 - 占一半宽度 */}
                            <Col xs={24} md={12}>
                              <div className={styles.distributionContainer} ref={distributionRef}>
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
                            </Col>
                            
                            {/* 垂直分割线 */}
                            <Col xs={0} md={1} style={{ display: 'flex', justifyContent: 'center' }}>
                              <Divider type="vertical" style={{ height: '100%' }} />
                            </Col>
                            
                            {/* 时间分布部分 - 占一半宽度 */}
                            <Col xs={24} md={11}>
                              <div className={styles.timeDistributionContainer} ref={monthlyChartRef}>
                                <div className={styles.timeDistributionContent}>
                                  {/* 移除最近评价统计，只保留月度统计 */}
                                  <div className={styles.monthlyStats} style={{ marginTop: 0 }}>
                                    <div className={styles.monthlyStatsHeader}>
                                      月度评价统计
                                    </div>
                                    <div className={styles.monthlyStatsContent}>
                                      {/* 统计当前年份的每月评价数量 */}
                                      {(() => {
                                        const currentYear = new Date().getFullYear();
                                        const monthlyData = Array(12).fill(0);
                                        
                                        filteredEvaluations
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
                            </Col>
                          </Row>
                        </Card>
                      </Collapse.Panel>
                    </Collapse>
                  </div>
                  
                  {/* 多维度评分趋势图 */}
                  <div style={{ marginTop: 24 }}>
                    <Collapse 
                      activeKey={activeKeys} 
                      onChange={handleCollapseChange}
                      expandIconPosition="end"
                      ghost
                    >
                      <Collapse.Panel 
                        key="3" 
                        header={
                          <div className={styles.cardTitle}>
                            <LineChartOutlined style={{ marginRight: 8 }} />
                            多维度评分趋势分析
                          </div>
                        }
                      >
                        <Card bordered={false}>
                          <div style={{ padding: '16px 0' }}>
                            <div style={{ marginBottom: 16 }}>
                              <AntTitle level={5}>选择评分维度</AntTitle>
                              <Checkbox.Group 
                                options={[
                                  { label: '总体评分', value: 'avgRating' },
                                  { label: '教学能力', value: 'avgTeachingAbility' },
                                  { label: '教学态度', value: 'avgTeachingAttitude' },
                                  { label: '教学方法', value: 'avgTeachingMethod' },
                                  { label: '学术水平', value: 'avgAcademicLevel' },
                                  { label: '指导能力', value: 'avgGuidanceAbility' }
                                ]}
                                value={selectedDimensions}
                                onChange={handleDimensionChange}
                              />
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary">
                                  <InfoCircleOutlined style={{ marginRight: 4 }} />
                                  选择多个维度可在同一张图表中进行对比分析
                                </Text>
                              </div>
                            </div>
                            
                            <Divider />
                            
                            <div 
                              style={{ 
                                height: '450px', 
                                position: 'relative',
                                width: '100%'
                              }}
                              ref={chartRef}
                            >
                              {filteredEvaluations.length > 0 ? (
                                <Line
                                  data={trendData}
                                  options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                      y: {
                                        beginAtZero: false,
                                        min: 0,
                                        max: 5,
                                        ticks: {
                                          stepSize: 1,
                                          font: {
                                            size: 12
                                          }
                                        },
                                        title: {
                                          display: true,
                                          text: '评分 (1-5分)',
                                          font: {
                                            size: 14,
                                            weight: 'bold'
                                          }
                                        }
                                      },
                                      x: {
                                        title: {
                                          display: true,
                                          text: '时间',
                                          font: {
                                            size: 14,
                                            weight: 'bold'
                                          }
                                        },
                                        ticks: {
                                          font: {
                                            size: 12
                                          }
                                        }
                                      }
                                    },
                                    plugins: {
                                      legend: {
                                        position: 'top',
                                        labels: {
                                          usePointStyle: true,
                                          boxWidth: 10,
                                          font: {
                                            size: 13
                                          }
                                        }
                                      },
                                      tooltip: {
                                        titleFont: {
                                          size: 13
                                        },
                                        bodyFont: {
                                          size: 13
                                        },
                                        callbacks: {
                                          label: function(context) {
                                            let label = context.dataset.label || '';
                                            if (label) {
                                              label += ': ';
                                            }
                                            if (context.parsed.y !== null) {
                                              label += context.parsed.y;
                                            }
                                            return label;
                                          }
                                        },
                                        displayColors: true, // 确保显示颜色标记
                                        boxPadding: 5 // 增加一些内边距
                                      }
                                    },
                                    interaction: {
                                      intersect: false, // 允许鼠标悬停在线上任何位置时显示提示
                                      mode: 'index' // 显示同一时间点上所有系列的数据
                                    }
                                  }}
                                />
                              ) : (
                                <Empty description="暂无评价数据，无法生成趋势图" />
                              )}
                            </div>
                            
                            <div style={{ marginTop: 16, textAlign: 'center' }}>
                              <Text type="secondary">
                                <InfoCircleOutlined style={{ marginRight: 4 }} />
                                趋势图显示了各维度评分随时间的变化，可通过选择不同维度进行比较分析
                              </Text>
                              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                {selectedDimensions.map(dim => (
                                  <Tag 
                                    key={dim} 
                                    color={dimensionConfig[dim].color}
                                    style={{ margin: '4px', padding: '2px 8px' }}
                                  >
                                    {dimensionConfig[dim].label}
                                  </Tag>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Collapse.Panel>
                    </Collapse>
                  </div>
                </div>
              )}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
} 