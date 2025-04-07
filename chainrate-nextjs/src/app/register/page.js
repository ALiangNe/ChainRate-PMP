'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import Image from 'next/image';
import styles from './page.module.css';
import axios from 'axios';
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
  NumberOutlined,
  PictureOutlined,
  UploadOutlined,
  LoadingOutlined,
  BlockOutlined,
  SafetyOutlined,
  GlobalOutlined,
  SafetyCertificateOutlined
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
    grade: '', // 添加年级
    avatar: '' // 添加头像URL
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarIpfsHash, setAvatarIpfsHash] = useState('');
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

  // 上传头像到IPFS
  const uploadToIPFS = async (file) => {
    if (!file) {
      message.error('请先选择头像文件');
      return null;
    }
    
    setUploading(true);
    try {
      // 创建FormData对象
      const formData = new FormData();
      formData.append('file', file);
      
      // 上传到Pinata
      const pinataEndpoint = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
      
      // 使用Pinata JWT进行身份验证
      const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
      if (!jwt) {
        message.error('缺少Pinata JWT配置，请联系管理员');
        setUploading(false);
        return null;
      }
      
      const response = await axios.post(pinataEndpoint, formData, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data && response.data.IpfsHash) {
        const ipfsHash = response.data.IpfsHash;
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        setAvatarIpfsHash(ipfsUrl);
        form.setFieldsValue({ avatar: ipfsUrl });
        message.success('头像上传成功！');
        return ipfsUrl;
      } else {
        throw new Error('上传失败，未收到IPFS哈希');
      }
    } catch (error) {
      console.error('上传到IPFS失败:', error);
      message.error(`头像上传失败: ${error.message || '未知错误'}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // 处理文件预览点击事件
  const handlePreviewClick = () => {
    document.getElementById('avatar-upload-input').click();
  };

  // 上传按钮属性
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: 'image/*',
    beforeUpload: (file) => {
      // 验证文件类型
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
        return Upload.LIST_IGNORE;
      }
      
      // 验证文件大小 (限制为2MB)
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('图片必须小于2MB!');
        return Upload.LIST_IGNORE;
      }
      
      // 预览图片
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setAvatarFile(file);
      
      // 自动上传到IPFS
      setTimeout(() => {
        uploadToIPFS(file);
      }, 500);
      
      return false; // 阻止自动上传
    },
    showUploadList: false,
    customRequest: ({ file, onSuccess }) => {
      setTimeout(() => {
        onSuccess("ok");
      }, 0);
    }
  };

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

      // 检查是否上传了头像
      if (!avatarIpfsHash) {
        message.warning('请上传头像');
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
        avatarIpfsHash,
        passwordHash,
        roleBytes
      );

      // 等待交易确认
      console.log('交易已提交，等待确认...');
      await tx.wait();
      console.log('交易已确认', tx.hash);

      // 注册成功
      message.success('注册成功！');
      
      // 保存头像信息到localStorage，因为合约中暂时没有存储
      if (avatarIpfsHash) {
        localStorage.setItem('userAvatar', avatarIpfsHash);
      }
      
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
          icon={<CheckCircleOutlined className={styles.statusIcon} />}
          message={
            <div className={styles.statusMessage}>
              <div className={styles.statusTitle}>钱包已连接</div>
              <div className={styles.statusAddress}>{account}</div>
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
              <div className={styles.statusTitle}>钱包未连接</div>
              <div className={styles.statusWelcome}>请通过MetaMask连接钱包以完成注册</div>
              <Tag color="blue" icon={<BlockOutlined />} className={styles.connectTag}>点击连接</Tag>
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
      <div className={styles.registerContainer}>
        <div className={styles.blockchainBg}></div>
        
        <div className={styles.blockchainCubes}>
          {[...Array(12)].map((_, i) => {
            const size = 20 + Math.random() * 40;
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
                  '--translate-x': `${(Math.random() - 0.5) * 300}px`,
                  '--translate-y': `${(Math.random() - 0.5) * 300}px`,
                  '--translate-x2': `${(Math.random() - 0.5) * 200}px`,
                  '--translate-y2': `${(Math.random() - 0.5) * 200}px`,
                  animationDuration: `${20 + Math.random() * 30}s`,
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
          
          {[...Array(35)].map((_, i) => (
            <div 
              key={`dot-${i}`} 
              className={styles.nodeDot}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.3
              }}
            />
          ))}
        </div>
        
        <div className={styles.blockchainParticles}>
          {[...Array(30)].map((_, i) => (
            <div 
              key={`particle-${i}`} 
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
        
        <div className={styles.registerBox}>
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
              <Title level={2} className={styles.registerTitle}>创建新账户</Title>
              <Text className={styles.registerSubtitle}>加入我们的区块链教学评价平台</Text>
              
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
                  prefix={<UserOutlined className={styles.inputIcon} />} 
                  placeholder="请输入用户名" 
                  size="large"
                  className={styles.formInput}
                />
              </Form.Item>

              <Form.Item
                name="phone"
                rules={[{ required: true, message: '请输入手机号码' }]}
              >
                <Input 
                  prefix={<PhoneOutlined className={styles.inputIcon} />} 
                  placeholder="请输入手机号码" 
                  size="large"
                  className={styles.formInput}
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
                  prefix={<MailOutlined className={styles.inputIcon} />} 
                  placeholder="请输入邮箱" 
                  size="large"
                  className={styles.formInput}
                />
              </Form.Item>

              <Form.Item
                name="college"
                rules={[{ required: true, message: '请输入所属学院' }]}
              >
                <Input 
                  prefix={<BankOutlined className={styles.inputIcon} />} 
                  placeholder="请输入所属学院" 
                  size="large"
                  className={styles.formInput}
                />
              </Form.Item>

              <Form.Item
                name="major"
                rules={[{ required: true, message: '请输入所学专业' }]}
              >
                <Input 
                  prefix={<BookOutlined className={styles.inputIcon} />} 
                  placeholder="请输入所学专业" 
                  size="large"
                  className={styles.formInput}
                />
              </Form.Item>

              <Form.Item
                name="grade"
                rules={[{ required: true, message: '请输入年级' }]}
              >
                <Input 
                  prefix={<NumberOutlined className={styles.inputIcon} />} 
                  placeholder="请输入年级，如：大一、大二" 
                  size="large"
                  className={styles.formInput}
                />
              </Form.Item>

              {/* 头像上传 */}
              <Form.Item
                name="avatar"
                rules={[{ required: true, message: '请上传头像' }]}
                style={{ marginBottom: 24 }}
              >
                <div className={styles.avatarUploadContainer}>
                  <div 
                    className={styles.avatarPreview}
                    onClick={handlePreviewClick}
                  >
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview} 
                        alt="Avatar Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        <PictureOutlined style={{ fontSize: 40, color: '#ccc' }} />
                        <div style={{ marginTop: 8, color: '#999' }}>点击上传头像</div>
                      </div>
                    )}
                    {uploading && (
                      <div className={styles.uploadingOverlay}>
                        <Spin tip="上传中..." />
                      </div>
                    )}
                  </div>
                  <div className={styles.avatarUploadActions}>
                    <Upload {...uploadProps} id="avatar-upload">
                      <Button 
                        icon={<UploadOutlined />}
                        type="primary"
                        size="large"
                        id="avatar-upload-input"
                        loading={uploading}
                      >
                        {avatarPreview ? '更换头像' : '选择头像'}
                      </Button>
                    </Upload>
                  </div>
                  {avatarIpfsHash && (
                    <div className={styles.ipfsInfo}>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      <span>头像已上传到IPFS</span>
                    </div>
                  )}
                </div>
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码长度至少为6位' }
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined className={styles.inputIcon} />} 
                  placeholder="请输入密码" 
                  size="large"
                  className={styles.formInput}
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
                  prefix={<LockOutlined className={styles.inputIcon} />} 
                  placeholder="请确认密码" 
                  size="large"
                  className={styles.formInput}
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
                  className={styles.formSelect}
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
                  disabled={!walletConnected || !avatarIpfsHash}
                  className={styles.registerButton}
                >
                  {loading ? '注册中...' : '注册'}
                </Button>
              </Form.Item>
            </Form>

            <Divider plain className={styles.divider}>已有账户?</Divider>
            
            <Button 
              block 
              size="large" 
              onClick={() => router.push('/login')}
              icon={<LoginOutlined />}
              className={styles.loginButton}
            >
              登录
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
