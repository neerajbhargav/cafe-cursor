# Cafe Cursor

A shared contact wall for everyone in the room. Paste LinkedIn, X, Instagram, GitHub, or any link. It lands as a visual card, like a Twitter bookmarks grid.

Drop this URL in the Luma group chat. People open it, paste a profile, and the wall fills up.

## Local

```bash
npm install
npm run dev
```

Cards save to `.data/contacts.json` on your machine.

## Vercel

Cards need a shared store so every phone sees the same wall.

1. Deploy the repo to Vercel
2. In the project: **Storage → Create Database → KV** (Upstash Redis)
3. Redeploy so the env vars attach
4. Share the production URL in Luma

Blob storage also works (`BLOB_READ_WRITE_TOKEN`). Without KV or Blob, the page still loads but new cards will not persist on Vercel.

## Use

- Paste a link, add your name, optional one-liner, **Drop card**
- Tap a card to open it, connect, or copy the link
- Cards you dropped can be removed from the same browser
- **Share wall** copies the page URL for Luma
