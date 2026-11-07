// Tiện ích bảo mật và mã hóa mật khẩu Admin riêng cho Zenith
export async function hashAdminPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_zenith_admin_security_v1");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function evaluatePasswordStrength(password: string): {
  score: number; // 0 to 4
  label: 'Quá yếu' | 'Yếu' | 'Trung bình' | 'Mạnh' | 'Rất mạnh';
  color: string;
} {
  if (!password) return { score: 0, label: 'Quá yếu', color: 'bg-red-500' };
  
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[a-zA-Z]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score += 1;

  switch (score) {
    case 0:
    case 1:
      return { score: 1, label: 'Yếu', color: 'bg-red-500' };
    case 2:
      return { score: 2, label: 'Trung bình', color: 'bg-amber-500' };
    case 3:
      return { score: 3, label: 'Mạnh', color: 'bg-emerald-500' };
    case 4:
    default:
      return { score: 4, label: 'Rất mạnh', color: 'bg-cyan-400' };
  }
}
