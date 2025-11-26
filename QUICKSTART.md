# GRC Platform - Quick Start Guide

## ✅ Your Setup is Complete!

Everything is configured and ready to use. Here's how to get started:

## 🚀 Start the Application

### 1. Make sure Supabase is running
In your terminal where Supabase CLI is available:
```bash
supabase status
```
If it's not running:
```bash
supabase start
```

### 2. Start the Next.js development server
```bash
cd /Volumes/home/Projects/GRC_Unified_Platform/frontend
npm run dev
```

### 3. Open your browser
Visit: **http://localhost:3000**

## 📝 First Steps

### Create Your First User
1. Click **"Create Account"** on the landing page
2. Fill in:
   - Display Name: Your name
   - Email: your-email@example.com
   - Password: (minimum 6 characters)
3. Click **"Sign up"**
4. You'll see a success message, then redirect to login

### Sign In
1. Enter your email and password
2. Click **"Sign in"**
3. You'll be redirected to the dashboard

### Explore the Dashboard
- **Top navigation**: Access different sections
  - Dashboard (home)
  - Organizations
  - Frameworks
  - Policies
- **Quick stats**: View counts of your data
- **Database status**: Verify connection is working
- **User menu**: Your email and sign out button

## 🔧 Apply Database Schema (Important!)

Your database tables need to be created. In your other terminal:

```bash
cd /Volumes/home/Projects/GRC_Unified_Platform
supabase db reset
```

This will:
- Drop and recreate the local database
- Apply the schema from `supabase/migrations/`
- Set up all tables and indexes

## 🎯 What You Can Do Now

### Test Database Connection
1. Sign in to the dashboard
2. Look for "Database Connection Status"
3. Should show: ✓ Successfully connected to database

### Next Development Steps
The foundation is ready! You can now:
1. **Create organization management pages** (list, create, edit)
2. **Add framework management** (CRUD operations)
3. **Build policy management** (create and map to regulations)
4. **Implement RLS policies** (secure multi-tenant data)

## 📁 File Structure You Created

```
frontend/
├── .env.local                          # Supabase connection config
├── lib/
│   ├── database.types.ts               # TypeScript types for DB
│   └── supabase/
│       ├── client.ts                   # Browser client
│       └── server.ts                   # Server client
├── app/
│   ├── page.tsx                        # Landing page
│   ├── login/page.tsx                  # Login page
│   ├── signup/page.tsx                 # Registration page
│   └── dashboard/
│       ├── layout.tsx                  # Protected layout
│       └── page.tsx                    # Dashboard home
```

## 🔍 Troubleshooting

### "Command not found: supabase"
The CLI might not be in your VS Code terminal's PATH. Use the terminal where you originally ran `supabase start`.

### Database connection error
1. Verify Supabase is running: `docker ps | grep supabase`
2. Check the keys in `.env.local` match your instance
3. Run `supabase status` to get correct keys

### Next.js won't start
Make sure you're running Node.js >= 20.9.0:
```bash
node -v
```
If needed, upgrade with nvm:
```bash
nvm install 20.9.0
nvm use 20.9.0
```

### Can't access Supabase Studio
Open: **http://localhost:54323**
This gives you a GUI to view your database, auth users, and more.

## 📊 Supabase Studio Access

Your local Supabase Studio is running at:
- **URL**: http://localhost:54323
- Use it to:
  - View database tables
  - Browse authentication users
  - Check logs
  - Test SQL queries

## 🎨 Styling & UI

The app uses:
- **Tailwind CSS** for styling (already configured)
- Clean, professional design
- Responsive layout (mobile-friendly)
- Consistent color scheme (indigo/blue)

## 🔐 Security Notes

### Current Setup (Development)
- Using default local Supabase keys
- No email confirmation required
- Simple password validation (6+ chars)

### Before Production
- [ ] Replace with production Supabase keys
- [ ] Enable email confirmation
- [ ] Add stronger password requirements
- [ ] Implement RLS policies
- [ ] Add rate limiting
- [ ] Enable HTTPS

## 📖 Useful Commands

```bash
# Start Supabase (in terminal with CLI)
supabase start

# Stop Supabase
supabase stop

# Reset database
supabase db reset

# View Supabase status
supabase status

# Start Next.js dev server
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Run production build
cd frontend && npm start
```

## 🎯 Next Session Goals

1. **Apply migrations** - Get tables created
2. **Create sample data** - Add test organizations/frameworks
3. **Build organization CRUD** - Full create/read/update/delete
4. **Implement RLS** - Secure multi-tenant access
5. **Add role management** - Admin vs Manager permissions

## 💡 Tips

- **Use Supabase Studio** to inspect your data visually
- **Check the browser console** for any client-side errors
- **Review server logs** in your terminal for backend issues
- **Reference the docs** at https://supabase.com/docs

---

**You're all set!** 🎉

Start by creating an account, signing in, and exploring the dashboard. Then apply the database migrations and start building out the organization management features.

Questions? Check the documentation files in `/documentation/` or review the README.md for architecture details.
