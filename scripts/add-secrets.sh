#!/bin/bash
# Cloudflare Secrets Setup Script
# Run this to add all secrets to Cloudflare Workers

echo "🔐 Setting up Cloudflare Secrets for Rovaya"
echo "==========================================="
echo ""

# Make sure user is logged in to wrangler
echo "Make sure you're logged in to Cloudflare first:"
echo "Run: wrangler login"
echo ""

# Add secrets
echo "Adding secrets to Cloudflare..."
echo ""

wrangler secret put SUPABASE_URL <<< "https://esbsguetydiqmaectoyu.supabase.co"
echo "✅ SUPABASE_URL added"

wrangler secret put SUPABASE_ANON_KEY <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzYnNndWV0eWRpcW1hZWN0b3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNTkxNzYsImV4cCI6MjEwMzkzNTE3Nn0.PNYXqM493ihs9yg-uhNJV26OteD9ctJUs2fgP_biX-Y"
echo "✅ SUPABASE_ANON_KEY added"

wrangler secret put SUPABASE_SERVICE_ROLE_KEY <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzYnNndWV0eWRpcW1hZWN0b3l1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM1OTE3NiwiZXhwIjoyMTAzOTM1MTc2fQ.pPMHRdenZcXJR9TycEVFcHm5xvA0oBWPLlfqEyva1_A"
echo "✅ SUPABASE_SERVICE_ROLE_KEY added"

wrangler secret put DATABASE_URL <<< "postgresql://postgres:Chiloane01@db.esbsguetydiqmaectoyu.supabase.co:5432/postgres"
echo "✅ DATABASE_URL added"

wrangler secret put JWT_SECRET <<< "sk_live_rovaya_jwt_secret_abcd1234efgh5678ijkl9012mnop3456"
echo "✅ JWT_SECRET added"

wrangler secret put OAUTH_SERVER_URL <<< "https://rovaya.pages.dev"
echo "✅ OAUTH_SERVER_URL added"

wrangler secret put OWNER_OPEN_ID <<< "chiloaneralph1@gmail.com"
echo "✅ OWNER_OPEN_ID added"

echo ""
echo "🎉 All secrets have been added to Cloudflare!"
echo ""
echo "Next steps:"
echo "1. Update wrangler.toml with your R2 bucket name"
echo "2. Push to main: git push origin main"
echo "3. Check GitHub Actions for deployment status"
