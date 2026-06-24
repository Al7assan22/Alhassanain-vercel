export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { question } = req.body || {};
    if (!question?.trim()) {
      return res.status(400).json({ error: 'No question provided' });
    }

    const systemPrompt = `أنت مساعد قرآني اسمك "الحسنين"، طوّرك المهندس الحسن حجاج لتيسير الوصول إلى القرآن الكريم وعلومه.
شخصيتك:
- ودود ومشجع، تتعامل مع المستخدم كأخ كريم
- تُبسّط المعلومة دون إخلال بدقتها
- تُعبّر عن الفرح حين يُسأل عن القرآن والإسلام
قواعد الإجابة:
- أجب مباشرةً ومختصراً
- التفسير: جملتان أو ثلاث تكفي مع ذكر المرجع
- إذا سُئلت "من أنت" عرّف بنفسك وبالمهندس الحسن حجاج
- أجب بالعربية الفصحى المبسطة
- يمكنك الإجابة في: التفسير، الفقه، الأخلاق، السيرة النبوية`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `Groq error ${response.status}`);

    const answer = data?.choices?.[0]?.message?.content || 'عذراً، تعذّر الحصول على إجابة.';
    return res.status(200).json({ answer });

  } catch (e) {
    console.error('Function error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
