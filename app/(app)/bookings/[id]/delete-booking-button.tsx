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
import { deleteBooking } from '../actions'

export function DeleteBookingButton({ id, label }: { id: string; label: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBooking(id)
      if (result.ok) {
        toast.success(result.message ?? 'Deleted.')
        router.push('/bookings')
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
          <DialogTitle>Delete this booking?</DialogTitle>
          <DialogDescription>
            {label} will be removed along with its uploaded creative. To keep the record but
            free the slot, set the status to Cancelled instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? 'Deleting…' : 'Delete booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
