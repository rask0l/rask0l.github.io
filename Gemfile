source "https://rubygems.org"

# Uses the exact gem set GitHub Pages runs, so what you see locally
# matches what deploys. No CI/build step needed — just push.
gem "github-pages", group: :jekyll_plugins

# Plugins (also declared in _config.yml)
group :jekyll_plugins do
  gem "jekyll-feed"
  gem "jekyll-seo-tag"
  gem "jekyll-sitemap"
end

# Windows / JRuby helpers (harmless elsewhere)
gem "tzinfo-data", platforms: [:mingw, :mswin, :x64_mingw, :jruby]
gem "wdm", "~> 0.1.1", platforms: [:mingw, :mswin, :x64_mingw]

# Faster local rebuilds
gem "webrick", "~> 1.8"
