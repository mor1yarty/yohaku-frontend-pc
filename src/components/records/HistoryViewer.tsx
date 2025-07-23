'use client';
import React from 'react';
import { User } from 'lucide-react';

type HistoryViewerProps = {
  patientName: string;
  patientId: string;
  age: number;
  department: string;
  room: string;
  recordedAt: string;
  recordType: string;
};

const HistoryViewer: React.FC<HistoryViewerProps> = ({
  patientName,
  patientId,
  age,
  department,
  room,
  recordedAt,
  recordType,
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow text-sm text-gray-800 space-y-2">
      <h3 className="text-[25px] font-semibold mb-2 flex items-center gap-2">
        <User className="w-5 h-5 text-[#3171CE]" />
        患者情報</h3>
        <div className="grid grid-cols-7 gap-x-4 gap-y-2 text-sm">
            <InfoBlock label="患者名" value="佐藤 百合" />
            <InfoBlock label="患者ID" value="P002" />
            <InfoBlock label="年齢" value="62歳" />
            <InfoBlock label="診療科" value="外科" />
            <InfoBlock label="病室" value="301号室" />
            <InfoBlock label="記録日時" value="2025-07-01 18:43" />
            <div className="flex flex-col gap-y-1">
                <p className="text-[#3171CE] text-sm">記録タイプ</p>
                <p className="bg-[#FCD8C5] text-[#EA580B] text-sm font-semibold px-3 py-1 rounded-full w-fit">
                音声記録
                </p>
            </div>
        </div>
    </div> 
    ); 
};

const InfoBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <p className="text-[#3171CE]">{label}</p>
    <p className="text-[20px] font-semibold">{value}</p>
  </div>
);

export default HistoryViewer;
