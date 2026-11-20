import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, API_ORIGIN } from './api.js';

const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);
const roleNames = { admin: 'Administrator', owner: 'Store owner', user: 'Customer' };

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api('/auth/me').then(({ user }) => setUser(user)).catch(() => {}).finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="loading">Loading…</div>;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <ApiStatusBanner />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <AuthPage register />} />
        <Route path="/*" element={user ? <Shell /> : <Navigate to="/login" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

function ApiStatusBanner() {
  const [available, setAvailable] = useState(true);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    let active = true;
    const check = async () => {
      try { await api('/health'); if (active) setAvailable(true); }
      catch { if (active) setAvailable(false); }
    };
    check();
    const interval = setInterval(check, 12000);
    return () => { active = false; clearInterval(interval); };
  }, []);
  async function retry() {
    setChecking(true);
    try { await api('/health'); setAvailable(true); }
    catch { setAvailable(false); }
    finally { setChecking(false); }
  }
  if (available) return null;
  return <div className="api-status-banner" role="alert"><span>Can’t connect to Rate Store. Check that the app and database are running.</span><button type="button" onClick={retry} disabled={checking}>{checking ? 'Checking…' : 'Retry'}</button></div>;
}

function Shell() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const home = user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/stores';

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } finally { setUser(null); navigate('/login'); }
  }

  async function deleteOwnedStore() {
    const confirmed = window.confirm('Delete your store and owner account? This permanently removes the store, ratings, and review photos. You will be signed out.');
    if (!confirmed) return;
    try {
      await api('/owner/store', { method: 'DELETE' });
      setUser(null);
      navigate('/login');
    } catch (error) {
      window.alert(error.message);
    }
  }

  const navigation = user.role === 'admin'
    ? [['/admin', 'Overview'], ['/admin/stores', 'Stores'], ['/admin/users', 'Users']]
    : user.role === 'owner' ? [['/owner', 'Store dashboard']] : [['/stores', 'Stores']];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to={home}><img className="brand-mark" src="/storefront-star.svg" alt="" /><span>Rate Store</span></Link>
        <div className="nav-label">Menu</div>
        <nav>{navigation.map(([path, label]) => <NavLink key={path} className={({ isActive }) => `nav-link${isActive && location.pathname === path ? ' active' : ''}`} to={path}>{label}</NavLink>)}</nav>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <details className="account-menu">
            <summary><svg className="account-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.4-3.5 2.7-5.5 6.5-5.5s6.1 2 6.5 5.5" /></svg><span>{roleNames[user.role]}</span><svg className="account-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg></summary>
            <div className="account-dropdown">
              {user.role === 'owner' && <><button type="button" onClick={event => { event.currentTarget.closest('details').open = false; document.getElementById('owner-store-dialog')?.showModal(); }}>Edit store</button><button className="danger" type="button" onClick={event => { event.currentTarget.closest('details').open = false; deleteOwnedStore(); }}>Delete store</button></>}
              <button type="button" onClick={event => { event.currentTarget.closest('details').open = false; document.getElementById('password-dialog')?.showModal(); }}>Change password</button>
              <button type="button" onClick={logout}>Sign out</button>
            </div>
          </details>
        </header>
        <Routes>
          <Route path="/" element={<Navigate to={home} replace />} />
          <Route path="/stores" element={user.role === 'user' ? <StoreDirectory /> : <Navigate to={home} replace />} />
          <Route path="/admin" element={user.role === 'admin' ? <AdminHome /> : <Navigate to={home} replace />} />
          <Route path="/admin/stores" element={user.role === 'admin' ? <AdminStores /> : <Navigate to={home} replace />} />
          <Route path="/admin/users" element={user.role === 'admin' ? <AdminUsers /> : <Navigate to={home} replace />} />
          <Route path="/owner" element={user.role === 'owner' ? <OwnerHome /> : <Navigate to={home} replace />} />
          <Route path="*" element={<Navigate to={home} replace />} />
        </Routes>
      </main>
      <PasswordDialog />
      {user.role === 'owner' && <OwnerStoreDialog />}
    </div>
  );
}

function PasswordDialog() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(''); setSuccess('');
    try {
      await api('/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword: form.get('currentPassword'), password: form.get('password') }) });
      setSuccess('Password updated.'); event.currentTarget.reset();
    } catch (err) { setError(err.message); }
  }

  return (
    <dialog id="password-dialog" className="dialog">
      <form onSubmit={submit}>
        <div className="dialog-head"><h2>Change password</h2><button type="button" className="close" onClick={() => document.getElementById('password-dialog').close()}>Close</button></div>
        <label>Current password<input name="currentPassword" type="password" required /></label>
        <label>New password<input name="password" type="password" minLength="8" maxLength="16" pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}" required /><small>8–16 characters, with an uppercase letter and a special character.</small></label>
        {error && <p className="error">{error}</p>}{success && <p className="success">{success}</p>}
        <div className="dialog-actions"><button className="button save">Save password</button><button type="button" className="button secondary" onClick={() => document.getElementById('password-dialog').close()}>Cancel</button></div>
      </form>
    </dialog>
  );
}

function OwnerStoreDialog() {
  const { user, setUser } = useAuth();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api('/owner/dashboard?limit=1')
      .then(data => setStore(data.store))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event) {
    event.preventDefault(); setError(''); setSuccess('');
    const form = new FormData(event.currentTarget);
    try {
      const data = await api('/owner/profile', { method: 'PUT', body: JSON.stringify(Object.fromEntries(form.entries())) });
      setUser(data.user); setStore(data.store); setSuccess('Store details updated. The changes are visible in store listings and admin pages.');
    } catch (err) { setError(err.message); }
  }

  return (
    <dialog id="owner-store-dialog" className="dialog owner-store-dialog">
      <form onSubmit={submit}>
        <div className="dialog-head"><h2>Edit store</h2><button type="button" className="close" onClick={() => document.getElementById('owner-store-dialog').close()}>Close</button></div>
        {loading ? <p className="muted">Loading store details…</p> : <>
          <label>Owner name<input name="name" defaultValue={user.name} minLength="1" maxLength="60" required /></label>
          <label>Owner email<input name="email" type="email" autoComplete="email" defaultValue={user.email} required /><small>This email is used to sign in and appears on your store listing.</small></label>
          <label>Store name<input name="storeName" defaultValue={store?.name || ''} minLength="20" maxLength="60" required /></label>
          <label>Store address<textarea name="address" defaultValue={store?.address || ''} maxLength="400" required rows="3" /></label>
        </>}
        {error && <p className="error">{error}</p>}{success && <p className="success">{success}</p>}
        <div className="dialog-actions"><button className="button save" disabled={loading || !store}>Save changes</button><button type="button" className="button secondary" onClick={() => document.getElementById('owner-store-dialog').close()}>Cancel</button></div>
      </form>
    </dialog>
  );
}

function AuthPage({ register = false }) {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const { user } = await api(register ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(body) });
      setUser(user); navigate(user.role === 'admin' ? '/admin' : user.role === 'owner' ? '/owner' : '/stores');
    } catch (err) { setError(err.code === 'ACCOUNT_NOT_FOUND' && !register ? 'ACCOUNT_NOT_FOUND' : err.message); } finally { setBusy(false); }
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <Link className="brand auth-brand" to="/login"><img className="brand-mark" src="/storefront-star.svg" alt="" /><span>Rate Store</span></Link>
        <h1>{register ? 'Create account' : 'Sign in'}</h1>
        <form onSubmit={submit} className="form-stack">
          {register && <label>Name<input name="name" minLength="1" maxLength="60" autoComplete="name" required /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>{register ? 'Create password' : 'Password'}<PasswordInput name="password" minLength={register ? 8 : undefined} maxLength={register ? 16 : undefined} pattern={register ? '(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}' : undefined} autoComplete={register ? 'new-password' : 'current-password'} required />
            {register && <small>8–16 characters, including an uppercase letter and a special character.</small>}
          </label>
          {register && <label>Confirm password<PasswordInput name="confirmPassword" minLength="8" maxLength="16" autoComplete="new-password" required /></label>}
          {error === 'ACCOUNT_NOT_FOUND' ? <p className="error">No account exists with this email. <Link to="/register">Create an account</Link>.</p> : error && <p className="error">{error}</p>}
          <button className="button primary full" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
        </form>
        <p className="auth-switch">{register ? 'Already have an account?' : 'Need an account?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Register'}</Link></p>
      </section>
    </main>
  );
}

function PasswordInput({ name, ...props }) {
  const [visible, setVisible] = useState(false);
  return <span className="password-input"><input name={name} type={visible ? 'text' : 'password'} {...props} /><button className="password-toggle" type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide password' : 'Show password'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" />{visible && <path d="m4 4 16 16" />}</svg></button></span>;
}

function PageHeading({ title, action }) {
  return <div className="page-heading"><h1>{title}</h1>{action}</div>;
}

function StatCard({ label, value, note }) {
  return <div className="stat-card"><span className="stat-label">{label}</span><strong>{value ?? '—'}</strong>{note && <small>{note}</small>}</div>;
}

function ColumnFilter({ label, field, sort, direction, onSort, value, onChange, placeholder, options, type = 'search', min, max, step }) {
  return <div className="column-filter">
    <button className="sort-heading" type="button" onClick={() => field && onSort?.(field)} aria-label={field ? `Sort by ${label} ${sort === field && direction === 'asc' ? 'descending' : 'ascending'}` : label} title={field ? `Sort by ${label}` : label}>
      <span>{label}</span>{field && <span className={`sort-indicator${sort === field ? ' active' : ''}`} aria-hidden="true">{sort === field ? direction === 'asc' ? '↑' : '↓' : '↕'}</span>}
    </button>
    {onChange && (options ? <select aria-label={`Filter ${label}`} value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input aria-label={`Filter ${label}`} type={type} min={min} max={max} step={step} value={value} placeholder={placeholder || 'Filter'} onChange={event => onChange(event.target.value)} />)}
  </div>;
}

function Pagination({ offset, limit, total, onChange }) {
  if (total <= limit) return null;
  const first = offset + 1;
  const last = Math.min(offset + limit, total);
  return <div className="pagination"><span>{first}–{last} of {total}</span><div><button className="button secondary" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))}>Previous</button><button className="button secondary" disabled={offset + limit >= total} onClick={() => onChange(offset + limit)}>Next</button></div></div>;
}

function AdminHome() {
  const [stats, setStats] = useState(null);
  const [stores, setStores] = useState([]);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('name');
  const [direction, setDirection] = useState('asc');
  const [filters, setFilters] = useState({ name: '', ownerName: '', email: '', address: '' });
  useEffect(() => { api('/admin/summary').then(setStats).catch(err => setError(err.message)); }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
    const params = new URLSearchParams({ limit: '5', sort, direction });
    for (const [field, value] of Object.entries(filters)) if (value.trim()) params.set(field, value.trim());
    api('/admin/stores?' + params).then(data => setStores(data.stores)).catch(err => setError(err.message));
    }, 140);
    return () => clearTimeout(timer);
  }, [sort, direction, filters]);
  const changeSort = field => { if (sort === field) setDirection(current => current === 'asc' ? 'desc' : 'asc'); else { setSort(field); setDirection('asc'); } };
  const changeFilter = (field, value) => setFilters(current => ({ ...current, [field]: value }));

  return <div className="content">
    <PageHeading title="Overview" action={<Link className="button primary" to="/admin/users?new=owner">Add store owner</Link>} />
    {error && <p className="error">{error}</p>}
    <section className="stats-grid">
      <StatCard label="Users" value={stats?.users} />
      <StatCard label="Stores" value={stats?.stores} />
      <StatCard label="Ratings" value={stats?.ratings} />
    </section>
    <section className="section-block">
      <div className="section-title"><h2>Stores</h2></div>
      <StoreTable stores={stores} admin filters={filters} onFilter={changeFilter} sort={sort} direction={direction} onSort={changeSort} />
    </section>
  </div>;
}

function StoreDirectory() {
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState({ name: '', address: '' });
  const [sort, setSort] = useState('name');
  const [direction, setDirection] = useState('asc');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 25;

  async function load() {
    setLoading(true); setError('');
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset), sort, direction });
    for (const [field, value] of Object.entries(search)) if (value.trim()) params.set(field, value.trim());
    try { const data = await api('/stores?' + params); setStores(data.stores); setTotal(data.total); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { const timer = setTimeout(load, 120); return () => clearTimeout(timer); }, [search.name, search.address, sort, direction, offset]);

  async function saveReview(storeId, { score, review, image }) {
    const body = new FormData();
    body.set('score', String(score)); body.set('review', review);
    if (image) body.set('image', image);
    await api('/stores/' + storeId + '/rating', { method: 'PUT', body });
    await load();
  }
  const changeSort = field => { if (sort === field) setDirection(current => current === 'asc' ? 'desc' : 'asc'); else { setSort(field); setDirection('asc'); } setOffset(0); };
  const changeSearch = (field, value) => { setSearch(current => ({ ...current, [field]: value })); setOffset(0); };

  return <div className="content">
    <PageHeading title="Stores" />
    {error && <p className="error">{error}</p>}
    {loading ? <p className="muted">Loading…</p> : <>
      <div className="table-wrap"><table className="store-directory-table"><thead><tr>
        <th><ColumnFilter label="Store" field="name" sort={sort} direction={direction} onSort={changeSort} value={search.name} onChange={value => changeSearch('name', value)} /></th>
        <th><ColumnFilter label="Address" field="address" sort={sort} direction={direction} onSort={changeSort} value={search.address} onChange={value => changeSearch('address', value)} /></th>
        <th><ColumnFilter label="Overall rating" field="rating" sort={sort} direction={direction} onSort={changeSort} /></th>
        <th><ColumnFilter label="Your rating & review" field="userRating" sort={sort} direction={direction} onSort={changeSort} /></th>
      </tr></thead><tbody>
        {stores.length ? stores.map(store => <tr key={store.id}><td className="strong-cell">{store.name}</td><td>{store.address}</td><td><RatingStars value={store.averageRating} /></td><td><StoreReviewForm store={store} onSave={payload => saveReview(store.id, payload)} /></td></tr>) : <tr><td className="no-results" colSpan="4">No stores match these filters.</td></tr>}
      </tbody></table></div>
      <Pagination offset={offset} limit={limit} total={total} onChange={setOffset} />
    </>}
  </div>;
}

function StarPicker({ value, onChange }) {
  const tone = value < 0.5 ? '' : value <= 2 ? 'low' : value < 4 ? 'mid' : 'high';
  return <div className={`star-picker ${tone ? `star-${tone}` : ''}`} role="group" aria-label="Choose a rating">
    <div className="star-picker-icons">{[1, 2, 3, 4, 5].map(star => {
      const fill = value >= star ? 100 : value >= star - 0.5 ? 50 : 0;
      return <span className="rating-star" key={star}>
        <span className="star-outline" aria-hidden="true">★</span>
        <span className="star-fill" aria-hidden="true" style={{ width: `${fill}%` }}>★</span>
        <button className="star-hit star-hit-half" type="button" aria-label={`${star - 0.5} stars`} onClick={() => onChange(star - 0.5)} />
        <button className="star-hit star-hit-full" type="button" aria-label={`${star} stars`} onClick={() => onChange(star)} />
      </span>;
    })}</div>
    <span className="rating-value">{value ? `${Number(value).toFixed(1)} / 5` : 'Choose stars'}</span>
  </div>;
}

function RatingStars({ value }) {
  const rating = Math.min(5, Math.max(0, Number(value) || 0));
  if (!rating) return <span className="muted">—</span>;
  const tone = rating <= 2 ? 'low' : rating < 4 ? 'mid' : 'high';
  return <span className={`rating-display star-${tone}`} role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
    <span className="rating-display-stars">{[1, 2, 3, 4, 5].map(star => {
      const fill = Math.max(0, Math.min(1, rating - star + 1)) * 100;
      return <span className="rating-star" key={star}><span className="star-outline" aria-hidden="true">★</span><span className="star-fill" aria-hidden="true" style={{ width: `${fill}%` }}>★</span></span>;
    })}</span>
    <span className="rating-value">{rating.toFixed(1)}</span>
  </span>;
}

function StoreReviewForm({ store, onSave }) {
  const [score, setScore] = useState(Number(store.userRating) || 0);
  const [review, setReview] = useState(store.userReview || '');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(store.userImageUrl ? `${API_ORIGIN}${store.userImageUrl}` : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setScore(Number(store.userRating) || 0);
    setReview(store.userReview || '');
    setImage(null);
    setPreview(store.userImageUrl ? `${API_ORIGIN}${store.userImageUrl}` : '');
  }, [store.id, store.userRating, store.userReview, store.userImageUrl]);

  useEffect(() => {
    if (!image) return;
    const objectUrl = URL.createObjectURL(image);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  async function submit(event) {
    event.preventDefault();
    setError(''); setBusy(true);
    try { await onSave({ score, review, image }); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <form className="review-form" onSubmit={submit}>
    <StarPicker value={score} onChange={setScore} />
    <textarea value={review} onChange={event => setReview(event.target.value)} maxLength="2000" rows="2" placeholder="Write a review" aria-label={`Review for ${store.name}`} />
    <div className="review-form-actions">
      <label className="image-upload"><span>{image ? image.name : 'Add photo'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0] || null; setImage(file); if (!file) setPreview(store.userImageUrl ? `${API_ORIGIN}${store.userImageUrl}` : ''); }} /></label>
      <button className="button save" type="submit" disabled={!score || busy}>{busy ? 'Saving…' : 'Save'}</button>
    </div>
    {preview && <img className="review-image-preview" src={preview} alt={`Review for ${store.name}`} />}
    {error && <p className="error review-error">{error}</p>}
  </form>;
}

function StoreTable({ stores, admin = false, filters, onFilter, sort, direction, onSort, onEdit, onDelete }) {
  const hasActions = Boolean(onEdit || onDelete);
  return <div className="table-wrap"><table className="filterable-table"><thead><tr>
    <th><ColumnFilter label="Name" field="name" sort={sort} direction={direction} onSort={onSort} value={filters?.name || ''} onChange={onFilter ? value => onFilter('name', value) : undefined} /></th>
    {admin && <th><ColumnFilter label="Owner name" field="ownerName" sort={sort} direction={direction} onSort={onSort} value={filters?.ownerName || ''} onChange={onFilter ? value => onFilter('ownerName', value) : undefined} placeholder="Search owner" /></th>}
    <th><ColumnFilter label={admin ? 'Owner email' : 'Email'} field="email" sort={sort} direction={direction} onSort={onSort} value={filters?.email || ''} onChange={onFilter ? value => onFilter('email', value) : undefined} /></th>
    <th><ColumnFilter label="Address" field="address" sort={sort} direction={direction} onSort={onSort} value={filters?.address || ''} onChange={onFilter ? value => onFilter('address', value) : undefined} /></th>
    <th><ColumnFilter label="Rating" field="rating" sort={sort} direction={direction} onSort={onSort} value={filters?.minRating || ''} onChange={onFilter ? value => onFilter('minRating', value) : undefined} type="number" min="0" max="5" step="0.1" placeholder="Min" /></th>
    {hasActions && <th>Actions</th>}
  </tr></thead><tbody>
    {stores?.length ? stores.map(store => <tr key={store.id}><td className="strong-cell">{store.name}</td>{admin && <td>{store.ownerName || '—'}</td>}<td>{store.email}</td><td>{store.address}</td><td><RatingStars value={store.averageRating} /></td>{hasActions && <td className="row-actions">{onEdit && <button className="icon-action edit-action" type="button" onClick={() => onEdit(store)} aria-label={`Edit ${store.name}`} title="Edit store"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5H6.8A2.8 2.8 0 0 0 4 7.8v9.4A2.8 2.8 0 0 0 6.8 20h9.4a2.8 2.8 0 0 0 2.8-2.8v-6.7" /><path d="m11 13 7.8-7.8a2.1 2.1 0 0 1 3 3L14 16l-4 1z" /></svg></button>}{onDelete && <button className="icon-action delete-action" type="button" onClick={() => onDelete(store)} aria-label={`Delete ${store.name}`} title="Delete store"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m3 4v6m6-6v6" /></svg></button>}</td>}</tr>) : <tr><td className="no-results" colSpan={(admin ? 5 : 4) + (hasActions ? 1 : 0)}>No stores match these filters.</td></tr>}
  </tbody></table></div>;
}

function AdminStores() {
  const [stores, setStores] = useState([]);
  const [filters, setFilters] = useState({ name: '', ownerName: '', email: '', address: '', minRating: '' });
  const [sortValue, setSortValue] = useState('name:asc');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const limit = 25;
  const [sort, direction] = sortValue.split(':');
  const changeSort = field => { setSortValue(current => { const [active, order] = current.split(':'); return `${field}:${active === field && order === 'asc' ? 'desc' : 'asc'}`; }); setOffset(0); };

  async function load() {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset), sort, direction });
    for (const [field, value] of Object.entries(filters)) if (value.trim()) params.set(field, value.trim());
    try { const data = await api(`/admin/stores?${params}`); setStores(data.stores); setTotal(data.total); setError(''); }
    catch (err) { setError(err.message); }
  }
  useEffect(() => { const timer = setTimeout(load, 140); return () => clearTimeout(timer); }, [filters, sortValue, offset]);

  async function deleteStore(store) {
    const message = `Delete “${store.name}” and its owner account? This also removes the store's ratings and review photos.`;
    if (!window.confirm(message)) return;
    setError('');
    try {
      await api(`/admin/stores/${store.id}`, { method: 'DELETE' });
      const nextOffset = stores.length === 1 ? Math.max(0, offset - limit) : offset;
      if (nextOffset !== offset) setOffset(nextOffset); else await load();
    }
    catch (err) { setError(err.message); }
  }
  const updateFilter = (field, value) => { setFilters(current => ({ ...current, [field]: value })); setOffset(0); };

  return (
    <div className="content">
      <PageHeading title="Stores" />
      {error && <p className="error">{error}</p>}<StoreTable stores={stores} admin filters={filters} onFilter={updateFilter} sort={sort} direction={direction} onSort={changeSort} onDelete={deleteStore} />
      <Pagination offset={offset} limit={limit} total={total} onChange={setOffset} />
    </div>
  );
}

function AdminUsers() {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ name: '', email: '', address: '', role: '', minRating: '' });
  const [sortValue, setSortValue] = useState('name:asc');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUserRole, setNewUserRole] = useState('user');
  const [showOwnerStore, setShowOwnerStore] = useState(false);
  const [error, setError] = useState('');
  const limit = 25;
  const [sort, direction] = sortValue.split(':');
  const showUserActions = users.some(user => user.role !== 'user');
  const changeSort = field => { setSortValue(current => { const [active, order] = current.split(':'); return `${field}:${active === field && order === 'asc' ? 'desc' : 'asc'}`; }); setOffset(0); };

  useEffect(() => {
    if (new URLSearchParams(location.search).get('new') !== 'owner') return;
    setNewUserRole('owner'); setShowOwnerStore(true); setShowForm(true);
    navigate('/admin/users', { replace: true });
  }, [location.search, navigate]);

  async function load() {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset), sort, direction });
    for (const [field, value] of Object.entries(filters)) if (value.trim()) params.set(field, value.trim());
    try { const data = await api(`/admin/users?${params}`); setUsers(data.users); setTotal(data.total); setError(''); }
    catch (err) { setError(err.message); }
  }
  useEffect(() => { const timer = setTimeout(load, 140); return () => clearTimeout(timer); }, [filters, sortValue, offset]);

  async function create(event) {
    event.preventDefault(); setError('');
    if (newUserRole === 'owner' && !showOwnerStore) { setError('Choose Add store and enter the store details before creating the owner account.'); return; }
    const form = event.currentTarget;
    try {
      await api('/admin/users', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      setShowForm(false); setNewUserRole('user'); setShowOwnerStore(false); form.reset();
      if (offset !== 0) setOffset(0); else await load();
    }
    catch (err) { setError(err.message); }
  }
  async function updateUser(event) {
    event.preventDefault(); setError('');
    const form = event.currentTarget;
    try {
      await api(`/admin/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      setEditingUser(null); await load();
    } catch (err) { setError(err.message); }
  }
  async function deleteUser(user) {
    if (String(user.id) === String(currentUser.id)) { setError('You cannot delete the account you are currently using.'); return; }
    const ownedStore = user.role === 'owner' ? ` The owner’s store, its ratings, and review photos will also be removed.` : '';
    const message = `Delete ${user.name} (${roleNames[user.role]})? Their submitted ratings and review photos will be removed.${ownedStore}`;
    if (!window.confirm(message)) return;
    setError('');
    try {
      await api(`/admin/users/${user.id}`, { method: 'DELETE' });
      const nextOffset = users.length === 1 ? Math.max(0, offset - limit) : offset;
      if (nextOffset !== offset) setOffset(nextOffset); else await load();
    }
    catch (err) { setError(err.message); }
  }
  const updateFilter = (field, value) => { setFilters(current => ({ ...current, [field]: value })); setOffset(0); };

  return (
    <div className="content">
      <PageHeading title="Users" action={<button className="button primary" onClick={() => { setNewUserRole('user'); setShowOwnerStore(false); setShowForm(true); }}>Add user</button>} />
      {error && <p className="error">{error}</p>}
      <div className="table-wrap"><table className="filterable-table"><thead><tr>
        <th><ColumnFilter label="Name" field="name" sort={sort} direction={direction} onSort={changeSort} value={filters.name} onChange={value => updateFilter('name', value)} /></th>
        <th><ColumnFilter label="Email" field="email" sort={sort} direction={direction} onSort={changeSort} value={filters.email} onChange={value => updateFilter('email', value)} /></th>
        <th><ColumnFilter label="Address" field="address" sort={sort} direction={direction} onSort={changeSort} value={filters.address} onChange={value => updateFilter('address', value)} /></th>
        <th><ColumnFilter label="Role" field="role" sort={sort} direction={direction} onSort={changeSort} value={filters.role} onChange={value => updateFilter('role', value)} options={[{ value: '', label: 'All roles' }, { value: 'admin', label: 'Administrator' }, { value: 'user', label: 'Customer' }, { value: 'owner', label: 'Store owner' }]} /></th>
        <th><ColumnFilter label="Store rating" field="storeRating" sort={sort} direction={direction} onSort={changeSort} value={filters.minRating} onChange={value => updateFilter('minRating', value)} type="number" min="0" max="5" step="0.1" placeholder="Min" /></th>
        {showUserActions && <th>Actions</th>}
      </tr></thead><tbody>{users.map(user => <tr key={user.id}><td className="strong-cell">{user.name}</td><td>{user.email}</td><td>{user.address}</td><td>{roleNames[user.role]}</td><td><RatingStars value={user.role === 'owner' ? user.averageRating : 0} /></td>{showUserActions && <td className="row-actions">{user.role === 'user' ? '—' : <><button className="icon-action edit-action" type="button" onClick={() => setEditingUser(user)} aria-label={`Edit ${user.name}`} title="Edit user"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5H6.8A2.8 2.8 0 0 0 4 7.8v9.4A2.8 2.8 0 0 0 6.8 20h9.4a2.8 2.8 0 0 0 2.8-2.8v-6.7" /><path d="m11 13 7.8-7.8a2.1 2.1 0 0 1 3 3L14 16l-4 1z" /></svg></button><button className="icon-action delete-action" type="button" onClick={() => deleteUser(user)} disabled={String(user.id) === String(currentUser.id)} aria-label={`Delete ${user.name}`} title={String(user.id) === String(currentUser.id) ? 'You cannot delete the account you are using' : 'Delete user'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m3 4v6m6-6v6" /></svg></button></>}</td>}</tr>)}</tbody></table></div>
      <Pagination offset={offset} limit={limit} total={total} onChange={setOffset} />
      {showForm && <Modal title="Add a user" close={() => { setShowForm(false); setNewUserRole('user'); setShowOwnerStore(false); }}><form className="form-stack" onSubmit={create}>
        <label>Name<input name="name" minLength="1" maxLength="60" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        {newUserRole !== 'owner' && <label>Address<textarea name="address" maxLength="400" required rows="2" /></label>}
        <label>Temporary password<PasswordInput name="password" minLength="8" maxLength="16" pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}" autoComplete="new-password" required /><small>8–16 characters, with an uppercase letter and a special character.</small></label>
        <label>Role<select name="role" value={newUserRole} onChange={event => { setNewUserRole(event.target.value); setShowOwnerStore(false); }}><option value="user">Customer</option><option value="owner">Store owner</option><option value="admin">Administrator</option></select></label>
        {newUserRole === 'owner' && <div className="owner-store-step"><button className="button secondary" type="button" onClick={() => setShowOwnerStore(value => !value)}>{showOwnerStore ? 'Remove store details' : 'Add store'}</button>{showOwnerStore && <><p className="muted">The owner's email is used for sign-in and shown on the store listing.</p><label>Store name<input name="storeName" minLength="20" maxLength="60" required /></label><label>Store address<textarea name="storeAddress" maxLength="400" required rows="2" /></label></>}</div>}
        {error && <p className="error">{error}</p>}<button className="button save">Create user</button>
      </form></Modal>}
      {editingUser && <Modal title={`Edit ${roleNames[editingUser.role].toLowerCase()}`} close={() => setEditingUser(null)}><form className="form-stack" onSubmit={updateUser}>
        <label>Name<input name="name" defaultValue={editingUser.name} minLength="1" maxLength="60" required /></label>
        <label>{editingUser.role === 'owner' ? 'Owner email' : 'Email'}<input name="email" type="email" defaultValue={editingUser.email} required /></label>
        <label>Address<textarea name="address" defaultValue={editingUser.address} maxLength="400" required rows="2" /></label>
        <label>Role<input value={roleNames[editingUser.role]} readOnly /></label>
        {editingUser.role === 'owner' && <small>For store owners, changing the address also updates the linked store address.</small>}
        <label>New temporary password<PasswordInput name="password" minLength="8" maxLength="16" pattern="(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}" autoComplete="new-password" /><small>Leave blank to keep the current password. If entered, it must be 8–16 characters with an uppercase letter and a special character.</small></label>
        {error && <p className="error">{error}</p>}<button className="button save">Save changes</button>
      </form></Modal>}
    </div>
  );
}

function OwnerHome() {
  const [data, setData] = useState(null);
  const [sortValue, setSortValue] = useState('updated:desc');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const limit = 25;
  const [sort, direction] = sortValue.split(':');
  useEffect(() => {
    const timer = setTimeout(() => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset), sort, direction });
    api('/owner/dashboard?' + params).then(setData).catch(err => setError(err.message));
    }, 140);
    return () => clearTimeout(timer);
  }, [sortValue, offset]);
  const changeSort = field => { setSortValue(current => { const [active, order] = current.split(':'); return `${field}:${active === field && order === 'asc' ? 'desc' : 'asc'}`; }); setOffset(0); };

  return (
    <div className="content">
      <PageHeading title={data?.store?.name || 'Store dashboard'} />
      {error && <p className="error">{error}</p>}
      {!data?.store && !error ? <EmptyState title="No store is assigned" text="Ask an administrator to link a store to your account." /> : <>
        <section className="stats-grid owner-stats"><StatCard label="Average rating" value={<RatingStars value={data?.averageRating} />} /><StatCard label="Ratings received" value={data?.total ?? '—'} /></section>
        <section className="section-block">
          <div className="section-title"><h2>Customer ratings</h2></div>
          <div className="table-wrap"><table className="filterable-table"><thead><tr>
            <th><ColumnFilter label="Name" field="name" sort={sort} direction={direction} onSort={changeSort} /></th>
            <th><ColumnFilter label="Email" field="email" sort={sort} direction={direction} onSort={changeSort} /></th>
            <th><ColumnFilter label="Rating" field="rating" sort={sort} direction={direction} onSort={changeSort} /></th>
            <th><ColumnFilter label="Review" field="review" sort={sort} direction={direction} onSort={changeSort} /></th>
            <th><ColumnFilter label="Photo" field="photo" sort={sort} direction={direction} onSort={changeSort} /></th>
            <th><ColumnFilter label="Updated" field="updated" sort={sort} direction={direction} onSort={changeSort} /></th>
          </tr></thead><tbody>{data?.ratings?.map(rating => <tr key={rating.id}><td className="strong-cell">{rating.name}</td><td>{rating.email}</td><td><RatingStars value={rating.score} /></td><td>{rating.review || '—'}</td><td>{rating.imagePath && <a href={`${API_ORIGIN}${rating.imagePath}`} target="_blank" rel="noreferrer"><img className="rating-thumbnail" src={`${API_ORIGIN}${rating.imagePath}`} alt="Customer review" /></a>}</td><td>{rating.updatedAt && Number.isFinite(new Date(rating.updatedAt).getTime()) ? new Date(rating.updatedAt).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div>
          <Pagination offset={offset} limit={limit} total={data?.total || 0} onChange={setOffset} />
        </section>
      </>}
    </div>
  );
}

function Modal({ title, close, children }) {
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-label={title}><div className="dialog-head"><h2>{title}</h2><button className="text-button" onClick={close}>Close</button></div>{children}</section></div>;
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><h2>{title}</h2><p>{text}</p></div>;
}
