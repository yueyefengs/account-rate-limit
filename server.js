const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/check', async (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'Missing apiKey' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const limitTokens = response.headers.get('x-ratelimit-limit-tokens');
    const limitRequests = response.headers.get('x-ratelimit-limit-requests');

    res.json({
      httpStatus: response.status,
      limitTokens: limitTokens ? parseInt(limitTokens, 10) : null,
      limitRequests: limitRequests ? parseInt(limitRequests, 10) : null,
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ error: '请求超时' });
    }
    res.status(502).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ OpenAI Tier Checker 已启动: http://localhost:${PORT}`);
});
