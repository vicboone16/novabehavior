import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://data.novabehavior.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/welcome", changefreq: "weekly", priority: "1.0" },
  { path: "/welcome/features", changefreq: "weekly", priority: "0.9" },
  { path: "/welcome/add-ons", changefreq: "weekly", priority: "0.9" },
  { path: "/demo", changefreq: "weekly", priority: "0.8" },
  { path: "/demo-center", changefreq: "weekly", priority: "0.8" },
  { path: "/demo/learners", changefreq: "weekly", priority: "0.7" },
  { path: "/demo/workflows", changefreq: "weekly", priority: "0.7" },
  { path: "/demo/training", changefreq: "weekly", priority: "0.7" },
  { path: "/demo/help", changefreq: "weekly", priority: "0.7" },
  { path: "/demo/client", changefreq: "weekly", priority: "0.7" },
  { path: "/privacy-policy", changefreq: "monthly", priority: "0.4" },
  { path: "/terms-and-conditions", changefreq: "monthly", priority: "0.4" },
  { path: "/parent-view", changefreq: "monthly", priority: "0.5" },
  { path: "/launch-readiness", changefreq: "monthly", priority: "0.5" },
];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
