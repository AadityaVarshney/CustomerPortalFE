import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '@/lib/axios'
import { Search, BookOpen, Sparkles, Loader2, ChevronRight, Clock, ArrowLeft, Tag } from 'lucide-react'
import { formatRelativeTime, cn } from '@/lib/utils'

function useCategories() {
  return useQuery({
    queryKey: ['kb', 'categories'],
    queryFn: async () => { const { data } = await api.get('/kb/categories'); return data },
  })
}

function useArticles(categoryId, search) {
  return useQuery({
    queryKey: ['kb', 'articles', { categoryId, search }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (categoryId) params.append('category_id', categoryId)
      if (search) params.append('q', search)
      const { data } = await api.get(`/kb/articles?${params}`)
      return data
    },
  })
}

function useArticle(id) {
  return useQuery({
    queryKey: ['kb', 'article', id],
    queryFn: async () => { const { data } = await api.get(`/kb/articles/${id}`); return data },
    enabled: !!id,
  })
}

function useAISearch(query) {
  return useQuery({
    queryKey: ['kb', 'ai-search', query],
    queryFn: async () => { const { data } = await api.get(`/ai/kb-search?q=${encodeURIComponent(query)}&limit=5`); return data },
    enabled: query.length >= 3,
    staleTime: 1000 * 60 * 5,
  })
}

function ArticleCard({ article }) {
  return (
    <Link
      to={`articles/${article.id}`}
      className="glass-card glass-card-hover rounded-xl p-4 block group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
            {article.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{article.excerpt}</p>
          <div className="flex items-center gap-3 mt-2.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {article.read_time ?? 3} min read
            </span>
            {article.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
      </div>
    </Link>
  )
}

export function KnowledgeBasePage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [isAIMode, setIsAIMode] = useState(false)

  const categories = useCategories()
  const articles = useArticles(activeCategory, !isAIMode ? search : '')
  const aiResults = useAISearch(isAIMode ? search : '')

  const displayArticles = isAIMode
    ? (aiResults.data?.articles ?? [])
    : (articles.data?.items ?? [])

  const isSearching = isAIMode ? aiResults.isFetching : articles.isLoading

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground">Knowledge Base</h1>
        <p className="text-muted-foreground mt-2">Find answers to common questions and guides</p>
      </div>

      {/* Search */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            {isAIMode && aiResults.isFetching
              ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
              : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            }
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAIMode ? 'Ask a question…' : 'Search articles…'}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-accent/50 border border-white/[0.08] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={() => setIsAIMode((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap',
              isAIMode
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'text-muted-foreground border-white/[0.06] hover:text-foreground hover:bg-accent/50',
            )}
          >
            <Sparkles className="w-4 h-4" />
            AI Search
          </button>
        </div>

        {/* AI answer */}
        {isAIMode && aiResults.data?.answer && (
          <div className="mt-3 p-4 rounded-xl bg-primary/8 border border-primary/15">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">AI Answer</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{aiResults.data.answer}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories sidebar */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Categories</p>
            </div>
            <nav className="p-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn('nav-item w-full', !activeCategory && 'active')}
              >
                All Articles
              </button>
              {categories.isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-9 bg-accent rounded-lg animate-pulse mx-1 mb-1" />
                  ))
                : (categories.data?.items ?? []).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn('nav-item w-full', activeCategory === cat.id && 'active')}
                    >
                      {cat.name}
                      <span className="ml-auto text-xs text-muted-foreground">{cat.article_count}</span>
                    </button>
                  ))}
            </nav>
          </div>
        </div>

        {/* Articles */}
        <div className="lg:col-span-3 space-y-3">
          {isSearching ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 space-y-2">
                <div className="h-4 bg-accent rounded animate-pulse w-3/4" />
                <div className="h-3 bg-accent rounded animate-pulse" />
                <div className="h-3 bg-accent rounded animate-pulse w-4/5" />
              </div>
            ))
          ) : displayArticles.length === 0 ? (
            <div className="glass-card rounded-2xl py-16 text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No articles found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? 'Try different keywords.' : 'No articles in this category yet.'}
              </p>
            </div>
          ) : (
            displayArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function ArticlePage() {
  const { articleId } = useParams()
  const navigate = useNavigate()
  const { data: article, isLoading } = useArticle(articleId)

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-accent rounded animate-pulse" />
        <div className="glass-card rounded-2xl p-8 space-y-4">
          <div className="h-8 bg-accent rounded animate-pulse w-3/4" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-accent rounded animate-pulse" style={{ width: `${[100, 95, 88, 100, 75, 90, 100, 60][i]}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!article) return null

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Knowledge Base
      </button>

      <article className="glass-card rounded-2xl p-8">
        <header className="mb-6 pb-6 border-b border-white/[0.06]">
          <h1 className="text-2xl font-display font-bold text-foreground mb-3">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {article.read_time ?? 3} min read</span>
            <span>Updated {formatRelativeTime(article.updated_at)}</span>
            {article.tags?.map((tag) => (
              <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded bg-accent">
                <Tag className="w-3 h-3" /> {tag}
              </span>
            ))}
          </div>
        </header>

        <div
          className="prose prose-sm prose-invert max-w-none text-foreground
            prose-headings:font-display prose-headings:text-foreground
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-code:bg-accent prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
            prose-pre:bg-accent prose-pre:border prose-pre:border-white/[0.06]
            prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: article.content_html ?? `<p>${article.content}</p>` }}
        />

        {/* Helpful? */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-sm text-muted-foreground mb-3">Was this article helpful?</p>
          <div className="flex items-center justify-center gap-3">
            <button className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium hover:bg-emerald-500/20 transition-colors">
              👍 Yes
            </button>
            <button className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-colors">
              👎 No
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Still need help?{' '}
            <Link to="/customer/tickets/new" className="text-primary hover:text-primary/80 transition-colors">
              Create a support ticket
            </Link>
          </p>
        </div>
      </article>
    </div>
  )
}
