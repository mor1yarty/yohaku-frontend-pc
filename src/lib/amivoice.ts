export interface AmiVoiceConfig {
  serverURL: string;
  authorization: string;
  codec?: string;
  grammarFileNames?: string;
  enableFiltering?: boolean;
  engine?: 'general' | 'medical-meeting' | 'medical-input';
}

export interface EngineOption {
  id: string;
  name: string;
  description: string;
  grammarFileName: string;
}

export const ENGINE_OPTIONS: EngineOption[] = [
  {
    id: 'general',
    name: '汎用エンジン',
    description: '一般的な日本語音声認識',
    grammarFileName: '-a-general'
  },
  {
    id: 'medical-meeting',
    name: '医療会議',
    description: '医療会議・診察の音声認識に最適',
    grammarFileName: '-a-medical'
  },
  {
    id: 'medical-input',
    name: '医療汎用',
    description: '医療文書・カルテ入力に最適',
    grammarFileName: '-a-medical-input'
  }
];

export interface AmiVoiceResult {
  text: string;
  confidence?: number;
  isFinal: boolean;
}

export class AmiVoiceClient {
  private ws: WebSocket | null = null;
  private config: AmiVoiceConfig;
  private onResult?: (result: AmiVoiceResult) => void;
  private onError?: (error: string) => void;
  private isConnected = false;
  private sessionStarted = false;
  private codecIndex = 0;
  private supportedCodecs = ['MSB16K', '16K', 'LSB16K', 'ADPCM'];
  private audioBuffer: Int16Array[] = [];
  private bufferSize = 0;
  private readonly MIN_BUFFER_SIZE = 1600; // 約100ms分のデータ (16kHz * 0.1s) - 安定した認識のため
  private readonly FILTER_WORDS = ['以上', 'いじょう', 'イジョウ']; // フィルタリングする不要な語句

  constructor(config: AmiVoiceConfig) {
    this.config = config;
  }

  setOnResult(callback: (result: AmiVoiceResult) => void) {
    this.onResult = callback;
  }

  setOnError(callback: (error: string) => void) {
    this.onError = callback;
  }

  async connect(): Promise<boolean> {
    try {
      const baseUrl = this.config.serverURL || 'wss://acp-api.amivoice.com/v1/';
      
      this.ws = new WebSocket(baseUrl);

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(false);
          return;
        }

        this.ws.onopen = () => {
          this.isConnected = true;
          this.codecIndex = 0; // 接続時にコーデックインデックスをリセット
          this.audioBuffer = []; // バッファもリセット
          this.bufferSize = 0;
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          this.onError?.(`WebSocket error: ${error}`);
          reject(false);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.sessionStarted = false;
          this.audioBuffer = [];
          this.bufferSize = 0;
        };
      });
    } catch (error) {
      this.onError?.(`Connection error: ${error}`);
      return false;
    }
  }

  private handleMessage(data: string) {
    try {
      console.log('Received message:', data);
      // イベントタイプを確認
      const firstChar = data.charAt(0);
      
      if (firstChar === 'U' || firstChar === 'A') {
        // U: 途中結果、A: 最終結果
        console.log(`[${new Date().toISOString()}] Recognition result received (${firstChar}):`, data);
        const jsonPart = data.substring(2); // 最初の2文字（イベントタイプとスペース）をスキップ
        try {
          const result = JSON.parse(jsonPart);
          console.log('Parsed result:', result);
          
          if (result.text) {
            const isInterim = firstChar === 'U';
            const isFinal = firstChar === 'A';
            
            // 中間結果は軽いフィルタリングのみ、最終結果は完全フィルタリング
            const finalText = isFinal && this.config.enableFiltering !== false 
              ? this.filterText(result.text) 
              : result.text;
            
            // 中間結果は空でも送信（UI更新のため）、最終結果は内容がある場合のみ
            if (isInterim || (isFinal && finalText.trim().length > 0)) {
              this.onResult?.({
                text: finalText,
                confidence: result.confidence,
                isFinal: isFinal
              });
            }
          }
        } catch (parseError) {
          console.error('Failed to parse result JSON:', parseError, 'Data:', jsonPart);
        }
      } else if (firstChar === 's') {
        // セッション開始応答
        console.log('Session started response received:', data);
        
        // エラーメッセージのチェック
        if (data.includes('unsupported') || data.includes('error') || data.includes('failed') || data.includes("can't verify")) {
          if (data.includes("can't verify")) {
            this.onError?.(`認証エラー: APIキーを確認してください (${data})`);
            return;
          }
          
          console.log(`Codec ${this.supportedCodecs[this.codecIndex]} failed, trying next...`);
          this.codecIndex++;
          
          if (this.codecIndex < this.supportedCodecs.length) {
            // 次のコーデックを試す（接続は維持したまま）
            console.log(`Trying codec: ${this.supportedCodecs[this.codecIndex]}`);
            setTimeout(() => {
              if (this.isConnected && this.ws) {
                this.tryNextCodec();
              }
            }, 100);
            return;
          } else {
            this.onError?.(`All codecs failed. Last error: ${data}`);
            return;
          }
        }
        
        // セッション開始の確認ができたので、sessionStartedフラグを立てる
        console.log(`Session started successfully with codec: ${this.supportedCodecs[this.codecIndex]}`);
        this.sessionStarted = true;
      } else if (firstChar === 'e') {
        // セッション終了応答
        console.log('Session ended');
        this.sessionStarted = false;
      } else if (firstChar === 'S') {
        // 発話検出開始
        console.log('Utterance started - speech detected!');
      } else if (firstChar === 'E') {
        // 発話終了検出
        console.log('Utterance ended - speech stopped');
      } else if (firstChar === 'C') {
        // 音声認識処理開始
        console.log('Recognition processing started');
      } else {
        console.log('Unknown message type:', data);
      }
    } catch (error) {
      this.onError?.(`Parse error: ${error}`);
    }
  }

  private tryNextCodec(): boolean {
    if (!this.isConnected || !this.ws) {
      console.log('Cannot start session: not connected');
      return false;
    }
    
    try {
      const codec = this.supportedCodecs[this.codecIndex];
      const grammarFile = this.config.grammarFileNames || '-a-general';
      const authorization = this.config.authorization;
      
      // APIキーの形式を確認してログ出力
      console.log('API Key format check:', {
        length: authorization.length,
        startsWith: authorization.substring(0, 10),
        hasSpecialChars: /[^a-zA-Z0-9_-]/.test(authorization)
      });
      
      // 安定した認識のためのコマンド形式
      const command = `s ${codec} ${grammarFile} authorization=${authorization} resultUpdatedInterval=1000 keepFillerToken=0`;
      console.log('Sending session start command:', command);
      this.ws.send(command);
      return true;
    } catch (error) {
      this.onError?.(`Feed resume error: ${error}`);
      return false;
    }
  }

  feedDataResume(): boolean {
    if (!this.isConnected || !this.ws) {
      console.log('Cannot start session: not connected');
      return false;
    }
    
    try {
      // 設定されたコーデックまたは順番に試す
      const codec = this.config.codec && this.config.codec !== '-' ? this.config.codec : this.supportedCodecs[this.codecIndex];
      const grammarFile = this.config.grammarFileNames || '-a-general';
      const authorization = this.config.authorization;
      
      // APIキーの形式を確認
      console.log('API Key validation:', {
        length: authorization.length,
        startsWith: authorization.substring(0, 10),
        format: /^[a-zA-Z0-9_-]+$/.test(authorization) ? 'valid' : 'invalid'
      });
      
      // 安定した認識のためのコマンド形式
      const command = `s ${codec} ${grammarFile} authorization=${authorization} resultUpdatedInterval=1000 keepFillerToken=0`;
      console.log('Sending session start command:', command);
      this.ws.send(command);
      // セッション開始フラグは応答を受け取ってから設定する
      return true;
    } catch (error) {
      this.onError?.(`Feed resume error: ${error}`);
      return false;
    }
  }

  feedData(audioData: ArrayBuffer): boolean {
    if (!this.isConnected || !this.ws || !this.sessionStarted) {
      console.log('Cannot send audio data: not connected or session not started');
      return false;
    }

    try {
      // PCMデータをバッファに追加
      const pcmData = new Int16Array(audioData);
      this.audioBuffer.push(pcmData);
      this.bufferSize += pcmData.length;

      // より頻繁な送信で逐次認識を改善
      if (this.bufferSize >= this.MIN_BUFFER_SIZE) {
        this.flushBuffer();
      }
      
      return true;
    } catch (error) {
      this.onError?.(`Feed data error: ${error}`);
      return false;
    }
  }

  private flushBuffer(): void {
    if (this.audioBuffer.length === 0 || !this.ws) return;

    try {
      // バッファされたデータを結合
      const totalBuffer = new Int16Array(this.bufferSize);
      let offset = 0;
      
      for (const chunk of this.audioBuffer) {
        totalBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // バイト配列に変換（リトルエンディアン）
      const byteArray = new Uint8Array(totalBuffer.buffer);
      
      // pコマンドプレフィックスを追加
      const prefix = new TextEncoder().encode('p ');
      const combined = new Uint8Array(prefix.length + byteArray.length);
      combined.set(prefix, 0);
      combined.set(byteArray, prefix.length);
      
      console.log(`[${new Date().toISOString()}] Sending audio: ${byteArray.length} bytes (${this.bufferSize} samples)`);
      this.ws.send(combined);

      // バッファをクリア
      this.audioBuffer = [];
      this.bufferSize = 0;
    } catch (error) {
      this.onError?.(`Buffer flush error: ${error}`);
    }
  }

  feedDataPause(): boolean {
    if (!this.isConnected || !this.ws) {
      return false;
    }

    try {
      // 残りのバッファをフラッシュ
      if (this.bufferSize > 0) {
        console.log('Flushing remaining buffer before ending session');
        this.flushBuffer();
      }
      
      // 少し待ってからセッション終了
      setTimeout(() => {
        if (this.ws) {
          this.ws.send('e');
          this.sessionStarted = false;
        }
      }, 100);
      
      return true;
    } catch (error) {
      this.onError?.(`Feed pause error: ${error}`);
      return false;
    }
  }

  disconnect() {
    if (this.ws) {
      if (this.sessionStarted) {
        this.feedDataPause();
      }
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.sessionStarted = false;
    }
  }

  isConnectionOpen(): boolean {
    return this.isConnected;
  }

  private filterText(text: string): string {
    let filteredText = text;
    
    // 最終結果のみ文末の不要語句を除去（より慎重に）
    for (const filterWord of this.FILTER_WORDS) {
      // 文末の語句のみを除去
      const endPattern = new RegExp(`\\s*${filterWord}\\s*$`, 'gi');
      filteredText = filteredText.replace(endPattern, '');
    }
    
    // 末尾の句読点や空白をクリーンアップ
    filteredText = filteredText.replace(/[。、\s]+$/, '').trim();
    
    if (text !== filteredText) {
      console.log(`Filtered text: "${text}" -> "${filteredText}"`);
    }
    return filteredText;
  }
}