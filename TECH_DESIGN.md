# 患者用药与体征监测系统 — 技术设计文档

版本：v1.0 | 2026-06-28

---

## 1. 技术架构

```
┌─────────────────────────────────────────────┐
│              PWA Shell                       │
│  ┌───────────────────────────────────────┐  │
│  │    Vue 3 + TypeScript + Vite          │  │
│  │    ┌──────────┐  ┌────────────────┐   │  │
│  │    │ Vant 4   │  │ Dexie.js       │   │  │
│  │    │ (UI)     │  │ (IndexedDB)    │   │  │
│  │    └──────────┘  └────────────────┘   │  │
│  │    ┌────────────────────────────────┐  │  │
│  │    │ SheetJS + Web Crypto API      │  │  │
│  │    │ (导入导出 / 加密)              │  │  │
│  │    └────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
│  vite-plugin-pwa (manifest + Service Worker) │
└─────────────────────────────────────────────┘
```

**核心选型**：

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | Vite + Vue 3 + TS | 极速 HMR、Composition API、类型安全 |
| 应用形态 | PWA | 免安装分发，standalone 模式 + 离线缓存 |
| 本地 DB | Dexie.js (IndexedDB) | 突破 5MB 限制，支持事务与 Schema Migration |
| UI | Vant 4 | 移动端原生触控体验 |
| 加密导出 | Web Crypto API (AES-GCM) | 文件级加密，零服务器依赖 |

---

## 2. 数据模型

### Medicine（药品）

```typescript
interface Medicine {
  id: string;            // UUID
  name: string;          // 药品名称
  dose: string;          // 单次剂量
  frequency: string;     // 频次
  reminderTimes: string[]; // 提醒时间 ["08:00", "20:00"]
  category: string;      // 分类ID
  notes?: string;
  createdAt: number;
  schemaVersion: number;
}
```

### DoseRecord（服药记录）

```typescript
interface DoseRecord {
  id: string;
  medicineId: string;
  scheduledTime: number; // 计划服药时间
  actualTime?: number;   // 实际服药时间
  status: 'taken' | 'skipped' | 'delayed';
  note?: string;
}
```

### VitalsRecord（体征记录，新增）

```typescript
interface VitalsRecord {
  id: string;
  patientId: string;
  date: string;          // "YYYY-MM-DD"
  systolic: number;      // 收缩压
  diastolic: number;     // 舒张压
  heartRate: number;     // 心跳
  weight: number;        // 体重
  notes?: string;
}
```

---

## 3. 核心流程

### 3.1 用药提醒（双保险）

```
Notification API 推送 ─── 前台轮询检查 ─── 触发系统通知
                          后台依赖浏览器策略（不可靠）

首页今日看板兜底 ─── 用户打开应用 → 轮询 DB → 高亮逾期药品
```

- 前台：`setInterval` 每分钟轮询，匹配 `reminderTimes` 后弹 Toast + 通知
- 后台：依赖 Service Worker 的 `push` 事件（需 HTTPS + 用户授权）
- 兜底：首页常驻"今日待服"列表，确保不漏

### 3.2 数据导出

```
序列化 IndexedDB → 用户输入密码 → PBKDF2 派生密钥
→ AES-GCM 加密 → 生成 .med.json → 触发下载
```

导入逆向：读取 → AES-GCM 解密 → schemaVersion 校验 → 冲突检测（覆盖/跳过/合并）→ 写入 DB

---

## 4. PWA 配置

- **manifest.json**：display: standalone，不显示浏览器地址栏
- **Service Worker**：Cache First 策略缓存所有静态资源，核心 API 数据走 Network First
- **部署要求**：强制 HTTPS（推荐 Cloudflare Pages / Vercel 免费托管）

---

## 5. 离线策略

| 场景 | 行为 |
|---|---|
| 完全离线 | 所有核心功能（CRUD、打卡、查看历史）正常运行 |
| 首次加载 | Service Worker 预缓存全部资源 |
| 数据备份 | 导出 .med.json 到本地，不清除浏览器缓存即可恢复 |
| 缓存清理 | 设置页提示"定期导出备份，清除缓存将丢失数据" |

---

## 6. 开发计划

| 阶段 | 内容 | 时间 |
|---|---|---|
| 一 | Vite + Vue3 初始化、Dexie.js 数据库、药品 CRUD | 第 1-3 天 |
| 二 | 服药记录时间轴、Notification 提醒、今日看板 | 第 4-8 天 |
| 三 | Web Crypto API 加密导出/导入、冲突处理 UI | 第 9-11 天 |
| 四 | PWA manifest + SW 配置、真机测试（iOS/Android） | 第 12-14 天 |

---

## 7. 注意事项

- **医疗免责**：启动页标注"不构成医疗建议，用药请遵医嘱"
- **数据备份提醒**：因数据完全本地化，需定期提示用户导出备份
- **版本迁移**：每次修改数据结构时递增 `schemaVersion`，通过 `dexie.version().upgrade()` 编写迁移逻辑
- **患者上限**：≤10 人，超出提示归档
- **体征范围校验**：心跳 30-220，体重 20-300，超限需二次确认
