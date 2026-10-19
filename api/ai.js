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

    // الموديلات تتغير عند Groq؛ يمكن تغيير الأول من متغير البيئة GROQ_MODEL بدون تعديل الكود
    const MODELS = [process.env.GROQ_MODEL, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b']
      .filter((m, i, arr) => m && arr.indexOf(m) === i);

    let data = null, lastErr = 'Unknown error';
    for (const model of MODELS) {
      const body = {
        model,
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ]
      };
      if (model.startsWith('openai/gpt-oss')) body.reasoning_effort = 'low'; // لا نستهلك التوكنز في التفكير

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify(body)
      });
      const json = await response.json().catch(() => ({}));
      if (response.ok && json?.choices?.[0]?.message?.content) { data = json; break; }
      lastErr = json?.error?.message || `Groq error ${response.status}`;
      // مفتاح خاطئ أو حد الاستخدام: لا فائدة من تجربة موديل آخر
      if (response.status === 401 || response.status === 429) break;
      console.error(`Model ${model} failed:`, lastErr);
    }
    if (!data) throw new Error(lastErr);

    const answer = data?.choices?.[0]?.message?.content || 'عذراً، تعذّر الحصول على إجابة.';
    return res.status(200).json({ answer });

  } catch (e) {
    console.error('Function error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
