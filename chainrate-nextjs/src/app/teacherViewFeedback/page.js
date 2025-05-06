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
import { diffLines } from 'diff';
import { jsPDF } from 'jspdf';
// 修改导入方式，确保autoTable作为插件正确加载
import 'jspdf-autotable';
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
  InfoCircleOutlined,
  HistoryOutlined,
  DiffOutlined,
  FileOutlined
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
  
  // 版本比较状态
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [feedbackVersions, setFeedbackVersions] = useState([]);
  const [selectedVersions, setSelectedVersions] = useState([null, null]);
  const [versionContents, setVersionContents] = useState([null, null]);
  const [versionDiff, setVersionDiff] = useState(null);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [currentFeedbackForVersions, setCurrentFeedbackForVersions] = useState(null);
  
  // PDF导出状态
  const [exportLoading, setExportLoading] = useState(false);
  
  // 在feedbacks状态后添加新的状态
  const [exportingAllFeedbacks, setExportingAllFeedbacks] = useState(false);
  
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
          try {
            // 检查signer是否可用
            if (!signer) {
              console.warn("定时刷新时Signer不可用");
              return;
            }
            
            // 重新获取合约实例以确保使用最新状态
            const refreshMainContract = new ethers.Contract(
              ChainRateAddress.address,
              ChainRateABI.abi,
              signer
            );
            
            const refreshCourse02Contract = new ethers.Contract(
              ChainRate02Address.address,
              ChainRate02ABI.abi,
              signer
            );
            
            // 使用新获取的合约实例执行刷新
            await loadTeacherCourses(
              refreshMainContract, 
              refreshCourse02Contract, 
              await signer.getAddress()
            );
          } catch (refreshError) {
            console.error("定时刷新数据失败:", refreshError);
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
      
      // 检查合约和主合约是否已初始化
      if (!contract02Instance) {
        console.error("合约未初始化");
        setError('合约未初始化，请刷新页面重试');
        setLoading(false);
        return;
      }
      
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
          let student = {
            name: '未知学生',
            college: '未知学院',
            major: '未知专业',
            grade: '未知年级'
          };
          
          try {
            const currentContract = contract; // 保存当前contract状态的引用
            if (currentContract && typeof currentContract.getUserInfo === 'function') {
              student = await currentContract.getUserInfo(feedback.student);
              console.log(`获取学生信息成功:`, student);
            } else {
              console.warn(`主合约未初始化或无法访问getUserInfo方法，无法获取学生 ${feedback.student} 的详细信息`);
            }
          } catch (studentError) {
            console.error(`获取学生 ${feedback.student} 的信息失败:`, studentError);
            // 保持默认学生信息
          }
          
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

          // 获取反馈的修改信息
          let isModified = Number(feedback.status) === 2; // FeedbackStatus.Modified = 2
          let lastModifiedTimestamp = null;
          let lastModifiedDate = null;
          let versionsCount = Number(feedback.versions);
          
          // 如果反馈有多个版本，获取最新版本的时间
          if (versionsCount > 1) {
            try {
              // 获取最新版本信息，版本号比总数少1
              const latestVersion = await contract02Instance.getFeedbackVersion(
                feedbackId, 
                versionsCount - 1
              );
              
              lastModifiedTimestamp = new Date(Number(latestVersion.timestamp) * 1000);
              lastModifiedDate = lastModifiedTimestamp.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });
              
              console.log(`反馈 ${feedbackId} 最后修改时间:`, lastModifiedDate);
            } catch (error) {
              console.error(`获取反馈版本信息失败 ${feedbackId}:`, error);
            }
          }

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
            status: Number(feedback.status),
            isModified: isModified,
            lastModifiedDate: lastModifiedDate,
            versions: versionsCount, // 确保将版本数量添加到反馈项属性中
            versionsCount: versionsCount // 保留versionsCount作为备用
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
  
  // 打开版本比较模态框
  const openCompareModal = async (feedback) => {
    if (!feedback || !contract02) {
      message.error('无法获取反馈版本信息');
      return;
    }
    
    try {
      setLoadingVersions(true);
      setCurrentFeedbackForVersions(feedback);
      setCompareModalVisible(true);
      
      // 重置状态
      setFeedbackVersions([]);
      setSelectedVersions([null, null]);
      setVersionContents([null, null]);
      setVersionDiff(null);
      
      // 获取反馈的所有版本
      const versionsCount = feedback.versionsCount || Number(feedback.versions) || 0;
      console.log(`获取反馈 ${feedback.id} 的 ${versionsCount} 个版本`);
      
      if (versionsCount <= 1) {
        message.info('此反馈只有一个版本，无法进行比较');
        setLoadingVersions(false);
        return;
      }
      
      const versionsList = [];
      
      // 版本索引从0开始，原始版本是0，最新版本是 versionsCount-1
      for (let i = 0; i < versionsCount; i++) {
        try {
          const version = await contract02.getFeedbackVersion(feedback.id, i);
          
          // 获取版本内容
          const content = await fetchContentIfNeeded(version.contentHash);
          
          versionsList.push({
            index: i,
            timestamp: new Date(Number(version.timestamp) * 1000),
            formattedDate: new Date(Number(version.timestamp) * 1000).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }),
            contentHash: version.contentHash,
            content: content,
            label: `版本 ${i + 1} (${i === 0 ? '原始版本' : i === versionsCount - 1 ? '最新版本' : '修改版本'}) - ${new Date(Number(version.timestamp) * 1000).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}`
          });
          
        } catch (error) {
          console.error(`获取反馈版本 ${i} 失败:`, error);
        }
      }
      
      console.log("获取到的反馈版本:", versionsList);
      setFeedbackVersions(versionsList);
      
      // 如果有多个版本，默认选择最早和最新的版本
      if (versionsList.length >= 2) {
        setSelectedVersions([0, versionsList.length - 1]);
        setVersionContents([versionsList[0].content, versionsList[versionsList.length - 1].content]);
        
        // 计算差异
        const diff = diffLines(versionsList[0].content, versionsList[versionsList.length - 1].content);
        setVersionDiff(diff);
      }
      
    } catch (error) {
      console.error("获取反馈版本失败:", error);
      message.error('获取反馈版本失败: ' + (error.message || error));
    } finally {
      setLoadingVersions(false);
    }
  };
  
  // 关闭版本比较模态框
  const closeCompareModal = () => {
    setCompareModalVisible(false);
    setCurrentFeedbackForVersions(null);
    setFeedbackVersions([]);
    setSelectedVersions([null, null]);
    setVersionContents([null, null]);
    setVersionDiff(null);
  };
  
  // 处理版本选择变化
  const handleVersionChange = (index, versionIndex) => {
    const newSelectedVersions = [...selectedVersions];
    newSelectedVersions[index] = versionIndex;
    setSelectedVersions(newSelectedVersions);
    
    // 更新内容
    const newVersionContents = [...versionContents];
    newVersionContents[index] = feedbackVersions[versionIndex].content;
    setVersionContents(newVersionContents);
    
    // 如果两个版本都已选择，计算差异
    if (newSelectedVersions[0] !== null && newSelectedVersions[1] !== null) {
      const oldContent = feedbackVersions[newSelectedVersions[0]].content;
      const newContent = feedbackVersions[newSelectedVersions[1]].content;
      const diff = diffLines(oldContent, newContent);
      setVersionDiff(diff);
    }
  };
  
  // 加载特定版本反馈
  const loadFeedbackVersion = async (feedbackId, versionId) => {
    try {
      console.log(`尝试加载反馈 ${feedbackId} 的版本 ${versionId}`);
      const version = await contract02.getFeedbackVersion(feedbackId, versionId);
      console.log(`成功获取反馈 ${feedbackId} 的版本 ${versionId}:`, version);
      
      // 获取内容
      let contentText = "";
      try {
        contentText = await fetchContentIfNeeded(version.contentHash);
        console.log(`成功获取反馈 ${feedbackId} 的版本 ${versionId} 内容`);
      } catch (err) {
        console.error(`获取反馈 ${feedbackId} 的版本 ${versionId} 内容失败:`, err);
        contentText = `[无法加载版本 ${versionId} 的内容]`;
      }
      
      return {
        id: Number(versionId),
        feedbackId: Number(feedbackId),
        timestamp: Number(version.timestamp),
        content: contentText,
        contentHash: version.contentHash,
        date: new Date(Number(version.timestamp) * 1000),
        formattedDate: new Date(Number(version.timestamp) * 1000).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }),
        versionLabel: versionId === 0 ? '原始版本' : 
                      `修改版本 ${versionId}`
      };
    } catch (error) {
      console.error(`加载反馈版本 ${versionId} 失败:`, error);
      return {
        id: versionId,
        feedbackId: feedbackId,
        timestamp: 0,
        content: `[版本 ${versionId} 加载失败]`,
        contentHash: "",
        date: new Date(),
        formattedDate: '未知时间',
        versionLabel: versionId === 0 ? '原始版本' : 
                      `修改版本 ${versionId}`
      };
    }
  };

  // 导出所有反馈历史记录为PDF
  const exportAllFeedbackHistory = async () => {
    if (!selectedCourse || !contract02 || filteredFeedbacks.length === 0) {
      message.error('没有可导出的反馈记录');
      return;
    }
    
    try {
      setExportingAllFeedbacks(true);
      message.loading('正在生成所有反馈记录PDF报告...', 0);
      
      // 创建PDF文档 - 使用A4大小
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // 检查autoTable插件是否正确加载
      if (typeof doc.autoTable !== 'function') {
        console.error('jsPDF-AutoTable 插件未正确加载');
        message.error('PDF插件加载失败，请刷新页面重试');
        setExportingAllFeedbacks(false);
        return;
      }
      
      // 使用Canvas方式绘制中文文本 - 复用已有的drawText函数
      const drawText = (text, x, y, options = {}) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // 设置字体和大小
        const fontSize = options.fontSize || 12;
        const fontFamily = options.fontFamily || 'Arial, "Microsoft YaHei", "微软雅黑", STXihei, "华文细黑", sans-serif';
        context.font = `${options.fontWeight || 'normal'} ${fontSize}px ${fontFamily}`;
        
        // 计算文本宽度并创建适当大小的canvas
        const metrics = context.measureText(text);
        const textWidth = metrics.width;
        
        // 确保Canvas大小足够容纳文本
        const scaleFactor = 3; // 增加缩放因子，提高清晰度
        canvas.width = textWidth * scaleFactor;
        canvas.height = fontSize * scaleFactor * 1.3;
        
        // 重新设置字体（因为改变了canvas大小）
        context.font = `${options.fontWeight || 'normal'} ${fontSize * scaleFactor}px ${fontFamily}`;
        context.fillStyle = options.color || '#000000';
        context.textBaseline = 'top';
        
        // 启用抗锯齿
        context.textRendering = 'optimizeLegibility';
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        
        // 绘制文本
        context.fillText(text, 0, 0);
        
        // 计算文本尺寸
        // 保持文本的原始宽高比，但确保尺寸合理
        let outputWidth = textWidth * 0.35; // 调整这个系数以获得更合适的宽度
        let outputHeight = fontSize * 0.4; // 高度也要调整
        
        // 居中对齐处理
        let textX = x;
        if (options.align === 'center') {
          textX = x - (outputWidth / 2);
        }
        
        // 将canvas添加到PDF
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', textX, y - (outputHeight * 0.8), outputWidth, outputHeight);
      };
      
      // 绘制封面
      // 绘制标题
      drawText('课程反馈记录汇总', 105, 30, { fontSize: 20, fontWeight: 'bold', align: 'center' });
      
      // 绘制课程信息
      drawText(`课程: ${selectedCourse?.name || 'Unknown'}`, 105, 50, { fontSize: 14, align: 'center' });
      drawText(`教师: ${userData.name}`, 105, 60, { fontSize: 14, align: 'center' });
      drawText(`反馈总数: ${filteredFeedbacks.length}`, 105, 70, { fontSize: 14, align: 'center' });
      drawText(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 105, 80, { fontSize: 14, align: 'center' });
      
      // 添加目录页
      doc.addPage();
      drawText('目录', 105, 20, { fontSize: 16, fontWeight: 'bold', align: 'center' });
      
      let tocYPos = 40;
      // 生成目录
      filteredFeedbacks.forEach((feedback, index) => {
        const studentName = feedback.isAnonymous ? '匿名学生' : feedback.student.name;
        drawText(`${index + 1}. ${studentName}的反馈 (ID: ${feedback.id})`, 25, tocYPos, { fontSize: 12 });
        tocYPos += 8;
        
        // 每页最多20个目录项
        if (tocYPos > 250 && index < filteredFeedbacks.length - 1) {
          doc.addPage();
          drawText('目录 (续)', 105, 20, { fontSize: 16, fontWeight: 'bold', align: 'center' });
          tocYPos = 40;
        }
      });
      
      // 处理每个反馈的详细信息
      for (let i = 0; i < filteredFeedbacks.length; i++) {
        const feedback = filteredFeedbacks[i];
        
        // 新页开始
        doc.addPage();
        
        // 获取反馈的版本数量
        let versionsCount = 0;
        try {
          // 从feedback对象获取版本数
          versionsCount = Number(feedback.versions || 0);
        } catch (versionCountError) {
          console.error(`获取反馈 ${feedback.id} 版本数量失败:`, versionCountError);
          // 如果获取失败，至少设为1（当前版本）
          versionsCount = 1;
        }
        
        // 确保至少有一个版本
        versionsCount = Math.max(versionsCount, 1);
        
        // 查询所有版本
        const versionPromises = [];
        for (let j = 0; j < versionsCount; j++) {
          versionPromises.push(loadFeedbackVersion(feedback.id, j));
        }
        
        const versionsList = await Promise.all(versionPromises);
        // 按照时间升序排序，最早的在前面
        versionsList.sort((a, b) => a.timestamp - b.timestamp);
        
        // 绘制反馈标题
        drawText(`反馈 ${i + 1}: ID ${feedback.id}`, 105, 15, { fontSize: 16, fontWeight: 'bold', align: 'center' });
        
        // 绘制反馈信息
        drawText(`学生: ${feedback.isAnonymous ? '匿名学生' : feedback.student.name}`, 14, 30, { fontSize: 11 });
        drawText(`提交时间: ${feedback.formattedDate}`, 14, 38, { fontSize: 11 });
        
        if (feedback.hasReply) {
          drawText(`教师回复: ${feedback.reply}`, 14, 46, { fontSize: 11 });
          drawText(`回复时间: ${feedback.formattedReplyDate}`, 14, 54, { fontSize: 11 });
          doc.line(14, 58, 196, 58);
        } else {
          doc.line(14, 42, 196, 42);
        }
        
        // 版本索引从0开始
        let yPos = feedback.hasReply ? 65 : 50;
        
        // 如果只有一个版本
        if (versionsList.length <= 1) {
          drawText('此反馈仅有一个版本，无修改历史。', 14, yPos, { fontSize: 11 });
          drawText('反馈内容:', 14, yPos + 8, { fontSize: 11, fontWeight: 'bold' });
          
          // 分行显示内容
          const contentLines = versionsList[0]?.content?.split('\n') || feedback.content.split('\n');
          let contentYPos = yPos + 18;
          contentLines.forEach(line => {
            // 检查是否需要添加新页
            if (contentYPos > 270) {
              doc.addPage();
              contentYPos = 20;
            }
            drawText(line, 14, contentYPos, { fontSize: 10 });
            contentYPos += 5;
          });
        } else {
          // 绘制版本历史标题
          drawText('反馈修改历史:', 14, yPos, { fontSize: 11, fontWeight: 'bold' });
          yPos += 8;
          
          // 准备版本历史数据
          const tableData = versionsList.map((version, index) => [
            `版本 ${index + 1} (${version.versionLabel})`,
            version.formattedDate,
            version.content.length > 30 ? version.content.substring(0, 27) + '...' : version.content
          ]);
          
          try {
            // 使用autoTable创建表格
            doc.autoTable({
              startY: yPos,
              head: [['版本', '修改时间', '内容摘要']],
              body: tableData,
              theme: 'striped',
              headStyles: { fillColor: [26, 115, 232], fontSize: 10 },
              bodyStyles: { fontSize: 9 },
              columnStyles: { 
                0: { cellWidth: 40 },
                1: { cellWidth: 40 },
                2: { cellWidth: 'auto' }
              },
              margin: { top: yPos, left: 14, right: 14 },
              didDrawCell: (data) => {
                // 处理表格中的中文
                if (data.section === 'body' && data.cell.text && data.cell.text.length > 0) {
                  // 清除自动绘制的文本
                  const originalText = data.cell.text[0];
                  data.cell.text = [''];
                  
                  // 用Canvas方式绘制中文
                  if (originalText && originalText !== '') {
                    // 计算单元格的中心位置
                    const x = data.cell.x + 2;
                    const y = data.cell.y + 3;
                    drawText(originalText, x, y, { fontSize: 8 });
                  }
                }
              }
            });
            
            // 获取表格结束位置
            yPos = doc.lastAutoTable.finalY + 10;
            
            // 添加最新版本的完整内容
            if (yPos > 200) {
              doc.addPage();
              yPos = 20;
            }
            
            drawText('最新版本完整内容:', 14, yPos, { fontSize: 11, fontWeight: 'bold' });
            yPos += 8;
            
            // 显示最新版本的内容
            const latestVersion = versionsList[versionsList.length - 1];
            
            // 内容框
            doc.setDrawColor(220, 220, 220);
            doc.setFillColor(250, 250, 250);
            // 计算内容高度
            const contentLines = latestVersion.content.split('\n');
            const contentHeight = Math.min(6 * contentLines.length + 10, 180); // 限制最大高度
            doc.roundedRect(14, yPos, 180, contentHeight, 2, 2, 'FD');
            yPos += 5;
            
            // 分行显示内容
            let contentYPos = yPos;
            contentLines.forEach(line => {
              // 检查是否需要添加新页
              if (contentYPos > 270) {
                doc.addPage();
                contentYPos = 20;
                // 新页面也添加内容框
                doc.setDrawColor(220, 220, 220);
                doc.setFillColor(250, 250, 250);
                doc.roundedRect(14, 15, 180, 250, 2, 2, 'FD');
              }
              
              drawText(line, 20, contentYPos, { fontSize: 9 });
              contentYPos += 5;
            });
          } catch (tableError) {
            console.error('创建表格失败:', tableError);
            // 如果表格创建失败，使用简单文本显示版本历史
            let versionTextY = yPos + 5;
            versionsList.forEach((version, index) => {
              drawText(`版本 ${index + 1} (${version.versionLabel}): ${version.formattedDate}`, 14, versionTextY, { fontSize: 10 });
              versionTextY += 6;
              const contentPreview = version.content.length > 60 ? version.content.substring(0, 57) + '...' : version.content;
              drawText(`内容: ${contentPreview}`, 20, versionTextY, { fontSize: 9 });
              versionTextY += 8;
            });
            yPos = versionTextY + 5;
          }
        }
      }
      
      // 添加页脚
      const pageCount = doc.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // 页脚分隔线
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 285, 196, 285);
        
        // 页码和时间信息
        drawText(`第 ${i} 页，共 ${pageCount} 页`, 105, 290, { 
          fontSize: 8,
          align: 'center'
        });
        
        // 时间戳
        drawText(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 105, 295, { 
          fontSize: 8,
          align: 'center' 
        });
      }
      
      // 保存PDF
      const filename = `${selectedCourse?.name || 'course'}_全部反馈记录_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(filename);
      
      message.destroy();
      message.success(`所有反馈记录PDF报告已生成: ${filename}`);
      
    } catch (error) {
      console.error("导出所有反馈历史记录失败:", error);
      message.error('导出失败: ' + (error.message || error));
    } finally {
      setExportingAllFeedbacks(false);
    }
  };
  
  // 导出反馈历史记录为PDF
  const exportFeedbackHistory = async (feedback) => {
    if (!feedback || !contract02) {
      message.error('无法获取反馈版本信息');
      return;
    }
    
    try {
      setExportLoading(true);
      message.loading('正在生成PDF报告...', 0);
      
      // 获取反馈的版本数量
      let versionsCount = 0;
      try {
        console.log(`尝试获取反馈 ${feedback.id} 的版本数量`);
        // 从feedback对象获取版本数
        versionsCount = Number(feedback.versions || 0);
        console.log(`反馈 ${feedback.id} 的版本数量: ${versionsCount}`);
      } catch (versionCountError) {
        console.error('获取版本数量失败:', versionCountError);
        // 如果获取失败，至少设为1（当前版本）
        versionsCount = 1;
      }
      
      // 确保至少有一个版本
      versionsCount = Math.max(versionsCount, 1);
      console.log(`导出反馈 ${feedback.id} 的 ${versionsCount} 个版本`);
      
      // 查询所有版本
      const versionPromises = [];
      for (let i = 0; i < versionsCount; i++) {
        versionPromises.push(loadFeedbackVersion(feedback.id, i));
      }
      
      const versionsList = await Promise.all(versionPromises);
      // 按照时间升序排序，最早的在前面
      versionsList.sort((a, b) => a.timestamp - b.timestamp);
      
      console.log(`成功获取 ${versionsList.length} 个版本记录:`, versionsList);
      
      // 创建PDF文档 - 使用A4大小
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // 检查autoTable插件是否正确加载
      if (typeof doc.autoTable !== 'function') {
        console.error('jsPDF-AutoTable 插件未正确加载');
        message.error('PDF插件加载失败，请刷新页面重试');
        setExportLoading(false);
        return;
      }
      
      // 使用Canvas方式绘制中文文本
      const drawText = (text, x, y, options = {}) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // 设置字体和大小
        const fontSize = options.fontSize || 12;
        const fontFamily = options.fontFamily || 'Arial, "Microsoft YaHei", "微软雅黑", STXihei, "华文细黑", sans-serif';
        context.font = `${options.fontWeight || 'normal'} ${fontSize}px ${fontFamily}`;
        
        // 计算文本宽度并创建适当大小的canvas
        const metrics = context.measureText(text);
        const textWidth = metrics.width;
        
        // 确保Canvas大小足够容纳文本
        const scaleFactor = 3; // 增加缩放因子，提高清晰度
        canvas.width = textWidth * scaleFactor;
        canvas.height = fontSize * scaleFactor * 1.3;
        
        // 重新设置字体（因为改变了canvas大小）
        context.font = `${options.fontWeight || 'normal'} ${fontSize * scaleFactor}px ${fontFamily}`;
        context.fillStyle = options.color || '#000000';
        context.textBaseline = 'top';
        
        // 启用抗锯齿
        context.textRendering = 'optimizeLegibility';
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        
        // 绘制文本
        context.fillText(text, 0, 0);
        
        // 计算文本尺寸
        // 保持文本的原始宽高比，但确保尺寸合理
        let outputWidth = textWidth * 0.35; // 调整这个系数以获得更合适的宽度
        let outputHeight = fontSize * 0.4; // 高度也要调整
        
        // 居中对齐处理
        let textX = x;
        if (options.align === 'center') {
          textX = x - (outputWidth / 2);
        }
        
        // 将canvas添加到PDF
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', textX, y - (outputHeight * 0.8), outputWidth, outputHeight);
      };
      
      // 绘制标题
      drawText('反馈历史记录', 105, 15, { fontSize: 16, fontWeight: 'bold', align: 'center' });
      
      // 绘制反馈信息
      drawText(`反馈ID: ${feedback.id}`, 14, 30, { fontSize: 11 });
      drawText(`课程: ${selectedCourse?.name || 'Unknown'}`, 14, 38, { fontSize: 11 });
      drawText(`学生: ${feedback.isAnonymous ? '匿名学生' : feedback.student.name}`, 14, 46, { fontSize: 11 });
      drawText(`提交时间: ${feedback.formattedDate}`, 14, 54, { fontSize: 11 });
      
      if (feedback.hasReply) {
        drawText(`教师回复: ${feedback.reply}`, 14, 62, { fontSize: 11 });
        drawText(`回复时间: ${feedback.formattedReplyDate}`, 14, 70, { fontSize: 11 });
        doc.line(14, 74, 196, 74);
      } else {
        doc.line(14, 60, 196, 60);
      }
      
      // 版本索引从0开始
      let yPos = feedback.hasReply ? 80 : 65;
      
      // 如果只有一个版本
      if (versionsList.length <= 1) {
        drawText('此反馈仅有一个版本，无修改历史。', 14, yPos, { fontSize: 11 });
        drawText('反馈内容:', 14, yPos + 8, { fontSize: 11, fontWeight: 'bold' });
        
        // 分行显示内容
        const contentLines = versionsList[0]?.content?.split('\n') || feedback.content.split('\n');
        let contentYPos = yPos + 18;
        contentLines.forEach(line => {
          drawText(line, 14, contentYPos, { fontSize: 10 });
          contentYPos += 5;
        });
      } else {
        // 绘制版本历史标题
        drawText('反馈修改历史:', 14, yPos, { fontSize: 11, fontWeight: 'bold' });
        yPos += 8;
        
        // 准备版本历史数据
        const tableData = versionsList.map((version, index) => [
          `版本 ${index + 1} (${version.versionLabel})`,
          version.formattedDate,
          version.content.length > 30 ? version.content.substring(0, 27) + '...' : version.content
        ]);
        
        try {
          // 使用autoTable创建表格
          doc.autoTable({
            startY: yPos,
            head: [['版本', '修改时间', '内容摘要']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [26, 115, 232], fontSize: 10 },
            bodyStyles: { fontSize: 9 },
            columnStyles: { 
              0: { cellWidth: 40 },
              1: { cellWidth: 40 },
              2: { cellWidth: 'auto' }
            },
            margin: { top: yPos, left: 14, right: 14 },
            didDrawCell: (data) => {
              // 处理表格中的中文
              if (data.section === 'body' && data.cell.text && data.cell.text.length > 0) {
                // 清除自动绘制的文本
                const originalText = data.cell.text[0];
                data.cell.text = [''];
                
                // 用Canvas方式绘制中文
                if (originalText && originalText !== '') {
                  // 计算单元格的中心位置
                  const x = data.cell.x + 2;
                  const y = data.cell.y + 3;
                  drawText(originalText, x, y, { fontSize: 8 });
                }
              }
            }
          });
          
          // 获取表格结束位置
          yPos = doc.lastAutoTable.finalY + 10;
          
          // 添加各版本完整内容
          doc.addPage();
          yPos = 15;
          
          drawText('各版本完整内容', 105, yPos, { fontSize: 14, fontWeight: 'bold', align: 'center' });
          yPos += 10;
          
          versionsList.forEach((version, index) => {
            // 检查是否需要添加新页
            if (yPos > 250) {
              doc.addPage();
              yPos = 15;
            }
            
            // 版本标题
            drawText(
              `版本 ${index + 1} (${version.versionLabel})`,
              14, yPos, { fontSize: 12, fontWeight: 'bold' }
            );
            yPos += 7;
            
            drawText(`修改时间: ${version.formattedDate}`, 14, yPos, { fontSize: 10 });
            yPos += 7;
            
            drawText('内容:', 14, yPos, { fontSize: 10, fontWeight: 'bold' });
            yPos += 6;
            
            // 内容框
            doc.setDrawColor(220, 220, 220);
            doc.setFillColor(250, 250, 250);
            // 计算内容高度
            const contentLines = version.content.split('\n');
            const contentHeight = Math.min(6 * contentLines.length + 10, 200); // 限制最大高度
            doc.roundedRect(14, yPos, 180, contentHeight, 2, 2, 'FD');
            yPos += 5;
            
            // 分行显示内容
            contentLines.forEach(line => {
              // 检查是否需要添加新页
              if (yPos > 280) {
                doc.addPage();
                yPos = 15;
              }
              
              drawText(line, 20, yPos, { fontSize: 9 });
              yPos += 5;
            });
            
            // 版本间隔
            yPos += 12;
          });
          
          // 如果内容太多，自动添加了新页
          // 添加版本比较
          if (versionsList.length >= 2) {
            // 添加相邻版本的比较
            for (let i = 0; i < versionsList.length - 1; i++) {
              const oldVersion = versionsList[i];
              const newVersion = versionsList[i + 1];
              
              doc.addPage();
              drawText(`版本 ${i + 1} 与版本 ${i + 2} 的比较`, 105, 15, { fontSize: 14, fontWeight: 'bold', align: 'center' });
              
              // 版本信息
              drawText(`旧版本: ${oldVersion.versionLabel} (${oldVersion.formattedDate})`, 14, 30, { fontSize: 10 });
              drawText(`新版本: ${newVersion.versionLabel} (${newVersion.formattedDate})`, 14, 38, { fontSize: 10 });
              
              // 计算差异
              const oldContent = oldVersion.content;
              const newContent = newVersion.content;
              const diff = diffLines(oldContent, newContent);
              
              drawText('变更对比:', 14, 47, { fontSize: 11, fontWeight: 'bold' });
              
              // 比较框
              doc.setDrawColor(220, 220, 220);
              doc.setFillColor(250, 250, 250);
              doc.roundedRect(14, 55, 180, 230, 2, 2, 'FD');
              
              let diffY = 59;
              diff.forEach(part => {
                // 检查是否需要添加新页
                if (diffY > 270) {
                  doc.addPage();
                  diffY = 15;
                  // 新页面也添加比较框
                  doc.setDrawColor(220, 220, 220);
                  doc.setFillColor(250, 250, 250);
                  doc.roundedRect(14, 14, 180, 270, 2, 2, 'FD');
                }
                
                // 设置颜色
                let textColor = '#000000'; // 默认黑色
                let prefix = '';
                
                if (part.added) {
                  textColor = '#22863a'; // 绿色
                  prefix = '+ ';
                } else if (part.removed) {
                  textColor = '#cb2431'; // 红色
                  prefix = '- ';
                }
                
                // 分行显示差异内容
                const lines = part.value.split('\n');
                lines.forEach(line => {
                  if (diffY > 270) {
                    doc.addPage();
                    diffY = 15;
                    // 新页面也添加比较框
                    doc.setDrawColor(220, 220, 220);
                    doc.setFillColor(250, 250, 250);
                    doc.roundedRect(14, 14, 180, 270, 2, 2, 'FD');
                  }
                  
                  if (line.trim() || part.added || part.removed) {
                    drawText(prefix + line, 20, diffY, { 
                      fontSize: 9, 
                      color: textColor 
                    });
                    diffY += 5;
                  }
                });
              });
            }
          }
        } catch (tableError) {
          console.error('创建表格失败:', tableError);
          // 如果表格创建失败，使用简单文本显示版本历史
          let versionTextY = yPos + 5;
          versionsList.forEach((version, index) => {
            drawText(`版本 ${index + 1} (${version.versionLabel}): ${version.formattedDate}`, 14, versionTextY, { fontSize: 10 });
            versionTextY += 6;
            const contentPreview = version.content.length > 60 ? version.content.substring(0, 57) + '...' : version.content;
            drawText(`内容: ${contentPreview}`, 20, versionTextY, { fontSize: 9 });
            versionTextY += 8;
          });
          yPos = versionTextY + 5;
        }
      }
      
      // 添加页脚
      const pageCount = doc.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // 页脚分隔线
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 285, 196, 285);
        
        // 页码和时间信息
        drawText(`第 ${i} 页，共 ${pageCount} 页`, 105, 290, { 
          fontSize: 8,
          align: 'center'
        });
        
        // 时间戳
        drawText(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 105, 295, { 
          fontSize: 8,
          align: 'center' 
        });
      }
      
      // 保存PDF
      const filename = `反馈历史记录_${feedback.id}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(filename);
      
      message.destroy();
      message.success(`PDF报告已生成: ${filename}`);
      
    } catch (error) {
      console.error("导出反馈历史记录失败:", error);
      message.error('导出失败: ' + (error.message || error));
    } finally {
      setExportLoading(false);
    }
  };
  
  // 渲染反馈列表项
  const renderFeedbackItem = (feedback) => {
    // 修改版本判断逻辑，增加对isModified和versions属性的检查
    const hasMultipleVersions = (feedback.versions > 1) || feedback.isModified || (feedback.versionsCount > 1);
    
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
          </Button>,
          hasMultipleVersions && (
            <Button
              type="default"
              icon={<DiffOutlined />}
              onClick={() => openCompareModal(feedback)}
              key="compare-button"
            >
              版本对比
            </Button>
          ),
          <Button
            type="default"
            icon={<FileOutlined />}
            onClick={() => exportFeedbackHistory(feedback)}
            loading={exportLoading}
            key="export-button"
          >
            导出记录
          </Button>
        ].filter(Boolean)} // 过滤掉可能的undefined元素
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
              {feedback.isModified && (
                <Tooltip title={`最后修改于 ${feedback.lastModifiedDate || '未知时间'}`}>
                  <Tag icon={<FileTextOutlined />} color="purple">已修改</Tag>
                </Tooltip>
              )}
            </Space>
          }
          description={
            <div>
              <div className={styles.feedbackDate}>
                <CalendarOutlined style={{ marginRight: 8 }} />
                <span>{feedback.formattedDate}</span>
                {feedback.isModified && feedback.lastModifiedDate && (
                  <span className={styles.modifiedDate}>
                    &nbsp;(最后修改于: {feedback.lastModifiedDate})
                  </span>
                )}
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
                    <div className={styles.feedbackListHeader}>
                      <div className={styles.feedbackListTitle}>
                        {filteredFeedbacks.length > 0 ? (
                          <span>共 {filteredFeedbacks.length} 条反馈</span>
                        ) : (
                          <span>暂无反馈</span>
                        )}
                      </div>
                      {filteredFeedbacks.length > 0 && (
                        <Button
                          type="primary"
                          icon={<FileOutlined />}
                          onClick={exportAllFeedbackHistory}
                          loading={exportingAllFeedbacks}
                        >
                          导出全部反馈
                        </Button>
                      )}
                    </div>
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
      
      {/* 版本比较模态框 */}
      <Modal
        title={
          <div className={styles.modalTitle}>
            <DiffOutlined className={styles.modalTitleIcon} />
            <span>反馈版本比较</span>
          </div>
        }
        open={compareModalVisible}
        onCancel={closeCompareModal}
        footer={[
          <Button key="close" onClick={closeCompareModal}>
            关闭
          </Button>
        ]}
        width={800}
        className={styles.compareModal}
      >
        {loadingVersions ? (
          <div className={styles.loadingContainer}>
            <Spin />
            <div className={styles.loadingText}>正在加载版本信息...</div>
          </div>
        ) : (
          currentFeedbackForVersions && (
            <div>
              <div className={styles.versionSelectContainer}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div className={styles.versionSelectWrapper}>
                      <div className={styles.versionSelectLabel}>旧版本:</div>
                      <Select
                        className={styles.versionSelect}
                        value={selectedVersions[0]}
                        onChange={(value) => handleVersionChange(0, value)}
                        placeholder="选择旧版本"
                      >
                        {feedbackVersions.map((version, index) => (
                          <Option key={`old-${index}`} value={index}>
                            {version.label || `版本 ${index + 1}`}
                          </Option>
                        ))}
                      </Select>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className={styles.versionSelectWrapper}>
                      <div className={styles.versionSelectLabel}>新版本:</div>
                      <Select
                        className={styles.versionSelect}
                        value={selectedVersions[1]}
                        onChange={(value) => handleVersionChange(1, value)}
                        placeholder="选择新版本"
                      >
                        {feedbackVersions.map((version, index) => (
                          <Option key={`new-${index}`} value={index}>
                            {version.label || `版本 ${index + 1}`}
                          </Option>
                        ))}
                      </Select>
                    </div>
                  </Col>
                </Row>
              </div>
              
              {selectedVersions[0] !== null && selectedVersions[1] !== null ? (
                <div className={styles.diffContainer}>
                  <Divider>差异对比</Divider>
                  
                  {versionDiff && (
                    <div className={styles.diffContent}>
                      {versionDiff.map((part, i) => (
                        <div 
                          key={i}
                          className={
                            part.added 
                              ? styles.diffAdded 
                              : part.removed 
                                ? styles.diffRemoved 
                                : styles.diffUnchanged
                          }
                        >
                          {part.value.split('\n').map((line, lineIndex) => (
                            <div key={`${i}-${lineIndex}`} className={styles.diffLine}>
                              {part.added && <span className={styles.diffPrefix}>+</span>}
                              {part.removed && <span className={styles.diffPrefix}>-</span>}
                              {line || ' '}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.noVersionsSelected}>
                  <Empty description="请选择两个版本进行比较" />
                </div>
              )}
            </div>
          )
        )}
      </Modal>
    </ConfigProvider>
  );
} 