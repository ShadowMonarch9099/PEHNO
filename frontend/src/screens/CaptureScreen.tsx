import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';

const fabrics = ['Silk', 'Cotton', 'Linen', 'Wool', 'Khadi'];

export default function CaptureScreen() {
  const navigate = useNavigate();
  const [selectedFabric, setSelectedFabric] = useState('Silk');
  const [flashOn, setFlashOn] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleCapture = () => {
    if (captured) return;
    setCaptured(true);
    setTimeout(() => {
      showToast(`✓ ${selectedFabric} garment digitized!`);
      setTimeout(() => navigate('/wardrobe'), 1500);
    }, 800);
  };

  const handleGallery = () => {
    showToast('📁 Gallery picker coming soon!');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-on-surface text-surface px-6 py-3 rounded-full text-sm font-medium shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-surface/90 backdrop-blur-md flex justify-between items-center px-6 py-4 w-full z-50 fixed top-0">
        <button onClick={() => navigate(-1)} className="text-primary hover:opacity-80 transition-opacity">
          <ICONS.Close size={24} />
        </button>
        <h1 className="text-2xl font-serif italic font-bold text-primary">PEHNO</h1>
        <button onClick={() => showToast('Profile coming soon!')} className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30">
          <img
            alt="User profile"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhd5GRjQfHsbNdyYVeSeM5Ifri3BMliNdIih2NP_jPAdKgQK_tY0M0aQ-kr_ngBkiQdi0YYsUE0hQSqrK4n3lX9IWIQSAl4zN8hH8YsEH4f7TN2xF50ljAsuVbMcnL8vpbqj-3kzr373IfEsdveecW4mfa9GB88CUGhLF3eXnThMR30EfO25jdYSC5su_uBBSA7UA6rVhdGlbriWqC7HB5rkN_MIvYDKX1R8Mtu-AnP36oEA4L2hyyfwpJyNWA48vtl_8ujn8uj0HB"
            referrerPolicy="no-referrer"
          />
        </button>
      </header>

      <main className="flex-grow pt-20 pb-12 flex flex-col items-center max-w-2xl mx-auto w-full px-4">
        <div className="w-full mb-6 text-center">
          <p className="font-sans text-xs tracking-widest uppercase text-secondary mb-2">Guided Capture</p>
          <h2 className="font-serif text-2xl font-bold text-on-surface-variant">
            Digitize Your <span className="text-primary">{selectedFabric}</span> Garment
          </h2>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative w-full aspect-[3/4] bg-surface-container-high overflow-hidden shadow-2xl rounded-2xl">
          <motion.img
            animate={captured ? { scale: 1.05, filter: 'brightness(1.2)' } : { scale: 1, filter: 'brightness(0.95)' }}
            transition={{ duration: 0.3 }}
            alt="Camera Preview"
            className="w-full h-full object-cover grayscale-[20%]"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA6UUJBGwEc23SY50TuLBjIy8CTsgxmTV5M8fkA1T0ra6by_7ix-ttRJczu2VVsNYXo7OzI5PhrxvtuiGz6Oy7HHZWA2J3A6OG8_ooiFlmqFUZVP6WwLVrDVROHSHMsz50dRtfHreIJmXpFJWzg5w8Fm-CtC0otENMa7pOCe9tUKUtEj2o7xF4C_wXCffzc4pM-TwYNGZJcS_NOc2XkhjRoH-WdDD_Opmx78_PgtH4NtYc9h1jSStGOz-3VjgxxTYbMqBjO42Zyn1tE"
            referrerPolicy="no-referrer"
          />

          {/* Capture flash overlay */}
          <AnimatePresence>
            {captured && (
              <motion.div
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 bg-white pointer-events-none z-20"
              />
            )}
          </AnimatePresence>

          {/* Scan line */}
          {!captured && (
            <motion.div
              animate={{ top: ['20%', '80%', '20%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_15px_#964900] z-10"
            />
          )}

          {/* Flash indicator */}
          {flashOn && (
            <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
              Flash On
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none">
            <svg className="w-full h-full text-white/40" fill="none" stroke="currentColor" strokeDasharray="2 2" strokeWidth="0.5" viewBox="0 0 100 120">
              <path d="M30 10 L45 10 L50 15 L55 10 L70 10 L85 25 L75 50 L75 110 L25 110 L25 50 L15 25 Z" />
              <circle cx="50" cy="60" fill="currentColor" r="2" />
            </svg>
          </div>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-4 py-2 flex items-center gap-2 rounded-full border border-outline-variant/10">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-sans text-[10px] tracking-widest uppercase font-bold text-on-surface">
              {captured ? 'Processing…' : 'Scanning Fabric...'}
            </span>
          </div>

          {/* Corner brackets */}
          <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-white/60" />
          <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-white/60" />
          <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-white/60" />
          <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-white/60" />
        </div>

        <div className="w-full mt-8 flex flex-col items-center">
          {/* Fabric selector */}
          <div className="w-full overflow-x-auto no-scrollbar flex gap-3 pb-6 px-2">
            {fabrics.map((fabric) => (
              <motion.button
                key={fabric}
                whileTap={{ scale: 0.92 }}
                onClick={() => setSelectedFabric(fabric)}
                className={`shrink-0 font-sans text-[10px] tracking-widest uppercase px-6 py-2 rounded-full transition-all ${selectedFabric === fabric ? 'bg-primary text-white shadow-lg' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                {fabric}
              </motion.button>
            ))}
          </div>

          {/* Camera Controls */}
          <div className="flex items-center justify-between w-full px-8">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleGallery}
              className="flex flex-col items-center gap-1 text-secondary group"
            >
              <div className="p-3 rounded-full bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                <ICONS.Gallery size={24} />
              </div>
              <span className="font-sans text-[9px] tracking-widest uppercase font-semibold">Gallery</span>
            </motion.button>

            {/* Shutter button */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleCapture}
              disabled={captured}
              className="relative group focus:outline-none"
            >
              <motion.div
                animate={captured ? { scale: 0.9, opacity: 0.7 } : { scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-full border-[3px] border-primary flex items-center justify-center p-1.5 transition-transform"
              >
                <div className={`w-full h-full rounded-full shadow-xl transition-all ${captured ? 'bg-green-500' : 'bg-gradient-to-tr from-primary to-primary-container'}`} />
              </motion.div>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setFlashOn(!flashOn); showToast(flashOn ? 'Flash off' : 'Flash on'); }}
              className={`flex flex-col items-center gap-1 group ${flashOn ? 'text-yellow-500' : 'text-secondary'}`}
            >
              <div className={`p-3 rounded-full transition-colors ${flashOn ? 'bg-yellow-100' : 'bg-secondary/10 group-hover:bg-secondary/20'}`}>
                <ICONS.Flash size={24} />
              </div>
              <span className="font-sans text-[9px] tracking-widest uppercase font-semibold">{flashOn ? 'On' : 'Auto'}</span>
            </motion.button>
          </div>

          <div className="mt-10 p-4 bg-surface-container-low w-full flex items-start gap-4 rounded-xl">
            <ICONS.Tip className="text-primary mt-0.5" size={18} />
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface">Pro Tip:</strong> For best results, place your garment on a solid, contrasting background and ensure bright, natural daylight.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
