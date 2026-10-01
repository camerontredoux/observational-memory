// The inputs of the MCP tools this session had, from each server's tools/list
// inputSchema; written by `/plugin-types` (src/plugins/functionHooks/mcp-tool-types/mcp-tool-declarations.ts).
// Merges into the engine's ToolCallInput (types/ McpToolInputs) so
// `e.tool === "mcp__<server>__<tool>"` narrows to the tool's arguments.
// Regenerate rather than edit.
export {}
declare module 'claude-code' {
  interface McpToolInputs {
    /** Creates a soundbite (clip) from a meeting transcript. A soundbite is a short audio/video segment extracted from a meeting. The authenticated user must have write access to the meeting. Requires the transcript ID and start/end times (in seconds). */
    mcp__claude_ai_Fireflies__fireflies_create_soundbite: {
      /** The transcript ID / meeting ID to create the soundbite from */
      transcriptId: string
      /** Start time of the soundbite in seconds (must be >= 0) */
      startTime: number
      /** End time of the soundbite in seconds (must be > 0 and > startTime) */
      endTime: number
      /** Optional name/title for the soundbite (max 256 characters) */
      name?: string
      /** Optional media type (e.g. "audio", "video") */
      mediaType?: string
      /** Optional privacy settings for the soundbite. Values: "public", "team", "participants" */
      privacies?: Array<"public" | "team" | "participants">
      /** Optional summary text for the soundbite (max 500 characters) */
      summary?: string
    }
    /** Retrieve complete meeting transcript with full conversation, metadata, and insights for a specific meeting ID. Use this after search to get detailed content. */
    mcp__claude_ai_Fireflies__fireflies_fetch: {
      /** Meeting transcript ID obtained from search results */
      id: string
    }
    /** Retrieves a list of currently active (in-progress) meetings from Fireflies.ai. Returns meeting details including ID, title, organizer, meeting link, start/end time, privacy, and state. Admins can query active meetings for any user; regular users can only query their own. */
    mcp__claude_ai_Fireflies__fireflies_get_active_meetings: {
      /** Optional email address to filter active meetings by a specific user. Admins can query any team member; regular users can only use their own email or omit this field. */
      email?: string
      /** Optional array of meeting states to filter by. Possible values: "active" (currently in progress), "paused" (meeting has been paused). If omitted, returns meetings in both states. */
      states?: Array<"active" | "paused">
    }
    /** Retrieves team and per-user meeting and conversation analytics from Fireflies.ai. Returns meeting counts, durations, conversation metrics (filler words, questions, monologues, sentiment, talk-listen ratio, words per minute), and comparison data against previous periods. Accepts optional start_time and end_time filters in ISO 8601 format. Team-level analytics require admin privileges. */
    mcp__claude_ai_Fireflies__fireflies_get_analytics: {
      /** Optional start date/time filter in ISO 8601 format (e.g. "2024-01-01T00:00:00.000Z"). Limits analytics to meetings after this time. */
      startTime?: string
      /** Optional end date/time filter in ISO 8601 format (e.g. "2024-12-31T23:59:59.999Z"). Limits analytics to meetings before this time. */
      endTime?: string
    }
    /** Retrieves details of a specific channel/folder by its ID. Returns channel title, privacy setting, and member list. */
    mcp__claude_ai_Fireflies__fireflies_get_channel: {
      /** The ID of the channel to retrieve */
      channelId: string
    }
    /** Retrieves rule execution logs grouped by meeting. Shows which automation rules were triggered on meetings, including the actions taken (sharing, moving to channels, changing privacy). Requires Enterprise tier access. Results are paginated. */
    mcp__claude_ai_Fireflies__fireflies_get_rule_executions: {
      /** Filter by a specific rule ID */
      ruleId?: string
      /** Filter by a specific meeting ID */
      meetingId?: string
      /** Filter executions from this date (ISO 8601 format, e.g. 2024-01-01T00:00:00Z) */
      dateFrom?: string
      /** Filter executions up to this date (ISO 8601 format, e.g. 2024-12-31T23:59:59Z) */
      dateTo?: string
      /** Maximum number of meeting groups to return (default: 10, max: 50) */
      limit?: number
      /** Pagination cursor from a previous response to fetch the next page */
      cursor?: string
    }
    /** Fetches soundbites (short shareable audio/transcript clips from meetings). Can filter by transcript, ownership, or team. At least one of mine, transcript_id, or my_team must be provided. */
    mcp__claude_ai_Fireflies__fireflies_get_soundbites: {
      /** Optional transcript/meeting ID to get soundbites for a specific meeting */
      transcript_id?: string
      /** Optional filter to only include soundbites owned by the authenticated user */
      mine?: boolean
      /** Optional filter to include soundbites from the authenticated user's team */
      my_team?: boolean
      /** Optional limit for the number of soundbites to return (max 50) */
      limit?: number
      /** Optional number of soundbites to skip for pagination */
      skip?: number
      /** Optional response format: "toon" (default, token-efficient), "json" (standard JSON), or "text" (human-readable) */
      format?: "toon" | "json" | "text"
    }
    /** Fetches meeting summary by ID, with optional field filtering. Returns summary data (keywords, action items, overview, etc.) and basic metadata, but excludes transcript content. If you need transcript content, use fireflies_get_transcript instead. */
    mcp__claude_ai_Fireflies__fireflies_get_summary: {
      /** The meeting ID to fetch summary for */
      transcriptId: string
    }
    /** Fetches detailed meeting transcript by ID, with optional field filtering. Returns transcript content (sentences, speakers) and metadata, but excludes summary data. Each sentence is prefixed with its timestamp range (e.g. "[00:05 - 00:08] Speaker: text") so moments can be anchored back to the recording. To link a user directly to a moment in the meeting, convert the sentence start timestamp to seconds and build a deep link: https://app.fireflies.ai/view/{transcriptId}?t={seconds} (e.g. ?t=441.29 for 07:21). If you need summary data, use fireflies_get_summary instead. If the meeting is currently live (is_live: true), the transcript returned is a point-in-time snapshot of the live transcript with sentences captured so far. */
    mcp__claude_ai_Fireflies__fireflies_get_transcript: {
      /** The meeting ID to fetch */
      transcriptId: string
    }
    /** Queries multiple meeting transcripts using filter properties (date, keyword, email, etc.). Returns basic metadata and transcript summary. Does NOT accept transcriptId as input - use fireflies_get_transcript() multiple times to get detailed transcript content. Each result includes the meeting id, which can be linked as https://app.fireflies.ai/view/{id}; append ?t={seconds} (e.g. ?t=441.29) to deep-link to a specific moment in the recording. */
    mcp__claude_ai_Fireflies__fireflies_get_transcripts: {
      /** Optional keyword to search for in meeting content */
      keyword?: string
      /** Optional scope for keyword search: "title" (meeting titles only), "sentences" (transcript content), or "all" (both) */
      scope?: "title" | "sentences" | "all"
      /** Optional ISO 8601 date string (e.g., "2023-01-01") to filter meetings from this date */
      fromDate?: string
      /** Optional ISO 8601 date string (e.g., "2023-12-31") to filter meetings until this date */
      toDate?: string
      /** Optional date filter (deprecated) */
      date?: number
      /** Optional limit for the number of meetings to return (max 50) */
      limit?: number
      /** Optional number of meetings to skip for pagination */
      skip?: number
      /** Optional array of organizer email addresses to filter meetings (max 50) */
      organizers?: string[]
      /** Optional array of participant email addresses to filter meetings (max 50) */
      participants?: string[]
      /** Optional filter to only include meetings owned by the authenticated user */
      mine?: boolean
      /** Optional channel/folder ID to only include meetings in that channel. Use fireflies_list_channels() to find channel IDs. */
      channelId?: string
      /** Optional response format: "toon" (default, token-efficient), "json" (standard JSON), or "text" (human-readable) */
      format?: "toon" | "json" | "text"
    }
    /** Fetches user account details. Returns profile info, transcript counts, meeting activity, and admin status. If no user ID provided, returns current authenticated user data. */
    mcp__claude_ai_Fireflies__fireflies_get_user: {
      /** Optional user ID. If not provided, returns the current authenticated user's details. */
      userId?: string
    }
    /** Fetches contact list for the authenticated user. Returns contacts with their names, emails, profile pictures, and last meeting dates sorted by most recent interaction. */
    mcp__claude_ai_Fireflies__fireflies_get_user_contacts: {
      /** Optional response format: "toon" (default, token-efficient), "json" (standard JSON), or "text" (human-readable) */
      format?: "toon" | "json" | "text"
    }
    /** Fetches user groups for the authenticated user or their team. Returns group details including name, handle, and members. Use mine=true to get only groups the user belongs to, or mine=false (default) to get all groups in the team. */
    mcp__claude_ai_Fireflies__fireflies_get_usergroups: {
      /** Optional filter. If true, returns only groups the authenticated user belongs to. If false (default), returns all groups in the user's team. */
      mine?: boolean
    }
    /** Lists all channels/folders available to the authenticated user. Returns channel details including ID, title, privacy setting, and members. */
    mcp__claude_ai_Fireflies__fireflies_list_channels: {}
    /** Moves one or more meeting transcripts to a specified channel/folder. The authenticated user must be the owner of the meetings or a team admin. Up to 5 meeting IDs can be provided. */
    mcp__claude_ai_Fireflies__fireflies_move_meeting: {
      /** Array of meeting IDs / transcript IDs to move (max 5) */
      meetingIds: string[]
      /** The target channel/folder ID to move the meetings to */
      channelId: string
    }
    /** Revokes a previously shared meeting access for a specific email address. The authenticated user must be the owner of the meeting or a team admin. */
    mcp__claude_ai_Fireflies__fireflies_revoke_meeting_access: {
      /** The meetingId / transcriptId to revoke access from */
      meetingId: string
      /** The email address to revoke access for */
      email: string
    }
    /** Advanced search for meeting transcripts using a mini grammar. Supports complex queries with multiple filters. GRAMMAR SYNTAX: - keyword:"search term" - Search for keywords in the content. If no scope is specified, the default scope is 'all'. - scope:title|sentences|all - Define the search scope. Options are 'title', 'sentences', or 'all'. The default is 'all'. - from:YYYY-MM-DD - Filter meetings from this date (ISO format) - to:YYYY-MM-DD - Filter meetings until this date (ISO format) - limit:N - Limit results (max 50) - skip:N - Skip N results for pagination - organizers:email1@x.com,email2@x.com - Filter by organizer emails (comma-separated) - participants:email1@x.com,email2@x.com - Filter by participant emails (comma-separated) - mine:true|false - Filter to only include user's own meetings - channel:CHANNEL_ID - Filter meetings by channel/folder ID (use fireflies_list_channels() to find channel IDs) EXAMPLES: - "engineering standup" (simple keyword search) - "keyword:\"performance\" scope:sentences limit:20" - "channel:64f1a2b3c4d5e6f7a8b9c0d1 from:2026-01-01 limit:20" */
    mcp__claude_ai_Fireflies__fireflies_search: {
      /** Search query using the mini grammar syntax. Can be simple keywords or complex filters using the grammar. */
      query: string
      /** Optional response format: "toon" (default, token-efficient), "json" (standard JSON), or "text" (human-readable) */
      format?: "toon" | "json" | "text"
    }
    /** Shares a meeting transcript with specified email addresses. The authenticated user must be the owner of the meeting or a team admin. Up to 100 emails can be provided. Optionally set an expiry period for the shared access. */
    mcp__claude_ai_Fireflies__fireflies_share_meeting: {
      /** The meetingId / transcriptId to share */
      meetingId: string
      /** Array of email addresses to share the meeting with (max 100) */
      emails: string[]
      /** Optional expiry period in days for the shared access. Must be one of: 7, 14, 30 */
      expiryDays?: 7 | 14 | 30
    }
    /** Updates the privacy setting of a meeting transcript. The authenticated user must be the owner of the meeting or a team admin. Privacy options: "owner" (only the owner can view), "participants" (only meeting participants can view), "participatingteammates" (only participants who are teammates can view; beta, API/MCP only, not yet available in the dashboard), "teammates" (all teammates can view), "teammatesandparticipants" (teammates and participants can view), "link" (teammates and anyone with the link can view). */
    mcp__claude_ai_Fireflies__fireflies_update_meeting_privacy: {
      /** The meetingId / transcriptId to update privacy for */
      meetingId: string
      /** The privacy level to set. Options: "owner" (only owner), "participants" (meeting participants), "participatingteammates" (participants in the team; beta, API/MCP only), "teammates" (all teammates), "teammatesandparticipants" (teammates and participants), "link" (teammates and anyone with the link) */
      privacy: "link" | "owner" | "participants" | "participatingteammates" | "teammatesandparticipants" | "teammates"
    }
    /** Updates the title of a meeting transcript. The authenticated user must be the owner of the meeting or a team admin. The title must be between 5 and 256 characters. */
    mcp__claude_ai_Fireflies__fireflies_update_meeting_title: {
      /** The meeting ID / transcript ID to update */
      meetingId: string
      /** The new title for the meeting (5-256 characters) */
      title: string
    }
    /** Prefer `trash_message` or `mark_message_spam` instead. Adds a sensitive label (Trash or Spam) to a single message in the authenticated user's Gmail account. Use `apply_sensitive_message_label` when applying Trash or Spam to exactly 1 message. To apply sensitive labels to multiple messages, use `batch_apply_sensitive_message_labels` instead. If the message belongs to a thread that should be labeled as a whole, prefer `trash_thread` or `mark_thread_spam`. To find the message ID, use tools like `search_threads` or `get_thread`. To find the draft message ID, use tools like `list_drafts`. */
    mcp__claude_ai_Gmail__apply_sensitive_message_label: {
      /** Required. The sensitive label option to add. */
      labelOption: "LABEL_OPTION_UNSPECIFIED" | "TRASH" | "SPAM"
      /** Required. The ID of the message to add the label to. */
      messageId: string
    }
    /** Prefer `trash_thread` or `mark_thread_spam` instead. Adds a sensitive label (Trash or Spam) to a single thread in the authenticated user's Gmail account. This operation affects all messages currently in the thread. Use `apply_sensitive_thread_label` when applying Trash or Spam to exactly 1 thread. To apply sensitive labels to multiple threads, use `batch_apply_sensitive_thread_labels` instead. To find the thread ID, use the `search_threads` tool first. */
    mcp__claude_ai_Gmail__apply_sensitive_thread_label: {
      /** Required. The sensitive label option to add. */
      labelOption: "LABEL_OPTION_UNSPECIFIED" | "TRASH" | "SPAM"
      /** Required. The ID of the thread to add the label to. */
      threadId: string
    }
    /** Creates a new draft email in the authenticated user's Gmail account. This tool takes recipient addresses (`to`, `cc`, `bcc`), a `subject`, and body content as inputs. Plain text body content can be provided in `body` (do NOT format `body` with Markdown), and rich-text HTML content can be provided in `htmlBody` (use valid HTML tags for formatting; if both are provided, `body` serves as the plain-text alternative). If the draft is created as a reply to an existing message, the ID of the original message should be passed to the tool in the `replyToMessageId` field. Returns a Draft object with the `id`, `threadId`, and `viewUrl` fields populated. */
    mcp__claude_ai_Gmail__create_draft: {
      /** Optional. The attachments to include in the email. The combined size of attachments in the message cannot exceed 25MB. If you need to send files larger than 25MB, upload the file to Drive first and then insert the Drive link into `body` or `html_body`. */
      attachments?: Array<unknown /* $ref #/$defs/Attachment */>
      /** Optional. The blind carbon copy recipients of the email draft. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      bcc?: string[]
      /** Optional. The plain text body content of the email draft. Do NOT format this field with Markdown (such as headers `#`, bold `**`, bullet points `*`, or tables `|`). If formatted rich text is desired, use `html_body` instead. If `html_body` is also provided, this field is treated as the plain-text alternative. */
      body?: string
      /** Optional. The carbon copy recipients of the email draft. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      cc?: string[]
      /** Optional. The HTML content of the email draft. If provided, this will be used as the rich-text version of the email. Use this field (with valid HTML tags such as ` `, ` */
      htmlBody?: string
      /** Optional. The ID of the message to reply to. If provided, this will be used as the reply-to message ID for the email draft, and the `body` and `html_body` will be appended to the original message body. */
      replyToMessageId?: string
      /** Optional. The subject line of the email. Defaults to empty if not provided. */
      subject?: string
      /** Optional. The primary recipients of the email draft. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      to?: string[]
    }
    /** Creates a new label in the authenticated user's Gmail account. Supports creating nested labels (sub-labels) using a forward slash (e.g., 'Projects/Alpha/Sprint-1'). By default, parent labels will be automatically created if they do not exist. */
    mcp__claude_ai_Gmail__create_label: {
      /** Optional. Whether to automatically create parent labels for nested labels (separated by `/`). Defaults to `true`. When set to `true`, missing parent labels in the hierarchy (e.g., `Projects` and `Projects/Alpha` for `Projects/Alpha/Sprint-1`) are created automatically. When set to `false`, parent label auto-creation is disabled. */
      autoCreateParentLabels?: boolean
      /** Deprecated: Do not use. Use `color_preset` instead. Legacy field for raw text and background color hex strings. */
      color?: unknown /* $ref #/$defs/LabelColor */
      /** Optional. The color preset tile to assign to the new label. Select from predefined contrast-safe color options (e.g., LABEL_COLOR_PRESET_RED, LABEL_COLOR_PRESET_BLUE, LABEL_COLOR_PRESET_BLACK, LABEL_COLOR_PRESET_GREEN). If omitted, default label styling is applied. */
      colorPreset?: "LABEL_COLOR_PRESET_UNSPECIFIED" | "LABEL_COLOR_PRESET_BLACK" | "LABEL_COLOR_PRESET_DARK_GRAY" | "LABEL_COLOR_PRESET_GRAY" | "LABEL_COLOR_PRESET_LIGHT_GRAY" | "LABEL_COLOR_PRESET_WHITE" | "LABEL_COLOR_PRESET_RED" | "LABEL_COLOR_PRESET_ORANGE" | "LABEL_COLOR_PRESET_YELLOW" | "LABEL_COLOR_PRESET_GREEN" | "LABEL_COLOR_PRESET_MINT" | "LABEL_COLOR_PRESET_TEAL" | "LABEL_COLOR_PRESET_BLUE" | "LABEL_COLOR_PRESET_PURPLE" | "LABEL_COLOR_PRESET_PINK" | "LABEL_COLOR_PRESET_DARK_RED" | "LABEL_COLOR_PRESET_DARK_ORANGE" | "LABEL_COLOR_PRESET_DARK_GREEN" | "LABEL_COLOR_PRESET_DARK_BLUE" | "LABEL_COLOR_PRESET_DARK_PURPLE" | "LABEL_COLOR_PRESET_DARK_PINK" | "LABEL_COLOR_PRESET_BROWN"
      /** Required. The display name of the label to create. Supports nested label hierarchy using `/` (e.g., `Projects/Alpha/Sprint-1`). */
      displayName: string
      /** Optional. The visibility of the label in the label list in the Gmail web interface. Defaults to `LABEL_SHOW`. */
      labelListVisibility?: "LABEL_LIST_VISIBILITY_UNSPECIFIED" | "LABEL_SHOW" | "LABEL_SHOW_IF_UNREAD" | "LABEL_HIDE"
      /** Optional. The visibility of messages with this label in the message list in the Gmail web interface. Defaults to `SHOW`. */
      messageListVisibility?: "MESSAGE_LIST_VISIBILITY_UNSPECIFIED" | "SHOW" | "HIDE"
    }
    /** Deletes a draft email in the authenticated user's Gmail account using its draft ID. */
    mcp__claude_ai_Gmail__delete_draft: {
      /** Required. The unique identifier of the draft to delete. */
      draftId: string
    }
    /** Deletes a label in the authenticated user's Gmail account. */
    mcp__claude_ai_Gmail__delete_label: {
      /** Required. The ID of the label to delete. */
      labelId: string
    }
    /** Forwards a specific email message in the authenticated user's Gmail account. Optional comments can be added before the forwarded message using `forwardText` for plain text (do NOT format with Markdown) or `htmlBody` for rich HTML. Returns a Message object with the `id`, `threadId`, and `labelIds` fields populated. */
    mcp__claude_ai_Gmail__forward: {
      /** Optional. The blind carbon copy recipients of the email. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      bcc?: string[]
      /** Optional. The carbon copy recipients of the email. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      cc?: string[]
      /** Optional. Plain text comments to add before the forwarded message. Do NOT format this field with Markdown (such as headers `#`, bold `**`, bullet points `*`, or tables `|`). If formatted rich text is desired, use `html_body` instead. If `html_body` is also provided, this field is treated as the plain-text alternative. */
      forwardText?: string
      /** Optional. The HTML content of the comments to add before the forwarded message. If provided, this will be used as the rich-text version of the forward comments. Use this field (with valid HTML tags such as ` `, ` */
      htmlBody?: string
      /** Required. The unique identifier of the message to forward. A specific `message_id` is required to forward, which can be obtained by retrieving the thread via `get_thread`. */
      messageId: string
      /** Optional. The primary recipients of the email. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      to?: string[]
    }
    /** Retrieves a specific draft email from the authenticated user's Gmail account by ID, including its `viewUrl` for viewing and editing in the Gmail Web UI. The optional `messageFormat` parameter controls the format of the draft returned. Use `MINIMAL` to return snippet and key headers, `METADATA_ONLY` to exclude snippet, subject, and body, `FULL_CONTENT` for the complete draft, or `RAW` for the raw MIME message content. */
    mcp__claude_ai_Gmail__get_draft: {
      /** Required. The unique identifier of the draft to fetch. */
      draftId: string
      /** Optional. Specifies the format of the draft returned. Defaults to `FULL_CONTENT`. */
      messageFormat?: "MESSAGE_FORMAT_UNSPECIFIED" | "MINIMAL" | "FULL_CONTENT" | "METADATA_ONLY" | "PLAIN_TEXT" | "RAW"
    }
    /** Retrieves a specific email message from the authenticated user's Gmail account by its unique message ID, including its `viewUrl`. Use this tool to inspect a single, individual email when you already know its message ID. If the user wants to read a specific email in detail, check the exact wording of a message, or examine attachment metadata for a single email, this is the right tool. It is not suitable for retrieving entire conversations or viewing back-and-forth discussion threads; use the 'get_thread' tool instead. Note: This tool does not support retrieving draft messages. To view drafts, use the 'list_drafts' tool instead. Key indicators include if the user asks for the full content of a specific message ID returned by a previous search, or if the query asks to inspect a specific individual email rather than an entire thread. Example user prompts are: "Get the full text of message ID 18f123456789abcd.", "Read the latest message in that thread from Alice.", and "What are the attachment names in the email I just received from HR?" The optional `messageFormat` parameter controls the format of the message returned. By default (or with `FULL_CONTENT`), it returns the full content of the message. We recommend using `PLAIN_TEXT`, which returns the plain text body without the HTML body. Use `MINIMAL` to include only subject and snippet (excluding body). Use `METADATA_ONLY` to include only basic metadata (message ID, thread ID, viewUrl, labels, timestamp, and size estimate). */
    mcp__claude_ai_Gmail__get_message: {
      /** Optional. Specifies the format of the message returned. Defaults to `FULL_CONTENT`. We recommend using `PLAIN_TEXT` to prevent context exhaustion. */
      messageFormat?: "MESSAGE_FORMAT_UNSPECIFIED" | "MINIMAL" | "FULL_CONTENT" | "METADATA_ONLY" | "PLAIN_TEXT" | "RAW"
      /** Required. The unique identifier of the message to fetch. */
      messageId: string
    }
    /** Retrieves a specific email thread from the authenticated user's Gmail account, including its `viewUrl` and a list of its messages (each with their own `viewUrl`). Note: This tool does not support retrieving drafts. Any draft messages within a thread are omitted. To view drafts, use the `list_drafts` tool instead. The optional `messageFormat` parameter controls the format of the messages returned. By default (or with `FULL_CONTENT`), it returns the full content of messages. We recommend using `PLAIN_TEXT`, which returns the plain text body without the HTML body. Use `MINIMAL` to include only subject and snippet (excluding body). Use `METADATA_ONLY` to include only basic metadata (message ID, thread ID, viewUrl, labels, timestamp, and size estimate). */
    mcp__claude_ai_Gmail__get_thread: {
      /** Optional. Specifies the format of the messages returned within the thread. Defaults to `FULL_CONTENT`. We recommend using `PLAIN_TEXT` to prevent context exhaustion. Note: `MINIMAL` format returns `id`, `snippet`, `subject`, `sender`, `to_recipients`, `cc_recipients`, `bcc_recipients`, `date`, `label_ids`. `METADATA_ONLY` format returns `id`, `sender`, `to_recipients`, `cc_recipients`, `bcc_recipients`, `date`, `label_ids`. `FULL_CONTENT` returns `id`, `snippet`, `subject`, `sender`, `to_recipients`, `cc_recipients`, `bcc_recipients`, `date`, `label_ids`, `attachment_ids`, `plaintext_body`, `html_body`, `attachments`. `PLAIN_TEXT` returns `id`, `snippet`, `subject`, `sender`, `to_recipients`, `cc_recipients`, `bcc_recipients`, `date`, `label_ids`, `attachment_ids`, `plaintext_body`, `attachments` (without `html_body`). `RAW` format is not supported here. */
      messageFormat?: "MESSAGE_FORMAT_UNSPECIFIED" | "MINIMAL" | "FULL_CONTENT" | "METADATA_ONLY" | "PLAIN_TEXT" | "RAW"
      /** Required. The unique identifier of the thread to fetch. */
      threadId: string
    }
    /** Adds one or more labels to a specific message in the authenticated user's Gmail account. To find the message ID, use tools like `search_threads` or `get_thread`. If unsure of a user label's ID, use the `list_labels` tool first to discover available labels and their IDs. To move a specific message to Trash or mark it as Spam, please use the `trash_message` or `mark_message_spam` tool instead. */
    mcp__claude_ai_Gmail__label_message: {
      /** Required. The IDs of the labels to add. Can be a system label ID (e.g., `INBOX`, `STARRED`, `UNREAD`, `IMPORTANT`) or a user-defined label ID. The tool accepts `label_ids` and not label names. Use the `list_labels` tool to get the corresponding label id to a display name for user-defined labels. */
      labelIds: string[]
      /** Required. The ID of the message to add the labels to. */
      messageId: string
    }
    /** Adds labels to an entire thread in the authenticated user's Gmail account. This operation affects all messages currently in the thread and any future messages added to it. If unsure of the thread ID, use the `search_threads` tool first. If unsure of a user label's ID, use the `list_labels` tool first to discover available labels and their IDs. To move a thread to Trash or mark it as Spam, please use the `trash_thread` or `mark_thread_spam` tool instead. */
    mcp__claude_ai_Gmail__label_thread: {
      /** Required. The unique identifiers of the labels to add. Can be a system label ID (e.g., `INBOX`, `STARRED`, `UNREAD`, `IMPORTANT`) or a user-defined label ID. The tool accepts `label_ids` and not label names. Use the `list_labels` tool to get the corresponding label id to a display name for user-defined labels. */
      labelIds: string[]
      /** Required. The unique identifier of the thread to add labels to. */
      threadId: string
    }
    /** Lists draft emails from the authenticated user's Gmail account. This tool can filter drafts based on a query string and supports pagination. It returns a list of drafts, including their IDs, subjects (unless `view` is set to `DRAFT_VIEW_METADATA_ONLY`), and `viewUrl`. `page_token` can be used to paginate the results. To retrieve subsequent pages of results, use the `page_token` returned in the previous response. The `view` parameter controls which fields are populated in the response. By default (or with `DRAFT_VIEW_FULL`), it returns full content. Use `DRAFT_VIEW_METADATA_ONLY` to exclude sensitive content like subject and body. Note: An empty JSON object `{}` represents zero matching items, not an error. */
    mcp__claude_ai_Gmail__list_drafts: {
      /** Optional. The maximum number of drafts to return. If unspecified, defaults to 20. The maximum allowed value is 50. */
      pageSize?: number
      /** Optional. A token received from a previous `list_drafts` call to retrieve the next page of results. Leave empty to fetch the first page. This is primarily used for pagination to continue fetching results from where the previous `ListDraft` call left off, especially when the number of drafts matching the query exceeds the `page_size` limit. */
      pageToken?: string
      /** Examples: - `subject:OneMCP Update` - `from:gduser1@workspacesamples.dev` - `to:gduser2@workspacesamples.dev AND newer_than:7d` - `project proposal has:attachment` - `is:unread` A space or a dash (`-`) will separate a number while a dot (`.`) will be a decimal. For example, `01.2047-100` is considered two numbers: `01.2047` and `100`. Note: If we want to ensure all drafts for the query are returned, we can paginate the results by making repeated calls to the tool until the response contains an empty list of drafts. */
      query?: string
      /** Optional. Controls the fields populated for drafts in the draft list. Defaults to returning metadata only (`id`, `thread_id`, `to_recipients`, `cc_recipients`, `bcc_recipients`, `date`). Set to `DRAFT_VIEW_FULL` to include `subject` and `plaintext_body` content. */
      view?: "DRAFT_VIEW_UNSPECIFIED" | "DRAFT_VIEW_METADATA_ONLY" | "DRAFT_VIEW_FULL"
    }
    /** Lists all labels available in the authenticated user's Gmail account. Use this tool to discover the `id` of a label before calling `label_thread`, `unlabel_thread`, `label_message`, or `unlabel_message`. Note: the system labels, `DRAFT` and `SENT`, cannot be set on messages and are read only. Note: An empty JSON object `{}` represents zero matching items, not an error. */
    mcp__claude_ai_Gmail__list_labels: {}
    /** Marks a specific message as Spam in the authenticated user's Gmail account. To find the message ID, use tools like `search_threads` or `get_thread`. */
    mcp__claude_ai_Gmail__mark_message_spam: {
      /** Required. The ID of the message to mark as Spam. */
      messageId: string
    }
    /** Marks an entire thread as Spam in the authenticated user's Gmail account. This operation affects all messages currently in the thread. Use `mark_thread_spam` when marking a thread as spam, even if it currently contains only 1 message. Marking spam at the thread level ensures all current messages in the thread are marked as Spam. If unsure of the thread ID, use the `search_threads` tool first. */
    mcp__claude_ai_Gmail__mark_thread_spam: {
      /** Required. The ID of the thread to mark as Spam. */
      threadId: string
    }
    /** Replies to a specific email message in the authenticated user's Gmail account. Supports replying to only the sender or to all recipients (reply-all) via the `replyAll` parameter. Requires the `messageId` of the message to reply to. Plain text body content can be provided in `body` (do NOT format `body` with Markdown), and rich-text HTML content in `htmlBody` (use valid HTML tags). If `htmlBody` is not provided, then `body` is required. If `body` is not provided, then `htmlBody` is required. To reply to an existing thread, retrieve the thread via `get_thread` first to find the `messageId` of the latest message in that thread. Returns a Message object with the `id`, `threadId`, and `labelIds` fields populated. */
    mcp__claude_ai_Gmail__reply: {
      /** Optional. The blind carbon copy recipients of the email reply. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      bcc?: string[]
      /** Optional. The plain text body content of the reply. Do NOT format this field with Markdown (such as headers `#`, bold `**`, bullet points `*`, or tables `|`). If formatted rich text is desired, use `html_body` instead. If `html_body` is also provided, this field is treated as the plain-text alternative. If `html_body` is not provided, then `body` is required. */
      body?: string
      /** Optional. The carbon copy recipients of the email reply. If specified, overrides the default CC recipients. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      cc?: string[]
      /** Optional. The HTML content of the reply. If provided, this will be used as the rich-text version of the email. Use this field (with valid HTML tags such as ` `, ` */
      htmlBody?: string
      /** Required. The unique identifier of the message to reply to. If you want to reply to an existing thread, first retrieve the thread via `get_thread` to find the `message_id` of the last message in the thread. Pass that `message_id` here to ensure proper threading. */
      messageId: string
      /** Optional. Whether to reply to all recipients. Defaults to false. */
      replyAll?: boolean
      /** Optional. The primary recipients of the email reply. If specified, overrides the default reply recipients. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      to?: string[]
    }
    /** Lists email threads from the authenticated user's Gmail account. This tool can filter threads based on a query string and supports pagination. It returns a list of threads, including their IDs, `viewUrl`, and related messages (each with their own `viewUrl`). Each related message contains details like a snippet of the message body, the subject, the sender, the recipients etc. The `view` parameter controls which fields are populated in the related messages. By default (or with `THREAD_VIEW_MINIMAL`), it includes subject and snippet. Use `THREAD_VIEW_METADATA_ONLY` to exclude subject and snippet. Note that the full message bodies are not returned by this tool; use the 'get_thread' tool with a thread ID to fetch the full message body if needed. Threads with excluded criteria may still appear in the results. This occurs because Gmail identifies matching messages first. For example, if you search for -is:starred, Gmail will find an entire thread if it contains at least one unstarred message, even if other emails in that same conversation are starred. Note: An empty JSON object `{}` represents zero matching items, not an error. */
    mcp__claude_ai_Gmail__search_threads: {
      /** Optional. Include threads from TRASH in the results. Defaults to false. */
      includeTrash?: boolean
      /** Optional. The maximum number of threads to return. If unspecified, defaults to 20. The maximum allowed value is 50. */
      pageSize?: number
      /** Optional. Page token to retrieve a specific page of results in the list. Leave empty to fetch the first page. This is primarily used for pagination to continue fetching results from where the previous `SearchThreads` call left off, especially when the number of threads matching the query exceeds the `page_size` limit. */
      pageToken?: string
      /** Optional. A query string to filter the threads. Natural language queries must be pre-converted into Gmail syntax queries to use this tool. If omitted, all threads (excluding spam and trash by default) are listed. Supported Operators by Category: Sender & Recipient: - `from:` — Sent from a specific person. - `to:` — Sent to a specific person. - `cc:` — Specific people in Cc. - `bcc:` — Specific people in Bcc. - `deliveredto:` — Delivered to a specific address. - `list:` — From a specific mailing list. Time & Date: - `after:YYYY/MM/DD` / `newer:YYYY/MM/DD` — Received after a date. - `before:YYYY/MM/DD` / `older:YYYY/MM/DD` — Received before a date. - `older_than:` — Older than a duration (for example, `1y`, `2d`). - `newer_than:` — Newer than a duration. Content: - `subject:` — Words in the subject line. - `has:` — Has specific content types (attachment, drive, youtube, document). - `filename:` — Attachment with a specific name or type. - `""` — Search for an exact word or phrase. (for example, `"holiday"`, `"holiday vacation"`). Note: Double quotes enforce strict contiguous phrase matching. For topic, discussion, or keyword queries, prefer unquoted keywords (e.g. `partner advertising` instead of `"partner advertising"`). - `+` — Match a word exactly. (for example, `+holiday`, `+unicorn`) - `rfc822msgid:` — Specific message ID header. - `AROUND ` — Find words near each other (for example, `holiday AROUND 10 vacation`). Labels & Categories: - `label:` — Under a specific label. The tool accepts label IDs, not display names. Use the `list_labels` tool to get the ID. - `category:` — In a category (primary, social, promotions, updates, forums, reservations, purchases). - `in:` — Search in specific labels (archive, snoozed, trash, sent, inbox). For example, `in:trash`, `in:inbox`. Archived and sent messages are included by default; use `-in:archive` and `-in:sent` to exclude them. Drafts are explicitly excluded by default by the tool. Use `in:inbox` to restrict search to the inbox only. - `has:userlabels` — Has any user labels. - `has:nouserlabels` — Does not have any user labels. - `has:*-star` — Specific star colors (if enabled, for example, `has:yellow-star`). - `in:draft` — Search in drafts. -in:draft means exclude drafts from the search results. - `in:sent` — Search in sent messages. - `in:anywhere` — Search in all folders (including spam and trash). Status: - `is:` — Search by status (important, starred, unread, read, muted). Size: - `size:` — Specific size in bytes. - `larger:` / `smaller:` — Larger or smaller than a size (for example, `10M` for 10 MB). Logic & Grouping: - `AND` — Match all criteria (default behavior). - `OR` or `{ }` — Match one or more criteria (for example, `from:amy OR from:david`, `{from:amy from:david}`). - `-` (minus) — Exclude criteria (for example, `-movie`). - `( )` — Group multiple search terms (for example, `subject:(dinner film)`). Examples: - `subject:OneMCP Update` - `from:user@example.com` - `to:user2@example.com AND newer_than:7d` - `project proposal has:attachment` - `is:unread -in:draft` To prevent overly strict queries, favor concise, keyword-based queries over long subject strings or full sentences. Avoid copying overly detailed subjects from the user prompt verbatim, as this often leads to search misses. Instead, extract the most unique keywords (e.g., subject:amazon \"delivery\" OR \"order\" instead of \"amazon order\"). Use boolean operators to broaden your search coverage. Use OR to search for synonyms or multiple potential senders, and use ( ) for grouping criteria. Note that whitespace between terms acts as an implicit AND. */
      query?: string
      /** Optional. Controls the fields populated for threads in the thread list. Defaults to `THREAD_VIEW_MINIMAL`. `THREAD_VIEW_MINIMAL` returns `id`, `snippet`, `subject`, `sender`, `to_recipients`, `cc_recipients`, `bcc_recipients`, `date`, `label_ids`. `THREAD_VIEW_METADATA_ONLY` returns `id`, `sender`, `to_recipients`, `cc_recipients`, `bcc_recipients`, `date`, `label_ids`. */
      view?: "THREAD_VIEW_UNSPECIFIED" | "THREAD_VIEW_METADATA_ONLY" | "THREAD_VIEW_MINIMAL"
    }
    /** Sends a new email message immediately from the authenticated user's Gmail account. To send an existing draft message, provide the `draftId`. To send a new message, provide recipients in `to`, `cc`, or `bcc`, a `subject`, and message content in `body` or `htmlBody` (plain text in `body`, rich HTML in `htmlBody`; do NOT format `body` with Markdown). To thread the message under an existing thread or conversation, provide `replyThreadId` (preferred for send-only clients) or `replyToMessageId`. If sending a new message, attachments can be included via the `attachments` field, but the combined size cannot exceed 25MB. Returns a Message object with the `id`, `threadId`, and `labelIds` fields populated. */
    mcp__claude_ai_Gmail__send_message: {
      /** Optional. The attachments to include in the email. The combined size of attachments in the message cannot exceed 25MB. If you need to send files larger than 25MB, upload the file to Drive first and then insert the Drive link into `body` or `html_body`. */
      attachments?: Array<unknown /* $ref #/$defs/Attachment */>
      /** Optional. The blind carbon copy recipients of the email. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      bcc?: string[]
      /** Optional. The plain text body content of the email. Do NOT format this field with Markdown (such as headers `#`, bold `**`, bullet points `*`, or tables `|`). If formatted rich text is desired, use `html_body` instead. If `html_body` is also provided, this field is treated as the plain-text alternative. */
      body?: string
      /** Optional. The carbon copy recipients of the email. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      cc?: string[]
      /** Optional. The unique identifier of an existing draft to send. If provided, the other fields (`to`, `cc`, `bcc`, `subject`, `body`, `html_body`) are ignored, and the specified draft is sent as is. */
      draftId?: string
      /** Optional. The HTML content of the email. If provided, this will be used as the rich-text version of the email. Use this field (with valid HTML tags such as ` `, ` */
      htmlBody?: string
      /** Optional. The unique identifier of the thread to send this message in. If provided, the sent message will be threaded under the specified thread. Compatible with all scopes including send-only (gmail.send). */
      replyThreadId?: string
      /** Optional. The unique identifier of the message to reply to. If provided, this message will be threaded in reply to the specified message. Note: Resolving a message by ID requires read permissions (e.g., 'gmail.modify' or 'gmail.compose'). If the caller only has send-only permissions ('gmail.send'), use `reply_thread_id` instead. */
      replyToMessageId?: string
      /** Optional. The subject line of the email. */
      subject?: string
      /** Optional. The primary recipients of the email. Required if `draft_id` is not provided. Each string MUST be a valid plain email address (e.g., "user@example.com"). */
      to?: string[]
    }
    /** Moves a specific message to the Trash in the authenticated user's Gmail account. Use `trash_message` when targeting a specific message within a thread. To trash an entire thread or a single-message thread, prefer `trash_thread`. To find the message ID, use tools like `search_threads` or `get_thread`. To find the draft message ID, use tools like `list_drafts`. */
    mcp__claude_ai_Gmail__trash_message: {
      /** Required. The ID of the message to move to Trash. */
      messageId: string
    }
    /** Moves an entire thread to the Trash in the authenticated user's Gmail account. This operation affects all messages currently in the thread. Use `trash_thread` when trashing a thread, even if it currently contains only 1 message. Trashing at the thread level ensures all current messages in the thread are moved to Trash. If unsure of the thread ID, use the `search_threads` tool first. */
    mcp__claude_ai_Gmail__trash_thread: {
      /** Required. The ID of the thread to move to Trash. */
      threadId: string
    }
    /** Removes one or more labels from a specific message in the authenticated user's Gmail account. To find the message ID, use tools like `search_threads` or `get_thread`. If unsure of a user label's ID, use the `list_labels` tool first to discover available labels and their IDs. */
    mcp__claude_ai_Gmail__unlabel_message: {
      /** Required. The IDs of the labels to remove. Can be a system label ID (e.g., `INBOX`, `TRASH`, `SPAM`, `STARRED`, `UNREAD`, `IMPORTANT`) or a user-defined label ID. The tool accepts `label_ids` and not label names. Use the `list_labels` tool to get the corresponding label id to a display name for user-defined labels. */
      labelIds: string[]
      /** Required. The ID of the message to remove the labels from. */
      messageId: string
    }
    /** Removes labels from an entire thread in the authenticated user's Gmail account. If unsure of the thread ID, use the `search_threads` tool first. If unsure of a user label's ID, use the `list_labels` tool first. */
    mcp__claude_ai_Gmail__unlabel_thread: {
      /** Required. The unique identifiers of the labels to remove. Can be a system label ID (e.g., `INBOX`, `TRASH`, `SPAM`, `STARRED`, `UNREAD`, `IMPORTANT`) or a user-defined label ID. The tool accepts `label_ids` and not label names. Use the `list_labels` tool to get the corresponding label id to a display name for user-defined labels. */
      labelIds: string[]
      /** Required. The unique identifier of the thread to remove labels from. */
      threadId: string
    }
    /** Unmarks a specific message as Spam in the authenticated user's Gmail account. To find the message ID, use tools like `search_threads` or `get_thread`. */
    mcp__claude_ai_Gmail__unmark_message_spam: {
      /** Required. The ID of the message to unmark as Spam. */
      messageId: string
    }
    /** Unmarks an entire thread as Spam in the authenticated user's Gmail account. If unsure of the thread ID, use the `search_threads` tool first. */
    mcp__claude_ai_Gmail__unmark_thread_spam: {
      /** Required. The ID of the thread to unmark as Spam. */
      threadId: string
    }
    /** Removes a specific message from the Trash in the authenticated user's Gmail account. To find the message ID, use tools like `search_threads` or `get_thread`. */
    mcp__claude_ai_Gmail__untrash_message: {
      /** Required. The ID of the message to remove from Trash. */
      messageId: string
    }
    /** Removes an entire thread from the Trash in the authenticated user's Gmail account. If unsure of the thread ID, use the `search_threads` tool first. */
    mcp__claude_ai_Gmail__untrash_thread: {
      /** Required. The ID of the thread to remove from Trash. */
      threadId: string
    }
    /** Updates an existing draft email in the authenticated user's Gmail account. This operation supports merge semantics: fields provided in the request (non-empty) will overwrite the corresponding fields in the draft, while omitted (or empty) fields will preserve their existing values. Plain text body content can be provided in `body` (do NOT format `body` with Markdown), and rich-text HTML content can be provided in `htmlBody` (use valid HTML tags for formatting; if only one is provided, the other is cleared to keep content in sync). WARNING: Attachments are NOT merged. If the draft contains attachments, they will be removed unless they are explicitly re-provided in the `attachments` field of this request. Returns a Draft object with the `id`, `threadId`, and `viewUrl` fields populated. */
    mcp__claude_ai_Gmail__update_draft: {
      /** Optional. The attachments to include in the email. The combined size of attachments in the message cannot exceed 25MB. If you need to send files larger than 25MB, upload the file to Drive first and then insert the Drive link into `body` or `html_body`. If omitted or empty, any existing attachments on the draft will be removed. */
      attachments?: Array<unknown /* $ref #/$defs/Attachment */>
      /** Optional. The blind carbon copy recipients of the email draft. Each string MUST be a valid plain email address (e.g., "user@example.com"). If omitted or empty, the existing recipients are preserved. */
      bcc?: string[]
      /** Optional. The plain text body content of the email draft. Do NOT format this field with Markdown (such as headers `#`, bold `**`, bullet points `*`, or tables `|`). If formatted rich text is desired, use `html_body` instead. If `html_body` is also provided, this field is treated as the plain-text alternative. If both `body` and `html_body` are omitted or empty, the existing body is preserved. If `body` is provided but `html_body` is omitted, the body will be updated to plain text and the existing HTML body will be cleared. */
      body?: string
      /** Optional. The carbon copy recipients of the email draft. Each string MUST be a valid plain email address (e.g., "user@example.com"). If omitted or empty, the existing recipients are preserved. */
      cc?: string[]
      /** Required. The unique identifier of the draft to update. */
      draftId: string
      /** Optional. The HTML content of the email draft. If provided, this will be used as the rich-text version of the email. Use this field (with valid HTML tags such as ` `, ` */
      htmlBody?: string
      /** Optional. The subject line of the email. If omitted or empty, the existing subject is preserved. */
      subject?: string
      /** Optional. The primary recipients of the email draft. Each string MUST be a valid plain email address (e.g., "user@example.com"). If omitted or empty, the existing recipients are preserved. */
      to?: string[]
    }
    /** Modifies an existing label's name and color in the user's Gmail account. */
    mcp__claude_ai_Gmail__update_label: {
      /** Deprecated: Do not use. Use `color_preset` instead. Legacy field for raw text and background color hex strings. */
      color?: unknown /* $ref #/$defs/LabelColor */
      /** Optional. The new color preset tile to assign to the label. Select from predefined contrast-safe color options (e.g., LABEL_COLOR_PRESET_RED, LABEL_COLOR_PRESET_BLUE, LABEL_COLOR_PRESET_BLACK, LABEL_COLOR_PRESET_GREEN). If omitted, existing label color is preserved. */
      colorPreset?: "LABEL_COLOR_PRESET_UNSPECIFIED" | "LABEL_COLOR_PRESET_BLACK" | "LABEL_COLOR_PRESET_DARK_GRAY" | "LABEL_COLOR_PRESET_GRAY" | "LABEL_COLOR_PRESET_LIGHT_GRAY" | "LABEL_COLOR_PRESET_WHITE" | "LABEL_COLOR_PRESET_RED" | "LABEL_COLOR_PRESET_ORANGE" | "LABEL_COLOR_PRESET_YELLOW" | "LABEL_COLOR_PRESET_GREEN" | "LABEL_COLOR_PRESET_MINT" | "LABEL_COLOR_PRESET_TEAL" | "LABEL_COLOR_PRESET_BLUE" | "LABEL_COLOR_PRESET_PURPLE" | "LABEL_COLOR_PRESET_PINK" | "LABEL_COLOR_PRESET_DARK_RED" | "LABEL_COLOR_PRESET_DARK_ORANGE" | "LABEL_COLOR_PRESET_DARK_GREEN" | "LABEL_COLOR_PRESET_DARK_BLUE" | "LABEL_COLOR_PRESET_DARK_PURPLE" | "LABEL_COLOR_PRESET_DARK_PINK" | "LABEL_COLOR_PRESET_BROWN"
      /** Optional. The human-readable display name of the label. */
      displayName?: string
      /** Required. The unique identifier of the label to modify. Use the `list_labels` tool to get the corresponding label id to a display name for user-defined labels. */
      labelId: string
      /** Optional. The new visibility of the label in the label list in the Gmail web interface. */
      labelListVisibility?: "LABEL_LIST_VISIBILITY_UNSPECIFIED" | "LABEL_SHOW" | "LABEL_SHOW_IF_UNREAD" | "LABEL_HIDE"
      /** Optional. The new visibility of messages with this label in the message list in the Gmail web interface. */
      messageListVisibility?: "MESSAGE_LIST_VISIBILITY_UNSPECIFIED" | "SHOW" | "HIDE"
    }
    /** Atomically adds and/or removes labels from a specific message in the authenticated user's Gmail account. Requires at least one of `addLabelIds` or `removeLabelIds` to be provided. Moving an email between labels can be accomplished in a single call by specifying the target label in `addLabelIds` and the current label in `removeLabelIds`. */
    mcp__claude_ai_Gmail__update_message_labels: {
      /** Optional. The IDs of the labels to add. Can be a system label ID (e.g., `INBOX`, `STARRED`, `UNREAD`, `IMPORTANT`) or a user-defined label ID. */
      addLabelIds?: string[]
      /** Required. The ID of the message to modify labels for. */
      messageId: string
      /** Optional. The IDs of the labels to remove. Can be a system label ID or a user-defined label ID. */
      removeLabelIds?: string[]
    }
    /** Call this tool to copy an existing File in Google Drive. The tool allows specifying a new title and a parent folder for the copy. If the title is not specified, the copy title will be 'Copy of {original title}'. If the parent folder is not specified, the copy will be created in the same folder as the original file, unless the requesting user does not have write access to that folder, in which case the copy will be created in the user's root folder.Returns the newly created File object upon successful copying. */
    mcp__claude_ai_Google_Drive__copy_file: {
      /** Required. The ID of the file to copy. */
      fileId: string
      /** The parent id of the newly created file. If empty, the file will be created with the same parent as the original file. */
      parentId?: string
      /** The title of the newly created file. If empty, the title will be 'Copy of {original file title}'. */
      title?: string
    }
    /** Call this tool to create or upload a File to Google Drive. If uploading content, prefer `textContent` for text content. For non-UTF8 contents, use the `base64Content` field and base64 encode the data to set on that field. Returns a single File object upon successful creation. The following Google first-party mime types can be created without providing content: - `application/vnd.google-apps.document` - `application/vnd.google-apps.spreadsheet` - `application/vnd.google-apps.presentation` Folders can be created by setting the mime type to `application/vnd.google-apps.folder`. When uploading content, the `contentMimeType` field is required and should match the type of the content being uploaded. By default, supported content will be converted to Google first-party mime types. To disable conversions for first-party mime types, set `disableConversionToGoogleType` to true. */
    mcp__claude_ai_Google_Drive__create_file: {
      /** Optional. The base64 encoded content to upload. It's an error to set this and `textContent`. */
      base64Content?: string
      /** Deprecated: Use `base64Content` or `textContent` instead. The content of the file encoded as base64. The content field should always be base64 encoded regardless of the mime type of the file. */
      content?: string
      /** The mime type of the content being uploaded. Required when any type of content is provided. */
      contentMimeType?: string
      /** Set to true to retain the passed in content mime type and not convert to a Google type. For example, without this a `text/plain` content mime type will be converted to to `application/vnd.google-apps.document`. Has no effect for types that do not have a Google equivalent. */
      disableConversionToGoogleType?: boolean
      /** Deprecated: DO NOT USE!! Set `contentMimeType` instead. */
      mimeType?: string
      /** The parent id of the file. */
      parentId?: string
      /** Optional. The (UTF-8) text content to upload. It's an error to set this and `base64Content`. */
      textContent?: string
      /** Required. The title of the file. */
      title: string
    }
    /** Call this tool to download the content of a Drive file as a base64 encoded string. If the file is a Google Drive first-party mime type, the `exportMimeType` field specifies the desired export mime type. When the field is unset, defaults to plain text types (e.g. `text/plain`, `text/csv`). If the file is not found, try using other tools like `search_files` to find the file the user is requesting. If the user wants a natural language representation of their Drive content, use the `read_file_content` tool (`read_file_content` should be smaller and easier to parse). */
    mcp__claude_ai_Google_Drive__download_file_content: {
      /** Optional. For Google native files, the MIME type to export the file to, ignored otherwise. Defaults to text if not specified. */
      exportMimeType?: string
      /** Required. The ID of the file to retrieve. */
      fileId: string
      /** Optional. The revision id for the version of the file to download. If not specified, the latest revision will be downloaded. */
      revisionId?: string
    }
    /** Call this tool to find general metadata about a user's Drive file. Context window token management can be tuned via `snippetVerbosity` (default is `SnippetVerbosity.DETAILED`) or if only metadata is needed, use `excludeContentSnippets`. If the file is not found, try using other tools like `search_files` to find the file the user is requesting. */
    mcp__claude_ai_Google_Drive__get_file_metadata: {
      /** If true, the content snippet will be excluded from the response. */
      excludeContentSnippets?: boolean
      /** Required. The ID of the file to retrieve. */
      fileId: string
      /** Optional. Set to specify how verbose the snippets should be. Defaults to DETAILED if not set. */
      snippetVerbosity?: "UNSPECIFIED" | "BRIEF" | "MEDIUM" | "DETAILED" | "MAX_ALLOWED"
    }
    /** Call this tool to list the permissions of a Drive File. */
    mcp__claude_ai_Google_Drive__get_file_permissions: {
      /** Required. The ID of the file to get permissions for. */
      fileId: string
    }
    /** Call this tool to find recent files for a user specified a sort order. Default sort order is `recency` if orderBy is not set or set to an unsupported value. Context window token management can be tuned via `snippetVerbosity` (default is `SnippetVerbosity.DETAILED`) or if only metadata is needed, use `excludeContentSnippets`. Supported sort orders are: - `recency`: The most recent timestamp from the file's date-time fields. - `lastModified`: The last time the file was modified by anyone. - `lastModifiedByMe`: The last time the file was modified by the user. The default page size is 10. Utilize `next_page_token` to paginate through the results. */
    mcp__claude_ai_Google_Drive__list_recent_files: {
      /** If true, the content snippet will be excluded from the response. */
      excludeContentSnippets?: boolean
      /** The sort order for the files. */
      orderBy?: string
      /** The maximum number of files to return. */
      pageSize?: number
      /** The page token to use for pagination. */
      pageToken?: string
      /** Optional. Set to specify how verbose the snippets should be. Defaults to DETAILED if not set. */
      snippetVerbosity?: "UNSPECIFIED" | "BRIEF" | "MEDIUM" | "DETAILED" | "MAX_ALLOWED"
    }
    /** Call this tool to fetch a natural language representation of a known Drive file, and if specified, its comments. REQUIREMENTS & WORKFLOW: - `fileId` is required. You MUST pass an exact Drive file ID returned by a previous discovery tool (`search_files` or `list_recent_files`) or provided explicitly in the user prompt. - NEVER guess, invent, or hallucinate a `fileId` string from a file title or name. - If given a file title, name, or topic without an explicit `fileId`, you MUST FIRST call `search_files` to find the file and retrieve its `fileId` before invoking this tool. The file content may be incomplete for very large files. The text representation will change over time, so don't make assumptions about the particular format of the text returned by this tool. If supported and specified, comment tags will be included in the content. Supported Mime Types: - `application/vnd.google-apps.document` (supports comments) - `application/vnd.google-apps.presentation` (supports comments) - `application/vnd.google-apps.spreadsheet` (supports comments) - `application/pdf` - `application/msword` - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` - `application/vnd.openxmlformats-officedocument.presentationml.presentation` - `application/vnd.oasis.opendocument.spreadsheet` - `application/vnd.oasis.opendocument.presentation` - `application/x-vnd.oasis.opendocument.text` - `image/png` - `image/jpeg` - `image/jpg` If the file is not found, try using other tools like `search_files` to find the file the user is requesting using keywords. */
    mcp__claude_ai_Google_Drive__read_file_content: {
      /** Required. The ID of the file to retrieve. */
      fileId: string
      /** Whether to include comments in the response. Comments will be inlined in the text content of the file with a mapping to the comment threads. Note: Comments are only supported for Google Docs, Slides, and Sheets. */
      includeComments?: boolean
    }
    /** Search for Drive files using a structured query (syntax: `query_term operator values`). Only terms in this list are supported. Combine clauses with `and`, `or`, `not`, and parentheses. String values must be single-quoted; escape embedded quotes as `\'`. Context window token management can be tuned via `snippetVerbosity` (default is `SnippetVerbosity.DETAILED`) or if only metadata is needed, use `excludeContentSnippets`. Do NOT include document type terms (e.g., 'presentation', 'slides', 'deck', 'document', 'doc', 'spreadsheet', 'sheet', 'pdf', 'folder') inside `title contains '...'` or `fullText contains '...'` clauses. Separate title keywords from file type terms. Instead map them to `mimeType` clauses in the query (e.g., 'slides' -> `mimeType = 'application/vnd.google-apps.presentation'`). Query terms & operators: - `title` (ops: contains, =, !=) — file title - `fullText` (ops: contains) — title or body text - `mimeType` (ops: contains, =, !=) — MIME type - `modifiedTime`, `viewedByMeTime`, `createdTime` (ops: `<=`, `<`, `=`, `!=`, `>`, `>=`). Use RFC 3339 UTC, e.g., `2012-06-04T12:00:00-08:00`. Date types not comparable. - `parentId` (ops: `=`, `!=`). Use `'root'` for the user's "My Drive". - `owner` (ops: `=`, `!=`). Use `'me'` for the requesting user. - `sharedWithMe` (ops: `=`, `!=`). Values: `true` or `false`. Other operators: `and`, `or`, `not`. Examples: - `title contains 'hello' and title contains 'goodbye'` - `modifiedTime > '2024-01-01T00:00:00Z' and (mimeType contains 'image/' or mimeType contains 'video/')` - `parentId = '1234567'` - `fullText contains 'hello'` - `owner = 'test@example.org'` - `sharedWithMe = true` - `owner = 'me'` (for files owned by the user) Use `next_page_token` to paginate. An empty response means no more results. */
    mcp__claude_ai_Google_Drive__search_files: {
      /** If true, the content snippet will be excluded from the response. */
      excludeContentSnippets?: boolean
      /** The maximum number of files to return in each page. */
      pageSize?: number
      /** The page token to use for pagination. */
      pageToken?: string
      /** The search query. */
      query?: string
      /** Optional. Set to specify how verbose the snippets should be. Defaults to DETAILED if not set. */
      snippetVerbosity?: "UNSPECIFIED" | "BRIEF" | "MEDIUM" | "DETAILED" | "MAX_ALLOWED"
    }
    /** Call this tool to share a Google Drive file with a user or group. If the user or group already has permission to the file, this tool will update their permission level to match the role in this request, if the new role is higher than their current role. */
    mcp__claude_ai_Google_Drive__share_file: {
      /** Required. The email address of the user or group to share with. */
      emailAddress: string
      /** Required. The ID of the file to share. */
      fileId: string
      /** Required. The role to grant. Supported roles (in descending order of access level): * `writer` * `commenter` * `reader` */
      role: string
    }
    /** Moves a Google Drive file to the user's trash. It does not permanently delete the file.Returns an empty response upon successful completion. */
    mcp__claude_ai_Google_Drive__trash_file: {
      /** Required. The ID of the file to trash. */
      fileId: string
    }
    /** Call this tool to update the metadata of a Google Drive file. If the file is not found, try using other tools like `search_files` to find the file the user is attempting to update. For moving files, use `search_files` to identify the destination parent id. */
    mcp__claude_ai_Google_Drive__update_file: {
      /** Required. The ID of the file to update. */
      fileId: string
      /** The updated parent id of the file. If the file has an existing parent, it will be replaced, resulting in a folder move. If provided, must not be empty. */
      parentId?: string
      /** The updated title of the file. If provided, must not be empty. */
      title?: string
    }
    /** Jev, a small fast model, reads files so you don't have to: you get a label and a probability, never the files' text. Use it when you would read files only to judge them. question "failure": why a test, build or CI run failed, from its saved output: bug, wrong_test, flaky, environment, passed or other. Save long output to a file first (cmd > "$TMPDIR/run.log" 2>&1) and pass that; a note on what you changed helps tell bug from wrong_test. question "relevant": which of many files concern a topic, before you open any; directories are walked, up to 100 files. It judges and does not explain: a root cause, an exact string (grep) or code you will edit (Read) are not for it. When it answers "unsure", read the file yourself. It sends the files to TypeSafe's API: never pass files with secrets or private data (files that look like secrets are refused). */
    "mcp__jev-files__ask_jev_files": {
      /** failure: why a run failed. relevant: which files concern `topic` */
      question: "failure" | "relevant"
      /** Files or directories, relative to the working directory or absolute */
      paths: string[]
      /** relevant: what the files should concern, e.g. "the proration bug in billing" */
      topic?: string
      /** failure: what you changed before the run, in a sentence or two */
      note?: string
    }
    /** Use it before telling the user you no longer have a detail from earlier in this session, or that it was never shown: a summary that does not show a tool's full output is not evidence that the output is lost. Use it too whenever the summary lacks a detail you need: exact text, a tool's output, a quote, what happened when. It searches, reads and outlines this session's full transcript, which keeps every message and tool output whole: what compaction removed from context and the transcripts this session was resumed or moved from, optionally its subagents. Search first: its excerpts, the best lines of each matching block, usually answer, and it names query terms that occur nowhere, so do not search again to confirm an absence. Read a block only when its excerpt is not enough, and only the lines you need. Outline only to orient, one page. Stop as soon as you have the answer. */
    "mcp__observational-memory__om_recall": {
      /** Words, all of which must appear (failing that, blocks holding some, rarest first), "quoted phrases" or /regex/flags to find, e.g. a file name, an error, a marker; with files, part of a path */
      query?: string
      /** Default: search with a query; read with a ref alone, like a79f045b:2133: a block, a page of lines at a time; else outline: a line per message or tool call. files: the files the session read, edited or wrote, each with the blocks that touched it */
      mode?: "search" | "read" | "outline" | "files"
      /** A block reference from a search or outline, to read; a subagent reference, to outline its transcript */
      ref?: string
      /** Lines of the block to read, e.g. "1-200" or "201-" (read) */
      lines?: string
      /** Blocks before the read one to show too, at most 5 (read) */
      before?: number
      /** Blocks after the read one to show too, at most 5 (read) */
      after?: number
      /** Range start: a reference, "HH:MM" or "YYYY-MM-DD HH:MM" (outline, search) */
      from?: string
      /** Range end, inclusive, the same forms (outline, search) */
      to?: string
      /** Most search matches to return (default and most 20) */
      limit?: number
      /** Search the subagents' transcripts too (default false) */
      subagents?: boolean
    }
    /** observational-memory's usage statistics, for this session or all sessions: by default a short summary in plain words (cost, compactions and how many were instant, memory size, background observations, problems); with full, every metric with its count, sum, mean, median, p90, min and max. Use it when the user asks for them. */
    "mcp__observational-memory__om_stats": {
      /** This session (default) or every session */
      scope?: "session" | "all"
      /** Another session to report on */
      sessionId?: string
      /** Only what happened after this: 7d, 12h, or an ISO date */
      since?: string
      /** Every metric in a table instead of the summary (default false) */
      full?: boolean
    }
  }
}
