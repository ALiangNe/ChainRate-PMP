'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../../contracts/ChainRate.json';
import ChainRateAddress from '../../../contracts/ChainRate-address.json';
import styles from './page.module.css';
import Image from 'next/image';
import React from 'react';
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
  StarFilled
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
  message
} from 'antd';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function SubmitEvaluationPage({ params }) {
  const router = useRouter();
  const courseId = params.id;
  
  // 提前调用 useToken，确保Hook顺序一致
  const { token } = theme.useToken();
  const { colorBgContainer, borderRadiusLG, colorPrimary } = token;
  
  // 用户身份信息
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
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
          role: userRole
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
  };
  
  // 上传图片到IPFS或其他存储服务（实际应用中应实现）
  const uploadImages = async () => {
    // 这里应该实现实际的上传逻辑
    // 例如上传到IPFS，并返回哈希值数组
    
    if (images.length === 0) {
      return []; // 确保返回空数组
    }
    
    // 模拟上传，返回图片内容的哈希
    // 在实际应用中，应该使用IPFS或其他存储服务
    return Promise.all(images.map(async (image) => {
      // 示例：返回随机哈希，实际应用中替换为真实上传逻辑
      return `image_hash_${Math.random().toString(36).substring(2, 15)}`;
    }));
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
      
      // 确保参数类型正确
      const courseIdNumber = Number(courseId);
      // 评分应该是uint8类型(1-5)，不需要乘以100
      const ratingValue = Math.round(rating);
      const teachingRatingValue = Math.round(teachingRating);
      const contentRatingValue = Math.round(contentRating);
      const interactionRatingValue = Math.round(interactionRating);
      
      // 创建空的字符串数组 - 对应合约中的string[]类型
      const imageHashes = images.length > 0 
        ? images.map((_, index) => `image_hash_${index}_${Date.now()}`) // 临时模拟哈希值
        : ["empty_image_hash"]; // 空字符串数组
      
      console.log("提交参数:", {
        courseIdNumber,
        content,
        imageHashes,     // 第3个参数是imageHashes
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
        imageHashes,     // 第3个参数是imageHashes
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

  // 侧边栏菜单项
  const siderItems = [
    {
      key: 'sub1',
      icon: React.createElement(UserOutlined),
      label: '个人中心',
      children: [
        {
          key: '1',
          label: '个人信息',
          onClick: () => router.push('/studentIndex')
        }
      ],
    },
    {
      key: 'sub2',
      icon: React.createElement(BookOutlined),
      label: '课程管理',
      children: [
        {
          key: '2',
          label: '查看课程',
          onClick: () => router.push('/studentViewCourses')
        }
      ],
    },
    {
      key: 'sub3',
      icon: React.createElement(CommentOutlined),
      label: '评价管理',
      children: [
        {
          key: '3',
          label: '我的评价',
          onClick: () => router.push('/studentMyEvaluation')
        },
        {
          key: '4',
          label: '提交评价',
          onClick: () => router.push('/submit-evaluation')
        }
      ],
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userRoleHash');
    router.push('/login');
  };

  // 上传组件的配置
  const uploadProps = {
    listType: "picture-card",
    fileList: images.map(img => ({
      uid: img.uid,
      name: 'image.png',
      status: 'done',
      url: img.preview,
    })),
    onChange: handleImageUpload,
    onRemove: handleImageRemove,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      const isLt5M = file.size / 1024 / 1024 < 5;
      
      if (!isImage) {
        message.error('只能上传图片文件!');
      }
      
      if (!isLt5M) {
        message.error('图片必须小于5MB!');
      }
      
      return false; // 阻止自动上传
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
            <div className={styles.logo} />
            <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
              链评系统（ChainRate）
            </div>
          </div>
          <div style={{ color: 'white', marginRight: '20px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '15px' }}>欢迎, {userData.name}</span>
            <Tooltip title="退出登录">
              <LogoutOutlined onClick={handleLogout} style={{ fontSize: '18px', cursor: 'pointer' }} />
            </Tooltip>
          </div>
        </Header>
        <Layout>
          <Sider width={200} style={{ background: colorBgContainer }}>
            <Menu
              mode="inline"
              defaultSelectedKeys={['4']}
              defaultOpenKeys={['sub3']}
              style={{ height: '100%', borderRight: 0 }}
              items={siderItems}
            />
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
                              <Text type="secondary">支持上传的图片格式：JPG, PNG, GIF等，单张图片不超过5MB，最多上传5张</Text>
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
                                disabled={!content.trim()}
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