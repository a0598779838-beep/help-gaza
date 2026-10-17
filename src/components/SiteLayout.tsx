import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X, HeartHandshake } from 'lucide-react';

const links = [
  ['/', 'الرئيسية'],
  ['/aids', 'المساعدات'],
  ['/organizations', 'الجهات'],
  ['/about', 'عن المنصة'],
  ['/contact', 'تواصل / بلاغ'],
];

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <a className="skip-link" href="#main">انتقل إلى المحتوى</a>
      <header className="site-header">
        <div className="container nav-wrap">
          <Link to="/" className="brand" aria-label="دليل غزة للمساعدات - الرئيسية">
            <span className="brand-mark"><HeartHandshake size={23} /></span>
            <span>دليل غزة للمساعدات<small>Gaza Aid Guide</small></span>
          </Link>
          <button className="icon-button mobile-menu" aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav className={menuOpen ? 'main-nav open' : 'main-nav'} aria-label="القائمة الرئيسية">
            {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
            <NavLink to="/admin" className="admin-link" onClick={() => setMenuOpen(false)}>دخول المشرفين</NavLink>
          </nav>
        </div>
      </header>
      <main id="main"><Outlet /></main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div><Link to="/" className="brand footer-brand"><span className="brand-mark"><HeartHandshake size={22} /></span><span>دليل غزة للمساعدات<small>Gaza Aid Guide</small></span></Link><p>دليل معلوماتي مستقل. لا نقدم المساعدات ولا نضمن قبول طلبات التسجيل.</p></div>
          <div><strong>روابط مهمة</strong><Link to="/privacy">سياسة الخصوصية</Link><Link to="/terms">شروط الاستخدام</Link><Link to="/contact">الإبلاغ عن رابط مشبوه</Link></div>
          <div className="footer-note"><strong>تنبيه أمان</strong><p>تحقق دائمًا من نطاق الموقع الرسمي قبل إدخال أي معلومات. لا نطلب بيانات شخصية أو مالية.</p></div>
        </div>
        <div className="container copyright">© {new Date().getFullYear()} دليل غزة للمساعدات — مشروع معلوماتي مستقل</div>
      </footer>
    </>
  );
}
