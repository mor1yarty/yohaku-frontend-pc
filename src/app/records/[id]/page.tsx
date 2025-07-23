import Header from '@/components/records/Header';
import HistoryViewer from '@/components/records/HistoryViewer';
import RecordEditor from '@/components/records/RecordEditor';

const Page = () => {
  // 将来的にはここで API や DB からデータ取得する想定
  const patientInfo = {
    patientName: '佐藤 百合',
    patientId: 'P002',
    age: 62,
    department: '外科',
    room: '301号室',
    recordedAt: '2025-07-01 18:43',
    recordType: '音声記録',
  };

  const recordData = {
    summary: `今回の膵臓の手術についてです。膵臓に石がたまって痛いので、手術で取り除きます。
手術の方法は主に２つ：
・腹腔鏡（ふくくうきょう）手術：お腹に小さな穴をいくつか開けて、カメラを見ながら手術をします。
・良い点：小さくすみ、痛みが少なめ、回復も早いです。
・悪い点：まれに合併症が出たり、状況により手術を中止する可能性があります。また、まれにお腹を大きく開ける手術に切り替わることもあります。

・開腹手術（かいふくしゅじゅつ）：お腹を少し大きく開けて手術します。

・麻酔は全身麻酔で行います。手術時間はだいたい1〜2時間くらい、入院は腹腔鏡なら3〜4日、開腹なら1週間くらいが目安です。
・麻酔は安全ですが、手術中は痛みを感じません。ただし、麻酔でもまれにアレルギーや肺炎などのリスクがあります。`,
    duration: '13分30秒',
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
            <li className="grid grid-cols-[20%_1fr_auto] items-center py-2">
              <p>初回作成</p>
              <p>音声認識により自動生成</p>
              <p className="text-right">2025-07-01 19:01</p>
            </li>
            <li className="grid grid-cols-[20%_1fr_auto] items-center py-2">
              <p>現在編集中</p>
              <p>木村医師による編集</p>
              <p className="text-right">進行中</p>
            </li>
          </ul>
        </div>
      </main>
    </>
  );
};

export default Page;