# ✈️ SkyNeedle

**3D Flight Tracking PWA with ATC-Inspired Interface**

![SkyNeedle](public/icons/icon-512.png)

SkyNeedle is a minimalist Progressive Web App that brings real-time flight tracking to your browser with stunning 3D visualization. Inspired by Air Traffic Control (ATC) displays, it features a dark theme with green monochrome UI, 3D aircraft models, flight traces, and detailed airport information.

## 🌟 Features

- **3D Globe Visualization** - Powered by Cesium.js with realistic terrain
- **Real-Time Flight Data** - Live aircraft tracking via OpenSky Network API
- **Smart Interpolation** - Smooth aircraft movement between API updates
- **ATC-Style Interface** - Dark theme with green accents and glassmorphism
- **Interactive Search** - Find flights by city, airport code, or flight number
- **Camera Presets** - Overview, track, and follow modes
- **Airport Visualization** - Runways, taxiways, and terminals
- **Progressive Web App** - Installable on desktop and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Cesium Ion account (free): https://ion.cesium.com/
- OpenSky Network account (optional, for higher rate limits): https://opensky-network.org/

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ozlphrt/SkyNeedle.git
   cd SkyNeedle
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API tokens**
   
   Edit `src/main.js` and replace the placeholder tokens:
   ```javascript
   const CESIUM_ION_TOKEN = 'YOUR_CESIUM_ION_TOKEN';
   const OPENSKY_USERNAME = 'your_username'; // Optional
   const OPENSKY_PASSWORD = 'your_password'; // Optional
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   
   Open http://localhost:3000 in your browser.

5. **Build for production**
   ```bash
   npm run build
   ```

## 📦 Deployment

### GitHub Pages

The project is configured for automatic deployment to GitHub Pages:

1. **Enable GitHub Pages** in repository settings:
   - Go to Settings → Pages
   - Source: GitHub Actions

2. **Push to main branch**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

3. **Access your app** at:
   ```
   https://ozlphrt.github.io/SkyNeedle/
   ```

## 🎨 Design

SkyNeedle uses an ATC-inspired design language:

- **Background**: `#0a0e14` (Deep dark blue-black)
- **Primary**: `#00ff41` (Bright green - radar style)
- **Secondary**: `#00d4ff` (Cyan accents)
- **Typography**: JetBrains Mono (monospace)
- **Effects**: Glassmorphism, glow effects, smooth animations

## 🛠️ Technology Stack

| Component | Technology |
|-----------|-----------|
| 3D Engine | Cesium.js |
| Data Source | OpenSky Network API |
| Build Tool | Vite |
| Language | Vanilla JavaScript |
| Styling | CSS3 |
| Deployment | GitHub Pages |

## 📖 Usage

### Search for Flights

1. Use the search bar in the top-right corner
2. Enter a city name, airport code (ICAO/IATA), or flight number
3. Click on results to zoom to location

### View Aircraft Details

1. Click on any aircraft marker on the globe
2. View callsign, altitude, velocity, heading, and origin
3. Use "TRACK" or "FOLLOW" buttons for camera modes

### Camera Controls

- **OVERVIEW** - Return to default view
- **TRACK** - Follow selected aircraft
- **FOLLOW** - Pan camera from your location

### Filters

- Adjust altitude range sliders
- Toggle airport and trace visibility
- Filter by airline or aircraft type (coming soon)

## 🔧 Development

### Project Structure

```
SkyNeedle/
├── src/
│   ├── main.js              # Application entry point
│   ├── styles/              # CSS files
│   ├── core/                # Cesium & camera logic
│   ├── data/                # API & interpolation
│   ├── visualization/       # Aircraft & airport rendering
│   ├── ui/                  # UI components
│   └── utils/               # Utilities
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── icons/               # App icons
│   └── models/              # 3D models
└── .github/workflows/       # CI/CD
```

### Branching Strategy

- `main` - Production branch (auto-deploys)
- `develop` - Integration branch
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes

### Commit Convention

Follow conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `style:` - Code formatting
- `refactor:` - Code refactoring
- `perf:` - Performance improvements

## 📊 API Rate Limits

### OpenSky Network

- **Anonymous**: 10 requests/day
- **Registered**: 400 requests/day
- **Update Interval**: 15 seconds (~240 requests/hour)

**Recommendation**: Create a free account for development and production use.

### Cesium Ion

- **Free Tier**: 5GB/month asset streaming
- Sufficient for most use cases

## 🐛 Troubleshooting

### Cesium not loading

- Verify your Cesium Ion token is correct
- Check browser console for errors
- Ensure you have internet connection

### No aircraft showing

- Check OpenSky API status: https://opensky-network.org/
- Verify API credentials (if using authenticated requests)
- Check browser console for API errors

### Build errors

- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Ensure Node.js version is 18+

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cesium.js** - Amazing 3D geospatial platform
- **OpenSky Network** - Free, community-driven flight data
- **ATC Community** - Design inspiration

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Contact

- **GitHub**: [@ozlphrt](https://github.com/ozlphrt)
- **Issues**: [GitHub Issues](https://github.com/ozlphrt/SkyNeedle/issues)

---

**Built with ❤️ for aviation enthusiasts**
