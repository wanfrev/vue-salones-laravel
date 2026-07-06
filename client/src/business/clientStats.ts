import type { Appointment, Service } from '../types/database'

export interface ClientStats {
  lastVisit?: string
  totalAppointments: number
  totalSpent: number
}

export function computeClientStats(
  services: Service[],
  appointments: Pick<Appointment, 'client_id' | 'start_time' | 'service_id'>[],
): Map<string, ClientStats> {
  const priceMap = new Map<string, number>()
  for (const svc of services) {
    priceMap.set(svc.id, Number(svc.price ?? 0))
  }

  const statsByClient = new Map<string, ClientStats>()

  for (const appt of appointments) {
    const price = priceMap.get(appt.service_id) ?? 0
    const current = statsByClient.get(appt.client_id) || { totalAppointments: 0, totalSpent: 0 }
    current.totalAppointments += 1
    current.totalSpent += price

    const date = appt.start_time.split('T')[0]
    if (!current.lastVisit || new Date(date) > new Date(current.lastVisit)) {
      current.lastVisit = date
    }
    statsByClient.set(appt.client_id, current)
  }

  return statsByClient
}
