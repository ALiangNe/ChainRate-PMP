-- 交易记录表
CREATE TABLE IF NOT EXISTS `transaction_records` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `transaction_hash` varchar(255) NOT NULL COMMENT '交易哈希',
  `block_number` bigint(20) NOT NULL DEFAULT 0 COMMENT '区块号',
  `wallet_address` varchar(255) NOT NULL COMMENT '钱包地址',
  `user_name` varchar(100) DEFAULT NULL COMMENT '用户名字',
  `function_name` varchar(100) NOT NULL COMMENT '函数名称',
  `gas_used` varchar(100) NOT NULL DEFAULT '0' COMMENT '消耗的gas',
  `transaction_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '交易时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `tx_hash_unique` (`transaction_hash`),
  KEY `wallet_address_idx` (`wallet_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='区块链交易记录表';

-- 添加一些测试数据（可选）
-- INSERT INTO `transaction_records` (`transaction_hash`, `block_number`, `wallet_address`, `user_name`, `function_name`, `gas_used`) 
-- VALUES ('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', 12345678, '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12', '张三', 'submitEvaluation', '85000'); 