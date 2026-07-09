import React from 'react';
import { Star, Fuel, Users, Zap, Settings2, ArrowRight, Gauge } from 'lucide-react';

const categoryColors = {
  'Hatchback': 'badge-blue',
  'SUV': 'badge-purple',
  'Sedan': 'badge-blue',
  'Electric': 'badge-green',
  'Compact SUV': 'badge-orange',
  'Premium': 'badge-purple',
  'Adventure': 'badge-orange',
  'Supercar': 'badge-red',
};

const fuelIcons = {
  'Electric': <Zap size={13} />,
  'Petrol': <Fuel size={13} />,
  'Hybrid': <Zap size={13} />,
  'Diesel': <Fuel size={13} />,
};

const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function CarCard({ car, onBook, index = 0 }) {
  const badgeClass = categoryColors[car.category] || 'badge-blue';
  const delayClass = `delay-${Math.min(index * 100, 500)}`;

  return (
    <article
      id={`car-card-${car.id}`}
      className={`group glass-card rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-card animate-fade-in-up ${delayClass} flex flex-col`}
      style={{ opacity: 0 }}
    >
      {/* Car Image */}
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
        {car.image_url ? (
          <img
            src={car.image_url}
            alt={car.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        {/* Fallback */}
        <div
          className="absolute inset-0 items-center justify-center text-white/20"
          style={{ display: car.image_url ? 'none' : 'flex' }}
        >
          <svg viewBox="0 0 100 50" className="w-32 h-16 fill-current">
            <rect x="5" y="20" width="90" height="22" rx="4" />
            <rect x="20" y="10" width="55" height="20" rx="4" />
            <circle cx="22" cy="42" r="8" />
            <circle cx="78" cy="42" r="8" />
          </svg>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Category badge */}
        <div className="absolute top-3 left-3">
          <span className={badgeClass}>{car.category}</span>
        </div>

        {/* Availability badge */}
        <div className="absolute top-3 right-3">
          {car.available ? (
            <span className="badge-green">Available</span>
          ) : (
            <span className="badge-red">Booked</span>
          )}
        </div>

        {/* Price overlay */}
        <div className="absolute bottom-3 right-3">
          <div className="glass rounded-xl px-3 py-1.5 text-right">
            <span className="text-white font-bold text-lg">{formatINR(car.price_per_day)}</span>
            <span className="text-white/50 text-xs">/day</span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col flex-1 gap-4">
        {/* Car name and rating */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display font-bold text-white text-lg leading-tight">{car.name}</h3>
            <p className="text-white/40 text-sm mt-0.5">{car.brand} · {car.year}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-white/80 text-sm font-semibold">{car.rating}</span>
            <span className="text-white/30 text-xs">({car.total_reviews})</span>
          </div>
        </div>

        {/* Specs row */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/03 border border-white/05">
            <Users size={14} className="text-blue-400 shrink-0" />
            <span className="text-white/60 text-xs">{car.seats} Seats</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/03 border border-white/05">
            {fuelIcons[car.fuel_type] || <Fuel size={14} />}
            <span className="text-white/60 text-xs">{car.fuel_type}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/03 border border-white/05">
            <Settings2 size={14} className="text-purple-400 shrink-0" />
            <span className="text-white/60 text-xs">{car.transmission}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/03 border border-white/05">
            <Gauge size={14} className="text-orange-400 shrink-0" />
            <span className="text-white/60 text-xs">{car.horsepower} HP</span>
          </div>
        </div>

        {/* Description */}
        {car.description && (
          <p className="text-white/40 text-sm leading-relaxed line-clamp-2">{car.description}</p>
        )}

        {/* Features */}
        {car.features && car.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {car.features.slice(0, 3).map((feature, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-white/05 text-white/40 border border-white/05">
                {feature}
              </span>
            ))}
            {car.features.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/05 text-white/30 border border-white/05">
                +{car.features.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Book button */}
        <div className="mt-auto pt-2">
          <button
            id={`book-btn-${car.id}`}
            onClick={() => onBook(car)}
            disabled={!car.available}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
              car.available
                ? 'btn-primary group-hover:shadow-glow-blue'
                : 'bg-white/05 text-white/30 cursor-not-allowed border border-white/10'
            }`}
          >
            {car.available ? (
              <>
                Book Now
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </>
            ) : (
              'Currently Unavailable'
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
