// PATCH for src/features/tickets/CreateTicketPage.jsx
//
// BUG: handleSubmit was calling POST /uploads (standalone) BEFORE creating the ticket,
//      then passing attachment_ids to the ticket payload.
//      The BE has NO /uploads endpoint. Attachments must be uploaded AFTER the ticket
//      is created via POST /tickets/{id}/attachments.
//
// FIX: Create the ticket first, then upload attachments to the ticket's own endpoint.
//
// Replace the handleSubmit function in CreateTicketPage.jsx with the version below.
// Everything else in the file stays unchanged.

/*
  ORIGINAL (broken):
  ─────────────────
  const handleSubmit = async () => {
    ...
    // Upload files first
    let attachmentIds = []
    if (files.length > 0) {
      try {
        const formData = new FormData()
        files.forEach((f) => formData.append('files', f))
        const { data } = await api.post('/uploads', formData, {   // ← endpoint doesn't exist
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        attachmentIds = data.ids ?? []
      } catch {
        addToast({ type: 'warning', ... })
      }
    }
    createTicket.mutate(
      { ...step1Data, ...step2Data, project_id: selectedProject, attachment_ids: attachmentIds },
      { onSuccess: (ticket) => navigate(...) }
    )
  }

  FIXED:
  ──────
  Create the ticket first (no attachment_ids in payload), then upload files to
  POST /tickets/{id}/attachments  (which exists in TicketController).
*/

export const FIXED_handleSubmit = `
  const handleSubmit = async () => {
    const step1Data = step1Form.getValues()
    const step2Data = step2Form.getValues()

    // Step 1: Create the ticket (no attachment_ids needed)
    createTicket.mutate(
      {
        ...step1Data,
        ...step2Data,
        project_id: selectedProject,
      },
      {
        onSuccess: async (ticket) => {
          // Step 2: Upload attachments to the newly-created ticket
          if (files.length > 0 && ticket?.id) {
            try {
              const formData = new FormData()
              files.forEach((f) => formData.append('files', f))
              await api.post(\`/tickets/\${ticket.id}/attachments\`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              })
            } catch {
              addToast({
                type: 'warning',
                title: 'Attachment upload failed',
                description: 'Ticket was created but attachments could not be saved.',
              })
            }
          }
          addToast({
            type: 'success',
            title: 'Ticket created!',
            description: \`#\${ticket.id?.slice(-6)} has been submitted.\`,
          })
          navigate(\`/customer/tickets/\${ticket.id}\`)
        },
        onError: (err) => {
          addToast({
            type: 'error',
            title: 'Failed to create ticket',
            description: err.response?.data?.message ?? 'Please try again.',
          })
        },
      },
    )
  }
`

// NOTE: This file documents the patch. Apply it to CreateTicketPage.jsx
// by replacing the handleSubmit function body as shown above.
// The createTicket mutation no longer passes attachment_ids in its payload.
