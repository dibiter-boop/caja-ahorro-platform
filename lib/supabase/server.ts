const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type HttpMethod = 'GET' | 'POST' | 'PATCH';

async function request(path: string, method: HttpMethod, body?: unknown) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message = typeof data === 'object' && data && 'message' in data ? String((data as Record<string, unknown>).message) : text;
    throw new Error(message || `Supabase request failed: ${res.status}`);
  }

  return data;
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function createSupabaseServerClient() {
  return {
    from(table: string) {
      return {
        async upsert(payload: unknown, opts?: { onConflict?: string }) {
          const conflict = opts?.onConflict ? `?on_conflict=${opts.onConflict}` : '';
          try {
            await request(`/rest/v1/${table}${conflict}`, 'POST', payload);
            return { error: null };
          } catch (error) {
            return { error };
          }
        },
        async updateWhere(values: Record<string, unknown>, filters: Record<string, string>) {
          const query = new URLSearchParams();
          for (const [key, val] of Object.entries(filters)) query.set(key, `eq.${val}`);
          try {
            await request(`/rest/v1/${table}?${query.toString()}`, 'PATCH', values);
            return { error: null };
          } catch (error) {
            return { error };
          }
        },
        async selectWhere(filters: Record<string, string>) {
          const query = new URLSearchParams();
          query.set('select', '*');
          for (const [key, val] of Object.entries(filters)) query.set(key, `eq.${val}`);
          try {
            const data = await request(`/rest/v1/${table}?${query.toString()}`, 'GET');
            return { data, error: null };
          } catch (error) {
            return { data: null, error };
          }
        }
      };
    },
    async rpc(functionName: string, payload: Record<string, unknown>) {
      try {
        const data = await request(`/rest/v1/rpc/${functionName}`, 'POST', payload);
        return { data, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
  };
}
