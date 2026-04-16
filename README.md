# 火柴人格斗 3D - Stickman Fighter 3D

## 环境依赖

在运行本项目前，请确保测试/运行环境已安装以下依赖：

| 依赖 | 用途 | 最低版本建议 |
|------|------|--------------|
| **Docker** | 容器化运行前端服务 | 20.10+ |
| **Docker Compose** | 一键启动/停止服务 | 2.0+ |
| **Node.js** | 本地开发时运行前端（`npm run dev`） | 18+ |
| **npm** | 安装前端依赖、启动开发服务器 | 9+ |

- **使用 Docker 运行**：需要已安装 Docker 与 Docker Compose。若环境中未提供，请先安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/) 或对应平台的 Docker 与 Compose 插件。
- **本地开发**：需要已安装 Node.js 与 npm。可从 [Node.js 官网](https://nodejs.org/) 下载安装，或使用 nvm 等版本管理工具。

若当前环境**不支持 Docker Compose 或 npm**，请先联系管理员安装上述依赖，或切换到已具备这些工具的环境后再执行下方运行命令。

## How to Run

```bash
# 克隆项目后，在根目录执行
docker-compose up --build -d

# 访问游戏
open http://localhost:8081

# 停止服务
docker-compose down
```

如需本地开发：

```bash
cd frontend-admin
npm install
npm run dev
# 访问 http://localhost:8081
```

## 测试

项目使用 Vitest 作为测试框架，覆盖核心游戏逻辑的单元测试。

```bash
cd frontend-admin

# 运行所有测试
npm test

# 监听模式（开发时自动重跑）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

测试覆盖范围：

| 测试文件 | 覆盖模块 | 测试内容 |
|---------|---------|---------|
| `constants.test.ts` | 游戏配置 | 伤害/范围递增关系、键位无冲突、防御减伤范围、帧率阈值 |
| `StickmanGenerator.test.ts` | 智能体3D图形生成器 | DNA 生成范围校验、种子确定性、属性平衡约束（≤3.2）、进化交叉/变异 |
| `AIController.test.ts` | AI 智能体控制器 | 难度切换、自适应学习（连败变谨慎/连胜变激进）、状态机转换、防御触发、性格系统 |

## Services

| 服务名称 | 目录 | 端口 | 说明 |
|---------|------|------|------|
| frontend-admin | `./frontend-admin` | 8081 | 3D火柴人格斗游戏前端 |

## 访问方式

本项目为纯前端单机游戏，无需登录账号。打开浏览器访问 `http://localhost:8081` 即可直接游玩。

- 游戏模式：人机对战 (PvE) / 双人对战 (PvP)
- AI 难度：简单 / 普通 / 困难

## 题目内容

使用WEB技术栈开发一个火柴人格斗的游戏，3D版，使用智能体3D图形生成器生成图像资源。

---

## 项目介绍

一款基于 Three.js 的 3D 火柴人格斗网页游戏。使用**智能体3D图形生成器**（Agent-based 3D Graphics Generator）实时生成火柴人模型和战斗特效，AI 对手基于**行为树 + 有限状态机**实现自主决策和自适应学习。

### 技术栈

- **构建工具**: Vite 5
- **语言**: TypeScript
- **3D 引擎**: Three.js
- **3D 模型**: 智能体3D图形生成器（参数化/进化式程序化生成）
- **AI 系统**: 行为树 + 有限状态机 + 自适应学习
- **测试框架**: Vitest
- **部署**: Docker + Nginx

### 核心特性

- 🎮 完整格斗系统：拳击、踢击、必杀技、防御、连击（上限 5 连击，最高 +75% 伤害加成）
- 🧬 智能体3D图形生成器：基于 DNA 基因组的参数化生成、进化式交叉变异、多样化外观（头盔/手套/腰带/眼睛风格）
- 🤖 智能体 AI 系统：行为树决策 + 5 种战斗状态（激进/防御/平衡/撤退/连击追击）+ 自适应学习
- 👥 本地双人对战
- 🎬 程序化骨骼动画系统
- ✨ 粒子打击特效
- 🏟️ 3D 格斗场景（灯光、阴影、雾效）
- 📊 血条、计时器、连击提示、回合制（BO3）
- 📈 实时 FPS 帧率监控面板
- ⚡ **性能优化**：帧率自适应（FPS 低于阈值时自动降低画质：阴影分辨率、像素比、打击粒子数）；资源预加载（启动时预热 WebGL/着色器、预编译粒子特效，减少首帧卡顿）
- 🛡️ 全局错误处理：WebGL 上下文丢失恢复、渲染错误捕获、用户友好错误提示
- 🎨 统一设计系统（Design Tokens）
- 📱 **响应式设计**：适配桌面、平板与手机多种屏幕（1024px / 768px / 480px 断点），HUD、菜单与结果界面随视口缩放与重排，支持安全区域（刘海屏等）
- 🛡️ 防御系统：地面防御可减免 70% 伤害，空中无法防御
- ⚖️ 公平胜负判定：时间耗尽按血量判胜，血量相同为平局；总比分相同时按总伤害决胜
- 🚫 角色碰撞推开，防止模型重叠
- ⏱️ 回合开始 1.5 秒保护期，FIGHT! 显示后才可操作

---

## 技术架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                      main.ts (入口)                      │
│  全局错误处理 · WebGL 检测 · 应用启动                       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    Game.ts (主控制器)                     │
│  游戏生命周期 · 状态管理 · 系统协调 · 进化式生成调度          │
├─────────────┬────────────┬──────────────┬───────────────┤
│   engine/   │   game/    │     ui/      │   config/     │
│  核心引擎层  │  游戏逻辑层 │   UI 表现层   │   配置层      │
└─────────────┴────────────┴──────────────┴───────────────┘
```

### 模块详解

#### 🧬 智能体3D图形生成器 (`StickmanGenerator.ts`)

核心的 Agent-based 3D 图形生成系统，实现了题目要求的"使用智能体3D图形生成器生成图像资源"：

| 能力 | 说明 |
|------|------|
| **DNA 基因组** | 定义火柴人的体型（头部缩放、身体高度、肢体长度/粗细）、外观（眼睛风格、头盔、手套、腰带）、属性（速度/力量/防御倍率） |
| **参数化生成** | 通过 `StickmanDNA` 接口精确控制每个火柴人的外观和属性 |
| **随机化生成** | 基于种子的伪随机数生成器（`createRNG`），确保可复现的多样性 |
| **进化式生成** | `evolveDNA()` 方法实现两个 DNA 的交叉和变异，每次新游戏自动进化出新的火柴人变体 |
| **属性平衡** | 总属性倍率约束（≤3.2），防止生成过于强力的角色 |
| **适应度记录** | `recordFitness()` 记录战斗表现，为未来的进化选择提供依据 |

DNA 基因组结构：
```typescript
interface StickmanDNA {
  // 体型基因
  headScale: number;       // 0.7~1.3
  bodyHeight: number;      // 0.4~0.8
  armLength: number;       // 0.6~1.2
  legLength: number;       // 0.6~1.2
  limbThickness: number;   // 0.6~1.4
  // 外观基因
  eyeStyle: 'normal' | 'angry' | 'cool' | 'robot';
  hasHelmet: boolean;
  hasGloves: boolean;
  hasBelt: boolean;
  // 属性基因
  speedMultiplier: number;   // 影响移动速度
  powerMultiplier: number;   // 影响攻击伤害
  defenseMultiplier: number; // 影响防御减伤
}
```

#### 🤖 AI 智能体控制器 (`AIController.ts`)

基于行为树 + 有限状态机的自主决策系统：

| 组件 | 说明 |
|------|------|
| **行为树** | 分层优先级评估：紧急防御 → 状态策略执行 → 智能攻击选择 |
| **有限状态机** | 5 种战斗状态：`aggressive`（激进）、`defensive`（防御）、`balanced`（平衡）、`retreating`（撤退）、`combo_seeking`（连击追击） |
| **AI 性格** | 每个 AI 实例有独特的性格参数（攻击倾向、谨慎程度、适应能力、连击倾向） |
| **自适应学习** | 记录胜负、命中率、防御成功率，动态调整性格权重 |
| **对手模式识别** | 分析对手最近 20 个动作的频率分布，预测下一步行为 |
| **智能攻击选择** | 根据距离、对手状态、预测结果选择最优攻击类型 |

状态转换逻辑：
```
血量 < 25% → retreating（撤退）
血量 < 40% 且低于对手 → defensive（防御）
对手血量 < 30% → aggressive（激进追击）
连击 ≥ 2 → combo_seeking（连击追击）
默认 → balanced（平衡）
```

#### 🎬 动画系统 (`AnimationSystem.ts`)

程序化骨骼动画，每帧先 `resetPose` 恢复初始姿态，再叠加当前动作偏移：

- 9 种动作状态：idle、walk、jump、punch、kick、special、block、hit、ko
- 所有位移使用模型本地坐标系，`group.rotation.y` 处理朝向

#### 🏟️ 场景管理器 (`SceneManager.ts`)

- 多光源系统：环境光 + 主方向光（阴影） + 红蓝点光 + 背光
- WebGL 上下文丢失/恢复自动处理
- 渲染错误 try-catch 保护
- 自适应分辨率（`devicePixelRatio` 上限 2）

#### ⚔️ 格斗系统 (`CombatSystem.ts`)

- 攻击窗口判定（动画中间帧）
- 距离 + 方向双重检测
- 防重复判定机制
- 粒子特效对象池

#### 📈 性能监控 (`FPSMonitor.ts`)

- 实时 FPS 显示 + 帧时间
- 颜色指示（绿 ≥50fps / 黄 ≥30fps / 红 <30fps）
- 历史 FPS 曲线图
- 暴露 `getFPS()` / `getSmoothedFPS()` 供帧率自适应使用

#### ⚡ 帧率自适应与资源预加载

- **帧率自适应**：每 800ms 采样平滑 FPS；低于 28 时降级画质（high → medium → low），高于 48 时升级。画质等级影响：阴影贴图分辨率（2048 / 1024 / 512）、像素比（≤2 / ≤1.5 / 1）、打击粒子数（15 / 10 / 6）。
- **资源预加载**：启动时先渲染 3 帧预热 WebGL 与着色器，再预创建并释放一次打击粒子特效以编译粒子着色器，最后进入主循环，减轻首帧卡顿。

#### 🛡️ 全局错误处理 (`main.ts`)

- `window.onerror` 捕获运行时错误
- `unhandledrejection` 捕获 Promise 异常
- WebGL 支持检测
- 用户友好的错误遮罩（含刷新按钮）
- WebGL 上下文丢失自动恢复

### 项目结构

```
├── frontend-admin/              # 前端项目
│   ├── src/
│   │   ├── main.ts              # 应用入口 + 全局错误处理
│   │   ├── vite-env.d.ts        # Vite 类型声明
│   │   ├── config/
│   │   │   ├── constants.ts     # 游戏常量与类型定义
│   │   │   └── __tests__/
│   │   │       └── constants.test.ts  # 配置常量单元测试
│   │   ├── engine/
│   │   │   ├── SceneManager.ts      # 3D场景管理器 + WebGL错误恢复
│   │   │   ├── StickmanGenerator.ts # 智能体3D图形生成器（DNA/进化/参数化）
│   │   │   ├── AnimationSystem.ts   # 程序化动画系统
│   │   │   ├── Player.ts            # 玩家角色控制器（DNA属性集成）
│   │   │   ├── CombatSystem.ts      # 格斗碰撞系统
│   │   │   ├── AIController.ts      # AI智能体（行为树+状态机+学习）
│   │   │   ├── InputManager.ts      # 键盘输入管理
│   │   │   └── __tests__/
│   │   │       ├── StickmanGenerator.test.ts  # DNA生成/进化单元测试
│   │   │       └── AIController.test.ts       # AI决策/学习单元测试
│   │   ├── game/
│   │   │   └── Game.ts              # 游戏主控制器 + 进化式生成调度
│   │   ├── ui/
│   │   │   ├── HUD.ts               # 战斗HUD界面
│   │   │   ├── MenuScreen.ts        # 主菜单界面
│   │   │   ├── ResultScreen.ts      # 结果界面
│   │   │   ├── ToastManager.ts      # Toast通知
│   │   │   └── FPSMonitor.ts        # FPS帧率监控面板
│   │   └── styles/
│   │       ├── global.css           # 全局样式与Design Tokens
│   │       ├── hud.css              # HUD样式
│   │       └── menu.css             # 菜单与组件样式
│   ├── public/
│   │   └── favicon.svg
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── Dockerfile
│   └── .dockerignore
├── docker-compose.yml
├── .gitignore
└── README.md
```

### 操作说明

| 操作 | P1 玩家 | P2 玩家 |
|------|---------|---------|
| 左移 | A | ← |
| 右移 | D | → |
| 跳跃 | W | ↑ |
| 防御 | S | ↓ |
| 拳击 | F | , |
| 踢击 | G | . |
| 必杀技 | R | / |

### 游戏规则

- 采用 BO3（三局两胜）回合制，每回合 60 秒
- 任意一方血量归零即判定 K.O.，该回合结束
- 时间耗尽时血量多的一方获胜，血量相同则为平局（双方均不加分）
- 总比分相同时，以总伤害量高者为最终胜者；总伤害也相同则判定平局
- 连击在 800ms 窗口内累计，最高 5 连击（+75% 伤害加成）
- 必杀技冷却 2 秒，普通攻击冷却 0.4 秒
- 防御可减免 70% 伤害，但空中无法防御
- 每次新游戏，智能体3D图形生成器会通过进化式生成创建新的火柴人变体（体型、装饰、属性微调）
- AI 对手会根据战斗经验自适应调整策略（输多变谨慎，赢多变激进）
