'use client';

import { message } from 'antd';

/**
 * 检查用户会话是否过期
 * @param {Function} router - Next.js 路由器实例
 * @returns {boolean} - 如果会话有效，则返回true，否则返回false
 */
export function checkSession(router) {
  const loginTime = localStorage.getItem('loginTime');
  if (!loginTime || !localStorage.getItem('isLoggedIn')) {
    return false;
  }

  const expiryTime = parseInt(loginTime) + 3 * 60 * 1000; // 3分钟过期
  
  if (Date.now() > expiryTime) {
    // 会话已过期，清除登录信息
    clearSession();
    
    message.error('登录已过期，请重新登录');
    
    // 如果不在登录页则重定向到登录页
    if (typeof window !== 'undefined' && router && !window.location.pathname.includes('/login')) {
      router.push('/login');
    }
    return false;
  }
  
  return true;
}

/**
 * 清除用户会话数据
 */
export function clearSession() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userAddress');
  localStorage.removeItem('userName');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userRoleHash');
  localStorage.removeItem('loginTime');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userCollege');
  localStorage.removeItem('userMajor');
  localStorage.removeItem('userGrade');
  localStorage.removeItem('userAvatar');
}

/**
 * 设置定期检查会话的钩子
 * @param {Function} router - Next.js 路由器实例 
 * @param {number} interval - 检查间隔（毫秒），默认30秒
 * @returns {Function} - 清理函数，用于取消定期检查
 */
export function setupSessionCheck(router, interval = 30000) {
  const checkInterval = setInterval(() => {
    checkSession(router);
  }, interval);
  
  return () => clearInterval(checkInterval);
} 