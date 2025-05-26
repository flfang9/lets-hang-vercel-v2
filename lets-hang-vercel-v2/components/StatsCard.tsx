"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface StatsCardProps {
  events: any[]
  isDarkMode: boolean
}

const StatsCard = ({ events, isDarkMode }: StatsCardProps) => {
  const totalEvents = events.length
  const goingCount = events.filter((e) => e.rsvp === "going").length
  const totalAttendees = events.reduce((sum, e) => sum + e.attendees.length, 0)

  const cardClasses = isDarkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-black"

  return (
    <Card className={`${cardClasses} shadow-sm transition-all duration-200 hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className={`text-sm font-medium ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Your Hangs</h3>
          <TrendingUp className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-black"}`}>{totalEvents}</div>
            <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>hangs</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-black"}`}>{goingCount}</div>
            <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>attending</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-black"}`}>{totalAttendees}</div>
            <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>total people</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default StatsCard
