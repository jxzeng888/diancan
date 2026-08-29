// ============================================================
//  数据存储层
//
//  两种模式：
//  1. 本机模式（默认）：订单存在当前浏览器里，自己点自己看
//  2. 云端模式：订单存到云端数据库（Supabase 免费版），
//     全家人在不同手机上打开同一个链接，都能看到同一份订单
//
//  切换方式见 README.md 第 4 步。
//
//  订单结构：
//  {
//    oid:   '唯一编号',        // 用于单条删除
//    name:  '顾客编号，如 顾客1', // 按当天下单顺序自动编号
//    items: [{ id, name, qty, remark, img }],
//    remark:'整单备注',
//    date:  '2025-08-29',      // 下单日期，用于按天查询
//    time:  '12:30',           // 下单时间
//  }
// ============================================================

const Store = {
  isCloud: false,   // 当前是否云端模式
  sb: null,         // Supabase 客户端

  // 初始化：检查是否满足云端模式的条件
  async init() {
    if (
      window.supabase &&
      window.SUPABASE_CONFIG &&
      window.SUPABASE_CONFIG.url &&
      window.SUPABASE_CONFIG.key
    ) {
      try {
        this.sb = window.supabase.createClient(
          window.SUPABASE_CONFIG.url,
          window.SUPABASE_CONFIG.key
        );
        this.isCloud = true;
        console.log('☁️ 已连接云端数据库，全家人共享订单');
      } catch (e) {
        console.warn('云端连接失败，退回本机模式：', e);
      }
    }
  },

  // 读取所有订单（返回数组，按时间从早到晚）
  async getOrders() {
    if (this.isCloud) {
      const { data, error } = await this.sb
        .from('orders')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) { console.error('读取订单失败：', error); return []; }
      return data || [];
    }
    try {
      return JSON.parse(localStorage.getItem('family_orders') || '[]');
    } catch {
      return [];
    }
  },

  // 新增一条订单
  async addOrder(order) {
    if (this.isCloud) {
      const { error } = await this.sb.from('orders').insert(order);
      if (error) console.error('保存订单失败：', error);
      return;
    }
    const orders = JSON.parse(localStorage.getItem('family_orders') || '[]');
    orders.push(order);
    localStorage.setItem('family_orders', JSON.stringify(orders));
  },

  // 删除某一条订单（按唯一编号 oid）
  async deleteOrder(oid) {
    if (!oid) return;
    if (this.isCloud) {
      const { error } = await this.sb.from('orders').delete().eq('oid', oid);
      if (error) console.error('删除订单失败：', error);
      return;
    }
    const orders = JSON.parse(localStorage.getItem('family_orders') || '[]');
    localStorage.setItem(
      'family_orders',
      JSON.stringify(orders.filter(o => o.oid !== oid))
    );
  },

  // 清空某一天的所有订单
  async clearByDate(date) {
    if (!date) return;
    if (this.isCloud) {
      const { error } = await this.sb.from('orders').delete().eq('date', date);
      if (error) console.error('清空失败：', error);
      return;
    }
    const orders = JSON.parse(localStorage.getItem('family_orders') || '[]');
    localStorage.setItem(
      'family_orders',
      JSON.stringify(orders.filter(o => (o.date || '') !== date))
    );
  },
};
