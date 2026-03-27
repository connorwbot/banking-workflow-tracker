import { format } from 'date-fns'

export function Header({ title }: { title: string }) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 lg:px-6 flex items-center justify-between">
      <div>
        <h1 className="font-semibold text-slate-900 text-lg">{title}</h1>
        <p className="text-slate-400 text-xs">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>
    </header>
  )
}
