import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation } from 'wouter';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// Schema di validazione per il login
const loginSchema = z.object({
  username: z.string().min(1, { message: 'Il nome utente è obbligatorio' }),
  password: z.string().min(1, { message: 'La password è obbligatoria' }),
});

// Schema di validazione per la registrazione
const registerSchema = z.object({
  username: z.string().min(3, { message: 'Il nome utente deve contenere almeno 3 caratteri' }),
  password: z.string().min(6, { message: 'La password deve contenere almeno 6 caratteri' }),
  role: z.enum(['user', 'visitor']).default('user'),
  language: z.enum(['it', 'en', 'pt']).default('it')
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

// Configurazione multilingue
const translations = {
  it: {
    title: 'Accedi al tuo account',
    description: 'Accedi per gestire il tuo sistema FLUPSY',
    loginTab: 'Accedi',
    registerTab: 'Registrati',
    username: 'Nome utente',
    password: 'Password',
    loginButton: 'Accedi',
    registerButton: 'Registra',
    languageLabel: 'Lingua',
    roleLabel: 'Ruolo',
    roleUser: 'Utente',
    roleVisitor: 'Visitatore',
    noAccount: 'Non hai un account?',
    createAccount: 'Crea un account',
    alreadyHaveAccount: 'Hai già un account?',
    loginHere: 'Accedi qui'
  },
  en: {
    title: 'Sign in to your account',
    description: 'Sign in to manage your FLUPSY system',
    loginTab: 'Login',
    registerTab: 'Register',
    username: 'Username',
    password: 'Password',
    loginButton: 'Sign in',
    registerButton: 'Register',
    languageLabel: 'Language',
    roleLabel: 'Role',
    roleUser: 'User',
    roleVisitor: 'Visitor',
    noAccount: 'Don\'t have an account?',
    createAccount: 'Create an account',
    alreadyHaveAccount: 'Already have an account?',
    loginHere: 'Login here'
  },
  pt: {
    title: 'Entre na sua conta',
    description: 'Entre para gerenciar seu sistema FLUPSY',
    loginTab: 'Entrar',
    registerTab: 'Registrar',
    username: 'Nome de usuário',
    password: 'Senha',
    loginButton: 'Entrar',
    registerButton: 'Registrar',
    languageLabel: 'Idioma',
    roleLabel: 'Função',
    roleUser: 'Usuário',
    roleVisitor: 'Visitante',
    noAccount: 'Não tem uma conta?',
    createAccount: 'Criar uma conta',
    alreadyHaveAccount: 'Já tem uma conta?',
    loginHere: 'Entre aqui'
  }
};

const AuthPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('login');
  const [language, setLanguage] = useState<'it' | 'en' | 'pt'>('it');
  const t = translations[language];

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      role: 'user',
      language: 'it'
    },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      console.log("Form login submit:", data);
      
      const success = await auth.login({
        username: data.username,
        password: data.password
      });
      
      if (success) {
        console.log("Login riuscito, reindirizzamento alla dashboard");
        // Forziamo il reindirizzamento alla dashboard usando window.location invece di wouter
        window.location.href = '/';
        
        toast({
          title: 'Accesso effettuato',
          description: 'Benvenuto nel sistema FLUPSY',
        });
      }
    } catch (error) {
      console.error("Errore durante il login:", error);
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Si è verificato un errore durante l\'accesso',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      const success = await auth.register({
        username: data.username,
        password: data.password,
        role: data.role,
        language: data.language
      });
      
      if (success) {
        toast({
          title: 'Registrazione completata',
          description: 'Account creato con successo. Ora puoi accedere.',
        });
        setActiveTab('login');
      } else {
        toast({
          variant: 'destructive',
          title: 'Errore di registrazione',
          description: 'Errore durante la registrazione',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Si è verificato un errore durante la registrazione',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as 'it' | 'en' | 'pt');
    // Aggiorna anche il valore del form di registrazione
    registerForm.setValue('language', e.target.value as 'it' | 'en' | 'pt');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="flex w-full max-w-6xl flex-col-reverse md:flex-row gap-8">
        {/* Form di autenticazione */}
        <div className="flex-1 bg-white rounded-lg shadow-md p-6">
          <div className="mx-auto w-full max-w-md">
            <div className="flex justify-end mb-4">
              <select
                value={language}
                onChange={handleLanguageChange}
                className="p-2 border rounded text-sm"
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="pt">Português</option>
              </select>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t.loginTab}</TabsTrigger>
                <TabsTrigger value="register">{t.registerTab}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>{t.title}</CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">{t.username}</Label>
                        <Input
                          id="username"
                          {...loginForm.register('username')}
                          placeholder="Visitor"
                        />
                        {loginForm.formState.errors.username && (
                          <p className="text-sm text-red-500">{loginForm.formState.errors.username.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password">{t.password}</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            {...loginForm.register('password')}
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5 text-gray-400" />
                            ) : (
                              <Eye className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Caricamento...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <LogIn className="mr-2 h-4 w-4" />
                            <span>{t.loginButton}</span>
                          </div>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>{t.createAccount}</CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-username">{t.username}</Label>
                        <Input
                          id="reg-username"
                          {...registerForm.register('username')}
                        />
                        {registerForm.formState.errors.username && (
                          <p className="text-sm text-red-500">{registerForm.formState.errors.username.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reg-password">{t.password}</Label>
                        <div className="relative">
                          <Input
                            id="reg-password"
                            type={showPassword ? 'text' : 'password'}
                            {...registerForm.register('password')}
                          />
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5 text-gray-400" />
                            ) : (
                              <Eye className="h-5 w-5 text-gray-400" />
                            )}
                          </button>
                        </div>
                        {registerForm.formState.errors.password && (
                          <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reg-role">{t.roleLabel}</Label>
                        <select
                          id="reg-role"
                          {...registerForm.register('role')}
                          className="w-full p-2 border rounded"
                        >
                          <option value="user">{t.roleUser}</option>
                          <option value="visitor">{t.roleVisitor}</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reg-language">{t.languageLabel}</Label>
                        <select
                          id="reg-language"
                          {...registerForm.register('language')}
                          className="w-full p-2 border rounded"
                          value={language}
                          onChange={(e) => {
                            handleLanguageChange(e);
                          }}
                        >
                          <option value="it">Italiano</option>
                          <option value="en">English</option>
                          <option value="pt">Português</option>
                        </select>
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Caricamento...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <UserPlus className="mr-2 h-4 w-4" />
                            <span>{t.registerButton}</span>
                          </div>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <div className="mt-4 text-center text-sm">
              {activeTab === 'login' ? (
                <p>
                  {t.noAccount}{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => setActiveTab('register')}
                  >
                    {t.createAccount}
                  </button>
                </p>
              ) : (
                <p>
                  {t.alreadyHaveAccount}{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => setActiveTab('login')}
                  >
                    {t.loginHere}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Hero section */}
        <div className="flex-1 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-lg shadow-md p-6 text-white flex flex-col justify-center">
          <div className="max-w-md mx-auto">
            <div className="flex flex-col items-center mb-6">
              <img 
                src="/images/mito_logo.png" 
                alt="Logo MITO SRL" 
                className="h-28 mb-4"
              />
              <h1 className="text-3xl font-bold text-center">FLUPSY Manager</h1>
              <p className="text-xl text-center">Sistema per la gestione del preingrasso molluschi</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <svg className="h-6 w-6 mr-2 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>Monitoraggio in tempo reale delle unità FLUPSY</p>
              </div>
              <div className="flex items-start">
                <svg className="h-6 w-6 mr-2 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>Gestione completa del ciclo vitale dei molluschi</p>
              </div>
              <div className="flex items-start">
                <svg className="h-6 w-6 mr-2 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>Analisi dei dati e reportistica avanzata</p>
              </div>
              <div className="flex items-start">
                <svg className="h-6 w-6 mr-2 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p>Compatibile con dispositivi mobili e desktop</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;