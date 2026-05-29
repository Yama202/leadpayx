# LeadPayX — Sistema

> Plataforma de gestão de leads de contas com três papéis, comissões automáticas e auditoria completa.

Ver também: [[Fluxos]] · [[Funcoes Criticas]] · [[Banco de Dados]]

---

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        LeadPayX                                 │
│                                                                 │
│   CAPTADOR          OPERADOR              ADMIN                 │
│   ─────────         ─────────             ─────                 │
│   Envia contas  →   Trabalha contas   ←   Supervisiona tudo     │
│   Ganha R$30/   ←   Ganha R$10/conta      Configura tudo        │
│   conta             por conclusão         Processa pagamentos   │
└─────────────────────────────────────────────────────────────────┘
```

O negócio funciona em ciclos:

1. **Captador** cadastra uma conta (credenciais + comprovante de depósito)
2. **Operador** pega um lote de 1–2 contas, trabalha e registra o destino do saldo
3. **Sistema** gera comissões automaticamente para ambos
4. **Admin** processa os pagamentos via chave Pix

---

## Os Três Papéis

### Captador

O provedor de contas. Página inicial: `/captador/dashboard`

| O que faz | Onde |
|-----------|------|
| Envia novas contas com credenciais e comprovante | `/captador/enviar-conta` |
| Acompanha status das suas contas | `/captador/minhas-contas` |
| Vê ganhos e solicita pagamento | `/captador/pagamentos` |
| Recebe notificações de contas concluídas | `/captador/avisos` |
| Gerencia indicações e código de referral | `/captador/indicacoes` |
| Vê promoções ativas | `/captador/ofertas` |
| Edita perfil (nome, WhatsApp, Instagram, Pix) | `/captador/perfil` |

### Operador

O trabalhador de contas. Página inicial: `/operador/dashboard`

| O que faz | Onde |
|-----------|------|
| Pega um lote de até 2 contas da fila | `/operador/dashboard` |
| Inicia, completa ou rejeita contas | `/operador/contas` |
| Informa para onde foi o saldo de cada conta | Painel de trabalho |
| Vê histórico de contas trabalhadas | `/operador/historico` |
| Solicita pagamento | `/operador/pagamentos` |

### Admin

Supervisão e configuração total. Página inicial: `/admin/dashboard`

| O que faz | Onde |
|-----------|------|
| Aprova cadastros de captadores | `/admin/captadores` |
| Gerencia todos os usuários (editar, zerar, excluir) | `/admin/captadores` · `/admin/operadores` |
| Configura comissões globais | `/admin/comissoes` |
| Gerencia promoções e links de cadastro | `/admin/ofertas` · `/admin/links` |
| Processa pagamentos com comprovante | `/admin/pagamentos/*` |
| Consulta auditoria de todas as ações | `/admin/logs` |
| Ajusta configurações do sistema | `/admin/configuracoes` |

---

## Ciclo Completo de uma Conta

```
  CAPTADOR envia
       │
       ▼
  ┌─────────┐
  │ pending │ ◄──────────────────────────── rejeição volta aqui
  └────┬────┘
       │  Operador pega lote
       ▼
  ┌──────────┐
  │ assigned │  ← conta atribuída ao operador
  └────┬─────┘
       │  Operador inicia trabalho
       ▼
  ┌─────────────┐
  │ in_progress │
  └──────┬──────┘
         │
    ┌────┴──────┐
    │           │
    ▼           ▼
┌───────────┐ ┌──────────┐
│ completed │ │ rejected │
└─────┬─────┘ └──────────┘
      │
      ▼
  💰 Comissões geradas automaticamente
  📬 Notificação enviada ao captador
```

| Status | Significado |
|--------|-------------|
| `pending` | Na fila, aguardando operador |
| `assigned` | Atribuída, operador ainda não iniciou |
| `in_progress` | Operador trabalhando ativamente |
| `completed` | Concluída — comissões geradas |
| `rejected` | Rejeitada (motivo obrigatório ≥ 8 chars) → volta para `pending` |

---

## Comissões e Pagamentos

### Precedência de comissão (captador)

```
1. captador_offer_rates  ← override por captador + oferta (admin configura)
2. registration_links.captador_commission_override  ← override por link
3. captador_commission_per_account  ← valor global
```

Ver [[Features Recentes#Comissão por Oferta por Captador]] para o override individual.

### Fluxo de Pagamento

```
  1. Usuário acumula ganhos (status: pending)
  2. Clica "Solicitar pagamento" (precisa ter chave Pix)
  3. Admin processa em /admin/pagamentos
  4. Ganhos marcados como "paid" ✅ · Payout "processed" ✅
```

> Regra: só pode ter **uma solicitação pendente por vez** por usuário.

---

## Cadastro e Aprovação

```
  /register → email + senha + nome + código de indicação (opcional)
      │
      ▼
  Conta criada  →  status: pending_approval
      │
      ▼
  /aguardando-aprovacao
      │
      ▼  Admin aprova em /admin/captadores
      │
      ▼
  status: active  →  pode logar normalmente
```

| Status do perfil | Comportamento no login |
|------------------|------------------------|
| `pending_approval` | Redireciona para `/aguardando-aprovacao` |
| `active` | Redireciona para a home do papel |
| `inactive` | Sessão destruída + mensagem de erro |

---

## Segurança

| Mecanismo | O que protege |
|-----------|--------------|
| **RLS** | Cada tabela tem políticas — usuário lê/escreve só os próprios dados |
| **Trigger de campos sensíveis** | Usuário não pode alterar `role`, `status`, `referred_by` diretamente |
| **Trigger de contas** | Operador não pode alterar identificador, e-mail ou captador da conta |
| **Criptografia de senha** | Senha da conta cifrada com AES-256 antes de gravar |
| **Admin client isolado** | `createAdminClient()` usa service role — só server-side |
| **Validação Zod** | Todos os formulários validados no servidor |
| **Confirmação destrutiva** | Excluir exige digitar `EXCLUIR` |

---

## Stack Técnica

```
Frontend    Next.js App Router · React 19 · Tailwind CSS · Server Actions
Banco       Supabase (PostgreSQL) — RLS · Triggers · RPCs
Auth        Supabase Auth (JWT + cookies)
Storage     Supabase Storage (account-prints · payment-proofs)
Validação   Zod (server-side, todos os forms)
Deploy      Vercel (Cron Jobs incluídos)
Push        Web Push API (VAPID) — captador · operador · admin
Testes      Playwright E2E
```

---

## Mapa de Rotas

### Público
| Rota | Descrição |
|------|-----------|
| `/` | Página inicial |
| `/login` | Login |
| `/register` | Cadastro |
| `/aguardando-aprovacao` | Aguardando aprovação |
| `/complete-profile` | Completar perfil |

### Captador (`/captador/*`)
| Rota | Descrição |
|------|-----------|
| `/captador/dashboard` | Visão geral |
| `/captador/enviar-conta` | Formulário de envio |
| `/captador/minhas-contas` | Lista de contas |
| `/captador/ofertas` | Promoções ativas |
| `/captador/pagamentos` | Ganhos e pagamentos |
| `/captador/avisos` | Notificações |
| `/captador/indicacoes` | Código e bônus |
| `/captador/perfil` | Editar perfil |

### Operador (`/operador/*`)
| Rota | Descrição |
|------|-----------|
| `/operador/dashboard` | Painel + pegar lote |
| `/operador/contas` | Contas atribuídas |
| `/operador/historico` | Histórico |
| `/operador/pagamentos` | Ganhos e pagamentos |

### Admin (`/admin/*`)
| Rota | Descrição |
|------|-----------|
| `/admin/dashboard` | Métricas e atividade |
| `/admin/captadores` | Gerenciar captadores |
| `/admin/operadores` | Gerenciar operadores |
| `/admin/contas` | Todas as contas + timeline |
| `/admin/comissoes` | Configurar comissões |
| `/admin/configuracoes` | Configurações + push admin |
| `/admin/ofertas` | Promoções e links |
| `/admin/links` | Links de cadastro |
| `/admin/pagamentos/captadores` | Processar pagamentos |
| `/admin/pagamentos/operadores` | Processar pagamentos |
| `/admin/administradores` | Promover / revogar admins |
| `/admin/logs` | Auditoria |
