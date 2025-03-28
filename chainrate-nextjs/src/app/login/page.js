'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../contracts/ChainRate.json';
import ChainRateAddress from '../../contracts/ChainRate-address.json';

export default function LoginPage() {
  const router = useRouter();
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 表单验证
      if (!formData.password) {
        setError('请输入密码');
        setLoading(false);
        return;
      }

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
      const passwordHash = ethers.keccak256(ethers.toUtf8Bytes(formData.password));
      
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
              // 未来可以添加教师首页路径
            } else if (roleHash === ADMIN_ROLE.toString()) {
              readableRole = 'admin';
              // 未来可以添加管理员首页路径
            }
            localStorage.setItem('userRole', readableRole);
            
            // 登录成功提示
            alert('登录成功！');
            
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          用户登录
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* 钱包连接状态 */}
          <div className="mb-6">
            <div className={`p-3 rounded-md ${walletConnected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
              {walletConnected ? (
                <div>
                  <span className="font-bold">钱包已连接</span>
                  <p className="text-xs mt-1 break-all">{account}</p>
                  {userInfo ? (
                    <p className="text-sm mt-1">欢迎，{userInfo.name}</p>
                  ) : (
                    <p className="text-sm mt-1 text-red-500">此地址未注册，请先注册</p>
                  )}
                </div>
              ) : (
                <div>
                  <span className="font-bold">钱包未连接</span>
                  <p className="text-xs mt-1">请通过MetaMask连接钱包以登录</p>
                </div>
              )}
            </div>
          </div>

          {/* 登录信息提示 */}
          <div className="text-sm text-gray-500 mb-4">
            <p>登录将通过验证您的密码和钱包地址来完成</p>
            <p>登录过程需要在MetaMask钱包中确认，但不会产生手续费</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !walletConnected || !userInfo}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading || !walletConnected || !userInfo ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {loading ? '处理中...' : '登录'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  没有账户？
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => router.push('/register')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                注册
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 