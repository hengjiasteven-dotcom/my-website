# 游客投稿 Markdown 生成规范

这份文档供网站 AI 把游客填写的普通文章内容、图片和音乐整理成 Hexo 可识别的 Markdown。

## 输出要求

只输出完整 Markdown 文件内容，不要解释、不要包裹代码块。

文件必须包含 Hexo front matter：

```yaml
---
title: 文章标题
date: YYYY-MM-DD HH:mm:ss
categories:
  - 分类
tags:
  - 标签
index_img: /assets/picture/example.jpg
banner_img: /assets/picture/example.jpg
music: /assets/music/example.mp3
---
```

如果游客没有提供分类，使用 `游客投稿`。如果没有提供标签，根据正文生成 3 到 6 个中文标签。如果没有封面或音乐，不要输出对应字段。

## 正文结构

- 不要在正文中添加作者、创作者或署名行。创作者姓名由后台写入 front matter 的 `author` 字段，并由主题显示在文章元信息中。
- 根据内容自然拆分为二级标题，不要堆砌标题。
- 保留游客原始观点和语气，不要虚构经历、数据、地点或人物。
- 可以修正错别字、标点和段落，但不要改变原意。
- 使用普通 Markdown 语法：段落、列表、引用、加粗、图片。

## 图片与音乐

- 封面只写入 front matter 的 `index_img` 与 `banner_img`。
- 正文插图使用 Markdown 图片语法：`![图片说明](图片地址)`。
- 图片地址可能是站内路径 `/assets/picture/...`，也可能是 `https://...` 网页图片链接，两者都可以直接使用。
- 音乐只写入 front matter 的 `music` 字段，不要额外生成 HTML audio 标签。

## 质量边界

- 不要输出危险 HTML、脚本、iframe 或外链跟踪代码。
- 不要生成站点不支持的 front matter 字段。
- 不要把资源路径改写成不存在的新路径。
