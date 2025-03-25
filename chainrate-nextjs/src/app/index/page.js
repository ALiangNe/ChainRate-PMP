export default function IndexPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">链评系统 - 首页</h1>
        <p className="text-xl mb-4">
          欢迎使用基于区块链技术的创新型校园课程评价平台
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-3">课程评价</h2>
            <p>对您参与的课程进行匿名评价，提供宝贵反馈</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-3">教师评价</h2>
            <p>对教师的教学效果进行多维度评分</p>
          </div>
        </div>
      </div>
    </main>
  );
} 