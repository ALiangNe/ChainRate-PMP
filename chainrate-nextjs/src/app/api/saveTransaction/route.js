import { NextResponse } from 'next/server';
import { saveTransactionRecord } from '@/utils/db';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // 验证必要字段
    const requiredFields = ['transaction_hash', 'wallet_address', 'function_name'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, message: `缺少必要字段: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // 保存交易记录
    const transactionId = await saveTransactionRecord({
      transaction_hash: data.transaction_hash,
      block_number: data.block_number || 0,
      wallet_address: data.wallet_address,
      user_name: data.user_name || '',
      function_name: data.function_name,
      gas_used: data.gas_used || 0
    });
    
    return NextResponse.json({
      success: true,
      message: '交易记录已保存',
      transactionId
    });
    
  } catch (error) {
    console.error('保存交易记录API错误:', error);
    return NextResponse.json(
      { success: false, message: '保存交易记录失败', error: error.message },
      { status: 500 }
    );
  }
} 