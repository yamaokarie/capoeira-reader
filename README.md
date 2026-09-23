# Capoeira Video Viewer

A standalone Next.js app for watching annotated capoeira videos.

**Features:**
- Auto-pause at expert-annotated moments
- Display full annotations (expert explanation + tags)
- Resume at 0.25× speed for detailed observation
- Custom YouTube player with controls
- Airtable integration

**Why?** Close the feedback loop for annotators. Instead of capturing annotations into a database they never see, experts can now watch the video, see where it pauses at their marked moments, and read their annotations in context.

## Files in This Bundle

```
lib/
  types.ts          # TypeScript interfaces
  airtable.ts       # Airtable API client

app/
  page.tsx          # Main viewer component (replace existing)
  layout.tsx        # Root layout (replace existing)
  globals.css       # Design tokens (replace existing)
  api/
    videos/
      route.ts      # Fetch all videos
    moments/
      route.ts      # Fetch moments by video_id

components/
  YouTubePlayer.tsx # Video player with controls
  MomentOverlay.tsx # Annotation overlay card

.env.example        # Template for environment variables
package.json        # Dependencies
SETUP.md            # Setup instructions (this file)
```

## Setup (5 minutes)

1. Read `SETUP.md` above
2. Create/use a Next.js project
3. Copy files to the right locations
4. Create `.env.local` with your Airtable credentials
5. `npm install && npm run dev`
6. Deploy to Vercel

## Airtable Schema

**Videos table:**
- `video_id` (text)
- `video_title` (text)
- `youtube_id` (text)
- `style` (text: "angola", "regional", or "contemporary")
- `quality` (optional number)

**Moments table:**
- `id` (text)
- `video_id` (text, links to Videos)
- `timestamp` (number, in seconds)
- `marked_by` (text, expert name)
- `why_text` (long text, the annotation)
- `tags` (array of text)
- `created_at` (date)

## Questions?

See SETUP.md for troubleshooting. All questions should be answered there.

---

**Expected impact:** Experts annotate → immediately see their annotations on video → motivation to annotate more + higher quality → community learns from annotated videos → more annotations needed.

Closes the loop. Drives engagement.
