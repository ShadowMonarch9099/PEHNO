import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import BottomNav from '../components/BottomNav';

const tasks = [
  { label: 'Dry Clean: Silk Saree', meta: 'Due in 2 days for Diwali', icon: ICONS.Laundry, color: 'text-red-500 bg-red-50', done: false },
  { label: 'Alteration: Blue Trousers', meta: 'Status: Tailor assigned', icon: ICONS.Alteration, color: 'text-secondary bg-secondary/10', done: false },
];

export default function PlannerScreen() {
  const navigate = useNavigate();
  const [doneTasks, setDoneTasks] = useState<string[]>([]);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const toggleTask = (label: string) => {
    setDoneTasks(prev =>
      prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
    );
  };

  return (
    <div className="min-h-screen bg-surface pb-32">
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

      <nav className="sticky top-0 z-50 flex justify-between items-center px-6 py-4 w-full bg-surface/80 backdrop-blur-md">
        <button onClick={() => showToast('Menu coming soon!')} className="text-primary hover:opacity-70 transition-opacity">
          <ICONS.Menu size={24} />
        </button>
        <h1 className="text-2xl font-serif font-bold italic text-primary">PEHNO</h1>
        <button onClick={() => showToast('Profile coming soon!')} className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high">
          <img
            alt="User Profile"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOimEaq4i6JWEvNcKv1N8U8LmRE6t6P_7_vrcwT0o73tJIG3NGrzzVGz9X2sk59xEAgnQ2CfP8uuLPsBGwaof1OHoz_SmAmEdP_h2irvy-fi0uUsszf_Conn6Qgq9DWY9snmDQQznHDoQ_M7HLuBZnfK2jqZm3X9UY0RWj3FN57M0CiasbcPSPTbHikk5e4SLhhbsy6LJgjrlhqqT8e12NSD32HP46Pt4Ao3sQV7DANPdBw6GSQkp7QL3vtgrD9YyxjOUbCf1-BQgp"
            referrerPolicy="no-referrer"
          />
        </button>
      </nav>

      <header className="px-6 py-8">
        <p className="text-[11px] font-sans font-medium uppercase tracking-[0.1em] text-secondary mb-2">Heritage Intelligence</p>
        <h2 className="font-serif text-4xl font-bold tracking-tight text-on-surface leading-tight">
          Occasion <br /> <span className="italic text-primary">Planner</span>
        </h2>
      </header>

      <main className="px-6 space-y-12">
        {/* Upcoming Festivities */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h3 className="font-serif text-xl font-bold">Upcoming Festivities</h3>
            <button
              onClick={() => showToast('Viewing all festivities…')}
              className="text-xs font-sans uppercase tracking-wider text-primary/80 hover:text-primary transition-colors font-semibold"
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-6 grid-rows-2 gap-4 h-[500px]">
            {/* Diwali — main card */}
            <div className="col-span-4 row-span-2 relative rounded-xl overflow-hidden bg-surface-container shadow-sm">
              <img className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMMy956VVSBtBWOL5gOTrKEaFsSX1kFFaZYAgvJOn3H1sonti34LKpMrnmBrrKDLLTzzEaLB7i4AoGFMCMvUc1KZtDOVxP3NOcmy9v7HR6KrDc2G4wJvlKMquP-fdwCHchSyZLY_KwqlBi1z-b3_KbcVCfYBhCQzOk0Y7Q6pJ5lGS9q8PSblskKMI7ZzdZd1OtGOVkVi4K40Ax3GmZ9EUGyU51SatEguRANMnmR6W2eZbrN_oxCiGMft9XvyCAgeuKXgixWCe9rZSX" alt="Diwali" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 p-6 text-white w-full">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="bg-primary/90 px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest mb-2 inline-block">Nov 01</span>
                    <h4 className="font-serif text-2xl font-bold">Diwali Gala</h4>
                    <p className="text-sm opacity-90 mt-1">Status: Need a Look</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => showToast('Planning your Diwali look…')}
                    className="bg-white text-primary px-4 py-2 rounded-full text-xs font-bold shadow-lg"
                  >
                    Plan Now
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Anjali's Wedding */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => showToast("Viewing Anjali's Wedding look")}
              className="col-span-2 row-span-1 relative rounded-xl overflow-hidden bg-surface-container cursor-pointer"
            >
              <img className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFHJ16PQFIMJFUP8eMX8u1mUvYgf5oWAxcH4_69ef-ZeYy8x154SQG_dD6eYdI4lDOTwWfMe6G1LehhVtcW0TcL4VDxJgCAmS6zWR8-sESV1HhztOGFdvB7S64g2Dz8gFqk4UJC6eKcMq30EYA6TASp_ey3EaNa1Dzjwc1SEx8uZ2siNi0wJ7ScR7sjACcLgaUfukfVU74rbnHl0gmS4mwJD5ZZnZwVrUgE-cyjogXFMgVhLF-arz0fHyUgtbKvP76T4kWRGAw4qnM" alt="Wedding" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-secondary/20" />
              <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
                <h4 className="font-serif text-lg font-bold leading-tight">Anjali's Wedding</h4>
                <div className="flex items-center gap-1 mt-1">
                  <ICONS.Check size={14} className="fill-current" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Planned</span>
                </div>
              </div>
            </motion.div>

            {/* Friend's Brunch */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => showToast("Planning Friend's Brunch look…")}
              className="col-span-2 row-span-1 bg-surface-container-high rounded-xl p-4 flex flex-col justify-center cursor-pointer"
            >
              <p className="text-[10px] font-sans font-bold text-primary mb-1">DEC 12</p>
              <h4 className="font-serif text-md font-bold text-on-surface leading-tight">Friend's Brunch</h4>
              <span className="text-xs text-on-surface-variant/60 mt-2 italic">Dry cleaning needed</span>
            </motion.div>
          </div>
        </section>

        {/* Planned Look */}
        <section className="bg-surface-container-low -mx-6 px-6 py-10">
          <h3 className="font-serif text-xl font-bold mb-6">
            Your Planned Look: <span className="text-secondary font-normal italic">Wedding Reception</span>
          </h3>
          <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4">
            <div className="min-w-[280px] bg-surface-container-lowest rounded-xl overflow-hidden p-2 shadow-sm">
              <div className="h-64 rounded-lg bg-surface-container overflow-hidden mb-3">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVuawqjIxXEuqNiCgGF_nmnIH8AWZHQkz3yoGyRpYvgrG9dzh56yqUuMU3FshwKYzf07uKfJ5TbLrWXv3IDjpCAijpTimQVo6zYCI42B0I5IHOuiHorbTdZeZCUKnJ-jpdvu_Ih1JjKPTp2EO0iXLslivlSxrD_Lx2OOclargo90p71e8GuafLybvBV36aORuJl5LiNu6xpqogFBvQjeHfnASkdCGj7HFO2VpPjNYXRVrBMJet_i_AIwmUO9gdC3UBcI6FPWySe5wu" alt="Sherwani" referrerPolicy="no-referrer" />
              </div>
              <div className="px-2 pb-2">
                <p className="text-[10px] uppercase font-bold text-on-surface-variant/60 tracking-widest mb-1">Core Piece</p>
                <h5 className="text-sm font-bold text-on-surface">Emerald Silk Sherwani</h5>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => showToast('Alteration reminder set!')}
                  className="w-full mt-3 py-2 bg-surface-container-high text-on-surface text-[10px] uppercase font-bold rounded-full flex items-center justify-center gap-1"
                >
                  <ICONS.History size={14} /> Remind Alteration
                </motion.button>
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/market')}
              className="min-w-[240px] border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4 text-secondary">
                <ICONS.Add size={24} />
              </div>
              <p className="font-serif font-bold text-on-surface">Missing Accessory?</p>
              <p className="text-xs text-on-surface-variant mt-2 mb-4">Complete the look with a contrasting Safa or Mojaris.</p>
              <button className="text-xs font-bold text-primary underline underline-offset-4">Explore Marketplace</button>
            </motion.div>
          </div>
        </section>

        {/* Style Insight */}
        <section className="bg-primary/5 rounded-2xl p-6 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Style Insight</p>
            <h4 className="font-serif text-lg font-bold text-on-surface leading-snug">Ganesh Chaturthi Protocol</h4>
            <p className="text-sm text-on-surface-variant mt-2">Yellow and Red are considered auspicious. Opt for a vibrant 'Pita' silk kurta to align with the traditional palette.</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => showToast('Full article coming soon!')}
              className="mt-4 flex items-center gap-2 text-xs font-bold text-primary"
            >
              Read More <ICONS.ArrowRight size={14} />
            </motion.button>
          </div>
        </section>

        {/* Wardrobe Tasks */}
        <section className="pb-12">
          <h3 className="font-serif text-xl font-bold mb-4">Wardrobe Tasks</h3>
          <div className="space-y-3">
            {tasks.map((task) => (
              <motion.div
                key={task.label}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleTask(task.label)}
                className={`flex items-center gap-4 p-4 bg-surface-container rounded-xl cursor-pointer transition-all ${doneTasks.includes(task.label) ? 'opacity-60' : 'hover:bg-surface-container-high'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${task.color}`}>
                  <task.icon size={20} />
                </div>
                <div className="flex-1">
                  <h5 className={`text-xs font-bold text-on-surface ${doneTasks.includes(task.label) ? 'line-through' : ''}`}>{task.label}</h5>
                  <p className="text-[10px] text-on-surface-variant/60">{task.meta}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${doneTasks.includes(task.label) ? 'border-green-500 bg-green-500' : 'border-outline-variant'}`}>
                  {doneTasks.includes(task.label) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
