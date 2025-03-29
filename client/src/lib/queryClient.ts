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
  optionsOrNothing?: RequestInit,
): Promise<T> {
  let url: string;
  let options: RequestInit = optionsOrNothing || {};
  
  // Determina se il primo parametro è una stringa URL o un oggetto options
  if (typeof urlOrOptions === 'string') {
    url = urlOrOptions;
  } else {
    url = urlOrOptions.url;
    options.method = urlOrOptions.method || 'GET';
    if (urlOrOptions.body) {
      options.body = JSON.stringify(urlOrOptions.body);
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json'
      };
    }
  }
  
  console.log(`API Request: ${url}`, options);
  
  try {
    const res = await fetch(url, {
      ...options,
      credentials: "include"
    });
    
    console.log(`API Response status: ${res.status}`);
    
    // Clona la risposta per poterla ispezionare e poi restituirla
    const resClone = res.clone();
    
    // Log del payload della risposta se è JSON
    try {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const responseData = await resClone.json();
        console.log('API Response data:', responseData);
      }
    } catch (error) {
      console.log('Response is not JSON');
    }
    
    await throwIfResNotOk(res);
    
    // Se è una risposta JSON, restituisci il JSON parsato
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return res.json();
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
    const res = await fetch(queryKey[0] as string, {
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
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
