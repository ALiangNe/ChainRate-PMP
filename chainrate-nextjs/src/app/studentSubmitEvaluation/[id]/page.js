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
  Modal
} from 'antd';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Pinata API配置
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY || '';
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';

export default function SubmitEvaluationPage({ params }) {
  const router = useRouter();
  
  // 使用React.use()解包params参数，避免警告
  const resolvedParams = React.use(params);
  const courseId = resolvedParams.id;
  
  // 提前调用 useToken，确保Hook顺序一致
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
    // 限制最多上传5张图片
    const filteredFileList = fileList.slice(0, 5);
    
    const newImages = filteredFileList.map(file => {
      if (file.originFileObj) {
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
    });
    
    setImages(newImages);
    
    // 如果尝试上传超过5张
    if (fileList.length > 5) {
      message.warning('最多只能上传5张图片');
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
      message.success('图片上传成功！');
      return hashes;
    } catch (error) {
      console.error('上传图片失败:', error);
      message.error(`上传图片失败: ${error.message}`);
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
        setError('请输入评价内容');
        setSubmitting(false);
        return;
      }
      
      // 上传图片到IPFS并获取哈希值
      let imageHashes = [];
      if (images.length > 0) {
        message.loading('正在上传图片到IPFS...', 0);
        imageHashes = await uploadImages();
        message.destroy();
        
        if (imageHashes.length === 0 && images.length > 0) {
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
        imageHashes,     // 真实的IPFS哈希值数组
        ratingValue,     // 第4个参数是rating (1-5)
        teachingRatingValue,
        contentRatingValue,
        interactionRatingValue,
        isAnonymous
      });
      
      // 正确的参数顺序，与合约定义匹配
      const tx = await contract.submitEvaluation(
        courseIdNumber,
        content,
        imageHashes,     // 真实的IPFS哈希值数组
        ratingValue,     // 第4个参数是rating (1-5)
        teachingRatingValue,
        contentRatingValue,
        interactionRatingValue,
        isAnonymous
      );
        
      // 等待交易确认
      await tx.wait();
        
      // 显示成功消息
      setSuccessMessage('评价提交成功！');
        
      // 3秒后重定向回课程详情页
      setTimeout(() => {
        router.push(`/studentCourseDetail/${courseId}`);
      }, 3000);
    } catch (err) {
      console.error("提交评价失败:", err);
      
      // 特殊处理用户拒绝的情况
      if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        setError('您取消了交易。如需提交评价，请重新填写并在MetaMask中确认。');
      } else {
        setError('提交评价失败: ' + (err.message || err));
      }
      
      setSubmitting(false);
    }
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

  // 侧边栏菜单项
  // const siderItems = [
  //   {
  //     key: 'sub1',
  //     icon: React.createElement(UserOutlined),
  //     label: '个人中心',
  //     children: [
  //       {
  //         key: '1',
  //         label: '个人信息',
  //         onClick: () => router.push('/studentIndex')
  //       }
  //     ],
  //   },
  //   {
  //     key: 'sub2',
  //     icon: React.createElement(BookOutlined),
  //     label: '课程管理',
  //     children: [
  //       {
  //         key: '2',
  //         label: '查看课程',
  //         onClick: () => router.push('/studentViewCourses')
  //       }
  //     ],
  //   },
  //   {
  //     key: 'sub3',
  //     icon: React.createElement(CommentOutlined),
  //     label: '评价管理',
  //     children: [
  //       {
  //         key: '3',
  //         label: '我的评价',
  //         onClick: () => router.push('/studentMyEvaluation')
  //       },
  //       {
  //         key: '4',
  //         label: '提交评价',
  //         onClick: () => router.push('/submit-evaluation')
  //       }
  //     ],
  //   }
  // ];

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
        message.error('只能上传图片文件!');
        return Upload.LIST_IGNORE;
      }
      
      if (!isLt5M) {
        message.error('图片必须小于5MB!');
        return Upload.LIST_IGNORE;
      }
      
      return false; // 阻止自动上传
    },
    showUploadList: {
      showPreviewIcon: true,
      showDownloadIcon: false,
      showRemoveIcon: true,
    },
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中，请稍候..." />
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8',
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
              
              {successMessage && (
                <Alert
                  message="成功"
                  description={successMessage}
                  type="success"
                  showIcon
                  style={{ marginBottom: '20px' }}
                  closable
                  onClose={() => setSuccessMessage('')}
                />
              )}
              
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
                                  支持上传的图片格式：JPG, PNG, GIF等，单张图片不超过5MB，最多上传5张
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
                visible={previewVisible}
                title="图片预览"
                footer={null}
                onCancel={() => setPreviewVisible(false)}
              >
                <img alt="预览图片" style={{ width: '100%' }} src={previewImage} />
              </Modal>
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