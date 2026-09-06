import { FormEvent, useEffect, useState } from 'react';

type Summary = { income: number; expenses: number; balance: number };
type Transaction = { id: string; description: string; type: 'INCOME' | 'EXPENSE'; amount: number; occurredAt: string; category: { name: string } };
type Account = { id: string; name: string; type: string; initialBalance: number; currency: string };

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function Home() {
	const [summary, setSummary] = useState<Summary | null>(null);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [authenticated, setAuthenticated] = useState(false);
	const [loading, setLoading] = useState(true);
	const [mode, setMode] = useState<'login' | 'register'>('login');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');
	const [authError, setAuthError] = useState('');
	const [authLoading, setAuthLoading] = useState(false);

	useEffect(() => {
		const load = async () => {
			const session = await fetch('/api/auth/session', { credentials: 'include' });
			if (!session.ok) { setLoading(false); return; }
			const [dashboard, transactionList, accountList] = await Promise.all([
				fetch('/api/finanzas/dashboard', { credentials: 'include' }),
				fetch('/api/finanzas/transactions', { credentials: 'include' }),
				fetch('/api/finanzas/accounts', { credentials: 'include' }),
			]);
			if (!dashboard.ok || !transactionList.ok || !accountList.ok) { setLoading(false); return; }
			setAuthenticated(true);
			setSummary((await dashboard.json()).data);
			setTransactions((await transactionList.json()).data.slice(0, 5));
			setAccounts((await accountList.json()).data);
			setLoading(false);
		};
		load().catch(() => setLoading(false));
	}, []);

	const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setAuthError('');
		if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) return setAuthError('Escribe un correo valido.');
		if (password.length < 8) return setAuthError('La contrasena debe tener al menos 8 caracteres.');
		if (mode === 'register' && !name.trim()) return setAuthError('Escribe tu nombre.');
		setAuthLoading(true);
		try {
			const response = await fetch('/api/auth/mobile/login', {
				method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
				body: JSON.stringify({ username: email, password }),
			});
			if (!response.ok) throw new Error(mode === 'login' ? 'Usuario o contrasena incorrectos.' : 'El registro debe completarse en el proveedor de autenticacion.');
			const result = await response.json();
			if (result.data?.sessionToken) document.cookie = `mycoins_session=${result.data.sessionToken}; Path=/; Max-Age=86400; SameSite=Lax`;
			window.location.reload();
		} catch (error) {
			setAuthError(error instanceof Error ? error.message : 'No fue posible iniciar sesion.');
			setAuthLoading(false);
		}
	};

	const logout = async () => {
		await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
		window.location.reload();
	};

	if (!authenticated) return <main className="login"><section className="login-card"><div className="brand">my<span>coins</span></div><div className="eyebrow">Espacio personal</div><h1>{mode === 'login' ? 'Tu dinero, mas claro.' : 'Crea tu espacio.'}</h1><p>{mode === 'login' ? 'Ingresa para revisar tus cuentas y movimientos.' : 'Registra tus datos para comenzar a organizar tus finanzas.'}</p><div className="auth-tabs"><button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Ingresar</button><button className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>Registrarme</button></div><form onSubmit={submitAuth} className="auth-form">{mode === 'register' && <label>Nombre<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label>}<label>Correo electronico<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label><label>Contrasena<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>{authError && <div className="form-error" role="alert">{authError}</div>}<button className="primary" disabled={authLoading}>{authLoading ? 'Conectando...' : mode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}</button></form></section></main>;

	return <div className="dashboard"><aside className="sidebar"><div className="brand">my<span>coins</span></div><nav className="nav"><button className="active">Resumen</button><button>Movimientos</button><button>Cuentas</button><button>Presupuestos</button></nav><div className="sidebar-footer">Tu espacio financiero<br />Actualizado hoy<br /><button className="logout" onClick={logout}>Cerrar sesion</button></div></aside><main className="main"><header className="topbar"><div><div className="eyebrow">Resumen personal</div><h1>Tu panorama financiero</h1><p className="subtitle">Una lectura rapida de como se mueve tu dinero.</p></div><button className="avatar" aria-label="Cerrar sesion" onClick={logout}>MC</button></header><section className="metrics"><article className="metric"><div className="metric-label">Balance total</div><div className="metric-value positive">{loading ? '...' : money.format(summary?.balance ?? 0)}</div></article><article className="metric"><div className="metric-label">Ingresos registrados</div><div className="metric-value">{loading ? '...' : money.format(summary?.income ?? 0)}</div></article><article className="metric"><div className="metric-label">Gastos registrados</div><div className="metric-value negative">{loading ? '...' : money.format(summary?.expenses ?? 0)}</div></article></section><section className="content-grid"><article className="panel"><div className="panel-heading"><h2>Movimientos recientes</h2><button className="text-button">Ver todos</button></div>{transactions.length === 0 ? <div className="empty">Aun no hay movimientos registrados.</div> : transactions.map(transaction => <div className="transaction" key={transaction.id}><div className="transaction-icon">{transaction.type === 'INCOME' ? '+' : '-'}</div><div><div className="transaction-name">{transaction.description}</div><div className="transaction-date">{transaction.category.name} · {new Date(transaction.occurredAt).toLocaleDateString('es-CO')}</div></div><div className={`amount ${transaction.type === 'INCOME' ? 'income' : 'expense'}`}>{transaction.type === 'INCOME' ? '+' : '-'} {money.format(transaction.amount)}</div></div>)}</article><article className="panel"><div className="panel-heading"><h2>Tus cuentas</h2><button className="text-button">Gestionar</button></div>{accounts.length === 0 ? <div className="empty">Anade tu primera cuenta para verla aqui.</div> : accounts.map(account => <div className="account" key={account.id}><div className="account-row"><span>{account.name}</span><span>{money.format(account.initialBalance)}</span></div><div className="account-type">{account.type} · {account.currency}</div></div>)}</article></section></main></div>;
}
