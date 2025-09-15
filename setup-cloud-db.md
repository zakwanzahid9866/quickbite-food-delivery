# Cloud Database Setup Guide

## Option 1: Neon PostgreSQL (Recommended)

1. Go to https://neon.tech/
2. Sign up for free account
3. Create a new project called "fastfood-app"
4. Copy the connection string (looks like: postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb)
5. Update your .env file with this connection string

## Option 2: Supabase PostgreSQL

1. Go to https://supabase.com/
2. Sign up for free account
3. Create new project
4. Go to Settings → Database
5. Copy the connection string
6. Update your .env file

## Option 3: Railway PostgreSQL

1. Go to https://railway.app/
2. Sign up with GitHub
3. Create new project
4. Add PostgreSQL service
5. Copy connection string from Variables tab

## Redis Alternative

For Redis, you can use:
1. Upstash Redis (https://upstash.com/) - Free tier
2. Or temporarily disable Redis (we'll modify code)