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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) setErrorMessage(error.message)
    else setMessage('Oturumun kapatıldı.')
  }

  return <main className="page">
    <header className="nav"><a className="logo" href="#">Ψ <span>PSYCHORA<small>THE PSYCHOLOGY NETWORK</small></span></a><nav><a href="#fields">Uzmanlıklar</a><a href="#turkiye">Türkiye</a><a href="#about">Hakkında</a></nav>{session ? <div className="nav-account"><span>{session.user.email}</span><button onClick={handleSignOut}>Çıkış yap</button></div> : <button onClick={() => openAuth('signup')}>Profesyonel olarak katıl</button>}</header>
    {session && <div className="session-strip">Oturum açıldı · {session.user.email}</div>}
    <section className="hero"><div className="eyebrow">TÜRKİYE'DEN DÜNYAYA</div><h1>Psikolojinin<br/><em>buluşma noktası.</em></h1><p>Psikoloji profesyonelleri için bilgi, mesleki bağlantı ve iş birliğinin buluştuğu yeni nesil profesyonel ağ.</p><button className="primary" onClick={() => session ? document.getElementById('fields')?.scrollIntoView({ behavior: 'smooth' }) : openAuth('signup')}>{session ? 'Ağı keşfet ↗' : 'Ücretsiz katıl ↗'}</button></section>
    <section className="stats"><div><b>81</b><span>Türkiye ili</span></div><div><b>12+</b><span>Uzmanlık kümesi</span></div><div><b>GLOBAL</b><span>Uluslararası mimari</span></div></section>
    <section id="fields" className="section"><label>DISCOVER YOUR FIELD</label><h2>Psikolojinin farklı <em>uzmanlıkları.</em></h2><div className="cards">{SPECIALTY_GROUPS.map(s=><article key={s.id}><small>{s.id.toUpperCase()}</small><h3>{s.name}</h3><p>{s.topics.join(' · ')}</p></article>)}</div></section>
    <section id="turkiye" className="section location"><label>TÜRKİYE FIRST · GLOBAL BY DESIGN</label><h2>81 ilden, <em>dünyaya açılan ağ.</em></h2><p>İlk odağımız Türkiye'nin 81 ili. Altyapı farklı ülkeler ve bölgelere genişleyebilecek şekilde tasarlanıyor.</p><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Şehir ara..."/><div className="cities">{provinces.map(p=><button className={city===p?'chosen':''} key={p} onClick={()=>setCity(p)}>{p}</button>)}</div>{city && <p className="chosen-text">Seçilen şehir: {city}</p>}</section>
    <section id="about" className="section about"><label>ONE PROFESSION. ONE NETWORK.</label><h2>Mesleki dünyanın ortak zemini.</h2><p>PSYCHORA; psikoloji profesyonellerini bilimsel paylaşım, mesleki bağlantı ve profesyonel gelişim için bir araya getirmeyi amaçlar.</p>{!session && <button className="primary" onClick={() => openAuth('signup')}>PSYCHORA'ya katıl ↗</button>}</section>
    <footer>© {new Date().getFullYear()} PSYCHORA · Türkiye'den dünyaya.</footer>

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
