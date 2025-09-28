import { useState } from 'react';

interface InsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  insightText: string;
  onGenerateDetailed: () => Promise<string>;
}

export default function InsightModal({ isOpen, onClose, insightText, onGenerateDetailed }: InsightModalProps) {
  const [detailedInsight, setDetailedInsight] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);

  const handleGenerateDetailed = async () => {
    if (showDetailed) return;
    
    setIsGenerating(true);
    try {
      const detailed = await onGenerateDetailed();
      setDetailedInsight(detailed);
      setShowDetailed(true);
    } catch (error) {
      // 상세 인사이트 생성 실패
      setDetailedInsight('상세 인사이트를 생성하는 중 오류가 발생했습니다.');
      setShowDetailed(true);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">💡 학습 인사이트</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 기본 인사이트 */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">현재 인사이트</h3>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-gray-800 leading-relaxed">{insightText}</p>
          </div>
        </div>

        {/* 상세 인사이트 생성 버튼 */}
        {!showDetailed && (
          <div className="text-center mb-6">
            <button
              onClick={handleGenerateDetailed}
              disabled={isGenerating}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
                isGenerating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:transform hover:-translate-y-1'
              }`}
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  AI가 분석 중...
                </div>
              ) : (
                '🤖 AI 상세 분석 받기'
              )}
            </button>
          </div>
        )}

        {/* 상세 인사이트 */}
        {showDetailed && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">AI 상세 분석</h3>
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border-l-4 border-green-500">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  AI
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                    {detailedInsight}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-3">
          {showDetailed && (
            <button
              onClick={() => {
                setShowDetailed(false);
                setDetailedInsight('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              다시 분석하기
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
