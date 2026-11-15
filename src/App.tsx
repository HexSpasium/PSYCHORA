import { useMemo, useState } from 'react'
import { TURKIYE_PROVINCES } from './data/provinces'
import { SPECIALTY_GROUPS } from './data/specialties'

export default function App() {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const provinces = useMemo(() => TURKIYE_PROVINCES.filter(p => p.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))), [query])
  return <main className="page">
    <header className="nav"><a className="logo" href="#">Ψ <span>PSYCHORA<small>THE PSYCHOLOGY NETWORK</small></span></a><nav><a href="#fields">Uzmanlıklar</a><a href="#turkiye">Türkiye</a><a href="#about">Hakkında</a></nav><button onClick={() => alert('E-posta üyeliği sonraki aşamada bağlanacak.')}>Profesyonel olarak katıl</button></header>
    <section className="hero"><div className="eyebrow">TÜRKİYE'DEN DÜNYAYA</div><h1>Psikolojinin<br/><em>buluşma noktası.</em></h1><p>Psikoloji profesyonelleri için bilgi, mesleki bağlantı ve iş birliğinin buluştuğu yeni nesil profesyonel ağ.</p><a className="primary" href="#fields">Ağı keşfet ↗</a></section>
    <section className="stats"><div><b>81</b><span>Türkiye ili</span></div><div><b>12+</b><span>Uzmanlık kümesi</span></div><div><b>GLOBAL</b><span>Uluslararası mimari</span></div></section>
    <section id="fields" className="section"><label>DISCOVER YOUR FIELD</label><h2>Psikolojinin farklı <em>uzmanlıkları.</em></h2><div className="cards">{SPECIALTY_GROUPS.map(s=><article key={s.id}><small>{s.id.toUpperCase()}</small><h3>{s.name}</h3><p>{s.topics.join(' · ')}</p></article>)}</div></section>
    <section id="turkiye" className="section location"><label>TÜRKİYE FIRST · GLOBAL BY DESIGN</label><h2>81 ilden, <em>dünyaya açılan ağ.</em></h2><p>İlk odağımız Türkiye'nin 81 ili. Altyapı farklı ülkeler ve bölgelere genişleyebilecek şekilde tasarlanıyor.</p><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Şehir ara..."/><div className="cities">{provinces.map(p=><button className={city===p?'chosen':''} key={p} onClick={()=>setCity(p)}>{p}</button>)}</div>{city && <p className="chosen-text">Seçilen şehir: {city}</p>}</section>
    <section id="about" className="section about"><label>ONE PROFESSION. ONE NETWORK.</label><h2>Mesleki dünyanın ortak zemini.</h2><p>PSYCHORA; psikoloji profesyonellerini bilimsel paylaşım, mesleki bağlantı ve profesyonel gelişim için bir araya getirmeyi amaçlar.</p></section>
    <footer>© {new Date().getFullYear()} PSYCHORA · Türkiye'den dünyaya.</footer>
  </main>
}
