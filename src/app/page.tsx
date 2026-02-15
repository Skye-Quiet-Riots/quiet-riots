import SignupForm from "./signup-form";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">
          Quiet Riots
        </span>
        <nav className="flex gap-4 text-sm">
          <a href="#about" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
            About
          </a>
          <a href="#how" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white">
            How It Works
          </a>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-zinc-500">
          From the book to the movement
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Change doesn&apos;t have to be loud to be&nbsp;powerful
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Quiet Riots helps people organise around shared issues and take
          collective action — together, on their own terms.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href="#join"
            className="rounded-full bg-black px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-white dark:text-black"
          >
            Get Involved
          </a>
          <a
            href="#about"
            className="rounded-full border border-zinc-300 px-8 py-3 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Learn More
          </a>
        </div>
      </main>

      {/* About */}
      <section id="about" className="border-t border-zinc-200 px-6 py-20 dark:border-zinc-800">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            What is Quiet Riots?
          </h2>
          <p className="mt-4 text-zinc-600 leading-relaxed dark:text-zinc-400">
            Based on the 2014 book, Quiet Riots is built on a simple idea:
            meaningful change doesn&apos;t always start with loud protest. It starts
            when people quietly find each other, align on what matters, and act
            together. This platform brings that idea to life.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            How It Works
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold dark:bg-zinc-800">
                1
              </div>
              <h3 className="mt-4 font-semibold">Name Your Issue</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Identify what matters to you — local or global, big or small.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold dark:bg-zinc-800">
                2
              </div>
              <h3 className="mt-4 font-semibold">Find Your People</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Connect with others who share the same concern and want to act.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg font-bold dark:bg-zinc-800">
                3
              </div>
              <h3 className="mt-4 font-semibold">Take Action</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Organise, coordinate, and move together — on your own terms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Join */}
      <section id="join" className="border-t border-zinc-200 px-6 py-20 dark:border-zinc-800">
        <div className="mx-auto max-w-md text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to start?
          </h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Leave your email and we&apos;ll let you know when Quiet Riots launches.
          </p>
          <SignupForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 px-6 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
        Quiet Riots &mdash; Collective action starts here.
      </footer>
    </div>
  );
}
