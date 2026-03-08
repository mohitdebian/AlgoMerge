# AlgoMerge — PR Radar for Open Source Contributors

> Find the best open-source issues to contribute to — with the lowest competition.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-algomerge.vercel.app-00ff88?style=flat-square)](https://algomerge.vercel.app)
![Status](https://img.shields.io/badge/Status-Active-00ff88?style=flat-square)
![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20GitHub%20API-0d1117?style=flat-square)

---

## What is AlgoMerge?

AlgoMerge is a platform that helps developers find the best open-source issues to contribute to — ones where competition is low and the chance of getting your PR merged is high.

Instead of scrolling through hundreds of GitHub issues with no signal, AlgoMerge analyzes repositories and ranks issues based on contribution opportunity.

---

## The Problem

Open-source contribution discovery is broken.

- Thousands of issues with no clear starting point
- Many issues already being worked on by multiple contributors
- No way to know if a repository is actively accepting PRs
- Time wasted searching instead of building

This leads to low PR acceptance rates and discourages new contributors.

---

## The Solution

AlgoMerge surfaces high-probability contribution opportunities by analyzing:

- **Contributor competition** — how many people are already working on an issue
- **Repository activity** — whether maintainers are actively reviewing and merging PRs
- **Contribution opportunity** — ranking issues most worth your time

---

## Features

- 🎯 **Issue Opportunity Detection** — highlights issues with low contributor competition
- 📊 **Repository Activity Insights** — identifies repositories actively accepting contributions
- ⚡ **Faster Discovery** — go from zero to the right issue in minutes
- 🧹 **Clean Interface** — designed for quick scanning and evaluation

---

## Who Is It For?

- Developers making their first open-source contributions
- Students applying for **GSoC, SoC**, or similar programs
- Engineers looking to build a stronger GitHub profile
- Contributors who want higher PR merge rates

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React / Next.js |
| Backend | Node.js |
| Data | GitHub API |
| Deployment | Vercel |

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/algomerge.git

# Navigate into the project
cd algomerge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your GitHub API token to .env

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

---

## Environment Variables

```env
GITHUB_API_TOKEN=your_github_token_here
```

---

## Contributing

Contributions are welcome. If you find a bug or have a feature request, feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## Live Demo

🔗 [algomerge.vercel.app](https://algomerge.vercel.app)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">Built by <strong>Mohit</strong> · Feedback and contributions welcome</p>
