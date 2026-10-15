# Misfits Cavern Official - Production Ready 🎬

**A fully functional creative platform built from the portfolio strategy, powered by ScriptOS intelligence.**

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev
# → http://localhost:3001

# Production Build
npm run build
npm start
```

## ✨ What's Included

### Phase 1: Foundation ✅
- Clean Next.js 14 architecture (zero bloat)
- TypeScript with flexible checking
- Tailwind CSS + custom design system
- Portfolio-grade styling
- Grain + scatter effects

### Phase 2: ScriptOS Integration ✅
**Professional screenplay editor with intelligent parsing**
- Real-time parsing engine (context-aware)
- Character, scene, dialogue detection
- localStorage-based (fully offline, fully private)
- Auto-save + export
- Multiple script management

**Visit:** http://localhost:3001/editor

### Phase 3: Portfolio Showcase ✅
**Beautiful video gallery with Google Drive integration**
- Featured & regular video grids
- Hover effects, smooth transitions
- Modal video player
- Animated skills marquee

**Visit:** http://localhost:3001/portfolio

### Phase 4: Enhanced Design (3D & Particles) ✅
**Immersive visual experiences**

**3D Orbit Gallery** (React Three Fiber)
- Auto-rotating photo frames
- Interactive camera orbit
- Grid floor spatial reference

**Particle System** (tsParticles)
- Interactive hover repulsion
- Connected particle networks
- Click to spawn particles

**Visit:** http://localhost:3001/showcase

### Phase 5: Creative Tools ✅
- **Studio** (/studio): Asset library & production workspace
- **Lounge** (/lounge): Collaboration space with chat
- **Projects** (/projects): Production pipeline with timeline

## 📊 Build Stats

| Route | Size | First Load |
|-------|------|-----------|
| / | 5.09 kB | 142 kB |
| /editor | 6.24 kB | 103 kB |
| /portfolio | 3.78 kB | 100 kB |
| /studio | 2.79 kB | 139 kB |
| /projects | 2.75 kB | 139 kB |
| /lounge | 2.2 kB | 98.8 kB |
| /showcase | 3.01 kB | 140 kB |

**Shared:** 87.4 kB

## 🏗️ Architecture

```
Misfits Cavern Official/
├── app/                    # Next.js 14 App Router
│   ├── page.tsx           # Homepage
│   ├── layout.tsx         # Root layout with fonts
│   ├── editor/            # ScriptOS integration
│   ├── portfolio/         # Video showcase
│   ├── studio/            # Asset library
│   ├── projects/          # Production tools
│   ├── lounge/            # Collaboration
│   └── showcase/          # 3D + Particles demo
│
├── components/
│   ├── 3D/                # Three.js components
│   │   └── OrbitGallery.tsx
│   ├── Navigation.tsx     # Site nav
│   ├── GrainOverlay.tsx   # Cinematic grain
│   ├── PhotoScatter.tsx   # Background scatter
│   ├── ParticleBackground.tsx  # tsParticles
│   └── Animated*.tsx      # Text reveal animations
│
├── lib/
│   └── scriptos/          # ScriptOS Engine
│       ├── parser.ts      # Intelligent parsing
│       └── storage.ts     # localStorage utils
│
├── types/
│   └── screenplay.ts      # TypeScript definitions
│
└── public/                # Static assets
```

## 🔐 Data Privacy

**ScriptOS: Completely Offline**
- ✅ No API calls
- ✅ No backend required
- ✅ No data leaves your device
- ✅ All scripts in browser localStorage

**Future Enhancement:** Optional cloud sync via your own storage (Google Drive, Dropbox)

## 🎯 Technology Stack

- **Framework:** Next.js 14.2.35
- **Language:** TypeScript 5.9+
- **Styling:** Tailwind CSS 3.4 + Custom CSS
- **3D:** Three.js + React Three Fiber + @react-three/drei
- **Particles:** tsParticles + react wrapper
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Charts:** Recharts (ready for analytics)

## 📦 Dependencies

**Production:**
- next (14.2.35)
- react / react-dom
- tailwindcss
- typescript
- three / @react-three/fiber / @react-three/drei
- framer-motion
- lucide-react
- recharts
- @tsparticles/react / @tsparticles/slim

**Dev:**
- @types/node / @types/react
- eslint / eslint-config-next
- postcss
- tailwindcss

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel --prod
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
EXPOSE 3000
```

### Static Export
```bash
# Add to next.config.js:
# output: 'export'
npm run build
# → out/ directory ready for any CDN
```

## 📖 Documentation

- **[PRODUCTION_BUILD.md](./PRODUCTION_BUILD.md)** - Full feature breakdown & roadmap
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical deep dive

## 🎬 The Vision

Misfits Cavern is a **production-ready creative platform** that:

1. **Provides tools** for creators (ScriptOS)
2. **Showcases work** beautifully (portfolio)
3. **Creates immersion** through design (3D, particles)
4. **Enables collaboration** (studio, lounge, projects)
5. **Builds brands** (for Femme Fatale, short films, etc.)

**Zero compromises. Pure execution.**

## 🔄 Next Phase Ideas

- Advanced ScriptOS: Analytics, character networks, table read engine
- Enhanced portfolio: Project pages, behind-the-scenes, awards
- Social: Real-time chat, crew profiles, task management
- Music: Spotify integration, soundcloud embeds, spectrum visualizer
- Production tools: Shot lists, call sheets, budgets, scheduling
- Marketing: Press kit generator, email newsletter, SEO
- Advanced visuals: Custom 3D scenes, WebGL shaders, dynamic lighting

## 📝 Notes

- All TypeScript warnings are non-critical (optional next/image optimization)
- All routes pre-rendered as static for optimal performance
- ESLint warnings are informational (see next/docs)
- localStorage data persists across sessions (ScriptOS privacy feature)

## 👤 Built By

Peter Olowude  
Misfits Cavern Productions  
© 2026

---

**Status:** ✅ Production Ready  
**Last Build:** 2026-04-27 02:39:23 AM EDT  
**Build Size:** 140 kB (homepage)  
**Performance:** All routes optimized and static-rendered
