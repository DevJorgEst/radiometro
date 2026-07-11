import { useRadio } from '../context/RadioContext'
import StationCard from '../components/StationCard'

export default function Favorites() {
  const { favorites } = useRadio()

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mb-4 text-slate-600"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <p className="text-sm text-slate-400 max-w-xs">
          Aún no tienes emisoras favoritas. Explora el catálogo y añade las que más te gusten haciendo clic en el corazón del reproductor.
        </p>
      </div>
    )
  }

  return (
    <>
      <h2 className="px-6 pt-6 text-lg font-semibold text-white">
        Tus Favoritos
      </h2>
      <section className="flex w-full flex-col gap-4 p-6">
        {favorites.map((station) => (
          <StationCard key={station.id} station={station} />
        ))}
      </section>
    </>
  )
}
