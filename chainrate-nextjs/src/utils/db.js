import mysql from 'mysql2/promise';

// 从环境变量获取数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',  // 空字符串作为默认值
  database: process.env.DB_NAME || 'chain-rate'
};

console.log('数据库配置:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  // 不输出password信息，保护敏感信息
});

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
}

// 获取所有公告
async function getAnnouncements() {
  try {
    const [rows] = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
    return rows;
  } catch (error) {
    console.error('获取公告失败:', error);
    throw error;
  }
}

// 获取最近的N条公告
async function getRecentAnnouncements(limit = 5) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM announcements ORDER BY created_at DESC LIMIT ?', 
      [limit]
    );
    return rows;
  } catch (error) {
    console.error('获取最近公告失败:', error);
    throw error;
  }
}

// 添加新公告
async function addAnnouncement(title, content) {
  try {
    const [result] = await pool.query(
      'INSERT INTO announcements (title, content) VALUES (?, ?)',
      [title, content]
    );
    return result.insertId;
  } catch (error) {
    console.error('添加公告失败:', error);
    throw error;
  }
}

// 保存交易记录到数据库
async function saveTransactionRecord(transactionData) {
  try {
    const { transaction_hash, block_number, wallet_address, user_name, function_name, gas_used } = transactionData;
    
    // 检查交易哈希是否已存在
    const [existing] = await pool.query(
      'SELECT id FROM transaction_records WHERE transaction_hash = ?',
      [transaction_hash]
    );
    
    if (existing.length > 0) {
      console.log('交易记录已存在，不重复添加:', transaction_hash);
      return existing[0].id;
    }
    
    // 插入新的交易记录
    const [result] = await pool.query(
      'INSERT INTO transaction_records (transaction_hash, block_number, wallet_address, user_name, function_name, gas_used) VALUES (?, ?, ?, ?, ?, ?)',
      [transaction_hash, block_number, wallet_address, user_name, function_name, gas_used]
    );
    
    console.log('交易记录已保存，ID:', result.insertId);
    return result.insertId;
  } catch (error) {
    console.error('保存交易记录失败:', error);
    throw error;
  }
}

// 获取用户的交易记录列表
async function getUserTransactionRecords(walletAddress, limit = 20) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM transaction_records WHERE wallet_address = ? ORDER BY transaction_time DESC LIMIT ?',
      [walletAddress, limit]
    );
    return rows;
  } catch (error) {
    console.error('获取用户交易记录失败:', error);
    throw error;
  }
}

// 获取交易记录详情
async function getTransactionDetail(transactionHash) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM transaction_records WHERE transaction_hash = ?',
      [transactionHash]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('获取交易详情失败:', error);
    throw error;
  }
}

// 导出函数
export {
  testConnection,
  getAnnouncements,
  getRecentAnnouncements,
  addAnnouncement,
  saveTransactionRecord,
  getUserTransactionRecords,
  getTransactionDetail
}; 