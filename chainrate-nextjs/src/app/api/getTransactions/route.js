import { NextResponse } from 'next/server';
import { getUserTransactionRecords } from '@/utils/db';

export async function GET(request) {
  try {
    // 从URL参数获取钱包地址
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const limit = searchParams.get('limit') || 20;
    
    // 验证请求参数
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, message: '缺少钱包地址参数' },
        { status: 400 }
      );
    }
    
    // 获取交易记录
    const transactions = await getUserTransactionRecords(walletAddress, parseInt(limit));
    
    return NextResponse.json({
      success: true,
      data: transactions
    });
    
  } catch (error) {
    console.error('获取交易记录API错误:', error);
    return NextResponse.json(
      { success: false, message: '获取交易记录失败', error: error.message },
      { status: 500 }
    );
  }
} 