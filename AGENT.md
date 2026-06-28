# 患者用药与体征监测系统 — 项目指南

## 项目简介

面向家庭照护场景的 PWA，帮助照护者管理 ≤10 位患者的体征记录、用药方案与提醒。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Vite + Vue 3 + TypeScript |
| 应用形态 | PWA（vite-plugin-pwa） |
| 本地数据库 | Dexie.js（IndexedDB） |
| UI 组件 | Vant 4 |
| 导出加密 | SheetJS + Web Crypto API（AES-GCM） |

## 数据模型

- **Medicine**：药品（name, dose, frequency, reminderTimes, category）
- **DoseRecord**：服药记录（medicineId, scheduledTime, actualTime, status）
- **VitalsRecord**：体征记录（patientId, date, systolic, diastolic, heartRate, weight）

## 核心规则

- **纯前端、零后端**：所有数据存于 IndexedDB，不上传任何云端
- **离线优先**：全部核心功能离线可用
- **用药提醒双保险**：Notification API 推送 + 首页今日看板兜底
- **患者上限 10 人**，超出提示归档
- **体征校验**：心跳 30-220，体重 20-300，超限需二次确认
- **每日仅一条体征主记录**，重复录入提示覆盖或追加备注
- **加密导出**：AES-GCM 加密为 .med.json，导入时做冲突检测

## 重要提示

- 启动页标注"不构成医疗建议，用药请遵医嘱"
- 定期提示用户导出备份（清除浏览器缓存将丢失数据）
- 数据结构变更时递增 `schemaVersion`，通过 `dexie.version().upgrade()` 迁移
- 部署需 HTTPS（推荐 Cloudflare Pages / Vercel）
