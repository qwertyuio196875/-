import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import 'vant/lib/index.css'
import './style.css'
// 全局注册常用组件
import { Button, Cell, CellGroup, Field, Form, NavBar, Icon, Tag, Card, Empty, Tab, Tabs, Radio, RadioGroup, ActionSheet, Popup, DatePicker } from 'vant'

const app = createApp(App)
app.use(router)
// 全局注册以减少各页面重复引入
app.use(Button).use(Cell).use(CellGroup).use(Field).use(Form).use(NavBar).use(Icon).use(Tag).use(Card).use(Empty).use(Tab).use(Tabs).use(Radio).use(RadioGroup).use(ActionSheet).use(Popup).use(DatePicker)
app.mount('#app')
