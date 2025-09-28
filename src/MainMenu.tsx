import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import Tour from './components/Tour';

export default function MainMenu() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      // 로그인하지 않은 사용자에게만 자동으로 튜토리얼 시작
      if (!user && !localStorage.getItem('tourCompleted')) {
        setShowTour(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      // 로그인 실패
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      // 로그아웃 실패
    }
  };

  const handleExistingProblems = () => {
    navigate('/existing-problems');
  };

  const handleAIGeneratedProblems = () => {
    navigate('/ai-generated');
  };

  const handleTranslationHistory = () => {
    if (currentUser) {
      navigate('/translation-history');
    }
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  const handleTourClose = () => {
    setShowTour(false);
    localStorage.setItem('tourCompleted', 'true');
  };


  const tourSteps = [
    {
      target: '[data-tour="existing-problems"]',
      content: '미리 준비된 다양한 번역 문제들을 풀어보세요.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="ai-generated"]',
      content: '원하는 주제와 난이도로 AI가 맞춤형 문제를 생성해드립니다.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-tour="login-button"]',
      content: 'Google 계정으로 로그인하여 번역 기록을 저장하고 관리할 수 있습니다.',
      placement: 'left' as const,
    },
    {
      target: '[data-tour="translation-history"]',
      content: '로그인 후 이전에 저장한 번역 기록들을 확인할 수 있습니다.',
      placement: 'top' as const,
    },
    {
      target: '[data-tour="dashboard"]',
      content: '학습 현황과 성과를 한눈에 확인할 수 있는 대시보드입니다.',
      placement: 'top' as const,
    },
  ];

  if (loading) {
    return (
      <div className="bg-gray-100 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header with login/logout button */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div></div>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  안녕하세요, {currentUser.displayName || currentUser.email}님!
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                data-tour="login-button"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-none mx-auto p-8 text-center">
          {/* Main title and description */}
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">4.3.2 번역 피드백 시스템</h1>
          <p className="text-lg text-gray-600 mb-12">
            한국어를 중국어로 번역하고 AI의 상세한 피드백을 받아보세요.
          </p>

          {/* Options for problem generation */}
          <div className="flex flex-wrap justify-center gap-20">
            {/* Card for "기존 문제" */}
            <div 
              className="bg-white border-2 border-transparent rounded-2xl shadow-lg p-8 min-w-[320px] flex flex-col items-center transition-all duration-200 hover:transform hover:-translate-y-2 hover:shadow-xl cursor-pointer" 
              onClick={handleExistingProblems}
              data-tour="existing-problems"
            >
              <div className="w-20 h-20 bg-blue-100 rounded-full flex justify-center items-center mb-6">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h2m-2 4h2m4-4h2m-2 4h2"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">기존 문제</h3>
              <p className="text-sm text-gray-500 text-center mb-6">미리 준비된 다양한 문제를 풀어보세요</p>
              <button className="bg-blue-500 text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:bg-blue-600 transition-colors">
                시작하기
              </button>
            </div>

            {/* Card for "AI 생성 문제" */}
            <div 
              className="bg-white border-2 border-transparent rounded-2xl shadow-lg p-8 min-w-[320px] flex flex-col items-center transition-all duration-200 hover:transform hover:-translate-y-2 hover:shadow-xl cursor-pointer" 
              onClick={handleAIGeneratedProblems}
              data-tour="ai-generated"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex justify-center items-center mb-6">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 01-1.022 1.022l-2.007 2.007c-.128.129-.267.252-.409.364.63.116 1.282.181 1.942.181 3.033 0 5.5-2.467 5.5-5.5s-2.467-5.5-5.5-5.5-5.5 2.467-5.5 5.5c0 .66.065 1.312.181 1.942-.112.142-.235.281-.364.409l-2.007 2.007a2 2 0 01-1.022 1.022m9.428-9.428a2 2 0 00-2-2m2 2a2 2 0 002 2m-2 2l-1.428 1.428m-2.5-2.5L7.714 19.428"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">AI 생성 문제</h3>
              <p className="text-sm text-gray-500 text-center mb-6">원하는 주제, 난이도로 문제를 풀어보세요</p>
              <button className="bg-green-500 text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:bg-green-600 transition-colors">
                시작하기
              </button>
            </div>

            {/* Card for "번역 히스토리" */}
            <div 
              className={`border-2 rounded-2xl shadow-lg p-8 min-w-[320px] flex flex-col items-center transition-all duration-200 ${
                currentUser 
                  ? 'bg-white border-transparent hover:transform hover:-translate-y-2 hover:shadow-xl cursor-pointer' 
                  : 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
              }`}
              onClick={currentUser ? handleTranslationHistory : undefined}
              data-tour="translation-history"
            >
              <div className={`w-20 h-20 rounded-full flex justify-center items-center mb-6 ${
                currentUser ? 'bg-purple-100' : 'bg-gray-200'
              }`}>
                <svg className={`w-10 h-10 ${currentUser ? 'text-purple-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${currentUser ? 'text-gray-800' : 'text-gray-500'}`}>
                번역 히스토리
              </h3>
              <p className={`text-sm text-center mb-6 ${currentUser ? 'text-gray-500' : 'text-gray-400'}`}>
                {currentUser ? '저장된 번역 기록을 확인하세요' : '로그인 후 이용 가능합니다'}
              </p>
              <button 
                className={`font-semibold py-3 px-6 rounded-full shadow-lg transition-colors ${
                  currentUser 
                    ? 'bg-purple-500 text-white hover:bg-purple-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!currentUser}
              >
                {currentUser ? '확인하기' : '로그인 필요'}
              </button>
            </div>

            {/* Card for "대시보드" */}
            <div 
              className="bg-white border-2 border-transparent rounded-2xl shadow-lg p-8 min-w-[320px] flex flex-col items-center transition-all duration-200 hover:transform hover:-translate-y-2 hover:shadow-xl cursor-pointer" 
              onClick={handleDashboard}
              data-tour="dashboard"
            >
              <div className="w-20 h-20 bg-orange-100 rounded-full flex justify-center items-center mb-6">
                <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">학습 대시보드</h3>
              <p className="text-sm text-gray-500 text-center mb-6">학습 현황과 성과를 한눈에 확인하세요</p>
              <button className="bg-orange-500 text-white font-semibold py-3 px-6 rounded-full shadow-lg hover:bg-orange-600 transition-colors">
                대시보드 보기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tour component */}
      {showTour && (
        <Tour
          steps={tourSteps}
          isOpen={showTour}
          onClose={handleTourClose}
        />
      )}
    </div>
  );
}