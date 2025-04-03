import { getAnnouncements, getRecentAnnouncements } from '../../../utils/db';
import { NextResponse } from 'next/server';

// 获取所有公告
export async function GET(request) {
  try {
    // 解析URL查询参数
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