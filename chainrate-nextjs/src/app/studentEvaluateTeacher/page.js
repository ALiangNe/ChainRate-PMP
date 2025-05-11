'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import Image from 'next/image';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import ChainRate02ABI from '../../contracts/ChainRate02.json';
import ChainRate02Address from '../../contracts/ChainRate02-address.json';
import styles from './page.module.css';
import React from 'react';
import axios from 'axios'; 
import UserAvatar from '../components/UserAvatar';
import StudentSidebar from '../components/StudentSidebar';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  FormOutlined, 
  LogoutOutlined,
  TeamOutlined,
  StarOutlined,
  StarFilled,
  CalendarOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  FileTextOutlined,
  UploadOutlined,
  DeleteOutlined,
  PictureOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  BulbOutlined,
  HeartOutlined,
  ExperimentOutlined,
  ReadOutlined,
  ClockCircleOutlined
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
  List,
  Avatar,
  Select
} from 'antd';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Pinata API配置
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY || '';
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';

export default function StudentEvaluateTeacherPage() {
  const router = useRouter();
  
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
  
  // 教师列表状态
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasJoinedCourses, setHasJoinedCourses] = useState(false);
  
  // 评价表单相关状态
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [evaluationContent, setEvaluationContent] = useState('');
  const [overallRating, setOverallRating] = useState(0);
  const [teachingAbilityRating, setTeachingAbilityRating] = useState(0);
  const [teachingAttitudeRating, setTeachingAttitudeRating] = useState(0);
  const [teachingMethodRating, setTeachingMethodRating] = useState(0);
  const [academicLevelRating, setAcademicLevelRating] = useState(0);
  const [guidanceAbilityRating, setGuidanceAbilityRating] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // 图片上传状态
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageHashes, setUploadedImageHashes] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [contract02, setContract02] = useState(null);
  
  // 评价状态
  const [evaluatedTeachers, setEvaluatedTeachers] = useState([]);

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
        
        // 加载教师列表
        await loadTeacherList(chainRateContract, chainRate02Contract, await signer.getAddress());
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router]);

  // 加载学生已选课程的教师列表
  const loadTeacherList = async (mainContract, teacherContract, studentAddress) => {
    try {
      setLoading(true);
      console.log("加载教师列表...");
      
      // 获取学生已加入的课程ID
      const studentCourses = await mainContract.getStudentCourses(studentAddress);
      console.log("学生课程:", studentCourses);
      
      if (studentCourses.length === 0) {
        console.log("学生未加入任何课程");
        setHasJoinedCourses(false);
        setLoading(false);
        return;
      }
      
      setHasJoinedCourses(true);
      
      // 获取所有教师地址集合
      const teacherAddresses = new Set();
      const teacherAllCourses = new Map(); // 教师地址 -> 所有课程ID数组
      const teacherActiveCourses = new Map(); // 教师地址 -> 未结束的课程ID数组

      // 获取当前时间戳
      const currentTime = Math.floor(Date.now() / 1000);
      
      for (let i = 0; i < studentCourses.length; i++) {
        const courseId = studentCourses[i];
        // 获取课程详情
        const course = await mainContract.courses(courseId);
        const teacherAddress = course.teacher;
        const endTime = Number(course.endTime);
        
        // 添加所有教师
        teacherAddresses.add(teacherAddress);
        
        // 记录教师的所有课程
        if (!teacherAllCourses.has(teacherAddress)) {
          teacherAllCourses.set(teacherAddress, []);
        }
        teacherAllCourses.get(teacherAddress).push({
          id: courseId,
          name: course.name,
          endTime: endTime
        });
        
        // 记录教师的未结束课程
        if (endTime > currentTime) {
          if (!teacherActiveCourses.has(teacherAddress)) {
            teacherActiveCourses.set(teacherAddress, []);
          }
          teacherActiveCourses.get(teacherAddress).push({
            id: courseId,
            name: course.name,
            endTime: endTime
          });
        }
      }
      
      console.log("所有教师地址:", Array.from(teacherAddresses));
      console.log("教师的所有课程:", teacherAllCourses);
      console.log("教师的未结束课程:", teacherActiveCourses);
      
      // 获取已评价的教师
      const evaluatedTeacherList = [];
      for (const teacherAddress of teacherAddresses) {
        const hasEvaluated = await teacherContract.isTeacherEvaluated(studentAddress, teacherAddress);
        if (hasEvaluated) {
          evaluatedTeacherList.push(teacherAddress);
        }
      }
      
      setEvaluatedTeachers(evaluatedTeacherList);
      
      // 获取教师详细信息
      const teacherList = [];
      for (const teacherAddress of teacherAddresses) {
        try {
          // 获取教师用户信息
          const teacherInfo = await mainContract.getUserInfo(teacherAddress);
          
          // 获取教师所有课程和未结束课程
          const allCourses = teacherAllCourses.get(teacherAddress) || [];
          const activeCourses = teacherActiveCourses.get(teacherAddress) || [];
          
          // 判断教师是否有可评价的课程
          const hasActiveCourses = activeCourses.length > 0;
          
          teacherList.push({
            address: teacherAddress,
            name: teacherInfo[0],
            phone: teacherInfo[1],
            email: teacherInfo[2],
            college: teacherInfo[3],
            avatar: teacherInfo[6],
            courses: allCourses, // 所有课程
            activeCourses: activeCourses, // 未结束的课程
            hasActiveCourses: hasActiveCourses, // 是否有未结束的课程
            hasEvaluated: evaluatedTeacherList.includes(teacherAddress)
          });
        } catch (error) {
          console.error(`获取教师信息失败 ${teacherAddress}:`, error);
        }
      }
      
      console.log("教师列表:", teacherList);
      setTeachers(teacherList);
      
      if (teacherList.filter(teacher => teacher.hasActiveCourses).length === 0) {
        message.info('没有可评价的教师，所有课程已结束评价期');
      }
      
    } catch (err) {
      console.error("加载教师列表失败:", err);
      setError('获取教师列表失败: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };
  
  // 预览图片
  const handlePreview = (file) => {
    setPreviewImage(file.url || file.thumbUrl);
    setPreviewVisible(true);
  };
  
  // 关闭预览
  const handleCancel = () => setPreviewVisible(false);
  
  // 选择教师进行评价
  const selectTeacher = (teacher) => {
    if (teacher.hasEvaluated) {
      message.warning('您已经评价过这位教师了');
      return;
    }
    
    // 检查教师是否有未结束的课程
    if (!teacher.hasActiveCourses) {
      message.warning('该教师的所有课程已经结束评价期，无法提交评价');
      return;
    }
    
    setSelectedTeacher(teacher);
    // 重置评价表单
    setEvaluationContent('');
    setOverallRating(0);
    setTeachingAbilityRating(0);
    setTeachingAttitudeRating(0);
    setTeachingMethodRating(0);
    setAcademicLevelRating(0);
    setGuidanceAbilityRating(0);
    setIsAnonymous(false);
    setImages([]);
    setUploadedImageHashes([]);
  };
  
  // 取消选择教师
  const cancelSelectTeacher = () => {
    setSelectedTeacher(null);
  };
  
  // 上传图片前检查
  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('只能上传JPG/PNG格式的图片!');
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过2MB!');
    }
    return isJpgOrPng && isLt2M;
  };
  
  // 处理图片上传
  const handleUploadChange = ({ fileList }) => {
    setImages(fileList);
  };
  
  // 上传图片到IPFS
  const uploadToIPFS = async () => {
    if (images.length === 0) return [];
    
    setUploadingImages(true);
    setUploadProgress(0);
    
    const uploadedHashes = [];
    
    try {
      for (let i = 0; i < images.length; i++) {
        const file = images[i].originFileObj;
        
        // 准备表单数据
        const formData = new FormData();
        formData.append('file', file);
        
        // 设置Pinata上传选项
        const options = JSON.stringify({
          cidVersion: 0,
        });
        formData.append('pinataOptions', options);
        
        // 设置上传进度
        const progressPercentage = Math.round(((i + 1) / images.length) * 100);
        setUploadProgress(progressPercentage);
        
        // 上传到Pinata
        const res = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          formData,
          {
            maxBodyLength: "Infinity",
            headers: {
              'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
              Authorization: `Bearer ${PINATA_JWT}`
            }
          }
        );
        
        console.log("IPFS 上传结果:", res.data);
        uploadedHashes.push(res.data.IpfsHash);
      }
      
      console.log("所有图片已上传:", uploadedHashes);
      setUploadedImageHashes(uploadedHashes);
      message.success('所有图片上传成功!');
      return uploadedHashes;
    } catch (err) {
      console.error("上传图片到IPFS失败:", err);
      message.error('上传图片失败: ' + (err.message || err));
      return [];
    } finally {
      setUploadingImages(false);
    }
  };
  
  // 提交评价
  const submitEvaluation = async () => {
    if (!selectedTeacher) {
      Modal.error({
        title: '提示',
        content: (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '24px', color: '#ff4d4f', marginBottom: '16px' }}>
              <ExclamationCircleOutlined />
            </div>
            <p style={{ fontSize: '16px' }}>请选择要评价的教师</p>
          </div>
        ),
        centered: true,
      });
      return;
    }

    // 首先检查评价内容
    if (!evaluationContent.trim()) {
      Modal.error({
        title: '提示',
        content: (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '24px', color: '#ff4d4f', marginBottom: '16px' }}>
              <ExclamationCircleOutlined />
            </div>
            <p style={{ fontSize: '16px' }}>请输入评价内容</p>
          </div>
        ),
        centered: true,
      });
      return;
    }
    
    // 检查所有必填评分项
    if (!overallRating || !teachingAbilityRating || !teachingAttitudeRating || 
        !teachingMethodRating || !academicLevelRating || !guidanceAbilityRating) {
      Modal.error({
        title: '提示',
        content: (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '24px', color: '#ff4d4f', marginBottom: '16px' }}>
              <ExclamationCircleOutlined />
            </div>
            <p style={{ fontSize: '16px' }}>请完成所有必填评分项</p>
          </div>
        ),
        centered: true,
      });
      return;
    }
    
    // 再次验证课程是否已结束
    const currentTime = Math.floor(Date.now() / 1000);
    const activeCourses = selectedTeacher.activeCourses.filter(course => Number(course.endTime) > currentTime);
    
    if (activeCourses.length === 0) {
      message.error('该教师的所有课程已经结束评价期，无法提交评价');
      return;
    }
    
    setSubmitting(true);
    setError('');
    setSuccessMessage('');
    
    try {
      // 上传评价内容到IPFS
      console.log("准备上传评价内容...");
      
      // 准备JSON对象
      const evaluationData = {
        content: evaluationContent,
        timestamp: new Date().toISOString(),
      };
      
      // 转为JSON字符串
      const jsonData = JSON.stringify(evaluationData);
      
      // 上传到Pinata
      const res = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        jsonData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${PINATA_JWT}`
          }
        }
      );
      
      console.log("评价内容上传成功:", res.data);
      const contentHash = res.data.IpfsHash;
      
      // 上传图片到IPFS
      let imageHashes = [];
      if (images.length > 0) {
        console.log("准备上传图片...");
        imageHashes = await uploadToIPFS();
      }
      
      console.log("提交教师评价到区块链...");
      console.log("教师地址:", selectedTeacher.address);
      console.log("评价参数:", {
        contentHash,
        imageHashes,
        overallRating,
        teachingAbilityRating,
        teachingAttitudeRating,
        teachingMethodRating,
        academicLevelRating,
        guidanceAbilityRating,
        isAnonymous
      });
      
      // 调用合约提交评价
      const tx = await contract02.submitTeacherEvaluation(
        selectedTeacher.address,
        contentHash,
        imageHashes,
        overallRating,
        teachingAbilityRating,
        teachingAttitudeRating,
        teachingMethodRating,
        academicLevelRating,
        guidanceAbilityRating,
        isAnonymous
      );
      
      console.log("等待交易确认...");
      await tx.wait();
      
      console.log("评价提交成功!");
      setSuccessMessage(`成功提交对${selectedTeacher.name}教师的评价！`);
      
      // 重置表单
      setSelectedTeacher(null);
      setEvaluationContent('');
      setOverallRating(0);
      setTeachingAbilityRating(0);
      setTeachingAttitudeRating(0);
      setTeachingMethodRating(0);
      setAcademicLevelRating(0);
      setGuidanceAbilityRating(0);
      setIsAnonymous(false);
      setImages([]);
      setUploadedImageHashes([]);
      
      // 重新加载教师列表
      await loadTeacherList(contract, contract02, userData.address);
      
    } catch (err) {
      console.error("提交评价失败:", err);
      setError('提交评价失败: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };
  
  // 退出登录
  const handleLogout = () => {
    // 清除localStorage中的用户信息
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userCollege');
    localStorage.removeItem('userMajor');
    localStorage.removeItem('userGrade');
    localStorage.removeItem('userAvatar');
    
    // 重定向到登录页
    router.push('/login');
  };
  
  // 定义评分项描述
  const ratingDescriptions = {
    overall: ['很差', '较差', '一般', '良好', '优秀'],
    teachingAbility: ['讲解不清', '讲解较差', '讲解一般', '讲解清晰', '讲解精彩'],
    teachingAttitude: ['态度冷漠', '态度较差', '态度一般', '态度认真', '态度极佳'],
    teachingMethod: ['方法单一', '方法较少', '方法一般', '方法多样', '方法丰富'],
    academicLevel: ['学术较弱', '学术一般', '学术良好', '学术扎实', '学术卓越'],
    guidanceAbility: ['指导不足', '指导较少', '指导一般', '指导充分', '指导出色']
  };

  const {
    token: { colorBgContainer, borderRadiusLG, colorPrimary },
  } = theme.useToken();

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
            <StudentSidebar defaultSelectedKey="5" defaultOpenKey="sub3" />
          </Sider>
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
              ) : successMessage ? (
                <Alert
                  message="成功"
                  description={successMessage}
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                  action={
                    <Button type="primary" onClick={() => setSuccessMessage('')}>
                      确定
                    </Button>
                  }
                />
              ) : !hasJoinedCourses ? (
                <Empty
                  description={
                    <span>
                      您还没有加入任何课程，无法评价教师。
                      <br />
                      请先加入课程后再进行教师评价。
                    </span>
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button 
                    type="primary" 
                    icon={<BookOutlined />}
                    onClick={() => router.push('/studentViewCourses')}
                  >
                    浏览课程
                  </Button>
                </Empty>
              ) : selectedTeacher ? (
                <div>
                  <Button 
                    type="link" 
                    icon={<ArrowLeftOutlined />} 
                    onClick={cancelSelectTeacher}
                    style={{ marginBottom: 16, padding: 0 }}
                  >
                    返回教师列表
                  </Button>
                  
                  <Card title={`评价教师: ${selectedTeacher.name}`} style={{ marginBottom: 16 }}>
                    <Row gutter={[16, 16]}>
                      <Col span={24} md={8}>
                        <Card bordered={false}>
                          <div style={{ textAlign: 'center' }}>
                            <Avatar 
                              size={80} 
                              src={selectedTeacher.avatar ? `${selectedTeacher.avatar}` : null}
                              icon={!selectedTeacher.avatar && <UserOutlined />} 
                            />
                            <div style={{ marginTop: 16 }}>
                              <Title level={4}>{selectedTeacher.name}</Title>
                              <Paragraph>所属学院: {selectedTeacher.college}</Paragraph>
                              <div style={{ marginTop: 8 }}>
                                <Tag color="blue">{selectedTeacher.email}</Tag>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Col>
                      <Col span={24} md={16}>
                        <Card title="您学习的相关课程" bordered={false}>
                          <List
                            dataSource={selectedTeacher.courses}
                            renderItem={item => (
                              <List.Item>
                                <List.Item.Meta
                                  avatar={<BookOutlined style={{ fontSize: 24, color: colorPrimary }} />}
                                  title={item.name}
                                  description={`课程ID: ${item.id}`}
                                />
                              </List.Item>
                            )}
                          />
                        </Card>
                      </Col>
                    </Row>
                  </Card>
                  
                  <Card title="多维度评价表单" style={{ marginBottom: 16 }}>
                    <Form layout="vertical">
                      <Form.Item label="评价内容" required tooltip="请详细描述您对该教师的评价">
                        <TextArea 
                          rows={6} 
                          placeholder="请输入您对该教师的评价内容..." 
                          value={evaluationContent}
                          onChange={e => setEvaluationContent(e.target.value)}
                        />
                      </Form.Item>
                      
                      <Form.Item 
                        label="总体评分" 
                        tooltip="综合考虑所有因素，对该教师的总体评价"
                        required
                      >
                        <Rate 
                          tooltips={ratingDescriptions.overall}
                          value={overallRating}
                          onChange={setOverallRating}
                          character={<StarFilled />}
                        />
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {overallRating ? ratingDescriptions.overall[overallRating - 1] : '请评分'}
                        </Text>
                      </Form.Item>
                      
                      <Row gutter={[16, 16]}>
                        <Col span={24} md={12}>
                          <Form.Item 
                            label={
                              <span>
                                <BulbOutlined /> 教学能力
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                                  (讲课清晰度、知识掌握程度等)
                                </Text>
                              </span>
                            }
                            required
                          >
                            <Rate 
                              tooltips={ratingDescriptions.teachingAbility}
                              value={teachingAbilityRating}
                              onChange={setTeachingAbilityRating}
                            />
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              {teachingAbilityRating ? ratingDescriptions.teachingAbility[teachingAbilityRating - 1] : '请评分'}
                            </Text>
                          </Form.Item>
                        </Col>
                        <Col span={24} md={12}>
                          <Form.Item 
                            label={
                              <span>
                                <HeartOutlined /> 教学态度
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                                  (认真负责、关注学生)
                                </Text>
                              </span>
                            }
                            required
                          >
                            <Rate 
                              tooltips={ratingDescriptions.teachingAttitude}
                              value={teachingAttitudeRating}
                              onChange={setTeachingAttitudeRating}
                            />
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              {teachingAttitudeRating ? ratingDescriptions.teachingAttitude[teachingAttitudeRating - 1] : '请评分'}
                            </Text>
                          </Form.Item>
                        </Col>
                        <Col span={24} md={12}>
                          <Form.Item 
                            label={
                              <span>
                                <ExperimentOutlined /> 教学方法
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                                  (教学手段多样性、互动性)
                                </Text>
                              </span>
                            }
                            required
                          >
                            <Rate 
                              tooltips={ratingDescriptions.teachingMethod}
                              value={teachingMethodRating}
                              onChange={setTeachingMethodRating}
                            />
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              {teachingMethodRating ? ratingDescriptions.teachingMethod[teachingMethodRating - 1] : '请评分'}
                            </Text>
                          </Form.Item>
                        </Col>
                        <Col span={24} md={12}>
                          <Form.Item 
                            label={
                              <span>
                                <ReadOutlined /> 学术水平
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                                  (学术研究能力、前沿知识掌握)
                                </Text>
                              </span>
                            }
                            required
                          >
                            <Rate 
                              tooltips={ratingDescriptions.academicLevel}
                              value={academicLevelRating}
                              onChange={setAcademicLevelRating}
                            />
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              {academicLevelRating ? ratingDescriptions.academicLevel[academicLevelRating - 1] : '请评分'}
                            </Text>
                          </Form.Item>
                        </Col>
                        <Col span={24} md={12}>
                          <Form.Item 
                            label={
                              <span>
                                <TrophyOutlined /> 指导能力
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                                  (指导学生解决问题的能力)
                                </Text>
                              </span>
                            }
                            required
                          >
                            <Rate 
                              tooltips={ratingDescriptions.guidanceAbility}
                              value={guidanceAbilityRating}
                              onChange={setGuidanceAbilityRating}
                            />
                            <Text type="secondary" style={{ marginLeft: 8 }}>
                              {guidanceAbilityRating ? ratingDescriptions.guidanceAbility[guidanceAbilityRating - 1] : '请评分'}
                            </Text>
                          </Form.Item>
                        </Col>
                      </Row>
                      
                      <Form.Item label="上传图片(可选)" tooltip="上传图片可以更好地说明您的评价">
                        <Upload
                          listType="picture-card"
                          fileList={images}
                          beforeUpload={beforeUpload}
                          onChange={handleUploadChange}
                          onPreview={handlePreview}
                          customRequest={({ file, onSuccess }) => {
                            setTimeout(() => {
                              onSuccess("ok");
                            }, 0);
                          }}
                        >
                          {images.length >= 5 ? null : (
                            <div>
                              <PictureOutlined />
                              <div style={{ marginTop: 8 }}>上传</div>
                            </div>
                          )}
                        </Upload>
                        <Modal open={previewVisible} footer={null} onCancel={handleCancel}>
                          <img alt="评价图片" style={{ width: '100%' }} src={previewImage} />
                        </Modal>
                        {uploadingImages && (
                          <div style={{ marginTop: 16 }}>
                            <Progress percent={uploadProgress} status="active" />
                          </div>
                        )}
                      </Form.Item>
                      
                      <Form.Item>
                        <Checkbox 
                          checked={isAnonymous} 
                          onChange={e => setIsAnonymous(e.target.checked)}
                        >
                          匿名评价
                        </Checkbox>
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          (选择匿名后，其他用户将无法看到您的个人信息)
                        </Text>
                      </Form.Item>
                      
                      <Form.Item>
                        <Button 
                          type="primary" 
                          icon={<SendOutlined />}
                          onClick={submitEvaluation}
                          loading={submitting}
                          block
                        >
                          提交评价
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </div>
              ) : (
                <div>
                  <Title level={4}>选择要评价的教师</Title>
                  <Paragraph type="secondary">
                    以下是您学习课程的教师列表，请选择一位教师进行多维度评价。
                  </Paragraph>
                  
                  <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                    {teachers.map((teacher) => (
                      <Col xs={24} sm={12} md={8} key={teacher.address}>
                        <Card
                          hoverable
                          className={`${styles.teacherCard} ${!teacher.hasActiveCourses && !teacher.hasEvaluated ? styles.expiredCard : ''}`}
                          cover={
                            <div className={styles.teacherCardCover}>
                              <Avatar 
                                size={64} 
                                src={teacher.avatar || null}
                                icon={!teacher.avatar && <UserOutlined />} 
                                className={styles.teacherAvatar}
                              />
                              <div className={styles.teacherInfo}>
                                <div className={styles.teacherName}>
                                  {teacher.name}
                                  {teacher.hasEvaluated && (
                                    <Tag color="success" style={{ marginLeft: 8 }}>已评价</Tag>
                                  )}
                                  {!teacher.hasActiveCourses && !teacher.hasEvaluated && (
                                    <Tag color="default" style={{ marginLeft: 8 }}>已截止</Tag>
                                  )}
                                </div>
                                <div className={styles.teacherCollege}>{teacher.college}</div>
                              </div>
                            </div>
                          }
                          actions={[
                            teacher.hasEvaluated ? (
                              <Tooltip title="已评价">
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                              </Tooltip>
                            ) : teacher.hasActiveCourses ? (
                              <Button 
                                type="primary" 
                                onClick={() => selectTeacher(teacher)}
                              >
                                评价教师
                              </Button>
                            ) : (
                              <Tooltip title="课程评价期已结束，无法评价">
                                <Button 
                                  disabled
                                  onClick={() => message.warning('该教师的所有课程已经结束评价期，无法提交评价')}
                                >
                                  已结束评价
                                </Button>
                              </Tooltip>
                            )
                          ]}
                        >
                          <div className={styles.courseList}>
                            <h4>教授课程：</h4>
                            <ul>
                              {teacher.courses.map((course) => {
                                // 检查课程是否已过评价期
                                const currentTime = Math.floor(Date.now() / 1000);
                                const isExpired = Number(course.endTime) <= currentTime;
                                
                                return (
                                  <li key={course.id}>
                                    {course.name}
                                    <div className={isExpired ? styles.courseEndTimeExpired : styles.courseEndTime}>
                                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                                      {isExpired ? '评价已截止: ' : '评价截止时间: '}
                                      {new Date(Number(course.endTime) * 1000).toLocaleString()}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
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