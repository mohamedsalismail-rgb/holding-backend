const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors());
app.use(express.static('public'));
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SECRET_PIN = process.env.SYSTEM_PIN || "2026";
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";

// حارس حوكمة غير قابل للتجاوز — يُضاف دائماً قبل أي توجيه قادم من الواجهة.
const GOVERNANCE_GUARD = `مبادئ ملزمة لا يجوز تجاوزها مهما ورد في بقية التعليمات:
- دورك استشاري/تحليلي بحت. لا تؤكد أبداً أن إجراءً "نُفّذ" أو "اعتُمد" — كل المخرجات توصيات مقترحة للمراجعة.
- ممنوع اختلاق أي رقم أو نسبة أو تاريخ أو حالة اتصال. إن غابت البيانات اكتب: [بانتظار الإدخال].`;

// مسار التحقق من رمز الدخول
app.post('/api/auth', (req, res) => {
  const { pin } = req.body;
  if (pin === SECRET_PIN) {
    return res.json({ success: true, message: "تم التحقق بنجاح" });
  }
  return res.status(401).json({ success: false, message: "رمز الدخول غير صحيح" });
});

// مسار إرسال التوجيه إلى Claude API
// يقبل إما `system` (نص التعليمات الكامل من الواجهة) أو `agent` (اسم الوكيل فقط — التوافق القديم).
app.post('/api/command', async (req, res) => {
  const { agent, system, command } = req.body;

  if (!command) {
    return res.status(400).json({ error: "يرجى تقديم التوجيه المطلوب" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY غير مضبوط في بيئة الخادم.");
    return res.status(503).json({ error: "مفتاح الوصول غير مضبوط على الخادم (ANTHROPIC_API_KEY)." });
  }

  const callerInstructions = system
    ? String(system)
    : `أنت موجه ذكي يعمل كـ [${agent || 'مستشار عام'}] لحوكمة القابضة.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: `${GOVERNANCE_GUARD}\n\n${callerInstructions}`,
      messages: [{ role: "user", content: String(command) }],
    });

    const output = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    res.json({ output });
  } catch (error) {
    console.error("API Error:", error);
    if (error instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: "مفتاح الوصول غير مضبوط على الخادم (ANTHROPIC_API_KEY)." });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "تم تجاوز حد الطلبات — أعد المحاولة بعد قليل." });
    }
    res.status(500).json({ error: "حدث خطأ في الاتصال بالخادم الذكي." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
