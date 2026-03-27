'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface StageTransitionModalProps {
  open: boolean
  dealName: string
  fromStage: string
  toStage: string
  onConfirm: (notes: string) => Promise<void>
  onCancel: () => void
}

export function StageTransitionModal({ open, dealName, fromStage, toStage, onConfirm, onCancel }: StageTransitionModalProps) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm(notes)
    setNotes('')
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={onCancel} title="Move Deal">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Moving <span className="font-medium text-slate-900">{dealName}</span> from{' '}
          <span className="font-medium">{fromStage}</span> to{' '}
          <span className="font-medium text-blue-600">{toStage}</span>
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Why is this moving? Any context..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button loading={loading} onClick={handleConfirm} className="flex-1">Confirm</Button>
        </div>
      </div>
    </Modal>
  )
}
