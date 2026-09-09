import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/seo"

// The terminal, journal, accounts and analytics routes are per-user trading data behind auth.
// There is nothing there for a crawler to index, so keep them out of search entirely.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/terminal", "/journal", "/accounts", "/analytics", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
