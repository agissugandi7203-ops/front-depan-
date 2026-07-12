export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isError?: boolean
  image?: string
  searchResults?: SearchResultItem[]
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  userId?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ChatRequest {
  message: string
  sessionId?: string
  history?: { role: 'user' | 'assistant' | 'system'; content: any }[]
  image?: string
  mimeType?: string
}

export interface ChatResponse {
  content: string
  timestamp: string
  sessionId: string
}

export interface ClaimValidationRequest {
  claim: string
  image?: string
  mimeType?: string
}

export interface ClaimValidationResponse {
  isValid: boolean
  explanation: string
  source?: string
  confidence?: number
}

export interface SummaryRequest {
  text: string
}

export interface SummaryResponse {
  summary: string
}

export interface HistoryResponse {
  messages: Message[]
}

export interface ApiError {
  error: string
}

export interface CitizenReportRequest {
  reporterName: string
  reporterContact: string
  category: string
  description: string
  sessionId?: string
  latitude?: number
  longitude?: number
  image?: string
}

export interface CitizenReportResponse {
  id: string
  status: string
  message: string
}

export interface SearchResultItem {
  title: string
  link: string
  snippet: string
  source?: string
}

export interface SearchProgress {
  phase: number
  count: number
  sites: string[]
}

export type StreamEvent =
  | { type: 'search_progress'; phase: number; count: number; sites: string[] }
  | { type: 'search_result'; items: SearchResultItem[] }
  | { type: 'token'; content: string }
  | { type: 'done'; sessionId: string }
  | { type: 'error'; message: string }


