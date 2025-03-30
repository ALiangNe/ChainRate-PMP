'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import styles from './page.module.css';
import React from 'react';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  LogoutOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  SettingOutlined,
  EyeOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { 
  Breadcrumb, 
  Layout, 
  Menu, 
  ConfigProvider, 
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Tag,
  Space,
  Empty,
  Tooltip,
  Spin,
  Alert
} from 'antd';

const { Header, Content, Sider } = Layout;
const { Option } = Select;

export default function ViewCoursesPage() {
  const router = useRouter();
  
  // 用户身份信息
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
  });
  
  // 课程数据
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, inactive
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState('');
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    // 检查用户是否已登录并且是教师角色
    const checkUserAuth = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const userRole = localStorage.getItem('userRole');
      
      if (!isLoggedIn || userRole !== 'teacher') {
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
        
        setLoading(false);
        
        // 加载教师创建的课程
        loadTeacherCourses(chainRateContract, await signer.getAddress());
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router]);
  
  // 加载教师创建的课程
  const loadTeacherCourses = async (contractInstance, teacherAddress) => {
    setLoadingCourses(true);
    setError('');
    
    try {
      // 获取课程总数
      const courseCount = await contractInstance.courseCount();
      const courseCountNum = Number(courseCount);
      
      // 存储教师创建的课程
      const teacherCourses = [];
      
      // 遍历所有课程，查找教师创建的课程
      for (let i = 0; i < courseCountNum; i++) {
        try {
          const course = await contractInstance.courses(i);
          
          // 检查课程是否由当前教师创建
          if (course.teacher.toLowerCase() === teacherAddress.toLowerCase()) {
            // 将课程数据添加到列表中
            teacherCourses.push({
              id: i,
              name: course.name,
              teacher: course.teacher,
              startTime: new Date(Number(course.startTime) * 1000),
              endTime: new Date(Number(course.endTime) * 1000),
              isActive: course.isActive
            });
          }
        } catch (courseErr) {
          console.warn(`获取课程 ${i} 失败:`, courseErr);
          // 继续处理下一个课程
        }
      }
      
      // 更新课程列表
      setCourses(teacherCourses);
      setFilteredCourses(teacherCourses);
    } catch (err) {
      console.error("加载课程失败:", err);
      setError('获取课程列表失败: ' + (err.message || err));
    } finally {
      setLoadingCourses(false);
    }
  };
  
  // 处理搜索和筛选
  useEffect(() => {
    let result = [...courses];
    
    // 应用名称搜索
    if (searchTerm.trim() !== '') {
      result = result.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 应用状态筛选
    if (filter === 'active') {
      result = result.filter(course => course.isActive);
    } else if (filter === 'inactive') {
      result = result.filter(course => !course.isActive);
    }
    
    setFilteredCourses(result);
  }, [searchTerm, filter, courses]);
  
  // 处理搜索输入
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // 处理筛选切换
  const handleFilterChange = (value) => {
    setFilter(value);
  };
  
  // 格式化日期时间
  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 检查课程评价状态
  const getCourseStatus = (course) => {
    const now = new Date();
    
    if (!course.isActive) {
      return { status: 'inactive', text: '已停用', color: 'default' };
    } else if (now < course.startTime) {
      return { status: 'upcoming', text: '未开始', color: 'blue' };
    } else if (now >= course.startTime && now <= course.endTime) {
      return { status: 'active', text: '评价中', color: 'success' };
    } else {
      return { status: 'ended', text: '已结束', color: 'warning' };
    }
  };
  
  // 管理课程
  const handleManageCourse = (courseId) => {
    router.push(`/teacherManageCourse/${courseId}`);
  };
  
  // 查看评价
  const handleViewEvaluations = (courseId) => {
    // 未来可以实现跳转到课程评价页面
    router.push(`/courseEvaluations/${courseId}`);
  };
  
  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userRoleHash');
    router.push('/login');
  };

  // 侧边栏菜单项
  const siderItems = [
    {
      key: 'sub1',
      icon: <UserOutlined />,
      label: '个人中心',
      children: [
        {
          key: '1',
          label: '个人信息',
          onClick: () => router.push('/teacherIndex')
        }
      ],
    },
    {
      key: 'sub2',
      icon: <BookOutlined />,
      label: '课程管理',
      children: [
        {
          key: '2',
          label: '创建课程',
          onClick: () => router.push('/teacherCreateCourse')
        },
        {
          key: '3',
          label: '我的课程',
          onClick: () => router.push('/teacherViewCourse')
        }
      ],
    },
    {
      key: 'sub3',
      icon: <CommentOutlined />,
      label: '评价管理',
      children: [
        {
          key: '4',
          label: '查看评价',
          onClick: () => router.push('/course-evaluations')
        }
      ],
    },
    {
      key: 'sub4',
      icon: <BarChartOutlined />,
      label: '数据分析',
      children: [
        {
          key: '5',
          label: '统计分析',
          onClick: () => router.push('/statistics')
        }
      ],
    }
  ];

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin size="large" tip="正在加载..." />
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#34a853', // 使用绿色作为教师端主题色
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
              链评系统（ChainRate）- 教师端
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
          <Sider width={200} style={{ background: 'white' }}>
            <Menu
              mode="inline"
              defaultSelectedKeys={['3']}
              defaultOpenKeys={['sub2']}
              style={{ height: '100%', borderRight: 0 }}
              items={siderItems}
            />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页', onClick: () => router.push('/teacherIndex') },
                { title: '课程管理' },
                { title: '我的课程' }
              ]}
              style={{ margin: '16px 0' }}
            />
            <Content
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
                background: 'white',
                borderRadius: 8,
              }}
            >
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0 }}>我的课程</h2>
                  <p style={{ margin: '4px 0 0', color: '#666' }}>管理您创建的所有课程</p>
                </div>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => router.push('/teacherCreateCourse')}
                >
                  创建新课程
                </Button>
              </div>
              
              <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <Input 
                  placeholder="搜索课程名称..." 
                  value={searchTerm}
                  onChange={handleSearchChange}
                  prefix={<SearchOutlined />}
                  allowClear
                  style={{ flex: 1 }}
                />
                <Select
                  placeholder="筛选课程"
                  value={filter}
                  onChange={handleFilterChange}
                  style={{ width: 180 }}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="all">所有课程</Option>
                  <Option value="active">仅显示启用的课程</Option>
                  <Option value="inactive">仅显示停用的课程</Option>
                </Select>
              </div>
              
              {error && (
                <Alert
                  message="错误"
                  description={error}
                  type="error"
                  showIcon
                  style={{ marginBottom: '24px' }}
                />
              )}
              
              {loadingCourses ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <Spin tip="正在加载课程数据..." />
                </div>
              ) : filteredCourses.length === 0 ? (
                <Empty
                  description={
                    <span>
                      {searchTerm || filter !== 'all' ? 
                        '未找到符合条件的课程，尝试清除搜索或更改筛选条件' : 
                        '您还没有创建任何课程，请创建新课程'}
                    </span>
                  }
                >
                  <Button 
                    type="primary" 
                    onClick={() => router.push('/teacherCreateCourse')}
                  >
                    创建新课程
                  </Button>
                </Empty>
              ) : (
                <Row gutter={[16, 16]}>
                  {filteredCourses.map(course => {
                    const courseStatus = getCourseStatus(course);
                    
                    return (
                      <Col xs={24} sm={12} md={8} key={course.id}>
                        <Card
                          title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Tooltip title={course.name}>
                                <span style={{ 
                                  maxWidth: '200px', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-block'
                                }}>
                                  {course.name}
                                </span>
                              </Tooltip>
                              <Tag color={courseStatus.color}>{courseStatus.text}</Tag>
                            </div>
                          }
                          hoverable
                        >
                          <p><strong>课程ID:</strong> {course.id}</p>
                          <p><strong>评价开始:</strong> {formatDateTime(course.startTime)}</p>
                          <p><strong>评价结束:</strong> {formatDateTime(course.endTime)}</p>
                          <p><strong>状态:</strong> {course.isActive ? '已启用' : '已停用'}</p>
                          
                          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Button
                              type="primary"
                              icon={<SettingOutlined />}
                              onClick={() => handleManageCourse(course.id)}
                            >
                              管理
                            </Button>
                            <Button
                              icon={<EyeOutlined />}
                              onClick={() => handleViewEvaluations(course.id)}
                            >
                              查看评价
                            </Button>
                          </div>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
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