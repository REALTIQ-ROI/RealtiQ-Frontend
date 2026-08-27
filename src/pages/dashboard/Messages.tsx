import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import PortalShell from '../../components/phase2/PortalShell';
import { useRealtime } from '../../contexts/RealtimeContext';
import { useAuth } from '../../contexts/AuthContext';
import { messageService } from '../../services/messageService';
import type { ReportReason, StagedAttachment } from '../../types';
import { removeAccidentalRetryDuplicates } from '../../utils/messageDeduplication';

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const fileSize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const initials = (name?: string) => (name || 'Property').split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase();

export default function Messages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const realtime = useRealtime();
  const { openConversation, closeConversation, markRead } = realtime;
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [upload, setUpload] = useState<StagedAttachment | null>(null);
  const [progress, setProgress] = useState(0);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) { closeConversation(); return; }
    void openConversation(conversationId).catch((nextError: Error) => setError(nextError.message));
    return () => closeConversation();
  }, [conversationId, openConversation, closeConversation]);

  const conversation = realtime.conversations.find((item) => item._id === conversationId);
  const messages = useMemo(
    () => removeAccidentalRetryDuplicates(conversationId ? realtime.messages[conversationId] ?? [] : []),
    [conversationId, realtime.messages],
  );
  const otherParticipant = conversation?.participants.find((participant) => participant._id !== user?._id);
  const latestReceived = useMemo(
    () => [...messages].reverse().find((item) => (typeof item.sender === 'string' ? item.sender : item.sender._id) !== user?._id),
    [messages, user?._id],
  );
  useEffect(() => {
    if (conversationId && latestReceived && document.visibilityState === 'visible') void markRead(conversationId, latestReceived._id);
  }, [conversationId, latestReceived, markRead]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages.length]);

  const submit = async () => {
    if (!conversationId || sending || (!draft.trim() && !upload)) return;
    if (upload && new Date(upload.expiresAt).getTime() <= Date.now()) {
      setError('This staged attachment expired. Please upload it again.');
      setUpload(null);
      return;
    }
    setSending(true); setError('');
    try {
      await realtime.sendMessage(conversationId, draft.trim(), upload ? [upload.assetId] : []);
      setDraft(''); setUpload(null); realtime.stopTyping(conversationId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Message failed. Your draft was preserved.');
    } finally { setSending(false); }
  };

  const selectFile = async (file?: File) => {
    if (!conversationId || !file) return;
    if (!allowedTypes.includes(file.type)) { setError('Choose a JPEG, PNG, WebP, PDF, DOC, or DOCX file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Attachments must be 10 MB or smaller.'); return; }
    setProgress(1); setError('');
    try { setUpload(await messageService.upload(conversationId, file, setProgress)); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Upload failed.'); }
    finally { setProgress(0); }
  };

  return <PortalShell>
    <main className='mx-auto max-w-7xl p-4 md:p-8'>
      <header className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div><p className='mb-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700'>Communication centre</p><h1 className='text-3xl font-black tracking-tight text-slate-950'>Marketplace messages</h1><p className='mt-1 max-w-2xl text-sm text-slate-500'>Keep property conversations organized without mixing escrow or proxy-inspection discussions.</p></div>
        <span aria-live='polite' className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${realtime.connectionState === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}><span className={`h-2 w-2 rounded-full ${realtime.connectionState === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />{realtime.connectionState === 'connected' ? 'Live connection' : 'Reconnecting'}</span>
      </header>
      {error && <div role='alert' className='mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800'><span className='material-symbols-outlined text-lg' aria-hidden='true'>error</span><span className='flex-1'>{error}</span><button aria-label='Dismiss error' onClick={() => setError('')}>×</button></div>}

      <div className='grid h-[calc(100vh-15rem)] min-h-[620px] max-h-[850px] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:grid-cols-[330px_minmax(0,1fr)]'>
        <aside aria-label='Conversations' className={`min-h-0 border-r border-slate-200 bg-slate-50/70 ${conversationId ? 'hidden md:flex' : 'flex'} flex-col`}>
          <div className='border-b border-slate-200 px-5 py-4'><div className='flex items-center justify-between'><h2 className='font-extrabold text-slate-900'>Inbox</h2>{realtime.inboxUnread > 0 && <span className='rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white'>{realtime.inboxUnread} unread</span>}</div><p className='mt-1 text-xs text-slate-500'>{realtime.conversations.length} conversation{realtime.conversations.length === 1 ? '' : 's'}</p></div>
          <div className='flex-1 overflow-y-auto'>
            {realtime.conversations.length === 0 ? <div className='grid h-full place-items-center p-8 text-center'><div><span className='material-symbols-outlined mb-3 text-4xl text-slate-300'>forum</span><p className='font-semibold text-slate-700'>No conversations yet</p><p className='mt-1 text-sm text-slate-500'>Start one from an eligible property.</p></div></div> : realtime.conversations.map((item) => {
              const active = item._id === conversationId;
              return <button key={item._id} className={`relative flex w-full gap-3 border-b border-slate-200/80 p-4 text-left transition ${active ? 'bg-white shadow-[inset_3px_0_0_#173d32]' : 'hover:bg-white'}`} onClick={() => navigate(`/messages/${item._id}`)}>
                <span className='grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-sm font-black text-emerald-800'>{initials(item.property?.title)}</span>
                <span className='min-w-0 flex-1'><span className='flex items-start justify-between gap-2'><span className='truncate font-bold text-slate-900'>{item.property?.title ?? 'Property conversation'}</span>{Boolean(item.unreadCount) && <span className='grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white'>{item.unreadCount}</span>}</span><span className='mt-1 block truncate text-sm text-slate-500'>{item.lastMessageText || 'Conversation started'}</span><span className='mt-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400'><span className={`h-1.5 w-1.5 rounded-full ${item.status === 'open' ? 'bg-emerald-500' : 'bg-slate-400'}`} />{item.status}</span></span>
              </button>;
            })}
          </div>
        </aside>

        <section aria-label='Message thread' className={conversationId ? 'flex min-h-0 min-w-0 flex-col' : 'hidden place-items-center bg-slate-50/40 text-slate-500 md:grid'}>
          {!conversationId ? <div className='text-center'><span className='material-symbols-outlined mb-3 text-5xl text-slate-300'>chat</span><p className='font-bold text-slate-700'>Choose a conversation</p><p className='mt-1 text-sm'>Messages will appear here.</p></div> : <>
            <header className='flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5'>
              <div className='flex min-w-0 items-center gap-3'><Link className='grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-slate-100 md:hidden' aria-label='Back to inbox' to='/messages'><span className='material-symbols-outlined'>arrow_back</span></Link><span className='grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 font-black text-emerald-800'>{initials(otherParticipant?.name)}</span><div className='min-w-0'><h2 className='truncate font-extrabold text-slate-950'>{conversation?.property?.title ?? 'Conversation'}</h2><p className='truncate text-xs text-slate-500'>{otherParticipant?.name ?? 'Marketplace participant'} · {realtime.presence[conversationId]?.includes(otherParticipant?._id ?? '') ? 'Online' : conversation?.status}</p></div></div>
              <div className='flex items-center gap-1'><button className='grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-red-700' aria-label='Report conversation' onClick={() => setReporting(true)}><span className='material-symbols-outlined'>flag</span></button><button className='grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100' aria-label={conversation?.status === 'closed' ? 'Reopen conversation' : 'Close conversation'} onClick={() => conversationId && void messageService.update(conversationId, { status: conversation?.status === 'closed' ? 'open' : 'closed' }).then(realtime.refreshInbox)}><span className='material-symbols-outlined'>{conversation?.status === 'closed' ? 'lock_open' : 'lock'}</span></button></div>
            </header>

            <div className='flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4 sm:p-6' aria-live='polite'>
              <div className='text-center'><button className='rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:border-slate-300' onClick={() => void realtime.loadOlder(conversationId)}>Load older messages</button></div>
              {messages.map((message) => {
                const mine = (typeof message.sender === 'string' ? message.sender : message.sender._id) === user?._id;
                return <article key={message._id} className={`w-fit max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${mine ? 'ml-auto rounded-br-md bg-primary text-white' : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'}`}>
                  <p className='whitespace-pre-wrap break-words leading-relaxed'>{message.moderated ? 'This message was removed by moderation.' : message.text}</p>
                  {!message.moderated && message.attachments.map((attachment) => <a key={attachment.url} className={`mt-2 flex items-center gap-2 rounded-lg border p-2 text-sm font-semibold ${mine ? 'border-white/20 bg-white/10' : 'border-slate-200 bg-slate-50'}`} href={attachment.url} target='_blank' rel='noreferrer'><span className='material-symbols-outlined text-lg'>description</span><span className='min-w-0 truncate'>{attachment.originalFileName}</span><span className='shrink-0 text-xs opacity-70'>{fileSize(attachment.fileSizeBytes)}</span></a>)}
                  <time className={`mt-1.5 block text-[11px] ${mine ? 'text-white/65' : 'text-slate-400'}`} dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
                </article>;
              })}
              {Boolean(realtime.typingUsers[conversationId]?.length) && <p className='flex items-center gap-2 text-xs font-medium text-slate-500'><span className='inline-flex gap-1'><i className='h-1.5 w-1.5 rounded-full bg-slate-400' /><i className='h-1.5 w-1.5 rounded-full bg-slate-400' /><i className='h-1.5 w-1.5 rounded-full bg-slate-400' /></span>Participant is typing</p>}
              <div ref={bottomRef} />
            </div>

            <div className='border-t border-slate-200 bg-white p-3 sm:p-4'>
              {upload && <div className='mb-3 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm'><span className='material-symbols-outlined text-emerald-700'>draft</span><span className='min-w-0 flex-1 truncate font-semibold text-slate-700'>{upload.originalFileName}</span><span className='text-xs text-slate-500'>{fileSize(upload.fileSizeBytes)}</span><button className='grid h-7 w-7 place-items-center rounded-full hover:bg-emerald-100' aria-label='Remove attachment' onClick={() => setUpload(null)}>×</button></div>}
              {progress > 0 && <progress aria-label='Attachment upload progress' value={progress} max='100' className='mb-2 h-1.5 w-full accent-emerald-700' />}
              <div className='flex items-center gap-2'>
                <label className='inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 font-semibold text-slate-700 transition hover:border-primary hover:text-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2' aria-label='Select an attachment'><span className='material-symbols-outlined' aria-hidden='true'>attach_file</span><span className='hidden lg:inline'>Attach</span><input className='sr-only' type='file' accept='.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx' onChange={(event) => void selectFile(event.target.files?.[0])} /></label>
                <textarea rows={1} aria-label='Message' placeholder='Write a message…' maxLength={5000} className='h-12 min-h-12 flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 leading-6 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15' value={draft} onChange={(event) => { setDraft(event.target.value); realtime.startTyping(conversationId); }} onBlur={() => realtime.stopTyping(conversationId)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(); } }} />
                <button className='inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45' disabled={sending || (!draft.trim() && !upload) || conversation?.status !== 'open'} onClick={() => void submit()}><span className='hidden sm:inline'>{sending ? 'Sending' : 'Send'}</span><span className='material-symbols-outlined text-xl' aria-hidden='true'>{sending ? 'progress_activity' : 'send'}</span></button>
              </div>
              <p className='mt-2 hidden text-[11px] text-slate-400 sm:block'>Press Enter to send · Shift + Enter for a new line · Maximum 5,000 characters</p>
            </div>
          </>}
        </section>
      </div>

      {reporting && <div role='dialog' aria-modal='true' aria-labelledby='report-title' className='fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm'><form className='w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl' onSubmit={(event) => { event.preventDefault(); if (!conversationId) return; void messageService.report(conversationId, { reason, details: details.trim() || undefined }).then(() => { toast.success('Report submitted privately.'); setReporting(false); }, (nextError: Error) => setError(nextError.message)); }}><div className='mb-5 flex items-start justify-between'><div><p className='text-xs font-bold uppercase tracking-wider text-red-700'>Private report</p><h2 id='report-title' className='text-xl font-black text-slate-950'>Report conversation</h2></div><button type='button' aria-label='Close report dialog' onClick={() => setReporting(false)}>×</button></div><label className='mb-4 block text-sm font-semibold text-slate-700'>Reason<select className='mt-1.5 block w-full rounded-xl border border-slate-300 p-3' value={reason} onChange={(event) => setReason(event.target.value as ReportReason)}>{['spam','harassment','fraud','inappropriate_content','other'].map((item) => <option key={item}>{item.replaceAll('_', ' ')}</option>)}</select></label><label className='block text-sm font-semibold text-slate-700'>Additional details<textarea className='mt-1.5 block min-h-28 w-full rounded-xl border border-slate-300 p-3' value={details} onChange={(event) => setDetails(event.target.value)} /></label><div className='mt-5 flex justify-end gap-2'><button className='rounded-xl px-4 py-2 font-bold text-slate-600 hover:bg-slate-100' type='button' onClick={() => setReporting(false)}>Cancel</button><button className='rounded-xl bg-red-700 px-4 py-2 font-bold text-white'>Submit report</button></div></form></div>}
    </main>
  </PortalShell>;
}
