'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { default as NextImage } from 'next/image';
import { 
  Layout, 
  Input, 
  Button, 
  Typography, 
  Spin, 
  message, 
  Card, 
  Divider,
  ConfigProvider,
  theme,
  Avatar,
  Select,
  Switch
} from 'antd';
import { 
  SendOutlined, 
  UserOutlined, 
  RobotOutlined,
  LoadingOutlined,
  ClearOutlined,
  SettingOutlined,
  MessageOutlined
} from '@ant-design/icons';
import StudentSidebar from '../components/StudentSidebar';
import UserAvatar from '../components/UserAvatar';
import styles from './page.module.css';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function StudentLearningAssistantPage() {
  const router = useRouter();
  const { token } = theme.useToken();
  const { colorBgContainer, borderRadiusLG } = token;
  
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // 用户信息状态
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: '',
    avatar: ''
  });
  
  // 聊天状态
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 设置状态
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [modelName, setModelName] = useState('deepseek-r1:8b');
  const [showSettings, setShowSettings] = useState(false);
  const [streamResponse, setStreamResponse] = useState(true);
  const [errorDisplayCount, setErrorDisplayCount] = useState(0);
  const [directMode, setDirectMode] = useState(false);
  const [serviceStatus, setServiceStatus] = useState('unknown');
  
  // 初始化用户信息
  useEffect(() => {
    // 检查用户是否已登录
    try {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const userRole = localStorage.getItem('userRole');
      
      if (!isLoggedIn || userRole !== 'student') {
        router.push('/NotFound');
        return;
      }
      
      setUserData({
        isLoggedIn: true,
        address: localStorage.getItem('userAddress') || '',
        name: localStorage.getItem('userName') || '',
        role: userRole,
        avatar: localStorage.getItem('userAvatar') || ''
      });
    } catch (error) {
      console.error("身份验证检查错误:", error);
    }
    
    // 添加初始欢迎消息
    setMessages([
      {
        role: 'assistant',
        content: '你好！我是链评学习助手，由DeepSeek-R1模型提供支持。我可以帮助你解答学习中的问题。请告诉我你需要什么帮助？',
        timestamp: new Date()
      }
    ]);

    // 检查Ollama服务是否可用
    const checkOllamaService = async () => {
      try {
        const response = await fetch(`${ollamaEndpoint}/api/tags`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.error(`Ollama服务检测失败: ${response.status}`);
          message.warning('无法连接到Ollama服务，AI助手功能可能不可用');
          return;
        }
        
        const data = await response.json();
        const modelList = data.models || [];
        const availableModels = modelList.map(m => m.name);
        
        if (!availableModels.includes(modelName)) {
          message.warning(`模型 "${modelName}" 未安装，请通过命令安装: ollama pull ${modelName}`);
        } else {
          message.success('已连接到Ollama服务，AI助手准备就绪');
        }
      } catch (error) {
        console.error("Ollama服务检测错误:", error);
        message.error('Ollama服务不可用，请确保服务已启动');
      }
    };
    
    // 延迟3秒执行检查，避免页面加载时就显示错误
    const timer = setTimeout(checkOllamaService, 3000);
    
    return () => clearTimeout(timer);
  }, [router, ollamaEndpoint, modelName]);
  
  // 自动滚动到最新消息
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 检查Ollama服务状态
  const checkOllamaStatus = async () => {
    try {
      // 首先尝试直接检查
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${ollamaEndpoint}/api/version`, {
        method: 'GET',
        signal: controller.signal
      }).catch(err => {
        if (err.name === 'AbortError') {
          throw new Error('连接超时');
        }
        throw err;
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        message.success(`Ollama服务可用 (版本: ${data.version})`);
        setServiceStatus('available');
        
        // 检查模型是否已安装
        try {
          const modelsResponse = await fetch(`${ollamaEndpoint}/api/tags`);
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            const models = modelsData.models || [];
            const modelExists = models.some(m => m.name === modelName);
            
            if (!modelExists) {
              message.warning(`模型 "${modelName}" 未安装，请通过命令安装: ollama pull ${modelName}`);
            } else {
              message.success(`模型 "${modelName}" 已安装并可用`);
            }
          }
        } catch (modelError) {
          console.error("模型检查错误:", modelError);
        }
        
        return true;
      } else {
        throw new Error(`服务响应错误: ${response.status}`);
      }
    } catch (error) {
      console.error("Ollama服务检测错误:", error);
      message.error(`Ollama服务不可用: ${error.message}`);
      setServiceStatus('unavailable');
      return false;
    }
  };
  
  // 发送消息到Ollama API
  const sendMessageToOllama = async (userMessage) => {
    try {
      setIsLoading(true);
      setError('');
      
      // 添加用户消息到聊天
      const newMessages = [
        ...messages,
        {
          role: 'user',
          content: userMessage,
          timestamp: new Date()
        }
      ];
      setMessages(newMessages);
      setInputMessage('');
      
      // 准备发送到Ollama的消息历史
      const messageHistory = newMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // 根据模式选择连接方式
      if (directMode) {
        // 直接模式 - 跳过API路由，直接连接Ollama
        await connectDirectlyToOllama(messageHistory);
      } else {
        try {
          // API路由模式
          if (streamResponse) {
            await handleStreamResponse(messageHistory);
          } else {
            await handleNormalResponse(messageHistory);
          }
        } catch (routeError) {
          console.error("API路由错误，尝试直接连接:", routeError);
          // 如果API路由失败，尝试直接连接
          await connectDirectlyToOllama(messageHistory);
        }
      }
    } catch (error) {
      console.error("发送消息错误:", error);
      setError(`发送消息错误: ${error.message || '未知错误'}`);
      message.error('连接AI助手失败，请检查Ollama服务是否运行');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理流式响应
  const handleStreamResponse = async (messageHistory) => {
    try {
      // 创建一个新的响应占位符
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true
        }
      ]);
      
      // 检查Ollama服务是否在本地运行
      try {
        // 检测模型是否可用
        const checkModelResponse = await fetch(`${ollamaEndpoint}/api/tags`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!checkModelResponse.ok) {
          throw new Error(`Ollama服务检测失败: ${checkModelResponse.status}`);
        }
        
        const modelsData = await checkModelResponse.json();
        const modelExists = modelsData.models && modelsData.models.some(m => m.name === modelName);
        
        if (!modelExists) {
          message.warning(`模型 "${modelName}" 可能未安装，请检查Ollama是否已下载该模型`);
        }
      } catch (modelCheckError) {
        console.error("Ollama服务检测错误:", modelCheckError);
        message.error('无法连接到Ollama服务，请确保服务已启动');
      }
      
      // 使用我们的API路由发送请求
      const response = await fetch('/api/ollama', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ollamaEndpoint: `${ollamaEndpoint}/api/chat`,
          model: modelName,
          messages: messageHistory,
          stream: true
        })
      });
      
      if (!response.ok) {
        let errorMessage = `API响应错误: ${response.status}`;
        
        try {
          // 尝试解析错误JSON，但捕获任何解析失败
          const errorData = await response.json().catch(() => null);
          if (errorData && errorData.error) {
            errorMessage += ` - ${errorData.error}`;
          }
        } catch (jsonError) {
          console.error("解析错误响应失败:", jsonError);
          // 尝试读取响应文本
          const errorText = await response.text().catch(() => "");
          if (errorText) {
            errorMessage += ` - ${errorText.substring(0, 100)}`;
          }
        }
        
        console.error("API错误:", errorMessage);
        throw new Error(errorMessage);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedResponse = '';
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const parsedLine = JSON.parse(line);
            if (parsedLine.message && parsedLine.message.content) {
              accumulatedResponse += parsedLine.message.content;
              
              // 更新最后一条消息的内容
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = accumulatedResponse;
                return newMessages;
              });
            }
          } catch (e) {
            console.error('解析响应行错误:', e, line);
          }
        }
      }
      
      // 完成流式响应，移除流标记
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0) {
          newMessages[newMessages.length - 1].isStreaming = false;
        }
        return newMessages;
      });
    } catch (error) {
      console.error("流式响应错误:", error);
      setError(`流式响应错误: ${error.message}`);
      
      // 移除流标记并添加错误提示
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].isStreaming) {
          newMessages[newMessages.length - 1].isStreaming = false;
          newMessages[newMessages.length - 1].content = `获取回答失败: ${error.message || '未知错误'}\n\n请检查:\n1. Ollama服务是否正在运行 (http://localhost:11434)\n2. 是否已安装模型 "${modelName}"\n3. 网络连接是否正常`;
          newMessages[newMessages.length - 1].isError = true;
        }
        return newMessages;
      });
      
      // 显示用户友好的错误提示
      message.error('连接AI服务失败，请确保Ollama正在运行且已安装所需模型');
    }
  };
  
  // 处理非流式响应
  const handleNormalResponse = async (messageHistory) => {
    try {
      // 提示用户检查Ollama是否运行
      if (errorDisplayCount === 0) {
        setErrorDisplayCount(prev => prev + 1);
        message.info('正在连接AI服务，请确保Ollama已在本地启动，并已安装所需模型');
      }

      // 先检查Ollama服务是否可用
      try {
        const checkResponse = await fetch(`${ollamaEndpoint}/api/tags`, {
          method: 'GET',
          timeout: 3000 // 设置超时，避免长时间等待
        });
        
        if (!checkResponse.ok) {
          throw new Error(`Ollama服务检测失败: ${checkResponse.status}`);
        }
      } catch (checkError) {
        console.error("Ollama服务检测错误:", checkError);
        throw new Error('无法连接到Ollama服务，请确保服务已启动');
      }

      const response = await fetch('/api/ollama', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ollamaEndpoint: `${ollamaEndpoint}/api/chat`,
          model: modelName,
          messages: messageHistory,
          stream: false
        })
      });
      
      if (!response.ok) {
        let errorMessage = `API响应错误: ${response.status}`;
        
        try {
          // 尝试解析错误JSON，但捕获任何解析失败
          const errorData = await response.json().catch(() => null);
          if (errorData && errorData.error) {
            errorMessage += ` - ${errorData.error}`;
          }
        } catch (jsonError) {
          console.error("解析错误响应失败:", jsonError);
          // 尝试读取响应文本
          const errorText = await response.text().catch(() => "");
          if (errorText) {
            errorMessage += ` - ${errorText.substring(0, 100)}`;
          }
        }
        
        console.error("API错误:", errorMessage);
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (data.message && data.message.content) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.message.content,
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error("非流式响应错误:", error);
      setError(`获取响应错误: ${error.message}`);
      
      // 添加错误消息
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `获取回答失败: ${error.message || '未知错误'}\n\n请检查:\n1. Ollama服务是否正在运行 (${ollamaEndpoint})\n2. 是否已安装模型 "${modelName}"\n3. 网络连接是否正常`,
          timestamp: new Date(),
          isError: true
        }
      ]);
      
      // 显示错误通知
      message.error('连接AI服务失败，请确保Ollama正在运行');
    }
  };
  
  // 直接连接Ollama的备选方案
  const connectDirectlyToOllama = async (messageHistory) => {
    try {
      // 通知用户正在尝试直接连接
      message.info('正在直接连接Ollama服务...');
      
      // 创建一个新的响应占位符
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true
        }
      ]);
      
      // 检查是否在本地环境
      const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname.includes('192.168.') ||
                          window.location.hostname.includes('.local');
      
      // 尝试直接连接Ollama服务
      const endpoint = streamResponse 
        ? `${ollamaEndpoint}/api/chat` 
        : `${ollamaEndpoint}/api/generate`;
      
      // 准备请求数据
      let requestData;
      if (streamResponse) {
        requestData = {
          model: modelName,
          messages: messageHistory,
          stream: false // 即使用户选择了流式，我们也不在直接模式下使用流式，更可靠
        };
      } else {
        // 转换消息格式为prompt (generate API格式)
        let prompt = '';
        messageHistory.forEach(msg => {
          if (msg.role === 'user') {
            prompt += `用户: ${msg.content}\n`;
          } else if (msg.role === 'assistant') {
            prompt += `助手: ${msg.content}\n`;
          }
        });
        prompt += '助手: ';
        
        requestData = {
          model: modelName,
          prompt: prompt,
          stream: false
        };
      }
      
      // 添加CORS头
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      };
      
      // 如果非本地环境，添加CORS模式
      if (!isLocalhost) {
        requestOptions.mode = 'cors';
      }
      
      // 执行请求
      const response = await fetch(endpoint, requestOptions);
      
      if (!response.ok) {
        let errorMessage = `直接连接Ollama失败: ${response.status}`;
        
        try {
          const errorData = await response.json().catch(() => null);
          if (errorData && errorData.error) {
            errorMessage += ` - ${errorData.error}`;
          }
        } catch (e) {
          console.error('解析错误响应失败:', e);
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // 提取回答内容 (根据API类型处理不同的响应格式)
      const content = streamResponse 
        ? (data.message?.content || data.response || '')
        : (data.response || '');
      
      if (content) {
        // 更新最后一条消息
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: content,
              timestamp: new Date(),
              isStreaming: false
            };
          }
          return newMessages;
        });
        
        message.success('成功获取AI回答');
        // 更新服务状态
        setServiceStatus('available');
      } else {
        throw new Error('Ollama服务没有返回有效的回答内容');
      }
    } catch (error) {
      console.error("直接连接Ollama错误:", error);
      
      // 更新最后一条消息为错误信息
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].isStreaming) {
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: `直接连接Ollama失败: ${error.message}\n\n请确保:\n1. Ollama服务已启动 (终端运行'ollama list'验证)\n2. 可以通过浏览器访问 ${ollamaEndpoint}\n3. 已安装模型 "${modelName}"\n4. 防火墙未阻止连接`,
            timestamp: new Date(),
            isStreaming: false,
            isError: true
          };
        }
        return newMessages;
      });
      
      message.error('直接连接Ollama失败，请检查服务是否正常运行');
      // 更新服务状态
      setServiceStatus('unavailable');
    }
  };
  
  // 处理消息发送
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    sendMessageToOllama(inputMessage.trim());
  };
  
  // 处理按键事件
  const handleKeyDown = (e) => {
    // Ctrl+Enter 发送消息
    if (e.ctrlKey && e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  // 清空聊天记录
  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: '聊天记录已清空。有什么我可以帮助你的吗？',
        timestamp: new Date()
      }
    ]);
  };
  
  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };
  
  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userRoleHash');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userCollege');
    localStorage.removeItem('userMajor');
    localStorage.removeItem('userGrade');
    localStorage.removeItem('userAvatar');
    router.push('/login');
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className={styles.logo}>
              <NextImage 
                src="/images/logo1.png" 
                alt="链评系统Logo" 
                width={40} 
                height={40}
                style={{ borderRadius: '6px' }}
              />
            </div>
            <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
              链评系统（ChainRate）- 学生端
            </div>
          </div>
          <div style={{ color: 'white', marginRight: '20px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '15px' }}>欢迎, {userData.name}</span>
            <UserAvatar color="#fff" />
          </div>
        </Header>
        <Layout>
          <StudentSidebar defaultSelectedKey="9" defaultOpenKey="sub5" />
          <Layout style={{ padding: '0 24px 24px' }}>
            <Content
              style={{
                padding: 24,
                margin: 0,
                minHeight: 280,
                background: colorBgContainer,
                borderRadius: borderRadiusLG,
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 112px)',
              }}
            >
              <div className={styles.aiAssistantHeader}>
                <Title level={3} className={styles.assistantTitle}>
                  <RobotOutlined /> 链评学习助手
                </Title>
                <div className={styles.assistantControls}>
                  <Button 
                    icon={<SettingOutlined />} 
                    onClick={() => setShowSettings(!showSettings)}
                    type={showSettings ? 'primary' : 'default'}
                  >
                    设置
                  </Button>
                  <Button 
                    icon={<ClearOutlined />} 
                    onClick={handleClearChat}
                  >
                    清空对话
                  </Button>
                </div>
              </div>
              
              {showSettings && (
                <Card className={styles.settingsCard}>
                  <div className={styles.settingsGrid}>
                    <div className={styles.settingItem}>
                      <Text strong>Ollama 服务地址</Text>
                      <Input 
                        placeholder="例如: http://localhost:11434"
                        value={ollamaEndpoint}
                        onChange={(e) => setOllamaEndpoint(e.target.value)}
                        addonAfter={
                          <Button 
                            type="link" 
                            size="small" 
                            onClick={checkOllamaStatus}
                            style={{ padding: '0 8px' }}
                          >
                            测试连接
                          </Button>
                        }
                      />
                    </div>
                    <div className={styles.settingItem}>
                      <Text strong>模型名称</Text>
                      <Select 
                        value={modelName}
                        onChange={(value) => setModelName(value)}
                        style={{ width: '100%' }}
                      >
                        <Option value="deepseek-r1:8b">DeepSeek-R1 (8B)</Option>
                        <Option value="llama3:8b">Llama-3 (8B)</Option>
                        <Option value="qwen2:7b">Qwen-2 (7B)</Option>
                        <Option value="mistral:7b">Mistral (7B)</Option>
                        <Option value="gemma:7b">Gemma (7B)</Option>
                      </Select>
                    </div>
                    <div className={styles.settingItem}>
                      <Text strong>连接模式</Text>
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                        <Switch 
                          checked={directMode}
                          onChange={(checked) => setDirectMode(checked)}
                        />
                        <Text style={{ marginLeft: '8px' }}>
                          {directMode ? '直接连接模式' : 'API路由模式'}
                        </Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px' }}>
                        {directMode 
                          ? '直接连接Ollama服务，适用于本地环境，可能绕过CORS限制'
                          : '通过Next.js API路由连接，适用于所有环境，但可能受CORS限制'}
                      </Text>
                    </div>
                    <div className={styles.settingItem}>
                      <Text strong>流式响应</Text>
                      <Switch 
                        checked={streamResponse}
                        onChange={(checked) => setStreamResponse(checked)}
                      />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        打开后可实时查看回复，但可能增加延迟
                      </Text>
                    </div>
                    <div className={styles.settingItem} style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                        <Text strong>Ollama服务状态: </Text>
                        <Text style={{ marginLeft: '8px' }}>
                          {serviceStatus === 'available' && <span style={{ color: 'green' }}>可用</span>}
                          {serviceStatus === 'unavailable' && <span style={{ color: 'red' }}>不可用</span>}
                          {serviceStatus === 'unknown' && <span style={{ color: 'orange' }}>未知</span>}
                        </Text>
                        <Button 
                          type="primary" 
                          size="small" 
                          onClick={checkOllamaStatus}
                          style={{ marginLeft: '16px' }}
                        >
                          检查服务
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
              
              <div className={styles.messagesContainer}>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`${styles.messageWrapper} ${
                      msg.role === 'user' ? styles.userMessage : styles.assistantMessage
                    }`}
                  >
                    <div className={styles.messageAvatar}>
                      {msg.role === 'user' ? (
                        <Avatar icon={<UserOutlined />} />
                      ) : (
                        <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1a73e8' }} />
                      )}
                    </div>
                    <div className={styles.messageContent}>
                      <div className={styles.messageHeader}>
                        <Text strong>{msg.role === 'user' ? userData.name : '链评学习助手'}</Text>
                        <Text type="secondary" className={styles.messageTime}>
                          {formatTimestamp(msg.timestamp)}
                        </Text>
                      </div>
                      <div className={`${styles.messageText} ${msg.isError ? styles.errorMessage : ''}`}>
                        {msg.content}
                        {msg.isStreaming && <LoadingOutlined className={styles.streamingIndicator} />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messageEndRef} />
                
                {isLoading && !streamResponse && (
                  <div className={styles.loadingContainer}>
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                    <Text className={styles.loadingText}>AI助手正在思考...</Text>
                  </div>
                )}
                
                {error && (
                  <div className={styles.errorContainer}>
                    <Text type="danger">{error}</Text>
                  </div>
                )}
              </div>
              
              <div className={styles.inputContainer}>
                <TextArea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入你的问题..."
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  disabled={isLoading}
                />
                <div className={styles.inputActions}>
                  <Text type="secondary" className={styles.inputTip}>
                    按 Ctrl+Enter 发送
                  </Text>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleSendMessage}
                    loading={isLoading && !streamResponse}
                    disabled={!inputMessage.trim()}
                  >
                    发送
                  </Button>
                </div>
              </div>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}