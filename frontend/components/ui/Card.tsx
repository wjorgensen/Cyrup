import { FC, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: FC<CardProps> = ({ children, className = '', hover = false }) => {
  return (
    <div
      className={`
        bg-white p-6 shadow-box
        ${hover ? 'hover-lift cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};