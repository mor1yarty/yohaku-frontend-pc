import Header from '@/components/records/Header';

export default function Page() {
  return (
    <main className="min-h-screen bg-[#F9F9FA]">
      <Header title="TLB DX" userName="木村 健一医師" />
      <div className="px-6 py-4">
        <h2 className="text-base font-semibold text-gray-800 mb-4">記録確認・編集</h2>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-4">カード 1（開発中）</div>
          <div className="bg-white rounded-2xl shadow p-4">カード 2（開発中）</div>
          <div className="bg-white rounded-2xl shadow p-4">カード 3（開発中）</div>
        </div>
      </div>


    </main>
  );
}
