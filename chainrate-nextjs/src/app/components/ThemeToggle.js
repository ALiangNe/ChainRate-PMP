'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  // 初始化时检查本地存储的主题设置
  useEffect(() => {
    // 检查浏览器环境
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('theme') === 'dark' || 
          (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setDarkMode(false);
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // 切换主题
  const toggleTheme = () => {
    if (typeof window !== 'undefined') {
      if (darkMode) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
      setDarkMode(!darkMode);
    }
  };

  // 内联样式，避免Tailwind可能的问题
  const buttonStyle = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: darkMode ? '#1e293b' : '#e5e7eb', 
    color: darkMode ? '#fcd34d' : '#4b5563',
    border: 'none',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    zIndex: 9999,
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  };

  return (
    <button 
      onClick={toggleTheme}
      className="exclude-dark theme-toggle"
      style={buttonStyle}
      aria-label="切换主题"
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  );
} 