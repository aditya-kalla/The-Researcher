export function ErrorPage({ error }: { error: Error }) {
    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0D0F1A',
            color: '#F5EDD3',
            fontFamily: 'monospace'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ color: '#FFB7C5' }}>ERROR</h1>
                <p>{error.message}</p>
            </div>
        </div>
    )
}