// api/gemini-counseling.js
// Gemini API 호출은 Vercel Serverless Function에서 처리합니다.
// Vercel 배포 시에는 Project Settings의 Environment Variables에 GEMINI_API_KEY를 등록해야 합니다.
// .env 파일은 GitHub에 올리지 않습니다.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.' });
  }

  const { studentAlias, gradeSummary, learningTraits, teacherConcern } = req.body;

  if (!studentAlias || !gradeSummary || !learningTraits || !teacherConcern) {
    return res.status(400).json({ success: false, error: '필수 데이터가 누락되었습니다.' });
  }

  // Gemini에게 보낼 프롬프트 구성
  // Gemini는 학생을 단정적으로 판단하거나 진단하지 않도록 하며, 교사가 학생을 이해하고 대화할 수 있도록 돕는 방향으로 응답하게 합니다.
  const promptText = `
당신은 교사를 돕는 "AI 학생 상담 전략 도우미"입니다. 
다음 익명화된 학생 데이터와 교사의 고민을 바탕으로 상담 전략을 제안해주세요.

[학생 데이터]
- 학생 식별: ${studentAlias}
- 성적 요약: ${gradeSummary}
- 학습 특성: ${learningTraits}
- 교사 고민: ${teacherConcern}

[응답 작성 원칙]
1. 학생을 단정적으로 판단하거나 진단하지 마세요. ("의지가 부족하다", "주의력 문제가 있다", "심리적 문제가 있다" 등의 표현 금지)
2. 교사가 학생을 이해하고 대화할 수 있도록 돕는 방향으로 응답하세요.
3. 다음 6가지 항목을 반드시 포함하여 작성해주세요:
   1) 현재 상황 요약
   2) 학생 데이터 기반 해석
   3) 상담 접근 전략
   4) 교사가 던질 수 있는 질문 3개
   5) 피해야 할 말 또는 주의점
   6) 다음 수업에서 해볼 수 있는 작은 지원
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return res.status(500).json({ success: false, error: 'Gemini API 호출에 실패했습니다.' });
    }

    const data = await response.json();
    
    // 응답 텍스트 추출
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      throw new Error('응답 데이터를 파싱할 수 없습니다.');
    }

    return res.status(200).json({ success: true, result: resultText });
  } catch (error) {
    console.error('Serverless Function Error:', error);
    return res.status(500).json({ success: false, error: error.message || '서버 내부 오류가 발생했습니다.' });
  }
}
