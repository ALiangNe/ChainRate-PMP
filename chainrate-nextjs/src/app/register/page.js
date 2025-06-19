'use client'; // 指示该组件在客户端渲染

// 导入所需的库和组件
import { useState, useEffect } from 'react'; // 导入 React 的状态和效果钩子
import { useRouter } from 'next/navigation'; // 导入 Next.js 的路由钩子
import { ethers } from 'ethers'; // 导入 ethers.js 库，用于与以太坊区块链交互
import ChainRateABI from '../../contracts/ChainRate.json'; // 导入合约的 ABI（应用程序二进制接口）
import ChainRateAddress from '../../contracts/ChainRate-address.json'; // 导入合约的地址
import Image from 'next/image'; // 导入 Next.js 的图片组件
import styles from './page.module.css'; // 导入样式文件
import axios from 'axios'; // 导入 axios 库用于 HTTP 请求
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
  Space,
  Upload,
  Spin,
  Tag
} from 'antd'; // 导入 Ant Design 组件库
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
  NumberOutlined,
  PictureOutlined,
  UploadOutlined,
  LoadingOutlined,
  BlockOutlined,
  SafetyOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'; // 导入 Ant Design 图标

const { Title, Text, Paragraph } = Typography; // 解构 Typography 组件
const { Option } = Select; // 解构 Select 组件的选项

// 注册页面组件
export default function RegisterPage() {
  const router = useRouter(); // 获取路由对象
  const [form] = Form.useForm(); // 创建表单实例
  const [formData, setFormData] = useState({ // 初始化表单数据
    username: '', // 用户名
    password: '', // 密码
    confirmPassword: '', // 确认密码
    role: 'STUDENT_ROLE', // 默认角色
    phone: '', // 手机号
    email: '', // 邮箱
    college: '', // 学院
    major: '', // 专业
    grade: '', // 年级
    avatar: '' // 头像URL
  });
  const [error, setError] = useState(''); // 错误信息状态
  const [loading, setLoading] = useState(false); // 加载状态
  const [uploading, setUploading] = useState(false); // 上传状态
  const [avatarPreview, setAvatarPreview] = useState(null); // 头像预览
  const [avatarFile, setAvatarFile] = useState(null); // 头像文件
  const [avatarIpfsHash, setAvatarIpfsHash] = useState(''); // 头像的 IPFS 哈希
  const [walletConnected, setWalletConnected] = useState(false); // 钱包连接状态
  const [account, setAccount] = useState(''); // 用户账户
  const [provider, setProvider] = useState(null); // Web3 提供者
  const [signer, setSigner] = useState(null); // 签名者
  const [contract, setContract] = useState(null); // 合约实例

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
        
        // 监听账户变化
        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0]); // 更新账户
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

  // 上传头像到IPFS
  const uploadToIPFS = async (file) => {
    if (!file) {
      message.error('请先选择头像文件'); // 提示用户选择文件
      return null; // 退出函数
    }
    
    setUploading(true); // 设置上传状态为真
    try {
      // 创建FormData对象
      const formData = new FormData(); // 创建表单数据对象
      formData.append('file', file); // 将文件添加到表单数据中
      
      // 上传到Pinata
      const pinataEndpoint = 'https://api.pinata.cloud/pinning/pinFileToIPFS'; // Pinata API 端点
      
      // 使用Pinata JWT进行身份验证
      const jwt = process.env.NEXT_PUBLIC_PINATA_JWT; // 获取 JWT
      if (!jwt) {
        message.error('缺少Pinata JWT配置，请联系管理员'); // 提示缺少 JWT
        setUploading(false); // 设置上传状态为假
        return null; // 退出函数
      }
      
      const response = await axios.post(pinataEndpoint, formData, { // 发送 POST 请求
        headers: {
          'Authorization': `Bearer ${jwt}`, // 设置授权头
          'Content-Type': 'multipart/form-data' // 设置内容类型
        }
      });
      
      if (response.data && response.data.IpfsHash) { // 检查响应数据
        const ipfsHash = response.data.IpfsHash; // 获取 IPFS 哈希
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`; // 构建 IPFS URL
        setAvatarIpfsHash(ipfsUrl); // 设置头像 IPFS 哈希
        form.setFieldsValue({ avatar: ipfsUrl }); // 设置表单字段值
        message.success('头像上传成功！'); // 提示上传成功
        return ipfsUrl; // 返回 IPFS URL
      } else {
        throw new Error('上传失败，未收到IPFS哈希'); // 抛出错误
      }
    } catch (error) {
      console.error('上传到IPFS失败:', error); // 打印错误信息
      message.error(`头像上传失败: ${error.message || '未知错误'}`); // 提示上传失败
      return null; // 退出函数
    } finally {
      setUploading(false); // 设置上传状态为假
    }
  };

  // 处理文件预览点击事件
  const handlePreviewClick = () => {
    document.getElementById('avatar-upload-input').click(); // 触发文件选择
  };

  // 上传按钮属性
  const uploadProps = {
    name: 'file', // 文件字段名称
    multiple: false, // 不允许多文件上传
    accept: 'image/*', // 只接受图片文件
    beforeUpload: (file) => {
      // 验证文件类型
      const isImage = file.type.startsWith('image/'); // 检查文件类型
      if (!isImage) {
        message.error('只能上传图片文件!'); // 提示用户
        return Upload.LIST_IGNORE; // 忽略上传
      }
      
      // 验证文件大小 (限制为2MB)
      const isLt2M = file.size / 1024 / 1024 < 2; // 检查文件大小
      if (!isLt2M) {
        message.error('图片必须小于2MB!'); // 提示用户
        return Upload.LIST_IGNORE; // 忽略上传
      }
      
      // 预览图片
      const reader = new FileReader(); // 创建文件读取器
      reader.onload = () => {
        setAvatarPreview(reader.result); // 设置头像预览
      };
      reader.readAsDataURL(file); // 读取文件为数据URL
      
      setAvatarFile(file); // 设置头像文件
      
      // 自动上传到IPFS
      setTimeout(() => {
        uploadToIPFS(file); // 上传文件到 IPFS
      }, 500);
      
      return false; // 阻止自动上传
    },
    showUploadList: false, // 不显示上传列表
    customRequest: ({ file, onSuccess }) => {
      setTimeout(() => {
        onSuccess("ok"); // 模拟上传成功
      }, 0);
    }
  };

  const handleSubmit = async (values) => {
    setError(''); // 清空错误信息
    setLoading(true); // 设置加载状态为真

    try {
      // 验证密码匹配
      if (values.password !== values.confirmPassword) {
        message.error('两次输入的密码不一致'); // 提示用户
        setError('两次输入的密码不一致'); // 设置错误信息
        setLoading(false); // 设置加载状态为假
        return; // 退出函数
      }

      // 验证手机号格式
      if (!/^1[3-9]\d{9}$/.test(values.phone)) {
        message.error('请输入11位有效手机号码'); // 提示用户
        setError('请输入11位有效手机号码'); // 设置错误信息
        setLoading(false); // 设置加载状态为假
        return; // 退出函数
      }

      // 验证密码格式
      if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$/.test(values.password)) {
        message.error('密码必须包含数字和字母，长度6-20位'); // 提示用户
        setError('密码必须包含数字和字母，长度6-20位'); // 设置错误信息
        setLoading(false); // 设置加载状态为假
        return; // 退出函数
      }

      if (!walletConnected) {
        setError('请先连接钱包'); // 提示用户
        setLoading(false); // 设置加载状态为假
        return; // 退出函数
      }

      // 检查是否上传了头像
      if (!avatarIpfsHash) {
        message.warning('请上传头像'); // 提示用户
        setLoading(false); // 设置加载状态为假
        return; // 退出函数
      }

      console.log('准备注册用户:', values); // 打印注册信息

      // 将密码转换为哈希值
      const passwordHash = ethers.keccak256(ethers.toUtf8Bytes(values.password)); // 哈希密码
      
      // 将角色字符串转换为 bytes32
      let roleBytes; // 初始化角色字节
      if (values.role === 'STUDENT_ROLE') {
        roleBytes = ethers.keccak256(ethers.toUtf8Bytes("STUDENT_ROLE")); // 学生角色
      } else if (values.role === 'TEACHER_ROLE') {
        roleBytes = ethers.keccak256(ethers.toUtf8Bytes("TEACHER_ROLE")); // 教师角色
      } else if (values.role === 'ADMIN_ROLE') {
        roleBytes = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE")); // 管理员角色
      }

      // 调用合约的注册方法
      const tx = await contract.registerUser(
        values.username, // 用户名
        values.phone, // 手机号
        values.email, // 邮箱
        values.college, // 学院
        values.major, // 专业
        values.grade, // 年级
        avatarIpfsHash, // 头像 IPFS 哈希
        passwordHash, // 密码哈希
        roleBytes // 角色字节
      );

      // 等待交易确认
      console.log('交易已提交，等待确认...'); // 打印交易信息
      await tx.wait(); // 等待交易确认
      console.log('交易已确认', tx.hash); // 打印交易哈希

      // 注册成功
      message.success('注册成功！即将跳转到登录页面...'); // 提示用户注册成功
      
      // 保存头像信息到localStorage，因为合约中暂时没有存储
      if (avatarIpfsHash) {
        localStorage.setItem('userAvatar', avatarIpfsHash); // 保存头像到本地存储
      }
      
      // 2秒后跳转到登录页面
      setTimeout(() => {
      router.push('/login'); // 跳转到登录页面
      }, 2000);
    } catch (err) {
      console.error("注册失败:", err); // 打印错误信息
      setError('注册失败: ' + (err.message || err)); // 设置错误信息
    } finally {
      setLoading(false); // 设置加载状态为假
    }
  };

  const getWalletStatusComponent = () => {
    if (walletConnected) {
      return (
        <Alert
          type="success" // 成功类型
          showIcon // 显示图标
          icon={<CheckCircleOutlined className={styles.statusIcon} />} // 成功图标
          message={
            <div className={styles.statusMessage}>
              <div className={styles.statusTitle}>钱包已连接</div> // 钱包连接状态
              <div className={styles.statusAddress}>{account}</div> // 显示账户地址
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
              <div className={styles.statusTitle}>钱包未连接</div> // 钱包未连接状态
              <div className={styles.statusWelcome}>请通过MetaMask连接钱包以完成注册</div> // 提示用户连接钱包
              <Tag color="blue" icon={<BlockOutlined />} className={styles.connectTag}>点击连接</Tag> // 连接标签
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
      <div className={styles.registerContainer}> // 注册容器
        <div className={styles.blockchainBg}></div> // 区块链背景
        
        <div className={styles.blockchainCubes}> // 区块链立方体
          {[...Array(12)].map((_, i) => {
            const size = 20 + Math.random() * 40; // 随机大小
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
                  '--translate-x': `${(Math.random() - 0.5) * 300}px`,
                  '--translate-y': `${(Math.random() - 0.5) * 300}px`,
                  '--translate-x2': `${(Math.random() - 0.5) * 200}px`,
                  '--translate-y2': `${(Math.random() - 0.5) * 200}px`,
                  animationDuration: `${20 + Math.random() * 30}s`, // 随机动画持续时间
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
          
          {[...Array(35)].map((_, i) => (
            <div 
              key={`dot-${i}`} 
              className={styles.nodeDot}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.3 // 随机透明度
              }}
            />
          ))}
        </div>
        
        <div className={styles.blockchainParticles}> // 区块链粒子
          {[...Array(30)].map((_, i) => (
            <div 
              key={`particle-${i}`} 
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
        
        <div className={styles.registerBox}> // 注册框
          <Card className={styles.registerCard} bordered={false}>
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
              <Title level={2} className={styles.registerTitle}>创建新账户</Title> // 注册标题
              <Text className={styles.registerSubtitle}>加入我们的区块链教学评价平台</Text> // 注册副标题
              
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

            <Paragraph className={styles.registerInfo}>
              注册过程将在区块链上创建您的账户信息，需要在MetaMask钱包中确认交易。 // 注册信息说明
            </Paragraph>

            {error && (
              <Alert
                message="注册失败" // 错误提示
                description={error} // 显示错误信息
                type="error" // 错误类型
                showIcon // 显示图标
                className={styles.errorAlert} // 设置样式
              />
            )}

            <Form
              form={form} // 表单实例
              name="register" // 表单名称
              layout="vertical" // 垂直布局
              initialValues={formData} // 初始值
              onFinish={handleSubmit} // 提交时调用的函数
              autoComplete="off" // 关闭自动完成功能
              className={styles.registerForm} // 设置样式
            >
              <Form.Item
                name="username" // 表单字段名称
                rules={[{ required: true, message: '请输入用户名' }]} // 验证规则
              >
                <Input 
                  prefix={<UserOutlined className={styles.inputIcon} />} // 输入框前缀图标
                  placeholder="请输入用户名" // 输入框提示文本
                  size="large" // 输入框大小
                  className={styles.formInput} // 设置样式
                />
              </Form.Item>

              <Form.Item
                name="phone" // 表单字段名称
                rules={[
                  { required: true, message: '请输入手机号码' }, // 验证规则
                  { 
                    pattern: /^1[3-9]\d{9}$/, // 手机号格式验证
                    message: '请输入11位有效手机号码' // 提示文本
                  }
                ]}
              >
                <Input 
                  prefix={<PhoneOutlined className={styles.inputIcon} />} // 输入框前缀图标
                  placeholder="请输入手机号码" // 输入框提示文本
                  size="large" // 输入框大小
                  className={styles.formInput} // 设置样式
                />
              </Form.Item>

              <Form.Item
                name="email" // 表单字段名称
                rules={[
                  { required: true, message: '请输入邮箱' }, // 验证规则
                  { type: 'email', message: '请输入有效的邮箱地址' } // 邮箱格式验证
                ]}
              >
                <Input 
                  prefix={<MailOutlined className={styles.inputIcon} />} // 输入框前缀图标
                  placeholder="请输入邮箱" // 输入框提示文本
                  size="large" // 输入框大小
                  className={styles.formInput} // 设置样式
                />
              </Form.Item>

              <Form.Item
                name="college" // 表单字段名称
                rules={[{ required: true, message: '请输入所属学院' }]} // 验证规则
              >
                <Input 
                  prefix={<BankOutlined className={styles.inputIcon} />} // 输入框前缀图标
                  placeholder="请输入所属学院" // 输入框提示文本
                  size="large" // 输入框大小
                  className={styles.formInput} // 设置样式
                />
              </Form.Item>

              <Form.Item
                name="major" // 表单字段名称
                rules={[{ required: true, message: '请输入所学专业' }]} // 验证规则
              >
                <Input 
                  prefix={<BookOutlined className={styles.inputIcon} />} // 输入框前缀图标
                  placeholder="请输入所学专业" // 输入框提示文本
                  size="large" // 输入框大小
                  className={styles.formInput} // 设置样式
                />
              </Form.Item>

              <Form.Item
                name="grade" // 表单字段名称
                rules={[{ required: true, message: '请输入年级' }]} // 验证规则
              >
                <Input 
                  prefix={<NumberOutlined className={styles.inputIcon} />} // 输入框前缀图标
                  placeholder="请输入年级，如：大一、大二" // 输入框提示文本
                  size="large" // 输入框大小
                  className={styles.formInput} // 设置样式
                />
              </Form.Item>

              {/* 头像上传 */}
              <Form.Item
                name="avatar" // 表单字段名称
                rules={[{ required: true, message: '请上传头像' }]} // 验证规则
                style={{ marginBottom: 24 }} // 设置样式
              >
                <div className={styles.avatarUploadContainer}> // 头像上传容器
                  <div 
                    className={styles.avatarPreview} // 头像预览
                    onClick={handlePreviewClick} // 点击预览头像
                  >
                    {avatarPreview ? ( // 如果有头像预览
                      <img 
                        src={avatarPreview} // 头像预览图
                        alt="Avatar Preview" // 预览图描述
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }} // 设置样式
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}> // 头像占位符
                        <PictureOutlined style={{ fontSize: 40, color: '#ccc' }} /> // 占位符图标
                        <div style={{ marginTop: 8, color: '#999' }}>点击上传头像</div> // 提示文本
                      </div>
                    )}
                    {uploading && ( // 如果正在上传
                      <div className={styles.uploadingOverlay}> // 上传中覆盖层
                        <Spin tip="上传中..." /> // 上传中提示
                      </div>
                    )}
                  </div>
                  <div className={styles.avatarUploadActions}> // 上传操作容器
                    <Upload {...uploadProps} id="avatar-upload"> // 上传组件
                      <Button 
                        icon={<UploadOutlined />} // 上传按钮图标
                        type="primary" // 按钮类型
                        size="large" // 按钮大小
                        id="avatar-upload-input" // 上传输入框ID
                        loading={uploading} // 上传按钮加载状态
                      >
                        {avatarPreview ? '更换头像' : '选择头像'} // 按钮文本
                      </Button>
                    </Upload>
                  </div>
                  {avatarIpfsHash && ( // 如果头像已上传到 IPFS
                    <div className={styles.ipfsInfo}> // IPFS 信息容器
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} /> // 成功图标
                      <span>头像已上传到IPFS</span> // 提示文本
                    </div>
                  )}
                </div>
              </Form.Item>

              <Form.Item
                name="password" // 表单字段名称
                rules={[
                  { required: true, message: '请输入密码' }, // 验证规则
                  { min: 6, max: 20, message: '密码长度在6-20位之间' }, // 密码长度验证
                  { 
                    pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$/, // 密码格式验证
                    message: '密码必须包含数字和字母，长度6-20位' // 提示文本
                  }
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined className={styles.inputIcon} />} // 输入框前缀图标
                  placeholder="请输入密码" // 输入框提示文本
                  size="large" // 输入框大小
                  className={styles.formInput} // 设置样式
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword" // 表单字段名称
                rules={[
                  { required: true, message: '请确认密码' }, // 验证规则
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve(); // 密码匹配
                      }
                      return Promise.reject(new Error('两次输入的密码不一致')); // 密码不匹配
                    },
                  }),
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined className={styles.inputIcon} />} // 输入框前缀图标
                  placeholder="请确认密码" // 输入框提示文本
                  size="large" // 输入框大小
                  className={styles.formInput} // 设置样式
                />
              </Form.Item>

              <Form.Item
                name="role" // 表单字段名称
                rules={[{ required: true, message: '请选择角色' }]} // 验证规则
                initialValue="STUDENT_ROLE" // 初始值
              >
                <Select
                  size="large" // 下拉框大小
                  placeholder="请选择角色" // 下拉框提示文本
                  suffixIcon={<TeamOutlined />} // 下拉框后缀图标
                  className={styles.formSelect} // 设置样式
                >
                  <Option value="STUDENT_ROLE">学生</Option> // 学生角色选项
                  <Option value="TEACHER_ROLE">教师</Option> // 教师角色选项
                  <Option value="ADMIN_ROLE">管理员</Option> // 管理员角色选项
                </Select>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary" // 按钮类型
                  htmlType="submit" // 提交按钮
                  size="large" // 按钮大小
                  block // 按钮宽度占满
                  icon={<SolutionOutlined />} // 按钮图标
                  loading={loading} // 按钮加载状态
                  disabled={!walletConnected || !avatarIpfsHash} // 按钮禁用条件
                  className={styles.registerButton} // 设置样式
                >
                  {loading ? '注册中...' : '注册'} // 按钮文本
                </Button>
              </Form.Item>
            </Form>

            <Divider plain className={styles.divider}>已有账户?</Divider> // 分隔线
            
            <Button 
              block // 按钮宽度占满
              size="large" // 按钮大小
              onClick={() => router.push('/login')} // 点击跳转到登录页面
              icon={<LoginOutlined />} // 按钮图标
              className={styles.loginButton} // 设置样式
            >
              登录 // 按钮文本
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