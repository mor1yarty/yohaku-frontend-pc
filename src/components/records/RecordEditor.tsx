'use client';
import React from 'react';

type RecordEditorProps = {
  summary: string;
  duration: string;
};

const RecordEditor: React.FC<RecordEditorProps> = ({
  summary,
  duration,
}) => {
  const charCount = summary.length; 
    
  return (
    <div className="bg-white p-6 rounded-xl shadow text-sm text-gray-800 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold">説明内容（要約）</h3>
        <span className="bg-[#64748B] text-[#000] text-sm font-semibold px-3 py-1 rounded-full w-fit">
            録音時間：{duration}
        </span>
      </div>

      <div className="leading-relaxed text-sm text-gray-700 whitespace-pre-line border border-gray-300 rounded-md p-3 h-[14rem] overflow-y-auto">
        {summary}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-[#3171CE]">文字数：{charCount}</span>
        <div className="space-x-2">
          <button className="px-4 py-1 bg-[#F9F9FA] text-sm rounded border">コピー</button>
          <button className="px-4 py-1 bg-[#203B7E] text-white text-sm rounded">登録</button>
          <button className="px-4 py-1 bg-[#203B7E] text-white text-sm rounded">電子カルテ転記済み</button>
        </div>
      </div>

      <p className="text-xs text-[#EA580B] text-right">
        コピーした要約は必ず電子カルテに転記をお願いします。
      </p>
    </div>
  );
};

export default RecordEditor;
