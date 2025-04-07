'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [animationComplete, setAnimationComplete] = useState(false);
  
  useEffect(() => {
    // 在组件挂载后2秒后将动画标记为完成
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className={styles.container}>
      {/* 背景粒子效果 */}
      <div className={styles.particles}>
        {[...Array(20)].map((_, i) => (
          <div key={i} className={styles.particle}></div>
        ))}
      </div>
      
      {/* 区块链装饰 */}
      <div className={styles.blockchainDecoration}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={styles.block} style={{ animationDelay: `${i * 0.2}s` }}></div>
        ))}
      </div>
      
      {/* 主要内容 */}
      <main className={styles.main}>
        <div className={`${styles.logoContainer} ${animationComplete ? styles.logoAnimationComplete : ''}`}>
          <Image 
            src="/images/logo1.png" 
            alt="链评系统Logo" 
            width={100} 
            height={100}
            priority
            className={styles.logo}
          />
          <div className={styles.logoRing}></div>
          <div className={styles.logoRing} style={{ animationDelay: '0.5s' }}></div>
          <div className={styles.logoRing} style={{ animationDelay: '1s' }}></div>
        </div>
        
        <h1 className={styles.title}>
          <span className={styles.titleWord}>链</span>
          <span className={styles.titleWord}>评</span>
          <span className={styles.titleWord}>系</span>
          <span className={styles.titleWord}>统</span>
        </h1>
        <h2 className={styles.subtitle}>ChainRate - 区块链驱动的教育评价平台</h2>
        
        <div className={styles.description}>
          <p>基于区块链技术的去中心化教师评价系统，安全、透明、不可篡改</p>
          <ul className={styles.featureList}>
            <li className={styles.featureItem}>
              <div className={styles.featureIcon}>🔐</div>
              <span>保障数据安全与隐私</span>
            </li>
            <li className={styles.featureItem}>
              <div className={styles.featureIcon}>🔄</div>
              <span>透明的评价流程</span>
            </li>
            <li className={styles.featureItem}>
              <div className={styles.featureIcon}>📊</div>
              <span>智能数据分析</span>
            </li>
          </ul>
        </div>
        
        <div className={styles.buttonContainer}>
          <button 
            className={`${styles.button} ${styles.loginButton}`}
            onClick={() => router.push('/login')}
          >
            登录系统
            <div className={styles.buttonGlow}></div>
          </button>
          <button 
            className={`${styles.button} ${styles.registerButton}`}
            onClick={() => router.push('/register')}
          >
            注册账号
            <div className={styles.buttonGlow}></div>
          </button>
        </div>
      </main>
      
      {/* 底部信息 */}
      <footer className={styles.footer}>
        <div className={styles.poweredBy}>
          <span>Powered by </span>
          <span className={styles.ethereum}>Ethereum</span>
          <Image 
            src="/ethereum.svg" 
            alt="Ethereum" 
            width={16} 
            height={16}
            className={styles.ethereumLogo}
          />
        </div>
        <p className={styles.copyright}>© 2023 ChainRate 链评系统</p>
      </footer>
    </div>
  );
}
