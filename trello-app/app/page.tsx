import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-white/20 backdrop-blur-sm" />
          <span className="text-2xl font-bold text-white">Trello</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-white hover:bg-white/10">
              Se connecter
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button className="bg-white text-blue-600 hover:bg-gray-100">
              S'inscrire
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-4xl">
          <h1 className="mb-6 text-5xl font-bold text-white sm:text-6xl lg:text-7xl">
            Organisez vos projets avec{" "}
            <span className="text-yellow-300">Trello</span>
          </h1>
          <p className="mb-8 text-xl text-white/90 sm:text-2xl">
            Gérez vos tâches, collaborez avec votre équipe et atteignez vos
            objectifs plus rapidement.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6">
                Commencer gratuitement
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6"
              >
                Se connecter
              </Button>
            </Link>
          </div>

          <div className="mt-20 grid gap-8 sm:grid-cols-3">
            <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 flex justify-center">
                <svg
                  className="h-12 w-12 text-yellow-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Tableaux simples
              </h3>
              <p className="text-white/80">
                Visualisez votre travail et suivez la progression de vos projets
              </p>
            </div>

            <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 flex justify-center">
                <svg
                  className="h-12 w-12 text-yellow-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Collaboration
              </h3>
              <p className="text-white/80">
                Travaillez en équipe et restez synchronisés en temps réel
              </p>
            </div>

            <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 flex justify-center">
                <svg
                  className="h-12 w-12 text-yellow-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                Productivité
              </h3>
              <p className="text-white/80">
                Gagnez du temps avec des outils puissants et intuitifs
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* <footer className="border-t border-white/10 px-6 py-4">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-white/60 sm:flex-row">
          <p>© 2024 Trello Clone. Tous droits réservés.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-white">
              Conditions
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Confidentialité
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </footer> */}
    </div>
  );
}
