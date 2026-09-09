import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return <main className="grid min-h-[60vh] place-items-center px-4"><div className="space-y-4 text-center"><p className="text-sm font-medium text-primary">404</p><h1 className="text-3xl font-semibold">Page not found</h1><Link href="/" className={buttonVariants()}>Back to BlindPulse</Link></div></main>
}
