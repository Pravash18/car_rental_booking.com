import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, Car, Calendar, LogIn,
  X, ChevronDown, RefreshCw, Star, Zap,
  ClipboardList, XCircle, CheckCircle, Clock, AlertTriangle,
  CreditCard, IndianRupee, Upload
} from 'lucide-react';
import Navbar from '../components/Navbar';
import CarCard from '../components/CarCard';
import CarModel3D from '../components/CarModel3D';
import BookingModal from '../components/BookingModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { carsAPI, bookingsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['all', 'Hatchback', 'SUV', 'Sedan', 'Electric', 'Compact SUV', 'Premium', 'Adventure', 'Supercar'];
const FUEL_TYPES = ['all', 'Electric', 'Petrol', 'Hybrid', 'Diesel'];
const TRANSMISSIONS = ['all', 'Automatic', 'Manual'];
const SORT_OPTIONS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'name', label: 'Name A–Z' },
];

const statusConfig = {
  pending: { label: 'Pending', class: 'badge-orange', icon: <Clock size={12} /> },
  confirmed: { label: 'Confirmed', class: 'badge-blue', icon: <CheckCircle size={12} /> },
  active: { label: 'Active', class: 'badge-green', icon: <Zap size={12} /> },
  completed: { label: 'Completed', class: 'badge-purple', icon: <CheckCircle size={12} /> },
  cancelled: { label: 'Cancelled', class: 'badge-red', icon: <XCircle size={12} /> },
};

const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

function BookingCard({ booking, onCancel }) {
  const status = statusConfig[booking.status] || statusConfig.pending;
  const [cancelling, setCancelling] = useState(false);
  const navigate = useNavigate();

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      await bookingsAPI.cancel(booking.id);
      onCancel(booking.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <article className="glass-card rounded-2xl overflow-hidden hover:scale-[1.01] transition-all duration-300">
      <div className="flex flex-col sm:flex-row">
        {/* Car image */}
        {booking.image_url && (
          <div className="sm:w-48 h-36 sm:h-auto shrink-0 overflow-hidden">
            <img
              src={booking.image_url}
              alt={booking.car_name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5 flex-1 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-white">{booking.car_name}</h3>
              <p className="text-white/40 text-sm">{booking.brand} · {booking.color}</p>
            </div>
            <span className={`${status.class} flex items-center gap-1`}>
              {status.icon}
              {status.label}
            </span>
          </div>

          {/* Booking details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-white/30 text-xs mb-0.5">Pickup</p>
              <p className="text-white/70 font-medium">{new Date(booking.pickup_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-white/30 text-xs mb-0.5">Return</p>
              <p className="text-white/70 font-medium">{new Date(booking.return_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-white/30 text-xs mb-0.5">Duration</p>
              <p className="text-white/70 font-medium">{booking.total_days} day{booking.total_days !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className="text-white/30 text-xs mb-0.5">Total</p>
              <p className="text-white font-bold gradient-text-orange">{formatINR(booking.total_price)}</p>
            </div>
          </div>

          {/* Location */}
          <p className="text-white/30 text-xs">
            📍 {booking.pickup_location}
            {booking.return_location !== booking.pickup_location && ` → ${booking.return_location}`}
          </p>

          {/* Payment status & Actions */}
          <div className="flex items-center gap-3 pt-1">
            {booking.payment_status === 'paid' ? (
              <span className="badge-green text-xs flex items-center gap-1"><CheckCircle size={10} /> Paid</span>
            ) : booking.status !== 'cancelled' ? (
              <button
                onClick={() => navigate(`/payment/${booking.id}`)}
                className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-green-400/10 transition-all"
              >
                <CreditCard size={13} />
                Pay Now
              </button>
            ) : null}

            {booking.status !== 'cancelled' && booking.status !== 'completed' && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-all disabled:opacity-50"
                id={`cancel-booking-${booking.id}`}
              >
                <XCircle size={13} />
                {cancelling ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function CarUploadForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    category: 'SUV',
    price_per_day: '',
    seats: 5,
    transmission: 'Automatic',
    fuel_type: 'Petrol',
    color: '',
    image_url: '',
    description: '',
    horsepower: '',
    mileage: '',
    featuresString: 'GPS Navigation, Push Button Start, Bluetooth, ABS',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!form.name || !form.brand || !form.model || !form.price_per_day) {
      setError('Please fill in the required fields (Name, Brand, Model, Price/Day).');
      setLoading(false);
      return;
    }

    try {
      const features = form.featuresString.split(',').map((f) => f.trim()).filter(Boolean);
      const postData = {
        ...form,
        year: parseInt(form.year) || 2024,
        price_per_day: parseFloat(form.price_per_day),
        seats: parseInt(form.seats) || 5,
        horsepower: parseInt(form.horsepower) || 120,
        mileage: parseInt(form.mileage) || 18,
        features,
      };

      const { data } = await carsAPI.create(postData);
      if (data.success) {
        setSuccess('Vehicle hosted successfully! Redirecting...');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to list car. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">{error}</div>}
      {success && <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl">{success}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Car Name *</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Maruti Suzuki Grand Vitara" className="input-dark" required />
        </div>
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Brand *</label>
          <input type="text" name="brand" value={form.brand} onChange={handleChange} placeholder="e.g. Maruti Suzuki" className="input-dark" required />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Model Version *</label>
          <input type="text" name="model" value={form.model} onChange={handleChange} placeholder="e.g. Alpha+ Hybrid" className="input-dark" required />
        </div>
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Year *</label>
          <input type="number" name="year" value={form.year} onChange={handleChange} className="input-dark" required />
        </div>
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Price Per Day (₹ INR) *</label>
          <input type="number" name="price_per_day" value={form.price_per_day} onChange={handleChange} placeholder="e.g. 2499" className="input-dark" required />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Category</label>
          <select name="category" value={form.category} onChange={handleChange} className="input-dark" style={{ colorScheme: 'dark' }}>
            <option value="SUV">SUV</option>
            <option value="Sedan">Sedan</option>
            <option value="Hatchback">Hatchback</option>
            <option value="Electric">Electric</option>
            <option value="Compact SUV">Compact SUV</option>
            <option value="Premium">Premium</option>
            <option value="Adventure">Adventure</option>
            <option value="Supercar">Supercar</option>
          </select>
        </div>
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Fuel Type</label>
          <select name="fuel_type" value={form.fuel_type} onChange={handleChange} className="input-dark" style={{ colorScheme: 'dark' }}>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="Electric">Electric</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Transmission</label>
          <select name="transmission" value={form.transmission} onChange={handleChange} className="input-dark" style={{ colorScheme: 'dark' }}>
            <option value="Automatic">Automatic</option>
            <option value="Manual">Manual</option>
          </select>
        </div>
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Seats</label>
          <input type="number" name="seats" value={form.seats} onChange={handleChange} min="2" max="10" className="input-dark" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Color</label>
          <input type="text" name="color" value={form.color} onChange={handleChange} placeholder="e.g. Nexa Blue" className="input-dark" />
        </div>
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Horsepower (HP)</label>
          <input type="number" name="horsepower" value={form.horsepower} onChange={handleChange} placeholder="e.g. 114" className="input-dark" />
        </div>
        <div>
          <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Mileage (km/l or Range)</label>
          <input type="number" name="mileage" value={form.mileage} onChange={handleChange} placeholder="e.g. 27" className="input-dark" />
        </div>
      </div>

      <div className="text-left">
        <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Image URL</label>
        <input type="url" name="image_url" value={form.image_url} onChange={handleChange} placeholder="https://images.unsplash.com/... or paste image link" className="input-dark" />
      </div>

      <div className="text-left">
        <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Key Features (comma-separated list)</label>
        <input type="text" name="featuresString" value={form.featuresString} onChange={handleChange} placeholder="Sunroof, Touchscreen, ADAS, 360 Camera" className="input-dark" />
      </div>

      <div className="text-left">
        <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows="4" placeholder="Describe the vehicle condition, extra benefits, and details..." className="input-dark resize-none py-3" />
      </div>

      <button type="submit" disabled={loading} className="w-full btn-primary py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all">
        {loading ? 'Submitting Details...' : 'List Vehicle for Rent'}
      </button>
    </form>
  );
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'bookings' ? 'bookings' : 'fleet');

  // Cars state
  const [cars, setCars] = useState([]);
  const [carsLoading, setCarsLoading] = useState(true);
  const [carsError, setCarsError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    fuel_type: 'all',
    transmission: 'all',
    min_price: '',
    max_price: '',
  });
  const [sortBy, setSortBy] = useState('rating');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Booking modal
  const [selectedCar, setSelectedCar] = useState(null);

  // 3D showcase toggle
  const [show3D, setShow3D] = useState(true);

  const { isAuthenticated, user } = useAuth();

  // Fetch cars
  const fetchCars = useCallback(async () => {
    setCarsLoading(true);
    setCarsError('');
    try {
      const params = {
        ...(search && { search }),
        ...(filters.category !== 'all' && { category: filters.category }),
        ...(filters.fuel_type !== 'all' && { fuel_type: filters.fuel_type }),
        ...(filters.transmission !== 'all' && { transmission: filters.transmission }),
        ...(filters.min_price && { min_price: filters.min_price }),
        ...(filters.max_price && { max_price: filters.max_price }),
      };
      const { data } = await carsAPI.getAll(params);
      if (data.success) {
        let sorted = [...data.cars];
        if (sortBy === 'price_asc') sorted.sort((a, b) => a.price_per_day - b.price_per_day);
        else if (sortBy === 'price_desc') sorted.sort((a, b) => b.price_per_day - a.price_per_day);
        else if (sortBy === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
        else sorted.sort((a, b) => b.rating - a.rating); // default: rating
        setCars(sorted);
      }
    } catch (err) {
      setCarsError('Failed to load cars. Make sure the backend server is running.');
    } finally {
      setCarsLoading(false);
    }
  }, [search, filters, sortBy]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) return;
    setBookingsLoading(true);
    try {
      const { data } = await bookingsAPI.getAll();
      if (data.success) setBookings(data.bookings);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchCars(); }, [fetchCars]);
  useEffect(() => {
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab, fetchBookings]);

  const handleBook = (car) => {
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }
    setSelectedCar(car);
  };

  const handleBookingSuccess = () => {
    fetchCars();
    if (activeTab === 'bookings') fetchBookings();
    else setActiveTab('bookings');
  };

  const handleCancelBooking = (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    fetchCars(); // re-enable the car
  };

  const clearFilters = () => {
    setFilters({ category: 'all', fuel_type: 'all', transmission: 'all', min_price: '', max_price: '' });
    setSearch('');
    setSortBy('rating');
  };

  const hasActiveFilters = search || filters.category !== 'all' || filters.fuel_type !== 'all' ||
    filters.transmission !== 'all' || filters.min_price || filters.max_price;

  const activeBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed');
  const pastBookings = bookings.filter(b => b.status === 'cancelled' || b.status === 'completed');

  return (
    <div className="page-bg min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16">

        {/* ── 3D Lamborghini Showcase ──────────────────────────────── */}
        {activeTab === 'fleet' && show3D && (
          <div className="glass-card rounded-3xl overflow-hidden mb-8 relative animate-fade-in-up">
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={() => setShow3D(false)}
                className="glass rounded-full p-2 text-white/30 hover:text-white/70 transition-colors"
                title="Hide 3D showcase"
              >
                <X size={16} />
              </button>
            </div>
            <div className="absolute top-4 left-6 z-10">
              <p className="text-white/30 text-xs tracking-widest uppercase">Interactive 3D Scene</p>
              <h2 className="font-display font-bold text-white text-xl">
                London Street <span className="gradient-text">Showcase</span>
              </h2>
            </div>
            <div className="h-[350px] sm:h-[420px]">
              <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
              }>
                <CarModel3D
                  height="100%"
                  autoRotate={false}
                  autoRotateSpeed={0.3}
                  carColor="#cc0000"
                  enableZoom={true}
                  enablePan={true}
                  showColorPicker={true}
                  modelScale={0.2} // Matching the new master config scale
                  modelPosition={[0, -0.5, 0]}
                  modelRotation={[0, -0.6, 0]}
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* Show 3D button when hidden */}
        {activeTab === 'fleet' && !show3D && (
          <button
            onClick={() => setShow3D(true)}
            className="mb-4 text-xs text-blue-400/60 hover:text-blue-400 transition-colors flex items-center gap-1.5"
          >
            <Car size={14} /> Show 3D Car Showcase
          </button>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white">
              {activeTab === 'fleet'
                ? <>Indian <span className="gradient-text">Fleet</span></>
                : activeTab === 'bookings'
                ? <>My <span className="gradient-text">Bookings</span></>
                : <>Host a <span className="gradient-text">Car</span></>
              }
            </h1>
            <p className="text-white/40 mt-1 text-sm">
              {activeTab === 'fleet'
                ? `${cars.length} vehicles available across India 🇮🇳`
                : activeTab === 'bookings'
                ? `${bookings.length} total booking${bookings.length !== 1 ? 's' : ''}`
                : 'Share your vehicle and start earning passive income.'
              }
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex glass rounded-xl p-1 border border-white/08">
            <button
              id="tab-fleet"
              onClick={() => {
                setActiveTab('fleet');
                setSearchParams(p => { p.delete('tab'); return p; });
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'fleet'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-glow-blue'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <Car size={16} />
              Fleet
            </button>
            <button
              id="tab-bookings"
              onClick={() => {
                setActiveTab('bookings');
                setSearchParams(p => { p.set('tab', 'bookings'); return p; });
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === 'bookings'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-glow-blue'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <ClipboardList size={16} />
              My Bookings
              {activeBookings.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
                  {activeBookings.length}
                </span>
              )}
            </button>
            {isAuthenticated && (
              <button
                id="tab-upload"
                onClick={() => {
                  setActiveTab('upload');
                  setSearchParams(p => { p.set('tab', 'upload'); return p; });
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'upload'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-glow-blue'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                <Upload size={16} />
                Host a Car
              </button>
            )}
          </div>
        </div>

        {/* ── Fleet Tab ─────────────────────────────────────────────── */}
        {activeTab === 'fleet' && (
          <>
            {/* Search and Filter Bar */}
            <div className="glass-card rounded-2xl p-4 mb-6 space-y-4">
              <div className="flex gap-3 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    id="fleet-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, brand, model..."
                    className="input-dark pl-10 text-sm"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Sort */}
                <div className="relative min-w-[160px]">
                  <select
                    id="fleet-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-dark text-sm appearance-none pr-8"
                    style={{ colorScheme: 'dark' }}
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>

                {/* Filter toggle */}
                <button
                  id="fleet-filter-toggle"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    filtersOpen || hasActiveFilters
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'glass text-white/50 hover:text-white border border-white/08'
                  }`}
                >
                  <SlidersHorizontal size={15} />
                  Filters
                  {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-400" />}
                </button>

                {/* Refresh */}
                <button
                  id="fleet-refresh"
                  onClick={fetchCars}
                  className="p-3 rounded-xl glass text-white/40 hover:text-white border border-white/08 transition-all"
                  title="Refresh"
                >
                  <RefreshCw size={16} />
                </button>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <button
                    id="fleet-clear-filters"
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <X size={13} /> Clear All
                  </button>
                )}
              </div>

              {/* Expanded Filters */}
              {filtersOpen && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-white/06 animate-fade-in-up">
                  {/* Category */}
                  <div>
                    <label className="block text-white/30 text-xs mb-1.5">Category</label>
                    <select
                      id="filter-category"
                      value={filters.category}
                      onChange={(e) => setFilters(p => ({ ...p, category: e.target.value }))}
                      className="input-dark text-xs"
                      style={{ colorScheme: 'dark' }}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fuel type */}
                  <div>
                    <label className="block text-white/30 text-xs mb-1.5">Fuel Type</label>
                    <select
                      id="filter-fuel"
                      value={filters.fuel_type}
                      onChange={(e) => setFilters(p => ({ ...p, fuel_type: e.target.value }))}
                      className="input-dark text-xs"
                      style={{ colorScheme: 'dark' }}
                    >
                      {FUEL_TYPES.map(f => (
                        <option key={f} value={f}>{f === 'all' ? 'All Fuels' : f}</option>
                      ))}
                    </select>
                  </div>

                  {/* Transmission */}
                  <div>
                    <label className="block text-white/30 text-xs mb-1.5">Transmission</label>
                    <select
                      id="filter-transmission"
                      value={filters.transmission}
                      onChange={(e) => setFilters(p => ({ ...p, transmission: e.target.value }))}
                      className="input-dark text-xs"
                      style={{ colorScheme: 'dark' }}
                    >
                      {TRANSMISSIONS.map(t => (
                        <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Min Price */}
                  <div>
                    <label className="block text-white/30 text-xs mb-1.5">Min Price/Day (₹)</label>
                    <input
                      type="number"
                      id="filter-min-price"
                      value={filters.min_price}
                      onChange={(e) => setFilters(p => ({ ...p, min_price: e.target.value }))}
                      placeholder="0"
                      min="0"
                      className="input-dark text-xs"
                    />
                  </div>

                  {/* Max Price */}
                  <div>
                    <label className="block text-white/30 text-xs mb-1.5">Max Price/Day (₹)</label>
                    <input
                      type="number"
                      id="filter-max-price"
                      value={filters.max_price}
                      onChange={(e) => setFilters(p => ({ ...p, max_price: e.target.value }))}
                      placeholder="100000"
                      min="0"
                      className="input-dark text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category quick pills */}
            <div className="flex gap-2 flex-wrap mb-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  id={`category-pill-${cat}`}
                  onClick={() => setFilters(p => ({ ...p, category: cat }))}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    filters.category === cat
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-glow-blue'
                      : 'glass text-white/40 hover:text-white border border-white/08'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>

            {/* Not logged in banner */}
            {!isAuthenticated && (
              <div className="glass-card rounded-2xl p-4 mb-6 flex items-center gap-3 border border-orange-500/20 bg-orange-500/05">
                <AlertTriangle size={18} className="text-orange-400 shrink-0" />
                <p className="text-white/60 text-sm">
                  <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">Sign in</Link>
                  {' '}to book vehicles and track your rentals.
                </p>
              </div>
            )}

            {/* Cars Grid */}
            {carsLoading ? (
              <LoadingSpinner message="Loading fleet..." />
            ) : carsError ? (
              <div className="text-center py-20">
                <div className="text-red-400 text-5xl mb-4">⚠️</div>
                <p className="text-red-400 font-semibold mb-2">Connection Error</p>
                <p className="text-white/30 text-sm mb-6">{carsError}</p>
                <button onClick={fetchCars} className="btn-primary text-sm">
                  <RefreshCw size={14} className="inline mr-2" />
                  Retry
                </button>
              </div>
            ) : cars.length === 0 ? (
              <div className="text-center py-20">
                <Car size={64} className="text-white/10 mx-auto mb-4" />
                <p className="text-white/40 font-semibold mb-2">No cars match your filters</p>
                <button onClick={clearFilters} className="btn-ghost text-sm mt-2">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {cars.map((car, i) => (
                  <CarCard
                    key={car.id}
                    car={car}
                    onBook={handleBook}
                    index={i}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Bookings Tab ──────────────────────────────────────────── */}
        {activeTab === 'bookings' && (
          <>
            {!isAuthenticated ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <LogIn size={48} className="text-white/10 mx-auto mb-4" />
                <p className="text-white/40 mb-4">Sign in to view your bookings</p>
                <Link to="/login" className="btn-primary">Sign In</Link>
              </div>
            ) : bookingsLoading ? (
              <LoadingSpinner message="Loading bookings..." />
            ) : bookings.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <ClipboardList size={48} className="text-white/10 mx-auto mb-4" />
                <p className="text-white/40 font-semibold mb-2">No bookings yet</p>
                <p className="text-white/20 text-sm mb-6">Browse our fleet and make your first reservation.</p>
                <button
                  onClick={() => setActiveTab('fleet')}
                  className="btn-primary"
                  id="go-to-fleet-btn"
                >
                  <Car size={16} className="inline mr-2" />
                  Explore Fleet
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Active bookings */}
                {activeBookings.length > 0 && (
                  <div>
                    <h2 className="font-display font-bold text-white text-xl mb-4 flex items-center gap-2">
                      <Zap size={18} className="text-green-400" />
                      Active Bookings
                      <span className="badge-green text-xs">{activeBookings.length}</span>
                    </h2>
                    <div className="space-y-4">
                      {activeBookings.map(booking => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          onCancel={handleCancelBooking}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Past bookings */}
                {pastBookings.length > 0 && (
                  <div>
                    <h2 className="font-display font-bold text-white/50 text-xl mb-4 flex items-center gap-2">
                      <Clock size={18} />
                      Past Bookings
                      <span className="badge text-xs bg-white/05 text-white/30">{pastBookings.length}</span>
                    </h2>
                    <div className="space-y-4 opacity-60">
                      {pastBookings.map(booking => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          onCancel={handleCancelBooking}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Host a Car Tab ────────────────────────────────────────── */}
        {activeTab === 'upload' && isAuthenticated && (
          <div className="glass-card rounded-3xl p-6 sm:p-10 border border-white/08 max-w-3xl mx-auto animate-fade-in-up">
            <div className="mb-8 text-left">
              <h2 className="font-display font-black text-2xl text-white">List Your Vehicle</h2>
              <p className="text-white/40 text-sm mt-1">Fill out the vehicle details to start hosting on DriveElite.</p>
            </div>
            <CarUploadForm onSuccess={() => {
              fetchCars();
              setActiveTab('fleet');
              setSearchParams(p => { p.delete('tab'); return p; });
            }} />
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedCar && (
        <BookingModal
          car={selectedCar}
          onClose={() => setSelectedCar(null)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
