'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Menu, theme } from 'antd';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined,
  FileTextOutlined,
  RobotOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

export default function StudentSidebar({ selectedKey = '1', defaultOpenKey = 'sub1' }) {
  const router = useRouter();
  
  // 获取主题变量
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  
  // 侧边栏菜单项
  const siderItems = [
    {
      key: 'sub1',
      icon: React.createElement(UserOutlined),
      label: '个人中心',
      children: [
        {
          key: '1',
          label: '个人信息',
          onClick: () => router.push('/studentIndex')
        }
      ],
    },
    {
      key: 'sub2',
      icon: React.createElement(BookOutlined),
      label: '课程评分',
      children: [
        {
          key: '3',
          label: '评分管理',
          onClick: () => router.push('/studentMyEvaluation')
        },
        {
          key: '2',
          label: '课程预览',
          onClick: () => router.push('/studentViewCourses')
        }
      ],
    },
    {
      key: 'sub3',
      icon: React.createElement(CommentOutlined),
      label: '教师评价',
      children: [
        
        {
          key: '5',
          label: '评价管理',
          onClick: () => router.push('/studentEvaluateTeacher')
        },
        {
          key: '6',
          label: '查看评价',
          onClick: () => router.push('/studentViewEvaluateTeacher')
        }
      ],
    },
    {
      key: 'sub4',
      icon: React.createElement(FileTextOutlined),
      label: '课程反馈',
      children: [
        {
          key: '7',
          label: '反馈管理',
          onClick: () => router.push('/studentSubmitFeedback')
        },
        {
          key: '8',
          label: '查看反馈',
          onClick: () => router.push('/studentViewFeedback')
        }
      ],
    },
    {
      key: 'sub5',
      icon: React.createElement(RobotOutlined),
      label: '学习助手',
      children: [
        {
          key: '9',
          label: 'AI学习助手',
          onClick: () => router.push('/studentLearningAssistant')
        }
      ],
    }
  ];

  const handleClick = (e) => {
    console.log('click ', e);
    switch (e.key) {
      case '9':
        router.push('/studentLearningAssistant');
        break;
    }
  };

  return (
    <Sider width={200} style={{ background: colorBgContainer }}>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={[defaultOpenKey]}
        style={{ height: '100%', borderRight: 0 }}
        items={siderItems}
        onClick={handleClick}
      />
    </Sider>
  );
}
