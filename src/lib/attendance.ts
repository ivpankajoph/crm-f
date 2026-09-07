export interface AttendanceTiming {
  checkIn?: string | Date | null
  checkOut?: string | Date | null
  workedMinutes?: number | null
  workedSeconds?: number | null
  isOpenSession?: boolean
}

const BUSINESS_TIME_ZONE = "Asia/Kolkata"

export const attendanceDateInput = (value: string | Date = new Date()) => (
  new Date(value).toLocaleDateString("en-CA", { timeZone: BUSINESS_TIME_ZONE })
)

export const formatAttendanceDate = (value?: string | Date | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export const formatAttendanceTime = (value?: string | Date | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date)
}

export const attendanceWorkedMinutes = (record: AttendanceTiming) => {
  if (typeof record.workedMinutes === "number" && record.workedMinutes >= 0) {
    return Math.floor(record.workedMinutes)
  }
  if (!record.checkIn || !record.checkOut) return null
  const elapsed = new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()
  return Number.isFinite(elapsed) && elapsed >= 0 ? Math.floor(elapsed / 60_000) : null
}

export const formatMinutes = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60
  if (!hours) return `${remainder}m`
  return `${hours}h ${remainder}m`
}

export const formatAttendanceDuration = (record: AttendanceTiming) => {
  if (typeof record.workedSeconds === "number" && record.workedSeconds >= 0) {
    const seconds = Math.floor(record.workedSeconds)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainder = seconds % 60
    const base = hours ? `${hours}h ${minutes}m` : `${minutes}m`
    return remainder ? `${base} ${remainder}s` : base
  }
  const minutes = attendanceWorkedMinutes(record)
  if (minutes !== null) return formatMinutes(minutes)
  if (record.isOpenSession || (record.checkIn && !record.checkOut)) return "In Progress"
  return "—"
}

export const attendanceTimeInputValue = (value?: string | Date | null) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date)
  const hour = parts.find((part) => part.type === "hour")?.value || ""
  const minute = parts.find((part) => part.type === "minute")?.value || ""
  return hour && minute ? `${hour === "24" ? "00" : hour}:${minute}` : ""
}

export const attendanceTimeToIso = (date: string, time: string) => (
  time ? new Date(`${date}T${time}:00+05:30`).toISOString() : null
)
