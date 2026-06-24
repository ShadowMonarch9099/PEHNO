import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import BottomNav from '../components/BottomNav';

const allItems = [
  { id: 1, title: 'Banarasi Zari Sari', category: 'Ethnic • Silk', categoryKey: 'Ethnic', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrWsJ01985stkkdSstq6HsWTtyQiIbUZzLnRFQJIZYSpOxqcyzSV6HWTkLJWd0dynMwipc-nYK9X3YU0m-b6vFjNHx87Sj4uVdzj38071tb244_DjQIWyj9SyHa5klplSJlBOxiBIsJMLXLgpPSfd_H92kR4dtF28yRFOHy8o78P82LeJwgfK1cJ4sgJeGdOoRper04ewcc2DirXXRrCj2iYNRVloZgAnFY4f3jU_VHxXObYTUO20rZzeEZ46LiAOHAWLfstyWXR0e', large: true },
  { id: 2, title: 'Oxford Cotton Shirt', category: 'Western • White', categoryKey: 'Western', tag: 'Office', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWWQACEj6WabDaqTO952HfJGHTXsJ9VNfP8IFIuv6Az0g1so3XvZ4q998wC2o7kS4NPT5lldfskNG7TSN_YPls8LEXMmFSN5m3KxAGYOUcGF3mGgAGqRmf7iJZO3xLS_GvTjGEU9rrJhwmMswR-LlX_DrFEXnH4YRzj_-46kmPpriHq0qu5TBkH6H4CUcB5Mx3JO9ASqjkOtJcqrMV_Nlrs75UDMwwKLM9Iqhlgtaq5qDzQg1dtQXvXTi9nl-bIX9oZ5bOQ1bijEqv' },
  { id: 3, title: 'Indigo Linen Kurta', category: 'Ethnic • Indigo', categoryKey: 'Ethnic', tag: 'Casual', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAKzqtPsNUWFbnH4qgy82m5jwuEPhNcqTjw4jO4sJJuAnXbvDCAXQemaH-d_oH1IIAsO6hNUey-Sv19X8-BxbG3NuLAlZeN5G57fTanecK1CjIvGfcfJjDhTbLKjGCDPBdYwEuPlleqHDBZ7QEv8IJhsh7OU9kNkdM015DY2Tn8q6ivSjW75EKcny7jiZh9qsdB3GQ9-PD7DrQEZuUZUuLeeqg0Ew7qwTkZj2VxVRTwGJcw0hHfXJ8EE2nKAUCOmtli5D28YDXAitn5' },
  { id: 4, title: 'Chino Trousers', category: 'Western • Cotton', categoryKey: 'Western', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDeMHW34FbEi8HBTVHnKwTh3U-ITQsw7YYn-vA47b4qgkt0wh-Qljdxb3r_bDm3hb5SXAcPSrMPzInRWNC_wQaWop1FWdJg_HFnvvQWLNKAlly0ykXAV7MdbP5ITPF5KlWHAVhGzFrc_FIzjyxEKKrTcb5eSxduWi_T-_jnb_81oKRL1fAppQJy5Cs0hFJbw0mO-j75pcBUydQ0PBy-ZejDCDJGKoM54WRpgaGENarZ0ow0WcOQKFpU9aiYdD8SnKdliMJEhbuOa2fR', wide: true },
];

const categories = ['All Items', 'Ethnic', 'Western', 'Fusion', 'Fabrics', 'Weather'];

const fabrics = [
  { title: 'Pure Cottons', meta: '12 Items • Summer', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWZwQits-xiZ3WHI3GgG9ZBuTR2DyZukzMTvRg3i1AmX7kMw0sNX8NRxlnsbv97BENyqQN7FqYHl1_HdvB7hXVwky_2KZZm-SWdzrm-U2KkGOd3IdCrR953Mzh3TOapUI0d08IieB_Z3y0C4quGwwGl5XWO-onpmUxkLT9zXs16iEle3gxgjRLTU75d_gs20lKe0ChjfdCF1mlGUfIBcXmnHmyow1RFJNNuzM0LwoKkQv7GWybWTYxm_rYKH8WgCReBxRnnFCULbQh' },
  { title: 'Royal Silks', meta: '8 Items • Festive', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAD5y6p707ZfBGLYOICBjdjvYqJFFFg-RhHYZBjOZJwZUE6x2P3LB29rvWO4DL2vaiwcDasWkNkW7-iy75Y9Iv3Boyte5oADZOqBMvmMyc_0smqQhFeVSAYEYh232IRJz0MgCklcLot5neTQrCmMxzf3vxNdavvAei2RIE8YQJUSWGJHjzTpTdh5uqaBh6oDdfXUN8KvFcFfLgqytqx1h3rCCn6ylqqjcGenzVX359dYhkOr_PgwunRAH2WnUw601fZ3FN1FDjiBDTI' },
  { title: 'Breezy Linen', meta: '5 Items • Casual', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQJwtfMkTZ8LBuWgfDyz-_1OBkpRorH8EKcf1h0ROPo_g3HkE1jXTJOs712kGk7vKpHh77o7kxU4w6IHJEHJ4ln6LMuQIjWqbBl8R8yTod1zGGIQoyuQJeEyvPkAlyDk4WujEGCHZ3Qk3wpTNpnBouOUSQbOJgxOWWhtUEX6Bdy9jS1At5DuJYnqaxmbWnB70MHrgFJ_rc2659Adfp_nc7f-XII5Bmt6DQcIO7jpdoet_hEifQQWXjAOtf-dyZ57PWtJwMWU9abSgM' }
];

export default function WardrobeScreen() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [search, setSearch] = useState('');
  const [likedItems, setLikedItems] = useState<number[]>([]);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const filteredItems = allItems.filter(item => {
    const matchesCategory = activeCategory === 'All Items' || item.categoryKey === activeCategory;
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleLike = (id: number) => {
    setLikedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background pb-32">
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

      <header className="fixed top-0 left-0 w-full bg-background/90 backdrop-blur-md z-50 flex justify-between items-center px-6 py-4 border-b border-outline-variant/10">
        <button onClick={() => showToast('Menu coming soon!')} className="text-primary hover:opacity-70 transition-opacity">
          <ICONS.Menu size={24} />
        </button>
        <h1 className="text-2xl font-serif italic font-bold text-primary">PEHNO</h1>
        <button onClick={() => showToast('Profile coming soon!')} className="w-10 h-10 rounded-full bg-surface-container overflow-hidden border border-outline-variant/20">
          <img
            alt="User Avatar"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBehXbOakCchMMDMTYKN1dXoqHU5kGJdOTPUQqakW788MzYbRjnYxjB90PtH0OCmVj-XYcjhUuSZSuLgwE1iOXC-FKVx1M4SGKP-mAn1-LnioeJd_BOHXWBqCqla9n6oR4cwUxEVN9cF4DmzKN26iInc4Y5ARdbly5ShicFsBf6IwJp1FSBAGPeYgKSU2sZLEleQ9zJcxe50Jinl17NltUurkfh1fyV56NJSEzbKmsPv_w2yJQsd6MHICEVQCGpKradTp3zuLXmWqPM"
            referrerPolicy="no-referrer"
          />
        </button>
      </header>

      <main className="pt-24 px-6 max-w-7xl mx-auto">
        <section className="mb-8">
          <span className="font-sans text-[11px] tracking-wider uppercase text-primary font-bold mb-2 block">Personal Archive</span>
          <h2 className="font-serif text-4xl md:text-5xl text-on-surface tracking-tight font-bold">Your Wardrobe</h2>
          <div className="mt-6 relative">
            <input
              className="bg-surface-container border-none rounded-full py-3 pl-12 pr-6 text-sm focus:ring-1 focus:ring-primary w-full transition-all"
              placeholder="Search clothes..."
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <ICONS.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={18} />
          </div>
        </section>

        {/* Category Filter */}
        <section className="mb-12 overflow-x-auto no-scrollbar -mx-6 px-6">
          <div className="flex gap-4 min-w-max">
            {categories.map((cat) => (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(cat)}
                className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${activeCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/10' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Items Grid */}
        <section className="grid grid-cols-2 gap-4 md:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredItems.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-2 text-center py-16 text-on-surface-variant"
              >
                <p className="font-serif text-xl">No items found</p>
                <p className="text-sm mt-2 opacity-60">Try a different category or search term</p>
              </motion.div>
            ) : (
              filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4 }}
                  onClick={() => showToast(`Opening: ${item.title}`)}
                  className={`group cursor-pointer ${item.large ? 'col-span-2 row-span-2' : item.wide ? 'col-span-2' : 'col-span-1'}`}
                >
                  <div className={`relative rounded-xl overflow-hidden bg-surface-container-high ${item.large ? 'h-[500px]' : item.wide ? 'h-[300px]' : 'h-[240px]'}`}>
                    <img
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-on-surface/60 via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-6 left-6 right-6">
                      <span className="font-sans text-[10px] tracking-[0.2em] text-white/80 uppercase">{item.category}</span>
                      <h3 className={`font-serif text-white mt-1 ${item.large ? 'text-2xl' : 'text-xl'}`}>{item.title}</h3>
                    </div>
                    {item.tag && (
                      <div className="absolute top-4 left-4">
                        <span className="bg-white/90 backdrop-blur-sm text-[9px] font-bold px-2 py-1 rounded text-primary uppercase">{item.tag}</span>
                      </div>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={e => { e.stopPropagation(); toggleLike(item.id); }}
                      className={`absolute top-4 right-4 backdrop-blur-md p-2 rounded-full transition-all ${likedItems.includes(item.id) ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}
                    >
                      <ICONS.Heart size={18} fill={likedItems.includes(item.id) ? 'currentColor' : 'none'} />
                    </motion.button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </section>

        {/* Curated by Fabric */}
        <section className="mt-20">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-serif text-2xl tracking-tight font-bold">Curated by Fabric</h3>
            <button onClick={() => setActiveCategory('Fabrics')} className="text-primary text-sm font-semibold hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {fabrics.map((fabric) => (
              <motion.div
                key={fabric.title}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => showToast(`Browsing ${fabric.title}`)}
                className="bg-surface-container-low p-6 rounded-2xl flex items-center gap-6 group hover:bg-surface-container transition-colors cursor-pointer"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                  <img className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={fabric.img} alt={fabric.title} referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{fabric.title}</h4>
                  <p className="text-xs text-on-surface-variant uppercase tracking-widest mt-1">{fabric.meta}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* FAB — navigate to capture */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.08 }}
        onClick={() => navigate('/capture')}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-white shadow-xl shadow-primary/20 flex items-center justify-center z-50"
      >
        <ICONS.Add size={32} />
      </motion.button>

      <BottomNav />
    </div>
  );
}
