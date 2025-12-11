import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="text-center">
        <Image
          src="/trello-logo-blue.svg"
          alt="Trello Logo"
          width={150}
          height={150}
          className="mx-auto mb-8"
        />
        <h1 className="mb-4 text-4xl font-bold text-zinc-800 dark:text-zinc-200">
          Welcome to Trello
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Your project management tool for organizing tasks and collaborating with your team.
        </p>
      </div>
    </div>
  );
}
