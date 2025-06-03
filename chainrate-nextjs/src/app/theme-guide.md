# ChainRate-PMP 暗色模式样式指南

为了确保项目在暗色模式下的一致性和美观，请在组件开发中参考以下指南。

## 基本元素

### 容器和卡片
```jsx
// 容器
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  内容
</div>

// 卡片
<div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
  卡片内容
</div>
```

### 按钮
```jsx
// 主要按钮
<button className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded">
  按钮文本
</button>

// 次要按钮
<button className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded">
  按钮文本
</button>
```

### 表单元素
```jsx
// 输入框
<input
  type="text"
  className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2"
/>

// 选择框
<select className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2">
  <option>选项1</option>
  <option>选项2</option>
</select>
```

### 表格
```jsx
<table className="w-full border-collapse bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  <thead>
    <tr className="bg-gray-100 dark:bg-gray-700">
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">标题1</th>
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">标题2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">内容1</td>
      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">内容2</td>
    </tr>
  </tbody>
</table>
```

## 导航和菜单

### 导航栏
```jsx
<nav className="bg-white dark:bg-gray-900 shadow-md">
  <div className="container mx-auto px-4 py-3">
    <div className="flex justify-between items-center">
      <div className="text-lg font-bold text-gray-800 dark:text-white">链评系统</div>
      <div>
        <a href="#" className="mx-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400">链接1</a>
        <a href="#" className="mx-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400">链接2</a>
      </div>
    </div>
  </div>
</nav>
```

### 侧边栏
```jsx
<aside className="w-64 bg-gray-100 dark:bg-gray-800 h-screen">
  <div className="p-4">
    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">菜单</h2>
    <ul className="mt-4">
      <li className="mb-2">
        <a href="#" className="block px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
          菜单项1
        </a>
      </li>
      <li className="mb-2">
        <a href="#" className="block px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
          菜单项2
        </a>
      </li>
    </ul>
  </div>
</aside>
```

## 应用示例

### 课程卡片
```jsx
<div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
  <div className="px-6 py-4">
    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Web开发基础</h3>
    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">讲师: 张三</p>
    <div className="mt-4 flex items-center">
      <div className="flex items-center">
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="text-gray-700 dark:text-gray-300 ml-1">4.5 (24条评价)</span>
      </div>
    </div>
  </div>
  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
    <button className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded w-full">
      查看详情
    </button>
  </div>
</div>
```

### 评价表单
```jsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">提交评价</h3>
  <div className="mb-4">
    <label className="block text-gray-700 dark:text-gray-300 mb-2">评分</label>
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} className="text-gray-300 dark:text-gray-500 hover:text-yellow-500 dark:hover:text-yellow-400">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  </div>
  <div className="mb-4">
    <label className="block text-gray-700 dark:text-gray-300 mb-2">评价内容</label>
    <textarea className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2"></textarea>
  </div>
  <div className="flex items-center mb-4">
    <input type="checkbox" className="mr-2" />
    <span className="text-gray-700 dark:text-gray-300">匿名评价</span>
  </div>
  <button className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 rounded">
    提交评价
  </button>
</div>
```

## 注意事项

1. 始终为元素提供亮色和暗色两种状态的样式
2. 暗色模式下，背景色通常使用灰色系(gray-800, gray-900)而不是纯黑色
3. 文本颜色应适当降低对比度，避免刺眼
4. 边框和分割线应使用较低饱和度的颜色
5. 保持颜色一致性，尤其是主色调和强调色

---

按照上述指南修改您的组件，可以确保整个应用在暗色模式切换时保持一致的视觉效果。 