const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());
app.use(cors());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SECRET_PIN = process.env.SYSTEM_PIN || "2026";

// مسار التحقق من رمز الدخول
app.post('/api/auth', (req, res) => {
  const { pin } = req.body;
  if (pin === SECRET_PIN) {
    return res.json({ success: true, message: "تم التحقق بنجاح" });
  }
  return res.status(401).json({ success: false, message: "رمز الدخول غير صحيح" });
});

// مسار إرسال التوجيه إلى Claude API
app.post('/api/command', async (req, res) => {
  const { agent, command } = req.body;

  if (!command) {
    return res.status(400).json({ error: "يرجى تقديم التوجيه المطلوب" });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      system: `أنت موجه ذكي يعمل كـ [${agent}] لحوكمة القابضة. يمنع التنفيذ الآلي، والإجابات تُصنّف كـ 'توصيات مقترحة للمراجعة'.`,
      messages: [{ role: "user", content: command }],
    });

    res.json({ output: response.content[0].text });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "حدث خطأ في الاتصال بالخادم الذكي." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
