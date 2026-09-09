import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/seo"

// Only the public marketing routes belong here — everything under the app shell is private
// per-user data and is excluded via robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    { url: SITE_URL, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/register`, lastModified, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE_URL}/login`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ]
}
