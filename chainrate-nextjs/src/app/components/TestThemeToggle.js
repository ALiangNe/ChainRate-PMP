'use client';

import { useState } from 'react';

export default function TestThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    console.log('主题切换按钮被点击', darkMode ? '切换到亮色模式' : '切换到暗色模式');
    alert('主题切换按钮被点击');
  };

  return (
    <button 
      onClick={toggleTheme}
      className="fixed bottom-5 right-5 p-2 rounded-full bg-blue-500 shadow-md hover:shadow-lg transition-all duration-300 z-[9999]"
      style={{
        width: '50px',
        height: '50px',
        color: 'white',
        fontSize: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  );
} 