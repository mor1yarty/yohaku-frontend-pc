import { useRef, useState, useCallback } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  error: string | null;
}

export const useAudioRecorder = () => {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const onDataAvailableRef = useRef<((audioData: ArrayBuffer) => void) | null>(null);

  const startRecording = useCallback(async (onDataAvailable?: (audioData: ArrayBuffer) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
      });

      streamRef.current = stream;
      onDataAvailableRef.current = onDataAvailable || null;

      // AudioContextを作成
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // AudioWorkletが利用可能かチェック
      if (audioContext.audioWorklet) {
        try {
          // AudioWorkletプロセッサーを登録
          await audioContext.audioWorklet.addModule(
            URL.createObjectURL(new Blob([`
              class PCMProcessor extends AudioWorkletProcessor {
                process(inputs, outputs, parameters) {
                  const input = inputs[0];
                  if (input.length > 0) {
                    const inputChannel = input[0];
                    if (inputChannel.length > 0) {
                      // Float32ArrayをInt16Arrayに変換
                      const pcmData = new Int16Array(inputChannel.length);
                      for (let i = 0; i < inputChannel.length; i++) {
                        const sample = Math.max(-1, Math.min(1, inputChannel[i]));
                        pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                      }
                      
                      // メインスレッドにデータを送信
                      this.port.postMessage({
                        type: 'audio-data',
                        data: pcmData.buffer
                      });
                    }
                  }
                  return true;
                }
              }
              
              registerProcessor('pcm-processor', PCMProcessor);
            `], { type: 'application/javascript' }))
          );

          // AudioWorkletNodeを作成
          const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
          workletNodeRef.current = workletNode;

          // メッセージを受信
          workletNode.port.onmessage = (event) => {
            if (event.data.type === 'audio-data' && onDataAvailableRef.current) {
              console.log('AudioWorklet: Sending audio data:', event.data.data.byteLength, 'bytes');
              onDataAvailableRef.current(event.data.data);
            }
          };

          // ノードを接続
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(workletNode);
          workletNode.connect(audioContext.destination);

        } catch (workletError) {
          console.warn('AudioWorklet failed, falling back to ScriptProcessor:', workletError);
          // フォールバック: ScriptProcessorNodeを使用
          await startWithScriptProcessor(audioContext, stream);
        }
      } else {
        // フォールバック: ScriptProcessorNodeを使用
        await startWithScriptProcessor(audioContext, stream);
      }

      setState({
        isRecording: true,
        isPaused: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording',
      }));
    }
  }, []);

  const startWithScriptProcessor = async (audioContext: AudioContext, stream: MediaStream) => {
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1); // 安定した音声処理のためのバッファサイズ

    processor.onaudioprocess = (event) => {
      if (onDataAvailableRef.current) {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Float32ArrayをInt16Arrayに変換
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
        
        console.log('ScriptProcessor: Sending audio data:', pcmData.buffer.byteLength, 'bytes');
        onDataAvailableRef.current(pcmData.buffer);
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    // クリーンアップ用に保存
    mediaRecorderRef.current = { audioContext, source, processor } as any;
  };

  const stopRecording = useCallback(() => {
    if (state.isRecording) {
      // AudioWorkletNodeのクリーンアップ
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }

      // ScriptProcessorのクリーンアップ
      if (mediaRecorderRef.current) {
        const { audioContext, source, processor } = mediaRecorderRef.current as any;
        
        if (processor) {
          processor.disconnect();
        }
        if (source) {
          source.disconnect();
        }
      }

      // AudioContextのクリーンアップ
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
      }));
    }
  }, [state.isRecording]);

  const pauseRecording = useCallback(() => {
    if (state.isRecording && !state.isPaused) {
      if (audioContextRef.current) {
        audioContextRef.current.suspend();
      }
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (state.isRecording && state.isPaused) {
      if (audioContextRef.current) {
        audioContextRef.current.resume();
      }
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.isRecording, state.isPaused]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearError,
    stream: streamRef.current,
  };
};