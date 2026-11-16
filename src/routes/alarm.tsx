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
    const oscillator = audio.createOscillator()
    const modulation = audio.createOscillator()
    const depth = audio.createGain()
    const now = audio.currentTime

    // Neprekidno mijenjaj visinu sirene bez JavaScript vremenskih intervala.
    oscillator.type = 'sine'
    oscillator.frequency.value = 800
    modulation.type = 'triangle'
    modulation.frequency.value = 0.75
    depth.gain.value = 400
    modulation.connect(depth)
    depth.connect(oscillator.frequency)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.12, now + 0.05)
    oscillator.start(now)
    modulation.start(now)

    const updateSoundWarning = () => {
      setSoundWarning(
        audio.state === 'running'
          ? ''
          : 'Zvuk sirene je blokiran ili prekinut. Vrati se na stranicu i provjeri zvuk uređaja.',
      )
    }
    audio.addEventListener('statechange', updateSoundWarning)
    updateSoundWarning()
    void audio.resume().catch(() => {})

    return () => {
      audio.removeEventListener('statechange', updateSoundWarning)
      oscillator.stop()
      modulation.stop()
      oscillator.disconnect()
      modulation.disconnect()
      depth.disconnect()
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
      const AudioContextClass = window.AudioContext ?? (
        window as Window & { webkitAudioContext?: typeof AudioContext }
      ).webkitAudioContext
      if (!AudioContextClass) throw new Error('Web Audio nije podržan')
      const audio = audioRef.current ?? new AudioContextClass()
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
        briše alarm. Ugrađena sirena svira do zaustavljanja, bez preuzimanja zvučnih
        datoteka. Pojačaj zvuk uređaja; sirena zahtijeva preglednik s podrškom za
        Web Audio i ne može zaobići utišan zvuk ili ograničenja uređaja.
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
