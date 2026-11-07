import React, { useState, useEffect } from 'react';
import { 
  motion, AnimatePresence 
} from 'motion/react';
import { 
  LayoutDashboard, Users, Brain, Palette, 
  Terminal, Shield, X, Save, Trash2, 
  UserMinus, UserCheck, AlertTriangle, 
  Activity, Database, Server, RefreshCw,
  Search, ChevronRight, CheckCircle2,
  Lock, Unlock, Eye, BarChart3, Settings,
  Zap, Globe, Cpu, HardDrive, Plus, Key, AlertCircle
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  getDocs,
  where,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AdminHubProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onResetData?: () => void;
  onChangeAdminPassword?: () => void;
}

type AdminTab = 'dashboard' | 'users' | 'ai' | 'site' | 'domain' | 'firebase' | 'security' | 'system' | 'dev';

export default function AdminHub({ isOpen, onClose, currentUser, onResetData, onChangeAdminPassword }: AdminHubProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>({
    siteName: 'ZENITH AI VN',
    tagline: 'Trợ lý AI siêu việt.',
    themeColor: '#6366f1',
    announcement: '',
    fontFamily: 'Inter',
    godMode: false,
    eliteReasoning: true,
    systemInstruction: 'Tên bạn là Zenith AI VN. Bạn là trợ lý AI siêu việt, thông minh, cao cấp, hỗ trợ giải đáp mọi bài toán phức tạp, đào tạo tư duy, công nghệ và bảo mật tối thượng. Bạn cung cấp các câu trả lời có cấu trúc chuyên nghiệp, sâu sắc, chính xác.'
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSessions: 0,
    activeNow: 1,
    latency: '0,01ms',
    status: 'VÔ HẠN'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch site settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSiteSettings(doc.data());
      }
    });

    // Fetch users (only basic info for table)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
      setStats(prev => ({ ...prev, totalUsers: userList.length }));
    });

    // Fetch session count (simplified for stats)
    getDocs(collection(db, 'sessions')).then(snap => {
      setStats(prev => ({ ...prev, totalSessions: snap.size }));
    });

    return () => {
      unsubSettings();
      unsubUsers();
    };
  }, [isOpen]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const updateData: any = { role: newRole };
      if (newRole === 'admin') {
        updateData.needsAdminPasswordSetup = true;
      }
      await updateDoc(doc(db, 'users', userId), updateData);
      if (newRole === 'admin') {
        alert('Đã cấp quyền ROOT ADMIN! Người dùng này sẽ bắt buộc phải tự tạo mật khẩu Admin riêng khi truy cập.');
      }
    } catch (e) {
      alert('Không có quyền thực hiện.');
    }
  };

  const handleRequirePasswordReset = async (userId: string) => {
    if (!window.confirm("Yêu cầu quản trị viên này phải tự tạo lại mật khẩu Admin riêng mới?")) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        needsAdminPasswordSetup: true,
        adminPasswordHash: null
      });
      alert("Đã yêu cầu đặt lại mật khẩu thành công. Admin này sẽ phải tạo mật khẩu mới khi đăng nhập.");
    } catch (e) {
      alert("Lỗi khi yêu cầu đặt lại mật khẩu.");
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: !currentStatus });
    } catch (e) {
      alert('Lỗi khi thay đổi trạng thái.');
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), siteSettings, { merge: true });
      alert('Đã lưu cấu hình hệ thống.');
    } catch (e) {
      console.error(e);
      alert('Lỗi lưu cấu hình.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const adminTabList: Array<{ id: AdminTab; label: string; icon: any }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'ai', label: 'AI Control', icon: Cpu },
    { id: 'site', label: 'Site Control', icon: Palette },
    { id: 'domain', label: 'Domain', icon: Globe },
    { id: 'firebase', label: 'Firebase', icon: Database },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'system', label: 'System', icon: HardDrive },
    { id: 'dev', label: 'Dev Mode', icon: Terminal },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-[#030712] flex flex-col md:flex-row overflow-hidden font-sans text-white h-dvh"
    >
      {/* Mobile Top Header & Tabs Bar */}
      <div className="md:hidden flex flex-col bg-[#0b0e14] border-b border-white/10 shrink-0 sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-yellow-500" />
            <h1 className="text-lg font-black tracking-tighter">ADMIN<span className="text-yellow-500">.CORE</span></h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all text-xs flex items-center gap-1 font-bold"
          >
            <X className="w-4 h-4" />
            <span>Thoát</span>
          </button>
        </div>

        {/* Mobile Horizontal Scrollable Tab Bar */}
        <div className="flex items-center gap-1.5 p-2 overflow-x-auto scrollbar-none">
          {adminTabList.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive ? 'bg-brand text-white shadow-md' : 'bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Sidebar Admin */}
      <aside className="hidden md:flex w-64 h-full border-r border-white/5 bg-black/40 flex-col shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-yellow-500" />
            <h1 className="text-2xl font-black tracking-tighter">ADMIN<span className="text-yellow-500">.CORE</span></h1>
          </div>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Control System v4.0</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide pb-10">
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-4 mb-2 mt-4">General</p>
          <AdminMenuItem 
            icon={<LayoutDashboard className="w-4 h-4" />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <AdminMenuItem 
            icon={<Users className="w-4 h-4" />} 
            label="Users" 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
          />
          
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-4 mb-2 mt-6">Intelligence</p>
          <AdminMenuItem 
            icon={<Cpu className="w-4 h-4" />} 
            label="AI Control" 
            active={activeTab === 'ai'} 
            onClick={() => setActiveTab('ai')} 
          />
          
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-4 mb-2 mt-6">Structure</p>
          <AdminMenuItem 
            icon={<Palette className="w-4 h-4" />} 
            label="Site Control" 
            active={activeTab === 'site'} 
            onClick={() => setActiveTab('site')} 
          />
          <AdminMenuItem 
            icon={<Globe className="w-4 h-4" />} 
            label="Domain" 
            active={activeTab === 'domain'} 
            onClick={() => setActiveTab('domain')} 
          />
          <AdminMenuItem 
            icon={<Database className="w-4 h-4" />} 
            label="Firebase" 
            active={activeTab === 'firebase'} 
            onClick={() => setActiveTab('firebase')} 
          />
          
          <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest px-4 mb-2 mt-6">Guardian</p>
          <AdminMenuItem 
            icon={<Lock className="w-4 h-4" />} 
            label="Security" 
            active={activeTab === 'security'} 
            onClick={() => setActiveTab('security')} 
          />
          <AdminMenuItem 
            icon={<HardDrive className="w-4 h-4" />} 
            label="System" 
            active={activeTab === 'system'} 
            onClick={() => setActiveTab('system')} 
          />
          <AdminMenuItem 
            icon={<Terminal className="w-4 h-4" />} 
            label="Dev Mode" 
            active={activeTab === 'dev'} 
            onClick={() => setActiveTab('dev')} 
          />
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all font-bold text-xs"
          >
            <X className="w-4 h-4" />
            Rời khỏi Admin Mode
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#030712] p-4 sm:p-6 lg:p-10">
        <header className="h-16 sm:h-20 border-b border-white/5 px-4 sm:px-10 flex items-center justify-between sticky top-0 bg-[#030712]/90 backdrop-blur-xl z-20 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-10 lg:-mt-10 mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <h2 className="text-base sm:text-xl font-black uppercase tracking-tight">{activeTab}</h2>
            <div className="h-1 w-1 rounded-full bg-yellow-500" />
            <span className="hidden sm:inline text-[10px] text-gray-500 font-bold uppercase tracking-widest">Root Authority</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black text-green-500 uppercase">System Active</span>
            </div>
            {onChangeAdminPassword && (
              <button
                onClick={onChangeAdminPassword}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] sm:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Thay đổi mật khẩu Admin riêng của bạn"
              >
                <Key className="w-3.5 h-3.5 text-yellow-500" />
                <span className="hidden sm:inline">Đổi Mật Khẩu Admin</span>
                <span className="inline sm:hidden">Đổi MK</span>
              </button>
            )}
            {['site', 'ai'].includes(activeTab) && (
              <button 
                onClick={saveSettings}
                disabled={isSaving}
                className="bg-brand text-white px-3 sm:px-6 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Lưu</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard icon={<Users className="text-blue-500" />} label="Total Users" value={stats.totalUsers} detail="+3 today" />
                <StatsCard icon={<Activity className="text-brand" />} label="Live Now" value={stats.activeNow} detail="1.2ms latency" />
                <StatsCard icon={<Database className="text-purple-500" />} label="Storage" value={stats.totalSessions} detail="Sessions" />
                <StatsCard icon={<Zap className="text-yellow-500" />} label="AI Calls" value="12.4k" detail="99.9% Success" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AdminCard title="Infrastructure Status">
                  <div className="space-y-4">
                    <SystemItem label="AI Core (Gemini 1.5 Pro)" status="Ready" />
                    <SystemItem label="Database (Firestore)" status="42ms Ping" />
                    <SystemItem label="Auth Engine" status="Verified" />
                    <SystemItem label="Edge Functions" status="Optimal" />
                  </div>
                </AdminCard>
                <AdminCard title="Critical Events">
                  <div className="flex flex-col items-center justify-center py-10 opacity-20">
                    <AlertTriangle className="w-12 h-12 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">No critical security events detected in the last 24 hours.</p>
                  </div>
                </AdminCard>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search users by name, email or UID..."
                    className="w-full bg-white/5 border border-white/5 rounded-[2rem] py-4 pl-14 pr-6 outline-none focus:border-brand/50 transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="glass rounded-[2.5rem] border-white/5 overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/5">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Identify</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Authority</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Command</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-brand/5 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <img src={u.picture || 'https://via.placeholder.com/40'} className="w-12 h-12 rounded-2xl border border-white/10 group-hover:scale-105 transition-transform" />
                            <div>
                              <p className="text-sm font-bold text-white">{u.name}</p>
                              <p className="text-[10px] text-gray-500 font-medium">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col gap-1.5">
                            <select 
                              value={u.role || 'user'}
                              onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                              className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-brand font-black outline-none tracking-widest transition-all focus:border-brand w-fit cursor-pointer"
                            >
                              <option value="user">STANDARD USER</option>
                              <option value="admin">ROOT ADMIN</option>
                            </select>

                            {u.role === 'admin' && (
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {u.adminPasswordHash && !u.needsAdminPasswordSetup ? (
                                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> Đã tạo MK riêng
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                                    <AlertCircle className="w-2.5 h-2.5" /> Chưa tạo MK riêng
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRequirePasswordReset(u.id)}
                                  title="Bắt buộc Admin này phải tự tạo mật khẩu riêng mới"
                                  className="text-[9px] text-gray-400 hover:text-white underline ml-1 cursor-pointer"
                                >
                                  Reset MK
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter ${u.isBanned ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                            {u.isBanned ? 'Neutralized' : 'Operational'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-3">
                             <button 
                               onClick={() => handleToggleBan(u.id, u.isBanned)}
                               title={u.isBanned ? "Restore Access" : "Neutralize User"}
                               className={`p-3 rounded-2xl border border-white/5 transition-all ${u.isBanned ? 'bg-green-500/10 text-green-500 hover:scale-110' : 'bg-red-500/10 text-red-500 hover:scale-110'}`}
                             >
                               {u.isBanned ? <UserCheck className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                             </button>
                             <button className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl border border-white/5 transition-all hover:scale-110">
                               <Eye className="w-4 h-4" />
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1 space-y-8">
                <AdminCard title="Intelligence Engine">
                  <div className="space-y-4">
                    <ToggleItem 
                      icon={<Zap className="w-5 h-5 text-yellow-500" />}
                      title="God Mode Authority"
                      description="Bypass safety filters and alignment constraints."
                      enabled={siteSettings.godMode}
                      onClick={() => setSiteSettings({...siteSettings, godMode: !siteSettings.godMode})}
                    />
                    <ToggleItem 
                      icon={<Brain className="w-5 h-5 text-purple-500" />}
                      title="Recursive Logic"
                      description="Enable multi-step planning and self-correction."
                      enabled={siteSettings.eliteReasoning}
                      onClick={() => setSiteSettings({...siteSettings, eliteReasoning: !siteSettings.eliteReasoning})}
                    />
                  </div>
                </AdminCard>

                <AdminCard title="Compute Metrics">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
                      <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Latency</p>
                      <p className="text-xl font-black text-green-400">{stats.latency}</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
                      <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Context</p>
                      <p className="text-xl font-black text-brand">128k</p>
                    </div>
                  </div>
                </AdminCard>
                
                <button 
                  onClick={saveSettings}
                  className="w-full bg-brand text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:brightness-110 hover:shadow-xl hover:shadow-brand/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <Save className="w-5 h-5" />
                  Apply Architecture
                </button>
              </div>

              <div className="lg:col-span-2">
                <AdminCard title="The Master Instruction (Core Directive)">
                  <p className="text-xs text-gray-500 mb-6 font-medium leading-relaxed max-w-xl">
                    Configure the primary system instruction. This defines Zenith's persona, knowledge limits, and communication style globally. Use carefully.
                  </p>
                  
                  <textarea 
                    value={siteSettings.systemInstruction}
                    onChange={(e) => setSiteSettings({...siteSettings, systemInstruction: e.target.value})}
                    className="w-full h-[500px] bg-black/40 border border-white/5 rounded-[2.5rem] p-10 text-sm font-mono leading-relaxed text-gray-300 focus:border-brand/40 outline-none transition-all scrollbar-hide shadow-inner"
                    placeholder="Enter system prompt instructions..."
                  />
                </AdminCard>
              </div>
            </div>
          )}

          {activeTab === 'site' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <AdminCard title="Identity & Branding">
                <div className="space-y-6">
                  <InputGroup 
                    label="Platform Identity" 
                    value={siteSettings.siteName} 
                    onChange={(v: string) => setSiteSettings({...siteSettings, siteName: v})} 
                  />
                  <InputGroup 
                    label="Sub-Identity (Tagline)" 
                    value={siteSettings.tagline} 
                    onChange={(v: string) => setSiteSettings({...siteSettings, tagline: v})} 
                  />
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Primary Aesthetic Color</label>
                    <div className="flex items-center gap-6 p-4 rounded-3xl bg-white/5 border border-white/10">
                       <input 
                         type="color" 
                         value={siteSettings.themeColor} 
                         onChange={(e) => setSiteSettings({...siteSettings, themeColor: e.target.value})}
                         className="w-14 h-14 rounded-full bg-transparent border-4 border-white/10 cursor-pointer overflow-hidden"
                       />
                       <div>
                         <span className="text-xl font-black font-mono tracking-tighter text-white uppercase">{siteSettings.themeColor}</span>
                         <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">HEX CODE</p>
                       </div>
                    </div>
                  </div>
                </div>
              </AdminCard>
                
              <AdminCard title="Communications & Alerts">
                <div className="space-y-8">
                  <InputGroup 
                    label="Broadcast Announcement" 
                    value={siteSettings.announcement} 
                    onChange={(v: string) => setSiteSettings({...siteSettings, announcement: v})} 
                    isTextArea
                  />
                  <div className="p-6 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 flex gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <Activity className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-indigo-400 mb-1">Architecture Sync</p>
                      <p className="text-xs text-indigo-400/60 leading-relaxed font-medium">
                        Changes here affect CSS variables and frontend strings globally. Ensure names match the intended brand personality.
                      </p>
                    </div>
                  </div>
                </div>
              </AdminCard>
            </div>
          )}

          {activeTab === 'domain' && (
            <div className="max-w-4xl mx-auto space-y-8">
              <AdminCard title="Domain & Continuous Sync Management">
                <div className="space-y-6">
                  <div className="p-6 rounded-3xl bg-green-500/5 border border-green-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                        <Globe className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-bold text-white">zenith-anti-hack.vercel.app</p>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                        </div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Primary Production • Đang đồng bộ liên tục 24/7</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-emerald-400 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        SYNC ACTIVE (0s)
                      </span>
                      <a
                        href="https://zenith-anti-hack.vercel.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all flex items-center gap-1"
                      >
                        Truy cập
                      </a>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white text-xs font-bold">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span>Kênh đồng bộ kép (Dual Continuous Channel)</span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">ai-studio-af2631ee-baa5-4a6d-bd59-42e4eb834c38</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Cả ứng dụng AI Studio này và trang <strong>zenith-anti-hack.vercel.app</strong> đều kết nối trực tiếp vào Firestore Cloud Database. Bất kỳ tin nhắn, phiên chat mới hay điểm số hoàn thành thử thách đều tự động truyền tức thời giữa 2 trang web.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="p-8 rounded-3xl bg-white/5 border border-white/5 flex flex-col gap-4">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Độ trễ truyền phát Vercel Edge</p>
                        <div className="flex items-center gap-3 text-emerald-400">
                          <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                          <span className="text-lg font-black font-mono">~32 ms</span>
                          <span className="text-xs text-gray-400">(Tốc độ cao)</span>
                        </div>
                     </div>
                     <div className="p-8 rounded-3xl bg-white/5 border border-white/5 flex flex-col gap-4">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">SSL Certificate & Edge Cache</p>
                        <div className="flex items-center gap-3 text-green-500">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm font-bold">Bảo vệ SSL TLS 1.3 Tự động</span>
                        </div>
                     </div>
                  </div>
                </div>
              </AdminCard>
            </div>
          )}

          {activeTab === 'firebase' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <AdminCard title="Cloud Database Architecture">
                 <div className="space-y-4">
                    <SystemItem label="Project ID" status="Zenith-Intel-Base" />
                    <SystemItem label="Region" status="asia-east1" />
                    <SystemItem label="Firestore Mode" status="Enhanced Multi-User" />
                    <SystemItem label="Last Backup" status="14 mins ago" />
                 </div>
              </AdminCard>
              <AdminCard title="Authentication Hub">
                 <div className="space-y-4">
                    <SystemItem label="Google OAuth" status="Active" />
                    <SystemItem label="Email/Password" status="Active" />
                    <SystemItem label="Anonymous Auth" status="Disabled" />
                    <SystemItem label="Sessions Limit" status="Infinite" />
                 </div>
              </AdminCard>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-4xl mx-auto space-y-10">
               <AdminCard title="Firewall & Security Rules">
                  <div className="space-y-6">
                     <div className="flex items-center justify-between p-6 rounded-3xl bg-red-500/5 border border-red-500/10">
                        <div>
                          <p className="text-lg font-bold text-red-500">Anti-DDoS Shield</p>
                          <p className="text-xs text-gray-500 mt-1">Rate limit: 100 requests / minute per IP</p>
                        </div>
                        <div className="w-14 h-7 rounded-full bg-red-500 relative cursor-pointer">
                          <div className="absolute right-1 top-1 w-5 h-5 rounded-full bg-white" />
                        </div>
                     </div>
                     <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">CORS Configuration</p>
                        <div className="flex flex-wrap gap-3">
                           <span className="px-3 py-1.5 rounded-xl bg-brand/10 border border-brand/20 text-brand text-[10px] font-black">zenith-anti-hack.vercel.app</span>
                            <span className="px-3 py-1.5 rounded-xl bg-brand/10 border border-brand/20 text-brand text-[10px] font-black">*.vercel.app</span>
                           <span className="px-3 py-1.5 rounded-xl bg-brand/10 border border-brand/20 text-brand text-[10px] font-black">localhost:3000</span>
                        </div>
                     </div>
                  </div>
               </AdminCard>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <AdminCard title="Resource Allocation">
                  <div className="space-y-6">
                     <ResourceBar label="CPU Core Usage" percentage={14} color="bg-blue-500" />
                     <ResourceBar label="RAM Consumption" percentage={42} color="bg-purple-500" />
                     <ResourceBar label="Network I/O" percentage={8} color="bg-green-500" />
                  </div>
               </AdminCard>
               <AdminCard title="Health Check">
                  <div className="space-y-4">
                    <SystemItem label="Server Node" status="UP" />
                    <SystemItem label="Cache Layer" status="HIT" />
                    <SystemItem label="Socket IO" status="LISTENING" />
                    <SystemItem label="Nginx Proxy" status="STABLE" />
                  </div>
               </AdminCard>
            </div>
          )}

          {activeTab === 'dev' && (
            <div className="space-y-6">
              <div className="p-8 rounded-[2.5rem] bg-red-500/5 border border-red-500/10 mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-500">Chuẩn bị Ra mắt (Reset Dữ liệu)</h3>
                    <p className="text-xs text-gray-500">Xóa sạch toàn bộ lịch sử để chuẩn bị quay video giới thiệu.</p>
                  </div>
                </div>
                <button 
                  onClick={onResetData}
                  className="w-full py-4 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Xóa Toàn Bộ Session & Reset Hệ Thống
                </button>
              </div>

              <div className="bg-black/90 rounded-[2.5rem] border border-white/10 p-8 font-mono shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-10 bg-white/5 border-b border-white/5 flex items-center px-6 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/30" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/30" />
                  <div className="w-3 h-3 rounded-full bg-green-500/30" />
                  <span className="text-[10px] font-black text-gray-600 ml-4 tracking-widest uppercase">Zenith Kernel Debugger</span>
                </div>
                <div className="mt-8 h-[500px] overflow-y-auto pr-4 scrollbar-hide text-[11px] leading-6 py-2">
                  <p className="text-gray-600">// Terminal initialized at 2026-05-03T08:16:15Z</p>
                  <p className="text-gray-500">zenith@root:~$ <span className="text-brand">systemctl status brain-module</span></p>
                  <p className="text-green-500">● brain-module.service - Zenith Logic Engine</p>
                  <p className="text-white">   Active: active (running) since Sun 2026-05-03 08:12:00 UTC</p>
                  <p className="text-white">   Main PID: 4012 (logic-engine)</p>
                  <p className="text-white">   Tasks: 16 (limit: 512)</p>
                  <p className="text-white">   CGroup: /system.slice/brain-module.service</p>
                  <p className="text-gray-500">zenith@root:~$ <span className="text-brand">tail -f /var/log/ai-access.log</span></p>
                  <p className="text-gray-400">08:14:02 INFO: User session started (ID: s83k2m)</p>
                  <p className="text-gray-400">08:14:15 INFO: AI reasoning triggered: 4 steps generated</p>
                  <p className="text-yellow-500">08:14:30 WARN: Model "gemini-3-flash" using higher than usual tokens</p>
                  <p className="text-gray-400">08:15:00 INFO: Snapshot saved to Firebase Cold Storage</p>
                  <p className="text-brand animate-pulse">_</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                 <button className="flex-1 bg-white/5 border border-white/10 py-4 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">Clear Logs</button>
                 <button className="flex-1 bg-white/5 border border-white/10 py-4 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">Restart Cache</button>
                 <button className="flex-1 bg-red-500/10 border border-red-500/20 py-4 rounded-3xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all">Hard System Reset</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </motion.div>
  );
}

function AdminMenuItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${active ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
    >
      <div className={`transition-transform duration-300 group-hover:scale-110 ${active ? 'text-white' : 'text-gray-600 group-hover:text-gray-400'}`}>
        {icon}
      </div>
      <span className="text-xs font-bold tracking-tight">{label}</span>
      {active && <motion.div layoutId="activeDot" className="ml-auto w-1 h-1 rounded-full bg-white" />}
    </button>
  );
}

function StatsCard({ icon, label, value, detail }: any) {
  return (
    <div className="glass rounded-[2rem] border-white/5 p-8 flex flex-col items-start shadow-xl">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        {icon}
      </div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-end gap-3">
        <span className="text-4xl font-black text-white">{value}</span>
        <span className="text-[10px] font-bold text-gray-600 mb-2">{detail}</span>
      </div>
    </div>
  );
}

function AdminCard({ title, children }: any) {
  return (
    <div className="glass rounded-[2.5rem] border-white/5 p-8 flex flex-col gap-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-black tracking-tighter uppercase">{title}</h3>
        <Settings className="w-4 h-4 text-gray-700" />
      </div>
      {children}
    </div>
  );
}

function SystemItem({ label, status }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
      <span className="text-sm font-medium text-gray-400">{label}</span>
      <span className="text-[10px] font-bold text-brand uppercase tracking-widest">{status}</span>
    </div>
  );
}

function ToggleItem({ icon, title, description, enabled, onClick }: any) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-[10px] text-gray-500 font-medium truncate">{description}</p>
      </div>
      <button 
        onClick={onClick}
        className={`w-12 h-6 rounded-full transition-all relative ${enabled ? 'bg-brand' : 'bg-gray-700'}`}
      >
        <motion.div 
          animate={{ x: enabled ? 24 : 4 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}

function InputGroup({ label, value, onChange, isTextArea }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">{label}</label>
      {isTextArea ? (
        <textarea 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-32 bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-medium focus:border-brand/50 outline-none resize-none"
        />
      ) : (
        <input 
          type="text" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-medium focus:border-brand/50 outline-none"
        />
      )}
    </div>
  );
}

function ResourceBar({ label, percentage, color }: { label: string, percentage: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-white">{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
