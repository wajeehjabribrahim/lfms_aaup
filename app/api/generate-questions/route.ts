const GEMINI_API_KEY = "AIzaSyDp-R1ZEsmHUn46cDT6mFZeds9NJcYznSI";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Fallback questions generator - محلي بدون API
function generateFallbackQuestions(itemType: string): string[] {
  const questionTemplates: Record<string, string[]> = {
    هاتف: [
      "ما هي ماركة وموديل الهاتف؟",
      "ما هو لون الهاتف والغلاف؟",
      "هل كانت الشاشة مكسورة أو بها خدوش؟",
      "هل كان فيه أي ملصقات أو علامات مميزة على الهاتف؟",
    ],
    محفظة: [
      "ما هي ماركة ولون المحفظة؟",
      "ما نوع المادة (جلد، قماش، إلخ)؟",
      "ماذا كان فيها من بطاقات أو مستندات؟",
      "هل فيها أي علامات مميزة أو تفاصيل خاصة؟",
    ],
    حقيبة: [
      "ما نوع الحقيبة (ظهر، يد، كتف)؟",
      "ما هو لون الحقيبة والماركة؟",
      "ما محتويات الحقيبة؟",
      "هل كانت فارغة أم بها أشياء ثقيلة؟",
    ],
    مفاتيح: [
      "كم عدد المفاتيح وما ألوانها؟",
      "هل كانت في حامل أو سلسلة معينة؟",
      "ما الأشياء المرفقة بالمفاتيح؟",
      "هل فيه أي علامة مميزة للتعرف عليها؟",
    ],
    نظارة: [
      "ما هو نوع النظارة (طبية أم شمسية)؟",
      "ما لون الإطار والعدسات؟",
      "ما ماركة النظارة؟",
      "هل كانت في علبة حماية أم لا؟",
    ],
    بطاقة: [
      "ما نوع البطاقة (جامعية/هوية/ائتمان)؟",
      "هل كانت وحدها أم مع بطاقات أخرى؟",
      "هل تذكر اسمك أم أي معلومات مكتوبة عليها؟",
      "هل كانت في محفظة أم ظرف معين؟",
    ],
  };

  // البحث عن كلمات مطابقة
  let questions: string[] = [];
  const lowerItemType = itemType.toLowerCase();

  for (const [key, vals] of Object.entries(questionTemplates)) {
    if (lowerItemType.includes(key) || key.includes(lowerItemType)) {
      questions = vals;
      break;
    }
  }

  // إذا لم نجد أسئلة محددة، استخدم أسئلة عامة
  if (questions.length === 0) {
    questions = [
      `ما هي الخصائص الرئيسية للـ${itemType}؟`,
      "ما هو اللون والماركة إن وجدت؟",
      "هل كان مع أشياء أخرى عند الفقد؟",
      "هل تذكر أي تفاصيل إضافية مهمة؟",
    ];
  }

  return questions;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemType } = body; 

    const prompt = `أنت مساعد ذكي في نظام تسجيل المفقودات بالجامعة. 
المستخدم يريد تسجيل مفقود من نوع: "${itemType}"
ولد 4 أسئلة ذكية بالعربية فقط.
الرد بصيغة JSON فقط: {"questions": ["السؤال 1", "السؤال 2", "السؤال 3", "السؤال 4"]}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error response:", errorData);
      console.warn("Using fallback question generator...");
      
      // استخدام fallback محلي عند الخطأ
      const fallbackQuestions = generateFallbackQuestions(itemType);
      return Response.json({ questions: fallbackQuestions });
    }

    const data: GeminiResponse = await response.json();

    // استخراج النص من الرد
    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // محاولة استخراج JSON من الرد
    let questions: string[] = [];
    try {
      // البحث عن JSON في الرد
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        questions = jsonData.questions || [];
      }
    } catch (error) {
      console.error("Error parsing JSON from Gemini response:", error);
      // إذا فشل الـ parsing، حاول استخراج الأسئلة من النص
      const lines = responseText.split("\n").filter((line) => line.trim().length > 0);
      questions = lines.map((line) => line.replace(/^\d+[\.\-\)]/, "").trim()).filter((q) => q.length > 0);
    }

    if (questions.length === 0) {
      const fallbackQuestions = generateFallbackQuestions(itemType);
      return Response.json({ questions: fallbackQuestions });
    }

    return Response.json({ questions });
  } catch (error) {
    console.error("Error in generate-questions API:", error);
    console.log("Falling back to local question generator...");
    
    // نحتاج لاستخراج البيانات من الـ request مجدداً في الخطأ
    try {
      const body = await request.json();
      const itemType = body.itemType || "مفقود";
      const fallbackQuestions = generateFallbackQuestions(itemType);
      return Response.json({ questions: fallbackQuestions });
    } catch {
      // إذا فشل كل شيء، أرجع أسئلة افتراضية
      return Response.json({ 
        questions: [
          "ما هي الخصائص الرئيسية للمفقود؟",
          "ما هو اللون والماركة إن وجدت؟",
          "هل كان مع أشياء أخرى عند الفقد؟",
          "هل تذكر أي تفاصيل إضافية مهمة؟"
        ]
      });
    }
  }
}
