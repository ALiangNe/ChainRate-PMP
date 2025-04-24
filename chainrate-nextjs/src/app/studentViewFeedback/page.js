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
  Tooltip,
  Input,
  Select,
  Avatar,
  Modal,
  Tabs,
  List,
  Divider,
  Timeline,
  Alert
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
  UserOutlined
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
const { TabPane } = Tabs;
const { Option } = Select;
const { Search } = Input;

// 配置dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

// 反馈状态映射
const FEEDBACK_STATUS = {
  0: { text: '已提交', color: 'blue', icon: <ClockCircleOutlined /> },
  1: { text: '已回复', color: 'green', icon: <CheckCircleOutlined /> },
  2: { text: '已修改', color: 'orange', icon: <SyncOutlined /> },
  3: { text: '已删除', color: 'red', icon: <DeleteOutlined /> }
};

// 获取IPFS内容
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
  
  // 使用IPFS网关
  try {
    const gateway = 'https://gateway.pinata.cloud/ipfs/';
    const url = `${gateway}${contentHash}`;
    
    const response = await fetch(url);
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
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// 创建IPFS URL
const createIPFSUrl = (hash) => {
  if (!hash || hash === '') return '';
  if (hash.startsWith('http')) return hash;
  
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
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
        
        // 如果有指定的反馈ID，直接打开该反馈详情
        if (feedbackId) {
          const targetFeedback = feedbacks.find(f => f.id === feedbackId);
          if (targetFeedback) {
            setSelectedFeedback(targetFeedback);
            setDetailModalVisible(true);
          }
        }
      } catch (err) {
        console.error("初始化Web3失败:", err);
        message.error('初始化Web3失败: ' + err.message);
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
          
          // 获取内容
          let contentText = "";
          try {
            const contentResult = await getIPFSContent(feedback.contentHash);
            if (contentResult.success) {
              if (typeof contentResult.data === 'object' && contentResult.data !== null) {
                contentText = contentResult.data.content || JSON.stringify(contentResult.data);
              } else {
                contentText = contentResult.data;
              }
            } else {
              contentText = "内容加载失败";
            }
          } catch (err) {
            contentText = "内容处理错误";
          }
          
          // 获取反馈回复
          let reply = null;
          try {
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
                  replyText = `回复内容加载失败`;
                }
              } catch (err) {
                replyText = "回复内容加载失败";
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
            content: contentText,
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
      
      // 统计数据
      const stats = {
        total: feedbackDetails.length,
        replied: feedbackDetails.filter(f => f.status === 1).length,
        unreplied: feedbackDetails.filter(f => f.status === 0).length,
        deleted: feedbackDetails.filter(f => f.status === 3).length
      };
      
      setStatistics(stats);
      setFeedbacks(feedbackDetails);
      setLoading(false);
    } catch (error) {
      console.error("加载反馈数据失败:", error);
      message.error('加载反馈数据失败: ' + error.message);
      setLoading(false);
    }
  };
  
  // 加载反馈版本历史
  const loadFeedbackVersions = async (feedbackId) => {
    try {
      setLoadingVersions(true);
      if (!extensionContract) {
        message.error('合约未初始化');
        setLoadingVersions(false);
        return;
      }
      
      console.log('正在加载反馈历史版本...', feedbackId);
      const feedback = feedbacks.find(f => f.id === feedbackId);
      if (!feedback) {
        message.error('未找到反馈信息');
        setLoadingVersions(false);
        return;
      }
      
      // 获取所有版本信息
      const versionsCount = feedback.versions;
      console.log('反馈版本数量:', versionsCount);
      
      // 即使只有一个版本也加载
      if (versionsCount <= 0) {
        setFeedbackVersions([]);
        setLoadingVersions(false);
        return;
      }
      
      // 查询所有版本
      const versionPromises = [];
      for (let i = 0; i < versionsCount; i++) {
        versionPromises.push(loadFeedbackVersion(feedbackId, i));
      }
      
      const versions = await Promise.all(versionPromises);
      // 按照时间降序排序，最新的在前面
      versions.sort((a, b) => b.timestamp - a.timestamp);
      
      setFeedbackVersions(versions);
      setLoadingVersions(false);
    } catch (error) {
      console.error('加载反馈版本历史失败:', error);
      message.error('加载反馈版本历史失败: ' + error.message);
      setLoadingVersions(false);
    }
  };
  
  // 加载特定版本反馈
  const loadFeedbackVersion = async (feedbackId, versionId) => {
    try {
      const version = await extensionContract.getFeedbackVersion(feedbackId, versionId);
      
      // 获取内容
      let contentText = "";
      try {
        const contentResult = await getIPFSContent(version.contentHash);
        if (contentResult.success) {
          if (typeof contentResult.data === 'object' && contentResult.data !== null) {
            contentText = contentResult.data.content || JSON.stringify(contentResult.data);
          } else {
            contentText = contentResult.data;
          }
        } else {
          contentText = "内容加载失败";
        }
      } catch (err) {
        contentText = "内容处理错误";
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
        imageHashes: version.imageHashes
      };
    } catch (error) {
      console.error(`加载反馈版本 ${versionId} 失败:`, error);
      return {
        id: versionId,
        feedbackId: feedbackId,
        timestamp: 0,
        content: "版本加载失败",
        contentHash: "",
        documentUrls: [],
        imageUrls: [],
        documentHashes: [],
        imageHashes: []
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
      message.loading('正在更新反馈，请等待区块链确认...');
      await tx.wait();
      
      message.success('反馈更新成功！');
      
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
      
      message.error(errorMessage);
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
        
        return (
          feedback.content.toLowerCase().includes(searchLower) ||
          (courseInfo.name && courseInfo.name.toLowerCase().includes(searchLower))
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
  
  // 创建新反馈
  const handleCreateFeedback = () => {
    router.push('/studentSubmitFeedback');
  };
  
  // 渲染页面
  return (
    <ConfigProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <StudentSidebar selectedKey="8" />
        
        <Layout>
          <Header className={styles.pageHeader}>
            <div>
              <Breadcrumb
                items={[
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
                  
                  <Space>
                    <Button 
                      type="primary" 
                      onClick={handleCreateFeedback}
                    >
                      新建反馈
                    </Button>
                    
                    <Search
                      placeholder="搜索反馈内容、课程名称..."
                      allowClear
                      enterButton
                      onSearch={handleSearch}
                      style={{ width: 300 }}
                    />
                  </Space>
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
                          onClick={handleCreateFeedback}
                        >
                          去提交反馈
                        </Button>
                      )}
                    </Empty>
                  ) : (
                    <List
                      itemLayout="vertical"
                      dataSource={filteredFeedbacks}
                      renderItem={feedback => {
                        const courseInfo = getCourseInfo(feedback.courseId);
                        const statusInfo = FEEDBACK_STATUS[feedback.status];
                        
                        return (
                          <List.Item
                            key={feedback.id}
                            actions={[
                              <Button 
                                key="view" 
                                type="link" 
                                icon={<EyeOutlined />}
                                onClick={() => handleViewFeedback(feedback)}
                              >
                                查看详情
                              </Button>,
                              <Button 
                                key="edit" 
                                type="link" 
                                icon={<EditOutlined />}
                                onClick={() => handleEditFeedback(feedback)}
                                disabled={feedback.status === 3}
                              >
                                编辑反馈
                              </Button>
                            ]}
                            extra={
                              <Tag color={statusInfo.color} icon={statusInfo.icon}>
                                {statusInfo.text}
                              </Tag>
                            }
                          >
                            <List.Item.Meta
                              title={
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Text strong>{courseInfo.name}</Text>
                                  <Text type="secondary">
                                    {feedback.hasReply ? '教师已回复' : '等待回复'}
                                  </Text>
                                </div>
                              }
                              description={
                                <div>
                                  <Text type="secondary">
                                    <CalendarOutlined /> 提交时间: {dayjs(feedback.timestamp * 1000).format('YYYY-MM-DD HH:mm')}
                                  </Text>
                                  <br />
                                  <Text type="secondary">
                                    <UserOutlined /> 教师: {getTeacherInfo(courseInfo.teacher).name}
                                  </Text>
                                </div>
                              }
                            />
                            <Paragraph ellipsis={{ rows: 2 }} style={{ marginTop: 16 }}>
                              {feedback.content}
                            </Paragraph>
                            <div>
                              {feedback.imageUrls.length > 0 && (
                                <Text type="secondary">
                                  <PictureOutlined /> 图片附件: {feedback.imageUrls.length} 个
                                </Text>
                              )}
                              {feedback.imageUrls.length > 0 && feedback.documentHashes.length > 0 && (
                                <Divider type="vertical" />
                              )}
                              {feedback.documentHashes.length > 0 && (
                                <Text type="secondary">
                                  <FileOutlined /> 文档附件: {feedback.documentHashes.length} 个
                                </Text>
                              )}
                            </div>
                          </List.Item>
                        );
                      }}
                    />
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
                    open={detailModalVisible}
                    onCancel={handleCloseDetail}
                    footer={[
                      <Button key="close" onClick={handleCloseDetail}>关闭</Button>,
                      <Button
                        key="edit"
                        type="primary"
                        onClick={() => handleEditFeedback(selectedFeedback)}
                        disabled={selectedFeedback.status === 3}
                      >
                        编辑反馈
                      </Button>
                    ]}
                    width={800}
                  >
                    <div className={styles.feedbackDetail}>
                      <div className={styles.courseInfo}>
                        <Title level={4}>{getCourseInfo(selectedFeedback.courseId).name}</Title>
                        <div className={styles.teacherInfo}>
                          <UserOutlined /> 授课教师: {getTeacherInfo(getCourseInfo(selectedFeedback.courseId).teacher).name}
                        </div>
                      </div>
                      
                      <Tabs defaultActiveKey="content">
                        <TabPane tab="反馈内容" key="content">
                          <div className={styles.feedbackBody}>
                            <div className={styles.feedbackTime}>
                              <CalendarOutlined /> 提交时间: {dayjs(selectedFeedback.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')}
                            </div>
                            
                            <div className={styles.feedbackContentDetail}>
                              {selectedFeedback.content}
                            </div>
                            
                            {/* 显示附件信息 */}
                            {(selectedFeedback.imageUrls.length > 0 || selectedFeedback.documentHashes.length > 0) && (
                              <div className={styles.attachments}>
                                {selectedFeedback.imageUrls.length > 0 && (
                                  <div className={styles.attachmentSection}>
                                    <Title level={5}>
                                      <PictureOutlined /> 图片附件 ({selectedFeedback.imageUrls.length})
                                    </Title>
                                    <Row gutter={[16, 16]}>
                                      {selectedFeedback.imageUrls.map((url, index) => (
                                        <Col span={8} key={index}>
                                          <div className={styles.imagePreview}>
                                            <img 
                                              src={url} 
                                              alt={`图片 ${index + 1}`} 
                                              className={styles.previewImg}
                                            />
                                          </div>
                                        </Col>
                                      ))}
                                    </Row>
                                  </div>
                                )}
                                
                                {selectedFeedback.documentHashes.length > 0 && (
                                  <div className={styles.attachmentSection}>
                                    <Title level={5}>
                                      <FileOutlined /> 文档附件 ({selectedFeedback.documentHashes.length})
                                    </Title>
                                    <List
                                      dataSource={selectedFeedback.documentHashes}
                                      renderItem={(hash, index) => (
                                        <List.Item>
                                          <a 
                                            href={createIPFSUrl(hash)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.documentLink}
                                          >
                                            <FileTextOutlined /> 文档 {index + 1}
                                          </a>
                                        </List.Item>
                                      )}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TabPane>
                        
                        <TabPane tab="版本历史" key="versions">
                          {loadingVersions ? (
                            <div className={styles.loadingContainer} style={{ height: '200px' }}>
                              <Spin size="small" />
                              <div>加载版本历史...</div>
                            </div>
                          ) : feedbackVersions.length > 0 ? (
                            <div className={styles.versionsContainer}>
                              <Alert
                                message="版本历史记录"
                                description="以下是该反馈的所有历史版本，按时间从新到旧排序。每次修改都会生成一个新版本，所有版本都保存在区块链上，确保不可篡改。"
                                type="info"
                                showIcon
                                style={{ marginBottom: 16 }}
                              />
                              <Timeline mode="left">
                                {feedbackVersions.map((version, index) => (
                                  <Timeline.Item 
                                    key={version.id} 
                                    color={index === 0 ? 'green' : 'blue'} 
                                    label={dayjs(version.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')}
                                  >
                                    <Card 
                                      size="small" 
                                      title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span>{index === 0 ? "当前版本" : `版本 ${feedbackVersions.length - index}`}</span>
                                          <Tag color={index === 0 ? "green" : "blue"}>
                                            {index === 0 ? "最新" : `修改于 ${dayjs(version.timestamp * 1000).fromNow()}`}
                                          </Tag>
                                        </div>
                                      }
                                      className={styles.versionCard}
                                    >
                                      <div className={styles.versionContent}>
                                        {version.content}
                                      </div>
                                      
                                      {/* 增强版本附件显示 */}
                                      {(version.imageUrls.length > 0 || version.documentHashes.length > 0) && (
                                        <div className={styles.versionAttachments}>
                                          {/* 图片附件展示 */}
                                          {version.imageUrls.length > 0 && (
                                            <div style={{ marginTop: 12 }}>
                                              <Divider orientation="left" plain>
                                                <Text type="secondary">
                                                  <PictureOutlined /> 图片附件 ({version.imageUrls.length})
                                                </Text>
                                              </Divider>
                                              <Row gutter={[8, 8]}>
                                                {version.imageUrls.map((url, imgIndex) => (
                                                  <Col span={8} key={imgIndex}>
                                                    <div className={styles.versionImagePreview}>
                                                      <img 
                                                        src={url} 
                                                        alt={`版本 ${feedbackVersions.length - index} 图片 ${imgIndex + 1}`} 
                                                        className={styles.previewImg}
                                                        onClick={() => window.open(url, '_blank')}
                                                      />
                                                    </div>
                                                  </Col>
                                                ))}
                                              </Row>
                                            </div>
                                          )}
                                          
                                          {/* 文档附件展示 */}
                                          {version.documentHashes.length > 0 && (
                                            <div style={{ marginTop: 12 }}>
                                              <Divider orientation="left" plain>
                                                <Text type="secondary">
                                                  <FileOutlined /> 文档附件 ({version.documentHashes.length})
                                                </Text>
                                              </Divider>
                                              <List
                                                size="small"
                                                dataSource={version.documentHashes}
                                                renderItem={(hash, docIndex) => (
                                                  <List.Item>
                                                    <a 
                                                      href={createIPFSUrl(hash)}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className={styles.documentLink}
                                                    >
                                                      <FileTextOutlined /> 文档 {docIndex + 1}
                                                    </a>
                                                  </List.Item>
                                                )}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </Card>
                                  </Timeline.Item>
                                ))}
                              </Timeline>
                            </div>
                          ) : (
                            <Empty description="没有找到版本历史记录" />
                          )}
                        </TabPane>
                        
                        <TabPane tab="教师回复" key="reply" disabled={!selectedFeedback.hasReply}>
                          {selectedFeedback.hasReply && selectedFeedback.reply && (
                            <div className={styles.replyContainer}>
                              <div className={styles.replyHeader}>
                                <div className={styles.replyTeacher}>
                                  <Avatar icon={<UserOutlined />} />
                                  <span>{getTeacherInfo(selectedFeedback.reply.teacher).name}</span>
                                </div>
                                <div className={styles.replyTime}>
                                  <CalendarOutlined /> {dayjs(selectedFeedback.reply.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')}
                                </div>
                              </div>
                              
                              <div className={styles.replyContent}>
                                {selectedFeedback.reply.content}
                              </div>
                            </div>
                          )}
                        </TabPane>
                      </Tabs>
                    </div>
                  </Modal>
                )}
              </>
            )}
          </Content>
        </Layout>
      </Layout>
      
      {/* 在最后添加EditFeedbackModal组件 */}
      <EditFeedbackModal
        visible={editModalVisible}
        feedback={editingFeedback}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingFeedback(null);
        }}
        onSubmit={handleSubmitEdit}
        loading={submittingEdit}
      />
    </ConfigProvider>
  );
} 