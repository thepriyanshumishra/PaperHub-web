import React from 'react';

interface UserAvatarProps {
  gender?: 'male' | 'female' | 'other' | null;
  imageUrl?: string | null;
  name?: string;
  className?: string;
}

export function UserAvatar({ gender, imageUrl, name = 'Student', className = 'w-10 h-10' }: UserAvatarProps) {
  // If a valid custom image URL is provided, display it
  if (imageUrl && imageUrl !== '/default-avatar.png') {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${className} rounded-full object-cover border border-border-primary/50 shadow-sm`}
        onError={(e) => {
          // Fallback if image fails to load
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }

  // Render vector SVGs based on gender
  const activeGender = gender || 'male';

  if (activeGender === 'female') {
    return (
      <div className={`${className} rounded-full overflow-hidden shrink-0 relative bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 border border-purple-400/30 shadow-md flex items-center justify-center select-none`}>
        {/* Vector representation of a student girl */}
        <svg viewBox="0 0 100 100" className="w-full h-full object-cover">
          {/* Background Gradient Highlights */}
          <circle cx="50" cy="50" r="50" fill="none" />
          <circle cx="30" cy="30" r="25" fill="white" fillOpacity="0.08" />

          {/* Hair (Back) */}
          <path d="M 24 40 C 20 55, 20 70, 24 80 C 28 85, 32 80, 32 70 Z" fill="#2d2522" />
          <path d="M 76 40 C 80 55, 80 70, 76 80 C 72 85, 68 80, 68 70 Z" fill="#2d2522" />

          {/* Neck */}
          <rect x="45" y="60" width="10" height="15" rx="3" fill="#fed1a5" />

          {/* Face */}
          <circle cx="50" cy="45" r="22" fill="#fed1a5" />

          {/* Hair (Front - Bob cut / Bangs) */}
          <path d="M 28 45 C 28 25, 72 25, 72 45 C 72 38, 68 32, 50 32 C 32 32, 28 38, 28 45 Z" fill="#3a302c" />
          <path d="M 28 40 C 35 48, 45 42, 45 42 C 45 42, 55 48, 72 40 C 65 30, 35 30, 28 40 Z" fill="#2d2522" />

          {/* Eyes */}
          <circle cx="42" cy="46" r="2.5" fill="#1e1816" />
          <circle cx="41.5" cy="45.2" r="0.8" fill="#ffffff" />
          <circle cx="58" cy="46" r="2.5" fill="#1e1816" />
          <circle cx="57.5" cy="45.2" r="0.8" fill="#ffffff" />

          {/* Cheeks */}
          <circle cx="37" cy="51" r="2.5" fill="#f87171" fillOpacity="0.4" />
          <circle cx="63" cy="51" r="2.5" fill="#f87171" fillOpacity="0.4" />

          {/* Smile */}
          <path d="M 47 53 Q 50 56, 53 53" stroke="#b91c1c" strokeWidth="1.2" strokeLinecap="round" fill="none" />

          {/* Hoodie (Purple) */}
          <path d="M 25 80 C 25 72, 38 67, 50 67 C 62 67, 75 72, 75 80 L 75 100 L 25 100 Z" fill="#7c3aed" />
          {/* Inner collar */}
          <path d="M 40 67 L 50 78 L 60 67 Z" fill="#5b21b6" />
          {/* Shirt */}
          <path d="M 44 70 L 50 78 L 56 70 Z" fill="#ffffff" />
          {/* Hoodie strings */}
          <line x1="43" y1="73" x2="43" y2="84" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="43" cy="85" r="1.2" fill="#e2e8f0" />
          <line x1="57" y1="73" x2="57" y2="84" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="57" cy="85" r="1.2" fill="#e2e8f0" />
        </svg>
      </div>
    );
  }

  // Default: Male student avatar
  return (
    <div className={`${className} rounded-full overflow-hidden shrink-0 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 border border-purple-400/30 shadow-md flex items-center justify-center select-none`}>
      {/* Vector representation of a student boy */}
      <svg viewBox="0 0 100 100" className="w-full h-full object-cover">
        {/* Background Gradient Highlights */}
        <circle cx="50" cy="50" r="50" fill="none" />
        <circle cx="30" cy="30" r="25" fill="white" fillOpacity="0.08" />

        {/* Neck */}
        <rect x="45" y="60" width="10" height="15" rx="3" fill="#fed1a5" />

        {/* Face */}
        <circle cx="50" cy="45" r="22" fill="#fed1a5" />

        {/* Hair (Spiky Boy Cut) */}
        <path d="M 28 40 C 25 32, 32 20, 50 20 C 68 20, 75 32, 72 40 C 72 34, 68 25, 50 25 C 32 25, 28 34, 28 40 Z" fill="#221c1a" />
        <path d="M 26 36 C 30 25, 40 22, 50 24 C 60 22, 70 25, 74 36 C 68 28, 60 27, 50 29 C 40 27, 32 28, 26 36 Z" fill="#2d2522" />
        <path d="M 40 22 L 46 16 L 48 22 Z" fill="#2d2522" />
        <path d="M 52 22 L 58 15 L 60 22 Z" fill="#2d2522" />

        {/* Eyes */}
        <circle cx="42" cy="46" r="2.5" fill="#1e1816" />
        <circle cx="41.5" cy="45.2" r="0.8" fill="#ffffff" />
        <circle cx="58" cy="46" r="2.5" fill="#1e1816" />
        <circle cx="57.5" cy="45.2" r="0.8" fill="#ffffff" />

        {/* Cheeks */}
        <circle cx="36" cy="51" r="1.5" fill="#f87171" fillOpacity="0.3" />
        <circle cx="64" cy="51" r="1.5" fill="#f87171" fillOpacity="0.3" />

        {/* Smile */}
        <path d="M 46 53 Q 50 57, 54 53" stroke="#b91c1c" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Hoodie (Purple) */}
        <path d="M 25 80 C 25 72, 38 67, 50 67 C 62 67, 75 72, 75 80 L 75 100 L 25 100 Z" fill="#6d28d9" />
        {/* Inner collar */}
        <path d="M 40 67 L 50 78 L 60 67 Z" fill="#4c1d95" />
        {/* Shirt */}
        <path d="M 44 70 L 50 78 L 56 70 Z" fill="#ffffff" />
        {/* Hoodie strings */}
        <line x1="43" y1="73" x2="43" y2="84" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="43" cy="85" r="1.2" fill="#e2e8f0" />
        <line x1="57" y1="73" x2="57" y2="84" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="57" cy="85" r="1.2" fill="#e2e8f0" />
      </svg>
    </div>
  );
}
