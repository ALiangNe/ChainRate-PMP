'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import Image from 'next/image';
import styles from './page.module.css';
import { 
  Form, 
  Input, 
  Button, 
  Typography, 
  Divider, 
  message, 
  Row, 
  Col, 
  Card, 
  Alert,
  ConfigProvider,
  Select,
  Space
} from 'antd';
import { 
  LockOutlined, 
  UserOutlined, 
  LoginOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  PhoneOutlined,
  SolutionOutlined,
  TeamOutlined,
  MailOutlined,
  BankOutlined,
  BookOutlined,
  NumberOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export default function RegisterPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT_ROLE', // 默认角色
    phone: '', // 添加手机号
    email: '', // 添加邮箱
    college: '', // 添加学院
    major: '', // 添加专业
    grade: '' // 添加年级
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  // 初始化钱包连接
  useEffect(() => {
    const initWallet = async () => {
      // 检查是否有 MetaMask
      if (typeof window.ethereum === 'undefined') {
        setError('请安装 MetaMask 钱包以使用此应用');
        return;
      }
      
      try {
        // 请求用户连接钱包
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const account = accounts[0];
        setAccount(account);
        
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
        
        setWalletConnected(true);
        
        // 监听账户变化
        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0]);
        });
      } catch (err) {
        console.error("钱包连接失败:", err);
        setError('钱包连接失败: ' + (err.message || err));
      }
    };
    
    initWallet();
    
    return () => {
      // 清理事件监听
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  const handleSubmit = async (values) => {
    setError('');
    setLoading(true);

    try {
      // 验证密码匹配
      if (values.password !== values.confirmPassword) {
        setError('两次输入的密码不一致');
        setLoading(false);
        return;
      }

      if (!walletConnected) {
        setError('请先连接钱包');
        setLoading(false);
        return;
      }

      console.log('准备注册用户:', values);

      // 将密码转换为哈希值
      const passwordHash = ethers.keccak256(ethers.toUtf8Bytes(values.password));
      
      // 将角色字符串转换为 bytes32
      let roleBytes;
      if (values.role === 'STUDENT_ROLE') {
        roleBytes = ethers.keccak256(ethers.toUtf8Bytes("STUDENT_ROLE"));
      } else if (values.role === 'TEACHER_ROLE') {
        roleBytes = ethers.keccak256(ethers.toUtf8Bytes("TEACHER_ROLE"));
      } else if (values.role === 'ADMIN_ROLE') {
        roleBytes = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
      }

      // 调用合约的注册方法
      const tx = await contract.registerUser(
        values.username,
        values.phone,
        values.email,
        values.college,
        values.major,
        values.grade,
        passwordHash,
        roleBytes
      );

      // 等待交易确认
      console.log('交易已提交，等待确认...');
      await tx.wait();
      console.log('交易已确认', tx.hash);

      // 注册成功
      message.success('注册成功！');
      router.push('/login');
    } catch (err) {
      console.error("注册失败:", err);
      setError('注册失败: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const getWalletStatusComponent = () => {
    if (walletConnected) {
      return (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message={
            <div>
              <div className="font-bold">钱包已连接</div>
              <div className="text-xs mt-1 break-all">{account}</div>
            </div>
          }
        />
      );
    } else {
      return (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={
            <div>
              <div className="font-bold">钱包未连接</div>
              <div className="text-xs mt-1">请通过MetaMask连接钱包以完成注册</div>
            </div>
          }
        />
      );
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <div className={styles.registerContainer}>
        <Row className={styles.registerRow}>
          <Col xs={0} sm={0} md={12} className={styles.leftSide}>
            <div className={styles.imageWrapper}>
              <Image
                src="/images/logo1.png"
                alt="Blockchain Technology"
                width={600}
                height={600}
                priority
                className={styles.registerImage}
              />
              <div className={styles.overlayText}>
                <Title level={2} style={{ color: 'white', marginBottom: 16 }}>链评系统 ChainRate</Title>
                <Text style={{ color: 'white', fontSize: 16 }}>加入我们的区块链教学评价平台，提升教学质量与透明度</Text>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={24} md={12} className={styles.rightSide}>
            <Card className={styles.registerCard} bordered={false}>
              <div className={styles.logoContainer}>
                <Image 
                  src="/images/logo1.png" 
                  alt="ChainRate Logo" 
                  width={60} 
                  height={60}
                  style={{ borderRadius: '8px' }}
                />
                <Title level={2} className={styles.registerTitle}>创建新账户</Title>
              </div>

              <div className={styles.walletStatusContainer}>
                {getWalletStatusComponent()}
              </div>

              <Paragraph className={styles.registerInfo}>
                注册过程将在区块链上创建您的账户信息，需要在MetaMask钱包中确认交易。
              </Paragraph>

              {error && (
                <Alert
                  message="注册失败"
                  description={error}
                  type="error"
                  showIcon
                  className={styles.errorAlert}
                />
              )}

              <Form
                form={form}
                name="register"
                layout="vertical"
                initialValues={formData}
                onFinish={handleSubmit}
                autoComplete="off"
                className={styles.registerForm}
              >
                <Form.Item
                  name="username"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input 
                    prefix={<UserOutlined />} 
                    placeholder="请输入用户名" 
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="phone"
                  rules={[{ required: true, message: '请输入手机号码' }]}
                >
                  <Input 
                    prefix={<PhoneOutlined />} 
                    placeholder="请输入手机号码" 
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱' },
                    { type: 'email', message: '请输入有效的邮箱地址' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined />} 
                    placeholder="请输入邮箱" 
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="college"
                  rules={[{ required: true, message: '请输入所属学院' }]}
                >
                  <Input 
                    prefix={<BankOutlined />} 
                    placeholder="请输入所属学院" 
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="major"
                  rules={[{ required: true, message: '请输入所学专业' }]}
                >
                  <Input 
                    prefix={<BookOutlined />} 
                    placeholder="请输入所学专业" 
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="grade"
                  rules={[{ required: true, message: '请输入年级' }]}
                >
                  <Input 
                    prefix={<NumberOutlined />} 
                    placeholder="请输入年级，如：大一、大二" 
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: '请输入密码' },
                    { min: 6, message: '密码长度至少为6位' }
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="请输入密码" 
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  rules={[
                    { required: true, message: '请确认密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="请确认密码" 
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="role"
                  rules={[{ required: true, message: '请选择角色' }]}
                  initialValue="STUDENT_ROLE"
                >
                  <Select
                    size="large"
                    placeholder="请选择角色"
                    suffixIcon={<TeamOutlined />}
                  >
                    <Option value="STUDENT_ROLE">学生</Option>
                    <Option value="TEACHER_ROLE">教师</Option>
                    <Option value="ADMIN_ROLE">管理员</Option>
                  </Select>
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    icon={<SolutionOutlined />}
                    loading={loading}
                    disabled={!walletConnected}
                    className={styles.registerButton}
                  >
                    {loading ? '注册中...' : '注册'}
                  </Button>
                </Form.Item>
              </Form>

              <Divider plain>已有账户?</Divider>
              
              <Button 
                block 
                size="large" 
                onClick={() => router.push('/login')}
                icon={<LoginOutlined />}
                className={styles.loginButton}
              >
                登录
              </Button>
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
} 
