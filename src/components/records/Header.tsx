'use client';
import React from 'react';

type HeaderProps = {
  title?: string;
  userName?: string;
};

const Header: React.FC<HeaderProps> = ({
  title = 'タイトル',
  userName = '医師名',
}) => {
  return (
    <header
      className="flex justify-between items-center bg-white px-4 py-3 sm:px-6 sm:py-4"
      style={{
        fontFamily: `'Hiragino Sans', 'Yu Gothic', sans-serif`,
        fontSize: '14px',
        lineHeight: '1.4',
        fontWeight: 'normal',
      }}
    >
      <h1 className="text-gray-800">{title}</h1>
      <div className="text-gray-800">
        <span className="mr-4">{userName}</span>
        <span className="text-blue-500 cursor-pointer">ログアウト</span>
      </div>
    </header>
  );
};

export default Header;
