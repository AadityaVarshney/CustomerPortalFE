import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BookOpen, Search, ChevronLeft, ThumbsUp, ThumbsDown,
  ChevronRight, Tag, Clock, Loader2, AlertCircle
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { formatRelativeTime, cn } from '@/lib/utils'

// ── API ───────────────────────────────────────────────────────────────────────

const fetchArticles = async (query) => {
  if (query && query.length > 2) {
    // Use AI KB search if query long enough
    try {
      const { data } = await api.get(`/ai/kb-search?query=${encodeURIComponent(query)}`)
      return data
    } catch {
      // fall through to regular list
    }
  }
  const { data } = await api.get('/kb/articles')
  return data
}

const fetchArticle = async (id) => {
  const { data } = await api.get(`/kb/articles/${id}`)
  return data
}

const submitFeedback = async ({ id, helpful }) => {
  const { data } = await api.post(`/kb/articles/${id}/feedback`, { helpful })
  return data
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useArticles(query) {
  return useQuery({
    queryKey: ['kb', 'articles', query],
    queryFn: () => fetchArticles(query),
    keepPreviousData: true,
  })
}

function useArticle(id) {
  return useQuery({
    queryKey: ['kb', 'articles', id],
    queryFn: () => fetchArticle(id),
    enabled: !!id,
  })
}

// ── Components ────────────────────────────────────────────────────────────────

function ArticleCard({ article, basePath }) {
  return (
    <Link
      to={`articles/${article.id}`}
      className="glass-card glass-card-hover rounded-xl p-4 flex flex-col gap-3 group transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        {article.category && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-muted-foreground capitalize">
            {article.category.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.excerpt}</p>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
        {article.updated_at && (
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelativeTime(article.updated_at)}</span>
        )}
        {article.helpful_count !== undefined && (
          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{article.helpful_count}</span>
        )}
        {article.similarity_score && (
          <span className="ml-auto text-primary text-[10px]">{Math.round(article.similarity_score * 100)}% match</span>
        )}
      </div>
    </Link>
  )
}

// ── KnowledgeBasePage ─────────────────────────────────────────────────────────

export function KnowledgeBasePage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const role = useAuthStore((s) => s.role)

  // Simple debounce
  const handleSearch = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(window._kbSearchTimer)
    window._kbSearchTimer = setTimeout(() => setDebouncedSearch(val), 400)
  }

  const { data, isLoading } = useArticles(debouncedSearch)
  const articles = Array.isArray(data) ? data : (data?.items ?? data?.content ?? [])

  const isAISearch = debouncedSearch.length > 2

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Find answers and guides</p>
      </div>

      {/* Search */}
      <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          value={search}
          onChange={handleSearch}
          placeholder="Search articles… (AI-powered when 3+ characters)"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
        {isAISearch && !isLoading && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">AI Search</span>
        )}
      </div>

      {/* Articles grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-accent rounded-xl animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm font-medium text-foreground">
            {debouncedSearch ? 'No articles match your search' : 'No articles published yet'}
          </p>
          {debouncedSearch && (
            <button onClick={() => { setSearch(''); setDebouncedSearch('') }} className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── ArticlePage ───────────────────────────────────────────────────────────────

export function ArticlePage() {
  const { articleId } = useParams()
  const addToast = useUIStore((s) => s.addToast)
  const qc = useQueryClient()
  const [feedbackGiven, setFeedbackGiven] = useState(null)

  const { data: article, isLoading, error } = useArticle(articleId)

  const feedbackMutation = useMutation({
    mutationFn: ({ helpful }) => submitFeedback({ id: articleId, helpful }),
    onSuccess: (_, { helpful }) => {
      setFeedbackGiven(helpful)
      qc.invalidateQueries({ queryKey: ['kb', 'articles', articleId] })
      addToast({ type: 'success', title: helpful ? 'Glad it helped!' : 'Thanks for the feedback' })
    },
    onError: () => addToast({ type: 'error', title: 'Could not submit feedback' }),
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-6 w-24 bg-accent rounded animate-pulse" />
        <div className="h-8 w-3/4 bg-accent rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 bg-accent rounded animate-pulse" style={{ width: `${[100, 90, 95, 70, 100, 85, 60, 80][i]}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-display font-bold text-foreground">Article not found</h2>
        <Link to=".." className="text-primary text-sm mt-2 inline-block">← Back to Knowledge Base</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <Link to=".." className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft className="w-4 h-4" /> Knowledge Base
      </Link>

      {/* Article */}
      <div className="glass-card rounded-2xl p-8 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          {article.category && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary capitalize">
              {article.category.replace(/_/g, ' ')}
            </span>
          )}
          {article.tags?.map((tag) => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-2xl font-display font-bold text-foreground leading-snug">
          {article.title}
        </h1>

        {article.updated_at && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" /> Updated {formatRelativeTime(article.updated_at)}
          </p>
        )}

        <div
          className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_code]:bg-accent [&_code]:px-1.5 [&_code]:rounded"
          dangerouslySetInnerHTML={{ __html: article.content ?? article.body ?? '' }}
        />
      </div>

      {/* Feedback */}
      <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
        <p className="text-sm text-foreground">Was this article helpful?</p>
        <div className="flex items-center gap-2 ml-auto">
          <button
            disabled={feedbackGiven !== null || feedbackMutation.isPending}
            onClick={() => feedbackMutation.mutate({ helpful: true })}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all',
              feedbackGiven === true
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                : 'border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-40',
            )}
          >
            <ThumbsUp className="w-4 h-4" /> Yes
          </button>
          <button
            disabled={feedbackGiven !== null || feedbackMutation.isPending}
            onClick={() => feedbackMutation.mutate({ helpful: false })}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all',
              feedbackGiven === false
                ? 'border-red-500/50 bg-red-500/10 text-red-400'
                : 'border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-40',
            )}
          >
            <ThumbsDown className="w-4 h-4" /> No
          </button>
        </div>
      </div>
    </div>
  )
}
