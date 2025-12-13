# 🌳 شجرة عائلة آل شايع | Al-Shaye Family Tree

A modern, interactive family tree web application for the آل شايع (Al-Shaye) family, featuring 99 family members across 8 generations.

![Family Tree](https://img.shields.io/badge/Members-99-blue)
![Generations](https://img.shields.io/badge/Generations-8-green)
![Language](https://img.shields.io/badge/Language-Arabic%20%2F%20English-orange)

## ✨ Features

- **🌳 Interactive Family Tree** - D3.js powered visualization with zoom and pan
- **📊 Analytics Dashboard** - Comprehensive statistics and insights
- **⚡ Quick Add** - Smart auto-fill form for adding new members
- **📋 Family Registry** - Searchable, sortable member list
- **🔍 Advanced Search** - Search by name, city, occupation, and more
- **📱 Responsive Design** - Works on desktop and mobile
- **🌐 RTL Support** - Full Arabic language support with right-to-left layout
- **🤱 Breastfeeding Relationships** - Islamic milk kinship (علاقات الرضاعة) tracking with mini family graphs

## 📊 Family Statistics

| Statistic | Value |
|-----------|-------|
| Total Members | 99 |
| Males | 50 |
| Females | 49 |
| Generations | 8 |
| Branches | 2 (الأصل, الفرع 1) |
| Root Ancestor | حمد آل شايع (1600) |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/alshaya00/me.git
cd me

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🗂️ Project Structure

```
me/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Home page
│   │   ├── tree/              # Interactive tree view
│   │   ├── registry/          # Member registry
│   │   ├── quick-add/         # Quick add form
│   │   ├── dashboard/         # Analytics dashboard
│   │   ├── search/            # Search page
│   │   ├── member/[id]/       # Member detail page
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   └── Navigation.tsx     # Main navigation
│   └── lib/                   # Utilities and data
│       ├── data.ts           # Family member data (99 members)
│       └── utils.ts          # Helper functions
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Database seeder
├── public/                    # Static assets
└── package.json
```

## 🎨 Features by Page

### 🏠 Home Page (`/`)
- Family overview statistics
- Quick action cards
- Generation breakdown table
- Branch distribution

### 🌳 Tree View (`/tree`)
- Interactive D3.js family tree
- Zoom and pan controls
- Click on any member for details
- Color-coded by gender (blue/pink)

### 📋 Registry (`/registry`)
- Complete member list
- Search and filter functionality
- Sort by name, generation, birth year
- Filter by gender, generation, branch

### ⚡ Quick Add (`/quick-add`)
- Smart auto-fill based on father selection
- Automatic ID generation
- Generation and branch calculation
- Full name preview

### 📊 Dashboard (`/dashboard`)
- Total statistics (members, males, females)
- Generation analysis with visual bars
- Age distribution chart
- Top cities and occupations
- Gender ratio visualization

### 🔍 Search (`/search`)
- Full-text search across all fields
- Recent search history
- Quick suggestions
- Instant results

### 👤 Member Detail (`/member/[id]`)
- Complete member profile
- Family connections (father, siblings, children)
- Mini family graph showing immediate relatives
- Breastfeeding relationships (milk family - عائلة الرضاعة)
  - Milk mother (أم الرضاعة)
  - Milk father (أب الرضاعة)
  - Milk siblings (إخوة الرضاعة)
- Quick navigation links

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/members` | GET | Get all members (supports filters) |
| `/api/members/[id]` | GET | Get single member with children |
| `/api/members/[id]/breastfeeding` | GET | Get breastfeeding relationships for a member |
| `/api/breastfeeding` | GET, POST | List/create breastfeeding relationships |
| `/api/breastfeeding/[id]` | GET, PUT, DELETE | Manage specific breastfeeding relationship |
| `/api/statistics` | GET | Get family statistics |
| `/api/tree` | GET | Get hierarchical tree data |

### Query Parameters for `/api/members`

- `gender` - Filter by Male/Female
- `generation` - Filter by generation number
- `branch` - Filter by branch name
- `males` - Set to `true` for males only

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Visualization**: D3.js
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Database**: SQLite with Prisma (optional)

## 🌍 Localization

The application supports both Arabic and English:
- Primary language: Arabic (RTL)
- Secondary labels: English
- All navigation and forms are bilingual

## 📱 Responsive Design

- Desktop: Full layout with sidebar panels
- Tablet: Adapted layouts
- Mobile: Stacked, touch-friendly interface

## 🔒 Data Privacy

All family data is stored locally. No external data transmission occurs.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is private and intended for family use.

## 👨‍💻 Author

Created for the آل شايع family

---

🌳 **شجرة آل شايع - حافظين على تراثنا** 🌳
