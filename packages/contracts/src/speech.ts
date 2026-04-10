export type SpeechTranscriptionMode = "dictation" | "voice_call";

export interface SpeechTranscriptionResult {
  text: string;
  durationMs: number;
  provider?: string;
}

export interface SpeechSynthesisRequest {
  text: string;
  conversationId?: string;
  characterId?: string;
  voice?: string;
}

export interface SpeechSynthesisResult {
  audioUrl: string;
  mimeType: string;
  fileName: string;
  provider?: string;
  voice?: string;
  durationMs: number;
}

export interface VoiceCallTurnResult {
  conversationId: string;
  characterId: string;
  characterName: string;
  userTranscript: string;
  assistantText: string;
  assistantAudioUrl: string;
  assistantAudioFileName: string;
  assistantAudioMimeType: string;
  transcriptionDurationMs: number;
  synthesisDurationMs: number;
  totalDurationMs: number;
  provider?: string;
  userMessageId: string;
  assistantMessageId: string;
}
