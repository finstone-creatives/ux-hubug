const axios = require('axios');

const DEEPSEEK_BASE = 'https://api.deepseek.com';
const MODEL = 'deepseek-chat';

async function callDeepSeek(messages, options = {}) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error('DEEPSEEK_API_KEY not set');
  }
  const res = await axios.post(`${DEEPSEEK_BASE}/chat/completions`, {
    model: MODEL,
    messages,
    max_tokens: options.max_tokens || 150,
    temperature: options.temperature || 0.7,
    ...options
  }, {
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    }
  });
  return res.data.choices[0].message.content.trim();
}

module.exports = {
  async generateCaption(prompt) {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant for adult content creators on a premium platform like OnlyFans for Africa. Generate short, seductive, professional captions that are tempting but classy. Max 120 characters.' },
      { role: 'user', content: `Generate a caption for: ${prompt}` }
    ];
    return callDeepSeek(messages, { max_tokens: 80 });
  },

  async generateContentIdeas(creatorBio = '', num = 5) {
    const messages = [
      { role: 'system', content: 'You are an AI content strategist for African creators on a premium subscription platform. Suggest 5 creative, engaging post or live ideas that drive subscriptions and tips. Keep cultural relevance and exclusivity in mind. Short titles.' },
      { role: 'user', content: `Creator bio: ${creatorBio}. Suggest ${num} ideas.` }
    ];
    const text = await callDeepSeek(messages, { max_tokens: 200 });
    return text.split('\n').filter(line => line.trim()).slice(0, num);
  },

  async suggestLiveTipGoals(streamTopic = 'live show') {
    const messages = [
      { role: 'system', content: 'You are an expert in live streaming monetization for adult creators. Suggest 3 progressive tip goals for a live stream (e.g. $50 for X, $150 for Y). Make them exciting and achievable. Format as "Goal1: $amount - action".' },
      { role: 'user', content: `Topic: ${streamTopic}` }
    ];
    return callDeepSeek(messages, { max_tokens: 100 });
  },

  async moderateText(text) {
    const messages = [
      { role: 'system', content: 'You are a content moderator for a premium adult platform. Flag if the text is spam, hate, illegal, or too explicit for public. Reply with "OK" or "FLAG: reason".' },
      { role: 'user', content: text }
    ];
    const result = await callDeepSeek(messages, { max_tokens: 20, temperature: 0.1 });
    return { safe: !result.toUpperCase().startsWith('FLAG'), reason: result };
  }
};
