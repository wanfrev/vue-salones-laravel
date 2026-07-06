declare module 'vue-cal' {
  import { DefineComponent } from 'vue'

  interface VueCalEvent {
    _eid?: any
    _?: {
      id: any
      startTimeFormatted24: string
      endTimeFormatted24: string
      duration: number
      [key: string]: any
    }
    start: string | Date
    end: string | Date
    id?: string | number
    title?: string
    content?: string
    class?: string
    schedule?: string | number
    [key: string]: any
  }

  interface VueCalView {
    isDay: boolean
    isWeek: boolean
    isMonth: boolean
    start: Date
    end: Date
    [key: string]: any
  }

  interface VueCalCell {
    start: Date
    end: Date
    [key: string]: any
  }

  const VueCal: DefineComponent<{
    events?: VueCalEvent[]
    view?: string
    viewDate?: Date
    schedules?: { id: string | number; label: string; class?: string }[] | undefined
    editableEvents?: { drag?: boolean; resize?: boolean; create?: boolean; delete?: boolean } | false
    views?: string[]
    timeFrom?: number
    timeTo?: number
    snapToInterval?: number
    dark?: boolean
    locale?: string
    stickyScheduleHeaders?: boolean
    hideWeekend?: boolean
    onReady?: (ctx: { view: VueCalView; config?: any }) => void
    onEventDragEnd?: (ctx: { event: VueCalEvent }) => void
    onEventResizeEnd?: (ctx: { event: VueCalEvent }) => void
    onCellClick?: (ctx: { cell: VueCalCell; cursor?: any }) => void
    onEventClick?: (event: VueCalEvent, nativeEvent: MouseEvent) => void
  }, {}, {}, {}, {}, {
    event: (slotProps: { event: VueCalEvent; view: VueCalView }) => any
  }>
  export default VueCal
}
