# DDU Aggregations: Dynamic Voronoi Explorer

![DDU Aggregations](https://simpleredirect.vercel.app/DDU%20Logo.svg)

A high-performance, minimalist platform designed for architectural exhibition management. This system combines **Dynamic QR Redirection** with an **Interactive Voronoi Island Explorer**, allowing curators to map PDF documents and external resources to complex geometric patterns in real-time.

---

## 🚀 Key Features

### 1. Interactive Voronoi Islands
Explore architectural data through three distinct interactive patterns:
- **Island V2**: Interlocking Building Systems
- **Island V3**: Tension & Force-Based Systems
- **Island V4**: Mechanical Locking / Unlocking Systems

### 2. Dynamic Asset Mapping
Manage exhibition content without redeploying code:
- **PDF Previews**: Built-in, high-performance PDF viewer with zoom and mobile optimization.
- **Webpage Redirects**: Link any Voronoi cell to external research or documentation if no PDF is attached.
- **Dynamic Labels**: Auto-generated, wrapped text labels that stay centered regardless of cell complexity.

### 3. DDU Aggregations Admin Panel
A robust, password-protected administrative dashboard featuring:
- **Island Content Management**: Upload PDFs, assign authors, and set display names for individual Voronoi cells.
- **Live Preview Map**: Synchronized mini-map for precise cell selection.
- **QR Code Control**: Generate and manage dynamic QR code destinations for physical exhibition tags.

### 4. Brutalist Design System
- **Dark Mode First**: Sleek, high-contrast UI using HSL-tailored colors and glassmorphism.
- **Mobile Optimized**: Edge-to-edge viewing with prevented pinch-to-zoom collisions and gesture-aware interactions.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Database**: [Upstash Redis](https://upstash.com/) for low-latency configuration management.
- **Storage**: [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for high-speed PDF asset serving.
- **Rendering**: Optimized SVG path manipulation with dynamic React overlays.
- **Styling**: Vanilla CSS with modern Glassmorphism utilities.

---

## 🏗️ Architecture

### Voronoi Cell Structure
Each Voronoi pattern is stored as a specialized SVG with unique `cell-N` identifiers. The app dynamically scans these files to build interactive maps:
- **Coordinates**: Script-calculated geometric centers for precise visual numbering.
- **Special Cells**: Hardcoded "Branding Cells" (e.g., Island V2 Cell 4) that feature distinct breathing animations and protective states.

### Data Model
Cells are identified via Redis using the pattern:
`voronoi:{islandId}:cell:{cellId}` -> Stores `{ name, author, url, redirectUrl }`

---

## 🚦 Getting Started

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env.local` file with the following:
```env
ADMIN_PASSWORD=your_secure_password
KV_REST_API_URL=your_upstash_url
KV_REST_API_TOKEN=your_upstash_token
```

### Run Locally
```bash
npm run dev
```

---

## 📸 Deployment

Optimized for **Vercel** with integrated build caches and edge-serving of assets.

```bash
npx vercel --prod
```

---

Developed by the **Digital Design Unit (DDU)** • TU Darmstadt
© 2026 State of the Art Workshop
