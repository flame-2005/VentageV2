# VentEdge

A modern web application built with Next.js and Convex for real-time data management, featuring AI capabilities and financial data integration.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Backend & Database:** [Convex](https://convex.dev) - Real-time backend platform
- **Storage:** [Supabase](https://supabase.com) - Additional database and storage
- **AI:** OpenAI API integration
- **Financial Data:** Finnhub API
- **Authentication:** Google OAuth
- **Email:** Resend API
- **Language:** TypeScript

## Prerequisites

Before you begin, ensure you have:
- Node.js 18.x or later installed
- npm, yarn, pnpm, or bun package manager
- Accounts for the following services:
  - [Convex](https://convex.dev)
  - [Supabase](https://supabase.com)
  - [OpenAI](https://platform.openai.com)
  - [Finnhub](https://finnhub.io)
  - [Google Cloud Console](https://console.cloud.google.com) (for OAuth)
  - [Resend](https://resend.com)

## Getting Started

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd ventedge
```

### 2. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory and add the following variables:
```env
# Convex Configuration
CONVEX_DEPLOYMENT=your-convex-deployment-id
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# OpenAI API
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key
OPENAI_API_KEY=your-openai-api-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABSE_SECRET=your-supabase-service-role-key

# Finnhub API
FINNHUB_API_KEY=your-finnhub-api-key

# Google OAuth
OAUTH_CLIENT_ID=your-google-oauth-client-id
OAUTH_SECRET=your-google-oauth-secret

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend (Email)
RESEND_API_KEY=your-resend-api-key
```

**⚠️ IMPORTANT:** Never commit `.env.local` or `.env` files to version control. These files are already included in `.gitignore`.

### 4. Set up Convex
```bash
npx convex dev
```

This will:
- Initialize your Convex project
- Create a `convex/` directory if it doesn't exist
- Set up your development environment
- Generate necessary configuration files

### 5. Run the development server

In a new terminal window:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure
```
ventedge/
├── app/                # Next.js app directory
├── convex/            # Convex backend functions and schema
├── public/            # Static assets
├── components/        # React components
└── lib/              # Utility functions
```

## Features

- ⚡ Real-time data synchronization with Convex
- 🤖 AI-powered features using OpenAI
- 📊 Financial data integration via Finnhub
- 🔐 Secure authentication with Google OAuth
- 📧 Email functionality with Resend
- 💾 Dual database architecture (Convex + Supabase)
- 📱 Mobile-friendly responsive design
- 🚀 Optimized performance with Next.js

## Development

The app uses:
- **`app/page.tsx`** - Main application page (auto-updates on save)
- **`next/font`** - Automatic font optimization with [Geist](https://vercel.com/font)
- **Convex functions** - Backend logic in the `convex/` directory

## Convex Commands
```bash
# Start Convex development environment
npx convex dev

# Deploy Convex functions to production
npx convex deploy

# View Convex dashboard
npx convex dashboard
```

## Deployment

### Environment Variables Setup

For production deployment, ensure all environment variables are set in your hosting platform:

1. Convex deployment URL and ID
2. OpenAI API keys
3. Supabase credentials
4. Finnhub API key
5. Google OAuth credentials
6. Production app URL
7. Resend API key

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com/new)
3. Add all environment variables in the Vercel dashboard
4. Update `NEXT_PUBLIC_APP_URL` to your production domain
5. Deploy!

For detailed deployment instructions, see the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).

### Production Convex Setup

Before deploying to production:
```bash
npx convex deploy --prod
```

Update your production environment variables with the production Convex URL.

## API Integrations

### OpenAI
Used for AI-powered features and natural language processing.

### Finnhub
Provides real-time financial market data and stock information.

### Supabase
Additional database and file storage capabilities.

### Resend
Handles transactional email delivery.

## Security Best Practices

- Never commit `.env` files to version control
- Rotate API keys regularly
- Use environment-specific keys for development and production
- Keep service role keys on the server side only
- Implement proper API rate limiting

## Learn More

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js GitHub](https://github.com/vercel/next.js)

### Convex Resources
- [Convex Documentation](https://docs.convex.dev)
- [Convex Examples](https://github.com/get-convex/convex-examples)
- [Convex Community](https://convex.dev/community)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[Add your license here - MIT, Apache 2.0, etc.]

## Support

For issues and questions:
- Open an issue on GitHub
- Visit: [www.soapbox.co.in](https://www.soapbox.co.in)