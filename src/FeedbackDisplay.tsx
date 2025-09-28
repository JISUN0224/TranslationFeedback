import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

// Gemini 피드백을 6개 항목으로 파싱
function parseFeedback6(feedback: string) {
  const sections = { summary: '', good: '', bad: '', recommend: '', learn: '', example: '' };
  const matches = feedback.match(/\d[\).\-] ?[\s\S]*?(?=\n\d[\).\-]|$)/g) || [];
  if (matches[0]) sections.summary = matches[0].replace(/^1[\).\-] ?/, '').trim();
  if (matches[1]) sections.good = matches[1].replace(/^2[\).\-] ?/, '').trim();
  if (matches[2]) sections.bad = matches[2].replace(/^3[\).\-] ?/, '').trim();
  if (matches[3]) sections.recommend = matches[3].replace(/^4[\).\-] ?/, '').trim();
  if (matches[4]) sections.learn = matches[4].replace(/^5[\).\-] ?/, '').trim();
  if (matches[5]) sections.example = matches[5].replace(/^6[\).\-] ?/, '').trim();
  const isEmpty = Object.values(sections).every(v => !v || v.trim() === '');
  const summaryTooLong = sections.summary.length > feedback.length * 0.8;
  if (isEmpty || summaryTooLong) {
    return {
      summary: feedback,
      good: '',
      bad: '',
      recommend: '',
      learn: '',
      example: ''
    };
  }
  return sections;
}

function extractQuotedPhrases(text: string) {
  const matches = text.match(/"([^"]+)"/g) || [];
  return matches.map(m => m.replace(/"/g, ''));
}

function cleanSectionText(text: string, sectionTitle: string) {
  return text.replace(new RegExp(`^${sectionTitle}\s*:?`, 'i'), '').trim();
}

function formatSectionText(text: string, sectionKey: string) {
  let t = text;
  if (sectionKey === 'learn') {
    t = t.replace(/(언어별 특성 고려:)/g, '\n**$1**\n');
    t = t.replace(/(문장 분할 및 재조합 연습:)/g, '\n**$1**\n');
  }
  t = t.replace(/\s*● /g, '\n\n● ');
  t = t.replace(/^\n+/, '');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (/[一-龯]+/.test(text) === false) {
      utterance.lang = 'zh-CN';
    } else {
      utterance.lang = 'ko-KR';
    }
    window.speechSynthesis.speak(utterance);
  } else {
    alert('이 브라우저는 음성 합성을 지원하지 않습니다.');
  }
};

interface FeedbackDisplayProps {
  feedback: string;
  originalText?: string;
  userTranslation?: string;
  aiTranslation?: string;
  onHighlightWord?: (word: string | null) => void;
  highlightWord?: string | null;
}

function normalizeBullets(text: string) {
  return text.replace(/^[ \t]*[●•*-]/gm, '‧');
}

export default function FeedbackDisplay(props: FeedbackDisplayProps) {
  const { feedback, originalText, userTranslation, aiTranslation, onHighlightWord, highlightWord } = props;
  const normalizedFeedback = normalizeBullets(feedback);
  const sections = parseFeedback6(normalizedFeedback);
  const allPhrases = Array.from(new Set([
    ...extractQuotedPhrases(sections.summary),
    ...extractQuotedPhrases(sections.good),
    ...extractQuotedPhrases(sections.bad),
    ...extractQuotedPhrases(sections.recommend),
    ...extractQuotedPhrases(sections.learn),
  ]));

  function renderTextWithHighlight(text: string) {
    if (!highlightWord) return <span>{text}</span>;
    const regex = new RegExp(`(${highlightWord})`, 'g');
    return text.split(regex).map((part, idx) =>
      part === highlightWord ? (
        <span key={idx} className="bg-yellow-200 font-bold rounded px-1">{part}</span>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
  }

  function renderFeedbackWithClickableQuotes(text: string, enableHighlight: boolean = true) {
    const parts = text.split(/"([^"]+)"/g);
    return parts.map((part, idx) => {
      if (idx % 2 === 1 && allPhrases.includes(part) && enableHighlight) {
        return (
          <span
            key={idx}
            className="bg-yellow-200 font-bold rounded px-1 cursor-pointer"
            onMouseEnter={() => onHighlightWord && onHighlightWord(part)}
            onMouseLeave={() => onHighlightWord && onHighlightWord(null)}
            style={{ position: 'relative', transition: 'background 0.2s' }}
          >
            "{part}"
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  }

  function removeDuplicateSubtitle(text: string, sectionTitle: string) {
    const regex = new RegExp(`^([*]{2})?${sectionTitle}([*]{2})?( 항목)?:?`, 'i');
    return text.replace(regex, '').trim();
  }

  function renderExampleSection(text: string) {
    const lines = text.split('\n').filter(line => line.trim());
    const renderedSections: any[] = [];
    let currentGroup: {type: string, content: string, idx: number}[] = [];
    let groupCount = 0;
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      if (line.trim().match(/^[‧]\s*/)) {
        const content = line.replace(/^[‧]\s*/, '').trim();
        if (content.includes('중요 표현') && (content.includes(':') || content.includes('：') || content.includes('→'))) {
          if (currentGroup.length > 0) {
            renderedSections.push(renderExampleGroup(currentGroup, groupCount));
          }
          groupCount++;
          currentGroup = [{
            type: 'expression',
            content: content,
            idx: idx
          }];
        } else if (content.includes('원문 예문') || content.includes('예문 번역')) {
          if (currentGroup.length > 0) {
            currentGroup.push({
              type: content.includes('원문 예문') ? 'original' : 'translation',
              content: content,
              idx: idx
            });
          } else {
            renderedSections.push(renderGeneralItem(content, idx));
          }
        } else {
          renderedSections.push(renderGeneralItem(content, idx));
        }
      } else if (line.trim() === '') {
        renderedSections.push(<br key={idx} />);
      } else {
        renderedSections.push(
          <div key={idx} style={{ marginBottom: '4px', lineHeight: '1.6' }}>
            {line}
          </div>
        );
      }
    }
    if (currentGroup.length > 0) {
      renderedSections.push(renderExampleGroup(currentGroup, groupCount));
    }
    return renderedSections;
  }

  function renderExampleGroup(group: any[], groupNum: number) {
    return (
      <div key={`group-${groupNum}`} style={{ marginBottom: '24px' }}>
        {groupNum > 1 && (
          <div style={{
            margin: '20px 0',
            borderTop: '2px dashed #e0e7ff',
            position: 'relative'
          }}>
            <span style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#fff',
              padding: '0 12px',
              fontSize: '0.85em',
              color: '#6366f1',
              fontWeight: 'bold'
            }}>
              예문 {groupNum}
            </span>
          </div>
        )}
        <div style={{
          border: '2px solid #e0e7ff',
          borderRadius: '12px',
          padding: '16px',
          backgroundColor: '#fafbff'
        }}>
          {group.map((item, itemIdx) => {
            if (item.type === 'expression') {
              return (
                <div key={item.idx} style={{ 
                  marginBottom: '12px', 
                  padding: '12px', 
                  backgroundColor: '#e0f2fe', 
                  borderRadius: '8px', 
                  border: '1px solid #0284c7',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: '1.6' }}>
                    <span style={{ fontSize: '0.92em', color: '#666', fontWeight: 'bold', flexShrink: 0 }}>‧</span>
                    <div style={{ flex: 1, fontWeight: 'bold', color: '#0f4c75' }}>{item.content}</div>
                  </div>
                </div>
              );
            } else if (item.type === 'original') {
              return (
                <div key={item.idx} style={{ 
                  marginBottom: '8px', 
                  padding: '12px', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: '1.6' }}>
                    <span style={{ fontSize: '0.92em', color: '#666', fontWeight: 'bold', flexShrink: 0 }}>‧</span>
                    <div style={{ flex: 1, fontWeight: 'bold', color: '#1e40af' }}>{item.content}</div>
                  </div>
                </div>
              );
            } else if (item.type === 'translation') {
              const colonIndex = Math.max(item.content.indexOf(':'), item.content.indexOf('：'));
              const translationText = colonIndex !== -1 ? item.content.substring(colonIndex + 1).trim() : item.content;
              return (
                <div key={item.idx} style={{ 
                  marginBottom: itemIdx === group.length - 1 ? '0' : '8px', 
                  padding: '12px', 
                  backgroundColor: '#fef3c7', 
                  borderRadius: '8px', 
                  border: '1px solid #fbbf24',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px', lineHeight: '1.6' }}>
                    <span style={{ fontSize: '0.92em', color: '#666', fontWeight: 'bold', flexShrink: 0 }}>‧</span>
                    <span style={{ fontWeight: 'bold', color: '#92400e' }}>
                      {item.content.substring(0, colonIndex + 1)}
                    </span>
                    <button
                      onClick={() => speakText(translationText)}
                      style={{
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={e => {
                        (e.target as HTMLElement).style.background = '#d97706';
                        (e.target as HTMLElement).style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={e => {
                        (e.target as HTMLElement).style.background = '#f59e0b';
                        (e.target as HTMLElement).style.transform = 'scale(1)';
                      }}
                      title="음성으로 듣기"
                    >
                      🔊
                    </button>
                  </div>
                  <div style={{ marginLeft: '24px', fontSize: '1.05em', lineHeight: '1.5' }}>
                    {translationText}
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  }

  function renderGeneralItem(content: string, idx: number) {
    return (
      <div key={idx} style={{ 
        marginBottom: '8px',
        padding: '8px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #f3f4f6'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: '1.6' }}>
          <span style={{ fontSize: '0.92em', color: '#666', fontWeight: 'bold', flexShrink: 0 }}>‧</span>
          <div style={{ flex: 1 }}>{content}</div>
        </div>
      </div>
    );
  }

  function renderFormattedText(text: string, enableHighlight: boolean = true, sectionKey: string = '') {
    if (sectionKey === 'example') {
      return renderExampleSection(text);
    }
    let cleanText = text;
    if (sectionKey === 'good') cleanText = removeDuplicateSubtitle(text, '좋은 점');
    if (sectionKey === 'bad') cleanText = removeDuplicateSubtitle(text, '아쉬운 점');
    if (sectionKey === 'recommend') cleanText = removeDuplicateSubtitle(text, '추천 표현');
    if (sectionKey === 'learn') cleanText = removeDuplicateSubtitle(text, '학습 제안');
    if (sectionKey === 'summary') cleanText = removeDuplicateSubtitle(text, '종합 평가');
    const bulletPoints = cleanText.split(/\n\s*(?=[‧])/).filter(line => line.trim());
    return bulletPoints.map((line, idx) => {
      if (line.trim().match(/^[‧]\s*/)) {
        const content = line.replace(/^[‧]\s*/, '');
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', lineHeight: '1.6' }}>
            <span className="feedback-dot" style={{ flexShrink: 0 }}>‧</span>
            <div style={{ flex: 1 }}>
              {renderFeedbackWithClickableQuotes(content, enableHighlight)}
            </div>
          </div>
        );
      } else if (line.trim() === '') {
        return <br key={idx} />;
      } else {
        return (
          <div key={idx} style={{ marginBottom: '4px', lineHeight: '1.6' }}>
            {renderFeedbackWithClickableQuotes(line, enableHighlight)}
          </div>
        );
      }
    });
  }

  let score = 0;
  const scoreMatch = sections.summary.match(/([0-9]{1,3}(?:\.[0-9])?)\s*\/\s*([0-9]{1,3})(?:점)?/);
  if (scoreMatch) {
    score = Math.round((parseFloat(scoreMatch[1]) / parseFloat(scoreMatch[2])) * 100);
  } else {
    const altMatch = sections.summary.match(/([0-9]{1,3}(?:\.[0-9])?)점/);
    if (altMatch) {
      score = Math.round(parseFloat(altMatch[1]) * 10);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] py-10 px-2">
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-4 mb-10">
          <div className="flex-1 bg-white rounded-xl shadow p-5 border-b-4 border-blue-200 flex flex-col items-start">
            <div className="font-bold text-blue-700 mb-2 text-lg">원문</div>
            <div className="text-gray-800 text-base">{renderTextWithHighlight(originalText || '')}</div>
          </div>
          <div className="flex-1 bg-white rounded-xl shadow p-5 border-b-4 border-blue-200 flex flex-col items-start">
            <div className="font-bold text-blue-700 mb-2 text-lg">AI 번역</div>
            <div className="text-gray-800 text-base">{renderTextWithHighlight(aiTranslation || '')}</div>
          </div>
          <div className="flex-1 bg-white rounded-xl shadow p-5 border-b-4 border-yellow-200 flex flex-col items-start">
            <div className="font-bold text-yellow-700 mb-2 text-lg">내 번역</div>
            <div className="text-gray-800 text-base">{renderTextWithHighlight(userTranslation || '')}</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 border-l-8 mb-8 font-sans" style={{borderColor:'#2563eb',wordBreak:'break-all',overflowWrap:'break-word',textAlign:'left',padding:'24px', fontFamily:'Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif', marginBottom:'24px'}}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{fontSize:'1.3em'}}>🟦</span>
            <span className="font-bold text-lg" style={{color:'#2563eb'}}>1. 종합 평가</span>
          </div>
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0">
              <div className="w-24 h-24">
                <CircularProgressbar
                  value={score}
                  maxValue={100}
                  text={`${score}`}
                  styles={buildStyles({
                    textColor: '#2563eb',
                    pathColor: '#2563eb',
                    trailColor: '#e0e7ff',
                    textSize: '1.8rem',
                    pathTransitionDuration: 0.5,
                  })}
                />
              </div>
              <div className="text-center mt-1 font-bold text-sm text-blue-700">총점</div>
            </div>
            <div className="flex-1 text-justify text-base" style={{padding:'0 4px', fontFamily:"'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'SimSun', 'Noto Sans KR', 'Apple SD Gothic Neo', Arial, sans-serif"}}>
              {renderFormattedText(formatSectionText(cleanSectionText(sections.summary, '종합 평가'), 'summary'))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          {[
            {title:'좋은 점/분석', color:'#2563eb', icon:'✅', key:'good'},
            {title:'아쉬운 점', color:'#f59e42', icon:'⚠️', key:'bad'},
            {title:'추천 표현/개선', color:'#10b981', icon:'💡', key:'recommend'},
            {title:'학습 제안', color:'#6366f1', icon:'📚', key:'learn'},
            {title:'주요 표현/예문', color:'#f43f5e', icon:'📝', key:'example'}
          ].map((meta, idx) => (
            <div key={meta.key} className="bg-white rounded-xl shadow p-6 border-l-8 font-sans" style={{borderColor:meta.color,wordBreak:'break-all',overflowWrap:'break-word',textAlign:'left',padding:'24px', fontFamily:'Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif'}}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{fontSize:'1.3em'}}>{meta.icon}</span>
                <span className="font-bold text-lg" style={{color:meta.color}}>{idx+2}. {meta.title}</span>
              </div>
              <div className="text-justify text-base" style={{padding:'0 4px', fontFamily:"'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'SimSun', 'Noto Sans KR', 'Apple SD Gothic Neo', Arial, sans-serif"}}>
                {renderFormattedText(formatSectionText(cleanSectionText(sections[meta.key as keyof typeof sections] || '', meta.title), meta.key), meta.key !== 'example', meta.key)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .text-justify {
          text-align: justify;
        }
        .feedback-dot {
          font-size: 0.92em;
          color: #666;
          font-weight: bold;
        }
        .highlighted-phrase:hover::after {
          content: '상단에서 위치 확인';
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%);
          background: #333;
          color: #fff;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.92em;
          white-space: nowrap;
          margin-top: 6px;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0,0,0,0.13);
        }
      `}</style>
    </div>
  );
}
