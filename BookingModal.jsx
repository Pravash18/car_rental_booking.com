import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, MapPin, Clock, IndianRupee, Car, AlertCircle, CheckCircle2 } from 'lucide-react';
import { bookingsAPI } from '../utils/api';

const PICKUP_LOCATIONS = [
  'Mumbai — BKC Hub',
  'Mumbai — Airport Terminal',
  'Delhi — Connaught Place',
  'Delhi — IGI Airport',
  'Bengaluru — Koramangala',
  'Bengaluru — Airport',
  'Chennai — T. Nagar',
  'Hyderabad — HITEC City',
  'Pune — Hinjawadi',
  'Goa — Panaji',
  'Jaipur — MI Road',
  'Kolkata — Park Street',
];

const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function BookingModal({ car, onClose, onSuccess }) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const navigate = useNavigate();

  const [form, setForm] = useState({
    pickup_date: today,
    return_date: tomorrow,
    pickup_location: PICKUP_LOCATIONS[0],
    return_location: PICKUP_LOCATIONS[0],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const totalDays = Math.max(
    1,
    Math.ceil((new Date(form.return_date) - new Date(form.pickup_date)) / 86400000)
  );
  const totalPrice = totalDays * car.price_per_day;

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (new Date(form.pickup_date) >= new Date(form.return_date)) {
      setError('Return date must be after pickup date.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await bookingsAPI.create({
        car_id: car.id,
        ...form,
      });

      if (data.success) {
        setSuccess(data);
        // Redirect to payment after 2 seconds
        setTimeout(() => {
          onSuccess && onSuccess(data.booking);
          onClose();
          navigate(`/payment/${data.booking.id}`);
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      id="booking-modal-overlay"
      onClick={(e) => e.target.id === 'booking-modal-overlay' && onClose()}
    >
      <div className="w-full max-w-lg glass-card rounded-3xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/08 flex items-center justify-between sticky top-0 glass-strong z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Car size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-lg">Book This Car</h2>
              <p className="text-white/40 text-sm">{car.name}</p>
            </div>
          </div>
          <button
            id="booking-modal-close"
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/08 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center animate-scale-in">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <h3 className="font-display font-bold text-white text-xl">{success.message}</h3>
            <div className="glass rounded-xl p-4 w-full text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Total Days</span>
                <span className="text-white font-semibold">{success.booking?.total_days} days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Total Price</span>
                <span className="text-green-400 font-bold">{formatINR(success.booking?.total_price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Status</span>
                <span className="badge-green capitalize">{success.booking?.status}</span>
              </div>
            </div>
            <p className="text-white/30 text-xs">Redirecting to payment...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Car summary */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/04 border border-white/06">
              {car.image_url && (
                <img src={car.image_url} alt={car.name} className="w-16 h-12 object-cover rounded-lg" />
              )}
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{car.name}</p>
                <p className="text-white/40 text-xs">{car.color} · {car.transmission}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold">{formatINR(car.price_per_day)}<span className="text-white/40 font-normal text-xs">/day</span></p>
              </div>
            </div>

            {/* Date pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1.5 flex items-center gap-1">
                  <Calendar size={12} /> Pickup Date
                </label>
                <input
                  type="date"
                  name="pickup_date"
                  id="booking-pickup-date"
                  min={today}
                  value={form.pickup_date}
                  onChange={handleChange}
                  required
                  className="input-dark text-sm"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1.5 flex items-center gap-1">
                  <Calendar size={12} /> Return Date
                </label>
                <input
                  type="date"
                  name="return_date"
                  id="booking-return-date"
                  min={form.pickup_date}
                  value={form.return_date}
                  onChange={handleChange}
                  required
                  className="input-dark text-sm"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>

            {/* Locations */}
            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5 flex items-center gap-1">
                <MapPin size={12} /> Pickup Location
              </label>
              <select
                name="pickup_location"
                id="booking-pickup-location"
                value={form.pickup_location}
                onChange={handleChange}
                required
                className="input-dark text-sm"
                style={{ colorScheme: 'dark' }}
              >
                {PICKUP_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5 flex items-center gap-1">
                <MapPin size={12} /> Return Location
              </label>
              <select
                name="return_location"
                id="booking-return-location"
                value={form.return_location}
                onChange={handleChange}
                required
                className="input-dark text-sm"
                style={{ colorScheme: 'dark' }}
              >
                {PICKUP_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5">
                Special Requests (optional)
              </label>
              <textarea
                name="notes"
                id="booking-notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Any special requirements..."
                className="input-dark text-sm resize-none"
              />
            </div>

            {/* Price summary */}
            <div className="glass rounded-xl p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-white/50 flex items-center gap-1.5"><Clock size={13} /> Duration</span>
                <span className="text-white">{totalDays} day{totalDays !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Rate</span>
                <span className="text-white">{formatINR(car.price_per_day)}/day</span>
              </div>
              <div className="h-px bg-white/08" />
              <div className="flex justify-between">
                <span className="text-white/70 font-semibold flex items-center gap-1.5">
                  <IndianRupee size={14} /> Total
                </span>
                <span className="text-white font-bold text-lg gradient-text-orange">{formatINR(totalPrice)}</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-scale-in">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="booking-submit-btn"
              disabled={loading}
              className="w-full btn-primary py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                `Confirm & Proceed to Pay · ${formatINR(totalPrice)}`
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
