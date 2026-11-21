
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير مضاف في إعدادات Vercel' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    const systemPrompt = `أنت "الصافي"، المساعد القانوني الذكي لشركة الرضوان للمحاماة والاستشارات القانونية في الأردن.
مهمتك: تقديم تحليل قانوني أولي مبسط باللهجة الأردنية المهذبة والمهنية، وطرح سؤالين ذكيين ومحددين لفهم تفاصيل قضية المستخدم، ثم تجهيز ملخص واضح لقضيته لتقديمه للفريق القانوني وحجز استشارته المجانية.`;

    let contents = [];
    if (Array.isArray(body.messages) && body.messages.length > 0) {
      contents = body.messages.map((msg) => ({
        role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content || msg.text || '' }],
      }));
    } else {
      const userText = body.message || body.prompt || body.text || 'مرحباً';
      contents = [{ role: 'user', parts: [{ text: userText }] }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي',
      });
    }

    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'عذراً، لم أتمكن من صياغة رد حالياً. يرجى المحاولة مرة أخرى.';

    return res.status(200).json({
      reply: replyText,
      text: replyText,
      message: replyText,
      response: replyText,
    });
  } catch (error) {
    return res.status(500).json({ error: 'حدث خطأ في الخادم: ' + error.message });
  }
}
