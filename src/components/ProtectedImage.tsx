import React from 'react';

interface ProtectedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export default function ProtectedImage({ containerClassName = '', className = '', style, ...props }: ProtectedImageProps) {
  return (
    <div 
      className={`relative ${containerClassName}`}
      onContextMenu={(e) => e.preventDefault()} // Chống click chuột phải
    >
      <img
        {...props}
        className={`select-none ${className}`}
        draggable={false} // Chống kéo thả ảnh ra ngoài
        onDragStart={(e) => e.preventDefault()}
        style={{ 
          WebkitUserDrag: 'none', 
          WebkitTouchCallout: 'none', // Chống nhấn giữ để lưu ảnh trên iOS/Safari
          ...style 
        } as React.CSSProperties}
      />
      {/* Lớp phủ trong suốt: Ngăn chặn các tool bắt link ảnh đơn giản bằng cách click đúp */}
      <div className="absolute inset-0 z-10" style={{ background: 'transparent' }} />
    </div>
  );
}
