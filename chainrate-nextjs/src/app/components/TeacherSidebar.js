'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Layout, Menu, theme } from 'antd';
import { 
  UserOutlined, 
  BookOutlined, 
  CommentOutlined,
  BarChartOutlined,
  MessageOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

export default function TeacherSidebar({ defaultSelectedKey = '1', defaultOpenKey = 'sub1' }) {
  const router = useRouter();
  
  // 获取主题变量
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  
  // 侧边栏菜单项
  const siderItems = [
    {
      key: 'sub1',
      icon: <UserOutlined />,
      label: '个人中心',
      children: [
        {
          key: '1',
          label: '个人信息',
          onClick: () => router.push('/teacherIndex')
        }
      ],
    },
    {
      key: 'sub2',
      icon: <BookOutlined />,
      label: '课程评分管理',
      children: [
        {
          key: '2',
          label: '创建课程',
          onClick: () => router.push('/teacherCreateCourse')
        },
        {
          key: '3',
          label: '我的课程',
          onClick: () => router.push('/teacherViewCourse')
        },
        {
          key: '4',
          label: '课程评价',
          onClick: () => router.push('/teacherViewEvaluation')
        },
      ],
    },
    {
      key: 'sub3',
      icon: <CommentOutlined />,
      label: '教师评价管理',
      children: [
        
        
        {
          key: '6',
          label: '教师评价',
          onClick: () => router.push('/teacherViewEvaluateTeacher')
        },
        {
          key: '5',
          label: '统计分析',
          onClick: () => router.push('/teacherStatisticalAnalysis')
        }
      ],
    },
    {
      key: 'sub4',
      icon: <BarChartOutlined />,
      label: '课程反馈管理',
      children: [
        
        {
          key: '7',
          label: '学生反馈',
          onClick: () => router.push('/teacherViewFeedback')
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