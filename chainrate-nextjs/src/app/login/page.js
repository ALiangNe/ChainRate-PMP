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
  Spin,
  Space,
  Tag
} from 'antd';
import { 
  LockOutlined, 
  WalletOutlined, 
  LoginOutlined, 
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

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
        
        // 尝试获取用户信息
        try {
          const info = await chainRateContract.getUserInfo(account);
          // 检查用户是否已注册
          if (info && info[3]) { // isRegistered
            setUserInfo({
              name: info[0],
              phone: info[1],
              role: info[2]
            });
          }
        } catch (err) {
          console.log("获取用户信息失败或用户未注册", err);
        }
        
        // 监听账户变化
        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0]);
          window.location.reload(); // 重新加载页面以刷新状态
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
      // 表单验证已由 Ant Design Form 组件处理
      const password = values.password;

      if (!walletConnected) {
        setError('请先连接钱包');
        setLoading(false);
        return;
      }

      if (!userInfo) {
        setError('当前钱包地址未注册，请先注册');
        setLoading(false);
        return;
      }

      console.log('正在验证登录...');

      // 将密码转换为哈希值
      const passwordHash = ethers.keccak256(ethers.toUtf8Bytes(password));
      
      // 调用合约验证密码
      const isValidPassword = await contract.verifyPassword(passwordHash);

      if (isValidPassword) {
        console.log('登录成功');
        
        try {
          // 获取用户角色哈希值
          const roleHash = userInfo.role.toString();
          console.log('用户角色哈希值:', roleHash);
          
          // 存储登录状态到本地存储
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userAddress', account);
          localStorage.setItem('userName', userInfo.name);
          localStorage.setItem('userRoleHash', roleHash);
          
          // 尝试从合约获取角色常量
          try {
            const STUDENT_ROLE = await contract.STUDENT_ROLE();
            const TEACHER_ROLE = await contract.TEACHER_ROLE();
            const ADMIN_ROLE = await contract.ADMIN_ROLE();
            
            let readableRole = 'unknown';
            let redirectPath = '/dashboard'; // 默认重定向路径
            
            if (roleHash === STUDENT_ROLE.toString()) {
              readableRole = 'student';
              redirectPath = '/studentIndex'; // 学生跳转到学生首页
            } else if (roleHash === TEACHER_ROLE.toString()) {
              readableRole = 'teacher';
              redirectPath = '/teacherIndex'; // 教师跳转到教师首页
            } else if (roleHash === ADMIN_ROLE.toString()) {
              readableRole = 'admin';
              // 未来可以添加管理员首页路径
            }
            localStorage.setItem('userRole', readableRole);
            
            // 登录成功提示
            message.success('登录成功！');
            
            // 根据角色重定向到不同页面
            router.push(redirectPath);
            
          } catch (err) {
            console.warn('获取角色常量失败', err);
            localStorage.setItem('userRole', 'user'); // 默认角色
            router.push('/dashboard'); // 默认重定向
          }
        } catch (err) {
          console.warn('处理角色信息时出错', err);
          localStorage.setItem('userRole', 'user'); // 默认角色
          router.push('/dashboard'); // 默认重定向
        }
      } else {
        setError('密码错误，请重试');
      }
    } catch (err) {
      console.error("登录失败:", err);
      
      // 特殊处理用户拒绝的情况
      if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        setError('您取消了交易。如需继续登录，请重新提交并在MetaMask中确认。');
      } else {
        setError('登录失败: ' + (err.message || err));
      }
    } finally {
      setLoading(false);
    }
  };

  const getWalletStatusComponent = () => {
    if (walletConnected) {
      if (userInfo) {
        return (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message={
              <div>
                <div className="font-bold">钱包已连接</div>
                <div className="text-xs mt-1 break-all">{account}</div>
                <div className="text-sm mt-1">欢迎，{userInfo.name}</div>
              </div>
            }
          />
        );
      } else {
        return (
          <Alert
            type="warning"
            showIcon
            message={
              <div>
                <div className="font-bold">钱包已连接</div>
                <div className="text-xs mt-1 break-all">{account}</div>
                <div className="text-sm mt-1 text-red-500">此地址未注册，请先注册</div>
              </div>
            }
          />
        );
      }
    } else {
      return (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={
            <div>
              <div className="font-bold">钱包未连接</div>
              <div className="text-xs mt-1">请通过MetaMask连接钱包以登录</div>
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
      <div className={styles.loginContainer}>
        <Row className={styles.loginRow}>
          <Col xs={0} sm={0} md={12} className={styles.leftSide}>
            <div className={styles.imageWrapper}>
              <Image
                src="/images/logo1.png"
                alt="Blockchain Technology"
                width={600}
                height={600}
                priority
                className={styles.loginImage}
              />
              <div className={styles.overlayText}>
                <Title level={2} style={{ color: 'white', marginBottom: 16 }}>链评系统 ChainRate</Title>
                <Text style={{ color: 'white', fontSize: 16 }}>基于区块链的教学评价系统，安全、透明、高效</Text>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={24} md={12} className={styles.rightSide}>
            <Card className={styles.loginCard} bordered={false}>
              <div className={styles.logoContainer}>
                <Image 
                  src="/images/logo1.png" 
                  alt="ChainRate Logo" 
                  width={60} 
                  height={60}
                  style={{ borderRadius: '8px' }}
                />
                <Title level={2} className={styles.loginTitle}>用户登录</Title>
              </div>

              <div className={styles.walletStatusContainer}>
                {getWalletStatusComponent()}
              </div>

              <Paragraph className={styles.loginInfo}>
                登录将通过验证您的密码和钱包地址来完成。登录过程需要在MetaMask钱包中确认，但不会产生手续费。
              </Paragraph>

              {error && (
                <Alert
                  message="登录失败"
                  description={error}
                  type="error"
                  showIcon
                  className={styles.errorAlert}
                />
              )}

              <Form
                form={form}
                name="login"
                layout="vertical"
                onFinish={handleSubmit}
                autoComplete="off"
                className={styles.loginForm}
              >
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: '请输入密码' }]}
                >
                  <Input.Password 
                    prefix={<LockOutlined />} 
                    placeholder="请输入密码" 
                    size="large"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    icon={<LoginOutlined />}
                    loading={loading}
                    disabled={!walletConnected || !userInfo}
                    className={styles.loginButton}
                  >
                    {loading ? '登录中...' : '登录'}
                  </Button>
                </Form.Item>
              </Form>

              <Divider plain>没有账户?</Divider>
              
              <Button 
                block 
                size="large" 
                onClick={() => router.push('/register')}
                icon={<UserOutlined />}
                className={styles.registerButton}
              >
                注册新账户
              </Button>
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
} 