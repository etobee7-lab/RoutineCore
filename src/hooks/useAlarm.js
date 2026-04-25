import { useState, useEffect } from 'react';

const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioContext = null;

export const ALARM_SOUNDS = [
  { id: 'chime', name: '🔔 차임벨', desc: '부드러운 3단 차임' },
  { id: 'beep', name: '📢 기본 비프', desc: '심플한 알림음' },
  { id: 'melody', name: '🎵 멜로디', desc: '도미솔 화음' },
  { id: 'urgent', name: '🚨 긴급 알람', desc: '빠른 반복음' },
  { id: 'soft', name: '🌙 부드러운 벨', desc: '은은한 알림' },
  { id: 'digital', name: '📱 디지털', desc: '전자 알림음' },
];

export const useAlarm = () => {
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const updateVoices = () => {
      try {
        setVoices(window.speechSynthesis.getVoices());
      } catch (e) { console.error("Voice load fail", e); }
    };
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
    updateVoices();
  }, []);

  const speakText = (text, voiceName, callback) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voicesList = window.speechSynthesis.getVoices();
      
      if (voiceName) {
        const voice = voicesList.find(v => v.name === voiceName);
        if (voice) utterance.voice = voice;
      } else {
        const preferredVoices = ['Google 한국어', 'Microsoft Heami', 'Microsoft Sun-Hi', 'Apple Yuna', 'Gaeul', 'Jinho'];
        let selectedVoice = null;
        for (const p of preferredVoices) {
          selectedVoice = voicesList.find(v => (v.name.includes(p)) && v.lang.includes('ko'));
          if (selectedVoice) break;
        }
        if (!selectedVoice) selectedVoice = voicesList.find(v => v.lang.includes('ko'));
        if (selectedVoice) utterance.voice = selectedVoice;
      }

      utterance.lang = 'ko-KR';
      utterance.rate = 1.1;
      utterance.pitch = 1.35;
      utterance.volume = 1.0;
      if (callback) utterance.onend = callback;
      setTimeout(() => window.speechSynthesis.speak(utterance), 100);
    } catch (err) { console.error("Speech Synthesis Failed:", err); }
  };

  const playAlarmSound = (soundId) => {
    try {
      if (!AudioCtx) return;
      if (!audioContext) audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') audioContext.resume();
      const ctx = audioContext;

      const playNote = (freq, startTime, duration, type = 'sine', vol = 0.25) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + startTime);
        osc.stop(ctx.currentTime + startTime + duration);
      };

      switch (soundId) {
        case 'chime':
          playNote(523, 0, 0.4, 'sine', 0.2);
          playNote(659, 0.25, 0.4, 'sine', 0.2);
          playNote(784, 0.5, 0.6, 'sine', 0.25);
          break;
        case 'beep':
          playNote(880, 0, 0.3, 'square', 0.15);
          playNote(880, 0.4, 0.3, 'square', 0.15);
          break;
        case 'melody':
          playNote(523, 0, 0.3, 'sine', 0.15);
          playNote(659, 0.2, 0.3, 'sine', 0.15);
          playNote(784, 0.4, 0.3, 'sine', 0.15);
          playNote(1047, 0.6, 0.5, 'sine', 0.2);
          break;
        case 'urgent':
          for (let i = 0; i < 6; i++) playNote(1000, i * 0.15, 0.1, 'square', 0.15);
          break;
        case 'soft':
          playNote(440, 0, 0.8, 'sine', 0.12);
          playNote(554, 0.1, 0.8, 'sine', 0.1);
          playNote(659, 0.2, 0.8, 'sine', 0.08);
          break;
        case 'digital':
          playNote(1200, 0, 0.15, 'square', 0.12);
          playNote(1500, 0.15, 0.15, 'square', 0.12);
          playNote(1200, 0.35, 0.15, 'square', 0.12);
          playNote(1500, 0.5, 0.15, 'square', 0.12);
          break;
        default:
          playNote(880, 0, 0.5, 'sine', 0.15);
      }
    } catch (e) { console.warn('Alarm sound failed', e); }
  };

  return { voices, speakText, playAlarmSound };
};
