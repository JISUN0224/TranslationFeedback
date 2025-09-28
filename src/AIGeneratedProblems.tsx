import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import FeedbackDisplay from './FeedbackDisplay';
import { auth, saveTranslationRecord, onAuthStateChanged, User } from './firebase';

interface TranslationProblem {
  id: string;
  "한국어": string;
  "중국어"?: string;
  "난이도": string;
  "분야": string;
  "주요어휘"?: any[];
  "출발언어"?: string;
  "sourceLanguage"?: string;
  "ChatGPT_번역"?: string;
  "Gemini_번역"?: string;
}

export default function AIGeneratedProblems() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState<string>('');
  const [difficultyText, setDifficultyText] = useState<string>('');
  const [generatingProblem, setGeneratingProblem] = useState(false);
  const [generatedProblem, setGeneratedProblem] = useState<TranslationProblem | null>(null);
  const [userTranslation, setUserTranslation] = useState('');
  const [aiTranslations, setAiTranslations] = useState<{ [model: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('한-중');
  const [feedback, setFeedback] = useState<string>('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [highlightWord, setHighlightWord] = useState<string | null>(null);
  const [selectedVocab, setSelectedVocab] = useState<any | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);

  // Firebase Auth state management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // AI API 호출 함수 (6개 모델 순차 폴백)
  const callAIAPI = async (prompt: string) => {
    const models = [
      'gemini-2.5-flash-lite',  // 1순위 - 기본 생성 모델 (저렴하고 빠름)
      'gemini-1.5-flash',       // 2순위 - 안정적인 대안
      'gemini-2.0-flash',       // 3순위 - Gemini 최후 수단
      'gpt-4o-mini',            // 4순위 - GPT 기본 모델
      'gpt-3.5-turbo-0125',     // 5순위 - GPT 안정 모델
      'gpt-4.1-mini'            // 6순위 - GPT 최고급 모델
    ];

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        if (model.startsWith('gemini')) {
          // Gemini API 호출
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }]
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
          }

          const data = await response.json();
          return data.candidates[0].content.parts[0].text;
        } else {
          // GPT API 호출
          const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
          if (!openaiApiKey) {
            throw new Error('OpenAI API 키가 설정되지 않음');
          }
          
          const url = 'https://api.openai.com/v1/chat/completions';
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify({
              model: model,
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 1000,
              temperature: 0.7
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
          }

          const data = await response.json();
          return data.choices[0].message.content;
        }
      } catch (error) {
        console.error(`${model} 실패:`, error);
        if (i === models.length - 1) {
          // 모든 모델 실패
          throw new Error('모든 AI 모델 호출 실패');
        }
        // 다음 모델로 계속 시도
        continue;
      }
    }
  };

  const generateNewProblem = async () => {
    if (!topic.trim()) {
      setError('주제를 입력해주세요.');
      return;
    }

    setGeneratingProblem(true);
    setError(null);
    
    try {
      const isKoreanToChinese = targetLanguage === '한-중';
      const sourceLang = isKoreanToChinese ? '한국어' : '중국어';
      const targetLang = isKoreanToChinese ? '중국어' : '한국어';
      
      const prompt = `
당신은 ${sourceLang}-${targetLang} 번역 교육 전문가입니다. 주어진 주제와 난이도에 맞는 번역 연습 문제를 생성해주세요.

[요구사항]
- 주제: ${topic}
- 난이도: ${difficultyText || '중급'}
- 분야: ${topic}과 관련된 분야
- ${sourceLang} 원문: 주제와 관련된 자연스러운 문장 (50-100자)
- 주요어휘: 3-5개의 핵심 단어와 ${targetLang} 번역${isKoreanToChinese ? ', 병음' : ''}, 중요도 포함

[난이도별 요구사항]
- 상급: 복잡한 문장 구조, 전문 용어, 추상적 개념 포함
- 중급: 일반적인 문장 구조, 일상적이지만 약간 복잡한 내용
- 하급: 간단한 문장 구조, 기본적인 일상 표현

[출력 형식 - JSON]
{
  "${sourceLang}": "${sourceLang} 원문",
  "난이도": "${difficultyText || '중급'}",
  "분야": "분야명",
  "주요어휘": [
    {
      "korean": "한국어 단어",
      "chinese": "중국어 번역",
      "pinyin": "병음",
      "importance": "중요도 (상/중/하)"
    }
  ]
}

위 형식으로 정확한 JSON만 출력해주세요.`;

      const responseText = await callAIAPI(prompt);
      
      // JSON 파싱
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const problemData = JSON.parse(jsonMatch[0]);
        const newProblem: TranslationProblem = {
          id: `generated-${Date.now()}`,
          ...problemData
        };
        
        setGeneratedProblem(newProblem);
        setUserTranslation('');
        setAiTranslations({});
        setFeedback('');
        setShowFeedback(false);
        setShowHints(false);
        setHighlightWord(null);
        setSelectedVocab(null);
      } else {
        setError('AI가 올바른 형식으로 문제를 생성하지 못했습니다.');
      }
    } catch (err: any) {
      setError('문제 생성에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setGeneratingProblem(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAiTranslations({});
    if (!generatedProblem) {
      setError('문제가 없습니다.');
      setLoading(false);
      return;
    }
    
    // AI 번역 생성
    try {
      
      const isKoreanToChinese = targetLanguage === '한-중';
      const sourceLang = isKoreanToChinese ? '한국어' : '중국어';
      const targetLang = isKoreanToChinese ? '중국어' : '한국어';
      const sourceText = generatedProblem[sourceLang] || generatedProblem["한국어"] || generatedProblem["중국어"];
      
      const translationPrompt = `
다음 ${sourceLang} 문장을 ${targetLang}로 번역해주세요. 번역만 정확하게 제공하고 설명이나 추가 내용은 포함하지 마세요.

${sourceLang}: ${sourceText}

${targetLang} 번역:`;

      const geminiTranslation = await callAIAPI(translationPrompt);
      
      setAiTranslations({
        'Gemini_번역': geminiTranslation,
        'ChatGPT_번역': geminiTranslation // 임시로 같은 번역 사용
      });
    } catch (err: any) {
      setError('AI 번역 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const languagePairs = ['한-중', '중-한'];
  const handleTargetLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetLanguage(e.target.value);
  };

  const fetchGeminiFeedback = async () => {
    if (!generatedProblem) return;
    setFeedback('');
    setFeedbackError(null);
    setFeedbackLoading(true);
    try {
      const isKoreanToChinese = targetLanguage === '한-중';
      const sourceLanguage = isKoreanToChinese ? '한국어' : '중국어';
      const targetLang = isKoreanToChinese ? '중국어' : '한국어';
      const sourceText = generatedProblem[sourceLanguage] || generatedProblem["한국어"] || generatedProblem["중국어"];
      
      const feedbackPrompt = `
당신은 숙련된 번역가입니다. 학생의 번역에 대해 구체적인 피드백을 아래 6개 항목으로 나눠서 작성해 주세요.

[CRITICAL 형식 규칙 - 절대 변경 금지]
- 각 항목은 정확히 "1. 종합 평가", "2. 좋은 점", "3. 아쉬운 점", "4. 추천 표현/개선", "5. 학습 제안", "6. 주요 표현/예문" 형식으로 시작
- 번호와 제목 사이에 점(.) 하나만 사용, 다른 기호나 별표(**) 절대 사용 금지
- 각 항목의 내용은 반드시 ‧ 기호로 시작하는 줄로 구성
- 각 ‧ 줄은 독립된 줄바꿈으로 구분
- "1. 종합 평가"는 피드백에 대한 전반적인 내용과 학생 격려 포함
- "2. 좋은 점"은 어휘 선택, 문맥 표현, 문법 등 전반적인 자연스러움에 대해 평가
- "3. 아쉬운 점"은 오역, 번역 부정확, 문맥 불일치 등 번역 오류에 대해 평가  
- "4. 추천 표현/개선"은 ${targetLang} 표현 개선 제안 포함
- "5. 학습 제안"은 "3. 아쉬운 점"에 기반하여 학습에 도움이 될 방법 제안안
- "6. 주요 표현/예문"에서는 반드시 아래 형식 준수:
  * ‧ 중요 표현: ${sourceLanguage}표현 → ${targetLang}표현${isKoreanToChinese ? ' (병음)' : ''}
  * ‧ 원문 예문 1: ${sourceLanguage} 예문
  * ‧ 예문 번역 1: ${targetLang} 번역
  * ‧ 원문 예문 2: ${sourceLanguage} 예문
  * ‧ 예문 번역 2: ${targetLang} 번역
  * (예문은 최소 2개, 최대 3개)

[출력 형식 예시]
1. 종합 평가
‧ 학생 번역은 원문의 의미를 잘 전달함
‧ 전달력이 좋고 자연스러움 유지 (8.5/10)

2. 좋은 점
‧ 어휘를 문맥에 맞게 잘 선택했어요
${isKoreanToChinese 
  ? '‧ "경제 통계" → "经济统计"를 올바르게 번역했어요'
  : '‧ "经济统计" → "경제 통계"를 올바르게 번역했어요'
}

3. 아쉬운 점
${isKoreanToChinese 
  ? '‧ "혁신 기술"이 "기술 변화"로 번역되어 의미가 약화됨'
  : '‧ "创新技术"이 "기술 변화"로 번역되어 의미가 약화됨'
}

4. 추천 표현/개선
${isKoreanToChinese 
  ? '‧ "경제 회복" → "经济复苏"가 더 자연스러움'
  : '‧ "经济复苏" → "경제 회복"이 더 자연스러움'
}

5. 학습 제안
‧ 접속사 사용과 문장 분리 연습 권장

6. 주요 표현/예문
${isKoreanToChinese 
  ? '‧ 중요 표현: 경제 회복 → 经济复苏(jīng jì fù sū)\n‧ 원문 예문 1: 정부는 경제 회복을 최우선 과제로 삼고 있다.\n‧ 예문 번역 1: 政府将经济复苏作为首要任务。\n‧ 원문 예문 2: 경제 회복 속도가 예상보다 빠르다.\n‧ 예문 번역 2: 经济复苏的速度比预期的要快。'
  : '‧ 중요 표현: 经济复苏(jīng jì fù sū) → 경제 회복\n‧ 원문 예문 1: 政府将经济复苏作为首要任务。\n‧ 예문 번역 1: 정부는 경제 회복을 최우선 과제로 삼고 있다.\n‧ 원문 예문 2: 经济复苏的速度比预期的要快。\n‧ 예문 번역 2: 경제 회복 속도가 예상보다 빠르다.'
}

[입력 데이터]
- 원문 언어: ${sourceLanguage}
- 번역 언어: ${targetLang}

원문:
${sourceText}

학생 번역문:
${userTranslation}

AI 번역문:
${aiTranslations["ChatGPT_번역"] || aiTranslations["Gemini_번역"] || ''}

위 데이터를 참고하여 위 예시와 완전히 동일한 형식으로 피드백을 작성해 주세요.`;
      const feedbackText = await callAIAPI(feedbackPrompt);
      setFeedback(feedbackText);
      setShowFeedback(true);
    } catch (err: any) {
      console.error('피드백 요청 실패:', err);
      setFeedbackError('피드백 요청에 실패했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setFeedbackLoading(false);
    }
  };


  // Save translation record
  const handleSaveRecord = async () => {
    if (!currentUser || !generatedProblem || !userTranslation || !feedback) {
      alert('로그인이 필요하거나 번역/피드백이 없습니다.');
      return;
    }

    setSavingRecord(true);
    try {
      await saveTranslationRecord({
        userId: currentUser.uid,
        problemType: 'ai-generated',
        originalText: targetLanguage === '한-중' 
          ? generatedProblem["한국어"] 
          : generatedProblem["중국어"] || generatedProblem["한국어"],
        userTranslation: userTranslation,
        aiTranslation: aiTranslations["Gemini_번역"] || '',
        feedback: feedback,
        topic: topic,
        difficulty: difficultyText,
      });
      alert('번역 기록이 저장되었습니다!');
    } catch (error) {
      // Error saving record
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-2" style={{ fontFamily: `'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'SimSun', 'Noto Sans KR', 'Apple SD Gothic Neo', Arial, sans-serif` }}>
      <div className="w-full max-w-6xl mx-auto" style={{ minWidth: '1152px' }}>
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigate('/')}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
              ← 메인 메뉴로
            </button>
            <h1 className="text-3xl font-bold text-green-600">AI 생성 문제</h1>
            <div></div>
          </div>
          <p className="text-gray-600">원하는 주제로 AI가 맞춤형 번역 문제를 생성해드립니다</p>
        </div>

        {showIntro && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded shadow flex items-start justify-between gap-4">
            <div>
              <div className="font-bold text-lg mb-1">🤖 AI 생성 문제 안내</div>
              <div className="text-gray-800 text-sm">
                원하는 주제를 입력하면 AI가 맞춤형 번역 문제를 생성해드립니다.<br/>
                생성된 문제는 기존 문제와 동일하게 번역 연습, AI 피드백, 힌트 기능을 모두 사용할 수 있습니다.<br/>
                다양한 주제로 연습하여 실력을 향상시켜보세요!
              </div>
            </div>
            <button className="ml-4 text-xs text-gray-500 hover:text-gray-700 px-2 py-1" onClick={() => setShowIntro(false)}>닫기 ✖</button>
          </div>
        )}

        {/* 주제 입력 섹션 */}
        {!generatedProblem && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow">
            <h3 className="font-bold text-lg mb-4">🎯 원하는 주제와 난이도를 설정하세요</h3>
            
            {/* 주제 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">주제</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 경제, 기술, 문화, 여행, 음식 등"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-300"
                onKeyPress={(e) => e.key === 'Enter' && generateNewProblem()}
              />
            </div>

            {/* 난이도 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">난이도</label>
              <input
                type="text"
                value={difficultyText}
                onChange={(e) => setDifficultyText(e.target.value)}
                placeholder="예: 가장 기초적인 수준, 전문적 어휘 위주의 상급 난이도"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>

            {/* 생성 버튼 */}
            <div className="flex justify-center">
              <button
                className="bg-green-600 text-white px-8 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                onClick={generateNewProblem}
                disabled={generatingProblem || !topic.trim()}
              >
                {generatingProblem ? '생성 중...' : '문제 생성'}
              </button>
            </div>
            
            {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
          </div>
        )}

        {/* 언어 선택 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select className="bg-white text-black px-3 py-2 rounded-md border border-gray-300 appearance-none" value={targetLanguage} onChange={handleTargetLanguageChange}>
            {languagePairs.map((pair, i) => (
              <option key={i} value={pair}>{i === 0 ? '언어쌍: ' + pair : pair}</option>
            ))}
          </select>
        </div>

        {generatedProblem ? (
          <>
            {/* 문제 카드 */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6 shadow" style={{ minWidth: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-gray-700 text-xl">아래 문장을 번역해 보세요.</p>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  🤖 AI 생성
                </span>
              </div>
              <div className="bg-blue-100 border border-blue-300 rounded-lg px-6 py-4 text-blue-900 text-base flex items-center gap-4 mb-6" style={{minHeight:'120px'}}>
                <span className="font-medium text-lg flex-1">
                  {targetLanguage === '한-중' 
                    ? generatedProblem["한국어"] 
                    : generatedProblem["중국어"] || generatedProblem["한국어"]
                  }
                </span>
                <button
                  className="bg-blue-400 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-500 flex items-center gap-1 flex-shrink-0"
                  onClick={() => setShowHints(v => !v)}
                  type="button"
                >
                  <span className="mr-1">🔍</span> 힌트 보기
                </button>
              </div>
              {/* 힌트/어휘 */}
              {showHints && generatedProblem["주요어휘"] && Array.isArray(generatedProblem["주요어휘"]) && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {generatedProblem["주요어휘"].map((vocab: any, idx: number) => {
                    const isKoreanToChinese = targetLanguage === '한-중';
                    const displayWord = isKoreanToChinese ? vocab.korean : vocab.chinese;
                    const highlightKey = isKoreanToChinese ? vocab.korean : vocab.chinese;
                    
                    return (
                      <button
                        key={idx}
                        className={`px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-800 text-sm font-medium hover:bg-blue-200 transition ${highlightWord === highlightKey ? 'ring-2 ring-yellow-400' : ''}`}
                        onClick={() => {
                          if (highlightWord === highlightKey) {
                            setHighlightWord(null); setSelectedVocab(null);
                          } else {
                            setHighlightWord(highlightKey); setSelectedVocab(vocab);
                          }
                        }}
                        type="button"
                      >
                        {displayWord}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* 어휘 상세 */}
              {showHints && selectedVocab && (
                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded shadow-sm w-full max-w-md">
                  {targetLanguage === '한-중' ? (
                    <>
                      <div className="font-bold text-blue-900 mb-1">{selectedVocab.korean}</div>
                      <div className="text-sm mb-1"><b>중국어:</b> {selectedVocab.chinese}</div>
                      <div className="text-sm mb-1"><b>Pinyin:</b> {selectedVocab.pinyin}</div>
                      <div className="text-sm"><b>중요도:</b> {selectedVocab.importance}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-blue-900 mb-1">{selectedVocab.chinese}</div>
                      <div className="text-sm mb-1"><b>한국어:</b> {selectedVocab.korean}</div>
                      <div className="text-sm mb-1"><b>Pinyin:</b> {selectedVocab.pinyin}</div>
                      <div className="text-sm"><b>중요도:</b> {selectedVocab.importance}</div>
                    </>
                  )}
                </div>
              )}
              {/* 번역 입력 */}
              <div className="w-full border border-gray-300 rounded-md p-3 mt-2 focus-within:ring-2 focus-within:ring-blue-300">
                <textarea
                  id="user-translation"
                  className="w-full resize-y focus:outline-none bg-transparent"
                  rows={3}
                  value={userTranslation}
                  onChange={e => setUserTranslation(e.target.value)}
                  placeholder={`여기에 ${targetLanguage === '한-중' ? '중국어' : '한국어'} 번역 입력...`}
                  required
                  style={{fontFamily: `'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'SimSun', 'Noto Sans KR', 'Apple SD Gothic Neo', Arial, sans-serif`}}
                />
                {highlightWord && userTranslation.includes(highlightWord) && (
                  <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm">
                    <span className="font-medium text-yellow-800">하이라이트된 단어: </span>
                    <span className="bg-yellow-200 font-bold px-1 rounded">{highlightWord}</span>
                  </div>
                )}
              </div>
              {/* 버튼 그룹 */}
              <div className="flex justify-center gap-3 mt-6">
                <button className="bg-green-600 text-white px-8 py-2 rounded-md font-bold hover:bg-green-700" type="submit" onClick={handleSubmit} disabled={loading}>{loading ? 'AI 번역 결과 가져오는 중...' : '내 번역 제출하기'}</button>
                <button className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600" onClick={() => {
                  setGeneratedProblem(null);
                  setTopic('');
                  setDifficultyText('');
                  setUserTranslation('');
                  setAiTranslations({});
                  setFeedback('');
                  setShowFeedback(false);
                  setShowHints(false);
                  setHighlightWord(null);
                  setSelectedVocab(null);
                }}>새 문제 생성</button>
              </div>
              {error && <div className="text-red-500 mb-4">{error}</div>}
            </div>

            {/* AI 번역 결과 카드 */}
            {Object.keys(aiTranslations).length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow mb-8">
                <h3 className="font-bold text-lg mb-4">AI 번역 결과</h3>
                <div className="flex flex-wrap gap-4 mt-2">
                  <div className="flex-1 min-w-[220px] bg-sky-50 border-2 border-sky-200 rounded-lg p-4">
                    <span className="font-bold block mb-2 text-gray-700">Gemini 번역</span>
                    <p className="text-gray-900 whitespace-pre-line">{aiTranslations["Gemini_번역"]}</p>
                  </div>
                  <div className="flex-1 min-w-[220px] bg-rose-50 border-2 border-rose-200 rounded-lg p-4">
                    <span className="font-bold block mb-2 text-gray-700">나의 번역</span>
                    <p className="text-gray-900 whitespace-pre-line">{userTranslation}</p>
                  </div>
                </div>
                <div className="text-center mt-6">
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold flex items-center justify-center gap-2 mx-auto hover:bg-blue-700" onClick={fetchGeminiFeedback} disabled={feedbackLoading}>
                    <span>📊</span> {feedbackLoading ? '피드백 생성 중...' : '비교 분석 피드백 받기'}
                  </button>
                  {feedbackError && <div className="text-red-500 mt-2">{feedbackError}</div>}
                </div>
              </div>
            )}

            {/* 피드백 결과 */}
            {showFeedback && feedback && (
              <>
                <FeedbackDisplay 
                  feedback={feedback} 
                  originalText={targetLanguage === '한-중' 
                    ? generatedProblem["한국어"] 
                    : generatedProblem["중국어"] || generatedProblem["한국어"]
                  }
                  userTranslation={userTranslation}
                  aiTranslation={aiTranslations["Gemini_번역"] || ''}
                  onHighlightWord={setHighlightWord}
                  highlightWord={highlightWord}
                />
                
                {/* 저장 버튼 */}
                <div className="mt-6 text-center">
                  <button
                    onClick={handleSaveRecord}
                    disabled={savingRecord || !currentUser}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                      currentUser && !savingRecord
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {savingRecord ? '저장 중...' : currentUser ? '번역 기록 저장하기' : '로그인 후 저장 가능'}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-gray-500 text-center">주제를 입력하고 문제를 생성해주세요.</div>
        )}
      </div>
    </div>
  );
}
