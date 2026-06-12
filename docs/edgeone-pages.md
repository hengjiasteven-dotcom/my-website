# EdgeOne Pages Deployment

This site keeps the existing Hexo build flow and publishes the generated `public/` directory.

## Build Settings

Use these settings when importing the repository in EdgeOne Pages:

- Framework: Hexo
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `public`
- Node.js version: `20`

The same settings are also recorded in `edgeone.json`.

## Domain

Bind the production domain:

```text
xiaodaidai.site
```

Choose the acceleration area by ICP status:

- If the domain has an ICP filing, use Chinese mainland acceleration for the best mainland China access.
- If the domain is not filed yet, use "Global availability zone (excluding Chinese mainland)" first. Chinese mainland or global acceleration requires an ICP filing and will reject the custom domain.
- `xiaodaidai.site` is owned directly by you, so it is a better fit for ICP filing and long-term DNS control than the old shared subdomain.

## Current Dynamic Services

The main site can move to EdgeOne Pages now. These dynamic services still point to Vercel and can be migrated later:

- Waline server: `https://my-blog-eta-one-13.vercel.app`
- World chat API fallback: `https://my-website-zeta-indol-39.vercel.app/api/world-chat`

## Localized Vendor Assets

`npm run build` runs `npm run vendor:sync` before Hexo generation. It copies these browser assets from `node_modules` into `source/js/vendor/` so the published site does not depend on `unpkg` or `jsDelivr` for them:

- Waline client and pageview
- Waline weibo emojis
- Three.js modules used by `/world/`
- FFmpeg browser wrapper used by the audio tool

The FFmpeg core WASM file is not copied into Pages because it is larger than EdgeOne Pages' single-file upload limit. The audio conversion tool still loads the FFmpeg core from the upstream fallback for now. If that tool needs domestic acceleration later, put the FFmpeg core files on COS/CDN and update `coreBase` in `source/js/dream-fluid.js`.

`npm run optimize:public` is available for manual local output optimization. It is intentionally not part of `npm run build` so EdgeOne's first deployment does not depend on extra on-demand downloads during the build.
