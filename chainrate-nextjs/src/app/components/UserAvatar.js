'use client';

import { useState, useEffect } from 'react';
import { Avatar, Dropdown, message } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { checkSession, setupSessionCheck, clearSession } from '../utils/authCheck';

export default function UserAvatar({ color = '#1677ff', size = 'default' }) {
  const router = useRouter();
  const [userData, setUserData] = useState({
    name: '',
    avatar: '',
    role: ''
  });
  
  useEffect(() => {
    // 从localStorage获取用户信息
    const userName = localStorage.getItem('userName') || '';
    const userAvatar = localStorage.getItem('userAvatar') || '';
    const userRole = localStorage.getItem('userRole') || '';
    const userAddress = localStorage.getItem('userAddress') || '';
    
    // 根据用户地址生成随机颜色
    const generateColorFromAddress = (address) => {
      if (!address) return '#1677ff';
      const hash = address.slice(2, 8); // 使用地址的一部分
      return `#${hash}`;
    };
    
    setUserData({
      name: userName,
      avatar: userAvatar,
      role: userRole,
      address: userAddress,
      color: generateColorFromAddress(userAddress)
    });
  }, []);
  
  // 添加会话过期检查
  useEffect(() => {
    // 初次检查
    checkSession(router);
    
    // 设置定期检查
    return setupSessionCheck(router);
  }, [router]);
  
  const handleLogout = () => {
    // 清除所有用户相关的localStorage
    clearSession();
    
    // 重定向到登录页面
    router.push('/login');
  };
  
  // 下拉菜单项
  const items = [
    {
      key: '1',
      label: userData.name || '用户',
      disabled: true,
    },
    {
      key: '2',
      label: '个人中心',
      icon: <SettingOutlined />,
      onClick: () => {
        if (userData.role === 'student') {
          router.push('/studentIndex');
        } else if (userData.role === 'teacher') {
          router.push('/teacherIndex');
        } else if (userData.role === 'admin') {
          router.push('/adminIndex');
        }
      }
    },
    {
      type: 'divider',
    },
    {
      key: '3',
      danger: true,
      label: '退出登录',
      icon: <LogoutOutlined />,
      onClick: handleLogout
    },
  ];
  
  // 用户未登录或没有头像时显示的默认图标
  const defaultIcon = <UserOutlined />;
  
  // 头像大小
  const avatarSize = size === 'large' ? 40 : size === 'small' ? 28 : 32;
  
  // 根据用户名创建默认头像
  const getInitials = (name) => {
    if (!name) return defaultIcon;
    return name.charAt(0).toUpperCase();
  };
  
  return (
    <Dropdown menu={{ items }} placement="bottomRight" arrow>
      <div style={{ cursor: 'pointer' }}>
        {userData.avatar ? (
          <Avatar 
            size={avatarSize} 
            src={userData.avatar} 
            style={{ border: `1px solid ${color}` }}
            // 添加备用显示方式，如果图片加载失败
            onError={() => {
              // 当头像加载失败时，返回true让它使用fallback内容
              return true;
            }}
          >
            {getInitials(userData.name)}
          </Avatar>
        ) : (
          <Avatar 
            size={avatarSize} 
            style={{ backgroundColor: userData.color || color }}
          >
            {getInitials(userData.name)}
          </Avatar>
        )}
      </div>
    </Dropdown>
  );
} 