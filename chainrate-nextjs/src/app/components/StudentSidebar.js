'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Menu, theme } from 'antd';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined 
} from '@ant-design/icons';

const { Sider } = Layout;

export default function StudentSidebar({ defaultSelectedKey = '1', defaultOpenKey = 'sub1' }) {
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
      label: '课程管理',
      children: [
        {
          key: '2',
          label: '查看课程',
          onClick: () => router.push('/studentViewCourses')
        }
      ],
    },
    {
      key: 'sub3',
      icon: React.createElement(CommentOutlined),
      label: '评价管理',
      children: [
        {
          key: '3',
          label: '查看课程评价',
          onClick: () => router.push('/studentMyEvaluation')
        },
        // {
        //   key: '4',
        //   label: '提交评价',
        //   onClick: () => router.push('/submit-evaluation')
        // },
        {
          key: '5',
          label: '进行教师评价',
          onClick: () => router.push('/studentEvaluateTeacher')
        },
        {
          key: '6',
          label: '查看教师评价',
          onClick: () => router.push('/studentViewEvaluateTeacher')
        }
      ],
    }
  ];

  return (
    <Sider width={200} style={{ background: colorBgContainer }}>
      <Menu
        mode="inline"
        defaultSelectedKeys={[defaultSelectedKey]}
        defaultOpenKeys={[defaultOpenKey]}
        style={{ height: '100%', borderRight: 0 }}
        items={siderItems}
      />
    </Sider>
  );
}
