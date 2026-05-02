import { GoogleLogin } from '@react-oauth/google';

interface Props {
  onLogin: (token: string) => void;
}

export function LoginScreen({ onLogin }: Props) {
  return (
    <div className="flex flex-col h-full bg-zinc-950 items-center justify-center gap-8 px-8">
      {/* Logo / branding */}
      <div className="flex flex-col items-center gap-3">
        <img src="/icon.svg" alt="logo" className="w-20 h-20 rounded-2xl shadow-lg" />
        <h1 className="text-3xl font-extrabold text-white tracking-tight">FigurinhApp</h1>
        <p className="text-zinc-400 text-sm text-center leading-relaxed">
          Gerencie sua coleção de figurinhas da Copa do Mundo 2026
        </p>
      </div>

      {/* Google login button */}
      <div className="flex flex-col items-center gap-3">
        <GoogleLogin
          onSuccess={(credentialResponse) => {
            if (credentialResponse.credential) {
              onLogin(credentialResponse.credential);
            }
          }}
          onError={() => {
            console.error('Falha no login com Google');
          }}
          theme="filled_black"
          shape="pill"
          size="large"
          text="signin_with"
        />
        <p className="text-zinc-600 text-xs text-center max-w-[220px]">
          Seu progresso fica salvo na nuvem e sincronizado em qualquer dispositivo
        </p>
      </div>
    </div>
  );
}
