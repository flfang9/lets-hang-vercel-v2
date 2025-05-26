"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { signInWithEmail } from "@/lib/supabase"

interface AuthFormProps {
  isDarkMode: boolean
}

export default function AuthForm({ isDarkMode }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setMessage("")

    const { error } = await signInWithEmail(email.trim())

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage("Check your email for the magic link! 📧")
    }

    setLoading(false)
  }

  const cardClasses = isDarkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-100 text-black"

  return (
    <div
      className={`max-w-sm mx-auto min-h-screen flex items-center justify-center p-4 ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}
    >
      <Card className={cardClasses}>
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Welcome to Let's Hang!</h1>
          <p className="text-center text-sm text-gray-600">Sign in with your email to get started</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSignIn}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${
                isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-black"
              }`}
              required
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className={`w-full mt-4 px-4 py-2 rounded-md font-medium transition-all duration-200 disabled:opacity-50 ${
                isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
              }`}
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </button>
          </form>
          {message && (
            <p className={`text-sm text-center ${message.includes("Error") ? "text-red-500" : "text-green-500"}`}>
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
