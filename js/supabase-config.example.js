// ============================================================
//  云端模式配置（可选）
//
//  使用方法（详细步骤见 README.md 第 4 步）：
//  1. 把本文件复制一份，改名为 supabase-config.js（放在 js 目录下）
//  2. 在 supabase.supabase.com 注册一个免费项目
//  3. 把项目地址（Project URL）和匿名密钥（anon public key）
//     填到下面
//  4. 在 index.html 里取消云库 script 标签的注释
//  5. 重新部署，全家人就能共享订单了
// ============================================================

window.SUPABASE_CONFIG = {
  url: 'https://你的项目地址.supabase.co',
  key: '你的匿名密钥（anon public key）',
};
