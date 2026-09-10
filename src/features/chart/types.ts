import type { ScaleMode } from "@/lib/chart-math"

export type { ScaleMode }

export type ChartBar = {
  index: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  forming: boolean
}

export type ChartOverlays = {
  emaPeriods: number[]
  showVolume: boolean
  showRsi: boolean
}

export const defaultOverlays: ChartOverlays = {
  emaPeriods: [20, 50, 200],
  showVolume: true,
  showRsi: true,
}
