'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function StudentIndexPage() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查用户是否已登录并且是学生角色
    const checkUserAuth = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const userRole = localStorage.getItem('userRole');
      
      if (!isLoggedIn || userRole !== 'student') {
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
      setLoading(false);
    };

    checkUserAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userRoleHash');
    router.push('/login');
  };

  if (loading) {
    return <div className={styles.container}>正在加载...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>链评系统 - 学生端</h1>
        <div className={styles.userInfo}>
          <span>欢迎, {userData.name}</span>
          <button onClick={handleLogout} className={styles.logoutButton}>退出登录</button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.userProfile}>
          <h2>个人信息</h2>
          <div className={styles.profileCard}>
            <p><strong>姓名:</strong> {userData.name}</p>
            <p><strong>角色:</strong> 学生</p>
            <p><strong>钱包地址:</strong> {userData.address}</p>
          </div>
        </section>

        <section className={styles.functionSection}>
          <h2>功能区</h2>
          <div className={styles.functionGrid}>
            <div className={styles.functionCard} onClick={() => router.push('/studentViewCourses')}>
              <h3>查看课程</h3>
              <p>浏览所有可评价的课程</p>
            </div>
            <div className={styles.functionCard} onClick={() => router.push('/my-evaluations')}>
              <h3>我的评价</h3>
              <p>查看我已提交的课程评价</p>
            </div>
            <div className={styles.functionCard} onClick={() => router.push('/submit-evaluation')}>
              <h3>提交评价</h3>
              <p>为课程提交新的评价</p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© 2023 链评系统 - 基于区块链的教学评价系统</p>
      </footer>
    </div>
  );
} 