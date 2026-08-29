// ============================================================
//  默认菜单数据 —— 这是"出厂设置"。
//  日常改菜单推荐用网页版「菜单管理」页面（打开方式见 README），
//  完全不用碰代码；想手动改这个文件也行，改完刷新即可。
//  管理页保存的菜单会覆盖这里的默认菜单（可随时恢复默认）。
// ============================================================

const DEFAULT_MENU = {
  // 分类顺序（按这个顺序展示）
  categories: ['荤菜', '素菜', '汤类', '主食', '水果'],

  // 菜品列表
  dishes: [
    // ---- 荤菜 ----
    { id: 1,  name: '红烧肉',     category: '荤菜', emoji: '🥩', desc: '肥而不腻，下饭神器' },
    { id: 2,  name: '可乐鸡翅',   category: '荤菜', emoji: '🍗', desc: '甜香嫩滑，小朋友最爱' },
    { id: 3,  name: '糖醋排骨',   category: '荤菜', emoji: '🍖', desc: '酸甜开胃' },
    { id: 4,  name: '清蒸鱼',     category: '荤菜', emoji: '🐟', desc: '鲜嫩清淡' },
    { id: 5,  name: '宫保鸡丁',   category: '荤菜', emoji: '🍗', desc: '微辣，花生米酥脆' },
    { id: 6,  name: '回锅肉',     category: '荤菜', emoji: '🥓', desc: '香辣下饭' },
    // ---- 素菜 ----
    { id: 7,  name: '西红柿炒鸡蛋', category: '素菜', emoji: '🍅', desc: '经典家常菜' },
    { id: 8,  name: '清炒西兰花',   category: '素菜', emoji: '🥦', desc: '清爽解腻' },
    { id: 9,  name: '麻婆豆腐',     category: '素菜', emoji: '🌶️', desc: '麻辣鲜香' },
    { id: 10, name: '醋溜土豆丝',   category: '素菜', emoji: '🥔', desc: '酸辣脆爽' },
    { id: 11, name: '蒜蓉青菜',     category: '素菜', emoji: '🥬', desc: '清淡健康' },
    { id: 12, name: '凉拌黄瓜',     category: '素菜', emoji: '🥒', desc: '爽口小凉菜' },
    // ---- 汤类 ----
    { id: 13, name: '紫菜蛋花汤', category: '汤类', emoji: '🍲' },
    { id: 14, name: '冬瓜排骨汤', category: '汤类', emoji: '🍲', desc: '清热解暑' },
    { id: 15, name: '番茄鸡蛋汤', category: '汤类', emoji: '🍅' },
    { id: 16, name: '玉米排骨汤', category: '汤类', emoji: '🌽', desc: '鲜甜滋补' },
    // ---- 主食 ----
    { id: 17, name: '米饭',       category: '主食', emoji: '🍚', desc: '东北大米' },
    { id: 18, name: '馒头',       category: '主食', emoji: '🥖' },
    { id: 19, name: '面条',       category: '主食', emoji: '🍜', desc: '手擀面' },
    { id: 20, name: '饺子',       category: '主食', emoji: '🥟', desc: '猪肉白菜馅' },
    // ---- 水果 ----
    { id: 21, name: '苹果',       category: '水果', emoji: '🍎' },
    { id: 22, name: '西瓜',       category: '水果', emoji: '🍉', desc: '冰镇更佳' },
    { id: 23, name: '香蕉',       category: '水果', emoji: '🍌' },
    { id: 24, name: '葡萄',       category: '水果', emoji: '🍇' },
  ],
};

// 当前生效的菜单：默认用上面的 DEFAULT_MENU；
// 如果「菜单管理」页面保存过菜单，启动时会被替换成保存的那份
let MENU = DEFAULT_MENU;

// 按 id 找菜（下单和订单记录时会用到）
function findDish(id) {
  return MENU.dishes.find(d => d.id === Number(id));
}
