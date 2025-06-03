import { NextResponse } from 'next/server';

// 处理流式请求的异步函数
async function streamResponse(url, body, headers) {
  try {
    console.log(`发送流式请求到: ${url}`);
    
    // 测试Ollama服务是否可用
    try {
      const testResponse = await fetch(url.replace('/api/chat', '/api/tags'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!testResponse.ok) {
        console.error(`Ollama服务不可用: ${testResponse.status}`);
        return NextResponse.json(
          { error: `Ollama服务不可用，请确保Ollama已启动` },
          { status: 503 }
        );
      }
    } catch (testError) {
      console.error('Ollama服务连接测试失败:', testError);
      return NextResponse.json(
        { error: `无法连接到Ollama服务: ${testError.message}` },
        { status: 503 }
      );
    }
    
    // 向Ollama服务器发送请求
    const ollamaResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });

    // 如果响应不成功，返回错误
    if (!ollamaResponse.ok) {
      console.error(`Ollama服务器响应错误: ${ollamaResponse.status}`);
      let errorMessage = `Ollama服务器响应错误: ${ollamaResponse.status}`;
      
      try {
        const errorText = await ollamaResponse.text();
        let errorData = null;
        
        try {
          // 尝试解析为JSON
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          // 如果不是有效的JSON，使用原始文本
          errorMessage += ` - ${errorText.substring(0, 100)}`;
          return NextResponse.json(
            { error: errorMessage },
            { status: ollamaResponse.status }
          );
        }
        
        if (errorData && errorData.error) {
          errorMessage += ` - ${errorData.error}`;
        }
      } catch (e) {
        console.error('解析错误响应失败:', e);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: ollamaResponse.status }
      );
    }

    // 返回流式响应
    return new NextResponse(ollamaResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('代理Ollama请求错误:', error);
    return NextResponse.json(
      { error: `代理请求错误: ${error.message || '未知错误'}` },
      { status: 500 }
    );
  }
}

// 处理非流式请求的异步函数
async function normalResponse(url, body, headers) {
  try {
    console.log(`发送非流式请求到: ${url}`);
    
    // 测试Ollama服务是否可用
    try {
      const testResponse = await fetch(url.replace('/api/chat', '/api/tags'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!testResponse.ok) {
        console.error(`Ollama服务不可用: ${testResponse.status}`);
        return NextResponse.json(
          { error: `Ollama服务不可用，请确保Ollama已启动` },
          { status: 503 }
        );
      }
    } catch (testError) {
      console.error('Ollama服务连接测试失败:', testError);
      return NextResponse.json(
        { error: `无法连接到Ollama服务: ${testError.message}` },
        { status: 503 }
      );
    }
    
    // 向Ollama服务器发送请求
    const ollamaResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(body)
    });

    // 如果响应不成功，返回错误
    if (!ollamaResponse.ok) {
      console.error(`Ollama服务器响应错误: ${ollamaResponse.status}`);
      let errorMessage = `Ollama服务器响应错误: ${ollamaResponse.status}`;
      
      try {
        const errorText = await ollamaResponse.text();
        let errorData = null;
        
        try {
          // 尝试解析为JSON
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          // 如果不是有效的JSON，使用原始文本
          errorMessage += ` - ${errorText.substring(0, 100)}`;
          return NextResponse.json(
            { error: errorMessage },
            { status: ollamaResponse.status }
          );
        }
        
        if (errorData && errorData.error) {
          errorMessage += ` - ${errorData.error}`;
        }
      } catch (e) {
        console.error('解析错误响应失败:', e);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: ollamaResponse.status }
      );
    }

    // 读取响应数据
    try {
      const data = await ollamaResponse.json();
      // 返回响应
      return NextResponse.json(data);
    } catch (jsonError) {
      console.error('解析Ollama响应JSON失败:', jsonError);
      const textResponse = await ollamaResponse.text().catch(() => "");
      return NextResponse.json(
        { error: `解析响应失败: ${jsonError.message}`, rawResponse: textResponse.substring(0, 200) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('代理Ollama请求错误:', error);
    return NextResponse.json(
      { error: `代理请求错误: ${error.message || '未知错误'}` },
      { status: 500 }
    );
  }
}

// POST处理函数
export async function POST(request) {
  try {
    // 解析请求体
    const body = await request.json();
    const { ollamaEndpoint, ...ollamaBody } = body;
    
    // 提取请求头
    const headers = {};
    request.headers.forEach((value, key) => {
      if (key.startsWith('x-') || key === 'authorization') {
        headers[key] = value;
      }
    });
    
    // 构建完整的Ollama API URL
    const ollamaUrl = ollamaEndpoint || 'http://localhost:11434/api/chat';
    console.log(`接收到请求，转发到: ${ollamaUrl}`);
    
    // 检查URL格式是否正确
    if (!ollamaUrl.includes('://')) {
      return NextResponse.json(
        { error: '无效的Ollama端点URL' },
        { status: 400 }
      );
    }
    
    // 尝试优先使用简单的API连接测试
    // 使用更可靠的方式测试连接
    try {
      // 使用AbortController设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      // 这里不使用tags接口，因为有时它比较慢，改用更基本的接口
      const testResponse = await fetch(`${ollamaUrl.split('/api/')[0]}/api/version`, {
        method: 'GET',
        signal: controller.signal
      }).catch(err => {
        if (err.name === 'AbortError') {
          throw new Error('连接超时');
        }
        throw err;
      });
      
      clearTimeout(timeoutId);
      
      if (!testResponse.ok) {
        return NextResponse.json(
          { error: `Ollama服务不可用，状态码: ${testResponse.status}` },
          { status: 503 }
        );
      }
    } catch (connectionError) {
      console.error('Ollama连接测试失败:', connectionError);
      
      // 更详细的错误消息，帮助用户排查问题
      const errorDetail = connectionError.message || '未知连接错误';
      const errorHelp = `
请确认:
1. Ollama服务是否正在运行 (可通过终端运行'ollama list'验证)
2. 是否可通过浏览器访问 http://localhost:11434/
3. 是否存在防火墙或安全软件阻止连接
4. 服务端点是否配置正确`;
      
      return NextResponse.json(
        { 
          error: `无法连接到Ollama服务: ${errorDetail}`, 
          help: errorHelp 
        },
        { status: 503 }
      );
    }
    
    // 根据请求参数决定使用流式响应还是普通响应
    if (ollamaBody.stream === true) {
      return streamResponse(ollamaUrl, ollamaBody, headers);
    } else {
      return normalResponse(ollamaUrl, ollamaBody, headers);
    }
  } catch (error) {
    console.error('处理请求错误:', error);
    return NextResponse.json(
      { error: `处理请求错误: ${error.message || '未知错误'}` },
      { status: 500 }
    );
  }
}

// 配置CORS头信息
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS 请求处理 - 支持CORS预检请求
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
} 