function getZonedParts(date, timeZone) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  )
  return values
}

export function formatDateTimeInput(value, timeZone) {
  const parts = getZonedParts(new Date(value), timeZone)
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

export function localDateTimeToISO(value, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new Error('Enter a valid deadline date and time.')
  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const intended = Date.UTC(year, month - 1, day, hour, minute)
  let candidate = intended

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getZonedParts(new Date(candidate), timeZone)
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute
    )
    const correction = intended - represented
    candidate += correction
    if (correction === 0) break
  }

  const result = getZonedParts(new Date(candidate), timeZone)
  if (
    result.year !== year ||
    result.month !== month ||
    result.day !== day ||
    result.hour !== hour ||
    result.minute !== minute
  ) {
    throw new Error(`That local time does not exist in ${timeZone} because of a daylight-saving change. Choose another time.`)
  }
  return new Date(candidate).toISOString()
}

export function formatZonedDateTime(value, timeZone) {
  return new Date(value).toLocaleString(undefined, {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}
