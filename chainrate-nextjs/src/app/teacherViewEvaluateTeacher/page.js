'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { default as NextImage } from 'next/image';
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
  DownloadOutlined,
  CloudOutlined
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
  Modal,
  Pagination,
  DatePicker,
  message,
  Dropdown,
  Menu
} from 'antd';
import UserAvatar from '../components/UserAvatar';
import TeacherSidebar from '../components/TeacherSidebar';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

// 确保我们引用了正确的AntImage
const AntImageComponent = AntImage;

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
        <Rate allowHalf disabled value={value} style={{ fontSize: 16, whiteSpace: 'nowrap', display: 'inline-flex' }} />
        <span className={styles.ratingValue}>{value.toFixed(1)}</span>
      </div>
      <Progress 
        percent={value * 20} 
        showInfo={false} 
        strokeColor={color} 
        trailColor="#f5f5f5" 
        size="small"
        className={styles.ratingProgress}
      />
    </div>
  </div>
);

// 词云组件
const WordCloud = ({ words, width = 600, height = 400, svgRef }) => {
  const localSvgRef = useRef(null);
  
  // 使用传入的ref或本地ref
  const actualSvgRef = svgRef || localSvgRef;

  // 计算词云布局
  const layout = useCallback(() => {
    if (!actualSvgRef.current || !words || words.length === 0) return;
    
    console.log("准备渲染词云，单词数量:", words.length);
    
    // 清除现有内容
    d3.select(actualSvgRef.current).selectAll("*").remove();

    // 配置词云布局
    const fontScale = d3.scaleLinear()
      .domain([
        d3.min(words, d => d.value),
        d3.max(words, d => d.value)
      ])
      .range([14, 60]);

    // 生成颜色比例尺
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // 配置布局
    cloud()
      .size([width, height])
      .words(words.map(d => ({
        text: d.text,
        size: fontScale(d.value)
      })))
      .padding(5)
      .rotate(() => (~~(Math.random() * 2) - 1) * 30)
      .font("Impact")
      .fontSize(d => d.size)
      .on("end", draw)
      .start();

    // 绘制词云
    function draw(words) {
      d3.select(actualSvgRef.current)
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`)
        .selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-family", "Impact")
        .style("font-size", d => `${d.size}px`)
        .style("fill", (d, i) => colorScale(i))
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .text(d => d.text);
    }
  }, [words, width, height, actualSvgRef]);

  // 当组件挂载或数据变化时，重新计算布局
  useEffect(() => {
    console.log("词云组件挂载或数据变化，开始布局");
    layout();
  }, [layout]);

  return (
    <div className={styles.wordCloudContainer}>
      <svg ref={actualSvgRef} className={styles.wordCloudSvg} width={width} height={height}></svg>
    </div>
  );
};

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
  const [noDataInDateRange, setNoDataInDateRange] = useState(false);
  
  // 图片预览状态
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  
  // 词云相关状态
  const [wordCloudModalVisible, setWordCloudModalVisible] = useState(false);
  const [wordCloudData, setWordCloudData] = useState([]);
  const [wordCloudLoading, setWordCloudLoading] = useState(false);
  const [wordCloudError, setWordCloudError] = useState('');
  
  // 词云图片保存参考
  const wordCloudRef = useRef(null);
  const svgRef = useRef(null); // 直接引用SVG元素
  
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

  // 分页和排序状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'timestamp',
    order: 'desc'
  });

  // 排序选项
  const sortOptions = [
    { label: '最新评价', value: 'timestamp', order: 'desc' },
    { label: '最早评价', value: 'timestamp', order: 'asc' },
    { label: '评分最高', value: 'rating', order: 'desc' },
    { label: '评分最低', value: 'rating', order: 'asc' }
  ];

  // 时间筛选状态
  const [dateRange, setDateRange] = useState([null, null]);
  const [dateError, setDateError] = useState('');
  const [showDateWarning, setShowDateWarning] = useState(false);

  // 日期无效时，阻止日期选择并提示错误
  const disabledDate = (current) => {
    // 如果已经选择了开始日期，禁用所有早于开始日期的日期
    if (dateRange && dateRange[0]) {
      return current && current < dateRange[0].startOf('day');
    }
    return false;
  };

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
          let studentAvatar = null;
          
          if (!evaluation.isAnonymous) {
            try {
              studentInfo = await mainContract.getUserInfo(evaluation.student);
              studentName = studentInfo[0]; // 学生姓名
              studentAvatar = studentInfo[6]; // 学生头像
              console.log("获取学生头像:", studentAvatar);
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
          
          // 处理头像URL
          let avatarUrl = null;
          if (studentAvatar && studentAvatar.trim() !== "" && !evaluation.isAnonymous) {
            // 如果已经是完整URL，直接使用
            if (studentAvatar.startsWith('http')) {
              avatarUrl = studentAvatar;
            } else {
              // 否则拼接IPFS网关
              avatarUrl = `https://gateway.pinata.cloud/ipfs/${studentAvatar}`;
            }
          }
          
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
            }),
            avatarUrl: avatarUrl
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
  
  // 监听所有筛选相关状态，自动刷新列表
  useEffect(() => {
    filterEvaluations(searchText, filterType);
    // eslint-disable-next-line
  }, [searchText, filterType, dateRange, sortConfig, pagination.current, pagination.pageSize, evaluations]);

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };
  
  const handleFilterChange = (value) => {
    setFilterType(value);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleSortChange = (value) => {
    const [key, order] = value.split('-');
    setSortConfig({ key, order });
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePageChange = (page, pageSize) => {
    setPagination(prev => ({ ...prev, current: page, pageSize }));
  };
  
  // 处理日期范围变化
  const handleDateRangeChange = (dates, dateStrings) => {
    console.log("日期变化:", dates, dateStrings);
    
    // 关闭之前可能显示的警告
    setShowDateWarning(false);
    
    // 日期被清空的情况
    if (!dates || !dates[0] || !dates[1]) {
      setDateRange([null, null]);
      setDateError('');
      return;
    }
    
    const [startDate, endDate] = dates;
  
    // 严格验证：确保结束日期不早于开始日期
    if (endDate.isBefore(startDate, 'day')) {
      console.error("无效的日期范围:", startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
      
      // 显示错误提示
      Modal.error({
        title: '日期范围错误',
        content: '结束日期不能早于开始日期，请重新选择有效的日期范围。',
        okText: '知道了'
      });
      
      // 保持原状态，不更新日期范围
      setDateError('结束日期不能早于开始日期');
      return;
    }
    
    console.log("有效日期范围:", startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
    setDateError('');
    setDateRange(dates);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const filterEvaluations = (search, type) => {
    let filtered = [...evaluations];
    
    // 搜索过滤
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(evaluation => 
        (evaluation.studentName && evaluation.studentName.toLowerCase().includes(searchLower)) ||
        (evaluation.courseName && evaluation.courseName.toLowerCase().includes(searchLower)) ||
        (evaluation.courseCode && evaluation.courseCode.toLowerCase().includes(searchLower)) ||
        (evaluation.semester && evaluation.semester.toLowerCase().includes(searchLower))
      );
    }
    
    // 类型过滤
    if (type === 'anonymous') {
        filtered = filtered.filter(evaluation => evaluation.isAnonymous);
    } else if (type === 'named') {
      filtered = filtered.filter(evaluation => !evaluation.isAnonymous);
    }
    
    // 是否应用了日期筛选
    let hasDateFilter = false;
    
    // 日期范围过滤
    if (dateRange[0] && dateRange[1]) {
      hasDateFilter = true;
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      filtered = filtered.filter(evaluation => {
        const evalDate = new Date(evaluation.timestamp);
        return evalDate >= startDate && evalDate <= endDate;
      });
      
      // 检查日期范围筛选后是否有数据
      if (filtered.length === 0) {
        setNoDataInDateRange(true);
      } else {
        setNoDataInDateRange(false);
      }
    } else {
      setNoDataInDateRange(false);
    }

    // 排序
    const sortedEvaluations = getSortedEvaluations(filtered);

    // 分页
    const start = (pagination.current - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    setFilteredEvaluations(sortedEvaluations.slice(start, end));
    // 更新总数
    setPagination(prev => ({ ...prev, total: filtered.length }));
  };

  // 获取排序后的评价列表
  const getSortedEvaluations = (evaluations) => {
    return [...evaluations].sort((a, b) => {
      if (sortConfig.key === 'timestamp') {
        // 时间戳排序
        return sortConfig.order === 'desc'
          ? b.timestamp - a.timestamp
          : a.timestamp - b.timestamp;
      } else if (sortConfig.key === 'rating') {
        // 评分排序
        const ratingA = a.overallRating || 0;
        const ratingB = b.overallRating || 0;
        return sortConfig.order === 'desc'
          ? ratingB - ratingA
          : ratingA - ratingB;
      }
      return 0;
    });
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

  // 添加辅助函数：将字符串转换为ArrayBuffer（用于Excel导出）
  function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
      view[i] = s.charCodeAt(i) & 0xFF;
    }
    return buf;
  }

  // 导出评价到Excel文件
  const handleExportToExcel = () => {
    if (filteredEvaluations.length === 0) return;
    
    try {
      // 动态导入xlsx库
      import('xlsx').then(XLSX => {
        // 第一步：为每个评价获取内容
        const prepareDataAndExport = async () => {
          try {
            // 准备数据
            const evaluationsWithContent = await Promise.all(
              filteredEvaluations.map(async (evaluation) => {
                // 获取评价内容
                let content = "";
                try {
                  const response = await fetch(`https://gateway.pinata.cloud/ipfs/${evaluation.contentHash}`);
                  if (response.ok) {
                    const data = await response.json();
                    content = data.content;
                  } else {
                    content = "无法加载评价内容";
                  }
                } catch (err) {
                  console.error("获取评价内容失败:", err);
                  content = "获取评价内容失败";
                }
                
                return {
                  '学生': evaluation.studentName,
                  '是否匿名': evaluation.isAnonymous ? '是' : '否',
                  '评价时间': evaluation.formattedDate,
                  '评价内容': content,
                  '总体评分': evaluation.overallRating,
                  '教学能力': evaluation.teachingAbilityRating,
                  '教学态度': evaluation.teachingAttitudeRating,
                  '教学方法': evaluation.teachingMethodRating,
                  '学术水平': evaluation.academicLevelRating,
                  '指导能力': evaluation.guidanceAbilityRating,
                  '图片数量': evaluation.imageHashes.length
                };
              })
            );
            
            // 创建工作表
            const worksheet = XLSX.utils.json_to_sheet(evaluationsWithContent);
            
            // 设置列宽
            const columnWidths = [
              { wch: 15 }, // 学生
              { wch: 8 }, // 是否匿名
              { wch: 20 }, // 评价时间
              { wch: 50 }, // 评价内容
              { wch: 10 }, // 总体评分
              { wch: 10 }, // 教学能力
              { wch: 10 }, // 教学态度
              { wch: 10 }, // 教学方法
              { wch: 10 }, // 学术水平
              { wch: 10 }, // 指导能力
              { wch: 8 } // 图片数量
            ];
            worksheet['!cols'] = columnWidths;
            
            // 创建工作簿
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "教师评价数据");
            
            // 生成文件名
            const fileName = `教师评价数据_${userData.name}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
            
            // 使用指定编码写入文件以确保中文正确显示
            const excelBinary = XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' });
            
            // 转换为Blob并设置正确的编码
            const excelBlob = new Blob([s2ab(excelBinary)], {
              type: 'application/octet-stream'
            });
            
            // 创建下载链接
            const url = URL.createObjectURL(excelBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            // 清理
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }, 0);
          } catch (err) {
            console.error("准备导出数据失败:", err);
            setError('导出数据失败: ' + (err.message || err));
          }
        };
        
        // 开始处理数据并导出
        prepareDataAndExport();
      });
    } catch (error) {
      console.error('导出Excel失败:', error);
      setError('导出数据失败: ' + (error.message || error));
    }
  };
  
  // 保存词云图片 - 简化实现
  const handleSaveWordCloud = () => {
    console.log("开始保存词云图片");
    
    try {
      // 获取SVG元素
      if (!svgRef.current) {
        console.error("SVG引用不存在");
        message.error('无法获取词云图片，请重试');
        return;
      }
      
      const svg = svgRef.current;
      console.log("获取到SVG元素:", svg);
      
      // 创建SVG数据URL
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBase64 = btoa(unescape(encodeURIComponent(svgData)));
      const dataURL = `data:image/svg+xml;base64,${svgBase64}`;
      
      // 创建临时链接
      const link = document.createElement('a');
      link.download = `教师评价词云_${new Date().toLocaleDateString().replace(/\//g, '-')}.svg`;
      link.href = dataURL;
      link.click();
      
      message.success('词云已保存为SVG格式');
    } catch (error) {
      console.error('保存词云图片失败:', error);
      message.error('保存图片失败: ' + (error.message || '未知错误'));
    }
  };
  
  // 尝试保存为PNG格式
  const handleSaveAsPNG = () => {
    try {
      if (!svgRef.current) {
        message.error('无法获取词云图片，请重试');
        return;
      }
      
      // 显示处理提示
      message.loading('正在处理图片...');
      
      // 创建图片元素来渲染SVG
      const svg = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svg);
      
      // 获取SVG的尺寸
      const width = svg.width.baseVal.value || 850;
      const height = svg.height.baseVal.value || 500;
      
      // 创建Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // 设置白色背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      // 创建SVG的Image URL
      const blob = new Blob([svgData], {type: 'image/svg+xml'});
      const url = URL.createObjectURL(blob);
      
      // 创建图片元素
      const img = new window.Image();
      img.onload = function() {
        // 在Canvas上绘制SVG
        ctx.drawImage(img, 0, 0);
        
        try {
          // 从Canvas获取数据URL
          const pngUrl = canvas.toDataURL('image/png');
          
          // 创建下载链接
          const link = document.createElement('a');
          link.download = `教师评价词云_${new Date().toLocaleDateString().replace(/\//g, '-')}.png`;
          link.href = pngUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // 关闭加载提示
          message.destroy();
          message.success('词云已保存为PNG格式');
        } catch (e) {
          console.error('Canvas转换失败:', e);
          message.error('PNG格式保存失败，请尝试SVG格式');
        }
        
        // 清理URL
        URL.revokeObjectURL(url);
      };
      
      img.onerror = function(e) {
        console.error('图片加载失败:', e);
        message.error('图片处理失败，请尝试SVG格式');
        URL.revokeObjectURL(url);
      };
      
      // 加载SVG
      img.src = url;
    } catch (error) {
      console.error('PNG保存失败:', error);
      message.error('PNG格式保存失败: ' + error.message);
    }
  };
  
  // 组合的保存菜单项
  const menuItems = [
    {
      key: 'svg',
      label: '保存为SVG格式',
      onClick: handleSaveWordCloud
    },
    {
      key: 'png',
      label: '保存为PNG格式',
      onClick: handleSaveAsPNG
    }
  ];
  
  // 从评价内容中提取文本，生成词频数据
  const processWordCloudData = async () => {
    try {
      setWordCloudLoading(true);
      
      // 如果没有评价，返回空数组
      if (!evaluations || evaluations.length === 0) {
        message.warning('暂无评价数据，无法生成词云');
        setWordCloudData([]);
        setWordCloudLoading(false);
        return;
      }
      
      // 收集所有评价内容
      const contentTexts = [];
      
      // 获取前 50 条评价的内容（避免请求过多）
      const limit = Math.min(evaluations.length, 50);
      message.info(`正在处理 ${limit} 条评价内容，请稍候...`);
      
      for (let i = 0; i < limit; i++) {
        try {
          const evaluation = evaluations[i];
          const response = await fetch(`https://gateway.pinata.cloud/ipfs/${evaluation.contentHash}`);
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.content) {
              contentTexts.push(data.content);
            }
          }
        } catch (error) {
          console.error("获取评价内容失败:", error);
        }
      }
      
      // 合并所有文本并分词
      const allText = contentTexts.join(' ');
      
      // 简单的中文分词处理（按空格和标点符号分割）
      const words = allText.split(/[\s,.，。！？、：；''""【】《》()（）\-]/g)
        .filter(word => word.length > 1) // 过滤掉单字符词
        .map(word => word.toLowerCase()); // 转小写
      
      // 停用词列表（可以根据需要扩展）
      const stopWords = ['的', '了', '是', '我', '你', '他', '她', '它', '这', '那',
                         '们', '在', '有', '和', '与', '或', '就', '也', '要', '不',
                         '为', '为了', '所以', '因为', '但是', '可以', '所有', '一个',
                         '以及', '而且', '而', '等', '等等', '老师', '教师', '学生'];
                         
      // 计算词频
      const wordFrequency = {};
      words.forEach(word => {
        if (!stopWords.includes(word) && word.trim() !== '') {
          if (!wordFrequency[word]) {
            wordFrequency[word] = 0;
          }
          wordFrequency[word] += 1;
        }
      });
      
      // 转换为词云数据格式，并取频率最高的前50个词
      const cloudData = Object.keys(wordFrequency)
        .map(text => ({ text, value: wordFrequency[text] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 50);
      
      if (cloudData.length === 0) {
        message.warning('未能提取到足够的关键词，请尝试增加评价样本');
      }
      
      setWordCloudData(cloudData);
      setWordCloudModalVisible(true);
    } catch (error) {
      console.error("处理词云数据失败:", error);
      setWordCloudError('生成词云数据失败: ' + (error.message || error));
      message.error('生成词云失败，请稍后重试');
    } finally {
      setWordCloudLoading(false);
    }
  };
  
  // 生成词云处理函数
  const handleGenerateWordCloud = () => {
    processWordCloudData();
  };
  
  // 关闭词云模态框
  const handleCloseWordCloudModal = () => {
    setWordCloudModalVisible(false);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8', // 使用蓝色与其他页面保持一致
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
                            <Col span={12}>
                              <Statistic 
                                title="高分评价" 
                                value={evaluationStats.highRating} 
                                prefix={<StarFilled className={styles.statIcon} style={{ color: '#faad14' }} />} 
                                suffix={`/ ${evaluationStats.total}`}
                              />
                            </Col>
                            <Col span={12}>
                              <Statistic 
                                title="最近30天" 
                                value={evaluations.filter(e => {
                                  const thirtyDaysAgo = new Date();
                                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                                  return e.timestamp > thirtyDaysAgo;
                                }).length} 
                                prefix={<CalendarOutlined className={styles.statIcon} style={{ color: '#1a73e8' }} />} 
                                suffix="条"
                              />
                            </Col>
                            <Col span={24}>
                              <div style={{ marginTop: 16 }}>
                                <Paragraph style={{ marginBottom: 8 }}>
                                  总体平均评分
                                </Paragraph>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <Rate disabled allowHalf value={parseFloat(evaluationStats.avgRating)} style={{ fontSize: 20, marginRight: 12 }} />
                                  <div className={styles.scoreContainer}>
                                    <span className={styles.scoreNumber}>{evaluationStats.avgRating}</span>
                                    <span className={styles.scoreTotal}>/5</span>
                                  </div>
                                </div>
                              </div>
                            </Col>
                            <Col span={24}>
                              <Progress 
                                percent={parseFloat(evaluationStats.avgRating) * 20} 
                                status="active"
                                strokeColor={{
                                  '0%': '#108ee9',
                                  '100%': '#1a73e8',
                                }}
                                format={() => `${evaluationStats.avgRating}/5`}
                                style={{ marginTop: 12 }}
                              />
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
                            color="#1a73e8" 
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
                      <Col xs={24} sm={12} md={8} lg={8}>
                        <Search
                          placeholder="搜索课程名称、课程代码或学期"
                          allowClear
                          onSearch={handleSearch}
                          style={{ width: '100%' }}
                        />
                      </Col>
                      <Col xs={24} sm={8} md={6} lg={5}>
                        <Select
                          style={{ width: '100%' }}
                          placeholder="筛选评价类型"
                          onChange={handleFilterChange}
                          defaultValue="all"
                        >
                          <Option value="all">全部评价</Option>
                          <Option value="anonymous">匿名评价</Option>
                          <Option value="named">实名评价</Option>
                        </Select>
                      </Col>
                      <Col xs={24} sm={8} md={6} lg={5}>
                        <DatePicker.RangePicker
                          style={{ width: '100%' }}
                          placeholder={['开始日期', '结束日期']}
                          onChange={handleDateRangeChange}
                          onCalendarChange={(dates) => {
                            if (dates && dates[0] && dates[1] && dates[1].isBefore(dates[0])) {
                              // 设置一个状态来触发显示警告，而不是直接调用message
                              setShowDateWarning(true);
                              setDateError('结束日期不能早于开始日期');
                            } else {
                              setShowDateWarning(false);
                            }
                          }}
                          disabledDate={disabledDate}
                          value={dateRange}
                          status={dateError ? 'error' : ''}
                        />
                      </Col>
                      <Col xs={24} sm={8} md={6} lg={3} className={styles.selectWrapper}>
                        <Select
                          defaultValue="timestamp-desc"
                          style={{ width: '100%' }}
                          onChange={handleSortChange}
                        >
                          {sortOptions.map(option => (
                            <Option key={`${option.value}-${option.order}`} value={`${option.value}-${option.order}`}>
                              {option.label}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                      <Col xs={24} sm={8} md={4} lg={3}>
                        <Button
                          type="primary"
                          icon={<DownloadOutlined />}
                          onClick={handleExportToExcel}
                          disabled={filteredEvaluations.length === 0}
                          style={{ width: '100%' }}
                          className={styles.exportButton}
                        >
                          导出Excel
                        </Button>
                      </Col>
                      <Col xs={24} sm={8} md={4} lg={3}>
                        <Button
                          type="primary"
                          icon={<CloudOutlined />}
                          onClick={handleGenerateWordCloud}
                          disabled={filteredEvaluations.length === 0 || wordCloudLoading}
                          style={{ width: '100%', backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                        >
                          生成词云
                        </Button>
                      </Col>
                    </Row>
                    {dateError && (
                      <Row>
                        <Col span={24}>
                          <Alert
                            message={dateError}
                            type="error"
                            showIcon
                            style={{ marginTop: 8 }}
                          />
                        </Col>
                      </Row>
                    )}
                  </div>

                  {/* 添加警告信息显示 */}
                  {showDateWarning && (
                    <div style={{ color: '#faad14', marginTop: '8px', fontSize: '14px' }}>
                      <span>⚠️ 结束日期不能早于开始日期</span>
                    </div>
                  )}

                  {/* 评价列表 */}
                  <div className={styles.evaluationList}>
                    {noDataInDateRange ? (
                      <Empty
                        description={
                          <span>
                            该日期范围没有数据，请更换日期进行筛选
                          </span>
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ) : (
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
                                    src={evaluation.avatarUrl}
                                    style={{ backgroundColor: evaluation.isAnonymous ? '#1a73e8' : '#1a73e8' }}
                                  />
                                  <div className={styles.evaluationMeta}>
                                    <div className={styles.studentName}>
                                      {evaluation.studentName}
                                      {evaluation.isAnonymous && (
                                        <Tag color="blue" style={{ marginLeft: 8 }}>匿名</Tag>
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
                    )}
                  </div>

                  {/* 分页组件 - 只在有数据且不是日期筛选无数据时显示 */}
                  {!noDataInDateRange && filteredEvaluations.length > 0 && (
                    <div className={`${styles.paginationContainer} ${styles.paginationWrapper}`}>
                      <Pagination
                        current={pagination.current}
                        pageSize={pagination.pageSize}
                        total={pagination.total}
                        onChange={handlePageChange}
                        showSizeChanger={true}
                        pageSizeOptions={[5, 10, 20, 50]}
                        onShowSizeChange={(current, size) => {
                          setPagination(prev => ({ ...prev, current: 1, pageSize: size }));
                        }}
                        showQuickJumper
                        showTotal={(total) => `共 ${total} 条评价`}
                      />
                    </div>
                  )}
                </>
              )}
              
              {/* 词云模态框 */}
              <Modal
                title="评价关键词云"
                open={wordCloudModalVisible}
                onCancel={handleCloseWordCloudModal}
                width={900}
                footer={[
                  <Button key="close" onClick={handleCloseWordCloudModal}>
                    关闭
                  </Button>,
                  <Dropdown 
                    key="save" 
                    menu={{ items: menuItems }}
                    placement="topCenter"
                    disabled={wordCloudLoading || wordCloudData.length === 0}
                  >
                    <Button 
                      type="primary"
                      icon={<DownloadOutlined />}
                    >
                      保存图片
                    </Button>
                  </Dropdown>
                ]}
                centered
              >
                <div style={{ marginBottom: 16 }}>
                  <Alert
                    message="词云分析说明"
                    description={`此词云展示了学生评价中出现频率最高的关键词，字体大小代表词汇出现的频率，可以帮助您快速了解学生反馈的焦点和整体教学评价风向。您可以点击"保存图片"按钮将词云保存为PNG图片。`}
                    type="info"
                    showIcon
                  />
                </div>
                {wordCloudLoading ? (
                  <div className={styles.loadingContainer} style={{ height: 400 }}>
                    <Spin size="large" />
                    <div className={styles.loadingText}>生成词云中...</div>
                  </div>
                ) : wordCloudError ? (
                  <Alert
                    message="词云生成失败"
                    description={wordCloudError}
                    type="error"
                    showIcon
                  />
                ) : wordCloudData.length === 0 ? (
                  <Empty description="暂无足够数据生成词云" />
                ) : (
                  <div className={styles.wordCloudWrapper} ref={wordCloudRef}>
                    <WordCloud 
                      words={wordCloudData} 
                      width={850}
                      height={500}
                      svgRef={svgRef}
                    />
                    {wordCloudData.length > 0 && (
                      <div style={{ marginTop: 15, textAlign: 'center' }}>
                        <div style={{ color: '#666', marginBottom: 10 }}>
                          共分析了{wordCloudData.length}个关键词
                        </div>
                        <Space>
                          <Button 
                            type="default" 
                            icon={<DownloadOutlined />}
                            onClick={handleSaveWordCloud}
                          >
                            下载SVG格式
                          </Button>
                          <Button 
                            type="default" 
                            icon={<DownloadOutlined />}
                            onClick={handleSaveAsPNG}
                          >
                            下载PNG格式
                          </Button>
                        </Space>
                        <div style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>
                          如果下拉菜单保存不起作用，请尝试直接点击上方按钮
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Modal>
              
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
                        src={selectedEvaluation.avatarUrl}
                        style={{ backgroundColor: selectedEvaluation.isAnonymous ? '#1a73e8' : '#1a73e8' }}
                      />
                      <div className={styles.studentDetailInfo}>
                        <Title level={4} style={{ margin: 0 }}>
                          {selectedEvaluation.studentName}
                          {selectedEvaluation.isAnonymous && (
                            <Tag color="blue" style={{ marginLeft: 8 }}>匿名评价</Tag>
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
                                        onClick={() => handlePreview(`https://gateway.pinata.cloud/ipfs/${hash}`)}
                                      />
                                    }
                                  >
                                    <Card.Meta
                                      title={`附件图片 ${index + 1}`}
                                    />
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
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
} 