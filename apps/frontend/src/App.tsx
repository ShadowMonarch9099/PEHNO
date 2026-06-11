import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen';
import WardrobeScreen from './screens/WardrobeScreen';
import AIOutfitsScreen from './screens/AIOutfitsScreen';
import PlannerScreen from './screens/PlannerScreen';
import MarketplaceScreen from './screens/MarketplaceScreen';
import CaptureScreen from './screens/CaptureScreen';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/wardrobe" element={<WardrobeScreen />} />
        <Route path="/ai-outfits" element={<AIOutfitsScreen />} />
        <Route path="/planner" element={<PlannerScreen />} />
        <Route path="/market" element={<MarketplaceScreen />} />
        <Route path="/capture" element={<CaptureScreen />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
