import { useRef, useState, useEffect } from 'react';

export const useVolumeMonitor = (stream: MediaStream | null) => {
  const [volume, setVolume] = useState<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setVolume(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateVolume = () => {
        if (analyser) {
          analyser.getByteFrequencyData(dataArray);
          
          // 音量レベルを計算（0-100の範囲）
          const sum = dataArray.reduce((acc, value) => acc + value, 0);
          const average = sum / bufferLength;
          const volumeLevel = Math.round((average / 255) * 100);
          
          setVolume(volumeLevel);
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        }
      };

      updateVolume();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        source.disconnect();
        audioContext.close();
      };
    } catch (error) {
      console.error('Volume monitoring error:', error);
    }
  }, [stream]);

  return volume;
};