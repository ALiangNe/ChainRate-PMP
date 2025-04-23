'use client';

import { useState, useEffect } from 'react';
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
  Dropdown,
  Menu,
  Tooltip,
  Input,
  Select,
  Avatar,
  Modal,
  Tabs,
  Collapse,
  Badge,
  Timeline,
  Image as AntImage
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
  MoreOutlined,
  FileOutlined,
  PictureOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SearchOutlined,
  HistoryOutlined,
  CalendarOutlined,
  UserOutlined,
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  MessageOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileZipOutlined,
  FileUnknownOutlined,
  AreaChartOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import StudentSidebar from '../components/StudentSidebar';
import UserAvatar from '../components/UserAvatar';
import styles from './page.module.css';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 配置dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Option } = Select;
const { Search } = Input;

// 反馈状态映射
const FEEDBACK_STATUS = {
  0: { text: '已提交', color: 'blue', icon: <ClockCircleOutlined /> },
  1: { text: '已回复', color: 'green', icon: <CheckCircleOutlined /> },
  2: { text: '已修改', color: 'orange', icon: <SyncOutlined /> },
  3: { text: '已删除', color: 'red', icon: <DeleteOutlined /> }
};

// 增加多个IPFS网关选项，提高成功率
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

// 获取IPFS内容的辅助函数
const getIPFSContent = async (contentHash) => {
  if (!contentHash || contentHash === '') {
    return { success: false, data: null, error: '内容哈希为空' };
  }
  
  // 如果已经是完整URL，直接使用
  if (contentHash.startsWith('http')) {
    try {
      const response = await fetch(contentHash);
      if (response.ok) {
        try {
          const data = await response.json();
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
  
  // 尝试多个IPFS网关
  let lastError = '';
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const url = `${gateway}${contentHash}`;
      console.log(`尝试IPFS网关: ${url}`);
      
      const response = await fetch(url);
      if (response.ok) {
        try {
          const data = await response.json();
          console.log(`成功从网关获取内容: ${gateway}`);
          return { success: true, data };
        } catch (jsonErr) {
          const text = await response.text();
          console.log(`成功从网关获取文本: ${gateway}`);
          return { success: true, data: text };
        }
      } else {
        lastError = `HTTP错误: ${response.status}`;
        console.log(`网关 ${gateway} 返回错误: ${lastError}`);
      }
    } catch (fetchErr) {
      lastError = fetchErr.message;
      console.log(`网关 ${gateway} 访问失败: ${lastError}`);
    }
  }
  
  return { success: false, error: lastError || '所有IPFS网关均失败' };
};

// 创建完整IPFS URL的辅助函数
const createIPFSUrl = (hash) => {
  if (!hash || hash === '') return '';
  if (hash.startsWith('http')) return hash;
  
  // 默认使用第一个网关
  return `${IPFS_GATEWAYS[0]}${hash}`;
};

// 获取文件图标
const getFileIcon = (fileUrl) => {
  if (!fileUrl) return <FileUnknownOutlined />;
  
  const extension = fileUrl.split('.').pop().toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return <FilePdfOutlined />;
    case 'doc':
    case 'docx':
      return <FileWordOutlined />;
    case 'xls':
    case 'xlsx':
      return <FileExcelOutlined />;
    case 'ppt':
    case 'pptx':
      return <FilePptOutlined />;
    case 'zip':
    case 'rar':
      return <FileZipOutlined />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return <PictureOutlined />;
    default:
      return <FileOutlined />;
  }
};

// 获取文件名
const getFileName = (fileUrl) => {
  if (!fileUrl) return '';
  const urlParts = fileUrl.split('/');
  return urlParts[urlParts.length - 1].slice(0, 15) + '...';
};

// 修改 isImage 函数，使其更准确地识别图片
const isImage = (fileUrl) => {
  if (!fileUrl) return false;
  
  // 尝试从URL中提取文件扩展名
  let extension = '';
  
  // 处理有查询参数的URL
  const urlWithoutParams = fileUrl.split('?')[0];
  
  // 从路径中获取扩展名
  const pathParts = urlWithoutParams.split('/');
  if (pathParts.length > 0) {
    const fileName = pathParts[pathParts.length - 1];
    const extensionParts = fileName.split('.');
    if (extensionParts.length > 1) {
      extension = extensionParts[extensionParts.length - 1].toLowerCase();
    }
  }
  
  // 如果无法从URL中获取扩展名，检查是否包含图片相关关键词
  if (!extension) {
    const imageKeywords = ['image', 'img', 'photo', 'picture', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    return imageKeywords.some(keyword => fileUrl.toLowerCase().includes(keyword));
  }
  
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension);
};

export default function StudentViewFeedbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const feedbackId = searchParams.get('id');
  
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
  const [viewingImage, setViewingImage] = useState(null);
  const [imageGalleryIndex, setImageGalleryIndex] = useState(0);
  const [viewingVersions, setViewingVersions] = useState(false);
  const [versionData, setVersionData] = useState([]);
  
  // 过滤和排序
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchText, setSearchText] = useState('');
  
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
    
    // 初始化Web3连接
    const initWeb3 = async () => {
      try {
        // 检查是否有 MetaMask
        if (typeof window.ethereum === 'undefined') {
          message.error('请安装 MetaMask 钱包以使用此应用');
          setLoading(false);
          return;
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
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        message.error('初始化Web3失败: ' + err.message);
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router]);

  // 加载学生提交的反馈数据
  const loadStudentFeedbacks = async (extensionContract, mainContract, studentAddress) => {
    try {
      console.log('加载学生反馈数据...');
      
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
        return;
      }
      
      // 加载所有课程信息
      const courseCountBigInt = await mainContract.courseCount();
      const coursesCount = Number(courseCountBigInt);
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
            // ChainRate合约中Course结构体没有department字段，以下为默认值
            department: '未知院系',
            // 使用isActive作为状态
            status: course.isActive ? 'active' : 'inactive',
            // 由于students数组不是直接包含在Course结构体中，需要单独获取
            students: []
          };
          
          // 获取课程的学生，如果合约支持
          try {
            const courseStudents = await mainContract.getCourseStudents(i);
            courseData[i].students = courseStudents.map(s => s.toLowerCase());
          } catch (err) {
            console.error(`获取课程 ${i} 的学生列表失败:`, err);
          }
          
          // 如果这个教师我们还没有记录，获取教师信息
          if (course.teacher && !teacherData[course.teacher.toLowerCase()]) {
            try {
              // 使用getUserInfo获取信息
              const teacherInfo = await mainContract.getUserInfo(course.teacher);
              teacherData[course.teacher.toLowerCase()] = {
                name: teacherInfo[0] || '未知教师', // name在第一个位置
                email: teacherInfo[2] || '', // email在第三个位置
                college: teacherInfo[3] || '', // college在第四个位置
                specialty: teacherInfo[4] || '', // major在第五个位置作为specialty
                avatar: teacherInfo[6] || '' // avatar在第七个位置
              };
            } catch (err) {
              console.error('获取教师信息失败:', err);
              teacherData[course.teacher.toLowerCase()] = { 
                name: '未知教师', 
                email: '', 
                college: '', 
                specialty: '', 
                avatar: '' 
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
          console.log(`反馈 ${id} 详情:`, feedback);
          
          // 检查imageHashes是否存在和正确
          if (!feedback.imageHashes || feedback.imageHashes.length === 0) {
            console.log(`反馈 ${id} 没有图片哈希或为空数组`);
          } else {
            console.log(`反馈 ${id} 原始图片哈希:`, feedback.imageHashes);
          }
          
          // 检查documentHashes是否存在和正确
          if (!feedback.documentHashes || feedback.documentHashes.length === 0) {
            console.log(`反馈 ${id} 没有文档哈希或为空数组`);
          } else {
            console.log(`反馈 ${id} 原始文档哈希:`, feedback.documentHashes);
          }
          
          // 获取内容
          let contentText = "";
          try {
            // 使用辅助函数获取内容
            const contentResult = await getIPFSContent(feedback.contentHash);
            if (contentResult.success) {
              if (typeof contentResult.data === 'object' && contentResult.data !== null) {
                contentText = contentResult.data.content || JSON.stringify(contentResult.data);
              } else {
                contentText = contentResult.data;
              }
              console.log(`成功获取反馈 ${id} 的内容`);
            } else {
              console.error(`无法获取反馈 ${id} 内容: ${contentResult.error}`);
              contentText = "内容加载失败";
            }
          } catch (err) {
            console.error(`处理反馈 ${id} 内容时出错:`, err);
            contentText = "内容处理错误";
          }
          
          // 获取反馈回复
          let reply = null;
          
          try {
            // 尝试获取教师回复，如果失败则意味着没有回复
            reply = await extensionContract.getTeacherReplyDetails(id);
            
            // 如果有回复，获取回复内容
            if (reply && reply.contentHash && reply.contentHash !== '') {
              let replyText = "";
              try {
                const replyResult = await getIPFSContent(reply.contentHash);
                if (replyResult.success) {
                  if (typeof replyResult.data === 'object' && replyResult.data !== null) {
                    replyText = replyResult.data.content || JSON.stringify(replyResult.data);
                  } else {
                    replyText = replyResult.data;
                  }
                } else {
                  replyText = `回复内容加载失败: ${replyResult.error}`;
                }
              } catch (err) {
                console.error(`获取反馈 ${id} 回复内容失败:`, err);
                replyText = "回复内容加载失败";
              }
              
              // 更新回复内容
              reply.content = replyText;
            } else {
              console.log(`反馈 ${id} 的回复contentHash为空或无效`);
            }
          } catch (err) {
            console.log(`反馈 ${id} 没有教师回复`, err);
          }
          
          // 检查是否有版本历史
          let versions = [];
          
          // 使用反馈中的 versions 字段判断版本数量
          const versionCount = Number(feedback.versions || 0);
          console.log(`反馈 ${id} 的版本数量: ${versionCount}`);
          
          if (versionCount > 0) {
            for (let v = 0; v < versionCount; v++) {
              try {
                const versionData = await extensionContract.getFeedbackVersion(id, v);
                
                // 获取版本内容
                let versionText = "";
                try {
                  const versionResult = await getIPFSContent(versionData.contentHash);
                  if (versionResult.success) {
                    if (typeof versionResult.data === 'object' && versionResult.data !== null) {
                      versionText = versionResult.data.content || JSON.stringify(versionResult.data);
                    } else {
                      versionText = versionResult.data;
                    }
                  } else {
                    versionText = `版本内容加载失败: ${versionResult.error}`;
                  }
                } catch (err) {
                  console.error(`获取反馈 ${id} 版本 ${v} 内容失败:`, err);
                  versionText = "版本内容加载失败";
                }
                
                // 处理文档和图片URL，确保它们是完整的URL
                const documentHashesRaw = versionData.documentHashes || [];
                const imageHashesRaw = versionData.imageHashes || [];
                
                console.log(`版本 ${v} 文档哈希数量:`, documentHashesRaw.length);
                console.log(`版本 ${v} 图片哈希数量:`, imageHashesRaw.length);
                
                // 转换为完整URL
                const documentUrls = documentHashesRaw
                  .filter(hash => hash && hash !== '')
                  .map(hash => createIPFSUrl(hash));
                
                const imageUrls = imageHashesRaw
                  .filter(hash => hash && hash !== '')
                  .map(hash => createIPFSUrl(hash));
                
                console.log(`版本 ${v} 处理后文档URL数量:`, documentUrls.length);
                console.log(`版本 ${v} 处理后图片URL数量:`, imageUrls.length);
                console.log(`版本 ${v} 处理后文档URLs:`, documentUrls);
                console.log(`版本 ${v} 处理后图片URLs:`, imageUrls);
                
                versions.push({
                  id: v,
                  timestamp: Number(versionData.timestamp),
                  content: versionText,
                  documentUrls,
                  imageUrls
                });
              } catch (err) {
                console.error(`获取反馈 ${id} 的版本 ${v} 失败:`, err);
              }
            }
          }
          
          // 可能的问题：imageHashes和documentHashes在合约返回时可能互换了位置
          // 尝试一下交换处理
          const documentHashesRaw = feedback.documentHashes || [];
          const imageHashesRaw = feedback.imageHashes || [];
          
          // 检查一下哈希是否正确分类 - 有时候图片存在文档哈希中，反之亦然
          console.log(`反馈 ${id} 文档哈希数量:`, documentHashesRaw.length);
          console.log(`反馈 ${id} 图片哈希数量:`, imageHashesRaw.length);
          
          // 临时尝试交换处理，看看是否能正确显示图片
          // 将两者合并并重新分类
          const allHashes = [...documentHashesRaw, ...imageHashesRaw];
          
          // 基于文件扩展名分类
          const probableImageHashes = allHashes.filter(hash => {
            if (!hash) return false;
            
            // 查找可能的图片文件扩展名
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
            const hashLower = hash.toLowerCase();
            
            return imageExtensions.some(ext => hashLower.includes(`.${ext}`));
          });
          
          const probableDocumentHashes = allHashes.filter(hash => {
            if (!hash) return false;
            if (probableImageHashes.includes(hash)) return false;
            return true;
          });
          
          console.log(`反馈 ${id} 可能的图片哈希:`, probableImageHashes);
          console.log(`反馈 ${id} 可能的文档哈希:`, probableDocumentHashes);
          
          // 转换为完整URL
          const documentUrls = probableDocumentHashes
            .filter(hash => hash && hash !== '')
            .map(hash => createIPFSUrl(hash));
          
          const imageUrls = probableImageHashes
            .filter(hash => hash && hash !== '')
            .map(hash => createIPFSUrl(hash));
          
          console.log(`反馈 ${id} 处理后文档URL数量:`, documentUrls.length);
          console.log(`反馈 ${id} 处理后图片URL数量:`, imageUrls.length);
          console.log(`反馈 ${id} 处理后文档URLs:`, documentUrls);
          console.log(`反馈 ${id} 处理后图片URLs:`, imageUrls);
          
          let replyDocumentUrls = [], replyImageUrls = [];
          if (reply) {
            replyDocumentUrls = (reply.documentHashes || [])
              .filter(hash => hash && hash !== '')
              .map(createIPFSUrl);
            
            replyImageUrls = (reply.imageHashes || [])
              .filter(hash => hash && hash !== '')
              .map(createIPFSUrl);
            
            console.log(`回复图片URL:`, replyImageUrls);
          }
          
          return {
            id: id.toString(),
            courseId: feedback.courseId.toString(),
            student: feedback.student,
            content: contentText,
            contentHash: feedback.contentHash,
            timestamp: Number(feedback.timestamp),
            status: Number(feedback.status),
            documentUrls,
            imageUrls,
            hasReply: reply !== null,
            reply: reply ? {
              teacher: reply.teacher,
              content: reply.content,
              contentHash: reply.contentHash,
              timestamp: Number(reply.timestamp),
              documentUrls: replyDocumentUrls,
              imageUrls: replyImageUrls
            } : null,
            versions: versions
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
      
      // 统计数据
      const stats = {
        total: feedbackDetails.length,
        replied: feedbackDetails.filter(f => f.status === 1).length,
        unreplied: feedbackDetails.filter(f => f.status === 0).length,
        deleted: feedbackDetails.filter(f => f.status === 3).length
      };
      
      setStatistics(stats);
      setFeedbacks(feedbackDetails);
      
      // 如果有特定的feedbackId参数，则直接打开该反馈
      if (feedbackId) {
        const targetFeedback = feedbackDetails.find(f => f.id === feedbackId);
        if (targetFeedback) {
          setSelectedFeedback(targetFeedback);
        } else {
          message.error('未找到指定的反馈');
        }
      }
    } catch (error) {
      console.error("加载反馈数据失败:", error);
      message.error('加载反馈数据失败: ' + error.message);
    }
  };
  
  // 关闭反馈详情模态框
  const handleCloseDetail = () => {
    setSelectedFeedback(null);
  };
  
  // 查看反馈详情
  const handleViewFeedback = (feedback) => {
    setSelectedFeedback(feedback);
  };
  
  // 查看图片
  const handleViewImage = (url, index) => {
    console.log(`查看图片: ${url}, 索引: ${index}`);
    setViewingImage(url);
    setImageGalleryIndex(index);
  };
  
  // 关闭图片查看器
  const handleCloseImageViewer = () => {
    setViewingImage(null);
  };
  
  // 修改 getFileUrls 函数，不要用isImage过滤图片，而是依赖原始分类
  const getFileUrls = (feedback) => {
    if (!feedback) return { documents: [], images: [] };
    
    // 直接返回原始的文档和图片URLs，不再尝试判断图片
    const images = (feedback.imageUrls || [])
      .filter(url => url && url !== '');
    
    const documents = (feedback.documentUrls || [])
      .filter(url => url && url !== '');
    
    console.log('处理后的图片URLs:', images);
    console.log('处理后的文档URLs:', documents);
    
    return { documents, images };
  };

  // 修改hasAttachments函数来检查是否有任何类型的附件
  const hasAttachments = (feedback) => {
    if (!feedback) return false;
    const { documents, images } = getFileUrls(feedback);
    return documents.length > 0 || images.length > 0;
  };

  const hasImages = (feedback) => {
    if (!feedback) return false;
    return (feedback.imageUrls || []).length > 0;
  };

  const hasDocuments = (feedback) => {
    if (!feedback) return false;
    return (feedback.documentUrls || []).length > 0;
  };
  
  // 浏览上一张图片
  const handlePrevImage = (feedback) => {
    const imageUrls = getFileUrls(feedback).images;
    let newIndex = imageGalleryIndex - 1;
    if (newIndex < 0) newIndex = imageUrls.length - 1;
    setImageGalleryIndex(newIndex);
    setViewingImage(imageUrls[newIndex]);
  };
  
  // 浏览下一张图片
  const handleNextImage = (feedback) => {
    const imageUrls = getFileUrls(feedback).images;
    let newIndex = (imageGalleryIndex + 1) % imageUrls.length;
    setImageGalleryIndex(newIndex);
    setViewingImage(imageUrls[newIndex]);
  };
  
  // 查看版本历史
  const handleViewVersions = (feedback) => {
    setVersionData(feedback.versions);
    setViewingVersions(true);
  };
  
  // 关闭版本历史查看器
  const handleCloseVersions = () => {
    setViewingVersions(false);
  };
  
  // 处理搜索
  const handleSearch = (value) => {
    setSearchText(value);
  };
  
  // 处理状态筛选
  const handleStatusFilter = (value) => {
    setFilterStatus(value);
  };
  
  // 处理排序
  const handleSort = (value) => {
    setSortOrder(value);
  };
  
  // 筛选并排序反馈
  const getFilteredAndSortedFeedbacks = () => {
    let result = [...feedbacks];
    
    // 筛选状态
    if (filterStatus !== 'all') {
      const statusNum = parseInt(filterStatus);
      result = result.filter(f => f.status === statusNum);
    }
    
    // 搜索
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(feedback => {
        const courseInfo = courseMap[feedback.courseId] || {};
        const teacherInfo = teacherMap[feedback.student.toLowerCase()] || {};
        
        return (
          feedback.content.toLowerCase().includes(searchLower) ||
          (courseInfo.name && courseInfo.name.toLowerCase().includes(searchLower)) ||
          (teacherInfo.name && teacherInfo.name.toLowerCase().includes(searchLower))
        );
      });
    }
    
    // 排序
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
  
  // 渲染页面
  return (
    <ConfigProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <StudentSidebar selectedKey="8" /> {/* 8 是查看反馈菜单项的key */}
        
        <Layout>
          <Header className={styles.pageHeader}>
            <div>
              <Breadcrumb
                items={[
                  // { title: <HomeFilled />, href: '/student' },
                  { title: '首页', href: '/student' },
                  { title: '我的反馈' }
                ]}
              />
            </div>
            <UserAvatar userData={userData} />
          </Header>
          
          <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <Spin size="large" />
                <div>加载中...</div>
              </div>
            ) : (
              <>
                {/* 数据统计卡片 */}
                <Row gutter={16} style={{ marginBottom: 24 }}>
                  <Col span={6}>
                    <Card className={styles.statCard}>
                      <Statistic 
                        title="总反馈数" 
                        value={statistics.total} 
                        prefix={<CommentOutlined />} 
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card className={styles.statCard}>
                      <Statistic 
                        title="已回复" 
                        value={statistics.replied} 
                        prefix={<CheckCircleOutlined />} 
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card className={styles.statCard}>
                      <Statistic 
                        title="未回复" 
                        value={statistics.unreplied} 
                        prefix={<ClockCircleOutlined />} 
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card className={styles.statCard}>
                      <Statistic 
                        title="已删除" 
                        value={statistics.deleted} 
                        prefix={<DeleteOutlined />} 
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                </Row>
                
                {/* 筛选和搜索栏 */}
                <div className={styles.toolBar}>
                  <div className={styles.filterGroup}>
                    <Space>
                      <Select 
                        defaultValue="all" 
                        style={{ width: 120 }} 
                        onChange={handleStatusFilter}
                        placeholder="状态筛选"
                        suffixIcon={<FilterOutlined />}
                      >
                        <Option value="all">所有状态</Option>
                        <Option value="0">已提交</Option>
                        <Option value="1">已回复</Option>
                        <Option value="2">已修改</Option>
                        <Option value="3">已删除</Option>
                      </Select>
                      
                      <Select 
                        defaultValue="newest" 
                        style={{ width: 120 }} 
                        onChange={handleSort}
                        placeholder="排序方式"
                        suffixIcon={<SortAscendingOutlined />}
                      >
                        <Option value="newest">最新优先</Option>
                        <Option value="oldest">最早优先</Option>
                        <Option value="statusAsc">状态升序</Option>
                        <Option value="statusDesc">状态降序</Option>
                      </Select>
                    </Space>
                  </div>
                  
                  <Search
                    placeholder="搜索反馈内容、课程名称..."
                    allowClear
                    enterButton
                    onSearch={handleSearch}
                    style={{ width: 300 }}
                  />
                </div>
                
                {/* 反馈列表 */}
                <div className={styles.feedbacksContainer}>
                  {filteredFeedbacks.length === 0 ? (
                    <Empty 
                      description={
                        <span>
                          {searchText || filterStatus !== 'all' 
                            ? '没有符合条件的反馈' 
                            : '你还没有提交过任何课程反馈'}
                        </span>
                      }
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                      {!(searchText || filterStatus !== 'all') && (
                        <Button 
                          type="primary" 
                          onClick={() => router.push('/studentSubmitFeedback')}
                        >
                          去提交反馈
                        </Button>
                      )}
                    </Empty>
                  ) : (
                    <Row gutter={[16, 16]}>
                      {filteredFeedbacks.map(feedback => {
                        const courseInfo = getCourseInfo(feedback.courseId);
                        const statusInfo = FEEDBACK_STATUS[feedback.status];
                        const { documents, images } = getFileUrls(feedback);
                        
                        return (
                          <Col xs={24} sm={24} md={12} lg={8} xl={8} key={feedback.id}>
                            <Card 
                              className={styles.feedbackCard}
                              hoverable
                              onClick={() => handleViewFeedback(feedback)}
                              extra={
                                <Tag color={statusInfo.color} icon={statusInfo.icon}>
                                  {statusInfo.text}
                                </Tag>
                              }
                              title={
                                <div className={styles.feedbackCardTitle}>
                                  <Tooltip title={courseInfo.name}>
                                    <span className={styles.courseName}>{courseInfo.name}</span>
                                  </Tooltip>
                                  {feedback.versions && feedback.versions.length > 0 && (
                                    <Tooltip title="有历史版本">
                                      <Badge dot>
                                        <HistoryOutlined className={styles.versionIcon} />
                                      </Badge>
                                    </Tooltip>
                                  )}
                                </div>
                              }
                            >
                              <div className={styles.cardContent}>
                                <Paragraph ellipsis={{ rows: 3 }} className={styles.feedbackContent}>
                                  {feedback.content}
                                </Paragraph>
                                
                                {/* 显示第一张图片预览（如果有） */}
                                {images.length > 0 && (
                                  <div className={styles.imagePreviewInCard}>
                                    <img 
                                      src={images[0]} 
                                      alt="图片预览" 
                                      className={styles.previewImg}
                                    />
                                    {images.length > 1 && (
                                      <div className={styles.moreImagesBadge}>
                                        +{images.length - 1}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* 显示文档附件数量（如果有） */}
                                {documents.length > 0 && (
                                  <div className={styles.attachmentBadge}>
                                    <Badge count={documents.length} overflowCount={9}>
                                      <FileOutlined /> 文档附件
                                    </Badge>
                                  </div>
                                )}
                                
                                <div className={styles.feedbackMeta}>
                                  <div className={styles.timeInfo}>
                                    <CalendarOutlined /> {dayjs(feedback.timestamp * 1000).format('YYYY-MM-DD HH:mm')}
                                  </div>
                                  
                                  {feedback.hasReply && (
                                    <Tag color="green" icon={<CommentOutlined />}>
                                      教师已回复
                                    </Tag>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  )}
                </div>
                
                {/* 反馈详情模态框 */}
                {selectedFeedback && (
                  <Modal
                    title={
                      <div className={styles.modalTitle}>
                        <span>反馈详情</span>
                        <Tag color={FEEDBACK_STATUS[selectedFeedback.status].color} icon={FEEDBACK_STATUS[selectedFeedback.status].icon}>
                          {FEEDBACK_STATUS[selectedFeedback.status].text}
                        </Tag>
                      </div>
                    }
                    open={!!selectedFeedback}
                    onCancel={handleCloseDetail}
                    footer={null}
                    width={800}
                    className={styles.detailModal}
                  >
                    <div className={styles.feedbackDetail}>
                      <div className={styles.courseInfo}>
                        <Title level={4}>{getCourseInfo(selectedFeedback.courseId).name}</Title>
                        <div className={styles.teacherInfo}>
                          <UserOutlined /> 授课教师: {getTeacherInfo(getCourseInfo(selectedFeedback.courseId).teacher).name}
                          <span className={styles.department}>{getCourseInfo(selectedFeedback.courseId).department}</span>
                        </div>
                      </div>
                      
                      <Tabs defaultActiveKey="content">
                        <TabPane tab="反馈内容" key="content">
                          <div className={styles.feedbackBody}>
                            <div className={styles.feedbackTime}>
                              <CalendarOutlined /> 提交时间: {dayjs(selectedFeedback.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')}
                              
                              {selectedFeedback.versions && selectedFeedback.versions.length > 0 && (
                                <Button 
                                  type="link" 
                                  onClick={() => handleViewVersions(selectedFeedback)}
                                  icon={<HistoryOutlined />}
                                >
                                  查看历史版本 ({selectedFeedback.versions.length})
                                </Button>
                              )}
                            </div>
                            
                            <div className={styles.feedbackContentDetail}>
                              {selectedFeedback.content}
                            </div>
                            
                            {/* 直接显示图片 */}
                            {hasImages(selectedFeedback) && (
                              <div className={styles.imageGallery}>
                                <Row gutter={[16, 16]}>
                                  {getFileUrls(selectedFeedback).images.map((url, index) => (
                                    <Col span={8} key={index}>
                                      <div 
                                        className={styles.imagePreview}
                                        onClick={() => handleViewImage(url, index)}
                                      >
                                        <div className={styles.imageDebugInfo}>URL: {url}</div>
                                        <img 
                                          src={url} 
                                          alt={`图片 ${index + 1}`} 
                                          className={styles.galleryImg} 
                                          onError={(e) => {
                                            console.error(`图片加载失败: ${url}`);
                                            e.target.onerror = null;
                                            e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiB2aWV3Qm94PSIwIDAgMTYwIDE2MCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxNjAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxNnB4IiBmaWxsPSIjOTk5Ij7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+";
                                            message.error('图片加载失败，可能链接已失效');
                                          }}
                                        />
                                        <div className={styles.previewOverlay}>
                                          <EyeOutlined />
                                        </div>
                                      </div>
                                    </Col>
                                  ))}
                                </Row>
                              </div>
                            )}
                            
                            {/* 仅将文档作为附件 */}
                            {hasDocuments(selectedFeedback) && (
                              <div className={styles.attachments}>
                                <div className={styles.attachmentTitle}>
                                  <FileOutlined /> 文档附件 ({getFileUrls(selectedFeedback).documents.length})
                                </div>
                                
                                <Row gutter={[16, 16]} className={styles.fileList}>
                                  {getFileUrls(selectedFeedback).documents.map((url, index) => (
                                    <Col span={12} key={index}>
                                      <a 
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={styles.fileLink}
                                      >
                                        {getFileIcon(url)}
                                        <span className={styles.fileName}>{getFileName(url)}</span>
                                        <DownloadOutlined className={styles.downloadIcon} />
                                      </a>
                                    </Col>
                                  ))}
                                </Row>
                              </div>
                            )}
                          </div>
                        </TabPane>
                        
                        <TabPane tab="教师回复" key="reply" disabled={!selectedFeedback.hasReply}>
                          {selectedFeedback.hasReply && selectedFeedback.reply && (
                            <div className={styles.replyContainer}>
                              <div className={styles.replyHeader}>
                                <div className={styles.replyTeacher}>
                                  <Avatar 
                                    icon={<UserOutlined />}
                                    src={getTeacherInfo(selectedFeedback.reply.teacher).avatar}
                                  />
                                  <span>{getTeacherInfo(selectedFeedback.reply.teacher).name}</span>
                                </div>
                                <div className={styles.replyTime}>
                                  <CalendarOutlined /> {dayjs(selectedFeedback.reply.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')}
                                </div>
                              </div>
                              
                              <div className={styles.replyContent}>
                                {selectedFeedback.reply.content}
                              </div>
                              
                              {/* 直接显示回复中的图片 */}
                              {selectedFeedback.reply && hasImages(selectedFeedback.reply) && (
                                <div className={styles.imageGallery}>
                                  <Row gutter={[16, 16]}>
                                    {getFileUrls(selectedFeedback.reply).images.map((url, index) => (
                                      <Col span={8} key={index}>
                                        <div 
                                          className={styles.imagePreview}
                                          onClick={() => handleViewImage(url, index)}
                                        >
                                          <div className={styles.imageDebugInfo}>URL: {url}</div>
                                          <img 
                                            src={url} 
                                            alt={`图片 ${index + 1}`} 
                                            className={styles.galleryImg} 
                                            onError={(e) => {
                                              console.error(`图片加载失败: ${url}`);
                                              e.target.onerror = null;
                                              e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiB2aWV3Qm94PSIwIDAgMTYwIDE2MCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxNjAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxNnB4IiBmaWxsPSIjOTk5Ij7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+";
                                              message.error('图片加载失败，可能链接已失效');
                                            }}
                                          />
                                          <div className={styles.previewOverlay}>
                                            <EyeOutlined />
                                          </div>
                                        </div>
                                      </Col>
                                    ))}
                                  </Row>
                                </div>
                              )}
                              
                              {/* 仅将回复中的文档作为附件 */}
                              {selectedFeedback.reply && hasDocuments(selectedFeedback.reply) && (
                                <div className={styles.attachments}>
                                  <div className={styles.attachmentTitle}>
                                    <FileOutlined /> 文档附件 ({getFileUrls(selectedFeedback.reply).documents.length})
                                  </div>
                                  
                                  <Row gutter={[16, 16]} className={styles.fileList}>
                                    {getFileUrls(selectedFeedback.reply).documents.map((url, index) => (
                                      <Col span={12} key={index}>
                                        <a 
                                          href={url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className={styles.fileLink}
                                        >
                                          {getFileIcon(url)}
                                          <span className={styles.fileName}>{getFileName(url)}</span>
                                          <DownloadOutlined className={styles.downloadIcon} />
                                        </a>
                                      </Col>
                                    ))}
                                  </Row>
                                </div>
                              )}
                            </div>
                          )}
                        </TabPane>
                      </Tabs>
                      
                      <div className={styles.modalFooter}>
                        <Button onClick={handleCloseDetail}>关闭</Button>
                        <Button 
                          type="primary" 
                          onClick={() => router.push(`/studentSubmitFeedback?edit=${selectedFeedback.id}`)}
                          disabled={selectedFeedback.status === 3}
                        >
                          编辑反馈
                        </Button>
                      </div>
                    </div>
                  </Modal>
                )}
                
                {/* 图片查看器 */}
                {viewingImage && (
                  <div className={styles.imageViewer}>
                    <div className={styles.imageViewerOverlay} onClick={handleCloseImageViewer}></div>
                    <div className={styles.imageViewerContent}>
                      <Button 
                        className={styles.closeButton} 
                        icon={<CloseOutlined />} 
                        onClick={handleCloseImageViewer}
                      />
                      
                      {selectedFeedback && getFileUrls(selectedFeedback).images.length > 1 && (
                        <>
                          <Button 
                            className={styles.prevButton} 
                            icon={<LeftOutlined />} 
                            onClick={() => handlePrevImage(selectedFeedback)}
                          />
                          <Button 
                            className={styles.nextButton} 
                            icon={<RightOutlined />} 
                            onClick={() => handleNextImage(selectedFeedback)}
                          />
                        </>
                      )}
                      
                      <div className={styles.imageContainer}>
                        <img 
                          src={viewingImage} 
                          alt="预览图" 
                          onError={(e) => {
                            console.error(`图片加载失败: ${viewingImage}`);
                            e.target.onerror = null;
                            e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiB2aWV3Qm94PSIwIDAgMTYwIDE2MCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxNjAiIGZpbGw9IiNmMGYwZjAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxNnB4IiBmaWxsPSIjOTk5Ij7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+";
                            message.error('图片加载失败，可能链接已失效');
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 版本历史查看器 */}
                {viewingVersions && (
                  <Modal
                    title="反馈历史版本"
                    open={viewingVersions}
                    onCancel={handleCloseVersions}
                    footer={[
                      <Button key="close" onClick={handleCloseVersions}>
                        关闭
                      </Button>
                    ]}
                    width={700}
                  >
                    <Timeline
                      mode="left"
                      items={versionData.map((version, index) => ({
                        label: dayjs(version.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss'),
                        children: (
                          <Card
                            className={styles.versionCard}
                            title={`版本 ${index + 1}`}
                            size="small"
                          >
                            <div className={styles.versionContent}>
                              {version.content}
                            </div>
                            
                            {/* 显示版本中的图片 */}
                            {version.imageUrls && version.imageUrls.length > 0 && (
                              <div className={styles.versionImageGallery}>
                                <Row gutter={[8, 8]}>
                                  {version.imageUrls.filter(url => isImage(url)).map((url, i) => (
                                    <Col span={8} key={i}>
                                      <img 
                                        src={url} 
                                        alt={`图片 ${i + 1}`} 
                                        className={styles.versionImg} 
                                        onClick={() => handleViewImage(url, i)}
                                      />
                                    </Col>
                                  ))}
                                </Row>
                              </div>
                            )}
                            
                            {/* 显示版本中的文档附件 */}
                            {version.documentUrls && version.documentUrls.length > 0 && (
                              <div className={styles.versionFiles}>
                                <div className={styles.attachmentTitle}>
                                  <FileOutlined /> 文档附件 ({version.documentUrls.length})
                                </div>
                                
                                <div className={styles.fileLinks}>
                                  {version.documentUrls.map((url, i) => (
                                    <a
                                      key={i}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={styles.fileLink}
                                    >
                                      {getFileIcon(url)}
                                      <span className={styles.fileName}>{getFileName(url)}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </Card>
                        )
                      }))}
                    />
                  </Modal>
                )}
              </>
            )}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
} 