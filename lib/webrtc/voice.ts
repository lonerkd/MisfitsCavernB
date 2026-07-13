

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface VoicePeer {
  id: string;
  name: string;
  avatar?: string;
  speaking: boolean;
  connected: boolean;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface PeerState {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  analyser?: AnalyserNode;
  pendingIce: RTCIceCandidateInit[];
  hasRemoteDesc: boolean;
}

export function useVoiceRoom(channelId: string, me: { id: string; name: string; avatar?: string } | null, joined: boolean) {
  const [peers, setPeers] = useState<VoicePeer[]>([]);
  const [muted, setMuted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const chanRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rosterRef = useRef<Map<string, { name: string; avatar?: string }>>(new Map());

  const syncPeerList = useCallback(() => {
    const list: VoicePeer[] = [];
    rosterRef.current.forEach((meta, id) => {
      if (id === me?.id) return;
      const ps = peersRef.current.get(id);
      list.push({ id, name: meta.name, avatar: meta.avatar, speaking: false, connected: ps?.pc.connectionState === 'connected' });
    });
    setPeers(prev => list.map(p => ({ ...p, speaking: prev.find(q => q.id === p.id)?.speaking || false })));
  }, [me?.id]);

  const attachSpeakingMeter = useCallback((stream: MediaStream, cb: (on: boolean) => void) => {
    try {
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const timer = setInterval(() => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        cb(avg > 14);
      }, 120);
      return () => { clearInterval(timer); try { src.disconnect(); } catch {} };
    } catch { return () => {}; }
  }, []);

  const closePeer = useCallback((peerId: string) => {
    const ps = peersRef.current.get(peerId);
    if (!ps) return;
    try { ps.pc.close(); } catch {}
    try { ps.audio.srcObject = null; ps.audio.remove(); } catch {}
    peersRef.current.delete(peerId);
  }, []);

  const createPeer = useCallback((peerId: string): PeerState => {
    const existing = peersRef.current.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const audio = document.createElement('audio');
    audio.autoplay = true;
    document.body.appendChild(audio);

    const ps: PeerState = { pc, audio, pendingIce: [], hasRemoteDesc: false };
    peersRef.current.set(peerId, ps);

    streamRef.current?.getTracks().forEach(t => pc.addTrack(t, streamRef.current!));

    pc.ontrack = (e) => {
      audio.srcObject = e.streams[0];
      attachSpeakingMeter(e.streams[0], (on) => {
        setPeers(prev => prev.map(p => p.id === peerId ? { ...p, speaking: on } : p));
      });
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && chanRef.current) {
        chanRef.current.send({ type: 'broadcast', event: 'rtc_ice', payload: { from: me?.id, to: peerId, candidate: e.candidate.toJSON() } });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') closePeer(peerId);
      syncPeerList();
    };
    return ps;
  }, [me?.id, attachSpeakingMeter, closePeer, syncPeerList]);

  useEffect(() => {
    if (!joined || !me || !channelId) return;
    let cancelled = false;

    (async () => {

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        setMicError(null);
        attachSpeakingMeter(stream, setSpeaking);
      } catch (err: any) {
        setMicError(err?.name === 'NotAllowedError' ? 'Microphone permission denied — you are in listen-only mode.' : 'No microphone found — you are in listen-only mode.');
      }

      const ch = supabase.channel(`voice:${channelId}`, { config: { presence: { key: me.id }, broadcast: { self: false } } });
      chanRef.current = ch;

      const handleOffer = async (payload: any) => {
        if (payload.to !== me.id) return;
        const ps = createPeer(payload.from);
        await ps.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        ps.hasRemoteDesc = true;
        for (const c of ps.pendingIce.splice(0)) await ps.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        const answer = await ps.pc.createAnswer();
        await ps.pc.setLocalDescription(answer);
        ch.send({ type: 'broadcast', event: 'rtc_answer', payload: { from: me.id, to: payload.from, sdp: answer } });
      };

      const handleAnswer = async (payload: any) => {
        if (payload.to !== me.id) return;
        const ps = peersRef.current.get(payload.from);
        if (!ps) return;
        await ps.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)).catch(() => {});
        ps.hasRemoteDesc = true;
        for (const c of ps.pendingIce.splice(0)) await ps.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      };

      const handleIce = async (payload: any) => {
        if (payload.to !== me.id) return;
        const ps = peersRef.current.get(payload.from);
        if (!ps) return;
        if (!ps.hasRemoteDesc) { ps.pendingIce.push(payload.candidate); return; }
        await ps.pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
      };

      ch
        .on('broadcast', { event: 'rtc_offer' }, ({ payload }) => { handleOffer(payload); })
        .on('broadcast', { event: 'rtc_answer' }, ({ payload }) => { handleAnswer(payload); })
        .on('broadcast', { event: 'rtc_ice' }, ({ payload }) => { handleIce(payload); })
        .on('presence', { event: 'sync' }, () => {
          const state = ch.presenceState() as any;
          rosterRef.current = new Map(Object.entries(state).map(([key, arr]: [string, any]) => [key, { name: arr[0]?.name || 'Anonymous', avatar: arr[0]?.avatar }]));

          peersRef.current.forEach((_, id) => { if (!rosterRef.current.has(id)) closePeer(id); });
          syncPeerList();
        })
        .on('presence', { event: 'join' }, () => syncPeerList())
        .subscribe(async (status: string) => {
          if (status !== 'SUBSCRIBED') return;
          await ch.track({ id: me.id, name: me.name, avatar: me.avatar });

          const state = ch.presenceState() as any;
          for (const peerId of Object.keys(state)) {
            if (peerId === me.id) continue;
            const ps = createPeer(peerId);
            const offer = await ps.pc.createOffer({ offerToReceiveAudio: true });
            await ps.pc.setLocalDescription(offer);
            ch.send({ type: 'broadcast', event: 'rtc_offer', payload: { from: me.id, to: peerId, sdp: offer } });
          }
        });
    })();

    return () => {
      cancelled = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- copied to local var intentionally for cleanup safety
      const peers = peersRef.current;
      peers.forEach((_, id) => closePeer(id));
      peers.clear();
      rosterRef.current.clear();
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (chanRef.current) { supabase.removeChannel(chanRef.current); chanRef.current = null; }
      if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
      setPeers([]); setSpeaking(false); setMicError(null); setMuted(false);
    };
  }, [joined, channelId, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m;
      streamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
      return next;
    });
  }, []);

  return { peers, muted, toggleMute, micError, speaking };
}
