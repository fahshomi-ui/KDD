import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { adminLogin } from '@/lib/adminAuth';

const AdminLoginForm = ({ title, onSuccess }: { title: string; onSuccess: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await adminLogin(username, password);
    setLoading(false);
    if (ok) onSuccess();
    else setError('اسم المستخدم أو كلمة المرور غير صحيحة');
  };

  return (
    <form onSubmit={submit} dir="rtl" className="w-full max-w-sm mx-auto p-8 space-y-5 bg-card rounded-2xl border border-border shadow-lg">
      <h1 className="text-2xl font-bold text-foreground font-cairo text-center">{title}</h1>
      <div className="space-y-2">
        <Label htmlFor="admin-user" className="font-cairo">اسم المستخدم</Label>
        <Input id="admin-user" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" dir="ltr" className="text-center" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin-pass" className="font-cairo">كلمة المرور</Label>
        <Input id="admin-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" dir="ltr" className="text-center" />
      </div>
      {error && <p className="text-sm text-destructive text-center font-cairo">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full font-cairo">{loading ? '...' : 'دخول'}</Button>
    </form>
  );
};

export default AdminLoginForm;
