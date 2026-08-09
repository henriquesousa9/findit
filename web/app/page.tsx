import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    price: "Grátis",
    description: "Para começar a testar com um salão.",
    features: ["1 salão", "Agendamentos ilimitados", "Dashboard web + app mobile"],
  },
  {
    name: "Pro",
    price: "19€/mês",
    description: "Para salões em crescimento.",
    features: ["Tudo do Starter", "Estatísticas avançadas", "Suporte prioritário"],
    highlighted: true,
  },
  {
    name: "Rede",
    price: "Sob consulta",
    description: "Para cadeias com vários salões.",
    features: ["Tudo do Pro", "Múltiplos salões", "Gestor de conta dedicado"],
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold">FindIt</span>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <a href="#pricing" className="text-neutral-600 hover:text-neutral-900">
              Preços
            </a>
            <Link href="/login" className="text-neutral-600 hover:text-neutral-900">
              Entrar
            </Link>
            <Link href="/signup" className="rounded-lg bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800">
              Criar conta grátis
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-neutral-50 px-6 py-24 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          A forma mais simples de gerir as marcações do teu salão
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-neutral-600">
          Clientes marcam pela app FindIt, tu geres tudo — salão, serviços, horário e agenda — a partir do browser.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/signup" className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800">
            Criar conta grátis
          </Link>
          <a href="#pricing" className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-900 hover:bg-neutral-100">
            Ver preços
          </a>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-3">
          <Feature title="Agenda sempre atualizada" description="Clientes só marcam nos horários que definires — sem sobreposições, sem chamadas perdidas." />
          <Feature title="Gere de qualquer lado" description="Dashboard web para o dia-a-dia no computador, app mobile para geres a partir do telemóvel." />
          <Feature title="Sem custos escondidos" description="A FindIt trata só das marcações. O pagamento dos serviços continua a ser diretamente contigo e o cliente." />
        </div>
      </section>

      <section id="pricing" className="bg-neutral-50 px-6 py-20">
        <h2 className="text-center text-3xl font-bold">Preços</h2>
        <p className="mx-auto mt-2 max-w-md text-center text-neutral-600">
          Planos de subscrição da FindIt. Não incluem o pagamento dos serviços de cabeleireiro — isso continua a ser diretamente entre ti e o cliente.
        </p>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 ${
                plan.highlighted ? "border-neutral-900 bg-white shadow-lg" : "border-neutral-200 bg-white"
              }`}
            >
              <p className="text-sm font-semibold text-neutral-500">{plan.name}</p>
              <p className="mt-2 text-3xl font-bold">{plan.price}</p>
              <p className="mt-2 text-sm text-neutral-600">{plan.description}</p>
              <ul className="mt-6 space-y-2 text-sm text-neutral-700">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-neutral-900">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-6 block rounded-lg px-4 py-2 text-center text-sm font-semibold ${
                  plan.highlighted ? "bg-neutral-900 text-white hover:bg-neutral-800" : "border border-neutral-300 hover:bg-neutral-100"
                }`}
              >
                Começar
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-neutral-200 px-6 py-8 text-center text-sm text-neutral-500">
        FindIt — {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
    </div>
  );
}
