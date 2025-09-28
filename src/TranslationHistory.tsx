import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, getUserTranslationRecords, deleteTranslationRecord, deleteMultipleTranslationRecords } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import './App.css';

export default function TranslationHistory() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  // 사용자 인증 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        loadUserRecords(user.uid);
      } else {
        setRecords([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadUserRecords = async (userId: string) => {
    try {
      setLoading(true);
      const userRecords = await getUserTranslationRecords(userId);
      setRecords(userRecords);
    } catch (err) {
      setError('번역 기록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      // 로그아웃 실패
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ko-KR');
  };

  // 체크박스 선택/해제 처리
  const handleRecordSelect = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  // 전체 선택/해제 처리
  const handleSelectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(record => record.id)));
    }
  };

  // 개별 삭제 처리
  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm('이 번역 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      setDeleting(true);
      await deleteTranslationRecord(recordId);
      setRecords(records.filter(record => record.id !== recordId));
      setSelectedRecords(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(recordId);
        return newSelected;
      });
    } catch (error) {
      setError('삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  // 선택된 항목들 일괄 삭제 처리
  const handleDeleteSelected = async () => {
    if (selectedRecords.size === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택된 ${selectedRecords.size}개의 번역 기록을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      setDeleting(true);
      await deleteMultipleTranslationRecords(Array.from(selectedRecords));
      setRecords(records.filter(record => !selectedRecords.has(record.id)));
      setSelectedRecords(new Set());
    } catch (error) {
      setError('삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">로그인이 필요합니다</h2>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
          >
            메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-2">
      <div className="w-full max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigate('/')}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
              ← 메인 메뉴로
            </button>
            <h1 className="text-3xl font-bold text-purple-600">번역 히스토리</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {currentUser.email}
              </span>
              <button 
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
          <p className="text-gray-600">나의 번역 기록을 확인해보세요</p>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600">번역 기록을 불러오는 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* 번역 기록 목록 */}
        {!loading && records.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">아직 번역 기록이 없습니다</h3>
            <p className="text-gray-500 mb-6">번역 문제를 풀어보시면 여기에 기록이 저장됩니다.</p>
            <div className="space-x-4">
              <button 
                onClick={() => navigate('/existing-problems')}
                className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
              >
                기존 문제 풀기
              </button>
              <button 
                onClick={() => navigate('/ai-generated')}
                className="bg-green-500 text-white px-6 py-2 rounded-md hover:bg-green-600"
              >
                AI 문제 생성
              </button>
            </div>
          </div>
        )}

        {/* 번역 기록 카드들 */}
        {!loading && records.length > 0 && (
          <>
            {/* 선택 및 삭제 컨트롤 */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRecords.size === records.length && records.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      전체 선택 ({selectedRecords.size}/{records.length})
                    </span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedRecords.size === 0 || deleting}
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        삭제 중...
                      </>
                    ) : (
                      <>
                        <span>🗑️</span>
                        선택 삭제 ({selectedRecords.size})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {records.map((record, index) => (
              <div key={record.id} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedRecords.has(record.id)}
                      onChange={() => handleRecordSelect(record.id)}
                      className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 mt-1"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        번역 기록 #{records.length - index}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(record.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {record.difficulty && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {record.difficulty}
                      </span>
                    )}
                    {record.topic && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {record.topic}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteRecord(record.id)}
                      disabled={deleting}
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title="이 기록 삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">원문</h4>
                    <p className="text-gray-800">{record.originalText}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">내 번역</h4>
                    <p className="text-gray-800">{record.userTranslation}</p>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold text-gray-700 mb-2">AI 번역</h4>
                  <p className="text-gray-800">{record.aiTranslation}</p>
                </div>

                {record.feedback && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">피드백</h4>
                    <div className="text-gray-800 text-sm whitespace-pre-line max-h-32 overflow-y-auto">
                      {record.feedback}
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
