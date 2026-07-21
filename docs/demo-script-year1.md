# Demo Script — Year 1 "Part-Whole Model" (upload path)

教材：`Year-1-Addition-and-subtraction-Lesson-1.pdf`（Third Space Learning, Year 1 加减法第 1 课）。

这份教材非常适合演示，不建议替换：

- **自带诊断素材**：第 27 页就是一个"错误的 part-whole model"（whole 写成 2，parts 是 2 和 4），天然构成"暴露误解 → 纠正 → 复问验证"的完整闭环；
- **展示年龄仿真**：5–6 岁的学生会用短句、数手指、说 "Um, I don't know"，和童声 TTS 相互印证，这是本产品最直观的差异点；
- **零门槛**：任何评委都懂 2+4=6，不需要物理背景就能看出学生"从错到对"。

对照组：牛顿第三定律 demo（一键路径）仍然保留，作为不依赖上传解析的保底演示。

---

## 0. 演示前准备（一次性，约 2 分钟）

1. `.env.local` 确认包含 `OPENAI_API_KEY` 和 `USE_OPENAI_DEMO=true`。
2. `npm run dev`，打开 `http://localhost:3000/prepare`。
3. 把课件 PDF 在另一个窗口打开（稍后 Share screen 用）。
4. 提醒：**麦克风教学必须说英文**（Realtime 转写固定 `language: "en"`）。每句话说完停顿约 1 秒等转写；学生说话期间不要开口，此时的语音会被丢弃。任何一步转写不理想，用左下角 "Typed fallback" 输入框把台词打进去，效果完全一致。

## 1. Prepare 阶段（目标 40 秒内完成）

1. 拖入 PDF → **Analyze lesson**（约 20–40 秒）。预期产出：标题 "Using Part-Whole Models"、gradeBand K-2、5 个概念（counting、addition as combining、parts and wholes、part-whole model、number partitions）、5 个误解（其中 `whole-is-one-part` 是本次演示主线）。
2. **Generate classroom** → 进入 Meet 页。预期看到 5 个 6 岁上下的学生卡，原型各异（每次生成名字不同，认准人设）：
   - 一个大胆抢答型（下文记作 **T**，如 "Tessa"）
   - 一个安静学困型（记作 **N**，如 "Noah"——演示主角）
   - 一个调皮走神型（如 "Jaden"，全程可能插科打诨，是真实感彩蛋）
   - 一个认真型 + 一个较强观察型
3. 口播要点：卡片只显示可见人设，隐藏的认知状态（掌握度/误解）永不外露。

## 2. Live 阶段开场（15 秒）

1. 点 **Enable mic**（说英文）；可选 **Camera on**。
2. 点 **Share screen**，选中 PDF 窗口。口播关键句：
   > "The screen preview is local-only. Students don't literally see my slides — they react to what I *say*, which is exactly how this rehearsal tool works."

## 3. 教学剧本（5 幕，全部实测验证过）

> 每幕给出：台词（照读）→ 预期课堂反应。学生名字以实际生成为准。

**T1 — Starter（翻到 PDF 第 2 页）**

> "Good morning everyone! Simon has three counters in one hand and two counters in the other hand. How many counters does he have altogether?"

预期：大胆型 T 举手抢答（实测："Five counters altogether!"）。短句、无术语——这是 6 岁孩子的正常水平，数数是他们已会的技能。

**T2 — 诊断（翻到 PDF 第 27 页的错误模型，点名学困生）**

> "Now look at this part-whole model. The whole circle says two, and the parts say two and four. **N**, is this model right?"

预期：N 露怯（实测："Um, I don't know."）。这就是"没教过的内容答不上来"——不要救场，直接进下一幕。

**T3 — 抛给全班**

> "That's okay, **N**. Who else wants to try? Look again: the whole says two, the parts say two and four. Is that right? What do you think?"

预期：T 举手指出问题（实测："No, because two and four make six. The whole should be six."）或说出 whole/part 混淆的错误判断——两种都推进剧情。

**T4 — 纠正讲解（演示的核心投入，讲慢一点，最后点一下 N）**

> "Let me show you a trick. The whole is ALL the counters together — it lives in the big circle at the top. The parts are the smaller groups. If two is a part and four is a part, we put them together: two and four make six. So the whole must be six, not two. **N**, the whole is always all the parts joined together, okay?"

预期：无人发言（"Students are processing the explanation"），但服务端提交 state patch（mastery↑、misconception↓）。口播要点：**这一刻学生的认知状态真的变了，马上验证。**

> 注：结尾点名 N 很重要——它让 patch 更大概率落在学困生身上，X-Ray 里 N 的 learning journey 才完整。

**T5 — 复问验证（magic moment）**

> "**N**, let's look one more time. If four is a part and five is a part and nine is the whole, can you tell me which number is the whole?"

预期：刚才说 "I don't know" 的 N 这次能答（实测："Um, nine."——还是那个怯生生的孩子，但答对了）。口播关键句：

> "Same shy kid, same voice — but the answer changed *because of the explanation I just gave*. That state change is recorded with evidence."

**可选加时 T6 —— 开放题（PDF 第 24 页）**

> "Four is the whole. What could the parts be? How many different ways can you think of?"

预期：较强观察型学生给出 3 和 1 / 2 和 2 等组合，调皮型可能插一句跑题的话——顺势口播"低投入度学生的行为也是模拟的一部分"。

## 4. End & X-Ray（40 秒）

点 **End & view X-Ray**：

1. Overview：几人达到 partial/strong、记录了几次 evidence-linked 状态变化；
2. 点开 **N 的卡片**：journey 从 confused → 变化点（引用 T4 讲解原文）→ 复问答对；
3. 点任意 feedback 的时间戳 → evidence drawer 显示真实转写上下文（强调"引用的都是真事件，不是模型编的"）；
4. 收尾口播：音视频不录制、会话文本临时处理、模拟是排练假设而非对真实学生的预测。

## 5. 三分钟视频节奏参考

| 时间 | 内容 |
|---|---|
| 0:00–0:20 | 痛点 + 上传 PDF、生成班级（加速剪辑） |
| 0:20–0:35 | 开麦 + Share screen，口播"学生听的是我的话" |
| 0:35–1:50 | T1→T5 完整魔法闭环（T5 是情绪高点，保留 N 的两次原声） |
| 1:50–2:30 | X-Ray：N 的 journey + evidence drawer |
| 2:30–3:00 | 架构一页话（单 orchestrator + 确定性 reducer + 事件证据链）+ 隐私声明 |

## 6. 已知注意事项

- 分析大 PDF 约需 20–40 秒（超时上限 60 秒），演示时用加速剪辑或提前完成 Prepare 阶段；
- 学生名字每次生成不同，台词里的点名以现场名单为准；先在 Meet 页认好"学困生"是谁；
- 若某一幕学生反应不理想（生成模型有随机性），用 Typed fallback 重发同一句即可，事件序列不会乱。
