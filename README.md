# Soko Mind – The Farmer's AI

A multilingual (English, Kiswahili, Sheng) smart-farming web app for Kenyan farmers:

- **AI market negotiator** – ask by voice or text for fair prices, best selling day and a negotiation script.
- **Crop Doctor** – snap or upload a photo of a crop to get a diagnosis and treatment advice.
- **Live market heatmap** – demand, supply and average prices by county.
- **Negotiation sim** – practise haggling with "Tough Mbugua", an AI middleman.

Built with React 19, Vite 6, Tailwind CSS 4 and the Google Gemini API.

## Run locally

**Prerequisite:** [Node.js](https://nodejs.org/) 20 or newer.

1. Install dependencies:
   ```sh
   npm install
   ```
2. Create a file called `.env.local` in this folder containing your Gemini API key
   (get one at https://aistudio.google.com/apikey):
   ```
   GEMINI_API_KEY=your-key-here
   ```
   The app still opens without a key, but AI features will show a setup message.
3. Start the dev server and open http://localhost:3000:
   ```sh
   npm run dev
   ```

## Other scripts

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run build`   | Production build into `dist/`                 |
| `npm run preview` | Serve the production build locally            |
| `npm run lint`    | Type-check the project with TypeScript        |
| `npm run clean`   | Delete the `dist/` folder                     |

## Deploy to Vercel

1. Import the GitHub repo in Vercel (framework preset: **Vite**).
2. In **Project → Settings → Environment Variables**, add `GEMINI_API_KEY` with your key
   (tick Production, Preview and Development).
3. Redeploy (**Deployments → ⋯ → Redeploy**). The sidebar should show "AI Assistant Online".

## How the API key stays secret

All Gemini calls run in a server function, [`api/gemini.ts`](api/gemini.ts), which Vercel
deploys at `/api/gemini`. The browser only talks to that endpoint, so the key is never
included in the website's JavaScript. During `npm run dev`, Vite serves the same function
locally and reads the key from `.env.local`.

## Notes

- Voice input uses the browser's Web Speech API (best in Chrome or Edge).
- Crop photos are resized in the browser before upload to stay under Vercel's 4.5 MB request limit.

View the original app in AI Studio: https://ai.studio/apps/d809fcdb-318d-4f31-a35f-bdb06daa68f6
