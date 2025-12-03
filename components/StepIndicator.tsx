import React from 'react';
import { AppStep } from '../types';
import { CheckCircle2, PenTool, BookOpen, CloudDownload, CloudUpload } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: AppStep;
  canSync?: boolean;
  onSyncDownload?: () => void;
  onSyncUpload?: () => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, canSync, onSyncDownload, onSyncUpload }) => {
  
  const steps = [
    { id: AppStep.INPUT_SOURCE, label: 'Source', icon: BookOpen },
    { id: AppStep.PRACTICE_BACK_TRANSLATION, label: 'Practice', icon: PenTool },
  ];

  const getStepStatus = (stepId: AppStep, index: number) => {
    const stepOrder = [AppStep.INPUT_SOURCE, AppStep.TRANSLATING_TO_TARGET, AppStep.PRACTICE_BACK_TRANSLATION, AppStep.ANALYZING, AppStep.RESULTS];
    const currentIndex = stepOrder.indexOf(currentStep);
    const targetIndex = stepOrder.indexOf(stepId);
    
    // Map intermediate loading states to the main visual steps
    let effectiveCurrentIndex = currentIndex;
    if (currentStep === AppStep.TRANSLATING_TO_TARGET) effectiveCurrentIndex = 0; 
    if (currentStep === AppStep.ANALYZING) effectiveCurrentIndex = 2; 

    // Adjust target index for the visual array (which is smaller than the enum)
    // This is a simplified mapping logic for display only
    const visualIndex = index; // 0, 1, 2

    // Map effective logic
    let isActive = false;
    let isCompleted = false;

    if (visualIndex === 0) {
       isActive = currentStep === AppStep.INPUT_SOURCE || currentStep === AppStep.TRANSLATING_TO_TARGET;
       isCompleted = effectiveCurrentIndex > 1;
    } else if (visualIndex === 1) {
       isActive = currentStep === AppStep.PRACTICE_BACK_TRANSLATION || currentStep === AppStep.ANALYZING;
       isCompleted = effectiveCurrentIndex > 3;
    }

    return { isActive, isCompleted };
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-gray-200 -z-10"></div>

        {/* Source Step (index 0) */}
        {(() => {
          const sourceStep = steps[0];
          const { isActive, isCompleted } = getStepStatus(sourceStep.id, 0);
          const Icon = sourceStep.icon;
          return (
            <div key={sourceStep.id} className="flex flex-col items-center bg-gray-50 px-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300
                  ${isCompleted
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : isActive
                      ? 'bg-white border-brand-600 text-brand-600 shadow-lg scale-110'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
              >
                {isCompleted ? <CheckCircle2 size={20} /> : <Icon size={20} />}
              </div>
              <span className={`text-xs font-medium mt-2 ${isActive ? 'text-brand-700' : 'text-gray-500'}`}>
                {sourceStep.label}
              </span>
            </div>
          );
        })()}

        {/* Pull Icon */}
        {canSync && (
          <div className="flex flex-col items-center bg-gray-50 px-2">
            <button
              onClick={onSyncDownload}
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white border-gray-300 text-gray-500 hover:border-brand-500 hover:text-brand-600 hover:shadow-md transition-colors duration-300"
              title="Sync from WebDAV (Pull)"
            >
              <CloudDownload size={18} />
            </button>
            <span className="text-xs font-medium mt-2 text-gray-500">
              Down
            </span>
          </div>
        )}

        {/* Practice Step (index 1) */}
        {(() => {
          const practiceStep = steps[1];
          const { isActive, isCompleted } = getStepStatus(practiceStep.id, 1);
          const Icon = practiceStep.icon;
          return (
            <div key={practiceStep.id} className="flex flex-col items-center bg-gray-50 px-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300
                  ${isCompleted
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : isActive
                      ? 'bg-white border-brand-600 text-brand-600 shadow-lg scale-110'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
              >
                {isCompleted ? <CheckCircle2 size={20} /> : <Icon size={20} />}
              </div>
              <span className={`text-xs font-medium mt-2 ${isActive ? 'text-brand-700' : 'text-gray-500'}`}>
                {practiceStep.label}
              </span>
            </div>
          );
        })()}

        {/* Push Icon */}
        {canSync && (
          <div className="flex flex-col items-center bg-gray-50 px-2">
            <button
              onClick={onSyncUpload}
              className="w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white border-gray-300 text-gray-500 hover:border-brand-500 hover:text-brand-600 hover:shadow-md transition-colors duration-300"
              title="Sync to WebDAV (Push)"
            >
              <CloudUpload size={18} />
            </button>
            <span className="text-xs font-medium mt-2 text-gray-500">
              Up
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepIndicator;