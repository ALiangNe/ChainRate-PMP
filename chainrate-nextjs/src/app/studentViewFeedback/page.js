'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import ChainRate02ABI from '../../contracts/ChainRate02.json';
import ChainRate02Address from '../../contracts/ChainRate02-address.json';
import { 
  Layout, 
  Typography, 
  Breadcrumb, 
  Button, 
  Spin, 
  Card, 
  message,
  ConfigProvider,
  Empty,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Tooltip,
  Input,
  Select,
  Avatar,
  Modal,
  Tabs,
  List,
  Divider,
  Timeline,
  Alert,
  App,
  theme as antTheme,
  Badge,
  Image,
  Switch
} from 'antd';
import { 
  HomeFilled, 
  CommentOutlined,
  FileTextOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  EditOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SearchOutlined,
  FileOutlined,
  PictureOutlined,
  CalendarOutlined,
  UserOutlined,
  PlusOutlined
} from '@ant-design/icons';
import StudentSidebar from '../components/StudentSidebar';
import UserAvatar from '../components/UserAvatar';
import EditFeedbackModal from './components/EditFeedbackModal';
import styles from './page.module.css';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import axios from 'axios';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

// 配置dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// 反馈状态映射
const FEEDBACK_STATUS = {
  0: { text: '未修改', color: 'blue', icon: <ClockCircleOutlined /> },
  1: { text: '已回复', color: 'green', icon: <CheckCircleOutlined /> },
  2: { text: '已修改', color: 'orange', icon: <SyncOutlined /> },
  3: { text: '已删除', color: 'red', icon: <DeleteOutlined /> }
};

// 添加 IPFS Hash 验证函数
const isValidIpfsHash = (hash) => {
  // 合法的IPFS CID v0以Qm开头，是base58编码的46个字符
  // 合法的IPFS CID v1通常是base32编码的字符串
  return hash && 
         typeof hash === 'string' && 
         (
           (hash.startsWith('Qm') && hash.length >= 46) || 
           /^[a-zA-Z0-9]{46,}$/.test(hash) ||
           /^ba[a-zA-Z0-9]{57,}$/.test(hash)
         ) &&
         !/[\u4e00-\u9fa5]/.test(hash); // 不包含中文字符
};

// 修改 getIPFSContent 函数，更好地处理各种内容类型
const getIPFSContent = async (contentHash) => {
  if (!contentHash || contentHash === '') {
    return { success: false, data: null, error: '内容哈希为空' };
  }
  
  // 1. 首先检查是否是JSON字符串，这可能是直接存储的内容
  try {
    const parsedContent = JSON.parse(contentHash);
    if (parsedContent && typeof parsedContent === 'object') {
      console.log('内容是有效的JSON对象，直接使用:', parsedContent);
      // 如果包含content字段，优先返回
      if (parsedContent.content) {
        return { success: true, data: parsedContent.content };
      }
      return { success: true, data: parsedContent };
    }
  } catch (e) {
    // 不是JSON，继续其他检查
  }
  
  // 2. 如果内容看起来像普通文本而不是哈希（包含中文字符或多于几个句子），直接将其视为内容
  if (
    /[\u4e00-\u9fa5]/.test(contentHash) || // 包含中文字符
    contentHash.split(/[.!?。！？]/).length > 2 || // 包含多个句子
    contentHash.length > 100 // 长文本
  ) {
    console.log('内容看起来是普通文本，直接显示:', contentHash);
    return { success: true, data: contentHash };
  }
  
  // 3. 如果不是有效的IPFS Hash，也直接返回内容
  if (!isValidIpfsHash(contentHash)) {
    console.log('非IPFS Hash格式，直接显示内容:', contentHash);
    return { success: true, data: contentHash };
  }
  
  // 4. 如果已经是完整URL，直接使用
  if (contentHash.startsWith('http')) {
    try {
      const response = await fetch(contentHash);
      if (response.ok) {
        try {
          const data = await response.json();
          // 如果返回的是一个包含content字段的对象，直接返回content
          if (data && typeof data === 'object' && data.content) {
            return { success: true, data: data.content };
          }
          return { success: true, data };
        } catch (jsonErr) {
          const text = await response.text();
          return { success: true, data: text };
        }
      } else {
        return { success: false, error: `HTTP错误: ${response.status}` };
      }
    } catch (fetchErr) {
      return { success: false, error: fetchErr.message };
    }
  }
  
  // 5. 使用IPFS网关
  try {
    const gateway = 'https://gateway.pinata.cloud/ipfs/';
    const url = `${gateway}${contentHash}`;
    
    console.log('IPFS请求URL:', url);
    const response = await fetch(url);
    if (response.ok) {
      try {
        const data = await response.json();
        console.log('IPFS返回数据:', data);
        // 如果返回的是一个包含content字段的对象，直接返回content
        if (data && typeof data === 'object' && data.content) {
          return { success: true, data: data.content };
        }
        return { success: true, data };
      } catch (jsonErr) {
        console.error('JSON解析错误:', jsonErr);
        const text = await response.text();
        console.log('IPFS返回文本:', text);
        return { success: true, data: text };
      }
    } else {
      console.error('IPFS响应错误:', response.status);
      return { success: false, error: `HTTP错误: ${response.status}` };
    }
  } catch (error) {
    console.error('IPFS请求异常:', error);
    return { success: false, error: error.message };
  }
};

// 创建IPFS URL
const createIPFSUrl = (hash) => {
  if (!hash || hash === '') return '';
  if (hash.startsWith('http')) return hash;
  
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
};

// 改进辅助函数，确保显示的内容不是IPFS链接
const ensureContentNotLink = (content) => {
  // 如果内容为空或不是字符串，返回默认文本
  if (!content || typeof content !== 'string') {
    return '未提供内容';
  }
  
  // 如果内容看起来像IPFS链接但不是有效的内容，尝试提取最后部分
  if (content.includes('gateway.pinata.cloud/ipfs/') || 
      content.startsWith('https://ipfs.io/') || 
      content.startsWith('ipfs://')) {
    // 提取IPFS hash
    const matches = content.match(/ipfs\/([a-zA-Z0-9]+)/);
    if (matches && matches[1]) {
      // 标记为加载失败，前端会自动重新加载
      return `[内容需要加载: ${matches[1]}]`;
    }
  }
  
  // 尝试解析可能是JSON字符串的内容
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      // 如果是对象并且有content字段，显示content字段
      if (parsed.content) {
        return parsed.content;
      }
      // 如果是对象但没有content字段，格式化显示
      return JSON.stringify(parsed, null, 2);
    }
    // 如果解析结果不是对象，直接返回原内容
    return content;
  } catch (e) {
    // 不是JSON，返回原内容
    return content;
  }
};

export default function StudentViewFeedbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const feedbackId = searchParams.get('id');
  const { message: appMessage, modal } = App.useApp();
  
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
  
  const [loading, setLoading] = useState(true);
  const [mainContract, setMainContract] = useState(null);
  const [extensionContract, setExtensionContract] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [courseMap, setCourseMap] = useState({});
  const [teacherMap, setTeacherMap] = useState({});
  const [statistics, setStatistics] = useState({
    total: 0,
    replied: 0,
    unreplied: 0,
    deleted: 0
  });
  
  // 查看状态
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [feedbackVersions, setFeedbackVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  
  // 过滤和排序
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchText, setSearchText] = useState('');
  
  // 编辑反馈相关状态
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  
  // 初始化
  useEffect(() => {
    // 确保代码仅在客户端执行
    if (typeof window === 'undefined') return;
    
    // 检查用户是否已登录并且是学生角色
    const checkUserAuth = () => {
      try {
        console.log('检查学生认证...');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userRole = localStorage.getItem('userRole');
        
        if (!isLoggedIn || userRole !== 'student') {
          console.log('未认证为学生，重定向到登录页面');
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
    
    // 初始化Web3连接
    const initWeb3 = async () => {
      try {
        // 检查MetaMask是否已安装
        if (window.ethereum === undefined) {
          appMessage.error('请安装 MetaMask 钱包以使用此应用');
          return null;
        }
        
        // 请求用户连接钱包
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // 创建 Web3 Provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // 获取 Signer
        const signer = await provider.getSigner();
        
        // 连接到主合约
        const chainRateContract = new ethers.Contract(
          ChainRateAddress.address,
          ChainRateABI.abi,
          signer
        );
        setMainContract(chainRateContract);
        
        // 连接到扩展合约
        const chainRate02Contract = new ethers.Contract(
          ChainRate02Address.address,
          ChainRate02ABI.abi,
          signer
        );
        setExtensionContract(chainRate02Contract);
        
        // 加载学生的反馈数据
        const studentAddress = localStorage.getItem('userAddress');
        await loadStudentFeedbacks(chainRate02Contract, chainRateContract, studentAddress);
        
        // 如果有指定的反馈ID，直接打开该反馈详情
        if (feedbackId) {
          const targetFeedback = feedbacks.find(f => f.id === feedbackId);
          if (targetFeedback) {
            setSelectedFeedback(targetFeedback);
            setDetailModalVisible(true);
          }
        }
      } catch (err) {
        console.error('初始化Web3失败:', err);
        appMessage.error('初始化Web3失败: ' + err.message);
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router, feedbackId]);
  
  // 加载学生提交的反馈数据
  const loadStudentFeedbacks = async (extensionContract, mainContract, studentAddress) => {
    try {
      console.log('加载学生反馈数据...');
      setLoading(true);
      
      // 获取学生提交的所有课程反馈ID
      const studentFeedbackIds = await extensionContract.getStudentFeedbacks(studentAddress);
      console.log('学生反馈IDs:', studentFeedbackIds);
      
      if (studentFeedbackIds.length === 0) {
        console.log('没有找到反馈数据');
        setStatistics({
          total: 0,
          replied: 0,
          unreplied: 0,
          deleted: 0
        });
        setLoading(false);
        return;
      }
      
      // 加载所有课程信息
      const coursesCount = await mainContract.courseCount();
      console.log('课程总数:', coursesCount);
      
      const courseData = {};
      const teacherData = {};
      
      for (let i = 0; i < coursesCount; i++) {
        try {
          const course = await mainContract.courses(i);
          courseData[i] = {
            id: i,
            name: course.name,
            teacher: course.teacher,
            department: '未知院系', // 默认值
            status: course.isActive ? 'active' : 'inactive'
          };
          
          // 如果这个教师我们还没有记录，获取教师信息
          if (course.teacher && !teacherData[course.teacher.toLowerCase()]) {
            try {
              const teacherInfo = await mainContract.getUserInfo(course.teacher);
              teacherData[course.teacher.toLowerCase()] = {
                name: teacherInfo[0] || '未知教师', // name在第一个位置
                email: teacherInfo[2] || '', // email在第三个位置
                college: teacherInfo[3] || '', // college在第四个位置
                specialty: teacherInfo[4] || '' // major在第五个位置作为specialty
              };
            } catch (err) {
              console.error('获取教师信息失败:', err);
              teacherData[course.teacher.toLowerCase()] = { 
                name: '未知教师', 
                email: '', 
                college: '', 
                specialty: '' 
              };
            }
          }
        } catch (err) {
          console.error(`获取课程 ${i} 信息失败:`, err);
        }
      }
      
      setCourseMap(courseData);
      setTeacherMap(teacherData);
      
      // 获取详细的反馈数据
      const feedbackDetailsPromises = studentFeedbackIds.map(async (id) => {
        try {
          const feedback = await extensionContract.getCourseFeedbackDetails(id);
          
          // 获取内容 - 确保正确处理
          let contentText = "";
          try {
            // 先检查contentHash是否是有效的IPFS hash
            if (isValidIpfsHash(feedback.contentHash)) {
              // 如果是有效的IPFS hash，从IPFS获取内容
              const contentResult = await getIPFSContent(feedback.contentHash);
              if (contentResult.success) {
                // 直接使用处理后的结果 
                contentText = contentResult.data;
              } else {
                contentText = "内容加载失败: " + contentResult.error;
              }
            } else {
              // 如果不是有效的IPFS hash，直接使用它作为内容
              contentText = feedback.contentHash;
            }
          } catch (err) {
            contentText = "内容处理错误: " + err.message;
          }
          
          // 获取反馈回复
          let reply = null;
          try {
            reply = await extensionContract.getTeacherReplyDetails(id);
            
            // 如果有回复，获取回复内容
            if (reply && reply.contentHash && reply.contentHash !== '') {
              let replyText = "";
              
              // 验证contentHash是否为有效的IPFS hash
              if (!isValidIpfsHash(reply.contentHash)) {
                // 不是有效IPFS hash，直接使用它作为内容
                replyText = reply.contentHash;
              } else {
                // 是有效IPFS hash，从IPFS获取内容
                try {
                  const replyResult = await getIPFSContent(reply.contentHash);
                  if (replyResult.success) {
                    replyText = replyResult.data;
                  } else {
                    replyText = `回复内容加载失败: ${replyResult.error}`;
                  }
                } catch (err) {
                  replyText = "回复内容加载失败: " + err.message;
                }
              }
              
              reply.content = replyText;
            }
          } catch (err) {
            console.log(`反馈 ${id} 没有教师回复`);
          }
          
          // 处理文档和图片URL
          const documentUrls = (feedback.documentHashes || [])
            .filter(hash => hash && hash !== '')
            .map(hash => createIPFSUrl(hash));
          
          const imageUrls = (feedback.imageHashes || [])
            .filter(hash => hash && hash !== '')
            .map(hash => createIPFSUrl(hash));
          
          return {
            id: id.toString(),
            courseId: feedback.courseId.toString(),
            student: feedback.student,
            content: contentText, // 使用处理后的文本内容
            contentHash: feedback.contentHash,
            timestamp: Number(feedback.timestamp),
            status: Number(feedback.status),
            documentUrls,
            imageHashes: feedback.imageHashes,
            documentHashes: feedback.documentHashes,
            imageUrls,
            hasReply: reply !== null,
            versions: Number(feedback.versions),
            reply: reply ? {
              teacher: reply.teacher,
              content: reply.content,
              contentHash: reply.contentHash,
              timestamp: Number(reply.timestamp)
            } : null
          };
        } catch (err) {
          console.error(`处理反馈 ${id} 时出错:`, err);
          return null;
        }
      });
      
      const allFeedbackDetails = await Promise.all(feedbackDetailsPromises);
      // 过滤掉处理失败的反馈
      const feedbackDetails = allFeedbackDetails.filter(feedback => feedback !== null);
      
      console.log('获取到的反馈详情:', feedbackDetails);
      
      // 修改统计数据计算逻辑
      const stats = {
        total: feedbackDetails.length,
        replied: feedbackDetails.filter(f => f.hasReply).length,
        unreplied: feedbackDetails.filter(f => !f.hasReply && f.status !== 3).length,
        deleted: feedbackDetails.filter(f => f.status === 3).length
      };
      
      console.log('反馈统计:', stats);
      
      setStatistics(stats);
      setFeedbacks(feedbackDetails);
      setLoading(false);
    } catch (error) {
      console.error('加载反馈数据失败:', error);
      appMessage.error('加载反馈数据失败: ' + error.message);
      setLoading(false);
    }
  };
  
  // 加载反馈版本历史
  const loadFeedbackVersions = async (feedbackId) => {
    try {
      setLoadingVersions(true);
      if (!extensionContract) {
        appMessage.error('合约未初始化');
        setLoadingVersions(false);
        return;
      }
      
      console.log('正在加载反馈历史版本...', feedbackId);
      const feedback = feedbacks.find(f => f.id === feedbackId);
      if (!feedback) {
        appMessage.error('未找到反馈信息');
        setLoadingVersions(false);
        return;
      }
      
      // 获取所有版本信息
      const versionsCount = feedback.versions;
      console.log('反馈版本数量:', versionsCount);
      
      if (versionsCount <= 0) {
        setFeedbackVersions([]);
        setLoadingVersions(false);
        return;
      }
      
      // 查询所有版本，并为每个版本加载教师回复
      const versionPromises = [];
      for (let i = 0; i < versionsCount; i++) {
        versionPromises.push((async () => {
          try {
            const version = await loadFeedbackVersion(feedbackId, i);
            
            // 尝试加载该版本的教师回复
            try {
              const reply = await extensionContract.getTeacherReplyDetails(feedbackId);
              if (reply && reply.contentHash && reply.contentHash !== '') {
                let replyText = '';
                
                // 处理回复内容
                const replyResult = await getIPFSContent(reply.contentHash);
                if (replyResult.success) {
                  replyText = replyResult.data;
                } else {
                  replyText = '回复内容加载失败: ' + replyResult.error;
                }
                
                version.reply = {
                  teacher: reply.teacher,
                  content: replyText,
                  contentHash: reply.contentHash,
                  timestamp: Number(reply.timestamp)
                };
              } else {
                version.reply = null;
              }
            } catch (err) {
              console.log(`版本 ${i} 无教师回复或获取回复失败:`, err);
              version.reply = null;
            }
            
            return version;
          } catch (error) {
            console.error(`加载版本 ${i} 失败:`, error);
            return {
              id: i,
              feedbackId: feedbackId,
              timestamp: 0,
              content: `[版本 ${i} 加载失败: ${error.message}]`,
              contentHash: "",
              documentUrls: [],
              imageUrls: [],
              documentHashes: [],
              imageHashes: [],
              date: new Date(),
              formattedDate: '未知时间',
              versionLabel: i === 0 ? '原始版本' : `修改版本 ${i}`
            };
          }
        })());
      }
      
      const versions = await Promise.all(versionPromises);
      // 按时间从新到旧排序
      versions.sort((a, b) => b.timestamp - a.timestamp);
      setFeedbackVersions(versions);
      setLoadingVersions(false);
    } catch (error) {
      console.error('加载反馈版本历史失败:', error);
      appMessage.error('加载反馈版本历史失败: ' + error.message);
      setLoadingVersions(false);
    }
  };
  
  // 加载特定版本反馈
  const loadFeedbackVersion = async (feedbackId, versionId) => {
    try {
      console.log(`尝试加载反馈 ${feedbackId} 的版本 ${versionId}`);
      const version = await extensionContract.getFeedbackVersion(feedbackId, versionId);
      console.log(`成功获取反馈 ${feedbackId} 的版本 ${versionId}:`, version);
      
      // 获取内容
      let contentText = "";
      try {
        // 首先尝试直接处理contentHash作为内容
        if (!isValidIpfsHash(version.contentHash)) {
          contentText = version.contentHash;
          console.log(`反馈 ${feedbackId} 的版本 ${versionId} 内容不是IPFS哈希，直接使用`);
        } else {
          // 是IPFS哈希，获取内容
          const contentResult = await getIPFSContent(version.contentHash);
          console.log(`获取到IPFS内容结果:`, contentResult);
          
          if (contentResult.success) {
            contentText = contentResult.data;
            console.log(`成功解析反馈 ${feedbackId} 的版本 ${versionId} 内容`);
          } else {
            console.error(`IPFS内容获取失败: ${contentResult.error}`);
            contentText = `[无法加载版本 ${versionId} 的内容: ${contentResult.error}]`;
          }
        }
      } catch (err) {
        console.error(`处理反馈 ${feedbackId} 的版本 ${versionId} 内容时出错:`, err);
        contentText = `[内容处理错误: ${err.message}]`;
      }
      
      // 处理文档和图片URL
      const documentUrls = (version.documentHashes || [])
        .filter(hash => hash && hash !== '')
        .map(hash => createIPFSUrl(hash));
      
      const imageUrls = (version.imageHashes || [])
        .filter(hash => hash && hash !== '')
        .map(hash => createIPFSUrl(hash));
      
      return {
        id: Number(version.id),
        feedbackId: Number(version.feedbackId),
        timestamp: Number(version.timestamp),
        content: contentText,
        contentHash: version.contentHash,
        documentUrls,
        imageUrls,
        documentHashes: version.documentHashes,
        imageHashes: version.imageHashes,
        date: new Date(Number(version.timestamp) * 1000),
        formattedDate: new Date(Number(version.timestamp) * 1000).toLocaleString('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
        }),
        versionLabel: versionId === 0 ? '原始版本' : `修改版本 ${versionId}`
      };
    } catch (error) {
      console.error(`加载反馈版本 ${versionId} 失败:`, error);
      return {
        id: versionId,
        feedbackId: feedbackId,
        timestamp: 0,
        content: `[版本 ${versionId} 加载失败: ${error.message}]`,
        contentHash: "",
        documentUrls: [],
        imageUrls: [],
        documentHashes: [],
        imageHashes: [],
        date: new Date(),
        formattedDate: '未知时间',
        versionLabel: versionId === 0 ? '原始版本' : `修改版本 ${versionId}`
      };
    }
  };
  
  // 处理查看反馈详情
  const handleViewFeedback = async (feedback) => {
    setSelectedFeedback(feedback);
    setDetailModalVisible(true);
    
    // 始终加载版本历史，即使只有一个版本
    await loadFeedbackVersions(feedback.id);
  };
  
  // 关闭详情模态框
  const handleCloseDetail = () => {
    setSelectedFeedback(null);
    setDetailModalVisible(false);
    setFeedbackVersions([]);
  };
  
  // 修改编辑反馈函数
  const handleEditFeedback = (feedback) => {
    // 检查反馈是否已收到教师回复
    if (feedback.hasReply) {
      // 显示警告提示
      modal.warning({
        title: '无法修改',
        content: '已收到回复的反馈不可修改，但可以提交新的补充反馈',
        okText: '知道了'
      });
      return;
    }
    
    // 如果没有收到回复，正常进入编辑流程
    setEditingFeedback(feedback);
    setEditModalVisible(true);
  };
  
  // 添加提交编辑的处理函数
  const handleSubmitEdit = async (editData) => {
    try {
      setSubmittingEdit(true);
      
      console.log('提交编辑反馈数据:', editData);
      
      // 确保合约已初始化
      if (!extensionContract) {
        throw new Error('合约未初始化');
      }
      
      // 调用合约的updateCourseFeedback方法更新反馈
      const tx = await extensionContract.updateCourseFeedback(
        editData.feedbackId,
        editData.contentHash,
        editData.documentHashes,
        editData.imageHashes
      );
      
      // 等待交易确认
      appMessage.loading('正在更新反馈，请等待区块链确认...');
      await tx.wait();
      
      appMessage.success('反馈已成功修改');
      
      // 关闭模态框
      setEditModalVisible(false);
      setEditingFeedback(null);
      
      // 重新加载学生反馈数据
      const studentAddress = userData.address;
      await loadStudentFeedbacks(extensionContract, mainContract, studentAddress);
      
      // 如果当前正在查看该反馈的详情，则重新加载版本历史
      if (detailModalVisible && selectedFeedback && selectedFeedback.id === editData.feedbackId) {
        // 更新selectedFeedback
        const updatedFeedback = feedbacks.find(f => f.id === editData.feedbackId);
        if (updatedFeedback) {
          setSelectedFeedback(updatedFeedback);
          // 重新加载版本历史
          await loadFeedbackVersions(editData.feedbackId);
        }
      }
      
    } catch (error) {
      console.error('更新反馈失败:', error);
      
      let errorMessage = '更新反馈失败';
      
      // 尝试提取更友好的错误信息
      if (error.message) {
        if (error.message.includes('user rejected transaction')) {
          errorMessage = '用户取消了交易';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = '账户余额不足以支付交易费用';
        } else if (error.message.includes('execution reverted')) {
          // 尝试提取智能合约抛出的错误
          const match = error.message.match(/reason="([^"]+)"/);
          if (match && match[1]) {
            errorMessage = `合约执行失败: ${match[1]}`;
          } else {
            errorMessage = '合约执行失败';
          }
        }
      }
      
      appMessage.error(errorMessage);
    } finally {
      setSubmittingEdit(false);
    }
  };
  
  // 处理搜索
  const handleSearch = (value) => {
    setSearchText(value);
  };
  
  // 处理状态筛选
  const handleStatusFilter = (value) => {
    console.log('筛选状态:', value);
    setFilterStatus(value);
  };
  
  // 处理排序
  const handleSort = (value) => {
    setSortOrder(value);
  };
  
  // 筛选并排序反馈
  const getFilteredAndSortedFeedbacks = () => {
    let result = [...feedbacks];
    
    // 根据筛选状态过滤
    if (filterStatus !== 'all') {
      // 特殊处理已回复和未回复状态
      if (filterStatus === 'replied') {
        // 已回复：hasReply为true的反馈
        result = result.filter(f => f.hasReply);
      } else if (filterStatus === 'unreplied') {
        // 未回复：hasReply为false且状态不为3(已删除)的反馈
        result = result.filter(f => !f.hasReply && f.status !== 3);
      } else {
        // 其他状态：按照status值筛选
        const statusNum = parseInt(filterStatus);
        result = result.filter(f => f.status === statusNum);
      }
    }
    
    // 搜索功能保持不变
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(feedback => {
        const courseInfo = courseMap[feedback.courseId] || {};
        
        return (
          feedback.content.toLowerCase().includes(searchLower) ||
          (courseInfo.name && courseInfo.name.toLowerCase().includes(searchLower))
        );
      });
    }
    
    // 排序功能保持不变
    switch (sortOrder) {
      case 'newest':
        result.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        result.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'statusAsc':
        result.sort((a, b) => a.status - b.status);
        break;
      case 'statusDesc':
        result.sort((a, b) => b.status - a.status);
        break;
    }
    
    return result;
  };
  
  // 获取教师信息
  const getTeacherInfo = (address) => {
    if (!address) return { name: '未知教师' };
    return teacherMap[address.toLowerCase()] || { name: '未知教师' };
  };
  
  // 获取课程信息
  const getCourseInfo = (id) => {
    return courseMap[id] || { name: '未知课程', department: '未知院系' };
  };
  
  const filteredFeedbacks = getFilteredAndSortedFeedbacks();
  
  // 创建新反馈
  const handleCreateFeedback = () => {
    router.push('/studentSubmitFeedback');
  };
  
  // 渲染页面
  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        components: {
          Card: {
            colorBgContainer: isDarkMode ? '#1f1f1f' : '#ffffff',
          },
        },
      }}
    >
      <App>
        <Layout className={styles.pageLayout}>
          <Layout.Header className={styles.header}>
            <div className={styles.headerContent}>
              <Typography.Title level={3} style={{ margin: 0, color: isDarkMode ? '#fff' : '#001529' }}>
                我的反馈记录
              </Typography.Title>
              <Space>
                <Switch
                  checkedChildren="暗色"
                  unCheckedChildren="亮色"
                  checked={isDarkMode}
                  onChange={setIsDarkMode}
                  className={styles.themeSwitch}
                />
              </Space>
            </div>
          </Layout.Header>
          
          <Layout.Content className={styles.content}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <Spin size="large" />
                <p>加载数据中...</p>
              </div>
            ) : (
              <>
                <div className={styles.topControls}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Card bordered={false} className={styles.toolCard}>
                      <Space direction="horizontal" size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
                        <div className={styles.searchContainer}>
                          <Input.Search
                            placeholder="搜索反馈内容或课程"
                            onSearch={handleSearch}
                            style={{ width: 300 }}
                            allowClear
                          />
                        </div>
                        
                        <Space>
                          <Select
                            placeholder="状态筛选"
                            style={{ width: 150 }}
                            onChange={handleStatusFilter}
                            defaultValue="all"
                          >
                            <Select.Option value="all">全部状态</Select.Option>
                            <Select.Option value="replied">已回复</Select.Option>
                            <Select.Option value="unreplied">未回复</Select.Option>
                            <Select.Option value="0">待审核</Select.Option>
                            <Select.Option value="1">已审核</Select.Option>
                            <Select.Option value="2">需修改</Select.Option>
                            <Select.Option value="3">已删除</Select.Option>
                          </Select>
                          
                          <Select
                            placeholder="排序方式"
                            style={{ width: 150 }}
                            onChange={handleSort}
                            defaultValue="newest"
                          >
                            <Select.Option value="newest">最新优先</Select.Option>
                            <Select.Option value="oldest">最早优先</Select.Option>
                            <Select.Option value="statusAsc">状态升序</Select.Option>
                            <Select.Option value="statusDesc">状态降序</Select.Option>
                          </Select>
                          
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleCreateFeedback}
                          >
                            创建新反馈
                          </Button>
                        </Space>
                      </Space>
                    </Card>
                  </Space>
                </div>
                
                <div className={styles.feedbackList}>
                  {filteredFeedbacks.length === 0 ? (
                    <Empty
                      description={
                        <div>
                          <p>没有找到符合条件的反馈</p>
                          <Button type="primary" onClick={handleCreateFeedback}>
                            创建新反馈
                          </Button>
                        </div>
                      }
                    />
                  ) : (
                    <List
                      dataSource={filteredFeedbacks}
                      renderItem={(feedback) => (
                        <List.Item key={feedback.id}>
                          <Card
                            bordered={true}
                            className={styles.feedbackCard}
                            hoverable
                            style={{ width: '100%' }}
                          >
                            <div className={styles.cardContent}>
                              <div className={styles.feedbackMeta}>
                                <div className={styles.courseInfo}>
                                  <h3>{getCourseInfo(feedback.courseId).name}</h3>
                                  <div>{getCourseInfo(feedback.courseId).department}</div>
                                  <div className={styles.teacherInfo}>
                                    <span>授课教师: {getTeacherInfo(feedback.teacherAddress).name}</span>
                                  </div>
                                </div>
                                
                                <div className={styles.statusInfo}>
                                  <Badge 
                                    status={getFeedbackStatusBadge(feedback.status)} 
                                    text={getFeedbackStatusText(feedback.status)} 
                                  />
                                  {feedback.hasReply && (
                                    <Tag color="green" style={{ marginLeft: 8 }}>已回复</Tag>
                                  )}
                                  {feedback.versionCount > 1 && (
                                    <Tag color="blue" style={{ marginLeft: 8 }}>
                                      有 {feedback.versionCount - 1} 次修订
                                    </Tag>
                                  )}
                                </div>
                              </div>
                              
                              <div className={styles.feedbackContent}>
                                <div className={styles.contentPreview}>
                                  {feedback.content.length > 100 
                                    ? `${feedback.content.substring(0, 100)}...` 
                                    : feedback.content
                                  }
                                </div>
                                
                                <div className={styles.attachments}>
                                  {feedback.imageUrls && feedback.imageUrls.length > 0 && (
                                    <div className={styles.imagesPreview}>
                                      <Tooltip title="包含图片附件">
                                        <Space>
                                          <PictureOutlined />
                                          <span>{feedback.imageUrls.length}张图片</span>
                                        </Space>
                                      </Tooltip>
                                    </div>
                                  )}
                                  
                                  {feedback.documentHashes && feedback.documentHashes.length > 0 && (
                                    <div className={styles.documentsPreview}>
                                      <Tooltip title="包含文档附件">
                                        <Space>
                                          <FileOutlined />
                                          <span>{feedback.documentHashes.length}个文档</span>
                                        </Space>
                                      </Tooltip>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className={styles.feedbackFooter}>
                                <div className={styles.timestamp}>
                                  提交于: {formatDate(feedback.timestamp)}
                                </div>
                                
                                <div className={styles.actionButtons}>
                                  <Space>
                                    <Button type="primary" onClick={() => handleViewFeedback(feedback)}>
                                      查看详情
                                    </Button>
                                    <Button onClick={() => handleEditFeedback(feedback)} disabled={feedback.hasReply}>
                                      修改反馈
                                    </Button>
                                  </Space>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </List.Item>
                      )}
                    />
                  )}
                </div>
              </>
            )}
          </Layout.Content>
        </Layout>
        
        {/* 详情模态框 */}
        <Modal
          title={
            <div className={styles.modalTitle}>
              {selectedFeedback && (
                <>
                  <div>反馈详情 - {getCourseInfo(selectedFeedback.courseId).name}</div>
                  <div className={styles.modalSubtitle}>
                    <Badge 
                      status={selectedFeedback ? getFeedbackStatusBadge(selectedFeedback.status) : 'default'} 
                      text={selectedFeedback ? getFeedbackStatusText(selectedFeedback.status) : '未知状态'} 
                    />
                    {selectedFeedback && selectedFeedback.hasReply && (
                      <Tag color="green" style={{ marginLeft: 8 }}>已回复</Tag>
                    )}
                  </div>
                </>
              )}
            </div>
          }
          open={detailModalVisible}
          onCancel={handleCloseDetail}
          width={800}
          footer={null}
          className={`${styles.detailModal} ${isDarkMode ? styles.darkModal : ''}`}
        >
          {loadingVersions ? (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <Spin size="large" />
              <p>加载反馈版本历史...</p>
            </div>
          ) : (
            selectedFeedback && (
              <div className={styles.feedbackDetail}>
                <Tabs 
                  defaultActiveKey="content" 
                  className={styles.detailTabs}
                  items={[
                    {
                      key: 'content',
                      label: '反馈内容',
                      children: (
                        <div className={styles.feedbackDetailContent}>
                          {feedbackVersions.length > 0 && (
                            <div className={styles.versionSelector}>
                              <div className={styles.versionSelectorLabel}>
                                <span>查看版本:</span>
                              </div>
                              <Select
                                style={{ width: 200 }}
                                value={selectedVersionId}
                                onChange={(value) => setSelectedVersionId(value)}
                              >
                                {feedbackVersions.map((version) => (
                                  <Select.Option key={version.versionId} value={version.versionId}>
                                    {version.versionLabel} - {version.formattedDate}
                                  </Select.Option>
                                ))}
                              </Select>
                            </div>
                          )}
                          
                          <div className={styles.contentSection}>
                            <Typography.Title level={4}>反馈详情</Typography.Title>
                            <div className={styles.feedbackMetaInfo}>
                              <p><strong>课程:</strong> {getCourseInfo(selectedFeedback.courseId).name}</p>
                              <p><strong>教师:</strong> {getTeacherInfo(selectedFeedback.teacherAddress).name}</p>
                              <p><strong>提交时间:</strong> {formatDate(selectedFeedback.timestamp)}</p>
                              {currentVersionData && currentVersionData.date && (
                                <p><strong>版本时间:</strong> {formatDate(currentVersionData.date)}</p>
                              )}
                            </div>
                            
                            <div className={styles.feedbackText}>
                              <Typography.Title level={5}>反馈内容</Typography.Title>
                              <div className={styles.contentText}>
                                {currentVersionData ? currentVersionData.content : selectedFeedback.content}
                              </div>
                            </div>
                            
                            {/* 图片附件 */}
                            {((currentVersionData && currentVersionData.imageUrls && currentVersionData.imageUrls.length > 0) || 
                              (!currentVersionData && selectedFeedback.imageUrls && selectedFeedback.imageUrls.length > 0)) && (
                              <div className={styles.imageAttachments}>
                                <Typography.Title level={5}>图片附件</Typography.Title>
                                <div className={styles.imageGrid}>
                                  {(currentVersionData ? currentVersionData.imageUrls : selectedFeedback.imageUrls).map((url, index) => (
                                    <div className={styles.imageContainer} key={`img-${index}`}>
                                      <Image
                                        src={url}
                                        alt={`附件图片 ${index + 1}`}
                                        style={{ maxHeight: '200px' }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* 文档附件 */}
                            {((currentVersionData && currentVersionData.documentUrls && currentVersionData.documentUrls.length > 0) || 
                              (!currentVersionData && selectedFeedback.documentHashes && selectedFeedback.documentHashes.length > 0)) && (
                              <div className={styles.docAttachments}>
                                <Typography.Title level={5}>文档附件</Typography.Title>
                                <List
                                  dataSource={currentVersionData ? currentVersionData.documentUrls : selectedFeedback.documentHashes}
                                  renderItem={(url, index) => {
                                    const docUrl = url.startsWith('http') ? url : `https://gateway.pinata.cloud/ipfs/${url}`;
                                    return (
                                      <List.Item>
                                        <a href={docUrl} target="_blank" rel="noopener noreferrer">
                                          <Space>
                                            <FileOutlined />
                                            <span>文档 {index + 1}</span>
                                          </Space>
                                        </a>
                                      </List.Item>
                                    );
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* 教师回复 */}
                          {selectedFeedback.hasReply && selectedFeedback.replyContent && (
                            <div className={styles.replySection}>
                              <Divider orientation="left">教师回复</Divider>
                              <div className={styles.replyContent}>
                                <div className={styles.replyHeader}>
                                  <p><strong>回复时间:</strong> {formatDate(selectedFeedback.replyTimestamp)}</p>
                                  <p><strong>回复教师:</strong> {getTeacherInfo(selectedFeedback.teacherAddress).name}</p>
                                </div>
                                <div className={styles.replyText}>
                                  {selectedFeedback.replyContent}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    },
                    {
                      key: 'history',
                      label: '版本历史',
                      children: (
                        <div className={styles.historyTab}>
                          {feedbackVersions.length <= 1 ? (
                            <Empty description="没有修订历史记录" />
                          ) : (
                            <div className={styles.versionHistory}>
                              <Typography.Title level={4}>修订历史</Typography.Title>
                              <Timeline
                                mode="left"
                                items={feedbackVersions.map((version) => ({
                                  dot: version.versionId === 0 ? <div className={styles.timelineDotFirst} /> : <div className={styles.timelineDot} />,
                                  color: version.versionId === selectedVersionId ? 'blue' : 'gray',
                                  children: (
                                    <div 
                                      className={`${styles.timelineItem} ${version.versionId === selectedVersionId ? styles.selectedVersion : ''}`}
                                      onClick={() => setSelectedVersionId(version.versionId)}
                                    >
                                      <div className={styles.versionHeader}>
                                        <strong>{version.versionLabel}</strong>
                                        <span>{version.formattedDate}</span>
                                      </div>
                                      <div className={styles.versionPreview}>
                                        {version.content && version.content.length > 100 
                                          ? `${version.content.substring(0, 100)}...` 
                                          : version.content}
                                      </div>
                                    </div>
                                  )
                                }))}
                              />
                            </div>
                          )}
                        </div>
                      )
                    }
                  ]}
                />
              </div>
            )
          )}
        </Modal>
        
        {/* 编辑反馈模态框 */}
        <EditFeedbackModal
          visible={editModalVisible}
          feedback={editingFeedback}
          onCancel={() => setEditModalVisible(false)}
          onSubmit={handleSubmitEdit}
          loading={submittingEdit}
        />
      </App>
    </ConfigProvider>
  );
} 