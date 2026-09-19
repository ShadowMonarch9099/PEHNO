# PEHNO — 52-Week Build Plan

Source: `PHENO.docx` (product team). Phases are sequential; each block is done when its deliverables are merged, tested, and demoable.


## PHASE 1 — MVP: The Core Magic (Weeks 1–12)
**Goal: Prove the AI understands Indian wardrobes and recommends outfits people would actually wear.**

### Weeks 1–2 — Project Setup and Infrastructure
- Initialize monorepo with Expo (React Native) and FastAPI scaffold
- Set up Supabase: schema for users, garments, outfits
- Implement authentication: Supabase JWT with OTP mobile login
- Set up GitHub Actions CI/CD pipeline deploying to Railway
- Configure Sentry for error tracking from day one

### Weeks 3–4 — Onboarding Flow
- Build profile setup screens: city, gender, body type, skin tone
- Regional style affinity picker (Rajasthani, South Indian, Punjabi, Mumbai minimal, etc.)
- Wardrobe upload UX: single item photo and bulk camera roll import
- Image compression and upload pipeline to Supabase Storage
- Progress indicator to encourage completing first 30 items

### Weeks 5–7 — Garment AI (most critical)
- Fine-tune Vision Transformer (ViT) model on labeled Indian clothing dataset
- Classification output: garment type, fabric, regional style, occasion suitability, color palette
- Build classification API endpoint (async, queued via Celery)
- Build user correction UI — when user corrects an AI mistake it logs to retraining dataset
- Target classification accuracy: 85%+ on Indian garment types before launch

### Weeks 8–9 — Style Engine v1
- Outfit generator: filter wardrobe by weather appropriateness + selected occasion
- Integrate OpenWeather API — pull live weather data by user's city
- Implement 8 core occasions: casual, office, campus, wedding guest, pooja, festival, formal, night out
- Build daily outfit push notification via Firebase FCM (morning send per city timezone)
- Simple like/dislike feedback on each outfit — feeds personalization model

### Weeks 10–11 — Festival Intelligence
- Implement 10 major festivals for MVP: Diwali, Navratri, Holi, Eid, Ganesh Chaturthi, Dussehra, Durga Puja, Onam, Pongal, Christmas
- 14-day proactive alert before each festival in user's region
- Festival look curation: pull 3–5 outfits from wardrobe appropriate for that occasion
- Navratri 9-color daily tracker: maps each of 9 days to the traditional color, surfaces matching garments

### Week 12 — MVP Polish and Launch
- End-to-end bug bash and performance audit
- App Store and Play Store submission (allow 1 week review buffer)
- Analytics instrumentation: PostHog events for all key actions
- Soft launch beta cohort: 100 users across Mumbai, Delhi, Bengaluru
#### MVP Success Gate:
- 60%+ of users who complete wardrobe upload return within 7 days
- Push notification open rate exceeds 30%
- Garment classification acceptance rate (no correction) above 80%

## PHASE 2 — V2: The Commerce Layer (Weeks 13–28)
**Goal: Monetize through subscriptions and affiliate commerce, expand festivals and cultural depth.**

### Weeks 13–14 — Freemium Paywall
- Implement Free / Plus (₹199/month) / Pro (₹399/month) tier gating logic
- Razorpay subscription integration with auto-renewal
- Build in-app upgrade nudge flows at natural friction points
- Gate: Plus unlocks festival AI, fabric care, travel packing. Pro adds gap analysis + stylist discounts.

### Weeks 15–17 — Wardrobe Gap Analysis
- Build wardrobe graph model: map all owned items against possible outfit combinations
- Scoring algorithm: which single item purchase would unlock the most new outfits
- Gap report UI screen: show top 3–5 missing pieces with rationale ("You have 6 kurtas but only 1 solid dupatta")
- Budget filter and style preference filter on gap recommendations

### Weeks 18–19 — Affiliate Commerce
- Integrate Myntra, Ajio, and Nykaa affiliate APIs
- Surface curated product links inside gap report (filtered by user budget + style)
- Auto-add purchased item to wardrobe after affiliate click-through (tracked via redirect)
- Revenue tracking dashboard in admin panel

### Weeks 20–21 — Fabric Care System and ROI Score
- Auto-generate care profile for each item based on its classified fabric type
- Care profiles include: wash type, temperature limits, ironing range, storage method, monsoon advice
- Wear-count tracking: each outfit selection marks items as worn
- Trigger care reminders after threshold wear count per fabric type
- Cost-per-wear score: purchase price ÷ total wears, displayed on each item card
- Underutilized item surfacing: items not worn in 90+ days with new pairing suggestions

### Weeks 22–24 — Shopping Scan Mode
- In-app camera: photograph any item in store or screenshot from online
- AI analyzes item and cross-references against existing wardrobe
- Output: compatibility score, list of items it pairs with, number of new outfit combinations unlocked
- Duplicate detection: flag if a similar item already exists in the wardrobe

### Weeks 25–28 — Festival Expansion and City Growth
- Expand festival calendar to 25+ festivals with regional variants
- Add South Indian dress codes: Onam (kasavu/white-gold), Pongal (traditional Tamil)
- Add wedding sub-event intelligence: mehendi, sangeet, haldi, baraat, reception (each with distinct dress guidance)
- Expand app availability and influencer push to Pune, Hyderabad, Chennai, Kolkata
#### V2 Target:
- 50,000 active users
- ₹5–8 lakh MRR from subscriptions + affiliate
- Affiliate click-through rate above 8%

## PHASE 3 — V3: The Platform (Weeks 29–52)
**Goal: Own the ecosystem with social layer, stylist marketplace, brand partnerships, Tier 2 expansion.**

### Weeks 29–32 — Social OOTD Layer
- Item-tagged shareable outfit cards: user can share a look with each piece visually tagged
- Viewers can tap any item to see fabric, type, and affiliate buy link
- Instagram and WhatsApp share integration (native share sheet)
- City-based aesthetic feeds: Mumbai minimal, Delhi maximalist, Bangalore fusion, Pune casual-ethnic

### Weeks 33–37 — Stylist Marketplace
- Stylist onboarding: application form, portfolio review, verification badge
- Booking flow: user selects stylist, picks session type (occasion curation, wardrobe review, trip packing), confirms time slot
- Stylist gains read access to user's digital wardrobe for session preparation
- Payment via Razorpay, 20% platform commission on each booking
- Launch beta with 50 curated stylists from metro cities

### Weeks 38–41 — Travel Packing Planner
- User enters destination, travel dates, and planned activities
- Pehno pulls destination weather forecast and cultural context
- Generates optimized packing list from existing wardrobe (typically 12–15 items creating 18–25 looks)
- Factors in Indian destination context: Rajasthan wedding trip, Goa beach, corporate Bengaluru offsite
- Highlights gaps: items worth buying before the trip with affiliate links

### Weeks 42–45 — Male Wardrobe Support
- Expand AI garment taxonomy: sherwani, kurta-pyjama, bandhgala, nehru jacket, dhoti, formal-ethnic combos
- New training data collection for male Indian garments
- Occasion logic for men: wedding baraat, office festive, casual ethnic
- Body type and fit guidance adapted for male silhouettes

### Weeks 46–48 — Brand Partnership Layer
- Build brand partner CMS in admin dashboard
- Sponsored wardrobe challenges: e.g. "Fabindia Summer Linen Challenge — style 5 outfits from our new collection"
- Curated brand collections surfaced inside app to relevant user segments
- Performance tracking: outfit views, saves, affiliate click-throughs per campaign
- First 5 brand partners: Fabindia, W, Biba, FabAlley, Libas

### Weeks 49–52 — Tier 2 Expansion
- Expand to Jaipur, Lucknow, Ahmedabad, Chandigarh
- Regional style tuning per new city (Lucknow: Chikankari emphasis, Jaipur: block print and leheriya)
- Performance optimization for slower mobile networks (image lazy loading, offline outfit cache)
- Localization pass: Hindi interface option
#### V3 Target:
- 300,000 active users
- ₹40–60 lakh MRR
- Stylist marketplace live with 200+ active stylists
- 5+ active brand partners

#### KEY SUCCESS ASSUMPTIONS (from pitch deck)
- Festival features (Navratri 9-color, Diwali wardrobe reveals) drive organic social sharing — estimated 15–25% of new users acquired through shares
- Affiliate conversion rates will be 3–5x higher than discovery apps because every recommendation fills a verified wardrobe gap
- Daily outfit push notification sustains engagement — target 30%+ open rate vs industry average of 12–18% for fashion apps
- Wardrobe upload completion (30+ items) is the key retention inflection point — users who cross this threshold stay for 12+ months
- The proprietary Indian clothing model widens its advantage over time — more users means more labels means better AI means more users

#### NOTES FOR THE TEAM
- The packages/ai/data/ folder (festivals.json, fabric_weather.json, occasions.json, garment_labels.json) is Pehno's most important proprietary asset. It encodes cultural knowledge that cannot be easily replicated. Treat it as IP — version-controlled, access-restricted, continuously improved.
- The garment classifier (Weeks 5–7) is the highest technical risk item. Build a manual fallback UI early so users can self-classify if the model fails. Every correction is training data.
- The gap analysis algorithm (Weeks 15–17) is the highest product risk item. It directly drives affiliate revenue. Run qualitative user testing before building the full UI — validate that users find the gap recommendations genuinely useful, not generic.
- Do not launch the social layer (V3) until the wardrobe data quality is high. Social sharing is only viral if the outfits look credibly good. Poor early social posts will hurt brand perception.




