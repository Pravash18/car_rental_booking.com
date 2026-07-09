import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Menu, ArrowRight, Facebook, Twitter, Instagram, ChevronRight, Zap } from 'lucide-react';
import CarModel3D from '../components/CarModel3D';

const CAR_MODELS = [
  { 
    name: 'Lamborghini Huracan', 
    badge: 'EVO',
    brand: 'The Evolution of V10',
    description: 'The Huracán EVO is the evolution of the most successful V10-powered Lamborghini ever. It stands as the peak of performance, aerodynamics, and dynamic control systems.',
    watermark: 'HURACAN',
    colorClass: 'gradient-text-orange',
    accentColor: '#ff5500',
    url: '/models/lamborghini.glb', 
    scale: 0.2, // Increased from 0.005
    position: [0, -0.5, 0], 
    rotation: [0, -0.6, 0] 
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 90, damping: 14 }
  }
};

export default function Landing() {
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const [carColor, setCarColor] = useState(CAR_MODELS[0].accentColor);

  const activeCar = CAR_MODELS[activeModelIndex];

  const audioRef = React.useRef(new Audio('/audio/lambo.mp3'));

  const handleNextCar = () => {
    const nextIndex = (activeModelIndex + 1) % CAR_MODELS.length;
    setActiveModelIndex(nextIndex);
    setCarColor(CAR_MODELS[nextIndex].accentColor);
    
    // Play sound if Lamborghini is selected
    if (CAR_MODELS[nextIndex].name.includes('Lamborghini')) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio autoplay prevented:', e));
    }
  };

  const handlePrevCar = () => {
    const prevIndex = (activeModelIndex - 1 + CAR_MODELS.length) % CAR_MODELS.length;
    setActiveModelIndex(prevIndex);
    setCarColor(CAR_MODELS[prevIndex].accentColor);
    
    // Play sound if Lamborghini is selected
    if (CAR_MODELS[prevIndex].name.includes('Lamborghini')) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log('Audio autoplay prevented:', e));
    }
  };

  // Stop audio when navigating away from the page
  React.useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#050508] overflow-hidden select-none font-sans text-white">
      {/* ── Background Title Watermark ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <AnimatePresence mode="wait">
          <motion.h1
            key={activeCar.watermark}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.45 }}
            className="text-[12vw] font-display font-black tracking-[0.15em] text-white/[0.015] select-none leading-none"
          >
            {activeCar.watermark}
          </motion.h1>
        </AnimatePresence>
      </div>

      {/* ── Top Header Navigation ── */}
      <header className="absolute top-0 left-0 right-0 z-40 px-6 sm:px-12 py-6 flex items-center justify-between">
        <button id="hamburger-menu-btn" className="text-white/80 hover:text-white transition-colors duration-200">
          <Menu size={22} />
        </button>

        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-glow-blue">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg text-white tracking-wider">
            Drive<span className="gradient-text">Elite</span>
          </span>
        </Link>

        <button id="header-search-btn" className="text-white/80 hover:text-white transition-colors duration-200">
          <Search size={20} />
        </button>
      </header>

      {/* ── Main Configurator Presentation Area ── */}
      <main className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 items-center px-6 sm:px-12 pt-20 pb-28 relative z-10">
        
        {/* Left: Staggered Content Presentation */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeCar.name}
            className="lg:col-span-4 flex flex-col gap-6 text-left max-w-md z-20 mt-12 lg:mt-0"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div variants={itemVariants}>
              <span className="text-[11px] uppercase tracking-[0.25em] text-orange-500 font-semibold">
                {activeCar.brand}
              </span>
            </motion.div>

            <motion.h2 
              className="font-display font-black text-5xl sm:text-6xl tracking-tight leading-[1.05]"
              variants={itemVariants}
            >
              {activeCar.name.split(' ')[0]} <span className={activeCar.colorClass}>{activeCar.badge}</span>
            </motion.h2>

            <motion.p 
              className="text-white/40 text-sm sm:text-base leading-relaxed font-light"
              variants={itemVariants}
            >
              {activeCar.description}
            </motion.p>

            <motion.div variants={itemVariants} className="pt-2">
              <Link
                to="/dashboard"
                id="configurator-explore-btn"
                className="group inline-flex items-center gap-3 border border-white/10 hover:border-white/30 rounded-full pl-6 pr-2 py-2 text-xs font-semibold tracking-widest uppercase transition-all duration-300 hover:bg-white/03"
              >
                Explore More
                <div className="w-8 h-8 rounded-full bg-orange-600 group-hover:bg-orange-500 flex items-center justify-center transition-colors">
                  <ArrowRight size={14} />
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Center/Right: 3D Configurator Canvas */}
        <div className="lg:col-span-8 h-[45vh] sm:h-[55vh] lg:h-[70vh] relative w-full flex items-center justify-center">
          <CarModel3D
            height="100%"
            carColor={carColor}
            modelUrl={activeCar.url}
            modelName={activeCar.name}
            modelScale={activeCar.scale}
            modelPosition={activeCar.position}
            modelRotation={activeCar.rotation}
            rotationY={0}
          />
        </div>
      </main>

      {/* ── Configurator Controls (Color Sphere Picker + Textures + Arrow selectors) ── */}
      <div className="absolute bottom-20 left-0 right-0 z-30 px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-6">
        
        {/* Left Side: slide indicator index */}
        <div className="hidden sm:flex items-center gap-3 text-white/30 text-xs font-semibold tracking-widest">
          <span className="text-white">0{activeModelIndex + 1}</span>
          <div className="w-12 h-px bg-white/10" />
          <span>02</span>
        </div>

        {/* Middle Area: Spheres Controls */}
        <div className="flex flex-col items-center gap-5 w-full max-w-sm">
          {/* Spherical Radial Color Balls & Textures button */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 flex-wrap justify-center">
              {[
                { name: 'Orange', hex: '#ff5500' },
                { name: 'Red', hex: '#d30000' },
                { name: 'Blue', hex: '#0055ff' },
                { name: 'Green', hex: '#00cc44' },
                { name: 'Yellow', hex: '#ffcc00' },
                { name: 'Silver', hex: '#8a95a5' }
              ].map((c) => (
                <button
                  key={c.hex}
                  id={`color-sphere-${c.name.toLowerCase()}`}
                  onClick={() => setCarColor(c.hex)}
                  className="relative transition-all duration-300 hover:scale-110"
                >
                  {/* Sphere Styled with Radial Gradients for 3D depth ball look */}
                  <div
                    className={`w-9 h-9 rounded-full border transition-all duration-300 ${
                      carColor === c.hex
                        ? 'border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                        : 'border-white/10'
                    }`}
                    style={{
                      background: `radial-gradient(circle at 35% 35%, ${c.hex} 0%, #000000 100%)`
                    }}
                  />
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-white/10" />

            <button
              id="textures-btn"
              onClick={() => alert('Premium carbon and matte texture finishes are unlocked in VIP Booking tier.')}
              className="border border-white/10 hover:border-white/30 rounded-full px-5 py-2 text-[10px] uppercase tracking-wider font-semibold hover:bg-white/03 transition-all"
            >
              Textures
            </button>
          </div>
        </div>

        {/* Right Side: Directional Arrow controls to toggle next/prev model */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevCar}
            className="w-10 h-10 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-white/50 hover:text-white transition-all active:scale-95"
            title="Previous Car"
          >
            <ChevronRight size={16} className="rotate-180" />
          </button>
          <button 
            onClick={handleNextCar}
            className="w-10 h-10 rounded-full border border-white/10 hover:border-white/30 flex items-center justify-center text-white/50 hover:text-white transition-all active:scale-95"
            title="Next Car"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Right Vertical Social Bar ── */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col gap-6 items-center text-white/30">
        <a href="#facebook" className="hover:text-white transition-colors duration-200"><Facebook size={16} /></a>
        <a href="#twitter" className="hover:text-white transition-colors duration-200"><Twitter size={16} /></a>
        <a href="#instagram" className="hover:text-white transition-colors duration-200"><Instagram size={16} /></a>
      </div>

      {/* ── Configurator Bottom Navigation Links ── */}
      <footer className="absolute bottom-6 left-6 sm:left-12 z-30 text-[10px] text-white/20 tracking-wider flex gap-4 uppercase font-medium">
        <Link to="/dashboard" className="hover:text-white transition-colors">Book Now</Link>
        <span>·</span>
        <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
      </footer>
    </div>
  );
}
