import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import BottomNav from '../components/BottomNav';

const events = [
  { label: 'Haldi', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAopIKs0XFIAmYEzt34zxQ4mQpsR_RNLneR0r2n8BJh991To8G-YqPINPVv9YSBrBROlIk_610wi-1vcOdIgLPFtCqOFB0vgBSkoKDoOafn5ZS7mswP60Q5ZXrJp2wV6cKP9fOfWVqgC3ZTOvBTJv2frLCTfUF35A6wZQq9xPaCHndyU_m5664qyF3PCpXshkT0POYwioXoxBvTdMlplAVpur7mD4AgUi-OuTeRAtFviqsAt05sP8if_SFJ0wWneLvYQu138fZtZPpv' },
  { label: 'Sunday Brunch', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBweGvKOq2Hjcdx9CHvUvdKfMR2gsb8iodkAaT5iZ6i1RHif4Co2LsFBJ5r3B0q6EPr4_eX8pCPjwOG49kBD_CwdC3lbniuajJepARF98GtSYZc2Vtg5Hm-RgWdsndCiFTeZm9u3dMiEJApvrh397bJw8s-5UU99HB-VTJ8zYfb5YtqTIV4kECstfRqZ3vOdDODX1UAXgqsxioh_TDe7nBysIlI30eQW_JQ4KIXxFkxFzGW0kiXj3Mluu_iYYpD9xpTnAAn2HshZln' },
  { label: 'Reception', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBljulVmEBFjUsYv6vcs62Vr9xlbcnKq3_jnhsJw-RV9-n_Jr1-_GmHjDmEVB_EFLdOMcETcONHXkxwe4hL9pNVkBIwLniSNgNMhpD0E7uoiJv2ftategycdLqo23LZf6u5mZwGwv1-3jUFE7k3YqtA_lcyhgQhtALQec27JX5ZMXT2HrUMzmal1fePTFW0tkt25pqPvBJEuV6vdsQX5EZTA3_XliCbyLBySM7HvO9-8yfMDcgwK2dwWBCHEX4pboybrY-_T973KDAm' },
  { label: 'Conference', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRtfJetp_rVfMVqoczMHlRG_uNP9gyrXzs3TMq8WQAGhSVMWIAoqieHFwB00Cult99cqxONR6Rve2rmsnYIaa60aOV9noUsLLHB8grso_mOczV7VJqGsqjFIU1lwdLlVL2UPLhxfU8RtIDQgR4PnSf_Xt916yhD61GKuvTqLclsxgG6V-eV161fG5bYTddJCZaid0_kTmRiLnp8z8iCL7X0EXeKI2iDI4OJ1l_1MHqOTo8DgP0Uk5a8RdyywvF5aLUeQmdDCb4UQ63' }
];

export default function AIOutfitsScreen() {
  const navigate = useNavigate();
  const [wornToday, setWornToday] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [savedToPlanner, setSavedToPlanner] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleWear = () => {
    setWornToday(true);
    showToast('✓ Outfit marked as worn today!');
  };

  const handleRegenerate = () => {
    if (regenerating) return;
    setRegenerating(true);
    setWornToday(false);
    setTimeout(() => {
      setRegenerating(false);
      showToast('✨ New outfit generated!');
    }, 1500);
  };

  const handleQuickAction = (label: string) => {
    if (label === 'Save to Planner') {
      setSavedToPlanner(true);
      showToast('✓ Look saved to your planner!');
    } else if (label === 'Share Look') {
      showToast('📤 Share link copied!');
    } else if (label === 'Buy Missing Items') {
      navigate('/market');
    }
  };

  const handleEventClick = (label: string) => {
    setSelectedEvent(label);
    showToast(`Generating outfit for: ${label}…`);
    setTimeout(() => navigate('/planner'), 1200);
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

      <header className="fixed top-0 left-0 w-full bg-surface/90 backdrop-blur-md z-50 flex justify-between items-center px-6 py-4 border-b border-outline-variant/10">
        <button onClick={() => showToast('Menu coming soon!')} className="text-primary hover:opacity-70 transition-opacity">
          <ICONS.Menu size={24} />
        </button>
        <h1 className="text-2xl font-serif italic font-bold text-primary">PEHNO</h1>
        <button onClick={() => showToast('Profile coming soon!')} className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant/30">
          <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuACjsNwqjez_2SCZcyN3dIaQeMqbs148NplCUtQPFf7V8OEXgWXQ5mRX6FPfoa2JTWulou0rTToz_EPKtZp6IE-_K30Ol9uM7Mc-LCfajsz8NjsYfyzvz8zm0SocZS195xxB228YsutU9DqcOtnZjRYx6TwOnZKLCDwite4gONIh5qgpUDymDXcF2ippdLQyjjRfqk8U2mo29_3X1jDJtGmz6_4AtvAhnww-U0cT8jYYTBvZDdguyzqrp9wQwzcTEQ7nklgVRbldA-q" referrerPolicy="no-referrer" />
        </button>
      </header>

      <main className="pt-24 px-6 max-w-7xl mx-auto">
        <section className="mb-12">
          <p className="font-sans text-[11px] tracking-widest text-primary mb-2 uppercase font-bold">Today's Curation</p>
          <h2 className="font-serif text-3xl md:text-5xl text-on-surface font-bold tracking-tight mb-4">The Daily Look</h2>
          <div className="flex items-center gap-3 text-on-surface-variant text-sm">
            <ICONS.Flash size={14} className="text-primary" />
            <span>32°C Mumbai</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span>Client Meeting at 2:00 PM</span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-6 md:p-10 shadow-[0px_12px_32px_rgba(85,67,52,0.08)] relative overflow-hidden">
            <div className="absolute inset-0 buti-pattern opacity-[0.03] pointer-events-none" />
            <div className="relative z-10 grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="inline-flex bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                  AI Recommendation
                </div>
                <h3 className="font-serif text-4xl font-bold text-on-surface">
                  {regenerating ? 'Generating New Look…' : 'Sophisticated Linen Ensemble'}
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  A breathable linen blend that balances traditional silhouette with modern corporate etiquette. This pairing keeps you cool in the heat while maintaining a sharp profile for your presentation.
                </p>
                <div className="space-y-4 py-4">
                  <div className="flex items-start gap-4">
                    <ICONS.Check size={20} className="text-primary mt-1" />
                    <div>
                      <p className="font-bold text-sm">Why it works</p>
                      <p className="text-sm text-on-surface-variant">Perfect for the 32°C heat and your client meeting. The Indigo tone signals trust and authority.</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-4">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleWear}
                    className={`px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 transition-all ${wornToday ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-primary to-primary-container text-white'}`}
                  >
                    <ICONS.Wardrobe size={18} />
                    {wornToday ? 'Wearing Today ✓' : 'Wear This Today'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="bg-surface-container-high text-on-surface-variant px-6 py-3 rounded-full font-bold hover:bg-surface-container-highest transition-colors flex items-center gap-2 disabled:opacity-60"
                  >
                    <motion.span
                      animate={regenerating ? { rotate: 360 } : { rotate: 0 }}
                      transition={{ duration: 0.8, repeat: regenerating ? Infinity : 0, ease: 'linear' }}
                    >
                      <ICONS.Regenerate size={18} />
                    </motion.span>
                    Regenerate
                  </motion.button>
                </div>
              </div>
              <div className="relative flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-[3/4] bg-surface-container rounded-lg overflow-hidden group">
                    <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8K0Pvutjx-71kEhN52rD7RQKgtFUyqFTmBeDK51gcbcLWKyKezbTlIgW2XHpLN3JwnNSNrGzOR-NfoTfVeFwIXjOnqM4jLwuLCVr7jQ595lsFqfycoS_JvRsXMumi1-F6DMmDNR8kpeUavCHCoqesiRHYGElqAZrQ3wk6x8r8A1x8kTgtwA4qf1Cy3y9TYGU6_sep-S8G1xUPD7TBDrmSCB2ksPgUgK_nl6poqKgkkryyTmIBx3lqt75Wk0k27nQTKsUHzRBm82IS" alt="Kurta" referrerPolicy="no-referrer" />
                  </div>
                  <div className="aspect-[3/4] bg-surface-container rounded-lg overflow-hidden group">
                    <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCu7dgFKemk4wMqfGSPaU0m1OqyOHQg01s-8rsQgbKd4nYcMM9kGlbAgaPUp8TRG76JsPMOetI3uqSAZwlWqO_fxM8MOZ5KMfbc9opPfqMjvFi7-fJmQHaVu3vxQaX0R0CWsjbc451dzsbB0tqFWRv-1O7Q9MQJOgmKLqEt_pTVxNZ2ojpCjrJJ3Wv0VOV8L9oNsgmnDQbDMOKOVMvIuZJs9qJcebI6X74tQwzY-zW7IWhg2JgRbtyxnLei2LztMGJg9x0a1AFbZKqr" alt="Trousers" referrerPolicy="no-referrer" />
                  </div>
                </div>
                <div className="aspect-square bg-surface-container rounded-lg overflow-hidden group">
                  <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBt6idsSPtHNdtIpRk-7Mas7e3ZpJ5ZVmPiAeJtbEZCkEF7ebFvG1DiftHZG8hD9DWOUZOPsrCTXyaI415WX9DymANr4SI8VHhSrWDfjyxb9NV1Q-5pNesQtFnDd4ZEtmogwct0bioplV7GETYRu0hZSJu7WrMMlufP8JJjoOG_wZfC1hCLP5WFmddRagUsHpApcoJNo-D-qc5iIDaz12Cv9IBArjUVJRRB81bp9Z2_1JZ6JvGk8kVudiljA7E7NJIkeaCea9DHP0gM" alt="Shoes" referrerPolicy="no-referrer" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-secondary" />
                    <span className="text-xs font-bold">PERSONALIZED FOR</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant font-medium tracking-tight">Medium Build • Warm Skin Tone • Classic Style</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10">
              <h4 className="font-serif text-xl font-bold mb-4">Quick Actions</h4>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'Save to Planner', icon: ICONS.Planner },
                  { label: 'Share Look', icon: ICONS.Share },
                  { label: 'Buy Missing Items', icon: ICONS.Buy }
                ].map((action) => (
                  <motion.button
                    key={action.label}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleQuickAction(action.label)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors ${action.label === 'Save to Planner' && savedToPlanner ? 'bg-green-50 border border-green-200' : 'bg-surface-container-lowest hover:bg-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <action.icon size={20} className={action.label === 'Save to Planner' && savedToPlanner ? 'text-green-600' : 'text-primary'} />
                      <span className="font-medium text-sm">{action.label === 'Save to Planner' && savedToPlanner ? 'Saved to Planner ✓' : action.label}</span>
                    </div>
                    <ICONS.ChevronRight size={16} className="text-on-surface-variant/40" />
                  </motion.button>
                ))}
              </div>
            </div>
            <div className="bg-secondary text-white rounded-xl p-6 relative overflow-hidden flex-1 flex flex-col justify-end min-h-[200px]">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <ICONS.AIOutfits size={96} />
              </div>
              <div className="relative z-10">
                <h4 className="font-serif text-xl font-bold mb-2">Style Insight</h4>
                <p className="text-sm opacity-90 leading-relaxed mb-4">You've worn this Kurta 3 times this month. Try pairing it with your white pajamas for a more relaxed evening look.</p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => showToast('Style history coming soon!')}
                  className="text-xs font-bold underline tracking-widest uppercase"
                >
                  View History
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <p className="font-sans text-[11px] tracking-widest text-primary mb-2 uppercase font-bold">Specialized Curation</p>
              <h2 className="font-serif text-3xl font-bold">Style for an Event</h2>
            </div>
            <button
              onClick={() => navigate('/planner')}
              className="text-primary font-bold flex items-center gap-2 hover:opacity-70 transition-opacity"
            >
              View All Occasions
              <ICONS.ArrowRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {events.map((event) => (
              <motion.div
                key={event.label}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleEventClick(event.label)}
                className={`group cursor-pointer ${selectedEvent === event.label ? 'ring-2 ring-primary rounded-xl' : ''}`}
              >
                <div className="aspect-square rounded-xl overflow-hidden relative">
                  <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={event.img} alt={event.label} referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <span className="font-serif text-xl font-bold">{event.label}</span>
                  </div>
                  {selectedEvent === event.label && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <ICONS.Check size={14} className="text-white" />
                    </div>
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
