import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Funzione apiRequest overload per supportare entrambi i pattern di chiamata
export async function apiRequest<T = any>(
  urlOrOptions: string | { url: string; method?: string; body?: any },
  methodOrOptions?: string | RequestInit,
  bodyData?: any
): Promise<T> {
  let url: string;
  let options: RequestInit = {};
  let method = '';
  
  // Determina quale pattern di chiamata è stato usato
  if (typeof urlOrOptions === 'string') {
    url = urlOrOptions;
    
    // Pattern 1: apiRequest(url, method, body) - 3 parametri
    if (typeof methodOrOptions === 'string') {
      method = methodOrOptions;
      options.method = method;
      if (bodyData) {
        options.body = JSON.stringify(bodyData);
        options.headers = {
          'Content-Type': 'application/json'
        };
      }
    } 
    // Pattern 2: apiRequest(url, options) - 2 parametri
    else if (methodOrOptions && typeof methodOrOptions === 'object') {
      options = methodOrOptions;
      method = options.method || 'GET';
    }
    // Pattern 3: apiRequest(url) - 1 parametro
    else {
      method = 'GET';
    }
  } else {
    // Pattern 4: apiRequest({ url, method, body }) - oggetto
    url = urlOrOptions.url;
    method = urlOrOptions.method || 'GET';
    options.method = method;
    if (urlOrOptions.body) {
      options.body = JSON.stringify(urlOrOptions.body);
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json'
      };
    }
  }

  // CRITICAL FIX: Method-override workaround for Replit proxy blocking PATCH/PUT
  if (method === 'PATCH' || method === 'PUT') {
    console.log(`🔄 METHOD-OVERRIDE: Converting ${method} to POST with X-HTTP-Method-Override header`);
    options.method = 'POST';
    options.headers = {
      ...options.headers,
      'X-HTTP-Method-Override': method
    };
  }
  
  console.log(`API Request: ${method}`, url);
  
  try {
    const res = await fetch(url, {
      ...options,
      credentials: "include"
    });
    
    console.log(`API Response status: ${res.status}`);
    
    // Gestione migliore delle risposte
    if (!res.ok) {
      // Se la risposta non è OK, lancia un errore con i dati JSON se possibile
      const text = await res.text();
      const error = new Error(`${res.status}: ${text || res.statusText}`);
      
      // Aggiungi proprietà personalizzate all'errore per un migliore handling
      try {
        if (text && text.trim().startsWith('{')) {
          const jsonData = JSON.parse(text);
          // @ts-ignore - Aggiungiamo proprietà personalizzate all'oggetto Error
          error.data = jsonData;
          // @ts-ignore - Aggiungiamo il messaggio come proprietà autonoma
          error.responseMessage = jsonData.message || '';
        }
      } catch (e) {
        console.warn('Failed to parse error response as JSON:', e);
      }
      
      throw error;
    }
    
    // Clona la risposta per poterla ispezionare e poi restituirla
    const resClone = res.clone();
    
    // Log del payload della risposta se è JSON
    let responseData: any = null;
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await resClone.json();
        console.log('API Response data:', JSON.stringify(responseData));
      } else {
        const text = await resClone.text();
        console.log('API Response data (text):', text || 'Empty response');
        // Se la risposta è vuota ma lo stato è OK, mappa a un oggetto di successo
        if (!text || text.trim() === '') {
          responseData = { success: true };
        }
      }
    } catch (error) {
      console.log('Response processing error:', error);
      // Se c'è un errore nel parsing ma la risposta è OK, restituisci un oggetto di successo
      responseData = { success: true };
    }
    
    // Abbiamo già gestito gli errori in precedenza, qui ritorniamo direttamente i dati elaborati
    if (responseData !== null) {
      return responseData as T;
    }
    
    // Se è una risposta JSON, restituisci il JSON parsato
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return await res.json();
      } catch (e) {
        console.warn('Failed to parse JSON response, returning empty object');
        return {} as T;
      }
    }
    
    // Altrimenti restituisci l'oggetto Response
    return res as unknown as T;
  } catch (error) {
    console.error(`API Request failed: ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Estrai l'URL base e gli eventuali parametri aggiuntivi
    const baseUrl = queryKey[0] as string;
    const params = queryKey.length > 1 && typeof queryKey[1] === 'object' ? queryKey[1] : {};
    
    // Costruisci l'URL con i parametri di query
    let url = baseUrl;
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url = `${baseUrl}?${searchParams.toString()}`;
    }
    
    console.log(`Query request to: ${url}`);
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false, // Disabilita polling automatico
      refetchIntervalInBackground: false,
      refetchOnMount: true, // Permetti caricamento iniziale
      refetchOnReconnect: true, // Riconnetti quando torna online
      refetchOnWindowFocus: false, // Evita refetch su focus finestra
      staleTime: 30 * 1000, // 30 secondi - dati freschi per operazioni
      gcTime: 5 * 60 * 1000, // 5 minuti garbage collection
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
