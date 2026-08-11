# FindIt — Contas de teste e quem entra onde

## As 3 contas

Todas com a password **`21442144`**.

| Email | Role | App mobile | Web |
|---|---|---|---|
| `findit@teste1.com` | **Staff** | Área staff: vê o seu horário, gere os seus agendamentos | `/staff` |
| `findit@teste2.com` | **Owner** (dono) | Área owner: salão, staff, serviços, horário, agenda | `/dashboard` |
| `findit@teste3.com` | **Client** | Explorar salões, favoritos, marcar, ver marcações | ✗ (só a app) |

O cliente **não tem dashboard web** — a web é para gestão. Se entrar na web, vê uma página a explicar isso, em vez de ser devolvido ao login sem aviso.

**Horários**: quem define as horas de trabalho de cada profissional é o **dono** (em "Horário"). O staff vê o seu horário, mas não o altera — e isso é imposto pela base de dados, não só escondido na interface.

## Dados de exemplo já criados

- **Salão Demo** (Lisboa, com localização definida), do `teste2`
- 2 serviços: Corte de cabelo (30 min, 15€) e Corte + barba (60 min, 25€)
- `teste1` já é staff do salão, com o convite **aceite**
- Horário do `teste1`: Segunda a Sexta, 09:00–18:00

Ou seja: entra com o `teste3` na app e já consegues marcar, sem configurar nada.

## Repor a base de dados

O ficheiro [`supabase/seed.sql`](supabase/seed.sql) repõe exatamente este estado. Correr outra vez volta sempre ao mesmo ponto de partida.

- **Projeto hospedado**: cola o conteúdo no SQL Editor do Supabase e corre.
- **Local / CI**: acontece automaticamente no `supabase db reset`.

⚠️ **Apaga todos os utilizadores e todos os dados associados** (salões, serviços, horários, agendamentos, favoritos). É um ficheiro de teste, não usar em produção.

## Correr as aplicações

**App mobile** (raiz do projeto):
```bash
npx expo start
```
Digitaliza o QR code com a app Expo Go (telemóvel e PC no mesmo Wi-Fi).

**Web** (pasta `web/`):
```bash
npm run dev
```
Abre `http://localhost:3000`.

As duas podem correr ao mesmo tempo — usam portas diferentes (8081 e 3000).

## Como funciona o acesso

Depois do login na web, cada conta é encaminhada automaticamente para a sua área. Essa decisão vive num único sítio: `web/lib/auth/roles.ts` (`HOME_FOR_ROLE`). Cada área é protegida por `requireRole([...])` em `web/lib/auth/requireRole.ts`.

Isto é só a camada de interface — a proteção real dos dados é o Row Level Security na base de dados, que se aplica na mesma independentemente do que a interface mostre.

## Criar uma conta admin

Não existe conta admin nas 3 acima. Para criar uma, promove qualquer conta pelo SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'findit@teste3.com');
```

O admin vê todos os salões da plataforma, na app (painel completo) e na web (`/admin`, vista geral).

Para reverter, troca `'admin'` por `'client'`.
