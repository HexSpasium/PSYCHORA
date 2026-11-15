import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { TURKIYE_PROVINCES } from './data/provinces'
import { SPECIALTY_GROUPS } from './data/specialties'

type AuthMode = 'login' | 'signup' | 'reset' | 'update'

export default function App() {
  const [query, setQuery] = useState('')
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
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profile, setProfile] = useState({ display_name: '', professional_title: '', bio: '', profile_visibility: 'public' })
  const [credentialType, setCredentialType] = useState('diploma')
  const [institution, setInstitution] = useState('')
  const [verificationNote, setVerificationNote] = useState('')
  const [verificationStatus, setVerificationStatus] = useState('')
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<{id:string;name_tr:string}[]>([])
  const [credentialFile, setCredentialFile] = useState<File | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminRequests, setAdminRequests] = useState<any[]>([])
  const [adminBusy, setAdminBusy] = useState(false)

  const provinces = useMemo(() => TURKIYE_PROVINCES.filter(p => p.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))), [query])

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
        } else {
          setMessage('Kayıt talebin alındı. E-posta adresine gönderilen doğrulama bağlantısını kontrol et.')
        }
      } else if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        setMessage('Giriş başarılı. Hoş geldin.')
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
      const [{ data: p, error: pe }, { data: requests, error: re }, { data: allSpecialties, error: se }, { data: mine, error: me }, { data: roles, error: ae }] = await Promise.all([
        supabase.from('profiles').select('display_name,professional_title,bio,profile_visibility').eq('id', session.user.id).maybeSingle(),
        supabase.from('verification_requests').select('status').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('specialties').select('id,name_tr').eq('is_active', true).order('name_tr'),
        supabase.from('user_specialties').select('specialty_id').eq('user_id', session.user.id),
        supabase.from('admin_roles').select('role').eq('user_id', session.user.id),
      ])
      if (pe) throw pe
      if (re) throw re
      if (se) throw se
      if (me) throw me
      if (ae) throw ae
      setProfile({ display_name: p?.display_name || String(session.user.user_metadata?.full_name || ''), professional_title: p?.professional_title || '', bio: p?.bio || '', profile_visibility: p?.profile_visibility || 'public' })
      setVerificationStatus(requests?.[0]?.status || '')
      setSpecialties(allSpecialties || [])
      setSelectedSpecialties((mine || []).map((x: {specialty_id:string}) => x.specialty_id))
      setIsAdmin((roles || []).length > 0)
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'Profil yüklenemedi.') }
    finally { setProfileBusy(false) }
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.user) return
    setProfileBusy(true); setProfileError(''); setProfileMessage('')
    try {
      const { error } = await supabase.from('profiles').update({ ...profile, updated_at: new Date().toISOString() }).eq('id', session.user.id)
      if (error) throw error
      const { error: deleteError } = await supabase.from('user_specialties').delete().eq('user_id', session.user.id)
      if (deleteError) throw deleteError
      if (selectedSpecialties.length) {
        const { error: insertError } = await supabase.from('user_specialties').insert(selectedSpecialties.map(specialty_id => ({ user_id: session.user.id, specialty_id })))
        if (insertError) throw insertError
      }
      setProfileMessage('Profilin ve uzmanlık alanların kaydedildi.')
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
      const { error: credentialError } = await supabase.from('professional_credentials').insert({ user_id: session.user.id, credential_type: credentialType, institution: institution.trim() || null, document_path: objectPath })
      if (credentialError) {
        await supabase.storage.from('credential-documents').remove([objectPath])
        throw credentialError
      }
      const { error: requestError } = await supabase.from('verification_requests').insert({ user_id: session.user.id, applicant_note: verificationNote.trim() || null })
      if (requestError) throw requestError
      setVerificationStatus('pending')
      await supabase.from('profiles').update({ verification_status: 'pending', updated_at: new Date().toISOString() }).eq('id', session.user.id)
      setProfileMessage('Doğrulama başvurun alındı. Bu form dosya yüklemez; belge yükleme alanı ayrıca kurulacak.')
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'Başvuru gönderilemedi.') }
    finally { setProfileBusy(false) }
  }

  const loadAdminRequests = async () => {
    if (!session?.user || !isAdmin) return
    setAdminBusy(true)
    try {
      const { data, error } = await supabase.from('verification_requests').select('id,user_id,status,applicant_note,created_at,profiles(display_name,professional_title),professional_credentials(credential_type,institution,document_path)').order('created_at', { ascending: false })
      if (error) throw error
      setAdminRequests(data || [])
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'Başvurular yüklenemedi.') }
    finally { setAdminBusy(false) }
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
    <header className="nav"><a className="logo" href="#">Ψ <span>PSYCHORA<small>THE PSYCHOLOGY NETWORK</small></span></a><nav><a href="#fields">Uzmanlıklar</a><a href="#turkiye">Türkiye</a><a href="#about">Hakkında</a></nav>{session ? <div className="nav-account"><span>{session.user.email}</span><button onClick={openProfile}>Profilim</button><button onClick={handleSignOut}>Çıkış yap</button></div> : <button onClick={() => openAuth('signup')}>Profesyonel olarak katıl</button>}</header>
    {session && <div className="session-strip">Oturum açıldı · {session.user.email}</div>}
    <section className="hero"><div className="eyebrow">TÜRKİYE'DEN DÜNYAYA</div><h1>Psikolojinin<br/><em>buluşma noktası.</em></h1><p>Psikoloji profesyonelleri için bilgi, mesleki bağlantı ve iş birliğinin buluştuğu yeni nesil profesyonel ağ.</p><button className="primary" onClick={() => session ? document.getElementById('fields')?.scrollIntoView({ behavior: 'smooth' }) : openAuth('signup')}>{session ? 'Ağı keşfet ↗' : 'Ücretsiz katıl ↗'}</button></section>
    <section className="stats"><div><b>81</b><span>Türkiye ili</span></div><div><b>12+</b><span>Uzmanlık kümesi</span></div><div><b>GLOBAL</b><span>Uluslararası mimari</span></div></section>
    <section id="fields" className="section"><label>DISCOVER YOUR FIELD</label><h2>Psikolojinin farklı <em>uzmanlıkları.</em></h2><div className="cards">{SPECIALTY_GROUPS.map(s=><article key={s.id}><small>{s.id.toUpperCase()}</small><h3>{s.name}</h3><p>{s.topics.join(' · ')}</p></article>)}</div></section>
    <section id="turkiye" className="section location"><label>TÜRKİYE FIRST · GLOBAL BY DESIGN</label><h2>81 ilden, <em>dünyaya açılan ağ.</em></h2><p>İlk odağımız Türkiye'nin 81 ili. Altyapı farklı ülkeler ve bölgelere genişleyebilecek şekilde tasarlanıyor.</p><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Şehir ara..."/><div className="cities">{provinces.map(p=><button className={city===p?'chosen':''} key={p} onClick={()=>setCity(p)}>{p}</button>)}</div>{city && <p className="chosen-text">Seçilen şehir: {city}</p>}</section>
    <section id="about" className="section about"><label>ONE PROFESSION. ONE NETWORK.</label><h2>Mesleki dünyanın ortak zemini.</h2><p>PSYCHORA; psikoloji profesyonellerini bilimsel paylaşım, mesleki bağlantı ve profesyonel gelişim için bir araya getirmeyi amaçlar.</p>{!session && <button className="primary" onClick={() => openAuth('signup')}>PSYCHORA'ya katıl ↗</button>}</section>
    <footer>© {new Date().getFullYear()} PSYCHORA · Türkiye'den dünyaya.</footer>

    {profileOpen && <div className="auth-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setProfileOpen(false) }}>
      <section className="auth-panel profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button className="auth-close" aria-label="Kapat" onClick={() => setProfileOpen(false)}>×</button>
        <div className="auth-mark">Ψ</div><div className="eyebrow">PSYCHORA PROFESSIONAL</div><h2 id="profile-title">Profesyonel profilin</h2>
        {profileBusy ? <p>Yükleniyor…</p> : <>
          <form onSubmit={saveProfile}>
            <label>Ad soyad<input required value={profile.display_name} onChange={e=>setProfile({...profile,display_name:e.target.value})}/></label>
            <label>Mesleki unvan<input value={profile.professional_title} onChange={e=>setProfile({...profile,professional_title:e.target.value})} placeholder="Örn. Klinik Psikolog"/></label>
            <label>Kısa biyografi<textarea rows={4} value={profile.bio} onChange={e=>setProfile({...profile,bio:e.target.value})} placeholder="Mesleki ilgi alanların ve deneyimin"/></label>
            <label>Profil görünürlüğü<select value={profile.profile_visibility} onChange={e=>setProfile({...profile,profile_visibility:e.target.value})}><option value="public">Herkese açık</option><option value="followers">Takipçiler</option><option value="private">Gizli</option></select></label>
            <div className="profile-specialties"><b>Uzmanlık alanları</b><div className="profile-specialty-list">{specialties.map(s=><label key={s.id}><input type="checkbox" checked={selectedSpecialties.includes(s.id)} onChange={e=>setSelectedSpecialties(old=>e.target.checked?[...old,s.id]:old.filter(id=>id!==s.id))}/>{s.name_tr}</label>)}</div></div>
            <button className="auth-submit" type="submit" disabled={profileBusy}>Profili kaydet</button>
          </form>
          <div className="verification-box"><h3>Mesleki kimlik doğrulaması</h3><p>Başvuru durumu: <strong>{verificationStatus==='pending'?'İncelemede':verificationStatus==='approved'?'Onaylandı':verificationStatus==='rejected'?'Reddedildi':verificationStatus==='resubmission'?'Yeniden başvuru gerekli':'Başvuru yok'}</strong></p>
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
