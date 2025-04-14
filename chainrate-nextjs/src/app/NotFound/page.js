'use client';

import { Button, Result, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const { Title, Text } = Typography;

export default function NotFound() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <Result
        status="404"
        title="404"
        subTitle="抱歉，您访问的页面不存在或未授权"
        extra={
          <Button 
            type="primary" 
            onClick={() => router.push('/')}
            className={styles.backButton}
          >
            返回首页
          </Button>
        }
      />
      <div className={styles.tips}>
        <Title level={4}>可能的原因：</Title>
        <ul>
          <li>您尚未登录或登录已过期</li>
          <li>您没有访问该页面的权限</li>
          <li>您访问的页面不存在</li>
        </ul>
      </div>
    </div>
  );
} 