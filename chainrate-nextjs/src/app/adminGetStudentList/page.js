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
  CloudDownloadOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  UserSwitchOutlined,
  FileSearchOutlined
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
  List
} from 'antd';
import UserAvatar from '../components/UserAvatar';

const { Header, Content, Sider } = Layout;
const { Search } = Input;

export default function AdminGetStudentListPage() {
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
  
  // 学生列表数据
  const [students, setStudents] = useState([]);
  const [studentAddresses, setStudentAddresses] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  
  // 搜索和过滤
  const [searchValue, setSearchValue] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  // 学生详情模态框
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
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
        
        // 加载学生列表
        await loadAllStudents(chainRateContract);
        
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

  // 加载所有学生地址列表
  const loadAllStudents = async (contractInstance) => {
    try {
      setTableLoading(true);
      
      // 调用合约获取所有学生地址
      const addresses = await contractInstance.getAllStudents();
      console.log("获取到学生地址:", addresses);
      
      setStudentAddresses(addresses);
      setPagination(prev => ({ ...prev, total: addresses.length }));
      
      // 加载第一页学生数据
      await loadStudentsData(contractInstance, addresses, 0, pagination.pageSize);
      
      setTableLoading(false);
    } catch (err) {
      console.error("加载学生列表失败:", err);
      setError('获取学生列表失败: ' + (err.message || err));
      setTableLoading(false);
    }
  };

  // 分页加载学生数据
  const loadStudentsData = async (contractInstance, addresses, offset, limit) => {
    try {
      if (!addresses || addresses.length === 0) {
        setStudents([]);
        return;
      }
      
      // 计算实际的offset和limit
      const actualOffset = Math.min(offset, addresses.length);
      const actualLimit = Math.min(limit, addresses.length - actualOffset);
      
      if (actualLimit <= 0) {
        setStudents([]);
        return;
      }
      
      // 调用合约的批量获取函数
      const result = await contractInstance.getStudentsBatch(actualOffset, actualLimit);
      console.log("合约返回学生批量数据:", result);
      
      // 安全地获取数据，而不是使用解构
      const batchAddresses = result[0] || [];
      const names = result[1] || [];
      const phones = result[2] || [];
      const emails = result[3] || [];
      const colleges = result[4] || [];
      const majors = result[5] || [];
      const grades = result[6] || [];
      const avatars = result[7] || [];  // 添加avatars字段解析
      const courseCounts = result[8] || [];  // 修正索引从7到8
      const evaluationCounts = result[9] || [];  // 修正索引从8到9
      
      // 构建学生数据
      const studentsData = batchAddresses.map((addr, index) => ({
        key: addr,
        address: addr,
        name: names[index] || '',
        phone: phones[index] || '',
        email: emails[index] || '',
        college: colleges[index] || '',
        major: majors[index] || '',
        grade: grades[index] || '',
        avatar: avatars[index] || '',  // 添加avatar字段
        coursesCount: courseCounts && courseCounts[index] ? Number(courseCounts[index]) : 0,
        evaluationsCount: evaluationCounts && evaluationCounts[index] ? Number(evaluationCounts[index]) : 0
      }));
      
      console.log("处理后的学生数据:", studentsData);
      setStudents(studentsData);
      applyFilters(studentsData);
    } catch (err) {
      console.error("加载学生详细数据失败:", err);
      setError('获取学生详细数据失败: ' + (err.message || err));
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
      await loadStudentsData(contract, studentAddresses, offset, pageSize);
      
      setTableLoading(false);
    } catch (err) {
      console.error("分页切换失败:", err);
      setTableLoading(false);
    }
  };

  // 搜索过滤函数
  const applyFilters = (data) => {
    if (!searchValue.trim()) {
      setFilteredStudents(data);
      return;
    }
    
    const searchLower = searchValue.toLowerCase();
    const filtered = data.filter(student => 
      student.name.toLowerCase().includes(searchLower) || 
      student.address.toLowerCase().includes(searchLower) ||
      student.phone.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.college?.toLowerCase().includes(searchLower) ||
      student.major?.toLowerCase().includes(searchLower) ||
      student.grade?.toLowerCase().includes(searchLower)
    );
    
    setFilteredStudents(filtered);
  };

  // 搜索框变化处理
  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    applyFilters(students);
  };

  // 搜索按钮点击处理
  const handleSearch = () => {
    applyFilters(students);
  };

  // 刷新数据
  const refreshData = async () => {
    if (!contract) return;
    
    try {
      await loadAllStudents(contract);
      message.success('数据已刷新');
    } catch (err) {
      console.error("刷新数据失败:", err);
      message.error('刷新数据失败: ' + (err.message || err));
    }
  };

  // 查看学生详情
  const viewStudentDetails = async (studentAddress) => {
    if (!contract) return;
    
    try {
      setSelectedStudent(studentAddress);
      setDetailsVisible(true);
      setLoadingDetails(true);
      
      // 调用合约函数获取学生详情
      const details = await contract.getStudentDetailInfo(studentAddress);
      console.log("学生详情原始数据:", details);
      
      // 安全地获取数据，按照合约返回的正确顺序获取
      // 合约返回顺序: name, phone, email, college, major, grade, avatar, courseCount, evalCount, courseIds, courseNames, hasEvalArray
      const name = details[0] || '';
      const phone = details[1] || '';
      const email = details[2] || '';
      const college = details[3] || '';
      const major = details[4] || '';
      const grade = details[5] || '';
      const avatar = details[6] || '';
      const courseCount = details[7] ? Number(details[7]) : 0;
      const evaluationCount = details[8] ? Number(details[8]) : 0;
      
      // 处理课程数据，访问正确的索引
      let courses = [];
      try {
        const courseIds = details[9] || [];  // 修正索引从8到9
        const courseNames = details[10] || []; // 修正索引从9到10
        const hasEvaluatedArray = details[11] || []; // 修正索引从10到11
        
        console.log("课程数据:", { courseIds, courseNames, hasEvaluatedArray });
        
        // 只在有课程数据时构建课程信息
        if (courseIds && courseIds.length > 0) {
          courses = courseIds.map((id, index) => ({
            id: Number(id),
            name: courseNames[index] || `课程${index+1}`,
            hasEvaluated: hasEvaluatedArray[index] || false
          }));
        }
      } catch (courseErr) {
        console.error("处理课程数据时出错:", courseErr);
        // 如果课程处理失败也不影响整体数据
      }
      
      // 构建学生详情对象
      const studentDetailsObj = {
        address: studentAddress,
        name,
        phone,
        email,
        college,
        major,
        grade,
        avatar,
        courseCount,
        evaluationCount,
        courses
      };
      
      console.log("处理后的学生详情:", studentDetailsObj);
      setStudentDetails(studentDetailsObj);
      setLoadingDetails(false);
    } catch (err) {
      console.error("获取学生详情失败:", err);
      message.error('获取学生详情失败: ' + (err.message || err));
      setLoadingDetails(false);
    }
  };

  // 查看特定课程
  const viewCourse = (courseId) => {
    router.push(`/adminViewCourse/${courseId}`);
  };

  // 关闭详情模态框
  const handleDetailsModalClose = () => {
    setDetailsVisible(false);
    setSelectedStudent(null);
    setStudentDetails(null);
  };

  // 生成学生详情表格列
  const generateStudentColumns = () => [
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
      title: '选修课程数',
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
      title: '评价数',
      dataIndex: 'evaluationsCount',
      key: 'evaluationsCount',
      sorter: (a, b) => a.evaluationsCount - b.evaluationsCount,
      render: (count) => (
        <Tag color={count > 0 ? 'green' : 'default'}>
          {count}
        </Tag>
      ),
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
            onClick={() => viewStudentDetails(record.address)}
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
              defaultSelectedKeys={['4']}
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
                { title: '学生管理' }
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
                <h2 style={{ margin: 0 }}>学生用户管理</h2>
                <Space>
                  <Search
                    placeholder="搜索学生姓名、地址或联系方式"
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
                        title="学生总数"
                        value={studentAddresses.length}
                        prefix={<TeamOutlined />}
                        valueStyle={{ color: '#1677ff' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card bordered={false}>
                      <Statistic
                        title="已选课学生数"
                        value={students.filter(s => s.coursesCount > 0).length}
                        prefix={<ShoppingOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card bordered={false}>
                      <Statistic
                        title="已评价学生数"
                        value={students.filter(s => s.evaluationsCount > 0).length}
                        prefix={<FileTextOutlined />}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>

              {/* 学生列表表格 */}
              <Table
                columns={generateStudentColumns()}
                dataSource={filteredStudents.length > 0 ? filteredStudents : students}
                pagination={pagination}
                onChange={handleTableChange}
                loading={tableLoading}
                rowKey="address"
                bordered
                size="middle"
                scroll={{ x: 'max-content' }}
              />
              
              {/* 学生详情模态框 */}
              <Modal
                title="学生详细信息"
                open={detailsVisible}
                onCancel={handleDetailsModalClose}
                footer={[
                  <Button key="back" onClick={handleDetailsModalClose}>
                    关闭
                  </Button>
                ]}
                width={700}
              >
                {loadingDetails ? (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                    <p style={{ marginTop: 16 }}>加载学生详情中...</p>
                  </div>
                ) : studentDetails ? (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                      {studentDetails.avatar ? (
                        <Avatar 
                          size={64} 
                          src={studentDetails.avatar} 
                          style={{ backgroundColor: '#1677ff' }}
                        />
                      ) : (
                        <Avatar 
                          size={64} 
                          icon={<UserOutlined />} 
                          style={{ backgroundColor: '#1677ff' }}
                        />
                      )}
                      <h2 style={{ marginTop: 16, marginBottom: 4 }}>{studentDetails.name}</h2>
                      <p style={{ color: '#666' }}>{studentDetails.address}</p>
                    </div>
                    
                    <Divider orientation="left">基本信息</Divider>
                    <Row gutter={16}>
                      <Col span={12}>
                        <p><PhoneOutlined style={{ marginRight: 8 }} /> 联系方式: {studentDetails.phone}</p>
                      </Col>
                      <Col span={12}>
                        <p><MailOutlined style={{ marginRight: 8 }} /> 邮箱: {studentDetails.email || '未设置'}</p>
                      </Col>
                      <Col span={12}>
                        <p><TeamOutlined style={{ marginRight: 8 }} /> 学院: {studentDetails.college || '未设置'}</p>
                      </Col>
                      <Col span={12}>
                        <p><BookOutlined style={{ marginRight: 8 }} /> 专业: {studentDetails.major || '未设置'}</p>
                      </Col>
                      <Col span={12}>
                        <p><UserOutlined style={{ marginRight: 8 }} /> 年级: {studentDetails.grade || '未设置'}</p>
                      </Col>
                      <Col span={12}>
                        <p><BookOutlined style={{ marginRight: 8 }} /> 选修课程数: {studentDetails.courseCount}</p>
                      </Col>
                      <Col span={12}>
                        <p><CommentOutlined style={{ marginRight: 8 }} /> 提交评价数: {studentDetails.evaluationCount}</p>
                      </Col>
                    </Row>
                    
                    {studentDetails.courses && studentDetails.courses.length > 0 && (
                      <>
                        <Divider orientation="left">已选课程</Divider>
                        <List
                          itemLayout="horizontal"
                          dataSource={studentDetails.courses}
                          renderItem={item => (
                            <List.Item 
                              actions={[
                                <Tag color={item.hasEvaluated ? 'green' : 'orange'}>
                                  {item.hasEvaluated ? '已评价' : '未评价'}
                                </Tag>,
                                <Button 
                                  type="link" 
                                  size="small"
                                  onClick={() => viewCourse(item.id)}
                                >
                                  查看课程
                                </Button>
                              ]}
                            >
                              <List.Item.Meta
                                avatar={<Avatar icon={<BookOutlined />} style={{ backgroundColor: '#1677ff' }} />}
                                title={item.name}
                                description={`课程ID: ${item.id}`}
                              />
                            </List.Item>
                          )}
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p>未能加载学生信息</p>
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