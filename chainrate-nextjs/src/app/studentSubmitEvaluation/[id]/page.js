'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import ChainRateABI from '../../../contracts/ChainRate.json';
import ChainRateAddress from '../../../contracts/ChainRate-address.json';
import styles from './page.module.css';
import Image from 'next/image';

export default function SubmitEvaluationPage({ params }) {
  const router = useRouter();
  const courseId = params.id;
  
  // 用户身份信息
  const [userData, setUserData] = useState({
    isLoggedIn: false,
    address: '',
    name: '',
    role: ''
  });
  
  // 课程数据
  const [course, setCourse] = useState(null);
  
  // 评价表单数据
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [teachingRating, setTeachingRating] = useState(5); // 新增：教学质量评分
  const [contentRating, setContentRating] = useState(5); // 新增：内容设计评分
  const [interactionRating, setInteractionRating] = useState(5); // 新增：师生互动评分
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState([]); // 新增：评价图片
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Web3相关
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    // 检查用户是否已登录并且是学生角色
    const checkUserAuth = () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const userRole = localStorage.getItem('userRole');
      
      if (!isLoggedIn || userRole !== 'student') {
        router.push('/login');
        return;
      }

      // 获取用户信息
      setUserData({
        isLoggedIn: true,
        address: localStorage.getItem('userAddress') || '',
        name: localStorage.getItem('userName') || '',
        role: userRole
      });
      
      // 初始化Web3连接
      initWeb3();
    };

    const initWeb3 = async () => {
      try {
        // 检查是否有 MetaMask
        if (typeof window.ethereum === 'undefined') {
          setError('请安装 MetaMask 钱包以使用此应用');
          setLoading(false);
          return;
        }
        
        // 请求用户连接钱包
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // 创建 Web3 Provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);
        
        // 获取 Signer
        const signer = await provider.getSigner();
        setSigner(signer);
        
        // 连接到合约
        const chainRateContract = new ethers.Contract(
          ChainRateAddress.address,
          ChainRateABI.abi,
          signer
        );
        setContract(chainRateContract);
        
        // 加载课程详情
        await loadCourseDetails(chainRateContract, await signer.getAddress(), courseId);
        
        setLoading(false);
      } catch (err) {
        console.error("初始化Web3失败:", err);
        setError('连接区块链失败: ' + (err.message || err));
        setLoading(false);
      }
    };
    
    checkUserAuth();
  }, [router, courseId]);

  // 加载课程详情
  const loadCourseDetails = async (contractInstance, studentAddress, courseId) => {
    try {
      // 检查课程是否存在
      try {
        const course = await contractInstance.courses(courseId);
        
        // 获取教师信息
        let teacherName = "未知";
        try {
          const teacherInfo = await contractInstance.getUserInfo(course.teacher);
          teacherName = teacherInfo[0]; // 教师姓名
        } catch (error) {
          console.warn(`获取教师信息失败: ${error.message}`);
        }
        
        // 检查学生是否已加入课程
        const studentJoined = await contractInstance.isStudentJoined(courseId, studentAddress);
        
        // 检查学生是否已评价课程
        const hasEvaluated = await contractInstance.isStudentEvaluated(courseId, studentAddress);
        
        // 检查当前是否在评价期间内
        const now = Math.floor(Date.now() / 1000);
        const canEvaluate = studentJoined && 
                           now >= Number(course.startTime) && 
                           now <= Number(course.endTime) && 
                           !hasEvaluated;
                           
        // 如果不能评价，重定向回课程详情页
        if (!canEvaluate) {
          setError('您目前无法评价此课程，可能是因为您尚未加入课程、评价时间未到或已结束、或您已经提交过评价。');
          setTimeout(() => {
            router.push(`/studentCourseDetail/${courseId}`);
          }, 3000);
          return;
        }
        
        // 更新课程信息
        setCourse({
          id: Number(courseId),
          name: course.name,
          teacher: course.teacher,
          teacherName: teacherName,
          startTime: new Date(Number(course.startTime) * 1000),
          endTime: new Date(Number(course.endTime) * 1000),
          isActive: course.isActive
        });
      } catch (error) {
        console.error(`获取课程 ${courseId} 失败:`, error);
        setError(`课程 ID ${courseId} 不存在或无法访问`);
        setTimeout(() => {
          router.push('/studentViewCourses');
        }, 3000);
      }
    } catch (err) {
      console.error("加载课程详情失败:", err);
      setError('获取课程详情失败: ' + (err.message || err));
    }
  };

  // 处理图片上传
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    // 限制最多上传5张图片
    if (images.length + files.length > 5) {
      setError('最多只能上传5张图片');
      return;
    }
    
    // 验证文件类型和大小
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      
      if (!isImage) {
        setError('请只上传图片文件');
        return false;
      }
      
      if (!isValidSize) {
        setError('图片大小不能超过5MB');
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    // 为每个文件创建预览URL
    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setImages(prev => [...prev, ...newImages]);
    setError(''); // 清除错误信息
  };
  
  // 删除已上传的图片
  const removeImage = (index) => {
    setImages(prev => {
      const newImages = [...prev];
      // 释放预览URL
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // 上传图片到IPFS或其他存储服务（实际应用中应实现）
  const uploadImages = async () => {
    // 这里应该实现实际的上传逻辑
    // 例如上传到IPFS，并返回哈希值数组
    
    // 模拟上传，返回图片内容的哈希
    // 在实际应用中，应该使用IPFS或其他存储服务
    return Promise.all(images.map(async (image) => {
      // 示例：返回随机哈希，实际应用中替换为真实上传逻辑
      return `image_hash_${Math.random().toString(36).substring(2, 15)}`;
    }));
  };

  // 提交评价
  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setSubmitting(true);
    
    try {
      // 验证输入
      if (!content.trim()) {
        setError('请输入评价内容');
        setSubmitting(false);
        return;
      }
      
      // 上传图片（如果有）
      let imageHashes = [];
      if (images.length > 0) {
        imageHashes = await uploadImages();
      }
      
      // 调用合约提交评价
      // 在实际应用中，应将内容保存到IPFS或其他存储，然后将哈希值提交到区块链
      const tx = await contract.submitEvaluation(
        courseId,
        content, // 在实际应用中应该是内容的哈希值
        imageHashes,
        rating,
        teachingRating,
        contentRating,
        interactionRating,
        isAnonymous
      );
      
      // 等待交易确认
      await tx.wait();
      
      setSuccessMessage('评价提交成功！');
      
      // 3秒后重定向回课程详情页
      setTimeout(() => {
        router.push(`/studentCourseDetail/${courseId}`);
      }, 3000);
    } catch (err) {
      console.error("提交评价失败:", err);
      
      // 特殊处理用户拒绝的情况
      if (err.code === 4001 || (err.message && err.message.includes('user rejected'))) {
        setError('您取消了交易。如需提交评价，请重新提交并在MetaMask中确认。');
      } else {
        setError('提交评价失败: ' + (err.message || err));
      }
      
      setSubmitting(false);
    }
  };
  
  const handleRatingChange = (ratingType, newRating) => {
    switch (ratingType) {
      case 'overall':
        setRating(newRating);
        break;
      case 'teaching':
        setTeachingRating(newRating);
        break;
      case 'content':
        setContentRating(newRating);
        break;
      case 'interaction':
        setInteractionRating(newRating);
        break;
      default:
        break;
    }
  };
  
  // 渲染星级评分组件
  const RatingStars = ({ value, onChange, label }) => (
    <div className={styles.ratingGroup}>
      <span className={styles.ratingLabel}>{label}</span>
      <div className={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className={styles.ratingButton}
            onClick={() => onChange(star)}
          >
            <span 
              className={`${styles.star} ${value >= star ? styles.starFilled : ''}`}
            >
              ★
            </span>
          </button>
        ))}
        <span className={styles.ratingText}>{value}/5</span>
      </div>
    </div>
  );
  
  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const goBack = () => {
    router.push(`/studentCourseDetail/${courseId}`);
  };

  if (loading) {
    return <div className={styles.container}>正在加载课程详情...</div>;
  }

  if (!course) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>评价课程</h1>
          <button onClick={goBack} className={styles.backButton}>返回课程详情</button>
        </header>
        <main className={styles.main}>
          <div className={styles.errorBox}>
            {error || '无法加载课程详情，课程可能不存在'}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>评价课程</h1>
        <button onClick={goBack} className={styles.backButton}>返回课程详情</button>
      </header>

      <main className={styles.main}>
        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className={styles.successBox}>
            {successMessage}
          </div>
        )}
        
        <div className={styles.courseInfoCard}>
          <h2 className={styles.courseTitle}>{course.name}</h2>
          <div className={styles.courseDetails}>
            <div className={styles.courseDetail}>
              <span className={styles.detailLabel}>教师：</span>
              <span className={styles.detailValue}>{course.teacherName}</span>
            </div>
            <div className={styles.courseDetail}>
              <span className={styles.detailLabel}>评价期限：</span>
              <span className={styles.detailValue}>
                {formatDateTime(course.startTime)} 至 {formatDateTime(course.endTime)}
              </span>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmitEvaluation} className={styles.evaluationForm}>
          <div className={styles.ratingsContainer}>
            <h3 className={styles.sectionTitle}>多维度评分</h3>
            
            {/* 总体评分 */}
            <RatingStars 
              label="总体评分" 
              value={rating} 
              onChange={(val) => handleRatingChange('overall', val)} 
            />
            
            {/* 教学质量评分 */}
            <RatingStars 
              label="教学质量" 
              value={teachingRating} 
              onChange={(val) => handleRatingChange('teaching', val)} 
            />
            
            {/* 内容设计评分 */}
            <RatingStars 
              label="内容设计" 
              value={contentRating} 
              onChange={(val) => handleRatingChange('content', val)} 
            />
            
            {/* 师生互动评分 */}
            <RatingStars 
              label="师生互动" 
              value={interactionRating} 
              onChange={(val) => handleRatingChange('interaction', val)} 
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              评价内容
              <textarea
                className={styles.formTextarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请输入您对该课程的评价..."
                rows={5}
                required
              />
            </label>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              上传图片（可选，最多5张）
              <div className={styles.imageUploadContainer}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className={styles.imageInput}
                  id="image-upload"
                />
                <label htmlFor="image-upload" className={styles.imageUploadButton}>
                  选择图片
                </label>
                <span className={styles.imageCount}>
                  已选择 {images.length}/5 张图片
                </span>
              </div>
              
              {images.length > 0 && (
                <div className={styles.imagePreviewContainer}>
                  {images.map((image, index) => (
                    <div key={index} className={styles.imagePreview}>
                      <img 
                        src={image.preview} 
                        alt={`上传图片 ${index + 1}`}
                        className={styles.previewImage}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className={styles.removeImageButton}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </label>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formCheckbox}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              匿名评价（教师将无法看到您的姓名）
            </label>
          </div>
          
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={goBack}
              className={styles.cancelButton}
            >
              取消
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting || !content.trim()}
            >
              {submitting ? '提交中...' : '提交评价'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
} 