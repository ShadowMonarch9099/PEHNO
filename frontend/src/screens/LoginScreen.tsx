import React from 'react';
import { motion } from 'motion/react';
import { ICONS } from '../constants';

export default function LoginScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-background px-8">
      <header className="w-full max-w-md flex justify-center items-center py-12">
        <div className="flex flex-col items-center">
          <h1 className="text-4xl font-serif italic tracking-tighter text-primary">PEHNO</h1>
          <span className="text-[10px] font-sans uppercase tracking-[0.2em] mt-1 text-on-surface-variant italic opacity-80">
            Wear it right. Every time.
          </span>
        </div>
      </header>

      <main className="w-full max-w-md flex-1 flex flex-col">
        <div className="w-full flex justify-center mb-12">
          <img 
            alt="Pehno Logo" 
            className="w-48 h-48 object-contain" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZgWI26xeAXRfD-ZGOntzzXgIqleBddhGvSuBDfnEZshUPjRv35psf25TFYquFZzFPqMY2fJMIBUt2Amg4gSWe_ZBtWPdRjjdwpKTcZkghXbW_YAuO_t_FwAsJDLaUeE7XTg_sSDCmKqqgr7L39Vgmo6I_B_5lJi6Z-6veoxySQL5cFmooZ-5rBB5xewvXLD2s0vzF__KENSolnEwUU3euSQvxD6OpMOIoN1X7YBYiJasiog32MoR3gF1ZrFjdccSHhQ-W0zsAUFqy"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="flex w-full mb-10 justify-center space-x-12">
          <button className="relative pb-2 text-primary font-bold tracking-wide">
            Sign In
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full"></span>
          </button>
          <button className="pb-2 text-on-surface-variant opacity-50 hover:opacity-100 transition-opacity tracking-wide">
            Create Account
          </button>
        </div>

        <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-6">
            <div className="heritage-border group">
              <label className="block text-[10px] font-sans uppercase tracking-widest text-on-surface-variant mb-1 ml-1 group-focus-within:text-primary transition-colors">
                Email or Phone
              </label>
              <input 
                className="w-full bg-transparent border-none px-1 py-2 focus:ring-0 text-on-surface placeholder:text-outline-variant/50 font-light" 
                placeholder="Enter your credentials" 
                type="text"
              />
            </div>

            <div className="heritage-border group">
              <div className="flex justify-between items-end mb-1">
                <label className="block text-[10px] font-sans uppercase tracking-widest text-on-surface-variant ml-1 group-focus-within:text-primary transition-colors">
                  Password
                </label>
                <a className="text-[9px] font-sans uppercase tracking-tighter text-secondary opacity-70 hover:opacity-100" href="#">Forgot?</a>
              </div>
              <div className="relative">
                <input 
                  className="w-full bg-transparent border-none px-1 py-2 focus:ring-0 text-on-surface placeholder:text-outline-variant/50 font-light" 
                  placeholder="••••••••" 
                  type="password"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors">
                  <ICONS.Search size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-primary-container text-white font-medium tracking-wide shadow-[0px_12px_32px_rgba(150,73,0,0.15)]"
              type="submit"
            >
              Enter Your Wardrobe
            </motion.button>
          </div>
        </form>

        <div className="mt-16 flex flex-col items-center">
          <div className="w-full flex items-center mb-8">
            <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
            <span className="px-4 text-[10px] font-sans uppercase tracking-[0.3em] text-on-surface-variant opacity-40">Or Continue With</span>
            <div className="h-[1px] flex-1 bg-outline-variant/20"></div>
          </div>
          <div className="flex space-x-6">
            <button className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow group">
              <svg className="w-6 h-6 fill-on-surface-variant group-hover:fill-on-surface transition-colors" viewBox="0 0 384 512">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"></path>
              </svg>
            </button>
            <button className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm hover:shadow-md transition-shadow group">
              <svg className="w-6 h-6 fill-on-surface-variant group-hover:fill-on-surface transition-colors" viewBox="0 0 488 512">
                <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            </button>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-md py-12 flex justify-center">
        <p className="text-[10px] font-sans text-on-surface-variant opacity-40 text-center leading-relaxed">
          Crafted for the modern aesthetic.<br/>
          Inspired by timeless tradition.
        </p>
      </footer>

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden opacity-10">
        <div className="absolute -top-20 -right-20 w-64 h-64 border border-outline-variant/30 rounded-full"></div>
        <div className="absolute top-1/4 -left-32 w-80 h-80 border border-outline-variant/20 rounded-full italic font-serif text-surface-container-high text-9xl select-none">P</div>
      </div>
    </div>
  );
}
