/**
 * 学生课程评价提交页面 (Student Course Evaluation Submission Page)
 * 
 * 功能概述:
 * - 允许学生对已加入的课程提交多维度评价
 * - 支持文本评价内容和图片上传
 * - 提供匿名评价选项
 * - 实现多维度评分系统(总体、教学质量、内容设计、师生互动)
 * - 评价提交到IPFS和区块链双重存储
 * 
 * 动态路由:
 * - 使用[id]参数获取特定课程ID
 * - 根据ID验证学生是否有权提交评价
 * 
 * 主要组件:
 * - EvaluationForm: 评价提交表单，包含多个评分维度
 * - ImageUploader: 图片上传组件，支持预览和删除
 * - IPFS集成: 使用Pinata服务将图片上传到IPFS
 * - RatingComponent: 星级评分组件，支持不同维度评分
 * 
 * 交互功能:
 * 1. 用户可输入评价文本内容
 * 2. 用户可对课程进行多维度评分
 * 3. 用户可上传图片作为评价证明
 * 4. 用户可选择是否匿名评价
 * 5. 表单验证确保所有必填项都已填写
 * 
 * 数据流:
 * 1. 从URL参数获取课程ID
 * 2. 验证用户是否有权评价该课程(已加入且在评价期内)
 * 3. 图片首先上传到IPFS获取哈希值
 * 4. 评价内容和图片哈希提交到区块链
 * 5. 评价成功后重定向回课程详情页
 * 
 * 安全措施:
 * - 验证用户是否已登录且为学生角色
 * - 验证用户是否已加入课程
 * - 验证当前是否在评价期内
 * - 防止重复评价提交
 * - 评价内容上链前进行验证
 * 
 * 技术特性:
 * - 使用IPFS(Pinata)存储评价图片
 * - 使用智能合约记录评价数据
 * - 实现上传进度显示和错误处理
 * - 响应式界面设计适配不同设备
 * 
 * @author ChainRate Team
 * @version 1.0
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../../contracts/ChainRate.json';
import ChainRateAddress from '../../../contracts/ChainRate-address.json';
import styles from './page.module.css';
import Image from 'next/image';
import React from 'react';
import axios from 'axios'; // 引入axios用于API请求
import UserAvatar from '../../components/UserAvatar';
import StudentSidebar from '../../components/StudentSidebar';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  FormOutlined, 
  LogoutOutlined,
  TeamOutlined,
  StarOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  FileTextOutlined,
  UploadOutlined,
  DeleteOutlined,
  StarFilled,
  PictureOutlined,
  LoadingOutlined
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
  Form,
  Upload,
  Checkbox,
  Space,
  message,
  Progress,
  Modal,
  App
} from 'antd';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Pinata API配置
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY || '';
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';

// 创建一个内部组件以使用App上下文
function SubmitEvaluationContent({ params, router }) {
  // 解包params参数
  const resolvedParams = React.use(params);
  const courseId = resolvedParams.id;
  
  // 提前调用 useToken，确保Hook顺序一致
  const { token } = theme.useToken();
  const { colorBgContainer, borderRadiusLG, colorPrimary } = token;
  
  // 添加App.useApp调用
  const { message: appMessage, modal, notification } = App.useApp();
  
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
  const [course, setCourse] = useState(null);
  
  // 评价表单数据
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [teachingRating, setTeachingRating] = useState(5); // 新增：教学质量评分
  const [contentRating, setContentRating] = useState(5); // 新增：内容设计评分
  const [interactionRating, setInteractionRating] = useState(5); // 新增：师生互动评分
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState([]); // 新增：评价图片
  
  // 图片上传状态
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageHashes, setUploadedImageHashes] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalContent, setErrorModalContent] = useState('');
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [transactionHash, setTransactionHash] = useState(''); // 添加交易哈希状态
  const [blockNumber, setBlockNumber] = useState(''); // 添加区块号状态
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

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
        
        // 连接到合约
        const chainRateContract = new ethers.Contract(
          ChainRateAddress.address,
          ChainRateABI.abi,
          signer
        );
        setContract(chainRateContract);
        
        // 加载课程详情
        await loadCourseDetails(chainRateContract, await signer.getAddress(), courseId);
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router, courseId]);

  // 加载课程详情
  const loadCourseDetails = async (contractInstance, studentAddress, courseId) => {
    try {
      // 检查课程是否存在
      try {
        const course = await contractInstance.courses(courseId);
        
        // 获取教师信息
        let teacherName = "未知";
        try {
          const teacherInfo = await contractInstance.getUserInfo(course.teacher);
          teacherName = teacherInfo[0]; // 教师姓名
        } catch (error) {
          console.warn(`获取教师信息失败: ${error.message}`);
        }
        
        // 检查学生是否已加入课程
        const studentJoined = await contractInstance.isStudentJoined(courseId, studentAddress);
        
        // 检查学生是否已评价课程
        const hasEvaluated = await contractInstance.hasEvaluated(courseId, studentAddress);
        
        // 检查当前是否在评价期间内
        const now = Math.floor(Date.now() / 1000);
        const canEvaluate = studentJoined && 
                           now >= Number(course.startTime) && 
                           now <= Number(course.endTime) && 
                           !hasEvaluated;
                           
        // 如果不能评价，重定向回课程详情页
        if (!canEvaluate) {
          setError('您目前无法评价此课程，可能是因为您尚未加入课程、评价时间未到或已结束、或您已经提交过评价。');
          setTimeout(() => {
            router.push(`/studentCourseDetail/${courseId}`);
          }, 3000);
          return;
        }
        
        // 更新课程信息
        setCourse({
          id: Number(courseId),
          name: course.name,
          teacher: course.teacher,
          teacherName: teacherName,
          startTime: new Date(Number(course.startTime) * 1000),
          endTime: new Date(Number(course.endTime) * 1000),
          isActive: course.isActive
        });
      } catch (error) {
        console.error(`获取课程 ${courseId} 失败:`, error);
        setError(`课程 ID ${courseId} 不存在或无法访问`);
        setTimeout(() => {
          router.push('/studentViewCourses');
        }, 3000);
      }
    } catch (err) {
      console.error("加载课程详情失败:", err);
      setError('获取课程详情失败: ' + (err.message || err));
    }
  };

  // 处理图片上传
  const handleImageUpload = (info) => {
    const { fileList } = info;
    
    // 检查每个文件的状态，过滤掉出错的文件
    const validFileList = fileList.filter(file => file.status !== 'error');
    
    // 限制最多上传5张图片
    const filteredFileList = validFileList.slice(0, 5);
    
    const newImages = filteredFileList.map(file => {
      if (file.originFileObj) {
        // 验证图片大小
        const isLt5M = file.size / 1024 / 1024 < 5 || (file.originFileObj && file.originFileObj.size / 1024 / 1024 < 5);
        
        if (!isLt5M) {
          console.log('大图片被过滤：', file.name);
          showErrorModal(`图片 ${file.name || '未命名'} 大小不能超过5MB`);
          return null;
        }
        
        if (!file.url && !file.preview) {
          file.preview = URL.createObjectURL(file.originFileObj);
        }
        return {
          file: file.originFileObj,
          preview: file.preview || file.url,
          uid: file.uid
        };
      }
      return file;
    }).filter(file => file !== null); // 过滤掉不符合条件的文件
    
    setImages(newImages);
    
    // 如果尝试上传超过5张
    if (validFileList.length > 5) {
      appMessage.warning('最多只能上传5张图片');
    }
  };
  
  // 处理删除图片
  const handleImageRemove = (file) => {
    const filteredImages = images.filter(image => image.uid !== file.uid);
    setImages(filteredImages);
    
    // 如果图片已上传到IPFS，也清除对应的hash
    const filteredHashes = uploadedImageHashes.filter((_, index) => 
      images.findIndex(img => img.uid === file.uid) !== index
    );
    setUploadedImageHashes(filteredHashes);
  };
  
  // 处理图片预览
  const handlePreview = async (file) => {
    if (file.preview) {
      setPreviewImage(file.preview);
      setPreviewVisible(true);
    }
  };
  
  // 上传图片到Pinata IPFS
  const uploadToPinata = async (file) => {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT不存在，请配置环境变量');
    }
    
    // 再次检查文件大小
    if (file.size / 1024 / 1024 >= 5) {
      showErrorModal('图片大小不能超过5MB');
      throw new Error('图片大小不能超过5MB');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const options = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${PINATA_JWT}`
      }
    };
    
    try {
      const res = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        options
      );
      
      return res.data.IpfsHash;
    } catch (error) {
      console.error('上传到Pinata失败:', error);
      throw new Error(`上传图片失败: ${error.message}`);
    }
  };
  
  // 上传所有图片到IPFS
  const uploadImages = async () => {
    if (images.length === 0) {
      return []; // 如果没有图片，返回空数组
    }
    
    // 在上传前再次验证所有图片大小
    for (let image of images) {
      if (image.file && image.file.size / 1024 / 1024 >= 5) {
        showErrorModal(`图片 ${image.file.name || '未命名'} 大小不能超过5MB`);
        return [];
      }
    }
    
    setUploadingImages(true);
    setUploadProgress(0);
    const hashes = [];
    
    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const hash = await uploadToPinata(image.file);
        hashes.push(hash);
        
        // 更新进度
        setUploadProgress(Math.round(((i + 1) / images.length) * 100));
      }
      
      setUploadedImageHashes(hashes);
      appMessage.success('图片上传成功！');
      return hashes;
    } catch (error) {
      console.error('上传图片失败:', error);
      appMessage.error(`上传图片失败: ${error.message}`);
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  // 提交评价
  const handleSubmitEvaluation = async (formValues) => {
    // 不再需要e.preventDefault()
    setError('');
    setSuccessMessage('');
    setSubmitting(true);
    
    try {
      // 验证输入
      if (!content.trim()) {
        modal.error({
          title: '表单验证错误',
          content: '请输入评价内容',
          centered: true
        });
        setSubmitting(false);
        return;
      }

      // 检查评价内容长度
      if (content.trim().length < 10) {
        modal.error({
          title: '表单验证错误',
          content: '评价内容至少需要10个字',
          centered: true
        });
        setSubmitting(false);
        return;
      }
      
      // 显示处理中模态框
      const processingModal = modal.info({
        title: '处理中',
        content: (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: '16px' }}>正在提交您的评价到区块链...</p>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>请稍候，区块链交易需要一些时间确认</p>
          </div>
        ),
        icon: null,
        centered: true,
        footer: null,
        closable: false,
        maskClosable: false
      });
      
      // 上传图片到IPFS并获取哈希值
      let imageHashes = [];
      if (images.length > 0) {
        imageHashes = await uploadImages();
        
        if (imageHashes.length === 0 && images.length > 0) {
          processingModal.destroy();
          setError('图片上传失败，请重试');
          setSubmitting(false);
          return;
        }
      }
      
      // 确保参数类型正确
      const courseIdNumber = Number(courseId);
      // 评分应该是uint8类型(1-5)，不需要乘以100
      const ratingValue = Math.round(rating);
      const teachingRatingValue = Math.round(teachingRating);
      const contentRatingValue = Math.round(contentRating);
      const interactionRatingValue = Math.round(interactionRating);
      
      // 如果没有上传图片，提供一个空的哈希数组
      if (imageHashes.length === 0) {
        imageHashes = [""];
      }
      
      console.log("提交参数:", {
        courseIdNumber,
        content,
        imageHashes,
        ratingValue,
        teachingRatingValue,
        contentRatingValue,
        interactionRatingValue,
        isAnonymous
      });
      
      // 正确的参数顺序，与合约定义匹配
      const tx = await contract.submitEvaluation(
        courseIdNumber,
        content,
        imageHashes,
        ratingValue,
        teachingRatingValue,
        contentRatingValue,
        interactionRatingValue,
        isAnonymous
      );
      
      // 立即打印交易哈希作为存证凭证
      console.log('评价提交成功! 交易哈希(存证凭证):', tx.hash);
      
      // 保存交易哈希为状态
      setTransactionHash(tx.hash);
        
      // 等待交易确认
      const receipt = await tx.wait();
      
      // 关闭处理中模态框
      processingModal.destroy();
      
      // 保存区块号为状态
      setBlockNumber(receipt.blockNumber.toString());
      
      // 打印交易收据信息
      console.log('交易已确认! 区块号:', receipt.blockNumber);
      console.log('交易收据:', receipt);
      console.log('Gas使用量:', receipt.gasUsed.toString());
        
      // 保存交易记录到数据库
      try {
        const transactionData = {
          transaction_hash: tx.hash,
          block_number: receipt.blockNumber,
          wallet_address: userData.address,
          user_name: userData.name,
          function_name: 'submitEvaluation',
          gas_used: receipt.gasUsed.toString()
        };
        
        // 发送请求保存交易记录
        const saveResponse = await fetch('/api/saveTransaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData),
        });
        
        const saveResult = await saveResponse.json();
        
        if (saveResult.success) {
          console.log('交易记录已保存到数据库:', saveResult);
        } else {
          console.error('保存交易记录失败:', saveResult.message);
        }
      } catch (saveError) {
        console.error('保存交易记录时出错:', saveError);
        // 不阻止用户继续操作，只记录错误
      }
        
      // 显示成功消息 - 改为打开成功弹窗而不是设置消息
      setSuccessMessage('评价提交成功！交易已确认');
      setSuccessModalVisible(true);
    } catch (err) {
      console.error("提交评价失败:", err);
      
      // 特殊处理用户拒绝的情况
      if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        modal.warning({
          title: '交易已取消',
          content: '您取消了交易。如需提交评价，请重新填写并在MetaMask中确认。',
          centered: true
        });
      } else {
        modal.error({
          title: '提交失败',
          content: '提交评价失败: ' + (err.message || err),
          centered: true
        });
      }
      
      setSubmitting(false);
    }
  };

  // 添加处理确认跳转的函数
  const handleSuccessConfirm = () => {
    setSuccessModalVisible(false);
    router.push(`/studentCourseDetail/${courseId}`);
  };

  // 处理评分变化
  const handleRatingChange = (ratingType, newRating) => {
    switch (ratingType) {
      case 'overall':
        setRating(newRating);
        break;
      case 'teaching':
        setTeachingRating(newRating);
        break;
      case 'content':
        setContentRating(newRating);
        break;
      case 'interaction':
        setInteractionRating(newRating);
        break;
      default:
        break;
    }
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
  
  const goBack = () => {
    router.push(`/studentCourseDetail/${courseId}`);
  };

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

  // 显示错误弹窗
  const showErrorModal = (content) => {
    setErrorModalContent(content);
    setErrorModalVisible(true);
  };

  // 上传组件的配置
  const uploadProps = {
    listType: "picture-card",
    fileList: images.map(img => ({
      uid: img.uid,
      name: img.file ? img.file.name : 'image.png',
      status: 'done',
      url: img.preview,
    })),
    onChange: handleImageUpload,
    onRemove: handleImageRemove,
    onPreview: handlePreview,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      const isLt5M = file.size / 1024 / 1024 < 5;
      
      if (!isImage) {
        showErrorModal('只能上传图片文件!');
        return Promise.reject(new Error('只能上传图片文件!'));
      }
      
      if (!isLt5M) {
        showErrorModal('图片大小不能超过5MB');
        return Promise.reject(new Error('图片大小不能超过5MB'));
      }
      
      return false; // 阻止自动上传，但允许显示在列表中
    },
    showUploadList: {
      showPreviewIcon: true,
      showDownloadIcon: false,
      showRemoveIcon: true,
    },
    accept: 'image/*', // 只接受图片类型
    multiple: true, // 允许多选
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <p style={{ marginTop: '16px' }}>加载中，请稍候...</p>
        </div>
      </div>
    );
  }

  return (
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
            <StudentSidebar defaultSelectedKey="4" defaultOpenKey="sub3" />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页', onClick: () => router.push('/studentIndex'), className: 'clickable-breadcrumb' },
                { title: '课程列表', onClick: () => router.push('/studentViewCourses'), className: 'clickable-breadcrumb' },
                { title: course?.name, onClick: () => router.push(`/studentCourseDetail/${courseId}`), className: 'clickable-breadcrumb' },
                { title: '提交评价' }
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
              {!course ? (
                <Empty 
                  description="未找到课程" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <>
                  <Card
                    title={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FormOutlined style={{ color: colorPrimary, marginRight: '8px' }} />
                        <span>提交课程评价</span>
                      </div>
                    }
                    style={{ marginBottom: '20px' }}
                  >
                    <Row gutter={[16, 16]}>
                      <Col span={24}>
                        <Card 
                          type="inner" 
                          title="课程信息" 
                          style={{ marginBottom: '20px' }}
                        >
                          <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                                <BookOutlined style={{ marginRight: '8px', color: colorPrimary }} />
                                <Text strong>{course.name}</Text>
                              </div>
                              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                                <UserOutlined style={{ marginRight: '8px', color: colorPrimary }} />
                                <Text>教师: {course.teacherName}</Text>
                              </div>
                            </Col>
                            <Col xs={24} md={12}>
                              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                <CalendarOutlined style={{ marginRight: '8px', color: colorPrimary }} />
                                <Text>评价期间: {formatDateTime(course.startTime)} 至 {formatDateTime(course.endTime)}</Text>
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                      
                      <Col span={24}>
                        <Form layout="vertical" onFinish={handleSubmitEvaluation}>
                          <Card type="inner" title="评分" style={{ marginBottom: '20px' }}>
                            <Row gutter={[32, 16]}>
                              <Col xs={24} md={12} lg={6}>
                                <Form.Item label="总体评分">
                                  <Rate 
                                    defaultValue={rating}
                                    onChange={(value) => handleRatingChange('overall', value)}
                                  />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12} lg={6}>
                                <Form.Item label="教学质量">
                                  <Rate 
                                    defaultValue={teachingRating}
                                    onChange={(value) => handleRatingChange('teaching', value)}
                                  />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12} lg={6}>
                                <Form.Item label="内容设计">
                                  <Rate 
                                    defaultValue={contentRating}
                                    onChange={(value) => handleRatingChange('content', value)}
                                  />
                                </Form.Item>
                              </Col>
                              <Col xs={24} md={12} lg={6}>
                                <Form.Item label="师生互动">
                                  <Rate 
                                    defaultValue={interactionRating}
                                    onChange={(value) => handleRatingChange('interaction', value)}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                          
                          <Card type="inner" title="评价内容" style={{ marginBottom: '20px' }}>
                            <Form.Item>
                              <TextArea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="请输入您对该课程的评价..."
                                rows={6}
                                showCount
                                maxLength={1000}
                              />
                            </Form.Item>
                          </Card>
                          
                          <Card type="inner" title="上传图片（可选）" style={{ marginBottom: '20px' }}>
                            <Form.Item>
                              <Upload {...uploadProps}>
                                {images.length < 5 && (
                                  <div>
                                    <UploadOutlined />
                                    <div style={{ marginTop: 8 }}>上传</div>
                                  <div style={{ fontSize: '12px', color: '#ff4d4f' }}>
                                    (限制5MB)
                                  </div>
                                  </div>
                                )}
                              </Upload>
                              
                              {uploadingImages && (
                                <div style={{ marginTop: 16 }}>
                                  <Progress percent={uploadProgress} status="active" />
                                  <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                                    <LoadingOutlined style={{ marginRight: 8 }} />
                                    正在上传图片到IPFS...
                                  </Text>
                                </div>
                              )}
                              
                              {uploadedImageHashes.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                  <Text strong style={{ marginBottom: 8, display: 'block' }}>
                                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                                    图片已上传到IPFS:
                                  </Text>
                                  {uploadedImageHashes.map((hash, index) => (
                                    <Tag 
                                      key={index}
                                      color="success" 
                                      style={{ margin: '4px', wordBreak: 'break-all' }}
                                    >
                                      {hash.substring(0, 10)}...{hash.substring(hash.length - 10)}
                                    </Tag>
                                  ))}
                                </div>
                              )}
                              
                              <div style={{ marginTop: 12 }}>
                                <Text type="secondary">
                                支持上传的图片格式：JPG, PNG, GIF等，单张图片大小不能超过5MB，最多上传5张
                                </Text>
                                <br />
                                <Text type="secondary">
                                  图片将上传到IPFS分布式存储网络，上传后将永久保存且不可篡改
                                </Text>
                              </div>
                            </Form.Item>
                          </Card>
                          
                          <Card type="inner" title="隐私设置" style={{ marginBottom: '20px' }}>
                            <Form.Item>
                              <Checkbox 
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                              >
                                匿名评价（教师将无法看到您的姓名）
                              </Checkbox>
                            </Form.Item>
                          </Card>
                          
                          <Form.Item>
                            <Space>
                              <Button 
                                onClick={goBack}
                              >
                                取消
                              </Button>
                              <Button 
                                type="primary" 
                                htmlType="submit"
                                loading={submitting}
                                disabled={!content.trim() || uploadingImages}
                                icon={<SendOutlined />}
                              size="large"
                              style={{ 
                                height: '48px', 
                                fontSize: '16px', 
                                width: '180px',
                                background: content.trim() && !uploadingImages ? '#1a73e8' : undefined,
                                boxShadow: content.trim() && !uploadingImages ? '0 4px 12px rgba(26, 115, 232, 0.4)' : 'none'
                              }}
                              >
                                提交评价
                              </Button>
                            </Space>
                          </Form.Item>
                        </Form>
                      </Col>
                    </Row>
                  </Card>
                </>
              )}

              {/* 图片预览模态框 */}
              <Modal
              open={previewVisible}
                title="图片预览"
                footer={null}
                onCancel={() => setPreviewVisible(false)}
              >
                <img alt="预览图片" style={{ width: '100%' }} src={previewImage} />
              </Modal>
            
            {/* 错误提示弹窗 */}
            <Modal
              open={errorModalVisible}
              title="错误提示"
              centered
              okText="确定"
              cancelButtonProps={{ style: { display: 'none' } }}
              onOk={() => setErrorModalVisible(false)}
              onCancel={() => setErrorModalVisible(false)}
            >
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '24px', color: '#ff4d4f', marginBottom: '16px' }}>
                  <span role="img" aria-label="close-circle">❌</span>
                </div>
                <p style={{ fontSize: '16px' }}>{errorModalContent}</p>
              </div>
            </Modal>

            {/* 添加成功提示弹窗 */}
            <Modal
              open={successModalVisible}
              title={<div style={{ textAlign: 'center', fontSize: '18px' }}>提交成功</div>}
              centered
              closable={false}
              maskClosable={false}
              width={500}
              footer={[
                <Button 
                  key="confirm" 
                  type="primary" 
                  onClick={handleSuccessConfirm}
                  icon={<CheckCircleOutlined />}
                  size="large"
                  style={{ width: '120px' }}
                >
                  确定
                </Button>
              ]}
              styles={{ body: { padding: '24px' } }}
            >
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '60px', color: '#52c41a', marginBottom: '24px' }}>
                  <CheckCircleOutlined />
                </div>
                <p style={{ fontSize: '18px', marginBottom: '16px', fontWeight: 'bold' }}>评价提交成功！</p>
                
                {transactionHash && (
                  <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '12px', borderRadius: '6px', marginBottom: '16px', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>区块链存证凭证：</div>
                    <div style={{ wordBreak: 'break-all', fontSize: '14px' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', display: 'inline-block', width: '80px' }}>交易哈希：</span>
                        <span>{transactionHash}</span>
                      </div>
                      {blockNumber && (
                        <div>
                          <span style={{ fontWeight: 'bold', display: 'inline-block', width: '80px' }}>区块号：</span>
                          <span>{blockNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <p style={{ fontSize: '14px', color: '#666', marginTop: '16px' }}>
                  您的评价已成功上链，数据不可篡改且永久存储！
                </p>
                <p style={{ fontSize: '14px', color: '#888', marginTop: '8px' }}>点击确定返回课程详情</p>
              </div>
            </Modal>
            </Content>
          </Layout>
        </Layout>
        <div className={styles.footer}>
          <p>© 2023 链评系统 - 基于区块链的教学评价系统</p>
        </div>
      </Layout>
  );
}

// 主页面组件，包装ConfigProvider和App上下文
export default function SubmitEvaluationPage({ params }) {
  const router = useRouter();
  
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8',
        },
      }}
    >
      <App>
        <SubmitEvaluationContent params={params} router={router} />
      </App>
    </ConfigProvider>
  );
} 