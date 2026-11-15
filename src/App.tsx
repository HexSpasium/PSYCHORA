import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { TURKIYE_PROVINCES } from './data/provinces'
import { SPECIALTY_GROUPS } from './data/specialties'

type AuthMode = 'login' | 'signup' | 'reset' | 'update'

export default function App() {
  const [query, setQuery] = useState('')
  const [activeSection, setActiveSection] = useState('feed')
  const [city, setCity] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileViewOpen, setProfileViewOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'account'|'contact'|'privacy'|'appearance'>('account')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('psychora-theme') === 'dark')
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem('psychora-email-notifications') !== 'off')
  const [pushNotifications, setPushNotifications] = useState(() => localStorage.getItem('psychora-push-notifications') !== 'off')
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profile, setProfile] = useState({ display_name: '', professional_title: '', bio: '', profile_visibility: 'public', avatar_url: '' })
  const [credentialType, setCredentialType] = useState('diploma')
  const [institution, setInstitution] = useState('')
  const [verificationNote, setVerificationNote] = useState('')
  const [verificationStatus, setVerificationStatus] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<{id:string;name_tr:string}[]>([])
  const [credentialFile, setCredentialFile] = useState<File | null>(null)
  const [myCredentials, setMyCredentials] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminRequests, setAdminRequests] = useState<any[]>([])
  const [adminBusy, setAdminBusy] = useState(false)
  const [directory, setDirectory] = useState<any[]>([])
  const [directoryBusy, setDirectoryBusy] = useState(false)
  const [directoryLoaded, setDirectoryLoaded] = useState(false)
  const [directorySearch, setDirectorySearch] = useState('')
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [directorySpecialty, setDirectorySpecialty] = useState('')
  const [selectedProfessional, setSelectedProfessional] = useState<any | null>(null)
  const [connectionRequest, setConnectionRequest] = useState<any | null>(null)
  const [connectionBusy, setConnectionBusy] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [threadMessages, setThreadMessages] = useState<any[]>([])
  const [messageDraft, setMessageDraft] = useState('')
  const [messageBusy, setMessageBusy] = useState(false)
  const [incomingRequests, setIncomingRequests] = useState<any[]>([])
  const [unreadMessages, setUnreadMessages] = useState<any[]>([])
  const [showAllNotifications, setShowAllNotifications] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [notificationToast, setNotificationToast] = useState('')

  const loadDirectory = async () => {
    if (!session?.user) return
    setDirectoryBusy(true)
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id,display_name,professional_title,bio,verification_status,avatar_url')
        .eq('profile_visibility', 'public')
        .order('display_name')
        .limit(500)
      if (profileError) throw profileError
      const ids = (profiles || []).map((p:any) => p.id)
      if (!ids.length) { setDirectory([]); setDirectoryLoaded(true); return }
      const [{ data: links, error: linksError }, { data: allSpecialties, error: specialtiesError }] = await Promise.all([
        supabase.from('user_specialties').select('user_id,specialty_id').in('user_id', ids),
        supabase.from('specialties').select('id,name_tr').eq('is_active', true),
      ])
      if (linksError) throw linksError
      if (specialtiesError) throw specialtiesError
      setSpecialties(allSpecialties || [])
      const names = new Map((allSpecialties || []).map((s:any) => [s.id, s.name_tr]))
      const byUser = new Map<string,string[]>()
      for (const link of links || []) {
        const list = byUser.get(link.user_id) || []
        const name = names.get(link.specialty_id)
        if (name) list.push(name)
        byUser.set(link.user_id, list)
      }
      setDirectory((profiles || []).map((p:any) => ({...p, specialties: byUser.get(p.id) || []})))
      setDirectoryLoaded(true)
    } catch (error) {
      console.error('Directory load failed', error)
      setDirectoryLoaded(false)
    } finally { setDirectoryBusy(false) }
  }

  const [feedPosts, setFeedPosts] = useState<any[]>([])
  const [feedBusy, setFeedBusy] = useState(false)
  const [postDraft, setPostDraft] = useState('')
  const [postImage, setPostImage] = useState<File | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [postBusy, setPostBusy] = useState(false)
  const [commentDrafts, setCommentDrafts] = useState<Record<string,string>>({})
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 })
  const [myFollowRows, setMyFollowRows] = useState<any[]>([])
  const [selectedIsFollowing, setSelectedIsFollowing] = useState(false)
  const [selectedFollowStats, setSelectedFollowStats] = useState({ followers: 0, following: 0 })
  const [followBusy, setFollowBusy] = useState(false)
  const [feedLive, setFeedLive] = useState(false)

  const loadFeed = async () => {
    if (!session?.user) { setFeedPosts([]); return }
    setFeedBusy(true)
    try {
      const { data: posts, error } = await supabase.from('posts')
        .select('id,author_id,content,visibility,created_at')
        .eq('is_deleted', false).order('created_at', { ascending: false }).limit(50)
      if (error) throw error
      const postIds = (posts || []).map((p:any) => p.id)
      const authorIds = [...new Set((posts || []).map((p:any) => p.author_id))]
      const [{ data: authors, error: authorError }, { data: reactions, error: reactionError }, { data: comments, error: commentError }, { data: follows, error: followError }, { data: media, error: mediaError }] = await Promise.all([
        authorIds.length ? supabase.from('profiles').select('id,display_name,professional_title,avatar_url').in('id', authorIds) : Promise.resolve({data:[],error:null}),
        postIds.length ? supabase.from('post_reactions').select('id,post_id,user_id,reaction_type').in('post_id', postIds) : Promise.resolve({data:[],error:null}),
        postIds.length ? supabase.from('comments').select('id,post_id,author_id,content,created_at').in('post_id', postIds).eq('is_deleted',false).order('created_at',{ascending:true}) : Promise.resolve({data:[],error:null}),
        supabase.from('follows').select('follower_id,following_id').or('follower_id.eq.'+session.user.id+',following_id.eq.'+session.user.id),
        postIds.length ? supabase.from('post_media').select('id,post_id,media_type,storage_path,file_name').in('post_id',postIds).order('position') : Promise.resolve({data:[],error:null}),
      ])
      if (authorError) throw authorError
      if (reactionError) throw reactionError
      if (commentError) throw commentError
      if (followError) throw followError
      if (mediaError) throw mediaError
      const commentAuthorIds = [...new Set((comments || []).map((c:any)=>c.author_id).filter((id:string)=>!authorIds.includes(id)))]
      const { data: commentAuthors, error: commentAuthorsError } = commentAuthorIds.length
        ? await supabase.from('profiles').select('id,display_name,avatar_url').in('id',commentAuthorIds)
        : {data:[],error:null}
      if (commentAuthorsError) throw commentAuthorsError
      const authorMap = new Map([...(authors || []), ...(commentAuthors || [])].map((p:any)=>[p.id,p]))
      setFeedPosts((posts || []).map((p:any)=>({...p, author:authorMap.get(p.author_id), media:(media || []).filter((m:any)=>m.post_id===p.id).map((m:any)=>({...m,url:supabase.storage.from('social-media').getPublicUrl(m.storage_path).data.publicUrl})), reactions:(reactions || []).filter((r:any)=>r.post_id===p.id), comments:(comments || []).filter((c:any)=>c.post_id===p.id).map((c:any)=>({...c,author:authorMap.get(c.author_id)}))})))
      setMyFollowRows(follows || [])
      setFollowStats({
        followers:(follows || []).filter((f:any)=>f.following_id===session.user.id).length,
        following:(follows || []).filter((f:any)=>f.follower_id===session.user.id).length,
      })
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Akış yüklenemedi.')
    } finally { setFeedBusy(false) }
  }

  useEffect(() => { if (session?.user?.id) void loadFeed(); else { setFeedPosts([]); setFollowStats({followers:0,following:0}) } }, [session?.user?.id])

  // Keep the social feed fresh across all signed-in clients.
  useEffect(() => {
    if (!session?.user?.id) { setFeedLive(false); return }
    let refreshTimer: number | undefined
    const refreshFeed = () => {
      if (refreshTimer) window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => { void loadFeed() }, 350)
    }
    const channel = supabase.channel('psychora-live-feed-' + session.user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, refreshFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_media' }, refreshFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, refreshFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, refreshFeed)
      .subscribe((status) => setFeedLive(status === 'SUBSCRIBED'))
    const fallbackRefresh = window.setInterval(refreshFeed, 60000)
    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer)
      window.clearInterval(fallbackRefresh)
      setFeedLive(false)
      void supabase.removeChannel(channel)
    }
  }, [session?.user?.id])

  const createPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.user || !postDraft.trim()) return
    setPostBusy(true)
    const { data: post, error } = await supabase.from('posts').insert({author_id:session.user.id,content:postDraft.trim(),visibility:'public'}).select('id').single()
    if (error) setNotificationError(error.message)
    else {
      if (postImage) {
        const path = session.user.id + '/posts/' + crypto.randomUUID() + '-' + postImage.name.replace(/[^a-zA-Z0-9._-]/g,'_')
        const { error: uploadError } = await supabase.storage.from('social-media').upload(path,postImage,{contentType:postImage.type,upsert:false})
        if (uploadError) setNotificationError('Gönderi metni paylaşıldı ancak fotoğraf yüklenemedi: ' + uploadError.message)
        else {
          const { error: mediaInsertError } = await supabase.from('post_media').insert({post_id:post.id,media_type:'image',storage_path:path,file_name:postImage.name,mime_type:postImage.type,file_size:postImage.size,position:0})
          if (mediaInsertError) setNotificationError('Fotoğraf kaydı oluşturulamadı: ' + mediaInsertError.message)
        }
      }
      setPostDraft(''); setPostImage(null); await loadFeed()
    }
    setPostBusy(false)
  }

  const toggleReaction = async (post:any) => {
    if (!session?.user) return
    const existing = (post.reactions || []).find((r:any)=>r.user_id===session.user.id && r.reaction_type==='like')
    const result = existing
      ? await supabase.from('post_reactions').delete().eq('id',existing.id)
      : await supabase.from('post_reactions').insert({post_id:post.id,user_id:session.user.id,reaction_type:'like'})
    if (result.error) setNotificationError(result.error.message)
    else await loadFeed()
  }

  const addComment = async (event:FormEvent<HTMLFormElement>, postId:string) => {
    event.preventDefault()
    if (!session?.user) return
    const content=(commentDrafts[postId] || '').trim()
    if (!content) return
    const {error}=await supabase.from('comments').insert({post_id:postId,author_id:session.user.id,content})
    if (error) setNotificationError(error.message)
    else { setCommentDrafts(old=>({...old,[postId]:''})); await loadFeed() }
  }

  const filteredDirectory = useMemo(() => directory.filter(person => {
    const term = directorySearch.trim().toLocaleLowerCase('tr')
    const text = [person.display_name, person.professional_title, person.bio, ...(person.specialties || [])].filter(Boolean).join(' ').toLocaleLowerCase('tr')
    return (!term || text.includes(term)) && (!directorySpecialty || (person.specialties || []).includes(directorySpecialty))
  }), [directory, directorySearch, directorySpecialty])

  const provinces = useMemo(() => TURKIYE_PROVINCES.filter(p => p.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))), [query])

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    localStorage.setItem('psychora-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update')
        setAuthOpen(true)
        setMessage('')
        setErrorMessage('')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session?.user) void loadDirectory()
    else { setDirectory([]); setDirectoryLoaded(false) }
  }, [session?.user?.id])

  const loadIncomingRequests = async () => {
    if (!session?.user) { setIncomingRequests([]); return }
    const { data: requests, error } = await supabase
      .from('connection_requests')
      .select('id,requester_id,recipient_id,status,created_at')
      .eq('recipient_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) {
      setNotificationError(error.message)
      return
    }
    const requesterIds = [...new Set((requests || []).map((request: any) => request.requester_id))]
    const { data: profiles, error: profilesError } = requesterIds.length
      ? await supabase.from('profiles').select('id,display_name,professional_title').in('id', requesterIds)
      : { data: [], error: null }
    if (profilesError) {
      setNotificationError(profilesError.message)
      return
    }
    const profileById = new Map((profiles || []).map((profile: any) => [profile.id, profile]))
    setIncomingRequests((requests || []).map((request: any) => ({
      ...request,
      requester: profileById.get(request.requester_id) || null,
    })))
    setNotificationError('')
  }

  useEffect(() => {
    if (!session?.user?.id) {
      setIncomingRequests([])
      setUnreadMessages([])
      setNotificationOpen(false)
      return
    }
    const userId = session.user.id
    void loadIncomingRequests()
    void loadUnreadMessages()
    const messageChannel = supabase
      .channel('psychora-message-notifications-' + userId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages', filter: 'recipient_id=eq.' + userId,
      }, () => {
        setNotificationToast('Yeni bir mesajın var.')
        window.setTimeout(() => setNotificationToast(''), 6000)
        void loadUnreadMessages()
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'direct_messages', filter: 'recipient_id=eq.' + userId,
      }, () => void loadUnreadMessages())
      .subscribe()
    const channel = supabase
      .channel('psychora-connection-notifications-' + userId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connection_requests',
        filter: 'recipient_id=eq.' + userId,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotificationToast('Yeni bir bağlantı isteğin var.')
          window.setTimeout(() => setNotificationToast(''), 6000)
        }
        void loadIncomingRequests()
      })
      .subscribe()
    const refresh = window.setInterval(() => { void loadIncomingRequests(); void loadUnreadMessages() }, 30000)
    return () => {
      window.clearInterval(refresh)
      void supabase.removeChannel(channel)
      void supabase.removeChannel(messageChannel)
    }
  }, [session?.user?.id])

  const loadUnreadMessages = async () => {
    if (!session?.user) { setUnreadMessages([]); return }
    const { data: messages, error } = await supabase.from('direct_messages')
      .select('id,sender_id,recipient_id,content,read_at,created_at')
      .eq('recipient_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) { setNotificationError(error.message); return }
    const senderIds = [...new Set((messages || []).map((item: any) => item.sender_id))]
    const { data: profiles, error: profilesError } = senderIds.length
      ? await supabase.from('profiles').select('id,display_name,professional_title').in('id', senderIds)
      : { data: [], error: null }
    if (profilesError) { setNotificationError(profilesError.message); return }
    const profileById = new Map((profiles || []).map((item: any) => [item.id, item]))
    setUnreadMessages((messages || []).map((item: any) => ({
      ...item,
      sender: profileById.get(item.sender_id) || null,
    })))
  }

  const allNotifications = useMemo(() => [
    ...unreadMessages.map((item: any) => ({ id: 'message-' + item.id, kind: 'message', created_at: item.created_at, item })),
    ...incomingRequests.map((item: any) => ({ id: 'request-' + item.id, kind: 'request', created_at: item.created_at, item })),
  ].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()), [unreadMessages, incomingRequests])

  const visibleNotifications = showAllNotifications ? allNotifications : allNotifications.slice(0, 10)

  const openMessageNotification = async (item: any) => {
    const person = directory.find((entry: any) => entry.id === item.sender_id) || {
      id: item.sender_id,
      display_name: item.sender?.display_name || 'Profesyonel',
      professional_title: item.sender?.professional_title || '',
      specialties: [],
    }
    setSelectedProfessional(person)
    setConnectionRequest({ requester_id: item.sender_id, recipient_id: session?.user?.id, status: 'accepted' })
    setNotificationOpen(false)
    try { await loadThread(person) } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Mesajlar yüklenemedi.')
    }
    await loadUnreadMessages()
  }

  const respondToNotification = async (request: any, status: 'accepted' | 'rejected') => {
    if (!session?.user) return
    const { error } = await supabase.from('connection_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', request.id)
      .eq('recipient_id', session.user.id)
      .eq('status', 'pending')
    if (error) {
      setNotificationError(error.message)
      return
    }
    await loadIncomingRequests()
    if (selectedProfessional?.id === request.requester_id) {
      setConnectionRequest({ ...request, status })
      if (status === 'accepted') {
        try { await loadThread(selectedProfessional) } catch (e) {
          setNotificationError(e instanceof Error ? e.message : 'Bağlantı kuruldu ancak mesajlar yüklenemedi.')
        }
      }
    }
  }

  const loadFollowState = async (personId: string) => {
    if (!session?.user?.id || !personId || personId === session.user.id) return
    const [{ data: mine, error: mineError }, { data: incoming, error: incomingError }, { data: outgoing, error: outgoingError }] = await Promise.all([
      supabase.from('follows').select('follower_id,following_id').eq('follower_id', session.user.id).eq('following_id', personId).limit(1),
      supabase.from('follows').select('follower_id').eq('following_id', personId),
      supabase.from('follows').select('following_id').eq('follower_id', personId),
    ])
    if (mineError || incomingError || outgoingError) {
      setConnectionError((mineError || incomingError || outgoingError)?.message || 'Takip bilgisi yüklenemedi.')
      return
    }
    setSelectedIsFollowing(!!mine?.length)
    setSelectedFollowStats({ followers: incoming?.length || 0, following: outgoing?.length || 0 })
  }

  const toggleFollow = async () => {
    if (!session?.user?.id || !selectedProfessional?.id || selectedProfessional.id === session.user.id || followBusy) return
    setFollowBusy(true)
    setConnectionError('')
    const result = selectedIsFollowing
      ? await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', selectedProfessional.id)
      : await supabase.from('follows').insert({ follower_id: session.user.id, following_id: selectedProfessional.id })
    if (result.error) setConnectionError(result.error.message)
    else {
      setSelectedIsFollowing(!selectedIsFollowing)
      setSelectedFollowStats(old => ({ ...old, followers: old.followers + (selectedIsFollowing ? -1 : 1) }))
      await loadFeed()
    }
    setFollowBusy(false)
  }

  const loadConnection = async (person: any) => {
    if (!session?.user || !person?.id || person.id === session.user.id) return
    setConnectionBusy(true); setConnectionError('')
    try {
      const me = session.user.id
      const { data, error } = await supabase.from('connection_requests').select('*')
        .or(`and(requester_id.eq.${me},recipient_id.eq.${person.id}),and(requester_id.eq.${person.id},recipient_id.eq.${me})`)
        .order('created_at', { ascending: false }).limit(1)
      if (error) throw error
      const request = data?.[0] || null
      setConnectionRequest(request)
      await loadFollowState(person.id)
      if (request?.status === 'accepted') await loadThread(person)
      else setThreadMessages([])
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Bağlantı bilgisi yüklenemedi.')
    } finally { setConnectionBusy(false) }
  }

  const loadThread = async (person = selectedProfessional) => {
    if (!session?.user || !person?.id) return
    const me = session.user.id
    const { data, error } = await supabase.from('direct_messages').select('id,sender_id,recipient_id,content,read_at,created_at')
      .or(`and(sender_id.eq.${me},recipient_id.eq.${person.id}),and(sender_id.eq.${person.id},recipient_id.eq.${me})`)
      .order('created_at', { ascending: true }).limit(200)
    if (error) throw error
    setThreadMessages(data || [])
    const unread = (data || []).filter((m:any) => m.recipient_id === me && !m.read_at).map((m:any) => m.id)
    if (unread.length) {
      const { error: readError } = await supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).in('id', unread)
      if (readError) console.warn('Read receipt update failed', readError)
    }
  }

  const requestConnection = async () => {
    if (!session?.user || !selectedProfessional?.id) return
    setConnectionBusy(true); setConnectionError('')
    const { data, error } = await supabase.from('connection_requests').insert({
      requester_id: session.user.id, recipient_id: selectedProfessional.id,
    }).select().single()
    if (error) setConnectionError(error.message)
    else setConnectionRequest(data)
    setConnectionBusy(false)
  }

  const respondConnection = async (status: 'accepted' | 'rejected') => {
    if (!connectionRequest) return
    setConnectionBusy(true); setConnectionError('')
    const { data, error } = await supabase.from('connection_requests').update({ status, updated_at: new Date().toISOString() })
      .eq('id', connectionRequest.id).select().single()
    if (error) setConnectionError(error.message)
    else {
      setConnectionRequest(data)
      if (status === 'accepted') {
        try { await loadThread(selectedProfessional) } catch (e) { setConnectionError(e instanceof Error ? e.message : 'Mesajlar yüklenemedi.') }
      } else setThreadMessages([])
    }
    setConnectionBusy(false)
  }

  const sendDirectMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = messageDraft.trim()
    if (!content || !session?.user || !selectedProfessional?.id) return
    setMessageBusy(true); setConnectionError('')
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: session.user.id, recipient_id: selectedProfessional.id, content,
    })
    if (error) setConnectionError(error.message)
    else {
      setMessageDraft('')
      try { await loadThread(selectedProfessional) } catch (e) { setConnectionError(e instanceof Error ? e.message : 'Mesaj gönderildi ancak konuşma yenilenemedi.') }
    }
    setMessageBusy(false)
  }

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode)
    setMessage('')
    setErrorMessage('')
    setAuthOpen(true)
  }

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setErrorMessage('')
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin + window.location.pathname,
          },
        })
        if (error) throw error
        if (data.session) {
          setMessage('Hesabın oluşturuldu. PSYCHORA’ya hoş geldin.')
          setAuthOpen(false)
        } else {
          setMessage('Kayıt talebin alındı. E-posta adresine gönderilen doğrulama bağlantısını kontrol et.')
        }
      } else if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        setMessage('Giriş başarılı. Hoş geldin.')
        setAuthOpen(false)
        setPassword('')
      } else if (authMode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + window.location.pathname,
        })
        if (error) throw error
        setMessage('Şifre yenileme bağlantısı e-posta adresine gönderildiyse gelen kutunu kontrol et.')
      } else {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        setMessage('Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.')
        setPassword('')
        setAuthMode('login')
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'İşlem sırasında beklenmeyen bir hata oluştu.')
    } finally {
      setBusy(false)
    }
  }

  const openProfile = async () => {
    if (!session?.user) return
    setProfileOpen(true); setProfileBusy(true); setProfileError(''); setProfileMessage('')
    try {
      const [{ data: p, error: pe }, { data: requests, error: re }, { data: allSpecialties, error: se }, { data: mine, error: me }, { data: roles, error: ae }, { data: credentials, error: ce }] = await Promise.all([
        supabase.from('profiles').select('display_name,professional_title,bio,profile_visibility,avatar_url').eq('id', session.user.id).maybeSingle(),
        supabase.from('verification_requests').select('status').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('specialties').select('id,name_tr').eq('is_active', true).order('name_tr'),
        supabase.from('user_specialties').select('specialty_id').eq('user_id', session.user.id),
        supabase.from('admin_roles').select('role').eq('user_id', session.user.id),
        supabase.from('professional_credentials').select('id,credential_type,institution,document_path,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      ])
      if (pe) throw pe
      if (re) throw re
      if (se) throw se
      if (me) throw me
      if (ae) throw ae
      if (ce) throw ce
      setMyCredentials(credentials || [])
      setProfile({ display_name: p?.display_name || String(session.user.user_metadata?.full_name || ''), professional_title: p?.professional_title || '', bio: p?.bio || '', profile_visibility: p?.profile_visibility || 'public', avatar_url: p?.avatar_url || '' })
      setVerificationStatus(requests?.[0]?.status || '')
      setSpecialties(allSpecialties || [])
      setSelectedSpecialties((mine || []).map((x: {specialty_id:string}) => x.specialty_id))
      setIsAdmin((roles || []).length > 0)
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'Profil yüklenemedi.') }
    finally { setProfileBusy(false) }
  }

  const openOwnProfile = async () => {
    if (!session?.user) return
    setProfileViewOpen(true)
    const { data, error } = await supabase.from('profiles')
      .select('display_name,professional_title,bio,profile_visibility,avatar_url')
      .eq('id', session.user.id).maybeSingle()
    if (error) { setProfileError(error.message); return }
    setProfile(old => ({...old, display_name:data?.display_name || String(session.user.user_metadata?.full_name || ''), professional_title:data?.professional_title || '', bio:data?.bio || '', profile_visibility:data?.profile_visibility || 'public', avatar_url:data?.avatar_url || ''}))
    void loadFeed()
  }

  const openSettings = (tab: 'account'|'contact'|'privacy'|'appearance' = 'account') => {
    setSettingsTab(tab)
    setSettingsOpen(true)
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.user) return
    setProfileBusy(true); setProfileError(''); setProfileMessage('')
    try {
      let avatarUrl = (profile as any).avatar_url || ''
      if (avatarFile) {
        const path = session.user.id + '/avatars/' + crypto.randomUUID() + '-' + avatarFile.name.replace(/[^a-zA-Z0-9._-]/g,'_')
        const { error: uploadError } = await supabase.storage.from('social-media').upload(path,avatarFile,{contentType:avatarFile.type,upsert:false})
        if (uploadError) throw uploadError
        avatarUrl = supabase.storage.from('social-media').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('profiles').update({ ...profile, avatar_url:avatarUrl, updated_at: new Date().toISOString() }).eq('id', session.user.id)
      if (error) throw error
      setProfile(old=>({...old,avatar_url:avatarUrl} as any)); setAvatarFile(null)
      const { error: deleteError } = await supabase.from('user_specialties').delete().eq('user_id', session.user.id)
      if (deleteError) throw deleteError
      if (selectedSpecialties.length) {
        const { error: insertError } = await supabase.from('user_specialties').insert(selectedSpecialties.map(specialty_id => ({ user_id: session.user.id, specialty_id })))
        if (insertError) throw insertError
      }
      const updatedProfile = { ...profile }
      setDirectory(old => old.map(person => person.id === session.user.id ? { ...person, ...updatedProfile, specialties: specialties.filter(item => selectedSpecialties.includes(item.id)).map(item => item.name_tr) } : person))
      setSelectedProfessional((old: any | null) => old?.id === session.user.id ? { ...old, ...updatedProfile } : old)
      await loadDirectory()
      setProfileMessage('Profilin ve uzmanlık alanların kaydedildi. Değişiklikler keşfet bölümüne yansıtıldı.')
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'Profil kaydedilemedi.') }
    finally { setProfileBusy(false) }
  }

  const submitVerification = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.user) return
    setProfileBusy(true); setProfileError(''); setProfileMessage('')
    try {
      const { data: pending, error: checkError } = await supabase.from('verification_requests').select('id').eq('user_id', session.user.id).eq('status', 'pending').limit(1)
      if (checkError) throw checkError
      if (pending?.length) throw new Error('Zaten incelemede olan bir başvurun var.')
      if (!credentialFile) throw new Error('Lütfen diploma veya mesleki belgeni seç.')
      const allowed = ['application/pdf','image/jpeg','image/png']
      if (!allowed.includes(credentialFile.type)) throw new Error('Yalnızca PDF, JPG veya PNG dosyası yükleyebilirsin.')
      if (credentialFile.size > 10 * 1024 * 1024) throw new Error('Dosya boyutu en fazla 10 MB olabilir.')
      const ext = credentialFile.name.split('.').pop()?.toLowerCase() || 'pdf'
      const objectPath = session.user.id + '/' + crypto.randomUUID() + '.' + ext
      const { error: uploadError } = await supabase.storage.from('credential-documents').upload(objectPath, credentialFile, { contentType: credentialFile.type, upsert: false })
      if (uploadError) throw uploadError
      const { data: newCredential, error: credentialError } = await supabase.from('professional_credentials').insert({ user_id: session.user.id, credential_type: credentialType, institution: institution.trim() || null, document_path: objectPath }).select('id,credential_type,institution,document_path,created_at').single()
      if (credentialError) {
        await supabase.storage.from('credential-documents').remove([objectPath])
        throw credentialError
      }
      const { error: requestError } = await supabase.from('verification_requests').insert({ user_id: session.user.id, applicant_note: verificationNote.trim() || null })
      if (requestError) {
        await supabase.from('professional_credentials').delete().eq('id', newCredential.id)
        await supabase.storage.from('credential-documents').remove([objectPath])
        throw requestError
      }
      setMyCredentials(old => [newCredential, ...old])
      setVerificationStatus('pending')
      await supabase.from('profiles').update({ verification_status: 'pending', updated_at: new Date().toISOString() }).eq('id', session.user.id)
      setProfileMessage('Belgen güvenli depoya yüklendi ve doğrulama başvurun incelemeye gönderildi.')
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'Başvuru gönderilemedi.') }
    finally { setProfileBusy(false) }
  }

  const uploadSupplementalCredential = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.user || verificationStatus !== 'approved') return
    setProfileBusy(true); setProfileError(''); setProfileMessage('')
    let uploadedPath = ''
    try {
      if (!credentialFile) throw new Error('Lütfen eklemek istediğin belgeyi seç.')
      const allowed = ['application/pdf','image/jpeg','image/png']
      if (!allowed.includes(credentialFile.type)) throw new Error('Yalnızca PDF, JPG veya PNG dosyası yükleyebilirsin.')
      if (credentialFile.size > 10 * 1024 * 1024) throw new Error('Dosya boyutu en fazla 10 MB olabilir.')
      const ext = credentialFile.name.split('.').pop()?.toLowerCase() || 'pdf'
      uploadedPath = session.user.id + '/' + crypto.randomUUID() + '.' + ext
      const { error: uploadError } = await supabase.storage.from('credential-documents').upload(uploadedPath, credentialFile, { contentType: credentialFile.type, upsert: false })
      if (uploadError) throw uploadError
      const { data: saved, error: saveError } = await supabase.from('professional_credentials').insert({
        user_id: session.user.id,
        credential_type: credentialType,
        institution: institution.trim() || null,
        document_path: uploadedPath,
      }).select('id,credential_type,institution,document_path,created_at').single()
      if (saveError) throw saveError
      setMyCredentials(old => [saved, ...old])
      setCredentialFile(null)
      setInstitution('')
      setProfileMessage('Belgen güvenli depoya eklendi. Mevcut doğrulama onayın korunuyor.')
    } catch (error) {
      if (uploadedPath) await supabase.storage.from('credential-documents').remove([uploadedPath])
      setProfileError(error instanceof Error ? error.message : 'Belge eklenemedi.')
    } finally { setProfileBusy(false) }
  }

  const loadAdminRequests = async () => {
    if (!session?.user || !isAdmin) return
    setAdminBusy(true); setProfileError(''); setProfileMessage('')
    try {
      const { data: requests, error: requestError } = await supabase
        .from('verification_requests')
        .select('id,user_id,status,applicant_note,created_at')
        .order('created_at', { ascending: false })
      if (requestError) throw requestError
      const userIds = [...new Set((requests || []).map((item: any) => item.user_id))]
      const [{ data: profiles, error: profilesError }, { data: credentials, error: credentialsError }] = userIds.length
        ? await Promise.all([
            supabase.from('profiles').select('id,display_name,professional_title').in('id', userIds),
            supabase.from('professional_credentials').select('user_id,credential_type,institution,document_path,created_at').in('user_id', userIds).order('created_at', { ascending: false }),
          ])
        : [{ data: [], error: null }, { data: [], error: null }]
      if (profilesError) throw profilesError
      if (credentialsError) throw credentialsError
      const profileById = new Map((profiles || []).map((item: any) => [item.id, item]))
      const credentialsByUser = new Map<string, any[]>()
      for (const item of credentials || []) credentialsByUser.set(item.user_id, [...(credentialsByUser.get(item.user_id) || []), item])
      setAdminRequests((requests || []).map((item: any) => ({
        ...item,
        profiles: profileById.get(item.user_id) || null,
        professional_credentials: credentialsByUser.get(item.user_id) || [],
      })))
      setProfileMessage((requests || []).length ? 'Başvurular yüklendi.' : 'Henüz doğrulama başvurusu bulunmuyor.')
    } catch (error) {
      const detail = error as { message?: string; code?: string; details?: string; hint?: string }
      setProfileError([detail?.message || 'Başvurular yüklenemedi.', detail?.code, detail?.details, detail?.hint].filter(Boolean).join(' · '))
    } finally { setAdminBusy(false) }
  }

  const reviewVerification = async (request: any, status: 'approved' | 'rejected') => {
    if (!session?.user || !isAdmin) return
    setAdminBusy(true); setProfileError(''); setProfileMessage('')
    try {
      const { error: requestError } = await supabase.from('verification_requests').update({ status, reviewed_by: session.user.id, reviewed_at: new Date().toISOString() }).eq('id', request.id)
      if (requestError) throw requestError
      const { error: profileErrorUpdate } = await supabase.from('profiles').update({ verification_status: status === 'approved' ? 'verified' : 'rejected', updated_at: new Date().toISOString() }).eq('id', request.user_id)
      if (profileErrorUpdate) throw profileErrorUpdate
      setProfileMessage(status === 'approved' ? 'Başvuru onaylandı.' : 'Başvuru reddedildi.')
      await loadAdminRequests()
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'İnceleme kaydedilemedi.') }
    finally { setAdminBusy(false) }
  }

  const deleteMyCredential = async (credential: any) => {
    if (!session?.user || !window.confirm('Bu belge kaydını ve yüklenmiş dosyasını silmek istiyor musun?')) return
    setProfileBusy(true); setProfileError(''); setProfileMessage('')
    try {
      if (credential.document_path) {
        const { error: fileError } = await supabase.storage.from('credential-documents').remove([credential.document_path])
        if (fileError) throw fileError
      }
      const { error } = await supabase.from('professional_credentials').delete().eq('id', credential.id).eq('user_id', session.user.id)
      if (error) throw error
      setMyCredentials(old => old.filter(item => item.id !== credential.id))
      setProfileMessage('Belge kaydı silindi.')
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'Belge silinemedi.') }
    finally { setProfileBusy(false) }
  }

  const openCredential = async (path: string) => {
    const { data, error } = await supabase.storage.from('credential-documents').createSignedUrl(path, 60)
    if (error) { setProfileError(error.message); return }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) setErrorMessage(error.message)
    else setMessage('Oturumun kapatıldı.')
  }

  return <main className="page">
    <header className="nav"><a className="logo" href="#">Ψ <span>PSYCHORA<small>THE PSYCHOLOGY NETWORK</small></span></a><nav className="social-main-nav" aria-label="Ana menü">{[["feed","Akış"],["discover","Keşfet"],["messages","Mesajlar"],["network","Ağım"],["fields","Uzmanlık"]].filter(([key])=>session || key==="fields").map(([key,label])=><button type="button" key={key} className={activeSection===key?"active":""} onClick={()=>{setActiveSection(key);setGlobalSearchOpen(false)}}>{label}{key==="messages" && unreadMessages.filter((m:any)=>!m.read_at).length>0 && <b className="nav-message-count">{unreadMessages.filter((m:any)=>!m.read_at).length}</b>}</button>)}</nav>{session ? <div className="nav-account"><div className="global-member-search"><input aria-label="Üye ara" value={directorySearch} onFocus={()=>setGlobalSearchOpen(true)} onChange={e=>{setDirectorySearch(e.target.value);setGlobalSearchOpen(true)}} placeholder="Üye ara…"/>{globalSearchOpen && directorySearch.trim() && <div className="global-search-results">{filteredDirectory.slice(0,6).map((person:any)=><button type="button" key={person.id} onClick={()=>{setSelectedProfessional(person);setConnectionRequest(null);setThreadMessages([]);setConnectionError("");setGlobalSearchOpen(false);void loadConnection(person);window.location.hash="professionals"}}><span className="social-avatar">{(person.display_name||"P").trim().charAt(0).toLocaleUpperCase("tr")}</span><span><b>{person.display_name}</b><small>{person.professional_title||"PSYCHORA üyesi"}</small></span></button>)}{!filteredDirectory.length && <p>Üye bulunamadı.</p>}<a href="#professionals" onClick={()=>setGlobalSearchOpen(false)}>Tüm arama sonuçları</a></div>}</div><span>{session.user.email}</span><div className="notification-wrap"><button className="notification-trigger" type="button" aria-expanded={notificationOpen} aria-label={'Bildirimler, ' + allNotifications.length + ' kayıt'} onClick={() => { setNotificationOpen(value => !value); setShowAllNotifications(false); void loadIncomingRequests(); void loadUnreadMessages() }}><span className="notification-bell">♧</span> Bildirimler{allNotifications.length > 0 && <b className="notification-count">{allNotifications.length > 99 ? '99+' : allNotifications.length}</b>}</button>{notificationOpen && <section className="notification-panel" aria-label="Bildirimler"><div className="notification-panel-heading"><strong>Bildirimler</strong><span>{allNotifications.length} kayıt</span></div>{notificationError && <p className="notification-error">{notificationError}</p>}{visibleNotifications.map((notification: any) => notification.kind === 'message' ? <button type="button" className="notification-item notification-message-item" key={notification.id} onClick={() => void openMessageNotification(notification.item)}><span className="notification-avatar">{(notification.item.sender?.display_name || 'P').trim().charAt(0).toLocaleUpperCase('tr')}</span><span className="notification-content"><strong>{notification.item.sender?.display_name || 'Bir profesyonel'}</strong><span>Mesaj: {(notification.item.content || '').slice(0, 90)}{(notification.item.content || '').length > 90 ? '…' : ''}</span><time>{new Date(notification.created_at).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'})}</time><small>{notification.item.read_at ? 'Okundu' : 'Okunmadı'}</small></span></button> : <article className="notification-item" key={notification.id}><div className="notification-avatar">{(notification.item.requester?.display_name || 'P').trim().charAt(0).toLocaleUpperCase('tr')}</div><div className="notification-content"><strong>{notification.item.requester?.display_name || 'Bir profesyonel'}</strong><span>{notification.item.requester?.professional_title || 'Psikoloji profesyoneli'} bağlantı isteği gönderdi.</span><time>{new Date(notification.created_at).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'})}</time><small>{notification.item.status === 'pending' ? 'Yanıt bekliyor' : notification.item.status === 'accepted' ? 'Kabul edildi' : 'Reddedildi'}</small>{notification.item.status === 'pending' && <div className="notification-actions"><button type="button" onClick={() => void respondToNotification(notification.item,'accepted')}>Kabul et</button><button type="button" onClick={() => void respondToNotification(notification.item,'rejected')}>Reddet</button></div>}</div></article>)}{!allNotifications.length && <p className="notification-empty">Şimdilik yeni bildirimin yok.</p>}{allNotifications.length > 10 && <button type="button" className="notification-show-all" onClick={() => setShowAllNotifications(value => !value)}>{showAllNotifications ? 'Son 10 bildirimi göster' : 'Tümünü gör'}</button>}</section>}</div><button onClick={()=>void openOwnProfile()}>Profilim</button><button onClick={()=>openSettings()}>Ayarlar</button><button onClick={handleSignOut}>Çıkış yap</button></div> : <button onClick={() => openAuth('signup')}>Profesyonel olarak katıl</button>}</header>
    {session && <div className="session-strip">Oturum açıldı · {session.user.email}</div>}
    {session && notificationToast && <div className="notification-toast" role="status"><span>●</span> {notificationToast} <button type="button" onClick={() => setNotificationOpen(true)}>Görüntüle</button></div>}
    {session && activeSection === "feed" && <section id="social-feed" className="social-shell section">
      <div className="social-topline"><div><label>PSYCHORA SOCIAL</label><h2>Akışın</h2><p>Mesleki çevrenden güncel paylaşımlar.</p><span className={feedLive ? 'feed-live-status is-live' : 'feed-live-status'}><i />{feedLive ? 'Canlı akış aktif' : 'Bağlantı kuruluyor'}</span></div><button type="button" className="secondary" onClick={()=>void loadFeed()} disabled={feedBusy}>{feedBusy?'Yükleniyor…':'Akışı yenile'}</button></div>
      <div className="social-layout">
        <aside className="social-sidebar"><div className="social-user-card"><div className="social-avatar">{(profile.display_name || session.user.user_metadata?.full_name || session.user.email || 'P').trim().charAt(0).toLocaleUpperCase('tr')}</div><strong>{profile.display_name || session.user.user_metadata?.full_name || 'Profilin'}</strong><small>{profile.professional_title || 'Psikoloji profesyoneli'}</small></div><a href="#social-feed">⌂ Akış</a><a href="#professionals">⌕ Keşfet</a><a href="#social-network">♧ Takip ağım</a><button type="button" onClick={()=>void openOwnProfile()}>Profilimi görüntüle</button><button type="button" onClick={()=>void openProfile()}>Profili düzenle</button><button type="button" onClick={()=>openSettings()}>Ayarlar</button></aside>
        <div className="social-main-column">
          <form className="post-composer" onSubmit={createPost}><div className="composer-head"><div className="social-avatar">{(profile.display_name || 'P').trim().charAt(0).toLocaleUpperCase('tr')}</div><strong>Bir düşünce paylaş…</strong></div><textarea value={postDraft} onChange={e=>setPostDraft(e.target.value)} rows={3} maxLength={20000} placeholder="Mesleki bir düşünce, kaynak veya deneyim paylaş."/><div className="composer-footer"><label className="post-image-picker">＋ Fotoğraf<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPostImage(e.target.files?.[0] || null)} /></label><small>{postImage ? postImage.name : postDraft.length + `/20000 · Herkese açık gönderi`}</small><button className="primary" disabled={postBusy || !postDraft.trim()}>{postBusy?'Paylaşılıyor…':'Paylaş'}</button></div></form>
          {feedBusy && !feedPosts.length ? <p className="social-empty">Akış yükleniyor…</p> : feedPosts.length ? feedPosts.map((post:any)=><article className="feed-post" key={post.id}><div className="feed-post-head">{post.author?.avatar_url ? <img className="social-avatar feed-person-avatar" src={post.author.avatar_url} alt={post.author.display_name || "Üye"} /> : <div className="social-avatar">{(post.author?.display_name || 'P').trim().charAt(0).toLocaleUpperCase('tr')}</div>}<div><strong>{post.author?.display_name || 'PSYCHORA üyesi'}</strong><small>{post.author?.professional_title || 'Psikoloji profesyoneli'} · {new Date(post.created_at).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'})}</small></div></div><p className="feed-post-content">{post.content}</p>{post.media?.map((m:any)=><img className="feed-post-image" key={m.id} src={m.url} alt={m.file_name || "Gönderi fotoğrafı"} />)}<div className="feed-post-actions"><button type="button" onClick={()=>void toggleReaction(post)}>{post.reactions.some((r:any)=>r.user_id===session.user.id && r.reaction_type==='like')?'♥ Beğendin':'♡ Beğen'} · {post.reactions.length}</button><span>Yorumlar · {post.comments.length}</span></div><div className="feed-comments">{post.comments.map((comment:any)=><div className="feed-comment" key={comment.id}>{comment.author?.avatar_url ? <img className="social-avatar feed-comment-avatar" src={comment.author.avatar_url} alt={comment.author.display_name || "Üye"} /> : <div className="social-avatar feed-comment-avatar">{(comment.author?.display_name || 'Ü').trim().charAt(0).toLocaleUpperCase('tr')}</div>}<div className="feed-comment-body"><strong>{comment.author?.display_name || 'Üye'}</strong><span>{comment.content}</span></div></div>)}</div><form className="comment-compose" onSubmit={e=>void addComment(e,post.id)}><input value={commentDrafts[post.id] || ''} onChange={e=>setCommentDrafts(old=>({...old,[post.id]:e.target.value}))} placeholder="Yorum yaz…" maxLength={10000}/><button type="submit" disabled={!(commentDrafts[post.id] || '').trim()}>Gönder</button></form></article>) : <p className="social-empty">Henüz paylaşım yok. İlk gönderiyi sen oluştur.</p>}
        </div>
        <aside className="social-right-card"><strong>Profesyonel ağın</strong><div><b>{followStats.followers}</b><small>Takipçi</small></div><div><b>{followStats.following}</b><small>Takip edilen</small></div><a href="#professionals">Yeni profesyoneller keşfet ↗</a><a href="#social-network">Ağımı görüntüle</a></aside>
      </div>
    </section>}
    {session && activeSection === "messages" && <section id="messages" className="section social-inbox-section">
      <div className="inbox-title"><div><label>PRIVATE MESSAGES</label><h2>Mesaj kutusu</h2><p>Gelen konuşmaların ve mesaj geçmişin.</p></div><span>{unreadMessages.filter((m:any)=>!m.read_at).length} okunmamış</span></div>
      {(() => {
        const conversations = [...new Set(unreadMessages.map((m:any)=>m.sender_id))].map((senderId:string) => {
          const messages = unreadMessages.filter((m:any)=>m.sender_id===senderId)
          const latest = messages[0]
          return {senderId, messages, latest, sender:latest?.sender}
        }).sort((a:any,b:any)=>new Date(b.latest?.created_at||0).getTime()-new Date(a.latest?.created_at||0).getTime())
        return conversations.length ? <div className="inbox-conversation-list">{conversations.map((conversation:any)=><button type="button" className="inbox-conversation" key={conversation.senderId} onClick={()=>void openMessageNotification(conversation.latest)}><span className="social-avatar">{(conversation.sender?.display_name||"P").trim().charAt(0).toLocaleUpperCase("tr")}</span><span className="inbox-conversation-copy"><b>{conversation.sender?.display_name||"PSYCHORA üyesi"}</b><small>{conversation.sender?.professional_title||"Psikoloji profesyoneli"}</small><span>{conversation.latest?.content||"Mesaj"}</span><time>{conversation.latest?.created_at?new Date(conversation.latest.created_at).toLocaleString("tr-TR",{dateStyle:"short",timeStyle:"short"}):""}</time></span><span className="inbox-count">{conversation.messages.length}<small>mesaj</small></span>{conversation.messages.some((m:any)=>!m.read_at)&&<i className="inbox-unread-dot"/>}</button>)}</div> : <div className="social-empty">Henüz gelen mesajın yok. Bir profesyonelle bağlantı kurarak sohbet başlatabilirsin.</div>
      })()}
      <button type="button" className="inbox-refresh" onClick={()=>void loadUnreadMessages()}>Mesajları yenile</button>
    </section>}
    {session && activeSection === "network" && <section id="social-network" className="section social-network-section"><label>YOUR PROFESSIONAL NETWORK</label><h2>Takip ağın</h2><p>Takipçi ve takip ettiklerini burada yönetebilirsin.</p><div className="network-stats"><span><b>{followStats.followers}</b> Takipçi</span><span><b>{followStats.following}</b> Takip edilen</span><button type="button" onClick={()=>void loadFeed()}>Ağı yenile</button></div><div className="network-lists"><div><h3>Takip ettiklerin</h3>{myFollowRows.filter((row:any)=>row.follower_id===session?.user?.id).length ? myFollowRows.filter((row:any)=>row.follower_id===session?.user?.id).map((row:any)=><button type="button" key={row.following_id} onClick={()=>{const person=directory.find((p:any)=>p.id===row.following_id);if(person){setSelectedProfessional(person);void loadConnection(person)}}}>{directory.find((p:any)=>p.id===row.following_id)?.display_name || "Üye"} <span>Profili aç ↗</span></button>) : <p>Henüz kimseyi takip etmiyorsun.</p>}</div><div><h3>Takipçilerin</h3>{myFollowRows.filter((row:any)=>row.following_id===session?.user?.id).length ? myFollowRows.filter((row:any)=>row.following_id===session?.user?.id).map((row:any)=><button type="button" key={row.follower_id} onClick={()=>{const person=directory.find((p:any)=>p.id===row.follower_id);if(person){setSelectedProfessional(person);void loadConnection(person)}}}>{directory.find((p:any)=>p.id===row.follower_id)?.display_name || "Üye"} <span>Profili aç ↗</span></button>) : <p>Henüz takipçin yok.</p>}</div></div></section>}
    {(!session || activeSection === "fields") && <section className="hero"><div className="eyebrow">TÜRKİYE'DEN DÜNYAYA</div><h1>Psikolojinin<br/><em>buluşma noktası.</em></h1><p>Psikoloji profesyonelleri için bilgi, mesleki bağlantı ve iş birliğinin buluştuğu yeni nesil profesyonel ağ.</p><button className="primary" onClick={() => session ? document.getElementById('fields')?.scrollIntoView({ behavior: 'smooth' }) : openAuth('signup')}>{session ? 'Ağı keşfet ↗' : 'Ücretsiz katıl ↗'}</button></section>
    <section className="stats"><div><b>81</b><span>Türkiye ili</span></div><div><b>12+</b><span>Uzmanlık kümesi</span></div><div><b>GLOBAL</b><span>Uluslararası mimari</span></div></section>}
    {(!session || activeSection === "fields") && <section id="fields" className="section"><label>DISCOVER YOUR FIELD</label><h2>Psikolojinin farklı <em>uzmanlıkları.</em></h2><div className="cards">{SPECIALTY_GROUPS.map(s=><article key={s.id}><small>{s.id.toUpperCase()}</small><h3>{s.name}</h3><p>{s.topics.join(' · ')}</p></article>)}</div></section>}
    {(!session || activeSection === "discover") && <section id="professionals" className="section directory">
      <label>PSYCHORA PROFESSIONAL DIRECTORY</label><h2>Uzmanını bul, <em>bağlantı kur.</em></h2>
      <p>Herkese açık profesyonel profilleri uzmanlık alanlarına göre keşfet.</p>
      {!session ? <div className="directory-gate"><span>Profesyonel profilleri görüntülemek için giriş yap.</span><button className="primary" onClick={() => openAuth('login')}>Giriş yap</button></div> : <>
        <div className="directory-filters">
          <input value={directorySearch} onChange={e=>setDirectorySearch(e.target.value)} placeholder="İsim, unvan veya uzmanlık ara..."/>
          <select value={directorySpecialty} onChange={e=>setDirectorySpecialty(e.target.value)}><option value="">Tüm uzmanlık alanları</option>{specialties.length ? specialties.map(s=><option key={s.id} value={s.name_tr}>{s.name_tr}</option>) : [...new Set(directory.flatMap(p=>p.specialties))].sort().map(s=><option key={s} value={s}>{s}</option>)}</select>
          <button type="button" onClick={loadDirectory} disabled={directoryBusy}>{directoryBusy ? 'Yükleniyor…' : 'Yenile'}</button>
        </div>
        {directoryBusy && !directoryLoaded ? <p>Profesyoneller yükleniyor…</p> : filteredDirectory.length ? <div className="directory-grid">{filteredDirectory.map(person=><article className="directory-card directory-card-clickable" key={person.id} role="button" tabIndex={0} onClick={() => { setSelectedProfessional(person); setConnectionRequest(null); setThreadMessages([]); setConnectionError(''); void loadConnection(person) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedProfessional(person) } }}>
          {person.avatar_url ? <img className="directory-avatar" src={person.avatar_url} alt="" /> : <div className="directory-avatar">{(person.display_name || 'P').trim().charAt(0).toLocaleUpperCase('tr')}</div>}
          <div className="directory-person"><h3>{person.display_name || 'İsimsiz profesyonel'} {person.verification_status==='verified' && <span className="verified-mark" title="Mesleki doğrulaması onaylandı">✓ Doğrulandı</span>}</h3>
          <b>{person.professional_title || 'Mesleki unvan belirtilmemiş'}</b>
          {person.bio && <p>{person.bio}</p>}
          <div className="directory-tags">{person.specialties.map((s:string)=><span key={s}>{s}</span>)}</div><button className="profile-detail-link" type="button" onClick={e=>{e.stopPropagation();setSelectedProfessional(person); setConnectionRequest(null); setThreadMessages([]); setConnectionError(''); void loadConnection(person)}}>Profili görüntüle ↗</button></div>
        </article>)}</div> : <p>{directoryLoaded ? 'Aramana uygun herkese açık profesyonel profili bulunamadı.' : 'Profesyonel profiller şu anda yüklenemedi. Yenile butonunu kullanabilirsin.'}</p>}
      </>}
    </section>}
    {(!session || activeSection === "fields") && <section id="turkiye" className="section location"><label>TÜRKİYE FIRST · GLOBAL BY DESIGN</label><h2>81 ilden, <em>dünyaya açılan ağ.</em></h2><p>İlk odağımız Türkiye'nin 81 ili. Altyapı farklı ülkeler ve bölgelere genişleyebilecek şekilde tasarlanıyor.</p><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Şehir ara..."/><div className="cities">{provinces.map(p=><button className={city===p?'chosen':''} key={p} onClick={()=>setCity(p)}>{p}</button>)}</div>{city && <p className="chosen-text">Seçilen şehir: {city}</p>}</section>
    {(!session || activeSection === "fields") && {(!session || activeSection === "fields") && <section id="about" className="section about"><label>ONE PROFESSION. ONE NETWORK.</label><h2>Mesleki dünyanın ortak zemini.</h2><p>PSYCHORA; psikoloji profesyonellerini bilimsel paylaşım, mesleki bağlantı ve profesyonel gelişim için bir araya getirmeyi amaçlar.</p>{!session && <button className="primary" onClick={() => openAuth('signup')}>PSYCHORA'ya katıl ↗</button>}</section>
    </section>}
    {(!session || activeSection === "fields") && <footer>© {new Date().getFullYear()} PSYCHORA · Türkiye’den dünyaya.</footer>}

    {selectedProfessional && <div className="auth-backdrop professional-detail-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSelectedProfessional(null) }}>
      <section className="professional-detail" role="dialog" aria-modal="true" aria-labelledby="professional-detail-title">
        <button className="auth-close" aria-label="Kapat" onClick={() => setSelectedProfessional(null)}>×</button>
        {session?.user && selectedProfessional.id !== session.user.id && <div className="professional-contact-actions">
          {connectionBusy ? <p>Bağlantı durumu kontrol ediliyor…</p> : !connectionRequest ? <button className="primary" onClick={requestConnection}>Bağlantı isteği gönder</button>
          : connectionRequest.status === 'pending' && connectionRequest.recipient_id === session.user.id ? <div className="connection-request-actions"><span>Bu profesyonel seninle bağlantı kurmak istiyor.</span><button className="primary" disabled={connectionBusy} onClick={() => respondConnection('accepted')}>Kabul et</button><button className="secondary" disabled={connectionBusy} onClick={() => respondConnection('rejected')}>Reddet</button></div>
          : connectionRequest.status === 'pending' ? <span className="connection-status">Bağlantı isteğin gönderildi · Yanıt bekleniyor</span>
          : connectionRequest.status === 'accepted' ? <span className="connection-status connected">✓ Bağlantınız var</span>
          : <button className="primary" onClick={requestConnection}>Yeniden bağlantı isteği gönder</button>}
        </div>}
        <div className="professional-detail-heading">
          {selectedProfessional.avatar_url ? <img className="directory-avatar professional-detail-avatar" src={selectedProfessional.avatar_url} alt="" /> : <div className="directory-avatar professional-detail-avatar">{(selectedProfessional.display_name || 'P').trim().charAt(0).toLocaleUpperCase('tr')}</div>}
          <div><div className="eyebrow">PSYCHORA PROFESSIONAL</div><h2 id="professional-detail-title">{selectedProfessional.display_name || 'İsimsiz profesyonel'}</h2><b>{selectedProfessional.professional_title || 'Mesleki unvan belirtilmemiş'}</b>
          {selectedProfessional.verification_status === 'verified' && <span className="verified-mark">✓ Mesleki doğrulama onaylandı</span>}</div>
        </div>
        {session?.user && selectedProfessional.id !== session.user.id && <div className="professional-social-actions"><div className="professional-social-stats"><span><b>{selectedFollowStats.followers}</b> Takipçi</span><span><b>{selectedFollowStats.following}</b> Takip</span></div><button type="button" className={selectedIsFollowing ? "follow-button is-following" : "follow-button"} onClick={toggleFollow} disabled={followBusy}>{followBusy ? "İşleniyor…" : selectedIsFollowing ? "✓ Takip ediliyor" : "+ Takip et"}</button></div>}
        <div className="professional-detail-section"><h3>Hakkında</h3><p>{selectedProfessional.bio || 'Bu profesyonel henüz biyografi eklememiş.'}</p></div>
        <div className="professional-detail-section"><h3>Uzmanlık alanları</h3><div className="directory-tags">{(selectedProfessional.specialties || []).length ? selectedProfessional.specialties.map((s:string)=><span key={s}>{s}</span>) : <small>Henüz uzmanlık alanı eklenmemiş.</small>}</div></div>
        <p className="professional-detail-privacy">İletişim bilgileri yalnızca profil sahibi tarafından ayrıca paylaşılır. PSYCHORA, özel hesap bilgilerini herkese açık göstermez.</p>
        {session?.user && selectedProfessional.id !== session.user.id && connectionRequest?.status === 'accepted' && <div className="professional-messaging">
          <div className="messaging-heading"><h3>Mesajlaşma</h3><button type="button" className="secondary" onClick={() => loadThread().catch(e=>setConnectionError(e.message))}>Yenile</button></div>
          <div className="message-list">{threadMessages.length ? threadMessages.map((m:any)=><div key={m.id} className={m.sender_id === session.user.id ? 'message-bubble mine' : 'message-bubble'}><p>{m.content}</p><time>{new Date(m.created_at).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'})}</time></div>) : <p className="message-empty">Henüz mesaj yok. İlk mesajı sen gönder.</p>}</div>
          <form className="message-compose" onSubmit={sendDirectMessage}><textarea value={messageDraft} onChange={e=>setMessageDraft(e.target.value)} maxLength={5000} rows={3} placeholder="Mesajını yaz…" required/><button className="primary" disabled={messageBusy || !messageDraft.trim()}>{messageBusy ? 'Gönderiliyor…' : 'Gönder'}</button></form>
        </div>}
        {connectionError && <p className="auth-error" role="alert">{connectionError}</p>}
      </section>
    </div>}

    {profileViewOpen && <div className="auth-backdrop profile-view-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setProfileViewOpen(false)}}>
      <section className="profile-view-panel" role="dialog" aria-modal="true" aria-labelledby="my-profile-title">
        <button className="auth-close" aria-label="Kapat" onClick={()=>setProfileViewOpen(false)}>×</button>
        <div className="profile-view-cover"><span>PSYCHORA</span></div>
        <div className="profile-view-identity">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="Profil fotoğrafı"/> : <div className="profile-view-avatar">{(profile.display_name||'P').trim().charAt(0).toLocaleUpperCase('tr')}</div>}
          <div><h2 id="my-profile-title">{profile.display_name || session?.user.user_metadata?.full_name || 'Profilin'}</h2><p>{profile.professional_title || 'Psikoloji profesyoneli'}</p></div>
          <button type="button" className="profile-edit-action" onClick={()=>{setProfileViewOpen(false);void openProfile()}}>Profili düzenle</button>
        </div>
        <div className="profile-view-stats"><span><b>{feedPosts.filter((p:any)=>p.author_id===session?.user?.id).length}</b> Gönderi</span><span><b>{followStats.followers}</b> Takipçi</span><span><b>{followStats.following}</b> Takip</span></div>
        <div className="profile-view-bio"><h3>Hakkında</h3><p>{profile.bio || 'Henüz biyografi eklenmemiş.'}</p><small>Profil görünürlüğü: {profile.profile_visibility==='public'?'Herkese açık':profile.profile_visibility==='followers'?'Takipçiler':'Gizli'}</small></div>
        <div className="profile-view-posts"><h3>Gönderilerin</h3>{feedPosts.filter((p:any)=>p.author_id===session?.user?.id).length ? feedPosts.filter((p:any)=>p.author_id===session?.user?.id).map((post:any)=><article key={post.id}><p>{post.content}</p>{post.media?.map((m:any)=><img key={m.id} src={m.url} alt="Gönderi görseli"/>) }<small>{new Date(post.created_at).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'})}</small></article>) : <p className="profile-view-empty">Henüz paylaşım yapmadın.</p>}</div>
      </section>
    </div>}

    {settingsOpen && <div className="auth-backdrop settings-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false)}}>
      <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <button className="auth-close" aria-label="Kapat" onClick={()=>setSettingsOpen(false)}>×</button>
        <div className="eyebrow">PSYCHORA CONTROL CENTER</div><h2 id="settings-title">Ayarlar</h2><p className="settings-intro">Hesabını, iletişim tercihlerini, gizliliğini ve görünümünü yönet.</p>
        <nav className="settings-tabs">
          <button className={settingsTab==='account'?'active':''} onClick={()=>setSettingsTab('account')}>Hesap</button>
          <button className={settingsTab==='contact'?'active':''} onClick={()=>setSettingsTab('contact')}>İletişim</button>
          <button className={settingsTab==='privacy'?'active':''} onClick={()=>setSettingsTab('privacy')}>Gizlilik</button>
          <button className={settingsTab==='appearance'?'active':''} onClick={()=>setSettingsTab('appearance')}>Görünüm</button>
        </nav>
        {settingsTab==='account' && <div className="settings-content"><h3>Hesap ayarları</h3><label>E-posta adresin<input value={session?.user.email || ''} readOnly/></label><div className="settings-row"><div><b>Profil bilgileri</b><small>Ad, unvan, biyografi ve profil fotoğrafını düzenle.</small></div><button onClick={()=>{setSettingsOpen(false);void openProfile()}}>Profili düzenle</button></div><div className="settings-row"><div><b>Şifre güvenliği</b><small>Şifreni değiştirmek için e-posta üzerinden sıfırlama bağlantısı al.</small></div><button onClick={async()=>{if(session?.user.email){const {error}=await supabase.auth.resetPasswordForEmail(session.user.email,{redirectTo:window.location.origin+window.location.pathname});setProfileMessage(error?error.message:'Şifre yenileme bağlantısı e-posta adresine gönderildi.');setSettingsOpen(false)}}}>Şifreyi yenile</button></div></div>}
        {settingsTab==='contact' && <div className="settings-content"><h3>İletişim ayarları</h3><p>Bildirim tercihlerini bu cihazda sakla.</p><label className="settings-toggle"><span><b>E-posta bildirimleri</b><small>Hesap ve etkinlik bilgilendirmeleri</small></span><input type="checkbox" checked={emailNotifications} onChange={e=>{setEmailNotifications(e.target.checked);localStorage.setItem('psychora-email-notifications',e.target.checked?'on':'off')}}/></label><label className="settings-toggle"><span><b>Site içi bildirimler</b><small>Yeni mesaj ve bağlantı istekleri</small></span><input type="checkbox" checked={pushNotifications} onChange={e=>{setPushNotifications(e.target.checked);localStorage.setItem('psychora-push-notifications',e.target.checked?'on':'off')}}/></label></div>}
        {settingsTab==='privacy' && <div className="settings-content"><h3>Gizlilik ayarları</h3><p>Profilinin keşfet alanında kimler tarafından görülebileceğini belirle.</p><div className="settings-row"><div><b>Profil görünürlüğü</b><small>Görünürlük ve uzmanlık alanlarını profil düzenleme bölümünden yönet.</small></div><button onClick={()=>{setSettingsOpen(false);void openProfile()}}>Gizlilik ve profil</button></div><div className="settings-note">Özel mesajların ve hesap bilgilerin herkese açık profilinde gösterilmez.</div></div>}
        {settingsTab==='appearance' && <div className="settings-content"><h3>Görüntü ayarları</h3><p>PSYCHORA'nın görünümünü tercihine göre değiştir.</p><div className="theme-options"><button className={!darkMode?'selected':''} onClick={()=>setDarkMode(false)}><span className="theme-preview theme-light-preview"/>Gündüz modu</button><button className={darkMode?'selected':''} onClick={()=>setDarkMode(true)}><span className="theme-preview theme-dark-preview"/>Gece modu</button></div><div className="settings-note">Gece modu seçildiğinde sayfanın arka planı ve içerik yüzeyleri koyu renge dönüşür. Tercihin bu cihazda hatırlanır.</div></div>}
      </section>
    </div>}

    {profileOpen && <div className="auth-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setProfileOpen(false) }}>
      <section className="auth-panel profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button className="auth-close" aria-label="Kapat" onClick={() => setProfileOpen(false)}>×</button>
        <div className="auth-mark">Ψ</div><div className="eyebrow">PSYCHORA PROFESSIONAL</div><h2 id="profile-title">Profesyonel profilin</h2>
        {profileBusy ? <p>Yükleniyor…</p> : <>
          <form onSubmit={saveProfile}>
            <label>Profil fotoğrafı (JPG, PNG veya WebP · en fazla 10 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setAvatarFile(e.target.files?.[0] || null)}/>{(profile as any).avatar_url && <img className="profile-avatar-preview" src={(profile as any).avatar_url} alt="Mevcut profil fotoğrafı" />}</label>
            <label>Ad soyad<input required value={profile.display_name} onChange={e=>setProfile({...profile,display_name:e.target.value})}/></label>
            <label>Mesleki unvan<input value={profile.professional_title} onChange={e=>setProfile({...profile,professional_title:e.target.value})} placeholder="Örn. Klinik Psikolog"/></label>
            <label>Kısa biyografi<textarea rows={4} value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})} placeholder="Mesleki ilgi alanların ve deneyimin"/></label>
            <label>Profil görünürlüğü<select value={profile.profile_visibility} onChange={e=>setProfile({...profile,profile_visibility:e.target.value})}><option value="public">Herkese açık</option><option value="followers">Takipçiler</option><option value="private">Gizli</option></select></label>
            <div className="profile-specialties"><b>Uzmanlık alanları</b><div className="profile-specialty-list">{specialties.map(s=><label key={s.id}><input type="checkbox" checked={selectedSpecialties.includes(s.id)} onChange={e=>setSelectedSpecialties(old=>e.target.checked?[...old,s.id]:old.filter(id=>id!==s.id))}/>{s.name_tr}</label>)}</div></div>
            <button className="auth-submit" type="submit" disabled={profileBusy}>Profili kaydet</button>
          </form>
          <div className="verification-box"><h3>Mesleki kimlik doğrulaması</h3><p>Başvuru durumu: <strong>{verificationStatus==='pending'?'İncelemede':verificationStatus==='approved'?'Onaylandı':verificationStatus==='rejected'?'Reddedildi':verificationStatus==='resubmission'?'Yeniden başvuru gerekli':'Başvuru yok'}</strong></p>
          <div className="my-credentials"><b>Yüklediğim belgeler</b>{myCredentials.length ? myCredentials.map((item:any)=><div className="my-credential" key={item.id}><span>{item.credential_type} · {item.institution || 'Kurum belirtilmedi'}</span><button type="button" onClick={()=>item.document_path ? openCredential(item.document_path) : setProfileError('Bu eski kayıtta dosya bulunmuyor.')} disabled={!item.document_path}>Görüntüle</button><button type="button" onClick={()=>deleteMyCredential(item)} disabled={profileBusy}>Sil</button></div>) : <small>Henüz belge kaydı yok.</small>}</div>
          {verificationStatus==='approved' && <div className="auth-note">Bu hesabın eski doğrulama kaydı yönetici tarafından onaylanmış; o kayda belge dosyası eklenmemiş. Onayın korunuyor. İstersen aşağıdan belgeyi hesabına güvenli biçimde ekleyebilirsin.</div>}
          {verificationStatus==='approved' && <form onSubmit={uploadSupplementalCredential}>
            <label>Ek belge türü<select value={credentialType} onChange={e=>setCredentialType(e.target.value)}><option value="diploma">Diploma</option><option value="license">Mesleki ruhsat / yetki belgesi</option><option value="student_certificate">Öğrenci belgesi</option><option value="other">Diğer</option></select></label>
            <label>Üniversite / kurum<input value={institution} onChange={e=>setInstitution(e.target.value)} placeholder="Kurum adı"/></label>
            <label>Belge dosyası (PDF, JPG veya PNG · en fazla 10 MB)<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e=>setCredentialFile(e.target.files?.[0] || null)} required/></label>
            <button className="auth-submit" type="submit" disabled={profileBusy}>Onaylı profile belge ekle</button>
          </form>}
          {verificationStatus!=='pending' && verificationStatus!=='approved' && <form onSubmit={submitVerification}>
            <label>Belge türü<select value={credentialType} onChange={e=>setCredentialType(e.target.value)}><option value="diploma">Diploma</option><option value="license">Mesleki ruhsat / yetki belgesi</option><option value="student_certificate">Öğrenci belgesi</option><option value="other">Diğer</option></select></label>
            <label>Üniversite / kurum<input value={institution} onChange={e=>setInstitution(e.target.value)} placeholder="Kurum adı"/></label>
            <label>Belge dosyası (PDF, JPG veya PNG · en fazla 10 MB)<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e=>setCredentialFile(e.target.files?.[0] || null)} required/></label>
            <label>Başvuru notu<textarea rows={3} value={verificationNote} onChange={e=>setVerificationNote(e.target.value)} placeholder="İnceleme ekibine not (isteğe bağlı)"/></label>
            <button className="auth-submit" type="submit" disabled={profileBusy}>Güvenli şekilde gönder</button>
            <small className="auth-note">Belgeler özel depolama alanında tutulur; yalnızca hesabın ve yetkili doğrulama yöneticileri erişebilir.</small>
          </form>}</div>
          {isAdmin && <section className="admin-verification">
            <h3>Yönetici doğrulama paneli</h3>
            <button type="button" className="auth-submit" onClick={loadAdminRequests} disabled={adminBusy}>{adminBusy ? 'Yükleniyor…' : 'Başvuruları getir'}</button>
            {adminRequests.map((request: any) => <article className="admin-request" key={request.id}>
              <p><strong>{request.profiles?.display_name || 'İsimsiz kullanıcı'}</strong> · {request.profiles?.professional_title || 'Unvan belirtilmemiş'}</p>
              <p>Belge: {request.professional_credentials?.[0]?.credential_type || 'Belge türü belirtilmemiş'} · {request.professional_credentials?.[0]?.institution || 'Kurum belirtilmemiş'}</p>
              {request.applicant_note && <p>Not: {request.applicant_note}</p>}
              {request.professional_credentials?.[0]?.document_path && <button type="button" onClick={() => openCredential(request.professional_credentials[0].document_path)}>Belgeyi güvenli görüntüle</button>}
              <p>Durum: {request.status}</p>
              {request.status === 'pending' && <div className="admin-actions">
                <button type="button" onClick={() => reviewVerification(request, 'approved')} disabled={adminBusy}>Onayla</button>
                <button type="button" onClick={() => reviewVerification(request, 'rejected')} disabled={adminBusy}>Reddet</button>
              </div>}
            </article>)}
          </section>}
        </>}
        {profileMessage && <div className="auth-message">{profileMessage}</div>}{profileError && <div className="auth-error">{profileError}</div>}
      </section>
    </div>}
    {authOpen && <div className="auth-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setAuthOpen(false) }}>
      <section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="auth-close" aria-label="Kapat" onClick={() => setAuthOpen(false)}>×</button>
        <div className="auth-mark">Ψ</div>
        <div className="eyebrow">THE PSYCHOLOGY NETWORK</div>
        <h2 id="auth-title">{authMode === 'signup' ? 'Ağa katıl.' : authMode === 'login' ? 'Tekrar hoş geldin.' : authMode === 'update' ? 'Yeni şifreni belirle.' : 'Şifreni yenile.'}</h2>
        <p>{authMode === 'signup' ? 'PSYCHORA hesabını oluştur ve profesyonel ağa katıl.' : authMode === 'login' ? 'Hesabına güvenli şekilde giriş yap.' : authMode === 'update' ? 'Hesabın için yeni bir şifre oluştur.' : 'Şifre yenileme bağlantısını e-posta adresine gönderelim.'}</p>
        <form onSubmit={handleAuth}>
          {authMode === 'signup' && <label>Ad soyad<input autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} required placeholder="Adın ve soyadın"/></label>}
          <label>E-posta<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="ornek@eposta.com"/></label>
          {(authMode === 'signup' || authMode === 'login' || authMode === 'update') && <label>{authMode === 'update' ? 'Yeni şifre' : 'Şifre'}<input type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} placeholder="En az 8 karakter"/></label>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'İşleniyor...' : authMode === 'signup' ? 'Hesap oluştur' : authMode === 'login' ? 'Giriş yap' : authMode === 'update' ? 'Şifreyi güncelle' : 'Yenileme bağlantısı gönder'}</button>
        </form>
        {message && <div className="auth-message">{message}</div>}
        {errorMessage && <div className="auth-error">{errorMessage}</div>}
        <div className="auth-links">
          {authMode !== 'login' && authMode !== 'update' && <button onClick={() => { setAuthMode('login'); setMessage(''); setErrorMessage('') }}>Zaten hesabın var mı? Giriş yap</button>}
          {authMode !== 'signup' && authMode !== 'update' && <button onClick={() => { setAuthMode('signup'); setMessage(''); setErrorMessage('') }}>Yeni hesap oluştur</button>}
          {authMode !== 'reset' && authMode !== 'update' && <button onClick={() => { setAuthMode('reset'); setMessage(''); setErrorMessage('') }}>Şifremi unuttum</button>}
        </div>
        <small className="auth-note">Devam ederek PSYCHORA kullanım koşullarını kabul etmiş olursun.</small>
      </section>
    </div>}
  </main>
}
