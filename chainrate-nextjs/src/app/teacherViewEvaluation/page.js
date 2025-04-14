'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
  LinkOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  LikeOutlined,
  InteractionOutlined,
  DownloadOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import { 
  Breadcrumb, 
  Layout, 
  Menu, 
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
  Badge,
  List,
  Pagination,
  Image as AntImage,
  Modal,
  Progress
} from 'antd';
import UserAvatar from '../components/UserAvatar';
import TeacherSidebar from '../components/TeacherSidebar';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

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

// 评价项目组件 - 美化单个评分项展示
const RatingItem = ({ label, value }) => (
  <div className={styles.ratingItemContainer}>
    <Text type="secondary" className={styles.ratingItemLabel}>{label}</Text>
    <div className={styles.ratingItemStars}>
      <Rate disabled value={value} style={{ fontSize: 14 }} />
    </div>
  </div>
);

export default function TeacherViewEvaluationPage() {
  const router = useRouter();
  
  // 提前调用 useToken，确保在顶层只调用一次
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
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseStatistics, setCourseStatistics] = useState(null);
  
  // 评价数据
  const [evaluations, setEvaluations] = useState([]);
  const [filteredEvaluations, setFilteredEvaluations] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  
  // 筛选和排序
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, high, low, anonymous
  const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest, highest, lowest
  
  // 图片预览
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [error, setError] = useState('');
  
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
        
        setLoading(false);
        
        // 加载教师创建的课程
        loadTeacherCourses(chainRateContract, await signer.getAddress());
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router]);
  
  // 加载教师创建的课程
  const loadTeacherCourses = async (contractInstance, teacherAddress) => {
    setLoadingCourses(true);
    setError('');
    
    try {
      // 获取课程总数
      const courseCount = await contractInstance.courseCount();
      const courseCountNum = Number(courseCount);
      
      // 存储教师创建的课程
      const teacherCourses = [];
      
      // 遍历所有课程，查找教师创建的课程
      for (let i = 0; i < courseCountNum; i++) {
        try {
          const course = await contractInstance.courses(i);
          
          // 检查课程是否由当前教师创建
          if (course.teacher.toLowerCase() === teacherAddress.toLowerCase()) {
            // 将课程数据添加到列表中
            teacherCourses.push({
              id: i,
              name: course.name,
              teacher: course.teacher,
              startTime: new Date(Number(course.startTime) * 1000),
              endTime: new Date(Number(course.endTime) * 1000),
              isActive: course.isActive
            });
          }
        } catch (courseErr) {
          console.warn(`获取课程 ${i} 失败:`, courseErr);
          // 继续处理下一个课程
        }
      }
      
      // 更新课程列表
      setCourses(teacherCourses);
      
      // 如果有课程，默认选择第一个
      if (teacherCourses.length > 0) {
        setSelectedCourse(teacherCourses[0]);
        await loadCourseStatistics(contractInstance, teacherCourses[0].id);
        await loadCourseEvaluations(contractInstance, teacherCourses[0].id);
      }
    } catch (err) {
      console.error("加载课程失败:", err);
      setError('获取课程列表失败: ' + (err.message || err));
    } finally {
      setLoadingCourses(false);
    }
  };
  
  // 加载课程统计信息
  const loadCourseStatistics = async (contractInstance, courseId) => {
    try {
      const stats = await contractInstance.getCourseStatistics(courseId);
      
      setCourseStatistics({
        totalEvaluations: Number(stats.totalEvaluations),
        averageRating: Number(stats.averageRating) / 100, // 转换为1-5的星级
        averageTeachingRating: Number(stats.averageTeachingRating) / 100,
        averageContentRating: Number(stats.averageContentRating) / 100,
        averageInteractionRating: Number(stats.averageInteractionRating) / 100,
        anonymousCount: Number(stats.anonymousCount),
        completeCount: Number(stats.completeCount)
      });
    } catch (err) {
      console.error("加载课程统计失败:", err);
      setError('获取课程统计失败: ' + (err.message || err));
    }
  };
  
  // 加载课程评价
  const loadCourseEvaluations = async (contractInstance, courseId) => {
    setLoadingEvaluations(true);
    setEvaluations([]);
    setFilteredEvaluations([]);
    
    try {
      // 获取课程评价ID列表
      const evaluationIds = await contractInstance.getCourseEvaluations(courseId);
      
      if (evaluationIds.length === 0) {
        setLoadingEvaluations(false);
        return;
      }
      
      // 批量加载评价数据
      const BATCH_SIZE = 10;
      let allEvaluations = [];
      
      for (let i = 0; i < evaluationIds.length; i += BATCH_SIZE) {
        const batchIds = evaluationIds.slice(i, i + BATCH_SIZE);
        const batchEvaluations = await Promise.all(
          batchIds.map(async (id) => {
            try {
              const details = await contractInstance.getEvaluationDetails(id);
              
              // 如果学生不是匿名评价，获取学生名称和头像
              let studentName = "匿名学生";
              let studentAvatar = null;
              if (!details.isAnonymous) {
                try {
                  const studentInfo = await contractInstance.getUserInfo(details.student);
                  studentName = studentInfo[0]; // 学生姓名
                  studentAvatar = studentInfo[6]; // 学生头像
                  console.log(`获取学生 ${details.student} 的头像:`, studentAvatar);
                } catch (studentErr) {
                  console.warn(`获取学生信息失败: ${studentErr.message}`);
                }
              }
              
              // 返回格式化后的评价数据
              return {
                id: Number(id),
                student: details.student,
                studentName: details.isAnonymous ? "匿名学生" : studentName,
                studentAvatar: studentAvatar, // 添加学生头像字段
                courseId: Number(details.courseId),
                timestamp: new Date(Number(details.timestamp) * 1000),
                content: details.contentHash,
                imageHashes: details.imageHashes.filter(hash => hash !== ""),
                isAnonymous: details.isAnonymous,
                rating: Number(details.rating),
                teachingRating: Number(details.teachingRating),
                contentRating: Number(details.contentRating),
                interactionRating: Number(details.interactionRating),
                isActive: details.isActive
              };
            } catch (evalErr) {
              console.warn(`获取评价 ${id} 失败:`, evalErr);
              return null;
            }
          })
        );
        
        // 过滤掉加载失败的评价
        allEvaluations = [...allEvaluations, ...batchEvaluations.filter(Boolean)];
      }
      
      // 更新评价列表
      setEvaluations(allEvaluations);
      setFilteredEvaluations(allEvaluations);
      setTotal(allEvaluations.length);
      
      // 重置筛选和分页
      setSearchTerm('');
      setFilter('all');
      setSortOrder('newest');
      setPage(1);
    } catch (err) {
      console.error("加载评价失败:", err);
      setError('获取评价列表失败: ' + (err.message || err));
    } finally {
      setLoadingEvaluations(false);
    }
  };
  
  // 处理课程选择
  const handleCourseSelect = async (courseId) => {
    const selected = courses.find(course => course.id === Number(courseId));
    if (selected) {
      setSelectedCourse(selected);
      await loadCourseStatistics(contract, selected.id);
      await loadCourseEvaluations(contract, selected.id);
    }
  };
  
  // 处理搜索
  const handleSearch = (value) => {
    setSearchTerm(value);
    applyFilters(value, filter, sortOrder);
  };
  
  // 处理筛选
  const handleFilterChange = (value) => {
    setFilter(value);
    applyFilters(searchTerm, value, sortOrder);
  };
  
  // 处理排序
  const handleSortChange = (value) => {
    setSortOrder(value);
    applyFilters(searchTerm, filter, value);
  };
  
  // 应用筛选和排序
  const applyFilters = (search, filterType, sort) => {
    let result = [...evaluations];
    
    // 应用搜索
    if (search.trim() !== '') {
      result = result.filter(item => 
        item.content.toLowerCase().includes(search.toLowerCase()) ||
        item.studentName.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // 应用筛选
    switch (filterType) {
      case 'high':
        result = result.filter(item => item.rating >= 4);
        break;
      case 'low':
        result = result.filter(item => item.rating <= 2);
        break;
      case 'anonymous':
        result = result.filter(item => item.isAnonymous);
        break;
      case 'images':
        result = result.filter(item => item.imageHashes.length > 0);
        break;
      default:
        // 不做任何筛选
        break;
    }
    
    // 应用排序
    switch (sort) {
      case 'newest':
        result.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        result.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'highest':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        result.sort((a, b) => a.rating - b.rating);
        break;
      default:
        result.sort((a, b) => b.timestamp - a.timestamp);
        break;
    }
    
    setFilteredEvaluations(result);
    setTotal(result.length);
    setPage(1); // 重置为第一页
  };
  
  // 处理页面变化
  const handlePageChange = (page, pageSize) => {
    setPage(page);
    setPageSize(pageSize);
  };
  
  // 处理图片预览
  const handleImagePreview = (src) => {
    setPreviewImage(src);
    setPreviewVisible(true);
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
  
  // 获取评分颜色
  const getRatingColor = (rating) => {
    if (rating >= 4) return '#52c41a'; // 绿色 - 好评
    if (rating >= 3) return '#faad14'; // 黄色 - 中评
    return '#f5222d'; // 红色 - 差评
  };
  
  // 获取评分背景色（淡化版本）
  const getRatingBgColor = (rating) => {
    if (rating >= 4) return '#f6ffed'; // 淡绿色背景 - 好评
    if (rating >= 3) return '#fffbe6'; // 淡黄色背景 - 中评
    return '#fff1f0'; // 淡红色背景 - 差评
  };
  
  // 获取评分标签
  const getRatingTag = (rating) => {
    if (rating >= 4) return '好评';
    if (rating >= 3) return '中评';
    return '差评';
  };
  
  // 处理登出
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

  // 在组件内，添加导出到Excel的函数
  const handleExportToExcel = () => {
    if (!selectedCourse || filteredEvaluations.length === 0) {
      setError('所选时间段内无评价数据');
      return;
    }
    
    // 检查数据量是否超过限制
    if (filteredEvaluations.length > 1000) {
      setError('单次导出记录数不能超过1000条');
      return;
    }
    
    // 检查时间范围是否超过3个月
    if (filteredEvaluations.length > 0) {
      const firstDate = new Date(filteredEvaluations[0].timestamp);
      const lastDate = new Date(filteredEvaluations[filteredEvaluations.length - 1].timestamp);
      const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                        (lastDate.getMonth() - firstDate.getMonth());
      
      if (monthsDiff > 3) {
        setError('单次导出数据范围不能超过3个月');
        return;
      }
    }
    
    try {
      // 动态导入xlsx库
      import('xlsx').then(XLSX => {
        // 准备数据
        const data = filteredEvaluations.map(evaluation => ({
          '学生': evaluation.studentName,
          '是否匿名': evaluation.isAnonymous ? '是' : '否',
          '评价时间': formatDateTime(evaluation.timestamp),
          '评价内容': evaluation.content,
          '总体评分': evaluation.rating,
          '教学质量评分': evaluation.teachingRating,
          '内容设计评分': evaluation.contentRating,
          '师生互动评分': evaluation.interactionRating,
          '图片数量': evaluation.imageHashes.length
        }));
        
        // 创建工作表
        const worksheet = XLSX.utils.json_to_sheet(data);
        
        // 设置列宽
        const columnWidths = [
          { wch: 15 }, // 学生
          { wch: 8 }, // 是否匿名
          { wch: 20 }, // 评价时间
          { wch: 50 }, // 评价内容
          { wch: 10 }, // 总体评分
          { wch: 12 }, // 教学质量评分
          { wch: 12 }, // 内容设计评分
          { wch: 12 }, // 师生互动评分
          { wch: 8 } // 图片数量
        ];
        worksheet['!cols'] = columnWidths;
        
        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, selectedCourse.name);
        
        // 生成文件名
        const fileName = `${selectedCourse.name}_评价数据_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
        
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
      });
    } catch (error) {
      console.error('导出Excel失败:', error);
      setError('导出数据失败: ' + (error.message || error));
    }
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

  // 修改PDF导出函数
  const handleExportToPdf = () => {
    if (!selectedCourse || filteredEvaluations.length === 0) {
      setError('所选时间段内无评价数据');
      return;
    }
    
    // 检查数据量是否超过限制
    if (filteredEvaluations.length > 1000) {
      setError('单次导出记录数不能超过1000条');
      return;
    }
    
    // 检查时间范围是否超过3个月
    if (filteredEvaluations.length > 0) {
      const firstDate = new Date(filteredEvaluations[0].timestamp);
      const lastDate = new Date(filteredEvaluations[filteredEvaluations.length - 1].timestamp);
      const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                        (lastDate.getMonth() - firstDate.getMonth());
      
      if (monthsDiff > 3) {
        setError('单次导出数据范围不能超过3个月');
        return;
      }
    }
    
    try {
      // 使用html2canvas和jspdf配合导出，这样可以正确显示中文
      import('html2canvas').then(html2canvasModule => {
        const html2canvas = html2canvasModule.default;
        
        import('jspdf').then(jsPDFModule => {
          const jsPDF = jsPDFModule.default;
          
          // 创建一个临时的HTML表格来存放数据
          const tempDiv = document.createElement('div');
          tempDiv.style.position = 'absolute';
          tempDiv.style.top = '-9999px';
          tempDiv.style.left = '-9999px';
          tempDiv.style.width = '1024px'; // 设置较大宽度以确保内容不会折行
          document.body.appendChild(tempDiv);
          
          // 创建PDF标题和信息
          tempDiv.innerHTML = `
            <div style="font-family: Arial, 'Microsoft YaHei', sans-serif; padding: 20px; background: white;">
              <h1 style="color: #34a853; margin-bottom: 10px;">${selectedCourse.name} - 课程评价数据</h1>
              <p>导出时间: ${new Date().toLocaleString()}</p>
              <p>总评价数: ${filteredEvaluations.length}</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
                <thead>
                  <tr style="background-color: #34a853; color: white;">
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">学生</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">是否匿名</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">评价时间</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">评价内容</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">总评分</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">教学质量</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">内容设计</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">师生互动</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">图片数量</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredEvaluations.map((evaluation, index) => `
                    <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">
                      <td style="padding: 8px; border: 1px solid #ddd;">${evaluation.studentName}</td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${evaluation.isAnonymous ? '是' : '否'}</td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${formatDateTime(evaluation.timestamp)}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                        ${evaluation.content.length > 30 ? evaluation.content.substring(0, 30) + '...' : evaluation.content}
                      </td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${evaluation.rating.toFixed(1)}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${evaluation.teachingRating.toFixed(1)}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${evaluation.contentRating.toFixed(1)}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${evaluation.interactionRating.toFixed(1)}</td>
                      <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${evaluation.imageHashes.length}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div style="margin-top: 20px; text-align: right; font-size: 12px;">
                第 1 页，共 1 页
              </div>
            </div>
          `;
          
          // 使用html2canvas将HTML转换为canvas
          html2canvas(tempDiv).then(canvas => {
            // 删除临时元素
            document.body.removeChild(tempDiv);
            
            // 获取canvas的数据
            const imgData = canvas.toDataURL('image/png');
            
            // 根据图像尺寸确定PDF页面大小和方向
            const imgWidth = 210; // A4宽度 (mm)
            const pageHeight = 297; // A4高度 (mm)
            const imgHeight = canvas.height * imgWidth / canvas.width;
            
            // 创建PDF文档
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // 设置文档属性
            pdf.setProperties({
              title: `${selectedCourse.name} - 评价数据`,
              subject: '课程评价',
              author: userData.name,
              creator: 'ChainRate系统'
            });
            
            // 添加图像到PDF
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            
            // 生成文件名并下载
            const fileName = `${selectedCourse.name}_评价数据_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
            pdf.save(fileName);
          });
        });
      });
    } catch (error) {
      console.error('导出PDF失败:', error);
      setError('导出PDF数据失败: ' + (error.message || error));
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large">
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <div>加载中，请稍候...</div>
          </div>
        </Spin>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#34a853', // 使用绿色作为教师端主题色
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.09)',
        },
        components: {
          Card: {
            headerBg: '#fafafa',
            headerFontSize: 16,
            headerHeight: 48
          },
          Rate: {
            starSize: 16
          }
        }
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
          <Sider width={200} style={{ background: colorBgContainer }}>
            <TeacherSidebar defaultSelectedKey="4" defaultOpenKey="sub3" />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页', onClick: () => router.push('/teacherIndex'), className: 'clickable-breadcrumb' },
                { title: '评价管理', onClick: () => router.push('/teacherViewEvaluation'), className: 'clickable-breadcrumb' },
                { title: '查看评价' }
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
              
              {/* 课程选择器 */}
              <Card 
                title={
                  <span className={styles.cardTitle}>
                    <BookOutlined className={styles.cardTitleIcon} /> 选择课程
                  </span>
                } 
                className={styles.selectorCard}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <div className={styles.selectLabel}>
                      <Text strong>请选择要查看评价的课程：</Text>
                    </div>
                    <Select
                      placeholder="选择课程"
                      style={{ width: '100%' }}
                      value={selectedCourse?.id}
                      onChange={handleCourseSelect}
                      loading={loadingCourses}
                      disabled={loadingCourses || courses.length === 0}
                      className={styles.courseSelect}
                    >
                      {courses.map(course => (
                        <Option key={course.id} value={course.id}>
                          {course.name}
                          {course.isActive ? 
                            <Tag color="success" style={{ marginLeft: 8 }}>开放中</Tag> : 
                            <Tag color="default" style={{ marginLeft: 8 }}>已结束</Tag>
                          }
                        </Option>
                      ))}
                    </Select>
                  </Col>
                </Row>
              </Card>
              
              {selectedCourse && courseStatistics && (
                <Card 
                  title={
                    <span className={styles.cardTitle}>
                      <BookOutlined className={styles.cardTitleIcon} />
                      <span className={styles.courseTitle}>{selectedCourse.name}</span>
                    </span>
                  } 
                  className={styles.courseInfoCard}
                >
                  {/* 课程基本统计信息 */}
                  <Row gutter={[24, 24]}>
                    <Col xs={24} sm={12} md={6}>
                      <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                          <CommentOutlined style={{ color: '#34a853' }} />
                        </div>
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>{courseStatistics.totalEvaluations}</div>
                          <div className={styles.statLabel}>评价总数</div>
                        </div>
                      </div>
                    </Col>
                    
                    <Col xs={24} sm={12} md={6}>
                      <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                          <StarFilled style={{ color: '#faad14' }} />
                        </div>
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {courseStatistics.averageRating.toFixed(1)}
                            <span className={styles.statUnit}>/5</span>
                          </div>
                          <div className={styles.statLabel}>平均评分</div>
                        </div>
                      </div>
                    </Col>
                    
                    <Col xs={24} sm={12} md={6}>
                      <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                          <UserOutlined style={{ color: '#1677ff' }} />
                        </div>
                        <div className={styles.statContent}>
                          <div className={styles.statValue}>
                            {courseStatistics.anonymousCount}
                            <span className={styles.statUnit}>/{courseStatistics.totalEvaluations}</span>
                          </div>
                          <div className={styles.statLabel}>匿名评价</div>
                        </div>
                      </div>
                    </Col>
                    
                    <Col xs={24} sm={12} md={6}>
                      <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                          <CalendarOutlined style={{ color: '#722ed1' }} />
                        </div>
                        <div className={styles.statContent}>
                          <div className={styles.dateRange}>
                            {formatDateTime(selectedCourse.startTime)} 
                            <span style={{ margin: '0 4px' }}>至</span> 
                            {formatDateTime(selectedCourse.endTime)}
                          </div>
                          <div className={styles.statLabel}>评价期间</div>
                        </div>
                      </div>
                    </Col>
                  </Row>
                  
                  <Divider orientation="left">评分详情</Divider>
                  
                  {/* 改进的评分详情部分 */}
                  <Row gutter={[24, 24]} className={styles.ratingDetailsContainer}>
                    <Col xs={24} md={6}>
                      <RatingDisplay 
                        title="总体评分"
                        value={courseStatistics.averageRating}
                        color="#faad14"
                        icon={<StarFilled />}
                      />
                    </Col>
                    <Col xs={24} md={6}>
                      <RatingDisplay 
                        title="教学质量"
                        value={courseStatistics.averageTeachingRating}
                        color="#34a853"
                        icon={<ExperimentOutlined />}
                      />
                    </Col>
                    <Col xs={24} md={6}>
                      <RatingDisplay 
                        title="内容设计"
                        value={courseStatistics.averageContentRating}
                        color="#1677ff"
                        icon={<FileTextOutlined />}
                      />
                    </Col>
                    <Col xs={24} md={6}>
                      <RatingDisplay 
                        title="师生互动"
                        value={courseStatistics.averageInteractionRating}
                        color="#722ed1"
                        icon={<InteractionOutlined />}
                      />
                    </Col>
                  </Row>
                </Card>
              )}
              
              {/* 评价筛选 */}
              {selectedCourse && (
                <Card 
                  title={
                    <span className={styles.cardTitle}>
                      <FilterOutlined className={styles.cardTitleIcon} /> 筛选评价
                    </span>
                  } 
                  className={styles.filterCard}
                >
                  <div className={styles.filterSection}>
                    <Search
                      placeholder="搜索评价内容或学生姓名"
                      allowClear
                      enterButton="搜索"
                      size="middle"
                      onSearch={handleSearch}
                      className={styles.searchInput}
                      disabled={loadingEvaluations}
                    />
                    
                    <Select
                      placeholder="筛选条件"
                      className={styles.filterSelect}
                      value={filter}
                      onChange={handleFilterChange}
                      disabled={loadingEvaluations}
                    >
                      <Option value="all">全部评价</Option>
                      <Option value="high">好评 (≥4星)</Option>
                      <Option value="low">差评 (≤2星)</Option>
                      <Option value="anonymous">匿名评价</Option>
                      <Option value="images">包含图片</Option>
                    </Select>
                    
                    <Select
                      placeholder="排序方式"
                      className={styles.sortSelect}
                      value={sortOrder}
                      onChange={handleSortChange}
                      disabled={loadingEvaluations}
                    >
                      <Option value="newest">最新优先</Option>
                      <Option value="oldest">最早优先</Option>
                      <Option value="highest">评分从高到低</Option>
                      <Option value="lowest">评分从低到高</Option>
                    </Select>
                    
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      className={styles.exportButton}
                      onClick={handleExportToExcel}
                      disabled={loadingEvaluations || filteredEvaluations.length === 0}
                    >
                      导出Excel
                    </Button>

                    <Button
                      type="primary"
                      icon={<FilePdfOutlined />}
                      className={styles.exportPdfButton}
                      onClick={handleExportToPdf}
                      disabled={loadingEvaluations || filteredEvaluations.length === 0}
                    >
                      导出PDF
                    </Button>
                  </div>
                  
                  <div className={styles.filterSummary}>
                    <Text type="secondary">
                      找到 {filteredEvaluations.length} 条评价 
                      {searchTerm && <span>，包含关键词 "{searchTerm}"</span>}
                    </Text>
                  </div>
                </Card>
              )}
              
              {/* 评价列表 */}
              {selectedCourse && (
                <div className={styles.evaluationList}>
                  {loadingEvaluations ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Spin size="large">
                        <div style={{ padding: '30px', textAlign: 'center' }}>
                          <div>加载评价中...</div>
                        </div>
                      </Spin>
                    </div>
                  ) : filteredEvaluations.length === 0 ? (
                    <Empty 
                      description={
                        <span>
                          {courses.length > 0 
                            ? "暂无评价数据" 
                            : "请先创建课程并等待学生评价"}
                        </span>
                      }
                    />
                  ) : (
                    <>
                      <List
                        dataSource={filteredEvaluations.slice((page - 1) * pageSize, page * pageSize)}
                        renderItem={evaluation => {
                          const ratingColor = getRatingColor(evaluation.rating);
                          const ratingBgColor = getRatingBgColor(evaluation.rating);
                          
                          return (
                            <Card 
                              className={styles.evaluationCard}
                              key={evaluation.id}
                              style={{ backgroundColor: ratingBgColor }}
                            >
                              <div className={styles.evaluationHeader}>
                                <div className={styles.evaluationUser}>
                                  <Avatar 
                                    icon={<UserOutlined />} 
                                    src={!evaluation.isAnonymous && evaluation.studentAvatar ? 
                                      `${evaluation.studentAvatar}` : null}
                                    style={{ 
                                      backgroundColor: evaluation.isAnonymous ? '#d9d9d9' : '#34a853',
                                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                    }}
                                    size={48}
                                  />
                                  <div className={styles.userInfo}>
                                    <div className={styles.userName}>
                                      <Text strong>{evaluation.studentName}</Text>
                                      {evaluation.isAnonymous && (
                                        <Tag className={styles.anonymousTag}>匿名</Tag>
                                      )}
                                    </div>
                                    <div className={styles.evaluationTime}>
                                      <CalendarOutlined className={styles.timeIcon} />
                                      {formatDateTime(evaluation.timestamp)}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className={styles.evaluationScore}>
                                  <div className={styles.scoreContainer}>
                                    <div className={styles.scoreValue} style={{ color: ratingColor }}>
                                      {evaluation.rating.toFixed(1)}
                                    </div>
                                    <div className={styles.scoreMax}>/5</div>
                                  </div>
                                  <Tag 
                                    className={styles.ratingTag}
                                    color={ratingColor}
                                  >
                                    {getRatingTag(evaluation.rating)}
                                  </Tag>
                                </div>
                              </div>
                              
                              <Paragraph className={styles.evaluationContent}>
                                {evaluation.content}
                              </Paragraph>
                              
                              {evaluation.imageHashes.length > 0 && (
                                <div className={styles.imageContainer}>
                                  {evaluation.imageHashes.map((hash, index) => (
                                    <div key={index} className={styles.evaluationImage}>
                                      <AntImage
                                        width={120}
                                        height={120}
                                        src={`https://gateway.pinata.cloud/ipfs/${hash}`}
                                        alt={`评价图片 ${index + 1}`}
                                        fallback="/images/image-error.png"
                                        preview={{
                                          src: `https://gateway.pinata.cloud/ipfs/${hash}`
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <div className={styles.detailedRatings}>
                                <Row gutter={[24, 16]}>
                                  <Col xs={24} md={8}>
                                    <RatingItem label="教学质量" value={evaluation.teachingRating} />
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <RatingItem label="内容设计" value={evaluation.contentRating} />
                                  </Col>
                                  <Col xs={24} md={8}>
                                    <RatingItem label="师生互动" value={evaluation.interactionRating} />
                                  </Col>
                                </Row>
                              </div>
                            </Card>
                          );
                        }}
                      />
                      
                      <div className={styles.paginationContainer}>
                        <Pagination
                          current={page}
                          pageSize={pageSize}
                          total={filteredEvaluations.length}
                          onChange={handlePageChange}
                          showSizeChanger
                          pageSizeOptions={['5', '10', '20']}
                        />
                      </div>
                    </>
                  )}
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