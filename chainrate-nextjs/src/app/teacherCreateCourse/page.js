'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';
import styles from './page.module.css';

export default function CreateCoursePage() {
  const router = useRouter();
  
  // 用户身份信息
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
  });
  
  // 课程表单数据
  const [formData, setFormData] = useState({
    courseName: '',
    startTime: '',
    endTime: ''
  });
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    // 检查用户是否已登录并且是教师角色
    const checkUserAuth = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const userRole = localStorage.getItem('userRole');
      
      if (!isLoggedIn || userRole !== 'teacher') {
        router.push('/login');
        return;
      }

      // 获取用户信息
      setUserData({
        isLoggedIn: true,
        address: localStorage.getItem('userAddress') || '',
        name: localStorage.getItem('userName') || '',
        role: userRole
      });
      
      // 初始化Web3连接
      initWeb3();
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
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };

    checkUserAuth();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 重置状态
    setError('');
    setSuccess('');
    setSubmitting(true);
    
    try {
      // 表单验证
      if (!formData.courseName.trim()) {
        throw new Error('请输入课程名称');
      }
      
      if (!formData.startTime || !formData.endTime) {
        throw new Error('请选择评价开始和结束时间');
      }
      
      // 转换时间为Unix时间戳（秒）
      const startTimestamp = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(formData.endTime).getTime() / 1000);
      
      // 确保开始时间早于结束时间
      if (startTimestamp >= endTimestamp) {
        throw new Error('结束时间必须晚于开始时间');
      }
      
      // 调用合约创建课程
      const tx = await contract.createCourse(
        formData.courseName,
        startTimestamp,
        endTimestamp
      );
      
      // 等待交易完成
      setSubmitting(true);
      const receipt = await tx.wait();
      console.log('交易哈希:', receipt.hash);
      
      // 查找事件以获取新课程ID
      const event = receipt.logs
        .map(log => {
          try {
            return contract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find(event => event && event.name === 'CourseCreated');
      
      const courseId = event ? event.args[0] : null;
      
      setSuccess(`课程 "${formData.courseName}" 创建成功！课程ID: ${courseId}`);
      
      // 重置表单
      setFormData({
        courseName: '',
        startTime: '',
        endTime: ''
      });
      
    } catch (err) {
      console.error("创建课程失败:", err);
      
      // 特殊处理用户拒绝的情况
      if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        setError('您取消了交易。如需继续创建课程，请重新提交并在MetaMask中确认。');
      } else {
        setError('创建课程失败: ' + (err.message || err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    router.push('/teacherIndex');
  };

  if (loading) {
    return <div className={styles.container}>正在加载...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>创建新课程</h1>
        <button onClick={goBack} className={styles.backButton}>返回首页</button>
      </header>

      <main className={styles.main}>
        <div className={styles.formContainer}>
          <div className={styles.infoBox}>
            <h2>创建课程须知</h2>
            <p>1. 创建课程会调用智能合约，需要支付少量的Gas费用</p>
            <p>2. 请设置合理的评价时间范围，学生只能在该时间范围内提交评价</p>
            <p>3. 创建后的课程可以在"我的课程"中管理</p>
          </div>
          
          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}
          
          {success && (
            <div className={styles.successBox}>
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="courseName">课程名称</label>
              <input
                type="text"
                id="courseName"
                name="courseName"
                value={formData.courseName}
                onChange={handleChange}
                placeholder="请输入课程名称"
                disabled={submitting}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="startTime">评价开始时间</label>
              <input
                type="datetime-local"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                disabled={submitting}
                required
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="endTime">评价结束时间</label>
              <input
                type="datetime-local"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                disabled={submitting}
                required
              />
            </div>
            
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={goBack}
                className={styles.cancelButton}
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? '创建中...' : '创建课程'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 