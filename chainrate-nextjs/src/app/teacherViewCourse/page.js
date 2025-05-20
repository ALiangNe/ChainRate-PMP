'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import styles from './page.module.css';
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
  BarChartOutlined,
  LoadingOutlined,
  CalendarOutlined
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
  Alert,
  Table,
  DatePicker
} from 'antd';
import UserAvatar from '../components/UserAvatar';
import TeacherSidebar from '../components/TeacherSidebar';

const { Header, Content, Sider } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function ViewCoursesPage() {
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
  
  // 课程数据
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, inactive
  
  // 新增筛选状态
  const [statusFilter, setStatusFilter] = useState('all'); // all, upcoming, active, ended
  const [dateRange, setDateRange] = useState(null);
  
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
      try {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userRole = localStorage.getItem('userRole');
        
        if (!isLoggedIn || userRole !== 'teacher') {
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
    
    // 应用当前状态筛选
    if (statusFilter !== 'all') {
      result = result.filter(course => {
        const status = getCourseStatus(course);
        return status.status === statusFilter;
      });
    }
    
    // 应用日期范围筛选
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      
      result = result.filter(course => {
        // 判断课程评价时间范围与选定时间范围是否有重叠
        const courseStart = new Date(course.startTime);
        const courseEnd = new Date(course.endTime);
        
        // 检查课程时间段与筛选时间段是否有交集
        return (
          (courseStart <= endDate && courseEnd >= startDate) ||
          (courseStart >= startDate && courseStart <= endDate) ||
          (courseEnd >= startDate && courseEnd <= endDate)
        );
      });
    }
    
    setFilteredCourses(result);
  }, [searchTerm, filter, courses, statusFilter, dateRange]);
  
  // 处理搜索输入
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // 处理筛选切换
  const handleFilterChange = (value) => {
    setFilter(value);
  };
  
  // 处理当前状态筛选
  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
  };
  
  // 处理日期范围筛选
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
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
    // router.push(`/courseEvaluations/${courseId}`);
    router.push(`/teacherViewEvaluation`);
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

  // Table columns definition
  const courseTableColumns = [
    {
      title: '课程名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => handleManageCourse(record.id)} style={{ fontWeight: 'bold' }}>
          {text}
        </a>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: '课程ID',
      dataIndex: 'id',
      key: 'id',
      align: 'center',
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: '当前状态',
      key: 'currentStatus',
      align: 'center',
      render: (text, record) => {
        const status = getCourseStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
      // Sorter based on the text of the status for more intuitive sorting
      sorter: (a, b) => getCourseStatus(a).text.localeCompare(getCourseStatus(b).text),
    },
    {
      title: '是否启用',
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'center',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? '是' : '否'}</Tag>
      ),
      sorter: (a, b) => a.isActive - b.isActive, // Boolean to number for sorting
    },
    {
      title: '评价开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (date) => formatDateTime(date),
      sorter: (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    },
    {
      title: '评价结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (date) => formatDateTime(date),
      sorter: (a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      align: 'center',
      render: (text, record) => (
        <Space size="small">
          <Tooltip title="管理课程">
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => handleManageCourse(record.id)}
              size="small"
            >
              管理
            </Button>
          </Tooltip>
          <Tooltip title="查看课程评价">
            <Button
              icon={<EyeOutlined />}
              onClick={() => handleViewEvaluations(record.id)}
              size="small"
            >
              评价
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <span style={{ marginLeft: '12px' }}>正在加载...</span>
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8', // 使用蓝色与其他页面保持一致
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
            <UserAvatar color="#fff" />
          </div>
        </Header>
        <Layout>
          <Sider width={200} style={{ background: 'white' }}>
            <TeacherSidebar defaultSelectedKey="3" defaultOpenKey="sub2" />
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
                
                <RangePicker 
                  onChange={handleDateRangeChange}
                  style={{ width: 300 }}
                  placeholder={['开始日期', '结束日期']}
                  allowClear
                  format="YYYY-MM-DD"
                  suffixIcon={<CalendarOutlined />}
                  value={dateRange}
                />
                
                <Select
                  placeholder="课程启用状态"
                  value={filter}
                  onChange={handleFilterChange}
                  style={{ width: 120 }}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="all">所有课程</Option>
                  <Option value="active">仅显示启用的课程</Option>
                  <Option value="inactive">仅显示停用的课程</Option>
                </Select>

                <Select
                  placeholder="当前状态"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  style={{ width: 150 }}
                  suffixIcon={<FilterOutlined />}
                >
                  <Option value="all">所有状态</Option>
                  <Option value="active">评价中</Option>
                  <Option value="ended">已结束</Option>
                </Select>
                
                {(searchTerm || filter !== 'all' || statusFilter !== 'all' || dateRange) && (
                  <Button 
                    onClick={() => {
                      setSearchTerm('');
                      setFilter('all');
                      setStatusFilter('all');
                      setDateRange(null);
                    }}
                  >
                    重置筛选
                  </Button>
                )}
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
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0' }}>
                  <Spin />
                  <span style={{ marginLeft: '8px' }}>正在加载课程数据...</span>
                </div>
              ) : filteredCourses.length === 0 ? (
                <Empty
                  description={
                    <span>
                      {searchTerm || filter !== 'all' || statusFilter !== 'all' || dateRange ? 
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
                <Table
                  columns={courseTableColumns}
                  dataSource={filteredCourses.map(course => ({ ...course, key: course.id }))}
                  rowKey="id"
                  loading={loadingCourses}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['5', '10', '20', '50'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} 共 ${total} 条`,
                  }}
                  className={styles.courseTable} // Add a class for specific table styling if needed
                  scroll={{ x: 'max-content' }} // For responsiveness
                />
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