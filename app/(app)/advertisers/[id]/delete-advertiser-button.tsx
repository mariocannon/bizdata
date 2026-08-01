'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { deleteAdvertiser } from '../actions'

export function DeleteAdvertiserButton({
  id,
  name,
  bookingCount,
}: {
  id: string
  name: string
  bookingCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAdvertiser(id)
      if (result.ok) {
        toast.success(result.message ?? 'Deleted.')
        router.push('/advertisers')
      } else {
        toast.error(result.message)
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-muted-foreground hover:text-destructive">
          <Trash2 />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>
            {bookingCount > 0
              ? `This advertiser has ${bookingCount} booking${bookingCount === 1 ? '' : 's'}. Delete or reassign them before removing the advertiser.`
              : 'This cannot be undone.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={pending || bookingCount > 0}
          >
            {pending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
