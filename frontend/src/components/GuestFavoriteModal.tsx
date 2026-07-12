interface GuestFavoriteModalProps {
  onClose: () => void
  onLogin: () => void
  onRegister: () => void
}

export default function GuestFavoriteModal({ onClose, onLogin, onRegister }: GuestFavoriteModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl text-center">
        <div className="mb-2 text-4xl">🔒</div>
        <h2 className="text-lg font-bold text-white mb-2">
          ¡Guarda tus estaciones favoritas!
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Inicia sesión o crea una cuenta para personalizar tu lista de radios.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onLogin}
            className="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={onRegister}
            className="w-full cursor-pointer rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Crear cuenta
          </button>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-sm text-slate-500 hover:text-slate-300 transition"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}
