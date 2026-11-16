import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

export const Route = createFileRoute('/alarm')({
  component: AlarmPage,
})

function AlarmPage() {
  const [time, setTime] = useState('')
  const [alarmAt, setAlarmAt] = useState<number | null>(null)
  const [ringing, setRinging] = useState(false)
  const [soundWarning, setSoundWarning] = useState('')
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    return () => {
      const audio = audioRef.current
      audioRef.current = null
      if (audio) void audio.close().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (alarmAt === null) return

    const checkAlarm = () => {
      if (Date.now() >= alarmAt) {
        setAlarmAt(null)
        setRinging(true)
      }
    }
    const interval = window.setInterval(checkAlarm, 500)
    checkAlarm()
    return () => window.clearInterval(interval)
  }, [alarmAt])

  useEffect(() => {
    if (!ringing) return
    const audio = audioRef.current
    if (!audio) return

    const gain = audio.createGain()
    gain.connect(audio.destination)
    const beep = () => {
      if (audio.state !== 'running') return
      const now = audio.currentTime
      const oscillator = audio.createOscillator()
      oscillator.frequency.value = 880
      oscillator.connect(gain)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02)
      gain.gain.linearRampToValueAtTime(0, now + 0.4)
      oscillator.onended = () => oscillator.disconnect()
      oscillator.start(now)
      oscillator.stop(now + 0.4)
    }
    beep()
    const interval = window.setInterval(beep, 1000)
    return () => {
      window.clearInterval(interval)
      gain.disconnect()
    }
  }, [ringing])

  function setAlarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!/^\d{2}:\d{2}$/.test(time)) return
    const [hours, minutes] = time.split(':').map(Number)
    if (hours === undefined || minutes === undefined) return
    if (hours > 23 || minutes > 59) return

    const now = new Date()
    const next = new Date(now)
    next.setHours(hours, minutes, 0, 0)
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)

    setSoundWarning('')
    try {
      const audio = audioRef.current ?? new AudioContext()
      audioRef.current = audio
      void audio.resume().catch(() => {
        if (audioRef.current === audio) {
          setSoundWarning('Zvuk nije dostupan. Alarm će prikazati vizualno upozorenje.')
        }
      })
    } catch {
      setSoundWarning('Zvuk nije dostupan. Alarm će prikazati vizualno upozorenje.')
    }
    setRinging(false)
    setAlarmAt(next.getTime())
  }

  function stopAlarm() {
    setAlarmAt(null)
    setRinging(false)
  }

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Alarm</h1>
      <p className="text-sm opacity-75">
        Odaberi vrijeme prema lokalnom satu uređaja. Ako je vrijeme već prošlo,
        alarm se postavlja za sutra. Stranica mora ostati otvorena; preglednik
        može odgoditi alarm u pozadini ili dok uređaj spava. Osvježavanje stranice
        briše alarm.
      </p>
      <form onSubmit={setAlarm} className="space-y-4">
        <label className="block space-y-2">
          <span>Vrijeme alarma</span>
          <input
            type="time"
            required
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="block w-full rounded-md border bg-transparent p-3"
          />
        </label>
        <button
          type="submit"
          disabled={!time}
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-white disabled:opacity-50"
        >
          {alarmAt === null ? 'Postavi alarm' : 'Promijeni alarm'}
        </button>
      </form>
      <div role="status" className="space-y-2">
        {alarmAt !== null && (
          <p>Alarm je postavljen za {new Date(alarmAt).toLocaleString('hr-HR')}.</p>
        )}
        {soundWarning && <p>{soundWarning}</p>}
      </div>
      {ringing && (
        <p role="alert" className="rounded-md border border-red-500 p-4 text-lg font-semibold">
          Alarm! Vrijeme je isteklo.
        </p>
      )}
      {(alarmAt !== null || ringing) && (
        <button
          type="button"
          onClick={stopAlarm}
          className="w-full rounded-md border px-4 py-3"
        >
          {ringing ? 'Zaustavi alarm' : 'Otkaži alarm'}
        </button>
      )}
    </main>
  )
}
