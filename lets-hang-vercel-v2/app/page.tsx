"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  Plus,
  Clock,
  MapPin,
  MessageSquare,
  ChevronLeft,
  Calendar,
  Coffee,
  Mountain,
  Gamepad2,
  Users,
  Moon,
  Sun,
  Share,
  ChevronDown,
  ChevronUp,
  Edit3,
  ThumbsUp,
  Send,
  Settings,
  X,
  Edit,
  CheckCircle,
  LogOut,
} from "lucide-react"
import StatsCard from "@/components/StatsCard"
import AuthForm from "@/components/AuthForm"
import {
  supabase,
  getCurrentUser,
  createOrUpdateUser,
  getHangs,
  createHang,
  updateHang,
  updateRSVP,
  addSuggestion,
  voteSuggestion,
  signOut,
  type User,
  type Hang,
} from "@/lib/supabase"

// Native HTML suggestion input component
const SuggestionInput = ({
  hangId,
  isDarkMode,
  onAddSuggestion,
}: {
  hangId: string
  isDarkMode: boolean
  onAddSuggestion: (hangId: string, content: string, type: "time" | "location" | "general") => void
}) => {
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedType, setSelectedType] = useState<"time" | "location" | "general">("general")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const content = formData.get("suggestion") as string

    if (content?.trim() && !loading) {
      setLoading(true)
      await onAddSuggestion(hangId, content.trim(), selectedType)
      if (formRef.current) {
        formRef.current.reset()
      }
      setLoading(false)
    }
  }

  return (
    <div>
      <h4 className="text-sm font-medium mb-3">Suggest a change</h4>
      <div className="space-y-3">
        {/* Type selector */}
        <div className="flex gap-1 mb-3">
          {[
            { type: "time", icon: Clock, label: "Time" },
            { type: "location", icon: MapPin, label: "Location" },
            { type: "general", icon: MessageSquare, label: "General" },
          ].map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              type="button"
              className={`px-2 py-1 text-xs rounded cursor-pointer select-none transition-colors border-0 outline-none ${
                selectedType === type
                  ? isDarkMode
                    ? "bg-white text-black"
                    : "bg-black text-white"
                  : isDarkMode
                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setSelectedType(type as "time" | "location" | "general")}
            >
              <Icon className="w-3 h-3 inline mr-1" />
              {label}
            </button>
          ))}
        </div>

        {/* Native HTML form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1">
            <textarea
              name="suggestion"
              placeholder={`Type your ${selectedType} suggestion here...`}
              className={`w-full text-sm resize-none min-h-[60px] px-3 py-2 border rounded-md ${
                isDarkMode
                  ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 text-black placeholder-gray-500"
              }`}
              rows={2}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  if (formRef.current) {
                    formRef.current.requestSubmit()
                  }
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`shrink-0 self-start mt-1 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
              isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LetsHangApp() {
  const [currentView, setCurrentView] = useState<"home" | "create" | "past" | "expanded">("home")
  const [hangs, setHangs] = useState<Hang[]>([])
  const [expandedHangId, setExpandedHangId] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingHang, setEditingHang] = useState<Hang | null>(null)

  // Use refs for forms to avoid React state issues
  const createFormRef = useRef<HTMLFormElement>(null)
  const editFormRef = useRef<HTMLFormElement>(null)
  const nameFormRef = useRef<HTMLFormElement>(null)

  // Auth state management
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUser()
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await loadUser()
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setHangs([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load user data
  const loadUser = async () => {
    try {
      const { data: userData, error } = await getCurrentUser()
      if (userData) {
        setUser(userData)
        await loadHangs()
      } else if (error) {
        console.error("Error loading user:", error)
      }
    } catch (error) {
      console.error("Error loading user:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load hangs
  const loadHangs = async () => {
    try {
      const { data, error } = await getHangs()
      if (data) {
        setHangs(data)
      } else if (error) {
        console.error("Error loading hangs:", error)
      }
    } catch (error) {
      console.error("Error loading hangs:", error)
    }
  }

  // Create user profile
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get("name") as string

    if (!name?.trim()) return

    try {
      const { data, error } = await createOrUpdateUser({ name: name.trim() })
      if (data) {
        setUser(data)
        await loadHangs()
      } else if (error) {
        alert(`Error creating profile: ${error.message}`)
      }
    } catch (error) {
      alert(`Error creating profile: ${error}`)
    }
  }

  // Create hang
  const handleCreateHang = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    const title = formData.get("title") as string
    const date = formData.get("date") as string
    const time = formData.get("time") as string
    const location = formData.get("location") as string
    const description = formData.get("description") as string
    const maxAttendees = formData.get("maxAttendees") as string
    const type = formData.get("type") as "coffee" | "outdoor" | "games" | "social"

    if (!title || !date || !time || !location) {
      alert("Please fill in all required fields")
      return
    }

    try {
      const { data, error } = await createHang({
        title,
        date,
        time,
        location,
        description: description || "",
        max_attendees: Number.parseInt(maxAttendees) || 10,
        type: type || "social",
        status: "active",
      })

      if (data) {
        await loadHangs()
        if (createFormRef.current) {
          createFormRef.current.reset()
        }
        setCurrentView("home")

        const shareUrl = `${window.location.origin}?hang=${data.id}`
        alert(`Hang created! Share this link with friends: ${shareUrl}`)
      } else if (error) {
        alert(`Error creating hang: ${error.message}`)
      }
    } catch (error) {
      alert(`Error creating hang: ${error}`)
    }
  }

  // Update hang
  const handleUpdateHang = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingHang) return

    const formData = new FormData(e.target as HTMLFormElement)

    const title = formData.get("title") as string
    const date = formData.get("date") as string
    const time = formData.get("time") as string
    const location = formData.get("location") as string
    const description = formData.get("description") as string
    const maxAttendees = formData.get("maxAttendees") as string
    const type = formData.get("type") as "coffee" | "outdoor" | "games" | "social"

    if (!title || !date || !time || !location) {
      alert("Please fill in all required fields")
      return
    }

    try {
      const { data, error } = await updateHang(editingHang.id, {
        title,
        date,
        time,
        location,
        description: description || "",
        max_attendees: Number.parseInt(maxAttendees) || 10,
        type: type || "social",
      })

      if (data) {
        await loadHangs()
        setEditingHang(null)
        alert("Hang updated successfully! 🎉")
      } else if (error) {
        alert(`Error updating hang: ${error.message}`)
      }
    } catch (error) {
      alert(`Error updating hang: ${error}`)
    }
  }

  // Handle RSVP
  const handleRSVP = async (hangId: string, status: "going" | "maybe" | "not-going") => {
    try {
      const { error } = await updateRSVP(hangId, status)
      if (!error) {
        await loadHangs()
      } else {
        alert(`Error updating RSVP: ${error.message}`)
      }
    } catch (error) {
      alert(`Error updating RSVP: ${error}`)
    }
  }

  // Add suggestion
  const handleAddSuggestion = async (hangId: string, content: string, type: "time" | "location" | "general") => {
    try {
      const { error } = await addSuggestion(hangId, type, content)
      if (!error) {
        await loadHangs()
      } else {
        alert(`Error adding suggestion: ${error.message}`)
      }
    } catch (error) {
      alert(`Error adding suggestion: ${error}`)
    }
  }

  // Vote on suggestion
  const handleVoteSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await voteSuggestion(suggestionId)
      if (!error) {
        await loadHangs()
      } else {
        alert(`Error voting on suggestion: ${error.message}`)
      }
    } catch (error) {
      alert(`Error voting on suggestion: ${error}`)
    }
  }

  // Cancel hang
  const handleCancelHang = async (hangId: string) => {
    if (confirm("Are you sure you want to cancel this hang? This action cannot be undone.")) {
      try {
        const { error } = await updateHang(hangId, { status: "cancelled" })
        if (!error) {
          await loadHangs()
          alert("Hang cancelled. Attendees will be notified.")
        } else {
          alert(`Error cancelling hang: ${error.message}`)
        }
      } catch (error) {
        alert(`Error cancelling hang: ${error}`)
      }
    }
  }

  // Complete hang
  const handleCompleteHang = async (hangId: string) => {
    if (confirm("Mark this hang as completed?")) {
      try {
        const { error } = await updateHang(hangId, { status: "completed" })
        if (!error) {
          await loadHangs()
          alert("Hang marked as completed! 🎉")
        } else {
          alert(`Error completing hang: ${error.message}`)
        }
      } catch (error) {
        alert(`Error completing hang: ${error}`)
      }
    }
  }

  // Sign out
  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      alert(`Error signing out: ${error.message}`)
    }
  }

  // Share hang
  const shareHang = async (hang: Hang) => {
    const shareUrl = `${window.location.origin}?hang=${hang.id}`
    const shareText = `🎉 Join me for ${hang.title}!\n\n📅 ${hang.date} at ${hang.time}\n📍 ${hang.location}\n👥 ${hang.attendees?.length || 0}/${hang.max_attendees} people going\n\nRSVP here: ${shareUrl}`

    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ text: shareText })) {
        await navigator.share({
          title: `Let's Hang - ${hang.title}`,
          text: shareText,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert("Hang link copied to clipboard! 📋")
      }
    } catch (error) {
      try {
        await navigator.clipboard.writeText(shareText)
        alert("Hang link copied to clipboard! 📋")
      } catch (clipboardError) {
        const textArea = document.createElement("textarea")
        textArea.value = shareText
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
        alert("Hang link copied to clipboard! 📋")
      }
    }
  }

  // Utility functions
  const getEventIcon = (type: string) => {
    switch (type) {
      case "coffee":
        return Coffee
      case "outdoor":
        return Mountain
      case "games":
        return Gamepad2
      case "social":
        return Users
      default:
        return Calendar
    }
  }

  const getRSVPColor = (rsvp: string | null) => {
    if (isDarkMode) {
      switch (rsvp) {
        case "going":
          return "bg-white text-black"
        case "maybe":
          return "bg-gray-600 text-white"
        case "not-going":
          return "bg-gray-800 text-gray-400"
        default:
          return "bg-transparent border border-gray-600 text-gray-300"
      }
    } else {
      switch (rsvp) {
        case "going":
          return "bg-black text-white"
        case "maybe":
          return "bg-gray-200 text-black"
        case "not-going":
          return "bg-gray-100 text-gray-600"
        default:
          return "bg-white border border-gray-300 text-black"
      }
    }
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "time":
        return Clock
      case "location":
        return MapPin
      default:
        return MessageSquare
    }
  }

  const isHost = (hang: Hang) => {
    return hang.host_id === user?.id
  }

  const themeClasses = isDarkMode ? "bg-black text-white" : "bg-white text-black"
  const cardClasses = isDarkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-black"

  // Loading state
  if (loading) {
    return (
      <div className={`max-w-sm mx-auto min-h-screen flex items-center justify-center ${themeClasses}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return <AuthForm isDarkMode={isDarkMode} />
  }

  // Need to set name
  if (!user.name) {
    return (
      <div className={`max-w-sm mx-auto min-h-screen flex items-center justify-center p-4 ${themeClasses}`}>
        <Card className={cardClasses}>
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">Welcome to Let's Hang!</h1>
            <p className="text-center text-sm text-gray-600">What should we call you?</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form ref={nameFormRef} onSubmit={handleCreateProfile}>
              <input
                name="name"
                placeholder="Enter your name"
                className={`w-full px-3 py-2 border rounded-md ${
                  isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-black"
                }`}
                required
              />
              <button
                type="submit"
                className={`w-full mt-4 px-4 py-2 rounded-md font-medium ${
                  isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
                }`}
              >
                Get Started
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const EditHangForm = () => {
    if (!editingHang) return null

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => setEditingHang(null)} className="mr-3 p-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Edit Hang</h1>
          </div>
        </div>

        <form ref={editFormRef} onSubmit={handleUpdateHang} className="space-y-6">
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium mb-1">
              Hang Title *
            </label>
            <input
              id="edit-title"
              name="title"
              defaultValue={editingHang.title}
              placeholder="What are you planning?"
              className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
                isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
              }`}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-date" className="block text-sm font-medium mb-1">
                Date *
              </label>
              <input
                id="edit-date"
                name="date"
                type="date"
                defaultValue={editingHang.date}
                className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
                  isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
                }`}
                required
              />
            </div>
            <div>
              <label htmlFor="edit-time" className="block text-sm font-medium mb-1">
                Time *
              </label>
              <input
                id="edit-time"
                name="time"
                type="time"
                defaultValue={editingHang.time}
                className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
                  isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
                }`}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-location" className="block text-sm font-medium mb-1">
              Location *
            </label>
            <input
              id="edit-location"
              name="location"
              defaultValue={editingHang.location}
              placeholder="Where should everyone meet?"
              className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
                isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
              }`}
              required
            />
          </div>

          <div>
            <label htmlFor="edit-type" className="block text-sm font-medium mb-1">
              Hang Type
            </label>
            <select
              id="edit-type"
              name="type"
              defaultValue={editingHang.type}
              className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
                isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
              }`}
            >
              <option value="social">Social</option>
              <option value="coffee">Coffee</option>
              <option value="outdoor">Outdoor</option>
              <option value="games">Games</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="edit-description"
              name="description"
              defaultValue={editingHang.description}
              placeholder="Tell everyone what to expect..."
              className={`w-full px-3 py-2 border rounded-md resize-none transition-all duration-200 ${
                isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
              }`}
              rows={4}
            />
          </div>

          <div>
            <label htmlFor="edit-maxAttendees" className="block text-sm font-medium mb-1">
              Max Attendees
            </label>
            <input
              id="edit-maxAttendees"
              name="maxAttendees"
              type="number"
              defaultValue={editingHang.max_attendees}
              className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
                isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
              }`}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
              }`}
            >
              Update Hang
            </button>
            <Button type="button" variant="outline" onClick={() => setEditingHang(null)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    )
  }

  const HomeView = () => (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Let's Hang</h1>
          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Hey {user.name}! 👋</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="p-2">
            <LogOut className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Sun className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-yellow-500"}`} />
            <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} className="data-[state=checked]:bg-white" />
            <Moon className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-gray-400"}`} />
          </div>
          <Button
            size="sm"
            className={`transition-all duration-200 ${
              isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
            }`}
            onClick={() => setCurrentView("create")}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <StatsCard events={hangs} isDarkMode={isDarkMode} />
      </div>

      {hangs.length > 0 ? (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-4">Your Hangs</h2>
          <div className="space-y-4">
            {hangs.map((hang) => (
              <EventCard key={hang.id} hang={hang} featured={hang.status === "active"} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? "text-gray-600" : "text-gray-300"}`} />
          <h3 className="text-lg font-semibold mb-2">No hangs yet</h3>
          <p className={`text-sm mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            Create your first hang and invite friends!
          </p>
          <Button
            onClick={() => setCurrentView("create")}
            className={`transition-all duration-200 ${
              isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Hang
          </Button>
        </div>
      )}
    </div>
  )

  const EventCard = ({ hang, featured = false }: { hang: Hang; featured?: boolean }) => {
    const isExpanded = expandedHangId === hang.id
    const IconComponent = getEventIcon(hang.type)
    const attendancePercentage = ((hang.attendees?.length || 0) / hang.max_attendees) * 100
    const userIsHost = isHost(hang)

    return (
      <Card
        className={`${cardClasses} shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
          featured ? "ring-2 ring-opacity-20" : ""
        } ${featured && isDarkMode ? "ring-white" : featured ? "ring-black" : ""} ${
          hang.status === "cancelled" ? "opacity-60" : ""
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isDarkMode ? "bg-gray-800" : "bg-gray-100"
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`${featured ? "text-xl" : "text-lg"} font-semibold`}>{hang.title}</h3>
                  {hang.status === "cancelled" && (
                    <Badge variant="destructive" className="text-xs">
                      Cancelled
                    </Badge>
                  )}
                  {hang.status === "completed" && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      Completed
                    </Badge>
                  )}
                  {userIsHost && (
                    <Badge variant="outline" className="text-xs">
                      Host
                    </Badge>
                  )}
                </div>
                <div className={`flex items-center text-sm mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  <Clock className="w-4 h-4 mr-1" />
                  {hang.date} at {hang.time}
                </div>
                <div className={`flex items-center text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  <MapPin className="w-4 h-4 mr-1" />
                  {hang.location}
                </div>
                <div className={`text-xs mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                  Hosted by {hang.host?.name}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`p-1 h-8 w-8 transition-all duration-200 ${
                    isDarkMode
                      ? "hover:bg-gray-800 text-gray-400 hover:text-white"
                      : "hover:bg-gray-100 text-gray-600 hover:text-black"
                  }`}
                  onClick={() => shareHang(hang)}
                >
                  <Share className="w-4 h-4" />
                </Button>
                {userIsHost && hang.status === "active" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`p-1 h-8 w-8 transition-all duration-200 ${
                      isDarkMode
                        ? "hover:bg-gray-800 text-gray-400 hover:text-white"
                        : "hover:bg-gray-100 text-gray-600 hover:text-black"
                    }`}
                    onClick={() => setEditingHang(hang)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="text-right">
                <div className={`${featured ? "text-2xl" : "text-xl"} font-bold`}>{hang.attendees?.length || 0}</div>
                <div className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  of {hang.max_attendees}
                </div>
                <div className={`w-12 h-1 rounded-full mt-1 ${isDarkMode ? "bg-gray-800" : "bg-gray-200"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${isDarkMode ? "bg-white" : "bg-black"}`}
                    style={{ width: `${attendancePercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {hang.status === "active" && (
            <div className="flex gap-2 mb-3">
              <Button
                size="sm"
                variant="outline"
                className={`flex-1 text-xs transition-all duration-200 ${getRSVPColor(hang.user_rsvp === "going" ? "going" : null)}`}
                onClick={() => handleRSVP(hang.id, "going")}
              >
                Going
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={`flex-1 text-xs transition-all duration-200 ${getRSVPColor(hang.user_rsvp === "maybe" ? "maybe" : null)}`}
                onClick={() => handleRSVP(hang.id, "maybe")}
              >
                Maybe
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={`flex-1 text-xs transition-all duration-200 ${getRSVPColor(hang.user_rsvp === "not-going" ? "not-going" : null)}`}
                onClick={() => handleRSVP(hang.id, "not-going")}
              >
                Not Going
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={`w-full text-xs transition-all duration-200 ${
              isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"
            }`}
            onClick={() => setExpandedHangId(isExpanded ? null : hang.id)}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {isExpanded ? "Show Less" : "Show More"}
          </Button>

          {isExpanded && (
            <div
              className={`mt-4 pt-4 border-t space-y-4 transition-all duration-200 ${
                isDarkMode ? "border-gray-800" : "border-gray-100"
              }`}
            >
              {/* Host Actions */}
              {userIsHost && hang.status === "active" && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Settings className="w-4 h-4" />
                    Host Actions
                  </h4>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setEditingHang(hang)} className="text-xs">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompleteHang(hang.id)}
                      className="text-xs text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Mark Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelHang(hang.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Cancel Hang
                    </Button>
                  </div>
                </div>
              )}

              {/* Event Description */}
              <div>
                <h4 className="text-sm font-medium mb-2">About this hang</h4>
                <p className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  {hang.description || "No description provided."}
                </p>
              </div>

              {/* Attendees */}
              <div>
                <h4 className="text-sm font-medium mb-2">Who's going ({hang.attendees?.length || 0})</h4>
                <div className="flex flex-wrap gap-2">
                  {hang.attendees?.map((attendee) => (
                    <div key={attendee.id} className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={attendee.user?.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback>{attendee.user?.name?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{attendee.user?.name}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          attendee.status === "going"
                            ? "bg-green-100 text-green-800"
                            : attendee.status === "maybe"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {attendee.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              {hang.suggestions && hang.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Edit3 className="w-4 h-4" />
                    Suggestions ({hang.suggestions.length})
                  </h4>
                  <div className="space-y-2">
                    {hang.suggestions.map((suggestion) => {
                      const SuggestionIcon = getSuggestionIcon(suggestion.type)
                      return (
                        <div
                          key={suggestion.id}
                          className={`p-3 rounded-lg border ${
                            isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-2 flex-1">
                              <SuggestionIcon className="w-4 h-4 mt-0.5 text-blue-500" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">{suggestion.user?.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {suggestion.type}
                                  </Badge>
                                  <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                    {new Date(suggestion.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm">{suggestion.content}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-8"
                              onClick={() => handleVoteSuggestion(suggestion.id)}
                            >
                              <ThumbsUp className="w-3 h-3 mr-1" />
                              <span className="text-xs">{suggestion.votes}</span>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Add Suggestion */}
              {hang.status === "active" && (
                <SuggestionInput hangId={hang.id} isDarkMode={isDarkMode} onAddSuggestion={handleAddSuggestion} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const CreateEventForm = () => (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => setCurrentView("home")} className="mr-3 p-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Create Hangout</h1>
        </div>
      </div>

      <form ref={createFormRef} onSubmit={handleCreateHang} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Hang Title *
          </label>
          <input
            id="title"
            name="title"
            placeholder="What are you planning?"
            className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
              isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
            }`}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium mb-1">
              Date *
            </label>
            <input
              id="date"
              name="date"
              type="date"
              className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
                isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
              }`}
              required
            />
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium mb-1">
              Time *
            </label>
            <input
              id="time"
              name="time"
              type="time"
              className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
                isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
              }`}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium mb-1">
            Location *
          </label>
          <input
            id="location"
            name="location"
            placeholder="Where should everyone meet?"
            className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
              isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
            }`}
            required
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium mb-1">
            Hang Type
          </label>
          <select
            id="type"
            name="type"
            className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
              isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
            }`}
          >
            <option value="social">Social</option>
            <option value="coffee">Coffee</option>
            <option value="outdoor">Outdoor</option>
            <option value="games">Games</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="Tell everyone what to expect..."
            className={`w-full px-3 py-2 border rounded-md resize-none transition-all duration-200 ${
              isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
            }`}
            rows={4}
          />
        </div>

        <div>
          <label htmlFor="maxAttendees" className="block text-sm font-medium mb-1">
            Max Attendees
          </label>
          <input
            id="maxAttendees"
            name="maxAttendees"
            type="number"
            placeholder="10"
            className={`w-full px-3 py-2 border rounded-md transition-all duration-200 ${
              isDarkMode ? "border-gray-700 bg-gray-800 text-white" : "border-gray-200 bg-white text-black"
            }`}
          />
        </div>

        <button
          type="submit"
          className={`w-full px-4 py-2 rounded-md font-medium transition-all duration-200 ${
            isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
          }`}
        >
          Create Hangout
        </button>
      </form>
    </div>
  )

  const PastView = () => (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Past Hangs</h1>
      <div className="text-center py-12">
        <Calendar className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? "text-gray-600" : "text-gray-300"}`} />
        <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>No past hangs yet</p>
      </div>
    </div>
  )

  const BottomNav = () => (
    <div
      className={`fixed bottom-0 left-0 right-0 px-4 py-2 border-t transition-all duration-200 ${
        isDarkMode ? "bg-black border-gray-800" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex justify-around max-w-sm mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center p-2 transition-all duration-200 ${
            currentView === "home"
              ? isDarkMode
                ? "text-white"
                : "text-black"
              : isDarkMode
                ? "text-gray-600"
                : "text-gray-400"
          }`}
          onClick={() => setCurrentView("home")}
        >
          <Home className="w-5 h-5 mb-1" />
          <span className="text-xs">Home</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center p-2 transition-all duration-200 ${
            currentView === "create"
              ? isDarkMode
                ? "text-white"
                : "text-black"
              : isDarkMode
                ? "text-gray-600"
                : "text-gray-400"
          }`}
          onClick={() => setCurrentView("create")}
        >
          <Plus className="w-5 h-5 mb-1" />
          <span className="text-xs">Create</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex flex-col items-center p-2 transition-all duration-200 ${
            currentView === "past"
              ? isDarkMode
                ? "text-white"
                : "text-black"
              : isDarkMode
                ? "text-gray-600"
                : "text-gray-400"
          }`}
          onClick={() => setCurrentView("past")}
        >
          <Clock className="w-5 h-5 mb-1" />
          <span className="text-xs">Past</span>
        </Button>
      </div>
    </div>
  )

  return (
    <div className={`max-w-sm mx-auto min-h-screen transition-all duration-300 ${themeClasses}`}>
      {editingHang ? (
        <EditHangForm />
      ) : currentView === "home" ? (
        <HomeView />
      ) : currentView === "create" ? (
        <CreateEventForm />
      ) : currentView === "past" ? (
        <PastView />
      ) : null}
      <div className="h-20" />
      {!editingHang && <BottomNav />}
    </div>
  )
}
