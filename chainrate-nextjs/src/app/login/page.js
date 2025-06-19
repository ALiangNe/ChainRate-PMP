'use client'; // 指示该组件在客户端渲染

// 导入所需的库和组件
import { useState, useEffect } from 'react'; // 导入 React 的状态和效果钩子
import { useRouter } from 'next/navigation'; // 导入 Next.js 的路由钩子
import { ethers } from 'ethers'; // 导入 ethers.js 库，用于与以太坊区块链交互
import ChainRateABI from '../../contracts/ChainRate.json'; // 导入合约的 ABI（应用程序二进制接口）
import ChainRateAddress from '../../contracts/ChainRate-address.json'; // 导入合约的地址
import Image from 'next/image'; // 导入 Next.js 的图片组件
import styles from './page.module.css'; // 导入样式文件
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
} from 'antd'; // 导入 Ant Design 组件库
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
} from '@ant-design/icons'; // 导入 Ant Design 图标
import { checkSession, setupSessionCheck, clearSession } from '../utils/authCheck'; // 导入会话检查工具函数

const { Title, Text, Paragraph } = Typography; // 解构 Typography 组件

// 格式化剩余锁定时间
const formatRemainingTime = (expiryDate) => {
  if (!expiryDate) return ''; // 如果没有过期时间，返回空字符串
  
  const now = new Date(); // 获取当前时间
  const diffMs = expiryDate.getTime() - now.getTime(); // 计算剩余时间（毫秒）
  
  if (diffMs <= 0) return '0分钟'; // 如果时间已过期，返回0分钟
  
  const diffMins = Math.ceil(diffMs / (60 * 1000)); // 将毫秒转换为分钟
  return `${diffMins}分钟`; // 返回剩余时间
};

export default function LoginPage() {
  const router = useRouter(); // 获取路由对象
  const [form] = Form.useForm(); // 创建表单实例
  const [formData, setFormData] = useState({ // 初始化表单数据
    password: '', // 密码
  });
  const [error, setError] = useState(''); // 错误信息状态
  const [loading, setLoading] = useState(false); // 加载状态
  const [walletConnected, setWalletConnected] = useState(false); // 钱包连接状态
  const [account, setAccount] = useState(''); // 用户账户
  const [provider, setProvider] = useState(null); // Web3 提供者
  const [signer, setSigner] = useState(null); // 签名者
  const [contract, setContract] = useState(null); // 合约实例
  const [userInfo, setUserInfo] = useState(null); // 用户信息状态
  
  // 添加登录尝试相关状态
  const [loginAttempts, setLoginAttempts] = useState(0); // 登录尝试次数
  const [accountLocked, setAccountLocked] = useState(false); // 账号锁定状态
  const [lockExpiry, setLockExpiry] = useState(null); // 锁定过期时间

  // 初始化时检查账号是否被锁定
  useEffect(() => {
    // 如果没有连接钱包，不进行锁定检查
    if (!account) return; // 如果没有账户，退出函数
    
    // 构建特定于当前账户的锁定键
    const accountLockKey = `accountLockedUntil_${account.toLowerCase()}`; // 锁定时间键
    const accountAttemptsKey = `loginAttempts_${account.toLowerCase()}`; // 登录尝试次数键
    
    const lockedUntil = localStorage.getItem(accountLockKey); // 获取锁定时间
    if (lockedUntil) {
      const expiryTime = parseInt(lockedUntil); // 解析锁定时间
      const now = Date.now(); // 获取当前时间
      
      if (now < expiryTime) {
        // 账号仍处于锁定状态
        setAccountLocked(true); // 设置账号锁定状态为真
        setLockExpiry(new Date(expiryTime)); // 设置锁定过期时间
        
        // 设置计时器解除锁定
        const timeout = setTimeout(() => {
          setAccountLocked(false); // 解除锁定
          localStorage.removeItem(accountLockKey); // 移除锁定时间
          localStorage.removeItem(accountAttemptsKey); // 移除尝试次数
          setLoginAttempts(0); // 重置尝试次数
        }, expiryTime - now); // 计算剩余时间
        
        return () => clearTimeout(timeout); // 清理计时器
      } else {
        // 锁定已过期，清除存储
        localStorage.removeItem(accountLockKey); // 移除锁定时间
        localStorage.removeItem(accountAttemptsKey); // 移除尝试次数
      }
    }
    
    // 恢复登录尝试次数
    const savedAttempts = localStorage.getItem(accountAttemptsKey); // 获取尝试次数
    if (savedAttempts) {
      setLoginAttempts(parseInt(savedAttempts)); // 设置尝试次数
    } else {
      // 如果切换了账户，重置尝试次数
      setLoginAttempts(0); // 重置尝试次数
    }
  }, [account]); // 依赖于account，确保账户变化时重新检查

  // 检查登录会话是否过期
  useEffect(() => {
    // 初次检查
    checkSession(router); // 检查会话状态
    
    // 设置定期检查
    return setupSessionCheck(router); // 设置会话检查
  }, [router]);

  // 初始化钱包连接
  useEffect(() => {
    const initWallet = async () => {
      // 检查是否有 MetaMask
      if (typeof window.ethereum === 'undefined') {
        setError('请安装 MetaMask 钱包以使用此应用'); // 提示用户安装 MetaMask
        return; // 退出函数
      }
      
      try {
        // 请求用户连接钱包
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }); // 请求账户
        const account = accounts[0]; // 获取第一个账户
        setAccount(account); // 设置账户
        
        // 创建 Web3 Provider
        const provider = new ethers.BrowserProvider(window.ethereum); // 创建以太坊提供者
        setProvider(provider); // 设置提供者
        
        // 获取 Signer
        const signer = await provider.getSigner(); // 获取签名者
        setSigner(signer); // 设置签名者
        
        // 连接到合约
        const chainRateContract = new ethers.Contract(
          ChainRateAddress.address, // 合约地址
          ChainRateABI.abi, // 合约 ABI
          signer // 签名者
        );
        setContract(chainRateContract); // 设置合约实例
        
        setWalletConnected(true); // 设置钱包连接状态为真
        
        // 尝试获取用户信息
        try {
          const info = await chainRateContract.getUserInfo(account); // 获取用户信息
          // 检查用户是否已注册
          if (info && info[8]) { // isRegistered 索引为8
            setUserInfo({
              name: info[0], // 用户名
              phone: info[1], // 手机号
              email: info[2], // 邮箱
              college: info[3], // 学院
              major: info[4], // 专业
              grade: info[5], // 年级
              avatar: info[6], // 头像
              role: info[7] // 角色
            });
          }
        } catch (err) {
          console.log("获取用户信息失败或用户未注册", err); // 打印错误信息
        }
        
        // 监听账户变化
        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0]); // 更新账户
          window.location.reload(); // 重新加载页面以刷新状态
        });
      } catch (err) {
        console.error("钱包连接失败:", err); // 打印错误信息
        setError('钱包连接失败: ' + (err.message || err)); // 设置错误信息
      }
    };
    
    initWallet(); // 初始化钱包连接
    
    return () => {
      // 清理事件监听
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged'); // 移除账户变化监听
      }
    };
  }, []); // 依赖数组为空，表示只在组件挂载时执行一次

  // 处理表单提交
  const handleSubmit = async (values) => {
    setError(''); // 清空错误信息
    setLoading(true); // 设置加载状态为真

    try {
      // 检查账号是否被锁定
      if (accountLocked) {
        setError(`账号已被锁定，请在 ${formatRemainingTime(lockExpiry)} 后重试`); // 提示用户账号锁定
        setLoading(false); // 设置加载状态为假
        return; // 退出函数
      }

      // 表单验证已由 Ant Design Form 组件处理
      const password = values.password; // 获取密码

      if (!walletConnected) {
        setError('请先连接钱包'); // 提示用户连接钱包
        setLoading(false); // 设置加载状态为假
        return; // 退出函数
      }

      if (!userInfo) {
        setError('当前钱包地址未注册，请先注册'); // 提示用户未注册
        setLoading(false); // 设置加载状态为假
        return; // 退出函数
      }

      console.log('正在验证登录...'); // 打印登录验证信息

      // 将密码转换为哈希值
      const passwordHash = ethers.keccak256(ethers.toUtf8Bytes(password)); // 哈希密码
      
      // 调用合约验证密码
      const isValidPassword = await contract.verifyPassword(passwordHash); // 验证密码

      if (isValidPassword) {
        console.log('登录成功'); // 打印登录成功信息
        
        // 登录成功，重置登录尝试次数
        setLoginAttempts(0); // 重置尝试次数
        const accountAttemptsKey = `loginAttempts_${account.toLowerCase()}`; // 登录尝试次数键
        localStorage.removeItem(accountAttemptsKey); // 移除尝试次数
        
        // 检查用户角色
        try {
          const roleHash = userInfo.role.toString(); // 获取用户角色哈希值
          console.log('用户角色哈希值:', roleHash); // 打印角色哈希值
          
          // 存储登录状态到本地存储
          localStorage.setItem('isLoggedIn', 'true'); // 设置登录状态
          localStorage.setItem('userAddress', account); // 存储用户地址
          localStorage.setItem('userName', userInfo.name); // 存储用户名
          localStorage.setItem('userRoleHash', roleHash); // 存储角色哈希
          localStorage.setItem('userAvatar', userInfo.avatar || ''); // 存储头像
          localStorage.setItem('userEmail', userInfo.email || ''); // 存储邮箱
          localStorage.setItem('userCollege', userInfo.college || ''); // 存储学院
          localStorage.setItem('userMajor', userInfo.major || ''); // 存储专业
          localStorage.setItem('userGrade', userInfo.grade || ''); // 存储年级
          
          // 存储登录时间，用于会话过期检查
          localStorage.setItem('loginTime', Date.now().toString()); // 存储登录时间
          
          // 尝试从合约获取角色常量
          try {
            const STUDENT_ROLE = await contract.STUDENT_ROLE(); // 获取学生角色常量
            const TEACHER_ROLE = await contract.TEACHER_ROLE(); // 获取教师角色常量
            const ADMIN_ROLE = await contract.ADMIN_ROLE(); // 获取管理员角色常量
            
            let readableRole = 'unknown'; // 可读角色
            let redirectPath = '/dashboard'; // 默认重定向路径
            
            // 根据角色重定向
            if (roleHash === STUDENT_ROLE.toString()) {
              readableRole = 'student'; // 学生角色
              redirectPath = '/studentIndex'; // 学生跳转到学生首页
            } else if (roleHash === TEACHER_ROLE.toString()) {
              readableRole = 'teacher'; // 教师角色
              redirectPath = '/teacherIndex'; // 教师跳转到教师首页
            } else if (roleHash === ADMIN_ROLE.toString()) {
              readableRole = 'admin'; // 管理员角色
              redirectPath = '/adminIndex'; // 管理员跳转到管理员首页
            }
            localStorage.setItem('userRole', readableRole); // 存储可读角色
            
            // 登录成功提示
            message.success('登录成功！'); // 提示用户登录成功
            
            // 根据角色重定向到不同页面
            router.push(redirectPath); // 跳转到相应页面
            
          } catch (err) {
            console.warn('获取角色常量失败', err); // 打印错误信息
            localStorage.setItem('userRole', 'user'); // 默认角色
            router.push('/dashboard'); // 默认重定向
          }
        } catch (err) {
          console.warn('处理角色信息时出错', err); // 打印错误信息
          localStorage.setItem('userRole', 'user'); // 默认角色
          router.push('/dashboard'); // 默认重定向
        }
      } else {
        // 密码错误，增加尝试次数
        const newAttempts = loginAttempts + 1; // 增加尝试次数
        setLoginAttempts(newAttempts); // 设置新的尝试次数
        
        // 使用特定于账户的键存储尝试次数
        const accountAttemptsKey = `loginAttempts_${account.toLowerCase()}`; // 登录尝试次数键
        localStorage.setItem(accountAttemptsKey, newAttempts.toString()); // 存储尝试次数
        
        // 检查是否需要锁定账号
        if (newAttempts >= 3) {
          // 锁定账号15分钟
          const lockTime = Date.now() + 15 * 60 * 1000; // 计算锁定时间
          setAccountLocked(true); // 设置账号锁定状态为真
          setLockExpiry(new Date(lockTime)); // 设置锁定过期时间
          
          // 使用特定于账户的键存储锁定时间
          const accountLockKey = `accountLockedUntil_${account.toLowerCase()}`; // 锁定时间键
          localStorage.setItem(accountLockKey, lockTime.toString()); // 存储锁定时间
          
          setError('账号已被锁定，请15分钟后重试'); // 提示用户账号锁定
        } else {
          setError(`用户名或密码错误（${newAttempts}/3次尝试）`); // 提示用户密码错误
        }
      }
    } catch (err) {
      console.error("登录失败:", err); // 打印错误信息
      
      // 特殊处理用户拒绝的情况
      if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        setError('您取消了交易。如需继续登录，请重新提交并在MetaMask中确认。'); // 提示用户取消交易
      } else {
        setError('登录失败: ' + (err.message || err)); // 设置错误信息
      }
    } finally {
      setLoading(false); // 设置加载状态为假
    }
  };

  // 获取钱包状态组件
  const getWalletStatusComponent = () => {
    if (walletConnected) { // 如果钱包已连接
      if (userInfo) { // 如果用户信息存在
        return (
          <Alert
            type="success" // 成功类型
            showIcon // 显示图标
            icon={<CheckCircleOutlined className={styles.statusIcon} />} // 成功图标
            message={
              <div className={styles.statusMessage}>
                <div className={styles.statusTitle}>钱包已连接</div> // 钱包连接状态
                <div className={styles.statusAddress}>{account}</div> // 显示账户地址
                <div className={styles.statusWelcome}>欢迎回来，{userInfo.name}</div> // 欢迎信息
                <Tag color="green" icon={<SafetyOutlined />} className={styles.secureTag}>安全连接</Tag> // 安全连接标签
              </div>
            }
            className={styles.walletAlert} // 设置样式
          />
        );
      } else {
        return (
          <Alert
            type="warning" // 警告类型
            showIcon // 显示图标
            icon={<ExclamationCircleOutlined className={styles.statusIcon} />} // 警告图标
            message={
              <div className={styles.statusMessage}>
                <div className={styles.statusTitle}>钱包已连接</div> // 钱包连接状态
                <div className={styles.statusAddress}>{account}</div> // 显示账户地址
                <div className={styles.statusError}>此地址未注册，请先注册</div> // 提示用户未注册
                <Tag color="orange" icon={<UserOutlined />} className={styles.registerTag}>需要注册</Tag> // 注册标签
              </div>
            }
            className={styles.walletAlert} // 设置样式
          />
        );
      }
    } else {
      return (
        <Alert
          type="warning" // 警告类型
          showIcon // 显示图标
          icon={<ExclamationCircleOutlined className={styles.statusIcon} />} // 警告图标
          message={
            <div className={styles.statusMessage}>
              <div className={styles.statusTitle}>钱包未连接</div> // 钱包未连接状态
              <div className={styles.statusInfo}>请通过MetaMask连接钱包以登录</div> // 提示用户连接钱包
              <Tag color="blue" icon={<WalletOutlined />} className={styles.connectTag}>点击连接</Tag> // 连接标签
            </div>
          }
          className={styles.walletAlert} // 设置样式
        />
      );
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff', // 设置主题颜色
          borderRadius: 8, // 设置边框圆角
        },
      }}
    >
      <div className={styles.loginContainer}> // 登录容器
        <div className={styles.blockchainBg}></div> // 区块链背景
        
        <div className={styles.blockchainCubes}> // 区块链立方体
          {[...Array(12)].map((_, i) => {
            const size = 20 + Math.random() * 25; // 随机大小
            return (
              <div 
                key={`cube-${i}`} 
                className={styles.cube}
                style={{
                  top: `${5 + Math.random() * 90}%`, // 随机位置
                  left: `${5 + Math.random() * 90}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  '--size': `${size}px`,
                  '--translate-x': `${(Math.random() - 0.5) * 250}px`,
                  '--translate-y': `${(Math.random() - 0.5) * 250}px`,
                  '--translate-x2': `${(Math.random() - 0.5) * 200}px`,
                  '--translate-y2': `${(Math.random() - 0.5) * 200}px`,
                  animationDuration: `${25 + Math.random() * 20}s`, // 随机动画持续时间
                  animationDelay: `${Math.random() * -20}s` // 随机动画延迟
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
        
        <div className={styles.blockchainNodes}> // 区块链节点
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
        
        <div className={styles.blockchainParticles}> // 区块链粒子
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className={styles.particle} 
              style={{
                top: `${Math.random() * 100}%`, 
                left: `${Math.random() * 100}%`,
                '--translate-x': `${(Math.random() - 0.5) * 200}px`,
                '--translate-y': `${(Math.random() - 0.5) * 200}px`,
                animationDelay: `${Math.random() * 15}s` // 随机动画延迟
              }}
            />
          ))}
        </div>
        
        <div className={styles.blockchainLines}> // 区块链线条
          <div className={styles.line1}></div>
          <div className={styles.line2}></div>
          <div className={styles.line3}></div>
          <div className={styles.line4}></div>
          <div className={styles.line5}></div>
          <div className={styles.line6}></div>
        </div>
        
        <div className={styles.loginBox}> // 登录框
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
              <Title level={2} className={styles.loginTitle}>链评系统 ChainRate</Title> // 登录标题
              <Text className={styles.loginSubtitle}>基于区块链的教学评价系统</Text> // 登录副标题
              
              <Space className={styles.tagContainer}>
                <Tag icon={<BlockOutlined />} color="blue">区块链</Tag>
                <Tag icon={<SafetyOutlined />} color="green">安全</Tag>
                <Tag icon={<GlobalOutlined />} color="purple">透明</Tag>
                <Tag icon={<SafetyCertificateOutlined />} color="cyan">可信</Tag>
              </Space>
            </div>

            <div className={styles.walletStatusContainer}>
              {getWalletStatusComponent()} // 获取钱包状态组件
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

            {error && !accountLocked && ( // 如果有错误且账号未锁定
              <Alert
                message="登录失败" // 错误提示
                description={error} // 显示错误信息
                type="error" // 错误类型
                showIcon // 显示图标
                className={styles.errorAlert} // 设置样式
              />
            )}
            
            {accountLocked && ( // 如果账号被锁定
              <Alert
                message="账号已锁定" // 锁定提示
                description={`由于多次密码错误，您的账号已被临时锁定。请在 ${formatRemainingTime(lockExpiry)} 后重试。`} // 提示文本
                type="warning" // 警告类型
                showIcon // 显示图标
                className={styles.errorAlert} // 设置样式
              />
            )}

            <Form
              form={form} // 表单实例
              name="login" // 表单名称
              layout="vertical" // 垂直布局
              onFinish={handleSubmit} // 提交时调用的函数
              autoComplete="off" // 关闭自动完成功能
              className={styles.loginForm} // 设置样式
            >
              <Form.Item
                name="password" // 表单字段名称
                rules={[{ required: true, message: '请输入密码' }]} // 验证规则
              >
                <Input.Password 
                  prefix={<LockOutlined className={styles.inputIcon} />} // 输入框前缀图标
                  placeholder="请输入密码" // 输入框提示文本
                  size="large" // 输入框大小
                  className={styles.passwordInput} // 设置样式
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary" // 按钮类型
                  htmlType="submit" // 提交按钮
                  size="large" // 按钮大小
                  block // 按钮宽度占满
                  icon={<LoginOutlined />} // 按钮图标
                  loading={loading} // 按钮加载状态
                  disabled={!walletConnected || !userInfo || accountLocked} // 按钮禁用条件
                  className={styles.loginButton} // 设置样式
                >
                  {loading ? '登录中...' : '安全登录'} // 按钮文本
                </Button>
              </Form.Item>
            </Form>

            <Divider className={styles.divider}> // 分隔线
              <Text className={styles.dividerText}>没有账户?</Text> // 分隔线文本
            </Divider>
            
            <Button 
              block // 按钮宽度占满
              size="large" // 按钮大小
              onClick={() => router.push('/register')} // 点击跳转到注册页面
              icon={<UserOutlined />} // 按钮图标
              className={styles.registerButton} // 设置样式
            >
              注册新账户 // 按钮文本
            </Button>
            
            <div className={styles.footerText}> // 页脚文本容器
              <BlockOutlined className={styles.footerIcon} /> // 页脚图标
              <Text className={styles.footerContent}>ChainRate - 区块链教学评价系统</Text> // 页脚内容
            </div>
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
} 