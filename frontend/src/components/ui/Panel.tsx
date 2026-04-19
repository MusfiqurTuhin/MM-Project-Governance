import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

const Panel: React.FC<PanelProps> = ({ children, className = '', hoverable = false, onClick }) => {
  return (
    <div onClick={onClick} className={`glass-panel p-6 rounded-[2.5rem] relative overflow-hidden transition-all duration-300 ${hoverable ? 'hover:border-white/20' : ''} ${className}`}>
      {children}
    </div>
  );
};

export default Panel;
