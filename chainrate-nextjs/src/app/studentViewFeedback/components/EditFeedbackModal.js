'use client';

import { useState, useEffect } from 'react';
import { Modal, Form, Input, Upload, Button, Progress, Space, Divider, App } from 'antd';
import { UploadOutlined, PictureOutlined, FileOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import styles from './EditFeedbackModal.module.css';

const { TextArea } = Input;

// 上传文件到IPFS的函数
const uploadToIPFS = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // 使用Pinata API进行上传
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    if (response.data && response.data.IpfsHash) {
      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } else {
      throw new Error('上传到IPFS失败');
    }
  } catch (error) {
    console.error('上传到IPFS错误:', error);
    throw error;
  }
};

const EditFeedbackModal = ({
  visible,
  feedback,
  onCancel,
  onSubmit,
  loading
}) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [imageList, setImageList] = useState([]);
  const [docList, setDocList] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [uploading, setUploading] = useState(false);

  // 初始化表单和数据
  useEffect(() => {
    if (visible && feedback) {
      // 设置反馈内容
      setFeedbackContent(feedback.content || '');
      form.setFieldsValue({
        content: feedback.content || ''
      });

      // 初始化已有的图片
      if (feedback.imageUrls && feedback.imageUrls.length > 0) {
        const initialImages = feedback.imageUrls.map((url, index) => ({
          uid: `existing-image-${index}`,
          name: `图片 ${index + 1}`,
          status: 'done',
          url: url,
          thumbUrl: url,
          existingUrl: true
        }));
        setImageList(initialImages);
      } else {
        setImageList([]);
      }

      // 初始化已有的文档
      if (feedback.documentHashes && feedback.documentHashes.length > 0) {
        const initialDocs = feedback.documentHashes.map((hash, index) => {
          const url = hash.startsWith('http') ? hash : `https://gateway.pinata.cloud/ipfs/${hash}`;
          return {
            uid: `existing-doc-${index}`,
            name: `文档 ${index + 1}`,
            status: 'done',
            url: url,
            existingUrl: true
          };
        });
        setDocList(initialDocs);
      } else {
        setDocList([]);
      }
    }
  }, [visible, feedback, form]);

  // 处理图片上传
  const handleImageUpload = ({ fileList }) => {
    setImageList(fileList);
  };

  // 处理文档上传
  const handleDocUpload = ({ fileList }) => {
    setDocList(fileList);
  };

  // 上传文件前检查
  const beforeUpload = (file) => {
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过10MB!');
      return Upload.LIST_IGNORE;
    }
    return false; // 阻止自动上传
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      // 验证表单
      const values = await form.validateFields();
      setUploading(true);
      setUploadProgress(0);

      // 上传内容到IPFS
      message.loading('上传反馈内容中...');
      const contentObject = {
        content: values.content,
        timestamp: new Date().toISOString(),
        author: 'Student'
      };
      
      // 将内容转换为JSON字符串
      const jsonContent = JSON.stringify(contentObject);
      
      // 将内容转换为Blob
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const file = new File([blob], 'feedback-content.json', { type: 'application/json' });
      
      const contentHash = await uploadToIPFS(file);
      setUploadProgress(33);

      // 处理图片上传
      let imageHashes = [];
      if (imageList.length > 0) {
        const newImages = imageList.filter(img => !img.existingUrl);
        const existingImages = imageList.filter(img => img.existingUrl).map(img => img.url);
        
        if (newImages.length > 0) {
          message.loading(`上传${newImages.length}张新图片中...`);
          for (const img of newImages) {
            if (img.originFileObj) {
              const imgHash = await uploadToIPFS(img.originFileObj);
              imageHashes.push(imgHash);
            }
          }
        }
        
        // 合并新旧图片哈希
        imageHashes = [...existingImages, ...imageHashes];
      }
      setUploadProgress(66);

      // 处理文档上传
      let documentHashes = [];
      if (docList.length > 0) {
        const newDocs = docList.filter(doc => !doc.existingUrl);
        const existingDocs = docList.filter(doc => doc.existingUrl).map(doc => doc.url);
        
        if (newDocs.length > 0) {
          message.loading(`上传${newDocs.length}个新文档中...`);
          for (const doc of newDocs) {
            if (doc.originFileObj) {
              const docHash = await uploadToIPFS(doc.originFileObj);
              documentHashes.push(docHash);
            }
          }
        }
        
        // 合并新旧文档哈希
        documentHashes = [...existingDocs, ...documentHashes];
      }
      setUploadProgress(100);

      // 调用父组件传入的提交方法
      onSubmit({
        feedbackId: feedback.id,
        courseId: feedback.courseId,
        contentHash,
        documentHashes,
        imageHashes
      });
    } catch (error) {
      console.error('提交编辑反馈失败:', error);
      message.error('表单验证失败或上传过程中出错');
      setUploading(false);
    }
  };

  return (
    <Modal
      title="编辑反馈"
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading || uploading}>
          取消
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          onClick={handleSubmit} 
          loading={loading || uploading}
          disabled={uploading}
        >
          {uploading ? '上传中...' : '提交修改'}
        </Button>
      ]}
    >
      <Form form={form} layout="vertical" className={styles.feedbackForm}>
        <Form.Item
          name="content"
          label="反馈内容"
          rules={[
            { required: true, message: '请输入反馈内容' },
            { min: 10, message: '反馈内容至少需要10个字' }
          ]}
        >
          <TextArea 
            placeholder="请详细描述您对课程内容的反馈、建议或问题..." 
            autoSize={{ minRows: 6, maxRows: 12 }}
            showCount
            maxLength={2000}
          />
        </Form.Item>

        <Divider plain>附件上传</Divider>

        <Form.Item
          label="图片附件"
          extra="支持JPG(.jpg, .jpeg), PNG(.png), GIF(.gif), WebP(.webp)等图片格式，单个文件最大10MB"
        >
          <Upload
            listType="picture"
            fileList={imageList}
            onChange={handleImageUpload}
            beforeUpload={beforeUpload}
            multiple
          >
            <Button icon={<PictureOutlined />}>上传图片</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          label="文档附件"
          extra="支持 PDF(.pdf), Word(.doc, .docx), Excel(.xls, .xlsx), PPT(.ppt, .pptx), 文本(.txt)等格式，单个文件最大10MB"
        >
          <Upload
            listType="text"
            fileList={docList}
            onChange={handleDocUpload}
            beforeUpload={beforeUpload}
            multiple
          >
            <Button icon={<FileOutlined />}>上传文档</Button>
          </Upload>
        </Form.Item>

        {uploading && (
          <Space direction="vertical" style={{ width: '100%' }} className={styles.uploadProgress}>
            <Progress percent={uploadProgress} status="active" />
            <div className={styles.progressStatus}>
              上传进度：{uploadProgress}%
              {uploadProgress === 100 && <CheckCircleOutlined style={{ marginLeft: 8 }} />}
            </div>
          </Space>
        )}
      </Form>
    </Modal>
  );
};

export default EditFeedbackModal; 