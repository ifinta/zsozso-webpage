# Zsozso Webpage

The official website for the **Iceberg Protocol** and the **ZSOZSO** utility token on the [Stellar](https://stellar.org/) blockchain.

🌐 **Live site:** [https://ifinta.github.io/zsozso-webpage/](https://ifinta.github.io/zsozso-webpage/)

## What is the Iceberg Protocol?

The Iceberg Protocol is a decentralized hierarchical MLM (Multi-Level Marketing) infrastructure and message-bus architecture built on **Stellar Soroban** smart contracts. It provides:

- **For Investors (Pingvins)** — Mint and burn **CYBERFORINT (CYF)**, a dynamically-backed digital asset with algorithmically protected value and zero central manipulation.
- **For Developers** — An open framework for building independent MLM projects with secure messaging, N-level depth, and automated network management.
- **For Root Nodes ("Central Banks")** — Full governance over your own branch: set PID parameters, custom fee structures, and lead your own financial ecosystem.

The entire infrastructure is fueled by the **ZSOZSO** utility token.

## Website Pages

| Page | Description |
|------|-------------|
| [Home](https://ifinta.github.io/zsozso-webpage/) | Overview of the Iceberg Protocol (English & Hungarian) |
| [Timeline](https://ifinta.github.io/zsozso-webpage/timeline.html) | Development milestones from 2024 Q1 to present |
| [Allocation](https://ifinta.github.io/zsozso-webpage/allocation.html) | ZSOZSO token distribution (100 billion total supply) |
| [Whitepaper](https://ifinta.github.io/zsozso-webpage/whitepaper.html) | Full technical whitepaper — protocol architecture, PID controllers, pruning mechanism |
| [Open Tasks](https://ifinta.github.io/zsozso-webpage/opentasks.html) | Current development priorities |
| [FAQ](https://ifinta.github.io/zsozso-webpage/faq.html) | Frequently asked questions (Hungarian & English) |
| [Contact](https://ifinta.github.io/zsozso-webpage/contact.html) | Community links |

## ZSOZSO Token Allocation

Total supply: **100,000,000,000 ZSOZSO**

| Share | Purpose |
|-------|---------|
| 1% | One-time payment for the Idea |
| 3% | Airdrops (Hungary & influencers) — closed |
| 6% | Project fund (Development, Marketing, Support) |
| 5–5% | Public float on Stellar DEX (vs XLM and vs USDC) |
| 80% | First MLM tree ("Antarctica") — market-based private placement |

## Links

- **bitcointalk.org:** [Bitcointalk announcements](https://bitcointalk.org/index.php?topic=5492539.msg63935024#msg63935024)
- **ZSOZSO on Stellar Expert:** [View Asset →](https://stellar.expert/explorer/public/asset/ZSOZSO-GDZKLEYJ54QUIEYE4DUUOCIJDUS7R5MDW5MCAB3XTUGPJ3C7SSZJRQUC)
- **Desktop App:** [zsozso-dioxus](https://github.com/ifinta/zsozso-dioxus) — Rust/Dioxus wallet for key management and transaction signing
- **Bluesky:** [zsozsoonstellar.bsky.social](https://bsky.app/profile/zsozsoonstellar.bsky.social)
- **Discord:** [Join through a member, this invite not more valid](https://discord.gg/CvsGETXYJH)

## Local Development

The website is a static HTML site. No build step required.

```bash
# Clone
git clone https://github.com/ifinta/zsozso-webpage.git
cd zsozso-webpage

# Serve locally (any static server works)
python3 -m http.server 8080
# or
npx serve .
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

## Deployment

The site is hosted via **GitHub Pages** from the `main` branch. Any push to `main` automatically updates the live site.

## License

See repository for license details.
