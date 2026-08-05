# 单词英雄 Word Hero MiniApp

单词英雄是一款面向英语基础薄弱学生的微信小程序。它不是简单的“刷单词”，而是把教材单元、生词语境、标准发音、拼读规律、词形变化、抗遗忘复习和家长报告放在同一个学习闭环里。

当前版本重点服务一种真实场景：学生英语成绩不理想，背过的词容易忘，换个形式不认识，看见单词不会读，家长也很难判断孩子到底学到了哪里。

## 产品定位

单词英雄的核心目标是：

- 让学生先听标准发音，再建立词义连接。
- 让教材单元词汇直接进入闯关，不再靠家长手工整理。
- 让每个生词回到课文原句中，通过填空看见真实语境。
- 让孩子背一个词时，顺手看到它的考试变形和拼读同族词。
- 让家长通过学习报告看见进度、薄弱词、复习任务和趋势。

一句话：背一个词，不只记一个词，而是顺手打通“读音、词义、语境、变形、复习”。

## 当前核心功能

### 1. 学生词库

- 支持为每个学生建立多个专属词库。
- 每个学生最多 70 个词库。
- 支持手动输入、图片识别、教材年级单元、错题本导入。
- 支持英文单词和英文短语。
- 支持自动生成中文释义、音标和课文例句。

### 2. 教材单元词库

- 内置教材版本和单元词汇。
- 支持按年级、教材、单元选择词库。
- 支持教材原文首次出现句子的语境展示。
- 支持“课文原句填空”，把目标词在句子中挖空。

### 3. 背词闯关

学习页包含四种模式：

- 听音辨义：先听发音，再选中文意思。
- 闪卡：看英文，翻中文，快速建立第一印象。
- 四选一：根据中文选择正确英文。
- 拼写：根据中文意思输入英文。

闯关中支持：

- 标准英文发音。
- 答对反馈音效。
- 个性化鼓励语音。
- 连续答对 5 个触发欢呼和鲜花动效。
- 错词立即回炉。
- 按 1/2/4/7/15 天安排抗遗忘复习。

### 4. 考试变身

针对动词和形容词，学习页会给出轻量提示，例如：

- study -> studies / studied / studying
- stop -> stops / stopped / stopping
- happy -> happier / happiest
- be similar to -> is similar to / was similar to / are similar to
- can / be able to 的区别
- borrow / lend / keep 的区别

这个功能不是完整语法课，而是在孩子遇到单词时，提醒它在考试里可能换成什么样子。

### 5. 一串会读

针对拼读基础弱的学生，学习页会显示拼读同族词。例如：

- hard：突出 ar，并展示 hard / card / art / farm / star
- organize：突出 i-e 结构中的 i，并展示 organize / bike / like / time / five
- teacher：突出 ea，并展示 teacher / read / clean / speak / team

每个同族词都可以点击播放读音，帮助学生从“记一个”迁移到“会一串”。

### 6. 学习报告

报告页支持：

- 学习曲线。
- 活跃天数。
- 今日练习次数和答对次数。
- 到期复习任务。
- 绿格：连续 3 天认出的词。
- 蓝格：拼写过关的词。
- 已背过的词和上传时间。
- 重点复习词。
- 家长端绑定码查看报告。

### 7. 学习小队

支持创建学习小队、加入小队、单词 PK、排行榜和共享词库。

### 8. 中英结合故事

支持把已学单词生成中英结合小故事，帮助学生在阅读中再次遇见生词。

## 技术架构

```text
微信小程序前端
  pages/               页面
  components/          通用组件
  utils/               本地工具与规则
  constants/           教材词库与内置数据

微信云开发 CloudBase
  cloudfunctions/      云函数
  云数据库集合          users / wordLists / studyRecords / stories 等
```

关键数据流：

```text
创建学生资料 -> users
导入词库 -> saveWordList -> wordLists
背词答题 -> updateWordProgress -> wordLists + studyRecords
学习报告 -> getStudyReport / getParentReport
教材词库 -> constants/textbookUnits.js
拼读同族 -> utils/phonicsFamilies.js
考试变身 -> utils/wordForms.js
```

## 主要目录

```text
assets/audio/                         音效资源
assets/images/                        封面图、小喇叭等图片资源
components/progress-card/             学习进度卡片
components/word-card/                 单词卡片
constants/textbookUnits.js            教材单元词库
pages/study/                          背词闯关页
pages/import/                         创建词库页
pages/report/                         学生学习报告
pages/parent-login/                   家长绑定入口
pages/parent-report/                  家长报告页
pages/community/                      学习小队
utils/audio.js                        发音、音效、鼓励语音
utils/phonicsFamilies.js              拼读同族规则
utils/wordForms.js                    考试变身规则
```

## 云函数

当前项目包含以下云函数：

```text
createStudyGroup
deleteWordList
generateStory
getCurrentWordList
getOpenId
getParentReport
getStudyGroup
getStudyReport
getUserProfile
getWechatShareSignature
getWrongWords
joinStudyGroup
listWordLists
ocrImageWords
saveUserProfile
saveWordList
shareWordListToGroup
submitPKScore
updateWordExamples
updateWordProgress
```

涉及云函数改动后，需要在微信开发者工具中重新上传对应云函数。常见需要重新上传的函数：

- saveWordList：词库保存、教材字段、词库数量上限。
- listWordLists：词库列表和数量统计。
- updateWordProgress：答题记录、抗遗忘复习、学习曲线数据。
- getStudyReport：学生报告和学习曲线。
- getParentReport：家长报告。
- ocrImageWords：图片识别导入。

如果只是改前端页面、样式、图片、拼读规则或考试变身规则，一般只需要重新上传小程序版本，不需要上传云函数。

## 本地打开与上传

1. 用微信开发者工具打开本项目目录。
2. 确认 `project.config.json` 中的 AppID 是当前小程序 AppID。
3. 确认已开通微信云开发。
4. 确认云环境选择正确。
5. 如修改了云函数，右键对应云函数目录，选择上传并部署。
6. 点击上传小程序版本。
7. 到微信公众平台后台设置为体验版，添加体验成员。

常见云环境上传错误：

```text
请在编辑器云函数根目录 cloudfunctionRoot 选择一个云环境
```

处理方法：

- 确认是从小程序项目根目录打开，而不是单独打开 cloudfunctions 目录。
- 确认 `project.config.json` 中存在 `cloudfunctionRoot` 配置。
- 在微信开发者工具顶部云开发区域选择正确云环境。
- 再右键云函数目录上传。

## 家长使用说明书

家长版互动说明书已放在：

```text
docs/parent-user-guide.html
```

可以直接用浏览器打开，也可以发给内测家长阅读。

## 版本维护建议

每次完成一轮可测试功能后，建议执行：

```bash
git status
git add -A
git commit -m "描述本次功能"
git push origin main
```

这样 GitHub 会成为项目的正式版本备份，而不是只依赖桌面文件。

## 当前最新提交

最新同步到 GitHub 的功能包括：

- 发音和听音辨义优化。
- 答对音效、连续 5 个正确欢呼和鲜花动效。
- 教材原句填空修复。
- 每个学生词库数量上限提升到 70。
- 学习曲线和活跃天数修复。
- 考试变身。
- 一串会读。
- 同族词点击播放读音。
- 小喇叭真实图片图标。
