'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { ADVERTISER_STATUSES, label, type AdvertiserStatus } from '@/lib/enums'
import { cn, formatMoney } from '@/lib/utils'
import { updateAdvertiserStatus } from './actions'

export type PipelineCard = {
  id: string
  name: string
  category: string
  status: string
  booked: number
  outstanding: number
}

/**
 * Kanban board over the advertiser pipeline. Uses the native HTML5 drag API —
 * no drag library needed for a desktop-first internal tool, and cards stay
 * keyboard-reachable through the status select fallback.
 */
export function PipelineBoard({ advertisers }: { advertisers: PipelineCard[] }) {
  const router = useRouter()
  const [cards, setCards] = React.useState(advertisers)
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [hoverColumn, setHoverColumn] = React.useState<string | null>(null)
  const [, startTransition] = React.useTransition()

  // Re-sync when the server sends fresh data (after a save elsewhere).
  React.useEffect(() => {
    setCards(advertisers)
  }, [advertisers])

  function move(id: string, status: AdvertiserStatus) {
    const card = cards.find((c) => c.id === id)
    if (!card || card.status === status) return

    const previous = cards
    // Optimistic: the card lands immediately, and rolls back if the write fails.
    setCards((current) => current.map((c) => (c.id === id ? { ...c, status } : c)))

    startTransition(async () => {
      const result = await updateAdvertiserStatus({ id, status })
      if (result.ok) {
        toast.success(`${card.name} → ${label(status)}`)
        router.refresh()
      } else {
        setCards(previous)
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="scrollbar-slim flex gap-3 overflow-x-auto pb-2">
      {ADVERTISER_STATUSES.map((status) => {
        const columnCards = cards.filter((card) => card.status === status)
        const columnValue = columnCards.reduce((sum, card) => sum + card.booked, 0)

        return (
          <div
            key={status}
            onDragOver={(event) => {
              event.preventDefault()
              setHoverColumn(status)
            }}
            onDragLeave={() => setHoverColumn((c) => (c === status ? null : c))}
            onDrop={(event) => {
              event.preventDefault()
              setHoverColumn(null)
              const id = event.dataTransfer.getData('text/plain') || draggingId
              if (id) move(id, status)
              setDraggingId(null)
            }}
            className={cn(
              'flex w-64 shrink-0 flex-col rounded-lg border border-border bg-muted/40 transition-colors',
              hoverColumn === status && 'border-primary bg-accent'
            )}
          >
            <div className="flex items-baseline justify-between gap-2 border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">{label(status)}</span>
              <span className="tabular text-xs text-muted-foreground">
                {columnCards.length}
                {columnValue > 0 ? ` · ${formatMoney(columnValue)}` : ''}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-2">
              {columnCards.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  Drop here
                </p>
              ) : (
                columnCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', card.id)
                      event.dataTransfer.effectAllowed = 'move'
                      setDraggingId(card.id)
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      'group rounded-md border border-border bg-card p-2.5 shadow-sm transition-opacity',
                      draggingId === card.id && 'opacity-40'
                    )}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="mt-0.5 size-3.5 shrink-0 cursor-grab text-muted-foreground opacity-40 group-hover:opacity-100" />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/advertisers/${card.id}`}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {card.name}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {label(card.category)}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="tabular text-xs font-medium">
                            {formatMoney(card.booked)}
                          </span>
                          {card.outstanding > 0 ? (
                            <span className="tabular text-xs text-attention">
                              {formatMoney(card.outstanding)} due
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Keyboard-accessible equivalent of the drag gesture. */}
                    <label className="mt-2 block">
                      <span className="sr-only">Move {card.name} to another status</span>
                      <select
                        value={card.status}
                        onChange={(event) =>
                          move(card.id, event.target.value as AdvertiserStatus)
                        }
                        className="w-full rounded border border-input bg-card px-1.5 py-1 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {ADVERTISER_STATUSES.map((option) => (
                          <option key={option} value={option}>
                            {label(option)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
