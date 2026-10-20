import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { navigateToPage } from '../lib/store';

export default function KuwaitInsuranceHome() {
  const [, setLocation] = useLocation();
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    navigateToPage('الصفحة الرئيسية');
  }, []);

  const handleLogin = () => {
    setLocation('/moh-login');
  };

  const isAr = lang === 'ar';

  const t = {
    ar: {
      title: 'النظام الآلي لتسجيل الضمان الصحي',
      langSwitch: 'English',
      blueHeader: 'تسجيل الدخول لجميع المواد',
      desc: 'في هذا القسم ، يمكن للمراجع الدخول على خدمة الضمان الصحي الالكتروني بعد تسجيل الدخول. اضغط على زر تسجيل الدخول أدناه للمتابعة.',
      loginBtn: 'تسجيل الدخول',
      notice: 'تم تفعيل الخدمة يوميا على مدى 24 ساعة',
      footer: '© 2019 Ministry Of Health Kuwait . All Rights Reserved.',
    },
    en: {
      title: 'Automated Health Insurance Registration System',
      langSwitch: 'العربية',
      blueHeader: 'Login for All Services',
      desc: 'In this section, the reviewer can access the electronic health insurance service after logging in. Click the login button below to continue.',
      loginBtn: 'Login',
      notice: 'Service is activated daily 24 hours',
      footer: '© 2019 Ministry Of Health Kuwait . All Rights Reserved.',
    },
  };

  const tx = t[lang];

  return (
    <div style={{ direction: isAr ? 'rtl' : 'ltr', fontFamily: 'Cairo, Tahoma, Arial, sans-serif', minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#0c2c3c', padding: '15px 10px', textAlign: 'center' }}>
        <img src="/FMOHLogo.svg" alt="شعار وزارة الصحة" style={{ width: 70, height: 70, margin: '0 auto' }} />
        <h1 style={{ color: '#fff', fontSize: 'clamp(16px, 4vw, 22px)', marginTop: 8, fontWeight: 'bold', padding: '0 10px' }}>{tx.title}</h1>
      </div>

      {/* Language */}
      <div style={{ textAlign: isAr ? 'left' : 'right', padding: '10px 15px' }}>
        <span
          onClick={() => setLang(isAr ? 'en' : 'ar')}
          style={{ color: 'red', fontSize: 14, cursor: 'pointer' }}
        >
          {tx.langSwitch}
        </span>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 700, margin: '20px auto', padding: '0 15px' }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden' }}>
          {/* Blue Header */}
          <div style={{ background: '#1076BB', padding: '12px 20px', textAlign: 'center' }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{tx.blueHeader}</span>
          </div>
          
          {/* Content */}
          <div style={{ padding: '20px 15px', background: '#f9f9f9', textAlign: 'center' }}>
            <p style={{ color: '#555', fontSize: 'clamp(13px, 3.5vw, 15px)', lineHeight: 1.8, marginBottom: 20 }}>
              {tx.desc}
            </p>
            
            <button
              onClick={handleLogin}
              style={{
                background: '#1076BB',
                color: '#fff',
                border: 'none',
                padding: '12px 40px',
                fontSize: 'clamp(14px, 3.5vw, 16px)',
                fontWeight: 'bold',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'Cairo, Tahoma, Arial, sans-serif',
                width: '100%',
                maxWidth: 280,
              }}
            >
              {tx.loginBtn}
            </button>
          </div>
        </div>
      </div>

      {/* Service Notice */}
      <div style={{ textAlign: 'center', marginTop: 20, padding: '0 15px' }}>
        <p style={{ color: 'red', fontSize: 14 }}>{tx.notice}</p>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '12px 0', background: '#000', marginTop: 'auto' }}>
        <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>{tx.footer}</p>
      </div>
    </div>
  );
}
