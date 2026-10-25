import React from 'react';
import { FileText, Clock, Settings } from 'lucide-react';

export default function BottomNavBar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'tasks', label: 'Nhiệm Vụ', icon: FileText },
    { id: 'history', label: 'Lịch Sử', icon: Clock },
    { id: 'settings', label: 'Cài Đặt', icon: Settings },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 lg:hidden">
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-full shadow-2xl border border-slate-200 dark:border-slate-700 px-2 py-2 backdrop-blur-md">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center justify-center w-16 h-14 rounded-full transition-all duration-200 active:scale-90 ${
              activeTab === id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-0.5">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
