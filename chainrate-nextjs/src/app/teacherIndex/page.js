'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function TeacherIndexPage() {
  const router = useRouter();
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
  });
  const [loading, setLoading] = useState(true);

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
        <h1>链评系统 - 教师端</h1>
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
            <p><strong>角色:</strong> 教师</p>
            <p><strong>钱包地址:</strong> {userData.address}</p>
          </div>
        </section>

        <section className={styles.functionSection}>
          <h2>功能区</h2>
          <div className={styles.functionGrid}>
            <div className={styles.functionCard} onClick={() => router.push('/teacherCreateCourse')}>
              <h3>创建课程</h3>
              <p>创建新的课程供学生评价</p>
            </div>
            <div className={styles.functionCard} onClick={() => router.push('/teacherViewCourses')}>
              <h3>我的课程</h3>
              <p>管理您已创建的课程</p>
            </div>
            <div className={styles.functionCard} onClick={() => router.push('/course-evaluations')}>
              <h3>查看评价</h3>
              <p>查看学生对课程的评价</p>
            </div>
            <div className={styles.functionCard} onClick={() => router.push('/statistics')}>
              <h3>统计分析</h3>
              <p>查看课程评价的统计数据</p>
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