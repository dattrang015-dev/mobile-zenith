import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  LogOut, 
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { hashAdminPassword, evaluatePasswordStrength } from '../lib/security';

export type AdminPasswordModalMode = 'setup' | 'verify' | 'change';

interface AdminPasswordModalProps {
  isOpen: boolean;
  mode: AdminPasswordModalMode;
  user: any;
  onSuccess: () => void;
  onCancel?: () => void;
  onRenounceRole?: () => void;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  mode,
  user,
  onSuccess,
  onCancel,
  onRenounceRole
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const strength = evaluatePasswordStrength(newPassword);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'verify') {
      if (!currentPassword) {
        setError('Vui lòng nhập mật khẩu Admin của bạn.');
        return;
      }

      setLoading(true);
      try {
        const hashedInput = await hashAdminPassword(currentPassword);
        if (user.adminPasswordHash && hashedInput === user.adminPasswordHash) {
          setSuccessMsg('Xác thực danh tính Quản trị viên thành công!');
          setTimeout(() => {
            setCurrentPassword('');
            onSuccess();
          }, 600);
        } else {
          setError('Mật khẩu Admin cá nhân không chính xác. Vui lòng thử lại.');
        }
      } catch (err: any) {
        setError(err.message || 'Lỗi xác thực.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'change') {
      if (!currentPassword) {
        setError('Vui lòng nhập mật khẩu Admin hiện tại.');
        return;
      }
      const hashedCurrent = await hashAdminPassword(currentPassword);
      if (user.adminPasswordHash && hashedCurrent !== user.adminPasswordHash) {
        setError('Mật khẩu hiện tại không đúng.');
        return;
      }
    }

    // Validation for new password
    if (newPassword.length < 6) {
      setError('Mật khẩu Admin phải có độ dài tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không trùng khớp.');
      return;
    }

    setLoading(true);
    try {
      const hashed = await hashAdminPassword(newPassword);
      await updateDoc(doc(db, 'users', user.uid), {
        adminPasswordHash: hashed,
        needsAdminPasswordSetup: false,
        adminPasswordUpdatedAt: Date.now()
      });

      setSuccessMsg(mode === 'setup' 
        ? 'Thiết lập mật khẩu Admin cá nhân thành công! Quyền quản trị đã kích hoạt.' 
        : 'Cập nhật mật khẩu Admin riêng thành công!');

      setTimeout(() => {
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        onSuccess();
      }, 900);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể lưu mật khẩu vào cơ sở dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  const isMandatory = mode === 'setup';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto bg-[#0a0f1d] border border-brand/40 rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl relative text-left scrollbar-thin"
      >
        {/* Glow decoration */}
        <div className="absolute -top-20 -right-20 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand/20 to-emerald-500/20 border border-brand/30 flex items-center justify-center text-emerald-400 shrink-0">
              {mode === 'verify' ? <Lock className="w-6 h-6 text-brand" /> : <ShieldCheck className="w-6 h-6 text-emerald-400 animate-pulse" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white uppercase">
                  {mode === 'setup' && 'Tạo Mật Khẩu Admin Riêng'}
                  {mode === 'verify' && 'Xác Thực Mật Khẩu Admin'}
                  {mode === 'change' && 'Đổi Mật Khẩu Admin Riêng'}
                </h3>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {user.email || user.name}
              </p>
            </div>
          </div>

          {!isMandatory && onCancel && (
            <button 
              onClick={onCancel}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Informative notice for Setup mode */}
        {mode === 'setup' && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <p className="font-bold text-white mb-0.5">Yêu cầu bảo mật cấp cao:</p>
              <p className="text-gray-300 text-[11px]">
                Bạn đã được cấp quyền <strong>Admin</strong>. Hệ thống yêu cầu mỗi quản trị viên phải <strong>tự tạo mật khẩu quản trị riêng</strong> để bảo vệ các thao tác quản lý dữ liệu và hệ thống.
              </p>
            </div>
          </div>
        )}

        {/* Informative notice for Verify mode */}
        {mode === 'verify' && (
          <div className="mt-4 p-3.5 rounded-2xl bg-brand/10 border border-brand/20 text-xs text-gray-300 leading-relaxed flex items-start gap-2.5">
            <Key className="w-4 h-4 shrink-0 mt-0.5 text-brand" />
            <p className="text-[11px]">
              Vui lòng nhập mật khẩu Admin cá nhân bạn đã thiết lập để mở Terminal Quản trị & Cơ sở dữ liệu.
            </p>
          </div>
        )}

        {/* Error / Success alert */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSavePassword} className="mt-5 space-y-4 relative z-10">
          {(mode === 'verify' || mode === 'change') && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                {mode === 'verify' ? 'Mật khẩu Admin của bạn' : 'Mật khẩu hiện tại'}
              </label>
              <div className="relative">
                <input 
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full bg-[#050811] border border-white/10 focus:border-brand/50 rounded-2xl px-4 py-3 text-xs text-white outline-none pr-10 font-mono tracking-wider transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-all p-1"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {(mode === 'setup' || mode === 'change') && (
            <>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 flex items-center justify-between">
                  <span>Mật khẩu Admin mới</span>
                  {newPassword && (
                    <span className="text-[9px] font-bold text-gray-400">
                      Độ mạnh: <span className="text-white font-black">{strength.label}</span>
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input 
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự..."
                    className="w-full bg-[#050811] border border-white/10 focus:border-brand/50 rounded-2xl px-4 py-3 text-xs text-white outline-none pr-10 font-mono tracking-wider transition-all"
                    autoFocus={mode === 'setup'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-all p-1"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength bar */}
                {newPassword && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div 
                        key={step} 
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          step <= strength.score ? strength.color : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                  Xác nhận lại mật khẩu mới
                </label>
                <div className="relative">
                  <input 
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    className="w-full bg-[#050811] border border-white/10 focus:border-brand/50 rounded-2xl px-4 py-3 text-xs text-white outline-none pr-10 font-mono tracking-wider transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-all p-1"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand to-indigo-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-brand/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>
                {mode === 'setup' && 'Lưu & Kích hoạt Mật khẩu Admin'}
                {mode === 'verify' && 'Xác thực & Mở Admin Hub'}
                {mode === 'change' && 'Cập nhật Mật khẩu Admin'}
              </span>
            </button>

            {/* Optional renounce/cancel button for setup mode */}
            {mode === 'setup' && onRenounceRole && (
              <button
                type="button"
                onClick={onRenounceRole}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-gray-500 hover:text-red-400 text-[11px] font-bold transition-all hover:bg-white/5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Từ chối quyền Admin (Về quyền Người dùng thường)</span>
              </button>
            )}

            {mode !== 'setup' && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2.5 px-4 rounded-xl text-gray-400 hover:text-white text-xs font-bold transition-all hover:bg-white/5 cursor-pointer"
              >
                Hủy bỏ
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminPasswordModal;
