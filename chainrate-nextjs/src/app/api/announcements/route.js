import { getAnnouncements, getRecentAnnouncements, addAnnouncement } from '../../../utils/db';
import { NextResponse } from 'next/server';

// 获取所有公告
export async function GET(request) {
  try {
    // 解析URL查询参数。
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    
    let announcements;
    
    // 如果指定了limit参数，获取最近的N条公告
    if (limit) {
      announcements = await getRecentAnnouncements(parseInt(limit));
    } else {
      // 否则获取所有公告
      announcements = await getAnnouncements();
    }
    
    // 返回成功响应
    return NextResponse.json({ 
      success: true, 
      data: announcements 
    });
  } catch (error) {
    console.error('获取公告失败:', error);
    
    // 返回错误响应
    return NextResponse.json(
      { 
        success: false, 
        message: '获取公告失败', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// 添加新公告
export async function POST(request) {
  try {
    // 解析请求体中的JSON数据
    const data = await request.json();
    
    // 验证请求数据
    if (!data.title || !data.content) {
      return NextResponse.json(
        { 
          success: false, 
          message: '标题和内容不能为空' 
        },
        { status: 400 }
      );
    }
    
    // 添加新公告到数据库
    const announcementId = await addAnnouncement(data.title, data.content);
    
    // 返回成功响应
    return NextResponse.json({ 
      success: true, 
      message: '公告添加成功',
      data: { id: announcementId }
    });
  } catch (error) {
    console.error('添加公告失败:', error);
    
    // 返回错误响应
    return NextResponse.json(
      { 
        success: false, 
        message: '添加公告失败', 
        error: error.message 
      },
      { status: 500 }
    );
  }
} 