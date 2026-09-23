# Capoeira Viewer — Setup Guide

## Quick Start (5 minutes)

### 1. Create the Next.js project

If you don't have one already:

```bash
npx create-next-app@latest capoeira-viewer --typescript --app --eslint --tailwind --no-git
cd capoeira-viewer
```

Or if you're using an existing Next.js project, just use that.

### 2. Copy files from this bundle

Extract the files from each folder in this bundle:

- `lib/types.ts` → `your-project/lib/types.ts`
- `lib/airtable.ts` → `your-project/lib/airtable.ts`
- `app/api/videos/route.ts` → `your-project/app/api/videos/route.ts`
- `app/api/moments/route.ts` → `your-project/app/api/moments/route.ts`
- `components/YouTubePlayer.tsx` → `your-project/components/YouTubePlayer.tsx`
- `components/MomentOverlay.tsx` → `your-project/components/MomentOverlay.tsx`
- `app/page.tsx` → `your-project/app/page.tsx` (replace existing)
- `app/layout.tsx` → `your-project/app/layout.tsx` (replace existing)
- `app/globals.css` → `your-project/app/globals.css` (replace existing)

### 3. Set environment variables

Create `.env.local` in your project root:

```
AIRTABLE_TOKEN=patXXXXXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXXXX
AIRTABLE_MOMENTS_TABLE=Moments
AIRTABLE_VIDEOS_TABLE=Videos
```

**How to get these:**

- **AIRTABLE_TOKEN**: https://airtable.com/account/tokens
  - Create new token
  - Scope: `data.records:read`
  - Copy the token string

- **AIRTABLE_BASE_ID**: Open your Airtable base → Help → API documentation → copy Base ID

### 4. Install dependencies

```bash
npm install
```

### 5. Run locally

```bash
npm run dev
```

Visit http://localhost:3000

### 6. Deploy to Vercel

```bash
git add .
git commit -m "Add capoeira viewer"
git push origin main
```

Then:
1. Go to https://vercel.com/new
2. Connect your GitHub repo
3. Add environment variables (AIRTABLE_TOKEN, AIRTABLE_BASE_ID)
4. Deploy

Your app will be live in ~2 minutes!

---

## How It Works

1. **Select a video** from your Airtable Videos table
2. **Video plays** with custom controls (play/pause, scrub, ±5s jumps)
3. **Auto-pauses** at each annotated moment (±3 seconds)
4. **Displays overlay** with expert's annotation (why_text + tags)
5. **Resume at 0.25× speed** to watch movement in slow-motion
6. **Browse moments** in the list below video

---

## Customization

### Change auto-pause window

In `app/page.tsx`, around line ~65:

```typescript
const nearby = moments.find((m) => Math.abs(m.timestamp - currentTime) < 3);
// Change 3 to your preferred seconds
```

### Change resume speed

In `app/page.tsx`, around line ~76:

```typescript
setPlaybackRate(0.25); // 0.25 = 1/4 speed, 0.5 = 1/2 speed
```

---

## Troubleshooting

**"No videos available"**
- Check AIRTABLE_TOKEN and AIRTABLE_BASE_ID in `.env.local`
- Confirm your Videos table exists in Airtable with at least one record

**"Failed to fetch moments"**
- Verify your Moments table has:  `video_id`, `timestamp`, `marked_by`, `why_text`, `tags`
- Check that `video_id` in Moments matches `video_id` in Videos

**YouTube video doesn't load**
- Confirm `youtube_id` field has valid YouTube video IDs

---

That's it! Questions? Check the docs or troubleshooting above.
