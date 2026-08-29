// ============================================================
//  菜单存储层 —— 「菜单管理」页面保存的菜单放哪里
//
//  两种模式（和订单 Store 一致）：
//  1. 本机模式（默认）：菜单存在当前浏览器里，仅这台设备生效
//  2. 云端模式：菜单存到 Supabase 的 menu 表，全家人同步
//     （需要先按 README 第 4 步配好 Supabase，并创建 menu 表）
//
//  菜单数据结构：{ categories: ['荤菜',...], dishes: [{id,name,category,emoji,desc,img}] }
// ============================================================

const MenuStore = {
  isCloud: false,   // 是否云端模式
  sb: null,         // 复用 Store 的 Supabase 客户端
  key: 'family_menu',

  // 初始化（要在 Store.init() 之后调用）
  async init() {
    // 注意：Store 是 const 声明的，不在 window 上，要用 typeof 判断
    this.isCloud = !!(typeof Store !== 'undefined' && Store.isCloud && Store.sb);
    this.sb = this.isCloud ? Store.sb : null;
  },

  // 读取保存的菜单；没有保存过返回 null
  async getMenu() {
    if (this.isCloud && this.sb) {
      try {
        const { data, error } = await this.sb.from('menu').select('content').limit(1).maybeSingle();
        if (error) { console.warn('读取云端菜单失败：', error.message); return null; }
        return data && data.content ? data.content : null;
      } catch (e) {
        console.warn('读取云端菜单出错：', e);
        return null;
      }
    }
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  // 保存菜单
  async saveMenu(menu) {
    if (this.isCloud && this.sb) {
      try {
        const { data, error } = await this.sb.from('menu').select('id').limit(1);
        if (error) throw error;
        if (data && data.length) {
          const { error: e2 } = await this.sb.from('menu').update({ content: menu }).eq('id', data[0].id);
          if (e2) throw e2;
        } else {
          const { error: e3 } = await this.sb.from('menu').insert({ content: menu });
          if (e3) throw e3;
        }
        return true;
      } catch (e) {
        console.error('保存云端菜单失败：', e.message || e);
        return false;
      }
    }
    localStorage.setItem(this.key, JSON.stringify(menu));
    return true;
  },

  // 恢复默认菜单（删掉保存的菜单）
  async resetMenu() {
    if (this.isCloud && this.sb) {
      try {
        const { error } = await this.sb.from('menu').delete().gt('id', 0);
        if (error) console.error('清空云端菜单失败：', error.message);
      } catch (e) { console.error(e); }
      return;
    }
    localStorage.removeItem(this.key);
  },
};
