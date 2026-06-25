---
title: 功能
layout: page
---

<div class="tools-hub" data-dream-tools>
<section class="tools-intro">
<h2>功能板块</h2>
<p>这里放一些常用的小工具和互动入口，文件会尽量在浏览器本地处理，不主动上传到服务器。</p>
</section>

<section class="tools-grid" aria-label="功能列表">
<a class="tools-card tools-card-link" href="/world/" data-no-pjax>
<span class="tools-card-icon"><i class="iconfont icon-world" aria-hidden="true"></i></span>
<div>
<h3>3D 世界</h3>
<p>进入一个可旋转、可缩放的 3D 场景，点击角色后可以打开对话面板。</p>
<span class="tools-status">已上线</span>
</div>
</a>

<a class="tools-card" href="#audio-converter" data-tool-open="audio-converter">
<span class="tools-card-icon"><i class="iconfont icon-music" aria-hidden="true"></i></span>
<div>
<h3>音乐格式转换</h3>
<p>支持把常见音频转成 MP3、WAV、OGG 等格式，适合处理日常音乐文件。</p>
<span class="tools-status">本地转换</span>
</div>
</a>

<a class="tools-card" href="#image-converter" data-tool-open="image-converter">
<span class="tools-card-icon"><i class="iconfont icon-image" aria-hidden="true"></i></span>
<div>
<h3>图片格式转换</h3>
<p>支持 PNG、JPG、WebP 三种常见图片格式，转换完成后可以直接下载。</p>
<span class="tools-status">已可用</span>
</div>
</a>

<a class="tools-card" href="#markdown-preview" data-tool-open="markdown-preview">
<span class="tools-card-icon"><i class="iconfont icon-articles" aria-hidden="true"></i></span>
<div>
<h3>Markdown 预览</h3>
<p>粘贴或导入 Markdown，右侧即时预览标题、列表、引用和代码块。</p>
<span class="tools-status">已可用</span>
</div>
</a>

<a class="tools-card" href="#abyss-random-media" data-tool-open="abyss-random-media">
<span class="tools-card-icon"><i class="iconfont icon-video" aria-hidden="true"></i></span>
<div>
<h3>深渊随机原片</h3>
<p>从视频素材里随机截取一帧，也可以直接播放当前片段。</p>
<span class="tools-status">视频生成</span>
</div>
</a>
</section>

<section class="tool-panel" id="audio-converter" data-tool-panel data-audio-tool>
<button class="tool-back-button" type="button" data-tool-close>返回功能列表</button>
<div class="tool-panel-head">
<span class="tool-panel-icon"><i class="iconfont icon-music" aria-hidden="true"></i></span>
<div>
<h2>音乐格式转换</h2>
<p>使用浏览器端转换，适合中小体积文件。第一次使用会加载转换核心，请稍等。</p>
</div>
</div>
<div class="tool-workspace">
<label class="tool-dropzone" for="audio-file">
<input id="audio-file" type="file" accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus">
<span>选择音频文件</span>
<small data-audio-file-label>支持 mp3 / wav / flac / m4a / aac / ogg 等常见格式</small>
</label>
<div class="tool-controls">
<label>
<span>目标格式</span>
<select data-audio-format>
<option value="mp3">MP3</option>
<option value="wav">WAV</option>
<option value="ogg">OGG</option>
<option value="aac">AAC</option>
</select>
</label>
<label>
<span>音频码率</span>
<select data-audio-bitrate>
<option value="192k">192 kbps</option>
<option value="128k">128 kbps</option>
<option value="256k">256 kbps</option>
<option value="320k">320 kbps</option>
</select>
</label>
<button class="tool-button" type="button" data-audio-convert>开始转换</button>
</div>
<div class="tool-result">
<p class="tool-status-text" data-audio-status>请选择一个音频文件。</p>
<audio controls data-audio-preview hidden></audio>
<a class="tool-download" data-audio-download hidden>下载转换后的音频</a>
</div>
</div>
</section>

<section class="tool-panel" id="image-converter" data-tool-panel data-image-tool>
<button class="tool-back-button" type="button" data-tool-close>返回功能列表</button>
<div class="tool-panel-head">
<span class="tool-panel-icon"><i class="iconfont icon-image" aria-hidden="true"></i></span>
<div>
<h2>图片格式转换</h2>
<p>上传图片后选择目标格式和质量，转换会在当前浏览器完成。</p>
</div>
</div>
<div class="tool-workspace">
<label class="tool-dropzone" for="image-file">
<input id="image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp">
<span>选择图片文件</span>
<small data-image-file-label>支持 png / jpg / webp / gif / bmp，动图会转换为第一帧</small>
</label>
<div class="tool-controls">
<label>
<span>目标格式</span>
<select data-image-format>
<option value="image/png">PNG</option>
<option value="image/jpeg">JPG</option>
<option value="image/webp">WebP</option>
</select>
</label>
<label>
<span>图片质量</span>
<input data-image-quality type="range" min="0.5" max="1" step="0.05" value="0.92">
<small data-image-quality-label>92%</small>
</label>
<button class="tool-button" type="button" data-image-convert>开始转换</button>
</div>
<div class="tool-result tool-image-result">
<p class="tool-status-text" data-image-status>请选择一张图片。</p>
<img data-image-preview alt="转换后的图片预览" hidden>
<a class="tool-download" data-image-download hidden>下载转换后的图片</a>
</div>
</div>
</section>

<section class="tool-panel" id="markdown-preview" data-tool-panel data-markdown-tool>
<button class="tool-back-button" type="button" data-tool-close>返回功能列表</button>
<div class="tool-panel-head">
<span class="tool-panel-icon"><i class="iconfont icon-articles" aria-hidden="true"></i></span>
<div>
<h2>Markdown 预览</h2>
<p>可以直接粘贴 Markdown，也可以导入 .md 文件查看排版。</p>
</div>
</div>
<div class="tool-markdown-layout">
<div class="tool-markdown-editor">
<div class="tool-mini-toolbar">
<label class="tool-file-button" for="markdown-file">导入 .md</label>
<input id="markdown-file" type="file" accept=".md,.markdown,text/markdown,text/plain">
<button class="tool-ghost-button" type="button" data-markdown-clear>清空</button>
</div>
<textarea data-markdown-input spellcheck="false" placeholder="在这里输入 Markdown 内容..."></textarea>
</div>
<article class="tool-markdown-preview markdown-body" data-markdown-output aria-live="polite"></article>
</div>
</section>

<section class="tool-panel" id="abyss-random-media" data-tool-panel data-video-spotlight-tool></section>
</div>
