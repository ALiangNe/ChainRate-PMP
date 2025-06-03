'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import Link from 'next/link';
import { default as NextImage } from 'next/image';

// 导入合约
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import ChainRate02ABI from '../../contracts/ChainRate02.json';
import ChainRate02Address from '../../contracts/ChainRate02-address.json';

// 导入图表组件
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

// 导入Ant Design组件
import { 
  Breadcrumb, 
  Layout, 
  ConfigProvider, 
  theme,
  Card,
  Row,
  Col,
  Statistic,
  Divider,
  Typography,
  Spin,
  Alert,
  Select,
  DatePicker,
  Empty,
  List,
  Button,
  message,
  Tabs,
  Tag
} from 'antd';

// 导入图标
import {
  UserOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  PieChartOutlined,
  BarChartOutlined,
  LineChartOutlined,
  DownOutlined,
  RightOutlined
} from '@ant-design/icons';

// 导入自定义组件
import UserAvatar from '../components/UserAvatar';
import TeacherSidebar from '../components/TeacherSidebar';

// 导入样式
import styles from './page.module.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

export default function TeacherFeedbackAnalysisPage() {
  const router = useRouter();
  
  // 获取主题变量
  const { token } = theme.useToken();
  const { colorBgContainer, borderRadiusLG } = token;
  
  // 用户信息状态
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
  
  // 数据加载状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Web3相关状态
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [contract02, setContract02] = useState(null);
  
  // 课程和反馈状态
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  
  // 图表状态
  const [chartsVisible, setChartsVisible] = useState(true);
  const [dateRange, setDateRange] = useState(null);
  
  // 统计数据
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFeedbacks: 0,
    repliedCount: 0,
    pendingCount: 0
  });
  
  // 图表数据
  const [chartData, setChartData] = useState({
    statusDistribution: [],
    courseDistribution: [],
    monthlyTrend: [],
    collegeDistribution: []
  });
  
  // 最近反馈列表
  const [recentFeedbacks, setRecentFeedbacks] = useState([]);
  
  // 初始化检查用户登录状态和加载数据
  useEffect(() => {
    // 检查用户是否已登录且是教师角色
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
        
        // 连接到ChainRate02合约
        const chainRate02Contract = new ethers.Contract(
          ChainRate02Address.address,
          ChainRate02ABI.abi,
          signer
        );
        setContract02(chainRate02Contract);
        
        // 加载教师课程
        await loadTeacherCourses(chainRateContract, chainRate02Contract, await signer.getAddress());
        
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router]);
  
  // 加载教师课程和反馈数据
  const loadTeacherCourses = async (contractInstance, contract02Instance, teacherAddress) => {
    try {
      setLoading(true);
      
      // 获取所有课程，然后过滤出教师创建的课程
      const allCourseIds = await contractInstance.getAllCourses();
      
      // 获取所有课程详情，并筛选出教师创建的课程
      const coursesList = [];
      const allFeedbacks = [];
      
      for (let i = 0; i < allCourseIds.length; i++) {
        try {
          const courseId = allCourseIds[i];
          
          // 获取课程详情
          const course = await contractInstance.courses(courseId);
          
          // 检查是否是当前教师创建的课程
          if (course.teacher.toLowerCase() === teacherAddress.toLowerCase()) {
            const courseObj = {
              id: courseId.toString(),
              name: course.name,
              teacher: course.teacher,
              isActive: course.isActive,
              studentsCount: Number(course.studentCount),
              feedbacks: []
            };
            
            coursesList.push(courseObj);
            
            // 获取课程反馈
            try {
              const feedbackIds = await contract02Instance.getCourseFeedbacks(courseId);
              
              for (let j = 0; j < feedbackIds.length; j++) {
                const feedbackId = feedbackIds[j];
                const feedback = await contract02Instance.getCourseFeedbackDetails(feedbackId);
                
                // 获取学生信息
                let studentName = "未知学生";
                let studentCollege = "未知学院";
                
                try {
                  const student = await contractInstance.getUserInfo(feedback.student);
                  studentName = student.name;
                  studentCollege = student.college;
                } catch (err) {
                  console.error("获取学生信息失败:", err);
                }
                
                // 检查反馈是否已回复
                const hasReply = Number(feedback.status) === 1; // 1 表示已回复
                
                // 格式化时间戳
                const timestamp = new Date(Number(feedback.timestamp) * 1000);
                
                const feedbackObj = {
                  id: feedbackId.toString(),
                  courseId: courseId.toString(),
                  courseName: course.name,
                  content: feedback.contentHash,
                  student: {
                    address: feedback.student,
                    name: studentName,
                    college: studentCollege
                  },
                  timestamp: timestamp,
                  formattedDate: timestamp.toLocaleString('zh-CN'),
                  hasReply: hasReply,
                  status: Number(feedback.status)
                };
                
                courseObj.feedbacks.push(feedbackObj);
                allFeedbacks.push(feedbackObj);
              }
            } catch (err) {
              console.error(`获取课程 ${courseId} 反馈失败:`, err);
            }
          }
        } catch (error) {
          console.error(`获取课程详情失败 ${allCourseIds[i]}:`, error);
        }
      }
      
      setCourses(coursesList);
      setFeedbacks(allFeedbacks);
      
      // 计算统计数据
      calculateStats(coursesList, allFeedbacks);
      
      // 处理图表数据
      processChartData(coursesList, allFeedbacks);
      
      // 获取最近反馈
      const recentFeedbacksList = [...allFeedbacks];
      recentFeedbacksList.sort((a, b) => b.timestamp - a.timestamp);
      setRecentFeedbacks(recentFeedbacksList.slice(0, 5));
      
      setLoading(false);
    } catch (err) {
      console.error("加载教师课程失败:", err);
      setError('获取教师课程失败: ' + (err.message || err));
      setLoading(false);
    }
  };
  
  // 计算统计数据
  const calculateStats = (coursesList, feedbacksList) => {
    // 统计学生总数
    const uniqueStudents = new Set();
    feedbacksList.forEach(feedback => {
      uniqueStudents.add(feedback.student.address);
    });
    
    // 统计已回复和未回复反馈数
    const repliedFeedbacks = feedbacksList.filter(feedback => feedback.hasReply);
    const pendingFeedbacks = feedbacksList.filter(feedback => !feedback.hasReply);
    
    setStats({
      totalStudents: uniqueStudents.size,
      totalFeedbacks: feedbacksList.length,
      repliedCount: repliedFeedbacks.length,
      pendingCount: pendingFeedbacks.length
    });
  };
  
  // 处理图表数据
  const processChartData = (coursesList, feedbacksList) => {
    // 1. 状态分布
    const statusData = [
      { name: '已回复', value: feedbacksList.filter(f => f.hasReply).length },
      { name: '待回复', value: feedbacksList.filter(f => !f.hasReply).length }
    ];
    
    // 2. 课程分布
    const courseData = coursesList.map(course => ({
      name: course.name,
      value: course.feedbacks.length
    }));
    
    // 3. 月度趋势
    const monthlyData = {};
    feedbacksList.forEach(feedback => {
      const date = new Date(feedback.timestamp);
      const month = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!monthlyData[month]) {
        monthlyData[month] = 0;
      }
      monthlyData[month]++;
    });
    
    const monthlyTrendData = Object.keys(monthlyData).map(month => ({
      month: month,
      count: monthlyData[month]
    }));
    
    // 4. 学院分布
    const collegeData = {};
    feedbacksList.forEach(feedback => {
      const college = feedback.student.college || '未知学院';
      if (!collegeData[college]) {
        collegeData[college] = 0;
      }
      collegeData[college]++;
    });
    
    const collegeDistributionData = Object.keys(collegeData).map(college => ({
      name: college,
      value: collegeData[college]
    }));
    
    setChartData({
      statusDistribution: statusData,
      courseDistribution: courseData,
      monthlyTrend: monthlyTrendData.sort((a, b) => {
        const [yearA, monthA] = a.month.split('-').map(Number);
        const [yearB, monthB] = b.month.split('-').map(Number);
        if (yearA !== yearB) return yearA - yearB;
        return monthA - monthB;
      }),
      collegeDistribution: collegeDistributionData
    });
  };
  
  // 处理日期范围变化
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    
    if (!dates || !dates[0] || !dates[1]) {
      // 如果清除日期范围，则显示所有数据
      processChartData(courses, feedbacks);
      return;
    }
    
    // 根据日期范围过滤反馈
    const startDate = dates[0].startOf('day').valueOf();
    const endDate = dates[1].endOf('day').valueOf();
    
    const filteredFeedbacks = feedbacks.filter(feedback => {
      const feedbackDate = feedback.timestamp.getTime();
      return feedbackDate >= startDate && feedbackDate <= endDate;
    });
    
    // 重新计算统计数据和图表数据
    calculateStats(courses, filteredFeedbacks);
    processChartData(courses, filteredFeedbacks);
    
    // 更新最近反馈
    const recentFeedbacksList = [...filteredFeedbacks];
    recentFeedbacksList.sort((a, b) => b.timestamp - a.timestamp);
    setRecentFeedbacks(recentFeedbacksList.slice(0, 5));
    
    // 显示筛选结果提示
    message.info(`已筛选 ${filteredFeedbacks.length} 条反馈记录`);
  };
  
  // 图表颜色配置
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const STATUS_COLORS = ['#52c41a', '#ff4d4f']; // 绿色表示已回复，红色表示待回复
  
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8',
        },
      }}
    >
      <Layout className={styles.layout}>
        <Header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>
              <NextImage 
                src="/images/logo1.png" 
                alt="链评系统Logo" 
                width={40} 
                height={40}
                style={{ borderRadius: '6px' }}
              />
            </div>
            <div className={styles.headerTitle}>
              链评系统（ChainRate）- 教师端
            </div>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.welcomeText}>欢迎, {userData.name}</span>
            <UserAvatar color="#fff" />
          </div>
        </Header>
        <Layout>
          <TeacherSidebar defaultSelectedKey="8" defaultOpenKey="sub3" />
          <Layout className={styles.contentLayout}>
            <Breadcrumb
              items={[
                { title: '首页' },
                { title: '教学反馈' },
                { title: '反馈分析' },
              ]}
              className={styles.breadcrumb}
            />
            <Content
              className={styles.content}
              style={{
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
              }}
            >
              {loading ? (
                <div className={styles.loadingContainer}>
                  <Spin size="large" />
                  <div className={styles.loadingText}>加载中...</div>
                </div>
              ) : error ? (
                <Alert
                  message="错误"
                  description={error}
                  type="error"
                  showIcon
                  className={styles.errorAlert}
                />
              ) : (
                <>
                  {/* 顶部统计卡片 */}
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                      <Card bordered={false} className={styles.statCard}>
                        <Statistic
                          title="参与反馈学生数"
                          value={stats.totalStudents}
                          prefix={<UserOutlined />}
                          valueStyle={{ color: '#1a73e8' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card bordered={false} className={styles.statCard}>
                        <Statistic
                          title="总反馈数"
                          value={stats.totalFeedbacks}
                          prefix={<MessageOutlined />}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card bordered={false} className={styles.statCard}>
                        <Statistic
                          title="已回复反馈"
                          value={stats.repliedCount}
                          prefix={<CheckCircleOutlined />}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card bordered={false} className={styles.statCard}>
                        <Statistic
                          title="待回复反馈"
                          value={stats.pendingCount}
                          prefix={<ClockCircleOutlined />}
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Card>
                    </Col>
                  </Row>
                  
                  {/* 日期筛选 */}
                  <Card 
                    bordered={false}
                    className={styles.dateFilterCard}
                    title="日期筛选"
                    extra={
                      <Button 
                        type="text" 
                        onClick={() => setDateRange(null)}
                        disabled={!dateRange}
                      >
                        清除筛选
                      </Button>
                    }
                  >
                    <RangePicker 
                      onChange={handleDateRangeChange}
                      style={{ width: '100%' }}
                      placeholder={['开始日期', '结束日期']}
                      value={dateRange}
                    />
                  </Card>
                  
                  {/* 图表区域 */}
                  <Card 
                    bordered={false}
                    className={styles.chartsCard}
                    title={
                      <div 
                        className={styles.cardTitle}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setChartsVisible(!chartsVisible)}
                      >
                        <span>反馈数据可视化</span>
                        {chartsVisible ? <DownOutlined /> : <RightOutlined />}
                      </div>
                    }
                  >
                    {chartsVisible && (
                      <Tabs defaultActiveKey="distribution">
                        <TabPane 
                          tab={
                            <span>
                              <PieChartOutlined />
                              状态分布
                            </span>
                          } 
                          key="distribution"
                        >
                          <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                              <Card 
                                title="反馈状态分布" 
                                bordered={false}
                              >
                                <div style={{ height: 300 }}>
                                  {chartData.statusDistribution.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                        <Pie
                                          data={chartData.statusDistribution}
                                          cx="50%"
                                          cy="50%"
                                          labelLine={false}
                                          outerRadius={100}
                                          fill="#8884d8"
                                          dataKey="value"
                                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                          {chartData.statusDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                                          ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${value}条反馈`, '数量']} />
                                        <Legend />
                                      </PieChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <Empty description="暂无数据" />
                                  )}
                                </div>
                              </Card>
                            </Col>
                            <Col xs={24} md={12}>
                              <Card 
                                title="课程反馈分布" 
                                bordered={false}
                              >
                                <div style={{ height: 300 }}>
                                  {chartData.courseDistribution.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                      <BarChart
                                        data={chartData.courseDistribution}
                                        layout="vertical"
                                      >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={150} />
                                        <Tooltip formatter={(value) => [`${value}条反馈`, '数量']} />
                                        <Legend />
                                        <Bar dataKey="value" name="反馈数量" fill="#1a73e8" />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <Empty description="暂无数据" />
                                  )}
                                </div>
                              </Card>
                            </Col>
                          </Row>
                        </TabPane>
                        
                        <TabPane 
                          tab={
                            <span>
                              <LineChartOutlined />
                              趋势与分布
                            </span>
                          } 
                          key="trends"
                        >
                          <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                              <Card 
                                title="月度反馈趋势" 
                                bordered={false}
                              >
                                <div style={{ height: 300 }}>
                                  {chartData.monthlyTrend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart
                                        data={chartData.monthlyTrend}
                                      >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => [`${value}条反馈`, '数量']} />
                                        <Legend />
                                        <Line 
                                          type="monotone" 
                                          dataKey="count" 
                                          name="反馈数量" 
                                          stroke="#1a73e8" 
                                          activeDot={{ r: 8 }} 
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <Empty description="暂无数据" />
                                  )}
                                </div>
                              </Card>
                            </Col>
                            <Col xs={24} md={12}>
                              <Card 
                                title="学院分布" 
                                bordered={false}
                              >
                                <div style={{ height: 300 }}>
                                  {chartData.collegeDistribution.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                        <Pie
                                          data={chartData.collegeDistribution}
                                          cx="50%"
                                          cy="50%"
                                          labelLine={false}
                                          outerRadius={100}
                                          fill="#8884d8"
                                          dataKey="value"
                                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        >
                                          {chartData.collegeDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                          ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`${value}条反馈`, '数量']} />
                                        <Legend />
                                      </PieChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <Empty description="暂无数据" />
                                  )}
                                </div>
                              </Card>
                            </Col>
                          </Row>
                        </TabPane>
                      </Tabs>
                    )}
                  </Card>
                  
                  {/* 最近反馈列表 */}
                  <Card 
                    bordered={false}
                    className={styles.recentFeedbackCard}
                    title="最近反馈"
                    extra={
                      <Link href="/teacherViewFeedback">
                        <Button type="link">查看全部</Button>
                      </Link>
                    }
                  >
                    {recentFeedbacks.length > 0 ? (
                      <List
                        itemLayout="horizontal"
                        dataSource={recentFeedbacks}
                        renderItem={item => (
                          <List.Item
                            actions={[
                              <Tag 
                                color={item.hasReply ? "success" : "warning"}
                                icon={item.hasReply ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                              >
                                {item.hasReply ? "已回复" : "待回复"}
                              </Tag>
                            ]}
                          >
                            <List.Item.Meta
                              title={`来自 ${item.student.name} 的反馈`}
                              description={
                                <div>
                                  <div>课程: {item.courseName}</div>
                                  <div>提交时间: {item.formattedDate}</div>
                                  <div>学院: {item.student.college}</div>
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description="暂无反馈数据" />
                    )}
                  </Card>
                </>
              )}
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
} 