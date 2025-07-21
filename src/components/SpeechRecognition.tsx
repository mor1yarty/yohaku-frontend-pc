'use client';

import { useState, useRef, useEffect } from 'react';
import { AmiVoiceClient, AmiVoiceConfig, AmiVoiceResult, ENGINE_OPTIONS } from '@/lib/amivoice';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useTimer } from '@/hooks/useTimer';
import { useVolumeMonitor } from '@/hooks/useVolumeMonitor';

export default function SpeechRecognition() {
  const [recognitionText, setRecognitionText] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [patientId] = useState<string>('P002');
  const [recordingDate, setRecordingDate] = useState<string>('');
  const [isRecordingComplete, setIsRecordingComplete] = useState<boolean>(false);
  const [selectedEngine, setSelectedEngine] = useState<string>('medical-meeting');
  
  const amiVoiceClientRef = useRef<AmiVoiceClient | null>(null);
  const { isRecording, startRecording, stopRecording, error: recordingError, stream } = useAudioRecorder();
  const { formattedTime, start: startTimer, stop: stopTimer, reset: resetTimer } = useTimer();
  const volume = useVolumeMonitor(stream);

  useEffect(() => {
    // 環境変数から設定を取得
    const serverURL = process.env.NEXT_PUBLIC_AMIVOICE_SERVER_URL || '';
    const authorization = process.env.NEXT_PUBLIC_AMIVOICE_API_KEY || '';
    
    console.log('Environment variables:', { 
      serverURL, 
      authorization: authorization ? 'SET' : 'NOT SET',
      authLength: authorization?.length,
      authPrefix: authorization?.substring(0, 10)
    });
    
    if (!serverURL || !authorization || authorization === 'your_api_key_here') {
      setError('環境変数にAmiVoice APIキーを設定してください (.env.localファイルのNEXT_PUBLIC_AMIVOICE_API_KEYを実際のAPIキーに変更)');
      return;
    }

    // 自動接続
    handleConnect(serverURL, authorization);
    
    // 現在の日時を設定
    const now = new Date();
    const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setRecordingDate(dateString);
  }, []);

  const handleConnect = async (serverURL: string, authorization: string) => {
    // 選択されたエンジンに基づいてgrammarFileNamesを設定
    const selectedEngineOption = ENGINE_OPTIONS.find((engine: any) => engine.id === selectedEngine);
    const grammarFileNames = selectedEngineOption?.grammarFileName || '-a-general';
    
    const config: AmiVoiceConfig = {
      serverURL,
      authorization,
      grammarFileNames,
    };

    const client = new AmiVoiceClient(config);
    
    client.setOnResult((result: AmiVoiceResult) => {
      if (result.isFinal) {
        setRecognitionText(prev => prev + result.text + ' ');
        setInterimText('');
      } else {
        setInterimText(result.text);
      }
    });

    client.setOnError((errorMsg: string) => {
      setError(errorMsg);
    });

    try {
      const connected = await client.connect();
      if (connected) {
        amiVoiceClientRef.current = client;
        setIsConnected(true);
        setError('');
      } else {
        setError('接続に失敗しました');
      }
    } catch (err) {
      setError('接続エラーが発生しました');
    }
  };

  const handleEngineChange = async (engineId: string) => {
    setSelectedEngine(engineId);
    
    // 現在の接続を切断
    if (amiVoiceClientRef.current) {
      amiVoiceClientRef.current.disconnect();
      amiVoiceClientRef.current = null;
      setIsConnected(false);
    }
    
    // 新しいエンジンで再接続
    const serverURL = process.env.NEXT_PUBLIC_AMIVOICE_SERVER_URL || '';
    const authorization = process.env.NEXT_PUBLIC_AMIVOICE_API_KEY || '';
    
    if (serverURL && authorization && authorization !== 'your_api_key_here') {
      // 少し待ってから再接続
      setTimeout(() => {
        handleConnect(serverURL, authorization);
      }, 500);
    }
  };

  const handleStartRecording = async () => {
    if (!isConnected || !amiVoiceClientRef.current) {
      setError('AmiVoice サーバーに接続されていません');
      return;
    }

    if (!amiVoiceClientRef.current.feedDataResume()) {
      setError('音声認識の開始に失敗しました');
      return;
    }

    resetTimer();
    startTimer();
    setIsRecordingComplete(false);
    setRecognitionText('');
    setInterimText('');

    setTimeout(async () => {
      await startRecording((audioData: ArrayBuffer) => {
        if (amiVoiceClientRef.current) {
          amiVoiceClientRef.current.feedData(audioData);
        }
      });
    }, 500);
  };

  const handleStopRecording = () => {
    if (amiVoiceClientRef.current) {
      amiVoiceClientRef.current.feedDataPause();
    }
    stopRecording();
    stopTimer();
    setIsRecordingComplete(true);
  };

  const handleSendToPC = () => {
    const data = {
      patientId,
      recordingDate,
      duration: formattedTime,
      transcription: recognitionText.trim()
    };
    
    console.log('PCに送信するデータ:', data);
    
    // TODO: 実際のPC送信処理を実装
    alert('データをPCに送信しました');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-lg font-semibold text-gray-900">患者詳細</div>
          <div className="flex space-x-4">
            <button className="p-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
            <button className="p-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        {/* 患者ID */}
        <div className="bg-blue-100 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">患者ID</div>
          <div className="text-2xl font-bold text-gray-900">{patientId}</div>
        </div>

        {/* エンジン選択 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">音声認識エンジン</h3>
          <div className="space-y-2">
            {ENGINE_OPTIONS.map((engine: any) => (
              <label key={engine.id} className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="engine"
                  value={engine.id}
                  checked={selectedEngine === engine.id}
                  onChange={(e: any) => handleEngineChange(e.target.value)}
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{engine.name}</div>
                  <div className="text-xs text-gray-500">{engine.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 音声記録 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">音声記録</h2>
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="text-sm text-blue-600">記録日時</div>
              <div className="text-blue-600">{recordingDate}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">使用エンジン</div>
              <div className="text-sm font-medium text-gray-900">
                {ENGINE_OPTIONS.find((e) => e.id === selectedEngine)?.name}
              </div>
            </div>
          </div>

          {/* タイマー */}
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-gray-900 mb-4">{formattedTime}</div>
            
            {/* 録音ボタンと接続状況 */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={!isConnected}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-orange-500 hover:bg-orange-600'
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {isRecording ? (
                  <div className="w-6 h-6 bg-white rounded-sm"></div>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              {/* 接続状況表示 */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? '接続済み' : '未接続'}
                </span>
                {isRecording && (
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">音量:</span>
                    <div className="w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-100"
                        style={{ width: `${Math.min(volume, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 認識結果 */}
          <div className="min-h-[150px] p-4 bg-gray-50 rounded-lg border text-sm leading-relaxed">
            {recognitionText && (
              <div className="text-gray-900 whitespace-pre-wrap">
                {recognitionText}
              </div>
            )}
            {interimText && (
              <div className="text-gray-500 italic">
                {interimText}
              </div>
            )}
            {!recognitionText && !interimText && (
              <div className="text-gray-400 text-center">
                音声認識結果がここに表示されます
              </div>
            )}
          </div>
        </div>

        {/* 使用方法 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-600 mb-2">使用方法：</div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 赤い録音ボタンを押して録音開始</li>
            <li>• 一時停止・再録音可能</li>
            <li>• 録音後、PCに送信してテキスト化</li>
          </ul>
        </div>

        {/* 録音完了ステータス */}
        {isRecordingComplete && (
          <div className="text-center">
            <div className="text-green-600 font-medium flex items-center justify-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>録音完了</span>
            </div>
          </div>
        )}

        {/* PCに送信ボタン */}
        <button
          onClick={handleSendToPC}
          disabled={!isRecordingComplete || !recognitionText.trim()}
          className="w-full bg-blue-900 text-white py-4 rounded-lg font-medium hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          PCに送信
        </button>

        {/* エラー表示 */}
        {(error || recordingError) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
            {error || recordingError}
          </div>
        )}
      </div>
    </div>
  );
}