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
  TeamOutlined, 
  BookOutlined, 
  CommentOutlined, 
  LogoutOutlined,
  SearchOutlined,
  LoadingOutlined,
  ReloadOutlined,
  MailOutlined,
  PhoneOutlined,
  TrophyOutlined,
  StarOutlined,
  StarFilled,
  FileSearchOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { 
  Breadcrumb, 
  Layout, 
  Menu, 
  ConfigProvider, 
  theme, 
  Table,
  Input,
  Button,
  Space,
  Tooltip,
  Tag,
  Card,
  Modal,
  message,
  Spin,
  Statistic,
  Divider,
  Avatar,
  Row,
  Col,
  Rate,
  Progress,
  Empty
} from 'antd';
import UserAvatar from '../components/UserAvatar';

const { Header, Content, Sider } = Layout;
const { Search } = Input;

export default function AdminGetTeacherListPage() {
  const router = useRouter();
  
  // 提前调用 useToken，确保Hook顺序一致
  const { token } = theme.useToken();
  const { colorBgContainer, borderRadiusLG, colorPrimary } = token;
  
  // 用户状态
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

  // 加载状态
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  
  // 教师列表数据
  const [teachers, setTeachers] = useState([]);
  const [teacherAddresses, setTeacherAddresses] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  
  // 搜索和过滤
  const [searchValue, setSearchValue] = useState('');
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  
  // 教师详情模态框
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [teacherDetails, setTeacherDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    // 检查用户是否已登录并且是管理员角色
    const checkUserAuth = () => {
      try {
        console.log('检查管理员认证...');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userRole = localStorage.getItem('userRole');
          
        console.log('认证状态:', { isLoggedIn, userRole });
        
        if (!isLoggedIn || userRole !== 'admin') {
          console.log('未认证为管理员，重定向到登录页面');
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
          
        console.log('管理员认证成功，初始化Web3连接');
        initWeb3();
      } catch (error) {
        console.error("Authentication check error:", error);
        setError("认证检查失败: " + error.message);
        setLoading(false);
      }
    };

    // 初始化Web3连接
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
        
        // 设置Account变更监听
        window.ethereum.on('accountsChanged', function (accounts) {
          if (accounts.length === 0) {
            // 用户断开了钱包
            router.push('/login');
          } else {
            // 用户切换了账户，重新初始化
            window.location.reload();
          }
        });
        
        // 加载教师列表
        await loadAllTeachers(chainRateContract);
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
    
    // 清理函数
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, [router]);

  // 加载所有教师地址列表
  const loadAllTeachers = async (contractInstance) => {
    try {
      setTableLoading(true);
      
      // 调用合约获取所有教师地址
      const addresses = await contractInstance.getAllTeachers();
      console.log("获取到教师地址:", addresses);
      
      setTeacherAddresses(addresses);
      setPagination(prev => ({ ...prev, total: addresses.length }));
      
      // 加载第一页教师数据
      await loadTeachersData(contractInstance, addresses, 0, pagination.pageSize);
      
      setTableLoading(false);
    } catch (err) {
      console.error("加载教师列表失败:", err);
      setError('获取教师列表失败: ' + (err.message || err));
      setTableLoading(false);
    }
  };

  // 分页加载教师数据
  const loadTeachersData = async (contractInstance, addresses, offset, limit) => {
    try {
      if (!addresses || addresses.length === 0) {
        setTeachers([]);
        return;
      }
      
      // 计算实际的offset和limit
      const actualOffset = Math.min(offset, addresses.length);
      const actualLimit = Math.min(limit, addresses.length - actualOffset);
      
      if (actualLimit <= 0) {
        setTeachers([]);
        return;
      }
      
      // 调用合约的批量获取函数
      const result = await contractInstance.getTeachersBatch(actualOffset, actualLimit);
      console.log("合约返回教师批量数据:", result);
      
      // 解构结果 - 根据实际合约返回的数据结构进行修改
      // 合约返回的顺序是: addresses, names, phones, emails, colleges, majors, grades, avatars, courseCounts, avgRatings
      const batchAddresses = result[0] || [];
      const names = result[1] || [];
      const phones = result[2] || [];
      const emails = result[3] || [];
      const colleges = result[4] || [];
      const majors = result[5] || [];
      const grades = result[6] || [];
      const avatars = result[7] || [];
      const courseCounts = result[8] || [];
      const averageRatings = result[9] || [];
      
      // 构建教师数据
      const teachersData = batchAddresses.map((addr, index) => ({
        key: addr,
        address: addr,
        name: names[index] || '',
        phone: phones[index] || '',
        email: emails[index] || '',
        college: colleges[index] || '',
        major: majors[index] || '',
        grade: grades[index] || '',
        avatar: avatars[index] || '',
        coursesCount: courseCounts && courseCounts[index] ? Number(courseCounts[index]) : 0,
        averageRating: averageRatings && averageRatings[index] ? Number(averageRatings[index]) / 100 : 0 // 转换为小数
      }));
      
      console.log("处理后的教师数据:", teachersData);
      setTeachers(teachersData);
      applyFilters(teachersData);
    } catch (err) {
      console.error("加载教师详细数据失败:", err);
      setError('获取教师详细数据失败: ' + (err.message || err));
    }
  };

  // 处理表格分页变化
  const handleTableChange = async (pagination) => {
    const { current, pageSize } = pagination;
    
    try {
      setTableLoading(true);
      setPagination(pagination);
      
      // 计算新的offset
      const offset = (current - 1) * pageSize;
      
      // 加载对应页的数据
      await loadTeachersData(contract, teacherAddresses, offset, pageSize);
      
      setTableLoading(false);
    } catch (err) {
      console.error("分页切换失败:", err);
      setTableLoading(false);
    }
  };

  // 搜索过滤函数
  const applyFilters = (data) => {
    if (!searchValue.trim()) {
      setFilteredTeachers(data);
      return;
    }
    
    const searchLower = searchValue.toLowerCase();
    const filtered = data.filter(teacher => 
      teacher.name.toLowerCase().includes(searchLower) || 
      teacher.address.toLowerCase().includes(searchLower) ||
      teacher.phone.toLowerCase().includes(searchLower) ||
      teacher.email.toLowerCase().includes(searchLower) ||
      teacher.college.toLowerCase().includes(searchLower) ||
      teacher.major.toLowerCase().includes(searchLower)
    );
    
    setFilteredTeachers(filtered);
  };

  // 搜索框变化处理
  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    applyFilters(teachers);
  };

  // 搜索按钮点击处理
  const handleSearch = () => {
    applyFilters(teachers);
  };

  // 刷新数据
  const refreshData = async () => {
    if (!contract) return;
    
    try {
      await loadAllTeachers(contract);
      message.success('数据已刷新');
    } catch (err) {
      console.error("刷新数据失败:", err);
      message.error('刷新数据失败: ' + (err.message || err));
    }
  };

  // 查看教师详情
  const viewTeacherDetails = async (teacherAddress) => {
    if (!contract) return;
    
    try {
      setSelectedTeacher(teacherAddress);
      setDetailsVisible(true);
      setLoadingDetails(true);
      
      // 调用合约函数获取教师详情
      const details = await contract.getTeacherDetailInfo(teacherAddress);
      console.log("教师详情返回数据:", details);
      
      // 解构结果 - 根据合约实际返回的数据结构进行修改
      // 合约返回顺序: name, phone, email, college, major, grade, avatar, totalCourses, totalStudents, totalEvals, avgRating
      const name = details[0] || '';
      const phone = details[1] || '';
      const email = details[2] || '';
      const college = details[3] || '';
      const major = details[4] || '';
      const grade = details[5] || '';
      const avatar = details[6] || '';
      const totalCourses = details[7] ? Number(details[7]) : 0;
      const totalStudents = details[8] ? Number(details[8]) : 0;
      const totalEvaluations = details[9] ? Number(details[9]) : 0;
      const averageRating = details[10] ? Number(details[10]) / 100 : 0; // 转换为小数
      
      // 构建教师详情对象
      const teacherDetailsObj = {
        address: teacherAddress,
        name,
        phone,
        email,
        college,
        major,
        grade,
        avatar,
        totalCourses,
        totalStudents,
        totalEvaluations,
        averageRating
      };
      
      console.log("处理后的教师详情:", teacherDetailsObj);
      setTeacherDetails(teacherDetailsObj);
      setLoadingDetails(false);
    } catch (err) {
      console.error("获取教师详情失败:", err);
      message.error('获取教师详情失败: ' + (err.message || err));
      setLoadingDetails(false);
    }
  };

  // 查看教师的课程
  const viewTeacherCourses = (teacherAddress) => {
    router.push(`/adminViewTeacherCourses/${teacherAddress}`);
  };

  // 关闭详情模态框
  const handleDetailsModalClose = () => {
    setDetailsVisible(false);
    setSelectedTeacher(null);
    setTeacherDetails(null);
  };

  // 生成教师详情表格列
  const generateTeacherColumns = () => [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <a>{text}</a>,
    },
    {
      title: '钱包地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (address) => (
        <Tooltip title={address}>
          <span>{`${address.substring(0, 8)}...${address.substring(address.length - 6)}`}</span>
        </Tooltip>
      ),
    },
    {
      title: '联系方式',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => (
        <div>
          <PhoneOutlined style={{ marginRight: 8 }} />
          {phone}
        </div>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email) => (
        <div>
          <MailOutlined style={{ marginRight: 8 }} />
          {email || '未设置'}
        </div>
      ),
    },
    {
      title: '学院',
      dataIndex: 'college',
      key: 'college',
      render: (college) => college || '未设置',
    },
    {
      title: '创建课程数',
      dataIndex: 'coursesCount',
      key: 'coursesCount',
      sorter: (a, b) => a.coursesCount - b.coursesCount,
      render: (count) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>
          {count}
        </Tag>
      ),
    },
    {
      title: '平均评分',
      dataIndex: 'averageRating',
      key: 'averageRating',
      sorter: (a, b) => a.averageRating - b.averageRating,
      render: (rating) => {
        if (rating === 0) return <span>暂无评分</span>;
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Rate disabled defaultValue={rating} allowHalf style={{ fontSize: 14 }} />
            <span style={{ marginLeft: 8 }}>{rating.toFixed(1)}</span>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            size="small"
            icon={<FileSearchOutlined />}
            onClick={() => viewTeacherDetails(record.address)}
          >
            查看详情
          </Button>
        </Space>
      ),
    },
  ];

  // 侧边栏菜单项
  const siderItems = [
    {
      key: 'sub1',
      icon: <UserOutlined />,
      label: '系统管理',
      children: [
        {
          key: '1',
          label: '管理员主页',
          onClick: () => router.push('/adminIndex')
        }
      ],
    },
    {
      key: 'sub2',
      icon: <TeamOutlined />,
      label: '用户管理',
      children: [
        {
          key: '3',
          label: '教师管理',
          onClick: () => router.push('/adminGetTeacherList')
        },
        {
          key: '4',
          label: '学生管理',
          onClick: () => router.push('/adminGetStudentList')
        }
      ],
    }
  ];

  // 登出处理
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

  // 显示加载中
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large">
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <div>加载中，请稍候...</div>
          </div>
        </Spin>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff', // 使用蓝色作为管理员端主题色
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
              链评系统（ChainRate）- 管理员端
            </div>
          </div>
          <div style={{ color: 'white', marginRight: '20px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '15px' }}>欢迎, {userData.name}</span>
            <UserAvatar color="#fff" />
          </div>
        </Header>
        <Layout>
          <Sider width={200} style={{ background: colorBgContainer }}>
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
                { title: '首页', onClick: () => router.push('/adminIndex'), className: 'clickable-breadcrumb' },
                { title: '用户管理', onClick: () => {}, className: 'clickable-breadcrumb' },
                { title: '教师管理' }
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
              {/* 页面标题和搜索栏 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>教师用户管理</h2>
                <Space>
                  <Search
                    placeholder="搜索教师姓名、地址或联系方式"
                    allowClear
                    onChange={handleSearchChange}
                    onSearch={handleSearch}
                    style={{ width: 320 }}
                    enterButton={<SearchOutlined />}
                  />
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />} 
                    onClick={refreshData}
                  >
                    刷新
                  </Button>
                </Space>
              </div>

              {/* 统计卡片区域 */}
              <div style={{ marginBottom: 20 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Card bordered={false}>
                      <Statistic
                        title="教师总数"
                        value={teacherAddresses.length}
                        prefix={<TeamOutlined />}
                        valueStyle={{ color: '#1677ff' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card bordered={false}>
                      <Statistic
                        title="已创建课程的教师数"
                        value={teachers.filter(t => t.coursesCount && t.coursesCount > 0).length || 0}
                        prefix={<BookOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card bordered={false}>
                      <Statistic
                        title="平均教师评分"
                        value={
                          teachers.length > 0 && teachers.some(t => t.averageRating > 0)
                            ? (teachers.reduce((sum, t) => sum + (t.averageRating || 0), 0) / 
                               teachers.filter(t => t.averageRating > 0).length).toFixed(2)
                            : "暂无数据"
                        }
                        prefix={<StarOutlined />}
                        valueStyle={{ color: '#fa8c16' }}
                        suffix={teachers.length > 0 && teachers.some(t => t.averageRating > 0) ? "/ 5.00" : ""}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>

              {/* 教师列表表格 */}
              <Table
                columns={generateTeacherColumns()}
                dataSource={filteredTeachers.length > 0 ? filteredTeachers : teachers}
                pagination={pagination}
                onChange={handleTableChange}
                loading={tableLoading}
                rowKey="address"
                bordered
                size="middle"
                scroll={{ x: 'max-content' }}
              />
              
              {/* 教师详情模态框 */}
              <Modal
                title="教师详细信息"
                open={detailsVisible}
                onCancel={handleDetailsModalClose}
                footer={[
                  <Button 
                    key="courses" 
                    type="primary"
                    onClick={() => viewTeacherCourses(selectedTeacher)}
                    disabled={!teacherDetails || teacherDetails.totalCourses === 0}
                  >
                    查看所有课程
                  </Button>,
                  <Button key="back" onClick={handleDetailsModalClose}>
                    关闭
                  </Button>
                ]}
                width={700}
              >
                {loadingDetails ? (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                    <p style={{ marginTop: 16 }}>加载教师详情中...</p>
                  </div>
                ) : teacherDetails ? (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                      {teacherDetails.avatar ? (
                        <Avatar 
                          size={64} 
                          src={teacherDetails.avatar} 
                          style={{ backgroundColor: '#34a853' }}
                        />
                      ) : (
                        <Avatar 
                          size={64} 
                          icon={<UserOutlined />} 
                          style={{ backgroundColor: '#34a853' }}
                        />
                      )}
                      <h2 style={{ marginTop: 16, marginBottom: 4 }}>{teacherDetails.name}</h2>
                      <p style={{ color: '#666' }}>{teacherDetails.address}</p>
                    </div>
                    
                    <Divider orientation="left">基本信息</Divider>
                    <Row gutter={16}>
                      <Col span={12}>
                        <p><PhoneOutlined style={{ marginRight: 8 }} /> 联系方式: {teacherDetails.phone}</p>
                      </Col>
                      <Col span={12}>
                        <p><MailOutlined style={{ marginRight: 8 }} /> 邮箱: {teacherDetails.email || '未设置'}</p>
                      </Col>
                      <Col span={12}>
                        <p><TeamOutlined style={{ marginRight: 8 }} /> 学院: {teacherDetails.college || '未设置'}</p>
                      </Col>
                      <Col span={12}>
                        <p><BookOutlined style={{ marginRight: 8 }} /> 专业: {teacherDetails.major || '未设置'}</p>
                      </Col>
                      <Col span={12}>
                        <p><TrophyOutlined style={{ marginRight: 8 }} /> 职称: {teacherDetails.grade || '未设置'}</p>
                      </Col>
                    </Row>
                    
                    <Divider orientation="left">教学统计</Divider>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic
                          title="创建课程数"
                          value={teacherDetails.totalCourses}
                          valueStyle={{ color: '#1677ff' }}
                          prefix={<BookOutlined />}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="教授学生数"
                          value={teacherDetails.totalStudents}
                          valueStyle={{ color: '#1677ff' }}
                          prefix={<TeamOutlined />}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="收到评价数"
                          value={teacherDetails.totalEvaluations}
                          valueStyle={{ color: '#1677ff' }}
                          prefix={<CommentOutlined />}
                        />
                      </Col>
                    </Row>
                    
                    <Divider orientation="left">评分情况</Divider>
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      {teacherDetails.totalEvaluations > 0 ? (
                        <>
                          <div style={{ marginBottom: 16 }}>
                            <Rate disabled value={teacherDetails.averageRating} allowHalf />
                            <span style={{ fontSize: 24, marginLeft: 16, color: '#faad14' }}>
                              {teacherDetails.averageRating.toFixed(1)}
                            </span>
                          </div>
                          <Progress 
                            percent={teacherDetails.averageRating * 20} 
                            status="active" 
                            strokeColor={{
                              '0%': '#108ee9',
                              '100%': '#87d068',
                            }}
                          />
                          <p style={{ marginTop: 8, color: '#666' }}>
                            共 {teacherDetails.totalEvaluations} 条学生评价
                          </p>
                        </>
                      ) : (
                        <Empty description="暂无评分数据" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p>未能加载教师信息</p>
                  </div>
                )}
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