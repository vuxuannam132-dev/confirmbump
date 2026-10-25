import React, { useState } from 'react';
import { 
  Flame, 
  Shield, 
  Zap, 
  Star, 
  Sparkles, 
  Heart, 
  Trophy, 
  Compass, 
  Crown, 
  User 
} from 'lucide-react';

export const AVATAR_PRESETS = [
  { id: 'icon:flame:#EF4444', icon: 'flame', name: 'Nhiệt Huyết', color: '#EF4444', border: 'border-red-400' },
  { id: 'icon:shield:#2563EB', icon: 'shield', name: 'Bảo Vệ', color: '#2563EB', border: 'border-blue-400' },
  { id: 'icon:zap:#F59E0B', icon: 'zap', name: 'Xung Kích', color: '#F59E0B', border: 'border-amber-400' },
  { id: 'icon:star:#EAB308', icon: 'star', name: 'Ngôi Sao', color: '#EAB308', border: 'border-yellow-400' },
  { id: 'icon:sparkles:#8B5CF6', icon: 'sparkles', name: 'Sáng Tạo', color: '#8B5CF6', border: 'border-purple-400' },
  { id: 'icon:heart:#EC4899', icon: 'heart', name: 'Tình Nguyện', color: '#EC4899', border: 'border-pink-400' },
  { id: 'icon:trophy:#10B981', icon: 'trophy', name: 'Thành Tích', color: '#10B981', border: 'border-emerald-400' },
  { id: 'icon:compass:#06B6D4', icon: 'compass', name: 'Tiên Phong', color: '#06B6D4', border: 'border-cyan-400' },
  { id: 'icon:crown:#6366F1', icon: 'crown', name: 'Thủ Lĩnh', color: '#6366F1', border: 'border-indigo-400' },
  { id: 'icon:user:#64748B', icon: 'user', name: 'Đoàn Viên', color: '#64748B', border: 'border-slate-400' }
];

export function renderPresetIcon(iconName, className = 'w-1/2 h-1/2 text-white') {
  switch (iconName) {
    case 'flame': return <Flame className={className} />;
    case 'shield': return <Shield className={className} />;
    case 'zap': return <Zap className={className} />;
    case 'star': return <Star className={className} />;
    case 'sparkles': return <Sparkles className={className} />;
    case 'heart': return <Heart className={className} />;
    case 'trophy': return <Trophy className={className} />;
    case 'compass': return <Compass className={className} />;
    case 'crown': return <Crown className={className} />;
    case 'user':
    default:
      return <User className={className} />;
  }
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px] rounded-lg',
  sm: 'w-8 h-8 text-xs rounded-xl',
  md: 'w-10 h-10 text-sm rounded-2xl',
  lg: 'w-14 h-14 text-base rounded-2xl',
  xl: 'w-20 h-20 text-2xl rounded-3xl'
};

export default function UserAvatar({ user, size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const avatarVal = user?.avatar_url || '';
  const fullName = user?.full_name || user?.username || 'U';
  const initial = fullName.charAt(0).toUpperCase();

  // 1. Preset icon avatar
  if (avatarVal.startsWith('icon:')) {
    const parts = avatarVal.split(':');
    const iconName = parts[1] || 'user';
    const bgColor = parts[2] || '#2563EB';

    return (
      <div 
        className={`${sizeClass} flex items-center justify-center flex-shrink-0 shadow-xs select-none transition-transform ${className}`}
        style={{ backgroundColor: bgColor }}
        title={fullName}
      >
        {renderPresetIcon(iconName, 'w-1/2 h-1/2 text-white fill-white/20')}
      </div>
    );
  }

  // 2. Custom Image URL avatar
  if (avatarVal && !imgError && (avatarVal.startsWith('http') || avatarVal.startsWith('data:image'))) {
    return (
      <div className={`${sizeClass} flex-shrink-0 overflow-hidden shadow-xs relative bg-slate-100 dark:bg-slate-800 ${className}`}>
        <img 
          src={avatarVal} 
          alt={fullName}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // 3. Fallback Initial Letter
  return (
    <div 
      className={`${sizeClass} bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 text-white font-black flex items-center justify-center flex-shrink-0 shadow-xs select-none ${className}`}
      title={fullName}
    >
      {initial}
    </div>
  );
}
