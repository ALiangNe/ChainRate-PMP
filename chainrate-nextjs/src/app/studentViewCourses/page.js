/**
 * 学生查看课程列表页面 (Student Course Listing Page)
 * 
 * 功能概述:
 * - 展示所有可选课程列表，包括课程名称、教师、时间段等信息
 * - 提供课程筛选和搜索功能
 * - 允许学生查看课程详情
 * - 提供课程加入和退出功能
 * - 显示课程评价状态和统计数据
 * 
 * 主要组件:
 * - Table: 显示课程基本信息的表格组件
 * - FilterPanel: 提供课程筛选和排序功能
 * - SearchBar: 课程搜索功能
 * - CourseDetailModal: 课程详情模态框
 * 
 * 数据流:
 * 1. 组件挂载时通过以太坊合约获取课程列表
 * 2. 使用React状态管理筛选条件和分页
 * 3. 用户可以搜索、筛选和排序课程
 * 4. 用户点击课程卡片可查看详情
 * 5. 用户可加入或退出课程，操作结果通过交易提交到区块链
 * 
 * 身份验证:
 * - 使用localStorage检查用户登录状态和角色
 * - 仅允许学生角色访问此页面
 * 
 * 错误处理:
 * - 网络错误和合约调用失败处理
 * - 加载状态管理和用户反馈
 * 
 * @author ChainRate Team
 * @version 1.1
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import styles from './page.module.css';
import React from 'react';
import Image from 'next/image';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined, 
  FormOutlined, 
  LogoutOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  TeamOutlined,
  StarOutlined,
  StarFilled,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  UserAddOutlined
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
  Input, 
  Button, 
  Tag, 
  Empty, 
  Spin, 
  Space,
  Alert,
  Tooltip,
  Badge,
  Divider,
  Select,
  Table,
  Typography,
  Avatar,
  Rate,
  Progress,
  Popover,
  Statistic,
  Modal
} from 'antd';
import UserAvatar from '../components/UserAvatar';
import StudentSidebar from '../components/StudentSidebar';

const { Header, Content, Sider } = Layout;
const { Meta } = Card;
const { Search } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

export default function StudentViewCoursesPage() {
  const router = useRouter();
  
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
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [joinedCourses, setJoinedCourses] = useState({});
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [joinCoursePending, setJoinCoursePending] = useState({});
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  
  // 表格相关状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50'],
    showTotal: (total) => `共 ${total} 门课程`
  });
  
  const [sortedInfo, setSortedInfo] = useState({});
  const [tableLoading, setTableLoading] = useState(false);
  
  // 详情模态框
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
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
        
        setLoading(false);
        
        // 加载课程列表
        loadCourses(chainRateContract, await signer.getAddress());
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router]);
  
  // 加载课程列表
  const loadCourses = async (contractInstance, studentAddress) => {
    setLoadingCourses(true);
    setError('');
    
    try {
      // 获取所有激活的课程
      const activeCourseIds = await contractInstance.getActiveCourses();
      
      // 获取学生已加入的课程
      const studentCourseIds = await contractInstance.getStudentCourses(studentAddress);
      
      // 记录学生已加入的课程
      const joinedCoursesMap = {};
      for (let i = 0; i < studentCourseIds.length; i++) {
        const courseId = Number(studentCourseIds[i]);
        // 检查学生是否仍然加入此课程（可能已退出）
        const isJoined = await contractInstance.isStudentJoined(courseId, studentAddress);
        if (isJoined) {
          joinedCoursesMap[courseId] = true;
        }
      }
      setJoinedCourses(joinedCoursesMap);
      
      // 获取课程详情
      const coursesList = [];
      for (let i = 0; i < activeCourseIds.length; i++) {
        const courseId = Number(activeCourseIds[i]);
        
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
          
          // 获取课程评分
          let averageRating = 0;
          try {
            const rating = await contractInstance.getAverageRating(courseId);
            averageRating = Number(rating) / 100; // 转换为小数（因为合约中乘以了100）
          } catch (error) {
            console.warn(`获取课程评分失败: ${error.message}`);
          }
          
          coursesList.push({
            id: courseId,
            name: course.name,
            teacher: course.teacher,
            teacherName: teacherName,
            startTime: new Date(Number(course.startTime) * 1000),
            endTime: new Date(Number(course.endTime) * 1000),
            isActive: course.isActive,
            studentCount: Number(course.studentCount),
            averageRating: averageRating,
            isJoined: joinedCoursesMap[courseId] || false
          });
        } catch (courseErr) {
          console.warn(`获取课程 ${courseId} 失败:`, courseErr);
        }
      }
      
      setCourses(coursesList);
      setFilteredCourses(coursesList);
    } catch (err) {
      console.error("加载课程失败:", err);
      setError('获取课程列表失败: ' + (err.message || err));
    } finally {
      setLoadingCourses(false);
    }
  };
  
  // 处理搜索关键词变化
  const handleSearchChange = (value) => {
    setError('');
    
    // 检查是否包含特殊字符
    const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
    if (specialChars.test(value)) {
      setError('搜索内容包含非法字符');
      return;
    }
    
    setSearchTerm(value);
    filterCourses(value, filterType, filterValue);
  };

  // 处理筛选条件变化
  const handleFilterChange = (filterType, value) => {
    setError('');
    
    // 检查筛选条件组合是否有效
    if (filterType === 'status' && value === 'joined' && Object.keys(joinedCourses).length === 0) {
      setError('请选择有效的筛选条件');
      return;
    }
    
    // 更新筛选条件
    setFilterType(filterType);
    setFilterValue(value);
    filterCourses(searchTerm, filterType, value);
  };

  // 筛选课程
  const filterCourses = (search = '', filterType = 'all', filterValue = '') => {
    let result = [...courses];
    
    // 应用搜索
    if (search.trim() !== '') {
      result = result.filter(course => 
        course.name.toLowerCase().includes(search.toLowerCase()) ||
        course.teacherName.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // 应用筛选
    switch (filterType) {
      case 'status':
        if (filterValue === 'joined') {
          result = result.filter(course => joinedCourses[course.id]);
        } else if (filterValue === 'not_joined') {
          result = result.filter(course => !joinedCourses[course.id]);
        }
        break;
      case 'time':
        const now = new Date();
        if (filterValue === 'active') {
          result = result.filter(course => 
            new Date(course.startTime) <= now && now <= new Date(course.endTime)
          );
        } else if (filterValue === 'upcoming') {
          result = result.filter(course => new Date(course.startTime) > now);
        } else if (filterValue === 'ended') {
          result = result.filter(course => new Date(course.endTime) < now);
        }
        break;
      default:
        // 不做任何筛选
        break;
    }
    
    setFilteredCourses(result);
    
    // 如果筛选结果为空，显示提示
    if (result.length === 0) {
      setError('未找到符合条件的数据');
    } else {
      setError('');
    }
  };
  
  // 加入课程
  const handleJoinCourse = async (courseId) => {
    setError('');
    setSuccessMessage('');
    setJoinCoursePending(prev => ({ ...prev, [courseId]: true }));
    
    try {
      // 调用合约加入课程
      const tx = await contract.joinCourse(courseId);
      
      // 等待交易确认
      await tx.wait();
      
      // 更新状态
      setJoinedCourses(prev => ({ ...prev, [courseId]: true }));
      setFilteredCourses(prev => 
        prev.map(course => 
          course.id === courseId 
            ? { ...course, isJoined: true, studentCount: course.studentCount + 1 } 
            : course
        )
      );
      setCourses(prev => 
        prev.map(course => 
          course.id === courseId 
            ? { ...course, isJoined: true, studentCount: course.studentCount + 1 } 
            : course
        )
      );
      
      setSuccessMessage(`成功加入课程 "${courses.find(c => c.id === courseId)?.name}"`);
      
      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error("加入课程失败:", err);
      
      // 特殊处理用户拒绝的情况
      if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        setError('您取消了交易。如需加入课程，请重新点击加入并在MetaMask中确认。');
      } else {
        setError('加入课程失败: ' + (err.message || err));
      }
    } finally {
      setJoinCoursePending(prev => ({ ...prev, [courseId]: false }));
    }
  };
  
  // 查看课程详情
  const handleViewCourseDetail = (courseId) => {
    router.push(`/studentCourseDetail/${courseId}`);
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
  
  // 获取课程状态
  const getCourseStatus = (course) => {
    const now = new Date();
    if (now < course.startTime) {
      return { status: '即将开始', color: 'blue' };
    }
    if (now >= course.startTime && now <= course.endTime) {
      return { status: '评价中', color: 'green' };
    }
    return { status: '已结束', color: 'default' };
  };
  
  // 返回
  const goBack = () => {
    router.push('/studentIndex');
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

  // 表格列定义
  const columns = [
    {
      title: '课程名称',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortOrder: sortedInfo.columnKey === 'name' && sortedInfo.order,
      render: (text, record) => (
        <a onClick={() => handleViewCourseDetail(record.id)} style={{ color: colorPrimary }}>
          {text}
        </a>
      ),
    },
    {
      title: '教师',
      dataIndex: 'teacherName',
      key: 'teacherName',
      sorter: (a, b) => a.teacherName.localeCompare(b.teacherName),
      sortOrder: sortedInfo.columnKey === 'teacherName' && sortedInfo.order,
    },
    {
      title: '课程状态',
      key: 'status',
      dataIndex: 'status',
      render: (text, record) => {
        const statusInfo = getCourseStatus(record);
        return <Tag color={statusInfo.color}>{statusInfo.status}</Tag>;
      },
      filters: [
        { text: '即将开始', value: '即将开始' },
        { text: '评价中', value: '评价中' },
        { text: '已结束', value: '已结束' },
      ],
      onFilter: (value, record) => getCourseStatus(record).status === value,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (text) => formatDateTime(new Date(text)),
      sorter: (a, b) => new Date(a.startTime) - new Date(b.startTime),
      sortOrder: sortedInfo.columnKey === 'startTime' && sortedInfo.order,
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (text) => formatDateTime(new Date(text)),
      sorter: (a, b) => new Date(a.endTime) - new Date(b.endTime),
      sortOrder: sortedInfo.columnKey === 'endTime' && sortedInfo.order,
    },
    {
      title: '学生人数',
      dataIndex: 'studentCount',
      key: 'studentCount',
      sorter: (a, b) => a.studentCount - b.studentCount,
      sortOrder: sortedInfo.columnKey === 'studentCount' && sortedInfo.order,
      align: 'center',
    },
    {
      title: '平均评分',
      dataIndex: 'averageRating',
      key: 'averageRating',
      render: (rating) => <Rate disabled defaultValue={rating} allowHalf count={5} style={{ fontSize: 16 }} />,
      sorter: (a, b) => a.averageRating - b.averageRating,
      sortOrder: sortedInfo.columnKey === 'averageRating' && sortedInfo.order,
      align: 'center',
    },
    {
      title: '操作',
      key: 'action',
      align: 'center',
      render: (text, record) => (
        <Space size="middle">
          <Tooltip title="查看课程详情">
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => handleViewCourseDetail(record.id)}
              type="primary"
              ghost
            />
          </Tooltip>
          {record.isJoined ? (
            <Button 
              icon={<CheckCircleOutlined />} 
              disabled 
              style={{ color: '#52c41a', borderColor: '#b7eb8f' }}
            >
              已加入
            </Button>
          ) : (
            <Button 
              icon={<UserAddOutlined />} 
              loading={joinCoursePending[record.id]} 
              onClick={() => handleJoinCourse(record.id)}
              disabled={new Date() > record.endTime || getCourseStatus(record).status === '已结束'}
              type="primary"
            >
              {getCourseStatus(record).status === '已结束' ? '已结束' : '加入课程'}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 处理表格变化事件（分页、排序、筛选）
  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }));
    setSortedInfo(sorter);
    // 注意: Antd Table 的筛选器是内建的，如果需要结合外部筛选，则在此处处理filters
  };

  if (loading) {
    return <div className={styles.container}>正在加载...</div>;
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
            <StudentSidebar defaultSelectedKey="2" defaultOpenKey="sub2" />
          </Sider>
          <Layout style={{ padding: '0 24px 24px' }}>
            <Breadcrumb
              items={[
                { title: '首页', onClick: () => router.push('/studentIndex'), className: 'clickable-breadcrumb' },
                { title: '课程列表' }
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
                  message="提示"
                    description={error}
                  type="info"
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
              
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <BookOutlined style={{ color: colorPrimary, marginRight: '8px' }} />
                    <span>课程列表</span>
                  </div>
                }
                style={{ marginBottom: '20px' }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <Space wrap size="middle" style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                  <Search
                    placeholder="搜索课程名称或教师姓名"
                    allowClear
                    enterButton="搜索"
                    size="middle"
                    onSearch={handleSearchChange}
                      style={{ flexGrow: 1, minWidth: '250px' }}
                    disabled={loadingCourses}
                  />
                    <Select
                      placeholder="筛选状态"
                      style={{ width: 140 }}
                      onChange={(value) => handleFilterChange('status', value)}
                      disabled={loadingCourses}
                      allowClear
                    >
                      <Option value="all">全部课程</Option>
                      <Option value="joined">已加入</Option>
                      <Option value="not_joined">未加入</Option>
                    </Select>
                    
                    <Select
                      placeholder="筛选时间"
                      style={{ width: 140 }}
                      onChange={(value) => handleFilterChange('time', value)}
                      disabled={loadingCourses}
                      allowClear
                    >
                      <Option value="all">全部时间</Option>
                      <Option value="active">进行中</Option>
                      <Option value="upcoming">即将开始</Option>
                      <Option value="ended">已结束</Option>
                    </Select>
                  </Space>
                </div>

                {loadingCourses ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Spin size="large">
                      <div style={{ padding: '30px', textAlign: 'center' }}>
                        <div>加载课程中...</div>
                      </div>
                    </Spin>
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <Empty 
                    description={
                      <div>
                        <p>未找到符合条件的数据</p>
                        <p style={{ color: '#999', marginTop: '8px' }}>
                          请尝试：
                          <ul style={{ marginTop: '8px' }}>
                            <li>调整搜索关键词</li>
                            <li>更改筛选条件</li>
                            <li>清除所有筛选条件</li>
                          </ul>
                        </p>
                      </div>
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <Table
                    columns={columns}
                    dataSource={filteredCourses.map(course => ({ ...course, key: course.id }))}
                    rowKey="id" // 使用课程ID作为key
                    pagination={{
                      ...pagination,
                      total: filteredCourses.length, // 确保total是当前筛选后的课程总数
                    }}
                    loading={loadingCourses} // 使用 loadingCourses 作为表格的加载状态
                    onChange={handleTableChange}
                    className={styles.courseTable} // 可以添加自定义样式类
                    scroll={{ x: 'max-content' }} // 保证表格在小屏幕上可以横向滚动
                  />
                )}
              </Card>
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