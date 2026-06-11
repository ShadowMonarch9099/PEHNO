import React from 'react';
import { NavLink } from 'react-router-dom';
import { ICONS } from '../constants';

export default function BottomNav() {
  const navItems = [
    { to: '/wardrobe', icon: ICONS.Wardrobe, label: 'Wardrobe' },
    { to: '/ai-outfits', icon: ICONS.AIOutfits, label: 'AI Outfits' },
    { to: '/planner', icon: ICONS.Planner, label: 'Planner' },
    { to: '/market', icon: ICONS.Market, label: 'Market' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center pt-3 pb-8 bg-background/90 backdrop-blur-md z-50 border-t border-outline-variant/20 shadow-[0px_-12px_32px_rgba(85,67,52,0.08)]">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `
            flex flex-col items-center justify-center transition-all active:scale-90 duration-200
            ${isActive ? 'text-primary' : 'text-on-surface-variant/50 hover:text-primary'}
          `}
        >
          {({ isActive }) => (
            <>
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="font-sans font-medium text-[11px] tracking-wider uppercase mt-1">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
