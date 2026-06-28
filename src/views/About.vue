<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="page">
    <van-nav-bar title="关于" left-arrow @click-left="router.back()" />

    <div class="content">
      <div class="logo-area">
        <van-icon name="medication" size="48" color="#1989fa" />
        <h2>健康监测助手</h2>
        <p class="version">v1.0.0</p>
      </div>

      <van-cell-group class="info">
        <van-cell title="技术栈" value="Vite + Vue 3 + TypeScript" />
        <van-cell title="本地存储" value="IndexedDB (Dexie.js)" />
        <van-cell title="UI 框架" value="Vant 4" />
        <van-cell title="应用形态" value="PWA（离线可用）" />
      </van-cell-group>

      <div class="disclaimer-box">
        <van-icon name="info-o" size="18" color="#ee0a24" />
        <div class="disclaimer-text">
          <p><strong>医疗免责声明</strong></p>
          <p>本工具仅为辅助记录，不构成医疗建议。用药请严格遵医嘱。</p>
          <p>所有数据仅保存在设备本地，请定期导出备份以防丢失。</p>
          <p>如有身体不适，请及时就医。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
}
.content {
  padding-bottom: 32px;
}
.logo-area {
  text-align: center;
  padding: 32px 16px 24px;
}
.logo-area h2 {
  margin: 12px 0 4px;
  font-size: 20px;
  color: #323233;
}
.version {
  font-size: 13px;
  color: #969799;
}
.info {
  margin: 0 16px 24px;
  border-radius: 8px;
  overflow: hidden;
}
.disclaimer-box {
  display: flex;
  gap: 10px;
  background: #fff;
  margin: 0 16px;
  padding: 16px;
  border-radius: 8px;
  border-left: 3px solid #ee0a24;
}
.disclaimer-text p {
  margin: 4px 0;
  font-size: 13px;
  color: #646566;
  line-height: 1.6;
}
.disclaimer-text p:first-child {
  font-size: 14px;
  color: #323233;
}
</style>
