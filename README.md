# 卡塞尔学院手机 · 论坛+通讯悬浮组件

《龙族》世界观 · SillyTavern(酒馆) 酒馆助手前端组件。

一个悬浮在页面右下角的 64px 龙徽圆钮，点击后以动画展开成 320×640 的「学院手机」，内含：

| 应用 | 功能 |
|---|---|
| 🗨 论坛 | 卡塞尔 BBS：版块筛选 / 热帖 / 帖子详情 / 点赞 / 本地回帖 |
| ✉ 私信 | 与 芬格尔 / 楚子航 / 诺诺 / 恺撒 / EVA / 昂热校长 会话；发送 = 填入酒馆输入框衔接 RP |
| 🪪 学籍卡 | persona 姓名 + 静态档案；检测到 MVU 变量时联动 时间/地点/任务/好感度 |
| 📢 校园资讯 | 学院公告 / 新闻，点击展开正文 |
| ⚙ 设置 | API 模式 / 第二 API 参数 / 楼层正文提取规则 / 世界书条目勾选 / 调试日志 |

## 特性

- **全页悬浮**：以酒馆助手「脚本」加载，UI 注入酒馆主页面，按钮固定视口右下角，切楼层不消失
- **真机外观**：展开先进锁屏（大时钟壁纸，点按解锁）→ 手机桌面（时钟部件 + App 图标网格 + 底部 Home 条），点图标全屏打开应用；深色金属边框 + 前摄挖孔装饰
- **拖拽**：Pointer Events 统一鼠标/触摸；移动 >4px 判定拖拽，否则点击展开；位置持久化 localStorage；窗口 resize 自动钳制回视口
- **面板可拖动**：展开后按住状态栏可拖动手机窗口；`Esc` 逐级返回（应用→桌面→收起）；底部 Home 条随时回桌面
- **壁纸自定义**：内置 5 套渐变壁纸（青铜暗纹/龙炎/夜幕/冰海/黄昏），或填入任意图床图片直链，自动压暗保证图标可读
- **剧情消息双向同步**：
  - AI 在回复中输出 `<手机消息|角色名>内容</手机消息>` / `<群消息|群名|发言人>内容</群消息>`，手机私信自动接收（常驻注入会自动教 AI 该格式）
  - 在手机里回私信/群聊 → 注入最新楼层，AI 下一轮对话可见；可选自动触发生成
  - 「一键安装显示过滤正则」让标签在酒馆界面隐藏、提示词中保留
- **多 API**：主 API（酒馆本体）生成剧情；第二 API 依据「楼层正文提取 + 世界书条目」生成论坛/私信/资讯内容
  - `generateRaw + custom_api(source:'openai') + ordered_prompts:['user_input'] + max_chat_history:0`
  - 超时 (默认 30000ms) + 重试 (默认 3 次) + Promise.race
  - 失败降级：第二 API → 主 API（可选）→ 保留现有内容，绝不影响正常聊天
  - **生成范围**：论坛/私信/资讯可分别开关；**论坛全量替换**或追加
  - **回帖实时回复**：论坛里回帖后由第二 API 生成其他用户的回应
  - **生成提示词可编辑**：`{{story}}` / `{{worldbook}}` 占位符，恢复默认、试运行
- **Token 防爆**：提取楼层数、单楼提取字符上限、世界书注入上限均可调，显示提取量/token 估算
- **MVU 联动**：`waitGlobalInitialized('Mvu')` → `Mvu.getMvuData`，手机状态栏显示游戏内时间/地点，私信好感度角标
- **零运行时依赖**：Vue 与全部图标（内联 SVG）已打包，无任何 CDN 依赖，国内网络无障碍
- **外观自定义**：4 套主题色（青铜金/龙炎红/冰海蓝/黄昏紫）+ 壁纸 + 自定义 CSS 编辑器（实时生效）
- **减少动效**：支持 `prefers-reduced-motion` 与宿主页 `st-reduce-motion` 类

## 安装（酒馆）

1. 确保已安装 [酒馆助手 (JS-Slash-Runner)](https://github.com/n0vi028/JS-Slash-Runner) 与 MVU 变量框架（可选）
2. 酒馆助手 → 脚本库 → 新建脚本，粘贴以下内容并保存启用：

> **注意**：酒馆助手「脚本」的内容是**纯 JavaScript**（会被包进 `<script type="module">`
> 在隐藏 iframe 中执行，TavernHelper 函数全局可用、可同源操作酒馆主页面）。
> 不要粘贴 `<script src>` 这种 HTML 标签。

```js
import('https://cdn.jsdelivr.net/gh/anaka123987-cmd/kassel-phone@main/dist/kassel-phone.js');
```

3. 右下角出现金色龙徽悬浮按钮即成功；首次使用到 设置 → API 配置第二 API。
4. 停用/删除脚本即卸载，注入的界面会随脚本关闭自动清理（组件监听了 `pagehide`）。

> 更新：jsDelivr 对 `@main` 有约 12 小时缓存，急用可固定版本号 `@v1.5.0` 或
> 去 [purge 工具](https://www.jsdelivr.com/tools/purge) 清缓存。

## 发布到 GitHub（维护者）

```bash
cd kassel-phone
git add -A && git commit -m "..."
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

推送后即可用 jsDelivr 引用（无需开通 Pages）：

```
https://cdn.jsdelivr.net/gh/<你的用户名>/<仓库名>@main/dist/kassel-phone.js
```

也可以在仓库 Settings → Pages 选择 `main / (root)`，然后用：

```
https://<你的用户名>.github.io/<仓库名>/dist/kassel-phone.js
```

> jsDelivr 对文件有缓存：更新后如未生效，可加版本号 `@v1.0.0`（打 tag）或去
> https://www.jsdelivr.com/tools/purge 手动清除缓存。

## 本地开发

```bash
npm install
npm run dev      # 开发预览 (演示模式, 无需酒馆)
npm run build    # 产出 dist/kassel-phone.js (单文件 IIFE, ~55KB gzip)
```

浏览器直接打开 `index.html`（或用任意静态服务器托管本目录）即可无酒馆预览，
组件检测不到酒馆助手 API 时自动进入「演示模式」：
设置 → API → 切到「多 API」→ 立即刷新手机内容，可体验 mock 生成链路。

## 多 API 使用说明

1. 设置 → API → 选择「多 API」，填入第二 API 的 URL / Key / 模型名（OpenAI 兼容接口）
2. 设置 → 提取 → 配置楼层正文提取规则：
   - **提取标签**（默认 `content`）：仅对 AI 楼层生效，提取 `<content>...</content>` 内正文；无标签时取整楼
   - **附加提取标签**（默认 `sum`）：额外提取 `<sum>...</sum>` 作为摘要
   - **剔除 HTML 注释 / 排除块头 / 排除块尾**：对每个提取块应用
   - **包含用户消息**：开启后用户楼层发送全部消息文本（不做标签提取）
   - **提取楼层数**：最近 N 楼（默认 6）
3. 设置 → 世界书 → 「加载本卡绑定的世界书」→ 勾选要注入的条目
4. 当 AI 生成新回复后（或论坛页点刷新按钮 / 设置页点「立即刷新」），组件自动：
   提取正文 → 注入世界书 → 调用第二 API → 解析 `<kassel_phone>` JSON → 更新论坛/私信/资讯并缓存

## 目录结构

```
kassel-phone/
├─ dist/kassel-phone.js      构建产物 (CDN 引用这个)
├─ index.html                本地演示页 (无酒馆环境自动 mock)
├─ src/
│  ├─ main.js                入口: 注入宿主 document + 挂载
│  ├─ App.vue                根组件 + 1s 轮询
│  ├─ env.js                 环境探测 (酒馆脚本 iframe / demo)
│  ├─ store.js               全局 reactive 状态
│  ├─ styles/theme.css       卡塞尔主题 (全部样式, ?inline 注入)
│  ├─ data/builtin.js        静态内置内容 (兜底)
│  ├─ components/            FloatingButton / PhonePanel / SettingsView
│  ├─ apps/                  Forum / Message / Profile / News
│  └─ services/              tavern / mvu / extractor / secondApi / pipeline / storage
└─ 酒馆脚本-安装.txt           脚本库安装说明 (纯 JS import 一行)
```
