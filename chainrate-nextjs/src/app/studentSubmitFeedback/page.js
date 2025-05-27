'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import ChainRate02ABI from '../../contracts/ChainRate02.json';
import ChainRate02Address from '../../contracts/ChainRate02-address.json';
import { 
  Layout, 
  Typography, 
  Breadcrumb, 
  Form, 
  Input, 
  Select, 
  Button, 
  Upload, 
  Spin, 
  Card, 
  Divider,
  message,
  ConfigProvider,
  Alert,
  Row,
  Col,
  Modal,
  Space,
  Tag,
  Table,
  Empty,
  Result
} from 'antd';
import { 
  UploadOutlined, 
  FileOutlined, 
  PictureOutlined, 
  HomeFilled, 
  CommentOutlined,
  BookOutlined,
  FormOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CloseOutlined
} from '@ant-design/icons';
import StudentSidebar from '../components/StudentSidebar';
import UserAvatar from '../components/UserAvatar';
import styles from './page.module.css';
import axios from 'axios';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// 创建课程反馈提示内容组件
const FeedbackNoticeContent = () => (
  <div className={styles.noticeContent}>
    <div className={styles.infoItem}>
      <InfoCircleOutlined className={styles.infoItemIcon} />
      <Typography.Text>请选择要提交反馈的课程</Typography.Text>
    </div>
    <div className={styles.infoItem}>
      <InfoCircleOutlined className={styles.infoItemIcon} />
      <Typography.Text>您需要先选择一个已加入的课程，然后才能提交反馈</Typography.Text>
    </div>
    <div className={styles.infoItem}>
      <InfoCircleOutlined className={styles.infoItemIcon} />
      <Typography.Text>课程反馈将发送给该课程的授课教师</Typography.Text>
    </div>
  </div>
);

// 创建表单页面反馈说明组件
const FeedbackFormNoticeContent = () => (
  <div className={styles.noticeContent}>
    <div className={styles.infoItem}>
      <FileTextOutlined className={styles.infoItemIcon} />
      <Typography.Text>您可以在这里提交对课程内容的反馈意见，包括文字描述、相关文档和图片</Typography.Text>
    </div>
    <div className={styles.infoItem}>
      <FileTextOutlined className={styles.infoItemIcon} />
      <Typography.Text>所有反馈将存储在区块链上，确保透明性和不可篡改性</Typography.Text>
    </div>
    <div className={styles.infoItem}>
      <FileTextOutlined className={styles.infoItemIcon} />
      <Typography.Text>教师会在查看反馈后尽快回复</Typography.Text>
    </div>
  </div>
);

// 上传文件到IPFS的函数
const uploadToIPFS = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // 使用Pinata API进行上传
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    if (response.data && response.data.IpfsHash) {
      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } else {
      throw new Error('上传到IPFS失败');
    }
  } catch (error) {
    console.error('上传到IPFS错误:', error);
    throw error;
  }
};

export default function StudentSubmitFeedbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');
  const courseName = searchParams.get('courseName');
  
  const [form] = Form.useForm();
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
  const [submitting, setSubmitting] = useState(false);
  const [mainContract, setMainContract] = useState(null);
  const [extensionContract, setExtensionContract] = useState(null);
  const [courseInfo, setCourseInfo] = useState(null);
  const [teacherInfo, setTeacherInfo] = useState(null);
  
  // 新增状态
  const [studentCourses, setStudentCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseSelectMode, setCourseSelectMode] = useState(!courseId);
  
  // 文件上传状态
  const [documentFiles, setDocumentFiles] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Modal状态
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalContent, setErrorModalContent] = useState('');
  
  // 提交结果
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [feedbackId, setFeedbackId] = useState(null);
  
  // 提示框状态
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [noticeFading, setNoticeFading] = useState(false);
  
  // 表单页面提示框状态
  const [formNoticeVisible, setFormNoticeVisible] = useState(false);
  const [formNoticeFading, setFormNoticeFading] = useState(false);
  
  // 显示提示框
  useEffect(() => {
    if (courseSelectMode) {
      // 延迟显示提示框，以便页面加载完成后再显示
      const timer = setTimeout(() => {
        setNoticeVisible(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [courseSelectMode]);
  
  // 表单页面提示框显示
  useEffect(() => {
    if (!courseSelectMode && selectedCourse) {
      // 延迟显示提示框，以便页面加载完成后再显示
      const timer = setTimeout(() => {
        setFormNoticeVisible(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [courseSelectMode, selectedCourse]);
  
  // 关闭提示框
  const closeNotice = () => {
    // 先应用淡出动画
    setNoticeFading(true);
    
    // 动画结束后隐藏提示框
    setTimeout(() => {
      setNoticeVisible(false);
      setNoticeFading(false);
    }, 300); // 300ms 与动画时长匹配
  };
  
  // 关闭表单页面提示框
  const closeFormNotice = () => {
    // 先应用淡出动画
    setFormNoticeFading(true);
    
    // 动画结束后隐藏提示框
    setTimeout(() => {
      setFormNoticeVisible(false);
      setFormNoticeFading(false);
    }, 300); // 300ms 与动画时长匹配
  };
  
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
        
        // 获取学生加入的所有课程
        const studentAddress = localStorage.getItem('userAddress');
        await loadStudentCourses(chainRateContract, studentAddress);
        
        // 如果URL中有课程ID参数，则直接加载该课程
        if (courseId) {
          await loadCourseInfo(chainRateContract, courseId);
          setCourseSelectMode(false);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("初始化Web3失败:", err);
        message.error('初始化Web3失败: ' + err.message);
        setLoading(false);
      }
    };
    
    // 加载学生的所有课程
    const loadStudentCourses = async (contract, studentAddress) => {
      try {
        // 获取学生加入的课程ID列表
        const courseIds = await contract.getStudentCourses(studentAddress);
        console.log('学生加入的课程:', courseIds);
        
        // 获取每个课程的详细信息
        const coursesData = [];
        for (let i = 0; i < courseIds.length; i++) {
          const courseId = courseIds[i].toString();
          const course = await contract.courses(courseId);
          
          // 获取教师信息
          const teacherAddress = course[1];
          const teacher = await contract.getUserInfo(teacherAddress);
          
          coursesData.push({
            id: course[0].toString(),
            teacher: {
              address: teacherAddress,
              name: teacher[0],
              college: teacher[3]
            },
            name: course[2],
            startTime: course[3],
            endTime: course[4],
            isActive: course[5],
            studentCount: course[6].toString()
          });
        }
        
        setStudentCourses(coursesData);
      } catch (error) {
        console.error('加载学生课程失败:', error);
        message.error('加载学生课程失败: ' + error.message);
      }
    };
    
    // 加载课程信息
    const loadCourseInfo = async (contract, id) => {
      try {
        // 获取课程详情
        const course = await contract.courses(id);
        if (!course || course[0].toString() !== id) {
          message.error('课程不存在');
          setLoading(false);
          return;
        }
        
        const courseData = {
          id: course[0].toString(),
          teacher: course[1],
          name: course[2],
          startTime: course[3],
          endTime: course[4],
          isActive: course[5],
          studentCount: course[6].toString()
        };
        
        setCourseInfo(courseData);
        setSelectedCourse(courseData);
        
        // 获取教师信息
        const teacher = await contract.getUserInfo(course[1]);
        setTeacherInfo({
          name: teacher[0],
          phone: teacher[1],
          email: teacher[2],
          college: teacher[3],
          major: teacher[4],
          grade: teacher[5],
          avatar: teacher[6]
        });
        
        setLoading(false);
      } catch (error) {
        console.error('加载课程信息失败:', error);
        message.error('加载课程信息失败: ' + error.message);
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router, courseId]);
  
  // 处理课程选择
  const handleCourseSelect = async (courseId) => {
    try {
      setLoading(true);
      // 查找选中的课程信息
      const selectedCourse = studentCourses.find(course => course.id === courseId);
      setSelectedCourse(selectedCourse);
      
      // 获取教师信息
      const teacher = await mainContract.getUserInfo(selectedCourse.teacher.address);
      setTeacherInfo({
        name: teacher[0],
        phone: teacher[1],
        email: teacher[2],
        college: teacher[3],
        major: teacher[4],
        grade: teacher[5],
        avatar: teacher[6]
      });
      
      setCourseSelectMode(false);
      setLoading(false);
    } catch (error) {
      console.error('选择课程失败:', error);
      message.error('选择课程失败: ' + error.message);
      setLoading(false);
    }
  };
  
  // 返回课程选择页面
  const backToCourseSelect = () => {
    setCourseSelectMode(true);
    setSelectedCourse(null);
  };
  
  // 处理文档文件上传
  const handleDocumentUpload = ({ fileList }) => {
    // 过滤掉状态为error或removed的文件
    const validFileList = fileList.filter(file => 
      file.status !== 'error' && file.status !== 'removed'
    );
    setDocumentFiles(validFileList);
  };
  
  // 处理图片上传
  const handleImageUpload = ({ fileList }) => {
    // 过滤掉状态为error或removed的文件
    const validFileList = fileList.filter(file => 
      file.status !== 'error' && file.status !== 'removed'
    );
    setImageFiles(validFileList);
  };
  
  // 上传文件到IPFS并获取哈希
  const uploadFilesToIPFS = async (files) => {
    const hashes = [];
    for (const file of files) {
      try {
        const hash = await uploadToIPFS(file.originFileObj);
        hashes.push(hash);
      } catch (err) {
        console.error('上传文件到IPFS失败:', err);
        throw err;
      }
    }
    return hashes;
  };
  
  // 修改uploadContentToIPFS函数，将内容存储为JSON格式
  const uploadContentToIPFS = async (content) => {
    try {
      // 创建结构化的JSON内容对象
      const contentObject = {
        content: content,
        timestamp: new Date().toISOString(),
        author: userData.name || 'Anonymous Student'
      };
      
      // 将内容转换为JSON字符串
      const jsonContent = JSON.stringify(contentObject);
      
      // 将内容转换为Blob
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'feedback-content.json', { type: 'application/json' });
      
      return await uploadToIPFS(file);
    } catch (err) {
      console.error('上传内容到IPFS失败:', err);
      throw err;
    }
  };
  
  // 修改和增强提交表单函数
  const handleSubmit = async (values) => {
    if (!selectedCourse || !extensionContract) {
      message.error('提交失败: 请先选择课程');
      return;
    }
    
    // 检查内容长度
    if (values.content.trim().length < 10) {
      message.error('反馈内容至少需要10个字');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // 上传内容到IPFS
      setUploading(true);
      message.loading('上传反馈内容中...');
      const contentHash = await uploadContentToIPFS(values.content);
      
      // 上传文档到IPFS
      let documentHashes = [];
      if (documentFiles.length > 0) {
        message.loading(`上传${documentFiles.length}个文档文件中...`);
        documentHashes = await uploadFilesToIPFS(documentFiles);
      }
      
      // 上传图片到IPFS
      let imageHashes = [];
      if (imageFiles.length > 0) {
        message.loading(`上传${imageFiles.length}张图片中...`);
        imageHashes = await uploadFilesToIPFS(imageFiles);
      }
      
      setUploading(false);
      message.loading('提交到区块链中，请稍候...');
      
      console.log('提交反馈数据:', {
        courseId: selectedCourse.id,
        contentHash,
        documentHashes,
        imageHashes
      });
      
      // 调用合约提交反馈
      const tx = await extensionContract.submitCourseFeedback(
        selectedCourse.id,
        contentHash,
        documentHashes,
        imageHashes
      );
      
      // 等待交易确认
      message.loading('等待区块链确认交易...');
      await tx.wait();
      
      // 获取反馈ID
      const studentAddress = userData.address;
      const feedbacks = await extensionContract.getStudentFeedbacks(studentAddress);
      const feedbackId = feedbacks[feedbacks.length - 1].toString();
      
      setFeedbackId(feedbackId);
      setSubmitSuccess(true);
      message.success('反馈提交成功!');
    } catch (error) {
      console.error('提交反馈失败:', error);
      
      let errorMessage = '提交反馈失败';
      
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
      setSubmitting(false);
      setUploading(false);
    }
  };
  
  // 返回课程页面
  const goBack = () => {
    router.push('/studentViewCourses');
  };
  
  // 辅助函数：获取课程状态用于反馈表格
  const getCourseStatusForFeedback = (course) => {
    const now = new Date().getTime() / 1000; // 当前时间戳 (秒)
    const startTime = Number(course.startTime);
    const endTime = Number(course.endTime);

    if (!course.isActive) {
      return { text: '已归档 (不可反馈)', color: 'grey', isFeedbackAllowed: false };
    }
    if (now < startTime) {
      return { text: '未开始 (不可反馈)', color: 'blue', isFeedbackAllowed: false };
    }
    if (now > endTime) {
      // 明确已结束的课程不可反馈
      return { text: '已结束 (不可反馈)', color: 'red', isFeedbackAllowed: false }; 
    }
    // 只有进行中的课程可以反馈
    return { text: '进行中 (可反馈)', color: 'green', isFeedbackAllowed: true };
  };

  // 表格列定义 (用于课程选择模式)
  const courseSelectionColumns = [
    {
      title: '课程名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => handleCourseSelect(record.id)} style={{ fontWeight: 'bold' }}>
          {text}
        </a>
      ),
    },
    {
      title: '授课教师',
      dataIndex: ['teacher', 'name'], // 嵌套数据路径
      key: 'teacherName',
    },
    {
      title: '教师院系',
      dataIndex: ['teacher', 'college'],
      key: 'teacherCollege',
    },
    {
      title: '课程状态',
      key: 'status',
      render: (text, record) => {
        const status = getCourseStatusForFeedback(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: '选课人数',
      dataIndex: 'studentCount',
      key: 'studentCount',
      align: 'center',
    },
    {
      title: '操作',
      key: 'action',
      align: 'center',
      render: (text, record) => {
        const status = getCourseStatusForFeedback(record);
        return (
          <Button 
            type="primary" 
            onClick={() => handleCourseSelect(record.id)}
            icon={<FormOutlined />}
            disabled={!status.isFeedbackAllowed} // 根据课程状态禁用按钮
          >
            {status.isFeedbackAllowed ? '提交反馈' : '不可反馈'} 
          </Button>
        );
      },
    },
  ];
  
  // 上传文件之前的检查
  const beforeUpload = (file) => {
    // 检查文件大小
    const isAllowedSize = file.size / 1024 / 1024 < 10; // 10MB 限制
    if (!isAllowedSize) {
      setErrorModalVisible(true);
      setErrorModalContent('附件大小不能超过10MB');
      return Upload.LIST_IGNORE;
    }
    
    // 检查文件类型
    const fileName = file.name || '';
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    // 允许的MIME类型
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', // 图片
      'application/pdf', // PDF
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
      'application/msword', // DOC
      'application/vnd.ms-powerpoint', // PPT
      'application/vnd.ms-excel', // XLS
      'text/plain' // TXT
    ];
    
    // 允许的文件扩展名
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'docx', 'pptx', 'xlsx', 'doc', 'ppt', 'xls', 'txt'];
    
    const isAllowedType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
    
    if (!isAllowedType) {
      console.log('不支持的文件类型:', file.type, '文件名:', file.name);
      setErrorModalVisible(true);
      setErrorModalContent('仅支持以下格式：JPG, PNG, PDF, DOCX, PPTX');
      return Upload.LIST_IGNORE;
    }
    
    return false; // 返回false阻止自动上传
  };
  
  // 处理清理表单
  const handleReset = () => {
    form.resetFields();
    setDocumentFiles([]);
    setImageFiles([]);
  };
  
  // 显示加载中或成功提交的UI
  if (loading) {
    return (
      <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
        <div className={styles.loadingContainer}>
          <Spin size="large" tip="加载中...请稍候" />
        </div>
      </ConfigProvider>
    );
  }
  
  // 提交成功后的UI
  if (submitSuccess) {
    return (
      <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
        <Layout style={{ minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
          <Result
            status="success"
            title="课程反馈提交成功！"
            subTitle={`您的反馈 (ID: ${feedbackId}) 已成功提交并记录在区块链上。教师将会尽快查看并处理。`}
            extra={[
              <Button type="primary" key="view" onClick={() => router.push(`/studentViewFeedback?id=${feedbackId}`)}>
                查看我的反馈
              </Button>,
              <Button key="again" onClick={() => router.push('/studentSubmitFeedback')}>
                提交新反馈
              </Button>,
              <Button key="home" onClick={() => router.push('/studentIndex')}>
                返回首页
              </Button>,
            ]}
          />
          </Layout>
      </ConfigProvider>
    );
  }
  
  // 课程选择模式UI
  if (courseSelectMode) {
    return (
      <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
        <Layout style={{ minHeight: '100vh' }}>
          <Header style={{ background: '#001529', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Image src="/images/logo1.png" alt="链评系统Logo" width={40} height={40} style={{ borderRadius: '6px', marginRight: '12px' }}/>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>链评系统（ChainRate）- 学生端</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '15px' }}>欢迎, {userData.name}</span>
              <UserAvatar userData={userData} />
            </div>
          </Header>
          <Layout>
            <Sider width={200} theme="light" style={{ background: '#fff' }}>
              <StudentSidebar defaultSelectedKey="7" defaultOpenKey="sub3" />
            </Sider>
            <Layout style={{ padding: '0 24px 24px' }}>
              <Breadcrumb style={{ margin: '16px 0' }}
                  items={[
                  { title: <a href="/studentIndex"><HomeFilled style={{ marginRight: '4px' }} />首页</a> },
                  { title: '评价管理' },
                  { title: '选择课程提交反馈' },
                ]}
              />
              <Content style={{ margin: '0', padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
                <div className={styles.contentPageHeaderContainer}>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  className={styles.backButton}
                  onClick={() => router.push('/studentViewCourses')}
                >
                  返回课程列表
                </Button>
                <Title level={2} className={styles.pageTitle}>选择要反馈的课程</Title>
              </div>
              
              {noticeVisible && (
                <div className={`${styles.noticePopup} ${noticeFading ? styles.noticeFadeOut : ''}`}>
                  <div className={styles.noticeHeader}>
                    <div className={styles.noticeTitle}>
                      <InfoCircleOutlined className={styles.noticeIcon} />
                      <span>课程反馈须知</span>
                    </div>
                    <div className={styles.noticeClose} onClick={closeNotice}>
                      <CloseOutlined />
                    </div>
                  </div>
                  <div className={styles.noticeContent}>
                    <FeedbackNoticeContent />
                  </div>
                </div>
              )}
              
                  {studentCourses.length > 0 ? (
                  <Table
                    columns={courseSelectionColumns}
                    dataSource={studentCourses.map(course => ({ ...course, key: course.id }))}
                    rowKey="id"
                    loading={loading} // 使用外层 loading 状态
                    pagination={{ pageSize: 10 }} // 简单分页
                    className={styles.courseSelectionTable}
                    scroll={{ x: 'max-content' }}
                  />
                ) : (
                  <div className={styles.emptyCoursesContainer}> 
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <Space direction="vertical" align="center" size="large">
                          <Title level={4} style={{ color: 'rgba(0, 0, 0, 0.45)' }}>您尚未加入任何课程或暂无可反馈的课程</Title>
                          <Paragraph style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
                            请先确保您已加入相关课程，并且课程已开始或已结束。
                          </Paragraph>
                        <Button 
                          type="primary" 
                          icon={<BookOutlined />}
                          onClick={() => router.push('/studentViewCourses')}
                            size="large"
                        >
                            去查看和加入课程
                        </Button>
                        </Space>
                      }
                    />
                      </div>
                  )}
            </Content>
            </Layout>
          </Layout>
        </Layout>
        
        {/* 错误提示弹窗 */}
        <Modal
          open={errorModalVisible}
          title="提示"
          centered
          okText="确定"
          cancelButtonProps={{ style: { display: 'none' } }}
          onOk={() => setErrorModalVisible(false)}
          onCancel={() => setErrorModalVisible(false)}
        >
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '24px', color: '#ff4d4f', marginBottom: '16px' }}>
              <ExclamationCircleOutlined />
            </div>
            <p style={{ fontSize: '16px' }}>{errorModalContent}</p>
          </div>
        </Modal>
      </ConfigProvider>
    );
  }
  
  // 反馈表单模式UI
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#001529', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Image src="/images/logo1.png" alt="链评系统Logo" width={40} height={40} style={{ borderRadius: '6px', marginRight: '12px' }}/>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>链评系统（ChainRate）- 学生端</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '15px' }}>欢迎, {userData.name}</span>
            <UserAvatar userData={userData} />
          </div>
        </Header>
        <Layout>
          <Sider width={200} theme="light" style={{ background: '#fff' }}>
            <StudentSidebar defaultSelectedKey="7" defaultOpenKey="sub3" />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb style={{ margin: '16px 0' }}
                items={[
                { title: <a href="/studentIndex"><HomeFilled style={{ marginRight: '4px' }} />首页</a> },
                  { title: '评价管理' },
                  { title: '提交课程反馈' },
                selectedCourse ? { title: selectedCourse.name } : null,
              ].filter(Boolean)}
            />
            <Content style={{ margin: '0', padding: 0, background: '#fff', borderRadius: 8, minHeight: 280 }}>
              <div className={styles.contentPageHeader}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                className={styles.backButton}
                onClick={backToCourseSelect}
              >
                返回选择课程
              </Button>
              <Title level={2} className={styles.pageTitle}>提交课程反馈</Title>
            </div>
            
            <div className={styles.contentContainer}>
              {selectedCourse && teacherInfo && (
                <Card className={styles.courseInfoCard}>
                  <div className={styles.selectedCourseInfo}>
                    <div className={styles.courseTitle}>
                      <Title level={3}>{selectedCourse.name}</Title>
                      <Tag color={selectedCourse.isActive ? "green" : "red"} className={styles.courseStatusTag}>
                        {selectedCourse.isActive ? "进行中" : "已结束"}
                      </Tag>
                    </div>
                    
                    <Row gutter={16}>
                      <Col span={12}>
                        <div className={styles.infoItem}>
                          <Text strong>课程ID: </Text>
                          <Text>{selectedCourse.id}</Text>
                        </div>
                        <div className={styles.infoItem}>
                          <Text strong>教师: </Text>
                          <Text>{teacherInfo.name}</Text>
                        </div>
                        <div className={styles.infoItem}>
                          <Text strong>院系: </Text>
                          <Text>{teacherInfo.college}</Text>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div className={styles.infoItem}>
                          <Text strong>专业: </Text>
                          <Text>{teacherInfo.major}</Text>
                        </div>
                        <div className={styles.infoItem}>
                          <Text strong>邮箱: </Text>
                          <Text>{teacherInfo.email}</Text>
                        </div>
                        <div className={styles.infoItem}>
                          <Text strong>选课人数: </Text>
                          <Text>{selectedCourse.studentCount}</Text>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Card>
              )}
              
              {formNoticeVisible && (
                <div className={`${styles.noticePopup} ${formNoticeFading ? styles.noticeFadeOut : ''}`}>
                  <div className={styles.noticeHeader}>
                    <div className={styles.noticeTitle}>
                      <FileTextOutlined className={styles.noticeIcon} />
                      <span>课程反馈说明</span>
                    </div>
                    <div className={styles.noticeClose} onClick={closeFormNotice}>
                      <CloseOutlined />
                    </div>
                  </div>
                  <div className={styles.noticeContent}>
                    <FeedbackFormNoticeContent />
                  </div>
                </div>
              )}
              
              <Card className={styles.feedbackCard} title="课程反馈表单">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  className={styles.feedbackForm}
                >
                  <Form.Item
                    name="content"
                    label="反馈内容"
                    rules={[
                      { required: true, message: '请输入反馈内容' },
                      { min: 10, message: '反馈内容至少需要10个字' }
                    ]}
                  >
                    <TextArea 
                      placeholder="请详细描述您对课程内容的反馈、建议或问题..." 
                      autoSize={{ minRows: 6, maxRows: 12 }}
                      showCount
                      maxLength={2000}
                    />
                  </Form.Item>
                  
                  <Divider plain>附件上传</Divider>
                  
                  <Form.Item
                    name="documents"
                    label="文档上传 (可选)"
                    extra="支持 PDF(.pdf), Word(.doc, .docx), Excel(.xls, .xlsx), PPT(.ppt, .pptx), 文本(.txt)等格式，单个文件最大10MB"
                  >
                    <Upload
                      listType="text"
                      fileList={documentFiles}
                      onChange={handleDocumentUpload}
                      beforeUpload={beforeUpload}
                      multiple
                    >
                      <Button icon={<FileOutlined />}>上传文档</Button>
                    </Upload>
                  </Form.Item>
                  
                  <Form.Item
                    name="images"
                    label="图片上传 (可选)"
                    extra="支持JPG(.jpg, .jpeg), PNG(.png), GIF(.gif), WebP(.webp)等图片格式，单个文件最大10MB"
                  >
                    <Upload
                      listType="picture"
                      fileList={imageFiles}
                      onChange={handleImageUpload}
                      beforeUpload={beforeUpload}
                      multiple
                    >
                      <Button icon={<PictureOutlined />}>上传图片</Button>
                    </Upload>
                  </Form.Item>
                  
                  <Form.Item className={styles.formButtons}>
                    <Space size="middle">
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={submitting || uploading}
                        icon={<FormOutlined />}
                      >
                        {uploading ? '上传文件中...' : submitting ? '提交中...' : '提交反馈'}
                      </Button>
                      <Button 
                        onClick={handleReset}
                        disabled={submitting || uploading}
                      >
                        重置
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            </div>
          </Content>
          </Layout>
        </Layout>
      </Layout>
      
      {/* 错误提示弹窗 */}
      <Modal
        open={errorModalVisible}
        title="提示"
        centered
        okText="确定"
        cancelButtonProps={{ style: { display: 'none' } }}
        onOk={() => setErrorModalVisible(false)}
        onCancel={() => setErrorModalVisible(false)}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '24px', color: '#ff4d4f', marginBottom: '16px' }}>
            <ExclamationCircleOutlined />
          </div>
          <p style={{ fontSize: '16px' }}>{errorModalContent}</p>
        </div>
      </Modal>
    </ConfigProvider>
  );
} 