import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const methods = [
  ['recall', 'Active recall'],
  ['spacing', 'Spaced repetition'],
  ['feynman', 'Feynman technique'],
  ['pomodoro', 'Pomodoro'],
  ['interleave', 'Interleaving'],
]
const intervals = [1, 3, 7, 14]

function getInitialTimer() {
  const defaultTimer = {
    phase: 'focus',
    remainingMs: 25 * 60_000,
    running: false,
    focusCount: 0,
  }
  try {
    const saved = JSON.parse(localStorage.getItem('syllabuddy_pomodoro') || 'null')
    if (saved === null) return { value: defaultTimer, error: '' }
    const valid =
      saved &&
      ['focus', 'short-break', 'long-break'].includes(saved.phase) &&
      Number.isFinite(saved.remainingMs) &&
      saved.remainingMs >= 0 &&
      Number.isInteger(saved.focusCount) &&
      saved.focusCount >= 0 &&
      typeof saved.running === 'boolean' &&
      (!saved.running || Number.isFinite(saved.endsAt))
    if (!valid) throw new Error('The saved timer values were incomplete.')
    return { value: saved, error: '' }
  } catch (error) {
    return {
      value: defaultTimer,
      error: `The saved Pomodoro timer could not be restored: ${error.message}`,
    }
  }
}

async function saveSession(userId, session) {
  const { error } = await supabase.from('study_sessions').insert({
    user_id: userId,
    subject: session.subject ?? '',
    technique: session.technique,
    duration_minutes: session.durationMinutes ?? 0,
    started_at: session.startedAt ?? new Date().toISOString(),
    completed_at: new Date().toISOString(),
    notes: session.notes ?? null,
    metadata: session.metadata ?? {},
  })
  if (error) throw error
}

function dueTimestamp(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function roundRobin(cards, topics) {
  const groups = topics.map((topic) => cards.filter((card) => card.topic === topic))
  const deck = []
  let index = 0
  while (groups.some((group) => group[index])) {
    groups.forEach((group) => {
      if (group[index]) deck.push(group[index])
    })
    index += 1
  }
  return deck
}

export default function StudyHub({ userId }) {
  const [timerInitial] = useState(getInitialTimer)
  const [method, setMethod] = useState('recall')
  const [cards, setCards] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(timerInitial.error)
  const [savedMessage, setSavedMessage] = useState('')
  const [form, setForm] = useState({ topic: '', question: '', answer: '' })
  const [revealed, setRevealed] = useState(false)
  const [recallIndex, setRecallIndex] = useState(0)
  const completedTimerEndsAt = useRef(null)
  const [topics, setTopics] = useState([])
  const [deck, setDeck] = useState([])
  const [deckIndex, setDeckIndex] = useState(0)
  const [feynman, setFeynman] = useState({
    topic: '',
    simple: '',
    gaps: '',
    sources: '',
    rewrite: '',
  })
  const [timer, setTimer] = useState(timerInitial.value)
  const [timerTask, setTimerTask] = useState('')
  const persistTimer = useCallback((nextTimer) => {
    try {
      localStorage.setItem('syllabuddy_pomodoro', JSON.stringify(nextTimer))
    } catch (storageError) {
      setError(`The Pomodoro timer could not be saved: ${storageError.message}`)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    Promise.all([
      supabase.from('study_cards').select('*').order('created_at', { ascending: false }),
      supabase.from('study_sessions').select('*').order('completed_at', { ascending: false }).limit(20),
    ])
      .then(([cardResult, sessionResult]) => {
        if (cardResult.error) throw cardResult.error
        if (sessionResult.error) throw sessionResult.error
        if (mounted) {
          setCards(cardResult.data)
          setSessions(sessionResult.data)
        }
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Could not load study history.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [userId])

  useEffect(() => {
    if (!timer.running || !timer.endsAt) return undefined
    const update = () => {
      const remainingMs = Math.max(0, timer.endsAt - Date.now())
      if (remainingMs > 0) {
        setTimer((current) => ({ ...current, remainingMs }))
        return
      }

      if (timer.phase === 'focus') {
        if (completedTimerEndsAt.current === timer.endsAt) return
        completedTimerEndsAt.current = timer.endsAt
        const focusCount = timer.focusCount + 1
        const nextPhase = focusCount % 4 === 0 ? 'long-break' : 'short-break'
        const duration = nextPhase === 'long-break' ? 30 : 5
        const endsAt = Date.now() + duration * 60_000
        const nextTimer = { phase: nextPhase, focusCount, remainingMs: duration * 60_000, endsAt, running: true }
        persistTimer(nextTimer)
        setTimer(nextTimer)
        void saveSession(userId, {
          technique: 'pomodoro',
          subject: timerTask,
          durationMinutes: 25,
          notes: `Completed focus session ${focusCount}.`,
        }).then(() => {
          setSessions((current) => [{
            id: crypto.randomUUID(),
            technique: 'pomodoro',
            subject: timerTask || 'Focus session',
            completed_at: new Date().toISOString(),
          }, ...current])
          setSavedMessage('Focus session saved. Take a short break.')
        })
          .catch((saveError) => setError(saveError.message))
      } else {
        const nextTimer = {
          phase: 'focus',
          focusCount: timer.focusCount,
          remainingMs: 25 * 60_000,
          running: false,
        }
        persistTimer(nextTimer)
        setTimer(nextTimer)
        setSavedMessage('Break complete. Start another focus session when ready.')
      }
    }
    const initialTick = window.setTimeout(update, 0)
    const intervalId = window.setInterval(update, 1000)
    return () => {
      window.clearTimeout(initialTick)
      window.clearInterval(intervalId)
    }
  }, [timer.running, timer.endsAt, timer.phase, timer.focusCount, timerTask, userId, persistTimer])

  const currentCard = cards.length ? cards[recallIndex % cards.length] : null
  const dueCards = useMemo(
    () => cards.filter((card) => !card.due_at || new Date(card.due_at) <= new Date()),
    [cards]
  )
  const topicNames = useMemo(
    () => [...new Set(cards.map((card) => card.topic))],
    [cards]
  )

  async function createCard(event) {
    event.preventDefault()
    setError('')
    try {
      const { data, error: insertError } = await supabase
        .from('study_cards')
        .insert({ ...form, user_id: userId })
        .select()
        .single()
      if (insertError) throw insertError
      setCards((current) => [data, ...current])
      setForm({ topic: '', question: '', answer: '' })
      setSavedMessage('Question saved.')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function assessRecall() {
    if (!currentCard) return
    try {
      await saveSession(userId, {
        technique: 'active-recall',
        subject: currentCard.topic,
        durationMinutes: 0,
        notes: 'Practised one saved question.',
        metadata: { card_id: currentCard.id },
      })
      setSessions((current) => [{ id: crypto.randomUUID(), technique: 'active-recall', subject: currentCard.topic, completed_at: new Date().toISOString() }, ...current])
      setRevealed(false)
      setRecallIndex((index) => (index + 1) % cards.length)
      setSavedMessage('Practice recorded.')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function reviewCard(card, rating) {
    const nextRepetitions = rating === 'again' ? 0 : card.repetitions + 1
    const nextEaseFactor = Math.max(
      1.3,
      Math.min(
        4,
        Number(card.ease_factor) +
          (rating === 'easy' ? 0.15 : rating === 'hard' ? -0.15 : -0.3)
      )
    )
    const suggestedInterval = intervals[Math.min(intervals.length - 1, nextRepetitions - 1)]
    const interval = rating === 'again'
      ? 1
      : Math.max(
          1,
          Math.round(
            suggestedInterval *
              (rating === 'hard' ? 0.75 : nextEaseFactor / 2.5)
          )
        )
    try {
      const { data, error: updateError } = await supabase
        .from('study_cards')
        .update({
          due_at: dueTimestamp(interval),
          interval_days: interval,
          repetitions: nextRepetitions,
          ease_factor: nextEaseFactor,
          last_reviewed_at: new Date().toISOString(),
        })
        .eq('id', card.id)
        .select()
        .single()
      if (updateError) throw updateError
      setCards((current) => current.map((item) => (item.id === card.id ? data : item)))
      await saveSession(userId, {
        technique: 'spaced-repetition',
        subject: card.topic,
        notes: `Review rating: ${rating}; next review in ${interval} day(s).`,
        metadata: { card_id: card.id, rating, interval_days: interval },
      })
      setSessions((current) => [{
        id: crypto.randomUUID(),
        technique: 'spaced-repetition',
        subject: card.topic,
        completed_at: new Date().toISOString(),
      }, ...current])
      setSavedMessage(`Next review scheduled in ${interval} day(s).`)
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function saveFeynman(event) {
    event.preventDefault()
    try {
      await saveSession(userId, {
        technique: 'feynman',
        subject: feynman.topic,
        notes: feynman.rewrite,
        metadata: {
          initial_explanation: feynman.simple,
          gaps: feynman.gaps,
          sources_reviewed: feynman.sources,
        },
      })
      setSessions((current) => [{ id: crypto.randomUUID(), technique: 'feynman', subject: feynman.topic, completed_at: new Date().toISOString() }, ...current])
      setSavedMessage('Your explanation and study session were saved.')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  function startPomodoro() {
    const duration = timer.phase === 'focus' ? 25 : timer.phase === 'long-break' ? 30 : 5
    const remainingMs = timer.remainingMs || duration * 60_000
    const nextTimer = {
      ...timer,
      remainingMs,
      endsAt: Date.now() + remainingMs,
      running: true,
    }
    persistTimer(nextTimer)
    setTimer(nextTimer)
  }

  function pausePomodoro() {
    const nextTimer = {
      ...timer,
      remainingMs: Math.max(0, timer.endsAt - Date.now()),
      endsAt: null,
      running: false,
    }
    persistTimer(nextTimer)
    setTimer(nextTimer)
  }

  function resetPomodoro() {
    const nextTimer = {
      ...timer,
      remainingMs: (timer.phase === 'focus' ? 25 : timer.phase === 'long-break' ? 30 : 5) * 60_000,
      endsAt: null,
      running: false,
    }
    persistTimer(nextTimer)
    setTimer(nextTimer)
  }

  async function startInterleaving() {
    const practiceDeck = roundRobin(cards, topics)
    if (practiceDeck.length === 0) {
      setError('Select at least two topics with saved questions.')
      return
    }
    setDeck(practiceDeck)
    setDeckIndex(0)
    setRevealed(false)
  }

  async function finishInterleaving() {
    try {
      const practicedTopics = [...new Set(deck.map((card) => card.topic))]
      await saveSession(userId, {
        technique: 'interleaving',
        subject: practicedTopics.join(', '),
        durationMinutes: 0,
        notes: `Practised ${deck.length} questions across ${practicedTopics.length} topics.`,
        metadata: { topics: practicedTopics, card_ids: deck.map((card) => card.id) },
      })
      setSessions((current) => [{ id: crypto.randomUUID(), technique: 'interleaving', subject: practicedTopics.join(', '), completed_at: new Date().toISOString() }, ...current])
      setDeck([])
      setSavedMessage(`Mixed practice saved for ${practicedTopics.join(', ')}.`)
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  const timerSeconds = Math.ceil(timer.remainingMs / 1000)
  const timeText = `${String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:${String(timerSeconds % 60).padStart(2, '0')}`

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Study Hub</p>
        <h1 className="mt-1 text-3xl font-extrabold">Choose how you study</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Try a technique, keep a record of your practice, and find what works for you.
        </p>
      </header>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {savedMessage && <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/30 dark:text-green-300">{savedMessage}</p>}
      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center dark:bg-slate-900">Loading your study progress…</div>
      ) : (
        <>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2" aria-label="Study methods">
            {methods.map(([id, label]) => (
              <button
                key={id}
                aria-pressed={method === id}
                onClick={() => setMethod(id)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${method === id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              {method === 'recall' && (
                <div>
                  <h2 className="text-xl font-bold">Active recall</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try to retrieve the answer before revealing it. Create your own prompts below.</p>
                  {currentCard ? (
                    <div className="mt-5 rounded-xl bg-blue-50 p-5 dark:bg-blue-950/40">
                      <p className="text-xs font-bold uppercase text-blue-700 dark:text-blue-300">{currentCard.topic}</p>
                      <p className="mt-2 text-lg font-semibold">{currentCard.question}</p>
                      {revealed && <p className="mt-4 border-t border-blue-200 pt-4 text-slate-700 dark:border-blue-800 dark:text-slate-200">{currentCard.answer}</p>}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setRevealed((value) => !value)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">{revealed ? 'Hide answer' : 'Reveal answer'}</button>
                        {revealed && <button type="button" onClick={assessRecall} className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-800 dark:text-blue-200">Record practice</button>}
                      </div>
                    </div>
                  ) : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800">Create a question to begin practicing.</p>}
                  <form onSubmit={createCard} className="mt-6 grid gap-3">
                    <h3 className="font-bold">Create a question</h3>
                    <input aria-label="Topic" placeholder="Topic" required maxLength={120} value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
                    <textarea aria-label="Question" placeholder="Question or prompt" required maxLength={2000} rows={2} value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
                    <textarea aria-label="Answer" placeholder="Answer" required maxLength={4000} rows={2} value={form.answer} onChange={(event) => setForm({ ...form, answer: event.target.value })} className="rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" />
                    <button className="justify-self-start rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">Save question</button>
                  </form>
                </div>
              )}

              {method === 'spacing' && (
                <div>
                  <h2 className="text-xl font-bold">Spaced repetition</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review due questions and rate how well you recalled each one. Suggested intervals expand through 1, 3, 7, and 14 days.</p>
                  {dueCards.length ? dueCards.slice(0, 1).map((card) => (
                    <div key={card.id} className="mt-5 rounded-xl bg-violet-50 p-5 dark:bg-violet-950/30">
                      <p className="text-xs font-bold uppercase text-violet-700 dark:text-violet-300">{card.topic}</p>
                      <p className="mt-2 text-lg font-semibold">{card.question}</p>
                      <p className="mt-3 text-slate-700 dark:text-slate-200">{card.answer}</p>
                      <p className="mt-3 text-xs text-slate-500">Current interval: {card.interval_days} day(s)</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {[
                          ['again', 'Need more practice'],
                          ['hard', 'Difficult'],
                          ['easy', 'Easy'],
                        ].map(([rating, label]) => <button key={rating} type="button" onClick={() => reviewCard(card, rating)} className="rounded-lg border border-violet-300 px-3 py-2 text-sm font-semibold text-violet-900 dark:text-violet-200">{label}</button>)}
                      </div>
                    </div>
                  )) : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800">No reviews due. Add questions in Active recall.</p>}
                  <h3 className="mt-6 font-bold">Upcoming reviews</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {cards.filter((card) => card.due_at && new Date(card.due_at) > new Date()).slice(0, 5).map((card) => <li key={card.id} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800"><span>{card.topic}: {card.question}</span><time className="shrink-0 text-slate-500">{new Date(card.due_at).toLocaleDateString()}</time></li>)}
                  </ul>
                </div>
              )}

              {method === 'feynman' && (
                <form onSubmit={saveFeynman} className="space-y-4">
                  <h2 className="text-xl font-bold">Feynman technique</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Explain a topic simply, identify gaps, revisit sources, then rewrite the explanation.</p>
                  {[
                    ['topic', '1. Topic'],
                    ['simple', '2. Explain it simply'],
                    ['gaps', '3. What was confusing or missing?'],
                    ['sources', '4. What source material did you review?'],
                    ['rewrite', '5. Rewrite your explanation'],
                  ].map(([name, label]) => <label key={name} className="block text-sm font-semibold">{label}<textarea required rows={name === 'topic' ? 1 : 3} value={feynman[name]} onChange={(event) => setFeynman({ ...feynman, [name]: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 font-normal dark:border-slate-700" /></label>)}
                  <button className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">Save explanation</button>
                </form>
              )}

              {method === 'pomodoro' && (
                <div className="text-center">
                  <h2 className="text-xl font-bold">Pomodoro focus timer</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Focus for 25 minutes, then take a 5-minute break. Every fourth focus round earns a longer break.</p>
                  <p className="mt-2 font-semibold capitalize text-blue-700 dark:text-blue-300">{timer.phase.replace('-', ' ')}</p>
                  <p className="my-5 font-mono text-6xl font-black tabular-nums" aria-live="polite">{timeText}</p>
                  <label className="mx-auto mb-5 block max-w-sm text-left text-sm font-semibold">Optional task or subject<input value={timerTask} onChange={(event) => setTimerTask(event.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 dark:border-slate-700" /></label>
                  <div className="flex justify-center gap-2">
                    {timer.running ? <button type="button" onClick={pausePomodoro} className="rounded-xl border px-4 py-2 font-bold">Pause</button> : <button type="button" onClick={startPomodoro} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white">{timer.remainingMs < (timer.phase === 'focus' ? 25 : timer.phase === 'long-break' ? 30 : 5) * 60_000 ? 'Resume' : 'Start'}</button>}
                    <button type="button" onClick={resetPomodoro} className="rounded-xl border px-4 py-2 font-bold">Reset</button>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">Completed focus rounds: {timer.focusCount}</p>
                </div>
              )}

              {method === 'interleave' && (
                <div>
                  <h2 className="text-xl font-bold">Interleaving</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mix questions across related topics rather than practising one topic at a time.</p>
                  {!deck.length ? (
                    <>
                      <fieldset className="mt-5 space-y-2">
                        <legend className="mb-2 text-sm font-semibold">Choose at least two topics</legend>
                        {topicNames.map((topic) => <label key={topic} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={topics.includes(topic)} onChange={(event) => setTopics((current) => event.target.checked ? [...current, topic] : current.filter((item) => item !== topic))} />{topic} <span className="text-slate-400">({cards.filter((card) => card.topic === topic).length})</span></label>)}
                      </fieldset>
                      <button type="button" onClick={startInterleaving} disabled={topics.length < 2} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">Start mixed practice</button>
                    </>
                  ) : (
                    <div className="mt-5 rounded-xl bg-amber-50 p-5 dark:bg-amber-950/30">
                      <p className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">{deck[deckIndex]?.topic}</p>
                      <p className="mt-2 text-lg font-semibold">{deck[deckIndex]?.question}</p>
                      {revealed && <p className="mt-3">{deck[deckIndex]?.answer}</p>}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setRevealed((value) => !value)} className="rounded-lg border px-3 py-2 text-sm font-semibold">{revealed ? 'Hide answer' : 'Reveal answer'}</button>
                        <button type="button" onClick={() => { setRevealed(false); if (deckIndex + 1 === deck.length) void finishInterleaving(); else setDeckIndex((value) => value + 1) }} className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white">{deckIndex + 1 === deck.length ? 'Finish practice' : 'Next question'}</button>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">Question {deckIndex + 1} of {deck.length}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold">Recent practice</h2>
              {sessions.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Completed study sessions will appear here.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {sessions.slice(0, 8).map((session) => <li key={session.id} className="border-b border-slate-100 pb-3 text-sm dark:border-slate-800"><p className="font-semibold">{methods.find(([id]) => id === session.technique)?.[1] ?? session.technique}</p><p className="text-slate-500">{session.subject || 'Study session'}</p><time className="text-xs text-slate-400">{session.completed_at ? new Date(session.completed_at).toLocaleString() : 'In progress'}</time></li>)}
                </ul>
              )}
              <p className="mt-4 text-xs text-slate-500">{cards.length} saved question{cards.length === 1 ? '' : 's'} · {sessions.length} recent session{sessions.length === 1 ? '' : 's'}</p>
            </aside>
          </section>
        </>
      )}
    </main>
  )
}
