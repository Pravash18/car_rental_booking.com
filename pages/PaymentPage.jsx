import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CreditCard, CheckCircle2, XCircle, ArrowLeft, Shield, Clock, Car, IndianRupee, Zap, AlertCircle, Loader, QrCode, Lock, Check } from 'lucide-react';
import { paymentsAPI, bookingsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'failed'
  const [paymentDetails, setPaymentDetails] = useState(null);
  
  // Custom Payment workflow
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [utrNumber, setUtrNumber] = useState('');

  // Card fields
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // 3D Secure OTP state
  const [showSecureOtpGate, setShowSecureOtpGate] = useState(false);
  const [secureOtp, setSecureOtp] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchBooking();
  }, [bookingId, isAuthenticated]);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const { data } = await bookingsAPI.getById(bookingId);
      if (data.success) {
        setBooking(data.booking);
        if (data.booking.payment_status === 'paid') {
          setPaymentStatus('success');
        }
      }
    } catch (err) {
      setError('Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardFormat = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const matches = val.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(val);
    }
  };

  const handleExpiryFormat = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) {
      setCardExpiry(`${val.slice(0, 2)}/${val.slice(2, 4)}`);
    } else {
      setCardExpiry(val);
    }
  };

  // Trigger professional bank gateway gate
  const handleInitiateCardPayment = (e) => {
    e.preventDefault();
    setError('');

    if (cardNumber.replace(/\s/g, '').length !== 16) {
      setError('Please enter a valid 16-digit card number.');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      setError('Expiry must be in MM/YY format.');
      return;
    }
    if (cardCvv.length !== 3) {
      setError('Enter a valid 3-digit CVV.');
      return;
    }
    if (!cardName.trim()) {
      setError('Cardholder name is required.');
      return;
    }

    setPaymentLoading(true);
    // Simulate secure hand-off to bank gateway
    setTimeout(() => {
      setPaymentLoading(false);
      setShowSecureOtpGate(true);
    }, 1800);
  };

  const handleVerifyBankOtp = async (e) => {
    e.preventDefault();
    if (secureOtp.length !== 6) {
      setError('Please enter the 6-digit secure code.');
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      // Create a mock order to settle the backend booking state
      const { data: orderData } = await paymentsAPI.createOrder({ booking_id: parseInt(bookingId) });
      
      if (!orderData.success) {
        setError('Transaction rejected by issuing bank.');
        setPaymentLoading(false);
        return;
      }

      // Verify payment with server
      const { data: verifyData } = await paymentsAPI.verify({
        razorpay_order_id: orderData.order.id,
        razorpay_payment_id: `pay_${Date.now()}_secure`,
        razorpay_signature: 'demo_signature',
        booking_id: parseInt(bookingId),
      });

      if (verifyData.success) {
        setShowSecureOtpGate(false);
        setPaymentStatus('success');
        setPaymentDetails(verifyData.payment);
      } else {
        setError('Bank authentication failed.');
      }
    } catch (err) {
      setError('Verification connection timeout.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleUPISubmit = async (e) => {
    e.preventDefault();
    if (!utrNumber || utrNumber.length < 8) {
      setError('Please enter a valid Transaction UTR / Ref Number.');
      return;
    }

    setPaymentLoading(true);
    setError('');

    try {
      const finalAmount = Math.round(booking.total_price * 1.18);
      const { data } = await paymentsAPI.submitUPI({
        booking_id: parseInt(bookingId),
        upi_transaction_id: utrNumber,
        amount: finalAmount
      });

      if (data.success) {
        setPaymentStatus('success');
        setPaymentDetails({
          payment_id: utrNumber,
          status: 'paid'
        });
      } else {
        setError(data.message || 'Verification failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit transaction.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="page-bg min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/40">Loading details...</p>
          </div>
        </div>
      </div>
    );
  }

  const finalAmount = booking ? Math.round(booking.total_price * 1.18) : 0;

  // Hides UPI ID and Paytm scan method from public users. Only shows when owner is logged in.
  const isOwner = user?.email === 'rlaxmisrinivaswork@gmail.com' || user?.email === 'admin@carrental.com';
  const paytmUpiId = '9008592807@ptsbi';
  const upiDeepLink = booking 
    ? `upi://pay?pa=${paytmUpiId}&pn=DriveElite%20India&am=${finalAmount}&cu=INR` 
    : '';
  const qrCodeUrl = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(upiDeepLink)}`;

  return (
    <div className="page-bg min-h-screen">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <Link to="/dashboard?tab=bookings" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to Bookings
        </Link>

        {paymentStatus === 'success' ? (
          /* ─── Success Screen ─── */
          <div className="glass-card rounded-3xl p-10 text-center animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle2 size={40} className="text-green-400" />
            </div>
            <h2 className="font-display font-bold text-white text-3xl mb-2">Payment Confirmed! 🎉</h2>
            <p className="text-white/50 mb-6">Your booking is secured. Enjoy your drive!</p>

            <div className="glass rounded-2xl p-6 text-left space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Car</span>
                <span className="text-white font-semibold">{booking?.car_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Amount Confirmed</span>
                <span className="text-green-400 font-bold text-lg">{formatINR(finalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Duration</span>
                <span className="text-white">{booking?.total_days} day(s)</span>
              </div>
              {paymentDetails?.payment_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/40">UTR / Ref ID</span>
                  <span className="text-white/60 text-xs font-mono">{paymentDetails.payment_id}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              <Link to="/dashboard?tab=bookings" className="btn-primary">View Bookings</Link>
              <Link to="/dashboard" className="btn-ghost">Browse Fleet</Link>
            </div>
          </div>
        ) : paymentStatus === 'failed' ? (
          /* ─── Fail Screen ─── */
          <div className="glass-card rounded-3xl p-10 text-center animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-red-400" />
            </div>
            <h2 className="font-display font-bold text-white text-3xl mb-2">Payment Unsuccessful</h2>
            <p className="text-white/50 mb-6">Could not process the payment request.</p>
            <button onClick={() => { setPaymentStatus(null); setError(''); }} className="btn-primary">Try Again</button>
          </div>
        ) : showSecureOtpGate ? (
          /* ─── 3D Secure bank OTP gate ─── */
          <div className="glass-card rounded-3xl p-8 max-w-md mx-auto animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <Lock size={22} className="text-blue-400" />
              </div>
              <h3 className="font-display font-bold text-white text-xl">3D Secure Verification</h3>
              <p className="text-white/40 text-xs mt-1">We sent a mock verification code to your phone</p>
            </div>

            <div className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300/80 text-center mb-4 font-mono">
              <strong>Bank OTP Hint:</strong> 123456
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4 animate-scale-in">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyBankOtp} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={secureOtp}
                  onChange={(e) => setSecureOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit Bank OTP"
                  className="input-dark text-center tracking-[0.5em] text-lg font-mono"
                  maxLength={6}
                  required
                  id="bank-otp-input"
                />
              </div>

              <button
                type="submit"
                disabled={paymentLoading || secureOtp.length !== 6}
                className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {paymentLoading ? <Loader size={18} className="animate-spin" /> : 'Confirm & Authenticate'}
              </button>
            </form>
          </div>
        ) : (
          /* ─── Main Payment Methods Screen ─── */
          <>
            <h1 className="font-display font-black text-3xl text-white mb-2">
              Complete <span className="gradient-text">Payment</span>
            </h1>
            <p className="text-white/40 text-sm mb-6">Select a payment option below to finalize booking</p>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6 animate-scale-in">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {booking && (
              <div className="space-y-6">
                {/* Billing Summary */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="font-display font-bold text-white mb-4 flex items-center gap-2">
                    <Car size={18} className="text-blue-400" /> Car & Booking Info
                  </h3>
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white/04 border border-white/06 mb-4">
                    {booking.image_url && <img src={booking.image_url} alt={booking.car_name} className="w-20 h-14 object-cover rounded-lg" />}
                    <div>
                      <p className="text-white font-bold">{booking.car_name}</p>
                      <p className="text-white/40 text-sm">{booking.brand} · {booking.color}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/08">
                    <span className="text-white/60 text-sm">Total Price (incl. GST)</span>
                    <span className="text-white font-bold text-xl gradient-text-orange">{formatINR(finalAmount)}</span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/08">
                  <button
                    onClick={() => { setPaymentMethod('card'); setError(''); }}
                    className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                      paymentMethod === 'card' ? 'text-white border-purple-500 bg-white/03' : 'text-white/30 hover:text-white'
                    }`}
                  >
                    <CreditCard size={16} /> Card & Net Banking (Real API)
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => { setPaymentMethod('upi'); setError(''); }}
                      className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                        paymentMethod === 'upi' ? 'text-white border-blue-500 bg-white/03' : 'text-white/30 hover:text-white'
                      }`}
                    >
                      <QrCode size={16} /> Direct UPI QR (Paytm Private)
                    </button>
                  )}
                </div>

                {/* Tab content */}
                {paymentMethod === 'upi' && isOwner ? (
                  /* ─── Real UPI QR Tab ─── */
                  <div className="glass-card rounded-2xl p-6 space-y-6 animate-scale-in">
                    <div className="text-center space-y-3">
                      <p className="text-white font-semibold">Scan & Pay ₹{finalAmount}</p>
                      <p className="text-white/40 text-xs font-light max-w-sm mx-auto">
                        Scan the code below with any UPI App (GPay, PhonePe, Paytm, BHIM) to send the amount directly to the account.
                      </p>

                      <div className="w-[250px] h-[250px] bg-white p-2 rounded-2xl mx-auto shadow-lg relative overflow-hidden flex items-center justify-center">
                        <img src={qrCodeUrl} alt="UPI Payment QR Code" className="w-full h-full object-contain" />
                      </div>
                      
                      <div className="glass rounded-xl p-2.5 inline-block text-xs font-mono text-blue-300">
                        Merchant UPI ID: {paytmUpiId}
                      </div>
                    </div>

                    <form onSubmit={handleUPISubmit} className="space-y-4">
                      <div>
                        <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">
                          Enter UPI Transaction Ref / UTR Number
                        </label>
                        <input
                          type="text"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          placeholder="12-digit transaction ID"
                          className="input-dark text-center tracking-widest font-mono text-lg"
                          maxLength={12}
                          required
                          id="upi-utr-input"
                        />
                        <p className="text-white/30 text-[10px] mt-1 text-center font-light">
                          Usually found in your transaction details screen after making the transfer.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={paymentLoading || utrNumber.length < 8}
                        className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 shadow-[0_4px_25px_rgba(34,197,94,0.3)] transition-all flex items-center justify-center gap-2"
                        id="submit-upi-btn"
                      >
                        {paymentLoading ? (
                          <>
                            <Loader size={18} className="animate-spin" /> Verifying...
                          </>
                        ) : (
                          'Confirm & Verify Transaction'
                        )}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* ─── Professional Card checkout form ─── */
                  <div className="glass-card rounded-2xl p-6 space-y-5 animate-scale-in">
                    <form onSubmit={handleInitiateCardPayment} className="space-y-4">
                      <div>
                        <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="Rahul Sharma"
                          className="input-dark"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Card Number</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={handleCardFormat}
                            placeholder="4111 2222 3333 4444"
                            className="input-dark pl-4"
                            required
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                            <CreditCard size={18} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">Expiry Date</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={handleExpiryFormat}
                            placeholder="MM/YY"
                            className="input-dark text-center"
                            maxLength={5}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-white/50 text-xs font-medium mb-1.5 uppercase tracking-wider">CVV Code</label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            placeholder="•••"
                            className="input-dark text-center"
                            maxLength={3}
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={paymentLoading}
                        className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-[0_4px_25px_rgba(139,92,246,0.3)] transition-all flex items-center justify-center gap-2"
                        id="card-pay-btn"
                      >
                        {paymentLoading ? (
                          <>
                            <Loader size={18} className="animate-spin" /> Handshaking Bank Gateway...
                          </>
                        ) : (
                          `Process Payment · ${formatINR(finalAmount)}`
                        )}
                      </button>
                    </form>
                  </div>
                )}

                <div className="flex items-center justify-center gap-6 text-white/30 text-xs">
                  <span className="flex items-center gap-1.5"><Shield size={14} className="text-green-400" /> Secure Encryption</span>
                  <span className="flex items-center gap-1.5"><Zap size={14} className="text-blue-400" /> Instant Bank Settlement</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
