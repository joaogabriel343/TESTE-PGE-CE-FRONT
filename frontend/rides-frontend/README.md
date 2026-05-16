# rides-frontend — Frontend Angular

Interface do passageiro (criar corrida) e interface do motorista (painel em tempo real via WebSocket/STOMP).

---

## Demo

- Vídeo de demonstração: https://drive.google.com/file/d/1K4awBtZ8L5f8Jao4DO_UZSrkG9lBDGuZ/view?usp=sharing
- Repositório frontend público: https://github.com/joaogabriel343/TESTE-PGE-CE-FRONT.git
- Repositório backend público: https://github.com/joaogabriel343/TESTE-PGE-CE-BACK.git

---

## Sumário

- [Stack](#stack)
- [Como Executar](#como-executar)
- [Interfaces](#interfaces)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Testes](#testes)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Decisões Técnicas](#decisões-técnicas)

---

## Stack

| Tecnologia | Versão | Função |
|---|---|---|
| Angular | 21 | Framework frontend (NgModule) |
| TypeScript | 5.x | Linguagem |
| SCSS | — | Estilização (BEM + design system próprio) |
| @stomp/stompjs | — | Cliente STOMP para WebSocket |
| SockJS-client | — | Fallback HTTP para WebSocket |
| RxJS | — | Programação reativa (BehaviorSubject, Subject) |
| Nginx | alpine | Servidor estático + proxy reverso |

---

### Como Executar

### Com Docker (recomendado)

```bash
# Na raiz do repositório (onde está o docker-compose.yml)
docker-compose up --build

# Acesse: http://127.0.0.1:4200
```

> Use `127.0.0.1:4200` (não `localhost:4200`) para garantir que o tráfego vai ao container Docker.

### Localmente (modo desenvolvimento)

Pré-requisitos: Node.js 20+, Angular CLI 21.

```bash
npm install
ng serve

# Acesse: http://localhost:4200
```

Em modo desenvolvimento, a aplicação conecta diretamente ao backend em `http://localhost:8081` (sem passar pelo Nginx). Certifique-se de que o backend está em execução antes de iniciar.

---

## Interfaces

### `/client` — Interface do Passageiro

Fluxo completo de solicitação de corrida com rastreamento em tempo real:

| Estado | Descrição |
|---|---|
| `form` | Formulário de endereços (origem + destino) com campos estruturados |
| `waiting` | Corrida criada, aguardando motorista aceitar |
| `accepted` | Motorista aceitou — exibe motorista e destino |
| `completed` | Corrida finalizada — confirmação com auto-dismiss em 4s |

Funcionalidades:
- Formulário reativo com validação por campo (logradouro, número, bairro, cidade/UF)
- Polling automático a cada 2s via `RideTrackingService` para atualizar o status
- Estado persistido em `localStorage` — sobrevive a recarregamentos de página
- Cancelamento manual da corrida enquanto aguarda

### `/driver` — Interface do Motorista

Painel de gerenciamento de corridas com dois estados:

| Estado | Descrição |
|---|---|
| `list` | Lista de corridas `PENDING` com opções de aceitar/rejeitar |
| `active` | Corrida aceita em andamento — exibe passageiro, origem, destino e botão "Finalizar" |

Funcionalidades:
- Toggle Online/Offline com `RideStateService`
- Notificações em tempo real via WebSocket/STOMP
- Atualização otimista: corrida removida da lista antes da confirmação do backend
- Restauração automática em caso de erro na aceitação/rejeição
- Seleção de motorista para operações

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── app-module.ts                       # Módulo raiz (NgModule)
│   ├── app-routing-module.ts               # Rotas: /client, /driver
│   ├── app.ts / app.html / app.scss        # Componente raiz + Navbar + Footer
│   │
│   ├── models/
│   │   └── ride.model.ts                   # Interfaces: Ride, Driver, RideStatus
│   │
│   ├── services/
│   │   ├── ride.service.ts                 # HTTP (REST): CRUD de corridas + drivers
│   │   ├── ride-tracking.service.ts        # Polling de status + localStorage
│   │   ├── ride-state.service.ts           # Estado de corridas pendentes (motorista)
│   │   └── websocket.service.ts            # STOMP: connect/disconnect + rideNotification$
│   │
│   ├── pages/
│   │   ├── client/create-ride/             # Formulário + rastreamento do passageiro
│   │   └── driver/driver-panel/            # Painel do motorista (list / active)
│   │
│   └── shared/
│       └── components/navbar/              # Barra de navegação
│
├── environments/
│   ├── environment.ts                      # Dev: apiUrl=http://localhost:8081/api
│   └── environment.prod.ts                 # Prod: apiUrl=/api (relativo, via Nginx)
│
├── styles/
│   └── _shared.scss                        # Design system: cards, inputs, botões, badges
│
├── styles.scss                             # Estilos globais + background
└── polyfills.ts                            # global = window (fix para sockjs-client)
```

---

## Testes

```bash
# Modo interativo (abre o navegador)
cd frontend/rides-frontend
ng test

# Modo CI (headless, sem interface gráfica)
ng test --watch=false --browsers=ChromeHeadless
```

### Cobertura dos testes

| Arquivo de spec | Cenários cobertos |
|---|---|
| `ride.service.spec.ts` | Todos os 7 métodos HTTP via `HttpTestingController`: createRide, listPendingRides, acceptRide, rejectRide, completeRide, getRide, listDrivers + tratamento de erro 404 |
| `ride-tracking.service.spec.ts` | startTracking (emite e persiste), stopTracking (limpa), polling para COMPLETED (para), polling para IN_PROGRESS (continua), resiliência a erro de rede |
| `driver-panel.spec.ts` | Inicialização, toggleOnline, acceptRide (sucesso/erro/sem motorista), rejectRide (sucesso/erro/sem motorista), completeRide (sucesso/erro/sem activeRide) |
| `create-ride.spec.ts` | Validação de formulário, onSubmit (inválido/sucesso/erro), transições de viewState (form/waiting/accepted/completed), cancelTracking, countdownDisplay |

---

## Variáveis de Ambiente

Os arquivos em `src/environments/` controlam as URLs da API e do WebSocket:

| Arquivo | `apiUrl` | `wsUrl` | Usado quando |
|---|---|---|---|
| `environment.ts` | `http://localhost:8081/api` | `http://localhost:8081/ws` | `ng serve` (dev) |
| `environment.prod.ts` | `/api` | `/ws` | Build de produção (Docker + Nginx) |

Em produção, as URLs relativas `/api` e `/ws` são interceptadas pelo Nginx e redirecionadas ao backend (`http://backend:8080`). A troca de arquivos é configurada em `angular.json` via `fileReplacements` na configuração de produção.

---

## Decisões Técnicas

**Por que `RideTrackingService` separado de `RideService`?**
`RideService` cuida exclusivamente de chamadas HTTP. `RideTrackingService` encapsula a lógica de polling (intervalo, parada por status, resiliência a falhas de rede) e persistência em `localStorage`. Cada serviço tem uma responsabilidade clara e pode ser testado de forma independente.

**Por que `localStorage` para persistir a corrida ativa?**
Se o passageiro recarregar a página enquanto aguarda o motorista, a corrida não pode ser perdida. O `RideTrackingService` restaura o estado do `localStorage` no `ngOnInit` e continua o polling imediatamente.

**Por que polling e não WebSocket no lado do passageiro?**
O WebSocket é ideal para push do servidor para múltiplos clientes (ex: notificar todos os motoristas). Para o passageiro, o estado é individualizado — polling em 2s é simples, confiável e suficiente para a UX esperada.

**Por que `BehaviorSubject<boolean>` para o estado de conexão WebSocket?**
`BehaviorSubject` sempre emite o valor atual para novos assinantes. Quando o componente é criado e assina `connected$`, recebe imediatamente o estado atual sem aguardar o próximo evento.

**Por que atualização otimista na lista de corridas do motorista?**
Remove a corrida da lista imediatamente ao clicar em aceitar/rejeitar, dando feedback instantâneo. Em caso de erro, o `RideStateService.refresh()` restaura o estado real. Essa abordagem é padrão em apps mobile de transporte.

**Por que `@Scheduled(fixedDelay)` em vez de polling reativo no frontend?**
O timeout de corrida (`PENDING → CANCELLED` após 2 min) é tratado no **backend** via `RideExpirationScheduler`, não no frontend. O countdown visual no frontend é apenas informativo — o cancelamento real é autoritativo e vem do servidor.

**Por que o `polyfills.ts` é necessário?**
`sockjs-client` é um pacote CommonJS que referencia a variável global `global` (padrão Node.js). Browsers não definem `global`. O polyfill `(window as any).global = window` resolve o `ReferenceError: global is not defined` em tempo de execução.
