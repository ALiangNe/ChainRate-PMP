'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
  });

  useEffect(() => {
    // 从localStorage获取用户信息
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userAddress = localStorage.getItem('userAddress');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    
    if (isLoggedIn && userAddress) {
      setUserData({
        isLoggedIn: true,
        address: userAddress,
        name: userName || '用户',
        role: userRole || '普通用户'
      });
    } else {
      // 用户未登录，重定向到登录页面
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    // 清除本地存储的用户信息
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userRoleHash');
    
    // 重定向到登录页面
    router.push('/login');
  };

  const getRoleDisplay = (role) => {
    switch(role) {
      case 'admin': return '管理员';
      case 'teacher': return '教师';
      case 'student': return '学生';
      default: return '普通用户';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            用户仪表盘
          </h1>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            退出登录
          </button>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg p-6 bg-white">
              <h2 className="text-xl font-semibold mb-4">欢迎回来，{userData.name}</h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">用户信息</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">姓名：</span>{userData.name}</p>
                    <p><span className="font-medium">角色：</span>{getRoleDisplay(userData.role)}</p>
                    <p className="break-all"><span className="font-medium">钱包地址：</span>{userData.address}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">功能列表</h3>
                  <ul className="space-y-2">
                    <li>
                      <a href="#" className="text-indigo-600 hover:text-indigo-800">我的项目</a>
                    </li>
                    <li>
                      <a href="#" className="text-indigo-600 hover:text-indigo-800">评估记录</a>
                    </li>
                    {userData.role === 'admin' && (
                      <li>
                        <a href="#" className="text-indigo-600 hover:text-indigo-800">系统管理</a>
                      </li>
                    )}
                    {userData.role === 'teacher' && (
                      <li>
                        <a href="#" className="text-indigo-600 hover:text-indigo-800">课程管理</a>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 