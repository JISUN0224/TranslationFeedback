import { useState, useEffect, useRef } from 'react';

interface TourStep {
  target: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

interface TourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
}

export default function Tour({ steps, isOpen, onClose }: TourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetPosition, setTargetPosition] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const getTargetPosition = () => {
    const targetElement = document.querySelector(steps[currentStep]?.target);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        width: rect.width,
        height: rect.height,
        right: rect.right + scrollLeft,
        bottom: rect.bottom + scrollTop,
      } as DOMRect;
    }
    return null;
  };

  const updateTargetPosition = () => {
    const position = getTargetPosition();
    setTargetPosition(position);
  };

  useEffect(() => {
    if (!isOpen) return;

    updateTargetPosition();

    const handleResize = () => {
      updateTargetPosition();
    };

    const handleScroll = () => {
      updateTargetPosition();
    };

    // MutationObserver to detect DOM changes (like zoom)
    const observer = new MutationObserver(() => {
      updateTargetPosition();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      observer.disconnect();
    };
  }, [isOpen, currentStep, steps]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = () => {
    onClose();
  };

  if (!isOpen || !targetPosition) {
    return null;
  }

  const getTooltipPosition = () => {
    const padding = 20;
    const tooltipWidth = 300;
    const tooltipHeight = 150;

    let top = 0;
    let left = 0;

    switch (steps[currentStep].placement) {
      case 'top':
        top = targetPosition.top - tooltipHeight - padding;
        left = targetPosition.left + (targetPosition.width - tooltipWidth) / 2;
        break;
      case 'bottom':
        top = targetPosition.bottom + padding;
        left = targetPosition.left + (targetPosition.width - tooltipWidth) / 2;
        break;
      case 'left':
        top = targetPosition.top + (targetPosition.height - tooltipHeight) / 2;
        left = targetPosition.left - tooltipWidth - padding;
        break;
      case 'right':
        top = targetPosition.top + (targetPosition.height - tooltipHeight) / 2;
        left = targetPosition.right + padding;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 0) left = 10;
    if (left + tooltipWidth > viewportWidth) left = viewportWidth - tooltipWidth - 10;
    if (top < 0) top = 10;
    if (top + tooltipHeight > viewportHeight) top = viewportHeight - tooltipHeight - 10;

    return { top, left };
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={skipTour}
      />
      
      {/* Highlight box */}
      <div
        className="absolute border-4 border-blue-500 bg-transparent pointer-events-none"
        style={{
          top: targetPosition.top - 4,
          left: targetPosition.left - 4,
          width: targetPosition.width + 8,
          height: targetPosition.height + 8,
          borderRadius: '8px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute bg-white rounded-lg shadow-xl p-6 max-w-sm"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          zIndex: 1000,
        }}
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-600">
              {currentStep + 1} / {steps.length}
            </span>
            <button
              onClick={skipTour}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-gray-800 leading-relaxed">
            {steps[currentStep].content}
          </p>
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded text-sm font-medium ${
              currentStep === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            이전
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={skipTour}
              className="px-4 py-2 rounded text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              건너뛰기
            </button>
            <button
              onClick={nextStep}
              className="px-4 py-2 rounded text-sm font-medium bg-blue-500 text-white hover:bg-blue-600"
            >
              {currentStep === steps.length - 1 ? '완료' : '다음'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}