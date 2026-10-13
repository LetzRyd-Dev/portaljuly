import psycopg2

env = {}
with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

conn = psycopg2.connect(dsn=env['DATABASE_URL'])
cur = conn.cursor()

# Get schema of portal_portal_users
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='portal_portal_users' ORDER BY ordinal_position;")
cols = cur.fetchall()
print('portal_portal_users columns:')
for c in cols:
    print(f'  {c[0]} ({c[1]})')

cur.execute("SELECT * FROM portal_portal_users LIMIT 5;")
rows = cur.fetchall()
print('\nSample users:')
for r in rows:
    print(' ', r)

# Check portal_onboarding schema
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='portal_onboarding' ORDER BY ordinal_position;")
ocols = [r[0] for r in cur.fetchall()]
print('\nportal_onboarding columns:', ocols)

conn.close()
