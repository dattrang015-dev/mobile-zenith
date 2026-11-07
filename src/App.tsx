import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Bot, User, Sparkles, Command, Trash2, 
  ChevronRight, Menu, X, Paperclip, Copy, Check, 
  StopCircle, Image as ImageIcon, Zap, Brain, 
  ChevronDown, Settings2, HelpCircle, MessageSquarePlus,
  Shield, Download, Mic,LogOut, Loader2, ArrowRight,
  LayoutDashboard, Target, BarChart3, CheckCircle, Plus,
  Globe, Database, Lock, Terminal, Activity, Users, Cpu,
  HardDrive, Key, Search, Upload, RefreshCw, Mail, AlertTriangle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AdminHub from './components/AdminHub';
import AdminPasswordModal, { AdminPasswordModalMode } from './components/AdminPasswordModal';
import { hashAdminPassword } from './lib/security';
import ContinuousSyncModal from './components/ContinuousSyncModal';
import { continuousSyncService } from './services/continuousSyncService';
import { 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { GoogleLogin } from '@react-oauth/google';
import { auth, db } from './lib/firebase';
import { sendMessageStream, GeminiModel, ChatHistoryItem } from './services/geminiService';

interface ZenithLogoProps {
  className?: string;
  size?: number;
  mdSize?: number;
  glow?: boolean;
}

export function ZenithLogo({ className = "", size = 48, mdSize, glow = true }: ZenithLogoProps) {
  const dynamicStyles = {
    '--logo-size': `${size}px`,
    '--logo-md-size': mdSize ? `${mdSize}px` : `${size}px`
  } as React.CSSProperties;

  return (
    <div 
      className={`relative flex items-center justify-center w-[var(--logo-size)] h-[var(--logo-size)] md:w-[var(--logo-md-size)] md:h-[var(--logo-md-size)] ${className}`} 
      style={dynamicStyles}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full select-none overflow-visible">
        <defs>
          <linearGradient id="zGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" /> {/* Emerald Green */}
            <stop offset="45%" stopColor="#10b981" /> 
            <stop offset="100%" stopColor="#a855f7" /> {/* Royal Purple */}
          </linearGradient>
          
          <linearGradient id="ringGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="80%" stopColor="#e2e8f0" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
          </linearGradient>

          <filter id="logoGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient glow backing */}
        {glow && (
          <circle cx="50" cy="50" r="28" fill="url(#zGradient)" opacity="0.3" filter="url(#logoGlow)" />
        )}

        {/* Outer orbital silver ring */}
        <ellipse 
          cx="50" 
          cy="50" 
          rx="44" 
          ry="15" 
          fill="none" 
          stroke="url(#ringGradient)" 
          strokeWidth="4.2" 
          transform="rotate(-28 50 50)"
          strokeLinecap="round"
          className="animate-pulse"
        />

        {/* Main "Z" form */}
        <path 
          d="M33,31 L67,31 L37,69 L67,69" 
          fill="none" 
          stroke="url(#zGradient)" 
          strokeWidth="12" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          filter={glow ? "url(#logoGlow)" : undefined}
        />

        {/* Inner white light reflection facet */}
        <path 
          d="M36,31 L64,31 M39,67 L64,67" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          opacity="0.9"
        />

        {/* Sparkle */}
        <g transform="translate(76, 26)">
          <path d="M-5,0 L5,0 M0,-5 L0,5" stroke="#ffffff" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}

interface UserProfile {
  id?: string;
  uid: string;
  name: string;
  email: string;
  picture: string;
  role?: 'admin' | 'user' | 'pro';
  isBanned?: boolean;
  adminPasswordHash?: string | null;
  needsAdminPasswordSetup?: boolean;
  adminPasswordUpdatedAt?: number;
}

interface Message {
  role: 'user' | 'model';
  content: string;
  file?: {
    url: string;
    mimeType: string;
    name?: string;
  };
  files?: {
    url: string;
    mimeType: string;
    name?: string;
  }[];
  modelUsed?: string;
  grounding?: any;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const CustomCodeBlock = ({ language, value }: { language: string; value: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const lines = value.split('\n');

  return (
    <div className="my-3 sm:my-5 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0f17] text-gray-200 font-mono text-xs sm:text-sm shadow-2xl">
      {/* Header of code block */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#111622] border-b border-white/5 select-none">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/80" />
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500/80" />
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500/80" />
          <span className="ml-1.5 sm:ml-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-brand-light">
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-sans font-medium text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-white/5"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-bold">Sao chép code</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code Area */}
      <div className="overflow-x-auto p-2.5 sm:p-4 flex items-start bg-[#0b0f17]/90 font-mono">
        {/* Line numbers column on the left (hidden on small mobile screens, visible on sm+) */}
        <div className="hidden sm:flex text-right pr-3.5 text-gray-600 select-none border-r border-white/5 flex-col min-w-[2rem] leading-6 font-bold text-xs">
          {lines.map((_, index) => (
            <span key={index}>{index + 1}</span>
          ))}
        </div>
        
        {/* Actual code contents on the right */}
        <pre className="pl-1 sm:pl-4 flex-1 overflow-x-auto leading-6 font-mono text-gray-100 whitespace-pre text-[11px] sm:text-xs">
          <code>
            {value}
          </code>
        </pre>
      </div>
    </div>
  );
};

const renderFileItem = (file: { url: string; mimeType: string; name?: string }) => {
  if (file.url === 'large_file_placeholder') {
    return (
      <div className="p-4 flex items-center gap-3 bg-white/5 opacity-50">
        <Paperclip className="w-5 h-5 text-gray-400" />
        <div className="flex-1 overflow-hidden">
          <p className="text-xs font-bold truncate">{file.name || 'File historical'}</p>
          <p className="text-[10px] text-gray-500">Dữ liệu quá lớn để lưu trong lịch sử</p>
        </div>
      </div>
    );
  }
  
  const isImage = file.mimeType.startsWith('image/');
  const isVideo = file.mimeType.startsWith('video/');
  const isAudio = file.mimeType.startsWith('audio/');
  const isPdf = file.mimeType === 'application/pdf';
  const isExcel = file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet') || file.name?.endsWith('.xlsx') || file.name?.endsWith('.xls') || file.name?.endsWith('.csv');
  const isWord = file.mimeType.includes('word') || file.name?.endsWith('.docx') || file.name?.endsWith('.doc');

  if (isImage) {
    return <img src={file.url} alt="Attached" className="max-h-60 object-contain w-full bg-black/20" />;
  }
  
  if (isVideo) {
    return <video src={file.url} controls className="max-h-60 w-full" />;
  }

  if (isPdf) {
    return (
      <div className="p-4 flex items-center gap-3 bg-white/5 min-w-[200px] sm:min-w-[280px]">
        <div className="p-2.5 bg-red-500/10 rounded-xl">
          <Download className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-xs font-bold truncate text-gray-200">{file.name || 'document.pdf'}</p>
          <p className="text-[10px] text-gray-400 font-medium">PDF Document</p>
        </div>
        <a href={file.url} download={file.name || 'document.pdf'} className="p-2 hover:bg-white/10 rounded-xl transition-all">
          <Download className="w-4 h-4 text-gray-400 hover:text-white" />
        </a>
      </div>
    );
  }

  if (isExcel) {
    return (
      <div className="p-4 flex items-center gap-3 bg-white/5 min-w-[200px] sm:min-w-[280px]">
        <div className="p-2.5 bg-green-500/10 rounded-xl">
          <Database className="w-5 h-5 text-green-500" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-xs font-bold truncate text-gray-200">{file.name || 'data.xlsx'}</p>
          <p className="text-[10px] text-gray-400 font-medium">Excel Spreadsheet</p>
        </div>
        <a href={file.url} download={file.name || 'data.xlsx'} className="p-2 hover:bg-white/10 rounded-xl transition-all">
          <Download className="w-4 h-4 text-gray-400 hover:text-white" />
        </a>
      </div>
    );
  }

  if (isWord) {
    return (
      <div className="p-4 flex items-center gap-3 bg-white/5 min-w-[200px] sm:min-w-[280px]">
        <div className="p-2.5 bg-blue-500/10 rounded-xl">
          <Paperclip className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-xs font-bold truncate text-gray-200">{file.name || 'document.docx'}</p>
          <p className="text-[10px] text-gray-400 font-medium">Word Document</p>
        </div>
        <a href={file.url} download={file.name || 'document.docx'} className="p-2 hover:bg-white/10 rounded-xl transition-all">
          <Download className="w-4 h-4 text-gray-400 hover:text-white" />
        </a>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className="p-4 flex flex-col gap-2 bg-white/5 min-w-[240px] sm:min-w-[300px]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/10 rounded-xl">
            <Mic className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold truncate text-gray-200">{file.name || 'audio.mp3'}</p>
            <p className="text-[10px] text-gray-400 font-medium">Ghi âm / Tệp âm thanh</p>
          </div>
        </div>
        <audio src={file.url} controls className="w-full h-8 mt-1 scale-95 origin-left" />
      </div>
    );
  }

  return (
    <div className="p-4 flex items-center gap-3 bg-white/5 min-w-[200px] sm:min-w-[280px]">
      <div className="p-2.5 bg-purple-500/10 rounded-xl">
        <Paperclip className="w-5 h-5 text-purple-500" />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-xs font-bold truncate text-gray-200">{file.name || 'file.dat'}</p>
        <p className="text-[10px] text-gray-400 font-medium">Tài liệu / Dữ liệu</p>
      </div>
      <a href={file.url} download={file.name || 'file.dat'} className="p-2 hover:bg-white/10 rounded-xl transition-all">
        <Download className="w-4 h-4 text-gray-400 hover:text-white" />
      </a>
    </div>
  );
};

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isAdminHubOpen, setIsAdminHubOpen] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPasswordModalOpen, setAdminPasswordModalOpen] = useState(false);
  const [adminPasswordModalMode, setAdminPasswordModalMode] = useState<AdminPasswordModalMode>('setup');
  const [isListening, setIsListening] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'trainer' | 'explain' | 'challenge' | 'progress' | 'profile'>('trainer');
  const [userStats, setUserStats] = useState({
    solvedCount: 0,
    accuracy: 0,
    level: 'Beginner',
    points: 0
  });
  const [challengeTimer, setChallengeTimer] = useState<number | null>(null);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const [siteSettings, setSiteSettings] = useState({
    siteName: 'ZENITH ANTI-HACK',
    tagline: 'Next-Gen AI Cyber Academy & Guardian.',
    themeColor: '#6366f1',
    announcement: '',
    fontFamily: 'Inter',
    systemInstruction: "Tên bạn là Zenith Anti-Hack. Bạn là trợ lý AI thông minh, cao cấp về an toàn bảo mật, đào tạo tư duy lập trình an toàn và giải đố tư duy logic. Bạn cung cấp các câu trả lời có cấu trúc chuyên nghiệp, sâu sắc, giải thích rõ các lỗ hổng bảo mật.",
    godMode: false
  });
  const [adminCodeInput, setAdminCodeInput] = useState(() => {
    const saved = localStorage.getItem('zenith_saved_code') || '';
    const lower = saved.trim().toLowerCase();
    if (lower === 'đạt' || lower === 'trang thành đạt' || lower === 'đạt trang' || lower === 'thành đạt' || lower === 'trang đạt') {
      localStorage.removeItem('zenith_saved_code');
      return '';
    }
    return saved;
  });
  const [selectedModel, setSelectedModel] = useState<GeminiModel>("gemini-3.5-flash");
  const [attachedFiles, setAttachedFiles] = useState<{ url: string, data: string, mimeType: string, name: string, size: number }[]>([]);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  
  // States for Email/Password Auth
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMethodTab, setAuthMethodTab] = useState<'email' | 'google'>('email');
  
  // Continuous Vercel Sync states
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [liveSyncToast, setLiveSyncToast] = useState<string | null>(null);

  // Subscribe to real-time events across windows & Vercel instance
  useEffect(() => {
    const unsub = continuousSyncService.subscribe((event) => {
      if (event.type === 'MESSAGE_ADDED' || event.type === 'SESSION_UPDATED') {
        setLiveSyncToast("⚡ Đã đồng bộ tức thời với zenith-anti-hack.vercel.app");
        setTimeout(() => setLiveSyncToast(null), 3500);
      }
    });
    return () => unsub();
  }, []);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);


  // 2 Email Quản trị viên tối cao mặc định
  const MASTER_ADMIN_EMAILS = [
    'trangthanhdai287@gmail.com',
    'dattrang015@gmail.com'
  ];

  const isMasterAdminEmail = (email?: string | null): boolean => {
    if (!email) return false;
    return MASTER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
  };

  // Auth & Sync
  useEffect(() => {
    // Xử lý kết quả trả về nếu đã đăng nhập qua signInWithRedirect
    getRedirectResult(auth).catch((err) => {
      console.warn("getRedirectResult error:", err);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const isMaster = isMasterAdminEmail(firebaseUser.email);
        // Fetch existing profile to check role
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        let profile: UserProfile;
        
        if (userDoc.exists()) {
          profile = { id: userDoc.id, ...userDoc.data() } as any;
          if (profile.isBanned && !isMaster) {
            await signOut(auth);
            alert("Tài khoản của bạn đã bị khóa.");
            return;
          }
          // 2 Gmail mặc định luôn có quyền Admin tối cao nhất
          if (isMaster && profile.role !== 'admin') {
            profile.role = 'admin';
            try {
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
            } catch (e) {}
          }
        } else {
          const storedTempName = localStorage.getItem('zenith_temp_username');
          profile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || storedTempName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            picture: firebaseUser.photoURL || '',
            role: isMaster ? 'admin' : 'user'
          };
          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              ...profile,
              updatedAt: Date.now()
            });
          } catch (e: any) {
            if (e.message?.includes('quota') || e.code === 'resource-exhausted') {
              setIsQuotaExceeded(true);
            }
          }
        }
        
        setUser(profile);
        setIsAdmin(profile.role === 'admin');
        setIsPro(profile.role === 'pro');

        // Bắt buộc bất cứ ai được cấp quyền Admin phải tự tạo mật khẩu admin riêng nếu chưa có
        if (profile.role === 'admin' && (!profile.adminPasswordHash || profile.needsAdminPasswordSetup)) {
          setAdminPasswordModalMode('setup');
          setAdminPasswordModalOpen(true);
        }
      } else {
        setUser(null);
        setSessions([]);
        setCurrentSessionId(null);
        setIsAdmin(false);
        setIsPro(false);
        setIsAdminUnlocked(false);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMessage('');
    setAuthLoading(true);

    if (!emailInput || !passwordInput) {
      setAuthErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      setAuthLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        if (!usernameInput.trim()) {
          setAuthErrorMessage('Vui lòng nhập tên hiển thị.');
          setAuthLoading(false);
          return;
        }
        localStorage.setItem('zenith_temp_username', usernameInput);
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
        await updateProfile(userCredential.user, {
          displayName: usernameInput
        });
        localStorage.removeItem('zenith_temp_username');
      } else {
        await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      let msg = "Lỗi xác thực hệ thống.";
      if (err.code === 'auth/operation-not-allowed') {
        msg = "Phương thức đăng nhập Email/Mật khẩu (Email/Password) chưa được kích hoạt trong Firebase Console. Vui lòng vào Firebase Console -> Authentication -> Sign-in method, chọn Email/Password và chọn Bật (Enable).";
      } else if (err.code === 'auth/invalid-email') msg = "Địa chỉ email không hợp lệ.";
      else if (err.code === 'auth/user-disabled') msg = "Tài khoản này đã bị khóa.";
      else if (err.code === 'auth/user-not-found') msg = "Không tìm thấy tài khoản với email này.";
      else if (err.code === 'auth/wrong-password') msg = "Mật khẩu không chính xác.";
      else if (err.code === 'auth/email-already-in-use') msg = "Email này đã được đăng ký.";
      else if (err.code === 'auth/weak-password') msg = "Mật khẩu quá yếu (tối thiểu 6 ký tự).";
      else if (err.code === 'auth/invalid-credential') msg = "Email hoặc mật khẩu không chính xác.";
      else if (err.message) msg = err.message;
      setAuthErrorMessage(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Sync site settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSiteSettings(doc.data() as any);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync sessions from Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSessions: ChatSession[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatSession));
      setSessions(fetchedSessions);
      continuousSyncService.setSyncedSessionsCount(fetchedSessions.length);
    });

    return () => unsubscribe();
  }, [user]);

  // Reset view specific states
  useEffect(() => {
    setChallengeTimer(null);
  }, [view]);

  // Load user progress and sync profile/role updates in real-time
  useEffect(() => {
    if (user?.uid) {
      const unsub = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserStats(data.stats || {
            solvedCount: 0,
            accuracy: 0,
            level: 'Beginner',
            points: 0
          });

          const isMaster = isMasterAdminEmail(user.email);
          const currentRole = isMaster ? 'admin' : (data.role || user.role);

          setUser(prev => {
            if (!prev) return null;
            return {
              ...prev,
              ...data,
              role: currentRole,
              adminPasswordHash: data.adminPasswordHash,
              needsAdminPasswordSetup: data.needsAdminPasswordSetup
            };
          });

          if (currentRole === 'admin') {
            setIsAdmin(true);
            if (!data.adminPasswordHash || data.needsAdminPasswordSetup) {
              setAdminPasswordModalMode('setup');
              setAdminPasswordModalOpen(true);
            }
          } else {
            setIsAdmin(false);
          }
        }
      });
      return () => unsub();
    }
  }, [user?.uid]);

  const handleLoginSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      const credential = GoogleAuthProvider.credential(credentialResponse.credential);
      try {
        await signInWithCredential(auth, credential);
      } catch (error) {
        console.error("Firebase Auth failed", error);
        alert("Đăng nhập vào hệ thống thất bại.");
      }
    }
  };

  const handleGooglePopupLogin = async () => {
    try {
      setAuthLoading(true);
      setAuthErrorMessage('');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      // Trên app Android (Capacitor/WebView), signInWithRedirect hoạt động ổn định nhất và không bị chặn popup
      const isNativeApp = window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost';

      if (isNativeApp) {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr: any) {
          console.warn("signInWithRedirect failed, trying popup:", redirectErr);
        }
      }

      try {
        await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        if (
          popupError?.code === 'auth/popup-blocked' ||
          popupError?.code === 'auth/cancelled-popup-request' ||
          popupError?.code === 'auth/operation-not-supported-in-this-environment'
        ) {
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
    } catch (error: any) {
      console.error("Sign-in error", error);
      if (error?.code !== 'auth/popup-closed-by-user') {
        setAuthErrorMessage(error?.message || "Đăng nhập Google thất bại.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleExitRole = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: 'user' });
      setUser(prev => prev ? { ...prev, role: 'user' } : null);
      setIsAdmin(false);
      setIsPro(false);
      setIsAdminUnlocked(false);
      alert('Đã thoát quyền. Bạn hiện là người dùng thông thường.');
    } catch (e) {
      console.error("Exit role failed", e);
    }
  };

  const handleOpenAdminHub = () => {
    if (!isAdmin) {
      alert("Bạn chưa được cấp quyền Quản trị viên.");
      return;
    }
    // Nếu chưa tạo mật khẩu riêng hoặc cần thiết lập lại
    if (!user?.adminPasswordHash || user?.needsAdminPasswordSetup) {
      setAdminPasswordModalMode('setup');
      setAdminPasswordModalOpen(true);
      return;
    }
    // Nếu chưa mở khóa phiên Admin
    if (!isAdminUnlocked) {
      setAdminPasswordModalMode('verify');
      setAdminPasswordModalOpen(true);
      return;
    }
    setIsAdminHubOpen(true);
  };

  const handleAdminAuth = async () => {
    const rawInput = adminCodeInput.trim();
    const code = rawInput.toLowerCase();
    if (!user) {
      alert('Vui lòng đăng nhập trước.');
      return;
    }

    try {
      // 1. Kiểm tra nếu nhập trực tiếp Mật khẩu Admin riêng của mình
      if (user.adminPasswordHash) {
        const hashedInput = await hashAdminPassword(rawInput);
        if (hashedInput === user.adminPasswordHash) {
          setIsAdmin(true);
          setIsAdminUnlocked(true);
          setIsAdminHubOpen(true);
          alert('Đã xác thực thành công bằng Mật khẩu Admin riêng của bạn!');
          return;
        }
      }

      // 2. Chặn hoàn toàn các mật khẩu cũ (đạt, trang thành đạt, đạt trang, ...)
      if (code === 'đạt trang' || code === 'thành đạt' || code === 'trang đạt' || code === 'trang thành đạt' || code === 'đạt') {
        alert('CẢNH BÁO: Mật khẩu cũ ("' + rawInput + '") đã bị VÔ HIỆU HÓA HOÀN TOÀN!\n\n1. Quyền Quản trị tối cao chỉ thuộc về 2 email chính thức:\n   - trangthanhdai287@gmail.com\n   - dattrang015@gmail.com\n\n2. Bất kỳ ai được cấp quyền Admin bắt buộc phải tự tạo Mật khẩu Admin riêng và sử dụng mật khẩu đó để xác thực.');
        setAdminCodeInput('');
        localStorage.removeItem('zenith_saved_code');
        return;
      } 
      else if (code === 'zenithpro' || code === 'zenith pro') {
        // Pro User Access
        try {
          await updateDoc(doc(db, 'users', user.uid), { role: 'pro' });
        } catch (e: any) {
          if (e.message?.includes('quota') || e.code === 'resource-exhausted') {
            setIsQuotaExceeded(true);
            console.warn("Quota limit reached for Firestore, updating locally.");
          } else {
            throw e;
          }
        }
        
        setUser(prev => prev ? { ...prev, role: 'pro' } : null);
        setIsPro(true);
        setIsAdmin(false);
        localStorage.setItem('zenith_saved_code', adminCodeInput.trim());
        alert('Chúc mừng! Chế độ Zenith Pro đã được kích hoạt trên tài khoản của bạn.');
      } 
      else {
        alert('Mã truy cập hoặc Mật khẩu Admin không chính xác.');
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi xác thực hệ thống.');
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const rawMessages = currentSession?.messages || [];
  const messages = [...rawMessages];
  
  // If streaming, append the temporary response
  if (isLoading && streamingResponse) {
    messages.push({ role: 'model', content: streamingResponse, modelUsed: selectedModel });
  }

  const isCurrentSessionEmpty = rawMessages.length === 0;

  const createNewSession = () => {
    if (!user) return;

    setView('trainer');
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDeleteId(id);
  };

  const executeDeleteSession = async (id: string) => {
    try {
      if (id.startsWith('local-')) {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (currentSessionId === id) {
          setCurrentSessionId(null);
        }
        return;
      }
      await deleteDoc(doc(db, 'sessions', id));
      continuousSyncService.emit('SESSION_DELETED', { sessionId: id });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
    } catch (error: any) {
      console.error("Failed to delete session", error);
      // Remove from client-side state anyway so user sees immediate results
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
      }
      if (error.message?.includes('quota') || error.code === 'resource-exhausted') {
        setIsQuotaExceeded(true);
      }
    }
  };

  const deleteMessage = async (indexToDelete: number) => {
    if (!currentSessionId) return;
    const newMessages = messages.filter((_, idx) => idx !== indexToDelete);
    // Cập nhật local state ngay lập tức
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, messages: newMessages };
      }
      return s;
    }));
    // Đồng bộ hóa với Firestore
    await handleUpdateSessionMessages(newMessages);
  };

  const updateCurrentSessionMessages = (newMessages: Message[]) => {
    if (!currentSessionId) {
      // If no session exists, create one first
      const firstUserMsg = newMessages.find(m => m.role === 'user')?.content || "Cuộc trò chuyện mới";
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? "..." : ""),
        messages: newMessages,
        updatedAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      return;
    }

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        // If the title is "Cuộc trò chuyện mới" and we have a user message, update title
        let newTitle = s.title;
        if (s.title === "Cuộc trò chuyện mới") {
          const firstUserMsg = newMessages.find(m => m.role === 'user')?.content;
          if (firstUserMsg) {
            newTitle = firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? "..." : "");
          }
        }
        return { ...s, messages: newMessages, updatedAt: Date.now(), title: newTitle };
      }
      return s;
    }));
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentCount = attachedFiles.length;
    if (currentCount + files.length > 8) {
      alert("Bạn chỉ có thể tải lên tối đa 8 tệp cùng lúc.");
      return;
    }

    Array.from(files).forEach(file => {
      if (file.size > 19 * 1024 * 1024) {
        alert(`Dung lượng tệp ${file.name} quá lớn. Vui lòng chọn tệp dưới 19MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        const base64Data = data.split(',')[1];
        setAttachedFiles(prev => [
          ...prev,
          {
            url: data,
            data: base64Data,
            mimeType: file.type || "application/octet-stream",
            name: file.name,
            size: file.size
          }
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (e.target) {
      e.target.value = "";
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  // OPTIMIZATION: Prepare messages for Firestore (strip large data and remove undefined)
  const prepareMessagesForFirestore = (msgs: Message[]) => msgs.map(msg => {
    const cleaned: any = {
      role: msg.role,
      content: msg.content
    };
    if (msg.modelUsed) cleaned.modelUsed = msg.modelUsed;
    if (msg.grounding) cleaned.grounding = msg.grounding;
    if (msg.file) {
      cleaned.file = {
        mimeType: msg.file.mimeType,
        // 500KB limit to stay under Firestore 1MB doc limit comfortably
        url: msg.file.url.length > 500000 ? "large_file_placeholder" : msg.file.url
      };
      if (msg.file.name) cleaned.file.name = msg.file.name;
    }
    if (msg.files && msg.files.length > 0) {
      cleaned.files = msg.files.map(f => ({
        mimeType: f.mimeType,
        url: f.url.length > 500000 ? "large_file_placeholder" : f.url,
        ...(f.name ? { name: f.name } : {})
      }));
    }
    return cleaned;
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (!user || (!input.trim() && attachedFiles.length === 0) || isLoading) {
      e?.preventDefault();
      return;
    }
    e?.preventDefault();

    const userMessage = input.trim();
    const currentFiles = attachedFiles;
    
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);
    setStreamingResponse("");

    let activeSessionId = currentSessionId;
    let currentMsgs = [...messages];

    try {
      if (!activeSessionId) {
        if (isQuotaExceeded) {
          // Local only session
          activeSessionId = "local-" + Date.now();
          setCurrentSessionId(activeSessionId);
          currentMsgs = [];
        } else {
          const randomId = crypto.randomUUID().replace(/-/g, '').slice(0, 13);
          activeSessionId = randomId;
          setCurrentSessionId(randomId);
          currentMsgs = [];
        }
      }
      
      const newMessages: Message[] = [...currentMsgs, { 
        role: 'user', 
        content: userMessage, 
        ...(currentFiles.length > 0 ? { 
          files: currentFiles.map(f => ({
            url: f.url,
            mimeType: f.mimeType,
            name: f.name
          }))
        } : {})
      }];
      
      // Update local state immediately for instant feedback
      updateCurrentSessionMessages(newMessages);
      
      // Update Firestore with just the user message first
      if (!isQuotaExceeded && activeSessionId && !activeSessionId.startsWith('local-')) {
        try {
          await setDoc(doc(db, 'sessions', activeSessionId), {
            title: currentSession?.title || userMessage.slice(0, 30) + (userMessage.length > 30 ? "..." : "") || "Cuộc trò chuyện mới",
            userId: user.uid,
            messages: prepareMessagesForFirestore(newMessages),
            updatedAt: Date.now()
          }, { merge: true });
        } catch (err: any) {
          if (err.message?.includes('quota') || err.code === 'resource-exhausted') {
            setIsQuotaExceeded(true);
          }
          console.warn("Firestore update failed, continuing without history sync", err);
        }
      }

      let fullResponse = "";
      let groundingData: any = null;
      
      // OPTIMIZATION: Construct history using currentMsgs instead of newMessages to avoid duplicating the current user message in the payload!
      const history: ChatHistoryItem[] = currentMsgs.map(msg => ({
        role: msg.role,
        parts: [
          { text: msg.content },
          ...(msg.file && msg.file.url.startsWith('data:') ? [{ 
            inlineData: { 
              mimeType: msg.file.mimeType, 
              data: msg.file.url.split(',')[1] 
            } 
          }] : []),
          ...(msg.files && msg.files.length > 0 ? msg.files.filter(f => f.url.startsWith('data:')).map(f => ({
            inlineData: {
              mimeType: f.mimeType,
              data: f.url.split(',')[1]
            }
          })) : [])
        ]
      }));

      const stream = sendMessageStream(
        userMessage, 
        history, 
        selectedModel,
        currentFiles.length > 0 ? currentFiles.map(f => ({ mimeType: f.mimeType, data: f.data })) : undefined,
        isAdmin ? siteSettings.systemInstruction : undefined,
        isAdmin && siteSettings.godMode,
        useSearch
      );
      
      for await (const chunk of stream) {
        if (chunk.text) {
          fullResponse += chunk.text;
          setStreamingResponse(fullResponse);
        }
        if (chunk.grounding) {
          groundingData = chunk.grounding;
        }
      }

      // Final update to Firestore and local state after stream complete
      const finalMessages: Message[] = [
        ...newMessages,
        { 
          role: 'model', 
          content: fullResponse || "*(Không có phản hồi)*", 
          modelUsed: selectedModel,
          grounding: groundingData
        }
      ];

      updateCurrentSessionMessages(finalMessages);

      if (!isQuotaExceeded && activeSessionId && !activeSessionId.startsWith('local-')) {
        try {
          await setDoc(doc(db, 'sessions', activeSessionId), {
            messages: prepareMessagesForFirestore(finalMessages),
            updatedAt: Date.now(),
            title: (currentSession?.title === "Cuộc trò chuyện mới" || !currentSession?.title) 
              ? userMessage.slice(0, 30) + (userMessage.length > 30 ? "..." : "") || "Cuộc trò chuyện mới"
              : currentSession.title,
            userId: user.uid
          }, { merge: true });
          continuousSyncService.emit('MESSAGE_ADDED', { sessionId: activeSessionId });
        } catch (err: any) {
          console.warn("Final Firestore update failed", err);
          if (err.message?.includes('quota') || err.code === 'resource-exhausted') {
            setIsQuotaExceeded(true);
            console.error("Quota exceeded - history will not be saved.");
          }
        }
      }

    } catch (error: any) {
      if ((error as any).name === 'AbortError') return;
      console.error("Stream error", error);
      
      const cleanErrMsg = error.message || "Lỗi không xác định";
      const isQuotaError = cleanErrMsg.includes('quota') || error.code === 'resource-exhausted' || cleanErrMsg.includes('RESOURCE_EXHAUSTED');
      if (isQuotaError) {
        setIsQuotaExceeded(true);
      }

      const isTransientError = cleanErrMsg.includes("503") || 
                               cleanErrMsg.includes("UNAVAILABLE") || 
                               cleanErrMsg.includes("demand") || 
                               cleanErrMsg.includes("temporary") ||
                               cleanErrMsg.includes("overloaded");

      let userFriendlyError = "";
      if (isQuotaError) {
        userFriendlyError = `⚠️ **Đã chạm hạn ngạch (Quota Limit / Resource Exhausted):**\n\n\`${cleanErrMsg}\`\n\n*Hệ thống đang quá tải hoặc tài khoản đã vượt quá lượt sử dụng miễn phí tối đa. Vui lòng quay lại thử lại sau ít phút (hoặc kiểm tra lại API Key thiết lập).*`;
      } else if (isTransientError) {
        userFriendlyError = `⚠️ **Mô hình AI đang bận (Quá tải tạm thời / 503 Service Unavailable):**\n\n\`${cleanErrMsg}\`\n\n*Mô hình hiện tại đang có quá nhiều yêu cầu đồng thời từ người dùng. Sự cố này chỉ mang tính chất tạm thời, vui lòng bấm vào nút gửi lại hoặc thử lại sau vài giây!*`;
      } else {
        userFriendlyError = `⚠️ **Không nhận được phản hồi từ trợ lý:**\n\n\`${cleanErrMsg}\`\n\n*Gợi ý: Nếu tin nhắn của bạn quá dài hoặc chứa tệp tin lớn, vui lòng thử chia nhỏ tin nhắn hoặc xóa bớt tệp học liệu/hình ảnh để giảm dung lượng tải.*`;
      }
      
      const errorMessages: Message[] = [
        ...rawMessages,
        {
          role: 'user',
          content: userMessage,
          ...(currentFiles.length > 0 ? {
            files: currentFiles.map(f => ({
              url: f.url,
              mimeType: f.mimeType,
              name: f.name
            }))
          } : {})
        },
        { 
          role: 'model', 
          content: userFriendlyError,
          modelUsed: selectedModel
        }
      ];

      updateCurrentSessionMessages(errorMessages);

      if (!isQuotaExceeded && activeSessionId && !activeSessionId.startsWith('local-')) {
        try {
          await updateDoc(doc(db, 'sessions', activeSessionId), {
            messages: prepareMessagesForFirestore(errorMessages),
            updatedAt: Date.now()
          });
        } catch (e) {
          console.warn("Saving error response failed", e);
        }
      }

    } finally {
      setIsLoading(false);
      setStreamingResponse("");
    }
  };

  const exportChats = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "zenith_admin_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const systemReset = async () => {
    if (confirm("WARNING: Zenith Admin - Are you sure you want to purge ALL session data for this user? This cannot be undone.")) {
      try {
        const q = query(collection(db, 'sessions'), where('userId', '==', user?.uid));
        const snapshot = await getDoc(doc(db, 'users', user?.uid || '')); // This is just to test existence
        // For actual batch delete in playground, we'll just alert that it's safer to delete manually or use firebase console
        alert("Zenith v2.6.1: Vui lòng truy cập Firebase Console để thực hiện xóa hàng loạt dữ liệu.");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleUpdateSessionMessages = async (newMessages: Message[]) => {
    if (!currentSessionId || !user || isQuotaExceeded) return;
    try {
      await updateDoc(doc(db, 'sessions', currentSessionId), {
        messages: prepareMessagesForFirestore(newMessages),
        updatedAt: Date.now()
      });
    } catch (error: any) {
      if (error.message?.includes('quota') || error.code === 'resource-exhausted') {
        setIsQuotaExceeded(true);
        console.warn("Quota limit reached, local update only.");
      }
    }
  };

  const handleResetAllData = async () => {
    if (!user) return;
    if (!confirm("CẢNH BÁO: Hành động này sẽ xóa TOÀN BỘ lịch sử trò chuyện của Sếp để làm video. Sếp có chắc chắn không?")) return;

    try {
      const q = query(collection(db, 'sessions'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      setSessions([]);
      setCurrentSessionId(null);
      alert("Hệ thống đã được làm sạch. Sẵn sàng để quay video ra mắt!");
      setIsAdminHubOpen(false);
    } catch (error) {
      console.error("Reset failed", error);
      alert("Lỗi khi reset dữ liệu.");
    }
  };

  const clearCurrentChat = () => {
    if (currentSessionId) {
      handleUpdateSessionMessages([]);
    }
  };

  // Sidebar Navigation Component
  const NavItem = ({ id, icon: Icon, label, active }: { id: typeof view, icon: any, label: string, active: boolean }) => (
    <button
      onClick={() => {
        setView(id);
        setIsSidebarOpen(false);
      }}
      className={`flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-300 w-full group ${
        active 
          ? 'bg-brand text-white shadow-lg shadow-brand/20' 
          : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
      } ${isMenuCollapsed ? 'justify-center px-0' : ''}`}
    >
      <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'animate-pulse' : ''} ${isMenuCollapsed ? 'shrink-0' : ''}`} />
      {(!isMenuCollapsed || isSidebarOpen) && <span className="font-bold text-sm tracking-wide truncate">{label}</span>}
    </button>
  );

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen bg-[#030712] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#030712] text-white flex flex-col font-sans overflow-y-auto">
        {/* Background Gradients */}
        <div className="absolute inset-x-0 top-0 h-[50vh] bg-gradient-to-b from-brand/20 to-transparent blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[50vh] bg-gradient-to-t from-purple-500/10 to-transparent blur-3xl opacity-30 pointer-events-none" />

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-brand/20"
          >
            <Sparkles className="w-10 h-10 text-brand" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white via-gray-300 to-gray-600 bg-clip-text text-transparent uppercase text-center">
              {siteSettings.siteName}<span style={{ color: siteSettings.themeColor }}>.INTEL</span>
            </h1>
            <p className="text-base md:text-lg text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed mb-8">
              {siteSettings.tagline || 'Chào mừng bạn đến với hệ điều hành trí tuệ nhân tạo thế hệ mới. Hãy đăng nhập để bắt đầu trải nghiệm sức mạnh phân tích tối thượng.'}
            </p>
          </motion.div>

          {/* Authentication Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-md bg-black/50 border border-white/10 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden"
          >
            {/* Top decorative glow */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand/15 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header Tabs: Email vs Google */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 mb-6 relative z-10">
              <button
                type="button"
                onClick={() => {
                  setAuthMethodTab('email');
                  setAuthErrorMessage('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  authMethodTab === 'email' 
                    ? 'bg-brand text-white shadow-lg shadow-brand/30' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Đăng nhập Email</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethodTab('google');
                  setAuthErrorMessage('');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  authMethodTab === 'google' 
                    ? 'bg-brand text-white shadow-lg shadow-brand/30' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Google Login</span>
              </button>
            </div>

            {authMethodTab === 'email' ? (
              /* TAB 1: EMAIL & PASSWORD */
              <div className="relative z-10">
                <div className="text-center mb-5">
                  <h2 className="text-xl font-black uppercase tracking-tight text-white mb-1">
                    {isSignUp ? 'Đăng ký tài khoản Email' : 'Đăng nhập bằng Email'}
                  </h2>
                  <p className="text-[11px] text-gray-400 font-medium">
                    {isSignUp ? 'Tạo tài khoản mới để trải nghiệm hệ thống' : 'Nhập địa chỉ Email và mật khẩu của bạn để vào hệ thống'}
                  </p>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-3.5 text-left">
                  <AnimatePresence mode="popLayout">
                    {isSignUp && (
                      <motion.div
                        key="signup-name-field"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-1.5 overflow-hidden"
                      >
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tên hiển thị</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4.5 h-4.5" />
                          <input
                            type="text"
                            placeholder="Nhập họ và tên hoặc biệt danh..."
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            className="w-full bg-[#0c101b] border border-white/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-brand/60 transition-all text-xs font-medium text-white placeholder-gray-600"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex items-center justify-between">
                      <span>Địa chỉ Email</span>
                      <span className="text-[9px] text-brand font-bold normal-case">Gmail, Outlook, Yahoo...</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4.5 h-4.5" />
                      <input
                        type="email"
                        required
                        placeholder="example@gmail.com..."
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full bg-[#0c101b] border border-white/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-brand/60 transition-all text-xs font-medium text-white placeholder-gray-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mật khẩu</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4.5 h-4.5" />
                      <input
                        type="password"
                        required
                        placeholder="•••••••• (Tối thiểu 6 ký tự)"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full bg-[#0c101b] border border-white/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-brand/60 transition-all text-xs font-medium text-white placeholder-gray-600"
                      />
                    </div>
                  </div>

                  {authErrorMessage && (
                    <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex gap-2.5 text-red-400">
                      <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-400" />
                      <span className="text-xs font-medium leading-relaxed">{authErrorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    style={{ backgroundColor: siteSettings.themeColor }}
                    className="w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 shadow-xl shadow-brand/25 disabled:opacity-50 text-white cursor-pointer"
                  >
                    {authLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang xử lý đăng nhập...</span>
                      </>
                    ) : (
                      <>
                        <span>{isSignUp ? 'ĐĂNG KÝ VÀ VÀO HỆ THỐNG' : 'ĐĂNG NHẬP BẰNG EMAIL'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Switch between Sign in and Sign up */}
                <div className="mt-5 pt-4 border-t border-white/5 text-center flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setAuthErrorMessage('');
                    }}
                    className="text-xs text-brand hover:underline transition-all font-bold cursor-pointer"
                  >
                    {isSignUp ? 'Đã có tài khoản? Bấm để Đăng nhập ngay' : 'Chưa có tài khoản? Bấm vào đây để Đăng ký'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMethodTab('google')}
                    className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    Hoặc bấm chuyển sang Đăng nhập nhanh bằng Google →
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: GOOGLE AUTH */
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-5">
                  <h2 className="text-xl font-black uppercase tracking-tight text-white mb-1">
                    Đăng nhập tài khoản Google
                  </h2>
                  <p className="text-[11px] text-gray-400 font-medium">
                    Đăng nhập tự động 1 chạm bằng tài khoản Google của bạn
                  </p>
                </div>

                {/* Google Popup Direct Button */}
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleGooglePopupLogin}
                  className="w-full py-4 px-5 mb-4 rounded-2xl bg-white hover:bg-gray-100 text-gray-900 font-extrabold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>{authLoading ? 'Đang kết nối Google...' : 'ĐĂNG NHẬP BẰNG GOOGLE'}</span>
                </button>

                {authErrorMessage && (
                  <div className="w-full mt-3 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex gap-2.5 text-red-400 text-left">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-400" />
                    <span className="text-xs font-medium leading-relaxed">{authErrorMessage}</span>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-white/5 w-full text-center">
                  <button
                    type="button"
                    onClick={() => setAuthMethodTab('email')}
                    className="text-xs text-brand hover:underline font-bold cursor-pointer"
                  >
                    ← Bấm vào đây để Đăng nhập bằng Email & Mật khẩu
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest opacity-60 mt-8">
            Hệ thống Huấn luyện Tư duy Logic chuyên sâu
          </p>
        </div>

        <div className="p-8 border-t border-white/5 flex flex-wrap justify-center gap-x-10 gap-y-4 relative z-10 bg-black/20">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <span>Tốc độ Tối thượng</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase tracking-widest">
            <Brain className="w-3.5 h-3.5 text-purple-500" />
            <span>Suy luận Đa tầng</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-black uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>Bảo mật Doanh nghiệp</span>
          </div>
        </div>
      </div>
    );
  }

  const filteredSessions = sessions.filter((s) => {
    if (!sessionSearchQuery.trim()) return true;
    const q = sessionSearchQuery.toLowerCase();
    const titleMatch = s.title?.toLowerCase().includes(q);
    const contentMatch = s.messages?.some(m => m.content?.toLowerCase().includes(q));
    return !!(titleMatch || contentMatch);
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const getGroupLabel = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    
    // Reset hours to compare calendar days accurately
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const sevenDaysAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgoStart = todayStart - 30 * 24 * 60 * 60 * 1000;

    if (timestamp >= todayStart) {
      return "Hôm nay";
    } else if (timestamp >= yesterdayStart) {
      return "Hôm qua";
    } else if (timestamp >= sevenDaysAgoStart) {
      return "7 ngày qua";
    } else if (timestamp >= thirtyDaysAgoStart) {
      return "30 ngày qua";
    } else {
      return "Cũ hơn";
    }
  };

  const initialGroups = [
    { label: "Hôm nay", items: [] as ChatSession[] },
    { label: "Hôm qua", items: [] as ChatSession[] },
    { label: "7 ngày qua", items: [] as ChatSession[] },
    { label: "30 ngày qua", items: [] as ChatSession[] },
    { label: "Cũ hơn", items: [] as ChatSession[] }
  ];

  const sessionGroups = initialGroups.map(g => ({ ...g, items: [] as ChatSession[] }));
  sortedSessions.forEach(s => {
    const label = getGroupLabel(s.updatedAt || Date.now());
    const g = sessionGroups.find(group => group.label === label);
    if (g) {
      g.items.push(s);
    } else {
      sessionGroups[sessionGroups.length - 1].items.push(s);
    }
  });

  const activeSessionGroups = sessionGroups.filter(g => g.items.length > 0);

  return (
    <div className="flex bg-[#030712] text-white font-sans min-h-screen overflow-hidden">
      {/* Sidebar background overlay for mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Gemini-Style Sidebar (Mobile slide-over, Desktop sticky sidebar) */}
      <nav className={`fixed md:sticky left-0 top-0 h-screen bg-[#0b0e14] border-r border-white/5 z-40 flex flex-col p-3 transition-transform md:transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isMenuCollapsed ? 'md:w-20' : 'md:w-72'} w-72 shrink-0`}>
        <div className="flex items-center px-2 mb-8 h-16 justify-between border-b border-white/5">
          <div className="flex items-center gap-3 overflow-hidden">
            <button 
              onClick={() => {
                setView('profile');
                setIsSidebarOpen(false);
              }}
              className="hover:opacity-90 transition-all active:scale-95 cursor-pointer"
              title="Cài đặt Phân quyền & Tài khoản"
            >
              <ZenithLogo size={36} glow={true} />
            </button>
            {(!isMenuCollapsed || isSidebarOpen) && (
              <div className="flex flex-col justify-center">
                <span className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400">
                  ZENITH AI
                </span>
                {isAdmin ? (
                  <span className="text-[8px] font-black tracking-widest text-yellow-500 uppercase">Master Admin</span>
                ) : isPro ? (
                  <span className="text-[8px] font-black tracking-widest text-brand uppercase">Zenith Pro</span>
                ) : (
                  <span className="text-[8px] font-black tracking-widest text-gray-500 uppercase">Trợ lý Cấp cao</span>
                )}
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
            className="hidden md:block p-3 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-3 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-1 mb-8">
          <button 
            onClick={createNewSession}
            className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold transition-all hover:bg-white/10 ${isMenuCollapsed && !isSidebarOpen ? 'px-0' : 'px-4'}`}
          >
            <Plus className="w-5 h-5 text-brand" />
            {(!isMenuCollapsed || isSidebarOpen) && <span>Bắt đầu mới</span>}
          </button>
        </div>

        <div className="space-y-1 w-full px-1">
          {/* USER MENU (Regular) */}
          {!isAdmin && !isPro && (
            <>
              <NavItem id="trainer" icon={Brain} label="Logic Trainer" active={view === 'trainer'} />
              <NavItem id="explain" icon={MessageSquarePlus} label="AI Giải Thích" active={view === 'explain'} />
            </>
          )}

          {/* PRO MENU (Zenith Pro) */}
          {isPro && (
            <>
              {(!isMenuCollapsed || isSidebarOpen) && (
                <p className="text-[10px] font-black text-brand uppercase tracking-widest px-4 mb-2 mt-4">Pro Workspace</p>
              )}
              <NavItem id="trainer" icon={Zap} label="Zenith Core" active={view === 'trainer'} />
              <NavItem id="explain" icon={MessageSquarePlus} label="Pro Explainer" active={view === 'explain'} />
            </>
          )}

          {/* ADMIN MENU (Master Admin) */}
          {isAdmin && (
            <>
              {(!isMenuCollapsed || isSidebarOpen) && (
                <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest px-4 mb-2 mt-4">Authority Hub</p>
              )}
              <NavItem id="trainer" icon={Shield} label="Admin Terminal" active={view === 'trainer'} />
              <NavItem id="explain" icon={Database} label="Data Mastery" active={view === 'explain'} />
            </>
          )}
        </div>

        {(!isMenuCollapsed || isSidebarOpen) && sessions.length > 0 && (
          <div className="flex-1 overflow-y-auto px-3 mt-6 pb-4 flex flex-col gap-2 scrollbar-hide">
            <div className="px-4 mb-3 flex items-center justify-between">
              <p className="text-xs font-black text-gray-600 uppercase tracking-widest">Lịch sử trò chuyện</p>
              {sessionSearchQuery && (
                <span className="text-[10px] font-black text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                  {filteredSessions.length} kết quả
                </span>
              )}
            </div>

            {/* Thanh tìm kiếm lịch sử cuộc trò chuyện */}
            <div className="px-1 mb-2">
              <div className="relative flex items-center bg-white/5 border border-white/5 focus-within:border-brand/40 focus-within:bg-[#0c101b] rounded-2xl transition-all">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 select-none pointer-events-none" />
                <input
                  type="text"
                  value={sessionSearchQuery}
                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                  placeholder="Tìm tên hoặc nội dung..."
                  className="w-full pl-10 pr-9 py-2.5 bg-transparent text-xs text-white placeholder-gray-500 outline-none rounded-2xl font-medium focus:ring-0"
                />
                {sessionSearchQuery && (
                  <button
                    onClick={() => setSessionSearchQuery("")}
                    className="absolute right-3 p-1 rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {activeSessionGroups.length > 0 ? (
              activeSessionGroups.map((group) => (
                <div key={group.label} className="mt-2.5 first:mt-0 flex flex-col gap-1">
                  <div className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 mt-2 select-none">
                    {group.label}
                  </div>
                  {group.items.map((s) => (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setCurrentSessionId(s.id);
                        setView('trainer');
                        setIsSidebarOpen(false);
                      }}
                      className={`group flex items-center justify-between w-full px-5 py-3 rounded-2xl transition-all cursor-pointer ${
                        currentSessionId === s.id 
                          ? 'bg-white/5 text-brand border border-white/5' 
                          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                      }`}
                    >
                      <span className="text-sm font-bold truncate pr-3 select-none">{s.title}</span>
                      <div 
                        onClick={(e) => deleteSession(s.id, e)}
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-xl text-gray-500 hover:text-red-500 transition-all shrink-0"
                        title="Xóa đoạn chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="py-6 px-4 text-center select-none bg-white/[0.02] border border-white/5 rounded-2xl">
                <Search className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                <p className="text-xs text-gray-500 italic font-bold">Không tìm thấy cuộc trò chuyện nào</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto w-full px-2 pb-4 pt-2 border-t border-white/5 space-y-2">
          {(!isMenuCollapsed || isSidebarOpen) ? (
            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between gap-2">
              <div 
                onClick={() => setView('profile')}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                title="Bấm để xem Hồ sơ & Quản trị tài khoản"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-black text-xs shrink-0 overflow-hidden">
                  {user?.picture ? (
                    <img src={user.picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user?.name || user?.email || 'U')[0].toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-gray-200 truncate">{user?.name || 'User'}</p>
                    {isMasterAdminEmail(user?.email) && (
                      <span className="text-[8px] font-black tracking-wider bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded border border-red-500/30">
                        ROOT
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate font-mono" title={user?.email || ''}>
                    {user?.email || 'Chưa có email'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shrink-0 cursor-pointer"
                title="Đăng xuất để đăng nhập bằng Email khác"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setView('profile')}
                className={`p-3 rounded-2xl transition-all ${view === 'profile' ? 'bg-brand text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                title={`Tài khoản: ${user?.email || ''}`}
              >
                <User className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Area */}
      <main className={`flex-1 relative transition-all duration-300 flex flex-col h-dvh overflow-hidden ${isMenuCollapsed ? 'md:ml-0' : 'md:ml-0'}`}>
        
        {/* Mobile Unified Top Header Bar */}
        <div className="md:hidden w-full px-4 py-3 flex items-center justify-between bg-[#0b0e14]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 -ml-1 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              title="Mở menu lịch sử"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5">
              <ZenithLogo size={24} glow={true} />
              <span className="text-xs font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400">
                ZENITH AI
              </span>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-brand/10 border border-brand/20 text-brand ml-1 truncate max-w-[80px]">
              {view}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button
                onClick={() => setIsSyncModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold"
                title="Đồng bộ Vercel Live"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>Sync</span>
              </button>
            )}
            <button
              onClick={() => setView('profile')}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold"
              title="Kích hoạt VIP"
            >
              <Key className="w-3 h-3 shrink-0" />
              <span>VIP</span>
            </button>
            <button
              onClick={() => setView('profile')}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
              title="Tài khoản"
            >
              <User className="w-4 h-4 text-brand" />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {view === 'trainer' || view === 'explain' || view === 'challenge' ? (
          <div className="flex-1 flex flex-col items-center w-full min-h-0 overflow-hidden">
            {/* View Header (Desktop only to prevent double header) */}
            <div className="hidden md:flex w-full max-w-4xl px-8 py-6 items-center justify-between sticky top-0 z-30 bg-[#030712]/80 backdrop-blur-md border-b border-white/5 animate-fade-in shrink-0">
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-xl ${view === 'challenge' ? 'bg-red-500/10' : 'bg-brand/10'}`}>
                   {view === 'trainer' && <Brain className="w-5 h-5 text-brand" />}
                   {view === 'explain' && <MessageSquarePlus className="w-5 h-5 text-brand" />}
                   {view === 'challenge' && <Target className="w-5 h-5 text-red-500 animate-pulse" />}
                 </div>
                 <h2 className="text-sm font-black uppercase tracking-[0.2em]">{view}</h2>
              </div>
              
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={() => setIsSyncModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 text-xs font-black tracking-wide transition-all shadow-sm active:scale-95 duration-200 cursor-pointer"
                    title="Đang đồng bộ liên tục 24/7 với zenith-anti-hack.vercel.app (Dành cho Admin)"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span>Vercel Sync: Live</span>
                  </button>
                )}

                <button
                  onClick={() => setView('profile')}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-brand/10 border border-brand/20 hover:bg-brand/20 text-brand text-xs font-black tracking-wide transition-all shadow-md active:scale-95 duration-200 cursor-pointer animate-pulse"
                  title="Nhập mã ưu đãi & Kích hoạt Đặc quyền VIP"
                >
                  <Key className="w-3.5 h-3.5 shrink-0" />
                  <span>Kích hoạt VIP / Nhập mã</span>
                </button>

                {/* Email chip & Quick Logout */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[11px] font-mono text-gray-300 max-w-[150px] truncate" title={user?.email || ''}>
                    {user?.email || 'User'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10 cursor-pointer"
                    title="Đăng xuất để đăng nhập bằng Email khác"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                {currentSessionId && messages.length > 0 && (
                  <button
                    onClick={(e) => deleteSession(currentSessionId, e)}
                    className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Xóa đoạn chat này"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                {view === 'challenge' && (
                   <div className="px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-mono font-bold text-xs md:text-sm flex items-center gap-1.5 md:gap-2">
                     <StopCircle className="w-4 h-4 shrink-0" />
                     {challengeTimer ?? '60:00'}
                   </div>
                )}
              </div>
            </div>

            <div 
              ref={chatContainerRef}
              className="flex-1 w-full max-w-4xl overflow-y-auto px-4 md:px-6 py-6 md:py-10 scrollbar-hide space-y-6 md:space-y-10"
            >
              {isQuotaExceeded && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4"
                >
                  <div className="p-2 bg-red-500/20 rounded-xl">
                    <Lock className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-400">Hạn ngạch lưu trữ hôm nay đã hết</p>
                    <p className="text-xs text-red-400/70">Chat vẫn hoạt động nhưng lịch sử sẽ không được lưu vào hệ thống.</p>
                  </div>
                </motion.div>
              )}
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative mb-6">
                    <ZenithLogo size={110} glow={true} className="transition-transform duration-500 hover:scale-105" />
                  </div>
                  <h2 className="text-4xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400 mb-2">
                    ZENITH AI
                  </h2>
                  <p className="text-sm font-semibold tracking-widest text-[#a855f7]/80 uppercase mb-4">Hệ thống Trí tuệ Siêu việt</p>
                  <p className="text-gray-400 max-w-md mx-auto leading-relaxed text-sm">
                    {view === 'trainer' && "Tôi sẽ đưa ra các thử thách logic để luyện tập trí não của bạn."}
                    {view === 'explain' && "Hãy gửi câu hỏi hoặc tài liệu cần phân tích, tôi sẽ giải thích từng bước."}
                    {view === 'challenge' && "Chế độ áp lực cao. Giải đố nhanh nhất có thể!"}
                  </p>
                  <button 
                    onClick={() => {
                        const prompt = view === 'trainer' ? "Tạo cho tôi một câu đố logic mới (Toán học hoặc Suy luận)." : "Tôi muốn hỏi một câu hỏi...";
                        setInput(prompt);
                    }}
                    className="mt-8 px-8 py-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-brand hover:text-white transition-all font-bold text-sm"
                  >
                    Bắt đầu ngay
                  </button>
                </div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group flex gap-3 md:gap-6 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                      message.role === 'user' ? 'bg-brand' : 'bg-white/5 border border-white/10'
                    }`}>
                      {message.role === 'user' ? <User className="w-4 h-4 md:w-5 md:h-5 text-white" /> : <ZenithLogo size={22} glow={false} />}
                    </div>
                    <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] space-y-3`}>
                        {/* Render legacy single file */}
                        {message.file && !message.files && (
                          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0c101b]/80 max-w-sm">
                            {renderFileItem(message.file)}
                          </div>
                        )}

                        {/* Render multiple files array */}
                        {message.files && message.files.length > 0 && (
                          <div className="flex flex-col gap-2 max-w-md w-full">
                            {message.files.map((file, fIdx) => (
                              <div key={fIdx} className="rounded-2xl overflow-hidden border border-white/10 bg-[#0c101b]/80 max-w-sm self-start">
                                {renderFileItem(file)}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className={`px-4 md:px-5 py-2.5 md:py-3.5 rounded-[1.5rem] md:rounded-[2rem] text-xs md:text-sm leading-relaxed ${
                          message.role === 'user' ? 'bg-brand text-white rounded-tr-none' : 'bg-[#0b0e14] border border-white/5 text-gray-200 rounded-tl-none'
                        }`}>
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code(props) {
                                const { className, children, ...rest } = props;
                                const match = /language-(\w+)/.exec(className || '');
                                const isInline = !match && !String(children).includes('\n');
                                
                                if (isInline) {
                                  return (
                                    <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono font-medium text-brand-light" {...rest}>
                                      {children}
                                    </code>
                                  );
                                }
                                
                                const codeString = String(children).replace(/\n$/, '');
                                const language = match ? match[1] : 'code';
                                
                                return <CustomCodeBlock language={language} value={codeString} />;
                              },
                              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="pl-0.5">{children}</li>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-brand/55 pl-4 py-0.5 my-2 bg-white/5 rounded-r-lg text-gray-300 italic">{children}</blockquote>,
                              a: ({ href, children }) => (
                                <a 
                                  href={href} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-brand-light hover:underline font-medium transition-colors"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        
                        {/* Copy operations for Individual Messages (Removed individual message deletion) */}
                        <div className="flex items-center gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              const content = message.content;
                              // Match content within markdown code blocks
                              const codeBlockRegex = /```(?:[a-zA-Z0-9+#-]+)?\n([\s\S]*?)\n```/g;
                              const matches = [...content.matchAll(codeBlockRegex)];
                              
                              if (matches.length > 0) {
                                const codeOnly = matches.map(m => m[1]).join("\n\n");
                                navigator.clipboard.writeText(codeOnly);
                                alert("Đã sao chép mã code!");
                              } else {
                                navigator.clipboard.writeText(content);
                                alert("Đã sao chép nội dung tin nhắn!");
                              }
                            }}
                            className="text-[11px] text-gray-500 hover:text-emerald-400 hover:bg-white/10 flex items-center gap-1.5 transition-all px-2.5 py-1 rounded-xl bg-white/5 border border-white/5"
                            title="Sao chép mã code nếu có, tương tự sao chép toàn bộ tin nhắn"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Sao chép code nếu có</span>
                          </button>
                        </div>

                        {message.grounding?.groundingChunks && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {message.grounding.groundingChunks.map((chunk: any, i: number) => (
                              chunk.web && (
                                <a 
                                  key={i}
                                  href={chunk.web.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-gray-400 hover:text-brand hover:border-brand/30 transition-all"
                                >
                                  <Globe className="w-3 h-3" />
                                  <span className="max-w-[150px] truncate">{chunk.web.title}</span>
                                </a>
                              )
                            ))}
                          </div>
                        )}
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="w-full max-w-4xl px-6 pb-8">
              {/* Attached files preview list */}
              {attachedFiles.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-3 max-h-40 overflow-y-auto p-1 scrollbar-thin">
                  {attachedFiles.map((file, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-3 py-2 rounded-2xl w-fit text-xs hover:border-white/20 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg border border-white/5 bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
                        {file.mimeType.startsWith('image/') ? (
                          <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                        ) : file.mimeType.startsWith('video/') ? (
                          <Bot className="w-4 h-4 text-emerald-400" />
                        ) : file.mimeType.includes('pdf') ? (
                          <span className="text-[9px] font-bold text-red-500 uppercase">PDF</span>
                        ) : file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv') ? (
                          <span className="text-[9px] font-bold text-green-500 uppercase">XLS</span>
                        ) : file.mimeType.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc') ? (
                          <span className="text-[9px] font-bold text-blue-500 uppercase">DOC</span>
                        ) : file.mimeType.startsWith('audio/') ? (
                          <Mic className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <Paperclip className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-[60px] max-w-[120px]">
                        <p className="text-[11px] font-bold truncate text-gray-200">{file.name}</p>
                        <p className="text-[9px] text-gray-400 font-medium truncate">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeAttachedFile(idx)} 
                        className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-all ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Quick Action templates when files are uploaded */}
              {attachedFiles.length > 0 && (
                <div className="mb-3 flex overflow-x-auto gap-2 pb-1 scrollbar-none animate-fade-in">
                  <button
                    type="button"
                    onClick={() => setInput("Hãy tóm tắt chi tiết tất cả các tài liệu tôi đã tải lên, nêu rõ ý chính và số liệu quan trọng.")}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/10 text-xs font-bold text-emerald-400 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Tóm tắt văn bản 📄</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInput("Hãy tìm và trích xuất tất cả lịch trình, mốc thời gian, công việc, ngày giờ cụ thể trong các tài liệu này để lập thời biểu biểu chi tiết.")}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 hover:bg-purple-500/10 text-xs font-bold text-purple-400 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Trích xuất lịch trình 📅</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInput("Dựa trên các tài liệu tôi đã tải lên, hãy lập một danh sách công việc (To-Do List) chi tiết kèm hướng dẫn thực hiện từng mục.")}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/10 text-xs font-bold text-blue-400 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Lập To-Do List 📝</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInput("Hãy phân tích số liệu thống kê, dữ liệu chi tiết trong các tệp này và lập bảng báo cáo nhận xét xu hướng.")}
                    className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:border-yellow-500/30 hover:bg-yellow-500/10 text-xs font-bold text-yellow-400 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Phân tích số liệu 📊</span>
                  </button>
                </div>
              )}

              <form 
                onSubmit={handleSubmit}
                className="relative bg-[#0b0f17]/90 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-[2.5rem] p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2 shadow-2xl"
              >
                <button
                  type="button"
                  onClick={() => setUseSearch(!useSearch)}
                  className={`p-2.5 sm:p-3 transition-all flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl ${useSearch ? 'text-brand bg-brand/10' : 'text-gray-500 hover:text-gray-300'}`}
                  title={useSearch ? "Tắt tìm kiếm Internet" : "Bật tìm kiếm Internet"}
                >
                  <Globe className={`w-4 h-4 sm:w-5 sm:h-5 ${useSearch ? 'animate-pulse' : ''}`} />
                  {useSearch && !isMenuCollapsed && <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider hidden sm:inline">Online</span>}
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                  accept="image/*,video/*,audio/*,application/pdf,text/*,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/json"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 sm:p-3 text-gray-500 hover:text-brand transition-all shrink-0"
                  title="Tải lên nhiều tệp (Hình ảnh, Tài liệu, PDF, Excel, Word, Ghi âm...)"
                >
                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                  placeholder="Nhập nội dung hoặc gửi tệp..."
                  className="flex-1 bg-transparent border-none focus:ring-0 px-1 sm:px-2 py-2.5 sm:py-4 resize-none min-h-[44px] max-h-[120px] text-xs sm:text-sm text-gray-200 placeholder-gray-500 outline-none"
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                  className="p-2.5 sm:p-3 bg-brand text-white rounded-full transition-all group active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-8 lg:p-12 overflow-y-auto max-h-dvh h-full flex-1 pb-24 sm:pb-40 w-full scrollbar-thin">
            {view === 'progress' && <ProgressView stats={userStats} />}
            {view === 'profile' && (
              <ProfileView 
                user={user} 
                stats={userStats} 
                onLogout={handleLogout} 
                onResetHistory={() => setShowResetConfirm(true)} 
                isAdmin={isAdmin}
                isPro={isPro}
                adminCodeInput={adminCodeInput}
                setAdminCodeInput={setAdminCodeInput}
                onAdminAuth={handleAdminAuth}
                onExitRole={handleExitRole}
                onOpenAdminHub={handleOpenAdminHub}
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
                onOpenChangeAdminPassword={() => {
                  setAdminPasswordModalMode(user?.adminPasswordHash && !user?.needsAdminPasswordSetup ? 'change' : 'setup');
                  setAdminPasswordModalOpen(true);
                }}
                isMasterAdmin={isMasterAdminEmail(user?.email)}
                sessions={sessions}
                setSessions={setSessions}
                setUserStats={setUserStats}
              />
            )}
          </div>
        )}
      </main>

      <AdminPasswordModal 
        isOpen={adminPasswordModalOpen}
        mode={adminPasswordModalMode}
        user={user}
        onSuccess={() => {
          setAdminPasswordModalOpen(false);
          setIsAdminUnlocked(true);
          if (adminPasswordModalMode === 'verify' || adminPasswordModalMode === 'setup') {
            setIsAdmin(true);
            setIsAdminHubOpen(true);
          }
        }}
        onCancel={() => {
          setAdminPasswordModalOpen(false);
        }}
        onRenounceRole={handleExitRole}
      />

      <ContinuousSyncModal 
        isOpen={isAdmin && isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        sessionsCount={sessions.length}
      />

      {isAdmin && liveSyncToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-2xl backdrop-blur-md animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>{liveSyncToast}</span>
        </div>
      )}

      <AnimatePresence>
        {isAdminHubOpen && (
          <AdminHub 
            isOpen={isAdminHubOpen} 
            onClose={() => setIsAdminHubOpen(false)} 
            currentUser={user}
            onResetData={handleResetAllData}
            onChangeAdminPassword={() => {
              setAdminPasswordModalMode(user?.adminPasswordHash && !user?.needsAdminPasswordSetup ? 'change' : 'setup');
              setAdminPasswordModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sessionToDeleteId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0e14] border border-white/10 rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-500 animate-bounce" />
              </div>
              <h3 className="text-xl font-black mb-3 text-white uppercase tracking-wider">Xóa cuộc trò chuyện?</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Bạn có chắc chắn muốn xóa vĩnh viễn cuộc trò chuyện này? Hành động này không thể hoàn tác.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setSessionToDeleteId(null)}
                  className="py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all text-sm cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={async () => {
                    const id = sessionToDeleteId;
                    setSessionToDeleteId(null);
                    await executeDeleteSession(id);
                  }}
                  className="py-3 px-6 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all text-sm shadow-lg shadow-red-500/20 cursor-pointer"
                >
                  Xác nhận xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b0e14] border border-white/10 rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-amber-500 animate-bounce" />
              </div>
              <h3 className="text-xl font-black mb-3 text-white uppercase tracking-wider">Xóa toàn bộ lịch sử?</h3>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử trò chuyện trên máy chủ? Hành động này không thể hoàn tác.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all text-sm cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={async () => {
                    setShowResetConfirm(false);
                    try {
                      if (!user) return;
                      const q = query(collection(db, 'sessions'), where('userId', '==', user.uid));
                      const querySnapshot = await getDocs(q);
                      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
                      await Promise.all(deletePromises);
                      setSessions([]);
                      setCurrentSessionId(null);
                    } catch (error) {
                      console.error("Failed to reset history", error);
                    }
                  }}
                  className="py-3 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-bold transition-all text-sm shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Xác nhận xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProgressView({ stats }: { stats: any }) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight">KẾT QUẢ QUÁ TRÌNH</h2>
        <div className="px-4 py-2 rounded-2xl bg-brand/10 border border-brand/20 text-brand font-black text-xs uppercase self-start sm:self-auto">
          {stats.level} Level
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Bài đã làm" value={stats.solvedCount} icon={CheckCircle} color="text-green-500" />
        <StatCard label="Tỉ lệ đúng" value={`${stats.accuracy}%`} icon={Zap} color="text-yellow-500" />
        <StatCard label="Điểm kinh nghiệm" value={stats.points} icon={Sparkles} color="text-brand" />
      </div>

      <div className="p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] bg-white/5 border border-white/5">
        <h3 className="text-lg font-bold mb-6">Lịch sử hoạt động</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-bold">Hoàn thành bài giải đố Logic #{120 - i}</p>
                  <p className="text-[10px] text-gray-500 font-medium">2 giờ trước • Độ khó: Trung bình</p>
                </div>
              </div>
              <div className="text-green-500 text-xs font-black">+50 XP</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileView({ 
  user, 
  stats, 
  onLogout,
  onResetHistory,
  isAdmin,
  isPro,
  adminCodeInput,
  setAdminCodeInput,
  onAdminAuth,
  onExitRole,
  onOpenAdminHub,
  onOpenSyncModal,
  onOpenChangeAdminPassword,
  isMasterAdmin,
  sessions,
  setSessions,
  setUserStats
}: { 
  user: any, 
  stats: any, 
  onLogout: () => void,
  onResetHistory: () => void,
  isAdmin: boolean,
  isPro: boolean,
  adminCodeInput: string,
  setAdminCodeInput: (val: string) => void,
  onAdminAuth: () => void,
  onExitRole: () => void,
  onOpenAdminHub: () => void,
  onOpenSyncModal?: () => void,
  onOpenChangeAdminPassword?: () => void,
  isMasterAdmin?: boolean,
  sessions: ChatSession[],
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>,
  setUserStats: (val: any) => void
}) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'exporting' | 'importing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [isCopiedConfig, setIsCopiedConfig] = useState(false);
  const fileInputRefForSync = useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    setSyncStatus('exporting');
    setSyncMessage('Đang đóng gói dữ liệu của sếp...');
    try {
      const backupData = {
        type: "zenith_anti_hack_backup",
        version: 1,
        exportedAt: Date.now(),
        userEmail: user?.email || '',
        userStats: stats,
        sessions: sessions
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `zenith_cognitive_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSyncStatus('success');
      setSyncMessage('Đã tải xuống file sao lưu thành công!');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage(`Lỗi xuất file: ${err.message || err}`);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncStatus('importing');
    setSyncMessage('Đang phân tích tệp học liệu...');
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const backup = JSON.parse(content);

          if (backup.type !== 'zenith_anti_hack_backup') {
            throw new Error('Định dạng tệp không tương thích với Zenith!');
          }

          setSyncMessage('Đang nhập dữ liệu vào đám mây...');

          // 1. Restore User Stats if exist
          if (backup.userStats && user) {
            const mergedStats = {
              ...stats,
              points: Math.max(stats.points || 0, backup.userStats.points || 0),
              solvedCount: Math.max(stats.solvedCount || 0, backup.userStats.solvedCount || 0),
              accuracy: backup.userStats.accuracy || stats.accuracy || 100,
              level: backup.userStats.level || stats.level || 'NOVICE',
            };
            
            await setDoc(doc(db, 'users', user.uid), { stats: mergedStats }, { merge: true });
            setUserStats(mergedStats);
          }

          // 2. Import sessions to Firestore
          if (Array.isArray(backup.sessions) && user) {
            let importedCount = 0;
            for (const s of backup.sessions) {
              if (!s.id || !s.title) continue;
              // Push to Firestore under current userId so user owns it
              await setDoc(doc(db, 'sessions', s.id), {
                userId: user.uid,
                title: s.title,
                messages: s.messages || [],
                updatedAt: s.updatedAt || Date.now()
              }, { merge: true });
              importedCount++;
            }
            setSyncMessage(`Đã đồng bộ thành công ${importedCount} lịch sử trò chuyện & thông tin cấp độ!`);
          } else {
            setSyncMessage('Đã nhập thông tin tiến độ thành công!');
          }

          setSyncStatus('success');
          setTimeout(() => setSyncStatus('idle'), 5000);
        } catch (parseErr: any) {
          setSyncStatus('error');
          setSyncMessage(`Không thể giải mã tệp JSON: ${parseErr.message || parseErr}`);
        }
      };
      reader.readAsText(file);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage(`Lời từ chối nhập: ${err.message || err}`);
    }
    // Clear input
    if (e.target) e.target.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto w-full px-4">
      {/* 2-Column Balanced Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start w-full">
        
        {/* LEFT COLUMN: Identity & Achievements */}
        <div className="space-y-6">
          {/* Main User Profile Card */}
          <div className="relative p-8 rounded-[2rem] bg-[#0c101b]/60 border border-white/5 text-center flex flex-col items-center overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full blur-3xl pointer-events-none -mr-4 -mt-4 animate-pulse" />
            
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full border-4 border-brand/25 p-1 bg-[#030712]">
                <img 
                  src={user?.picture} 
                  alt="" 
                  className="w-full h-full rounded-full grayscale hover:grayscale-0 transition-all duration-500 object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-lg border-2 border-[#030712]">
                <Shield className="w-4 h-4 text-white animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl font-black uppercase tracking-widest mb-1 text-white">{user?.name}</h2>
            <p className="text-gray-400 text-xs font-semibold mb-4">{user?.email}</p>

            {/* Dynamic status badge depending on admin / pro flags */}
            <div className="flex gap-2">
              {isAdmin ? (
                <span className="px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-widest bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 uppercase">
                  🛡️ Master Admin Host
                </span>
              ) : isPro ? (
                <span className="px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-widest bg-brand/10 border border-brand/20 text-brand uppercase">
                  ✨ Zenith Pro Member
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded-xl text-[10px] font-semibold tracking-widest bg-white/5 border border-white/5 text-gray-400 uppercase">
                  👤 Thành viên thường
                </span>
              )}
            </div>
          </div>

          {/* Stats Bento Grid (Adaptive Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white/5 border border-white/5 flex flex-col justify-between min-h-[110px] transition-all hover:bg-white/[0.08]">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Điểm số</p>
              <div className="mt-2 text-2xl font-black text-brand">
                {(stats?.points || 0).toLocaleString()} <span className="text-[10px] font-bold text-gray-400">PTS</span>
              </div>
            </div>
            
            <div className="p-5 rounded-3xl bg-white/5 border border-white/5 flex flex-col justify-between min-h-[110px] transition-all hover:bg-white/[0.08]">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cấp độ</p>
              <div className="mt-2 text-2xl font-black text-white uppercase tracking-wider truncate">
                {stats?.level || 'BEGINNER'}
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white/5 border border-white/5 flex flex-col justify-between min-h-[110px] transition-all hover:bg-white/[0.08]">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Thử thách đã giải</p>
              <div className="mt-2 text-2xl font-black text-emerald-400">
                {stats?.solvedCount || 0} <span className="text-[10px] font-bold text-gray-400">CÂU</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white/5 border border-white/5 flex flex-col justify-between min-h-[110px] transition-all hover:bg-white/[0.08]">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Độ chính xác</p>
              <div className="mt-2 text-2xl font-black text-orange-400">
                {stats?.accuracy || 100}%
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Privileges, Sync & Account Operations */}
        <div className="space-y-6">
          {/* Privilege & Special Roles Management Section */}
          <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 text-left">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand" />
              Quyền hạn tài khoản
            </h3>

            {/* Current status display */}
            <div className="mb-5 p-4 rounded-2xl bg-white/5 border border-white/5">
              {isAdmin || isPro ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-brand font-black uppercase text-xs px-2.5 py-1 rounded-lg bg-brand/10 border border-brand/20">
                      {isMasterAdmin ? '👑 Master Admin Tối Cao' : (isAdmin ? '🛡️ Quản Trị Viên (Admin)' : '✨ Zenith Pro')}
                    </span>
                    {isAdmin && (
                      user?.adminPasswordHash && !user?.needsAdminPasswordSetup ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> MK riêng: Đã tạo
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> Bắt buộc tự tạo MK riêng
                        </span>
                      )
                    )}
                  </div>

                  <p className="text-[13px] text-gray-300 leading-relaxed">
                    {isMasterAdmin 
                      ? 'Tài khoản của Sếp thuộc danh sách Quản trị viên tối cao mặc định (Master Root). Sếp sở hữu toàn quyền quản lý, cấp phân quyền và kiểm soát máy chủ.' 
                      : (isAdmin 
                          ? 'Tài khoản của bạn đã được cấp quyền Quản trị viên. Bạn có quyền truy cập Terminal Quản trị với mật khẩu riêng của mình.'
                          : 'Tài khoản của bạn đang sở hữu đặc quyền Zenith Pro cao cấp.')}
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    {isAdmin && (
                      <>
                        <button 
                          onClick={onOpenAdminHub}
                          className="w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 active:scale-95 duration-200"
                        >
                          <Settings2 className="w-4 h-4 text-black" />
                          Quản lý Hệ Thống (Root Panel)
                        </button>

                        {onOpenChangeAdminPassword && (
                          <button
                            onClick={onOpenChangeAdminPassword}
                            className="w-full py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>{user?.adminPasswordHash && !user?.needsAdminPasswordSetup ? 'Đổi Mật Khẩu Admin Riêng' : 'Tự Tạo Mật Khẩu Admin Riêng'}</span>
                          </button>
                        )}
                      </>
                    )}
                    <button 
                      onClick={onExitRole}
                      className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                    >
                      Thoát quyền hiện tại (Trình thường)
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-gray-400 leading-relaxed">
                  Bạn đang sử dụng tài khoản thường. Hãy nhập Mật khẩu Admin riêng hoặc mã đặc quyền của Zenith phía dưới để kích hoạt các tính năng VIP.
                </p>
              )}
            </div>

            {/* Always visible Code Input section */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Nhập Mật khẩu Admin riêng hoặc mã đặc quyền
              </label>
              <div className="flex gap-2">
                <input 
                  id="vip-code-input"
                  type="text"
                  value={adminCodeInput}
                  onChange={(e) => setAdminCodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onAdminAuth()}
                  placeholder="Nhập mật khẩu Admin riêng / mã quyền hạn..."
                  className="flex-1 px-4 py-2.5 text-xs bg-[#030712] hover:bg-white/5 focus:bg-white/5 rounded-xl border border-white/10 text-white outline-none transition-all placeholder:text-gray-600 focus:border-brand/40"
                />
                <button 
                  onClick={onAdminAuth}
                  className="px-4 py-2.5 text-xs rounded-xl bg-brand hover:bg-brand/80 text-white font-bold transition-all shadow-lg active:scale-95 cursor-pointer shrink-0"
                >
                  Xác thực
                </button>
              </div>
            </div>
          </div>

          {/* Synchronization & Custom Domain (Vercel) Sync panel - Only visible to Admins */}
          {isAdmin && (
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 text-left">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-500" />
                  Đồng bộ hóa dữ liệu (Vercel Sync)
                </span>
                <span className="text-[9px] font-black tracking-wider bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/10">
                  ADMIN ONLY
                </span>
              </h3>

              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Công cụ truyền phát/đồng bộ tiến độ học và lịch sử chat giữa nền tảng <strong>Google AI Studio</strong> và trang custom domain <span className="text-emerald-400 hover:underline">zenith-anti-hack.vercel.app</span> của Sếp.
              </p>

              {/* Sync execution status if active */}
              {syncStatus !== 'idle' && (
                <div className={`mb-4 p-4 rounded-2xl flex items-center gap-3 border ${
                  syncStatus === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                  syncStatus === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  'bg-brand/10 border-brand/20 text-brand'
                }`}>
                  <Loader2 className={`w-5 h-5 shrink-0 ${syncStatus !== 'success' && syncStatus !== 'error' ? 'animate-spin' : ''}`} />
                  <p className="text-xs font-bold leading-relaxed">{syncMessage}</p>
                </div>
              )}

              {/* Continuous Live Sync Quick Access */}
              <button
                onClick={onOpenSyncModal}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition-all active:scale-95 cursor-pointer mb-4"
                title="Mở bảng điều phối và kiểm tra đồng bộ trực tiếp với zenith-anti-hack.vercel.app"
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>KẾT NỐI LIÊN TỤC 24/7 VỚI ZENITH VERCEL APP</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                  LIVE STATUS & PING &rarr;
                </span>
              </button>

              {/* Action controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <button
                  onClick={handleExportBackup}
                  className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer w-full"
                  title="Đóng gói lịch sử trò chuyện & thành tích thành tệp tin .json để chuyển đổi sang Vercel"
                >
                  <Download className="w-4 h-4 text-emerald-400 animate-pulse" />
                  Sao lưu dữ liệu
                </button>

                <button
                  onClick={() => fileInputRefForSync.current?.click()}
                  className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer w-full"
                  title="Tải lên tệp sao lưu .json từ Vercel hoặc thiết bị của sếp để đồng bộ ngay"
                >
                  <Upload className="w-4 h-4 text-brand animate-bounce" />
                  Nhập & Đồng bộ
                </button>
              </div>

              {/* Hidden input file */}
              <input
                type="file"
                ref={fileInputRefForSync}
                onChange={handleImportBackup}
                accept=".json"
                className="hidden"
              />

              {/* Option 2 Toggle button: Automated real-time DB sharing */}
              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={() => setShowConfigGuide(!showConfigGuide)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#0c101b] hover:bg-[#121829] border border-brand/20 transition-all text-xs font-bold text-brand"
                >
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Đồng bộ Tự động qua Cloud
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showConfigGuide ? 'rotate-180' : ''}`} />
                </button>

                {showConfigGuide && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-3.5 space-y-3.5 overflow-hidden text-xs text-gray-300 leading-relaxed bg-[#060911] p-4 rounded-2xl border border-white/5"
                  >
                    <p>
                      Cả phiên bản <strong>AI Studio</strong> này và trang web <strong>Vercel (zenith-anti-hack.vercel.app)</strong> đều hỗ trợ cơ chế lưu trữ thời gian thực thông qua cơ sở dữ liệu Firebase. Để đồng bộ tự động tuyệt đối dữ liệu Sếp có hai lựa chọn:
                    </p>
                    
                    <div className="space-y-2 text-gray-400 pl-2 border-l border-brand/35">
                      <span className="text-white font-bold block mb-1">Cách đồng bộ hóa trực tiếp:</span>
                      <p>
                        1. Sếp cấu hình trang web trên Vercel của Sếp dùng chung khóa kết nối Firestore có mã định danh và khóa API sau:
                      </p>
                      <div className="relative bg-black/50 p-2.5 rounded-xl font-mono text-[10px] text-gray-400 border border-white/5 mt-1">
                        <pre className="overflow-x-auto whitespace-pre-wrap">
                          {`projectId: "gen-lang-client-0697052905"
appId: "1:272056622366:web:c583c39bce4586760c7d0f"
databaseId: "ai-studio-af2631ee-baa5-4a6d-bd59-42e4eb834c38"`}
                        </pre>
                        <button
                          onClick={async () => {
                            try {
                              const info = `projectId: "gen-lang-client-0697052905"\nappId: "1:272056622366:web:c583c39bce4586760c7d0f"\ndatabaseId: "ai-studio-af2631ee-baa5-4a6d-bd59-42e4eb834c38"`;
                              await navigator.clipboard.writeText(info);
                              setIsCopiedConfig(true);
                              setTimeout(() => setIsCopiedConfig(false), 3000);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="absolute right-2 top-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 font-bold hover:text-white transition-all text-[9px] uppercase"
                        >
                          {isCopiedConfig ? 'Đã sao chép!' : 'Sao chép mã'}
                        </button>
                      </div>
                      <p className="mt-2 text-[11px]">
                        2. Khi hai nơi trỏ chung về một Database Firestore, bất cứ lịch sử chat nào sếp tạo mới hoặc tiến độ làm bài thi đấu đều nổi lên ở cả hai website đồng thời ngay lập tức!
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Quick System Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
            <button 
              onClick={onResetHistory}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black transition-all font-bold group text-xs uppercase tracking-wider cursor-pointer"
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Xóa lịch sử trò chuyện
            </button>

            <button 
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold group text-xs uppercase tracking-wider cursor-pointer"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Đăng xuất tài khoản
            </button>
          </div>
        </div>

      </div>

      {/* Embedded Deep Analytics panel */}
      <div className="w-full mt-16 pt-12 border-t border-white/5 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-brand" />
            <h3 className="text-xl font-black uppercase tracking-tight text-white">Deep Analytics (Phân tích)</h3>
          </div>
          <span className="px-3 py-1 bg-brand/10 border border-brand/20 rounded-xl text-brand text-[10px] font-black uppercase tracking-wider">
            Premium Module
          </span>
        </div>
        <ProHubView user={user} stats={stats} isPro={isPro} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="p-6 rounded-[2.5rem] bg-[#020617] border border-white/5 shadow-xl">
      <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function ProHubView({ user, stats, isPro, isAdmin }: { user: any, stats: any, isPro?: boolean, isAdmin?: boolean }) {
  const hasAccess = !!(isPro || isAdmin);

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="relative overflow-hidden p-12 rounded-[3.5rem] bg-gradient-to-br from-brand/20 via-brand/5 to-transparent border border-brand/20">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <Zap className="w-64 h-64 text-brand rotate-12" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className={`px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-[0.2em] ${hasAccess ? 'bg-brand' : 'bg-gray-700 text-gray-300'}`}>
              {hasAccess ? 'Premium Access' : 'Locked Feature'}
            </div>
            {hasAccess && <div className="w-2 h-2 rounded-full bg-brand animate-ping" />}
          </div>
          <h2 className="text-6xl font-black tracking-tighter mb-4">ZENITH <span className="text-brand">PRO</span></h2>
          <p className="text-xl text-gray-400 font-medium max-w-2xl leading-relaxed">
            {hasAccess 
              ? "Hệ thống phân tích chuyên sâu đã được mở khóa. Đây là không gian dành riêng cho các chuyên gia tư duy."
              : "Tính năng phân tích chuyên sâu Deep Analytics dành riêng cho thành viên sở hữu đặc quyền của Zenith."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 flex flex-col gap-4">
           <Cpu className="w-8 h-8 text-brand" />
           <h3 className="text-sm font-bold uppercase tracking-widest">Logic Engine</h3>
           <p className="text-2xl font-black">{hasAccess ? 'ULTIMATE' : 'STANDARD'}</p>
           <p className="text-[10px] text-gray-500 font-bold">{hasAccess ? 'GEMINI 1.5 PRO READY' : 'GEMINI FLASH'}</p>
        </div>
        <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 flex flex-col gap-4">
           <Activity className="w-8 h-8 text-green-500" />
           <h3 className="text-sm font-bold uppercase tracking-widest">Priority</h3>
           <p className="text-2xl font-black">{hasAccess ? 'TIER 1' : 'TIER 3'}</p>
           <p className="text-[10px] text-gray-500 font-bold">{hasAccess ? '0.05ms RESPONSE TIME' : 'NORMAL COMPUTE'}</p>
        </div>
        <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 flex flex-col gap-4">
           <Database className="w-8 h-8 text-blue-500" />
           <h3 className="text-sm font-bold uppercase tracking-widest">Context</h3>
           <p className="text-2xl font-black">{hasAccess ? '2M TOKENS' : '128K TOKENS'}</p>
           <p className="text-[10px] text-gray-500 font-bold">{hasAccess ? 'LONG-TERM MEMORY' : 'SESSION PERSISTENCE'}</p>
        </div>
        <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 flex flex-col gap-4">
           <Terminal className="w-8 h-8 text-purple-500" />
           <h3 className="text-sm font-bold uppercase tracking-widest">Analytical</h3>
           <p className="text-2xl font-black">{hasAccess ? 'ENABLED' : 'BASIC'}</p>
           <p className="text-[10px] text-gray-500 font-bold">{hasAccess ? 'RECURSIVE LOGIC' : 'SIMPLE RESPONSE'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="glass rounded-[3rem] border-white/5 p-10">
           <h3 className="text-2xl font-black mb-8 flex items-center gap-4">
             <BarChart3 className="w-6 h-6 text-brand" />
             PHÂN TÍCH CHUYÊN SÂU
           </h3>
           <div className="space-y-6">
             <div className="flex justify-between items-end pb-4 border-b border-white/5">
                <div>
                   <p className="text-xs font-bold text-gray-500 uppercase mb-1">Tư duy Hệ thống</p>
                   <p className="text-xl font-black">{hasAccess ? 'Vượt trội' : 'Tiêu chuẩn'}</p>
                </div>
                <div className="text-brand font-black text-sm">{hasAccess ? 'TOP 1%' : 'TOP 15%'}</div>
             </div>
             <div className="flex justify-between items-end pb-4 border-b border-white/5">
                <div>
                   <p className="text-xs font-bold text-gray-500 uppercase mb-1">Giải quyết vấn đề</p>
                   <p className="text-xl font-black">{hasAccess ? 'Tối ưu hóa' : 'Trung cấp'}</p>
                </div>
                <div className="text-green-500 font-black text-sm">{hasAccess ? '+24%' : '0%'}</div>
             </div>
             <div className="flex justify-between items-end pb-4 border-b border-white/5">
                <div>
                   <p className="text-xs font-bold text-gray-500 uppercase mb-1">Thời gian phản hồi trung bình</p>
                   <p className="text-xl font-black">{hasAccess ? '1.2 Giây' : '3.5 Giây'}</p>
                </div>
                <div className="text-yellow-500 font-black text-sm">{hasAccess ? 'FAST' : 'NORMAL'}</div>
             </div>
           </div>
        </div>

        <div className="glass rounded-[3rem] border-white/5 p-10 flex flex-col justify-center items-center text-center">
           <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mb-6">
              <Zap className="w-10 h-10 text-brand" />
           </div>
           <h3 className="text-xl font-black mb-4">NHẬN DIỆN THÀNH VIÊN PRO</h3>
           <p className="text-gray-500 text-sm mb-8 max-w-xs leading-relaxed">
             {hasAccess 
               ? "Toàn bộ tin nhắn của bạn sẽ được đánh dấu bằng huy hiệu Pro và ưu tiên xử lý qua các cụm máy chủ cao cấp nhất."
               : "Nâng cấp lên Zenith Pro để nhận diện huy hiệu Pro và kích hoạt chế độ siêu máy chủ xử lý tin nhắn ưu tiên."}
           </p>
           {hasAccess ? (
             <div className="px-6 py-3 rounded-2xl bg-brand text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-brand/20 scale-110">
               ĐÃ KÍCH HOẠT
             </div>
           ) : (
             <button
               onClick={() => {
                 const el = document.getElementById('vip-code-input');
                 if (el) {
                   el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                   el.focus();
                 }
               }}
               className="px-6 py-3 rounded-2xl bg-white hover:bg-brand hover:text-white text-black text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 duration-200 cursor-pointer"
             >
               Mở khóa ngay
             </button>
           )}
        </div>
      </div>
    </div>
  );
}

