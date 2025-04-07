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
  Tag,
  Tooltip
} from 'antd';
import { 
  LockOutlined, 
  WalletOutlined, 
  LoginOutlined, 
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
  BlockOutlined,
  LinkOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined,
  TeamOutlined
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
          if (info && info[8]) { // isRegistered 索引为8
            setUserInfo({
              name: info[0],
              phone: info[1],
              email: info[2],
              college: info[3],
              major: info[4],
              grade: info[5],
              avatar: info[6],
              role: info[7]
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
          localStorage.setItem('userAvatar', userInfo.avatar || '');
          localStorage.setItem('userEmail', userInfo.email || '');
          localStorage.setItem('userCollege', userInfo.college || '');
          localStorage.setItem('userMajor', userInfo.major || '');
          localStorage.setItem('userGrade', userInfo.grade || '');
          
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
              redirectPath = '/adminIndex'; // 教师跳转到教师首页
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
            icon={<CheckCircleOutlined className={styles.statusIcon} />}
            message={
              <div className={styles.statusMessage}>
                <div className={styles.statusTitle}>钱包已连接</div>
                <div className={styles.statusAddress}>{account}</div>
                <div className={styles.statusWelcome}>欢迎回来，{userInfo.name}</div>
                <Tag color="green" icon={<SafetyOutlined />} className={styles.secureTag}>安全连接</Tag>
              </div>
            }
            className={styles.walletAlert}
          />
        );
      } else {
        return (
          <Alert
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined className={styles.statusIcon} />}
            message={
              <div className={styles.statusMessage}>
                <div className={styles.statusTitle}>钱包已连接</div>
                <div className={styles.statusAddress}>{account}</div>
                <div className={styles.statusError}>此地址未注册，请先注册</div>
                <Tag color="orange" icon={<UserOutlined />} className={styles.registerTag}>需要注册</Tag>
              </div>
            }
            className={styles.walletAlert}
          />
        );
      }
    } else {
      return (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined className={styles.statusIcon} />}
          message={
            <div className={styles.statusMessage}>
              <div className={styles.statusTitle}>钱包未连接</div>
              <div className={styles.statusInfo}>请通过MetaMask连接钱包以登录</div>
              <Tag color="blue" icon={<WalletOutlined />} className={styles.connectTag}>点击连接</Tag>
            </div>
          }
          className={styles.walletAlert}
        />
      );
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <div className={styles.loginContainer}>
        <div className={styles.blockchainBg}></div>
        
        <div className={styles.blockchainCubes}>
          {[...Array(12)].map((_, i) => {
            const size = 20 + Math.random() * 25;
            return (
              <div 
                key={`cube-${i}`} 
                className={styles.cube}
                style={{
                  top: `${5 + Math.random() * 90}%`,
                  left: `${5 + Math.random() * 90}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  '--size': `${size}px`,
                  '--translate-x': `${(Math.random() - 0.5) * 250}px`,
                  '--translate-y': `${(Math.random() - 0.5) * 250}px`,
                  '--translate-x2': `${(Math.random() - 0.5) * 200}px`,
                  '--translate-y2': `${(Math.random() - 0.5) * 200}px`,
                  animationDuration: `${25 + Math.random() * 20}s`,
                  animationDelay: `${Math.random() * -20}s`
                }}
              >
                <div className={`${styles.cubeFace} ${styles.cubeFace1}`}></div>
                <div className={`${styles.cubeFace} ${styles.cubeFace2}`}></div>
                <div className={`${styles.cubeFace} ${styles.cubeFace3}`}></div>
                <div className={`${styles.cubeFace} ${styles.cubeFace4}`}></div>
                <div className={`${styles.cubeFace} ${styles.cubeFace5}`}></div>
                <div className={`${styles.cubeFace} ${styles.cubeFace6}`}></div>
              </div>
            );
          })}
        </div>
        
        <div className={styles.blockchainNodes}>
          <div className={styles.node1}></div>
          <div className={styles.node2}></div>
          <div className={styles.node3}></div>
          <div className={styles.node4}></div>
          <div className={styles.node5}></div>
          <div className={styles.node6}></div>
          <div className={styles.node7}></div>
          <div className={styles.node8}></div>
          <div className={styles.node9}></div>
          <div className={styles.node10}></div>
          <div className={styles.node11}></div>
          <div className={styles.node12}></div>
        </div>
        
        <div className={styles.blockchainParticles}>
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className={styles.particle} 
              style={{
                top: `${Math.random() * 100}%`, 
                left: `${Math.random() * 100}%`,
                '--translate-x': `${(Math.random() - 0.5) * 200}px`,
                '--translate-y': `${(Math.random() - 0.5) * 200}px`,
                animationDelay: `${Math.random() * 15}s`
              }}
            />
          ))}
        </div>
        
        <div className={styles.blockchainLines}>
          <div className={styles.line1}></div>
          <div className={styles.line2}></div>
          <div className={styles.line3}></div>
          <div className={styles.line4}></div>
          <div className={styles.line5}></div>
          <div className={styles.line6}></div>
        </div>
        
        <div className={styles.loginBox}>
          <Card className={styles.loginCard} bordered={false}>
            <div className={styles.logoContainer}>
              <div className={styles.logoWrapper}>
                <Image 
                  src="/images/logo1.png" 
                  alt="ChainRate Logo" 
                  width={60} 
                  height={60}
                  className={styles.logo}
                />
              </div>
              <Title level={2} className={styles.loginTitle}>链评系统 ChainRate</Title>
              <Text className={styles.loginSubtitle}>基于区块链的教学评价系统</Text>
              
              <Space className={styles.tagContainer}>
                <Tag icon={<BlockOutlined />} color="blue">区块链</Tag>
                <Tag icon={<SafetyOutlined />} color="green">安全</Tag>
                <Tag icon={<GlobalOutlined />} color="purple">透明</Tag>
                <Tag icon={<SafetyCertificateOutlined />} color="cyan">可信</Tag>
              </Space>
            </div>

            <div className={styles.walletStatusContainer}>
              {getWalletStatusComponent()}
            </div>

            {/* <Space direction="vertical" size="middle" className={styles.loginInfo}>
              <div className={styles.infoCard}>
                <Tooltip title="基于区块链技术，确保数据安全">
                  <SafetyOutlined className={styles.infoIcon} />
                </Tooltip>
                <Text>登录将通过验证您的密码和钱包地址完成，保障账户安全</Text>
              </div>
              <div className={styles.infoCard}>
                <Tooltip title="无需支付gas费">
                  <WalletOutlined className={styles.infoIcon} />
                </Tooltip>
                <Text>需要在MetaMask中确认，但不会产生任何手续费</Text>
              </div>
            </Space> */}

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
                  prefix={<LockOutlined className={styles.inputIcon} />} 
                  placeholder="请输入密码" 
                  size="large"
                  className={styles.passwordInput}
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
                  {loading ? '登录中...' : '安全登录'}
                </Button>
              </Form.Item>
            </Form>

            <Divider className={styles.divider}>
              <Text className={styles.dividerText}>没有账户?</Text>
            </Divider>
            
            <Button 
              block 
              size="large" 
              onClick={() => router.push('/register')}
              icon={<UserOutlined />}
              className={styles.registerButton}
            >
              注册新账户
            </Button>
            
            <div className={styles.footerText}>
              <BlockOutlined className={styles.footerIcon} />
              <Text className={styles.footerContent}>ChainRate - 区块链教学评价系统</Text>
            </div>
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
} 