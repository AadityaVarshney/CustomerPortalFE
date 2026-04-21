import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Code, List, ListOrdered,
  Paperclip, Send, Loader2, Lock, Globe,
} from 'lucide-react'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAddComment, useAddInternalNote } from '@/features/tickets/ticketQueries'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

function ToolbarBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors',
        active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
      )}
    >
      {children}
    </button>
  )
}

export function ThreadComposer({ ticketId, isInternal = false, onSent, placeholder }) {
  const addComment = useAddComment()
  const addInternalNote = useAddInternalNote()
  const addToast = useUIStore((s) => s.addToast)

  // FIX: default to 'internal' tab only when the caller says isInternal=true
  // FIX: tab switcher is shown to internal users, not hidden from them
  const [tab, setTab] = useState(isInternal ? 'internal' : 'customer')
  const [attachments, setAttachments] = useState([])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder ?? (tab === 'internal' ? 'Add an internal note…' : 'Reply to customer…'),
      }),
    ],
    editorProps: {
      attributes: { class: 'tiptap-editor focus:outline-none' },
    },
  })

  const { getRootProps, getInputProps, open: openFilePicker } = useDropzone({
    noClick: true,
    noKeyboard: true,
    maxSize: 25 * 1024 * 1024,
    onDrop: (files) => setAttachments((prev) => [...prev, ...files].slice(0, 5)),
  })

  const handleSend = async () => {
    const html = editor?.getHTML()
    if (!html || html === '<p></p>') return

    // FIX: Route to the correct endpoint based on tab:
    //   Internal note  → POST /tickets/:id/internal-notes  { body }
    //   Customer reply → POST /tickets/:id/comments        { body, isInternal: false }
    if (tab === 'internal') {
      addInternalNote.mutate(
        { ticketId, body: html },
        {
          onSuccess: () => { editor?.commands.clearContent(); setAttachments([]); onSent?.() },
          onError: () => addToast({ type: 'error', title: 'Failed to add note', description: 'Please try again.' }),
        },
      )
    } else {
      addComment.mutate(
        { ticketId, body: html, isInternal: false },
        {
          onSuccess: () => { editor?.commands.clearContent(); setAttachments([]); onSent?.() },
          onError: () => addToast({ type: 'error', title: 'Failed to send reply', description: 'Please try again.' }),
        },
      )
    }
  }

  const isPending = addComment.isPending || addInternalNote.isPending
  const isEmpty = !editor?.getText().trim()

  return (
    <div
      {...getRootProps()}
      className={cn(
        'rounded-2xl border overflow-hidden transition-all duration-200',
        tab === 'internal' ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/[0.08] bg-accent/30',
      )}
    >
      {/* Tab switcher — only shown when the user IS internal */}
      {isInternal && (
        <div className="flex border-b border-white/[0.06]">
          {[
            { id: 'customer', label: 'Reply', icon: Globe },
            { id: 'internal', label: 'Internal Note', icon: Lock },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all',
                tab === id
                  ? id === 'internal' ? 'border-amber-500 text-amber-400' : 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
          {tab === 'internal' && (
            <span className="ml-auto pr-3 flex items-center text-xs text-amber-500/70">
              <Lock className="w-3 h-3 mr-1" /> Only visible to staff
            </span>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-white/[0.06]">
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleCode().run()} active={editor?.isActive('code')} title="Inline code">
          <Code className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">
          <List className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarBtn onClick={openFilePicker} title="Attach file">
          <Paperclip className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <input {...getInputProps()} />
      </div>

      {/* Editor */}
      <div className="px-4 py-3 min-h-[100px]">
        <EditorContent editor={editor} />
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {attachments.map((f) => (
            <span key={f.name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent text-xs text-muted-foreground">
              <Paperclip className="w-3 h-3" />
              {f.name}
              <button onClick={() => setAttachments((a) => a.filter((x) => x.name !== f.name))}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06]">
        <p className="text-xs text-muted-foreground">Markdown supported · Drop files to attach</p>
        <button
          type="button"
          onClick={handleSend}
          disabled={isEmpty || isPending}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40',
            tab === 'internal'
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {tab === 'internal' ? 'Add Note' : 'Send Reply'}
        </button>
      </div>
    </div>
  )
}
