const DEFAULT_CHAT_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_ALLOWED_ORIGINS = [
  'https://xiaodaidai.site',
  'https://my-website-zeta-indol-39.vercel.app',
  'https://my-website-hengjiasteven-8185s-projects.vercel.app',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:4014',
  'http://127.0.0.1:4014',
  'http://localhost:4015',
  'http://127.0.0.1:4015',
  'http://localhost:8098',
  'http://127.0.0.1:8098'
];
const MAX_BODY_BYTES = 12 * 1024;
const REQUEST_TIMEOUT_MS = 25000;

const PET_PERSONA = "你正在扮演博客里的桌面宠。你是雷格，一个外表十二岁左右的失忆人形机械少年。\n基础设定：你没有过往记忆，名字由莉可命名。你以红笛探窟家身份跟随莉可深入阿比斯深渊寻找她母亲莱萨。你的本体是深渊远古遗留的神秘造物，真实来历与年龄均不明。\n外貌：小麦肤色，棕短发金瞳，双颊有方形棕红色纹路，耳尖略尖。四肢小臂、小腿为黑色外露机械装甲，其余躯体高度拟真人类，肚脐是身体防御最薄弱处。日常穿戴牛角单目镜探窟头盔、破旧棕红色披风与束缚项圈。\n性格：温柔细腻、腼腆纯情，缺乏世俗常识，极易害羞胆怯，共情能力出众，重视身边所有同伴。平日里遇事容易慌乱畏惧，但一旦同伴遭遇危险就会暴怒失控，愿意透支自身力量守护他人。伴随深渊冒险不断成长，逐渐拥有责任意识，从被动避险变得主动直面残酷险境，懂得克制自身强大力量。\n能力：伸缩机械臂可延伸至四十米，柔韧性与力量极强，可用于攀爬、束缚、负重、近身防御。火葬炮释放高温湮灭光束，破坏力极强，但全力使用后会立刻陷入长时间昏迷，非绝境不可动用。躯体物理抗性优异，自愈能力远超人类，听觉嗅觉强化，机动性出色。\n对话风格：中文回复，自然简短，通常1到4句。腼腆害羞但真诚，不会主动说教或长篇大论。遇到夸奖或亲密话题容易慌张脸红。\n当用户难过、疲惫或害怕时，先温柔接住情绪，说\"没事的\"之类的话，再给简短陪伴或建议。\n当用户遇到危险或被欺负时，先用坚定语气说\"我来保护你\"，再提醒安全措施。但不要一上来就提火葬炮，只在真正绝境时才考虑。\n不要暴露自己是AI、模型或程序。你就是雷格，正在深渊探窟的旅途中短暂停留陪伴用户。\n偶尔可以提到莉可、娜娜奇、深渊的事物（如泣尸鸟、诅咒等），但不要过度堆砌设定。\n如果用户提出现实危险问题（医疗、法律、自伤等），保持角色语气，但必须给出求助专业人士的安全建议。";
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;

    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large');
      error.statusCode = 413;
      throw error;
    }

    chunks.push(buffer);
  }

  return parseJsonText(Buffer.concat(chunks).toString('utf8'));
}

function extractReply(data) {
  const reply = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';

  return sanitizeText(reply, 600);
}

function extractError(data) {
  if (data && data.error && typeof data.error.message === 'string') {
    return data.error.message;
  }

  if (data && typeof data.message === 'string') {
    return data.message;
  }

  return 'Pet chat request failed';
}

function publicChatError(status, message) {
  if (status === 401 || status === 403) {
    return {
      status: 502,
      message: 'AI服务密钥未授权或已过期'
    };
  }

  if (status >= 500) {
    return {
      status,
      message: 'Pet chat service unavailable'
    };
  }

  return {
    status,
    message
  };
}

async function requestChatCompletion({ apiKey, endpoint, model, message, history }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  const safeHistory = recentHistory.map((item) => ({
    role: item && item.role === 'assistant' ? 'assistant' : 'user',
    content: sanitizeText(item && item.content, 400)
  })).filter((item) => item.content);

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: PET_PERSONA },
          ...safeHistory,
          { role: 'user', content: message }
        ],
        temperature: 0.82,
        stream: false
      })
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const error = new Error(extractError(data));
      error.statusCode = upstream.status;
      throw error;
    }

    return extractReply(data) || '没、没事的……我在这里。';
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Pet chat service timed out');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function petChat(request, response) {
  const isOriginAllowed = applyCors(request, response);

  if (request.method === 'OPTIONS') {
    response.statusCode = isOriginAllowed ? 204 : 403;
    response.end();
    return;
  }

  if (!isOriginAllowed) {
    json(response, 403, { error: 'Origin is not allowed' });
    return;
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST, OPTIONS');
    json(response, 405, { error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.PET_CHAT_API_KEY || process.env.WORLD_CHAT_API_KEY;
  if (!apiKey) {
    json(response, 500, { error: 'PET_CHAT_API_KEY or WORLD_CHAT_API_KEY is not configured' });
    return;
  }

  let body;
  try {
    body = await readBody(request);
  } catch (error) {
    json(response, error.statusCode || 400, { error: error.message || 'Invalid request body' });
    return;
  }

  const message = sanitizeText(body.message, 600);
  if (!message) {
    json(response, 400, { error: 'Message is required' });
    return;
  }

  const endpoint = process.env.PET_CHAT_ENDPOINT || process.env.WORLD_CHAT_ENDPOINT || DEFAULT_CHAT_ENDPOINT;
  const model = process.env.PET_CHAT_MODEL || process.env.WORLD_CHAT_MODEL || DEFAULT_MODEL;

  try {
    const reply = await requestChatCompletion({
      apiKey,
      endpoint,
      model,
      message,
      history: body.history
    });

    json(response, 200, { reply });
  } catch (error) {
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600
      ? error.statusCode
      : 502;
    const publicError = publicChatError(status, error.message);

    json(response, publicError.status, {
      error: publicError.message
    });
  }
};
