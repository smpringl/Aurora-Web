# Aurora Web

The web application and marketing site for Aurora's climate data API. Built with React, TypeScript, and Supabase.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite (SWC)
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth & Backend**: Supabase (Auth, Database, Edge Functions)
- **Icons**: lucide-react
- **Routing**: React Router DOM
- **Data Fetching**: TanStack React Query

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Clone the repository:

```bash
git clone https://github.com/smpringl/Aurora-Carbon.git
cd Aurora-Web
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file from the example:

```bash
cp .env.example .env
```

4. Fill in your Supabase credentials in `.env`:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:8080`.

### Build

```bash
npm run build
```

## Project Structure

```
src/
  components/
    ui/              # shadcn/ui components
    Header.tsx       # Site header with navigation
    Hero.tsx         # Landing page hero section
    TrustSection.tsx
    ValuePropsSection.tsx
    IntegrationsShowcase.tsx
    StatsSection.tsx
    CTASection.tsx
    Footer.tsx
    DashboardLayout.tsx
    Overview.tsx
    Playground.tsx
    ActivityLogs.tsx
    Usage.tsx
    ApiKeyManagement.tsx
    AccountSettings.tsx
  contexts/
    AuthContext.tsx   # Supabase auth state management
  hooks/
    use-mobile.tsx   # Mobile breakpoint detection
    use-toast.ts     # Toast notification hook
  integrations/
    supabase/
      client.ts      # Supabase client initialization
  lib/
    constants.ts     # Design tokens
    utils.ts         # Utility functions (cn)
  pages/
    Auth.tsx         # Authentication page
    Dashboard.tsx    # Protected dashboard
    Index.tsx        # Landing page
    NotFound.tsx     # 404 page
    Pricing.tsx      # Pricing page
  utils/
    toast.ts         # Toast helper functions
supabase/
  functions/
    manage-api-key/  # API key CRUD edge function
    verify-api-key/  # API key verification edge function
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

## Deployment

Deployed to Vercel. The `vercel.json` config handles SPA routing by rewriting all routes to `index.html`.
