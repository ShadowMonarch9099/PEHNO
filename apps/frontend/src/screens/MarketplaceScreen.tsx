import React from 'react';
import { motion } from 'motion/react';
import { ICONS } from '../constants';
import BottomNav from '../components/BottomNav';

export default function MarketplaceScreen() {
  const stylists = [
    {
      id: 1,
      name: 'Ananya Sharma',
      quote: 'Blending traditional Phulkari motifs with avant-garde western silhouettes for the modern Indian woman.',
      tags: ['Ethnic Specialist', 'Luxury Bridal'],
      fee: '₹2,499',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGg6iPw146AiGz5N1l7IlZFGLyj7BEaZZzDoh_mlyRmGXkOukOtGydusnFGBRxl6OwA73S6ef0_LhmUou_5SF5a_sIbYu4M9QH353UjuC7LN83BhjaFD5PRMHyaWPEj9SldvoHoJRJy3IHdO2d5P5ciCYfLDK5bUbbMUIfSiwmCX-LNlRypLF7Ghxc-2C2kfSkLi_6SE1GhwlcLR6rsbpdpk55j3lCI0Vznz_A43vhn2Nl3j0To5P8zGV1mDBHjJQSx1V_YqDpqjan',
      featured: true
    },
    {
      id: 2,
      name: 'Kabir Varma',
      specialty: 'Sustainable Fashion',
      desc: 'Expert in slow fashion and upcycling vintage textiles into contemporary essentials.',
      fee: '₹1,800',
      rating: '4.8',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtRF8Sf7IVYGppcvyzShVHUfQN7OU2djHRCb52jmx49Gbxr6rCLDt4MmfEa_TDERogfsrJVK0E7b0ZrQuNV2xI7sfQ5NFSRZMwsHLGuBDtcE-MVIsRYbBbTJS0EdX4mp-uM1MSIFqAQlhht-My4g6rcqkuK7-_5vhu0JjDiSRxbpohKFc44MX-Gkeg9NylBaD_-XLDTO1tKgpUGv1avDMmYd9v4BxV7atviD3gg4n_eNGVTBPoAztTAPpikDr1-oij7OF_twSzJUkk'
    },
    {
      id: 3,
      name: 'Meera Iyer',
      specialty: 'Modern Fusion',
      desc: 'Specializing in minimalist daily wear that bridges the gap between East and West.',
      fee: '₹2,100',
      rating: '4.9',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDK4KfLnyAOY0GNVuLvA0-PQuc_oDUHhMIiefViPO4RftySWLUQ9umcOTKDY6ZES8DWj31uD2h5XrjxXwUKbCF3vVAOuOhZePNh4FDe93z4s70aizsohuLwHCpC-eC5CRAxP3GAEEipHIchwo-_PmKDCbXR4q00LXUX77V0j9sjm5B7gAF_CNqtnBDFNnnLNGa-oXfv7dzUtES3CvqTOYOweteUco5XONLUjEKm5YDNvIx_1bb-Tmiod6-X0hTqJhilgHXFWKma0P3M'
    }
  ];

  return (
    <div className="min-h-screen bg-surface pb-32">
      <header className="fixed top-0 left-0 w-full bg-surface/90 backdrop-blur-md z-50 flex justify-between items-center px-6 py-4 border-b border-outline-variant/10">
        <button className="text-primary"><ICONS.Menu size={24} /></button>
        <h1 className="text-2xl font-serif italic font-bold text-primary">PEHNO</h1>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30">
          <img 
            alt="Profile" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwngyJ3Z8GfA5EvOBukIv7M_68hVmDRSV7JPgk0Rl6IYj0UL0O8mS3ofG_r3gh_65pOa4BQs5YE3XnYWnNnTNSeAKDJnmX2woZPVo7rC715ceWuTQuwu5_2kS_0aMeWVbwn_MWhgdZofm5uISMiRVZJdZnMWrRvFmgxB7YL-7TwCX-7mjqiBoRfHlzlQ3roAalh0MbDACNCHmgYyfmsiyeroViJRKBKDzOyZ5qK_Rdq3kW1fijQmVoPyxQkzC259ECjH3JeeIPqZGU"
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      <main className="pt-24 px-6 max-w-7xl mx-auto">
        <section className="mb-12 relative overflow-hidden rounded-xl bg-surface-container-low p-8 md:p-12">
          <div className="relative z-10 max-w-2xl">
            <p className="text-[11px] font-sans font-medium tracking-widest uppercase text-primary mb-4">The Marketplace</p>
            <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">Elevate Your Presence with Expert <span className="italic text-primary font-normal">Curation</span></h2>
            <p className="text-on-surface-variant text-lg mb-8 leading-relaxed">Connect with India's most celebrated stylists to redefine your wardrobe.</p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3 rounded-full font-medium shadow-lg">Find Your Stylist</button>
              <button className="bg-secondary/10 text-secondary px-8 py-3 rounded-full font-medium">Ask a Question</button>
            </div>
          </div>
        </section>

        <section className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['All Experts', 'Ethnic Specialist', 'Sustainable', 'Modern Fusion'].map((filter, i) => (
              <button key={filter} className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap ${i === 0 ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                {filter}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {stylists.map((stylist) => (
            <div key={stylist.id} className={`${stylist.featured ? 'md:col-span-8' : 'md:col-span-4'} bg-white rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition-all`}>
              <div className={stylist.featured ? 'grid md:grid-cols-2' : 'flex flex-col'}>
                <div className={`${stylist.featured ? 'h-80 md:h-[500px]' : 'h-64'} overflow-hidden relative`}>
                  <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={stylist.img} alt={stylist.name} referrerPolicy="no-referrer" />
                  {stylist.rating && (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{stylist.rating} Rating</div>
                  )}
                </div>
                <div className="p-8 flex flex-col justify-center">
                  {stylist.featured && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-bold text-primary tracking-widest uppercase">Verified Expert</span>
                      <div className="flex text-primary">
                        {[...Array(5)].map((_, i) => <ICONS.Star key={i} size={14} fill="currentColor" />)}
                      </div>
                    </div>
                  )}
                  <h3 className="font-serif text-2xl font-bold mb-2">{stylist.name}</h3>
                  {stylist.specialty && <p className="text-xs text-primary font-medium mb-4 uppercase tracking-wider">{stylist.specialty}</p>}
                  <p className="text-on-surface-variant mb-6 leading-relaxed italic">"{stylist.quote || stylist.desc}"</p>
                  {stylist.tags && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {stylist.tags.map(tag => <span key={tag} className="bg-surface-container px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{tag}</span>)}
                    </div>
                  )}
                  <div className="mt-auto pt-6 border-t border-surface-container flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Fee</p>
                      <p className="text-xl font-bold text-primary">{stylist.fee}</p>
                    </div>
                    <button className="bg-primary text-white px-6 py-2 rounded-full text-sm font-medium hover:opacity-90">Book Session</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
