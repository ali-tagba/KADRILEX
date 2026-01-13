"use client"

import { useState } from "react"
import { Audience } from "@/lib/types/audience"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns"
import { fr } from "date-fns/locale"

interface AudienceCalendarProps {
    audiences: Audience[]
}

export function AudienceCalendar({ audiences }: AudienceCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date())

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Adjust start to display padding days from previous month if needed (simple version starts on 1st for now)
    // For a proper grid we usually need startOfWeek but let's stick to a simple month view first.

    const previousMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))

    const getDayEvents = (day: Date) => {
        return audiences.filter(a => isSameDay(new Date(a.date), day))
    }

    return (
        <div className="flex flex-col h-full">
            {/* Calendar Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 capitalize">
                    {format(currentDate, "MMMM yyyy", { locale: fr })}
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={previousMonth} className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                        Aujourd'hui
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    {/* Headers */}
                    {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
                        <div key={d} className="bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {d}
                        </div>
                    ))}

                    {/* Padding days would go here */}

                    {/* Days */}
                    {days.map((day) => {
                        const dayEvents = getDayEvents(day)
                        const isCurrentDay = isToday(day)

                        return (
                            <div
                                key={day.toISOString()}
                                className={`min-h-[120px] bg-white p-2 transition-colors hover:bg-slate-50 ${isCurrentDay ? "bg-blue-50/30" : ""}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full ${isCurrentDay ? "bg-blue-600 text-white" : "text-slate-700"}`}>
                                        {format(day, "d")}
                                    </span>
                                    {dayEvents.length > 0 && (
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {dayEvents.length}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {dayEvents.map(event => (
                                        <div
                                            key={event.id}
                                            className={`
                                                px-2 py-1 rounded text-xs font-medium border cursor-pointer truncate
                                                ${event.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600 border-slate-200 line-through opacity-70' :
                                                    event.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-100' :
                                                        'bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-300'}
                                            `}
                                        >
                                            {format(new Date(event.date), "HH:mm")} {event.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
