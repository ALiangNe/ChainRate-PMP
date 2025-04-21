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
  Tag
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
  ArrowLeftOutlined
} from '@ant-design/icons';
import StudentSidebar from '../components/StudentSidebar';
import UserAvatar from '../components/UserAvatar';
import styles from './page.module.css';
import axios from 'axios';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

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
  
  // 提交结果
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [feedbackId, setFeedbackId] = useState(null);
  
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
    setDocumentFiles(fileList);
  };
  
  // 处理图片上传
  const handleImageUpload = ({ fileList }) => {
    setImageFiles(fileList);
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
  
  // 上传文本内容到IPFS
  const uploadContentToIPFS = async (content) => {
    try {
      // 将内容转换为Blob
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], 'feedback-content.txt', { type: 'text/plain' });
      
      return await uploadToIPFS(file);
    } catch (err) {
      console.error('上传内容到IPFS失败:', err);
      throw err;
    }
  };
  
  // 提交表单
  const handleSubmit = async (values) => {
    if (!selectedCourse || !extensionContract) {
      message.error('提交失败: 请先选择课程');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // 上传内容到IPFS
      setUploading(true);
      const contentHash = await uploadContentToIPFS(values.content);
      
      // 上传文档到IPFS
      const documentHashes = documentFiles.length > 0 
        ? await uploadFilesToIPFS(documentFiles)
        : [];
      
      // 上传图片到IPFS
      const imageHashes = imageFiles.length > 0
        ? await uploadFilesToIPFS(imageFiles)
        : [];
      
      setUploading(false);
      
      // 调用合约提交反馈
      const tx = await extensionContract.submitCourseFeedback(
        selectedCourse.id,
        contentHash,
        documentHashes,
        imageHashes
      );
      
      // 等待交易确认
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
      message.error('提交反馈失败: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  // 返回课程页面
  const goBack = () => {
    router.push('/studentViewCourses');
  };
  
  // 上传文件之前的检查
  const beforeUpload = (file) => {
    // 文件类型和大小检查
    const isAllowedSize = file.size / 1024 / 1024 < 10; // 10MB 限制
    
    if (!isAllowedSize) {
      message.error('文件大小不能超过10MB!');
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
  
  // 成功提交后的UI
  if (submitSuccess) {
    return (
      <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
        <Layout style={{ minHeight: '100vh' }}>
          <StudentSidebar defaultSelectedKey="7" defaultOpenKey="sub3" />
          
          <Layout>
            <Header style={{ padding: 0, backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 30, paddingRight: 30 }}>
                <Breadcrumb
                  items={[
                    // { title: <HomeFilled />, href: '/studentIndex' },
                    { title: '首页', href: '/studentIndex' },
                    { title: '课程列表', href: '/studentViewCourses' },
                    { title: '提交课程反馈' },
                  ]}
                />
                <UserAvatar
                  username={userData.name}
                  avatar={userData.avatar}
                  onLogout={() => {
                    localStorage.clear();
                    router.push('/login');
                  }}
                />
              </div>
            </Header>
            
            <Content style={{ margin: '24px 16px', padding: '24px', background: '#fff', minHeight: 280 }}>
              <div className={styles.successContainer}>
                <div className={styles.successIcon}>
                  <CheckCircleOutlined className={styles.bigSuccessIcon} />
                </div>
                <Title level={2}>反馈提交成功！</Title>
                <Text className={styles.feedbackIdText}>
                  反馈ID: <Tag color="blue">{feedbackId}</Tag>
                </Text>
                <Paragraph className={styles.successMessage}>
                  您的课程反馈已成功提交到区块链，教师会在看到反馈后尽快回复。
                </Paragraph>
                <Space size="middle">
                  <Button 
                    type="primary" 
                    size="large"
                    icon={<BookOutlined />}
                    onClick={() => router.push('/studentViewCourses')}
                  >
                    返回课程列表
                  </Button>
                  <Button 
                    size="large" 
                    icon={<CommentOutlined />}
                    onClick={() => router.push('/studentMyEvaluation')}
                  >
                    查看我的评价
                  </Button>
                </Space>
              </div>
            </Content>
          </Layout>
        </Layout>
      </ConfigProvider>
    );
  }
  
  // 课程选择模式的UI
  if (courseSelectMode) {
    return (
      <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
        <Layout style={{ minHeight: '100vh' }}>
          <StudentSidebar defaultSelectedKey="7" defaultOpenKey="sub3" />
          
          <Layout>
            <Header style={{ padding: 0, backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 30, paddingRight: 30 }}>
                <Breadcrumb
                  items={[
                    // { title: <HomeFilled />, href: '/studentIndex' },
                    { title: '首页', href: '/studentIndex' },
                    { title: '评价管理', href: '/studentMyEvaluation' },
                    { title: '提交课程反馈' },
                  ]}
                />
                <UserAvatar
                  username={userData.name}
                  avatar={userData.avatar}
                  onLogout={() => {
                    localStorage.clear();
                    router.push('/login');
                  }}
                />
              </div>
            </Header>
            
            <Content style={{ margin: '24px 16px', padding: '24px', background: '#fff', minHeight: 280 }}>
              <div className={styles.pageHeader}>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  className={styles.backButton}
                  onClick={() => router.push('/studentViewCourses')}
                >
                  返回课程列表
                </Button>
                <Title level={2} className={styles.pageTitle}>选择要反馈的课程</Title>
              </div>
              
              <Alert
                message="请选择要提交反馈的课程"
                description="您需要先选择一个已加入的课程，然后才能提交反馈。课程反馈将发送给该课程的授课教师。"
                type="info"
                showIcon
                className={styles.alertInfo}
              />
              
              <div className={styles.courseGrid}>
                <Row gutter={[16, 16]}>
                  {studentCourses.length > 0 ? (
                    studentCourses.map(course => (
                      <Col xs={24} sm={12} md={8} key={course.id}>
                        <Card 
                          className={styles.courseCard}
                          hoverable
                          onClick={() => handleCourseSelect(course.id)}
                        >
                          <div className={styles.courseCardTitle}>
                            <Title level={4}>{course.name}</Title>
                            <Tag color={course.isActive ? "green" : "red"}>
                              {course.isActive ? "进行中" : "已结束"}
                            </Tag>
                          </div>
                          <div className={styles.courseCardInfo}>
                            <div className={styles.infoItem}>
                              <Text strong>课程ID: </Text>
                              <Text>{course.id}</Text>
                            </div>
                            <div className={styles.infoItem}>
                              <Text strong>教师: </Text>
                              <Text>{course.teacher.name}</Text>
                            </div>
                            <div className={styles.infoItem}>
                              <Text strong>院系: </Text>
                              <Text>{course.teacher.college}</Text>
                            </div>
                            <div className={styles.infoItem}>
                              <Text strong>选课人数: </Text>
                              <Text>{course.studentCount}</Text>
                            </div>
                          </div>
                          <Button 
                            type="primary" 
                            className={styles.selectButton}
                          >
                            选择此课程
                          </Button>
                        </Card>
                      </Col>
                    ))
                  ) : (
                    <Col span={24}>
                      <div className={styles.emptyCourses}>
                        <Title level={4}>您尚未加入任何课程</Title>
                        <Paragraph>请先加入课程后再提交反馈</Paragraph>
                        <Button 
                          type="primary" 
                          icon={<BookOutlined />}
                          onClick={() => router.push('/studentViewCourses')}
                        >
                          查看课程列表
                        </Button>
                      </div>
                    </Col>
                  )}
                </Row>
              </div>
            </Content>
          </Layout>
        </Layout>
      </ConfigProvider>
    );
  }
  
  // 反馈表单模式UI
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <Layout style={{ minHeight: '100vh' }}>
        <StudentSidebar defaultSelectedKey="7" defaultOpenKey="sub3" />
        
        <Layout>
          <Header style={{ padding: 0, backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 30, paddingRight: 30 }}>
              <Breadcrumb
                items={[
                  // { title: <HomeFilled />, href: '/studentIndex' },
                  { title: '首页', href: '/studentIndex' },
                  { title: '评价管理' },
                  { title: '提交课程反馈' },
                ]}
              />
              <UserAvatar
                username={userData.name}
                avatar={userData.avatar}
                onLogout={() => {
                  localStorage.clear();
                  router.push('/login');
                }}
              />
            </div>
          </Header>
          
          <Content style={{ margin: '24px 16px', padding: 0, background: '#fff', minHeight: 280 }}>
            <div className={styles.pageHeader}>
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
              
              <Alert
                message="课程反馈说明"
                description="您可以在这里提交对课程内容的反馈意见，包括文字描述、相关文档和图片。所有反馈将存储在区块链上，确保透明性和不可篡改性。教师会在查看反馈后尽快回复。"
                type="info"
                showIcon
                icon={<FileTextOutlined />}
                className={styles.alertInfo}
              />
              
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
                    rules={[{ required: true, message: '请输入反馈内容' }]}
                  >
                    <TextArea 
                      placeholder="请详细描述您对课程内容的反馈、建议或问题..." 
                      autoSize={{ minRows: 6, maxRows: 12 }}
                    />
                  </Form.Item>
                  
                  <Divider plain>附件上传</Divider>
                  
                  <Form.Item
                    name="documents"
                    label="文档上传 (可选)"
                    extra="支持 PDF, Word, Excel, PPT 等文档格式，最大10MB"
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
                    extra="支持JPG, PNG, GIF等图片格式，最大10MB"
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
    </ConfigProvider>
  );
} 