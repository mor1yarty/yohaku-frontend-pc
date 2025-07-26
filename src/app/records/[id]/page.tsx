'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/records/Header';
import HistoryViewer from '@/components/records/HistoryViewer';
import RecordEditor from '@/components/records/RecordEditor';

type EditHistory = {
  history_id: number;
  edit_type: string;
  description: string;
  user_name: string;
  created_at: string;
};

type RecordResponse = {
  record_id: number;
  patient: {
    patient_code: string;
    name: string;
    age: number;
    room_number: string;
  };
  record_type: string;
  status: string;
  summary_text: string;
  character_count: number;
  duration_seconds: number;
  is_transferred_to_ehr: boolean;
  created_at: string;
  updated_at: string;
  edit_histories: EditHistory[];
};

const Page = () => {
  const [data, setData] = useState<RecordResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const recordId = 1; // ← 将来的にはURLパラメータから取得可能

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await fetch(
          `https://b2ba7e421g.execute-api.ap-southeast-2.amazonaws.com/v1/records/${recordId}`
        );
        const json = await res.json();
        setData(json.data);
      } catch (err) {
        console.error('データ取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, []);

  if (loading) return <div className="p-4">読み込み中...</div>;
  if (!data) return <div className="p-4">データが取得できませんでした</div>;

  const patientInfo = {
    patientName: data.patient.name,
    patientId: data.patient.patient_code,
    age: data.patient.age,
    department: '外科', // APIにないので仮置き
    room: data.patient.room_number,
    recordedAt: data.created_at.replace('T', ' ').slice(0, 16),
    recordType: data.record_type === 'ic_record' ? '音声記録' : data.record_type,
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  const recordData = {
    summary: data.summary_text,
    duration: formatDuration(data.duration_seconds),
  };

  return (
    <>
      <Header title="記録一覧" userName="木村 健一医師" />
      <main className="min-h-screen bg-[#F9F9FA] px-6 py-4 space-y-4">
        <h2 className="text-[20px] font-semibold text-gray-800">記録確認・編集</h2>
        <HistoryViewer {...patientInfo} />
        <RecordEditor {...recordData} />

        <div className="bg-white rounded-2xl shadow p-4 space-y-3">
          <h3 className="text-[25px] font-semibold text-gray-800">編集履歴</h3>
          <ul className="divide-y divide-gray-200">
            {data.edit_histories.map((history) => (
              <li key={history.history_id} className="grid grid-cols-[20%_1fr_auto] items-center py-2">
                <p>{history.edit_type === 'create' ? '初回作成' : '編集'}</p>
                <p>{history.description}</p>
                <p className="text-right">
                  {history.created_at.replace('T', ' ').slice(0, 16)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
};

export default Page;