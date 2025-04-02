'use client';

import { useState, useEffect } from 'react';
import { Avatar, Dropdown } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

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
    
    setUserData({
      name: userName,
      avatar: userAvatar,
      role: userRole
    });
  }, []);
  
  const handleLogout = () => {
    // 清除所有用户相关的localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userRoleHash');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userCollege');
    localStorage.removeItem('userMajor');
    localStorage.removeItem('userGrade');
    localStorage.removeItem('userAvatar');
    
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
  
  return (
    <Dropdown menu={{ items }} placement="bottomRight" arrow>
      <div style={{ cursor: 'pointer' }}>
        {userData.avatar ? (
          <Avatar 
            size={avatarSize} 
            src={userData.avatar} 
            style={{ border: `1px solid ${color}` }}
          />
        ) : (
          <Avatar 
            size={avatarSize} 
            icon={defaultIcon} 
            style={{ backgroundColor: color }} 
          />
        )}
      </div>
    </Dropdown>
  );
} 