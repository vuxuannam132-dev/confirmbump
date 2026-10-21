import React from 'react';
import { Megaphone, Palette, Users, Box } from 'lucide-react';

export default function DepartmentBadge({ name, code, size = 'md' }) {
  let icon = <Box className="w-4 h-4 mr-1.5" />;
  let colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';

  if (code === 'TRUYEN_THONG' || name?.includes('Truyền')) {
    icon = <Megaphone className="w-4 h-4 mr-1.5 text-blue-600" />;
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (code === 'THIET_KE' || name?.includes('Thiết')) {
    icon = <Palette className="w-4 h-4 mr-1.5 text-amber-600" />;
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (code === 'NHAN_SU' || name?.includes('Nhân')) {
    icon = <Users className="w-4 h-4 mr-1.5 text-red-600" />;
    colorClasses = 'bg-red-50 text-red-700 border-red-200';
  } else if (code === 'HAU_CAN' || name?.includes('Hậu')) {
    icon = <Box className="w-4 h-4 mr-1.5 text-emerald-600" />;
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center rounded-full border ${colorClasses} ${sizeClasses}`}>
      {icon}
      <span>{name || 'Toàn Đoàn'}</span>
    </span>
  );
}
