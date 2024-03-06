<p align="center">
<img src="https://raw.githubusercontent.com/unplugin/docs/main/public/logo.svg">
</p>

<h1 align="center">
Unplugin
</h1>
<p align="center">
Unified plugin system, Support Vite, Rollup, webpack, esbuild, and more
</p>

<p align="center">
<a href="https://unplugin.vercel.app">Documentation</a>
</p>

## Development

This project use [GitHub GraphQL API](https://docs.github.com/en/graphql) to generate the showcase data. So you need to create a [GitHub Personal Access Token](https://github.com/settings/personal-access-tokens/new) first.

```bash
cp .env.example .env
```

```ini
# .env
GITHUB_TOKEN=<YOUR_TOKEN>
```

### Generate files

```bash
pnpm gen-files
```

## Contributing

Please refer to https://github.com/antfu/contribute
