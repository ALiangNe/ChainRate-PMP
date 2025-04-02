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
  Spin
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
  LoadingOutlined
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
                  >
                  </Input>
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
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
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
                    disabled={!walletConnected || !avatarIpfsHash}
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
