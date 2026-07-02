# 云数据库集合设计

当前版本使用 4 个集合：

1. `users`
2. `wordLists`
3. `studyRecords`
4. `stories`

所有集合都带 `openid` 字段。前端不直接读写数据库，统一通过云函数读写。云函数会用 `cloud.getWXContext()` 获取当前用户 `openid`，并校验数据归属。

---

## users

保存学生资料。

```json
{
  "_id": "user_id",
  "openid": "wechat_openid",
  "name": "Luna",
  "grade": "七年级",
  "city": "深圳",
  "interests": ["鹦鹉", "穿搭", "游戏"],
  "personality": "爱美，有点好胜，喜欢被夸",
  "interactionStyle": "游戏闯关型",
  "createdAt": "serverDate",
  "updatedAt": "serverDate"
}
```

---

## wordLists

保存词表和每个单词掌握度。

```json
{
  "_id": "word_list_id",
  "userId": "user_id",
  "openid": "wechat_openid",
  "title": "七年级 Unit 3 单词",
  "words": [
    {
      "word": "parrot",
      "meaning": "鹦鹉",
      "example": "",
      "masteryScore": 0,
      "rightCount": 0,
      "wrongCount": 0,
      "lastReviewedAt": null,
      "createdAt": "date"
    }
  ],
  "createdAt": "serverDate",
  "updatedAt": "serverDate"
}
```

第一版每个词表只有 20-30 个词，直接把 `words` 数组放在 `wordLists` 内部。后续如果词量变大，再拆出独立 `words` 集合。

---

## studyRecords

保存每次答题记录。

```json
{
  "_id": "record_id",
  "userId": "user_id",
  "openid": "wechat_openid",
  "wordListId": "word_list_id",
  "word": "parrot",
  "meaning": "鹦鹉",
  "mode": "choice",
  "result": "correct",
  "scoreChange": 1,
  "createdAt": "serverDate"
}
```

`mode` 可选：

```text
flashcard
choice
spelling
```

`result` 可选：

```text
correct
wrong
known
unclear
unknown
```

---

## stories

保存生成的个性化故事。

```json
{
  "_id": "story_id",
  "userId": "user_id",
  "openid": "wechat_openid",
  "wordListId": "word_list_id",
  "title": "Luna 和单词能量地图",
  "content": "故事正文",
  "words": [
    {
      "word": "parrot",
      "meaning": "鹦鹉"
    }
  ],
  "studentSnapshot": {
    "name": "Luna",
    "grade": "七年级",
    "city": "深圳",
    "interests": ["鹦鹉", "穿搭", "游戏"],
    "interactionStyle": "游戏闯关型"
  },
  "createdAt": "serverDate"
}
```

---

## 建议的数据库权限

因为本项目默认只通过云函数读写数据库，建议数据库权限尽量收紧。

最简单做法：

- 前端不直接调用 `wx.cloud.database()`。
- 所有读写都走云函数。
- 云函数内部校验 `openid`。

上线前再根据微信云开发控制台的安全规则能力，设置为仅创建者可读写，或禁止客户端直接写入。
