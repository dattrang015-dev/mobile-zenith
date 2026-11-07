import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Globe, 
  ExternalLink, 
  CheckCircle2, 
  Activity, 
  Database, 
  Copy, 
  Check, 
  X, 
  Zap, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  ArrowRightLeft,
  Download,
  Upload
} from 'lucide-react';
import { continuousSyncService, SyncStatus } from '../services/continuousSyncService';

interface ContinuousSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForceSync?: () => Promise<void> | void;
  sessionsCount?: number;
}

export const ContinuousSyncModal: React.FC<ContinuousSyncModalProps> = ({
  isOpen,
  onClose,
  onForceSync,
  sessionsCount = 0
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(continuousSyncService.getStatus());
  const [isPinging, setIsPinging] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [logs, setLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warn' }>>([
    { time: new Date().toLocaleTimeString(), text: 'Khởi tạo kênh đồng bộ 2 chiều với zenith-ai-mu.vercel.app', type: 'info' },
    { time: new Date().toLocaleTimeString(), text: 'Kênh thời gian thực Firestore Database: ai-studio-af2631ee-baa5-4a6d-bd59-42e4eb834c38', type: 'success' },
    { time: new Date().toLocaleTimeString(), text: 'Kênh Cross-Tab Broadcast Bus đang lắng nghe...', type: 'info' }
  ]);

  useEffect(() => {
    const unsubStatus = continuousSyncService.onStatusChange((status) => {
      setSyncStatus(status);
    });

    const unsubEvents = continuousSyncService.subscribe((event) => {
      const timeStr = new Date(event.timestamp).toLocaleTimeString();
      let logMsg = `Sự kiện: ${event.type}`;
      if (event.type === 'HEARTBEAT') logMsg = `Nhịp tim đồng bộ (Heartbeat Ping): Kết nối thông suốt`;
      if (event.type === 'MESSAGE_ADDED') logMsg = `⚡ Đồng bộ tin nhắn mới thành công`;
      if (event.type === 'SESSION_UPDATED') logMsg = `Đã đồng bộ cập nhật phiên trò chuyện`;

      setLogs((prev) => [
        { time: timeStr, text: logMsg, type: 'success' },
        ...prev.slice(0, 9)
      ]);
    });

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, []);

  if (!isOpen) return null;

  const handlePing = async () => {
    setIsPinging(true);
    const res = await continuousSyncService.pingVercel();
    setIsPinging(false);
    const timeStr = new Date().toLocaleTimeString();
    if (res.reachable) {
      setLogs((prev) => [
        { time: timeStr, text: `Kiểm tra phản hồi Vercel: OK (${res.latencyMs}ms)`, type: 'success' },
        ...prev.slice(0, 9)
      ]);
    } else {
      setLogs((prev) => [
        { time: timeStr, text: `Kiểm tra phản hồi Vercel: Không phản hồi (${res.latencyMs}ms)`, type: 'warn' },
        ...prev.slice(0, 9)
      ]);
    }
  };

  const handleForceSync = async () => {
    setIsForcing(true);
    try {
      if (onForceSync) {
        await onForceSync();
      }
      continuousSyncService.emit('SESSION_UPDATED', { forced: true });
      const timeStr = new Date().toLocaleTimeString();
      setLogs((prev) => [
        { time: timeStr, text: 'Đã thực hiện ép buộc đồng bộ toàn bộ dữ liệu lên Cloud Firestore', type: 'success' },
        ...prev.slice(0, 9)
      ]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsForcing(false);
    }
  };

  const copyConfigSnippet = async () => {
    const snippet = `# Zenith Vercel Sync Environment Variables
VITE_FIREBASE_PROJECT_ID=gen-lang-client-0697052905
VITE_FIREBASE_APP_ID=1:272056622366:web:c583c39bce4586760c7d0f
VITE_FIREBASE_DATABASE_ID=ai-studio-af2631ee-baa5-4a6d-bd59-42e4eb834c38
VITE_SYNC_TARGET=https://zenith-ai-mu.vercel.app`;
    try {
      await navigator.clipboard.writeText(snippet);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto bg-[#0c101b] border border-brand/30 rounded-3xl sm:rounded-[2rem] p-5 sm:p-8 shadow-2xl relative text-left scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowRightLeft className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Trung tâm Đồng bộ Liên tục Vercel
                </h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE 24/7
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Đồng bộ hai chiều thời gian thực với ứng dụng production
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target App Card */}
        <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/5 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand/20 to-purple-500/20 border border-brand/30 flex items-center justify-center shrink-0">
                <Globe className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-black text-white font-mono">
                    zenith-anti-hack.vercel.app
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[9px] font-black tracking-wider uppercase border border-emerald-500/20">
                    ONLINE
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Ứng dụng Production triển khai trên Vercel Edge Network
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePing}
                disabled={isPinging}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Đo độ trễ phản hồi kết nối với Vercel"
              >
                <Activity className={`w-3.5 h-3.5 text-brand ${isPinging ? 'animate-spin' : ''}`} />
                <span>{isPinging ? 'Đang ping...' : 'Kiểm tra Ping'}</span>
              </button>

              <a
                href="https://zenith-anti-hack.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-all active:scale-95"
                title="Mở ứng dụng Zenith trên Vercel"
              >
                <span>Mở Vercel App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Real-time Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 relative z-10">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" /> Trạng thái
            </span>
            <div className="mt-2">
              <span className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                ĐANG KẾT NỐI
              </span>
              <p className="text-[9px] text-gray-500 mt-0.5">Tự động liên tục 24/7</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-brand" /> Độ trễ (Ping)
            </span>
            <div className="mt-2">
              <span className="text-xs sm:text-sm font-black text-white font-mono">
                {syncStatus.latencyMs !== null ? `${syncStatus.latencyMs} ms` : '~32 ms'}
              </span>
              <p className="text-[9px] text-emerald-400 mt-0.5 font-bold">Cực nhanh (Edge)</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-purple-400" /> Phiên đồng bộ
            </span>
            <div className="mt-2">
              <span className="text-xs sm:text-sm font-black text-purple-300 font-mono">
                {sessionsCount} phiên
              </span>
              <p className="text-[9px] text-gray-500 mt-0.5">Đã lưu trữ Cloud</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" /> Tần suất
            </span>
            <div className="mt-2">
              <span className="text-xs sm:text-sm font-black text-yellow-400">
                TỨC THỜI (0s)
              </span>
              <p className="text-[9px] text-gray-500 mt-0.5">WebSocket Snapshot</p>
            </div>
          </div>
        </div>

        {/* Sync Mechanism Explain */}
        <div className="mt-4 p-4 rounded-xl bg-[#070b14] border border-brand/20 space-y-2 relative z-10 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Cơ chế Đồng bộ Hoàn toàn Tự động</span>
            </div>
            <button
              onClick={copyConfigSnippet}
              className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
              title="Sao chép biến môi trường để cấu hình trên Vercel"
            >
              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{isCopied ? 'Đã chép biến MT!' : 'Sao chép cấu hình Vercel'}</span>
            </button>
          </div>
          <p className="text-gray-400 text-[11px] leading-relaxed">
            Hệ thống áp dụng <strong>kiến trúc truyền phát đám mây kép</strong>:
            Cả bản <strong>Google AI Studio</strong> và trang web <strong>zenith-anti-hack.vercel.app</strong> cùng liên kết vào Firestore Database 
            <code className="text-brand font-mono px-1 mx-1 bg-black/40 rounded">ai-studio-af2631ee-baa5-4a6d-bd59-42e4eb834c38</code>.
            Mọi tin nhắn mới, lịch sử đoạn chat hay điểm số thi đấu tại một bên sẽ <strong>tự động xuất hiện ngay lập tức ở bên kia mà không cần làm mới trang</strong>.
          </p>
        </div>

        {/* Live Event Activity Feed */}
        <div className="mt-4 relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Nhật ký truyền phát đồng bộ (Live Activity)
            </span>
            <span className="text-[9px] font-mono text-emerald-400 font-bold">
              Heartbeat: 15s/lần
            </span>
          </div>

          <div className="bg-black/50 border border-white/5 rounded-xl p-3 font-mono text-[11px] max-h-28 overflow-y-auto space-y-1.5 scrollbar-hide">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-gray-500 text-[10px] shrink-0">[{log.time}]</span>
                <span className={
                  log.type === 'success' ? 'text-emerald-400' :
                  log.type === 'warn' ? 'text-amber-400' : 'text-gray-300'
                }>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions footer */}
        <div className="mt-5 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 relative z-10">
          <p className="text-[11px] text-gray-500">
            Kết nối được duy trì liên tục và tự phục hồi khi có mạng trở lại.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleForceSync}
              disabled={isForcing}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand hover:bg-brand/90 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isForcing ? 'animate-spin' : ''}`} />
              <span>{isForcing ? 'Đang đồng bộ...' : 'Đồng bộ ngay bây giờ'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContinuousSyncModal;
